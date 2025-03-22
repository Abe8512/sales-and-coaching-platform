-- Migration script to add the missing team_members table
-- This should be run manually by a database administrator to fix the schema issue

-- First check if the table already exists to avoid errors
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'team_members'
    ) THEN
        -- Create the team_members table
        CREATE TABLE team_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            member_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'member',
            avatar VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, member_id)
        );
        
        -- Add indexes for performance
        CREATE INDEX idx_team_members_user_id ON team_members(user_id);
        CREATE INDEX idx_team_members_member_id ON team_members(member_id);
        
        -- Log the change
        RAISE NOTICE 'Created team_members table';
    ELSE
        RAISE NOTICE 'team_members table already exists';
    END IF;
END $$;

-- Log success
SELECT 'Migration completed successfully' AS status; 