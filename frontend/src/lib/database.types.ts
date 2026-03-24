export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          id: string
          user_id: string
          name: string
          nickname: string | null
          initials: string
          avatar_color: string
          avatar_url: string | null
          location: string | null
          tier: 'inner-circle' | 'close-friend' | 'casual'
          met_how: string | null
          met_date: string | null
          birthday: string | null
          day_count: number
          tags: string[]
          interests: string[]
          ai_label: string | null
          hangout_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          nickname?: string | null
          initials: string
          avatar_color: string
          avatar_url?: string | null
          location?: string | null
          tier?: 'inner-circle' | 'close-friend' | 'casual'
          met_how?: string | null
          met_date?: string | null
          birthday?: string | null
          day_count?: number
          tags?: string[]
          interests?: string[]
          ai_label?: string | null
          hangout_count?: number
        }
        Update: {
          name?: string
          nickname?: string | null
          initials?: string
          avatar_color?: string
          avatar_url?: string | null
          location?: string | null
          tier?: 'inner-circle' | 'close-friend' | 'casual'
          met_how?: string | null
          met_date?: string | null
          birthday?: string | null
          day_count?: number
          tags?: string[]
          interests?: string[]
          ai_label?: string | null
          hangout_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      friend_contacts: {
        Row: {
          id: string
          friend_id: string
          phone: string | null
          email: string | null
          instagram: string | null
          twitter: string | null
          linkedin: string | null
          snapchat: string | null
        }
        Insert: {
          id?: string
          friend_id: string
          phone?: string | null
          email?: string | null
          instagram?: string | null
          twitter?: string | null
          linkedin?: string | null
          snapchat?: string | null
        }
        Update: {
          phone?: string | null
          email?: string | null
          instagram?: string | null
          twitter?: string | null
          linkedin?: string | null
          snapchat?: string | null
        }
        Relationships: []
      }
      friend_facts: {
        Row: {
          id: string
          friend_id: string
          category: string
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          friend_id: string
          category: string
          value: string
        }
        Update: {
          category?: string
          value?: string
        }
        Relationships: []
      }
      friend_notes: {
        Row: {
          id: string
          friend_id: string
          text: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          friend_id: string
          text: string
          date?: string
        }
        Update: {
          text?: string
          date?: string
        }
        Relationships: []
      }
      hangouts: {
        Row: {
          id: string
          user_id: string
          type: string
          location: string
          date: string
          highlights: string | null
          follow_ups: string[]
          rating: number | null
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          location: string
          date: string
          highlights?: string | null
          follow_ups?: string[]
          rating?: number | null
          tags?: string[]
        }
        Update: {
          type?: string
          location?: string
          date?: string
          highlights?: string | null
          follow_ups?: string[]
          rating?: number | null
          tags?: string[]
        }
        Relationships: []
      }
      hangout_friends: {
        Row: {
          id: string
          hangout_id: string
          friend_id: string
          feeling_label: string | null
        }
        Insert: {
          id?: string
          hangout_id: string
          friend_id: string
          feeling_label?: string | null
        }
        Update: {
          feeling_label?: string | null
        }
        Relationships: []
      }
      impressions: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          title: string
          body: string
          date: string
          created_at: string
          hidden_from_ai: boolean
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          title: string
          body: string
          date?: string
          hidden_from_ai?: boolean
        }
        Update: {
          title?: string
          body?: string
          date?: string
          hidden_from_ai?: boolean
        }
        Relationships: []
      }
      nudges: {
        Row: {
          id: string
          user_id: string
          icon: 'clock' | 'cake' | 'check'
          message: string
          type: 'drift' | 'birthday' | 'followup'
          ai_action: boolean
          dismissed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          icon: 'clock' | 'cake' | 'check'
          message: string
          type: 'drift' | 'birthday' | 'followup'
          ai_action?: boolean
          dismissed?: boolean
        }
        Update: {
          dismissed?: boolean
        }
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          user_id: string
          hangout_id: string | null
          friend_id: string
          description: string
          amount: number
          direction: 'owe' | 'owed'
          settled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          hangout_id?: string | null
          friend_id: string
          description: string
          amount: number
          direction: 'owe' | 'owed'
          settled?: boolean
        }
        Update: {
          settled?: boolean
          description?: string
          amount?: number
        }
        Relationships: []
      }
      profile_customizations: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          theme_color: string | null
          font: string | null
          effect: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          theme_color?: string | null
          font?: string | null
          effect?: string | null
        }
        Update: {
          theme_color?: string | null
          font?: string | null
          effect?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          dashboard_layout: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dashboard_layout?: Json | null
        }
        Update: {
          dashboard_layout?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          id: string
          user_id: string
          friend_id: string | null
          hangout_id: string | null
          url: string
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id?: string | null
          hangout_id?: string | null
          url: string
          caption?: string | null
        }
        Update: {
          caption?: string | null
        }
        Relationships: []
      }
      friend_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          symbol: string
          description: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          symbol?: string
          description?: string | null
          avatar_url?: string | null
        }
        Update: {
          name?: string
          color?: string
          symbol?: string
          description?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      friend_group_members: {
        Row: {
          id: string
          group_id: string
          friend_id: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          friend_id: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      hangout_groups: {
        Row: {
          id: string
          hangout_id: string
          group_id: string
          created_at: string
        }
        Insert: {
          id?: string
          hangout_id: string
          group_id: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      tier_type: 'inner-circle' | 'close-friend' | 'casual'
      nudge_icon: 'clock' | 'cake' | 'check'
      nudge_type: 'drift' | 'birthday' | 'followup'
      debt_direction: 'owe' | 'owed'
    }
    CompositeTypes: { [_ in never]: never }
  }
}
