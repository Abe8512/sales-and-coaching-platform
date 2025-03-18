
import React, { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem,
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const TeamFilter = () => {
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  
  // Mock team members data
  const teamMembers = [
    { id: "1", name: "John Smith", role: "Sales Rep" },
    { id: "2", name: "Sarah Johnson", role: "Sales Rep" },
    { id: "3", name: "Michael Chen", role: "Sales Rep" },
    { id: "4", name: "Emily Davis", role: "Sales Rep" },
    { id: "5", name: "David Wilson", role: "Sales Rep" },
  ];
  
  const handleSelect = (value: string) => {
    if (!selectedTeamMembers.includes(value)) {
      setSelectedTeamMembers([...selectedTeamMembers, value]);
    }
  };
  
  const handleRemove = (id: string) => {
    setSelectedTeamMembers(selectedTeamMembers.filter(memberId => memberId !== id));
  };
  
  const getTeamMember = (id: string) => {
    return teamMembers.find(member => member.id === id);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-4">
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by team member" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Team Members</SelectLabel>
              {teamMembers.map((member) => (
                <SelectItem 
                  key={member.id} 
                  value={member.id}
                  disabled={selectedTeamMembers.includes(member.id)}
                >
                  {member.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        <div className="flex flex-wrap gap-2">
          {selectedTeamMembers.length > 0 ? (
            selectedTeamMembers.map((memberId) => {
              const member = getTeamMember(memberId);
              return (
                <Badge key={memberId} variant="secondary" className="px-3 py-1">
                  {member?.name}
                  <button 
                    className="ml-2" 
                    onClick={() => handleRemove(memberId)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">
              Showing data for all team members
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TeamFilter;
