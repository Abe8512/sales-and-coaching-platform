import { getSupabaseClient } from "@/integrations/supabase/customClient";
import { reportError, ErrorCategory } from './ErrorBridgeService';
import { v4 as uuidv4 } from 'uuid';
import { userLogger as logger } from './LoggingService';

/**
 * Standardized response type for service methods
 */
export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * User type with consistent structure across the application
 */
export type User = {
  id: string;
  isAnonymous: boolean;
  createdAt?: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
};

/**
 * Service for consistent user ID handling across the application
 */
export const userService = {
  /**
   * Get the current user with consistent format
   * Tries authenticated user first, then falls back to anonymous user
   */
  getCurrentUser: async (): Promise<ServiceResponse<User>> => {
    const supabase = getSupabaseClient(); // Get client instance
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            // Handle potential Supabase auth errors specifically
            throw authError;
        }

        if (user) {
          logger.debug('Retrieved authenticated user', { userId: user.id });
          const userData: User = {
            id: user.id,
            isAnonymous: false,
            email: user.email,
            createdAt: user.created_at,
            name: user.user_metadata?.name,
            metadata: user.user_metadata
          };
          return { data: userData, error: null };
        }
        
        // Fall back to anonymous user if no authenticated user
        const anonymousUser = userService.createAnonymousUser();
        return { data: anonymousUser, error: null };
    } catch (error) {
        reportError(error, ErrorCategory.AUTHENTICATION, {
            action: 'UserService.getCurrentUser',
            message: 'Failed to get current user, falling back to anonymous'
        });
        // Fallback: Return anonymous user even on error
        return { 
            data: userService.createAnonymousUser(), 
            error: error instanceof Error ? error : new Error('Failed to retrieve user')
        };
    }
  },
  
  /**
   * Create a consistent anonymous user
   */
  createAnonymousUser: (): User => {
    const anonymousId = `anonymous-${uuidv4()}`;
    logger.debug('Created anonymous user', { userId: anonymousId });
    
    return {
      id: anonymousId,
      isAnonymous: true,
      createdAt: new Date().toISOString()
    };
  },
  
  /**
   * Validate if a user ID is properly formatted
   */
  isValidUserId: (userId: string | null | undefined): boolean => {
    if (!userId) return false;
    
    // UUID format validation (for authenticated users)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Anonymous ID format validation
    const anonymousRegex = /^anonymous-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    return uuidRegex.test(userId) || anonymousRegex.test(userId);
  },
  
  /**
   * Normalize a user ID to ensure it's in a valid format
   * If the provided ID is invalid, create a new anonymous one
   */
  normalizeUserId: (userId: string | null | undefined): string => {
    try {
      if (userService.isValidUserId(userId)) {
        return userId as string;
      }
      
      // Create a new anonymous ID if invalid
      logger.warn('Invalid user ID format, creating anonymous ID', { originalId: userId });
      return userService.createAnonymousUser().id;
    } catch (error) {
      // Report the error using the new service
      reportError(error, ErrorCategory.VALIDATION, { // Use VALIDATION category
          action: 'UserService.normalizeUserId',
          originalId: userId,
          message: 'Error normalizing user ID'
      });
      
      // Always return a valid ID
      return userService.createAnonymousUser().id;
    }
  },
  
  /**
   * Check if a user ID represents an anonymous user
   */
  isAnonymousUser: (userId: string | null | undefined): boolean => {
    if (!userId) return true;
    return userId.startsWith('anonymous-');
  }
}; 