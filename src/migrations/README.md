# Database Migrations

This directory contains SQL migration scripts for the Future Sentiment Analytics application.

## Current Migrations

### 1. Add Metadata Column to call_transcripts Table

**File**: `add_metadata_column.sql`

**Purpose**: Adds the missing `metadata` column to the `call_transcripts` table to fix the error:
```
Failed to save transcript: Could not find the 'metadata' column of 'call_transcripts' in the schema cache
```

**How to Apply**:

1. Connect to your Supabase database using the SQL Editor:
   - Log in to your Supabase dashboard
   - Navigate to the SQL Editor section
   - Create a new query

2. Copy the contents of `add_metadata_column.sql` 

3. Paste and execute the script in the SQL Editor

4. Verify that the migration completed successfully by checking for the message:
   ```
   Migration completed successfully
   ```

5. You can also verify the column was added by querying the table structure:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'call_transcripts';
   ```

**Note**: The application has been updated to gracefully handle the missing column, so if you can't immediately apply the migration, the system will still function but will not store the metadata information for call transcripts. 