import { supabase } from '@/integrations/supabase/client';
import { useConnectionStatus } from './ConnectionMonitorService';
import { useEventsStore } from '@/services/events';
import { useEffect, useState, useCallback, useRef } from 'react';
import { errorHandler } from './ErrorHandlingService';
import { useDebounce } from '@/hooks/useDebounce';

export interface CallTranscript {
  id: string;
  created_at?: string;
  filename?: string;
  text: string;
  keywords?: string[];
  sentiment?: string;
  call_score?: number;
  duration?: number;
  user_id?: string;
  transcript_segments?: any;
}

export interface CallTranscriptFilter {
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  sentimentFilter?: string[];
  limit?: number;
  sortBy?: 'created_at' | 'sentiment' | 'call_score';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  force?: boolean;
  forceTimestamp?: number;
  userId?: string;
  userIds?: string[];
}

const PAGE_SIZE = 10;

// Create a central request state storage to prevent duplicate requests across component instances
const globalRequestState = {
  isFetching: false,
  lastRequestTime: 0,
  lastRequestKey: '',
  minimumRequestInterval: 2000, // Increase from 800ms to 2000ms (2 seconds) between allowed requests
  requestHashes: new Set<string>(), // Track unique request hashes
  clearRequestHashInterval: null as NodeJS.Timeout | null,
};

// Create request fingerprint for deduplication
const getRequestFingerprint = (newFilters?: CallTranscriptFilter) => {
  return JSON.stringify({
    startDate: newFilters?.startDate?.toISOString() || null, 
    endDate: newFilters?.endDate?.toISOString() || null,
    searchTerm: newFilters?.searchTerm || null,
    sentimentFilter: newFilters?.sentimentFilter || null,
    page: newFilters?.page || 1,
    sortBy: newFilters?.sortBy || 'created_at',
    sortOrder: newFilters?.sortOrder || 'desc',
    limit: newFilters?.limit || PAGE_SIZE,
  });
};

