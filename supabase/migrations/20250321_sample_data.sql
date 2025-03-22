-- Insert sample data for testing

-- Sample data for call_metrics_summary
INSERT INTO public.call_metrics_summary 
  (id, total_calls, avg_sentiment, agent_talk_ratio, customer_talk_ratio, top_keywords, performance_score, conversion_rate, avg_call_duration, successful_calls, unsuccessful_calls, time_period)
VALUES
  ('global', 120, 0.72, 47, 53, ARRAY['pricing', 'features', 'support', 'timeline', 'integration'], 78, 0.65, 375, 78, 42, 'all_time')
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
  updated_at = now();

-- Sample data for rep_metrics_summary
INSERT INTO public.rep_metrics_summary 
  (rep_id, rep_name, call_volume, success_rate, sentiment_score, top_keywords, insights, time_period)
VALUES
  ('rep1', 'Rep Sam', 37, 0.78, 0.73, ARRAY['pricing', 'features', 'support'], ARRAY['High success rate on calls', 'Maintains positive customer sentiment'], 'all_time'),
  ('rep2', 'Rep Alex', 45, 0.65, 0.68, ARRAY['pricing', 'features', 'timeline'], ARRAY['High call volume performer', 'Good sentiment score'], 'all_time'),
  ('rep3', 'Rep Jordan', 38, 0.81, 0.79, ARRAY['pricing', 'support', 'onboarding'], ARRAY['High success rate on calls', 'Maintains positive customer sentiment', 'Consistent performer'], 'all_time')
ON CONFLICT (rep_id) DO UPDATE SET
  rep_name = EXCLUDED.rep_name,
  call_volume = EXCLUDED.call_volume,
  success_rate = EXCLUDED.success_rate,
  sentiment_score = EXCLUDED.sentiment_score,
  top_keywords = EXCLUDED.top_keywords,
  insights = EXCLUDED.insights,
  time_period = EXCLUDED.time_period,
  updated_at = now(); 