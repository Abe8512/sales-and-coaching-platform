-- Migration: Create RPC Functions
-- Description: Creates RPC functions for fetching aggregated data and analyzing transcripts.

-- Function to Analyze Transcript (Placeholder - Requires Edge Function or further implementation)
-- This function is expected to be called by the application after transcription.
-- It should populate sentiment, keywords, scores, etc., in the call_transcripts table.
-- For now, it returns a default JSON structure.
CREATE OR REPLACE FUNCTION public.analyze_call_transcript(transcript_text text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  -- In a real scenario, this would call an Edge Function or perform complex analysis.
  -- Returning placeholder structure matching TranscriptAnalysisResult interface.
  RETURN jsonb_build_object(
    'sentiment', 'neutral'::text,
    'sentiment_score', 0.5::numeric,
    'keywords', '{placeholder, analysis}'::text[],
    'call_score', 50::numeric,
    'talk_ratio_agent', 0.5::numeric,
    'talk_ratio_customer', 0.5::numeric,
    'speaking_speed', jsonb_build_object('overall', 150),
    'filler_word_count', 5,
    'objection_count', 1
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.analyze_call_transcript(text) TO authenticated;

-- Function to Get Daily Metrics (Aggregates from call_transcripts)
CREATE OR REPLACE FUNCTION public.get_daily_metrics()
RETURNS TABLE(
  date date,
  total_calls bigint,
  avg_sentiment numeric,
  avg_duration numeric,
  avg_talk_ratio_agent numeric,
  avg_talk_ratio_customer numeric,
  performance_score numeric -- Add performance_score to return type
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_calls,
    ROUND(AVG(sentiment_score), 2) as avg_sentiment,
    ROUND(AVG(duration), 1) as avg_duration,
    ROUND(AVG(talk_ratio_agent), 2) as avg_talk_ratio_agent,
    ROUND(AVG(talk_ratio_customer), 2) as avg_talk_ratio_customer,
    -- Calculate or retrieve performance score (e.g., average call_score)
    ROUND(AVG(call_score), 1) as performance_score 
  FROM public.call_transcripts
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_daily_metrics() TO authenticated;

-- Function to Get Rep Performance (Aggregates from call_transcripts and joins users)
CREATE OR REPLACE FUNCTION public.get_rep_performance()
RETURNS TABLE(
  rep_id uuid,
  rep_name text,
  avg_score numeric, -- Using call_score as the performance metric
  total_calls bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    t.user_id as rep_id,
    COALESCE(u.name, 'Unknown Rep') as rep_name, -- Handle users without names
    ROUND(AVG(t.call_score), 1) as avg_score, 
    COUNT(t.id) as total_calls
  FROM public.call_transcripts t
  LEFT JOIN public.users u ON t.user_id = u.id
  -- Optional: Add date range filter
  -- WHERE t.created_at >= timezone('utc', now()) - interval '30 days' 
  -- Optional: Filter only specific roles if users table has role info
  -- AND u.role = 'rep' 
  GROUP BY t.user_id, u.name
  ORDER BY avg_score DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.get_rep_performance() TO authenticated;

-- Function to Get Sentiment Over Time (Aggregates from call_transcripts)
CREATE OR REPLACE FUNCTION public.get_sentiment_over_time(period text DEFAULT '7d')
RETURNS TABLE(
  date date,
  sentiment_score numeric -- Average sentiment score for the day
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    DATE(created_at) as date,
    ROUND(AVG(sentiment_score), 2) as sentiment_score
  FROM public.call_transcripts
  WHERE created_at >= 
    CASE 
      WHEN period = '7d' THEN timezone('utc', now()) - interval '7 days'
      WHEN period = '30d' THEN timezone('utc', now()) - interval '30 days'
      WHEN period = '90d' THEN timezone('utc', now()) - interval '90 days'
      -- Add other periods or a default (e.g., last 30 days)
      ELSE timezone('utc', now()) - interval '30 days' 
    END
  GROUP BY DATE(created_at)
  ORDER BY date ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_sentiment_over_time(text) TO authenticated; 