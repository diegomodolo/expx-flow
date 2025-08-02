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
      ad_sets: {
        Row: {
          bid_strategy: string | null
          campaign_id: string
          clicks: number | null
          client_id: string
          company_id: string | null
          conversion_rate_ranking: string | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          daily_budget: number | null
          engagement_rate_ranking: string | null
          facebook_id: string
          frequency: number | null
          id: string
          impressions: number | null
          is_active: boolean
          lifetime_budget: number | null
          name: string
          optimization_goal: string | null
          quality_ranking: string | null
          reach: number | null
          spend: number | null
          status: string
          targeting: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bid_strategy?: string | null
          campaign_id: string
          clicks?: number | null
          client_id: string
          company_id?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          engagement_rate_ranking?: string | null
          facebook_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          lifetime_budget?: number | null
          name: string
          optimization_goal?: string | null
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
          status?: string
          targeting?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bid_strategy?: string | null
          campaign_id?: string
          clicks?: number | null
          client_id?: string
          company_id?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          engagement_rate_ranking?: string | null
          facebook_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          lifetime_budget?: number | null
          name?: string
          optimization_goal?: string | null
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
          status?: string
          targeting?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          ad_set_id: string
          call_to_action: string | null
          campaign_id: string
          clicks: number | null
          client_id: string
          company_id: string | null
          conversion_rate_ranking: string | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          creative_body: string | null
          creative_description: string | null
          creative_title: string | null
          creative_type: string | null
          ctr: number | null
          engagement_rate_ranking: string | null
          facebook_id: string
          frequency: number | null
          id: string
          image_url: string | null
          impressions: number | null
          is_active: boolean
          link_url: string | null
          name: string
          quality_ranking: string | null
          reach: number | null
          spend: number | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          ad_set_id: string
          call_to_action?: string | null
          campaign_id: string
          clicks?: number | null
          client_id: string
          company_id?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          creative_body?: string | null
          creative_description?: string | null
          creative_title?: string | null
          creative_type?: string | null
          ctr?: number | null
          engagement_rate_ranking?: string | null
          facebook_id: string
          frequency?: number | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean
          link_url?: string | null
          name: string
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          ad_set_id?: string
          call_to_action?: string | null
          campaign_id?: string
          clicks?: number | null
          client_id?: string
          company_id?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          creative_body?: string | null
          creative_description?: string | null
          creative_title?: string | null
          creative_type?: string | null
          ctr?: number | null
          engagement_rate_ranking?: string | null
          facebook_id?: string
          frequency?: number | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean
          link_url?: string | null
          name?: string
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          clicks: number | null
          client_id: string
          company_id: string | null
          conversion_rate_ranking: string | null
          conversions: number
          cpa: number | null
          cpc: number
          created_at: string
          ctr: number
          engagement_rate_ranking: string | null
          frequency: number | null
          id: string
          impressions: number | null
          is_active: boolean
          name: string
          period: string
          platforms: string
          quality_ranking: string | null
          reach: number | null
          spend: number | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          client_id: string
          company_id?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number
          cpa?: number | null
          cpc?: number
          created_at?: string
          ctr?: number
          engagement_rate_ranking?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          name: string
          period: string
          platforms: string
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          client_id?: string
          company_id?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number
          cpa?: number | null
          cpc?: number
          created_at?: string
          ctr?: number
          engagement_rate_ranking?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          name?: string
          period?: string
          platforms?: string
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
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
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active_campaigns: number
          ad_account_id: string | null
          avatar: string | null
          avg_cpl: number
          campaign_type: string | null
          company: string
          company_id: string | null
          created_at: string
          email: string
          id: string
          leads_generated: number | null
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
          ad_account_id?: string | null
          avatar?: string | null
          avg_cpl?: number
          campaign_type?: string | null
          company: string
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          leads_generated?: number | null
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
          ad_account_id?: string | null
          avatar?: string | null
          avg_cpl?: number
          campaign_type?: string | null
          company?: string
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          leads_generated?: number | null
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
        Relationships: [
          {
            foreignKeyName: "clients_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "facebook_ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          logo: string | null
          name: string
          phone: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          logo?: string | null
          name: string
          phone?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          logo?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar: string | null
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          skills: string | null
          start_date: string
          status: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          company_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          role: string
          skills?: string | null
          start_date: string
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          skills?: string | null
          start_date?: string
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_ad_accounts: {
        Row: {
          account_id: string
          account_name: string
          created_at: string
          currency: string
          id: string
          integration_id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          created_at?: string
          currency: string
          id?: string
          integration_id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string
          currency?: string
          id?: string
          integration_id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_ad_accounts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "facebook_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_integrations: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
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
      sectors: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_ids: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
        }[]
      }
      is_company_admin_or_owner: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
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
