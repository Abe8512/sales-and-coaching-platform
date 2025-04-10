// JavaScript version of the adapter to avoid SWC TypeScript parsing issues
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase adapter implementation
 */
class SupabaseAdapter {
  static instance = null;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      },
      global: {
        headers: {
          'x-application-name': 'future-sentiment-analytics'
        }
      }
    });
  }

  /**
   * Get singleton instance of the adapter
   */
  static getInstance() {
    if (!SupabaseAdapter.instance) {
      SupabaseAdapter.instance = new SupabaseAdapter();
    }
    return SupabaseAdapter.instance;
  }

  /**
   * Get all records from a table with optional filtering
   */
  async getAll(table, options) {
    try {
      let query = this.client.from(table).select(options?.columns || '*');

      // Apply filters if provided
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      // Apply order by if provided
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }

      // Apply limit if provided
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      console.error(`Error in getAll for table ${table}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Get a record by ID
   */
  async getById(table, id, options) {
    try {
      const { data, error } = await this.client
        .from(table)
        .select(options?.columns || '*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      console.error(`Error in getById for table ${table}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Insert a new record
   */
  async insert(table, data) {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single();

      return { data: result, error };
    } catch (error) {
      console.error(`Error in insert for table ${table}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Update a record by ID
   */
  async update(table, id, data) {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      return { data: result, error };
    } catch (error) {
      console.error(`Error in update for table ${table}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(table, id) {
    try {
      const { data, error } = await this.client
        .from(table)
        .delete()
        .eq('id', id);

      return { data, error };
    } catch (error) {
      console.error(`Error in delete for table ${table}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Call a database function (RPC)
   */
  async callFunction(functionName, params) {
    try {
      const { data, error } = await this.client.rpc(functionName, params);
      return { data, error };
    } catch (error) {
      console.error(`Error calling function ${functionName}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Subscribe to realtime changes
   */
  subscribe(table, callback, event = '*', filter) {
    const channel = this.client
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, filter },
        (payload) => callback(payload)
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      this.client.removeChannel(channel);
    };
  }

  /**
   * Upload file to storage
   */
  async uploadFile(bucket, path, file, options) {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file, {
          upsert: options?.upsert || false,
          contentType: options?.contentType,
          cacheControl: options?.cacheControl || '3600',
        });

      return { data, error };
    } catch (error) {
      console.error(`Error uploading file to ${bucket}/${path}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Get a signed URL for a file
   */
  async getFileUrl(bucket, path) {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60); // 1 hour expiry

      return { data, error };
    } catch (error) {
      console.error(`Error getting signed URL for ${bucket}/${path}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(bucket, path) {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .remove([path]);

      return { data, error };
    } catch (error) {
      console.error(`Error deleting file ${bucket}/${path}:`, error);
      return { data: null, error };
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(email, password, metadata) {
    try {
      return await this.client.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
    } catch (error) {
      console.error('Error in signUp:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign in a user
   */
  async signIn(email, password) {
    try {
      return await this.client.auth.signInWithPassword({
        email,
        password
      });
    } catch (error) {
      console.error('Error in signIn:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      return await this.client.auth.signOut();
    } catch (error) {
      console.error('Error in signOut:', error);
      return { error };
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    try {
      return await this.client.auth.getUser();
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return { data: null, error };
    }
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback) {
    try {
      const { data } = this.client.auth.onAuthStateChange(callback);
      return { data, error: null };
    } catch (error) {
      console.error('Error in onAuthStateChange:', error);
      return { data: null, error };
    }
  }

  /**
   * Get the raw Supabase client (should be used only in special cases)
   * @returns SupabaseClient
   */
  getRawClient() {
    return this.client;
  }
}

// Export a singleton instance of the adapter
export const db = SupabaseAdapter.getInstance();

// Export the adapter class
export { SupabaseAdapter }; 