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
      colleges: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          college_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          college_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          college_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          invited_at?: string | null
          invited_by?: string | null
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          department_id: string | null
          full_name: string
          id: string
          program: Database["public"]["Enums"]["program_type"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          full_name: string
          id?: string
          program?: Database["public"]["Enums"]["program_type"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          full_name?: string
          id?: string
          program?: Database["public"]["Enums"]["program_type"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          approved_by_avd: string | null
          approved_by_head: string | null
          avd_approved_at: string | null
          cmc_decision: Database["public"]["Enums"]["decision_status"]
          cmc_decision_by: string | null
          cmc_decision_date: string | null
          course_code: string
          course_name: string
          created_at: string
          created_by: string | null
          dac_decision: Database["public"]["Enums"]["decision_status"]
          dac_decision_by: string | null
          dac_decision_date: string | null
          description: string | null
          evidence_url: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          head_approved_at: string | null
          id: string
          incident_date: string
          invigilator: string
          is_repeat_offender: boolean
          student_id: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          violation_type: Database["public"]["Enums"]["violation_type"]
          workflow_status: Database["public"]["Enums"]["workflow_status"]
        }
        Insert: {
          approved_by_avd?: string | null
          approved_by_head?: string | null
          avd_approved_at?: string | null
          cmc_decision?: Database["public"]["Enums"]["decision_status"]
          cmc_decision_by?: string | null
          cmc_decision_date?: string | null
          course_code: string
          course_name: string
          created_at?: string
          created_by?: string | null
          dac_decision?: Database["public"]["Enums"]["decision_status"]
          dac_decision_by?: string | null
          dac_decision_date?: string | null
          description?: string | null
          evidence_url?: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          head_approved_at?: string | null
          id?: string
          incident_date: string
          invigilator: string
          is_repeat_offender?: boolean
          student_id: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          violation_type: Database["public"]["Enums"]["violation_type"]
          workflow_status?: Database["public"]["Enums"]["workflow_status"]
        }
        Update: {
          approved_by_avd?: string | null
          approved_by_head?: string | null
          avd_approved_at?: string | null
          cmc_decision?: Database["public"]["Enums"]["decision_status"]
          cmc_decision_by?: string | null
          cmc_decision_date?: string | null
          course_code?: string
          course_name?: string
          created_at?: string
          created_by?: string | null
          dac_decision?: Database["public"]["Enums"]["decision_status"]
          dac_decision_by?: string | null
          dac_decision_date?: string | null
          description?: string | null
          evidence_url?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          head_approved_at?: string | null
          id?: string
          incident_date?: string
          invigilator?: string
          is_repeat_offender?: boolean
          student_id?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          violation_type?: Database["public"]["Enums"]["violation_type"]
          workflow_status?: Database["public"]["Enums"]["workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "violations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_department: { Args: { _user_id: string }; Returns: string }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_department_access: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "deputy_department_head"
        | "department_head"
        | "academic_vice_dean"
        | "college_dean"
        | "college_registrar"
        | "main_registrar"
        | "vpaa"
        | "system_admin"
      decision_status:
        | "Pending"
        | "Warning Issued"
        | "Grade Penalty"
        | "Course Failure"
        | "Suspension"
        | "Expulsion"
        | "Cleared"
        | "One Grade Down"
        | "F Grade for Course"
        | "F Grade with Disciplinary Action"
        | "Referred to Discipline Committee"
      exam_type: "Mid Exam" | "Final Exam"
      program_type: "BSc" | "MSc" | "PhD"
      violation_type:
        | "Cheating with Notes"
        | "Using Electronic Device"
        | "Copying from Another Student"
        | "Collaboration"
        | "Plagiarism"
        | "Impersonation"
        | "Other"
      workflow_status:
        | "draft"
        | "submitted_to_head"
        | "approved_by_head"
        | "submitted_to_avd"
        | "approved_by_avd"
        | "pending_cmc"
        | "cmc_decided"
        | "closed"
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
        "deputy_department_head",
        "department_head",
        "academic_vice_dean",
        "college_dean",
        "college_registrar",
        "main_registrar",
        "vpaa",
        "system_admin",
      ],
      decision_status: [
        "Pending",
        "Warning Issued",
        "Grade Penalty",
        "Course Failure",
        "Suspension",
        "Expulsion",
        "Cleared",
        "One Grade Down",
        "F Grade for Course",
        "F Grade with Disciplinary Action",
        "Referred to Discipline Committee",
      ],
      exam_type: ["Mid Exam", "Final Exam"],
      program_type: ["BSc", "MSc", "PhD"],
      violation_type: [
        "Cheating with Notes",
        "Using Electronic Device",
        "Copying from Another Student",
        "Collaboration",
        "Plagiarism",
        "Impersonation",
        "Other",
      ],
      workflow_status: [
        "draft",
        "submitted_to_head",
        "approved_by_head",
        "submitted_to_avd",
        "approved_by_avd",
        "pending_cmc",
        "cmc_decided",
        "closed",
      ],
    },
  },
} as const
