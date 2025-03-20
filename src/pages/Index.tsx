import React, { useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import PerformanceMetrics from "../components/Dashboard/PerformanceMetrics";
import CallsOverview from "../components/Dashboard/CallsOverview";
import AIInsights from "../components/Dashboard/AIInsights";
import { ThemeContext } from "@/App";
import BulkUploadButton from "../components/BulkUpload/BulkUploadButton";
import BulkUploadModal from "../components/BulkUpload/BulkUploadModal";
import WhisperButton from "../components/Whisper/WhisperButton";
import LiveMetricsDisplay from "../components/CallAnalysis/LiveMetricsDisplay";
import PastCallsList from "../components/CallAnalysis/PastCallsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";
import KeywordTrendsChart from "../components/CallAnalysis/KeywordTrendsChart";
import { SentimentTrendsChart } from "../components/CallAnalysis/SentimentTrendsChart";
import DateRangeFilter from "../components/CallAnalysis/DateRangeFilter";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { useCallTranscripts } from "@/services/CallTranscriptService";
import ContentLoader from "@/components/ui/ContentLoader";
import { useEventListener } from "@/services/events/hooks";
import { animationUtils } from "@/utils/animationUtils";
import CallAnalysisSection from "@/components/Dashboard/CallAnalysisSection";
import TeamPerformanceOverview from "@/components/CallActivity/TeamPerformanceOverview";
import { useRealTimeTeamMetrics } from "@/services/RealTimeMetricsService";
import { Brain, Sparkles, ChevronRight, MicOff, Mic, Headphones, BarChart4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SalesMetricsDisplay from "@/components/Dashboard/SalesMetricsDisplay";
import { throttle } from "lodash";

// Create a global state to track bulk upload status
export const bulkUploadState = {
  isUploading: false,
  selectedRepId: null as string | null,
  setUploading: (value: boolean) => {
    bulkUploadState.isUploading = value;
    // Dispatch a custom event to notify components about bulk upload state change
    window.dispatchEvent(new CustomEvent('bulk-upload-state-change', { 
      detail: { isUploading: value } 
    }));
    console.log(`Bulk upload state changed to: ${value ? 'uploading' : 'idle'}`);
  },
  setSelectedRep: (value: string | null) => {
    bulkUploadState.selectedRepId = value;
    // Dispatch event to notify components about selected rep change
    window.dispatchEvent(new CustomEvent('selected-rep-change', { 
      detail: { selectedRepId: value } 
    }));
    console.log(`Selected rep changed to: ${value || 'none'}`);
  }
};

const Index = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { filters, updateDateRange } = useSharedFilters();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [showLiveMetrics, setShowLiveMetrics] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const { startRecording, stopRecording, isRecording, saveSentimentTrend } = useCallMetricsStore();
  
  const { 
    fetchTranscripts,
    transcripts,
    loading: transcriptsLoading 
  } = useCallTranscripts({
    startDate: filters.dateRange?.from,
    endDate: filters.dateRange?.to
  });
  
  const [teamMetrics, teamMetricsLoading] = useRealTimeTeamMetrics(filters);
  
  const fetchWithDebounce = useCallback(() => {
    const startDate = filters.dateRange?.from;
    const endDate = filters.dateRange?.to;
    
    // Only fetch if we have valid date ranges and aren't already loading
    // Skip fetching during bulk uploads to avoid flickering states
    if (!transcriptsLoading && !bulkUploadState.isUploading) {
      console.log(`Fetching transcripts with dates: ${startDate} to ${endDate}`);
      fetchTranscripts({ 
        startDate, 
        endDate, 
        force: true // Force a fresh fetch even if we have cached data
      });
    } else {
      console.log("Skipping fetch due to loading state or bulk upload in progress");
    }
  }, [filters.dateRange, fetchTranscripts, transcriptsLoading]);
  
  // Throttle the fetch to avoid too many requests during rapid UI interactions
  const throttledFetchTranscripts = useCallback(
    throttle(fetchWithDebounce, 2000, { leading: false }), 
    [fetchWithDebounce]
  );
  
  // Initial data load
  useEffect(() => {
    // Use initial load flag to prevent multiple fetches on mount
    const shouldFetch = filters.dateRange && !transcriptsLoading && !bulkUploadState.isUploading;
    
    if (shouldFetch) {
      console.log('Initial data load with date range:', filters.dateRange);
      throttledFetchTranscripts();
    }
    
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [filters.dateRange, isRecording, stopRecording, throttledFetchTranscripts, transcriptsLoading]);
  
  // Handle sentiment recording
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        saveSentimentTrend();
      }, 15000);
      
      return () => clearInterval(interval);
    }
  }, [isRecording, saveSentimentTrend]);
  
  // Event handlers for data updates
  const handleTranscriptCreated = useCallback(() => {
    console.log('New transcript created, refreshing data...');
    // Use debounced version for events that might fire multiple times
    throttledFetchTranscripts();
  }, [throttledFetchTranscripts]);
  
  const handleBulkUploadCompleted = useCallback((event: CustomEvent) => {
    // Extract the success count from the event detail
    const { successCount, fileCount } = event.detail || { successCount: 0, fileCount: 0 };
    
    console.log(`Bulk upload completed with ${successCount}/${fileCount} successful uploads`);
    
    // Reset bulk upload state
    bulkUploadState.setUploading(false);
    
    // Only refresh data if there were successful uploads
    if (successCount > 0) {
      // Add a delay before fetching to allow systems to stabilize
      setTimeout(() => {
        // Use debounced version for events that might fire multiple times
        // Force flag allows fetching even if another upload starts
        throttledFetchTranscripts();
        console.log('Executing delayed data refresh after bulk upload completion');
      }, 2000); // 2 second delay
    } else {
      console.log('No successful uploads, skipping data refresh');
    }
  }, [throttledFetchTranscripts]);
  
  // Modify the useEventListener to use CustomEvent
  useEffect(() => {
    const handleEvent = (event: Event) => {
      handleBulkUploadCompleted(event as CustomEvent);
    };
    
    window.addEventListener('bulk-upload-completed', handleEvent);
    
    return () => {
      window.removeEventListener('bulk-upload-completed', handleEvent);
    };
  }, [handleBulkUploadCompleted]);
  
  // Listen for transcriptions-updated event
  useEffect(() => {
    const handleTranscriptionsUpdated = () => {
      console.log("Transcriptions updated, refreshing data...");
      // Only refresh if no bulk upload is in progress
      if (!bulkUploadState.isUploading) {
        throttledFetchTranscripts();
      } else {
        console.log("Skipping refresh due to bulk upload in progress");
      }
    };
    
    window.addEventListener('transcriptions-updated', handleTranscriptionsUpdated);
    
    return () => {
      window.removeEventListener('transcriptions-updated', handleTranscriptionsUpdated);
    };
  }, [throttledFetchTranscripts]);
  
  // Listen for selected rep changes
  useEffect(() => {
    const handleSelectedRepChange = (event: Event) => {
      const customEvent = event as CustomEvent<{selectedRepId: string | null}>;
      setSelectedRepId(customEvent.detail.selectedRepId);
    };
    
    window.addEventListener('selected-rep-change', handleSelectedRepChange);
    return () => {
      window.removeEventListener('selected-rep-change', handleSelectedRepChange);
    };
  }, []);
  
  const handleBulkUploadOpen = useCallback(() => {
    setIsBulkUploadOpen(true);
    // Signal that a bulk upload is about to start
    bulkUploadState.setUploading(true);
  }, []);
  
  const handleBulkUploadClose = useCallback(() => {
    setIsBulkUploadOpen(false);
    // Reset the bulk upload state to allow data fetching
    bulkUploadState.setUploading(false);
    // Fetch the latest data
    throttledFetchTranscripts();
  }, [throttledFetchTranscripts]);

  const handleLiveMetricsTab = useCallback((value: string) => {
    if (value === 'livemetrics') {
      setShowLiveMetrics(true);
      if (!isRecording) {
        startRecording();
      }
    } else {
      setShowLiveMetrics(false);
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1 flex items-center gap-2`}>
            <span className="text-gradient-blue">AI</span> Sales Call Analyzer
            <Sparkles className="h-6 w-6 text-neon-purple animate-pulse-slow" />
          </h1>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Gain real-time insights and improve your sales performance
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <DateRangeFilter 
            dateRange={filters.dateRange} 
            setDateRange={updateDateRange}
          />
          <WhisperButton recordingId="latest" />
          <BulkUploadButton onClick={() => setIsBulkUploadOpen(true)} />
          <BulkUploadModal 
            isOpen={isBulkUploadOpen} 
            onClose={handleBulkUploadClose} 
          />
        </div>
      </div>

      <TeamPerformanceOverview 
        teamMetrics={teamMetrics} 
        teamMetricsLoading={teamMetricsLoading}
        callsLength={transcripts?.length || 0}
      />

      <div className="mb-6">
        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center`}>
          <Brain className="mr-2 h-5 w-5 text-neon-purple" />
          Key Performance Indicators
        </h2>
        <PerformanceMetrics />
      </div>
      
      <Tabs 
        defaultValue="dashboard" 
        className="w-full mb-6"
        onValueChange={handleLiveMetricsTab}
      >
        <TabsList className="mb-4 flex overflow-x-auto bg-background/90 dark:bg-dark-purple/90 backdrop-blur-sm p-1 rounded-lg">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="livemetrics" className="flex items-center gap-1">
            <Mic className="h-3.5 w-3.5" />
            Live Metrics
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <Headphones className="h-3.5 w-3.5" />
            Call History
          </TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <div className="mb-6 flex justify-center">
            <Button 
              className="bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:from-neon-purple/90 hover:to-neon-blue/90 transition-all duration-300"
              onClick={() => handleLiveMetricsTab('livemetrics')}
            >
              {isRecording ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Live Recording
                </>
              )}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            <div className="md:col-span-2">
              <ContentLoader 
                isLoading={transcriptsLoading} 
                height={400}
                skeletonCount={1}
                preserveHeight={true}
              >
                <CallsOverview />
              </ContentLoader>
            </div>
            <div className="md:col-span-1">
              <ContentLoader 
                isLoading={transcriptsLoading} 
                height={400}
                skeletonCount={1}
                preserveHeight={true}
              >
                <AIInsights />
              </ContentLoader>
            </div>
          </div>
          
          <CallAnalysisSection isLoading={transcriptsLoading} />
          
          <div className="mt-8">
            <SalesMetricsDisplay 
              isLoading={transcriptsLoading} 
              selectedRepId={selectedRepId || undefined}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="livemetrics">
          <LiveMetricsDisplay isCallActive={showLiveMetrics} />
        </TabsContent>
        
        <TabsContent value="history">
          <PastCallsList />
        </TabsContent>
        
        <TabsContent value="trends">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KeywordTrendsChart />
            <SentimentTrendsChart />
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between items-center mt-2 mb-2">
        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
          Recent Call Analysis
        </h2>
        <Button variant="ghost" className="text-neon-purple hover:text-neon-purple/80 px-2" onClick={() => navigate('/transcripts')}>
          View All
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default React.memo(Index);
