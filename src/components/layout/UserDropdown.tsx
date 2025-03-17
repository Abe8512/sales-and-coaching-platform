
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings, Users, HelpCircle, UserCog, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserDropdown = () => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Generate initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Generate a color based on the user's name
  const getUserColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
    ];
    
    // Simple hash function to pick a consistent color
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const avatarFallbackClass = getUserColor(user.name);

  // Get user role display text
  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Sales Manager';
      case 'rep':
        return 'Sales Representative';
      default:
        return 'User';
    }
  };

  // Role-based icon
  const getRoleIcon = () => {
    if (isAdmin) return <Shield className="h-4 w-4 mr-1 text-red-500" />;
    if (isManager) return <UserCog className="h-4 w-4 mr-1 text-blue-500" />;
    return <User className="h-4 w-4 mr-1 text-green-500" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center rounded-full border p-1 outline-none focus:ring-2 focus:ring-neon-purple focus:ring-offset-2">
        <Avatar className="size-8">
          <AvatarImage src="" />
          <AvatarFallback className={`${avatarFallbackClass} text-white`}>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              {getRoleIcon()}
              <span>{getRoleText(user.role)}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        {(isAdmin || isManager) && (
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/team')}>
            <Users className="mr-2 h-4 w-4" />
            <span>Team Management</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer">
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help & Support</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
