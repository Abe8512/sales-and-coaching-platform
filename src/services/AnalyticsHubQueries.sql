-- Create unified view for analytics data
CREATE OR REPLACE VIEW analytics_unified_data AS
SELECT 
  c.id,
  c.created_at,
  c.user_id,
  c.text,
  c.filename,
  c.duration,
  c.call_score,
  c.sentiment,
  c.keywords,
  c.transcript_segments,
  u.name as user_name,
  u.team_id,
  t.name as team_name,
  CASE 
    WHEN c.sentiment = 'positive' THEN true
    ELSE false
  END as is_successful
FROM call_transcripts c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN teams t ON u.team_id = t.id;

-- Create aggregated metrics view
CREATE OR REPLACE VIEW analytics_metrics_summary AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  user_id,
  team_id,
  COUNT(*) as call_count,
  AVG(call_score) as avg_score,
  AVG(CASE WHEN sentiment = 'positive' THEN 1 WHEN sentiment = 'negative' THEN 0 ELSE 0.5 END) as avg_sentiment,
  SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_calls,
  SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_calls,
  SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_calls
FROM analytics_unified_data
GROUP BY DATE_TRUNC('day', created_at), user_id, team_id;

-- Create call_metrics_summary table if it doesn't exist
CREATE TABLE IF NOT EXISTS call_metrics_summary (
  id TEXT PRIMARY KEY,
  total_calls INTEGER,
  avg_sentiment FLOAT,
  agent_talk_ratio FLOAT,
  customer_talk_ratio FLOAT,
  top_keywords TEXT[],
  performance_score FLOAT,
  conversion_rate FLOAT,
  avg_call_duration FLOAT,
  successful_calls INTEGER,
  unsuccessful_calls INTEGER,
  time_period TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rep_metrics_summary table if it doesn't exist
CREATE TABLE IF NOT EXISTS rep_metrics_summary (
  rep_id TEXT,
  rep_name TEXT,
  call_volume INTEGER,
  success_rate FLOAT,
  sentiment_score FLOAT,
  top_keywords TEXT[],
  insights TEXT[],
  time_period TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (rep_id, time_period)
);

-- Function to get keyword analytics
CREATE OR REPLACE FUNCTION get_keyword_analytics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  rep_ids TEXT[] DEFAULT NULL
) 
RETURNS TABLE (
  keyword TEXT,
  count INTEGER,
  category TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH keyword_counts AS (
    SELECT 
      k as keyword,
      COUNT(*) as count
    FROM 
      call_transcripts,
      UNNEST(keywords) k
    WHERE 
      (start_date IS NULL OR created_at >= start_date) AND
      (end_date IS NULL OR created_at <= end_date) AND
      (rep_ids IS NULL OR user_id = ANY(rep_ids))
    GROUP BY 
      k
  )
  SELECT 
    kc.keyword,
    kc.count,
    COALESCE(kc.category, 'uncategorized') as category
  FROM 
    keyword_counts kc
  ORDER BY 
    count DESC
  LIMIT 50;
END;
$$;

-- Function to get sentiment trends
CREATE OR REPLACE FUNCTION get_sentiment_trends(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  rep_ids TEXT[] DEFAULT NULL
) 
RETURNS TABLE (
  date TEXT,
  sentiment TEXT,
  count INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
    sentiment,
    COUNT(*) as count
  FROM 
    call_transcripts
  WHERE 
    (start_date IS NULL OR created_at >= start_date) AND
    (end_date IS NULL OR created_at <= end_date) AND
    (rep_ids IS NULL OR user_id = ANY(rep_ids))
  GROUP BY 
    DATE_TRUNC('day', created_at), 
    sentiment
  ORDER BY 
    date;
END;
$$;

-- Function to synchronize metrics data
CREATE OR REPLACE FUNCTION sync_metrics_data()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  time_periods TEXT[] := ARRAY['day', 'week', 'month', 'quarter', 'year'];
  period TEXT;
BEGIN
  -- Loop through time periods
  FOREACH period IN ARRAY time_periods
  LOOP
    -- Upsert team metrics summary
    INSERT INTO call_metrics_summary (
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
    )
    WITH metrics AS (
      SELECT
        COUNT(*) as total_calls,
        AVG(CASE WHEN sentiment = 'positive' THEN 1 WHEN sentiment = 'negative' THEN 0 ELSE 0.5 END) as avg_sentiment,
        AVG(duration) as avg_duration,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as successful_calls,
        COUNT(*) - SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as unsuccessful_calls
      FROM call_transcripts
      WHERE 
        created_at >= CASE
          WHEN period = 'day' THEN NOW() - INTERVAL '1 day'
          WHEN period = 'week' THEN NOW() - INTERVAL '1 week'
          WHEN period = 'month' THEN NOW() - INTERVAL '1 month'
          WHEN period = 'quarter' THEN NOW() - INTERVAL '3 month'
          WHEN period = 'year' THEN NOW() - INTERVAL '1 year'
        END
    )
    SELECT
      period,
      m.total_calls,
      m.avg_sentiment,
      0.6, -- Placeholder for agent_talk_ratio
      0.4, -- Placeholder for customer_talk_ratio
      ARRAY[]::TEXT[], -- Placeholder for top_keywords
      70.0, -- Placeholder for performance_score
      CASE WHEN m.total_calls > 0 THEN m.successful_calls::FLOAT / m.total_calls ELSE 0 END,
      m.avg_duration,
      m.successful_calls,
      m.unsuccessful_calls,
      period,
      NOW()
    FROM metrics m
    ON CONFLICT (id) DO UPDATE
    SET
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
      updated_at = NOW();
      
    -- Upsert rep metrics summary
    INSERT INTO rep_metrics_summary (
      rep_id,
      rep_name,
      call_volume,
      success_rate,
      sentiment_score,
      top_keywords,
      insights,
      time_period,
      updated_at
    )
    WITH rep_metrics AS (
      SELECT
        c.user_id as rep_id,
        u.name as rep_name,
        COUNT(*) as call_volume,
        AVG(CASE WHEN c.sentiment = 'positive' THEN 1 WHEN c.sentiment = 'negative' THEN 0 ELSE 0.5 END) as sentiment_score,
        SUM(CASE WHEN c.sentiment = 'positive' THEN 1 ELSE 0 END) as successful_calls,
        COUNT(*) as total_calls
      FROM call_transcripts c
      JOIN users u ON c.user_id = u.id
      WHERE 
        c.created_at >= CASE
          WHEN period = 'day' THEN NOW() - INTERVAL '1 day'
          WHEN period = 'week' THEN NOW() - INTERVAL '1 week'
          WHEN period = 'month' THEN NOW() - INTERVAL '1 month'
          WHEN period = 'quarter' THEN NOW() - INTERVAL '3 month'
          WHEN period = 'year' THEN NOW() - INTERVAL '1 year'
        END
      GROUP BY c.user_id, u.name
    )
    SELECT
      rm.rep_id,
      rm.rep_name,
      rm.call_volume,
      CASE WHEN rm.total_calls > 0 THEN rm.successful_calls::FLOAT / rm.total_calls ELSE 0 END,
      rm.sentiment_score,
      ARRAY[]::TEXT[], -- Placeholder for top_keywords
      ARRAY[]::TEXT[], -- Placeholder for insights
      period,
      NOW()
    FROM rep_metrics rm
    ON CONFLICT (rep_id, time_period) DO UPDATE
    SET
      rep_name = EXCLUDED.rep_name,
      call_volume = EXCLUDED.call_volume,
      success_rate = EXCLUDED.success_rate,
      sentiment_score = EXCLUDED.sentiment_score,
      top_keywords = EXCLUDED.top_keywords,
      insights = EXCLUDED.insights,
      updated_at = NOW();
  END LOOP;
END;
$$; 

-- Create additional views for dashboard components

-- View for team performance comparison
CREATE OR REPLACE VIEW team_performance_view AS
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  COUNT(c.id) AS total_calls,
  AVG(c.call_score) AS avg_score,
  SUM(CASE WHEN c.sentiment = 'positive' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(c.id), 0) AS success_rate,
  AVG(c.duration) AS avg_duration
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
LEFT JOIN call_transcripts c ON u.id = c.user_id
WHERE c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name;

-- View for rep performance comparison
CREATE OR REPLACE VIEW rep_performance_view AS
SELECT 
  u.id AS rep_id,
  u.name AS rep_name,
  t.id AS team_id,
  t.name AS team_name,
  COUNT(c.id) AS call_count,
  AVG(c.call_score) AS avg_score,
  SUM(CASE WHEN c.sentiment = 'positive' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(c.id), 0) AS success_rate,
  AVG(c.duration) AS avg_duration,
  ARRAY(
    SELECT k 
    FROM (
      SELECT k, COUNT(*) AS cnt
      FROM call_transcripts c2
      JOIN users u2 ON c2.user_id = u2.id
      CROSS JOIN UNNEST(c2.keywords) AS k
      WHERE u2.id = u.id
      GROUP BY k
      ORDER BY cnt DESC
      LIMIT 5
    ) AS top_keywords
  ) AS top_keywords
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN call_transcripts c ON u.id = c.user_id
WHERE c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name, t.id, t.name;

-- View for call activity tracking
CREATE OR REPLACE VIEW call_activity_view AS
SELECT 
  DATE_TRUNC('day', c.created_at) AS call_date,
  COUNT(c.id) AS call_count,
  AVG(c.duration) AS avg_duration,
  SUM(CASE WHEN c.sentiment = 'positive' THEN 1 ELSE 0 END) AS positive_calls,
  SUM(CASE WHEN c.sentiment = 'negative' THEN 1 ELSE 0 END) AS negative_calls,
  SUM(CASE WHEN c.sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral_calls
FROM call_transcripts c
WHERE c.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', c.created_at)
ORDER BY call_date;

-- Function to get trending keywords in a specific time period
CREATE OR REPLACE FUNCTION get_trending_keywords(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  keyword TEXT,
  current_count INTEGER,
  previous_count INTEGER,
  growth_rate FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      k AS keyword,
      COUNT(*) AS count
    FROM 
      call_transcripts,
      UNNEST(keywords) k
    WHERE 
      created_at >= NOW() - (days_back * INTERVAL '1 day')
    GROUP BY 
      k
  ),
  previous_period AS (
    SELECT 
      k AS keyword,
      COUNT(*) AS count
    FROM 
      call_transcripts,
      UNNEST(keywords) k
    WHERE 
      created_at >= NOW() - (days_back * 2 * INTERVAL '1 day') AND
      created_at < NOW() - (days_back * INTERVAL '1 day')
    GROUP BY 
      k
  )
  SELECT 
    cp.keyword,
    cp.count AS current_count,
    COALESCE(pp.count, 0) AS previous_count,
    CASE 
      WHEN COALESCE(pp.count, 0) = 0 THEN 1.0
      ELSE (cp.count - COALESCE(pp.count, 0))::FLOAT / COALESCE(pp.count, 1)
    END AS growth_rate
  FROM 
    current_period cp
  LEFT JOIN 
    previous_period pp ON cp.keyword = pp.keyword
  ORDER BY 
    growth_rate DESC, current_count DESC
  LIMIT 20;
END;
$$;

-- Function to detect call pattern anomalies
CREATE OR REPLACE FUNCTION detect_call_anomalies(
  lookback_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  anomaly_date DATE,
  call_count INTEGER,
  avg_call_count FLOAT,
  deviation_percent FLOAT,
  is_significant BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH daily_counts AS (
    SELECT 
      DATE(created_at) AS call_date,
      COUNT(*) AS daily_count
    FROM 
      call_transcripts
    WHERE 
      created_at >= CURRENT_DATE - (lookback_days * INTERVAL '1 day')
    GROUP BY 
      DATE(created_at)
  ),
  stats AS (
    SELECT 
      AVG(daily_count) AS avg_count,
      STDDEV(daily_count) AS stddev_count
    FROM 
      daily_counts
  )
  SELECT 
    dc.call_date AS anomaly_date,
    dc.daily_count AS call_count,
    s.avg_count,
    ABS(dc.daily_count - s.avg_count) / GREATEST(s.avg_count, 1) * 100 AS deviation_percent,
    ABS(dc.daily_count - s.avg_count) > 2 * GREATEST(s.stddev_count, 1) AS is_significant
  FROM 
    daily_counts dc,
    stats s
  WHERE 
    ABS(dc.daily_count - s.avg_count) > 2 * GREATEST(s.stddev_count, 1)
  ORDER BY 
    deviation_percent DESC;
END;
$$;

-- Create a trigger function to automatically sync metrics when call_transcripts are updated
CREATE OR REPLACE FUNCTION trigger_sync_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Don't trigger too frequently - check last update time
  IF EXISTS (
    SELECT 1 FROM call_metrics_summary 
    WHERE updated_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Call the sync function
  PERFORM sync_metrics_data();
  RETURN NULL;
END;
$$;

-- Create a trigger on call_transcripts table to auto-update metrics
DROP TRIGGER IF EXISTS auto_sync_metrics ON call_transcripts;
CREATE TRIGGER auto_sync_metrics
AFTER INSERT OR UPDATE ON call_transcripts
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_sync_metrics();

-- Create an index to speed up analytics queries
CREATE INDEX IF NOT EXISTS idx_call_transcripts_created_at ON call_transcripts(created_at);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_user_id ON call_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_sentiment ON call_transcripts(sentiment);

-- Create materialized view for faster dashboard access
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
SELECT
  DATE_TRUNC('day', c.created_at)::DATE as date,
  COUNT(*) as call_count,
  AVG(c.call_score) as avg_score,
  SUM(CASE WHEN c.sentiment = 'positive' THEN 1 ELSE 0 END) as positive_calls,
  SUM(CASE WHEN c.sentiment = 'negative' THEN 1 ELSE 0 END) as negative_calls,
  SUM(CASE WHEN c.sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_calls,
  AVG(c.duration) as avg_duration
FROM 
  call_transcripts c
WHERE 
  c.created_at >= NOW() - INTERVAL '90 days'
GROUP BY 
  DATE_TRUNC('day', c.created_at)::DATE
ORDER BY 
  date;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_date ON dashboard_metrics(date);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW dashboard_metrics;
END;
$$; 