export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          execution_summary: Json | null
          id: string
          role: string
          skill_used: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          execution_summary?: Json | null
          id?: string
          role: string
          skill_used?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          execution_summary?: Json | null
          id?: string
          role?: string
          skill_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_artifacts: {
        Row: {
          artifact_type: string
          content: string | null
          created_at: string
          file_path: string
          id: string
          metadata: Json | null
          session_id: string
          status: string
          version: number
        }
        Insert: {
          artifact_type: string
          content?: string | null
          created_at?: string
          file_path: string
          id?: string
          metadata?: Json | null
          session_id: string
          status?: string
          version?: number
        }
        Update: {
          artifact_type?: string
          content?: string | null
          created_at?: string
          file_path?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          status?: string
          version?: number
        }
        Relationships: []
      }
      lifecycle_sessions: {
        Row: {
          created_at: string
          current_state: string
          id: string
          metadata: Json | null
          project_name: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_state?: string
          id?: string
          metadata?: Json | null
          project_name?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_state?: string
          id?: string
          metadata?: Json | null
          project_name?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lifecycle_transitions: {
        Row: {
          created_at: string
          from_state: string
          id: string
          metadata: Json | null
          session_id: string
          to_state: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          from_state: string
          id?: string
          metadata?: Json | null
          session_id: string
          to_state: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          from_state?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          to_state?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      monitoring_nodes: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          node_label: string
          node_type: string
          output_data: Json | null
          started_at: string | null
          status: string
          step_order: number
          trace_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          node_label: string
          node_type: string
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_order: number
          trace_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          node_label?: string
          node_type?: string
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_order?: number
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_nodes_trace_id_fkey"
            columns: ["trace_id"]
            isOneToOne: false
            referencedRelation: "monitoring_traces"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_traces: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          metadata: Json | null
          session_id: string
          status: string
          total_duration_ms: number | null
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          session_id: string
          status?: string
          total_duration_ms?: number | null
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          session_id?: string
          status?: string
          total_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_traces_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_traces_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          instructions: string
          name: string
          references_docs: Json | null
          templates: Json | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          instructions: string
          name: string
          references_docs?: Json | null
          templates?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          name?: string
          references_docs?: Json | null
          templates?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
