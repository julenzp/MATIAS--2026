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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          last_access_at: string | null
          role: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          role?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          role?: string
        }
        Relationships: []
      }
      access_logs: {
        Row: {
          created_at: string
          id: string
          ip_hint: string | null
          profile_type: string
          user_agent: string | null
          user_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hint?: string | null
          profile_type: string
          user_agent?: string | null
          user_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hint?: string | null
          profile_type?: string
          user_agent?: string | null
          user_code?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          page_name: string
          user_code: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          page_name: string
          user_code: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          page_name?: string
          user_code?: string
        }
        Relationships: []
      }
      admin_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          email_pattern: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_pattern: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_pattern?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      app_state: {
        Row: {
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          actual_time: string | null
          created_at: string
          id: string
          record_date: string
          route: string | null
          scheduled_time: string
          status: string
          trip_id: string
          updated_at: string
          user_name: string
        }
        Insert: {
          actual_time?: string | null
          created_at?: string
          id?: string
          record_date?: string
          route?: string | null
          scheduled_time: string
          status?: string
          trip_id: string
          updated_at?: string
          user_name: string
        }
        Update: {
          actual_time?: string | null
          created_at?: string
          id?: string
          record_date?: string
          route?: string | null
          scheduled_time?: string
          status?: string
          trip_id?: string
          updated_at?: string
          user_name?: string
        }
        Relationships: []
      }
      company_phones: {
        Row: {
          bus: string | null
          created_at: string
          id: string
          is_active: boolean
          linea: string | null
          nombre: string
          puesto: string
          ruta: string
          telefono: string | null
        }
        Insert: {
          bus?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          linea?: string | null
          nombre: string
          puesto: string
          ruta: string
          telefono?: string | null
        }
        Update: {
          bus?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          linea?: string | null
          nombre?: string
          puesto?: string
          ruta?: string
          telefono?: string | null
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          created_at: string
          csv_content: string
          id: string
          record_count: number | null
          report_date: string
          summary: Json | null
        }
        Insert: {
          created_at?: string
          csv_content: string
          id?: string
          record_count?: number | null
          report_date: string
          summary?: Json | null
        }
        Update: {
          created_at?: string
          csv_content?: string
          id?: string
          record_count?: number | null
          report_date?: string
          summary?: Json | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      erbi_audit_log: {
        Row: {
          created_at: string
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          id: string
          operacion: string
          procesado: boolean
          tabla_afectada: string
          usuario_nombre: string | null
          usuario_perfil: string | null
        }
        Insert: {
          created_at?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          operacion: string
          procesado?: boolean
          tabla_afectada: string
          usuario_nombre?: string | null
          usuario_perfil?: string | null
        }
        Update: {
          created_at?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          id?: string
          operacion?: string
          procesado?: boolean
          tabla_afectada?: string
          usuario_nombre?: string | null
          usuario_perfil?: string | null
        }
        Relationships: []
      }
      erbi_ia_corrections: {
        Row: {
          correct_behavior: string
          correction_type: string
          created_at: string
          created_by: string | null
          example_correct_response: string | null
          example_query: string | null
          id: string
          is_active: boolean
          trigger_pattern: string | null
        }
        Insert: {
          correct_behavior: string
          correction_type?: string
          created_at?: string
          created_by?: string | null
          example_correct_response?: string | null
          example_query?: string | null
          id?: string
          is_active?: boolean
          trigger_pattern?: string | null
        }
        Update: {
          correct_behavior?: string
          correction_type?: string
          created_at?: string
          created_by?: string | null
          example_correct_response?: string | null
          example_query?: string | null
          id?: string
          is_active?: boolean
          trigger_pattern?: string | null
        }
        Relationships: []
      }
      erbi_ia_logs: {
        Row: {
          ai_evaluation: string | null
          ai_evaluation_score: number | null
          created_at: string | null
          detected_intent: string | null
          id: string
          query_text: string
          response_text: string | null
          route_context: string | null
          schema_requested: boolean | null
          tokens_used: number | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          ai_evaluation?: string | null
          ai_evaluation_score?: number | null
          created_at?: string | null
          detected_intent?: string | null
          id?: string
          query_text: string
          response_text?: string | null
          route_context?: string | null
          schema_requested?: boolean | null
          tokens_used?: number | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          ai_evaluation?: string | null
          ai_evaluation_score?: number | null
          created_at?: string | null
          detected_intent?: string | null
          id?: string
          query_text?: string
          response_text?: string | null
          route_context?: string | null
          schema_requested?: boolean | null
          tokens_used?: number | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      incidencias: {
        Row: {
          creado_por: string
          created_at: string | null
          estado: string
          id: string
          leido_at: string | null
          leido_por: string | null
          mensaje: string
          respondido_at: string | null
          respondido_por: string | null
          respuesta: string | null
          route: string
        }
        Insert: {
          creado_por: string
          created_at?: string | null
          estado?: string
          id?: string
          leido_at?: string | null
          leido_por?: string | null
          mensaje: string
          respondido_at?: string | null
          respondido_por?: string | null
          respuesta?: string | null
          route: string
        }
        Update: {
          creado_por?: string
          created_at?: string | null
          estado?: string
          id?: string
          leido_at?: string | null
          leido_por?: string | null
          mensaje?: string
          respondido_at?: string | null
          respondido_por?: string | null
          respuesta?: string | null
          route?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          notification_id: string
          read_at: string
          route: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          notification_id: string
          read_at?: string
          route: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          notification_id?: string
          read_at?: string
          route?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "route_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      passenger_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          passenger_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          passenger_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          passenger_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "passenger_notes_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passenger_notes_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      passengers: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          registration_number: number
          route: string
          trip_type: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          registration_number?: number
          route?: string
          trip_type?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          registration_number?: number
          route?: string
          trip_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          last_notified_date: string | null
          p256dh: string
          route_name: string
          token: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          last_notified_date?: string | null
          p256dh: string
          route_name?: string
          token: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_notified_date?: string | null
          p256dh?: string
          route_name?: string
          token?: string
        }
        Relationships: []
      }
      report_settings: {
        Row: {
          created_at: string
          email_recipient: string | null
          id: string
          resend_api_key_configured: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_recipient?: string | null
          id?: string
          resend_api_key_configured?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_recipient?: string | null
          id?: string
          resend_api_key_configured?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      route_incidents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          incident_date: string
          message: string
          route: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_date?: string
          message: string
          route: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_date?: string
          message?: string
          route?: string
        }
        Relationships: []
      }
      route_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: string
          route: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: string
          route: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: string
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      rutas: {
        Row: {
          activo: boolean | null
          centro: string | null
          created_at: string | null
          estado: string | null
          id: string
          nombre: string
          route_key: string | null
          turno: string | null
        }
        Insert: {
          activo?: boolean | null
          centro?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nombre: string
          route_key?: string | null
          turno?: string | null
        }
        Update: {
          activo?: boolean | null
          centro?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nombre?: string
          route_key?: string | null
          turno?: string | null
        }
        Relationships: []
      }
      schedule_trips: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          passenger_id: string | null
          pickup_location: string | null
          route: string
          schedule_section: string
          scheduled_time: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          passenger_id?: string | null
          pickup_location?: string | null
          route?: string
          schedule_section: string
          scheduled_time: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          passenger_id?: string | null
          pickup_location?: string | null
          route?: string
          schedule_section?: string
          scheduled_time?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_trips_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_trips_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stop_geocodes: {
        Row: {
          id: string
          lat: number | null
          lng: number | null
          normalized_key: string
          pickup_location: string
          route_name: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          lat?: number | null
          lng?: number | null
          normalized_key: string
          pickup_location: string
          route_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lat?: number | null
          lng?: number | null
          normalized_key?: string
          pickup_location?: string
          route_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tracking_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_access_at: string | null
          passenger_id: string | null
          passenger_name: string | null
          phone_primary: string | null
          phone_requires_selection: boolean
          route_name: string
          token: string
          whatsapp_notify: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          passenger_id?: string | null
          passenger_name?: string | null
          phone_primary?: string | null
          phone_requires_selection?: boolean
          route_name?: string
          token: string
          whatsapp_notify?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          passenger_id?: string | null
          passenger_name?: string | null
          phone_primary?: string | null
          phone_requires_selection?: boolean
          route_name?: string
          token?: string
          whatsapp_notify?: boolean | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_tokens_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_tokens_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers_public"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      vehicle_location: {
        Row: {
          created_at: string
          id: string
          lat: number
          lng: number
          route_name: string
          source_device: string | null
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat: number
          lng: number
          route_name?: string
          source_device?: string | null
          timestamp?: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          route_name?: string
          source_device?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      whatsapp_log: {
        Row: {
          created_at: string | null
          delay_minutes: number | null
          eta_minutes: number | null
          id: string
          message_body: string
          message_type: string
          passenger_name: string
          phone_sent_to: string
          route_name: string
          status: string | null
          tracking_token_id: string | null
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string | null
          delay_minutes?: number | null
          eta_minutes?: number | null
          id?: string
          message_body: string
          message_type: string
          passenger_name: string
          phone_sent_to: string
          route_name: string
          status?: string | null
          tracking_token_id?: string | null
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string | null
          delay_minutes?: number | null
          eta_minutes?: number | null
          id?: string
          message_body?: string
          message_type?: string
          passenger_name?: string
          phone_sent_to?: string
          route_name?: string
          status?: string | null
          tracking_token_id?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_log_tracking_token_id_fkey"
            columns: ["tracking_token_id"]
            isOneToOne: false
            referencedRelation: "tracking_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      passengers_public: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          location: string | null
          name: string | null
          registration_number: number | null
          route: string | null
          trip_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string | null
          registration_number?: number | null
          route?: string | null
          trip_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string | null
          registration_number?: number | null
          route?: string | null
          trip_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_passenger_contact_by_name: {
        Args: { p_name: string }
        Returns: {
          contact_phone: string
        }[]
      }
      get_passenger_contacts: {
        Args: { p_route: string }
        Returns: {
          contact_name: string
          contact_phone: string
          id: string
          name: string
          route: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reorder_schedule_trips: {
        Args: { p_route?: string; p_section: string }
        Returns: undefined
      }
      validate_tracking_token: {
        Args: { token_value: string }
        Returns: {
          id: string
          is_active: boolean
          passenger_id: string
          passenger_name: string
          route_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "matia" | "responsible"
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
      app_role: ["admin", "user", "matia", "responsible"],
    },
  },
} as const
