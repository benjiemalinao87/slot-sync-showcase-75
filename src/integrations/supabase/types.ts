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
      city_routing_rules: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_active: boolean | null
          lead_source: string | null
          lead_status: string | null
          sales_rep_id: string
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          lead_source?: string | null
          lead_status?: string | null
          sales_rep_id: string
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          lead_source?: string | null
          lead_status?: string | null
          sales_rep_id?: string
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_routing_rules_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string | null
          id: string
          label: string
          options: string[] | null
          sugar_crm_field: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          options?: string[] | null
          sugar_crm_field: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          options?: string[] | null
          sugar_crm_field?: string
          type?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string
          api_response_data: Json | null
          api_response_id: string | null
          api_sent: boolean | null
          assigned_sales_rep_id: string | null
          assigned_to: string | null
          avg_electric_bill: string | null
          avg_kwh_consumption: string | null
          city: string
          construction_type: string | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          date_created: string
          email: string
          financing_method: string | null
          first_name: string
          floor_count: string | null
          form_data: Json | null
          goals: string | null
          has_bill: string | null
          has_ev: string | null
          has_hoa: string | null
          has_pool: string | null
          id: string
          installation_type: string | null
          interested_in_storage: string | null
          job_type: string | null
          last_name: string
          lead_source: string
          lead_status: string
          notes: string | null
          phone: string
          postal_code: string
          preferred_products: string | null
          primary_phone_type: string | null
          product_type: string
          project_readiness: string | null
          referral_source: string | null
          referrals: string | null
          roof_age: string | null
          roof_condition: string | null
          roof_shade: string | null
          roof_type: string | null
          routing_method: string | null
          state: string
          title_of_lead: string | null
          updated_at: string
          utility_provider: string | null
          webhook_sent: boolean | null
        }
        Insert: {
          address: string
          api_response_data?: Json | null
          api_response_id?: string | null
          api_sent?: boolean | null
          assigned_sales_rep_id?: string | null
          assigned_to?: string | null
          avg_electric_bill?: string | null
          avg_kwh_consumption?: string | null
          city: string
          construction_type?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          date_created?: string
          email: string
          financing_method?: string | null
          first_name: string
          floor_count?: string | null
          form_data?: Json | null
          goals?: string | null
          has_bill?: string | null
          has_ev?: string | null
          has_hoa?: string | null
          has_pool?: string | null
          id?: string
          installation_type?: string | null
          interested_in_storage?: string | null
          job_type?: string | null
          last_name: string
          lead_source: string
          lead_status: string
          notes?: string | null
          phone: string
          postal_code: string
          preferred_products?: string | null
          primary_phone_type?: string | null
          product_type: string
          project_readiness?: string | null
          referral_source?: string | null
          referrals?: string | null
          roof_age?: string | null
          roof_condition?: string | null
          roof_shade?: string | null
          roof_type?: string | null
          routing_method?: string | null
          state: string
          title_of_lead?: string | null
          updated_at?: string
          utility_provider?: string | null
          webhook_sent?: boolean | null
        }
        Update: {
          address?: string
          api_response_data?: Json | null
          api_response_id?: string | null
          api_sent?: boolean | null
          assigned_sales_rep_id?: string | null
          assigned_to?: string | null
          avg_electric_bill?: string | null
          avg_kwh_consumption?: string | null
          city?: string
          construction_type?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          date_created?: string
          email?: string
          financing_method?: string | null
          first_name?: string
          floor_count?: string | null
          form_data?: Json | null
          goals?: string | null
          has_bill?: string | null
          has_ev?: string | null
          has_hoa?: string | null
          has_pool?: string | null
          id?: string
          installation_type?: string | null
          interested_in_storage?: string | null
          job_type?: string | null
          last_name?: string
          lead_source?: string
          lead_status?: string
          notes?: string | null
          phone?: string
          postal_code?: string
          preferred_products?: string | null
          primary_phone_type?: string | null
          product_type?: string
          project_readiness?: string | null
          referral_source?: string | null
          referrals?: string | null
          roof_age?: string | null
          roof_condition?: string | null
          roof_shade?: string | null
          roof_type?: string | null
          routing_method?: string | null
          state?: string
          title_of_lead?: string | null
          updated_at?: string
          utility_provider?: string | null
          webhook_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_sales_rep_id_fkey"
            columns: ["assigned_sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          password: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          password?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      routing_logs: {
        Row: {
          assigned_sales_rep_id: string | null
          created_at: string
          id: string
          lead_city: string | null
          lead_email: string | null
          lead_source: string | null
          lead_status: string | null
          random_value: number | null
          routing_criteria: Json | null
          routing_method: string
        }
        Insert: {
          assigned_sales_rep_id?: string | null
          created_at?: string
          id?: string
          lead_city?: string | null
          lead_email?: string | null
          lead_source?: string | null
          lead_status?: string | null
          random_value?: number | null
          routing_criteria?: Json | null
          routing_method: string
        }
        Update: {
          assigned_sales_rep_id?: string | null
          created_at?: string
          id?: string
          lead_city?: string | null
          lead_email?: string | null
          lead_source?: string | null
          lead_status?: string | null
          random_value?: number | null
          routing_criteria?: Json | null
          routing_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_logs_assigned_sales_rep_id_fkey"
            columns: ["assigned_sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          percentage: number
          sales_rep_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          percentage: number
          sales_rep_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          percentage?: number
          sales_rep_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          bio: string | null
          calendar_url: string | null
          created_at: string
          email: string
          experience: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          calendar_url?: string | null
          created_at?: string
          email: string
          experience?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          calendar_url?: string | null
          created_at?: string
          email?: string
          experience?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sugar_crm_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_member_by_credentials: {
        Args: { p_email: string; p_password: string }
        Returns: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
          role: string
          updated_at: string
        }[]
      }
      manage_members: {
        Args: {
          p_operation: string
          p_id?: string
          p_email?: string
          p_name?: string
          p_password?: string
          p_role?: string
        }
        Returns: {
          created_at: string
          email: string
          id: string
          name: string | null
          password: string
          role: string
          updated_at: string
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
  public: {
    Enums: {},
  },
} as const
