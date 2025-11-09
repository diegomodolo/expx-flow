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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      acquisition_funnels: {
        Row: {
          client_id: string
          company_id: string
          created_at: string | null
          description: string | null
          flow_data: Json
          id: string
          is_active: boolean | null
          is_public: boolean | null
          name: string
          public_shared_at: string | null
          public_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string | null
          description?: string | null
          flow_data?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name: string
          public_shared_at?: string | null
          public_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string | null
          description?: string | null
          flow_data?: Json
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string
          public_shared_at?: string | null
          public_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_funnels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_funnels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
          comments: number | null
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
          likes: number | null
          link_url: string | null
          name: string
          negative_feedback: number | null
          quality_ranking: string | null
          reach: number | null
          shares: number | null
          spend: number | null
          status: string
          updated_at: string
          user_id: string
          video_completion_rate: number | null
          video_url: string | null
          video_view_percentage: number | null
          video_views: number | null
        }
        Insert: {
          ad_set_id: string
          call_to_action?: string | null
          campaign_id: string
          clicks?: number | null
          client_id: string
          comments?: number | null
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
          likes?: number | null
          link_url?: string | null
          name: string
          negative_feedback?: number | null
          quality_ranking?: string | null
          reach?: number | null
          shares?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
          user_id: string
          video_completion_rate?: number | null
          video_url?: string | null
          video_view_percentage?: number | null
          video_views?: number | null
        }
        Update: {
          ad_set_id?: string
          call_to_action?: string | null
          campaign_id?: string
          clicks?: number | null
          client_id?: string
          comments?: number | null
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
          likes?: number | null
          link_url?: string | null
          name?: string
          negative_feedback?: number | null
          quality_ranking?: string | null
          reach?: number | null
          shares?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          video_completion_rate?: number | null
          video_url?: string | null
          video_view_percentage?: number | null
          video_views?: number | null
        }
        Relationships: []
      }
      ai_chat_conversations: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_chat_conversations_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          average_ticket: number | null
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
          objective: string | null
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
          average_ticket?: number | null
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
          objective?: string | null
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
          average_ticket?: number | null
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
          objective?: string | null
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
      change_audit_log: {
        Row: {
          campaign_id: string | null
          change_source: string
          change_type: string
          changed_by: string
          changed_fields: string[] | null
          client_id: string | null
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          sync_period: string | null
        }
        Insert: {
          campaign_id?: string | null
          change_source?: string
          change_type: string
          changed_by: string
          changed_fields?: string[] | null
          client_id?: string | null
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          sync_period?: string | null
        }
        Update: {
          campaign_id?: string | null
          change_source?: string
          change_type?: string
          changed_by?: string
          changed_fields?: string[] | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          sync_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_change_audit_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      change_impact_analysis: {
        Row: {
          after_conversions: number | null
          after_cpa: number | null
          after_ctr: number | null
          after_daily_avg_conversions: number | null
          after_spend: number | null
          analysis_period_end: string
          analysis_period_start: string
          before_conversions: number | null
          before_cpa: number | null
          before_ctr: number | null
          before_daily_avg_conversions: number | null
          before_spend: number | null
          calculated_at: string
          campaign_id: string
          change_log_id: string
          client_id: string
          company_id: string
          confidence_level: number | null
          conversion_improvement_pct: number | null
          cpa_improvement_pct: number | null
          ctr_improvement_pct: number | null
          days_after_change: number
          days_before_change: number
          id: string
          impact_classification: string | null
          impact_score: number | null
          is_significant: boolean | null
          spend_efficiency_pct: number | null
        }
        Insert: {
          after_conversions?: number | null
          after_cpa?: number | null
          after_ctr?: number | null
          after_daily_avg_conversions?: number | null
          after_spend?: number | null
          analysis_period_end: string
          analysis_period_start: string
          before_conversions?: number | null
          before_cpa?: number | null
          before_ctr?: number | null
          before_daily_avg_conversions?: number | null
          before_spend?: number | null
          calculated_at?: string
          campaign_id: string
          change_log_id: string
          client_id: string
          company_id: string
          confidence_level?: number | null
          conversion_improvement_pct?: number | null
          cpa_improvement_pct?: number | null
          ctr_improvement_pct?: number | null
          days_after_change?: number
          days_before_change?: number
          id?: string
          impact_classification?: string | null
          impact_score?: number | null
          is_significant?: boolean | null
          spend_efficiency_pct?: number | null
        }
        Update: {
          after_conversions?: number | null
          after_cpa?: number | null
          after_ctr?: number | null
          after_daily_avg_conversions?: number | null
          after_spend?: number | null
          analysis_period_end?: string
          analysis_period_start?: string
          before_conversions?: number | null
          before_cpa?: number | null
          before_ctr?: number | null
          before_daily_avg_conversions?: number | null
          before_spend?: number | null
          calculated_at?: string
          campaign_id?: string
          change_log_id?: string
          client_id?: string
          company_id?: string
          confidence_level?: number | null
          conversion_improvement_pct?: number | null
          cpa_improvement_pct?: number | null
          ctr_improvement_pct?: number | null
          days_after_change?: number
          days_before_change?: number
          id?: string
          impact_classification?: string | null
          impact_score?: number | null
          is_significant?: boolean | null
          spend_efficiency_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_change_impact_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_change_impact_log"
            columns: ["change_log_id"]
            isOneToOne: false
            referencedRelation: "change_audit_log"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          company_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_rotations: {
        Row: {
          company_id: string
          created_at: string
          day_sequence: number
          end_client_position: number
          id: string
          is_active: boolean
          start_client_position: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day_sequence: number
          end_client_position: number
          id?: string
          is_active?: boolean
          start_client_position: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day_sequence?: number
          end_client_position?: number
          id?: string
          is_active?: boolean
          start_client_position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_client_rotations_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_status_rules: {
        Row: {
          company_id: string
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          rule_name: string
          rule_order: number
          status_output: string
          updated_at: string
        }
        Insert: {
          company_id: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          rule_name: string
          rule_order: number
          status_output: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          rule_name?: string
          rule_order?: number
          status_output?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_status_rules_company_id_fkey"
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
          ai_briefing: string | null
          avatar: string | null
          avg_cpl: number
          briefing_generated_at: string | null
          campaign_type: string | null
          company: string
          company_id: string | null
          created_at: string
          email: string
          id: string
          inactive_reason: string | null
          last_sync_at: string | null
          last_sync_period: string | null
          leads_generated: number | null
          monthly_budget: number | null
          name: string
          notes: string | null
          objectives: string | null
          offline_event_set_id: string | null
          preferred_platforms: string[] | null
          product_name: string | null
          sector: string
          status: Database["public"]["Enums"]["client_status"]
          target_audience: string | null
          team_id: string | null
          updated_at: string
          user_id: string
          voice_tone: string | null
          website_url: string | null
        }
        Insert: {
          active_campaigns?: number
          ad_account_id?: string | null
          ai_briefing?: string | null
          avatar?: string | null
          avg_cpl?: number
          briefing_generated_at?: string | null
          campaign_type?: string | null
          company: string
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          inactive_reason?: string | null
          last_sync_at?: string | null
          last_sync_period?: string | null
          leads_generated?: number | null
          monthly_budget?: number | null
          name: string
          notes?: string | null
          objectives?: string | null
          offline_event_set_id?: string | null
          preferred_platforms?: string[] | null
          product_name?: string | null
          sector: string
          status?: Database["public"]["Enums"]["client_status"]
          target_audience?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          voice_tone?: string | null
          website_url?: string | null
        }
        Update: {
          active_campaigns?: number
          ad_account_id?: string | null
          ai_briefing?: string | null
          avatar?: string | null
          avg_cpl?: number
          briefing_generated_at?: string | null
          campaign_type?: string | null
          company?: string
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          inactive_reason?: string | null
          last_sync_at?: string | null
          last_sync_period?: string | null
          leads_generated?: number | null
          monthly_budget?: number | null
          name?: string
          notes?: string | null
          objectives?: string | null
          offline_event_set_id?: string | null
          preferred_platforms?: string[] | null
          product_name?: string | null
          sector?: string
          status?: Database["public"]["Enums"]["client_status"]
          target_audience?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          voice_tone?: string | null
          website_url?: string | null
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
          {
            foreignKeyName: "clients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      competitor_ads: {
        Row: {
          ad_copy: string | null
          ad_description: string | null
          ad_title: string | null
          ad_type: string | null
          call_to_action: string | null
          client_id: string
          company_id: string
          competitor_id: string
          created_at: string
          date_spotted: string
          estimated_performance: string | null
          id: string
          image_url: string | null
          is_active: boolean
          landing_page_url: string | null
          notes: string | null
          platform: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          ad_copy?: string | null
          ad_description?: string | null
          ad_title?: string | null
          ad_type?: string | null
          call_to_action?: string | null
          client_id: string
          company_id: string
          competitor_id: string
          created_at?: string
          date_spotted?: string
          estimated_performance?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          landing_page_url?: string | null
          notes?: string | null
          platform?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          ad_copy?: string | null
          ad_description?: string | null
          ad_title?: string | null
          ad_type?: string | null
          call_to_action?: string | null
          client_id?: string
          company_id?: string
          competitor_id?: string
          created_at?: string
          date_spotted?: string
          estimated_performance?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          landing_page_url?: string | null
          notes?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      competitors: {
        Row: {
          ad_library_url: string | null
          client_id: string
          company_id: string
          company_name: string
          created_at: string
          description: string | null
          facebook_page_name: string | null
          id: string
          industry: string | null
          instagram_handle: string | null
          last_scrape_at: string | null
          name: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          ad_library_url?: string | null
          client_id: string
          company_id: string
          company_name: string
          created_at?: string
          description?: string | null
          facebook_page_name?: string | null
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          last_scrape_at?: string | null
          name: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          ad_library_url?: string | null
          client_id?: string
          company_id?: string
          company_name?: string
          created_at?: string
          description?: string | null
          facebook_page_name?: string | null
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          last_scrape_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      content_generations: {
        Row: {
          client_id: string
          company_id: string
          content_type: string
          created_at: string
          generated_content: string
          id: string
          status: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          content_type: string
          created_at?: string
          generated_content: string
          id?: string
          status?: string
          theme: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          content_type?: string
          created_at?: string
          generated_content?: string
          id?: string
          status?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_generations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_prompts: {
        Row: {
          company_id: string
          content_type: string
          created_at: string
          custom_prompt: string | null
          default_prompt: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          content_type: string
          created_at?: string
          custom_prompt?: string | null
          default_prompt: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          content_type?: string
          created_at?: string
          custom_prompt?: string | null
          default_prompt?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      creative_versions: {
        Row: {
          ad_id: string
          call_to_action: string | null
          campaign_id: string
          change_reason: string | null
          client_id: string
          company_id: string
          created_at: string
          creative_body: string | null
          creative_description: string | null
          creative_title: string | null
          creative_type: string | null
          id: string
          image_url: string | null
          is_current: boolean
          link_url: string | null
          performance_before_change: Json | null
          replaced_at: string | null
          replaced_by: string | null
          version_number: number
          video_url: string | null
        }
        Insert: {
          ad_id: string
          call_to_action?: string | null
          campaign_id: string
          change_reason?: string | null
          client_id: string
          company_id: string
          created_at?: string
          creative_body?: string | null
          creative_description?: string | null
          creative_title?: string | null
          creative_type?: string | null
          id?: string
          image_url?: string | null
          is_current?: boolean
          link_url?: string | null
          performance_before_change?: Json | null
          replaced_at?: string | null
          replaced_by?: string | null
          version_number?: number
          video_url?: string | null
        }
        Update: {
          ad_id?: string
          call_to_action?: string | null
          campaign_id?: string
          change_reason?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          creative_body?: string | null
          creative_description?: string | null
          creative_title?: string | null
          creative_type?: string | null
          id?: string
          image_url?: string | null
          is_current?: boolean
          link_url?: string | null
          performance_before_change?: Json | null
          replaced_at?: string | null
          replaced_by?: string | null
          version_number?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_creative_versions_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_activities: {
        Row: {
          activity_type: string
          conversion_id: string | null
          created_at: string | null
          created_by: string | null
          event_sent: boolean | null
          from_stage_id: string | null
          id: string
          lead_id: string
          notes: string | null
          to_stage_id: string | null
        }
        Insert: {
          activity_type: string
          conversion_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_sent?: boolean | null
          from_stage_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Update: {
          activity_type?: string
          conversion_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_sent?: boolean | null
          from_stage_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_activities_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "offline_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_activities_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_activities_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          company_name: string | null
          created_at: string | null
          created_by: string | null
          disqualification_reason: string | null
          email: string | null
          external_id: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          stage_id: string
          updated_at: string | null
          value: number | null
          workspace_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          disqualification_reason?: string | null
          email?: string | null
          external_id?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          stage_id: string
          updated_at?: string | null
          value?: number | null
          workspace_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          disqualification_reason?: string | null
          email?: string | null
          external_id?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          stage_id?: string
          updated_at?: string | null
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          color: string | null
          created_at: string | null
          event_mapping: string | null
          id: string
          name: string
          order_index: number
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          event_mapping?: string | null
          id?: string
          name: string
          order_index: number
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          event_mapping?: string | null
          id?: string
          name?: string
          order_index?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          password_hash: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          password_hash: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          password_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workspace_goals: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          month: number
          target_closed_deals: number | null
          target_conversion_rate: number | null
          target_leads: number | null
          target_revenue: number | null
          updated_at: string | null
          workspace_id: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          month: number
          target_closed_deals?: number | null
          target_conversion_rate?: number | null
          target_leads?: number | null
          target_revenue?: number | null
          updated_at?: string | null
          workspace_id: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: number
          target_closed_deals?: number | null
          target_conversion_rate?: number | null
          target_leads?: number | null
          target_revenue?: number | null
          updated_at?: string | null
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_workspace_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workspace_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workspaces: {
        Row: {
          access_token: string
          client_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          access_token: string
          client_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          access_token?: string
          client_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_workspaces_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workspaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          is_enabled: boolean
          menu_item: Database["public"]["Enums"]["menu_item_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          is_enabled?: boolean
          menu_item: Database["public"]["Enums"]["menu_item_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_enabled?: boolean
          menu_item?: Database["public"]["Enums"]["menu_item_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          account_status: number | null
          balance: number | null
          created_at: string
          currency: string
          disable_reason: string | null
          funding_source_details: Json | null
          has_funding_issues: boolean | null
          id: string
          integration_id: string
          is_active: boolean
          is_prepaid: boolean | null
          last_balance_check: string | null
          spend_cap: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          account_status?: number | null
          balance?: number | null
          created_at?: string
          currency: string
          disable_reason?: string | null
          funding_source_details?: Json | null
          has_funding_issues?: boolean | null
          id?: string
          integration_id: string
          is_active?: boolean
          is_prepaid?: boolean | null
          last_balance_check?: string | null
          spend_cap?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_status?: number | null
          balance?: number | null
          created_at?: string
          currency?: string
          disable_reason?: string | null
          funding_source_details?: Json | null
          has_funding_issues?: boolean | null
          id?: string
          integration_id?: string
          is_active?: boolean
          is_prepaid?: boolean | null
          last_balance_check?: string | null
          spend_cap?: number | null
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
      funnel_block_types: {
        Row: {
          category: string
          color: string | null
          created_at: string | null
          default_description: string | null
          display_name: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string | null
          default_description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string | null
          default_description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      generated_campaigns: {
        Row: {
          campaign_type: string
          client_id: string
          company_id: string
          configuration: Json
          created_at: string
          creatives: Json
          funnel_stage: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_type: string
          client_id: string
          company_id: string
          configuration?: Json
          created_at?: string
          creatives?: Json
          funnel_stage: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_type?: string
          client_id?: string
          company_id?: string
          configuration?: Json
          created_at?: string
          creatives?: Json
          funnel_stage?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ia_agent_conversations: {
        Row: {
          agent_id: string
          company_id: string
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          company_id: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ia_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_agent_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_agent_knowledge_documents: {
        Row: {
          agent_id: string
          company_id: string
          content_text: string | null
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          agent_id: string
          company_id: string
          content_text?: string | null
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          agent_id?: string
          company_id?: string
          content_text?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_agent_knowledge_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ia_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_agent_knowledge_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ia_agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_agents: {
        Row: {
          additional_instructions: string | null
          agent_name: string
          client_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          model: string | null
          prompt_base: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_instructions?: string | null
          agent_name: string
          client_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          model?: string | null
          prompt_base: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_instructions?: string | null
          agent_name?: string
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          model?: string | null
          prompt_base?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_agents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_disqualification_reports: {
        Row: {
          additional_notes: string | null
          client_id: string
          company_id: string
          conversation_link: string | null
          created_at: string
          disqualification_reason: string
          evidence_file_url: string | null
          id: string
          lead_received_date: string
          reporter_name: string
          token_id: string
          updated_at: string
          viewed_at: string | null
          viewed_by: string | null
        }
        Insert: {
          additional_notes?: string | null
          client_id: string
          company_id: string
          conversation_link?: string | null
          created_at?: string
          disqualification_reason: string
          evidence_file_url?: string | null
          id?: string
          lead_received_date: string
          reporter_name: string
          token_id: string
          updated_at?: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Update: {
          additional_notes?: string | null
          client_id?: string
          company_id?: string
          conversation_link?: string | null
          created_at?: string
          disqualification_reason?: string
          evidence_file_url?: string | null
          id?: string
          lead_received_date?: string
          reporter_name?: string
          token_id?: string
          updated_at?: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Relationships: []
      }
      lead_disqualification_tokens: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          token: string
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          token?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      offline_conversion_webhook_tokens: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_conversion_webhook_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_conversion_webhook_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_conversions: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string | null
          currency: string | null
          custom_data: Json | null
          error_message: string | null
          event_name: string
          event_time: number
          id: string
          meta_response: Json | null
          offline_event_set_id: string
          sent_at: string | null
          source: string | null
          status: string
          user_city_hash: string | null
          user_country_hash: string | null
          user_email_hash: string | null
          user_first_name_hash: string | null
          user_last_name_hash: string | null
          user_phone_hash: string | null
          user_state_hash: string | null
          user_zip_hash: string | null
          value: number | null
          webhook_payload: Json | null
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_data?: Json | null
          error_message?: string | null
          event_name?: string
          event_time: number
          id?: string
          meta_response?: Json | null
          offline_event_set_id: string
          sent_at?: string | null
          source?: string | null
          status?: string
          user_city_hash?: string | null
          user_country_hash?: string | null
          user_email_hash?: string | null
          user_first_name_hash?: string | null
          user_last_name_hash?: string | null
          user_phone_hash?: string | null
          user_state_hash?: string | null
          user_zip_hash?: string | null
          value?: number | null
          webhook_payload?: Json | null
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_data?: Json | null
          error_message?: string | null
          event_name?: string
          event_time?: number
          id?: string
          meta_response?: Json | null
          offline_event_set_id?: string
          sent_at?: string | null
          source?: string | null
          status?: string
          user_city_hash?: string | null
          user_country_hash?: string | null
          user_email_hash?: string | null
          user_first_name_hash?: string | null
          user_last_name_hash?: string | null
          user_phone_hash?: string | null
          user_state_hash?: string | null
          user_zip_hash?: string | null
          value?: number | null
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_conversions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_conversions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_history: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          description: string
          id: string
          optimization_type: string
          performed_at: string
          performed_by: string
          results: string | null
          task_id: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          description: string
          id?: string
          optimization_type: string
          performed_at?: string
          performed_by: string
          results?: string | null
          task_id?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          optimization_type?: string
          performed_at?: string
          performed_by?: string
          results?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_optimization_history_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_optimization_history_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_optimization_history_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          client_id: string | null
          company_id: string
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          entity_id: string
          entity_name: string
          entity_type: string
          frequency: number | null
          id: string
          impressions: number | null
          reach: number | null
          snapshot_date: string
          snapshot_period: string
          spend: number | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          client_id?: string | null
          company_id: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          entity_id: string
          entity_name: string
          entity_type: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          snapshot_date: string
          snapshot_period: string
          spend?: number | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          client_id?: string | null
          company_id?: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          entity_id?: string
          entity_name?: string
          entity_type?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          snapshot_date?: string
          snapshot_period?: string
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_performance_snapshots_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      period_comparison_ads: {
        Row: {
          ad_name: string
          call_to_action: string | null
          clicks: number | null
          comments: number | null
          comparison_id: string
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          creative_body: string | null
          creative_description: string | null
          creative_title: string | null
          creative_type: string | null
          ctr: number | null
          facebook_ad_id: string
          facebook_adset_id: string
          facebook_campaign_id: string
          frequency: number | null
          id: string
          image_url: string | null
          impressions: number | null
          likes: number | null
          link_url: string | null
          period_number: number
          reach: number | null
          shares: number | null
          spend: number | null
          status: string
          video_url: string | null
          video_view_percentage: number | null
          video_views: number | null
        }
        Insert: {
          ad_name: string
          call_to_action?: string | null
          clicks?: number | null
          comments?: number | null
          comparison_id: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          creative_body?: string | null
          creative_description?: string | null
          creative_title?: string | null
          creative_type?: string | null
          ctr?: number | null
          facebook_ad_id: string
          facebook_adset_id: string
          facebook_campaign_id: string
          frequency?: number | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          likes?: number | null
          link_url?: string | null
          period_number: number
          reach?: number | null
          shares?: number | null
          spend?: number | null
          status: string
          video_url?: string | null
          video_view_percentage?: number | null
          video_views?: number | null
        }
        Update: {
          ad_name?: string
          call_to_action?: string | null
          clicks?: number | null
          comments?: number | null
          comparison_id?: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          creative_body?: string | null
          creative_description?: string | null
          creative_title?: string | null
          creative_type?: string | null
          ctr?: number | null
          facebook_ad_id?: string
          facebook_adset_id?: string
          facebook_campaign_id?: string
          frequency?: number | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          likes?: number | null
          link_url?: string | null
          period_number?: number
          reach?: number | null
          shares?: number | null
          spend?: number | null
          status?: string
          video_url?: string | null
          video_view_percentage?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "period_comparison_ads_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "period_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      period_comparison_adsets: {
        Row: {
          adset_name: string
          bid_strategy: string | null
          clicks: number | null
          comparison_id: string
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          daily_budget: number | null
          facebook_adset_id: string
          facebook_campaign_id: string
          frequency: number | null
          id: string
          impressions: number | null
          lifetime_budget: number | null
          optimization_goal: string | null
          period_number: number
          reach: number | null
          spend: number | null
          status: string
          targeting: string | null
        }
        Insert: {
          adset_name: string
          bid_strategy?: string | null
          clicks?: number | null
          comparison_id: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          facebook_adset_id: string
          facebook_campaign_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          lifetime_budget?: number | null
          optimization_goal?: string | null
          period_number: number
          reach?: number | null
          spend?: number | null
          status: string
          targeting?: string | null
        }
        Update: {
          adset_name?: string
          bid_strategy?: string | null
          clicks?: number | null
          comparison_id?: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          facebook_adset_id?: string
          facebook_campaign_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          lifetime_budget?: number | null
          optimization_goal?: string | null
          period_number?: number
          reach?: number | null
          spend?: number | null
          status?: string
          targeting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_comparison_adsets_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "period_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      period_comparison_campaigns: {
        Row: {
          campaign_name: string
          clicks: number | null
          comparison_id: string
          conversion_rate_ranking: string | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          engagement_rate_ranking: string | null
          facebook_campaign_id: string
          frequency: number | null
          id: string
          impressions: number | null
          objective: string | null
          period_number: number
          quality_ranking: string | null
          reach: number | null
          spend: number | null
          status: string
        }
        Insert: {
          campaign_name: string
          clicks?: number | null
          comparison_id: string
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          engagement_rate_ranking?: string | null
          facebook_campaign_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          objective?: string | null
          period_number: number
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
          status: string
        }
        Update: {
          campaign_name?: string
          clicks?: number | null
          comparison_id?: string
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          engagement_rate_ranking?: string | null
          facebook_campaign_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          objective?: string | null
          period_number?: number
          quality_ranking?: string | null
          reach?: number | null
          spend?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_comparison_campaigns_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "period_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      period_comparisons: {
        Row: {
          client_id: string
          company_id: string
          comparison_name: string
          created_at: string
          error_message: string | null
          id: string
          period_1_end: string
          period_1_label: string
          period_1_start: string
          period_2_end: string
          period_2_label: string
          period_2_start: string
          status: string
          sync_progress: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          comparison_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          period_1_end: string
          period_1_label: string
          period_1_start: string
          period_2_end: string
          period_2_label: string
          period_2_start: string
          status?: string
          sync_progress?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          comparison_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          period_1_end?: string
          period_1_label?: string
          period_1_start?: string
          period_2_end?: string
          period_2_label?: string
          period_2_start?: string
          status?: string
          sync_progress?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_time_slots: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          display_order: number
          end_time: string
          id: string
          is_active: boolean
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_planner_time_slots_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          ai_estimated_minutes: number | null
          ai_organization_date: string | null
          alert_id: string | null
          checklist: Json | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          deadline: string
          description: string | null
          due_date: string | null
          id: string
          organized_by_ai: boolean | null
          origin: Database["public"]["Enums"]["task_origin"] | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          related_campaign_id: string | null
          related_client_id: string | null
          responsible_avatar: string | null
          responsible_name: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          team_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_estimated_minutes?: number | null
          ai_organization_date?: string | null
          alert_id?: string | null
          checklist?: Json | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline: string
          description?: string | null
          due_date?: string | null
          id?: string
          organized_by_ai?: boolean | null
          origin?: Database["public"]["Enums"]["task_origin"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          related_campaign_id?: string | null
          related_client_id?: string | null
          responsible_avatar?: string | null
          responsible_name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          team_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_estimated_minutes?: number | null
          ai_organization_date?: string | null
          alert_id?: string | null
          checklist?: Json | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organized_by_ai?: boolean | null
          origin?: Database["public"]["Enums"]["task_origin"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          related_campaign_id?: string | null
          related_client_id?: string | null
          responsible_avatar?: string | null
          responsible_name?: string
          start_date?: string | null
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
      visual_creatives: {
        Row: {
          caption: string | null
          client_id: string
          client_name: string | null
          company_id: string
          copy_text: string | null
          created_at: string
          creative_type: string
          description: string | null
          id: string
          image_url: string | null
          objective: string | null
          status: string
          target_audience: string | null
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          client_name?: string | null
          company_id: string
          copy_text?: string | null
          created_at?: string
          creative_type: string
          description?: string | null
          id?: string
          image_url?: string | null
          objective?: string | null
          status?: string
          target_audience?: string | null
          theme: string
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          client_name?: string | null
          company_id?: string
          copy_text?: string | null
          created_at?: string
          creative_type?: string
          description?: string | null
          id?: string
          image_url?: string | null
          objective?: string | null
          status?: string
          target_audience?: string | null
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      task_stats: {
        Row: {
          avg_completion_days: number | null
          company_id: string | null
          completed_tasks: number | null
          in_progress_tasks: number | null
          overdue_tasks: number | null
          pending_tasks: number | null
          review_tasks: number | null
          total_tasks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_change_impact: {
        Args: {
          _change_log_id: string
          _days_after?: number
          _days_before?: number
        }
        Returns: undefined
      }
      create_default_client_status_rules: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      create_performance_snapshot: {
        Args: { _entity_id: string; _entity_type: string; _period?: string }
        Returns: undefined
      }
      create_task_from_alert: {
        Args: {
          _alert_description: string
          _alert_id?: string
          _alert_type: string
          _company_id: string
          _related_campaign_id?: string
          _related_client_id?: string
        }
        Returns: string
      }
      generate_crm_access_token: { Args: never; Returns: string }
      generate_funnel_public_token: { Args: never; Returns: string }
      get_user_company_ids: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
        }[]
      }
      is_company_admin_or_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      campaign_status: "active" | "paused" | "finished"
      client_status: "green" | "yellow" | "red" | "orange"
      menu_item_type:
        | "dashboard"
        | "clientes"
        | "campanhas"
        | "squad"
        | "tarefas"
        | "colaboradores"
        | "relatorios"
        | "gerador-campanhas"
        | "configuracoes"
        | "gerador-conteudo"
        | "ia"
        | "gerador-criativos"
        | "agentes-ia"
        | "editar-agentes"
        | "editor-funil"
      task_origin: "dashboard" | "manual" | "automation"
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
      client_status: ["green", "yellow", "red", "orange"],
      menu_item_type: [
        "dashboard",
        "clientes",
        "campanhas",
        "squad",
        "tarefas",
        "colaboradores",
        "relatorios",
        "gerador-campanhas",
        "configuracoes",
        "gerador-conteudo",
        "ia",
        "gerador-criativos",
        "agentes-ia",
        "editar-agentes",
        "editor-funil",
      ],
      task_origin: ["dashboard", "manual", "automation"],
      task_priority: ["high", "medium", "low"],
      task_status: ["todo", "progress", "review", "done"],
    },
  },
} as const
