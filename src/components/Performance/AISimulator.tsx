
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, User, RefreshCw, Play, Pause, Menu, Send, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  customerPersona: string;
}

const AISimulator = () => {
  const { toast } = useToast();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Mock scenarios data
  const scenarios: Scenario[] = [
    {
      id: "1",
      name: "Price Objection",
      description: "Customer thinks your product is too expensive",
      difficulty: "medium",
      customerPersona: "Budget-conscious IT Manager at mid-size company"
    },
    {
      id: "2",
      name: "Competitor Comparison",
      description: "Customer is evaluating your solution against a competitor",
      difficulty: "hard",
      customerPersona: "Tech-savvy CTO who has done extensive research"
    },
    {
      id: "3",
      name: "Feature Request",
      description: "Customer wants features you don't currently offer",
      difficulty: "medium",
      customerPersona: "Product manager who needs specific capabilities"
    },
    {
      id: "4",
      name: "Initial Discovery",
      description: "First call with a prospect to understand their needs",
      difficulty: "easy",
      customerPersona: "HR Director looking for a new employee training solution"
    },
  ];
  
  const startSimulation = () => {
    if (!selectedScenario) {
      toast({
        title: "Select a Scenario",
        description: "Please select a scenario before starting",
        variant: "destructive",
      });
      return;
    }
    
    const scenario = scenarios.find(s => s.id === selectedScenario);
    if (!scenario) return;
    
    setIsSimulating(true);
    setMessages([
      {
        id: "1",
        sender: "ai",
        content: `Hello, I'm interested in learning more about your solution. ${scenario.difficulty === "hard" ? "I've been comparing several options in the market." : "Can you tell me more about what you offer?"}`,
        timestamp: new Date()
      }
    ]);
    
    toast({
      title: "Simulation Started",
      description: `You're now speaking with a ${scenario.customerPersona}`,
    });
  };
  
  const stopSimulation = () => {
    setIsSimulating(false);
    toast({
      title: "Simulation Ended",
      description: "Your practice conversation has ended",
    });
  };
  
  const resetSimulation = () => {
    setMessages([]);
    setIsSimulating(false);
    setSelectedScenario(null);
    toast({
      title: "Simulation Reset",
      description: "You can start a new scenario",
    });
  };
  
  const sendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: message,
      timestamp: new Date()
    };
    
    setMessages([...messages, newUserMessage]);
    setMessage("");
    
    // Simulate AI response after a short delay
    setTimeout(() => {
      if (!selectedScenario) return;
      
      const scenario = scenarios.find(s => s.id === selectedScenario);
      if (!scenario) return;
      
      let aiResponse = "";
      
      // Very simple response logic based on scenario
      if (scenario.id === "1") { // Price objection
        aiResponse = "I understand budget is a concern. But can you help me understand what specific ROI you're looking for from this investment?";
      } else if (scenario.id === "2") { // Competitor
        aiResponse = "I've looked at that solution as well. What specific features are most important for your use case?";
      } else if (scenario.id === "3") { // Feature request
        aiResponse = "While we don't have exactly that feature, we do have an alternative approach that many of our customers find effective. Would you like to hear about it?";
      } else { // Discovery
        aiResponse = "That's helpful context. Can you tell me more about the specific challenges your team is facing right now?";
      }
      
      const newAiMessage: Message = {
        id: Date.now().toString(),
        sender: "ai",
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAiMessage]);
    }, 1000);
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-neon-green text-white";
      case "medium": return "bg-amber-500 text-white";
      case "hard": return "bg-neon-red text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-neon-purple" />
              AI Conversation Simulator
            </CardTitle>
            <CardDescription>
              Practice scenarios with AI customer personas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isSimulating ? (
              <Button variant="outline" size="sm" onClick={stopSimulation}>
                <Pause className="h-4 w-4 mr-1" /> End
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startSimulation} 
                disabled={!selectedScenario}
              >
                <Play className="h-4 w-4 mr-1" /> Start
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={resetSimulation}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isSimulating && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Scenario</label>
                <Select value={selectedScenario || ""} onValueChange={setSelectedScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a conversation scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        <div className="flex items-center gap-2">
                          <span>{scenario.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(scenario.difficulty)}`}>
                            {scenario.difficulty}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedScenario && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Scenario Details</h3>
                  <div className="space-y-3">
                    {(() => {
                      const scenario = scenarios.find(s => s.id === selectedScenario);
                      if (!scenario) return null;
                      
                      return (
                        <>
                          <p className="text-sm">{scenario.description}</p>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-neon-blue" />
                            <p className="text-sm text-neon-blue">{scenario.customerPersona}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isSimulating && (
            <>
              <div className="p-4 border rounded-lg h-[300px] overflow-y-auto space-y-4 mb-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      msg.sender === "user" 
                        ? "bg-neon-purple/10 border border-neon-purple/20" 
                        : "bg-muted"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.sender === "ai" ? (
                          <Bot className="h-4 w-4 text-neon-blue" />
                        ) : (
                          <User className="h-4 w-4 text-neon-purple" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-end gap-2">
                <Textarea 
                  placeholder="Type your response..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  className="bg-neon-purple hover:bg-neon-purple/80"
                  onClick={sendMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AISimulator;
