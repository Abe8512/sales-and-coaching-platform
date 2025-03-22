import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import { useEventListener } from '@/hooks/useEventListener';

// Define team member type
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  performance?: number;
  calls?: number;
  conversion?: number;
  avatar?: string;
}

// In-memory storage for team members
let storedTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Manager User",
    email: "manager@example.com",
    role: "manager",
    performance: 65,
    calls: 37,
    conversion: 0,
    avatar: "MU"
  },
  {
    id: "sr1",
    name: "Sales Rep 1",
    email: "rep@example.com",
    role: "rep",
    performance: 82,
    calls: 45,
    conversion: 0,
    avatar: "SR1"
  },
  {
    id: "sr2",
    name: "Sales Rep 2",
    email: "rep2@example.com",
    role: "rep",
    performance: 0,
    calls: 0,
    conversion: 0,
    avatar: "SR2"
  },
  {
    id: "sr3",
    name: "Sales Rep 3",
    email: "rep3@example.com",
    role: "rep",
    performance: 0,
    calls: 0,
    conversion: 0,
    avatar: "SR3"
  }
];

// Add a team member to storage
export const addTeamMember = (member: TeamMember): void => {
  storedTeamMembers.push(member);
  saveTeamMembersToLocalStorage();
  
  // Dispatch a custom event to notify other components
  const event = new CustomEvent('team-member-added', { 
    detail: { id: member.id, name: member.name } 
  });
  window.dispatchEvent(event);
  console.log(`Dispatched team-member-added event for ${member.name} (${member.id})`);
};

// Remove a team member from storage
export const removeTeamMember = (id: string): void => {
  const memberToRemove = storedTeamMembers.find(member => member.id === id);
  storedTeamMembers = storedTeamMembers.filter(member => member.id !== id);
  saveTeamMembersToLocalStorage();
  
  // Dispatch a custom event to notify other components
  if (memberToRemove) {
    const event = new CustomEvent('team-member-removed', { 
      detail: { id, name: memberToRemove.name } 
    });
    window.dispatchEvent(event);
    console.log(`Dispatched team-member-removed event for ${memberToRemove.name} (${id})`);
  }
};

// Get all team members from storage
export const getStoredTeamMembers = (): TeamMember[] => {
  // Try to load from localStorage if not already loaded
  if (storedTeamMembers.length === 0) {
    const stored = localStorage.getItem('team_members');
    if (stored) {
      try {
        storedTeamMembers = JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing stored team members:', e);
      }
    }
  }
  return storedTeamMembers;
};

// Save team members to localStorage
const saveTeamMembersToLocalStorage = (): void => {
  localStorage.setItem('team_members', JSON.stringify(storedTeamMembers));
};

// Update a team member's data
export const updateTeamMember = (id: string, updates: Partial<TeamMember>): void => {
  const index = storedTeamMembers.findIndex(member => member.id === id);
  if (index !== -1) {
    storedTeamMembers[index] = { ...storedTeamMembers[index], ...updates };
    saveTeamMembersToLocalStorage();
  }
};

// Hook for team members with state management
export const useTeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(getStoredTeamMembers());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refresh team members from storage
  const refreshTeamMembers = useCallback(() => {
    setTeamMembers(getStoredTeamMembers());
  }, []);

  // Add a team member with UI state update
  const addMember = useCallback((member: Omit<TeamMember, 'id'>) => {
    setLoading(true);
    try {
      const newMember: TeamMember = {
        ...member,
        id: `tm-${Date.now()}`,
        performance: 0,
        calls: 0,
        conversion: 0,
        avatar: member.name.split(' ').map(n => n[0]).join('').toUpperCase()
      };
      
      addTeamMember(newMember);
      refreshTeamMembers();
      return newMember;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error adding team member'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshTeamMembers]);

  // Remove a team member with UI state update
  const removeMember = useCallback((id: string) => {
    setLoading(true);
    try {
      removeTeamMember(id);
      refreshTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error removing team member'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshTeamMembers]);

  // Update a team member with UI state update
  const updateMember = useCallback((id: string, updates: Partial<TeamMember>) => {
    setLoading(true);
    try {
      updateTeamMember(id, updates);
      refreshTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error updating team member'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshTeamMembers]);

  // Listen for team member events
  useEventListener('team-member-added', () => {
    refreshTeamMembers();
  });

  useEventListener('team-member-removed', () => {
    refreshTeamMembers();
  });

  useEventListener('team-member-updated', () => {
    refreshTeamMembers();
  });

  // Initial load
  useEffect(() => {
    refreshTeamMembers();
  }, [refreshTeamMembers]);

  return {
    teamMembers,
    loading,
    error,
    addMember,
    removeMember,
    updateMember,
    refreshTeamMembers
  };
};

// Initialize with default data if needed
const initializeTeamData = () => {
  const stored = localStorage.getItem('team_members');
  if (!stored) {
    saveTeamMembersToLocalStorage();
  }
};

// Call initialization
initializeTeamData(); 