
import React, { useContext, useState, useEffect, useRef } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import PerformanceMetrics from "../components/Dashboard/PerformanceMetrics";
import CallsOverview from "../components/Dashboard/CallsOverview";
import AIInsights from "../components/Dashboard/AIInsights";
import CallTranscript from "../components/CallAnalysis/CallTranscript";
import SentimentAnalysis from "../components/CallAnalysis/SentimentAnalysis";
import CallRating from "../components/CallAnalysis/CallRating";
import { ThemeContext } from "@/App";
import BulkUploadButton from "../components/BulkUpload/BulkUploadButton";
import BulkUploadModal from "../components/BulkUpload/BulkUploadModal";
import WhisperButton from "../components/Whisper/WhisperButton";
import LiveMetricsDisplay from "../components/CallAnalysis/LiveMetricsDisplay";
import PastCallsList from "../components/CallAnalysis/PastCallsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";
import KeywordInsights from "../components/CallAnalysis/KeywordInsights";
import KeywordTrendsChart from "../components/CallAnalysis/KeywordTrendsChart";
import { SentimentTrendsChart } from "../components/CallAnalysis/SentimentTrendsChart";
import { DateRangeFilter } from "../components/CallAnalysis/DateRangeFilter";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { useCallTranscriptService } from "@/services/CallTranscriptService";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventListener } from "@/services/EventsService";
import ContentLoader from "@/components/ui/ContentLoader";
import { animationUtils } from "@/utils/animationUtils";

const Index = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { filters, updateDateRange } = useSharedFilters();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [showLiveMetrics, setShowLiveMetrics] = useState(false);
  const { startRecording, stopRecording, isRecording, saveSentimentTrend } = useCallMetricsStore();
  const callAnalysisSectionRef = useRef<HTMLDivElement>(null);
  
  const { 
    fetchTranscripts,
    loading: transcriptsLoading 
  } = useCallTranscriptService();
  
  // Use throttled fetch to prevent multiple rapid fetches
  const throttledFetchTranscripts = animationUtils.throttle((options?: any) => {
    fetchTranscripts({
      dateRange: filters.dateRange,
      ...options
    });
  }, 1000);
  
  useEffect(() => {
    throttledFetchTranscripts();
    
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [filters.dateRange, isRecording, stopRecording, throttledFetchTranscripts]);
  
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        saveSentimentTrend();
      }, 15000);
      
      return () => clearInterval(interval);
    }
  }, [isRecording, saveSentimentTrend]);
  
  useEventListener('transcript-created', (data) => {
    console.log('New transcript created, refreshing data...', data);
    throttledFetchTranscripts();
  });
  
  useEventListener('bulk-upload-completed', (data) => {
    console.log('Bulk upload completed, refreshing data...', data);
    throttledFetchTranscripts();
  });
  
  useEffect(() => {
    const handleTranscriptionsUpdated = () => {
      console.log("Transcriptions updated, refreshing data...");
      throttledFetchTranscripts();
    };
    
    window.addEventListener('transcriptions-updated', handleTranscriptionsUpdated);
    
    return () => {
      window.removeEventListener('transcriptions-updated', handleTranscriptionsUpdated);
    };
  }, [throttledFetchTranscripts]);
  
  const handleBulkUploadClose = () => {
    setIsBulkUploadOpen(false);
    throttledFetchTranscripts();
  };

  const handleLiveMetricsTab = (value: string) => {
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
  };

  // Calculate fixed heights for components to prevent layout shifts
  const callTranscriptHeight = 400;
  const sideComponentHeight = 120;

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1`}>
            <span className="text-gradient-blue">AI</span> Sales Call Analyzer
          </h1>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Gain real-time insights and improve your sales performance
          </p>
        </div>
        
        <div className="flex space-x-3 items-center">
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

      <Tabs 
        defaultValue="dashboard" 
        className="w-full mb-8"
        onValueChange={handleLiveMetricsTab}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="livemetrics">Live Metrics</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <PerformanceMetrics />
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="col-span-1 md:col-span-2">
          <ContentLoader 
            isLoading={transcriptsLoading} 
            height={400}
            skeletonCount={1}
            preserveHeight={true}
          >
            <CallsOverview />
          </ContentLoader>
        </div>
        <div>
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
      
      <h2 
        ref={callAnalysisSectionRef}
        className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mt-8 mb-6`}
      >
        Call Analysis
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="col-span-1 md:col-span-3">
          <ContentLoader 
            isLoading={transcriptsLoading} 
            height={callTranscriptHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <CallTranscript />
          </ContentLoader>
        </div>
        <div className="col-span-1 md:col-span-2 grid grid-rows-3 gap-6">
          <ContentLoader 
            isLoading={transcriptsLoading} 
            height={sideComponentHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <SentimentAnalysis />
          </ContentLoader>
          
          <ContentLoader 
            isLoading={transcriptsLoading} 
            height={sideComponentHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <KeywordInsights />
          </ContentLoader>
          
          <ContentLoader 
            isLoading={transcriptsLoading} 
            height={sideComponentHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <CallRating />
          </ContentLoader>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
