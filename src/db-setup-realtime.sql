-- Create a function to check if a table is in a publication
CREATE OR REPLACE FUNCTION check_table_in_publication(table_name TEXT, publication_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if the table exists in the publication
  SELECT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = publication_name
    AND schemaname = 'public'
    AND tablename = table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- Create a function to set replica identity to FULL for a table
CREATE OR REPLACE FUNCTION set_replica_identity_full_for_table(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', table_name);
END;
$$;

-- Create a function to add a table to the realtime publication
CREATE OR REPLACE FUNCTION add_table_to_realtime_publication(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the publication exists, if not create it
  PERFORM pg_catalog.pg_publication_create('supabase_realtime', '{insert, update, delete}', FALSE);
  
  -- Add the table to the publication
  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
END;
$$;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_table_in_publication TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_replica_identity_full_for_table TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_table_to_realtime_publication TO authenticated, anon;

-- Add all the application tables to the realtime publication
DO
$$
DECLARE
  application_tables TEXT[] := ARRAY[
    'call_transcripts', 
    'calls', 
    'keyword_trends', 
    'sentiment_trends',
    'call_metrics_summary',
    'rep_metrics_summary'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY application_tables
  LOOP
    -- Only add if not already in the publication
    IF NOT check_table_in_publication(t, 'supabase_realtime') THEN
      PERFORM set_replica_identity_full_for_table(t);
      PERFORM add_table_to_realtime_publication(t);
      RAISE NOTICE 'Added table % to realtime publication', t;
    ELSE
      RAISE NOTICE 'Table % is already in the realtime publication', t;
    END IF;
  END LOOP;
END;
$$;
