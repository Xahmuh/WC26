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
      hero_slides: {
        Row: {
          background_color: string
          created_at: string
          created_by: string | null
          id: string
          image_path: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_path: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_slides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hero_slides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_state: {
        Row: {
          id: boolean
          refreshed_at: string | null
          refreshed_for_day: string | null
          version: number
        }
        Insert: {
          id?: boolean
          refreshed_at?: string | null
          refreshed_for_day?: string | null
          version?: number
        }
        Update: {
          id?: boolean
          refreshed_at?: string | null
          refreshed_for_day?: string | null
          version?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          created_at: string
          external_id: number
          group_name: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          is_placeholder: boolean
          kickoff_time: string
          last_synced_at: string | null
          points_multiplier: number
          stage: Database["public"]["Enums"]["match_stage"]
          status: Database["public"]["Enums"]["match_status"]
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id: number
          group_name?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_placeholder?: boolean
          kickoff_time: string
          last_synced_at?: string | null
          points_multiplier?: number
          stage?: Database["public"]["Enums"]["match_stage"]
          status?: Database["public"]["Enums"]["match_status"]
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id?: number
          group_name?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_placeholder?: boolean
          kickoff_time?: string
          last_synced_at?: string | null
          points_multiplier?: number
          stage?: Database["public"]["Enums"]["match_stage"]
          status?: Database["public"]["Enums"]["match_status"]
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      points: {
        Row: {
          away_goal_points: number
          calculated_at: string
          exact_bonus: number
          home_goal_points: number
          id: string
          match_id: string | null
          question_id: string | null
          total_points: number
          user_id: string
          winner_points: number
        }
        Insert: {
          away_goal_points?: number
          calculated_at?: string
          exact_bonus?: number
          home_goal_points?: number
          id?: string
          match_id?: string | null
          question_id?: string | null
          total_points?: number
          user_id: string
          winner_points?: number
        }
        Update: {
          away_goal_points?: number
          calculated_at?: string
          exact_bonus?: number
          home_goal_points?: number
          id?: string
          match_id?: string | null
          question_id?: string | null
          total_points?: number
          user_id?: string
          winner_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "points_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          created_by: string | null
          id: string
          lock_at: string
          options: Json
          points: number
          question_text: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lock_at?: string
          options: Json
          points?: number
          question_text: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lock_at?: string
          options?: Json
          points?: number
          question_text?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prediction_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          match_id: string
          pred_away_score: number
          pred_home_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          match_id: string
          pred_away_score: number
          pred_home_score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          match_id?: string
          pred_away_score?: number
          pred_home_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string | null
          created_at: string
          external_id: number
          flag_url: string | null
          group_name: string | null
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          external_id: number
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          external_id?: number
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      user_question_predictions: {
        Row: {
          created_at: string
          id: string
          prediction: string
          question_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prediction: string
          question_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prediction?: string
          question_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_predictions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "prediction_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_question_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rank_snapshot: {
        Row: {
          rank: number | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          rank?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          rank?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rank_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_rank_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          email: string | null
          id: string
          is_deleted: boolean
          last_login: string | null
          role: string
          supported_teams: string[] | null
          total_points: number
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          email?: string | null
          id: string
          is_deleted?: boolean
          last_login?: string | null
          role?: string
          supported_teams?: string[] | null
          total_points?: number
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_deleted?: boolean
          last_login?: string | null
          role?: string
          supported_teams?: string[] | null
          total_points?: number
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          exact_predictions: number | null
          predictions_made: number | null
          predictions_scored: number | null
          rank: number | null
          total_points: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      user_performance: {
        Row: {
          correct_predictions: number | null
          exact_predictions: number | null
          matches_participated: number | null
          total_points: number | null
          total_predictions: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_broadcast: {
        Args: { p_body: string; p_title: string; p_type: string }
        Returns: number
      }
      admin_delete_match: { Args: { p_match_id: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_get_question_submissions: {
        Args: { p_question_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          id: string
          prediction: string
          status: string
          user_id: string
        }[]
      }
      admin_restore_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_set_user_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      admin_soft_delete_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      finalize_leaderboard: { Args: { p_day?: string }; Returns: undefined }
      get_user_streak: { Args: { p_user_id: string }; Returns: Json }
      is_active_user: { Args: { p_user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      lock_predictions_at_kickoff: { Args: never; Returns: undefined }
      match_day: { Args: { p_kickoff: string }; Returns: string }
      maybe_finalize_day: { Args: { p_day: string }; Returns: undefined }
      refresh_leaderboard: { Args: never; Returns: undefined }
      resolve_prediction_question: {
        Args: { p_correct_answer: string; p_question_id: string }
        Returns: undefined
      }
      score_match: { Args: { p_match_id: string }; Returns: number }
      sync_matches: { Args: { p_matches: Json }; Returns: number }
      tournament_tz: { Args: never; Returns: string }
      update_username: { Args: { p_username: string }; Returns: undefined }
    }
    Enums: {
      match_stage:
        | "GROUP"
        | "ROUND_OF_16"
        | "QUARTER_FINAL"
        | "SEMI_FINAL"
        | "THIRD_PLACE"
        | "FINAL"
      match_status:
        | "SCHEDULED"
        | "IN_PLAY"
        | "FINISHED"
        | "POSTPONED"
        | "CANCELLED"
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
      match_stage: [
        "GROUP",
        "ROUND_OF_16",
        "QUARTER_FINAL",
        "SEMI_FINAL",
        "THIRD_PLACE",
        "FINAL",
      ],
      match_status: [
        "SCHEDULED",
        "IN_PLAY",
        "FINISHED",
        "POSTPONED",
        "CANCELLED",
      ],
    },
  },
} as const
