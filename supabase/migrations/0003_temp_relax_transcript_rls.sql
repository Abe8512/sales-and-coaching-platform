-- Migration: Relax RLS for call_transcripts (Temporary Debugging)
-- Description: Adds a permissive SELECT policy to call_transcripts for authenticated users.
-- WARNING: This is for debugging only. Remove or replace with stricter policies before production.

-- Drop potentially conflicting simpler policies if they exist from previous steps
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.call_transcripts;
DROP POLICY IF EXISTS "Allow users to manage own transcripts" ON public.call_transcripts;

-- Create a temporary policy allowing any authenticated user to read all transcripts
CREATE POLICY "TEMP Allow all authenticated read" ON public.call_transcripts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Ensure admins still have full access (might be redundant if default privileges work, but explicit is safer)
DROP POLICY IF EXISTS "Allow admin full access" ON public.call_transcripts; -- Drop existing admin policy first
CREATE POLICY "Allow admin full access" ON public.call_transcripts
  FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  
-- Note: You might still need INSERT/UPDATE/DELETE policies for users/admins later. 