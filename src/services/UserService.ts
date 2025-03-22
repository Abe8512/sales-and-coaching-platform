import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { userLogger as logger } from './LoggingService';

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
  getCurrentUser: async (): Promise<User> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        logger.debug('Retrieved authenticated user', { userId: user.id });
        return {
          id: user.id,
          isAnonymous: false,
          email: user.email,
          createdAt: user.created_at,
          name: user.user_metadata?.name,
          metadata: user.user_metadata
        };
      }
    } catch (error) {
      logger.error('Error getting authenticated user', error);
    }
    
    // Fall back to anonymous user
    return userService.createAnonymousUser();
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
    if (userService.isValidUserId(userId)) {
      return userId as string;
    }
    
    // Create a new anonymous ID if invalid
    logger.warn('Invalid user ID format, creating anonymous ID', { originalId: userId });
    return userService.createAnonymousUser().id;
  },
  
  /**
   * Check if a user ID represents an anonymous user
   */
  isAnonymousUser: (userId: string | null | undefined): boolean => {
    if (!userId) return true;
    return userId.startsWith('anonymous-');
  }
}; 