
import React from 'react';
import TeamFilter from './TeamFilter';

interface TeamFilterWrapperProps {
  onFilterChange: (newFilters: any) => void;
}

const TeamFilterWrapper: React.FC<TeamFilterWrapperProps> = ({ onFilterChange }) => {
  return <TeamFilter {...(onFilterChange ? { onFilterChange } : {})} />;
};

export default TeamFilterWrapper;
