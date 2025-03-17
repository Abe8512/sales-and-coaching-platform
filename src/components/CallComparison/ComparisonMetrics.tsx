
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ComparisonMetricsProps {
  rep1Id: string;
  rep2Id: string;
}

const ComparisonMetrics = ({ rep1Id, rep2Id }: ComparisonMetricsProps) => {
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
  
  // Mock data for radar chart
  const data = [
    {
      subject: 'Call Volume',
      A: 120,
      B: 110,
      fullMark: 150,
    },
    {
      subject: 'Avg Call Duration',
      A: 98,
      B: 130,
      fullMark: 150,
    },
    {
      subject: 'Conversion Rate',
      A: 86,
      B: 70,
      fullMark: 150,
    },
    {
      subject: 'Customer Satisfaction',
      A: 99,
      B: 88,
      fullMark: 150,
    },
    {
      subject: 'Follow-up Rate',
      A: 85,
      B: 90,
      fullMark: 150,
    },
    {
      subject: 'Script Adherence',
      A: 65,
      B: 85,
      fullMark: 150,
    },
  ];
  
  // Mock performance data
  const performanceData = [
    { 
      metric: "Total Calls",
      rep1: 145,
      rep2: 112,
      unit: "calls",
      comparison: "+33",
      winner: "rep1"
    },
    { 
      metric: "Conversion Rate",
      rep1: 23,
      rep2: 18,
      unit: "%",
      comparison: "+5%",
      winner: "rep1"
    },
    { 
      metric: "Avg Call Duration",
      rep1: 8.2,
      rep2: 10.5,
      unit: "min",
      comparison: "-2.3 min",
      winner: "rep2"
    },
    { 
      metric: "Customer Rating",
      rep1: 4.7,
      rep2: 4.2,
      unit: "/5",
      comparison: "+0.5",
      winner: "rep1"
    },
    { 
      metric: "Follow-up Rate",
      rep1: 85,
      rep2: 90,
      unit: "%",
      comparison: "-5%",
      winner: "rep2"
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Radar</CardTitle>
          <CardDescription>
            Comparing {rep1Name} vs {rep2Name} across key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis />
                <Radar
                  name={rep1Name}
                  dataKey="A"
                  stroke="#A855F7"
                  fill="#A855F7"
                  fillOpacity={0.3}
                />
                <Radar
                  name={rep2Name}
                  dataKey="B"
                  stroke="#00F0FF"
                  fill="#00F0FF"
                  fillOpacity={0.3}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics Comparison</CardTitle>
          <CardDescription>
            Detailed comparison of key performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Metric</th>
                  <th className="text-center py-3 px-4">{rep1Name}</th>
                  <th className="text-center py-3 px-4">{rep2Name}</th>
                  <th className="text-center py-3 px-4">Difference</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4 px-4 font-medium">{item.metric}</td>
                    <td className={`py-4 px-4 text-center ${item.winner === 'rep1' ? 'font-bold text-neon-purple' : ''}`}>
                      {item.rep1}{item.unit}
                    </td>
                    <td className={`py-4 px-4 text-center ${item.winner === 'rep2' ? 'font-bold text-neon-blue' : ''}`}>
                      {item.rep2}{item.unit}
                    </td>
                    <td className={`py-4 px-4 text-center font-medium ${
                      item.comparison.startsWith('+') ? 'text-neon-green' : 
                      item.comparison.startsWith('-') ? 'text-neon-red' : ''
                    }`}>
                      {item.comparison}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{rep1Name} Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-green mt-2"></div>
                <span>High call volume and efficiency</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-green mt-2"></div>
                <span>Strong closing ability and conversion rate</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-green mt-2"></div>
                <span>Excellent customer satisfaction ratings</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-green mt-2"></div>
                <span>Effective objection handling techniques</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{rep2Name} Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-blue mt-2"></div>
                <span>Thorough discovery process (longer calls)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-blue mt-2"></div>
                <span>Higher follow-up rate with prospects</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-blue mt-2"></div>
                <span>Better script adherence and compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-blue mt-2"></div>
                <span>More detailed documentation of customer needs</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComparisonMetrics;
