import { getSupabaseClient } from '@/integrations/supabase/customClient';
import { reportError, ErrorCategory } from '@/services/ErrorBridgeService';
import {
  ServiceResponse,
  createSuccessResponse,
  createErrorResponse,
  CollectionResponse,
  createPaginatedResponse
} from '@/services/ResponseTypes';

/**
 * Sample data types for demonstration
 */
export interface SampleItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  userId: string;
}

export interface SampleItemInput {
  name: string;
  description?: string;
  userId: string;
}

export interface SampleFilter {
  userId?: string;
  searchQuery?: string;
  limit?: number;
  page?: number;
}

/**
 * Sample service demonstrating standardized error handling pattern
 */
export class SampleService {
  private static instance: SampleService;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): SampleService {
    if (!this.instance) {
      this.instance = new SampleService();
    }
    return this.instance;
  }
  
  /**
   * Get a collection of items with pagination
   */
  async getItems(filter?: SampleFilter): Promise<CollectionResponse<SampleItem>> {
    const supabase = getSupabaseClient();
    try {
      // Build the query
      let query = supabase.from('sample_items').select('*', { count: 'exact' });
      
      // Apply filters
      if (filter?.userId) {
        query = query.eq('user_id', filter.userId);
      }
      
      if (filter?.searchQuery) {
        query = query.ilike('name', `%${filter.searchQuery}%`);
      }
      
      // Apply pagination
      const page = filter?.page || 0;
      const limit = filter?.limit || 20;
      query = query.range(page * limit, (page + 1) * limit - 1);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      // Transform data if needed
      const transformedData: SampleItem[] = data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        createdAt: item.created_at,
        userId: item.user_id
      })) || [];
      
      // Return standardized response
      return createPaginatedResponse(
        transformedData,
        count || undefined,
        limit,
        page
      );
    } catch (error) {
      reportError(error, ErrorCategory.DATABASE, { action: 'getItems', filter });
      throw error;
    }
  }
  
  /**
   * Get a single item by ID
   */
  async getItemById(id: string): Promise<ServiceResponse<SampleItem>> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('sample_items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        // Transform not found errors to be more user-friendly
        if (error.code === 'PGRST116') {
          throw new Error(`Item with ID ${id} was not found`);
        }
        throw error;
      }
      
      if (!data) {
        throw new Error(`Item with ID ${id} was not found`);
      }
      
      // Transform and return
      const item: SampleItem = {
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.created_at,
        userId: data.user_id
      };
      
      return createSuccessResponse(item);
    } catch (error) {
      reportError(error, ErrorCategory.DATABASE, { action: 'getItemById', id });
      throw error;
    }
  }
  
  /**
   * Create a new item
   */
  async createItem(input: SampleItemInput): Promise<ServiceResponse<SampleItem>> {
    const supabase = getSupabaseClient();
    try {
      // Validate input
      if (!input.name) {
        throw new Error('Item name is required');
      }
      
      if (!input.userId) {
        throw new Error('User ID is required');
      }
      
      // Insert into database
      const { data, error } = await supabase
        .from('sample_items')
        .insert({
          name: input.name,
          description: input.description,
          user_id: input.userId
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('Failed to create item');
      }
      
      // Transform and return
      const newItem: SampleItem = {
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.created_at,
        userId: data.user_id
      };
      
      return createSuccessResponse(newItem);
    } catch (error) {
      reportError(error, ErrorCategory.DATABASE, { action: 'createItem', input });
      throw error;
    }
  }
  
  /**
   * Update an existing item
   */
  async updateItem(id: string, updates: Partial<SampleItemInput>): Promise<ServiceResponse<SampleItem>> {
    const supabase = getSupabaseClient();
    try {
      // Check if item exists first
      const existingItem = await this.getItemById(id);
      if (existingItem.error) {
        throw existingItem.error;
      }
      
      // Update in database
      const { data, error } = await supabase
        .from('sample_items')
        .update({
          name: updates.name,
          description: updates.description,
          // Don't allow changing userId through updates
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error(`Failed to update item with ID: ${id}`);
      }
      
      // Transform and return
      const updatedItem: SampleItem = {
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.created_at,
        userId: data.user_id
      };
      
      return createSuccessResponse(updatedItem);
    } catch (error) {
      reportError(error, ErrorCategory.DATABASE, { action: 'updateItem', id, updates });
      throw error;
    }
  }
  
  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<ServiceResponse<boolean>> {
    const supabase = getSupabaseClient();
    try {
      // Check if item exists first
      const existingItem = await this.getItemById(id);
      if (existingItem.error) {
        throw existingItem.error;
      }
      
      // Delete from database
      const { error } = await supabase
        .from('sample_items')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      return createSuccessResponse(true);
    } catch (error) {
      reportError(error, ErrorCategory.DATABASE, { action: 'deleteItem', id });
      throw error;
    }
  }
}

// Export singleton instance
export const sampleService = SampleService.getInstance();

// Define an example interface
interface SampleData {
  id: string;
  name: string;
  value: number;
}

/**
 * Example service function to fetch sample data.
 * Assumes a table named 'sample_data' exists.
 * @param id The ID of the sample data to fetch.
 */
export const fetchSampleData = async (id: string): Promise<SampleData | null> => {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('sample_data') // Replace with your actual table name
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Handle "Not Found" specifically if needed
        console.warn(`Sample data with ID ${id} not found.`);
        return null; // Return null instead of throwing for not found
      }
      throw error; // Throw other errors
    }
    return data as SampleData || null;
  } catch (error) {
    reportError(error, ErrorCategory.DATABASE, { action: 'fetchSampleData', id });
    throw error; // Re-throw after reporting
  }
};

/**
 * Example service function to create sample data.
 */
export const createSampleData = async (payload: Omit<SampleData, 'id'>): Promise<SampleData> => {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('sample_data') // Replace with your actual table name
      .insert([payload])
      .select()
      .single();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('Sample data creation returned no data.');
    }
    return data as SampleData;
  } catch (error) {
    reportError(error, ErrorCategory.DATABASE, { action: 'createSampleData' });
    throw error;
  }
}; 