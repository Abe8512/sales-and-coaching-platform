-- Migration: Create Core Tables
-- Description: Sets up the initial tables for users, teams, calls, and transcripts.

-- Enable Row Level Security (RLS) by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- USERS Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'rep'::text NOT NULL CHECK (role IN ('admin', 'manager', 'rep')),
  team_id uuid,
  manager_id uuid, -- Reference to the manager's user ID
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
  -- Add other user profile fields as needed
);
COMMENT ON TABLE public.users IS 'Stores user profile information.';

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for USERS (REVISED)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;

-- Policy 1: Users can read their own profile.
CREATE POLICY "Allow users read own profile" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (specific columns).
-- Example: Allowing only name update
CREATE POLICY "Allow users update own profile" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  -- To allow updating specific columns only:
  -- WITH CHECK (auth.uid() = id AND col1 = NEW.col1 AND col2 = NEW.col2 ...);

-- Policy 3: Admins can perform any action on any user profile.
-- Avoids recursion by directly checking the role claim from the JWT.
CREATE POLICY "Allow admin full access" ON public.users
  FOR ALL 
  USING (auth.jwt() ->> 'user_role' = 'admin') -- Check role from JWT claim (ensure role is in JWT!)
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- OPTIONAL Policy 4: Managers can view users in their team.
-- This requires team_id to be correctly set on users.
-- DROP POLICY IF EXISTS "Allow manager view team members" ON public.users;
-- CREATE POLICY "Allow manager view team members" ON public.users
--   FOR SELECT
--   USING (
--     auth.jwt() ->> 'user_role' = 'manager' AND
--     team_id = ANY(SELECT users.team_id FROM users WHERE id = auth.uid())
--     -- Alternatively, if manager's managed teams are stored:
--     -- team_id = ANY(SELECT unnest(managedTeams) FROM users WHERE id = auth.uid())
--   );

-- TEAMS Table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  manager_id uuid, -- Optional: Direct link to manager user ID
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.teams IS 'Stores team information.';

-- Add foreign key constraint from users to teams
ALTER TABLE public.users ADD CONSTRAINT fk_users_team_id FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD CONSTRAINT fk_users_manager_id FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;
-- Add foreign key constraint from teams to users (manager)
ALTER TABLE public.teams ADD CONSTRAINT fk_teams_manager_id FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Policies for TEAMS
-- Allow authenticated users to read all teams (adjust if needed)
CREATE POLICY "Allow authenticated read access" ON public.teams FOR SELECT USING (auth.role() = 'authenticated');
-- Allow admins/managers to manage teams (expand manager capabilities later if needed)
CREATE POLICY "Allow admin full access" ON public.teams FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));


-- CALLS Table (Optional but recommended for call metadata)
CREATE TABLE IF NOT EXISTS public.calls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_identifier text, -- e.g., phone number, email, CRM ID
  call_start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  call_end_time timestamp with time zone,
  duration_seconds integer, -- Calculated duration
  metadata jsonb, -- Store other call metadata like direction (inbound/outbound)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.calls IS 'Stores metadata for each call instance.';

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Policies for CALLS (Example - Needs refinement based on roles)
-- Allow users to manage their own calls
CREATE POLICY "Allow users to manage own calls" ON public.calls FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Allow managers to view calls of their team members (Requires manager relationship)
-- CREATE POLICY "Allow managers to view team calls" ON public.calls FOR SELECT USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'manager' AND u.id = public.calls.user_id)); -- Need to join to check manager's team
-- Allow admins full access
CREATE POLICY "Allow admin full access" ON public.calls FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- CALL_TRANSCRIPTS Table
CREATE TABLE IF NOT EXISTS public.call_transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid REFERENCES public.calls(id) ON DELETE CASCADE, -- Link to the call metadata (optional)
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename text, -- Original audio filename
  text text NOT NULL, -- Full transcript text
  duration numeric, -- Duration from Whisper
  language text, -- Detected language from Whisper
  sentiment text, -- Derived sentiment (e.g., positive, negative, neutral)
  sentiment_score numeric, -- Numerical sentiment score
  keywords text[], -- Array of extracted keywords
  call_score numeric, -- Overall calculated call score
  talk_ratio_agent numeric, -- Percentage of agent talk time
  talk_ratio_customer numeric, -- Percentage of customer talk time
  transcript_segments jsonb, -- Store word timings or speaker segments
  metadata jsonb, -- Store extra analysis data
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.call_transcripts IS 'Stores call transcriptions and associated analysis results.';

-- Add Indexes for common filtering/sorting
CREATE INDEX IF NOT EXISTS idx_call_transcripts_user_id ON public.call_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_created_at ON public.call_transcripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_sentiment ON public.call_transcripts(sentiment);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_call_id ON public.call_transcripts(call_id);

-- Enable RLS
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;

-- Policies for CALL_TRANSCRIPTS (Example - Needs refinement)
-- Allow users to manage their own transcripts
CREATE POLICY "Allow users to manage own transcripts" ON public.call_transcripts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Allow managers to view transcripts of their team members (Requires manager relationship)
-- CREATE POLICY "Allow managers to view team transcripts" ON public.call_transcripts FOR SELECT USING (...);
-- Allow admins full access
CREATE POLICY "Allow admin full access" ON public.call_transcripts FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now()); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for teams table
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add more triggers for other tables if needed 