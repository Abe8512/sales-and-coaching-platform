
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen, Play, CheckCircle, ArrowRight, Award, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface LearningResource {
  id: string;
  title: string;
  type: "video" | "article" | "exercise" | "assessment";
  duration: string;
  completed: boolean;
  url: string;
}

interface LearningSkill {
  id: string;
  name: string;
  progress: number;
  resources: LearningResource[];
}

const LearningPath = () => {
  // Mock data for learning skills and resources
  const learningSkills: LearningSkill[] = [
    {
      id: "1",
      name: "Objection Handling",
      progress: 35,
      resources: [
        {
          id: "1-1",
          title: "Handling Price Objections",
          type: "video",
          duration: "12 min",
          completed: true,
          url: "#"
        },
        {
          id: "1-2",
          title: "Addressing Competitor Comparisons",
          type: "article",
          duration: "8 min",
          completed: false,
          url: "#"
        },
        {
          id: "1-3",
          title: "Practice Exercise: Common Objections",
          type: "exercise",
          duration: "20 min",
          completed: false,
          url: "#"
        },
      ]
    },
    {
      id: "2",
      name: "Discovery Questions",
      progress: 75,
      resources: [
        {
          id: "2-1",
          title: "SPIN Questioning Framework",
          type: "video",
          duration: "15 min",
          completed: true,
          url: "#"
        },
        {
          id: "2-2",
          title: "Effective Needs Analysis",
          type: "article",
          duration: "10 min",
          completed: true,
          url: "#"
        },
        {
          id: "2-3",
          title: "Discovery Skills Assessment",
          type: "assessment",
          duration: "15 min",
          completed: false,
          url: "#"
        },
      ]
    },
    {
      id: "3",
      name: "Closing Techniques",
      progress: 10,
      resources: [
        {
          id: "3-1",
          title: "5 Effective Closing Techniques",
          type: "video",
          duration: "18 min",
          completed: false,
          url: "#"
        },
        {
          id: "3-2",
          title: "Timing Your Close Properly",
          type: "article",
          duration: "7 min",
          completed: true,
          url: "#"
        },
        {
          id: "3-3",
          title: "Role Play: Closing Scenarios",
          type: "exercise",
          duration: "25 min",
          completed: false,
          url: "#"
        },
      ]
    }
  ];

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video": return <Play className="h-4 w-4 text-neon-blue" />;
      case "article": return <BookOpen className="h-4 w-4 text-neon-purple" />;
      case "exercise": return <Award className="h-4 w-4 text-amber-500" />;
      case "assessment": return <CheckCircle className="h-4 w-4 text-neon-green" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };
  
  const getResourceBadgeColor = (type: string) => {
    switch (type) {
      case "video": return "bg-neon-blue/10 text-neon-blue border-neon-blue/30";
      case "article": return "bg-neon-purple/10 text-neon-purple border-neon-purple/30";
      case "exercise": return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case "assessment": return "bg-neon-green/10 text-neon-green border-neon-green/30";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/30";
    }
  };
  
  // Upcoming learning sessions
  const upcomingSessions = [
    {
      id: "1",
      title: "Advanced Objection Handling",
      type: "Workshop",
      date: "Tomorrow, 10:00 AM",
      duration: "45 min"
    },
    {
      id: "2",
      title: "1:1 Coaching Session",
      type: "Coaching",
      date: "Oct 15, 2:00 PM",
      duration: "30 min"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-neon-green" />
          Personalized Learning Path
        </CardTitle>
        <CardDescription>
          Recommended resources based on your performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {learningSkills.map((skill) => (
              <Card key={skill.id} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Progress value={skill.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground">{skill.progress}%</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {skill.resources.map((resource) => (
                      <a 
                        key={resource.id} 
                        href={resource.url}
                        className={`p-2 rounded-lg flex items-start gap-2 border ${
                          resource.completed 
                            ? "bg-muted/50 border-muted" 
                            : "hover:bg-muted/20 transition-colors"
                        }`}
                      >
                        <div className="mt-0.5">{getResourceIcon(resource.type)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className={`text-sm ${resource.completed ? "text-muted-foreground" : ""}`}>{resource.title}</p>
                            {resource.completed && (
                              <CheckCircle className="h-3 w-3 text-neon-green ml-1" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${getResourceBadgeColor(resource.type)}`}>
                              {resource.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{resource.duration}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Upcoming Learning Sessions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingSessions.map((session) => (
                <div 
                  key={session.id} 
                  className="p-4 rounded-lg border bg-card flex justify-between items-center"
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-neon-purple/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-neon-purple" />
                    </div>
                    <div>
                      <h4 className="font-medium">{session.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {session.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{session.date} • {session.duration}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-neon-green/5 border border-neon-green/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neon-green/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-neon-green" />
              </div>
              <div>
                <h3 className="font-medium">Skills Assessment Available</h3>
                <p className="text-sm text-muted-foreground">Evaluate your progress with a comprehensive assessment</p>
              </div>
            </div>
            <Button className="bg-neon-green hover:bg-neon-green/80 text-white">
              Start Assessment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningPath;
