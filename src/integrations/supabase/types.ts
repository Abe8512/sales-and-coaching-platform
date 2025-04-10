export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      call_metrics_summary: {
        Row: {
          agent_talk_ratio: number | null
          avg_duration: number | null
          avg_sentiment: number | null
          conversion_rate: number | null
          created_at: string
          customer_talk_ratio: number | null
          id: string
          metrics_version: number
          performance_score: number | null
          successful_calls: number | null
          time_period: string
          top_keywords: Json | null
          total_calls: number | null
          unsuccessful_calls: number | null
          updated_at: string
        }
        Insert: {
          agent_talk_ratio?: number | null
          avg_duration?: number | null
          avg_sentiment?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_talk_ratio?: number | null
          id: string
          metrics_version?: number
          performance_score?: number | null
          successful_calls?: number | null
          time_period: string
          top_keywords?: Json | null
          total_calls?: number | null
          unsuccessful_calls?: number | null
          updated_at?: string
        }
        Update: {
          agent_talk_ratio?: number | null
          avg_duration?: number | null
          avg_sentiment?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_talk_ratio?: number | null
          id?: string
          metrics_version?: number
          performance_score?: number | null
          successful_calls?: number | null
          time_period?: string
          top_keywords?: Json | null
          total_calls?: number | null
          unsuccessful_calls?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      call_transcripts: {
        Row: {
          call_id: string
          call_score: number | null
          created_at: string
          filename: string | null
          id: string
          keywords: string[] | null
          language: string | null
          metadata: Json | null
          sentiment: string | null
          sentiment_score: number | null
          talk_ratio_agent: number | null
          talk_ratio_customer: number | null
          text: string | null
          transcript_segments: Json | null
          user_id: string | null
          words: Json | null
        }
        Insert: {
          call_id: string
          call_score?: number | null
          created_at?: string
          filename?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          metadata?: Json | null
          sentiment?: string | null
          sentiment_score?: number | null
          talk_ratio_agent?: number | null
          talk_ratio_customer?: number | null
          text?: string | null
          transcript_segments?: Json | null
          user_id?: string | null
          words?: Json | null
        }
        Update: {
          call_id?: string
          call_score?: number | null
          created_at?: string
          filename?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          metadata?: Json | null
          sentiment?: string | null
          sentiment_score?: number | null
          talk_ratio_agent?: number | null
          talk_ratio_customer?: number | null
          text?: string | null
          transcript_segments?: Json | null
          user_id?: string | null
          words?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_transcripts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calls: {
        Row: {
          call_score: number | null
          created_at: string
          duration: number | null
          id: string
          key_phrases: string[] | null
          metrics_confidence: number | null
          metrics_version: number
          sentiment: string | null
          sentiment_agent: number | null
          sentiment_customer: number | null
          talk_ratio_agent: number | null
          talk_ratio_customer: number | null
          user_id: string | null
        }
        Insert: {
          call_score?: number | null
          created_at?: string
          duration?: number | null
          id?: string
          key_phrases?: string[] | null
          metrics_confidence?: number | null
          metrics_version?: number
          sentiment?: string | null
          sentiment_agent?: number | null
          sentiment_customer?: number | null
          talk_ratio_agent?: number | null
          talk_ratio_customer?: number | null
          user_id?: string | null
        }
        Update: {
          call_score?: number | null
          created_at?: string
          duration?: number | null
          id?: string
          key_phrases?: string[] | null
          metrics_confidence?: number | null
          metrics_version?: number
          sentiment?: string | null
          sentiment_agent?: number | null
          sentiment_customer?: number | null
          talk_ratio_agent?: number | null
          talk_ratio_customer?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      metrics_anomaly_log: {
        Row: {
          average_value: number | null
          detection_time: string
          deviation_percentage: number | null
          id: string
          latest_value: number | null
          metric_name: string
          severity: string
        }
        Insert: {
          average_value?: number | null
          detection_time?: string
          deviation_percentage?: number | null
          id?: string
          latest_value?: number | null
          metric_name: string
          severity: string
        }
        Update: {
          average_value?: number | null
          detection_time?: string
          deviation_percentage?: number | null
          id?: string
          latest_value?: number | null
          metric_name?: string
          severity?: string
        }
        Relationships: []
      }
      metrics_consistency_log: {
        Row: {
          check_time: string
          deviation_percentage: number | null
          id: string
          is_consistent: boolean
          metric_name: string
          source_1: string | null
          source_2: string | null
          value_1: number | null
          value_2: number | null
        }
        Insert: {
          check_time?: string
          deviation_percentage?: number | null
          id?: string
          is_consistent: boolean
          metric_name: string
          source_1?: string | null
          source_2?: string | null
          value_1?: number | null
          value_2?: number | null
        }
        Update: {
          check_time?: string
          deviation_percentage?: number | null
          id?: string
          is_consistent?: boolean
          metric_name?: string
          source_1?: string | null
          source_2?: string | null
          value_1?: number | null
          value_2?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_metrics_summary: {
        Row: {
          agent_talk_ratio: number | null
          avg_duration: number | null
          avg_sentiment: number | null
          created_at: string
          customer_talk_ratio: number | null
          id: string
          insights: string[] | null
          metrics_version: number
          rep_id: string
          rep_name: string | null
          success_rate: number | null
          time_period: string
          top_keywords: Json | null
          total_calls: number | null
          updated_at: string
        }
        Insert: {
          agent_talk_ratio?: number | null
          avg_duration?: number | null
          avg_sentiment?: number | null
          created_at?: string
          customer_talk_ratio?: number | null
          id?: string
          insights?: string[] | null
          metrics_version?: number
          rep_id: string
          rep_name?: string | null
          success_rate?: number | null
          time_period: string
          top_keywords?: Json | null
          total_calls?: number | null
          updated_at?: string
        }
        Update: {
          agent_talk_ratio?: number | null
          avg_duration?: number | null
          avg_sentiment?: number | null
          created_at?: string
          customer_talk_ratio?: number | null
          id?: string
          insights?: string[] | null
          metrics_version?: number
          rep_id?: string
          rep_name?: string | null
          success_rate?: number | null
          time_period?: string
          top_keywords?: Json | null
          total_calls?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_metrics_summary_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          execution_time_ms: number | null
          id: string
          log_type: string | null
          message: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          log_type?: string | null
          message?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          log_type?: string | null
          message?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_teams_manager_id"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          manager_id: string | null
          name: string | null
          role: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          manager_id?: string | null
          name?: string | null
          role?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          manager_id?: string | null
          name?: string | null
          role?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_manager_id"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dashboard_metrics_mv: {
        Row: {
          agent_talk_ratio: number | null
          avg_duration: number | null
          avg_sentiment: number | null
          conversion_rate: number | null
          created_at: string | null
          customer_talk_ratio: number | null
          id: string | null
          metrics_version: number | null
          performance_score: number | null
          successful_calls: number | null
          time_period: string | null
          top_keywords: Json | null
          total_calls: number | null
          unsuccessful_calls: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      metrics_health_dashboard: {
        Row: {
          affected_metrics: string | null
          check_type: string | null
          issue_count: number | null
          last_checked: string | null
          max_deviation: number | null
        }
        Relationships: []
      }
      metrics_validation: {
        Row: {
          actual_value: number | null
          deviation_percent: number | null
          metric_name: string | null
          status: string | null
          summary_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      analyze_call_transcript: {
        Args: { transcript_text: string }
        Returns: Json
      }
      detect_metrics_anomalies: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_name: string
          latest_value: number
          average_value: number
          deviation_percentage: number
          severity: string
        }[]
      }
      execute_sql: {
        Args: { sql_query: string }
        Returns: undefined
      }
      get_daily_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          date: string
          total_calls: number
          avg_sentiment: number
          avg_duration: number
          avg_talk_ratio_agent: number
          avg_talk_ratio_customer: number
        }[]
      }
      get_rep_performance: {
        Args: Record<PropertyKey, never>
        Returns: {
          rep_id: string
          rep_name: string
          avg_score: number
          total_calls: number
        }[]
      }
      get_sentiment_over_time: {
        Args: { period?: string }
        Returns: {
          date: string
          sentiment_score: number
        }[]
      }
      log_metrics_anomalies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_metrics_consistency: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_dashboard_metrics: {
        Args: { perform_full_refresh?: boolean }
        Returns: undefined
      }
      run_metrics_health_checks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_call_metrics_summary: {
        Args:
          | {
              p_id: string
              p_total_calls: number
              p_avg_sentiment: number
              p_agent_talk_ratio: number
              p_customer_talk_ratio: number
              p_top_keywords: string[]
              p_performance_score: number
              p_conversion_rate: number
              p_avg_call_duration: number
              p_successful_calls: number
              p_unsuccessful_calls: number
              p_time_period: string
            }
          | {
              p_id: string
              p_time_period: string
              p_agent_talk_ratio: number
              p_customer_talk_ratio: number
              p_avg_sentiment: number
              p_total_calls: number
              p_avg_duration: number
              p_top_keywords: Json
              p_performance_score: number
              p_conversion_rate: number
              p_successful_calls: number
              p_unsuccessful_calls: number
              p_metrics_version: number
            }
        Returns: undefined
      }
      upsert_rep_metrics_summary: {
        Args: {
          p_rep_id: string
          p_time_period: string
          p_rep_name: string
          p_agent_talk_ratio: number
          p_customer_talk_ratio: number
          p_avg_sentiment: number
          p_total_calls: number
          p_avg_duration: number
          p_success_rate: number
          p_top_keywords: Json
          p_insights: string[]
          p_metrics_version: number
        }
        Returns: undefined
      }
      validate_metrics_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_name: string
          source_1: string
          value_1: number
          source_2: string
          value_2: number
          deviation_percentage: number
          consistency_status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
