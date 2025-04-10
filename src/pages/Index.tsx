import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { useAnalyticsDailyMetrics, useAnalyticsTranscripts } from '../services/AnalyticsHubService';
import { Transcript } from '../services/repositories/TranscriptsRepository';
import { useAuth } from '../contexts/AuthContext';

// Corrected/Verified Component Imports - using relative paths
import TeamPerformanceOverview from '../components/CallActivity/TeamPerformanceOverview'; 
import CallAnalysisSection from '../components/Dashboard/CallAnalysisSection';
import AIInsights from '../components/Dashboard/AIInsights';
import RecentCallsTable from '../components/CallActivity/RecentCallsTable'; 
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import BulkUploadButton from '../components/BulkUpload/BulkUploadButton';
import BulkUploadModal from '../components/BulkUpload/BulkUploadModal';

// Rename interface to match RecentCallsTable's expected prop type
interface Call { 
    id: string;
    date: string; 
    userName?: string;
    customerName?: string;
    duration?: number;
    outcome?: string | object;
    sentiment: number; // Required by RecentCallsTable
    nextSteps?: string;
}

// Update mapper to return the correct Call type and required fields
const mapTranscriptToRecentCall = (transcript: Transcript): Call => {
    // Basic sentiment mapping (placeholder - needs real logic or data)
    const sentimentScore = 0.5; // Default to neutral
    const userName = transcript.speaker_label ? 
        (transcript.speaker_label === 'SPEAKER_00' ? 'Agent' : transcript.speaker_label) :
        'Unknown Rep'; 

    return {
        id: transcript.call_id || transcript.id, 
        date: transcript.created_at,
        userName: userName, 
        customerName: "Customer", // Placeholder
        // Calculate duration if possible, else undefined
        duration: (transcript.end_time != null && transcript.start_time != null) ? Math.round(transcript.end_time - transcript.start_time) : undefined,
        outcome: "N/A", // Placeholder
        sentiment: sentimentScore, // Provide sentiment score
        nextSteps: "N/A", // Placeholder
    };
};

// Rename component to reflect its purpose
const DashboardPage: React.FC = () => {
    const { toast } = useToast();
    const { user, isAdmin, isManager } = useAuth();
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    
    // Fetch data for the dashboard
    const {
        metrics: dailyMetrics,
        isLoading: dailyMetricsLoading,
        error: dailyMetricsError,
        refreshMetrics: refreshDailyMetrics
    } = useAnalyticsDailyMetrics({ 
        dateRange: { from: dateRange?.from?.toISOString().split('T')[0], to: dateRange?.to?.toISOString().split('T')[0] }
    });

    const { 
        transcripts, 
        isLoading: transcriptsLoading, 
        error: transcriptsError, 
        refreshTranscripts
    } = useAnalyticsTranscripts({ 
        startDate: dateRange?.from?.toISOString().split('T')[0],
        endDate: dateRange?.to?.toISOString().split('T')[0]
    });

    // Combine loading/error states
    const isLoading = dailyMetricsLoading || transcriptsLoading;
    const combinedError = dailyMetricsError || transcriptsError;

    const handleRefresh = useCallback(() => {
        refreshDailyMetrics();
        refreshTranscripts();
        toast({ title: "Dashboard Refreshed", description: "Data has been updated." });
    }, [refreshDailyMetrics, refreshTranscripts, toast]);
    
    // Use the updated mapping function and type
    const recentCallsData: Call[] = useMemo(() => {
        if (!transcripts) return [];
        return transcripts.slice(0, 5).map(mapTranscriptToRecentCall);
    }, [transcripts]);

  return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <BulkUploadButton onClick={() => setIsBulkUploadOpen(true)} />
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                    <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} title="Refresh Data">
                       <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
          </div>
      </div>
      
            {/* Bulk Upload Modal */}
            <BulkUploadModal 
                isOpen={isBulkUploadOpen} 
                onClose={() => setIsBulkUploadOpen(false)} 
            />

            {/* Error Alert */}
            {combinedError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Dashboard</AlertTitle>
                    <AlertDescription>
                        {typeof combinedError === 'object' 
                            ? combinedError.message || 'Unknown error occurred' 
                            : String(combinedError)}
                    </AlertDescription> 
                </Alert>
            )}

            {/* Main Dashboard Grid */} 
            <TeamPerformanceOverview 
                teamMetrics={dailyMetrics}
                teamMetricsLoading={dailyMetricsLoading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2">
                    <CallAnalysisSection /> 
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <AIInsights /> 
                    <RecentCallsTable 
                        calls={recentCallsData} 
                        loading={transcriptsLoading} 
                        isAdmin={isAdmin} 
                        isManager={isManager} 
                    />
                </div>
            </div>
    </div>
  );
};

// Rename the export
export default DashboardPage;
