// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.52.0/mod.ts"; 

// --- Environment Variables (Set in Supabase Function Settings) ---
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
  console.error("Missing one or more required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY).");
  // Cannot proceed without credentials
}
// --- -- -

// --- Initialize Clients ---
// Use optional chaining or handle potential undefined values if env vars might be missing at runtime despite check
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const supabaseAdmin: SupabaseClient | null = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;
// --- -- -

console.log("Function 'analyze-transcript' initializing.");

serve(async (req) => {
  let transcriptId: string | null = null; // Keep track of ID for error logging

  // Ensure clients are initialized
  if (!openai || !supabaseAdmin) {
    console.error("OpenAI or Supabase client failed to initialize due to missing environment variables.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const payload = await req.json();
    // Assuming triggered by DB webhook on insert: payload = { type: 'INSERT', table: '...', record: { id: ..., text: ... }, ... }
    const record = payload?.record;
    console.log("Received webhook payload:", payload?.type, record?.id); // Log type and ID safely

    if (payload?.type !== 'INSERT' || !record || !record.id || !record.text) {
      console.warn("Invalid or missing record data in webhook payload:", payload);
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    transcriptId = record.id;
    const transcriptText = record.text;
    console.log(`Processing transcript ID: ${transcriptId}`);
    if (transcriptText.length < 10) { // Basic sanity check
        console.warn(`Transcript text for ${transcriptId} seems too short. Skipping analysis.`);
        // Optionally update DB to indicate skipped analysis
         await supabaseAdmin
            .from('call_transcripts')
            .update({ call_score: 0, sentiment: 'neutral', keywords: ['skipped_short_transcript'] }) // Indicate skipped
            .eq('id', transcriptId);
        return new Response(JSON.stringify({ message: "Transcript too short, skipped analysis.", id: transcriptId }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // --- Analysis Tasks (Add robust error handling for each API call) ---
    let sentiment = 'neutral';
    let sentiment_score = 0.5;
    let keywords: string[] = [];
    let call_score: number | null = null; // Initialize as null

    // 1. Sentiment Analysis
    try {
      const sentimentPrompt = `Analyze the overall sentiment of the following call transcript text. Return only ONE word from this list: "positive", "negative", or "neutral".

Transcript:
"""
${transcriptText}
"""

Sentiment:`;
      const sentimentCompletion = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: sentimentPrompt,
        max_tokens: 5, // Only need one word
        temperature: 0.1,
        stop: ["\n"], // Stop generation after the first line
      });
      const rawSentiment = sentimentCompletion.choices[0]?.text.trim().toLowerCase().replace(/[^a-z]/g, ''); // Clean output
      if (['positive', 'negative', 'neutral'].includes(rawSentiment)) {
        sentiment = rawSentiment;
      } else {
        console.warn(`Unexpected sentiment result for ${transcriptId}: '${rawSentiment}'. Defaulting to neutral.`);
        sentiment = 'neutral';
      }
      // Assign score based on determined sentiment
      sentiment_score = sentiment === 'positive' ? 0.85 : sentiment === 'negative' ? 0.15 : 0.5;
      console.log(`Sentiment for ${transcriptId}: ${sentiment} (Score: ${sentiment_score.toFixed(2)})`);
    } catch (e) {
      console.error(`Sentiment analysis API call failed for ${transcriptId}:`, e.message || e);
      // Keep default sentiment/score on error
    }

    // 2. Keyword Extraction
    try {
      const keywordPrompt = `Extract the 5-10 most relevant and specific keywords or short phrases (2-3 words max) from the following call transcript. Focus on topics discussed, product names, objections, action items, or key outcomes. Return them as a comma-separated list.

Transcript:
"""
${transcriptText}
"""

Keywords:`;
      const keywordCompletion = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: keywordPrompt,
        max_tokens: 80, // Allow slightly more tokens for keywords
        temperature: 0.3,
      });
      const rawKeywords = keywordCompletion.choices[0]?.text.trim();
      if (rawKeywords) {
          keywords = rawKeywords.split(',').map(kw => kw.trim()).filter(kw => kw && kw.length > 1 && kw.length < 50); // Basic filtering
          console.log(`Keywords extracted for ${transcriptId}:`, keywords.slice(0, 10)); // Log first 10
      } else {
          console.warn(`No keywords extracted for ${transcriptId}.`);
      }
    } catch (e) {
      console.error(`Keyword extraction API call failed for ${transcriptId}:`, e.message || e);
      // Keep keywords array empty on error
    }

    // 3. Call Score Calculation (using dedicated prompt)
    try {
        const callScorePrompt = `Analyze the following sales call transcript. Evaluate its overall effectiveness based on factors like professionalism, clarity, addressing customer needs/objections, identifying next steps, and achieving call objectives (if apparent). Provide a score between 0 and 100, where 0 is very poor and 100 is excellent. Return ONLY the numeric score.

Transcript:
"""
${transcriptText}
"""

Overall Score (0-100):`;
        const scoreCompletion = await openai.completions.create({
            model: "gpt-3.5-turbo-instruct",
            prompt: callScorePrompt,
            max_tokens: 5, // Expecting only a number
            temperature: 0.2,
            stop: ["\n"],
        });
        const rawScore = scoreCompletion.choices[0]?.text.trim();
        const parsedScore = parseInt(rawScore, 10);

        if (!isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 100) {
            call_score = parsedScore;
            console.log(`Calculated Call Score for ${transcriptId}: ${call_score}`);
        } else {
            console.warn(`Failed to parse valid call score for ${transcriptId} from response: '${rawScore}'. Leaving score null.`);
            call_score = null; // Keep it null if parsing fails
        }

    } catch (e) {
        console.error(`Call Score API call failed for ${transcriptId}:`, e.message || e);
        call_score = null; // Ensure score is null on API error
    }


    // 4. Talk Ratio (Deferred)
    // TODO: Implement talk ratio calculation. Requires speaker diarization data from the transcription service
    //       (e.g., segments labeled by speaker). Update WhisperService to request this if possible, or integrate
    //       a separate diarization step. For now, these fields remain null.
    const talk_ratio_agent = null;
    const talk_ratio_customer = null;

    // --- Update Database ---
    console.log(`Attempting to update call_transcripts for ID: ${transcriptId}`);
    const { error: updateError } = await supabaseAdmin
      .from('call_transcripts')
      .update({
        sentiment: sentiment,
        sentiment_score: sentiment_score,
        keywords: keywords.length > 0 ? keywords : null, // Store null if no keywords found
        call_score: call_score, // Store the calculated score (or null if failed)
        talk_ratio_agent: talk_ratio_agent,
        talk_ratio_customer: talk_ratio_customer,
        // Add a timestamp to track when analysis was completed/updated
        analysis_completed_at: new Date().toISOString(), 
      })
      .eq('id', transcriptId);

    if (updateError) {
      console.error(`DB Update failed for ${transcriptId}:`, updateError);
      // Don't throw here, allow function to return 500 status code below
      throw new Error(`Database update failed: ${updateError.message}`); // Re-throw specific DB error
    }

    console.log(`Successfully updated transcript ID: ${transcriptId}`);
    return new Response(JSON.stringify({ success: true, id: transcriptId }), {
      headers: { "Content-Type": "application/json" }, status: 200
    });

  } catch (error) {
    console.error(`Edge Function Error (Transcript ID: ${transcriptId || 'Unknown'}):`, error.message || error);
    return new Response(JSON.stringify({ 
        error: error.message || "Internal Server Error", 
        details: error.cause ? JSON.stringify(error.cause) : undefined 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/* 
Potential Improvements:
- Use chat models (gpt-3.5-turbo, gpt-4o-mini) for potentially better structured output (JSON mode).
- Implement more sophisticated error handling and retries for API calls.
- Add speaker diarization for talk ratio.
- Make analysis prompts configurable.
- Batch updates to the database if webhook volume becomes very high (less likely with individual triggers).
*/

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/analyze-transcript' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
