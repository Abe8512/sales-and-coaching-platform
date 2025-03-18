import { supabase } from '@/integrations/supabase/client';
import { useConnectionStatus } from './ConnectionMonitorService';
import { useEventsStore } from '@/services/events';
import { useEffect, useState, useCallback } from 'react';
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
  force?: boolean; // Add force property to trigger refresh
}

const PAGE_SIZE = 10;

export const useCallTranscripts = (filters?: CallTranscriptFilter) => {
  const [transcripts, setTranscripts] = useState<CallTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const dispatchEvent = useEventsStore((state) => state.dispatchEvent);
  const { isConnected } = useConnectionStatus();
  const debouncedFilters = useDebounce(filters, 300);

  const fetchTranscripts = useCallback(
    async (newFilters?: CallTranscriptFilter) => {
      setLoading(true);
      setError(null);

      const startDate = newFilters?.startDate;
      const endDate = newFilters?.endDate;
      const searchTerm = newFilters?.searchTerm;
      const sentimentFilter = newFilters?.sentimentFilter;
      const limit = newFilters?.limit || PAGE_SIZE;
      const sortBy = newFilters?.sortBy || 'created_at';
      const sortOrder = newFilters?.sortOrder || 'desc';
      const page = newFilters?.page || 1;
      setCurrentPage(page);

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
        setLoading(false);
      }
    },
    [supabase, errorHandler]
  );

  useEffect(() => {
    if (!isConnected && !filters?.force) {
      console.log('Skipping fetchTranscripts - not connected to Supabase');
      return;
    }

    console.log('Fetching transcripts with filters:', filters);
    fetchTranscripts(filters);
  }, [debouncedFilters, isConnected, fetchTranscripts, filters?.force]);

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
        dispatchEvent('transcript-created', data);
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
        dispatchEvent('transcript-updated', data);
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
        dispatchEvent('transcript-deleted', { id });
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
