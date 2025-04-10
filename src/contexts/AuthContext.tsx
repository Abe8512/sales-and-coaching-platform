import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { useToast } from "@/components/ui/use-toast";
// import { supabase } from "@/integrations/supabase/client"; // Keep old import commented for reference
// import { getSupabaseClient } from "@/integrations/supabase/customClient"; // Remove this
import { supabase } from "@/integrations/supabase/client"; // Import the singleton instance
import { getStoredTeamMembers, TeamMember as LocalTeamMember } from '@/services/TeamService';
import { reportError, ErrorCategory } from '@/services/ErrorBridgeService';
// Remove conflicting imports if types are defined locally
// import { User, TeamMember } from "./AuthContext"; 

// Ensure User and TeamMember interfaces are defined or exported correctly HERE
export interface User { 
    id: string;
    email: string;
    name: string | null;
    role: 'admin' | 'manager' | 'rep';
    teamId?: string | null;
    manager_id?: string | null; // Match DB
    updated_at?: string;
    created_at?: string;
    // managedTeams was mock, remove unless added to DB
}

export interface TeamMember { // This should likely match the User structure or select from users
  id: string; 
  name: string | null;
  email: string;
  role: string;
  created_at: string;
  team_id: string | null;
  manager_id: string | null;
  updated_at: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isRep: boolean;
  simulatedRole: 'admin' | 'manager' | 'rep' | null; // Add simulated role state
  setSimulatedRole: (role: 'admin' | 'manager' | 'rep') => void; // Add setter
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  getManagedUsers: () => User[];
  addTeamMember: () => Promise<void>;
  removeTeamMember: (memberId: string) => Promise<void>;
  refreshTeamMembers: () => Promise<void>;
  inviteTeamMember: (userData: { name: string; email: string; role: string }) => Promise<void>;
  teamMembers: TeamMember[];
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock team data
const TEAMS = [
  { id: "team1", name: "Enterprise Sales" },
  { id: "team2", name: "SMB Sales" },
];

// REMOVE MOCK_USERS array

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // DEVELOPMENT BYPASS DISABLED: Remove default user initialization
  /*
  const defaultUser: User = { 
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    teamId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
  };
  */

  // Initialize state normally
  const [user, setUser] = useState<User | null>(null); // Start as null
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const [sessionChecked, setSessionChecked] = useState(false); // Start unchecked
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Initialize simulated role based on actual user or null
  const [simulatedRole, setSimulatedRoleState] = useState<'admin' | 'manager' | 'rep' | null>(null);
  
  // Update simulated role when actual user changes
  useEffect(() => {
     setSimulatedRoleState(user?.role ?? null);
  }, [user]);

  // Declare refreshTeamMembers before fetchAndSetUserProfile uses it
  const refreshTeamMembers = useCallback(async () => { 
    console.log('[AuthContext] Refreshing team members from public.users...');
    // const supabase = getSupabaseClient(); // Remove this line
    try {
      // Use imported supabase directly
      const { data, error } = await supabase.from('users').select('id, name, email, role, created_at, team_id, manager_id, updated_at');

      if (error) {
         console.error("Database error refreshing team members:", error);
         setTeamMembers([]); 
      } else {
        console.log(`[AuthContext] Fetched ${data?.length ?? 0} users.`);
        setTeamMembers((data as TeamMember[]) || []); // Cast should now work
      }
    } catch (error) {
      console.error("Exception refreshing team members:", error);
      setTeamMembers([]);
    }
  }, []);