export const useCallTranscripts = (filters?: CallTranscriptFilter) => {
  const [transcripts, setTranscripts] = useState<CallTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const dispatchEvent = useEventsStore((state) => state.dispatchEvent);
  const { isConnected } = useConnectionStatus();
  
  // Increase debounce time from 1000ms to 1500ms to reduce request frequency
  const debouncedFilters = useDebounce(filters, 1500);
  
  // Use a ref to track if a request is in progress for this component instance
  const requestInProgress = useRef(false);
  const lastRequestTime = useRef(0);

  const fetchTranscripts = useCallback(
    async (newFilters?: CallTranscriptFilter) => {
      // Skip if dates are undefined and this is not a forced request
      if (!newFilters?.force && 
          (!newFilters?.startDate || !newFilters?.endDate) && 
          (!filters?.startDate || !filters?.endDate)) {
        console.log('Skipping fetch - date range is undefined');
        return;
      }
      
      // Skip if a request is already in progress for this component
      if (requestInProgress.current) {
        console.log('Skipping fetch - request already in progress for this component');
        return;
      }
      
      // Skip if loading is already true (prevents double requests)
      if (loading) {
        console.log('Skipping fetch - already loading');
        return;
      }
      
      // Skip if a global request is in progress or too soon after last request
      const now = Date.now();
      const timeSinceLastRequest = now - globalRequestState.lastRequestTime;
      const componentTimeSinceLastRequest = now - lastRequestTime.current;
      const requestKey = getRequestFingerprint(newFilters);
      
      // Allow forced requests to bypass in-progress checks if they've been waiting for more than 5 seconds
      const bypassInProgress = newFilters?.force && 
                               globalRequestState.isFetching && 
                               (now - globalRequestState.lastRequestTime > 5000);
      
      if (globalRequestState.isFetching && !bypassInProgress) {
        console.log('Skipping fetch - global request already in progress');
        return;
      }
      
      // Skip if this exact request was made too recently, unless it's forced and more than 1 second has passed
      if (!newFilters?.force && 
          timeSinceLastRequest < globalRequestState.minimumRequestInterval && 
          globalRequestState.lastRequestKey === requestKey) {
        console.log(`Skipping fetch - too soon after last request (${timeSinceLastRequest}ms)`);
        return;
      }
      
      // Skip if this component made a request too recently, unless it's forced
      if (!newFilters?.force && componentTimeSinceLastRequest < 2500) { 
        console.log(`Skipping fetch - too soon after component's last request (${componentTimeSinceLastRequest}ms)`);
        return;
      }
      
      // Check if this request is a duplicate of a recent request, unless forced
      if (!newFilters?.force && globalRequestState.requestHashes.has(requestKey)) {
        console.log('Skipping fetch - duplicate request hash detected');
        return;
      }
      
      // Set up request hash tracking if not already set
      if (!globalRequestState.clearRequestHashInterval) {
        globalRequestState.clearRequestHashInterval = setInterval(() => {
          globalRequestState.requestHashes.clear();
        }, 5000); // Clear hashes every 5 seconds
      }
      
      // Update request tracking
      requestInProgress.current = true;
      globalRequestState.isFetching = true;
      globalRequestState.lastRequestTime = now;
      lastRequestTime.current = now;
      globalRequestState.lastRequestKey = requestKey;
      globalRequestState.requestHashes.add(requestKey);
      
      setLoading(true);
      setError(null);

      const startDate = newFilters?.startDate || filters?.startDate;
      const endDate = newFilters?.endDate || filters?.endDate;
      const searchTerm = newFilters?.searchTerm || filters?.searchTerm;
      const sentimentFilter = newFilters?.sentimentFilter || filters?.sentimentFilter;
      const limit = newFilters?.limit || PAGE_SIZE;
      const sortBy = newFilters?.sortBy || 'created_at';
      const sortOrder = newFilters?.sortOrder || 'desc';
      const page = newFilters?.page || currentPage;
      
      // Only update current page if explicitly provided in filters
      if (newFilters?.page) {
        setCurrentPage(page);
      }

      let query = supabase
        .from('call_transcripts')
        .select('*', { count: 'exact' })
        .range((page - 1) * limit, page * limit - 1)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (searchTerm) {
        query = query.ilike('text', `%${searchTerm}%`);
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      if (sentimentFilter && sentimentFilter.length > 0) {
        query = query.in('sentiment', sentimentFilter);
      }

      try {
        console.log(`Executing Supabase query with dates: ${startDate?.toISOString() || 'none'} - ${endDate?.toISOString() || 'none'}`);
        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching transcripts:', error);
          setError(error.message);
          errorHandler.handleError(error, 'CallTranscriptService.fetchTranscripts');
        } else {
          setTranscripts(data || []);
          setTotalCount(count || 0);
        }
      } catch (err) {
        console.error('Unexpected error fetching transcripts:', err);
        setError('An unexpected error occurred.');
        errorHandler.handleError(err, 'CallTranscriptService.fetchTranscripts');
      } finally {
        // Wait a short time before allowing more requests
        setTimeout(() => {
          setLoading(false);
          requestInProgress.current = false;
          globalRequestState.isFetching = false;
        }, 500); // Increased from 200ms to 500ms
      }
    },
    [filters, loading, supabase, errorHandler, currentPage]
  );

  useEffect(() => {
    // Skip if no connection or no filters provided
    if (!isConnected && !filters?.force) {
      console.log('Skipping fetchTranscripts - not connected to Supabase');
      return;
    }
    
    // Skip if already loading
    if (loading) {
      console.log('Skipping fetchTranscripts - already loading');
      return;
    }
    
    // Skip if a request is already in progress
    if (requestInProgress.current || globalRequestState.isFetching) {
      console.log('Skipping fetchTranscripts from useEffect - request in progress');
      return;
    }

    // Skip if no date range is provided (prevents initial undefined fetches) unless force is true
    if (!filters?.force && (!filters?.startDate || !filters?.endDate)) {
      console.log('Skipping fetchTranscripts - date range is undefined');
      return;
    }
    
    console.log('Fetching transcripts with filters:', filters);
    fetchTranscripts(filters);
  }, [debouncedFilters, isConnected, fetchTranscripts, filters?.force, loading]);

  // Cleanup request hash interval on unmount
  useEffect(() => {
    return () => {
      if (globalRequestState.clearRequestHashInterval) {
        clearInterval(globalRequestState.clearRequestHashInterval);
        globalRequestState.clearRequestHashInterval = null;
      }
    };
  }, []);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    fetchTranscripts({ ...filters, page });
  };

  const createTranscript = async (transcriptData: Omit<CallTranscript, 'id'>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('call_transcripts')
        .insert([transcriptData])
        .select()
        .single();

      if (error) {
        console.error('Error creating transcript:', error);
        setError(error.message);
        errorHandler.handleError(error, 'CallTranscriptService.createTranscript');
        return null;
      } else {
        setTranscripts((prevTranscripts) => [data, ...prevTranscripts]);
        setTotalCount((prevCount) => prevCount + 1);
        dispatchEvent('transcript-created' as any, data);
        return data as CallTranscript;
      }
    } catch (err) {
      console.error('Unexpected error creating transcript:', err);
      setError('An unexpected error occurred.');
      errorHandler.handleError(err, 'CallTranscriptService.createTranscript');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTranscript = async (id: string, updates: Partial<CallTranscript>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('call_transcripts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transcript:', error);
        setError(error.message);
        errorHandler.handleError(error, 'CallTranscriptService.updateTranscript');
        return null;
      } else {
        setTranscripts((prevTranscripts) =>
          prevTranscripts.map((transcript) => (transcript.id === id ? data : transcript))
        );
        dispatchEvent('transcript-updated' as any, data);
        return data as CallTranscript;
      }
    } catch (err) {
      console.error('Unexpected error updating transcript:', err);
      setError('An unexpected error occurred.');
      errorHandler.handleError(err, 'CallTranscriptService.updateTranscript');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteTranscript = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('call_transcripts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting transcript:', error);
        setError(error.message);
        errorHandler.handleError(error, 'CallTranscriptService.deleteTranscript');
        return false;
      } else {
        setTranscripts((prevTranscripts) =>
          prevTranscripts.filter((transcript) => transcript.id !== id)
        );
        setTotalCount((prevCount) => prevCount - 1);
        dispatchEvent('transcript-deleted' as any, { id });
        return true;
      }
    } catch (err) {
      console.error('Unexpected error deleting transcript:', err);
      setError('An unexpected error occurred.');
      errorHandler.handleError(err, 'CallTranscriptService.deleteTranscript');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    transcripts,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize: PAGE_SIZE,
    fetchTranscripts,
    goToPage,
    createTranscript,
    updateTranscript,
    deleteTranscript,
  };
};
