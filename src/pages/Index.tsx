
import React, { useContext, useState, useEffect } from "react";
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

const Index = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { filters, updateDateRange } = useSharedFilters();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [showLiveMetrics, setShowLiveMetrics] = useState(false);
  const { startRecording, stopRecording, isRecording, saveSentimentTrend } = useCallMetricsStore();
  
  // Use the CallTranscriptService to fetch metrics
  const { 
    fetchTranscripts,
    loading: transcriptsLoading 
  } = useCallTranscriptService();
  
  useEffect(() => {
    // Fetch initial data using current filters
    fetchTranscripts({
      dateRange: filters.dateRange
    });
    
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [filters.dateRange, isRecording, stopRecording, fetchTranscripts]);
  
  // Save data periodically when recording to update shared state
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        saveSentimentTrend();
      }, 15000); // Save every 15 seconds
      
      return () => clearInterval(interval);
    }
  }, [isRecording, saveSentimentTrend]);
  
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
            onClose={() => setIsBulkUploadOpen(false)} 
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
      
      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2">
          <CallsOverview />
        </div>
        <div>
          <AIInsights />
        </div>
      </div>
      
      <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mt-8 mb-6`}>
        Call Analysis
      </h2>
      
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <CallTranscript />
        </div>
        <div className="col-span-2 grid grid-rows-3 gap-6">
          <SentimentAnalysis />
          <KeywordInsights />
          <CallRating />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
