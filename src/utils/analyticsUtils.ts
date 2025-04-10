import { Transcript } from "@/services/repositories/TranscriptsRepository";

// Type guard for speaker segments (adjust if your JSONB structure differs)
interface SpeakerSegment {
    speaker_label?: string | number | null; // Allow for different label types
    start_time?: number | null;
    end_time?: number | null;
}

function isSpeakerSegment(segment: any): segment is SpeakerSegment {
    return segment && typeof segment === 'object' && 
           (typeof segment.start_time === 'number' || segment.start_time == null) &&
           (typeof segment.end_time === 'number' || segment.end_time == null);
}

/**
 * Calculates talk time for Agent and Customer from transcript segments.
 * Assumes speaker_label is 'AGENT' or similar for the agent.
 */
export function calculateTalkTimes(segments: unknown): { agentTime: number; customerTime: number; totalTime: number } {
    let agentTime = 0;
    let customerTime = 0;
    let minTime = Infinity;
    let maxTime = 0;

    if (!Array.isArray(segments)) {
        console.warn('[calculateTalkTimes] Segments data is not an array:', segments);
        return { agentTime: 0, customerTime: 0, totalTime: 0 };
    }

    segments.forEach(segment => {
        if (isSpeakerSegment(segment) && segment.start_time != null && segment.end_time != null) {
            const duration = segment.end_time - segment.start_time;
            if (duration < 0) return; // Skip invalid segments

            minTime = Math.min(minTime, segment.start_time);
            maxTime = Math.max(maxTime, segment.end_time);

            // Identify agent based on label (adjust logic if needed)
            const isAgent = segment.speaker_label === 'AGENT' || segment.speaker_label === 0 || segment.speaker_label === '0'; 

            if (isAgent) {
                agentTime += duration;
            } else {
                customerTime += duration;
            }
        } else {
             // console.warn('[calculateTalkTimes] Invalid segment structure:', segment);
        }
    });

    const totalTime = (agentTime + customerTime) > 0 ? (maxTime - minTime) : 0;

    return {
        agentTime: agentTime,
        customerTime: customerTime,
        totalTime: totalTime > 0 ? totalTime : (agentTime + customerTime) // Fallback if min/max time is weird
    };
}

/**
 * Calculates talk ratio percentages.
 */
export function calculateTalkRatioPercents(agentTime: number, customerTime: number): { agentPercent: number; customerPercent: number } {
    const totalTalkTime = agentTime + customerTime;
    if (totalTalkTime === 0) {
        return { agentPercent: 0, customerPercent: 0 };
    }
    const agentPercent = Math.round((agentTime / totalTalkTime) * 100);
    const customerPercent = 100 - agentPercent; // Ensure it sums to 100
    return { agentPercent, customerPercent };
}

// Example Usage (Conceptual - place in component where needed):
/*
import { calculateTalkTimes, calculateTalkRatioPercents } from './analyticsUtils';

const MyComponent = ({ transcript }: { transcript: Transcript }) => {
    const { agentTime, customerTime } = calculateTalkTimes(transcript.transcript_segments);
    const { agentPercent, customerPercent } = calculateTalkRatioPercents(agentTime, customerTime);

    return (
        <div>
            Talk Ratio: {agentPercent}:{customerPercent}
        </div>
    );
};
*/ 
 