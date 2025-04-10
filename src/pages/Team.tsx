import React, { useState, useMemo, useContext, useEffect } from "react";
import { ThemeContext } from "@/App";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, UserPlus, ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChartData } from "@/hooks/useChartData";
import TeamPerformanceComparison from "@/components/Team/TeamPerformanceComparison";
import TeamMemberCard from "@/components/Team/TeamMemberCard";
import AddTeamMemberModal from "@/components/Team/AddTeamMemberModal";
import { toast } from "@/components/ui/use-toast";
import { useAnalyticsRepMetrics, SimpleAnalyticsFilter } from '@/services/AnalyticsHubService';
import { useSharedFilters } from '@/contexts/SharedFilterContext';
import { RepPerformanceData } from "@/services/repositories/AnalyticsRepository";
import { useAuth, TeamMember } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Redefine TeamMemberData based on data coming from useAuth
// It should match the TeamMember interface in AuthContext
type TeamMemberData = {
  id: string; 
  user_id: string; 
  name: string | null;
  email: string;
  role: string;
  created_at: string;
  team_id: string | null;
  manager_id: string | null;
  updated_at: string;
  // Add derived fields if needed locally
  performance?: number;
  calls?: number;
  conversion?: number;
  avatar?: string;
};

const Team = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  const { filters: sharedFilters } = useSharedFilters();
  
  const { inviteTeamMember, teamMembers: authTeamMembers, isLoading: authLoading, refreshTeamMembers } = useAuth();

  const isLoading = authLoading;
  
  const teamMembers: TeamMemberData[] = React.useMemo(() => {
    if (!authTeamMembers || authTeamMembers.length === 0) {
      return []; 
    }
    return authTeamMembers.map((user: TeamMember) => ({
       ...user,
       performance: Math.floor(Math.random() * 50) + 50, 
       calls: Math.floor(Math.random() * 100) + 20,
       conversion: Math.floor(Math.random() * 20) + 5,
       avatar: user.name ? user.name.split(' ').map(part => part[0]).join('').substring(0, 2) : 'U'
    }));
  }, [authTeamMembers]);

  const filteredMembers = teamMembers.filter(member => 
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async (newMember: { name: string; email: string; role: string }) => {
    console.log("[Team.tsx] handleAddMember called with:", newMember);
    try {
      await inviteTeamMember(newMember);
      setShowAddMemberModal(false);
    } catch (error) {
      console.error("[Team.tsx] Failed to add member via inviteTeamMember:", error);
    }
  };
  
  const handleRemoveMember = async (member: TeamMemberData) => {
    console.log("Attempting to remove member:", member.id);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1`}>
          Team Management
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage your sales team and monitor performance
        </p>
      </div>
      
      <Tabs defaultValue="overview" className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-72">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <Input
                placeholder="Search team members..."
                className={`pl-10 h-10 ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              className="bg-neon-purple hover:bg-neon-purple/80" 
              onClick={() => setShowAddMemberModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-40 w-full" />) 
            ) : filteredMembers.length === 0 ? (
                 <p className="text-muted-foreground col-span-full text-center py-8">No team members found.</p>
            ) : (
               filteredMembers.map((member) => (
                  <TeamMemberCard 
                    key={member.id} 
                    member={member}
                    onRemove={handleRemoveMember}
                  />
                ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Comparison</CardTitle>
              <CardDescription>Compare performance metrics across team members</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamPerformanceComparison teamMembers={teamMembers} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Leaderboard</CardTitle>
              <CardDescription>Ranked by overall performance score</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-60 w-full" /> : <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Performance
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...teamMembers]
                    .sort((a, b) => (b.performance ?? 0) - (a.performance ?? 0))
                    .map((member, index) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className="bg-neon-purple h-2.5 rounded-full" 
                                style={{width: `${member.performance ?? 0}%`}}
                              ></div>
                            </div>
                            <span>{member.performance ?? 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{member.calls ?? 0}</TableCell>
                        <TableCell>{member.conversion ?? 0}%</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AddTeamMemberModal 
        isOpen={showAddMemberModal} 
        onClose={() => setShowAddMemberModal(false)}
        onAddMember={handleAddMember}
      />
    </>
  );
};

export default Team;
