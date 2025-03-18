
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
