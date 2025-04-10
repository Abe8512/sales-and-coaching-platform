import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { errorBridgeService, ErrorCategory } from '../../services/ErrorBridgeService';

// Store the client instance globally
let supabaseClientInstance: SupabaseClient | null = null;

// Helper function to get environment variables safely (copied from Index.tsx)
const getEnvVariable = (viteName: string, nextName: string): string | undefined => {
  // Vite uses import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Need to cast as any because TS doesn't know VITE_* properties exist
    return (import.meta.env as any)[viteName]; 
  }
  // Next.js uses process.env (replaced at build time)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[nextName];
  }
  return undefined;
};

/**
 * Get the Supabase client instance.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClientInstance) {
    // console.debug('[customClient] Using existing Supabase client instance');
    return supabaseClientInstance;
  }

  try {
    // Read credentials robustly using the helper
    const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      const missingVar = !supabaseUrl ? 'VITE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL' : 'VITE_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY';
      const errorMsg = `Supabase URL or Anonymous Key is missing in environment variables (${missingVar})`;
      errorBridgeService.reportError(
        new Error(errorMsg),
        ErrorCategory.INTEGRATION,
        { service: 'Supabase', missing: missingVar },
        true 
      );
      throw new Error(errorMsg);
    }

    // Create a new Supabase client 
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    
    console.debug('[customClient] Supabase client initialized successfully from environment variables.');
    
    return supabaseClientInstance;
  } catch (error) {
    errorBridgeService.reportError(
      error,
      ErrorCategory.INTEGRATION,
      { service: 'Supabase', action: 'initialization' },
      true
    );
    throw error; 
  }
}

// Export default function for convenience
export default getSupabaseClient;

// No need to extend the SupabaseClient as our Database type already includes the function definitions 