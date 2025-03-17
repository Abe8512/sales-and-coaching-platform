
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Zap, LineChart, AlertTriangle, CheckCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const CoachingSuggestions = () => {
  // Mock data for coaching suggestions
  const improvementSuggestions = [
    {
      id: 1,
      title: "Reduce Interruptions",
      description: "You interrupted customers 14 times in your last 5 calls, which is 40% higher than top performers.",
      actionItems: [
        "Wait 2 seconds after a customer stops speaking before responding",
        "Use phrase 'If I understand correctly...' to confirm understanding",
        "Practice active listening exercises daily"
      ],
      impact: "high",
      type: "behavior"
    },
    {
      id: 2,
      title: "Improve Discovery Questions",
      description: "Your discovery phase is 30% shorter than successful calls. Asking better questions could increase your conversion rate.",
      actionItems: [
        "Use open-ended questions that start with 'What', 'How', or 'Why'",
        "Ask about current challenges before presenting solutions",
        "Follow the SPIN questioning framework"
      ],
      impact: "medium",
      type: "technique"
    },
    {
      id: 3,
      title: "Enhance Objection Handling",
      description: "When facing price objections, your success rate drops by 58%. Improving this could significantly boost conversions.",
      actionItems: [
        "Acknowledge the concern before addressing it",
        "Focus on value rather than defending the price",
        "Review 'Objection Handling for High-Value Solutions' training"
      ],
      impact: "critical",
      type: "technique"
    },
    {
      id: 4,
      title: "Adjust Speaking Pace",
      description: "Your speaking pace is 20% faster than ideal. Slowing down could improve clarity and customer understanding.",
      actionItems: [
        "Practice speaking at 150 words per minute (vs. current 190)",
        "Insert deliberate pauses after key points",
        "Record yourself and review daily"
      ],
      impact: "low",
      type: "behavior"
    },
  ];
  
  const positiveReinforcements = [
    {
      id: 1,
      title: "Excellent Call Opening",
      description: "Your call openings are engaging and establish rapport quickly. Continue this approach.",
      stats: "96% effectiveness rate"
    },
    {
      id: 2,
      title: "Strong Product Knowledge",
      description: "You demonstrate excellent product knowledge when addressing technical questions.",
      stats: "Handled 27/30 technical questions correctly"
    },
    {
      id: 3,
      title: "Effective Follow-up",
      description: "Your follow-up cadence is well-timed and persistent without being pushy.",
      stats: "63% response rate (team avg: 41%)"
    }
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical": return "text-neon-red";
      case "high": return "text-amber-500";
      case "medium": return "text-neon-blue";
      case "low": return "text-neon-green";
      default: return "text-gray-500";
    }
  };

  const getImpactBgColor = (impact: string) => {
    switch (impact) {
      case "critical": return "bg-neon-red/10 border-neon-red/30";
      case "high": return "bg-amber-500/10 border-amber-500/30";
      case "medium": return "bg-neon-blue/10 border-neon-blue/30";
      case "low": return "bg-neon-green/10 border-neon-green/30";
      default: return "bg-gray-100 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Areas for Improvement
          </CardTitle>
          <CardDescription>
            AI-identified opportunities to enhance your sales performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {improvementSuggestions.map((suggestion) => (
              <Card 
                key={suggestion.id} 
                className={`border ${getImpactBgColor(suggestion.impact)}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactBgColor(suggestion.impact)} ${getImpactColor(suggestion.impact)}`}>
                      {suggestion.impact.charAt(0).toUpperCase() + suggestion.impact.slice(1)} Impact
                    </div>
                  </div>
                  <CardDescription>{suggestion.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <h4 className="text-sm font-medium mb-2">Suggested Actions:</h4>
                  <ul className="space-y-1 mb-4">
                    {suggestion.actionItems.map((item, index) => (
                      <li key={index} className="flex items-start text-sm gap-2">
                        <div className="w-1 h-1 rounded-full bg-foreground mt-2"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" className="mr-2">
                      Learn More
                    </Button>
                    <Button size="sm" className="bg-neon-purple hover:bg-neon-purple/80">
                      Start Improvement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-neon-green" />
            Strengths to Leverage
          </CardTitle>
          <CardDescription>
            Areas where you're performing well - maintain these strengths
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {positiveReinforcements.map((item) => (
              <Card key={item.id} className="border-neon-green/30 bg-neon-green/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm mb-2">{item.description}</p>
                  <div className="text-xs inline-block px-2 py-1 bg-neon-green/20 text-neon-green rounded-full">
                    {item.stats}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-neon-purple" />
            Weekly Focus Area
          </CardTitle>
          <CardDescription>
            Recommended focus area based on your recent performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 border rounded-lg border-neon-purple bg-neon-purple/5">
            <h3 className="text-xl font-bold mb-2">Objection Handling Excellence</h3>
            <p className="mb-4">
              Our AI analysis shows that focusing on objection handling this week could improve your conversion rate by up to 18%. We've prepared a customized improvement plan for you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white/10 rounded-lg text-center">
                <h4 className="text-sm font-medium mb-1">Daily Practice</h4>
                <p className="text-2xl font-bold text-neon-purple">15 min</p>
                <p className="text-xs text-muted-foreground">Role-playing exercises</p>
              </div>
              <div className="p-4 bg-white/10 rounded-lg text-center">
                <h4 className="text-sm font-medium mb-1">Coaching Sessions</h4>
                <p className="text-2xl font-bold text-neon-purple">2</p>
                <p className="text-xs text-muted-foreground">With AI coach</p>
              </div>
              <div className="p-4 bg-white/10 rounded-lg text-center">
                <h4 className="text-sm font-medium mb-1">Expected Improvement</h4>
                <p className="text-2xl font-bold text-neon-purple">18%</p>
                <p className="text-xs text-muted-foreground">In conversion rate</p>
              </div>
            </div>
            <Button className="w-full bg-neon-purple hover:bg-neon-purple/80">
              Start Weekly Focus Program
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachingSuggestions;
