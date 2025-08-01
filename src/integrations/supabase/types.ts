export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          client_id: string
          conversions: number
          cpc: number
          created_at: string
          ctr: number
          id: string
          is_active: boolean
          name: string
          period: string
          platforms: string
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          conversions?: number
          cpc?: number
          created_at?: string
          ctr?: number
          id?: string
          is_active?: boolean
          name: string
          period: string
          platforms: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          conversions?: number
          cpc?: number
          created_at?: string
          ctr?: number
          id?: string
          is_active?: boolean
          name?: string
          period?: string
          platforms?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active_campaigns: number
          avatar: string | null
          avg_cpl: number
          campaign_type: string | null
          company: string
          created_at: string
          email: string
          id: string
          last_access: string | null
          monthly_budget: number | null
          name: string
          notes: string | null
          objectives: string | null
          preferred_platforms: string[] | null
          product_name: string | null
          sector: string
          status: Database["public"]["Enums"]["client_status"]
          target_audience: string | null
          updated_at: string
          user_id: string
          voice_tone: string | null
        }
        Insert: {
          active_campaigns?: number
          avatar?: string | null
          avg_cpl?: number
          campaign_type?: string | null
          company: string
          created_at?: string
          email: string
          id?: string
          last_access?: string | null
          monthly_budget?: number | null
          name: string
          notes?: string | null
          objectives?: string | null
          preferred_platforms?: string[] | null
          product_name?: string | null
          sector: string
          status?: Database["public"]["Enums"]["client_status"]
          target_audience?: string | null
          updated_at?: string
          user_id: string
          voice_tone?: string | null
        }
        Update: {
          active_campaigns?: number
          avatar?: string | null
          avg_cpl?: number
          campaign_type?: string | null
          company?: string
          created_at?: string
          email?: string
          id?: string
          last_access?: string | null
          monthly_budget?: number | null
          name?: string
          notes?: string | null
          objectives?: string | null
          preferred_platforms?: string[] | null
          product_name?: string | null
          sector?: string
          status?: Database["public"]["Enums"]["client_status"]
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          voice_tone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          deadline: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          responsible_avatar: string | null
          responsible_name: string
          status: Database["public"]["Enums"]["task_status"]
          team_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          responsible_avatar?: string | null
          responsible_name: string
          status?: Database["public"]["Enums"]["task_status"]
          team_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          responsible_avatar?: string | null
          responsible_name?: string
          status?: Database["public"]["Enums"]["task_status"]
          team_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar: string | null
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active_tasks: number
          color: string
          created_at: string
          description: string
          icon: string
          icon_bg: string
          icon_color: string
          id: string
          name: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_tasks?: number
          color: string
          created_at?: string
          description: string
          icon: string
          icon_bg: string
          icon_color: string
          id?: string
          name: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_tasks?: number
          color?: string
          created_at?: string
          description?: string
          icon?: string
          icon_bg?: string
          icon_color?: string
          id?: string
          name?: string
          progress?: number
          updated_at?: string
          user_id?: string
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
      campaign_status: "active" | "paused" | "finished"
      client_status: "green" | "yellow" | "red"
      task_priority: "high" | "medium" | "low"
      task_status: "todo" | "progress" | "review" | "done"
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
    Enums: {
      campaign_status: ["active", "paused", "finished"],
      client_status: ["green", "yellow", "red"],
      task_priority: ["high", "medium", "low"],
      task_status: ["todo", "progress", "review", "done"],
    },
  },
} as const
