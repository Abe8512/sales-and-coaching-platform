
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

// Define types for team metrics
export interface TeamMetrics {
  totalCalls: number;
  avgSentiment: number;
  avgTalkRatio: {
    agent: number;
    customer: number;
  };
  topKeywords: string[];
}

// Define types for individual rep metrics
export interface RepMetrics {
  id: string;
  name: string;
  callVolume: number;
  successRate: number;
  sentiment: number;
  insights: string[];
}

// Custom hook for real-time team metrics
export const useRealTimeTeamMetrics = (): [TeamMetrics, boolean] => {
  const [metrics, setMetrics] = useState<TeamMetrics>({
    totalCalls: 0,
    avgSentiment: 0,
    avgTalkRatio: { agent: 50, customer: 50 },
    topKeywords: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchTeamMetrics();

    // Set up real-time subscription for calls table
    const channel = supabase
      .channel('public:calls')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchTeamMetrics();
        }
      )
      .subscribe();

    // Also listen for call_transcripts changes
    const transcriptsChannel = supabase
      .channel('public:call_transcripts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_transcripts' },
        (payload) => {
          console.log('Transcript update received:', payload);
          fetchTeamMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(transcriptsChannel);
    };
  }, []);

  const fetchTeamMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch calls for sentiment and talk ratio data
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*');
      
      if (callsError) throw callsError;

      // Fetch transcripts for keywords data
      const { data: transcriptsData, error: transcriptsError } = await supabase
        .from('call_transcripts')
        .select('keywords');
      
      if (transcriptsError) throw transcriptsError;

      // Fetch keyword trends for top keywords
      const { data: keywordData, error: keywordError } = await supabase
        .from('keyword_trends')
        .select('*')
        .order('count', { ascending: false })
        .limit(10);
        
      if (keywordError) throw keywordError;

      // Calculate metrics from the data
      if (callsData) {
        const totalCalls = callsData.length;
        
        // Calculate average sentiment
        const avgSentiment = callsData.length > 0 
          ? callsData.reduce((sum, call) => 
              sum + (call.sentiment_agent + call.sentiment_customer) / 2, 0) / callsData.length
          : 0;
        
        // Calculate average talk ratio
        const avgTalkRatioAgent = callsData.length > 0
          ? callsData.reduce((sum, call) => sum + call.talk_ratio_agent, 0) / callsData.length
          : 50;
        
        const avgTalkRatioCustomer = callsData.length > 0
          ? callsData.reduce((sum, call) => sum + call.talk_ratio_customer, 0) / callsData.length
          : 50;

        // Extract top keywords
        const topKeywords = keywordData
          ? keywordData.map(k => k.keyword).slice(0, 5)
          : [];

        // Update state
        setMetrics({
          totalCalls,
          avgSentiment,
          avgTalkRatio: {
            agent: avgTalkRatioAgent,
            customer: avgTalkRatioCustomer
          },
          topKeywords
        });
      }
    } catch (error) {
      console.error('Error fetching team metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return [metrics, isLoading];
};

// Custom hook for real-time rep metrics
export const useRealTimeRepMetrics = (repIds?: string[]): [RepMetrics[], boolean] => {
  const [metrics, setMetrics] = useState<RepMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchRepMetrics();

    // Set up real-time subscription
    const channel = supabase
      .channel('public:calls')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          console.log('Real-time rep update received:', payload);
          fetchRepMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [repIds]);

  const fetchRepMetrics = async () => {
    setIsLoading(true);
    try {
      // For demo purposes, we'll use mock data since we don't have rep-specific tables
      // In production, you'd filter calls and transcripts by user_id
      
      const mockReps: RepMetrics[] = [
        {
          id: "1",
          name: "Alex Johnson",
          callVolume: 145,
          successRate: 72,
          sentiment: 0.85,
          insights: ["Excellent rapport building", "Good at overcoming objections"]
        },
        {
          id: "2",
          name: "Maria Garcia",
          callVolume: 128,
          successRate: 68,
          sentiment: 0.79,
          insights: ["Strong product knowledge", "Could improve closing"]
        },
        {
          id: "3",
          name: "David Kim",
          callVolume: 103,
          successRate: 62,
          sentiment: 0.72,
          insights: ["Good discovery questions", "Needs work on follow-up"]
        },
        {
          id: "4",
          name: "Sarah Williams",
          callVolume: 137,
          successRate: 75,
          sentiment: 0.82,
          insights: ["Excellent at building trust", "Clear communication"]
        },
        {
          id: "5",
          name: "James Taylor",
          callVolume: 95,
          successRate: 58,
          sentiment: 0.67,
          insights: ["Good technical knowledge", "Needs improvement in listening"]
        }
      ];
      
      // Filter by repIds if provided
      const filteredReps = repIds && repIds.length > 0
        ? mockReps.filter(rep => repIds.includes(rep.id))
        : mockReps;
        
      setMetrics(filteredReps);
    } catch (error) {
      console.error('Error fetching rep metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return [metrics, isLoading];
};