  const fetchAndSetUserProfile = async (userId: string) => {
    console.log(`[AuthContext] Fetching profile for user ID: ${userId}`);
    // const supabase = getSupabaseClient(); // Remove this line
    if (!isLoading) setIsLoading(true);
    try {
      console.log(`[AuthContext] Attempting fetch from public.users for ID: ${userId}`);
      // Use imported supabase directly
      const { data, error } = await supabase
        .from('users') 
        .select('id, email, name, role, team_id, manager_id, created_at, updated_at') 
        .eq('id', userId)
        .single();

      if (error) {
         console.error('[AuthContext] Error during profile fetch query:', error);
         // Check if the error is because the row doesn't exist
         if (error.code === 'PGRST116') { 
             console.warn(`[AuthContext] No profile found in public.users for ID: ${userId}. Signing out.`);
             await supabase.auth.signOut(); // Uses imported instance
             setUser(null); // Clear user state
         } else {
             // For other DB errors, log, clear user, but don't necessarily sign out auth session yet
             reportError(error, ErrorCategory.DATABASE, { action: 'fetchUserProfile_queryError', userId });
             setUser(null); 
             // Maybe throw error to be caught by calling function?
             // throw error;
         }
      } else if (data) {
        console.log('[AuthContext] Profile found in public.users:', data);
        setUser(data as User); 
        refreshTeamMembers(); 
      } else {
         console.warn(`[AuthContext] Profile fetch returned no data and no error for ID: ${userId}. Signing out.`);
         await supabase.auth.signOut();
         setUser(null);
      }
    } catch (error) {
      // Catch any unexpected errors during the try block
      console.error('[AuthContext] Unexpected error in fetchAndSetUserProfile:', error);
      // Use a valid category like UNKNOWN or INTEGRATION
      reportError(error, ErrorCategory.AUTHENTICATION, { action: 'fetchUserProfile_unexpected', userId }); 
      setUser(null);
      // Attempt sign out if something went very wrong
      try { await supabase.auth.signOut(); } catch (signOutError) { /* Ignore signout error */ }
    } finally {
       console.log('[AuthContext] fetchAndSetUserProfile finally block. Setting isLoading=false');
       setIsLoading(false); 
    }
  };

