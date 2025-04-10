import React from "react";
import { useContext } from "react";
import { ThemeContext } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Book, Zap, LineChart, Trophy } from "lucide-react";
import CoachingSuggestions from "@/components/AICoaching/CoachingSuggestions";
import PersonalizedInsights from "@/components/AICoaching/PersonalizedInsights";

const AICoaching = () => {
  const { isDarkMode } = useContext(ThemeContext);

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1`}>
            <span className="text-gradient-blue">AI</span> Coaching
          </h1>
          <Sparkles className="h-6 w-6 text-neon-purple" />
        </div>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Personalized AI recommendations to improve your sales performance
        </p>
      </div>
      
      <Tabs defaultValue="suggestions" className="mb-6">
        <TabsList>
          <TabsTrigger value="suggestions">Coaching Suggestions</TabsTrigger>
          <TabsTrigger value="insights">Personalized Insights</TabsTrigger>
          <TabsTrigger value="training">Custom Training</TabsTrigger>
        </TabsList>
        
        <TabsContent value="suggestions" className="mt-6">
          <CoachingSuggestions />
        </TabsContent>
        
        <TabsContent value="insights" className="mt-6">
          <PersonalizedInsights />
        </TabsContent>
        
        <TabsContent value="training" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5 text-neon-purple" />
                Custom Training Programs
              </CardTitle>
              <CardDescription>
                AI-generated training programs based on your specific needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Objection Handling</CardTitle>
                    <CardDescription>Master the art of handling objections</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      Learn proven techniques to address common customer concerns and turn objections into opportunities.
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-neon-purple font-medium">8</span> lessons
                      </div>
                      <Button size="sm" className="bg-neon-purple hover:bg-neon-purple/80">
                        Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Discovery Questions</CardTitle>
                    <CardDescription>Improve your discovery process</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      Craft powerful questions that uncover customer needs and position your solution perfectly.
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-neon-purple font-medium">6</span> lessons
                      </div>
                      <Button size="sm" className="bg-neon-purple hover:bg-neon-purple/80">
                        Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Closing Techniques</CardTitle>
                    <CardDescription>Boost your conversion rates</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-muted-foreground mb-4">
                      Learn effective closing strategies that feel natural and lead to higher conversion rates.
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-neon-purple font-medium">7</span> lessons
                      </div>
                      <Button size="sm" className="bg-neon-purple hover:bg-neon-purple/80">
                        Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Recommended for You</h3>
                <Card className="border-neon-purple/30 bg-neon-purple/5">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">Active Listening Mastery</CardTitle>
                        <CardDescription>Based on your recent call performance</CardDescription>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-neon-purple/20 rounded-full">
                        <Trophy className="h-4 w-4 text-neon-purple" />
                        <span className="text-xs font-medium text-neon-purple">Top Priority</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm mb-4">
                      Our AI has identified that improving your active listening skills could increase your conversion rate by up to 24%. This customized program focuses on specific techniques to help you better understand customer needs.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Duration</h4>
                        <p className="text-sm text-muted-foreground">2 weeks</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Format</h4>
                        <p className="text-sm text-muted-foreground">Interactive + Role Play</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <h4 className="text-sm font-medium mb-1">Impact</h4>
                        <p className="text-sm text-muted-foreground">High (24% improvement)</p>
                      </div>
                    </div>
                    <Button className="w-full bg-neon-purple hover:bg-neon-purple/80">
                      Start Personalized Training
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default AICoaching;
