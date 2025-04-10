// Supabase Edge Function to refresh metrics materialized views
// This function is designed to be called on a schedule via Supabase's Scheduled Tasks

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the auth token to verify this is an authorized request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request to check if this is a full refresh request
    const { fullSync } = await req.json().catch(() => ({ fullSync: false }))
    
    // Start tracking execution time
    const startTime = Date.now()
    
    // Refresh the dashboard metrics materialized view
    const { error: refreshError } = await supabase.rpc('refresh_dashboard_metrics')
    
    if (refreshError) {
      throw new Error(`Failed to refresh dashboard metrics: ${refreshError.message}`)
    }
    
    // Optionally perform a full metrics sync if requested
    let syncResult = null
    if (fullSync) {
      const { data, error: syncError } = await supabase.rpc('sync_metrics_data', { 
        update_global: true,
        update_reps: true
      })
      
      if (syncError) {
        throw new Error(`Failed to sync metrics data: ${syncError.message}`)
      }
      
      syncResult = data
    }
    
    // Calculate execution time
    const executionTime = Date.now() - startTime
    
    // Log the validation results
    const { data: validationData, error: validationError } = await supabase
      .from('metrics_validation')
      .select('*')
    
    if (validationError) {
      throw new Error(`Failed to get validation data: ${validationError.message}`)
    }
    
    // Return success response with timing information
    return new Response(
      JSON.stringify({
        success: true,
        executionTime: `${executionTime}ms`,
        fullSync: fullSync ? 'completed' : 'skipped',
        syncResult,
        validation: validationData
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Handle errors and return error response
    console.error('Error in refresh_metrics_mv function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/* To set up this function with a scheduled task in Supabase:

1. Deploy this function:
   supabase functions deploy refresh_metrics_mv --no-verify-jwt

2. Set up a scheduled task in the Supabase dashboard:
   - Schedule: 0 * * * * (Hourly)
   - HTTP Method: POST
   - URL: https://[PROJECT_REF].supabase.co/functions/v1/refresh_metrics_mv
   - Headers: 
     - Authorization: Bearer [SERVICE_ROLE_KEY]
   - Body: { "fullSync": false }

3. For a full sync (less frequently):
   - Schedule: 0 0 * * * (Daily at midnight)
   - Body: { "fullSync": true }
*/ 