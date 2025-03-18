
import React from 'react';
import TeamFilter from './TeamFilter';
import { useSharedFilters } from '@/contexts/SharedFilterContext';

interface TeamFilterWrapperProps {
  onFilterChange?: (newFilters: any) => void;
}

const TeamFilterWrapper: React.FC<TeamFilterWrapperProps> = ({ onFilterChange }) => {
  // Get the shared filter context functions
  const { 
    filters, 
    updateRepIds, 
    updateProductLines, 
    updateCallTypes 
  } = useSharedFilters();
  
  // Handle filter changes and call the callback if provided
  const handleFilterChange = (newFilters: any) => {
    // Update the shared context
    if (newFilters.repIds !== undefined) {
      updateRepIds(newFilters.repIds);
    }
    if (newFilters.productLines !== undefined) {
      updateProductLines(newFilters.productLines);
    }
    if (newFilters.callTypes !== undefined) {
      updateCallTypes(newFilters.callTypes);
    }
    
    // Call the provided callback if it exists
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };
  
  // TeamFilter doesn't directly accept onFilterChange, so we don't pass it
  return <TeamFilter />;
};

export default TeamFilterWrapper;
