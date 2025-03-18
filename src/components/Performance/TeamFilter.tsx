
import React from "react";
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
import { X, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSharedFilters } from "@/contexts/SharedFilterContext";

const TeamFilter = () => {
  const { 
    filters, 
    updateRepIds, 
    updateProductLines, 
    updateCallTypes, 
    clearAllFilters 
  } = useSharedFilters();
  
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  
  // Mock team members data
  const teamMembers = [
    { id: "1", name: "John Smith", role: "Sales Rep" },
    { id: "2", name: "Sarah Johnson", role: "Sales Rep" },
    { id: "3", name: "Michael Chen", role: "Sales Rep" },
    { id: "4", name: "Emily Davis", role: "Sales Rep" },
    { id: "5", name: "David Wilson", role: "Sales Rep" },
  ];
  
  // Mock product lines data
  const productLines = [
    { id: "1", name: "Enterprise Suite" },
    { id: "2", name: "Small Business Solution" },
    { id: "3", name: "Analytics Platform" },
    { id: "4", name: "Security Services" },
  ];
  
  // Mock call types data
  const callTypes = [
    { id: "1", name: "Discovery" },
    { id: "2", name: "Demo" },
    { id: "3", name: "Follow-up" },
    { id: "4", name: "Negotiation" },
    { id: "5", name: "Closing" },
  ];
  
  const handleTeamMemberSelect = (value: string) => {
    if (!filters.repIds?.includes(value)) {
      const newSelection = [...(filters.repIds || []), value];
      updateRepIds(newSelection);
    }
  };
  
  const handleTeamMemberRemove = (id: string) => {
    const newSelection = (filters.repIds || []).filter(memberId => memberId !== id);
    updateRepIds(newSelection);
  };
  
  const handleProductLineToggle = (id: string) => {
    let newSelection: string[];
    if ((filters.productLines || []).includes(id)) {
      newSelection = (filters.productLines || []).filter(lineId => lineId !== id);
    } else {
      newSelection = [...(filters.productLines || []), id];
    }
    updateProductLines(newSelection);
  };
  
  const handleCallTypeToggle = (id: string) => {
    let newSelection: string[];
    if ((filters.callTypes || []).includes(id)) {
      newSelection = (filters.callTypes || []).filter(typeId => typeId !== id);
    } else {
      newSelection = [...(filters.callTypes || []), id];
    }
    updateCallTypes(newSelection);
  };
  
  const getTeamMember = (id: string) => {
    return teamMembers.find(member => member.id === id);
  };
  
  const getProductLine = (id: string) => {
    return productLines.find(line => line.id === id);
  };
  
  const getCallType = (id: string) => {
    return callTypes.find(type => type.id === id);
  };
  
  const totalActiveFilters = 
    (filters.repIds?.length || 0) + 
    (filters.productLines?.length || 0) + 
    (filters.callTypes?.length || 0);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-4">
          <Select onValueChange={handleTeamMemberSelect}>
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
                    disabled={(filters.repIds || []).includes(member.id)}
                  >
                    {member.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>More Filters</span>
                {totalActiveFilters > 0 && (
                  <Badge className="ml-1 bg-neon-purple">{totalActiveFilters}</Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-4" align="start">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Product Lines</h3>
                  <div className="space-y-2">
                    {productLines.map((line) => (
                      <div key={line.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`product-${line.id}`} 
                          checked={(filters.productLines || []).includes(line.id)}
                          onCheckedChange={() => handleProductLineToggle(line.id)}
                        />
                        <Label htmlFor={`product-${line.id}`}>{line.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Call Types</h3>
                  <div className="space-y-2">
                    {callTypes.map((type) => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`call-${type.id}`} 
                          checked={(filters.callTypes || []).includes(type.id)}
                          onCheckedChange={() => handleCallTypeToggle(type.id)}
                        />
                        <Label htmlFor={`call-${type.id}`}>{type.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                  <Button size="sm" onClick={() => setFiltersOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-wrap gap-2 flex-1">
          {(filters.repIds?.length || 0) > 0 ? (
            (filters.repIds || []).map((memberId) => {
              const member = getTeamMember(memberId);
              return (
                <Badge key={memberId} variant="secondary" className="px-3 py-1">
                  {member?.name}
                  <button 
                    className="ml-2" 
                    onClick={() => handleTeamMemberRemove(memberId)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          ) : (
            (filters.productLines?.length || 0) === 0 && (filters.callTypes?.length || 0) === 0 && (
              <div className="text-sm text-muted-foreground">
                Showing data for all team members
              </div>
            )
          )}
          
          {(filters.productLines || []).map((lineId) => {
            const line = getProductLine(lineId);
            return (
              <Badge key={`product-${lineId}`} variant="outline" className="px-3 py-1 border-neon-blue text-neon-blue">
                {line?.name}
                <button 
                  className="ml-2" 
                  onClick={() => handleProductLineToggle(lineId)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          
          {(filters.callTypes || []).map((typeId) => {
            const type = getCallType(typeId);
            return (
              <Badge key={`call-${typeId}`} variant="outline" className="px-3 py-1 border-neon-purple text-neon-purple">
                {type?.name}
                <button 
                  className="ml-2" 
                  onClick={() => handleCallTypeToggle(typeId)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default TeamFilter;
