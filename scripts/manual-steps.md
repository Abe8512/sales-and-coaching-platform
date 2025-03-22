# Manual Setup Steps for Supabase

If you're having trouble with the automated deployment script, follow these manual steps to set up the database in Supabase.

## 1. Navigate to SQL Editor

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on the "SQL Editor" option in the left sidebar

## 2. Create Tables and Security Policies

Copy and paste the following SQL and run it:

```sql
-- Call metrics summary table (for aggregated metrics)
CREATE TABLE IF NOT EXISTS public.call_metrics_summary (
  id TEXT PRIMARY KEY, -- Use text for fixed IDs like 'global'
  total_calls INTEGER DEFAULT 0,
  avg_sentiment NUMERIC DEFAULT 0.5,
  agent_talk_ratio NUMERIC DEFAULT 50,
  customer_talk_ratio NUMERIC DEFAULT 50,
  top_keywords TEXT[] DEFAULT '{}',
  performance_score INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  avg_call_duration INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  unsuccessful_calls INTEGER DEFAULT 0,
  time_period TEXT DEFAULT 'all_time',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rep metrics summary table (for individual rep metrics)
CREATE TABLE IF NOT EXISTS public.rep_metrics_summary (
  rep_id TEXT PRIMARY KEY, -- Use rep_id as primary key for simpler management
  rep_name TEXT,
  call_volume INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  sentiment_score NUMERIC DEFAULT 0.5,
  top_keywords TEXT[] DEFAULT '{}',
  insights TEXT[] DEFAULT '{}',
  time_period TEXT DEFAULT 'all_time',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.call_metrics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_metrics_summary ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (for development)
CREATE POLICY IF NOT EXISTS "Allow public access to call_metrics_summary" 
  ON public.call_metrics_summary 
  FOR ALL 
  TO anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public access to rep_metrics_summary" 
  ON public.rep_metrics_summary 
  FOR ALL 
  TO anon
  USING (true);
```

## 3. Create Stored Procedures

Run the following SQL to create the stored procedures:

```sql
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
```

## 4. Configure Realtime

Add the tables to the realtime publication:

```sql
-- Add tables to realtime publication
DO
$$
DECLARE
  new_tables TEXT[] := ARRAY['call_metrics_summary', 'rep_metrics_summary'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY new_tables
  LOOP
    -- Check if the table is already in the publication
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = t
    ) THEN
      -- Set replica identity to FULL for the table
      EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', t);
      
      -- Add the table to the publication
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      
      RAISE NOTICE 'Added table % to realtime publication', t;
    ELSE
      RAISE NOTICE 'Table % is already in the realtime publication', t;
    END IF;
  END LOOP;
END;
$$;
```

## 5. Insert Sample Data

To add some sample data for testing:

```sql
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
```

## 6. Configure Client Code

In your application's `DataSyncService.ts`, ensure that the service properly uses the stored procedures with fallback mechanisms as shown below:

```typescript
// Update call_metrics_summary table using stored procedure
try {
  const { error } = await supabase.rpc('upsert_call_metrics_summary', {
    p_id: 'global',
    p_total_calls: totalCalls,
    // ... other parameters
  });
  
  if (error) throw error;
} catch (err) {
  // Fallback to direct insert if stored procedure fails
  console.error('Error using stored procedure:', err);
  const { error: insertError } = await supabase
    .from('call_metrics_summary')
    .upsert({
      id: 'global',
      total_calls: totalCalls,
      // ... other fields
    });
  
  if (insertError) throw insertError;
}
```

## 7. Verify Setup

After setting up the database:

1. Go to the "Table Editor" in Supabase
2. Verify that the `call_metrics_summary` and `rep_metrics_summary` tables exist
3. Check that the RLS (Row Level Security) policies are in place
4. Verify that the stored procedures are working by running a test query

## 8. Initialize Data Sync

Once the database is configured, run the initial data sync from your application:

```javascript
import { syncAllMetricsData } from './services/DataSyncService';

// Trigger initial sync
syncAllMetricsData()
  .then(() => console.log('Initial data sync completed'))
  .catch(err => console.error('Error during initial sync:', err));
``` 