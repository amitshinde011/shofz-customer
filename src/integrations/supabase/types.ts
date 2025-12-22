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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          shop_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          shop_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          shop_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          ad_type: string
          click_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string
          impression_count: number | null
          is_active: boolean | null
          link_url: string | null
          placement: string | null
          priority: number | null
          start_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ad_type: string
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url: string
          impression_count?: number | null
          is_active?: boolean | null
          link_url?: string | null
          placement?: string | null
          priority?: number | null
          start_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ad_type?: string
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          impression_count?: number | null
          is_active?: boolean | null
          link_url?: string | null
          placement?: string | null
          priority?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          response_notes: string | null
          status: Database["public"]["Enums"]["contact_request_status"] | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          response_notes?: string | null
          status?: Database["public"]["Enums"]["contact_request_status"] | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          response_notes?: string | null
          status?: Database["public"]["Enums"]["contact_request_status"] | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_batches: {
        Row: {
          created_at: string | null
          credits_purchased: number
          credits_remaining: number
          expires_at: string
          id: string
          payment_transaction_id: string | null
          purchased_at: string
          shop_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          credits_purchased: number
          credits_remaining: number
          expires_at: string
          id?: string
          payment_transaction_id?: string | null
          purchased_at?: string
          shop_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          credits_purchased?: number
          credits_remaining?: number
          expires_at?: string
          id?: string
          payment_transaction_id?: string | null
          purchased_at?: string
          shop_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_batches_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_batches_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_costs: {
        Row: {
          action_type: Database["public"]["Enums"]["credit_action_type"]
          cost_per_action: number
          created_at: string | null
          daily_cost: number
          description: string | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["credit_action_type"]
          cost_per_action?: number
          created_at?: string | null
          daily_cost?: number
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["credit_action_type"]
          cost_per_action?: number
          created_at?: string | null
          daily_cost?: number
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_plans: {
        Row: {
          bonus_credits: number | null
          created_at: string | null
          credits_amount: number
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_inr: number
          updated_at: string | null
          validity_days: number
        }
        Insert: {
          bonus_credits?: number | null
          created_at?: string | null
          credits_amount: number
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_inr: number
          updated_at?: string | null
          validity_days?: number
        }
        Update: {
          bonus_credits?: number | null
          created_at?: string | null
          credits_amount?: number
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_inr?: number
          updated_at?: string | null
          validity_days?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          payment_transaction_id: string | null
          reference_id: string | null
          reference_type: string | null
          shop_id: string
          status: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          payment_transaction_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          shop_id: string
          status?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          payment_transaction_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          shop_id?: string
          status?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_preferences: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          preferred_payment_app: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          preferred_payment_app?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          preferred_payment_app?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          created_at: string | null
          delivery_addresses: Json | null
          favorite_shops: string[] | null
          id: string
          loyalty_points: number | null
          preferences: Json | null
          referral_code: string | null
          total_referral_earnings: number | null
          updated_at: string | null
          upi_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_addresses?: Json | null
          favorite_shops?: string[] | null
          id?: string
          loyalty_points?: number | null
          preferences?: Json | null
          referral_code?: string | null
          total_referral_earnings?: number | null
          updated_at?: string | null
          upi_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_addresses?: Json | null
          favorite_shops?: string[] | null
          id?: string
          loyalty_points?: number | null
          preferences?: Json | null
          referral_code?: string | null
          total_referral_earnings?: number | null
          updated_at?: string | null
          upi_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_referral_earnings: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          referral_code: string
          shop_id: string
          shop_verified_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          referral_code: string
          shop_id: string
          shop_verified_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          referral_code?: string
          shop_id?: string
          shop_verified_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_referral_earnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referral_earnings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      entityviewcounts: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          period_end: string
          period_start: string
          total_views: number | null
          unique_views: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          period_end: string
          period_start: string
          total_views?: number | null
          unique_views?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          period_end?: string
          period_start?: string
          total_views?: number | null
          unique_views?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      featured_item_deductions: {
        Row: {
          balance_after: number
          created_at: string | null
          credits_deducted: number
          deduction_date: string
          featured_item_id: string
          id: string
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          credits_deducted: number
          deduction_date: string
          featured_item_id: string
          id?: string
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          credits_deducted?: number
          deduction_date?: string
          featured_item_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_item_deductions_featured_item_id_fkey"
            columns: ["featured_item_id"]
            isOneToOne: false
            referencedRelation: "featured_items"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_items: {
        Row: {
          created_at: string | null
          credits_consumed: number | null
          daily_cost: number | null
          entity_id: string
          entity_type: string
          featured_until: string
          id: string
          last_deduction_at: string | null
          shop_id: string
          status: string | null
          total_credits_allocated: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          credits_consumed?: number | null
          daily_cost?: number | null
          entity_id: string
          entity_type: string
          featured_until: string
          id?: string
          last_deduction_at?: string | null
          shop_id: string
          status?: string | null
          total_credits_allocated?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          credits_consumed?: number | null
          daily_cost?: number | null
          entity_id?: string
          entity_type?: string
          featured_until?: string
          id?: string
          last_deduction_at?: string | null
          shop_id?: string
          status?: string | null
          total_credits_allocated?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          attachment_urls: string[] | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          customer_id: string
          delivery_address: string | null
          delivery_location: Json | null
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          order_type: string | null
          preferred_contact: string | null
          product_details: string | null
          product_name: string
          quantity: number | null
          shop_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          customer_id: string
          delivery_address?: string | null
          delivery_location?: Json | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          order_type?: string | null
          preferred_contact?: string | null
          product_details?: string | null
          product_name: string
          quantity?: number | null
          shop_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          customer_id?: string
          delivery_address?: string | null
          delivery_location?: Json | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          order_type?: string | null
          preferred_contact?: string | null
          product_details?: string | null
          product_name?: string
          quantity?: number | null
          shop_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_responses: {
        Row: {
          created_at: string | null
          estimated_delivery_days: number | null
          id: string
          inquiry_id: string
          payment_request_expires_at: string | null
          payment_status: string | null
          quoted_price: number | null
          response_message: string | null
          response_type: string | null
          shop_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_delivery_days?: number | null
          id?: string
          inquiry_id: string
          payment_request_expires_at?: string | null
          payment_status?: string | null
          quoted_price?: number | null
          response_message?: string | null
          response_type?: string | null
          shop_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_delivery_days?: number | null
          id?: string
          inquiry_id?: string
          payment_request_expires_at?: string | null
          payment_status?: string | null
          quoted_price?: number | null
          response_message?: string | null
          response_type?: string | null
          shop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_responses_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_responses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean | null
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          subject: string | null
          updated_at: string | null
          updated_by: string | null
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          inquiry_id: string
          is_read: boolean | null
          message_text: string
          message_type: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          inquiry_id: string
          is_read?: boolean | null
          message_text: string
          message_type?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          inquiry_id?: string
          is_read?: boolean | null
          message_text?: string
          message_type?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: string[] | null
          applicable_to: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          discount_type: string | null
          discount_value: number | null
          featured_until: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          offer_type: string | null
          search_vector: unknown
          shop_id: string
          terms_conditions: string | null
          title: string
          updated_at: string | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_to?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          discount_type?: string | null
          discount_value?: number | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          offer_type?: string | null
          search_vector?: unknown
          shop_id: string
          terms_conditions?: string | null
          title: string
          updated_at?: string | null
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_to?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          discount_type?: string | null
          discount_value?: number | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          offer_type?: string | null
          search_vector?: unknown
          shop_id?: string
          terms_conditions?: string | null
          title?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          completed_at: string | null
          confirmation_notes: string | null
          created_at: string | null
          customer_id: string | null
          expires_at: string | null
          id: string
          inquiry_id: string | null
          payment_confirmed_at: string | null
          payment_confirmed_by_shop: boolean | null
          payment_screenshot_url: string | null
          request_status: string | null
          shop_id: string | null
          updated_at: string | null
          upi_transaction_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          confirmation_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          inquiry_id?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by_shop?: boolean | null
          payment_screenshot_url?: string | null
          request_status?: string | null
          shop_id?: string | null
          updated_at?: string | null
          upi_transaction_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          confirmation_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          inquiry_id?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by_shop?: boolean | null
          payment_screenshot_url?: string | null
          request_status?: string | null
          shop_id?: string | null
          updated_at?: string | null
          upi_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          coupon_code: string | null
          created_at: string | null
          credit_plan_id: string | null
          credits_awarded: number | null
          currency: string | null
          discount_amount: number | null
          final_amount: number
          gateway_order_id: string | null
          gateway_response: Json | null
          gateway_transaction_id: string | null
          id: string
          name: string | null
          payment_gateway: string | null
          payment_method: string | null
          shop_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string | null
          credit_plan_id?: string | null
          credits_awarded?: number | null
          currency?: string | null
          discount_amount?: number | null
          final_amount: number
          gateway_order_id?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          name?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          shop_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string | null
          credit_plan_id?: string | null
          credits_awarded?: number | null
          currency?: string | null
          discount_amount?: number | null
          final_amount?: number
          gateway_order_id?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          name?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          shop_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_credit_plan_id_fkey"
            columns: ["credit_plan_id"]
            isOneToOne: false
            referencedRelation: "credit_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_verification_evidence: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          evidence_data: Json | null
          evidence_type: string
          id: string
          payment_request_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          evidence_data?: Json | null
          evidence_type: string
          id?: string
          payment_request_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          evidence_data?: Json | null
          evidence_type?: string
          id?: string
          payment_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_verification_evidence_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          account_details: Json | null
          amount: number
          created_at: string | null
          currency: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          method: string | null
          processed_at: string | null
          processed_by: string | null
          scheduled_at: string | null
          shop_id: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          updated_at: string | null
        }
        Insert: {
          account_details?: Json | null
          amount: number
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          scheduled_at?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string | null
        }
        Update: {
          account_details?: Json | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          scheduled_at?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: number | null
          source: string | null
          status: Database["public"]["Enums"]["alert_status"] | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string | null
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      product_stats: {
        Row: {
          created_at: string | null
          id: string
          inquiry_count: number | null
          last_viewed_at: string | null
          product_id: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inquiry_count?: number | null
          last_viewed_at?: string | null
          product_id?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inquiry_count?: number | null
          last_viewed_at?: string | null
          product_id?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          credits_cost: number | null
          description: string | null
          featured_until: string | null
          id: string
          images: string[] | null
          inventory_tracking: boolean | null
          is_active: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number
          search_vector: unknown
          shop_id: string
          sku: string | null
          specifications: Json | null
          stock_quantity: number | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          credits_cost?: number | null
          description?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          inventory_tracking?: boolean | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price: number
          search_vector?: unknown
          shop_id: string
          sku?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          credits_cost?: number | null
          description?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          inventory_tracking?: boolean | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          search_vector?: unknown
          shop_id?: string
          sku?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          referral_code: string
          shop_id: string | null
          successful_referrals: number | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referral_code: string
          shop_id?: string | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referral_code?: string
          shop_id?: string | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_config: {
        Row: {
          config_key: string
          config_value: number
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: number
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: number
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      referral_payout_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payout_per_verified_shop: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payout_per_verified_shop?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payout_per_verified_shop?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_payout_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_transactions: {
        Row: {
          created_at: string | null
          id: string
          processed_at: string | null
          referral_code: string
          referred_credits: number | null
          referred_customer_id: string | null
          referred_entity_type: string
          referred_shop_id: string | null
          referrer_credits: number | null
          referrer_shop_id: string | null
          transaction_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          processed_at?: string | null
          referral_code: string
          referred_credits?: number | null
          referred_customer_id?: string | null
          referred_entity_type: string
          referred_shop_id?: string | null
          referrer_credits?: number | null
          referrer_shop_id?: string | null
          transaction_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          processed_at?: string | null
          referral_code?: string
          referred_credits?: number | null
          referred_customer_id?: string | null
          referred_entity_type?: string
          referred_shop_id?: string | null
          referrer_credits?: number | null
          referrer_shop_id?: string | null
          transaction_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_transactions_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referred_shop_id_fkey"
            columns: ["referred_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referrer_shop_id_fkey"
            columns: ["referrer_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpfulness: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          review_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          review_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          review_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string | null
          id: string
          report_details: string | null
          report_reason: string
          report_status: string | null
          reported_by: string | null
          resolution_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_details?: string | null
          report_reason: string
          report_status?: string | null
          reported_by?: string | null
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          report_details?: string | null
          report_reason?: string
          report_status?: string | null
          reported_by?: string | null
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string | null
        }
        Relationships: []
      }
      review_templates: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          rating: number
          template_text: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rating: number
          template_text: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rating?: number
          template_text?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          helpful_count: number | null
          id: string
          images: string[] | null
          is_verified: boolean | null
          order_id: string | null
          rating: number
          shop_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          order_id?: string | null
          rating: number
          shop_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          order_id?: string | null
          rating?: number
          shop_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_credits: {
        Row: {
          created_at: string | null
          credits_expire_at: string | null
          earned_from_customer_referrals: number | null
          earned_from_shop_referrals: number | null
          id: string
          last_purchase_at: string | null
          lifetime_credits_purchased: number
          reserved_credits: number
          shop_id: string
          total_credits: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_expire_at?: string | null
          earned_from_customer_referrals?: number | null
          earned_from_shop_referrals?: number | null
          id?: string
          last_purchase_at?: string | null
          lifetime_credits_purchased?: number
          reserved_credits?: number
          shop_id: string
          total_credits?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_expire_at?: string | null
          earned_from_customer_referrals?: number | null
          earned_from_shop_referrals?: number | null
          id?: string
          last_purchase_at?: string | null
          lifetime_credits_purchased?: number
          reserved_credits?: number
          shop_id?: string
          total_credits?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_credits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_owner_profiles: {
        Row: {
          business_address: string | null
          business_category: string | null
          business_name: string | null
          business_phone: string | null
          business_verified: boolean | null
          created_at: string | null
          gstin: string | null
          id: string
          updated_at: string | null
          user_id: string
          verification_documents: Json | null
        }
        Insert: {
          business_address?: string | null
          business_category?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_verified?: boolean | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          verification_documents?: Json | null
        }
        Update: {
          business_address?: string | null
          business_category?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_verified?: boolean | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          verification_documents?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_owner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_payment_transactions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_payment_timestamp: string | null
          id: string
          inquiry_id: string | null
          payment_amount: number | null
          payment_method: string
          payment_notes: string | null
          payment_reference_id: string | null
          payment_screenshot_url: string | null
          payment_status: string | null
          shop_confirmation_timestamp: string | null
          shop_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_payment_timestamp?: string | null
          id?: string
          inquiry_id?: string | null
          payment_amount?: number | null
          payment_method: string
          payment_notes?: string | null
          payment_reference_id?: string | null
          payment_screenshot_url?: string | null
          payment_status?: string | null
          shop_confirmation_timestamp?: string | null
          shop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_payment_timestamp?: string | null
          id?: string
          inquiry_id?: string | null
          payment_amount?: number | null
          payment_method?: string
          payment_notes?: string | null
          payment_reference_id?: string | null
          payment_screenshot_url?: string | null
          payment_status?: string | null
          shop_confirmation_timestamp?: string | null
          shop_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_review_stats: {
        Row: {
          average_rating: number | null
          avg_delivery: number | null
          avg_price: number | null
          avg_product_quality: number | null
          avg_service: number | null
          id: string
          last_review_at: string | null
          last_updated: string | null
          rating_1_count: number | null
          rating_2_count: number | null
          rating_3_count: number | null
          rating_4_count: number | null
          rating_5_count: number | null
          reviews_with_images_count: number | null
          reviews_with_response_count: number | null
          shop_id: string | null
          total_reviews: number | null
          verified_reviews_count: number | null
        }
        Insert: {
          average_rating?: number | null
          avg_delivery?: number | null
          avg_price?: number | null
          avg_product_quality?: number | null
          avg_service?: number | null
          id?: string
          last_review_at?: string | null
          last_updated?: string | null
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          reviews_with_images_count?: number | null
          reviews_with_response_count?: number | null
          shop_id?: string | null
          total_reviews?: number | null
          verified_reviews_count?: number | null
        }
        Update: {
          average_rating?: number | null
          avg_delivery?: number | null
          avg_price?: number | null
          avg_product_quality?: number | null
          avg_service?: number | null
          id?: string
          last_review_at?: string | null
          last_updated?: string | null
          rating_1_count?: number | null
          rating_2_count?: number | null
          rating_3_count?: number | null
          rating_4_count?: number | null
          rating_5_count?: number | null
          reviews_with_images_count?: number | null
          reviews_with_response_count?: number | null
          shop_id?: string | null
          total_reviews?: number | null
          verified_reviews_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_review_stats_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string | null
          delivery_rating: number | null
          id: string
          inquiry_id: string | null
          is_anonymous: boolean | null
          is_verified_purchase: boolean | null
          price_rating: number | null
          product_quality_rating: number | null
          rating: number
          review_images: string[] | null
          review_status: string | null
          service_rating: number | null
          shop_id: string | null
          shop_response: string | null
          shop_response_at: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_rating?: number | null
          id?: string
          inquiry_id?: string | null
          is_anonymous?: boolean | null
          is_verified_purchase?: boolean | null
          price_rating?: number | null
          product_quality_rating?: number | null
          rating: number
          review_images?: string[] | null
          review_status?: string | null
          service_rating?: number | null
          shop_id?: string | null
          shop_response?: string | null
          shop_response_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_rating?: number | null
          id?: string
          inquiry_id?: string | null
          is_anonymous?: boolean | null
          is_verified_purchase?: boolean | null
          price_rating?: number | null
          product_quality_rating?: number | null
          rating?: number
          review_images?: string[] | null
          review_status?: string | null
          service_rating?: number | null
          shop_id?: string | null
          shop_response?: string | null
          shop_response_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          price: number
          shop_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          price: number
          shop_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          price?: number
          shop_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_verification_documents: {
        Row: {
          created_at: string | null
          document_category: Database["public"]["Enums"]["document_category"]
          document_name: string | null
          document_url: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          shop_id: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          updated_at: string | null
          uploaded_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_category: Database["public"]["Enums"]["document_category"]
          document_name?: string | null
          document_url: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
          uploaded_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_category?: Database["public"]["Enums"]["document_category"]
          document_name?: string | null
          document_url?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
          uploaded_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_verification_documents_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          accepts_online_payments: boolean | null
          address: string | null
          business_hours: Json | null
          categories: string[] | null
          cover_image_url: string | null
          created_at: string | null
          customer_referral_code_used: string | null
          delivery_available: boolean | null
          delivery_charge_per_km: number | null
          delivery_coverage_km: number | null
          delivery_notes: string | null
          description: string | null
          document_submission_deadline: string | null
          documents_verified: boolean | null
          email: string | null
          featured_until: string | null
          free_delivery_above: number | null
          gallery_images: string[] | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_suspended: boolean | null
          is_verified: boolean | null
          location: unknown
          logo_url: string | null
          name: string
          owner_id: string | null
          payment_instructions: string | null
          payment_phone_number: string | null
          payment_qr_code_url: string | null
          payment_upi_id: string | null
          phone_number: string | null
          preferred_payment_methods: string[] | null
          rating: number | null
          referred_by_customer_id: string | null
          search_vector: unknown
          slug: string | null
          subscription_expires_at: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspension_reason: string | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          accepts_online_payments?: boolean | null
          address?: string | null
          business_hours?: Json | null
          categories?: string[] | null
          cover_image_url?: string | null
          created_at?: string | null
          customer_referral_code_used?: string | null
          delivery_available?: boolean | null
          delivery_charge_per_km?: number | null
          delivery_coverage_km?: number | null
          delivery_notes?: string | null
          description?: string | null
          document_submission_deadline?: string | null
          documents_verified?: boolean | null
          email?: string | null
          featured_until?: string | null
          free_delivery_above?: number | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_suspended?: boolean | null
          is_verified?: boolean | null
          location?: unknown
          logo_url?: string | null
          name: string
          owner_id?: string | null
          payment_instructions?: string | null
          payment_phone_number?: string | null
          payment_qr_code_url?: string | null
          payment_upi_id?: string | null
          phone_number?: string | null
          preferred_payment_methods?: string[] | null
          rating?: number | null
          referred_by_customer_id?: string | null
          search_vector?: unknown
          slug?: string | null
          subscription_expires_at?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspension_reason?: string | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          accepts_online_payments?: boolean | null
          address?: string | null
          business_hours?: Json | null
          categories?: string[] | null
          cover_image_url?: string | null
          created_at?: string | null
          customer_referral_code_used?: string | null
          delivery_available?: boolean | null
          delivery_charge_per_km?: number | null
          delivery_coverage_km?: number | null
          delivery_notes?: string | null
          description?: string | null
          document_submission_deadline?: string | null
          documents_verified?: boolean | null
          email?: string | null
          featured_until?: string | null
          free_delivery_above?: number | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_suspended?: boolean | null
          is_verified?: boolean | null
          location?: unknown
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          payment_instructions?: string | null
          payment_phone_number?: string | null
          payment_qr_code_url?: string | null
          payment_upi_id?: string | null
          phone_number?: string | null
          preferred_payment_methods?: string[] | null
          rating?: number | null
          referred_by_customer_id?: string | null
          search_vector?: unknown
          slug?: string | null
          subscription_expires_at?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspension_reason?: string | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_referred_by_customer_id_fkey"
            columns: ["referred_by_customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_internal_note: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_tags: {
        Row: {
          created_at: string | null
          id: string
          tag: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["support_ticket_category"]
          created_at: string | null
          description: string
          id: string
          inquiry_id: string | null
          priority:
            | Database["public"]["Enums"]["support_ticket_priority"]
            | null
          resolution_notes: string | null
          resolved_at: string | null
          shop_id: string | null
          status: Database["public"]["Enums"]["support_ticket_status"] | null
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["support_ticket_category"]
          created_at?: string | null
          description: string
          id?: string
          inquiry_id?: string | null
          priority?:
            | Database["public"]["Enums"]["support_ticket_priority"]
            | null
          resolution_notes?: string | null
          resolved_at?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"] | null
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category"]
          created_at?: string | null
          description?: string
          id?: string
          inquiry_id?: string | null
          priority?:
            | Database["public"]["Enums"]["support_ticket_priority"]
            | null
          resolution_notes?: string | null
          resolved_at?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"] | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          fee: number | null
          id: string
          metadata: Json | null
          net_amount: number | null
          order_id: string | null
          payment_method: string | null
          payment_provider: string | null
          payout_id: string | null
          processed_at: string | null
          provider_transaction_id: string | null
          shop_id: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          order_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payout_id?: string | null
          processed_at?: string | null
          provider_transaction_id?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          order_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payout_id?: string | null
          processed_at?: string | null
          provider_transaction_id?: string | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          shop_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          shop_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          shop_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          role_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          role_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          role_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          email_verified_at: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          name: string
          pending_customer_referral_code: string | null
          pending_referral_code: string | null
          phone: string | null
          phone_number: string | null
          profile_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          name: string
          pending_customer_referral_code?: string | null
          pending_referral_code?: string | null
          phone?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string
          pending_customer_referral_code?: string | null
          pending_referral_code?: string | null
          phone?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      viewanalytics: {
        Row: {
          created_at: string | null
          device_info: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          session_id: string | null
          viewer_id: string | null
          viewer_type: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          viewer_id?: string | null
          viewer_type?: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          viewer_id?: string | null
          viewer_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      credit_system_health: {
        Row: {
          metric: string | null
          severity: string | null
          value: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_shop_owner_role_and_create_shop: {
        Args: {
          p_owner_name: string
          p_owner_phone: string
          p_shop_address: string
          p_shop_name: string
          p_user_id: string
        }
        Returns: Json
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      assign_shop_owner: {
        Args: { p_shop_id: string; p_user_id: string }
        Returns: Json
      }
      award_credits:
        | {
            Args: {
              p_credit_plan_id: string
              p_credits: number
              p_payment_transaction_id: string
              p_shop_id: string
              p_user_id?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_created_by?: string
              p_credit_plan_id?: string
              p_credits: number
              p_description: string
              p_payment_transaction_id?: string
              p_shop_id: string
              p_transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
            }
            Returns: string
          }
      can_afford_action: {
        Args: {
          p_action_type: Database["public"]["Enums"]["credit_action_type"]
          p_duration_days?: number
          p_shop_id: string
        }
        Returns: boolean
      }
      can_customer_review_shop: {
        Args: { p_customer_id: string; p_inquiry_id: string; p_shop_id: string }
        Returns: boolean
      }
      can_review_shop_directly: {
        Args: { p_customer_id: string; p_shop_id: string }
        Returns: boolean
      }
      check_documents_complete: {
        Args: { p_shop_id: string }
        Returns: boolean
      }
      check_featured_items_integrity: {
        Args: never
        Returns: {
          details: Json
          entity_type: string
          issue_type: string
          item_id: string
        }[]
      }
      check_user_exists_by_email: { Args: { p_email: string }; Returns: Json }
      cleanup_expired_featured_items: { Args: never; Returns: undefined }
      cleanup_expired_payments: { Args: never; Returns: number }
      complete_payment_request: {
        Args: {
          p_payment_app?: string
          p_payment_request_id: string
          p_upi_transaction_id?: string
        }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_message: string
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_payment_request: {
        Args: {
          p_amount: number
          p_description?: string
          p_inquiry_response_id: string
          p_payment_terms?: string
        }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      expire_credits_atomic: { Args: { p_shop_id: string }; Returns: Json }
      extend_featuring: {
        Args: { p_additional_days: number; p_featured_item_id: string }
        Returns: Json
      }
      feature_offer_atomic: {
        Args: {
          p_duration_days?: number
          p_offer_id: string
          p_shop_id: string
        }
        Returns: Json
      }
      feature_product_atomic: {
        Args: {
          p_duration_days?: number
          p_product_id: string
          p_shop_id: string
        }
        Returns: Json
      }
      feature_shop_atomic: {
        Args: { p_duration_days?: number; p_shop_id: string }
        Returns: Json
      }
      generate_customer_referral_code: {
        Args: { p_customer_id: string }
        Returns: string
      }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: { shop_name: string }; Returns: string }
      generate_transaction_id: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_ad_analytics_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          active_ads_count: number
          ctr: number
          total_clicks: number
          total_impressions: number
        }[]
      }
      get_available_credits: { Args: { p_shop_id: string }; Returns: number }
      get_available_credits_for_payment: {
        Args: { p_shop_id: string }
        Returns: number
      }
      get_customer_referral_stats: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      get_daily_payment_usage: {
        Args: { target_date?: string; user_id: string }
        Returns: {
          total_amount: number
          transaction_count: number
        }[]
      }
      get_document_deadline_days: { Args: never; Returns: number }
      get_entity_view_count: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          last_viewed_at: string
          view_count: number
        }[]
      }
      get_featured_shops: {
        Args: { shop_limit?: number }
        Returns: {
          address: string
          business_hours: Json
          categories: string[]
          cover_image_url: string
          created_at: string
          description: string
          email: string
          gallery_images: string[]
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number
          logo_url: string
          longitude: number
          name: string
          owner_id: string
          phone_number: string
          rating: number
          slug: string
          subscription_expires_at: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          total_reviews: number
          updated_at: string
        }[]
      }
      get_nearby_offers: {
        Args: {
          p_limit?: number
          p_offset?: number
          radius_km?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          applicable_categories: string[]
          applicable_products: string[]
          applicable_to: string
          created_at: string
          description: string
          discount_percentage: number
          discount_type: string
          discount_value: number
          distance_km: number
          featured_until: string
          id: string
          image_url: string
          is_active: boolean
          is_featured: boolean
          offer_type: string
          shop_address: string
          shop_id: string
          shop_is_featured: boolean
          shop_is_verified: boolean
          shop_logo_url: string
          shop_name: string
          terms_conditions: string
          title: string
          updated_at: string
          valid_from: string
          valid_until: string
        }[]
      }
      get_nearby_products: {
        Args: {
          p_category?: string
          p_featured?: boolean
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_query?: string
          radius_km?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          brand: string
          category: string
          compare_at_price: number
          created_at: string
          description: string
          distance_km: number
          featured_until: string
          id: string
          images: string[]
          inventory_tracking: boolean
          is_active: boolean
          is_featured: boolean
          low_stock_threshold: number
          name: string
          price: number
          shop_address: string
          shop_id: string
          shop_is_featured: boolean
          shop_is_verified: boolean
          shop_logo_url: string
          shop_name: string
          shop_rating: number
          sku: string
          specifications: Json
          stock_quantity: number
          subcategory: string
          tags: string[]
          updated_at: string
        }[]
      }
      get_nearby_shops: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          business_hours: Json
          categories: string[]
          cover_image_url: string
          created_at: string
          delivery_available: boolean
          delivery_charge_per_km: number
          delivery_coverage_km: number
          delivery_notes: string
          description: string
          distance_km: number
          email: string
          free_delivery_above: number
          gallery_images: string[]
          id: string
          is_active: boolean
          is_featured: boolean
          is_verified: boolean
          latitude: number
          logo_url: string
          longitude: number
          name: string
          owner_id: string
          phone_number: string
          rating: number
          slug: string
          subscription_expires_at: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          total_reviews: number
          updated_at: string
        }[]
      }
      get_shop_with_location: {
        Args: { p_owner_id: string }
        Returns: {
          address: string
          business_hours: Json
          categories: string[]
          cover_image_url: string
          created_at: string
          description: string
          email: string
          gallery_images: string[]
          id: string
          is_active: boolean
          is_verified: boolean
          location_geojson: string
          logo_url: string
          name: string
          owner_id: string
          phone_number: string
          rating: number
          search_vector: unknown
          slug: string
          subscription_expires_at: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          total_reviews: number
          updated_at: string
        }[]
      }
      get_top_performing_ads: {
        Args: { p_limit?: number }
        Returns: {
          ad_type: string
          clicks: number
          ctr: number
          id: string
          impressions: number
          placement: string
          title: string
        }[]
      }
      get_user_account_age_hours: { Args: { user_id: string }; Returns: number }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_ad_click: { Args: { ad_id: string }; Returns: undefined }
      increment_ad_impression: { Args: { ad_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_shop_owner: { Args: { shop_id_text: string }; Returns: boolean }
      is_shop_owner_by_id: { Args: { shop_id_param: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_referral_earning_paid: {
        Args: {
          p_earning_id: string
          p_notes?: string
          p_payment_reference: string
        }
        Returns: Json
      }
      nearby_shops: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          categories: string[]
          distance_km: number
          name: string
          rating: number
          shop_id: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_referral_transaction:
        | {
            Args: {
              p_referral_code: string
              p_referred_entity_type: string
              p_referred_shop_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_referral_code: string
              p_referred_customer_id?: string
              p_referred_entity_type: string
              p_referred_shop_id?: string
              p_referrer_shop_id: string
            }
            Returns: string
          }
      send_credit_expiration_warnings: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      stop_featuring: { Args: { p_featured_item_id: string }; Returns: Json }
      unified_search: {
        Args: {
          category_filter?: string[]
          price_max?: number
          price_min?: number
          radius_km?: number
          rating_min?: number
          result_limit?: number
          result_offset?: number
          search_query: string
          user_lat?: number
          user_lng?: number
        }
        Returns: Json
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_shop_location: {
        Args: { p_latitude: number; p_longitude: number; p_shop_id: string }
        Returns: undefined
      }
      update_shop_rating_and_reviews: {
        Args: { p_shop_id: string }
        Returns: undefined
      }
      update_shop_review_stats: {
        Args: { p_shop_id: string }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      use_coupon_atomic: {
        Args: {
          p_coupon_code: string
          p_shop_id: string
          p_transaction_id: string
        }
        Returns: undefined
      }
      validate_customer_referral_code: {
        Args: { p_referral_code: string }
        Returns: Json
      }
      validate_phone_number: { Args: { phone: string }; Returns: boolean }
      validate_upi_id: { Args: { upi_id: string }; Returns: boolean }
    }
    Enums: {
      alert_status: "active" | "acknowledged" | "resolved" | "dismissed"
      alert_type: "info" | "warning" | "error" | "critical"
      app_role: "customer" | "shop_owner" | "admin"
      availability_status:
        | "in_stock"
        | "low_stock"
        | "out_of_stock"
        | "discontinued"
      contact_preference: "chat" | "phone" | "email"
      contact_request_status: "new" | "in_progress" | "responded" | "closed"
      content_status: "pending" | "approved" | "rejected" | "flagged"
      coupon_type: "percentage" | "fixed_amount" | "bonus_credits"
      credit_action_type:
        | "add_product"
        | "add_offer"
        | "feature_shop"
        | "feature_product"
        | "feature_offer"
        | "shop_setup_complete"
        | "bulk_product_upload"
      credit_transaction_type:
        | "purchase"
        | "usage"
        | "refund"
        | "bonus"
        | "expiry"
        | "adjustment"
      document_category:
        | "shop_establishment_certificate"
        | "gst_certificate"
        | "trade_license"
        | "udyam_registration"
        | "aadhaar_card"
        | "pan_card"
        | "electricity_bill"
        | "rent_agreement"
      featured_item_status: "active" | "paused" | "completed" | "cancelled"
      inquiry_status:
        | "pending"
        | "quoted"
        | "accepted"
        | "rejected"
        | "completed"
        | "expired"
        | "in_progress"
      message_type: "text" | "image" | "file" | "quote"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
      payment_status:
        | "initiated"
        | "pending"
        | "success"
        | "failed"
        | "refunded"
      payout_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      referral_entity_type: "shop" | "customer"
      referral_transaction_status: "pending" | "completed" | "cancelled"
      shop_status: "pending" | "active" | "suspended" | "rejected" | "closed"
      subscription_status: "active" | "cancelled" | "expired" | "suspended"
      subscription_tier: "basic" | "premium" | "enterprise" | "free"
      support_ticket_category:
        | "payment_issues"
        | "technical_issues"
        | "account_verification"
        | "refunds_disputes"
        | "general_inquiry"
        | "shop_management"
        | "product_issues"
      support_ticket_priority: "low" | "medium" | "high" | "urgent"
      support_ticket_status: "open" | "in_progress" | "resolved" | "closed"
      transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
        | "refunded"
      transaction_type:
        | "order"
        | "refund"
        | "commission"
        | "payout"
        | "subscription"
        | "adjustment"
      user_status: "active" | "inactive" | "suspended" | "banned"
      verification_status:
        | "pending"
        | "verified"
        | "rejected"
        | "requires_update"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      alert_status: ["active", "acknowledged", "resolved", "dismissed"],
      alert_type: ["info", "warning", "error", "critical"],
      app_role: ["customer", "shop_owner", "admin"],
      availability_status: [
        "in_stock",
        "low_stock",
        "out_of_stock",
        "discontinued",
      ],
      contact_preference: ["chat", "phone", "email"],
      contact_request_status: ["new", "in_progress", "responded", "closed"],
      content_status: ["pending", "approved", "rejected", "flagged"],
      coupon_type: ["percentage", "fixed_amount", "bonus_credits"],
      credit_action_type: [
        "add_product",
        "add_offer",
        "feature_shop",
        "feature_product",
        "feature_offer",
        "shop_setup_complete",
        "bulk_product_upload",
      ],
      credit_transaction_type: [
        "purchase",
        "usage",
        "refund",
        "bonus",
        "expiry",
        "adjustment",
      ],
      document_category: [
        "shop_establishment_certificate",
        "gst_certificate",
        "trade_license",
        "udyam_registration",
        "aadhaar_card",
        "pan_card",
        "electricity_bill",
        "rent_agreement",
      ],
      featured_item_status: ["active", "paused", "completed", "cancelled"],
      inquiry_status: [
        "pending",
        "quoted",
        "accepted",
        "rejected",
        "completed",
        "expired",
        "in_progress",
      ],
      message_type: ["text", "image", "file", "quote"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ],
      payment_status: ["initiated", "pending", "success", "failed", "refunded"],
      payout_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      referral_entity_type: ["shop", "customer"],
      referral_transaction_status: ["pending", "completed", "cancelled"],
      shop_status: ["pending", "active", "suspended", "rejected", "closed"],
      subscription_status: ["active", "cancelled", "expired", "suspended"],
      subscription_tier: ["basic", "premium", "enterprise", "free"],
      support_ticket_category: [
        "payment_issues",
        "technical_issues",
        "account_verification",
        "refunds_disputes",
        "general_inquiry",
        "shop_management",
        "product_issues",
      ],
      support_ticket_priority: ["low", "medium", "high", "urgent"],
      support_ticket_status: ["open", "in_progress", "resolved", "closed"],
      transaction_status: [
        "pending",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      transaction_type: [
        "order",
        "refund",
        "commission",
        "payout",
        "subscription",
        "adjustment",
      ],
      user_status: ["active", "inactive", "suspended", "banned"],
      verification_status: [
        "pending",
        "verified",
        "rejected",
        "requires_update",
      ],
    },
  },
} as const
