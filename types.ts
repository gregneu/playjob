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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      buildings: {
        Row: {
          building_type: string
          category: string
          created_at: string | null
          id: string
          priority: number | null
          progress: number | null
          project_id: string
          q: number
          r: number
          task_name: string
          updated_at: string | null
        }
        Insert: {
          building_type: string
          category: string
          created_at?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          project_id: string
          q: number
          r: number
          task_name: string
          updated_at?: string | null
        }
        Update: {
          building_type?: string
          category?: string
          created_at?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          project_id?: string
          q?: number
          r?: number
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          color: number
          created_at: string | null
          id: string
          name: string
          project_id: string | null
        }
        Insert: {
          color: number
          created_at?: string | null
          id?: string
          name: string
          project_id?: string | null
        }
        Update: {
          color?: number
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string | null
        }
        Relationships: []
      }
      hex_cells: {
        Row: {
          building_type: string | null
          category: string | null
          created_at: string | null
          id: string
          priority: number | null
          progress: number | null
          project_id: string
          q: number
          r: number
          state: string | null
          task_name: string | null
          type: string | null
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          building_type?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          project_id: string
          q: number
          r: number
          state?: string | null
          task_name?: string | null
          type?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          building_type?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          project_id?: string
          q?: number
          r?: number
          state?: string | null
          task_name?: string | null
          type?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hex_cells_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hex_cells_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      object_3d_settings: {
        Row: {
          animation_config: Json | null
          created_at: string | null
          id: string
          material_config: Json | null
          model_config: Json | null
          object_type: string
          status: string
        }
        Insert: {
          animation_config?: Json | null
          created_at?: string | null
          id?: string
          material_config?: Json | null
          model_config?: Json | null
          object_type: string
          status: string
        }
        Update: {
          animation_config?: Json | null
          created_at?: string | null
          id?: string
          material_config?: Json | null
          model_config?: Json | null
          object_type?: string
          status?: string
        }
        Relationships: []
      }
      object_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          object_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          object_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          object_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_attachments_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      object_attributes: {
        Row: {
          attribute_key: string
          attribute_type: string | null
          attribute_value: string | null
          created_at: string | null
          id: string
          object_id: string | null
          updated_at: string | null
        }
        Insert: {
          attribute_key: string
          attribute_type?: string | null
          attribute_value?: string | null
          created_at?: string | null
          id?: string
          object_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attribute_key?: string
          attribute_type?: string | null
          attribute_value?: string | null
          created_at?: string | null
          id?: string
          object_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_attributes_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      object_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          object_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          object_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          object_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_comments_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      object_connections: {
        Row: {
          connection_type: string
          created_at: string | null
          id: string
          source_object_id: string | null
          target_object_id: string | null
        }
        Insert: {
          connection_type: string
          created_at?: string | null
          id?: string
          source_object_id?: string | null
          target_object_id?: string | null
        }
        Update: {
          connection_type?: string
          created_at?: string | null
          id?: string
          source_object_id?: string | null
          target_object_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_connections_source_object_id_fkey"
            columns: ["source_object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_connections_target_object_id_fkey"
            columns: ["target_object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      object_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          object_id: string | null
          old_value: Json | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          object_id?: string | null
          old_value?: Json | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          object_id?: string | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "object_history_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      object_tickets: {
        Row: {
          archived_at: string | null
          assignee_id: string | null
          attachments: Json | null
          board_column: string
          checklist: Json
          comments: Json | null
          created_at: string | null
          description: string | null
          id: string
          links: Json
          priority: string
          sprint_id: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
          value: number
          zone_object_id: string
        }
        Insert: {
          archived_at?: string | null
          assignee_id?: string | null
          attachments?: Json | null
          board_column?: string
          checklist?: Json
          comments?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          links?: Json
          priority?: string
          sprint_id?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
          value?: number
          zone_object_id: string
        }
        Update: {
          archived_at?: string | null
          assignee_id?: string | null
          attachments?: Json | null
          board_column?: string
          checklist?: Json
          comments?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          links?: Json
          priority?: string
          sprint_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          value?: number
          zone_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_tickets_sprint_fk"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_tickets_zone_object_id_fkey"
            columns: ["zone_object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_config: Json | null
          avatar_url: string
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_config?: Json | null
          avatar_url?: string
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_config?: Json | null
          avatar_url?: string
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_invitations: {
        Row: {
          email: string
          expires_at: string
          id: string
          invited_at: string | null
          invited_by: string
          project_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          email: string
          expires_at?: string
          id?: string
          invited_at?: string | null
          invited_by: string
          project_id: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string
          project_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          invited_at: string
          invited_by: string | null
          joined_at: string | null
          project_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          project_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          project_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          crystals: number
          description: string | null
          icon: string | null
          id: string
          name: string
          owner_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          crystals?: number
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          owner_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          crystals?: number
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sprints: {
        Row: {
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string
          name: string
          project_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          weeks: number
          zone_object_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          name: string
          project_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          weeks?: number
          zone_object_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          project_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          weeks?: number
          zone_object_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_zone_object_id_fkey"
            columns: ["zone_object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_connections: {
        Row: {
          connection_type: string | null
          created_at: string | null
          from_task_id: string | null
          id: string
          to_task_id: string | null
        }
        Insert: {
          connection_type?: string | null
          created_at?: string | null
          from_task_id?: string | null
          id?: string
          to_task_id?: string | null
        }
        Update: {
          connection_type?: string | null
          created_at?: string | null
          from_task_id?: string | null
          id?: string
          to_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_connections_from_task_id_fkey"
            columns: ["from_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_connections_to_task_id_fkey"
            columns: ["to_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_specialist: string | null
          assignee_id: string | null
          blocked_by: string[] | null
          construction_progress: number | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          epic_id: string | null
          hover_effects: Json | null
          id: string
          is_building_animated: boolean | null
          labels: string[] | null
          name: string
          position_x: number
          position_y: number
          priority: string | null
          project_id: string | null
          status: string | null
          story_points: number | null
          type: string | null
          updated_at: string | null
          visual_state: Json | null
        }
        Insert: {
          assigned_specialist?: string | null
          assignee_id?: string | null
          blocked_by?: string[] | null
          construction_progress?: number | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          epic_id?: string | null
          hover_effects?: Json | null
          id?: string
          is_building_animated?: boolean | null
          labels?: string[] | null
          name: string
          position_x: number
          position_y: number
          priority?: string | null
          project_id?: string | null
          status?: string | null
          story_points?: number | null
          type?: string | null
          updated_at?: string | null
          visual_state?: Json | null
        }
        Update: {
          assigned_specialist?: string | null
          assignee_id?: string | null
          blocked_by?: string[] | null
          construction_progress?: number | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          epic_id?: string | null
          hover_effects?: Json | null
          id?: string
          is_building_animated?: boolean | null
          labels?: string[] | null
          name?: string
          position_x?: number
          position_y?: number
          priority?: string | null
          project_id?: string | null
          status?: string | null
          story_points?: number | null
          type?: string | null
          updated_at?: string | null
          visual_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_cells: {
        Row: {
          created_at: string | null
          id: string
          q: number
          r: number
          zone_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          q: number
          r: number
          zone_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          q?: number
          r?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_cells_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_members: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          user_id: string | null
          zone_object_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
          zone_object_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
          zone_object_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zone_members_zone_object_id_fkey"
            columns: ["zone_object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_object_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_object_id: string
          id: string
          is_primary: boolean
          label: string | null
          link_type: string
          order_index: number
          project_id: string
          to_object_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_object_id: string
          id?: string
          is_primary?: boolean
          label?: string | null
          link_type?: string
          order_index?: number
          project_id: string
          to_object_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_object_id?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          link_type?: string
          order_index?: number
          project_id?: string
          to_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_object_links_from_object_id_fkey"
            columns: ["from_object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_object_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_object_links_to_object_id_fkey"
            columns: ["to_object_id"]
            isOneToOne: false
            referencedRelation: "zone_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_objects: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          object_type: string
          priority: string | null
          q: number
          r: number
          status: string | null
          story_points: number | null
          title: string
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          jitsi_room_id?: string | null
          object_type: string
          priority?: string | null
          q: number
          r: number
          status?: string | null
          story_points?: number | null
          title: string
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          jitsi_room_id?: string | null
          object_type?: string
          priority?: string | null
          q?: number
          r?: number
          status?: string | null
          story_points?: number | null
          title?: string
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zone_objects_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_sprint: {
        Args: { p_sprint_id: string }
        Returns: {
          archived_count: number
        }[]
      }
      get_project_diamonds: {
        Args: { project_uuid: string }
        Returns: number
      }
      get_project_ticket_stats: {
        Args: { project_uuid: string }
        Returns: {
          bug_diamonds: number
          done_tickets: number
          story_diamonds: number
          task_diamonds: number
          test_diamonds: number
          total_diamonds: number
          total_tickets: number
        }[]
      }
      get_user_diamonds: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_ticket_stats: {
        Args: { user_uuid: string }
        Returns: {
          bug_diamonds: number
          done_tickets: number
          story_diamonds: number
          task_diamonds: number
          test_diamonds: number
          total_diamonds: number
          total_tickets: number
        }[]
      }
      get_zone_object_with_attributes: {
        Args: { object_id: string }
        Returns: {
          assignee_id: string
          attributes: Json
          description: string
          id: string
          object_type: string
          priority: string
          q: number
          r: number
          status: string
          story_points: number
          title: string
          zone_id: string
        }[]
      }
      invite_user_to_project: {
        Args: { p_email: string; p_project_id: string; p_role?: string }
        Returns: string
      }
      is_project_member: {
        Args: { p_project_id: string; p_user_id?: string }
        Returns: boolean
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
