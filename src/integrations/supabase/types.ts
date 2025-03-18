export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      call_transcripts: {
        Row: {
          call_score: number | null
          created_at: string | null
          duration: number | null
          filename: string | null
          id: string
          keywords: string[] | null
          sentiment: string | null
          text: string
          transcript_segments: Json | null
          user_id: string | null
        }
        Insert: {
          call_score?: number | null
          created_at?: string | null
          duration?: number | null
          filename?: string | null
          id?: string
          keywords?: string[] | null
          sentiment?: string | null
          text: string
          transcript_segments?: Json | null
          user_id?: string | null
        }
        Update: {
          call_score?: number | null
          created_at?: string | null
          duration?: number | null
          filename?: string | null
          id?: string
          keywords?: string[] | null
          sentiment?: string | null
          text?: string
          transcript_segments?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          created_at: string | null
          duration: number
          id: string
          key_phrases: string[] | null
          sentiment_agent: number
          sentiment_customer: number
          talk_ratio_agent: number
          talk_ratio_customer: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration: number
          id?: string
          key_phrases?: string[] | null
          sentiment_agent: number
          sentiment_customer: number
          talk_ratio_agent: number
          talk_ratio_customer: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number
          id?: string
          key_phrases?: string[] | null
          sentiment_agent?: number
          sentiment_customer?: number
          talk_ratio_agent?: number
          talk_ratio_customer?: number
          user_id?: string | null
        }
        Relationships: []
      }
      keyword_trends: {
        Row: {
          category: string
          count: number | null
          id: string
          keyword: string
          last_used: string | null
        }
        Insert: {
          category: string
          count?: number | null
          id?: string
          keyword: string
          last_used?: string | null
        }
        Update: {
          category?: string
          count?: number | null
          id?: string
          keyword?: string
          last_used?: string | null
        }
        Relationships: []
      }
      sentiment_trends: {
        Row: {
          confidence: number
          id: string
          recorded_at: string | null
          sentiment_label: string
          user_id: string | null
        }
        Insert: {
          confidence: number
          id?: string
          recorded_at?: string | null
          sentiment_label: string
          user_id?: string | null
        }
        Update: {
          confidence?: number
          id?: string
          recorded_at?: string | null
          sentiment_label?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_table_to_realtime_publication: {
        Args: {
          table_name: string
        }
        Returns: undefined
      }
      check_table_in_publication: {
        Args: {
          table_name: string
          publication_name: string
        }
        Returns: boolean
      }
      set_replica_identity_full_for_table: {
        Args: {
          table_name: string
        }
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
