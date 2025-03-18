
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateAnonymousUserId } from "@/integrations/supabase/client";
import { CallTranscript } from './CallTranscriptService';

export const useDemoDataService = () => {
  // Generate demo data for when the database connection fails
  const generateDemoTranscripts = useCallback((count = 10): CallTranscript[] => {
    const sentiments = ['positive', 'neutral', 'negative'];
    const demoData: CallTranscript[] = [];
    
    for (let i = 0; i < count; i++) {
      const id = uuidv4(); // Use proper UUID format for all IDs
      const anonymousId = generateAnonymousUserId();
      const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
      
      demoData.push({
        id,
        user_id: anonymousId,
        filename: `call-${i}.wav`,
        text: `This is a demo transcript for call ${i}. It contains sample conversation text that would typically be generated from a real call recording.`,
        duration: Math.floor(Math.random() * 600) + 120, // 2-12 minutes
        call_score: Math.floor(Math.random() * 50) + 50, // 50-100
        sentiment: randomSentiment,
        keywords: ["product", "pricing", "follow-up", "meeting"],
        transcript_segments: null,
        created_at: randomDate.toISOString()
      });
    }
    
    console.log('Generated demo transcripts with proper UUIDs:', demoData);
    return demoData;
  }, []);

  return {
    generateDemoTranscripts
  };
};
