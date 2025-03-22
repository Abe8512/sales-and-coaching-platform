import React, { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useContext } from "react";
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
import { useAnalyticsRepMetrics } from '@/services/AnalyticsHubService';
import { useSharedFilters } from '@/contexts/SharedFilterContext';

// Type definition for team members used in this component
type TeamMemberData = {
  id: string;
  name: string;
  email: string;
  role: string;
  performance: number;
  calls: number;
  conversion: number;
  avatar: string;
};

// Mock data for team members
const initialTeamMembers = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    role: "Senior Sales Rep",
    performance: 87,
    calls: 145,
    conversion: 23,
    avatar: "AJ"
  },
  {
    id: "2",
    name: "Maria Garcia",
    email: "maria.garcia@example.com",
    role: "Sales Rep",
    performance: 76,
    calls: 112,
    conversion: 18,
    avatar: "MG"
  },
  {
    id: "3",
    name: "David Kim",
    email: "david.kim@example.com",
    role: "Junior Sales Rep",
    performance: 68,
    calls: 89,
    conversion: 12,
    avatar: "DK"
  },
  {
    id: "4",
    name: "Sarah Williams",
    email: "sarah.williams@example.com",
    role: "Senior Sales Rep",
    performance: 92,
    calls: 156,
    conversion: 28,
    avatar: "SW"
  },
  {
    id: "5",
    name: "James Taylor",
    email: "james.taylor@example.com",
    role: "Sales Rep",
    performance: 71,
    calls: 103,
    conversion: 15,
    avatar: "JT"
  },
];

const Team = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  
  const { filters } = useSharedFilters();
  const { metrics: teamMembersData, isLoading: teamMembersLoading } = useAnalyticsRepMetrics(filters);
  
  // Convert analytics rep metrics to the format expected by the component
  const teamMembers = React.useMemo(() => {
    if (!teamMembersData || !teamMembersData.length) {
      return initialTeamMembers; // Fallback to mock data if no real data
    }
    
    return teamMembersData.map(rep => ({
      id: rep.id,
      name: rep.name || `Rep ${rep.id.substring(0, 4)}`,
      email: `${rep.name?.toLowerCase().replace(' ', '.')}@example.com` || 'user@example.com',
      role: "Sales Representative",
      performance: Math.round(rep.sentiment * 100),
      calls: rep.callVolume || 0,
      conversion: Math.round(rep.successRate * 100),
      avatar: rep.name ? rep.name.split(' ').map(part => part[0]).join('').substring(0, 2) : 'U'
    }));
  }, [teamMembersData]);

  const filteredMembers = teamMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = (newMember) => {
    // Since we're now using AnalyticsHubService, we don't have direct add/remove functions
    // Instead, we'll just show a toast notification and would typically call an API
    
    toast({
      title: "Team Member Added",
      description: `${newMember.name} has been added to your team.`,
    });
    
    // In a real implementation, we would call an API to add the member
    // and then refresh the data from AnalyticsHubService
    console.log("Added member (would be saved to database):", newMember);
    
    return {
      ...newMember,
      id: `temp-${Date.now()}`,
      performance: Math.floor(Math.random() * 30) + 60,
      calls: Math.floor(Math.random() * 100) + 50,
      conversion: Math.floor(Math.random() * 20) + 10,
    };
  };
  
  const handleRemoveMember = (member) => {
    // Since we're now using AnalyticsHubService, we don't have direct add/remove functions
    // Instead, we'll just show a toast notification and would typically call an API
    
    toast({
      title: "Team Member Removed",
      description: `${member.name} has been removed from your team.`,
    });
    
    // In a real implementation, we would call an API to remove the member
    // and then refresh the data from AnalyticsHubService
    console.log("Removed member (would be deleted from database):", member.id);
  };

  return (
    <DashboardLayout>
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
            {filteredMembers.map((member) => (
              <TeamMemberCard 
                key={member.id} 
                member={{
                  id: String(member.id),
                  name: member.name,
                  email: member.email,
                  role: member.role,
                  performance: member.performance,
                  calls: member.calls,
                  conversion: member.conversion,
                  avatar: member.avatar
                }}
                onRemove={handleRemoveMember}
              />
            ))}
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
              <Table>
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
                    .sort((a, b) => b.performance - a.performance)
                    .map((member, index) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className="bg-neon-purple h-2.5 rounded-full" 
                                style={{width: `${member.performance}%`}}
                              ></div>
                            </div>
                            <span>{member.performance}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{member.calls}</TableCell>
                        <TableCell>{member.conversion}%</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AddTeamMemberModal 
        isOpen={showAddMemberModal} 
        onClose={() => setShowAddMemberModal(false)}
        onAddMember={handleAddMember}
      />
    </DashboardLayout>
  );
};

export default Team;
