
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { MessageSquare, Lightbulb, Clock, Repeat, ArrowRight } from "lucide-react";

const PersonalizedInsights = () => {
  // Mock data for trend analysis
  const trendData = [
    { week: 'Week 1', performance: 65, benchmark: 75 },
    { week: 'Week 2', performance: 68, benchmark: 75 },
    { week: 'Week 3', performance: 72, benchmark: 76 },
    { week: 'Week 4', performance: 75, benchmark: 76 },
    { week: 'Week 5', performance: 73, benchmark: 77 },
    { week: 'Week 6', performance: 78, benchmark: 77 },
    { week: 'Week 7', performance: 82, benchmark: 78 },
    { week: 'Week 8', performance: 85, benchmark: 78 },
  ];
  
  // Mock data for call elements analysis
  const callElementsData = [
    { name: 'Opening', score: 90, average: 82 },
    { name: 'Discovery', score: 65, average: 78 },
    { name: 'Presentation', score: 85, average: 80 },
    { name: 'Objection Handling', score: 60, average: 75 },
    { name: 'Closing', score: 70, average: 72 },
    { name: 'Follow-up', score: 88, average: 70 },
  ];
  
  // Mock personalized insights
  const insights = [
    {
      id: 1,
      title: "Discovery Phase Opportunity",
      description: "Your discovery phase is 35% shorter than top performers. Spending more time understanding customer needs before presenting solutions could improve your close rate.",
      type: "opportunity",
      impact: "high"
    },
    {
      id: 2,
      title: "Positive Trend in Call Quality",
      description: "Your overall call quality has improved by 17% over the last 8 weeks. Continue your current improvement trajectory.",
      type: "trend",
      impact: "positive"
    },
    {
      id: 3,
      title: "Objection Handling Pattern",
      description: "When handling price objections, you tend to offer discounts too quickly. Focus on building value before discussing concessions.",
      type: "pattern",
      impact: "medium"
    },
    {
      id: 4,
      title: "Successful Opening Technique",
      description: "Your personalized opening statements have a 30% higher engagement rate than standard scripts. Continue this approach.",
      type: "success",
      impact: "positive"
    }
  ];
  
  // Linguistic patterns data
  const linguisticPatterns = [
    { phrase: "Let me be honest with you", impact: "negative", alternative: "What I can tell you is" },
    { phrase: "We can't do that", impact: "negative", alternative: "Here's what we can do" },
    { phrase: "You'll have to", impact: "negative", alternative: "I recommend" },
    { phrase: "As I mentioned before", impact: "negative", alternative: "To reiterate the key point" },
    { phrase: "That's a great question", impact: "positive", frequency: "high" },
    { phrase: "I understand your concern", impact: "positive", frequency: "medium" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>
              Your call performance compared to team benchmark
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[50, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="performance" 
                    name="Your Performance" 
                    stroke="#A855F7" 
                    strokeWidth={2}
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="benchmark" 
                    name="Team Benchmark" 
                    stroke="#94A3B8" 
                    strokeDasharray="5 5" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Call Elements Analysis</CardTitle>
            <CardDescription>
              Your performance in different parts of the sales call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={callElementsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="score" 
                    name="Your Score" 
                    fill="#A855F7" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="average" 
                    name="Team Average" 
                    fill="#00F0FF" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-neon-purple" />
            AI-Generated Insights
          </CardTitle>
          <CardDescription>
            Personalized insights derived from analysis of your call patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <Card key={insight.id} className={`border ${
                insight.type === 'opportunity' ? 'border-amber-500/30 bg-amber-500/5' :
                insight.type === 'trend' ? 'border-neon-blue/30 bg-neon-blue/5' :
                insight.type === 'pattern' ? 'border-neon-purple/30 bg-neon-purple/5' :
                'border-neon-green/30 bg-neon-green/5'
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{insight.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm">{insight.description}</p>
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`text-xs ${
                        insight.type === 'opportunity' ? 'text-amber-500' :
                        insight.type === 'trend' ? 'text-neon-blue' :
                        insight.type === 'pattern' ? 'text-neon-purple' :
                        'text-neon-green'
                      }`}
                    >
                      Learn More <ArrowRight className="ml-1 h-3 w-3" />
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
            <MessageSquare className="h-5 w-5 text-neon-purple" />
            Linguistic Patterns
          </CardTitle>
          <CardDescription>
            Analysis of your language patterns and their impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium mb-2">Phrases to Avoid</h3>
              <div className="space-y-2">
                {linguisticPatterns.filter(p => p.impact === 'negative').map((pattern, index) => (
                  <div key={index} className="p-3 border border-neon-red/30 bg-neon-red/5 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <div className="font-medium text-neon-red">{pattern.phrase}</div>
                      <div className="text-xs text-muted-foreground">Negative Impact</div>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <span>Try instead:</span>
                      <span className="font-medium text-neon-green">{pattern.alternative}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-medium mb-2">Effective Phrases</h3>
              <div className="space-y-2">
                {linguisticPatterns.filter(p => p.impact === 'positive').map((pattern, index) => (
                  <div key={index} className="p-3 border border-neon-green/30 bg-neon-green/5 rounded-lg">
                    <div className="flex justify-between">
                      <div className="font-medium text-neon-green">{pattern.phrase}</div>
                      <div className="text-xs flex items-center gap-1">
                        <span className="text-muted-foreground">Usage:</span>
                        <span className={`${
                          pattern.frequency === 'high' ? 'text-neon-green' : 'text-amber-500'
                        }`}>
                          {pattern.frequency}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between items-center p-4 bg-muted rounded-lg">
            <div>
              <h3 className="font-medium">AI Language Coach</h3>
              <p className="text-sm text-muted-foreground">Get real-time feedback on your language patterns</p>
            </div>
            <Button className="bg-neon-purple hover:bg-neon-purple/80">
              <Repeat className="mr-2 h-4 w-4" />
              Practice Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalizedInsights;
