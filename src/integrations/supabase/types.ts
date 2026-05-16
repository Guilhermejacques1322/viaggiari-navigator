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
      contacts: {
        Row: {
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
          created_at: string
          description: string | null
          destination_id: string
          id: string
          maps_url: string | null
          name: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          avg_rating?: number | null
          created_at?: string
          description?: string | null
          destination_id: string
          id?: string
          maps_url?: string | null
          name: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          avg_rating?: number | null
          created_at?: string
          description?: string | null
          destination_id?: string
          id?: string
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
      itinerary_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          address: string | null
          client_notes: string | null
          client_response:
            | Database["public"]["Enums"]["preroteiro_response"]
            | null
          created_at: string
          day_id: string
          description: string | null
          document_id: string | null
          has_ticket: boolean | null
          id: string
          in_preroteiro: boolean | null
          is_paid: boolean | null
          maps_url: string | null
          name: string
          position: number
          time: string | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          client_notes?: string | null
          client_response?:
            | Database["public"]["Enums"]["preroteiro_response"]
            | null
          created_at?: string
          day_id: string
          description?: string | null
          document_id?: string | null
          has_ticket?: boolean | null
          id?: string
          in_preroteiro?: boolean | null
          is_paid?: boolean | null
          maps_url?: string | null
          name: string
          position?: number
          time?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          address?: string | null
          client_notes?: string | null
          client_response?:
            | Database["public"]["Enums"]["preroteiro_response"]
            | null
          created_at?: string
          day_id?: string
          description?: string | null
          document_id?: string | null
          has_ticket?: boolean | null
          id?: string
          in_preroteiro?: boolean | null
          is_paid?: boolean | null
          maps_url?: string | null
          name?: string
          position?: number
          time?: string | null
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
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          installment: number
          notes: string | null
          paid_date: string | null
          status: Database["public"]["Enums"]["payment_status"]
          trip_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment: number
          notes?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment?: number
          notes?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string
        }
        Relationships: [
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
      quotes: {
        Row: {
          contact_id: string | null
          created_at: string
          daily_rate: number
          days: number
          destinations: string[] | null
          discount: number | null
          id: string
          notes: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          share_token: string | null
          total: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          daily_rate: number
          days: number
          destinations?: string[] | null
          discount?: number | null
          id?: string
          notes?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          share_token?: string | null
          total: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          daily_rate?: number
          days?: number
          destinations?: string[] | null
          discount?: number | null
          id?: string
          notes?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          share_token?: string | null
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
      trips: {
        Row: {
          contact_id: string
          created_at: string
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
      payment_status: "pending" | "paid"
      preroteiro_response: "want" | "skip"
      service_type: "package" | "assessoria" | "consultoria"
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
      payment_status: ["pending", "paid"],
      preroteiro_response: ["want", "skip"],
      service_type: ["package", "assessoria", "consultoria"],
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
