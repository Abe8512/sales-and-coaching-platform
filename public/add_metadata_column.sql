-- Migration script to add the missing metadata column to call_transcripts table
-- This should be run manually by a database administrator to fix the schema issue

-- First check if the column already exists to avoid errors
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'call_transcripts' 
        AND column_name = 'metadata'
    ) THEN
        -- Add the metadata column as JSONB type to store structured call metrics data
        EXECUTE 'ALTER TABLE call_transcripts ADD COLUMN metadata JSONB';
        
        -- Log the change
        RAISE NOTICE 'Added metadata column to call_transcripts table';
    ELSE
        RAISE NOTICE 'metadata column already exists in call_transcripts table';
    END IF;
END $$;

-- Create an index on the metadata column for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_call_transcripts_metadata ON call_transcripts USING GIN (metadata);

-- Log success
SELECT 'Migration completed successfully' AS status; 