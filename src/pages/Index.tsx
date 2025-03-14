
import React from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import PerformanceMetrics from "../components/Dashboard/PerformanceMetrics";
import CallsOverview from "../components/Dashboard/CallsOverview";
import AIInsights from "../components/Dashboard/AIInsights";
import CallTranscript from "../components/CallAnalysis/CallTranscript";
import SentimentAnalysis from "../components/CallAnalysis/SentimentAnalysis";
import CallRating from "../components/CallAnalysis/CallRating";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">
          <span className="text-gradient-blue">AI</span> Sales Call Analyzer
        </h1>
        <p className="text-gray-400">
          Gain real-time insights and improve your sales performance
        </p>
      </div>

      <PerformanceMetrics />
      
      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2">
          <CallsOverview />
        </div>
        <div>
          <AIInsights />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-white mt-8 mb-6">
        Call Analysis
      </h2>
      
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <CallTranscript />
        </div>
        <div className="col-span-2 grid grid-rows-2 gap-6">
          <SentimentAnalysis />
          <CallRating />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