  // --- REAL AUTH CHECK --- 
  useEffect(() => {
    // const supabase = getSupabaseClient(); // Remove this line
    let isMounted = true;

    const checkSession = async () => {
      console.log("[AuthContext] Checking initial session...");
      // Use imported supabase directly
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
         console.error("[AuthContext] Error getting session:", error);
         reportError(error, ErrorCategory.AUTHENTICATION, { action: 'getSession' });
      }
      
      if (isMounted) {
        if (session?.user) {
          console.log(`[AuthContext] Initial session found for user ${session.user.id}. Fetching profile...`);
          await fetchAndSetUserProfile(session.user.id);
        } else {
          console.log("[AuthContext] No initial session found.");
          if (isMounted) { // Check mount again before setting state
             setUser(null);
             setIsLoading(false);
             setSessionChecked(true);
          }
        }
        // Removed redundant setSessionChecked(true) from here
      }
    };

    checkSession();

    // Use imported supabase directly
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] Auth state changed: ${event}, User: ${session?.user?.id}`);
        if (!isMounted) {
           console.log('[AuthContext] Listener fired but component unmounted. Ignoring.');
           return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          console.log(`[AuthContext] SIGNED_IN detected for user ${session.user.id}. Fetching profile...`);
          // No need to set isLoading(true) here, fetchAndSetUserProfile handles it
          await fetchAndSetUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] SIGNED_OUT detected.');
          setUser(null);
          setTeamMembers([]);
          setIsLoading(false);
          setSessionChecked(true); 
        } else if (event === 'USER_UPDATED' && session?.user) {
           console.log(`[AuthContext] USER_UPDATED detected for user ${session.user.id}. Re-fetching profile...`);
           await fetchAndSetUserProfile(session.user.id); 
        } else if (event === 'INITIAL_SESSION') {
           console.log(`[AuthContext] INITIAL_SESSION event.`);
           // This might fire after checkSession, potentially causing duplicate fetches if not handled carefully
           // Check if user is already set to prevent redundant fetch
           if (!user && session?.user) {
               console.log(`[AuthContext] INITIAL_SESSION: User not set, fetching profile for ${session.user.id}...`);
               await fetchAndSetUserProfile(session.user.id);
           } else if (user && session?.user && user.id !== session.user.id) {
               console.log(`[AuthContext] INITIAL_SESSION: Mismatched user ID (${user.id} vs ${session.user.id}). Re-fetching.`);
               await fetchAndSetUserProfile(session.user.id);
           } else if (!session?.user) {
               // Ensure loading is false if initial session resolves to no user
               if (isMounted) setIsLoading(false);
           }
        }
      }
    );

    return () => {
      isMounted = false;
      // Correctly unsubscribe from the auth listener
      authListener?.subscription?.unsubscribe(); 
    };
  }, [fetchAndSetUserProfile]); // Keep dependency
  // --- END REAL AUTH CHECK ---

  // --- Role Checkers --- 
  const isDev = import.meta.env.MODE === 'development'; 
  const effectiveRole = isDev ? simulatedRole : user?.role;
  
  const isAdmin = effectiveRole === 'admin';
  const isManager = effectiveRole === 'manager';
  const isRep = effectiveRole === 'rep';

  // Function to update simulated role
  const setSimulatedRole = (role: 'admin' | 'manager' | 'rep') => {
      if (isDev) {
          console.log(`[AuthContext] Simulating role: ${role}`);
          setSimulatedRoleState(role);
      } else {
          console.warn("Role simulation is only available in development mode.");
      }
  };

  // --- Auth Functions (Implement real logic now) --- 
  const login = async (email: string, password: string) => {
      console.log(`[AuthContext] Attempting login for ${email}...`);
      setIsLoading(true);
      // const supabase = getSupabaseClient(); // Remove this line
      let loginError: Error | null = null; // Variable to store error
      try {
          // Use imported supabase directly
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
              loginError = error; // Store the error
              // No need to set loading false here, finally block handles it
          } else {
             console.log(`[AuthContext] signInWithPassword seems successful for ${email}. Waiting for auth state change...`);
          }
      } catch (error) {
          // Catch unexpected errors during the signIn call itself
          console.error("[AuthContext] Unexpected error during signInWithPassword call:", error);
          loginError = error instanceof Error ? error : new Error(String(error));
      } finally {
          // This block runs whether signInWithPassword succeeded or failed
          console.log("[AuthContext] Login function finally block. Setting isLoading=false");
          setIsLoading(false); // Always set loading false after the attempt
          
          // If there was an error, report and potentially re-throw it
          if (loginError) {
              toast({ title: "Login Failed", description: loginError.message, variant: "destructive" });
              reportError(loginError, ErrorCategory.AUTHENTICATION, { action: 'login', email });
              // Optionally re-throw if the calling component needs to know about the failure
              // throw loginError;
          }
      }
  };

  const signup = async (email: string, password: string, name: string) => {
      setIsLoading(true);
      // const supabase = getSupabaseClient(); // Remove this line
      // Use imported supabase directly
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: {
                  full_name: name, // Pass name for potential use in triggers/profile
              },
          },
      });

      if (signUpError) {
          toast({ title: "Signup Failed", description: signUpError.message, variant: "destructive" });
          reportError(signUpError, ErrorCategory.AUTHENTICATION, { action: 'signup', email });
          setIsLoading(false);
          throw signUpError;
      }
      
      // Check if user needs verification or is already logged in
      if (signUpData.user && signUpData.session) {
          // User signed up and logged in immediately (e.g., email auth disabled)
          console.log("[AuthContext] Signup successful, user logged in.");
          // The onAuthStateChange listener handles profile fetching
      } else if (signUpData.user && !signUpData.session) {
          // User signed up but needs verification
          toast({ title: "Signup Successful", description: "Please check your email to verify your account." });
          setIsLoading(false);
      } else {
          // Unexpected state
          toast({ title: "Signup Status Unknown", description: "Please try logging in.", variant: "destructive" });
          setIsLoading(false);
      }
      
      // Trigger handle_new_user should create public.profiles entry
      // We might need a public.users entry creation mechanism too if separate
      // TODO: Ensure public.users entry is created if needed after signup/verification
  };

  const logout = async () => { 
      setIsLoading(true);
      // const supabase = getSupabaseClient(); // Remove this line
      // Use imported supabase directly
      const { error } = await supabase.auth.signOut();
      if (error) {
          toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
          reportError(error, ErrorCategory.AUTHENTICATION, { action: 'logout' });
      }
      // State updates (user=null, etc.) handled by onAuthStateChange listener
      setIsLoading(false); 
  };

  // Get all users managed by current user
  const getManagedUsers = (): User[] => {
    console.warn('getManagedUsers needs implementation (Auth Bypass)');
    return [];
  };

  // REVISED inviteTeamMember function calls the EDGE FUNCTION
  const inviteTeamMember = async (userData: { name: string; email: string; role: string }): Promise<void> => {
    console.log("[AuthContext] Inviting team member via Edge Function:", userData);
    // const supabase = getSupabaseClient(); // Remove this line
    try {
      const validRoles = ['rep', 'manager'];
      if (!validRoles.includes(userData.role)) {
          throw new Error(`Invalid role specified: ${userData.role}.`);
      }

      // Ensure teamId is passed, defaulting if needed (can be null)
      const teamIdToPass = user?.teamId ?? null; // Pass null if user has no teamId
      const managerIdToPass = user?.id ?? null; // Pass current user ID as manager

      // Invoke the EDGE FUNCTION by its name
      const { data, error } = await supabase.functions.invoke('invite-team-member', { // Correct function name
          body: { // Payload must be in 'body' for invoke
             email: userData.email,
             name: userData.name,
             role: userData.role,
             manager_id: managerIdToPass, 
             team_id: teamIdToPass 
          }
      });

      if (error) {
          console.error("Edge Function invocation error:", error);
          throw new Error(`Failed to invite user (invoke error): ${error.message}`);
      }

      // Check for errors returned *within* the Edge Function's response data
      if (data?.error) { 
          console.error("Edge Function response error:", data.error);
          throw new Error(`Failed to invite user (function error): ${data.error}`);
      }

      console.log("Edge function response:", data);

      toast({ title: "Invitation Sent / User Processed" }); 
      await refreshTeamMembers();

    } catch (error) {
      console.error("Error inviting team member:", error);
      toast({ 
          title: "Invitation Failed", 
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive" 
      });
    }
  };

  // Keep old addTeamMember commented out or remove if fully replaced
  const addTeamMember = async () => { 
      console.warn("DEPRECATED: addTeamMember called. Use inviteTeamMember instead.");
  }; 

  // Team management functions
  const removeTeamMember = async (memberId: string): Promise<void> => {
    if (!user) {
      throw new Error("You must be logged in to remove team members");
    }

    try {
      // Use imported supabase directly
      const { error: teamError } = await supabase
        .from('team_members') // Still references team_members, needs check
        .delete()
        .eq('id', memberId); 
        // Might need more filters like .eq('manager_id', user.id)

      if (teamError) {
        console.error("Error removing from team_members:", teamError);
        throw teamError;
      }

      // Skip disabling the user for now
      /*
      const { error: authError } = await supabase.auth.admin.updateUserById(...);
      if (authError) { ... }
      */

      toast({ title: "Team Member Removed" }); // Add toast notification
      await refreshTeamMembers();
    } catch (error) {
      console.error("Error removing team member:", error);
      toast({ title: "Failed to remove member", variant: "destructive" });
      throw error;
    }
  };

  // Fetch members on initial load (using bypassed user)
  useEffect(() => {
    // Fetch immediately since loading/session is bypassed
    if(user?.id) { // Check if default user is set
        refreshTeamMembers();
    }
  }, [refreshTeamMembers, user?.id]); // Depend on user.id from defaultUser

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading, // Use real loading state
        isAuthenticated: !!user && sessionChecked, // Determine based on user and session check
        isAdmin, 
        isManager, 
        isRep, 
        simulatedRole,
        setSimulatedRole,
        login, // Provide real functions
        signup, // Provide real functions
        logout, // Provide real functions
        inviteTeamMember,
        removeTeamMember,
        refreshTeamMembers,
        teamMembers,
        getManagedUsers, 
        addTeamMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
