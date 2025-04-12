import { useCallback, createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

// Define types for User and Team Member
interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'rep';
  teams: string[];
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
}

// Define the shape of our Auth Context
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, meta?: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
  isAuthLoading: boolean;
  isSigningUp: boolean;
}

// Create the Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // State variables
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Memoize fetchAndSetUserProfile
  const fetchAndSetUserProfile = useCallback(async (userId: string) => {
    const TIMEOUT_DURATION = 15000; 
    console.log(`[AuthContext] Fetching profile for user ID: ${userId}`);
    setIsAuthLoading(true); 
    let profileData: User | null = null;
    let profileError: Error | null = null;

    try {
      console.log(`[AuthContext] Fetching user profile for user ID: ${userId}`);
      const { data: { session: sessionBeforeQuery } } = await supabase.auth.getSession();
      console.log('[AuthContext] Session user ID before query:', sessionBeforeQuery?.user?.id);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timed out')), TIMEOUT_DURATION)
      );

      // Real profile fetch
      const profilePromise = supabase.from('profiles').select('*').eq('id', userId).single();
      
      // Race between the real profile fetch and the timeout
      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as {
        data: any,
        error: Error | null
      };

      console.log('[AuthContext] Profile fetch result:', { profile, error });

      if (error) {
        throw error;
      }

      if (!profile) {
        throw new Error('No profile found');
      }

      // Map the role from the database to the expected application roles
      // If the role is 'user', map it to 'rep'
      let mappedRole: 'admin' | 'manager' | 'rep' = 'rep'; // Default to 'rep'
      
      if (profile.role === 'admin') {
        mappedRole = 'admin';
      } else if (profile.role === 'manager') {
        mappedRole = 'manager';
      }

      // Fetch team memberships
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', userId);

      if (teamError) {
        console.error('[AuthContext] Error fetching team memberships:', teamError);
      }

      // Map to User object
      profileData = {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        role: mappedRole,
        teams: teamMemberships ? teamMemberships.map((tm: TeamMember) => tm.team_id) : [],
      };

      console.log('[AuthContext] Mapped profile data:', profileData);
    } catch (error) {
      console.error('[AuthContext] Error fetching profile:', error);
      profileError = error as Error;

      // Fall back to getting metadata from Supabase user
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        console.log('[AuthContext] Falling back to metadata from Supabase user:', supabaseUser);

        if (supabaseUser) {
          // Get metadata fields
          const meta = supabaseUser.user_metadata || {};
          console.log('[AuthContext] User metadata:', meta);

          // Map the role from the metadata to the expected application roles
          // If the role is 'user', map it to 'rep'
          let mappedRole: 'admin' | 'manager' | 'rep' = 'rep'; // Default to 'rep'
          
          if (meta.role === 'admin') {
            mappedRole = 'admin';
          } else if (meta.role === 'manager') {
            mappedRole = 'manager';
          }

          profileData = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            first_name: meta.first_name || null,
            last_name: meta.last_name || null,
            display_name: meta.display_name || meta.first_name || supabaseUser.email?.split('@')[0] || 'User',
            avatar_url: meta.avatar_url || null,
            role: mappedRole,
            teams: [],
          };
          console.log('[AuthContext] Created profile from metadata:', profileData);
        }
      } catch (fallbackError) {
        console.error('[AuthContext] Fallback error:', fallbackError);
      }
    } finally {
      if (profileData) {
        console.log('[AuthContext] Setting user to:', profileData);
        setUser(profileData);
      } else {
        console.error('[AuthContext] Failed to get profile data:', profileError);
        setUser(null);

        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: profileError?.message || 'Failed to get profile data',
        });
      }
      setIsAuthLoading(false);
    }
  }, [toast]);

  // Check for a session when the provider is mounted
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthContext] Initial session check:', session?.user?.id || 'No session');

        if (session?.user) {
          await fetchAndSetUserProfile(session.user.id);
        } else {
          console.log('[AuthContext] No session, setting user to null');
          setUser(null);
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error checking session:', error);
        setUser(null);
        setIsAuthLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] Auth state changed: ${event}`, session?.user?.id);

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session?.user) {
            await fetchAndSetUserProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out');
          setUser(null);
          setIsAuthLoading(false);
          router.push('/auth/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAndSetUserProfile, router]);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoggingIn(true);
    console.log(`[AuthContext] Login attempt for ${email}`);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Login error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from login');
      }

      console.log('[AuthContext] Login successful:', data.user.id);
      // Session change will trigger fetchAndSetUserProfile
    } catch (error) {
      const authError = error as AuthError;
      console.error('[AuthContext] Login failed:', authError);

      // Show toast notification
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: authError.message || 'An error occurred during login',
      });

      // Re-throw the error so the caller can handle it
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Signup function
  const signup = async (email: string, password: string, meta?: Record<string, any>) => {
    setIsSigningUp(true);
    console.log(`[AuthContext] Signup attempt for ${email}`);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: meta,
        },
      });

      if (error) {
        console.error('[AuthContext] Signup error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from signup');
      }

      console.log('[AuthContext] Signup successful:', data.user.id);
      
      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully. Please check your email for verification.',
      });

      // Note: We don't set the user here as we want them to verify first
      // Auth state change handler will set the user if email is verified
    } catch (error) {
      const authError = error as AuthError;
      console.error('[AuthContext] Signup failed:', authError);

      // Show toast notification
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: authError.message || 'An error occurred during signup',
      });

      // Re-throw the error so the caller can handle it
      throw error;
    } finally {
      setIsSigningUp(false);
    }
  };

  // Logout function
  const logout = async () => {
    console.log('[AuthContext] Logout attempt');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[AuthContext] Logout error:', error);
        throw error;
      }

      console.log('[AuthContext] Logout successful');
      // Auth state change handler will handle setting user to null
    } catch (error) {
      console.error('[AuthContext] Logout failed:', error);

      // Show toast notification
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An error occurred during logout',
      });

      // Re-throw the error so the caller can handle it
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isLoggingIn,
        isAuthLoading,
        isSigningUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via the above useEffect
  }

  return <>{children}</>;
}
