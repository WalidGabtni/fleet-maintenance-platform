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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_hidden_modules: {
        Row: {
          created_at: string
          module_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          module_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          module_key?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_path: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          description: string | null
          key: string
          name: string
        }
        Insert: {
          description?: string | null
          key: string
          name: string
        }
        Update: {
          description?: string | null
          key?: string
          name?: string
        }
        Relationships: []
      }
      inspection_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          interval_days: number
          interval_km: number | null
          name: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          interval_days: number
          interval_km?: number | null
          name: string
          tenant_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          interval_days?: number
          interval_km?: number | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_at: string | null
          grand_total: number
          id: string
          invoice_number: string
          issued_at: string | null
          labor_hours: number
          labor_rate: number
          labor_total: number
          paid_at: string | null
          parts_total: number
          status: Database["public"]["Enums"]["invoice_status"]
          tax_rate: number
          tax_total: number
          tenant_id: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          grand_total: number
          id?: string
          invoice_number?: string
          issued_at?: string | null
          labor_hours: number
          labor_rate: number
          labor_total: number
          paid_at?: string | null
          parts_total: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_rate: number
          tax_total: number
          tenant_id?: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          grand_total?: number
          id?: string
          invoice_number?: string
          issued_at?: string | null
          labor_hours?: number
          labor_rate?: number
          labor_total?: number
          paid_at?: string | null
          parts_total?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_rate?: number
          tax_total?: number
          tenant_id?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: true
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          interval_days: number | null
          interval_mileage: number | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          interval_days?: number | null
          interval_mileage?: number | null
          name: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          interval_days?: number | null
          interval_mileage?: number | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          part_number: string | null
          photo_url: string | null
          quantity_on_hand: number
          tenant_id: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          part_number?: string | null
          photo_url?: string | null
          quantity_on_hand?: number
          tenant_id?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          part_number?: string | null
          photo_url?: string | null
          quantity_on_hand?: number
          tenant_id?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_platform_admin: boolean
          role: string
          tenant_id: string
          trade: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          role?: string
          tenant_id: string
          trade?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          role?: string
          tenant_id?: string
          trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          created_at: string
          currency: string
          hourly_labor_rate: number
          id: string
          shop_address: string | null
          shop_email: string | null
          shop_name: string | null
          shop_phone: string | null
          tax_rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          hourly_labor_rate?: number
          id?: string
          shop_address?: string | null
          shop_email?: string | null
          shop_name?: string | null
          shop_phone?: string | null
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          hourly_labor_rate?: number
          id?: string
          shop_address?: string | null
          shop_email?: string | null
          shop_name?: string | null
          shop_phone?: string | null
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          enabled: boolean
          feature_key: string
          tenant_id: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          tenant_id: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      vehicle_maintenance_schedules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          inspection_category_id: string | null
          last_done_at: string | null
          last_done_mileage: number | null
          next_due_override: string | null
          template_id: string | null
          tenant_id: string
          vehicle_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          inspection_category_id?: string | null
          last_done_at?: string | null
          last_done_mileage?: number | null
          next_due_override?: string | null
          template_id?: string | null
          tenant_id?: string
          vehicle_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          inspection_category_id?: string | null
          last_done_at?: string | null
          last_done_mileage?: number | null
          next_due_override?: string | null
          template_id?: string | null
          tenant_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_schedules_inspection_category_id_fkey"
            columns: ["inspection_category_id"]
            isOneToOne: false
            referencedRelation: "inspection_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          created_at: string
          customer_id: string
          id: string
          inspection_category_id: string | null
          license_plate: string | null
          make: string | null
          mileage: number | null
          model: string | null
          tenant_id: string
          unit_number: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_id: string
          id?: string
          inspection_category_id?: string | null
          license_plate?: string | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          tenant_id?: string
          unit_number?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_id?: string
          id?: string
          inspection_category_id?: string | null
          license_plate?: string | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          tenant_id?: string
          unit_number?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_inspection_category_id_fkey"
            columns: ["inspection_category_id"]
            isOneToOne: false
            referencedRelation: "inspection_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          technician_id: string | null
          tenant_id: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          technician_id?: string | null
          tenant_id?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          technician_id?: string | null
          tenant_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_notes_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_notes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          created_at: string
          id: string
          part_id: string
          quantity_used: number
          tenant_id: string
          unit_price_at_time: number
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          part_id: string
          quantity_used: number
          tenant_id?: string
          unit_price_at_time: number
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string
          quantity_used?: number
          tenant_id?: string
          unit_price_at_time?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          closed_at: string | null
          created_at: string
          diagnosis: string | null
          id: string
          labor_hours: number | null
          maintenance_schedule_id: string | null
          mileage_at_service: number | null
          opened_at: string
          reported_issue: string
          status: Database["public"]["Enums"]["work_order_status"]
          technician_id: string | null
          tenant_id: string
          updated_at: string
          vehicle_id: string
          work_performed: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          labor_hours?: number | null
          maintenance_schedule_id?: string | null
          mileage_at_service?: number | null
          opened_at?: string
          reported_issue: string
          status?: Database["public"]["Enums"]["work_order_status"]
          technician_id?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id: string
          work_performed?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          labor_hours?: number | null
          maintenance_schedule_id?: string | null
          mileage_at_service?: number | null
          opened_at?: string
          reported_issue?: string
          status?: Database["public"]["Enums"]["work_order_status"]
          technician_id?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "vehicle_maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "vehicle_maintenance_status"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "work_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vehicle_maintenance_status: {
        Row: {
          current_mileage: number | null
          inspection_category_id: string | null
          interval_days: number | null
          interval_mileage: number | null
          is_due: boolean | null
          is_due_soon: boolean | null
          last_done_at: string | null
          last_done_mileage: number | null
          next_due_date: string | null
          next_due_mileage: number | null
          next_due_override: string | null
          schedule_id: string | null
          template_description: string | null
          template_id: string | null
          template_name: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_schedules_inspection_category_id_fkey"
            columns: ["inspection_category_id"]
            isOneToOne: false
            referencedRelation: "inspection_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_part_stock_delta: {
        Args: { delta: number; target_part_id: string }
        Returns: undefined
      }
      current_role: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      promote_new_tenant_admin: {
        Args: { target_profile_id: string; target_tenant_id: string }
        Returns: undefined
      }
      report_parts_usage: {
        Args: { end_date: string; start_date: string }
        Returns: {
          part_id: string
          part_name: string
          part_number: string
          total_quantity: number
          total_spend: number
        }[]
      }
      report_revenue_overview: {
        Args: { end_date: string; start_date: string }
        Returns: {
          total_invoiced: number
          total_outstanding: number
          total_paid: number
        }[]
      }
      report_technician_productivity: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_labor_hours: number
          avg_turnaround_hours: number
          completed_count: number
          technician_id: string
          technician_name: string
        }[]
      }
      report_turnaround_by_status: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_dwell_hours: number
          status: Database["public"]["Enums"]["work_order_status"]
          work_order_count: number
        }[]
      }
      report_vehicle_cost_history: {
        Args: { end_date: string; start_date: string }
        Returns: {
          customer_name: string
          make: string
          model: string
          total_cost: number
          total_labor: number
          total_parts: number
          unit_number: string
          vehicle_id: string
          work_order_count: number
        }[]
      }
      tenant_has_feature: { Args: { p_feature_key: string }; Returns: boolean }
    }
    Enums: {
      invoice_status: "draft" | "sent" | "paid" | "overdue"
      work_order_status:
        | "open"
        | "in_progress"
        | "waiting_on_parts"
        | "completed"
        | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invoice_status: ["draft", "sent", "paid", "overdue"],
      work_order_status: [
        "open",
        "in_progress",
        "waiting_on_parts",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
