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