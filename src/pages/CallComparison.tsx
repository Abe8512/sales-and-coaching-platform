
import React, { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useContext } from "react";
import { ThemeContext } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompareCalls } from "@/components/CallComparison/CompareCalls";
import ComparisonMetrics from "@/components/CallComparison/ComparisonMetrics";

const CallComparison = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [selectedRep1, setSelectedRep1] = useState("1"); // Alex Johnson
  const [selectedRep2, setSelectedRep2] = useState("4"); // Sarah Williams
  
  // Mock data for sales reps
  const salesReps = [
    { id: "1", name: "Alex Johnson" },
    { id: "2", name: "Maria Garcia" },
    { id: "3", name: "David Kim" },
    { id: "4", name: "Sarah Williams" },
    { id: "5", name: "James Taylor" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-1`}>
          Call Comparison
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Compare call performance between sales representatives
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Representatives</CardTitle>
          <CardDescription>Choose two representatives to compare their call performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Representative 1</label>
              <Select value={selectedRep1} onValueChange={setSelectedRep1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rep" />
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map(rep => (
                    <SelectItem 
                      key={rep.id} 
                      value={rep.id}
                      disabled={rep.id === selectedRep2}
                    >
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Representative 2</label>
              <Select value={selectedRep2} onValueChange={setSelectedRep2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rep" />
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map(rep => (
                    <SelectItem 
                      key={rep.id} 
                      value={rep.id}
                      disabled={rep.id === selectedRep1}
                    >
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="metrics" className="mb-6">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="calls">Call Analysis</TabsTrigger>
          <TabsTrigger value="timeline">Timeline Comparison</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics" className="mt-6">
          <ComparisonMetrics rep1Id={selectedRep1} rep2Id={selectedRep2} />
        </TabsContent>
        
        <TabsContent value="calls" className="mt-6">
          <CompareCalls rep1Id={selectedRep1} rep2Id={selectedRep2} />
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline</CardTitle>
              <CardDescription>Compare performance trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-md">
                <p className="text-muted-foreground">Timeline comparison will be available when connected to the backend</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CallComparison;
