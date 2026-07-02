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
      achievements: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean | null
          joy_coins_reward: number
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          joy_coins_reward?: number
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          joy_coins_reward?: number
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          category: string
          challenge_type: string
          created_at: string
          description: string
          ends_at: string
          icon: string
          id: string
          is_active: boolean
          joy_coins_reward: number
          starts_at: string
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string
          challenge_type?: string
          created_at?: string
          description: string
          ends_at: string
          icon?: string
          id?: string
          is_active?: boolean
          joy_coins_reward?: number
          starts_at?: string
          target_value?: number
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string
          challenge_type?: string
          created_at?: string
          description?: string
          ends_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          joy_coins_reward?: number
          starts_at?: string
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      clinic_doctors: {
        Row: {
          clinic_id: string
          doctor_id: string
          id: string
          joined_at: string
          role: string
        }
        Insert: {
          clinic_id: string
          doctor_id: string
          id?: string
          joined_at?: string
          role?: string
        }
        Update: {
          clinic_id?: string
          doctor_id?: string
          id?: string
          joined_at?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          license_url: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          license_url?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          license_url?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consultation_followups: {
        Row: {
          consultation_id: string
          created_at: string
          dismissed_at: string | null
          doctor_id: string
          due_at: string
          id: string
          kind: string
          message: string
          patient_id: string
          rebooked_at: string | null
          rebooked_consultation_id: string | null
        }
        Insert: {
          consultation_id: string
          created_at?: string
          dismissed_at?: string | null
          doctor_id: string
          due_at?: string
          id?: string
          kind?: string
          message?: string
          patient_id: string
          rebooked_at?: string | null
          rebooked_consultation_id?: string | null
        }
        Update: {
          consultation_id?: string
          created_at?: string
          dismissed_at?: string | null
          doctor_id?: string
          due_at?: string
          id?: string
          kind?: string
          message?: string
          patient_id?: string
          rebooked_at?: string | null
          rebooked_consultation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_followups_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_followups_rebooked_consultation_id_fkey"
            columns: ["rebooked_consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          consultation_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          consultation_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          consultation_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_reminders: {
        Row: {
          consultation_id: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          remind_at: string
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          consultation_id: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          remind_at: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          consultation_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          remind_at?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_reminders_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          consultation_type: string
          created_at: string
          diagnosis: string | null
          doctor_id: string
          duration_minutes: number
          fee: number
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          consultation_type?: string
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          duration_minutes?: number
          fee?: number
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          consultation_type?: string
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          duration_minutes?: number
          fee?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_batches: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          prefix: string
          total_codes: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          prefix: string
          total_codes?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          prefix?: string
          total_codes?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          assigned_to_user: string | null
          batch_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          event_type: string | null
          expires_at: string | null
          id: string
          influencer_id: string | null
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          target_services: string[] | null
          used_count: number | null
        }
        Insert: {
          assigned_to_user?: string | null
          batch_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          event_type?: string | null
          expires_at?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          target_services?: string[] | null
          used_count?: number | null
        }
        Update: {
          assigned_to_user?: string | null
          batch_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          event_type?: string | null
          expires_at?: string | null
          id?: string
          influencer_id?: string | null
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          target_services?: string[] | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "coupon_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_highlights: {
        Row: {
          created_at: string
          highlight_date: string
          highlight_type: string
          id: string
          is_active: boolean
          product_id: string | null
          store_id: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          highlight_date?: string
          highlight_type?: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          store_id?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          highlight_date?: string
          highlight_type?: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          store_id?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_highlights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_highlights_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability_slots: {
        Row: {
          consultation_id: string | null
          created_at: string
          doctor_id: string
          ends_at: string
          id: string
          is_booked: boolean
          starts_at: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          doctor_id: string
          ends_at: string
          id?: string
          is_booked?: boolean
          starts_at: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          doctor_id?: string
          ends_at?: string
          id?: string
          is_booked?: boolean
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_slots_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          consultation_fee: number
          created_at: string
          id: string
          is_available: boolean
          is_verified: boolean
          languages: string[] | null
          latitude: number | null
          license_number: string
          license_url: string | null
          longitude: number | null
          rating: number | null
          specialty_id: string | null
          total_consultations: number
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number
          created_at?: string
          id?: string
          is_available?: boolean
          is_verified?: boolean
          languages?: string[] | null
          latitude?: number | null
          license_number: string
          license_url?: string | null
          longitude?: number | null
          rating?: number | null
          specialty_id?: string | null
          total_consultations?: number
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number
          created_at?: string
          id?: string
          is_available?: boolean
          is_verified?: boolean
          languages?: string[] | null
          latitude?: number | null
          license_number?: string
          license_url?: string | null
          longitude?: number | null
          rating?: number | null
          specialty_id?: string | null
          total_consultations?: number
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "medical_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_reviews: {
        Row: {
          comment: string | null
          consultation_id: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          consultation_id: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          consultation_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_reviews_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_assignments: {
        Row: {
          assigned_at: string
          current_latitude: number | null
          current_longitude: number | null
          delivered_at: string | null
          driver_id: string
          id: string
          order_id: string
          picked_up_at: string | null
          status: string
        }
        Insert: {
          assigned_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          delivered_at?: string | null
          driver_id: string
          id?: string
          order_id: string
          picked_up_at?: string | null
          status?: string
        }
        Update: {
          assigned_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          delivered_at?: string | null
          driver_id?: string
          id?: string
          order_id?: string
          picked_up_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          store_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          store_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      health_referral_rewards: {
        Row: {
          active: boolean
          coupon_code: string | null
          created_at: string
          id: string
          joy_coins_referred: number
          joy_coins_referrer: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          coupon_code?: string | null
          created_at?: string
          id?: string
          joy_coins_referred?: number
          joy_coins_referrer?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          coupon_code?: string | null
          created_at?: string
          id?: string
          joy_coins_referred?: number
          joy_coins_referrer?: number
          updated_at?: string
        }
        Relationships: []
      }
      influencer_picks: {
        Row: {
          created_at: string
          featured_text: string | null
          id: string
          influencer_id: string
          product_id: string | null
          store_id: string | null
        }
        Insert: {
          created_at?: string
          featured_text?: string | null
          id?: string
          influencer_id: string
          product_id?: string | null
          store_id?: string | null
        }
        Update: {
          created_at?: string
          featured_text?: string | null
          id?: string
          influencer_id?: string
          product_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_picks_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_picks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_picks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      joy_coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      joy_events: {
        Row: {
          category: string
          created_at: string
          description: string
          event_date: string | null
          event_time: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_secret: boolean | null
          joy_coins_reward: number | null
          latitude: number | null
          location: string
          longitude: number | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          event_date?: string | null
          event_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_secret?: boolean | null
          joy_coins_reward?: number | null
          latitude?: number | null
          location: string
          longitude?: number | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          event_date?: string | null
          event_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_secret?: boolean | null
          joy_coins_reward?: number | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          title?: string
        }
        Relationships: []
      }
      medical_record_shares: {
        Row: {
          consultation_id: string | null
          doctor_id: string
          id: string
          patient_id: string
          record_id: string
          revoked_at: string | null
          shared_at: string
        }
        Insert: {
          consultation_id?: string | null
          doctor_id: string
          id?: string
          patient_id: string
          record_id: string
          revoked_at?: string | null
          shared_at?: string
        }
        Update: {
          consultation_id?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          record_id?: string
          revoked_at?: string | null
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_shares_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_shares_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          created_at: string
          description: string | null
          file_mime: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          patient_id: string
          record_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_mime?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          patient_id: string
          record_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_mime?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          patient_id?: string
          record_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_specialties: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_address: string | null
          delivery_fee: number
          id: string
          is_priority: boolean
          notes: string | null
          prescription_id: string | null
          priority_level: number
          requires_cold_chain: boolean
          status: string
          store_id: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number
          id?: string
          is_priority?: boolean
          notes?: string | null
          prescription_id?: string | null
          priority_level?: number
          requires_cold_chain?: boolean
          status?: string
          store_id: string
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number
          id?: string
          is_priority?: boolean
          notes?: string | null
          prescription_id?: string | null
          priority_level?: number
          requires_cold_chain?: boolean
          status?: string
          store_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          chronic_conditions: string[] | null
          created_at: string
          current_medications: string[] | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          order_id: string
          phone_number: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          order_id: string
          phone_number?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          phone_number?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      place_distance_cache: {
        Row: {
          dest_id: string
          dest_kind: string
          distance_meters: number | null
          duration_seconds: number | null
          expires_at: string
          fetched_at: string
          id: string
          origin_lat: number
          origin_lng: number
        }
        Insert: {
          dest_id: string
          dest_kind: string
          distance_meters?: number | null
          duration_seconds?: number | null
          expires_at?: string
          fetched_at?: string
          id?: string
          origin_lat: number
          origin_lng: number
        }
        Update: {
          dest_id?: string
          dest_kind?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          expires_at?: string
          fetched_at?: string
          id?: string
          origin_lat?: number
          origin_lng?: number
        }
        Relationships: []
      }
      place_proposal_audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json
          created_at: string
          id: string
          proposal_id: string
          snapshot_after: Json | null
          snapshot_before: Json | null
        }
        Insert: {
          action?: string
          changed_by?: string | null
          changes?: Json
          created_at?: string
          id?: string
          proposal_id: string
          snapshot_after?: Json | null
          snapshot_before?: Json | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json
          created_at?: string
          id?: string
          proposal_id?: string
          snapshot_after?: Json | null
          snapshot_before?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "place_proposal_audit_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "place_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      place_proposal_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      place_proposals: {
        Row: {
          address: string | null
          city: string
          created_at: string
          description: string | null
          entity_type: string
          external_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string | null
          phone: string | null
          proposed_by: string | null
          publish_target: string | null
          published_id: string | null
          raw_payload: Json | null
          reference_point: string | null
          reports_count: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_joy_coins: number | null
          reward_mzn: number | null
          reward_paid: boolean | null
          search_meta: Json | null
          source: string
          status: string
          updated_at: string
          views_count: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          description?: string | null
          entity_type: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          proposed_by?: string | null
          publish_target?: string | null
          published_id?: string | null
          raw_payload?: Json | null
          reference_point?: string | null
          reports_count?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_joy_coins?: number | null
          reward_mzn?: number | null
          reward_paid?: boolean | null
          search_meta?: Json | null
          source?: string
          status?: string
          updated_at?: string
          views_count?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          description?: string | null
          entity_type?: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          proposed_by?: string | null
          publish_target?: string | null
          published_id?: string | null
          raw_payload?: Json | null
          reference_point?: string | null
          reports_count?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_joy_coins?: number | null
          reward_mzn?: number | null
          reward_paid?: boolean | null
          search_meta?: Json | null
          source?: string
          status?: string
          updated_at?: string
          views_count?: number | null
          website?: string | null
        }
        Relationships: []
      }
      platform_payment_accounts: {
        Row: {
          account_name: string
          account_number: string
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean
          method: string
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          method: string
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          method?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medication_name: string
          prescription_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_name: string
          prescription_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_name?: string
          prescription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          chosen_pharmacy_id: string | null
          consultation_id: string | null
          created_at: string
          doctor_id: string
          expires_at: string | null
          id: string
          notes: string | null
          patient_id: string
          pharmacy_confirmed_at: string | null
          pharmacy_store_id: string | null
          requires_cold_chain: boolean
          status: string
          suggested_pharmacy_id: string | null
        }
        Insert: {
          chosen_pharmacy_id?: string | null
          consultation_id?: string | null
          created_at?: string
          doctor_id: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          pharmacy_confirmed_at?: string | null
          pharmacy_store_id?: string | null
          requires_cold_chain?: boolean
          status?: string
          suggested_pharmacy_id?: string | null
        }
        Update: {
          chosen_pharmacy_id?: string | null
          consultation_id?: string | null
          created_at?: string
          doctor_id?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          pharmacy_confirmed_at?: string | null
          pharmacy_store_id?: string | null
          requires_cold_chain?: boolean
          status?: string
          suggested_pharmacy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_chosen_pharmacy_id_fkey"
            columns: ["chosen_pharmacy_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_suggested_pharmacy_id_fkey"
            columns: ["suggested_pharmacy_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          store_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price: number
          store_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_city: string | null
          emola_number: string | null
          full_name: string | null
          health_certified: boolean
          id: string
          is_available: boolean | null
          is_verified_driver: boolean
          license_carta_url: string | null
          license_plate: string | null
          license_viatura_url: string | null
          mkesh_number: string | null
          mpesa_number: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
          vehicle_type: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_city?: string | null
          emola_number?: string | null
          full_name?: string | null
          health_certified?: boolean
          id?: string
          is_available?: boolean | null
          is_verified_driver?: boolean
          license_carta_url?: string | null
          license_plate?: string | null
          license_viatura_url?: string | null
          mkesh_number?: string | null
          mpesa_number?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
          vehicle_type?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_city?: string | null
          emola_number?: string | null
          full_name?: string | null
          health_certified?: boolean
          id?: string
          is_available?: boolean | null
          is_verified_driver?: boolean
          license_carta_url?: string | null
          license_plate?: string | null
          license_viatura_url?: string | null
          mkesh_number?: string | null
          mpesa_number?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
          verified_at?: string | null
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
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          rating: number
          store_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          store_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      service_commissions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          percentage: number
          role: Database["public"]["Enums"]["app_role"]
          service_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          percentage: number
          role: Database["public"]["Enums"]["app_role"]
          service_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          percentage?: number
          role?: Database["public"]["Enums"]["app_role"]
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          city: string
          created_at: string
          delivery_fee: number | null
          delivery_time: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string | null
          phone: string | null
          rating: number | null
          type: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          type: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          delivery_fee?: number | null
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          type?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          badge: string | null
          billing_period: string
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price_mzn: number
          slug: string
          sort_order: number
          target_audience: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_mzn?: number
          slug: string
          sort_order?: number
          target_audience: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_mzn?: number
          slug?: string
          sort_order?: number
          target_audience?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          admin_notes: string | null
          amount_paid: number | null
          created_at: string
          expires_at: string | null
          id: string
          payment_method: string | null
          payment_phone: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          plan_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_paid?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          payment_phone?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          plan_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          payment_phone?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          plan_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_logs: {
        Row: {
          age: number | null
          ai_response: Json | null
          created_at: string
          duration: string | null
          id: string
          patient_id: string
          recommendation: string | null
          severity: string | null
          suggested_specialty: string | null
          symptoms: string
        }
        Insert: {
          age?: number | null
          ai_response?: Json | null
          created_at?: string
          duration?: string | null
          id?: string
          patient_id: string
          recommendation?: string | null
          severity?: string | null
          suggested_specialty?: string | null
          symptoms: string
        }
        Update: {
          age?: number | null
          ai_response?: Json | null
          created_at?: string
          duration?: string | null
          id?: string
          patient_id?: string
          recommendation?: string | null
          severity?: string | null
          suggested_specialty?: string | null
          symptoms?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coupons: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gamification: {
        Row: {
          created_at: string
          current_level: number
          experience_points: number
          id: string
          joy_coins: number
          last_order_date: string | null
          neighborhoods_explored: string[] | null
          streak_days: number
          total_orders: number
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          experience_points?: number
          id?: string
          joy_coins?: number
          last_order_date?: string | null
          neighborhoods_explored?: string[] | null
          streak_days?: number
          total_orders?: number
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          experience_points?: number
          id?: string
          joy_coins?: number
          last_order_date?: string | null
          neighborhoods_explored?: string[] | null
          streak_days?: number
          total_orders?: number
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          bonus_coins: number | null
          bonus_mzn: number | null
          completed_at: string | null
          created_at: string
          id: string
          paid_at: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_coins?: number | null
          bonus_mzn?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_coins?: number | null
          bonus_mzn?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
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
      video_sessions: {
        Row: {
          consultation_id: string
          created_at: string
          ended_at: string | null
          id: string
          room_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          consultation_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          consultation_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_sessions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_mzn: number
          created_at: string
          currency: string
          total_deposited: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_mzn?: number
          created_at?: string
          currency?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_mzn?: number
          created_at?: string
          currency?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          destination: string
          destination_name: string | null
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
          user_notes: string | null
          wallet_tx_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          destination: string
          destination_name?: string | null
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_notes?: string | null
          wallet_tx_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          destination?: string
          destination_name?: string | null
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_notes?: string | null
          wallet_tx_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      weekly_leaderboard: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          joy_coins: number | null
          user_id: string | null
          user_level: number | null
          weekly_orders: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_proposal: {
        Args: { p_id: string; p_notes?: string }
        Returns: Json
      }
      bootstrap_admin: { Args: never; Returns: Json }
      ensure_wallet: {
        Args: { _user_id: string }
        Returns: {
          balance_mzn: number
          created_at: string
          currency: string
          total_deposited: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_active_subscription: {
        Args: { _audience: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_professional: { Args: { _user_id: string }; Returns: boolean }
      pay_service: {
        Args: {
          _coupon_id?: string
          _description?: string
          _gross_amount: number
          _provider_id?: string
          _ref_id: string
          _service_type: string
          _user_id: string
        }
        Returns: Json
      }
      redeem_coupon: {
        Args: { _coupon_id: string; _user_id: string }
        Returns: undefined
      }
      reject_proposal: {
        Args: { p_id: string; p_notes?: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          _amount: number
          _destination: string
          _destination_name?: string
          _method: string
          _notes?: string
        }
        Returns: Json
      }
      resolve_withdrawal: {
        Args: { _action: string; _id: string; _notes?: string }
        Returns: Json
      }
      validate_coupon: {
        Args: {
          _code: string
          _event_type?: string
          _order_value?: number
          _service_type: string
          _user_id: string
        }
        Returns: Json
      }
      wallet_admin_adjust: {
        Args: {
          _amount: number
          _direction: string
          _reason: string
          _user_id: string
        }
        Returns: Json
      }
      wallet_credit: {
        Args: {
          _amount: number
          _description?: string
          _ref_id?: string
          _type?: string
          _user_id: string
        }
        Returns: Json
      }
      wallet_debit: {
        Args: {
          _amount: number
          _description?: string
          _ref_id: string
          _service_type: string
          _user_id: string
        }
        Returns: Json
      }
      wallet_deposit: {
        Args: {
          _amount: number
          _method?: string
          _ref?: string
          _user_id: string
        }
        Returns: Json
      }
      wallet_refund: {
        Args: { _reason?: string; _tx_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "customer"
        | "store_owner"
        | "driver"
        | "admin"
        | "doctor"
        | "clinic"
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
      app_role: [
        "customer",
        "store_owner",
        "driver",
        "admin",
        "doctor",
        "clinic",
      ],
    },
  },
} as const
