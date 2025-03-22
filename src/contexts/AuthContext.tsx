import React, { createContext, useState, useEffect, useContext } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getStoredTeamMembers, TeamMember as LocalTeamMember } from '@/services/TeamService';

// Define user type with extended properties
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'rep';
  managedTeams?: string[];  // For managers: IDs of teams they manage
  teamId?: string;         // For reps: ID of their team
  managerId?: string;      // For reps: ID of their manager
}

// Define team member type
interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isRep: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  getManagedUsers: () => User[];
  addTeamMember: (userData: { name: string; email: string; role: string }) => Promise<void>;
  removeTeamMember: (memberId: string) => Promise<void>;
  refreshTeamMembers: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock team data
const TEAMS = [
  { id: "team1", name: "Enterprise Sales" },
  { id: "team2", name: "SMB Sales" },
];

// Enhanced mock user data with team relationships
const MOCK_USERS: (Omit<User, 'role'> & { password: string; role: 'admin' | 'manager' | 'rep' })[] = [
  {
    id: '1',
    email: 'admin@example.com',
    password: 'password',
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: '2',
    email: 'manager@example.com',
    password: 'password',
    name: 'Manager User',
    role: 'manager',
    managedTeams: ['team1', 'team2'],
  },
  {
    id: '3',
    email: 'rep@example.com',
    password: 'password',
    name: 'Sales Rep 1',
    role: 'rep',
    teamId: 'team1',
    managerId: '2',
  },
  {
    id: '4',
    email: 'rep2@example.com',
    password: 'password',
    name: 'Sales Rep 2',
    role: 'rep',
    teamId: 'team1',
    managerId: '2',
  },
  {
    id: '5',
    email: 'rep3@example.com',
    password: 'password',
    name: 'Sales Rep 3',
    role: 'rep',
    teamId: 'team2',
    managerId: '2',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Role-based helper functions
  const isAdmin = !!user && user.role === 'admin';
  const isManager = !!user && user.role === 'manager';
  const isRep = !!user && user.role === 'rep';

  // Get all users managed by current user
  const getManagedUsers = (): User[] => {
    if (!user) return [];
    
    // Admins can see all users
    if (user.role === 'admin') {
      return MOCK_USERS.filter(u => u.id !== user.id).map(({ password, ...rest }) => rest);
    }
    
    // Managers can see users in their teams
    if (user.role === 'manager' && user.managedTeams) {
      return MOCK_USERS
        .filter(u => u.role === 'rep' && user.managedTeams?.includes(u.teamId || ''))
        .map(({ password, ...rest }) => rest);
    }
    
    // Reps can't see other users
    return [];
  };

  // Login function - will be replaced with actual API call
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const foundUser = MOCK_USERS.find(
        u => u.email === email && u.password === password
      );
      
      if (foundUser) {
        const { password, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        toast({
          title: "Logged in successfully",
          description: `Welcome back, ${userWithoutPassword.name}!`,
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function - will be replaced with actual API call
  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if user already exists
      if (MOCK_USERS.some(u => u.email === email)) {
        throw new Error('User already exists');
      }
      
      // Create new user (in a real app, this would be done on the backend)
      const newUser = {
        id: `${MOCK_USERS.length + 1}`,
        email,
        name,
        role: 'rep' as const,
      };
      
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      toast({
        title: "Account created",
        description: `Welcome, ${name}!`,
      });
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  // Team management functions
  const addTeamMember = async (userData: { name: string; email: string; role: string }) => {
    if (!user) {
      throw new Error("You must be logged in to add team members");
    }

    try {
      // Create a new user account
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: generateTemporaryPassword(), // Generate a secure temporary password
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          name: userData.name,
          role: userData.role,
          managedBy: user.id
        }
      });

      if (error) {
        throw error;
      }

      // Also add the user to the team_members table for easier querying
      if (data.user) {
        const { error: teamError } = await supabase
          .from('team_members')
          .insert({
            id: data.user.id,
            user_id: user.id, // Current user as the manager
            name: userData.name,
            email: userData.email,
            role: userData.role,
            created_at: new Date().toISOString()
          });

        if (teamError) {
          console.error("Error adding team member to database:", teamError);
          // We don't throw here because the user is already created
        }
      }

      await refreshTeamMembers();
      return data;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  };

  // Generate a secure temporary password
  const generateTemporaryPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Remove a team member
  const removeTeamMember = async (memberId: string): Promise<void> => {
    if (!user) {
      throw new Error("You must be logged in to remove team members");
    }

    try {
      // First remove from the team_members table
      const { error: teamError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('user_id', user.id); // Ensure the member belongs to this user

      if (teamError) {
        throw teamError;
      }

      // Optionally, you could also disable the user's auth account
      const { error: authError } = await supabase.auth.admin.updateUserById(
        memberId,
        { user_metadata: { isActive: false, removedAt: new Date().toISOString() } }
      );

      if (authError) {
        console.error("Error updating user status:", authError);
        // We don't throw here because the team member was already removed
      }

      await refreshTeamMembers();
    } catch (error) {
      console.error("Error removing team member:", error);
      throw error;
    }
  };

  // Refresh the list of team members
  const refreshTeamMembers = async () => {
    if (!user) return;

    try {
      // Try to get team members from the team_members table
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        if (error.message && error.message.includes('does not exist')) {
          // Table doesn't exist, use local storage data from TeamService instead
          console.log('team_members table does not exist, using local data instead');
          const localMembers = getStoredTeamMembers();
          setTeamMembers(localMembers as unknown as TeamMember[]);
          
          // Add a delay to prevent constant retries
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
        } else {
          console.error("Database error refreshing team members:", error);
        }
      } else {
        setTeamMembers(data || []);
      }
    } catch (error) {
      console.error("Error refreshing team members:", error);
      
      // Fall back to local storage in case of any error
      const localMembers = getStoredTeamMembers();
      setTeamMembers(localMembers as unknown as TeamMember[]);
      
      // Add a delay to prevent constant retries in case of errors
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated: !!user,
      isAdmin,
      isManager,
      isRep,
      login, 
      signup, 
      logout,
      getManagedUsers,
      addTeamMember,
      removeTeamMember,
      refreshTeamMembers
    }}>
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
