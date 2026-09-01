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
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          owner_id: string
          preferred_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          owner_id: string
          preferred_time?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          owner_id?: string
          preferred_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_drafts: {
        Row: {
          created_at: string
          draft: Json
          id: string
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft?: Json
          id?: string
          step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft?: Json
          id?: string
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_votes: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_votes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          amenities: string[]
          area: string
          available_from: string
          balconies: number
          bathrooms: number
          bhk: number
          city: string
          community_verified: boolean
          contact_phone: string | null
          created_at: string
          deposit: number
          description: string
          facing: string
          floor: number
          furnishing: string
          house_type: string
          id: string
          it_corridor_km: number
          lat: number
          lng: number
          maintenance: number
          metro_km: number
          negotiable: boolean
          owner_id: string | null
          owner_phone_norm: string | null
          owner_verified: boolean
          parking: string
          photos: string[]
          rent: number
          source: string
          sqft: number
          status: string
          suspicious_price: boolean
          tenant: string
          title: string
          total_floors: number
          updated_at: string
          votes: number
        }
        Insert: {
          amenities?: string[]
          area: string
          available_from?: string
          balconies?: number
          bathrooms?: number
          bhk?: number
          city?: string
          community_verified?: boolean
          contact_phone?: string | null
          created_at?: string
          deposit?: number
          description?: string
          facing?: string
          floor?: number
          furnishing?: string
          house_type?: string
          id?: string
          it_corridor_km?: number
          lat: number
          lng: number
          maintenance?: number
          metro_km?: number
          negotiable?: boolean
          owner_id?: string | null
          owner_phone_norm?: string | null
          owner_verified?: boolean
          parking?: string
          photos?: string[]
          rent: number
          source?: string
          sqft?: number
          status?: string
          suspicious_price?: boolean
          tenant?: string
          title: string
          total_floors?: number
          updated_at?: string
          votes?: number
        }
        Update: {
          amenities?: string[]
          area?: string
          available_from?: string
          balconies?: number
          bathrooms?: number
          bhk?: number
          city?: string
          community_verified?: boolean
          contact_phone?: string | null
          created_at?: string
          deposit?: number
          description?: string
          facing?: string
          floor?: number
          furnishing?: string
          house_type?: string
          id?: string
          it_corridor_km?: number
          lat?: number
          lng?: number
          maintenance?: number
          metro_km?: number
          negotiable?: boolean
          owner_id?: string | null
          owner_phone_norm?: string | null
          owner_verified?: boolean
          parking?: string
          photos?: string[]
          rent?: number
          source?: string
          sqft?: number
          status?: string
          suspicious_price?: boolean
          tenant?: string
          title?: string
          total_floors?: number
          updated_at?: string
          votes?: number
        }
        Relationships: []
      }
      login_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          listing_id: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "saved_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          points: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          points?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          points?: number
        }
        Relationships: []
      }
      saved_alerts: {
        Row: {
          amenities: string[]
          bhk: number[]
          created_at: string
          daily_digest: boolean
          furnishing: string[]
          id: string
          instant: boolean
          max_rent: number
          name: string
          owner_only: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amenities?: string[]
          bhk?: number[]
          created_at?: string
          daily_digest?: boolean
          furnishing?: string[]
          id?: string
          instant?: boolean
          max_rent?: number
          name?: string
          owner_only?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amenities?: string[]
          bhk?: number[]
          created_at?: string
          daily_digest?: boolean
          furnishing?: string[]
          id?: string
          instant?: boolean
          max_rent?: number
          name?: string
          owner_only?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verified_phones: {
        Row: {
          created_at: string
          id: string
          phone: string
          user_id: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          user_id: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_display_names: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      normalize_in_phone: { Args: { _phone: string }; Returns: string }
      send_daily_alert_digests: { Args: never; Returns: undefined }
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
