
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { ArrowRightLeft, Users, Clock, Zap, PieChart } from "lucide-react";

interface CallDataItem {
  name: string;
  rep1: number;
  rep2: number;
}

interface CompareCallsProps {
  rep1Id: string;
  rep2Id: string;
}

export const CompareCalls = ({ rep1Id, rep2Id }: CompareCallsProps) => {
  // Find rep names based on IDs
  const reps = {
    "1": "Alex Johnson",
    "2": "Maria Garcia",
    "3": "David Kim",
    "4": "Sarah Williams",
    "5": "James Taylor",
  };
  
  const rep1Name = reps[rep1Id as keyof typeof reps] || "Representative 1";
  const rep2Name = reps[rep2Id as keyof typeof reps] || "Representative 2";
  
  // Mock call data for comparison
  const callData: CallDataItem[] = [
    { name: "Talk Time Ratio", rep1: 65, rep2: 52 },
    { name: "Question Rate", rep1: 28, rep2: 15 },
    { name: "Interruption Rate", rep1: 8, rep2: 24 },
    { name: "Positive Language", rep1: 72, rep2: 45 },
    { name: "Objection Handling", rep1: 85, rep2: 62 },
    { name: "Closing Success", rep1: 62, rep2: 38 },
  ];
  
  // Recent calls data
  const recentCalls = [
    { 
      id: 1, 
      customer: "Acme Corp", 
      duration: "12:34", 
      rep1Score: 86, 
      rep2Score: 64, 
      date: "2023-07-15" 
    },
    { 
      id: 2, 
      customer: "TechGlobal", 
      duration: "08:23", 
      rep1Score: 72, 
      rep2Score: 68, 
      date: "2023-07-14" 
    },
    { 
      id: 3, 
      customer: "CloudSolutions", 
      duration: "15:47", 
      rep1Score: 91, 
      rep2Score: 59, 
      date: "2023-07-13" 
    },
    { 
      id: 4, 
      customer: "GreenEnergy", 
      duration: "10:12", 
      rep1Score: 78, 
      rep2Score: 74, 
      date: "2023-07-12" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-neon-purple" />
              Call Metrics Comparison
            </CardTitle>
            <CardDescription>
              Side-by-side comparison of key call metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={callData}
                  margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, '']}
                    labelFormatter={(label) => `Metric: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="rep1" 
                    name={rep1Name}
                    fill="#A855F7" // Purple for rep1
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar 
                    dataKey="rep2" 
                    name={rep2Name}
                    fill="#00F0FF" // Blue for rep2
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-neon-purple" />
              Recent Call Comparison
            </CardTitle>
            <CardDescription>
              Performance on recent customer calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">{rep1Name}</TableHead>
                  <TableHead className="text-right">{rep2Name}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-medium">{call.customer}</TableCell>
                    <TableCell>{call.duration}</TableCell>
                    <TableCell className="text-right">
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          call.rep1Score >= 80 ? 'bg-neon-green/20 text-neon-green' :
                          call.rep1Score >= 70 ? 'bg-neon-blue/20 text-neon-blue' :
                          call.rep1Score >= 60 ? 'bg-amber-500/20 text-amber-500' :
                          'bg-neon-red/20 text-neon-red'
                        }`}
                      >
                        {call.rep1Score}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          call.rep2Score >= 80 ? 'bg-neon-green/20 text-neon-green' :
                          call.rep2Score >= 70 ? 'bg-neon-blue/20 text-neon-blue' :
                          call.rep2Score >= 60 ? 'bg-amber-500/20 text-amber-500' :
                          'bg-neon-red/20 text-neon-red'
                        }`}
                      >
                        {call.rep2Score}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-neon-purple" />
              Talk Time Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{rep1Name}</span>
                  <span className="text-sm font-medium">65%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-neon-purple h-2.5 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Maintains good talk/listen ratio
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{rep2Name}</span>
                  <span className="text-sm font-medium">52%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-neon-blue h-2.5 rounded-full" style={{ width: '52%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tends to talk more than listen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-neon-purple" />
              Objection Handling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{rep1Name}</span>
                  <span className="text-sm font-medium">85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-neon-green h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Excellent at addressing concerns
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{rep2Name}</span>
                  <span className="text-sm font-medium">62%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sometimes struggles with objections
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-neon-purple" />
              Closing Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{rep1Name}</span>
                  <span className="text-sm font-medium">62%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-neon-blue h-2.5 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Good closing rate with room for improvement
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{rep2Name}</span>
                  <span className="text-sm font-medium">38%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-neon-red h-2.5 rounded-full" style={{ width: '38%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs significant improvement in closing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
