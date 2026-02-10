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
      activity_feed: {
        Row: {
          activity_type: string
          company_id: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          company_id: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_generation_history: {
        Row: {
          ads_generated: number
          ads_requested: number
          client_id: string
          company_id: string
          created_at: string
          error_message: string | null
          executed_at: string
          execution_details: Json | null
          execution_type: string
          id: string
          schedule_id: string | null
          status: string
        }
        Insert: {
          ads_generated?: number
          ads_requested?: number
          client_id: string
          company_id: string
          created_at?: string
          error_message?: string | null
          executed_at?: string
          execution_details?: Json | null
          execution_type?: string
          id?: string
          schedule_id?: string | null
          status?: string
        }
        Update: {
          ads_generated?: number
          ads_requested?: number
          client_id?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          executed_at?: string
          execution_details?: Json | null
          execution_type?: string
          id?: string
          schedule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_generation_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_history_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "ad_generation_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_generation_queue: {
        Row: {
          client_id: string
          company_id: string
          concept_description: string | null
          created_at: string
          generated_at: string
          generated_content: Json
          generation_type: Database["public"]["Enums"]["ad_generation_type"]
          id: string
          meta_ad_id: string | null
          published_at: string | null
          quality_score: number | null
          research_sources: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_for: string | null
          source_ad_id: string | null
          source_competitor_id: string | null
          status: Database["public"]["Enums"]["ad_generation_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          concept_description?: string | null
          created_at?: string
          generated_at?: string
          generated_content: Json
          generation_type: Database["public"]["Enums"]["ad_generation_type"]
          id?: string
          meta_ad_id?: string | null
          published_at?: string | null
          quality_score?: number | null
          research_sources?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_for?: string | null
          source_ad_id?: string | null
          source_competitor_id?: string | null
          status?: Database["public"]["Enums"]["ad_generation_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          concept_description?: string | null
          created_at?: string
          generated_at?: string
          generated_content?: Json
          generation_type?: Database["public"]["Enums"]["ad_generation_type"]
          id?: string
          meta_ad_id?: string | null
          published_at?: string | null
          quality_score?: number | null
          research_sources?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_for?: string | null
          source_ad_id?: string | null
          source_competitor_id?: string | null
          status?: Database["public"]["Enums"]["ad_generation_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_generation_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_queue_source_competitor_id_fkey"
            columns: ["source_competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_generation_schedule_destinations: {
        Row: {
          adset_id: string
          campaign_id: string
          created_at: string
          id: string
          schedule_id: string
        }
        Insert: {
          adset_id: string
          campaign_id: string
          created_at?: string
          id?: string
          schedule_id: string
        }
        Update: {
          adset_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_generation_schedule_destinations_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_schedule_destinations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_schedule_destinations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "ad_generation_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_generation_schedules: {
        Row: {
          ads_per_day: number
          always_include_text_in_images: boolean
          autopilot_enabled: boolean
          autopilot_max_daily_budget: number | null
          autopilot_min_quality_score: number | null
          client_id: string
          clone_percentage: number
          company_id: string
          concept_percentage: number
          created_at: string
          custom_image_prompt: string | null
          default_cta: string | null
          default_description: string | null
          default_destination_url: string | null
          default_headline: string | null
          default_pixel_id: string | null
          default_primary_text: string | null
          default_url_params: string | null
          generation_time: string
          id: string
          is_active: boolean
          iteration_percentage: number
          last_generation_at: string | null
          next_generation_at: string | null
          reference_image_1: string | null
          reference_image_2: string | null
          reference_image_3: string | null
          reference_image_4: string | null
          reference_image_5: string | null
          reference_image_6: string | null
          target_adset_id: string | null
          target_campaign_id: string | null
          updated_at: string
        }
        Insert: {
          ads_per_day?: number
          always_include_text_in_images?: boolean
          autopilot_enabled?: boolean
          autopilot_max_daily_budget?: number | null
          autopilot_min_quality_score?: number | null
          client_id: string
          clone_percentage?: number
          company_id: string
          concept_percentage?: number
          created_at?: string
          custom_image_prompt?: string | null
          default_cta?: string | null
          default_description?: string | null
          default_destination_url?: string | null
          default_headline?: string | null
          default_pixel_id?: string | null
          default_primary_text?: string | null
          default_url_params?: string | null
          generation_time?: string
          id?: string
          is_active?: boolean
          iteration_percentage?: number
          last_generation_at?: string | null
          next_generation_at?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          reference_image_4?: string | null
          reference_image_5?: string | null
          reference_image_6?: string | null
          target_adset_id?: string | null
          target_campaign_id?: string | null
          updated_at?: string
        }
        Update: {
          ads_per_day?: number
          always_include_text_in_images?: boolean
          autopilot_enabled?: boolean
          autopilot_max_daily_budget?: number | null
          autopilot_min_quality_score?: number | null
          client_id?: string
          clone_percentage?: number
          company_id?: string
          concept_percentage?: number
          created_at?: string
          custom_image_prompt?: string | null
          default_cta?: string | null
          default_description?: string | null
          default_destination_url?: string | null
          default_headline?: string | null
          default_pixel_id?: string | null
          default_primary_text?: string | null
          default_url_params?: string | null
          generation_time?: string
          id?: string
          is_active?: boolean
          iteration_percentage?: number
          last_generation_at?: string | null
          next_generation_at?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          reference_image_4?: string | null
          reference_image_5?: string | null
          reference_image_6?: string | null
          target_adset_id?: string | null
          target_campaign_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_generation_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_schedules_target_adset_id_fkey"
            columns: ["target_adset_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_generation_schedules_target_campaign_id_fkey"
            columns: ["target_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_performance_winners: {
        Row: {
          ad_id: string | null
          ad_name: string
          clicks: number | null
          client_id: string
          company_id: string
          conversions: number | null
          cpa: number | null
          created_at: string
          ctr: number | null
          days_running: number
          facebook_ad_id: string | null
          id: string
          impressions: number | null
          is_winner: boolean
          last_analyzed_at: string | null
          roas: number | null
          spend: number | null
          updated_at: string
          winner_reason: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name: string
          clicks?: number | null
          client_id: string
          company_id: string
          conversions?: number | null
          cpa?: number | null
          created_at?: string
          ctr?: number | null
          days_running?: number
          facebook_ad_id?: string | null
          id?: string
          impressions?: number | null
          is_winner?: boolean
          last_analyzed_at?: string | null
          roas?: number | null
          spend?: number | null
          updated_at?: string
          winner_reason?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string
          clicks?: number | null
          client_id?: string
          company_id?: string
          conversions?: number | null
          cpa?: number | null
          created_at?: string
          ctr?: number | null
          days_running?: number
          facebook_ad_id?: string | null
          id?: string
          impressions?: number | null
          is_winner?: boolean
          last_analyzed_at?: string | null
          roas?: number | null
          spend?: number | null
          updated_at?: string
          winner_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_performance_winners_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_performance_winners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_performance_winners_company_id_fkey"
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
          conversion_event: string | null
          conversion_rate_ranking: string | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          daily_budget: number | null
          deleted_at: string | null
          engagement_rate_ranking: string | null
          facebook_id: string
          frequency: number | null
          id: string
          impressions: number | null
          is_active: boolean
          last_synced_at: string | null
          lifetime_budget: number | null
          name: string
          optimization_goal: string | null
          pixel_id: string | null
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
          conversion_event?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          deleted_at?: string | null
          engagement_rate_ranking?: string | null
          facebook_id: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          lifetime_budget?: number | null
          name: string
          optimization_goal?: string | null
          pixel_id?: string | null
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
          conversion_event?: string | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          deleted_at?: string | null
          engagement_rate_ranking?: string | null
          facebook_id?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          lifetime_budget?: number | null
          name?: string
          optimization_goal?: string | null
          pixel_id?: string | null
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
          deleted_at: string | null
          engagement_rate_ranking: string | null
          facebook_id: string
          frequency: number | null
          id: string
          image_url: string | null
          impressions: number | null
          is_active: boolean
          last_synced_at: string | null
          likes: number | null
          link_url: string | null
          name: string
          negative_feedback: number | null
          pixel_id: string | null
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
          deleted_at?: string | null
          engagement_rate_ranking?: string | null
          facebook_id: string
          frequency?: number | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          likes?: number | null
          link_url?: string | null
          name: string
          negative_feedback?: number | null
          pixel_id?: string | null
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
          deleted_at?: string | null
          engagement_rate_ranking?: string | null
          facebook_id?: string
          frequency?: number | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          likes?: number | null
          link_url?: string | null
          name?: string
          negative_feedback?: number | null
          pixel_id?: string | null
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
      automation_execution_logs: {
        Row: {
          actions_taken: number | null
          client_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          execution_details: Json | null
          execution_id: string
          id: string
          started_at: string
          status: string
          total_rules_evaluated: number | null
        }
        Insert: {
          actions_taken?: number | null
          client_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_details?: Json | null
          execution_id: string
          id?: string
          started_at?: string
          status: string
          total_rules_evaluated?: number | null
        }
        Update: {
          actions_taken?: number | null
          client_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_details?: Json | null
          execution_id?: string
          id?: string
          started_at?: string
          status?: string
          total_rules_evaluated?: number | null
        }
        Relationships: []
      }
      automation_execution_progress: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_name: string
          entity_type: string
          execution_id: string
          facebook_id: string | null
          id: string
          message: string | null
          metadata: Json | null
          rule_name: string | null
          status: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_name: string
          entity_type: string
          execution_id: string
          facebook_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          rule_name?: string | null
          status: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          execution_id?: string
          facebook_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          rule_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_execution_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rule_templates: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rule_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_schedules: {
        Row: {
          client_id: string
          company_id: string
          created_at: string | null
          executions_per_day: number
          id: string
          is_enabled: boolean | null
          last_execution_at: string | null
          next_execution_at: string | null
          scheduled_times: string[]
          updated_at: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string | null
          executions_per_day?: number
          id?: string
          is_enabled?: boolean | null
          last_execution_at?: string | null
          next_execution_at?: string | null
          scheduled_times?: string[]
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string | null
          executions_per_day?: number
          id?: string
          is_enabled?: boolean | null
          last_execution_at?: string | null
          next_execution_at?: string | null
          scheduled_times?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      automation_settings: {
        Row: {
          campaign_name_prefix: string
          company_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          campaign_name_prefix?: string
          company_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          campaign_name_prefix?: string
          company_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_template_rules: {
        Row: {
          created_at: string | null
          id: string
          order_index: number
          rule_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number
          rule_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number
          rule_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_template_rules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_template_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "automation_rule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ab_tests: {
        Row: {
          client_id: string
          company_id: string
          control_campaign_id: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          performance_summary: Json | null
          rule_id: string | null
          scheduled_end_at: string | null
          started_at: string | null
          status: string
          test_name: string
          test_type: string
          variant_campaign_id: string | null
          variation_config: Json
          winner: string | null
          winner_determined_at: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          control_campaign_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          performance_summary?: Json | null
          rule_id?: string | null
          scheduled_end_at?: string | null
          started_at?: string | null
          status?: string
          test_name: string
          test_type: string
          variant_campaign_id?: string | null
          variation_config: Json
          winner?: string | null
          winner_determined_at?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          control_campaign_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          performance_summary?: Json | null
          rule_id?: string | null
          scheduled_end_at?: string | null
          started_at?: string | null
          status?: string
          test_name?: string
          test_type?: string
          variant_campaign_id?: string | null
          variation_config?: Json
          winner?: string | null
          winner_determined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ab_tests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ab_tests_control_campaign_id_fkey"
            columns: ["control_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ab_tests_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ab_tests_variant_campaign_id_fkey"
            columns: ["variant_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_automation_logs: {
        Row: {
          action_result: string
          action_type: string
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          client_id: string | null
          company_id: string
          entity_type: string
          error_message: string | null
          executed_at: string | null
          id: string
          metadata: Json | null
          new_budget: number | null
          new_name: string | null
          new_status: string | null
          old_budget: number | null
          old_name: string | null
          old_status: string | null
          recovery_executed: boolean | null
          recovery_executed_at: string | null
          recovery_log_id: string | null
          recovery_scheduled_for: string | null
          recovery_trigger_days: number | null
          recovery_trigger_enabled: boolean | null
          rolled_back: boolean | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          rule_id: string
        }
        Insert: {
          action_result: string
          action_type: string
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          company_id: string
          entity_type?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          new_budget?: number | null
          new_name?: string | null
          new_status?: string | null
          old_budget?: number | null
          old_name?: string | null
          old_status?: string | null
          recovery_executed?: boolean | null
          recovery_executed_at?: string | null
          recovery_log_id?: string | null
          recovery_scheduled_for?: string | null
          recovery_trigger_days?: number | null
          recovery_trigger_enabled?: boolean | null
          rolled_back?: boolean | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          rule_id: string
        }
        Update: {
          action_result?: string
          action_type?: string
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          company_id?: string
          entity_type?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          metadata?: Json | null
          new_budget?: number | null
          new_name?: string | null
          new_status?: string | null
          old_budget?: number | null
          old_name?: string | null
          old_status?: string | null
          recovery_executed?: boolean | null
          recovery_executed_at?: string | null
          recovery_log_id?: string | null
          recovery_scheduled_for?: string | null
          recovery_trigger_days?: number | null
          recovery_trigger_enabled?: boolean | null
          rolled_back?: boolean | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_automation_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_logs_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_logs_recovery_log_id_fkey"
            columns: ["recovery_log_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_automation_recommendations: {
        Row: {
          action_config: Json | null
          campaign_data: Json | null
          campaign_id: string | null
          client_id: string | null
          company_id: string
          conditions_met: Json | null
          created_at: string | null
          executed_at: string | null
          execution_log_id: string | null
          expires_at: string | null
          id: string
          reason: string
          recommended_action: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: string
          status: string
        }
        Insert: {
          action_config?: Json | null
          campaign_data?: Json | null
          campaign_id?: string | null
          client_id?: string | null
          company_id: string
          conditions_met?: Json | null
          created_at?: string | null
          executed_at?: string | null
          execution_log_id?: string | null
          expires_at?: string | null
          id?: string
          reason: string
          recommended_action: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id: string
          status?: string
        }
        Update: {
          action_config?: Json | null
          campaign_data?: Json | null
          campaign_id?: string | null
          client_id?: string | null
          company_id?: string
          conditions_met?: Json | null
          created_at?: string | null
          executed_at?: string | null
          execution_log_id?: string | null
          expires_at?: string | null
          id?: string
          reason?: string
          recommended_action?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_automation_recommendations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_recommendations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_recommendations_execution_log_id_fkey"
            columns: ["execution_log_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_recommendations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_automation_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          budget_safety_limits: Json | null
          campaign_objectives: string[] | null
          client_id: string | null
          company_id: string
          conditions: Json
          created_at: string | null
          created_by: string | null
          entity_type: string
          execution_count: number | null
          execution_limits: Json | null
          id: string
          imported_at: string | null
          is_active: boolean | null
          is_template: boolean | null
          last_execution_at: string | null
          rule_description: string | null
          rule_name: string
          rule_order: number
          scope_filters: Json | null
          template_id: string | null
          time_window_days: number | null
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          budget_safety_limits?: Json | null
          campaign_objectives?: string[] | null
          client_id?: string | null
          company_id: string
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          execution_count?: number | null
          execution_limits?: Json | null
          id?: string
          imported_at?: string | null
          is_active?: boolean | null
          is_template?: boolean | null
          last_execution_at?: string | null
          rule_description?: string | null
          rule_name: string
          rule_order?: number
          scope_filters?: Json | null
          template_id?: string | null
          time_window_days?: number | null
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          budget_safety_limits?: Json | null
          campaign_objectives?: string[] | null
          client_id?: string | null
          company_id?: string
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          execution_count?: number | null
          execution_limits?: Json | null
          id?: string
          imported_at?: string | null
          is_active?: boolean | null
          is_template?: boolean | null
          last_execution_at?: string | null
          rule_description?: string | null
          rule_name?: string
          rule_order?: number
          scope_filters?: Json | null
          template_id?: string | null
          time_window_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_automation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaign_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_presentations: {
        Row: {
          action_plan: string | null
          campaign_analyses: Json | null
          client_id: string
          company_id: string
          created_at: string | null
          executive_summary: string | null
          id: string
          metrics_snapshot: Json | null
          name: string
          period_end: string
          period_start: string
          primary_color: string | null
          public_token: string | null
          secondary_color: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          action_plan?: string | null
          campaign_analyses?: Json | null
          client_id: string
          company_id: string
          created_at?: string | null
          executive_summary?: string | null
          id?: string
          metrics_snapshot?: Json | null
          name: string
          period_end: string
          period_start: string
          primary_color?: string | null
          public_token?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          action_plan?: string | null
          campaign_analyses?: Json | null
          client_id?: string
          company_id?: string
          created_at?: string | null
          executive_summary?: string | null
          id?: string
          metrics_snapshot?: Json | null
          name?: string
          period_end?: string
          period_start?: string
          primary_color?: string | null
          public_token?: string | null
          secondary_color?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_presentations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_presentations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          daily_budget: number | null
          deleted_at: string | null
          engagement_rate_ranking: string | null
          facebook_id: string | null
          frequency: number | null
          id: string
          impressions: number | null
          is_active: boolean
          last_synced_at: string | null
          lifetime_budget: number | null
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
          daily_budget?: number | null
          deleted_at?: string | null
          engagement_rate_ranking?: string | null
          facebook_id?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          lifetime_budget?: number | null
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
          daily_budget?: number | null
          deleted_at?: string | null
          engagement_rate_ranking?: string | null
          facebook_id?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          last_synced_at?: string | null
          lifetime_budget?: number | null
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
      carousel_generation_queue: {
        Row: {
          caption: string | null
          carousel_type: string
          client_id: string
          company_id: string
          cover_image_url: string | null
          created_at: string
          cta_text: string | null
          generated_at: string
          generated_content: Json | null
          hashtags: string | null
          id: string
          published_at: string | null
          quality_score: number | null
          research_theme_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schedule_id: string | null
          slides: Json
          status: string
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          carousel_type: string
          client_id: string
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          generated_at?: string
          generated_content?: Json | null
          hashtags?: string | null
          id?: string
          published_at?: string | null
          quality_score?: number | null
          research_theme_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id?: string | null
          slides?: Json
          status?: string
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          carousel_type?: string
          client_id?: string
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          generated_at?: string
          generated_content?: Json | null
          hashtags?: string | null
          id?: string
          published_at?: string | null
          quality_score?: number | null
          research_theme_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id?: string | null
          slides?: Json
          status?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carousel_generation_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_generation_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_generation_queue_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "carousel_generation_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_generation_schedules: {
        Row: {
          behind_scenes_percentage: number
          carousels_per_day: number
          client_id: string
          company_id: string
          comparison_percentage: number
          created_at: string
          curated_list_percentage: number
          custom_image_prompt: string | null
          generation_time: string
          id: string
          include_proof_social: boolean
          include_save_bait: boolean
          is_active: boolean
          last_generation_at: string | null
          next_generation_at: string | null
          reference_image_1: string | null
          reference_image_10: string | null
          reference_image_2: string | null
          reference_image_3: string | null
          reference_image_4: string | null
          reference_image_5: string | null
          reference_image_6: string | null
          reference_image_7: string | null
          reference_image_8: string | null
          reference_image_9: string | null
          show_ui_screenshots: boolean
          slides_per_carousel: number
          tutorial_percentage: number
          updated_at: string
          use_dark_mode: boolean
        }
        Insert: {
          behind_scenes_percentage?: number
          carousels_per_day?: number
          client_id: string
          company_id: string
          comparison_percentage?: number
          created_at?: string
          curated_list_percentage?: number
          custom_image_prompt?: string | null
          generation_time?: string
          id?: string
          include_proof_social?: boolean
          include_save_bait?: boolean
          is_active?: boolean
          last_generation_at?: string | null
          next_generation_at?: string | null
          reference_image_1?: string | null
          reference_image_10?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          reference_image_4?: string | null
          reference_image_5?: string | null
          reference_image_6?: string | null
          reference_image_7?: string | null
          reference_image_8?: string | null
          reference_image_9?: string | null
          show_ui_screenshots?: boolean
          slides_per_carousel?: number
          tutorial_percentage?: number
          updated_at?: string
          use_dark_mode?: boolean
        }
        Update: {
          behind_scenes_percentage?: number
          carousels_per_day?: number
          client_id?: string
          company_id?: string
          comparison_percentage?: number
          created_at?: string
          curated_list_percentage?: number
          custom_image_prompt?: string | null
          generation_time?: string
          id?: string
          include_proof_social?: boolean
          include_save_bait?: boolean
          is_active?: boolean
          last_generation_at?: string | null
          next_generation_at?: string | null
          reference_image_1?: string | null
          reference_image_10?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          reference_image_4?: string | null
          reference_image_5?: string | null
          reference_image_6?: string | null
          reference_image_7?: string | null
          reference_image_8?: string | null
          reference_image_9?: string | null
          show_ui_screenshots?: boolean
          slides_per_carousel?: number
          tutorial_percentage?: number
          updated_at?: string
          use_dark_mode?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "carousel_generation_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_generation_schedules_company_id_fkey"
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
      client_health_config: {
        Row: {
          churn_risk_level: string | null
          client_id: string
          company_id: string
          created_at: string
          cs_manager_id: string | null
          health_score_financial: number | null
          health_score_operational: number | null
          health_score_relational: number | null
          health_score_total: number | null
          id: string
          last_cs_contact_at: string | null
          nps_collected_at: string | null
          nps_score: number | null
          onboarding_status: string | null
          target_cpl: number | null
          target_roas: number | null
          updated_at: string
        }
        Insert: {
          churn_risk_level?: string | null
          client_id: string
          company_id: string
          created_at?: string
          cs_manager_id?: string | null
          health_score_financial?: number | null
          health_score_operational?: number | null
          health_score_relational?: number | null
          health_score_total?: number | null
          id?: string
          last_cs_contact_at?: string | null
          nps_collected_at?: string | null
          nps_score?: number | null
          onboarding_status?: string | null
          target_cpl?: number | null
          target_roas?: number | null
          updated_at?: string
        }
        Update: {
          churn_risk_level?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          cs_manager_id?: string | null
          health_score_financial?: number | null
          health_score_operational?: number | null
          health_score_relational?: number | null
          health_score_total?: number | null
          id?: string
          last_cs_contact_at?: string | null
          nps_collected_at?: string | null
          nps_score?: number | null
          onboarding_status?: string | null
          target_cpl?: number | null
          target_roas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_health_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metric_benchmarks: {
        Row: {
          client_id: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string
          target_conversion_rate: number | null
          target_cpa: number | null
          target_cpc: number | null
          target_cpl: number | null
          target_cpm: number | null
          target_ctr: number | null
          target_frequency: number | null
          target_roas: number | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          target_conversion_rate?: number | null
          target_cpa?: number | null
          target_cpc?: number | null
          target_cpl?: number | null
          target_cpm?: number | null
          target_ctr?: number | null
          target_frequency?: number | null
          target_roas?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          target_conversion_rate?: number | null
          target_cpa?: number | null
          target_cpc?: number | null
          target_cpl?: number | null
          target_cpm?: number | null
          target_ctr?: number | null
          target_frequency?: number | null
          target_roas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_metric_benchmarks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_metric_benchmarks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_milestones: {
        Row: {
          celebrated_at: string | null
          celebration_method: string | null
          celebration_sent: boolean | null
          client_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          metrics_snapshot: Json | null
          milestone_order: number | null
          milestone_type: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          celebrated_at?: string | null
          celebration_method?: string | null
          celebration_sent?: boolean | null
          client_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metrics_snapshot?: Json | null
          milestone_order?: number | null
          milestone_type: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          celebrated_at?: string | null
          celebration_method?: string | null
          celebration_sent?: boolean | null
          client_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metrics_snapshot?: Json | null
          milestone_order?: number | null
          milestone_type?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_milestones_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_milestones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      client_nps_responses: {
        Row: {
          client_id: string
          company_id: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          feedback: string | null
          follow_up_done: boolean | null
          follow_up_notes: string | null
          id: string
          responded_at: string
          score: number
          trigger_type: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          feedback?: string | null
          follow_up_done?: boolean | null
          follow_up_notes?: string | null
          id?: string
          responded_at?: string
          score: number
          trigger_type?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          feedback?: string | null
          follow_up_done?: boolean | null
          follow_up_notes?: string | null
          id?: string
          responded_at?: string
          score?: number
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_nps_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_nps_responses_company_id_fkey"
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
      client_suggestions: {
        Row: {
          admin_notes: string | null
          category: string | null
          client_id: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          priority: string | null
          status: string | null
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          client_id: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_touchpoints: {
        Row: {
          ai_summary: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          next_action: string | null
          next_action_date: string | null
          occurred_at: string
          participants: string[] | null
          summary: string | null
          touchpoint_type: string
        }
        Insert: {
          ai_summary?: string | null
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          occurred_at?: string
          participants?: string[] | null
          summary?: string | null
          touchpoint_type: string
        }
        Update: {
          ai_summary?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          occurred_at?: string
          participants?: string[] | null
          summary?: string | null
          touchpoint_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_touchpoints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_touchpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_urls: {
        Row: {
          campaign_count: number | null
          client_id: string
          company_id: string
          content_analysis_summary: string | null
          content_analyzed_at: string | null
          content_match_score: number | null
          created_at: string | null
          domain: string
          first_seen_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          last_seen_at: string | null
          last_validated_at: string | null
          source: string
          updated_at: string | null
          url: string
          validation_error: string | null
          validation_final_url: string | null
          validation_load_time_ms: number | null
          validation_status: string | null
          validation_status_code: number | null
        }
        Insert: {
          campaign_count?: number | null
          client_id: string
          company_id: string
          content_analysis_summary?: string | null
          content_analyzed_at?: string | null
          content_match_score?: number | null
          created_at?: string | null
          domain: string
          first_seen_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_seen_at?: string | null
          last_validated_at?: string | null
          source?: string
          updated_at?: string | null
          url: string
          validation_error?: string | null
          validation_final_url?: string | null
          validation_load_time_ms?: number | null
          validation_status?: string | null
          validation_status_code?: number | null
        }
        Update: {
          campaign_count?: number | null
          client_id?: string
          company_id?: string
          content_analysis_summary?: string | null
          content_analyzed_at?: string | null
          content_match_score?: number | null
          created_at?: string | null
          domain?: string
          first_seen_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_seen_at?: string | null
          last_validated_at?: string | null
          source?: string
          updated_at?: string | null
          url?: string
          validation_error?: string | null
          validation_final_url?: string | null
          validation_load_time_ms?: number | null
          validation_status?: string | null
          validation_status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_urls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_urls_company_id_fkey"
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
          ai_reference_image_1: string | null
          ai_reference_image_2: string | null
          ai_reference_image_3: string | null
          avatar: string | null
          avg_cpl: number
          briefing_generated_at: string | null
          calculated_status: string | null
          campaign_type: string | null
          canceled_at: string | null
          company: string
          company_id: string | null
          created_at: string
          dashboard_token: string | null
          email: string
          facebook_page_id: string | null
          gestor_id: string | null
          google_account_id: string | null
          google_monthly_budget: number | null
          google_payment_type: string | null
          google_recharge_day: number | null
          id: string
          inactive_reason: string | null
          instagram_account_id: string | null
          is_canceled: boolean
          is_paused: boolean
          last_sync_at: string | null
          last_sync_period: string | null
          leads_generated: number | null
          linkedin_monthly_budget: number | null
          linkedin_payment_type: string | null
          linkedin_recharge_day: number | null
          meta_monthly_budget: number | null
          meta_payment_type: string | null
          meta_recharge_day: number | null
          monthly_budget: number | null
          name: string
          notes: string | null
          objectives: string | null
          offline_event_set_id: string | null
          pause_reason: string | null
          paused_at: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          preferred_platforms: string[] | null
          presentation_bg_image: string | null
          presentation_logo: string | null
          presentation_overlay_color: string | null
          presentation_overlay_opacity: number | null
          product_name: string | null
          sector: string
          status: Database["public"]["Enums"]["client_status"]
          status_calculated_at: string | null
          status_explanation: string | null
          target_audience: string | null
          team_id: string | null
          tiktok_monthly_budget: number | null
          tiktok_payment_type: string | null
          tiktok_recharge_day: number | null
          twitter_monthly_budget: number | null
          twitter_payment_type: string | null
          twitter_recharge_day: number | null
          updated_at: string
          user_id: string
          voice_tone: string | null
          website_url: string | null
          youtube_channel_url: string | null
        }
        Insert: {
          active_campaigns?: number
          ad_account_id?: string | null
          ai_briefing?: string | null
          ai_reference_image_1?: string | null
          ai_reference_image_2?: string | null
          ai_reference_image_3?: string | null
          avatar?: string | null
          avg_cpl?: number
          briefing_generated_at?: string | null
          calculated_status?: string | null
          campaign_type?: string | null
          canceled_at?: string | null
          company: string
          company_id?: string | null
          created_at?: string
          dashboard_token?: string | null
          email: string
          facebook_page_id?: string | null
          gestor_id?: string | null
          google_account_id?: string | null
          google_monthly_budget?: number | null
          google_payment_type?: string | null
          google_recharge_day?: number | null
          id?: string
          inactive_reason?: string | null
          instagram_account_id?: string | null
          is_canceled?: boolean
          is_paused?: boolean
          last_sync_at?: string | null
          last_sync_period?: string | null
          leads_generated?: number | null
          linkedin_monthly_budget?: number | null
          linkedin_payment_type?: string | null
          linkedin_recharge_day?: number | null
          meta_monthly_budget?: number | null
          meta_payment_type?: string | null
          meta_recharge_day?: number | null
          monthly_budget?: number | null
          name: string
          notes?: string | null
          objectives?: string | null
          offline_event_set_id?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          preferred_platforms?: string[] | null
          presentation_bg_image?: string | null
          presentation_logo?: string | null
          presentation_overlay_color?: string | null
          presentation_overlay_opacity?: number | null
          product_name?: string | null
          sector: string
          status?: Database["public"]["Enums"]["client_status"]
          status_calculated_at?: string | null
          status_explanation?: string | null
          target_audience?: string | null
          team_id?: string | null
          tiktok_monthly_budget?: number | null
          tiktok_payment_type?: string | null
          tiktok_recharge_day?: number | null
          twitter_monthly_budget?: number | null
          twitter_payment_type?: string | null
          twitter_recharge_day?: number | null
          updated_at?: string
          user_id: string
          voice_tone?: string | null
          website_url?: string | null
          youtube_channel_url?: string | null
        }
        Update: {
          active_campaigns?: number
          ad_account_id?: string | null
          ai_briefing?: string | null
          ai_reference_image_1?: string | null
          ai_reference_image_2?: string | null
          ai_reference_image_3?: string | null
          avatar?: string | null
          avg_cpl?: number
          briefing_generated_at?: string | null
          calculated_status?: string | null
          campaign_type?: string | null
          canceled_at?: string | null
          company?: string
          company_id?: string | null
          created_at?: string
          dashboard_token?: string | null
          email?: string
          facebook_page_id?: string | null
          gestor_id?: string | null
          google_account_id?: string | null
          google_monthly_budget?: number | null
          google_payment_type?: string | null
          google_recharge_day?: number | null
          id?: string
          inactive_reason?: string | null
          instagram_account_id?: string | null
          is_canceled?: boolean
          is_paused?: boolean
          last_sync_at?: string | null
          last_sync_period?: string | null
          leads_generated?: number | null
          linkedin_monthly_budget?: number | null
          linkedin_payment_type?: string | null
          linkedin_recharge_day?: number | null
          meta_monthly_budget?: number | null
          meta_payment_type?: string | null
          meta_recharge_day?: number | null
          monthly_budget?: number | null
          name?: string
          notes?: string | null
          objectives?: string | null
          offline_event_set_id?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          preferred_platforms?: string[] | null
          presentation_bg_image?: string | null
          presentation_logo?: string | null
          presentation_overlay_color?: string | null
          presentation_overlay_opacity?: number | null
          product_name?: string | null
          sector?: string
          status?: Database["public"]["Enums"]["client_status"]
          status_calculated_at?: string | null
          status_explanation?: string | null
          target_audience?: string | null
          team_id?: string | null
          tiktok_monthly_budget?: number | null
          tiktok_payment_type?: string | null
          tiktok_recharge_day?: number | null
          twitter_monthly_budget?: number | null
          twitter_payment_type?: string | null
          twitter_recharge_day?: number | null
          updated_at?: string
          user_id?: string
          voice_tone?: string | null
          website_url?: string | null
          youtube_channel_url?: string | null
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
            foreignKeyName: "clients_facebook_page_id_fkey"
            columns: ["facebook_page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_google_account_id_fkey"
            columns: ["google_account_id"]
            isOneToOne: false
            referencedRelation: "google_ads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
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
      cnae_lead_pool: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_code: string
          cnae_description: string | null
          cnpj: string
          company_id: string
          complemento: string | null
          created_at: string
          data_abertura: string | null
          data_situacao: string | null
          ddd: string | null
          email: string | null
          id: string
          imported_at: string | null
          logradouro: string | null
          mei_option: string | null
          municipio: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          partner_cpf: string | null
          partner_name: string | null
          partner_role: string | null
          phone: string | null
          phone_2: string | null
          phone_3: string | null
          porte: string | null
          razao_social: string | null
          simples_option: string | null
          simples_option_date: string | null
          situacao_cadastral: string | null
          source: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_code: string
          cnae_description?: string | null
          cnpj: string
          company_id: string
          complemento?: string | null
          created_at?: string
          data_abertura?: string | null
          data_situacao?: string | null
          ddd?: string | null
          email?: string | null
          id?: string
          imported_at?: string | null
          logradouro?: string | null
          mei_option?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          partner_cpf?: string | null
          partner_name?: string | null
          partner_role?: string | null
          phone?: string | null
          phone_2?: string | null
          phone_3?: string | null
          porte?: string | null
          razao_social?: string | null
          simples_option?: string | null
          simples_option_date?: string | null
          situacao_cadastral?: string | null
          source?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_code?: string
          cnae_description?: string | null
          cnpj?: string
          company_id?: string
          complemento?: string | null
          created_at?: string
          data_abertura?: string | null
          data_situacao?: string | null
          ddd?: string | null
          email?: string | null
          id?: string
          imported_at?: string | null
          logradouro?: string | null
          mei_option?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          partner_cpf?: string | null
          partner_name?: string | null
          partner_role?: string | null
          phone?: string | null
          phone_2?: string | null
          phone_3?: string | null
          porte?: string | null
          razao_social?: string | null
          simples_option?: string | null
          simples_option_date?: string | null
          situacao_cadastral?: string | null
          source?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnae_lead_pool_company_id_fkey"
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
          cs_tv_dashboard_token: string | null
          email: string | null
          id: string
          logo: string | null
          name: string
          phone: string | null
          radar_tv_dashboard_token: string | null
          slug: string | null
          social_tv_dashboard_token: string | null
          tv_dashboard_token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          cs_tv_dashboard_token?: string | null
          email?: string | null
          id?: string
          logo?: string | null
          name: string
          phone?: string | null
          radar_tv_dashboard_token?: string | null
          slug?: string | null
          social_tv_dashboard_token?: string | null
          tv_dashboard_token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          cs_tv_dashboard_token?: string | null
          email?: string | null
          id?: string
          logo?: string | null
          name?: string
          phone?: string | null
          radar_tv_dashboard_token?: string | null
          slug?: string | null
          social_tv_dashboard_token?: string | null
          tv_dashboard_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_api_keys: {
        Row: {
          api_key: string
          api_key_hash: string
          company_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          permissions: Json | null
          request_count: number | null
        }
        Insert: {
          api_key: string
          api_key_hash: string
          company_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          permissions?: Json | null
          request_count?: number | null
        }
        Update: {
          api_key?: string
          api_key_hash?: string
          company_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
          request_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      company_settings: {
        Row: {
          company_id: string
          created_at: string
          default_target_conversion_rate: number | null
          default_target_cpa: number | null
          default_target_cpc: number | null
          default_target_cpl: number | null
          default_target_cpm: number | null
          default_target_ctr: number | null
          default_target_frequency: number | null
          default_target_roas: number | null
          id: string
          listacnae_token: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_target_conversion_rate?: number | null
          default_target_cpa?: number | null
          default_target_cpc?: number | null
          default_target_cpl?: number | null
          default_target_cpm?: number | null
          default_target_ctr?: number | null
          default_target_frequency?: number | null
          default_target_roas?: number | null
          id?: string
          listacnae_token?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_target_conversion_rate?: number | null
          default_target_cpa?: number | null
          default_target_cpc?: number | null
          default_target_cpl?: number | null
          default_target_cpm?: number | null
          default_target_ctr?: number | null
          default_target_frequency?: number | null
          default_target_roas?: number | null
          id?: string
          listacnae_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
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
      content_plan_chat_messages: {
        Row: {
          client_id: string
          company_id: string
          content: string
          content_plan_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          client_id: string
          company_id: string
          content: string
          content_plan_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          client_id?: string
          company_id?: string
          content?: string
          content_plan_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_chat_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plan_chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plan_chat_messages_content_plan_id_fkey"
            columns: ["content_plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_posts: {
        Row: {
          caption: string | null
          content_plan_id: string
          created_at: string
          headline: string | null
          id: string
          image_url: string | null
          objective: string | null
          order_index: number
          post_type: string
          reels_cover_url: string | null
          reels_generation_progress: Json | null
          reels_generation_status: string | null
          reels_uploaded_video_url: string | null
          reels_video_url: string | null
          review_feedback: string | null
          review_status: string | null
          reviewed_at: string | null
          scheduled_date: string | null
          script: Json | null
          status: string
          subheadline: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          content_plan_id: string
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          objective?: string | null
          order_index?: number
          post_type?: string
          reels_cover_url?: string | null
          reels_generation_progress?: Json | null
          reels_generation_status?: string | null
          reels_uploaded_video_url?: string | null
          reels_video_url?: string | null
          review_feedback?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          scheduled_date?: string | null
          script?: Json | null
          status?: string
          subheadline?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          content_plan_id?: string
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          objective?: string | null
          order_index?: number
          post_type?: string
          reels_cover_url?: string | null
          reels_generation_progress?: Json | null
          reels_generation_status?: string | null
          reels_uploaded_video_url?: string | null
          reels_video_url?: string | null
          review_feedback?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          scheduled_date?: string | null
          script?: Json | null
          status?: string
          subheadline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_posts_content_plan_id_fkey"
            columns: ["content_plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_slides: {
        Row: {
          content: string | null
          created_at: string
          headline: string | null
          id: string
          image_url: string | null
          order_index: number
          post_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          order_index?: number
          post_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          order_index?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_slides_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_plan_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plans: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          month: number
          name: string
          public_shared_at: string | null
          public_token: string | null
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          month: number
          name: string
          public_shared_at?: string | null
          public_token?: string | null
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          month?: number
          name?: string
          public_shared_at?: string | null
          public_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_presentations: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          month: number
          name: string
          primary_color: string | null
          public_token: string | null
          secondary_color: string | null
          status: string
          updated_at: string
          user_id: string
          view_count: number | null
          year: number
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          month: number
          name: string
          primary_color?: string | null
          public_token?: string | null
          secondary_color?: string | null
          status?: string
          updated_at?: string
          user_id: string
          view_count?: number | null
          year: number
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          month?: number
          name?: string
          primary_color?: string | null
          public_token?: string | null
          secondary_color?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          view_count?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_presentations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_presentations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      creative_generation_history: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          creatives_generated: number
          creatives_requested: number
          error_message: string | null
          executed_at: string
          execution_details: Json | null
          execution_type: string
          id: string
          schedule_id: string | null
          status: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          creatives_generated?: number
          creatives_requested: number
          error_message?: string | null
          executed_at?: string
          execution_details?: Json | null
          execution_type?: string
          id?: string
          schedule_id?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          creatives_generated?: number
          creatives_requested?: number
          error_message?: string | null
          executed_at?: string
          execution_details?: Json | null
          execution_type?: string
          id?: string
          schedule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_generation_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_generation_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_generation_history_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "creative_generation_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_generation_queue: {
        Row: {
          caption: string | null
          client_id: string
          company_id: string
          created_at: string
          creative_type: string
          generated_at: string
          generated_content: Json | null
          generation_type: string
          hashtags: string | null
          id: string
          image_url: string | null
          presentation_id: string | null
          published_at: string | null
          quality_score: number | null
          research_theme_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_post_id: string | null
          source_creative_id: string | null
          status: string
          theme: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          caption?: string | null
          client_id: string
          company_id: string
          created_at?: string
          creative_type?: string
          generated_at?: string
          generated_content?: Json | null
          generation_type: string
          hashtags?: string | null
          id?: string
          image_url?: string | null
          presentation_id?: string | null
          published_at?: string | null
          quality_score?: number | null
          research_theme_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_post_id?: string | null
          source_creative_id?: string | null
          status?: string
          theme?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          caption?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          creative_type?: string
          generated_at?: string
          generated_content?: Json | null
          generation_type?: string
          hashtags?: string | null
          id?: string
          image_url?: string | null
          presentation_id?: string | null
          published_at?: string | null
          quality_score?: number | null
          research_theme_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_post_id?: string | null
          source_creative_id?: string | null
          status?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_generation_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_generation_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_generation_queue_source_creative_id_fkey"
            columns: ["source_creative_id"]
            isOneToOne: false
            referencedRelation: "creative_generation_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_generation_schedules: {
        Row: {
          always_include_text_in_images: boolean
          client_id: string
          company_id: string
          concept_percentage: number
          created_at: string
          creatives_per_day: number
          custom_image_prompt: string | null
          generation_time: string
          id: string
          is_active: boolean
          iteration_percentage: number
          last_generation_at: string | null
          next_generation_at: string | null
          reference_image_1: string | null
          reference_image_2: string | null
          reference_image_3: string | null
          reference_image_4: string | null
          reference_image_5: string | null
          reference_image_6: string | null
          updated_at: string
        }
        Insert: {
          always_include_text_in_images?: boolean
          client_id: string
          company_id: string
          concept_percentage?: number
          created_at?: string
          creatives_per_day?: number
          custom_image_prompt?: string | null
          generation_time?: string
          id?: string
          is_active?: boolean
          iteration_percentage?: number
          last_generation_at?: string | null
          next_generation_at?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          reference_image_4?: string | null
          reference_image_5?: string | null
          reference_image_6?: string | null
          updated_at?: string
        }
        Update: {
          always_include_text_in_images?: boolean
          client_id?: string
          company_id?: string
          concept_percentage?: number
          created_at?: string
          creatives_per_day?: number
          custom_image_prompt?: string | null
          generation_time?: string
          id?: string
          is_active?: boolean
          iteration_percentage?: number
          last_generation_at?: string | null
          next_generation_at?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          reference_image_4?: string | null
          reference_image_5?: string | null
          reference_image_6?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_generation_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_generation_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_media: {
        Row: {
          created_at: string
          creative_id: string
          id: string
          media_type: string
          media_url: string
          order_index: number
          slide_headline: string | null
          slide_subheadline: string | null
        }
        Insert: {
          created_at?: string
          creative_id: string
          id?: string
          media_type: string
          media_url: string
          order_index?: number
          slide_headline?: string | null
          slide_subheadline?: string | null
        }
        Update: {
          created_at?: string
          creative_id?: string
          id?: string
          media_type?: string
          media_url?: string
          order_index?: number
          slide_headline?: string | null
          slide_subheadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_media_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "presentation_creatives"
            referencedColumns: ["id"]
          },
        ]
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
      crm_board_user_queue: {
        Row: {
          board_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          queue_position: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          queue_position?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          queue_position?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_board_user_queue_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "crm_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_board_user_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_boards: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_value: number | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          order_index: number
          queue_enabled: boolean | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          order_index: number
          queue_enabled?: boolean | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          order_index?: number
          queue_enabled?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          email: string | null
          external_id: string | null
          facebook: string | null
          full_name: string
          id: string
          instagram: string | null
          notes: string | null
          phone: string | null
          state: string | null
          tags: string[] | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          facebook?: string | null
          full_name: string
          id?: string
          instagram?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          facebook?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_activities: {
        Row: {
          activity_type: string
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string
          from_stage_id: string | null
          id: string
          is_manual: boolean | null
          metadata: Json | null
          new_value: string | null
          notes: string | null
          old_value: string | null
          to_stage_id: string | null
        }
        Insert: {
          activity_type: string
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          from_stage_id?: string | null
          id?: string
          is_manual?: boolean | null
          metadata?: Json | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          to_stage_id?: string | null
        }
        Update: {
          activity_type?: string
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          from_stage_id?: string | null
          id?: string
          is_manual?: boolean | null
          metadata?: Json | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_activities_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_activities_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_links: {
        Row: {
          created_at: string | null
          id: string
          link_type: string
          source_deal_id: string
          target_deal_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_type?: string
          source_deal_id: string
          target_deal_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link_type?: string
          source_deal_id?: string
          target_deal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_links_source_deal_id_fkey"
            columns: ["source_deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_links_target_deal_id_fkey"
            columns: ["target_deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_tags: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_tags_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          archived_at: string | null
          closed_at: string | null
          contact_id: string
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          disqualification_reason: string | null
          expected_close_date: string | null
          id: string
          is_archived: boolean | null
          notes: string | null
          quantity: number | null
          responsible_id: string | null
          source_deal_id: string | null
          stage_entered_at: string | null
          stage_id: string
          start_date: string | null
          status: string | null
          temperature: string | null
          title: string
          updated_at: string | null
          value: number | null
          workflow_id: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          closed_at?: string | null
          contact_id: string
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          disqualification_reason?: string | null
          expected_close_date?: string | null
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          quantity?: number | null
          responsible_id?: string | null
          source_deal_id?: string | null
          stage_entered_at?: string | null
          stage_id: string
          start_date?: string | null
          status?: string | null
          temperature?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
          workflow_id?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          closed_at?: string | null
          contact_id?: string
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          disqualification_reason?: string | null
          expected_close_date?: string | null
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          quantity?: number | null
          responsible_id?: string | null
          source_deal_id?: string | null
          stage_entered_at?: string | null
          stage_id?: string
          start_date?: string | null
          status?: string | null
          temperature?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
          workflow_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_source_deal_id_fkey"
            columns: ["source_deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
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
          is_manual: boolean | null
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
          is_manual?: boolean | null
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
          is_manual?: boolean | null
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
      crm_lead_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_private: boolean | null
          lead_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_private?: boolean | null
          lead_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_private?: boolean | null
          lead_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lead_a_id: string
          lead_b_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_a_id: string
          lead_b_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_a_id?: string
          lead_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_links_lead_a_id_fkey"
            columns: ["lead_a_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_links_lead_b_id_fkey"
            columns: ["lead_b_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_tags: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          city: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          disqualification_reason: string | null
          email: string | null
          expected_close_date: string | null
          external_id: string | null
          facebook: string | null
          full_name: string
          id: string
          instagram: string | null
          is_archived: boolean
          notes: string | null
          phone: string | null
          quantity: number | null
          responsible_id: string | null
          stage_id: string
          start_date: string | null
          state: string | null
          status: string | null
          temperature: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_media: string | null
          utm_source: string | null
          value: number | null
          website: string | null
          workflow_id: string | null
          workspace_id: string
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          disqualification_reason?: string | null
          email?: string | null
          expected_close_date?: string | null
          external_id?: string | null
          facebook?: string | null
          full_name: string
          id?: string
          instagram?: string | null
          is_archived?: boolean
          notes?: string | null
          phone?: string | null
          quantity?: number | null
          responsible_id?: string | null
          stage_id: string
          start_date?: string | null
          state?: string | null
          status?: string | null
          temperature?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_media?: string | null
          utm_source?: string | null
          value?: number | null
          website?: string | null
          workflow_id?: string | null
          workspace_id: string
        }
        Update: {
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          disqualification_reason?: string | null
          email?: string | null
          expected_close_date?: string | null
          external_id?: string | null
          facebook?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          is_archived?: boolean
          notes?: string | null
          phone?: string | null
          quantity?: number | null
          responsible_id?: string | null
          stage_id?: string
          start_date?: string | null
          state?: string | null
          status?: string | null
          temperature?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_media?: string | null
          utm_source?: string | null
          value?: number | null
          website?: string | null
          workflow_id?: string | null
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
            foreignKeyName: "crm_leads_responsible_id_fkey"
            columns: ["responsible_id"]
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
          auto_status_change: boolean | null
          auto_temperature_change: boolean | null
          board_id: string
          color: string | null
          created_at: string | null
          event_mapping: string | null
          id: string
          max_days: number | null
          name: string
          order_index: number
          target_status: string | null
          target_temperature: string | null
          workflow_enabled: boolean | null
          workflow_target_board_id: string | null
          workflow_target_stage_id: string | null
          workspace_id: string
        }
        Insert: {
          auto_status_change?: boolean | null
          auto_temperature_change?: boolean | null
          board_id: string
          color?: string | null
          created_at?: string | null
          event_mapping?: string | null
          id?: string
          max_days?: number | null
          name: string
          order_index: number
          target_status?: string | null
          target_temperature?: string | null
          workflow_enabled?: boolean | null
          workflow_target_board_id?: string | null
          workflow_target_stage_id?: string | null
          workspace_id: string
        }
        Update: {
          auto_status_change?: boolean | null
          auto_temperature_change?: boolean | null
          board_id?: string
          color?: string | null
          created_at?: string | null
          event_mapping?: string | null
          id?: string
          max_days?: number | null
          name?: string
          order_index?: number
          target_status?: string | null
          target_temperature?: string | null
          workflow_enabled?: boolean | null
          workflow_target_board_id?: string | null
          workflow_target_stage_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "crm_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_workflow_target_board_id_fkey"
            columns: ["workflow_target_board_id"]
            isOneToOne: false
            referencedRelation: "crm_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_workflow_target_stage_id_fkey"
            columns: ["workflow_target_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "crm_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          password_hash: string
          role: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          password_hash: string
          role?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          password_hash?: string
          role?: string | null
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
          login_primary_color: string | null
          login_subtitle: string | null
          login_title: string | null
          logo_url: string | null
        }
        Insert: {
          access_token: string
          client_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          login_primary_color?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          logo_url?: string | null
        }
        Update: {
          access_token?: string
          client_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          login_primary_color?: string | null
          login_subtitle?: string | null
          login_title?: string | null
          logo_url?: string | null
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
      cs_tv_displayed_alerts: {
        Row: {
          alert_type: string
          analysis_id: string
          attendant_name: string | null
          company_id: string
          contact_name: string | null
          conversation_id: string | null
          displayed_at: string
          id: string
          score: number | null
        }
        Insert: {
          alert_type: string
          analysis_id: string
          attendant_name?: string | null
          company_id: string
          contact_name?: string | null
          conversation_id?: string | null
          displayed_at?: string
          id?: string
          score?: number | null
        }
        Update: {
          alert_type?: string
          analysis_id?: string
          attendant_name?: string | null
          company_id?: string
          contact_name?: string | null
          conversation_id?: string | null
          displayed_at?: string
          id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_tv_displayed_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_tv_displayed_alerts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_tv_realtime_alert_events: {
        Row: {
          alert_data: Json
          alert_type: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          alert_data: Json
          alert_type: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          alert_data?: Json
          alert_type?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_tv_realtime_alert_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_element_library: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          is_default: boolean | null
          name: string
          tags: string[] | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_default?: boolean | null
          name: string
          tags?: string[] | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_default?: boolean | null
          name?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "editor_element_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_board_permissions: {
        Row: {
          can_view_others_boards: boolean
          company_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_view_others_boards?: boolean
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_view_others_boards?: boolean
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_board_permissions_company_id_fkey"
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
          can_advertise: boolean
          created_at: string
          currency: string
          disable_reason: string | null
          funding_source_details: Json | null
          has_funding_issues: boolean | null
          id: string
          integration_id: string
          is_active: boolean
          is_prepaid: boolean | null
          is_restricted: boolean
          last_balance_check: string | null
          recharge_day: number | null
          restriction_reason: string | null
          spend_cap: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          account_status?: number | null
          balance?: number | null
          can_advertise?: boolean
          created_at?: string
          currency: string
          disable_reason?: string | null
          funding_source_details?: Json | null
          has_funding_issues?: boolean | null
          id?: string
          integration_id: string
          is_active?: boolean
          is_prepaid?: boolean | null
          is_restricted?: boolean
          last_balance_check?: string | null
          recharge_day?: number | null
          restriction_reason?: string | null
          spend_cap?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_status?: number | null
          balance?: number | null
          can_advertise?: boolean
          created_at?: string
          currency?: string
          disable_reason?: string | null
          funding_source_details?: Json | null
          has_funding_issues?: boolean | null
          id?: string
          integration_id?: string
          is_active?: boolean
          is_prepaid?: boolean | null
          is_restricted?: boolean
          last_balance_check?: string | null
          recharge_day?: number | null
          restriction_reason?: string | null
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
      facebook_pages: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          instagram_business_account_id: string | null
          integration_id: string
          is_active: boolean | null
          page_access_token: string
          page_category: string | null
          page_id: string
          page_name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          instagram_business_account_id?: string | null
          integration_id: string
          is_active?: boolean | null
          page_access_token: string
          page_category?: string | null
          page_id: string
          page_name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          instagram_business_account_id?: string | null
          integration_id?: string
          is_active?: boolean | null
          page_access_token?: string
          page_category?: string | null
          page_id?: string
          page_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_pages_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "facebook_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_sync_execution_logs: {
        Row: {
          clients_processed: number | null
          clients_total: number | null
          company_id: string
          completed_at: string | null
          error_message: string | null
          execution_details: Json | null
          id: string
          schedule_id: string | null
          started_at: string
          status: string
          sync_options: Json | null
        }
        Insert: {
          clients_processed?: number | null
          clients_total?: number | null
          company_id: string
          completed_at?: string | null
          error_message?: string | null
          execution_details?: Json | null
          id?: string
          schedule_id?: string | null
          started_at?: string
          status?: string
          sync_options?: Json | null
        }
        Update: {
          clients_processed?: number | null
          clients_total?: number | null
          company_id?: string
          completed_at?: string | null
          error_message?: string | null
          execution_details?: Json | null
          id?: string
          schedule_id?: string | null
          started_at?: string
          status?: string
          sync_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_sync_execution_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_sync_execution_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "facebook_sync_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_sync_schedules: {
        Row: {
          company_id: string
          created_at: string
          executions_per_day: number
          id: string
          is_enabled: boolean
          last_execution_at: string | null
          next_execution_at: string | null
          scheduled_times: string[]
          sync_options: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          executions_per_day?: number
          id?: string
          is_enabled?: boolean
          last_execution_at?: string | null
          next_execution_at?: string | null
          scheduled_times?: string[]
          sync_options?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          executions_per_day?: number
          id?: string
          is_enabled?: boolean
          last_execution_at?: string | null
          next_execution_at?: string | null
          scheduled_times?: string[]
          sync_options?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_sync_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      google_ad_groups: {
        Row: {
          campaign_id: string
          clicks: number | null
          client_id: string
          company_id: string
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          google_account_id: string
          google_id: string
          id: string
          impressions: number | null
          is_active: boolean
          name: string
          spend: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          client_id: string
          company_id: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          google_account_id: string
          google_id: string
          id?: string
          impressions?: number | null
          is_active?: boolean
          name: string
          spend?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          client_id?: string
          company_id?: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          google_account_id?: string
          google_id?: string
          id?: string
          impressions?: number | null
          is_active?: boolean
          name?: string
          spend?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ad_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "google_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ad_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ad_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ad_groups_google_account_id_fkey"
            columns: ["google_account_id"]
            isOneToOne: false
            referencedRelation: "google_ads_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads: {
        Row: {
          ad_group_id: string
          ad_type: string | null
          campaign_id: string
          clicks: number | null
          client_id: string
          company_id: string
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          descriptions: Json | null
          final_url: string | null
          google_account_id: string
          google_id: string
          headlines: Json | null
          id: string
          impressions: number | null
          is_active: boolean
          name: string
          spend: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_group_id: string
          ad_type?: string | null
          campaign_id: string
          clicks?: number | null
          client_id: string
          company_id: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          descriptions?: Json | null
          final_url?: string | null
          google_account_id: string
          google_id: string
          headlines?: Json | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          name: string
          spend?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_group_id?: string
          ad_type?: string | null
          campaign_id?: string
          clicks?: number | null
          client_id?: string
          company_id?: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          descriptions?: Json | null
          final_url?: string | null
          google_account_id?: string
          google_id?: string
          headlines?: Json | null
          id?: string
          impressions?: number | null
          is_active?: boolean
          name?: string
          spend?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "google_ad_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "google_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_google_account_id_fkey"
            columns: ["google_account_id"]
            isOneToOne: false
            referencedRelation: "google_ads_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_accounts: {
        Row: {
          account_name: string
          client_id: string | null
          company_id: string
          created_at: string
          currency: string | null
          google_customer_id: string
          id: string
          integration_id: string
          is_active: boolean
          is_manager: boolean | null
          parent_customer_id: string | null
          status: string | null
          time_zone: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          client_id?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          google_customer_id: string
          id?: string
          integration_id: string
          is_active?: boolean
          is_manager?: boolean | null
          parent_customer_id?: string | null
          status?: string | null
          time_zone?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          google_customer_id?: string
          id?: string
          integration_id?: string
          is_active?: boolean
          is_manager?: boolean | null
          parent_customer_id?: string | null
          status?: string | null
          time_zone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_accounts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "google_ads_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_integrations: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          refresh_token: string
          updated_at: string
          user_email: string | null
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          refresh_token: string
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          refresh_token?: string
          updated_at?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_sync_execution_logs: {
        Row: {
          clients_processed: number
          clients_total: number
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_details: Json | null
          id: string
          schedule_id: string | null
          started_at: string
          status: string
          sync_options: Json | null
        }
        Insert: {
          clients_processed?: number
          clients_total?: number
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_details?: Json | null
          id?: string
          schedule_id?: string | null
          started_at?: string
          status?: string
          sync_options?: Json | null
        }
        Update: {
          clients_processed?: number
          clients_total?: number
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_details?: Json | null
          id?: string
          schedule_id?: string | null
          started_at?: string
          status?: string
          sync_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_sync_execution_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_sync_execution_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "google_ads_sync_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_sync_schedules: {
        Row: {
          company_id: string
          created_at: string | null
          executions_per_day: number
          id: string
          is_enabled: boolean | null
          last_execution_at: string | null
          next_execution_at: string | null
          scheduled_times: string[]
          sync_options: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          executions_per_day?: number
          id?: string
          is_enabled?: boolean | null
          last_execution_at?: string | null
          next_execution_at?: string | null
          scheduled_times?: string[]
          sync_options?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          executions_per_day?: number
          id?: string
          is_enabled?: boolean | null
          last_execution_at?: string | null
          next_execution_at?: string | null
          scheduled_times?: string[]
          sync_options?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_sync_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      google_campaigns: {
        Row: {
          campaign_type: string | null
          clicks: number | null
          client_id: string
          company_id: string
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          daily_budget: number | null
          frequency: number | null
          google_account_id: string
          google_id: string
          id: string
          impressions: number | null
          is_active: boolean
          name: string
          period: string
          reach: number | null
          spend: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_type?: string | null
          clicks?: number | null
          client_id: string
          company_id: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          frequency?: number | null
          google_account_id: string
          google_id: string
          id?: string
          impressions?: number | null
          is_active?: boolean
          name: string
          period?: string
          reach?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_type?: string | null
          clicks?: number | null
          client_id?: string
          company_id?: string
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          frequency?: number | null
          google_account_id?: string
          google_id?: string
          id?: string
          impressions?: number | null
          is_active?: boolean
          name?: string
          period?: string
          reach?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_campaigns_google_account_id_fkey"
            columns: ["google_account_id"]
            isOneToOne: false
            referencedRelation: "google_ads_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_badges: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          rule_json: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          rule_json?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          rule_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "groupops_badges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_campaign_send_log: {
        Row: {
          campaign_id: string
          company_id: string
          cycle_number: number
          delivery_status: string | null
          group_id: string
          id: string
          message_preview: string | null
          metadata: Json | null
          sent_at: string
          template_id: string
        }
        Insert: {
          campaign_id: string
          company_id: string
          cycle_number?: number
          delivery_status?: string | null
          group_id: string
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          sent_at?: string
          template_id: string
        }
        Update: {
          campaign_id?: string
          company_id?: string
          cycle_number?: number
          delivery_status?: string | null
          group_id?: string
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          sent_at?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_campaign_send_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_campaigns: {
        Row: {
          approval_required: boolean | null
          company_id: string
          cooldown_rule_json: Json | null
          created_at: string
          delivery_mode: string | null
          group_id: string
          id: string
          instance_id: string | null
          last_execution_at: string | null
          next_execution_at: string | null
          schedule_day_of_month: number | null
          schedule_days_of_week: number[] | null
          schedule_frequency: string | null
          schedule_rule: string | null
          schedule_times: string[] | null
          scoring_profile_id: string | null
          selected_template_ids: string[] | null
          status: string
          targeting_rule_json: Json | null
          template_id: string | null
          template_mode: string
          type: string
          updated_at: string
        }
        Insert: {
          approval_required?: boolean | null
          company_id: string
          cooldown_rule_json?: Json | null
          created_at?: string
          delivery_mode?: string | null
          group_id: string
          id?: string
          instance_id?: string | null
          last_execution_at?: string | null
          next_execution_at?: string | null
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_frequency?: string | null
          schedule_rule?: string | null
          schedule_times?: string[] | null
          scoring_profile_id?: string | null
          selected_template_ids?: string[] | null
          status?: string
          targeting_rule_json?: Json | null
          template_id?: string | null
          template_mode?: string
          type: string
          updated_at?: string
        }
        Update: {
          approval_required?: boolean | null
          company_id?: string
          cooldown_rule_json?: Json | null
          created_at?: string
          delivery_mode?: string | null
          group_id?: string
          id?: string
          instance_id?: string | null
          last_execution_at?: string | null
          next_execution_at?: string | null
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_frequency?: string | null
          schedule_rule?: string | null
          schedule_times?: string[] | null
          scoring_profile_id?: string | null
          selected_template_ids?: string[] | null
          status?: string
          targeting_rule_json?: Json | null
          template_id?: string | null
          template_mode?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_campaigns_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groupops_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_campaigns_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_campaigns_scoring_profile_id_fkey"
            columns: ["scoring_profile_id"]
            isOneToOne: false
            referencedRelation: "groupops_scoring_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "groupops_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_events: {
        Row: {
          company_id: string
          created_at: string
          group_id: string
          id: string
          member_id: string | null
          payload_json: Json | null
          timestamp: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          group_id: string
          id?: string
          member_id?: string | null
          payload_json?: Json | null
          timestamp?: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          group_id?: string
          id?: string
          member_id?: string | null
          payload_json?: Json | null
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groupops_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "groupops_members"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_groups: {
        Row: {
          company_id: string
          config_json: Json
          created_at: string
          description: string | null
          id: string
          language: string | null
          name: string
          provider: string
          provider_group_id: string | null
          rules_text: string | null
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          config_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
          name: string
          provider?: string
          provider_group_id?: string | null
          rules_text?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          config_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
          name?: string
          provider?: string
          provider_group_id?: string | null
          rules_text?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_member_badges: {
        Row: {
          badge_id: string
          company_id: string
          earned_at: string
          id: string
          member_id: string
        }
        Insert: {
          badge_id: string
          company_id: string
          earned_at?: string
          id?: string
          member_id: string
        }
        Update: {
          badge_id?: string
          company_id?: string
          earned_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_member_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "groupops_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_member_badges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_member_badges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "groupops_members"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_members: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string
          display_name: string | null
          group_id: string
          id: string
          last_message_at: string | null
          last_participation_at: string | null
          phone_e164: string | null
          primary_pain: string | null
          privacy_flags: Json | null
          risk_level: string | null
          role: string | null
          segment: string | null
          silent_days: number | null
          size_bucket: string | null
          status: string
          streak_days: number | null
          tags: string[] | null
          updated_at: string
          wa_user_id: string | null
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          group_id: string
          id?: string
          last_message_at?: string | null
          last_participation_at?: string | null
          phone_e164?: string | null
          primary_pain?: string | null
          privacy_flags?: Json | null
          risk_level?: string | null
          role?: string | null
          segment?: string | null
          silent_days?: number | null
          size_bucket?: string | null
          status?: string
          streak_days?: number | null
          tags?: string[] | null
          updated_at?: string
          wa_user_id?: string | null
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          group_id?: string
          id?: string
          last_message_at?: string | null
          last_participation_at?: string | null
          phone_e164?: string | null
          primary_pain?: string | null
          privacy_flags?: Json | null
          risk_level?: string | null
          role?: string | null
          segment?: string | null
          silent_days?: number | null
          size_bucket?: string | null
          status?: string
          streak_days?: number | null
          tags?: string[] | null
          updated_at?: string
          wa_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groupops_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groupops_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_messages: {
        Row: {
          author_member_id: string | null
          company_id: string
          created_at: string
          group_id: string
          id: string
          media_type: string | null
          media_url: string | null
          mentions: string[] | null
          provider_message_id: string | null
          reply_to_message_id: string | null
          text: string | null
          timestamp: string
        }
        Insert: {
          author_member_id?: string | null
          company_id: string
          created_at?: string
          group_id: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          mentions?: string[] | null
          provider_message_id?: string | null
          reply_to_message_id?: string | null
          text?: string | null
          timestamp?: string
        }
        Update: {
          author_member_id?: string | null
          company_id?: string
          created_at?: string
          group_id?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          mentions?: string[] | null
          provider_message_id?: string | null
          reply_to_message_id?: string | null
          text?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_messages_author_member_id_fkey"
            columns: ["author_member_id"]
            isOneToOne: false
            referencedRelation: "groupops_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groupops_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "groupops_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_moderation_actions: {
        Row: {
          action_type: string
          company_id: string
          created_at: string
          group_id: string
          id: string
          member_id: string | null
          message_id: string | null
          reason: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
        }
        Insert: {
          action_type: string
          company_id: string
          created_at?: string
          group_id: string
          id?: string
          member_id?: string | null
          message_id?: string | null
          reason?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string
          created_at?: string
          group_id?: string
          id?: string
          member_id?: string | null
          message_id?: string | null
          reason?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groupops_moderation_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_moderation_actions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groupops_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_moderation_actions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "groupops_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_moderation_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "groupops_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_moderation_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "groupops_moderation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_moderation_rules: {
        Row: {
          action_type: string
          company_id: string
          config_json: Json
          created_at: string
          group_id: string
          id: string
          is_active: boolean | null
          name: string
          type: string
        }
        Insert: {
          action_type?: string
          company_id: string
          config_json?: Json
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean | null
          name: string
          type: string
        }
        Update: {
          action_type?: string
          company_id?: string
          config_json?: Json
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_moderation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_moderation_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groupops_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_score_ledger: {
        Row: {
          company_id: string
          event_id: string | null
          group_id: string
          id: string
          member_id: string
          points: number
          reason: string
          timestamp: string
        }
        Insert: {
          company_id: string
          event_id?: string | null
          group_id: string
          id?: string
          member_id: string
          points: number
          reason: string
          timestamp?: string
        }
        Update: {
          company_id?: string
          event_id?: string | null
          group_id?: string
          id?: string
          member_id?: string
          points?: number
          reason?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_score_ledger_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_score_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "groupops_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_score_ledger_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groupops_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupops_score_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "groupops_members"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_scoring_profiles: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          rules_json: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          rules_json?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          rules_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groupops_scoring_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      groupops_templates: {
        Row: {
          body: string
          category: string
          company_id: string
          constraints_json: Json | null
          created_at: string
          id: string
          placeholders: string[] | null
          title: string
          tone: string | null
          updated_at: string
          variants: Json | null
        }
        Insert: {
          body: string
          category?: string
          company_id: string
          constraints_json?: Json | null
          created_at?: string
          id?: string
          placeholders?: string[] | null
          title: string
          tone?: string | null
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          body?: string
          category?: string
          company_id?: string
          constraints_json?: Json | null
          created_at?: string
          id?: string
          placeholders?: string[] | null
          title?: string
          tone?: string | null
          updated_at?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "groupops_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          uploaded_by: string | null
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
          uploaded_by?: string | null
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
          uploaded_by?: string | null
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
      instagram_accounts: {
        Row: {
          business_id: string | null
          company_id: string
          created_at: string | null
          facebook_page_id: string | null
          followers_count: number | null
          id: string
          instagram_id: string
          is_active: boolean | null
          profile_picture_url: string | null
          source: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          business_id?: string | null
          company_id: string
          created_at?: string | null
          facebook_page_id?: string | null
          followers_count?: number | null
          id?: string
          instagram_id: string
          is_active?: boolean | null
          profile_picture_url?: string | null
          source?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          business_id?: string | null
          company_id?: string
          created_at?: string | null
          facebook_page_id?: string | null
          followers_count?: number | null
          id?: string
          instagram_id?: string
          is_active?: boolean | null
          profile_picture_url?: string | null
          source?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_accounts_facebook_page_id_fkey"
            columns: ["facebook_page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_auto_post_configs: {
        Row: {
          also_post_to_facebook: boolean | null
          carousel_max_images: number | null
          carousel_min_images: number | null
          carousel_prompt: string | null
          client_id: string | null
          company_id: string
          created_at: string | null
          created_by: string
          facebook_page_id: string | null
          id: string
          include_date_in_image: boolean
          instagram_account_id: string
          is_enabled: boolean | null
          last_post_at: string | null
          name: string | null
          next_post_at: string | null
          post_briefing: string
          post_type: string | null
          reference_image_1: string | null
          reference_image_2: string | null
          reference_image_3: string | null
          rss_feed_prompt: string | null
          scheduled_days: number[]
          scheduled_hours: number[]
          single_post_prompt: string | null
          updated_at: string | null
          youtube_channel_url: string | null
        }
        Insert: {
          also_post_to_facebook?: boolean | null
          carousel_max_images?: number | null
          carousel_min_images?: number | null
          carousel_prompt?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          facebook_page_id?: string | null
          id?: string
          include_date_in_image?: boolean
          instagram_account_id: string
          is_enabled?: boolean | null
          last_post_at?: string | null
          name?: string | null
          next_post_at?: string | null
          post_briefing: string
          post_type?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          rss_feed_prompt?: string | null
          scheduled_days?: number[]
          scheduled_hours?: number[]
          single_post_prompt?: string | null
          updated_at?: string | null
          youtube_channel_url?: string | null
        }
        Update: {
          also_post_to_facebook?: boolean | null
          carousel_max_images?: number | null
          carousel_min_images?: number | null
          carousel_prompt?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          facebook_page_id?: string | null
          id?: string
          include_date_in_image?: boolean
          instagram_account_id?: string
          is_enabled?: boolean | null
          last_post_at?: string | null
          name?: string | null
          next_post_at?: string | null
          post_briefing?: string
          post_type?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          rss_feed_prompt?: string | null
          scheduled_days?: number[]
          scheduled_hours?: number[]
          single_post_prompt?: string | null
          updated_at?: string | null
          youtube_channel_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_auto_post_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_auto_post_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_auto_post_configs_facebook_page_id_fkey"
            columns: ["facebook_page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_auto_post_configs_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_auto_post_schedules: {
        Row: {
          carousel_images: number | null
          config_id: string
          created_at: string | null
          day_of_week: number
          hour: number
          id: string
          is_enabled: boolean | null
          post_type: string
          updated_at: string | null
        }
        Insert: {
          carousel_images?: number | null
          config_id: string
          created_at?: string | null
          day_of_week: number
          hour: number
          id?: string
          is_enabled?: boolean | null
          post_type?: string
          updated_at?: string | null
        }
        Update: {
          carousel_images?: number | null
          config_id?: string
          created_at?: string | null
          day_of_week?: number
          hour?: number
          id?: string
          is_enabled?: boolean | null
          post_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_auto_post_schedules_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "instagram_auto_post_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_auto_posts: {
        Row: {
          caption: string
          client_id: string | null
          company_id: string
          config_id: string
          created_at: string | null
          error_message: string | null
          grammar_errors: string[] | null
          grammar_validated: boolean | null
          grammar_validation_attempts: number | null
          id: string
          image_url: string
          image_urls: string[] | null
          instagram_media_id: string | null
          post_type: string | null
          published_at: string | null
          scheduled_at: string
          status: string | null
        }
        Insert: {
          caption: string
          client_id?: string | null
          company_id: string
          config_id: string
          created_at?: string | null
          error_message?: string | null
          grammar_errors?: string[] | null
          grammar_validated?: boolean | null
          grammar_validation_attempts?: number | null
          id?: string
          image_url: string
          image_urls?: string[] | null
          instagram_media_id?: string | null
          post_type?: string | null
          published_at?: string | null
          scheduled_at: string
          status?: string | null
        }
        Update: {
          caption?: string
          client_id?: string | null
          company_id?: string
          config_id?: string
          created_at?: string | null
          error_message?: string | null
          grammar_errors?: string[] | null
          grammar_validated?: boolean | null
          grammar_validation_attempts?: number | null
          id?: string
          image_url?: string
          image_urls?: string[] | null
          instagram_media_id?: string | null
          post_type?: string | null
          published_at?: string | null
          scheduled_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_auto_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_auto_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_auto_posts_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "instagram_auto_post_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_autopost_knowledge_files: {
        Row: {
          config_id: string
          content_text: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          processing_status: string
        }
        Insert: {
          config_id: string
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          processing_status?: string
        }
        Update: {
          config_id?: string
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          processing_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_autopost_knowledge_files_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "instagram_auto_post_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_autopost_knowledge_videos: {
        Row: {
          config_id: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          is_selected: boolean
          published_at: string | null
          thumbnail_url: string | null
          transcription: string | null
          video_id: string
          video_title: string | null
          video_url: string
        }
        Insert: {
          config_id: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          is_selected?: boolean
          published_at?: string | null
          thumbnail_url?: string | null
          transcription?: string | null
          video_id: string
          video_title?: string | null
          video_url: string
        }
        Update: {
          config_id?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          is_selected?: boolean
          published_at?: string | null
          thumbnail_url?: string | null
          transcription?: string | null
          video_id?: string
          video_title?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_autopost_knowledge_videos_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "instagram_auto_post_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_autopost_rss_feeds: {
        Row: {
          auto_generate: boolean
          carousel_images: number
          config_id: string
          created_at: string
          created_by: string | null
          feed_name: string | null
          feed_url: string
          id: string
          is_enabled: boolean
          last_checked_at: string | null
          last_error: string | null
          post_type: string
          updated_at: string
        }
        Insert: {
          auto_generate?: boolean
          carousel_images?: number
          config_id: string
          created_at?: string
          created_by?: string | null
          feed_name?: string | null
          feed_url: string
          id?: string
          is_enabled?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          post_type?: string
          updated_at?: string
        }
        Update: {
          auto_generate?: boolean
          carousel_images?: number
          config_id?: string
          created_at?: string
          created_by?: string | null
          feed_name?: string | null
          feed_url?: string
          id?: string
          is_enabled?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          post_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_autopost_rss_feeds_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "instagram_auto_post_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_autopost_rss_items: {
        Row: {
          config_id: string
          created_at: string
          description: string | null
          feed_id: string
          generated_at: string | null
          generated_post_id: string | null
          guid: string
          id: string
          is_selected: boolean
          link: string | null
          post_generated: boolean
          published_at: string | null
          title: string
        }
        Insert: {
          config_id: string
          created_at?: string
          description?: string | null
          feed_id: string
          generated_at?: string | null
          generated_post_id?: string | null
          guid: string
          id?: string
          is_selected?: boolean
          link?: string | null
          post_generated?: boolean
          published_at?: string | null
          title: string
        }
        Update: {
          config_id?: string
          created_at?: string
          description?: string | null
          feed_id?: string
          generated_at?: string | null
          generated_post_id?: string | null
          guid?: string
          id?: string
          is_selected?: boolean
          link?: string | null
          post_generated?: boolean
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_autopost_rss_items_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "instagram_auto_post_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_autopost_rss_items_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "instagram_autopost_rss_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_api_request_log: {
        Row: {
          api_key_id: string | null
          capture_url: string | null
          company_id: string
          created_at: string
          error_message: string | null
          id: string
          leads_processed: number
          request_type: string
          source_info: string | null
          status: string
        }
        Insert: {
          api_key_id?: string | null
          capture_url?: string | null
          company_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          leads_processed?: number
          request_type: string
          source_info?: string | null
          status?: string
        }
        Update: {
          api_key_id?: string | null
          capture_url?: string | null
          company_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          leads_processed?: number
          request_type?: string
          source_info?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_api_request_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "company_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_api_request_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_client_interactions: {
        Row: {
          client_id: string
          client_sector: string | null
          company_id: string
          id: string
          interaction_type: string
          lead_id: string
          metadata: Json | null
          occurred_at: string | null
          source: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value: number | null
        }
        Insert: {
          client_id: string
          client_sector?: string | null
          company_id: string
          id?: string
          interaction_type: string
          lead_id: string
          metadata?: Json | null
          occurred_at?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Update: {
          client_id?: string
          client_sector?: string | null
          company_id?: string
          id?: string
          interaction_type?: string
          lead_id?: string
          metadata?: Json | null
          occurred_at?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_client_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_client_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_master_pool"
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
      lead_export_history: {
        Row: {
          audience_id: string | null
          client_id: string
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          export_type: string
          filters_applied: Json | null
          id: string
          leads_exported: number | null
          leads_matched: number | null
          match_rate: number | null
          segment_ids: string[] | null
          status: string | null
        }
        Insert: {
          audience_id?: string | null
          client_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          export_type: string
          filters_applied?: Json | null
          id?: string
          leads_exported?: number | null
          leads_matched?: number | null
          match_rate?: number | null
          segment_ids?: string[] | null
          status?: string | null
        }
        Update: {
          audience_id?: string | null
          client_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          export_type?: string
          filters_applied?: Json | null
          id?: string
          leads_exported?: number | null
          leads_matched?: number | null
          match_rate?: number | null
          segment_ids?: string[] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_export_history_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "meta_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_export_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_export_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_import_history: {
        Row: {
          company_id: string
          created_at: string
          default_segment_id: string | null
          error_message: string | null
          file_name: string
          id: string
          imported_by: string
          leads_duplicated: number
          leads_failed: number
          leads_imported: number
          status: string
          total_rows: number
        }
        Insert: {
          company_id: string
          created_at?: string
          default_segment_id?: string | null
          error_message?: string | null
          file_name: string
          id?: string
          imported_by: string
          leads_duplicated?: number
          leads_failed?: number
          leads_imported?: number
          status?: string
          total_rows?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          default_segment_id?: string | null
          error_message?: string | null
          file_name?: string
          id?: string
          imported_by?: string
          leads_duplicated?: number
          leads_failed?: number
          leads_imported?: number
          status?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_import_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_import_history_default_segment_id_fkey"
            columns: ["default_segment_id"]
            isOneToOne: false
            referencedRelation: "lead_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_master_pool: {
        Row: {
          acquisition_channel: string | null
          activity_start_date: string | null
          ad_set: string | null
          address_complement: string | null
          address_number: string | null
          address_type: string | null
          annual_revenue: string | null
          assigned_to: string | null
          attended_webinar: boolean | null
          budget_range: string | null
          buying_role: string | null
          campaign: string | null
          capture_type: string | null
          capture_url: string | null
          city: string | null
          classification_reason: string | null
          client_type: string | null
          cnae: string | null
          cnae_code: string | null
          cnae_description: string | null
          cnpj: string | null
          company_id: string
          company_linkedin: string | null
          company_name: string | null
          company_segment: string | null
          company_size: string | null
          company_subsegment: string | null
          company_trade_name: string | null
          company_validated: boolean | null
          company_website: string | null
          consent_date: string | null
          consent_source: string | null
          content_consumed: Json | null
          content_type: string | null
          country: string | null
          created_at: string | null
          creative: string | null
          current_software: string | null
          current_vendor: string | null
          data_enriched: boolean | null
          data_purpose: string | null
          date_of_birth: string | null
          decision_makers_count: number | null
          department: string | null
          email: string | null
          email_hash: string | null
          email_relevance: string | null
          email_type: string | null
          email_verified: boolean | null
          employee_count: string | null
          enrichment_source: string | null
          estimated_users: number | null
          extra_data: Json | null
          facebook_id: string | null
          first_captured_at: string | null
          first_client_id: string | null
          first_interaction_at: string | null
          first_name: string | null
          full_name: string
          gender: string | null
          global_score: number | null
          id: string
          influence_level: string | null
          instagram: string | null
          internal_classification: string | null
          internal_notes: string | null
          is_decision_maker: boolean | null
          job_level: string | null
          job_title: string | null
          keyword: string | null
          last_interaction_at: string | null
          last_name: string | null
          last_scored_at: string | null
          lead_classification: string | null
          lead_cost: number | null
          lead_status: string | null
          lead_validated: boolean | null
          legal_nature_code: string | null
          legal_nature_description: string | null
          lgpd_consent: boolean | null
          license_type: string | null
          linkedin_profile: string | null
          main_pain_point: string | null
          matriz_filial: string | null
          mei_option: boolean | null
          monthly_revenue: string | null
          municipality_code: string | null
          neighborhood: string | null
          original_source: string | null
          pages_visited: Json | null
          partner_sharing_consent: boolean | null
          partners: string | null
          phone: string | null
          phone_2: string | null
          phone_hash: string | null
          phone_relevance: string | null
          phone_verified: boolean | null
          propensity_to_convert: number | null
          purchase_timeline: string | null
          registration_status_date: string | null
          requested_demo: boolean | null
          responsible_federative_entity: string | null
          score_authority: number | null
          score_company_fit: number | null
          score_contact_quality: number | null
          score_digital_maturity: number | null
          score_purchase_intent: number | null
          secondary_cnaes: string | null
          secondary_source: string | null
          share_capital: number | null
          simples_exclusion_date: string | null
          simples_option: boolean | null
          simples_option_date: string | null
          software_satisfaction: string | null
          software_type: string | null
          software_usage_time: string | null
          specific_source: string | null
          state: string | null
          state_full_name: string | null
          street: string | null
          switch_reason: string | null
          tags: Json | null
          total_conversions: number | null
          total_interactions: number | null
          total_value: number | null
          updated_at: string | null
          urgency_level: string | null
          uses_software: boolean | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visited_pricing: boolean | null
          whatsapp: string | null
          years_in_market: number | null
          zip_code: string | null
        }
        Insert: {
          acquisition_channel?: string | null
          activity_start_date?: string | null
          ad_set?: string | null
          address_complement?: string | null
          address_number?: string | null
          address_type?: string | null
          annual_revenue?: string | null
          assigned_to?: string | null
          attended_webinar?: boolean | null
          budget_range?: string | null
          buying_role?: string | null
          campaign?: string | null
          capture_type?: string | null
          capture_url?: string | null
          city?: string | null
          classification_reason?: string | null
          client_type?: string | null
          cnae?: string | null
          cnae_code?: string | null
          cnae_description?: string | null
          cnpj?: string | null
          company_id: string
          company_linkedin?: string | null
          company_name?: string | null
          company_segment?: string | null
          company_size?: string | null
          company_subsegment?: string | null
          company_trade_name?: string | null
          company_validated?: boolean | null
          company_website?: string | null
          consent_date?: string | null
          consent_source?: string | null
          content_consumed?: Json | null
          content_type?: string | null
          country?: string | null
          created_at?: string | null
          creative?: string | null
          current_software?: string | null
          current_vendor?: string | null
          data_enriched?: boolean | null
          data_purpose?: string | null
          date_of_birth?: string | null
          decision_makers_count?: number | null
          department?: string | null
          email?: string | null
          email_hash?: string | null
          email_relevance?: string | null
          email_type?: string | null
          email_verified?: boolean | null
          employee_count?: string | null
          enrichment_source?: string | null
          estimated_users?: number | null
          extra_data?: Json | null
          facebook_id?: string | null
          first_captured_at?: string | null
          first_client_id?: string | null
          first_interaction_at?: string | null
          first_name?: string | null
          full_name: string
          gender?: string | null
          global_score?: number | null
          id?: string
          influence_level?: string | null
          instagram?: string | null
          internal_classification?: string | null
          internal_notes?: string | null
          is_decision_maker?: boolean | null
          job_level?: string | null
          job_title?: string | null
          keyword?: string | null
          last_interaction_at?: string | null
          last_name?: string | null
          last_scored_at?: string | null
          lead_classification?: string | null
          lead_cost?: number | null
          lead_status?: string | null
          lead_validated?: boolean | null
          legal_nature_code?: string | null
          legal_nature_description?: string | null
          lgpd_consent?: boolean | null
          license_type?: string | null
          linkedin_profile?: string | null
          main_pain_point?: string | null
          matriz_filial?: string | null
          mei_option?: boolean | null
          monthly_revenue?: string | null
          municipality_code?: string | null
          neighborhood?: string | null
          original_source?: string | null
          pages_visited?: Json | null
          partner_sharing_consent?: boolean | null
          partners?: string | null
          phone?: string | null
          phone_2?: string | null
          phone_hash?: string | null
          phone_relevance?: string | null
          phone_verified?: boolean | null
          propensity_to_convert?: number | null
          purchase_timeline?: string | null
          registration_status_date?: string | null
          requested_demo?: boolean | null
          responsible_federative_entity?: string | null
          score_authority?: number | null
          score_company_fit?: number | null
          score_contact_quality?: number | null
          score_digital_maturity?: number | null
          score_purchase_intent?: number | null
          secondary_cnaes?: string | null
          secondary_source?: string | null
          share_capital?: number | null
          simples_exclusion_date?: string | null
          simples_option?: boolean | null
          simples_option_date?: string | null
          software_satisfaction?: string | null
          software_type?: string | null
          software_usage_time?: string | null
          specific_source?: string | null
          state?: string | null
          state_full_name?: string | null
          street?: string | null
          switch_reason?: string | null
          tags?: Json | null
          total_conversions?: number | null
          total_interactions?: number | null
          total_value?: number | null
          updated_at?: string | null
          urgency_level?: string | null
          uses_software?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_pricing?: boolean | null
          whatsapp?: string | null
          years_in_market?: number | null
          zip_code?: string | null
        }
        Update: {
          acquisition_channel?: string | null
          activity_start_date?: string | null
          ad_set?: string | null
          address_complement?: string | null
          address_number?: string | null
          address_type?: string | null
          annual_revenue?: string | null
          assigned_to?: string | null
          attended_webinar?: boolean | null
          budget_range?: string | null
          buying_role?: string | null
          campaign?: string | null
          capture_type?: string | null
          capture_url?: string | null
          city?: string | null
          classification_reason?: string | null
          client_type?: string | null
          cnae?: string | null
          cnae_code?: string | null
          cnae_description?: string | null
          cnpj?: string | null
          company_id?: string
          company_linkedin?: string | null
          company_name?: string | null
          company_segment?: string | null
          company_size?: string | null
          company_subsegment?: string | null
          company_trade_name?: string | null
          company_validated?: boolean | null
          company_website?: string | null
          consent_date?: string | null
          consent_source?: string | null
          content_consumed?: Json | null
          content_type?: string | null
          country?: string | null
          created_at?: string | null
          creative?: string | null
          current_software?: string | null
          current_vendor?: string | null
          data_enriched?: boolean | null
          data_purpose?: string | null
          date_of_birth?: string | null
          decision_makers_count?: number | null
          department?: string | null
          email?: string | null
          email_hash?: string | null
          email_relevance?: string | null
          email_type?: string | null
          email_verified?: boolean | null
          employee_count?: string | null
          enrichment_source?: string | null
          estimated_users?: number | null
          extra_data?: Json | null
          facebook_id?: string | null
          first_captured_at?: string | null
          first_client_id?: string | null
          first_interaction_at?: string | null
          first_name?: string | null
          full_name?: string
          gender?: string | null
          global_score?: number | null
          id?: string
          influence_level?: string | null
          instagram?: string | null
          internal_classification?: string | null
          internal_notes?: string | null
          is_decision_maker?: boolean | null
          job_level?: string | null
          job_title?: string | null
          keyword?: string | null
          last_interaction_at?: string | null
          last_name?: string | null
          last_scored_at?: string | null
          lead_classification?: string | null
          lead_cost?: number | null
          lead_status?: string | null
          lead_validated?: boolean | null
          legal_nature_code?: string | null
          legal_nature_description?: string | null
          lgpd_consent?: boolean | null
          license_type?: string | null
          linkedin_profile?: string | null
          main_pain_point?: string | null
          matriz_filial?: string | null
          mei_option?: boolean | null
          monthly_revenue?: string | null
          municipality_code?: string | null
          neighborhood?: string | null
          original_source?: string | null
          pages_visited?: Json | null
          partner_sharing_consent?: boolean | null
          partners?: string | null
          phone?: string | null
          phone_2?: string | null
          phone_hash?: string | null
          phone_relevance?: string | null
          phone_verified?: boolean | null
          propensity_to_convert?: number | null
          purchase_timeline?: string | null
          registration_status_date?: string | null
          requested_demo?: boolean | null
          responsible_federative_entity?: string | null
          score_authority?: number | null
          score_company_fit?: number | null
          score_contact_quality?: number | null
          score_digital_maturity?: number | null
          score_purchase_intent?: number | null
          secondary_cnaes?: string | null
          secondary_source?: string | null
          share_capital?: number | null
          simples_exclusion_date?: string | null
          simples_option?: boolean | null
          simples_option_date?: string | null
          software_satisfaction?: string | null
          software_type?: string | null
          software_usage_time?: string | null
          specific_source?: string | null
          state?: string | null
          state_full_name?: string | null
          street?: string | null
          switch_reason?: string | null
          tags?: Json | null
          total_conversions?: number | null
          total_interactions?: number | null
          total_value?: number | null
          updated_at?: string | null
          urgency_level?: string | null
          uses_software?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_pricing?: boolean | null
          whatsapp?: string | null
          years_in_market?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_master_pool_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_master_pool_first_client_id_fkey"
            columns: ["first_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualification_rules: {
        Row: {
          company_id: string
          created_at: string | null
          dimension: string
          field: string
          id: string
          is_active: boolean | null
          operator: string
          rule_order: number | null
          score_contribution: number
          updated_at: string | null
          value: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dimension: string
          field: string
          id?: string
          is_active?: boolean | null
          operator: string
          rule_order?: number | null
          score_contribution?: number
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dimension?: string
          field?: string
          id?: string
          is_active?: boolean | null
          operator?: string
          rule_order?: number | null
          score_contribution?: number
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualification_weights: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          threshold_gold: number | null
          threshold_silver: number | null
          updated_at: string | null
          weight_authority: number | null
          weight_company_fit: number | null
          weight_contact_quality: number | null
          weight_digital_maturity: number | null
          weight_purchase_intent: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          threshold_gold?: number | null
          threshold_silver?: number | null
          updated_at?: string | null
          weight_authority?: number | null
          weight_company_fit?: number | null
          weight_contact_quality?: number | null
          weight_digital_maturity?: number | null
          weight_purchase_intent?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          threshold_gold?: number | null
          threshold_silver?: number | null
          updated_at?: string | null
          weight_authority?: number | null
          weight_company_fit?: number | null
          weight_contact_quality?: number | null
          weight_digital_maturity?: number | null
          weight_purchase_intent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualification_weights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_saved_filters: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          filter_config: Json
          id: string
          is_favorite: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          filter_config?: Json
          id?: string
          is_favorite?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          filter_config?: Json
          id?: string
          is_favorite?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_saved_filters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_segment_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          lead_id: string
          segment_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          lead_id: string
          segment_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          lead_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_segment_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_master_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_segment_assignments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "lead_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_segments: {
        Row: {
          auto_rules: Json | null
          cnaes: string[] | null
          color: string | null
          company_id: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_auto: boolean | null
          last_calculated_at: string | null
          lead_count: number | null
          name: string
          segment_type: string
          updated_at: string | null
        }
        Insert: {
          auto_rules?: Json | null
          cnaes?: string[] | null
          color?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_auto?: boolean | null
          last_calculated_at?: string | null
          lead_count?: number | null
          name: string
          segment_type: string
          updated_at?: string | null
        }
        Update: {
          auto_rules?: Json | null
          cnaes?: string[] | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_auto?: boolean | null
          last_calculated_at?: string | null
          lead_count?: number | null
          name?: string
          segment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_segments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      market_research_insights: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          extracted_quotes: Json | null
          id: string
          last_used_at: string | null
          opportunity: string | null
          pain_point: string | null
          raw_content: string | null
          relevance_score: number | null
          sentiment: string | null
          source_type: string
          source_url: string | null
          topic: string
          updated_at: string
          used_in_ads: number
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          extracted_quotes?: Json | null
          id?: string
          last_used_at?: string | null
          opportunity?: string | null
          pain_point?: string | null
          raw_content?: string | null
          relevance_score?: number | null
          sentiment?: string | null
          source_type: string
          source_url?: string | null
          topic: string
          updated_at?: string
          used_in_ads?: number
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          extracted_quotes?: Json | null
          id?: string
          last_used_at?: string | null
          opportunity?: string | null
          pain_point?: string | null
          raw_content?: string | null
          relevance_score?: number | null
          sentiment?: string | null
          source_type?: string
          source_url?: string | null
          topic?: string
          updated_at?: string
          used_in_ads?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_research_insights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_research_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_audience_uploads: {
        Row: {
          audience_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          records_count: number
          records_invalid: number | null
          records_received: number | null
          session_id: string | null
          status: string
          upload_type: string
        }
        Insert: {
          audience_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          records_count?: number
          records_invalid?: number | null
          records_received?: number | null
          session_id?: string | null
          status?: string
          upload_type: string
        }
        Update: {
          audience_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          records_count?: number
          records_invalid?: number | null
          records_received?: number | null
          session_id?: string | null
          status?: string
          upload_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_audience_uploads_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "meta_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audience_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_audiences: {
        Row: {
          ad_account_id: string
          approximate_count: number | null
          client_id: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          meta_audience_id: string
          name: string
          operation_status: Json | null
          subtype: string | null
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          approximate_count?: number | null
          client_id: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          meta_audience_id: string
          name: string
          operation_status?: Json | null
          subtype?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          approximate_count?: number | null
          client_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          meta_audience_id?: string
          name?: string
          operation_status?: Json | null
          subtype?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_audiences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audiences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_pixels: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          creation_time: string | null
          data_use_setting: string | null
          id: string
          is_primary: boolean | null
          is_unavailable: boolean | null
          last_fired_time: string | null
          pixel_id: string
          pixel_name: string
          stats: Json | null
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          creation_time?: string | null
          data_use_setting?: string | null
          id?: string
          is_primary?: boolean | null
          is_unavailable?: boolean | null
          last_fired_time?: string | null
          pixel_id: string
          pixel_name: string
          stats?: Json | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          creation_time?: string | null
          data_use_setting?: string | null
          id?: string
          is_primary?: boolean | null
          is_unavailable?: boolean | null
          last_fired_time?: string | null
          pixel_id?: string
          pixel_name?: string
          stats?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_pixels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_pixels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_templates: {
        Row: {
          celebration_message_template: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          milestone_type: string
          template_order: number | null
          title: string
          trigger_condition: Json | null
          updated_at: string
        }
        Insert: {
          celebration_message_template?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          milestone_type: string
          template_order?: number | null
          title: string
          trigger_condition?: Json | null
          updated_at?: string
        }
        Update: {
          celebration_message_template?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          milestone_type?: string
          template_order?: number | null
          title?: string
          trigger_condition?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      permission_group_items: {
        Row: {
          created_at: string
          group_id: string
          id: string
          menu_item: Database["public"]["Enums"]["menu_item_type"]
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          menu_item: Database["public"]["Enums"]["menu_item_type"]
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          menu_item?: Database["public"]["Enums"]["menu_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "permission_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_group_members: {
        Row: {
          created_at: string
          employee_id: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_groups: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_events_log: {
        Row: {
          action_source: string | null
          client_id: string
          company_id: string
          created_at: string
          custom_data: Json | null
          error_message: string | null
          event_id: string | null
          event_name: string
          event_time: string
          id: string
          meta_response: Json | null
          pixel_id: string
          status: string
          user_data: Json | null
        }
        Insert: {
          action_source?: string | null
          client_id: string
          company_id: string
          created_at?: string
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_name: string
          event_time?: string
          id?: string
          meta_response?: Json | null
          pixel_id: string
          status?: string
          user_data?: Json | null
        }
        Update: {
          action_source?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_name?: string
          event_time?: string
          id?: string
          meta_response?: Json | null
          pixel_id?: string
          status?: string
          user_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pixel_events_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_log_pixel_id_fkey"
            columns: ["pixel_id"]
            isOneToOne: false
            referencedRelation: "meta_pixels"
            referencedColumns: ["id"]
          },
        ]
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
      post_publish_logs: {
        Row: {
          action: string
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          platform: string
          response_data: Json | null
          scheduled_post_id: string
          status: string
        }
        Insert: {
          action: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          platform: string
          response_data?: Json | null
          scheduled_post_id: string
          status: string
        }
        Update: {
          action?: string
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          platform?: string
          response_data?: Json | null
          scheduled_post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_publish_logs_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_creative_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          creative_id: string
          id: string
          meeting_id: string
          rejection_reason: string | null
          resubmitted_at: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          creative_id: string
          id?: string
          meeting_id: string
          rejection_reason?: string | null
          resubmitted_at?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          creative_id?: string
          id?: string
          meeting_id?: string
          rejection_reason?: string | null
          resubmitted_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentation_creative_approvals_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "presentation_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentation_creative_approvals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "presentation_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_creatives: {
        Row: {
          caption: string | null
          created_at: string
          creative_type: string
          current_status: string | null
          hashtags: string | null
          headline: string | null
          id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          objective: string | null
          order_index: number
          presentation_id: string
          reels_cover_url: string | null
          scheduled_date: string | null
          scheduled_post_id: string | null
          scheduled_time: string | null
          script: Json | null
          subheadline: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          creative_type: string
          current_status?: string | null
          hashtags?: string | null
          headline?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          objective?: string | null
          order_index?: number
          presentation_id: string
          reels_cover_url?: string | null
          scheduled_date?: string | null
          scheduled_post_id?: string | null
          scheduled_time?: string | null
          script?: Json | null
          subheadline?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          creative_type?: string
          current_status?: string | null
          hashtags?: string | null
          headline?: string | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          objective?: string | null
          order_index?: number
          presentation_id?: string
          reels_cover_url?: string | null
          scheduled_date?: string | null
          scheduled_post_id?: string | null
          scheduled_time?: string | null
          script?: Json | null
          subheadline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentation_creatives_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "content_presentations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentation_creatives_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_meeting_participants: {
        Row: {
          created_at: string
          email: string
          id: string
          meeting_id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          meeting_id: string
          name: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          meeting_id?: string
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentation_meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "presentation_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_meetings: {
        Row: {
          approved_count: number | null
          completed_at: string | null
          created_at: string
          current_slide: number | null
          ended_at: string | null
          id: string
          meeting_date: string
          notes: string | null
          presentation_id: string
          recording_url: string | null
          rejected_count: number | null
          started_at: string | null
          status: string
          summary_sent: boolean
        }
        Insert: {
          approved_count?: number | null
          completed_at?: string | null
          created_at?: string
          current_slide?: number | null
          ended_at?: string | null
          id?: string
          meeting_date?: string
          notes?: string | null
          presentation_id: string
          recording_url?: string | null
          rejected_count?: number | null
          started_at?: string | null
          status?: string
          summary_sent?: boolean
        }
        Update: {
          approved_count?: number | null
          completed_at?: string | null
          created_at?: string
          current_slide?: number | null
          ended_at?: string | null
          id?: string
          meeting_date?: string
          notes?: string | null
          presentation_id?: string
          recording_url?: string | null
          rejected_count?: number | null
          started_at?: string | null
          status?: string
          summary_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "presentation_meetings_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "content_presentations"
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
      qbr_reports: {
        Row: {
          action_plan: string | null
          best_creatives: string[] | null
          client_id: string
          company_id: string
          created_at: string
          executive_summary: string | null
          id: string
          metrics_snapshot: Json | null
          period_end: string
          period_start: string
          presented_at: string | null
          public_token: string | null
          status: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          action_plan?: string | null
          best_creatives?: string[] | null
          client_id: string
          company_id: string
          created_at?: string
          executive_summary?: string | null
          id?: string
          metrics_snapshot?: Json | null
          period_end: string
          period_start: string
          presented_at?: string | null
          public_token?: string | null
          status?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          action_plan?: string | null
          best_creatives?: string[] | null
          client_id?: string
          company_id?: string
          created_at?: string
          executive_summary?: string | null
          id?: string
          metrics_snapshot?: Json | null
          period_end?: string
          period_start?: string
          presented_at?: string | null
          public_token?: string | null
          status?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qbr_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qbr_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_task_templates: {
        Row: {
          active_days_of_week: number[] | null
          assigned_to: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          days_before_visible: number
          days_to_complete: number
          description: string | null
          id: string
          is_active: boolean
          last_generated_at: string | null
          month_of_year: number | null
          next_generation_date: string
          priority: string
          recurrence_interval: number
          recurrence_type: string
          title: string
          updated_at: string
        }
        Insert: {
          active_days_of_week?: number[] | null
          assigned_to: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          days_before_visible?: number
          days_to_complete?: number
          description?: string | null
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          month_of_year?: number | null
          next_generation_date?: string
          priority?: string
          recurrence_interval?: number
          recurrence_type: string
          title: string
          updated_at?: string
        }
        Update: {
          active_days_of_week?: number[] | null
          assigned_to?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          days_before_visible?: number
          days_to_complete?: number
          description?: string | null
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          month_of_year?: number | null
          next_generation_date?: string
          priority?: string
          recurrence_interval?: number
          recurrence_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_task_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_executions: {
        Row: {
          client_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          due_at: string
          employee_id: string | null
          id: string
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["routine_execution_status"]
          template_id: string
          time_spent_minutes: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          due_at: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["routine_execution_status"]
          template_id: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["routine_execution_status"]
          template_id?: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_executions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_executions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_executions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_executions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "routine_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_templates: {
        Row: {
          category: Database["public"]["Enums"]["routine_category"]
          company_id: string
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          default_time: string
          description: string | null
          frequency: Database["public"]["Enums"]["routine_frequency"]
          id: string
          is_active: boolean
          is_system: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          sla_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["routine_category"]
          company_id: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          default_time?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["routine_frequency"]
          id?: string
          is_active?: boolean
          is_system?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          sla_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["routine_category"]
          company_id?: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          default_time?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["routine_frequency"]
          id?: string
          is_active?: boolean
          is_system?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          sla_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          caption: string | null
          client_id: string | null
          company_id: string
          content_type: string
          created_at: string | null
          created_by: string
          error_message: string | null
          facebook_page_id: string | null
          facebook_post_id: string | null
          id: string
          instagram_account_id: string | null
          instagram_media_id: string | null
          media_urls: string[]
          metadata: Json | null
          platforms: string[]
          published_at: string | null
          retry_count: number | null
          scheduled_at: string
          status: string
          thumbnail_url: string | null
          timezone: string | null
          updated_at: string | null
          visual_creative_id: string | null
        }
        Insert: {
          caption?: string | null
          client_id?: string | null
          company_id: string
          content_type: string
          created_at?: string | null
          created_by: string
          error_message?: string | null
          facebook_page_id?: string | null
          facebook_post_id?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_media_id?: string | null
          media_urls?: string[]
          metadata?: Json | null
          platforms?: string[]
          published_at?: string | null
          retry_count?: number | null
          scheduled_at: string
          status?: string
          thumbnail_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          visual_creative_id?: string | null
        }
        Update: {
          caption?: string | null
          client_id?: string | null
          company_id?: string
          content_type?: string
          created_at?: string | null
          created_by?: string
          error_message?: string | null
          facebook_page_id?: string | null
          facebook_post_id?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_media_id?: string | null
          media_urls?: string[]
          metadata?: Json | null
          platforms?: string[]
          published_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          status?: string
          thumbnail_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          visual_creative_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_facebook_page_id_fkey"
            columns: ["facebook_page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      snapshot_execution_log: {
        Row: {
          ads_processed: number | null
          adsets_processed: number | null
          campaigns_processed: number | null
          clients_processed: number | null
          created_at: string
          error_messages: string[] | null
          errors_count: number | null
          execution_date: string
          finished_at: string | null
          id: string
          snapshots_created: number | null
          started_at: string
          status: string
        }
        Insert: {
          ads_processed?: number | null
          adsets_processed?: number | null
          campaigns_processed?: number | null
          clients_processed?: number | null
          created_at?: string
          error_messages?: string[] | null
          errors_count?: number | null
          execution_date: string
          finished_at?: string | null
          id?: string
          snapshots_created?: number | null
          started_at?: string
          status: string
        }
        Update: {
          ads_processed?: number | null
          adsets_processed?: number | null
          campaigns_processed?: number | null
          clients_processed?: number | null
          created_at?: string
          error_messages?: string[] | null
          errors_count?: number | null
          execution_date?: string
          finished_at?: string | null
          id?: string
          snapshots_created?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          client_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          options: Json | null
          progress: Json | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          options?: Json | null
          progress?: Json | null
          started_at?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          options?: Json | null
          progress?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          client_id: string | null
          company_id: string
          created_at: string | null
          details: Json | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          client_id?: string | null
          company_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_board_columns: {
        Row: {
          color: string
          company_id: string
          created_at: string
          id: string
          name: string
          order_index: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_board_columns_company_id_fkey"
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
          assigned_user_id: string | null
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
          recurring_template_id: string | null
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
          visibility_date: string | null
        }
        Insert: {
          ai_estimated_minutes?: number | null
          ai_organization_date?: string | null
          alert_id?: string | null
          assigned_user_id?: string | null
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
          recurring_template_id?: string | null
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
          visibility_date?: string | null
        }
        Update: {
          ai_estimated_minutes?: number | null
          ai_organization_date?: string | null
          alert_id?: string | null
          assigned_user_id?: string | null
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
          recurring_template_id?: string | null
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
          visibility_date?: string | null
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
            foreignKeyName: "tasks_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_task_templates"
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
      team_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          leader_id: string | null
          name: string
          progress: number
          updated_at: string
          user_id: string
          whatsapp_responsible_id: string | null
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
          leader_id?: string | null
          name: string
          progress?: number
          updated_at?: string
          user_id: string
          whatsapp_responsible_id?: string | null
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
          leader_id?: string | null
          name?: string
          progress?: number
          updated_at?: string
          user_id?: string
          whatsapp_responsible_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_whatsapp_responsible_id_fkey"
            columns: ["whatsapp_responsible_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      value_statements: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          best_campaign_id: string | null
          best_creative_id: string | null
          client_id: string
          company_id: string
          conversions: number | null
          created_at: string
          executive_summary: string | null
          id: string
          leads_generated: number | null
          next_month_plan: string | null
          period_month: number
          period_year: number
          public_token: string | null
          sent_at: string | null
          status: string | null
          total_investment: number | null
          total_return: number | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          best_campaign_id?: string | null
          best_creative_id?: string | null
          client_id: string
          company_id: string
          conversions?: number | null
          created_at?: string
          executive_summary?: string | null
          id?: string
          leads_generated?: number | null
          next_month_plan?: string | null
          period_month: number
          period_year: number
          public_token?: string | null
          sent_at?: string | null
          status?: string | null
          total_investment?: number | null
          total_return?: number | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          best_campaign_id?: string | null
          best_creative_id?: string | null
          client_id?: string
          company_id?: string
          conversions?: number | null
          created_at?: string
          executive_summary?: string | null
          id?: string
          leads_generated?: number | null
          next_month_plan?: string | null
          period_month?: number
          period_year?: number
          public_token?: string | null
          sent_at?: string | null
          status?: string | null
          total_investment?: number | null
          total_return?: number | null
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "value_statements_best_campaign_id_fkey"
            columns: ["best_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_statements_best_creative_id_fkey"
            columns: ["best_creative_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_statements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_statements_company_id_fkey"
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
          generation_operation_id: string | null
          id: string
          image_url: string | null
          media_type: string | null
          objective: string | null
          status: string
          target_audience: string | null
          theme: string
          title: string
          updated_at: string
          video_duration_seconds: number | null
          video_url: string | null
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
          generation_operation_id?: string | null
          id?: string
          image_url?: string | null
          media_type?: string | null
          objective?: string | null
          status?: string
          target_audience?: string | null
          theme: string
          title: string
          updated_at?: string
          video_duration_seconds?: number | null
          video_url?: string | null
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
          generation_operation_id?: string | null
          id?: string
          image_url?: string | null
          media_type?: string | null
          objective?: string | null
          status?: string
          target_audience?: string | null
          theme?: string
          title?: string
          updated_at?: string
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      whatsapp_ai_agent_config: {
        Row: {
          agent_name: string | null
          blacklist_words: string[] | null
          company_id: string
          created_at: string
          department: string | null
          emoji_usage: string | null
          empathy_level: number | null
          enthusiasm_level: number | null
          escalation_message: string | null
          force_realtime_analysis: boolean
          formality_level: number | null
          id: string
          ignore_group_analysis: boolean | null
          instance_id: string | null
          mandatory_cta: string | null
          min_confidence_threshold: number | null
          primary_objective: string | null
          response_length: string | null
          updated_at: string
          use_bold: boolean | null
          use_client_name: boolean | null
          use_conversation_history: boolean | null
          use_lists: boolean | null
          use_purchase_history: boolean | null
          use_satisfaction_score: boolean | null
          use_short_paragraphs: boolean | null
        }
        Insert: {
          agent_name?: string | null
          blacklist_words?: string[] | null
          company_id: string
          created_at?: string
          department?: string | null
          emoji_usage?: string | null
          empathy_level?: number | null
          enthusiasm_level?: number | null
          escalation_message?: string | null
          force_realtime_analysis?: boolean
          formality_level?: number | null
          id?: string
          ignore_group_analysis?: boolean | null
          instance_id?: string | null
          mandatory_cta?: string | null
          min_confidence_threshold?: number | null
          primary_objective?: string | null
          response_length?: string | null
          updated_at?: string
          use_bold?: boolean | null
          use_client_name?: boolean | null
          use_conversation_history?: boolean | null
          use_lists?: boolean | null
          use_purchase_history?: boolean | null
          use_satisfaction_score?: boolean | null
          use_short_paragraphs?: boolean | null
        }
        Update: {
          agent_name?: string | null
          blacklist_words?: string[] | null
          company_id?: string
          created_at?: string
          department?: string | null
          emoji_usage?: string | null
          empathy_level?: number | null
          enthusiasm_level?: number | null
          escalation_message?: string | null
          force_realtime_analysis?: boolean
          formality_level?: number | null
          id?: string
          ignore_group_analysis?: boolean | null
          instance_id?: string | null
          mandatory_cta?: string | null
          min_confidence_threshold?: number | null
          primary_objective?: string | null
          response_length?: string | null
          updated_at?: string
          use_bold?: boolean | null
          use_client_name?: boolean | null
          use_conversation_history?: boolean | null
          use_lists?: boolean | null
          use_purchase_history?: boolean | null
          use_satisfaction_score?: boolean | null
          use_short_paragraphs?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_agent_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_ai_agent_config_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_ai_chat_messages: {
        Row: {
          company_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          source_message_id: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          source_message_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          source_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_assignment_history: {
        Row: {
          action: string
          company_id: string
          conversation_id: string
          created_at: string
          created_by: string | null
          from_team_id: string | null
          from_user_id: string | null
          id: string
          reason: string | null
          to_team_id: string | null
          to_user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          from_team_id?: string | null
          from_user_id?: string | null
          id?: string
          reason?: string | null
          to_team_id?: string | null
          to_user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          from_team_id?: string | null
          from_user_id?: string | null
          id?: string
          reason?: string | null
          to_team_id?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_assignment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_assignment_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_assignment_history_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_assignment_history_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_client_contacts: {
        Row: {
          client_id: string
          company_id: string
          contact_name: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          phone: string
          profile_type: string | null
          receives_alerts: boolean | null
          receives_reports: boolean | null
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone: string
          profile_type?: string | null
          receives_alerts?: boolean | null
          receives_reports?: boolean | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string
          profile_type?: string | null
          receives_alerts?: boolean | null
          receives_reports?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_client_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_client_notification_settings: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          gestor_employee_id: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          gestor_employee_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          gestor_employee_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_client_notification_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_client_notification_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_client_notification_settings_gestor_employee_id_fkey"
            columns: ["gestor_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_client_trigger_subscriptions: {
        Row: {
          client_settings_id: string
          created_at: string
          destination: string
          id: string
          is_active: boolean
          trigger_id: string
          updated_at: string
        }
        Insert: {
          client_settings_id: string
          created_at?: string
          destination?: string
          id?: string
          is_active?: boolean
          trigger_id: string
          updated_at?: string
        }
        Update: {
          client_settings_id?: string
          created_at?: string
          destination?: string
          id?: string
          is_active?: boolean
          trigger_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_client_trigger_subscriptions_client_settings_id_fkey"
            columns: ["client_settings_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_client_notification_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_client_trigger_subscriptions_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_notification_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_configs: {
        Row: {
          client_token: string | null
          company_id: string
          connected_phone: string | null
          created_at: string
          id: string
          instance_id: string | null
          is_active: boolean | null
          is_connected: boolean | null
          last_connection_test: string | null
          meta_access_token: string | null
          meta_app_id: string | null
          meta_business_account_id: string | null
          meta_is_connected: boolean | null
          meta_last_connection_test: string | null
          meta_phone_number: string | null
          meta_phone_number_id: string | null
          meta_webhook_verify_token: string | null
          provider: string | null
          token: string | null
          uazapi_admintoken: string | null
          uazapi_endpoint: string | null
          uazapi_session: string | null
          uazapi_token: string | null
          updated_at: string
        }
        Insert: {
          client_token?: string | null
          company_id: string
          connected_phone?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connection_test?: string | null
          meta_access_token?: string | null
          meta_app_id?: string | null
          meta_business_account_id?: string | null
          meta_is_connected?: boolean | null
          meta_last_connection_test?: string | null
          meta_phone_number?: string | null
          meta_phone_number_id?: string | null
          meta_webhook_verify_token?: string | null
          provider?: string | null
          token?: string | null
          uazapi_admintoken?: string | null
          uazapi_endpoint?: string | null
          uazapi_session?: string | null
          uazapi_token?: string | null
          updated_at?: string
        }
        Update: {
          client_token?: string | null
          company_id?: string
          connected_phone?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connection_test?: string | null
          meta_access_token?: string | null
          meta_app_id?: string | null
          meta_business_account_id?: string | null
          meta_is_connected?: boolean | null
          meta_last_connection_test?: string | null
          meta_phone_number?: string | null
          meta_phone_number_id?: string | null
          meta_webhook_verify_token?: string | null
          provider?: string | null
          token?: string | null
          uazapi_admintoken?: string | null
          uazapi_endpoint?: string | null
          uazapi_session?: string | null
          uazapi_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assigned_to_team_id: string | null
          assigned_to_user_id: string | null
          assigned_type: string
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          assigned_type: string
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          assigned_type?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_assignments_assigned_to_team_id_fkey"
            columns: ["assigned_to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_notes: {
        Row: {
          company_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          client_id: string | null
          company_id: string
          contact_name: string | null
          created_at: string | null
          id: string
          instance_id: string | null
          is_archived: boolean | null
          is_muted: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          phone: string
          profile_pic_url: string | null
          provider: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          phone: string
          profile_pic_url?: string | null
          provider?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          phone?: string
          profile_pic_url?: string | null
          provider?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_execution_log: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          execution_details: Json | null
          execution_window: string
          id: string
          messages_failed: number
          messages_sent: number
          schedule_id: string | null
          started_at: string | null
          status: string
          trigger_id: string | null
          trigger_name: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          execution_details?: Json | null
          execution_window?: string
          id?: string
          messages_failed?: number
          messages_sent?: number
          schedule_id?: string | null
          started_at?: string | null
          status?: string
          trigger_id?: string | null
          trigger_name?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          execution_details?: Json | null
          execution_window?: string
          id?: string
          messages_failed?: number
          messages_sent?: number
          schedule_id?: string | null
          started_at?: string | null
          status?: string
          trigger_id?: string | null
          trigger_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_execution_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_execution_log_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_trigger_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_execution_log_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_notification_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instance_users: {
        Row: {
          can_send: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          instance_id: string
          is_attendant: boolean
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          can_send?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          instance_id: string
          is_attendant?: boolean
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          can_send?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          instance_id?: string
          is_attendant?: boolean
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instance_users_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          company_id: string
          connected_phone: string | null
          created_at: string | null
          id: string
          instance_name: string
          instance_type: string | null
          is_active: boolean | null
          is_connected: boolean | null
          last_connection_test: string | null
          meta_access_token: string | null
          meta_business_account_id: string | null
          meta_phone_number_id: string | null
          profile_name: string | null
          profile_pic_url: string | null
          receive_group_messages: boolean | null
          session_id: string
          status: string | null
          uazapi_instance_id: string | null
          uazapi_token: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          connected_phone?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          instance_type?: string | null
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connection_test?: string | null
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          receive_group_messages?: boolean | null
          session_id: string
          status?: string | null
          uazapi_instance_id?: string | null
          uazapi_token?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          connected_phone?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          instance_type?: string | null
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connection_test?: string | null
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          receive_group_messages?: boolean | null
          session_id?: string
          status?: string | null
          uazapi_instance_id?: string | null
          uazapi_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          recipient_profile: string
          trigger_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          recipient_profile: string
          trigger_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          recipient_profile?: string
          trigger_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_templates_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_notification_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          audio_transcription: string | null
          cached_media_url: string | null
          company_id: string
          content: string
          conversation_id: string
          direction: string
          edited_at: string | null
          external_id: string | null
          id: string
          is_edited: boolean | null
          media_url: string | null
          message_type: string | null
          original_message_id: string | null
          reaction: string | null
          reply_to_message_id: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string | null
          transcription_status: string | null
        }
        Insert: {
          audio_transcription?: string | null
          cached_media_url?: string | null
          company_id: string
          content: string
          conversation_id: string
          direction: string
          edited_at?: string | null
          external_id?: string | null
          id?: string
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          original_message_id?: string | null
          reaction?: string | null
          reply_to_message_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          transcription_status?: string | null
        }
        Update: {
          audio_transcription?: string | null
          cached_media_url?: string | null
          company_id?: string
          content?: string
          conversation_id?: string
          direction?: string
          edited_at?: string | null
          external_id?: string | null
          id?: string
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          original_message_id?: string | null
          reaction?: string | null
          reply_to_message_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          transcription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: string
          company_id: string
          created_at: string
          footer_text: string | null
          header_format: string | null
          header_text: string | null
          id: string
          instance_id: string | null
          language: string
          status: string
          synced_at: string | null
          template_id: string
          template_name: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category: string
          company_id: string
          created_at?: string
          footer_text?: string | null
          header_format?: string | null
          header_text?: string | null
          id?: string
          instance_id?: string | null
          language?: string
          status?: string
          synced_at?: string | null
          template_id: string
          template_name: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: string
          company_id?: string
          created_at?: string
          footer_text?: string | null
          header_format?: string | null
          header_text?: string | null
          id?: string
          instance_id?: string | null
          language?: string
          status?: string
          synced_at?: string | null
          template_id?: string
          template_name?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_meta_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_meta_templates_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_log: {
        Row: {
          client_id: string | null
          client_name: string | null
          company_id: string
          contact_name: string | null
          delivered_at: string | null
          error_message: string | null
          execution_log_id: string | null
          id: string
          message_content: string
          notification_type: string
          recipient_phone: string
          related_entity_id: string | null
          related_entity_type: string | null
          sent_at: string | null
          status: string | null
          zapi_message_id: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          company_id: string
          contact_name?: string | null
          delivered_at?: string | null
          error_message?: string | null
          execution_log_id?: string | null
          id?: string
          message_content: string
          notification_type: string
          recipient_phone: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          company_id?: string
          contact_name?: string | null
          delivered_at?: string | null
          error_message?: string | null
          execution_log_id?: string | null
          id?: string
          message_content?: string
          notification_type?: string
          recipient_phone?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_log_execution_log_id_fkey"
            columns: ["execution_log_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_execution_log"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_preferences: {
        Row: {
          balance_threshold_days: number | null
          company_id: string
          cpa_threshold_percentage: number | null
          created_at: string
          id: string
          notify_disabled_account: boolean | null
          notify_high_cpa: boolean | null
          notify_low_balance: boolean | null
          notify_post_failed: boolean | null
          notify_post_published: boolean | null
          notify_presentation_summary: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
        }
        Insert: {
          balance_threshold_days?: number | null
          company_id: string
          cpa_threshold_percentage?: number | null
          created_at?: string
          id?: string
          notify_disabled_account?: boolean | null
          notify_high_cpa?: boolean | null
          notify_low_balance?: boolean | null
          notify_post_failed?: boolean | null
          notify_post_published?: boolean | null
          notify_presentation_summary?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
        }
        Update: {
          balance_threshold_days?: number | null
          company_id?: string
          cpa_threshold_percentage?: number | null
          created_at?: string
          id?: string
          notify_disabled_account?: boolean | null
          notify_high_cpa?: boolean | null
          notify_low_balance?: boolean | null
          notify_post_failed?: boolean | null
          notify_post_published?: boolean | null
          notify_presentation_summary?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_triggers: {
        Row: {
          company_id: string
          conditions: Json
          created_at: string
          description: string | null
          id: string
          instance_id: string | null
          is_active: boolean
          trigger_name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean
          trigger_name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean
          trigger_name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_triggers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_triggers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_realtime_analysis: {
        Row: {
          alerts: string[] | null
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          insight: string | null
          interpretation: string | null
          last_analyzed_message_id: string | null
          needs_response: boolean | null
          ready_message: string | null
          score: number | null
          sentiment_score: number | null
          suggestion: string | null
          temperature: string
          updated_at: string
        }
        Insert: {
          alerts?: string[] | null
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          insight?: string | null
          interpretation?: string | null
          last_analyzed_message_id?: string | null
          needs_response?: boolean | null
          ready_message?: string | null
          score?: number | null
          sentiment_score?: number | null
          suggestion?: string | null
          temperature?: string
          updated_at?: string
        }
        Update: {
          alerts?: string[] | null
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          insight?: string | null
          interpretation?: string | null
          last_analyzed_message_id?: string | null
          needs_response?: boolean | null
          ready_message?: string | null
          score?: number | null
          sentiment_score?: number | null
          suggestion?: string | null
          temperature?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_realtime_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_realtime_analysis_history: {
        Row: {
          alerts: string[] | null
          analyzed_at: string
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          insight: Json | null
          interpretation: string | null
          last_message_direction: string | null
          message_count: number | null
          needs_response: boolean | null
          ready_message: string | null
          score: number | null
          suggestion: string | null
          temperature: string
        }
        Insert: {
          alerts?: string[] | null
          analyzed_at?: string
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          insight?: Json | null
          interpretation?: string | null
          last_message_direction?: string | null
          message_count?: number | null
          needs_response?: boolean | null
          ready_message?: string | null
          score?: number | null
          suggestion?: string | null
          temperature: string
        }
        Update: {
          alerts?: string[] | null
          analyzed_at?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          insight?: Json | null
          interpretation?: string | null
          last_message_direction?: string | null
          message_count?: number | null
          needs_response?: boolean | null
          ready_message?: string | null
          score?: number | null
          suggestion?: string | null
          temperature?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_realtime_analysis_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_recipients: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          phone: string
          receive_alerts: boolean | null
          receive_reports: boolean | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          phone: string
          receive_alerts?: boolean | null
          receive_reports?: boolean | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          receive_alerts?: boolean | null
          receive_reports?: boolean | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_recipients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_trigger_schedules: {
        Row: {
          created_at: string
          day_of_month: number | null
          days_of_week: number[] | null
          execution_hours: number[] | null
          frequency_type: string
          id: string
          last_executed_at: string | null
          next_execution_at: string | null
          preferred_time: string | null
          respect_quiet_hours: boolean
          times_per_day: number | null
          trigger_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          execution_hours?: number[] | null
          frequency_type?: string
          id?: string
          last_executed_at?: string | null
          next_execution_at?: string | null
          preferred_time?: string | null
          respect_quiet_hours?: boolean
          times_per_day?: number | null
          trigger_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          execution_hours?: number[] | null
          frequency_type?: string
          id?: string
          last_executed_at?: string | null
          next_execution_at?: string | null
          preferred_time?: string | null
          respect_quiet_hours?: boolean
          times_per_day?: number | null
          trigger_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_trigger_schedules_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_notification_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_auto_post_configs: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string | null
          created_by: string
          id: string
          is_enabled: boolean | null
          last_post_at: string | null
          name: string | null
          next_post_at: string | null
          post_briefing: string
          post_category: string | null
          post_status: string | null
          post_type: string | null
          reference_image_1: string | null
          reference_image_2: string | null
          reference_image_3: string | null
          scheduled_days: number[]
          scheduled_hours: number[]
          updated_at: string | null
          wordpress_site_id: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_enabled?: boolean | null
          last_post_at?: string | null
          name?: string | null
          next_post_at?: string | null
          post_briefing: string
          post_category?: string | null
          post_status?: string | null
          post_type?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          scheduled_days?: number[]
          scheduled_hours?: number[]
          updated_at?: string | null
          wordpress_site_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_enabled?: boolean | null
          last_post_at?: string | null
          name?: string | null
          next_post_at?: string | null
          post_briefing?: string
          post_category?: string | null
          post_status?: string | null
          post_type?: string | null
          reference_image_1?: string | null
          reference_image_2?: string | null
          reference_image_3?: string | null
          scheduled_days?: number[]
          scheduled_hours?: number[]
          updated_at?: string | null
          wordpress_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_auto_post_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_auto_post_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_auto_post_configs_wordpress_site_id_fkey"
            columns: ["wordpress_site_id"]
            isOneToOne: false
            referencedRelation: "wordpress_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_auto_posts: {
        Row: {
          client_id: string | null
          company_id: string
          config_id: string
          content: string
          created_at: string | null
          error_message: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          meta_description: string | null
          published_at: string | null
          scheduled_at: string
          status: string | null
          title: string
          wordpress_post_id: string | null
          wordpress_post_url: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          config_id: string
          content: string
          created_at?: string | null
          error_message?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          scheduled_at: string
          status?: string | null
          title: string
          wordpress_post_id?: string | null
          wordpress_post_url?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          config_id?: string
          content?: string
          created_at?: string | null
          error_message?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
          wordpress_post_id?: string | null
          wordpress_post_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_auto_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_auto_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wordpress_auto_posts_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "wordpress_auto_post_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_sites: {
        Row: {
          app_password: string
          company_id: string
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          site_url: string
          updated_at: string | null
          username: string
        }
        Insert: {
          app_password: string
          company_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          site_url: string
          updated_at?: string | null
          username: string
        }
        Update: {
          app_password?: string
          company_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          site_url?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_documents: {
        Row: {
          company_id: string
          content: Json | null
          cover_image: string | null
          created_at: string
          created_by: string
          folder_id: string | null
          icon: string | null
          id: string
          is_favorite: boolean
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content?: Json | null
          cover_image?: string | null
          created_at?: string
          created_by: string
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: Json | null
          cover_image?: string | null
          created_at?: string
          created_by?: string
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_folders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          resource_id: string
          resource_type: string
          shared_by: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string
          resource_id: string
          resource_type: string
          shared_by: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          resource_id?: string
          resource_type?: string
          shared_by?: string
          shared_with_user_id?: string
        }
        Relationships: []
      }
      youtube_content_suggestions: {
        Row: {
          based_on_videos: Json | null
          client_id: string
          company_id: string
          created_at: string
          description: string | null
          estimated_engagement: string | null
          id: string
          status: string
          theme_category: string | null
          title: string
          updated_at: string
        }
        Insert: {
          based_on_videos?: Json | null
          client_id: string
          company_id: string
          created_at?: string
          description?: string | null
          estimated_engagement?: string | null
          id?: string
          status?: string
          theme_category?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          based_on_videos?: Json | null
          client_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          estimated_engagement?: string | null
          id?: string
          status?: string
          theme_category?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_content_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_content_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_monitored_channels: {
        Row: {
          channel_handle: string | null
          channel_id: string
          channel_name: string
          channel_url: string
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_analyzed_at: string | null
          subscriber_count: number | null
          thumbnail_url: string | null
          video_count: number | null
        }
        Insert: {
          channel_handle?: string | null
          channel_id: string
          channel_name: string
          channel_url: string
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_analyzed_at?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          video_count?: number | null
        }
        Update: {
          channel_handle?: string | null
          channel_id?: string
          channel_name?: string
          channel_url?: string
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_analyzed_at?: string | null
          subscriber_count?: number | null
          thumbnail_url?: string | null
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_monitored_channels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_monitored_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_script_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          script_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          script_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          script_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_script_messages_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "youtube_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_script_slides: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          script_id: string
          slide_order: number
          status: string
          title: string
          updated_at: string
          visual_suggestion: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          script_id: string
          slide_order?: number
          status?: string
          title: string
          updated_at?: string
          visual_suggestion?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          script_id?: string
          slide_order?: number
          status?: string
          title?: string
          updated_at?: string
          visual_suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_script_slides_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "youtube_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_scripts: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          reference_thumbnails: Json | null
          script_content: string
          status: string
          suggested_titles: Json | null
          suggestion_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_duration_target: number | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reference_thumbnails?: Json | null
          script_content?: string
          status?: string
          suggested_titles?: Json | null
          suggestion_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_duration_target?: number | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reference_thumbnails?: Json | null
          script_content?: string
          status?: string
          suggested_titles?: Json | null
          suggestion_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_duration_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_scripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_scripts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_scripts_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "youtube_content_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_thumbnail_configs: {
        Row: {
          client_id: string
          company_id: string
          created_at: string | null
          id: string
          model_photos: Json | null
          reference_thumbnails: Json | null
          style_notes: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string | null
          id?: string
          model_photos?: Json | null
          reference_thumbnails?: Json | null
          style_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          model_photos?: Json | null
          reference_thumbnails?: Json | null
          style_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_thumbnail_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_thumbnail_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_video_analyses: {
        Row: {
          ai_summary: string | null
          ai_theme_analysis: string | null
          analyzed_at: string
          channel_id: string
          client_id: string
          comment_count: number
          company_id: string
          description: string | null
          duration_seconds: number | null
          engagement_rate: number | null
          id: string
          like_count: number
          published_at: string
          thumbnail_url: string | null
          title: string
          video_id: string
          view_count: number
        }
        Insert: {
          ai_summary?: string | null
          ai_theme_analysis?: string | null
          analyzed_at?: string
          channel_id: string
          client_id: string
          comment_count?: number
          company_id: string
          description?: string | null
          duration_seconds?: number | null
          engagement_rate?: number | null
          id?: string
          like_count?: number
          published_at: string
          thumbnail_url?: string | null
          title: string
          video_id: string
          view_count?: number
        }
        Update: {
          ai_summary?: string | null
          ai_theme_analysis?: string | null
          analyzed_at?: string
          channel_id?: string
          client_id?: string
          comment_count?: number
          company_id?: string
          description?: string | null
          duration_seconds?: number | null
          engagement_rate?: number | null
          id?: string
          like_count?: number
          published_at?: string
          thumbnail_url?: string | null
          title?: string
          video_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "youtube_video_analyses_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_monitored_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_video_analyses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_video_analyses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_schedule_times: {
        Args: { executions: number }
        Returns: string[]
      }
      cleanup_cs_tv_realtime_events: { Args: never; Returns: undefined }
      create_daily_routine_executions: {
        Args: { p_company_id: string; p_date?: string }
        Returns: number
      }
      create_default_board: {
        Args: { p_board_name: string; p_workspace_id: string }
        Returns: string
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
      generate_client_dashboard_token: { Args: never; Returns: string }
      generate_crm_access_token: { Args: never; Returns: string }
      generate_cs_tv_dashboard_token: { Args: never; Returns: string }
      generate_funnel_public_token: { Args: never; Returns: string }
      generate_radar_tv_dashboard_token: { Args: never; Returns: string }
      generate_social_tv_dashboard_token: { Args: never; Returns: string }
      generate_tv_dashboard_token: { Args: never; Returns: string }
      get_cnae_summary: {
        Args: { p_company_id: string }
        Returns: {
          cnae_code: string
          cnae_description: string
          lead_count: number
        }[]
      }
      get_cnae_total: { Args: { p_company_id: string }; Returns: number }
      get_next_queue_user_and_rotate: {
        Args: { p_board_id: string }
        Returns: string
      }
      get_problematic_urls_for_tv: {
        Args: { p_company_id: string }
        Returns: {
          active_campaign_count: number
          client_avatar: string
          client_id: string
          client_name: string
          content_match_score: number
          url: string
          url_id: string
          validation_status: string
          validation_status_code: number
        }[]
      }
      get_urls_with_campaign_status: {
        Args: { p_company_id: string }
        Returns: {
          active_campaign_count: number
          has_active_campaign: boolean
          total_campaign_count: number
          url_id: string
        }[]
      }
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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_activity: {
        Args: {
          p_activity_type: string
          p_company_id: string
          p_description?: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      set_cs_tv_dashboard_token: {
        Args: { p_company_id: string; p_token: string }
        Returns: undefined
      }
      set_radar_tv_dashboard_token: {
        Args: { p_company_id: string; p_token: string }
        Returns: undefined
      }
      set_social_tv_dashboard_token: {
        Args: { p_company_id: string; p_token: string }
        Returns: undefined
      }
      set_tv_dashboard_token: {
        Args: { p_company_id: string; p_token: string }
        Returns: undefined
      }
      social_tv_featured_client_aggregates: {
        Args: { p_company_id: string }
        Returns: {
          avg_ctr: number
          campaigns_count: number
          client_id: string
          total_spend: number
        }[]
      }
      social_tv_performance_aggregates: {
        Args: { p_company_id: string }
        Returns: {
          avg_ctr: number
          total_conversions: number
          total_spend: number
        }[]
      }
      upsert_client_url: {
        Args: {
          p_client_id: string
          p_company_id: string
          p_domain: string
          p_source?: string
          p_url: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ad_generation_status: "pending" | "approved" | "rejected" | "published"
      ad_generation_type: "clone" | "concept" | "iteration"
      campaign_status: "active" | "paused" | "finished" | "deleted"
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
        | "geradores"
        | "whatsapp"
        | "radar-saude"
        | "rotinas"
        | "lead-intelligence"
        | "cs-cockpit"
        | "cs-carteira"
        | "cs-jornada"
        | "cs-acoes"
        | "cs-clientes"
        | "cs-tv"
        | "agendamento"
        | "automatizadores"
        | "social-tv"
        | "editor-imagens"
        | "planejador-conteudo"
        | "repositorio-criativos"
        | "alertas"
        | "tarefas-recorrentes"
        | "workspace"
        | "automacoes"
        | "campanhas-unificadas"
        | "marketing-tv"
        | "keyword-planner"
        | "radar-tv"
        | "relatorios-marketing"
        | "ver-quadros-outros"
      payment_type: "prepaid" | "postpaid"
      routine_category:
        | "saldo"
        | "campanhas"
        | "performance"
        | "criativos"
        | "alertas"
        | "relatorios"
        | "otimizacao"
        | "outros"
      routine_execution_status:
        | "pending"
        | "completed_on_time"
        | "completed_late"
        | "skipped"
      routine_frequency: "daily" | "weekly" | "monthly"
      task_origin: "dashboard" | "manual" | "automation"
      task_priority: "high" | "medium" | "low"
      task_status:
        | "todo"
        | "progress"
        | "review"
        | "done"
        | "waiting_approval"
        | "cancelled"
        | "blocked"
        | "paused"
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
      ad_generation_status: ["pending", "approved", "rejected", "published"],
      ad_generation_type: ["clone", "concept", "iteration"],
      campaign_status: ["active", "paused", "finished", "deleted"],
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
        "geradores",
        "whatsapp",
        "radar-saude",
        "rotinas",
        "lead-intelligence",
        "cs-cockpit",
        "cs-carteira",
        "cs-jornada",
        "cs-acoes",
        "cs-clientes",
        "cs-tv",
        "agendamento",
        "automatizadores",
        "social-tv",
        "editor-imagens",
        "planejador-conteudo",
        "repositorio-criativos",
        "alertas",
        "tarefas-recorrentes",
        "workspace",
        "automacoes",
        "campanhas-unificadas",
        "marketing-tv",
        "keyword-planner",
        "radar-tv",
        "relatorios-marketing",
        "ver-quadros-outros",
      ],
      payment_type: ["prepaid", "postpaid"],
      routine_category: [
        "saldo",
        "campanhas",
        "performance",
        "criativos",
        "alertas",
        "relatorios",
        "otimizacao",
        "outros",
      ],
      routine_execution_status: [
        "pending",
        "completed_on_time",
        "completed_late",
        "skipped",
      ],
      routine_frequency: ["daily", "weekly", "monthly"],
      task_origin: ["dashboard", "manual", "automation"],
      task_priority: ["high", "medium", "low"],
      task_status: [
        "todo",
        "progress",
        "review",
        "done",
        "waiting_approval",
        "cancelled",
        "blocked",
        "paused",
      ],
    },
  },
} as const
