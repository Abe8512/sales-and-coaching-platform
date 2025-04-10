// Supabase Edge Function to periodically check metrics health
// This function is designed to be triggered by a cron schedule (e.g., daily)

// Note: This file may show linter errors in the local editor due to Deno imports
// These errors can be ignored as this will run in the Supabase Edge Functions environment

// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  try {
    // Create client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check authorization header for webhook security
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Simple token verification (in production, use a more secure approach)
    const token = authHeader.split(" ")[1];
    const expectedToken = Deno.env.get("METRICS_MONITOR_TOKEN") || "";
    if (token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Starting metrics health monitoring");
    const startTime = performance.now();

    // Run the health checks function
    const { data, error } = await supabase.rpc("run_all_health_checks");

    if (error) {
      throw error;
    }

    // Get summaries of issues found to include in the response
    const { data: healthSummary, error: healthError } = await supabase
      .rpc("get_metrics_health_dashboard");

    if (healthError) {
      throw healthError;
    }

    const executionTime = (performance.now() - startTime).toFixed(2);
    
    console.log(`Metrics health checks completed in ${executionTime}ms`);

    // Return success with issue summary
    return new Response(
      JSON.stringify({
        success: true,
        execution_time_ms: executionTime,
        summary: healthSummary
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error running metrics health checks:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}); 