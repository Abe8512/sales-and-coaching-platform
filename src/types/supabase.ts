export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      calls: {
        Row: {
          id: string
          user_id: string
          created_at: string
          duration: number
          sentiment: string
          sentiment_agent: number
          sentiment_customer: number
          talk_ratio_agent: number
          talk_ratio_customer: number
          call_score: number
          key_phrases: string[]
          metrics_confidence: number
          metrics_version: number
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          duration?: number
          sentiment?: string
          sentiment_agent?: number
          sentiment_customer?: number
          talk_ratio_agent?: number
          talk_ratio_customer?: number
          call_score?: number
          key_phrases?: string[]
          metrics_confidence?: number
          metrics_version?: number
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          duration?: number
          sentiment?: string
          sentiment_agent?: number
          sentiment_customer?: number
          talk_ratio_agent?: number
          talk_ratio_customer?: number
          call_score?: number
          key_phrases?: string[]
          metrics_confidence?: number
          metrics_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "calls_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      call_transcripts: {
        Row: {
          id: string
          call_id: string
          user_id: string
          created_at: string
          text: string
          transcript_segments: Json
          words: Json[]
          filename: string
          keywords: string[]
          sentiment: string
        }
        Insert: {
          id?: string
          call_id: string
          user_id: string
          created_at?: string
          text: string
          transcript_segments?: Json
          words?: Json[]
          filename: string
          keywords?: string[]
          sentiment?: string
        }
        Update: {
          id?: string
          call_id?: string
          user_id?: string
          created_at?: string
          text?: string
          transcript_segments?: Json
          words?: Json[]
          filename?: string
          keywords?: string[]
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_call_id_fkey"
            columns: ["call_id"]
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_transcripts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      call_metrics_summary: {
        Row: {
          id: string
          time_period: string
          talk_ratio: number
          agent_talk_ratio: number
          customer_talk_ratio: number
          avg_sentiment: number
          total_calls: number
          avg_duration: number
          top_keywords: string[]
          performance_score: number
          conversion_rate: number
          successful_calls: number
          unsuccessful_calls: number
          created_at: string
          updated_at: string
          metrics_version: number
        }
        Insert: {
          id: string
          time_period: string
          talk_ratio: number
          agent_talk_ratio: number
          customer_talk_ratio: number
          avg_sentiment: number
          total_calls: number
          avg_duration: number
          top_keywords?: string[]
          performance_score?: number
          conversion_rate?: number
          successful_calls?: number
          unsuccessful_calls?: number
          created_at?: string
          updated_at?: string
          metrics_version?: number
        }
        Update: {
          id?: string
          time_period?: string
          talk_ratio?: number
          agent_talk_ratio?: number
          customer_talk_ratio?: number
          avg_sentiment?: number
          total_calls?: number
          avg_duration?: number
          top_keywords?: string[]
          performance_score?: number
          conversion_rate?: number
          successful_calls?: number
          unsuccessful_calls?: number
          created_at?: string
          updated_at?: string
          metrics_version?: number
        }
        Relationships: []
      }
      rep_metrics_summary: {
        Row: {
          id: string
          rep_id: string
          rep_name: string
          time_period: string
          talk_ratio: number
          avg_sentiment: number
          total_calls: number
          avg_duration: number
          call_volume: number
          success_rate: number
          sentiment_score: number
          top_keywords: string[]
          insights: string[]
          created_at: string
          updated_at: string
          metrics_version: number
        }
        Insert: {
          id?: string
          rep_id: string
          rep_name: string
          time_period: string
          talk_ratio: number
          avg_sentiment: number
          total_calls: number
          avg_duration: number
          call_volume: number
          success_rate: number
          sentiment_score: number
          top_keywords?: string[]
          insights?: string[]
          created_at?: string
          updated_at?: string
          metrics_version?: number
        }
        Update: {
          id?: string
          rep_id?: string
          rep_name?: string
          time_period?: string
          talk_ratio?: number
          avg_sentiment?: number
          total_calls?: number
          avg_duration?: number
          call_volume?: number
          success_rate?: number
          sentiment_score?: number
          top_keywords?: string[]
          insights?: string[]
          created_at?: string
          updated_at?: string
          metrics_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rep_metrics_summary_rep_id_fkey"
            columns: ["rep_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          full_name: string
          role: string
          team_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          full_name: string
          role?: string
          team_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string
          role?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          id: string
          log_type: string
          message: string
          execution_time_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          log_type: string
          message: string
          execution_time_ms: number
          created_at?: string
        }
        Update: {
          id?: string
          log_type?: string
          message?: string
          execution_time_ms?: number
          created_at?: string
        }
        Relationships: []
      }
      metrics_consistency_log: {
        Row: {
          id: string
          run_date: string
          metric_name: string
          source_a: string
          value_a: number
          source_b: string
          value_b: number
          deviation: number
          is_consistent: boolean
        }
        Insert: {
          id?: string
          run_date?: string
          metric_name: string
          source_a: string
          value_a: number
          source_b: string
          value_b: number
          deviation: number
          is_consistent: boolean
        }
        Update: {
          id?: string
          run_date?: string
          metric_name?: string
          source_a?: string
          value_a?: number
          source_b?: string
          value_b?: number
          deviation?: number
          is_consistent?: boolean
        }
        Relationships: []
      }
      metrics_anomaly_log: {
        Row: {
          id: string
          detected_at: string
          metric_name: string
          latest_value: number
          avg_value: number
          deviation_percent: number
          severity: string
        }
        Insert: {
          id?: string
          detected_at?: string
          metric_name: string
          latest_value: number
          avg_value: number
          deviation_percent: number
          severity: string
        }
        Update: {
          id?: string
          detected_at?: string
          metric_name?: string
          latest_value?: number
          avg_value?: number
          deviation_percent?: number
          severity?: string
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_metrics_mv: {
        Row: {
          id: string
          time_period: string
          talk_ratio: number
          agent_talk_ratio: number
          customer_talk_ratio: number
          avg_sentiment: number
          total_calls: number
          avg_duration: number
          top_keywords: string[]
          performance_score: number
          conversion_rate: number
          successful_calls: number
          unsuccessful_calls: number
          created_at: string
          updated_at: string
          metrics_version: number
        }
        Relationships: []
      }
      metrics_validation: {
        Row: {
          metric_name: string
          summary_value: number
          actual_value: number
          deviation_percent: number
          status: string
        }
        Relationships: []
      }
      metrics_health_dashboard: {
        Row: {
          check_type: string
          issue_count: number
          affected_metrics: string | null
          max_deviation: number | null
          last_checked: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_metrics_health_dashboard: {
        Args: Record<string, never>
        Returns: {
          check_type: string
          issue_count: number
          affected_metrics: string | null
          max_deviation: number | null
          last_checked: string | null
        }[]
      }
      get_metrics_consistency_issues: {
        Args: {
          limit_count: number
        }
        Returns: {
          id: string
          run_date: string
          metric_name: string
          source_a: string
          value_a: number
          source_b: string
          value_b: number
          deviation: number
          is_consistent: boolean
        }[]
      }
      get_metrics_anomalies: {
        Args: {
          limit_count: number
        }
        Returns: {
          id: string
          detected_at: string
          metric_name: string
          latest_value: number
          avg_value: number
          deviation_percent: number
          severity: string
        }[]
      }
      run_all_health_checks: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
} 