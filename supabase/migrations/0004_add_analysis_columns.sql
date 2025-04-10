-- Migration: Add missing analysis columns to call_transcripts
-- Description: Ensures the call_transcripts table has columns for analysis results.

ALTER TABLE public.call_transcripts
  ADD COLUMN IF NOT EXISTS sentiment_score numeric NULL,
  ADD COLUMN IF NOT EXISTS keywords text[] NULL,
  ADD COLUMN IF NOT EXISTS call_score numeric NULL,
  ADD COLUMN IF NOT EXISTS talk_ratio_agent numeric NULL,
  ADD COLUMN IF NOT EXISTS talk_ratio_customer numeric NULL,
  ADD COLUMN IF NOT EXISTS transcript_segments jsonb NULL,
  ADD COLUMN IF NOT EXISTS language text NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

COMMENT ON COLUMN public.call_transcripts.sentiment_score IS 'Numerical sentiment score from analysis.';
COMMENT ON COLUMN public.call_transcripts.keywords IS 'Array of extracted keywords from analysis.';
COMMENT ON COLUMN public.call_transcripts.call_score IS 'Overall calculated call score from analysis.';
COMMENT ON COLUMN public.call_transcripts.talk_ratio_agent IS 'Percentage of agent talk time from analysis.';
COMMENT ON COLUMN public.call_transcripts.talk_ratio_customer IS 'Percentage of customer talk time from analysis.';
COMMENT ON COLUMN public.call_transcripts.transcript_segments IS 'Structured segments with speaker/time info.';
COMMENT ON COLUMN public.call_transcripts.language IS 'Detected language from transcription.';
COMMENT ON COLUMN public.call_transcripts.metadata IS 'Store extra analysis data or metrics.'; 
 