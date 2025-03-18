
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Plus, X, Save, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ScoringCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
}

const CustomScoring = () => {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<ScoringCriteria[]>([
    { id: "1", name: "Discovery Questions", description: "Asks relevant questions to understand needs", weight: 25 },
    { id: "2", name: "Active Listening", description: "Demonstrates understanding of customer needs", weight: 20 },
    { id: "3", name: "Value Proposition", description: "Clearly articulates product benefits", weight: 20 },
    { id: "4", name: "Objection Handling", description: "Effectively addresses concerns", weight: 15 },
    { id: "5", name: "Closing Technique", description: "Appropriate closing strategy used", weight: 20 },
  ]);
  
  const [newCriteria, setNewCriteria] = useState({
    name: "",
    description: "",
    weight: 10
  });
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const addCriteria = () => {
    if (newCriteria.name.trim() === "") {
      toast({
        title: "Error",
        description: "Criteria name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) + newCriteria.weight;
    if (totalWeight > 100) {
      toast({
        title: "Error",
        description: "Total weights cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }
    
    setCriteria([
      ...criteria,
      {
        id: Date.now().toString(),
        name: newCriteria.name,
        description: newCriteria.description,
        weight: newCriteria.weight
      }
    ]);
    
    setNewCriteria({
      name: "",
      description: "",
      weight: 10
    });
    
    setIsAddingNew(false);
    
    toast({
      title: "Criteria Added",
      description: `${newCriteria.name} added to scoring criteria`,
    });
  };
  
  const startEdit = (id: string) => {
    setEditingId(id);
  };
  
  const cancelEdit = () => {
    setEditingId(null);
  };
  
  const saveEdit = (id: string) => {
    setEditingId(null);
    
    toast({
      title: "Changes Saved",
      description: "Scoring criteria updated successfully",
    });
  };
  
  const removeCriteria = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
    
    toast({
      title: "Criteria Removed",
      description: "Scoring criteria removed successfully",
    });
  };
  
  const updateCriteriaWeight = (id: string, newWeight: number) => {
    setCriteria(criteria.map(c => 
      c.id === id ? { ...c, weight: newWeight } : c
    ));
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-amber-500" />
              Customizable Scoring Criteria
            </CardTitle>
            <CardDescription>
              Define what makes a successful call for your team
            </CardDescription>
          </div>
          <Button 
            onClick={() => setIsAddingNew(true)} 
            disabled={isAddingNew}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Criteria
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isAddingNew && (
            <div className="p-4 border border-dashed rounded-lg space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label className="text-xs font-medium">Criteria Name</label>
                  <Input 
                    value={newCriteria.name}
                    onChange={(e) => setNewCriteria({...newCriteria, name: e.target.value})}
                    placeholder="e.g., Product Knowledge"
                  />
                </div>
                <div className="col-span-6">
                  <label className="text-xs font-medium">Description</label>
                  <Input 
                    value={newCriteria.description}
                    onChange={(e) => setNewCriteria({...newCriteria, description: e.target.value})}
                    placeholder="What defines this criteria"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium">Weight (%)</label>
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    value={newCriteria.weight}
                    onChange={(e) => setNewCriteria({...newCriteria, weight: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAddingNew(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={addCriteria}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {criteria.map((item) => (
              <div 
                key={item.id} 
                className="p-3 rounded-lg border bg-card grid grid-cols-12 gap-4 items-center"
              >
                {editingId === item.id ? (
                  // Edit mode
                  <>
                    <div className="col-span-3">
                      <Input 
                        value={item.name}
                        onChange={(e) => setCriteria(criteria.map(c => 
                          c.id === item.id ? { ...c, name: e.target.value } : c
                        ))}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input 
                        value={item.description}
                        onChange={(e) => setCriteria(criteria.map(c => 
                          c.id === item.id ? { ...c, description: e.target.value } : c
                        ))}
                      />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Slider 
                        value={[item.weight]} 
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={(value) => updateCriteriaWeight(item.id, value[0])}
                      />
                      <span className="text-sm w-8 text-right">{item.weight}%</span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <Button size="icon" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={() => saveEdit(item.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  // View mode
                  <>
                    <div className="col-span-3 font-medium">{item.name}</div>
                    <div className="col-span-4 text-sm text-muted-foreground">{item.description}</div>
                    <div className="col-span-3">
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neon-purple rounded-full"
                          style={{ width: `${item.weight}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <Badge variant="outline">{item.weight}%</Badge>
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(item.id)}>
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeCriteria(item.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium">Total Weight</h3>
                <p className="text-xs text-muted-foreground">Sum should equal 100%</p>
              </div>
              <div>
                <Badge variant="outline" className={`text-lg px-3 py-1 ${
                  criteria.reduce((sum, c) => sum + c.weight, 0) === 100 
                    ? "border-neon-green text-neon-green" 
                    : "border-amber-500 text-amber-500"
                }`}>
                  {criteria.reduce((sum, c) => sum + c.weight, 0)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomScoring;
