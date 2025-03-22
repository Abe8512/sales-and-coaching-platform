-- Create stored procedure for updating call metrics summary
CREATE OR REPLACE FUNCTION upsert_call_metrics_summary(
  p_id TEXT,
  p_total_calls INTEGER,
  p_avg_sentiment NUMERIC,
  p_agent_talk_ratio NUMERIC,
  p_customer_talk_ratio NUMERIC,
  p_top_keywords TEXT[],
  p_performance_score INTEGER,
  p_conversion_rate NUMERIC,
  p_avg_call_duration INTEGER,
  p_successful_calls INTEGER,
  p_unsuccessful_calls INTEGER,
  p_time_period TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.call_metrics_summary (
    id, 
    total_calls, 
    avg_sentiment, 
    agent_talk_ratio, 
    customer_talk_ratio, 
    top_keywords, 
    performance_score, 
    conversion_rate, 
    avg_call_duration, 
    successful_calls, 
    unsuccessful_calls, 
    time_period,
    updated_at
  ) VALUES (
    p_id, 
    p_total_calls, 
    p_avg_sentiment, 
    p_agent_talk_ratio, 
    p_customer_talk_ratio, 
    p_top_keywords, 
    p_performance_score, 
    p_conversion_rate, 
    p_avg_call_duration, 
    p_successful_calls, 
    p_unsuccessful_calls, 
    p_time_period,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    avg_sentiment = EXCLUDED.avg_sentiment,
    agent_talk_ratio = EXCLUDED.agent_talk_ratio,
    customer_talk_ratio = EXCLUDED.customer_talk_ratio,
    top_keywords = EXCLUDED.top_keywords,
    performance_score = EXCLUDED.performance_score,
    conversion_rate = EXCLUDED.conversion_rate,
    avg_call_duration = EXCLUDED.avg_call_duration,
    successful_calls = EXCLUDED.successful_calls,
    unsuccessful_calls = EXCLUDED.unsuccessful_calls,
    time_period = EXCLUDED.time_period,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for batch updating rep metrics
CREATE OR REPLACE FUNCTION batch_upsert_rep_metrics(
  rep_data JSONB
) RETURNS VOID AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT jsonb_array_elements(rep_data)
  LOOP
    INSERT INTO public.rep_metrics_summary (
      rep_id,
      rep_name,
      call_volume,
      success_rate,
      sentiment_score,
      top_keywords,
      insights,
      time_period,
      updated_at
    ) VALUES (
      item->>'rep_id',
      item->>'rep_name',
      (item->>'call_volume')::INTEGER,
      (item->>'success_rate')::NUMERIC,
      (item->>'sentiment_score')::NUMERIC,
      COALESCE((item->'top_keywords')::TEXT[]::TEXT[], '{}'),
      COALESCE((item->'insights')::TEXT[]::TEXT[], '{}'),
      COALESCE(item->>'time_period', 'all_time'),
      COALESCE(item->>'updated_at', now()::TEXT)
    )
    ON CONFLICT (rep_id) DO UPDATE SET
      rep_name = EXCLUDED.rep_name,
      call_volume = EXCLUDED.call_volume,
      success_rate = EXCLUDED.success_rate,
      sentiment_score = EXCLUDED.sentiment_score,
      top_keywords = EXCLUDED.top_keywords,
      insights = EXCLUDED.insights,
      time_period = EXCLUDED.time_period,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION upsert_call_metrics_summary TO authenticated, anon;
GRANT EXECUTE ON FUNCTION batch_upsert_rep_metrics TO authenticated, anon; 