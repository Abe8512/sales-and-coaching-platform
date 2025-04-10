// supabase/functions/invite-team-member/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables (set in Supabase Function Settings)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

console.log("Function 'invite-team-member' initializing (v5 - Production Logic).");

// Define CORS Headers - Allow specific origin in production
// For development, allow localhost. Adjust '*' or origin list for production.
const allowedOrigins = ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082']; // Add your frontend dev ports

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0], // Dynamically set or restrict
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS' // Explicitly allow POST and OPTIONS
  };

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request");
    return new Response('ok', { headers: corsHeaders });
  }
  
  // Initialize Supabase Admin Client (moved inside handler)
  let supabaseAdmin: SupabaseClient;
  try {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  } catch (initError) {
      console.error("Failed to initialize Supabase Admin Client:", initError);
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  let requestData: any;
  try {
    requestData = await req.json();
  } catch (e) {
    console.error("Invalid JSON payload", e)
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, name, role, team_id, manager_id } = requestData;
  let invitedUserId: string | null = null;
  let userAlreadyExisted = false; // Flag to track if invite was skipped

  console.log("Received invite request:", { email, name, role, team_id, manager_id });

  if (!email || !name || !role) {
     console.error("Missing required fields");
     return new Response(JSON.stringify({ error: "Missing required fields: email, name, role" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!['rep', 'manager'].includes(role)) {
      console.error("Invalid role specified", { role });
      return new Response(JSON.stringify({ error: `Invalid role specified: ${role}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  try {
    // --- Step 1: Invite or Find User in auth.users --- 
    console.log(`Attempting to invite user: ${email}`);
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        { data: { name: name, role: role } }
    );

    if (inviteError) {
      if (inviteError.message.includes("User already registered")) {
          userAlreadyExisted = true; // Set the flag
          console.log(`User ${email} already registered. Fetching existing ID.`);
          // Fetch existing user ID more safely
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email: email });
          if (listError) {
              console.error(`Failed to list existing user ${email}:`, listError);
              throw new Error(`Error checking existing user: ${listError.message}`); // Throw if listUsers fails
          }
          invitedUserId = listData?.users?.[0]?.id ?? null; // Safely access the ID
          if (!invitedUserId) {
               throw new Error(`User ${email} exists in auth but could not retrieve ID.`);
          }
          console.log(`Found existing user ID: ${invitedUserId}`);
      } else {
          // Throw other unexpected invite errors
          console.error(`Error inviting user ${email}:`, inviteError);
          throw inviteError;
      }
    } else {
      // Invite was successful (new user)
      invitedUserId = inviteData?.user?.id;
      if (!invitedUserId) {
          throw new Error("Invite successful but failed to get new user ID from response.");
      }
      console.log(`Successfully invited ${email}, user ID: ${invitedUserId}`);
    }

    // --- Step 2: Upsert Profile in public.users --- 
    if (!invitedUserId) { 
        // Should not happen if logic above is correct, but safety check
        throw new Error("Could not determine user ID for profile upsert.");
    }
    
    console.log(`Upserting profile for user ID: ${invitedUserId}`);
    const { error: profileUpsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: invitedUserId, // Match on ID
        email: email,
        name: name,
        role: role,
        team_id: team_id, // Use team_id passed from frontend/context
        manager_id: manager_id, // Use manager_id passed from frontend/context
        updated_at: new Date().toISOString() // Explicitly set updated_at on upsert
      }, { onConflict: 'id' }); // Specify conflict target

    if (profileUpsertError) {
      console.error(`Failed to upsert profile for user ${invitedUserId}:`, profileUpsertError);
      console.warn(`User ${invitedUserId} invited/found, but profile upsert failed.`);
      // Decide if this should prevent overall success - maybe not?
    } else {
        console.log(`Successfully upserted profile for user ${invitedUserId}`);
    }

    // --- Return Success --- 
    return new Response(JSON.stringify({ 
        success: true, 
        userId: invitedUserId, 
        message: userAlreadyExisted ? "User already existed, profile updated." : "User invited and profile created/updated."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 200
    });

  } catch (error) {
    console.error(`Error in invite-team-member function (User: ${email}):`, error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 