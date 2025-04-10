# Whisper API Research

## Current Implementation

Based on the codebase examination, our application uses the Whisper API as follows:

1. We're using the `/api/transcribe` endpoint, which is proxied to `https://api.openai.com/v1/audio/transcriptions` in the Vite config
2. We're sending audio files via `FormData` with the following parameters:
   - `file`: The audio file to transcribe
   - `model`: Set to "whisper-1"
   - `response_format`: Set to "json"
   - `speakers`: Optional parameter for speaker diarization (when numSpeakers > 1)

3. The response includes:
   - `text`: The transcribed text
   - `segments`: Array of transcript segments with timestamps
   - `language`: Detected language (default 'en')
   - `duration`: Duration of the audio

## Latest Whisper API Capabilities

According to OpenAI's documentation, the latest Whisper API (as of late 2023) supports:

### Audio Transcription Endpoint

```
POST https://api.openai.com/v1/audio/transcriptions
```

Parameters:
- `file`: Required. The audio file to transcribe (must be in a supported format: mp3, mp4, mpeg, mpga, m4a, wav, or webm)
- `model`: Required. The model to use for transcription. Options include:
  - `whisper-1`: Original model
  - `whisper-large-v3`: Latest and most accurate model (as of mid-2024)
- `language`: Optional. The language of the input audio (in ISO-639-1 format). If not specified, the model will detect the language.
- `prompt`: Optional. Text to guide the model's style or continue a previous audio segment.
- `response_format`: Optional. The format of the transcript. Options include: "json", "text", "srt", "verbose_json", or "vtt".
- `temperature`: Optional. The sampling temperature (0-1). Higher values make output more random, lower values more deterministic.
- `timestamp_granularities`: Optional. Array of timestamp formats to include (e.g., ["word", "segment"])
- `speakers`: Optional (experimental). Number of speakers for diarization (speaker identification).

### Notable Improvements in Recent Versions

1. **Improved Accuracy**: Whisper-large-v3 demonstrates significantly better performance, especially for:
   - Heavily accented speech
   - Background noise handling
   - Technical terminology
   - Multiple speakers

2. **Word-level Timestamps**: The ability to get timestamps for each word, not just segments

3. **Speaker Diarization**: Improved speaker identification (still experimental)

4. **Multi-language Support**: Better support for 100+ languages

5. **Response Format Options**:
   - `verbose_json`: Includes additional metadata like word-level timestamps
   - `srt` and `vtt`: Subtitle formats with timestamps

## Areas for Improvement in Our Implementation

1. **Model Version**: We're using "whisper-1" instead of the latest "whisper-large-v3" model

2. **Timestamp Granularity**: We're not specifying timestamp_granularities to get word-level timestamps

3. **Response Format**: We're using basic "json" instead of "verbose_json" which would provide more detailed information

4. **Language Specification**: We're not providing language hints, which could improve accuracy for non-English content

5. **Error Handling**: Our retry logic is good, but error messages could be more specific

6. **Prompt Utilization**: We're not using the prompt parameter which could improve context understanding

## Implementation Recommendations

1. Update to the latest model:
```javascript
formData.append('model', 'whisper-large-v3'); // Use latest model
```

2. Add word-level timestamps:
```javascript
formData.append('timestamp_granularities', JSON.stringify(["word", "segment"]));
```

3. Use verbose_json for more detailed output:
```javascript
formData.append('response_format', 'verbose_json');
```

4. Add language hint when known:
```javascript
if (knownLanguage) {
  formData.append('language', knownLanguage);
}
```

5. Use prompt parameter for context:
```javascript
if (previousTranscriptContext) {
  formData.append('prompt', previousTranscriptContext);
}
```

## Integration with Metrics System

The enhanced data from the Whisper API can significantly improve our metrics:

1. Word-level timestamps can improve:
   - Speaking rate calculation
   - Filler word detection
   - Interruption detection
   - Talk ratio accuracy

2. Better speaker diarization can enhance:
   - Speaker-specific sentiment analysis
   - More accurate talk ratio
   - Turn-taking metrics

3. Improved accuracy means:
   - Better keyword extraction
   - More accurate sentiment analysis
   - Higher quality metrics overall

## Implementation Plan

Phase 1: Basic API Upgrade
- Update to whisper-large-v3 model
- Implement verbose_json response format
- Update response parsing

Phase 2: Enhanced Features
- Implement word-level timestamp usage
- Add language detection and hints
- Improve speaker diarization

Phase 3: Metrics Integration
- Update metrics calculations to use enhanced data
- Implement new metrics based on word-level data
- Improve visualization of speaker-specific metrics 