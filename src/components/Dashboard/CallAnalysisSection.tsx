
import React, { useRef } from "react";
import CallTranscript from "../CallAnalysis/CallTranscript";
import SentimentAnalysis from "../CallAnalysis/SentimentAnalysis";
import KeywordInsights from "../CallAnalysis/KeywordInsights";
import CallRating from "../CallAnalysis/CallRating";
import ContentLoader from "../ui/ContentLoader";
import { useContext } from "react";
import { ThemeContext } from "@/App";

interface CallAnalysisSectionProps {
  isLoading: boolean;
}

const CallAnalysisSection = ({ isLoading }: CallAnalysisSectionProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const callAnalysisSectionRef = useRef<HTMLDivElement>(null);
  
  // Calculate fixed heights for components to prevent layout shifts
  const callTranscriptHeight = 400;
  const sideComponentHeight = 120;

  return (
    <>
      <h2 
        ref={callAnalysisSectionRef}
        className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mt-8 mb-6`}
      >
        Call Analysis
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="col-span-1 md:col-span-3">
          <ContentLoader 
            isLoading={isLoading} 
            height={callTranscriptHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <CallTranscript />
          </ContentLoader>
        </div>
        <div className="col-span-1 md:col-span-2 grid grid-rows-3 gap-6">
          <ContentLoader 
            isLoading={isLoading} 
            height={sideComponentHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <SentimentAnalysis />
          </ContentLoader>
          
          <ContentLoader 
            isLoading={isLoading} 
            height={sideComponentHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <KeywordInsights />
          </ContentLoader>
          
          <ContentLoader 
            isLoading={isLoading} 
            height={sideComponentHeight}
            skeletonCount={1}
            preserveHeight={true}
          >
            <CallRating />
          </ContentLoader>
        </div>
      </div>
    </>
  );
};

export default CallAnalysisSection;
