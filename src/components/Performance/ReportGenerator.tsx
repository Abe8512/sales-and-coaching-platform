
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { Check, Download, FileText, Printer, Share2, Clipboard, FileDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";

interface ReportGeneratorProps {
  dateRange: DateRange | undefined;
}

const ReportGenerator = ({ dateRange }: ReportGeneratorProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  
  const reportTypes = [
    {
      id: "performance",
      title: "Performance Summary",
      description: "Overview of key performance indicators and trends",
      image: "📊",
    },
    {
      id: "calls",
      title: "Call Analysis",
      description: "Detailed analysis of call patterns and behaviors",
      image: "📱",
    },
    {
      id: "team",
      title: "Team Comparison",
      description: "Compare performance across team members",
      image: "👥",
    },
    {
      id: "coaching",
      title: "Coaching Report",
      description: "AI-generated coaching recommendations based on call data",
      image: "🧠",
    },
    {
      id: "custom",
      title: "Custom Report",
      description: "Build a report with specific metrics you need",
      image: "🛠️",
    },
  ];
  
  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Report Generated",
        description: "Your report has been generated successfully",
      });
    }, 2000);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Report Templates</CardTitle>
          <CardDescription>
            Select a report template to generate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((report) => (
              <Card key={report.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription className="mt-1">{report.description}</CardDescription>
                    </div>
                    <div className="text-4xl">{report.image}</div>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0 flex justify-end">
                  <Button variant="secondary" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Select
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
          <CardDescription>
            Configure your report options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="text-sm px-4 py-2 rounded bg-muted">
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    From <strong>{dateRange.from.toLocaleDateString()}</strong>
                    {" "}to <strong>{dateRange.to.toLocaleDateString()}</strong>
                  </>
                ) : (
                  dateRange.from.toLocaleDateString()
                )
              ) : (
                "Select a date range"
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Include Sections</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="summary" defaultChecked />
                <label
                  htmlFor="summary"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Executive Summary
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="charts" defaultChecked />
                <label
                  htmlFor="charts"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Charts & Visualizations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="metrics" defaultChecked />
                <label
                  htmlFor="metrics"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Detailed Metrics
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="recommendations" defaultChecked />
                <label
                  htmlFor="recommendations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  AI Recommendations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="raw" />
                <label
                  htmlFor="raw"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Raw Data Tables
                </label>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Format</Label>
            <RadioGroup 
              defaultValue="pdf" 
              value={selectedFormat} 
              onValueChange={setSelectedFormat}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal">PDF Document</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="font-normal">Excel Spreadsheet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dashboard" id="dashboard" />
                <Label htmlFor="dashboard" className="font-normal">Interactive Dashboard</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            className="w-full" 
            onClick={handleGenerate} 
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>Generating...</>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
          
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" className="flex-1">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Previously generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left">Report Name</th>
                  <th className="py-3 px-4 text-left">Type</th>
                  <th className="py-3 px-4 text-left">Generated</th>
                  <th className="py-3 px-4 text-left">Format</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">May Performance Summary</td>
                  <td className="py-3 px-4">Performance</td>
                  <td className="py-3 px-4">May 31, 2023</td>
                  <td className="py-3 px-4">PDF</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Q1 Team Comparison</td>
                  <td className="py-3 px-4">Team</td>
                  <td className="py-3 px-4">April 2, 2023</td>
                  <td className="py-3 px-4">Excel</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Call Analysis Report</td>
                  <td className="py-3 px-4">Calls</td>
                  <td className="py-3 px-4">March 15, 2023</td>
                  <td className="py-3 px-4">Dashboard</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportGenerator;
