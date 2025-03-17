
import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, BarChart } from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  performance: number;
  calls: number;
  conversion: number;
  avatar: string;
}

interface TeamMemberCardProps {
  member: TeamMember;
}

const TeamMemberCard = ({ member }: TeamMemberCardProps) => {
  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "bg-neon-green";
    if (score >= 70) return "bg-neon-blue";
    if (score >= 60) return "bg-amber-500";
    return "bg-neon-red";
  };

  return (
    <Card className="overflow-hidden border shadow-md transition-all hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-12 w-12 border-2 border-neon-purple">
            <AvatarFallback className="bg-neon-purple/10 text-neon-purple">
              {member.avatar}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{member.name}</h3>
            <p className="text-sm text-muted-foreground">{member.role}</p>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground mb-4">
          {member.email}
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="text-center p-2 bg-muted rounded-md">
            <div className="text-2xl font-semibold">{member.performance}%</div>
            <div className="text-xs text-muted-foreground">Performance</div>
          </div>
          <div className="text-center p-2 bg-muted rounded-md">
            <div className="text-2xl font-semibold">{member.calls}</div>
            <div className="text-xs text-muted-foreground">Calls</div>
          </div>
          <div className="text-center p-2 bg-muted rounded-md">
            <div className="text-2xl font-semibold">{member.conversion}%</div>
            <div className="text-xs text-muted-foreground">Conversion</div>
          </div>
        </div>
        
        <div className="w-full mt-4">
          <div className="text-xs mb-1 flex justify-between">
            <span>Performance Score</span>
            <span className="font-medium">{member.performance}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${getPerformanceColor(member.performance)} h-2 rounded-full`} 
              style={{width: `${member.performance}%`}}
            ></div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between p-4 pt-0">
        <Button variant="ghost" size="sm">
          <Phone className="mr-1 h-4 w-4" />
          Calls
        </Button>
        <Button variant="ghost" size="sm">
          <BarChart className="mr-1 h-4 w-4" />
          Analytics
        </Button>
        <Button variant="ghost" size="sm">
          <MessageSquare className="mr-1 h-4 w-4" />
          Message
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TeamMemberCard;
