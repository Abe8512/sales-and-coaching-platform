
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export interface CallOutcome {
  outcome: string;
  count: number;
  percentage: number;
}

interface CallOutcomeStatsProps {
  outcomeStats: CallOutcome[];
  callDistributionData: {
    name: string;
    calls: number;
  }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#FF4F9A'];

const CallOutcomeStats: React.FC<CallOutcomeStatsProps> = ({ 
  outcomeStats, 
  callDistributionData 
}) => {
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Call Distribution</CardTitle>
          <CardDescription>Number of calls per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={callDistributionData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="calls" 
                  fill="#9333EA" 
                  name="Number of Calls" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Call Outcomes</CardTitle>
            <CardDescription>Distribution of call results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {outcomeStats.map((stat) => (
                <Card key={stat.outcome} className="bg-background">
                  <CardContent className="p-6">
                    <h3 className="font-medium text-muted-foreground">{stat.outcome}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-2xl font-bold">{stat.count}</p>
                      <p className="text-sm bg-muted rounded-full px-2 py-1">
                        {stat.percentage}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-neon-purple h-2 rounded-full"
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Outcome Distribution</CardTitle>
            <CardDescription>Visual breakdown of call outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="outcome"
                  >
                    {outcomeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [`${value} calls`, props.payload.outcome]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CallOutcomeStats;
