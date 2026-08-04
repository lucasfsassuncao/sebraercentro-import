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
      configuracoes: {
        Row: {
          cpf_consultor: string | null
          descricao_padrao: string | null
          modelos: Json
          municipios: Json
          temas: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf_consultor?: string | null
          descricao_padrao?: string | null
          modelos?: Json
          municipios?: Json
          temas?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf_consultor?: string | null
          descricao_padrao?: string | null
          modelos?: Json
          municipios?: Json
          temas?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cronograma_geracoes: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          projeto_id: string
          total_atendimentos: number
          total_empresas: number
          total_horas: number
          user_id: string
          usuario: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          projeto_id: string
          total_atendimentos?: number
          total_empresas?: number
          total_horas?: number
          user_id: string
          usuario?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          projeto_id?: string
          total_atendimentos?: number
          total_empresas?: number
          total_horas?: number
          user_id?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_geracoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      cronogramas: {
        Row: {
          codigo_categoria: string | null
          codigo_disponibilizacao: string | null
          codigo_ibge: string | null
          codigo_meio_atendimento: string | null
          codigo_tema: string | null
          consultor: string | null
          cpf_consultor: string | null
          created_at: string
          data: string
          descricao: string | null
          empresa_id: string
          etapa: string | null
          geracao_id: string | null
          hora: string | null
          horas: number
          id: string
          municipio: string | null
          ordem: number
          projeto_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo_categoria?: string | null
          codigo_disponibilizacao?: string | null
          codigo_ibge?: string | null
          codigo_meio_atendimento?: string | null
          codigo_tema?: string | null
          consultor?: string | null
          cpf_consultor?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          empresa_id: string
          etapa?: string | null
          geracao_id?: string | null
          hora?: string | null
          horas?: number
          id?: string
          municipio?: string | null
          ordem?: number
          projeto_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo_categoria?: string | null
          codigo_disponibilizacao?: string | null
          codigo_ibge?: string | null
          codigo_meio_atendimento?: string | null
          codigo_tema?: string | null
          consultor?: string | null
          cpf_consultor?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          empresa_id?: string
          etapa?: string | null
          geracao_id?: string | null
          hora?: string | null
          horas?: number
          id?: string
          municipio?: string | null
          ordem?: number
          projeto_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronogramas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          consultor: string | null
          cpf_cliente: string | null
          cpf_consultor: string | null
          created_at: string
          etapa_t0: boolean
          etapa_t1: boolean
          etapa_t2: boolean
          etapa_t3: boolean
          etapa_t4: boolean
          horas_lancadas: number
          horas_previstas: number
          id: string
          observacoes: string | null
          porte: string | null
          projeto_id: string
          razao_social: string
          status: string
          ultima_data: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          consultor?: string | null
          cpf_cliente?: string | null
          cpf_consultor?: string | null
          created_at?: string
          etapa_t0?: boolean
          etapa_t1?: boolean
          etapa_t2?: boolean
          etapa_t3?: boolean
          etapa_t4?: boolean
          horas_lancadas?: number
          horas_previstas?: number
          id?: string
          observacoes?: string | null
          porte?: string | null
          projeto_id: string
          razao_social: string
          status?: string
          ultima_data?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          consultor?: string | null
          cpf_cliente?: string | null
          cpf_consultor?: string | null
          created_at?: string
          etapa_t0?: boolean
          etapa_t1?: boolean
          etapa_t2?: boolean
          etapa_t3?: boolean
          etapa_t4?: boolean
          horas_lancadas?: number
          horas_previstas?: number
          id?: string
          observacoes?: string | null
          porte?: string | null
          projeto_id?: string
          razao_social?: string
          status?: string
          ultima_data?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      export_history: {
        Row: {
          data_exportacao: string
          geracao_id: string | null
          id: string
          mensagem_erro: string | null
          nome_arquivo: string
          projeto_id: string | null
          quantidade_registros: number
          status: string
          user_id: string
          usuario: string | null
        }
        Insert: {
          data_exportacao?: string
          geracao_id?: string | null
          id?: string
          mensagem_erro?: string | null
          nome_arquivo: string
          projeto_id?: string | null
          quantidade_registros?: number
          status?: string
          user_id: string
          usuario?: string | null
        }
        Update: {
          data_exportacao?: string
          geracao_id?: string | null
          id?: string
          mensagem_erro?: string | null
          nome_arquivo?: string
          projeto_id?: string | null
          quantidade_registros?: number
          status?: string
          user_id?: string
          usuario?: string | null
        }
        Relationships: []
      }
      feriados: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      historico: {
        Row: {
          created_at: string
          data: string
          empresa_id: string | null
          empresa_nome: string | null
          id: string
          observacoes: string | null
          projeto_id: string | null
          projeto_nome: string | null
          status: string | null
          user_id: string
          usuario: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          empresa_id?: string | null
          empresa_nome?: string | null
          id?: string
          observacoes?: string | null
          projeto_id?: string | null
          projeto_nome?: string | null
          status?: string | null
          user_id: string
          usuario?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string | null
          empresa_nome?: string | null
          id?: string
          observacoes?: string | null
          projeto_id?: string | null
          projeto_nome?: string | null
          status?: string | null
          user_id?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          codigo_categoria: string | null
          codigo_disponibilizacao: string | null
          codigo_ibge: string | null
          codigo_meio_atendimento: string | null
          codigo_tema: string | null
          consultor: string | null
          cpf_consultor: string | null
          created_at: string
          data_inicial: string | null
          descricao_padrao: string | null
          id: string
          modelo: string | null
          municipio: string | null
          nome: string
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo_categoria?: string | null
          codigo_disponibilizacao?: string | null
          codigo_ibge?: string | null
          codigo_meio_atendimento?: string | null
          codigo_tema?: string | null
          consultor?: string | null
          cpf_consultor?: string | null
          created_at?: string
          data_inicial?: string | null
          descricao_padrao?: string | null
          id?: string
          modelo?: string | null
          municipio?: string | null
          nome: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo_categoria?: string | null
          codigo_disponibilizacao?: string | null
          codigo_ibge?: string | null
          codigo_meio_atendimento?: string | null
          codigo_tema?: string | null
          consultor?: string | null
          cpf_consultor?: string | null
          created_at?: string
          data_inicial?: string | null
          descricao_padrao?: string | null
          id?: string
          modelo?: string | null
          municipio?: string | null
          nome?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
