import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Star, TrendingUp, Zap, MoreVertical, UserCog, Trash2, BarChart, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getRepMetricsForId, RepMetrics } from "@/services/RepMetricsService";
import { useToast } from "@/hooks/use-toast";

interface TeamMemberCardProps {
  member: {
    id: string;
    name: string;
    email: string;
    role: string;
    performance?: number;
    calls?: number;
    conversion?: number;
    avatar?: string;
  };
  onEdit?: (member: { id: string; name: string }) => void;
  onRemove?: (member: { id: string; name: string }) => void;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member, onEdit, onRemove }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RepMetrics | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        
        // Try to get metrics from the member props first (if passed from TeamService)
        if (member.performance !== undefined && member.calls !== undefined && member.conversion !== undefined) {
          // Use metrics directly from the TeamMember object
          console.log(`Using existing metrics for ${member.name} from TeamService`);
          setMetrics({
            callVolume: member.calls,
            successRate: member.performance,
            sentiment: member.conversion / 100 || 0.5, // Convert conversion to sentiment scale (0-1)
            topKeywords: [],
            insights: ["Using data from team management system."]
          });
        } else {
          // Fall back to getting metrics from SharedDataService
          console.log(`Fetching metrics for ${member.name} from getRepMetricsForId`);
          const repMetrics = await getRepMetricsForId(member.id);
          
          if (repMetrics) {
            setMetrics(repMetrics);
          } else {
            // If no metrics available, create default values
            setMetrics({
              callVolume: 0,
              successRate: 0,
              sentiment: 0.5,
              topKeywords: [],
              insights: ["No call data available yet for this team member."]
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching metrics for ${member.name}:`, error);
        toast({
          variant: "destructive",
          title: "Error loading metrics",
          description: `Could not load performance data for ${member.name}`
        });
        
        // Set default metrics on error
        setMetrics({
          callVolume: 0,
          successRate: 0,
          sentiment: 0.5,
          topKeywords: [],
          insights: ["Error loading metrics data."]
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
    
    // Also listen for team member update events
    const handleTeamMemberUpdated = (event: CustomEvent) => {
      if (event.detail && event.detail.id === member.id) {
        fetchMetrics();
      }
    };
    
    window.addEventListener('team-member-updated', handleTeamMemberUpdated as EventListener);
    
    // Refetch when member ID changes
    return () => {
      window.removeEventListener('team-member-updated', handleTeamMemberUpdated as EventListener);
    };
  }, [member.id, member.name, member.performance, member.calls, member.conversion, toast]);
  
  // Get avatar initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Get role display name
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Team Manager';
      case 'sales_rep':
        return 'Sales Rep';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };
  
  // Get sentiment color
  const getSentimentColor = (sentiment: number) => {
    if (sentiment < 0.4) return 'text-red-500';
    if (sentiment < 0.6) return 'text-amber-500';
    return 'text-green-500';
  };
  
  // Format sentiment for display
  const formatSentiment = (sentiment: number) => {
    return `${Math.round(sentiment * 100)}%`;
  };
  
  // Calculate performance percentage based on metrics
  const getPerformancePercentage = () => {
    if (!metrics) return 0;
    return Math.round(metrics.successRate);
  };
  
  // Get performance color
  const getPerformanceColor = (performance: number) => {
    if (performance < 50) return 'bg-red-500';
    if (performance < 70) return 'bg-amber-500';
    return 'bg-green-500';
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 bg-purple-100">
              <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} />
              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-lg">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          
          {(onEdit || onRemove) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(member)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => onRemove(member)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <Badge variant="outline" className="mt-2 self-start">
          {getRoleDisplay(member.role)}
        </Badge>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (
          <>
            {/* Main metrics display */}
            <div className="grid grid-cols-3 gap-1 text-center mb-4">
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-2xl font-bold">{getPerformancePercentage()}%</p>
                <p className="text-xs text-gray-500">Performance</p>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-2xl font-bold">{metrics?.callVolume || 0}</p>
                <p className="text-xs text-gray-500">Calls</p>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-2xl font-bold">{Math.round(metrics?.successRate || 0)}%</p>
                <p className="text-xs text-gray-500">Conversion</p>
              </div>
            </div>
            
            {/* Performance score bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium">Performance Score</p>
                <p className="text-sm font-medium">{getPerformancePercentage()}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getPerformanceColor(getPerformancePercentage())}`}
                  style={{ width: `${getPerformancePercentage()}%` }}
                ></div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex items-center justify-center">
                <Phone className="h-4 w-4 mr-1" />
                Calls
              </Button>
              
              <Button variant="outline" size="sm" className="flex items-center justify-center">
                <BarChart className="h-4 w-4 mr-1" />
                Analytics
              </Button>
              
              <Button variant="outline" size="sm" className="flex items-center justify-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                Msg
              </Button>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="pt-1">
        {loading ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          <div className="w-full">
            <p className="text-xs text-muted-foreground flex items-center">
              <Zap className="mr-1 h-3 w-3 text-blue-500" />
              {metrics?.insights && metrics.insights.length > 0 
                ? metrics.insights[0] 
                : "No insights available yet."}
            </p>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default TeamMemberCard;
