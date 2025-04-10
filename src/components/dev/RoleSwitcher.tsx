import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users } from 'lucide-react';

const RoleSwitcher: React.FC = () => {
  const { simulatedRole, setSimulatedRole, user } = useAuth();
  const isDev = import.meta.env.MODE === 'development';

  // Don't render anything in production
  if (!isDev) {
    return null;
  }

  const handleRoleChange = (value: string) => {
    if (value === 'admin' || value === 'manager' || value === 'rep') {
      setSimulatedRole(value);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 px-3 py-1.5 rounded-md shadow-sm">
      <Users className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
      <Label htmlFor="role-switcher" className="text-xs font-medium text-yellow-800 dark:text-yellow-300 whitespace-nowrap">
        Simulate Role:
      </Label>
      <Select 
        value={simulatedRole ?? ''} 
        onValueChange={handleRoleChange}
      >
        <SelectTrigger id="role-switcher" className="h-7 text-xs w-[100px] bg-white dark:bg-slate-800">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="rep">Rep</SelectItem>
        </SelectContent>
      </Select>
      {user && (
         <span className="text-xs text-muted-foreground">(Actual: {user.role})</span>
      )}
    </div>
  );
};

export default RoleSwitcher; 