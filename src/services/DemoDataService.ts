import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateAnonymousUserId } from "@/integrations/supabase/client";
import { Transcript } from './repositories/TranscriptsRepository';
import { faker } from '@faker-js/faker';

export const useDemoDataService = () => {
  // Generate demo data for when the database connection fails
  const generateDemoTranscripts = useCallback((count: number = 10): Omit<Transcript, 'id'>[] => {
    const demoData: Omit<Transcript, 'id'>[] = [];
    const userId = generateAnonymousUserId();

    for (let i = 0; i < count; i++) {
      const startTime = faker.date.recent({ days: 7 });
      const durationSeconds = faker.number.int({ min: 30, max: 600 });
      const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
      const speaker = i % 2 === 0 ? 'Agent' : 'Customer';
      
      // Generate data matching the Transcript interface properties
      demoData.push({
        created_at: startTime.toISOString(),
        call_id: uuidv4(), // Use generated UUID for call_id
        text: faker.lorem.paragraphs(faker.number.int({ min: 2, max: 5 })),
        speaker_label: speaker,
        start_time: 0, // Placeholder
        end_time: durationSeconds, // Placeholder
        // DO NOT include user_id or filename as they are not in the Transcript interface
      });
    }
    return demoData;
  }, []);

  const generateMockTranscriptData = (count: number): Omit<Transcript, 'id'>[] => {
    // ... implementation likely uses faker ...
    // Ensure the returned objects match the Transcript interface from TranscriptsRepository
    return data.map(item => ({
      // Map faker data to Transcript fields
      created_at: item.created_at.toISOString(),
      call_id: item.call_id,
      text: item.text,
      speaker_label: item.speaker_label,
      start_time: item.start_time,
      end_time: item.end_time,
      // Add other required fields from Transcript interface with defaults if needed
      user_id: item.user_id, // Ensure user_id is generated/mapped
      filename: item.filename, // Ensure filename is generated/mapped
      // Remove fields not in Transcript interface (like sentiment, keywords, etc. if they were here)
    }));
  };

  return {
    generateDemoTranscripts,
    generateMockTranscriptData
  };
};
