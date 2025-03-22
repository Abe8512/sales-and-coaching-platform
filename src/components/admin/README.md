# Admin Components

This directory contains components for administration and maintenance of the Future Sentiment Analytics application.

## Components

### DatabaseFixes

A component that allows administrators to check and fix database schema issues. Currently supports:

1. Checking whether the `metadata` column exists in the `call_transcripts` table
2. Providing instructions for adding the missing column if it doesn't exist

## Background on the Metadata Column Issue

The application was encountering the following error when trying to upload audio files:

```
Failed to save transcript: Could not find the 'metadata' column of 'call_transcripts' in the schema cache
```

This error occurs because:
1. The application code expects a `metadata` column in the `call_transcripts` table
2. This column is missing from the database schema

### How the Issue Was Fixed

We've implemented a multi-layered solution to this problem:

1. **Graceful Degradation**: Updated `DatabaseService.ts` to detect if the column exists and skip adding metadata if it doesn't.
   - Added a check to see if the column exists before trying to use it
   - Added explicit removal of the `metadata` field from the insert data if the column doesn't exist
   - Added a second layer of protection that catches errors during insert and retries without the metadata field

2. **Retry Logic**: Enhanced `BulkUploadProcessorService.ts` to handle the metadata column error and retry the save operation.
   - Added specific error detection for metadata column errors
   - Implemented retry logic that attempts to save without the metadata field

3. **Admin Tools**: Created a `DatabaseFixes` component that helps administrators:
   - Check if the metadata column exists in the database
   - Get instructions for running the SQL migration to add the column

4. **Database Migration**: Created an SQL migration script in `src/migrations/add_metadata_column.sql` that:
   - Safely checks if the column already exists
   - Adds the column if it's missing
   - Creates an index on the column for better query performance

## Usage

1. Include the `DatabaseFixes` component in an admin section of the application
2. Administrators can check if the column exists and follow the provided instructions to fix it if needed
3. After applying the fix, the component can verify that the column was added successfully 