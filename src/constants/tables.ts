/**
 * Central location for table name constants to avoid duplication and inconsistencies
 */

/**
 * Enum of all table names for type safety
 */
export enum TableName {
  CALLS = 'calls',
  CALL_TRANSCRIPTS = 'call_transcripts',
  KEYWORD_TRENDS = 'keyword_trends',
  SENTIMENT_TRENDS = 'sentiment_trends',
}

/**
 * Array of tables that need realtime functionality
 */
export const REALTIME_TABLES = [
  TableName.CALL_TRANSCRIPTS,
  TableName.CALLS,
  TableName.KEYWORD_TRENDS,
  TableName.SENTIMENT_TRENDS,
];

/**
 * Tables that are frequently accessed and need shorter cache TTLs
 */
export const FREQUENTLY_ACCESSED_TABLES = [
  TableName.CALLS,
  TableName.CALL_TRANSCRIPTS,
  TableName.KEYWORD_TRENDS,
  TableName.SENTIMENT_TRENDS,
];

/**
 * Table metadata for additional configuration
 */
export const TABLE_METADATA = {
  [TableName.CALLS]: {
    displayName: 'Calls',
    description: 'Call records and metrics',
    cacheTTL: 2000, // milliseconds
  },
  [TableName.CALL_TRANSCRIPTS]: {
    displayName: 'Call Transcripts',
    description: 'Transcribed content of calls',
    cacheTTL: 2000, // milliseconds
  },
  [TableName.KEYWORD_TRENDS]: {
    displayName: 'Keyword Trends',
    description: 'Trending keywords from calls',
    cacheTTL: 2000, // milliseconds
  },
  [TableName.SENTIMENT_TRENDS]: {
    displayName: 'Sentiment Trends',
    description: 'Sentiment analysis trends',
    cacheTTL: 2000, // milliseconds
  },
};

/**
 * Get cache TTL for a specific table
 * @param tableName The table name to get TTL for
 * @returns TTL in milliseconds
 */
export const getTableCacheTTL = (tableName: TableName): number => {
  return TABLE_METADATA[tableName]?.cacheTTL || 5000; // Default to 5 seconds
}; 