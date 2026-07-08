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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_partners: {
        Row: {
          activity_id: string
          cost: number | null
          created_at: string
          currency: string | null
          id: string
          included_in_package: boolean | null
          name: string
          notes: string | null
          partner_id: string | null
          role: string | null
        }
        Insert: {
          activity_id: string
          cost?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          included_in_package?: boolean | null
          name: string
          notes?: string | null
          partner_id?: string | null
          role?: string | null
        }
        Update: {
          activity_id?: string
          cost?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          included_in_package?: boolean | null
          name?: string
          notes?: string | null
          partner_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_partners_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "itinerary_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_partners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "operational_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_routes: {
        Row: {
          computed_at: string
          created_at: string
          driving_distance_m: number | null
          driving_duration_sec: number | null
          from_activity_id: string
          id: string
          to_activity_id: string
          transit_distance_m: number | null
          transit_duration_sec: number | null
          transit_is_estimate: boolean
          updated_at: string
          walking_distance_m: number | null
          walking_duration_sec: number | null
        }
        Insert: {
          computed_at?: string
          created_at?: string
          driving_distance_m?: number | null
          driving_duration_sec?: number | null
          from_activity_id: string
          id?: string
          to_activity_id: string
          transit_distance_m?: number | null
          transit_duration_sec?: number | null
          transit_is_estimate?: boolean
          updated_at?: string
          walking_distance_m?: number | null
          walking_duration_sec?: number | null
        }
        Update: {
          computed_at?: string
          created_at?: string
          driving_distance_m?: number | null
          driving_duration_sec?: number | null
          from_activity_id?: string
          id?: string
          to_activity_id?: string
          transit_distance_m?: number | null
          transit_duration_sec?: number | null
          transit_is_estimate?: boolean
          updated_at?: string
          walking_distance_m?: number | null
          walking_duration_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_routes_from_activity_id_fkey"
            columns: ["from_activity_id"]
            isOneToOne: false
            referencedRelation: "itinerary_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_routes_to_activity_id_fkey"
            columns: ["to_activity_id"]
            isOneToOne: false
            referencedRelation: "itinerary_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          access_password: string | null
          created_at: string
          destinations_of_interest: string[] | null
          email: string
          full_name: string
          id: string
          internal_notes: string | null
          phone: string | null
          service_interest: Database["public"]["Enums"]["service_type"][] | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"]
          travel_period: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_password?: string | null
          created_at?: string
          destinations_of_interest?: string[] | null
          email: string
          full_name: string
          id?: string
          internal_notes?: string | null
          phone?: string | null
          service_interest?:
            | Database["public"]["Enums"]["service_type"][]
            | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          travel_period?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_password?: string | null
          created_at?: string
          destinations_of_interest?: string[] | null
          email?: string
          full_name?: string
          id?: string
          internal_notes?: string | null
          phone?: string | null
          service_interest?:
            | Database["public"]["Enums"]["service_type"][]
            | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          travel_period?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      destination_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          address: string | null
          avg_rating: number | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          destination_id: string
          id: string
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          name: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          avg_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          destination_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          avg_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_activities_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          country: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          name: string
          tags: string[] | null
          tips: string | null
        }
        Insert: {
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name: string
          tags?: string[] | null
          tips?: string | null
        }
        Update: {
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          tags?: string[] | null
          tips?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          activity_id: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          day_id: string | null
          event_date: string | null
          id: string
          name: string
          notes: string | null
          storage_path: string
          trip_id: string
        }
        Insert: {
          activity_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          day_id?: string | null
          event_date?: string | null
          id?: string
          name: string
          notes?: string | null
          storage_path: string
          trip_id: string
        }
        Update: {
          activity_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          day_id?: string | null
          event_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          storage_path?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "itinerary_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_ai_ideas: {
        Row: {
          body: string
          created_at: string
          id: string
          is_cross_trend: boolean | null
          profile_id: string | null
          suggested_media_type:
            | Database["public"]["Enums"]["ig_media_type"]
            | null
          suggested_networks: string[] | null
          title: string
          used_post_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_cross_trend?: boolean | null
          profile_id?: string | null
          suggested_media_type?:
            | Database["public"]["Enums"]["ig_media_type"]
            | null
          suggested_networks?: string[] | null
          title: string
          used_post_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_cross_trend?: boolean | null
          profile_id?: string | null
          suggested_media_type?:
            | Database["public"]["Enums"]["ig_media_type"]
            | null
          suggested_networks?: string[] | null
          title?: string
          used_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_ai_ideas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "instagram_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_ai_ideas_used_post_id_fkey"
            columns: ["used_post_id"]
            isOneToOne: false
            referencedRelation: "marketing_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          caption: string | null
          comments: number | null
          created_at: string
          external_id: string
          hashtags: string[] | null
          id: string
          likes: number | null
          media_type: Database["public"]["Enums"]["ig_media_type"] | null
          permalink: string | null
          posted_at: string | null
          profile_id: string
          thumbnail_url: string | null
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          created_at?: string
          external_id: string
          hashtags?: string[] | null
          id?: string
          likes?: number | null
          media_type?: Database["public"]["Enums"]["ig_media_type"] | null
          permalink?: string | null
          posted_at?: string | null
          profile_id: string
          thumbnail_url?: string | null
        }
        Update: {
          caption?: string | null
          comments?: number | null
          created_at?: string
          external_id?: string
          hashtags?: string[] | null
          id?: string
          likes?: number | null
          media_type?: Database["public"]["Enums"]["ig_media_type"] | null
          permalink?: string | null
          posted_at?: string | null
          profile_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "instagram_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          followers: number | null
          id: string
          is_private: boolean | null
          last_ai_summary: string | null
          last_ai_summary_at: string | null
          last_scraped_at: string | null
          niche_note: string | null
          posts_count: number | null
          profile_pic_url: string | null
          updated_at: string
          username: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers?: number | null
          id?: string
          is_private?: boolean | null
          last_ai_summary?: string | null
          last_ai_summary_at?: string | null
          last_scraped_at?: string | null
          niche_note?: string | null
          posts_count?: number | null
          profile_pic_url?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers?: number | null
          id?: string
          is_private?: boolean | null
          last_ai_summary?: string | null
          last_ai_summary_at?: string | null
          last_scraped_at?: string | null
          niche_note?: string | null
          posts_count?: number | null
          profile_pic_url?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      itinerary_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          address: string | null
          client_notes: string | null
          client_response:
            | Database["public"]["Enums"]["preroteiro_response"]
            | null
          created_at: string
          curiosities: string | null
          currency: string | null
          day_id: string
          description: string | null
          document_id: string | null
          estimated_cost: number | null
          has_ticket: boolean | null
          id: string
          image_url: string | null
          in_preroteiro: boolean | null
          is_paid: boolean | null
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          name: string
          position: number
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          time: string | null
          transport_mode_to_next:
            | Database["public"]["Enums"]["transport_mode"]
            | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          client_notes?: string | null
          client_response?:
            | Database["public"]["Enums"]["preroteiro_response"]
            | null
          created_at?: string
          curiosities?: string | null
          currency?: string | null
          day_id: string
          description?: string | null
          document_id?: string | null
          estimated_cost?: number | null
          has_ticket?: boolean | null
          id?: string
          image_url?: string | null
          in_preroteiro?: boolean | null
          is_paid?: boolean | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name: string
          position?: number
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          time?: string | null
          transport_mode_to_next?:
            | Database["public"]["Enums"]["transport_mode"]
            | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          client_notes?: string | null
          client_response?:
            | Database["public"]["Enums"]["preroteiro_response"]
            | null
          created_at?: string
          curiosities?: string | null
          currency?: string | null
          day_id?: string
          description?: string | null
          document_id?: string | null
          estimated_cost?: number | null
          has_ticket?: boolean | null
          id?: string
          image_url?: string | null
          in_preroteiro?: boolean | null
          is_paid?: boolean | null
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
          position?: number
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          time?: string | null
          transport_mode_to_next?:
            | Database["public"]["Enums"]["transport_mode"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_activities_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          created_at: string
          date: string | null
          day_number: number
          description: string | null
          id: string
          title: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_number: number
          description?: string | null
          id?: string
          title?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          day_number?: number
          description?: string | null
          id?: string
          title?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contact_id: string | null
          created_at: string
          destination: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          service_interest: string[] | null
          travel_period: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          destination?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          service_interest?: string[] | null
          travel_period?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          destination?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          service_interest?: string[] | null
          travel_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_posts: {
        Row: {
          caption: string | null
          created_at: string
          done_at: string | null
          id: string
          media_notes: string | null
          media_type: Database["public"]["Enums"]["marketing_media_type"]
          media_url: string | null
          networks: string[]
          publish_at: string
          status: Database["public"]["Enums"]["marketing_post_status"]
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          done_at?: string | null
          id?: string
          media_notes?: string | null
          media_type?: Database["public"]["Enums"]["marketing_media_type"]
          media_url?: string | null
          networks?: string[]
          publish_at: string
          status?: Database["public"]["Enums"]["marketing_post_status"]
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          done_at?: string | null
          id?: string
          media_notes?: string | null
          media_type?: Database["public"]["Enums"]["marketing_media_type"]
          media_url?: string | null
          networks?: string[]
          publish_at?: string
          status?: Database["public"]["Enums"]["marketing_post_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          activity_id: string | null
          body: string | null
          created_at: string
          id: string
          read: boolean | null
          scheduled_for: string
          sent: boolean | null
          title: string
          trip_id: string
        }
        Insert: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean | null
          scheduled_for: string
          sent?: boolean | null
          title: string
          trip_id: string
        }
        Update: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean | null
          scheduled_for?: string
          sent?: boolean | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "itinerary_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_partners: {
        Row: {
          active: boolean | null
          city: string | null
          contact: string | null
          country: string | null
          created_at: string
          currency: string | null
          default_cost: number | null
          id: string
          name: string
          notes: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          contact?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          default_cost?: number | null
          id?: string
          name: string
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          city?: string | null
          contact?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          default_cost?: number | null
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_products: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          product_name: string
          purchase_url: string
          store_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          product_name: string
          purchase_url: string
          store_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          product_name?: string
          purchase_url?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          installment: number
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          trip_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment?: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          closed_at: string | null
          contact_id: string | null
          created_at: string
          daily_rate: number
          days: number
          destinations: string[] | null
          discount: number | null
          follow_up_at: string | null
          id: string
          lost_reason: string | null
          notes: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          share_token: string | null
          status: Database["public"]["Enums"]["quote_status"]
          total: number
        }
        Insert: {
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          daily_rate: number
          days: number
          destinations?: string[] | null
          discount?: number | null
          follow_up_at?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          share_token?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total: number
        }
        Update: {
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          daily_rate?: number
          days?: number
          destinations?: string[] | null
          discount?: number | null
          follow_up_at?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          share_token?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          activity_id: string | null
          comment: string | null
          created_at: string
          destination_activity_id: string | null
          id: string
          location_name: string | null
          rating: number
          trip_id: string
        }
        Insert: {
          activity_id?: string | null
          comment?: string | null
          created_at?: string
          destination_activity_id?: string | null
          id?: string
          location_name?: string | null
          rating: number
          trip_id: string
        }
        Update: {
          activity_id?: string | null
          comment?: string | null
          created_at?: string
          destination_activity_id?: string | null
          id?: string
          location_name?: string | null
          rating?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "itinerary_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trip_utilities: {
        Row: {
          address: string | null
          created_at: string
          id: string
          kind: string
          maps_url: string | null
          name: string
          position: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          kind: string
          maps_url?: string | null
          name: string
          position?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          kind?: string
          maps_url?: string | null
          name?: string
          position?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_utilities_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          contact_id: string
          created_at: string
          default_transport_mode: Database["public"]["Enums"]["transport_mode"]
          destinations: string[] | null
          end_date: string | null
          id: string
          is_international: boolean | null
          notes: string | null
          preroteiro_mode: boolean | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          title: string
          total_value: number | null
          updated_at: string
          visible_to_client: boolean | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          default_transport_mode?: Database["public"]["Enums"]["transport_mode"]
          destinations?: string[] | null
          end_date?: string | null
          id?: string
          is_international?: boolean | null
          notes?: string | null
          preroteiro_mode?: boolean | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title: string
          total_value?: number | null
          updated_at?: string
          visible_to_client?: boolean | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          default_transport_mode?: Database["public"]["Enums"]["transport_mode"]
          destinations?: string[] | null
          end_date?: string | null
          id?: string
          is_international?: boolean | null
          notes?: string | null
          preroteiro_mode?: boolean | null
          service_type?: Database["public"]["Enums"]["service_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string
          total_value?: number | null
          updated_at?: string
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "passeio"
        | "refeicao"
        | "transporte"
        | "hospedagem"
        | "livre"
      app_role: "admin" | "client"
      contact_status:
        | "lead"
        | "negotiating"
        | "active_client"
        | "completed"
        | "inactive"
      document_category: "flight" | "train" | "hotel" | "ticket" | "other"
      ig_media_type: "photo" | "video" | "carousel" | "reel"
      marketing_media_type: "photo" | "video"
      marketing_post_status: "scheduled" | "done"
      payment_status: "pending" | "paid"
      preroteiro_response: "want" | "skip"
      quote_status: "sent" | "follow_up" | "lost" | "closed"
      service_type: "package" | "assessoria" | "consultoria"
      transport_mode: "driving" | "transit" | "walking" | "hidden"
      trip_status:
        | "quote_sent"
        | "contract_signed"
        | "building"
        | "delivered"
        | "in_progress"
        | "completed"
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
      activity_type: [
        "passeio",
        "refeicao",
        "transporte",
        "hospedagem",
        "livre",
      ],
      app_role: ["admin", "client"],
      contact_status: [
        "lead",
        "negotiating",
        "active_client",
        "completed",
        "inactive",
      ],
      document_category: ["flight", "train", "hotel", "ticket", "other"],
      ig_media_type: ["photo", "video", "carousel", "reel"],
      marketing_media_type: ["photo", "video"],
      marketing_post_status: ["scheduled", "done"],
      payment_status: ["pending", "paid"],
      preroteiro_response: ["want", "skip"],
      quote_status: ["sent", "follow_up", "lost", "closed"],
      service_type: ["package", "assessoria", "consultoria"],
      transport_mode: ["driving", "transit", "walking", "hidden"],
      trip_status: [
        "quote_sent",
        "contract_signed",
        "building",
        "delivered",
        "in_progress",
        "completed",
      ],
    },
  },
} as const
