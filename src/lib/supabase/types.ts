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
      clients: {
        Row: {
          contact_email: string | null
          contact_nom: string | null
          created_at: string
          id: string
          nom: string
          notes: string | null
          pays: string | null
          portail_user_id: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_nom?: string | null
          created_at?: string
          id?: string
          nom: string
          notes?: string | null
          pays?: string | null
          portail_user_id?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_nom?: string | null
          created_at?: string
          id?: string
          nom?: string
          notes?: string | null
          pays?: string | null
          portail_user_id?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      commandes: {
        Row: {
          client_id: string
          created_at: string
          devise: string
          id: string
          incoterm: string | null
          pays_destination: string | null
          prix_unitaire: number | null
          produit: string
          quantite: number | null
          reference: string
          unite: string | null
          updated_at: string
          variete: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          devise?: string
          id?: string
          incoterm?: string | null
          pays_destination?: string | null
          prix_unitaire?: number | null
          produit: string
          quantite?: number | null
          reference: string
          unite?: string | null
          updated_at?: string
          variete?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          devise?: string
          id?: string
          incoterm?: string | null
          pays_destination?: string | null
          prix_unitaire?: number | null
          produit?: string
          quantite?: number | null
          reference?: string
          unite?: string | null
          updated_at?: string
          variete?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commandes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          lot_id: string
          nom_fichier: string
          statut: Database["public"]["Enums"]["document_statut"]
          storage_path: string | null
          type: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          lot_id: string
          nom_fichier: string
          statut?: Database["public"]["Enums"]["document_statut"]
          storage_path?: string | null
          type: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          created_at?: string
          id?: string
          lot_id?: string
          nom_fichier?: string
          statut?: Database["public"]["Enums"]["document_statut"]
          storage_path?: string | null
          type?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      evenements_timeline: {
        Row: {
          at: string
          code: Database["public"]["Enums"]["evenement_code"]
          created_at: string
          id: string
          label: string
          lieu: string | null
          lot_id: string
          mode: Database["public"]["Enums"]["transport_mode"] | null
        }
        Insert: {
          at: string
          code: Database["public"]["Enums"]["evenement_code"]
          created_at?: string
          id?: string
          label: string
          lieu?: string | null
          lot_id: string
          mode?: Database["public"]["Enums"]["transport_mode"] | null
        }
        Update: {
          at?: string
          code?: Database["public"]["Enums"]["evenement_code"]
          created_at?: string
          id?: string
          label?: string
          lieu?: string | null
          lot_id?: string
          mode?: Database["public"]["Enums"]["transport_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "evenements_timeline_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          client_id: string
          commande_id: string | null
          created_at: string
          date_arrivee_prevue: string | null
          date_arrivee_reelle: string | null
          date_booking: string | null
          date_depart: string | null
          destination_pays: string | null
          destination_port: string | null
          id: string
          mode: Database["public"]["Enums"]["transport_mode"]
          notes: string | null
          numero_conteneur: string | null
          origine_port: string | null
          produit: string
          reference: string
          score_risque: number | null
          statut: Database["public"]["Enums"]["lot_statut"]
          temperature_consigne_c: number | null
          transporteur_id: string | null
          updated_at: string
          variete: string | null
        }
        Insert: {
          client_id: string
          commande_id?: string | null
          created_at?: string
          date_arrivee_prevue?: string | null
          date_arrivee_reelle?: string | null
          date_booking?: string | null
          date_depart?: string | null
          destination_pays?: string | null
          destination_port?: string | null
          id?: string
          mode: Database["public"]["Enums"]["transport_mode"]
          notes?: string | null
          numero_conteneur?: string | null
          origine_port?: string | null
          produit: string
          reference: string
          score_risque?: number | null
          statut?: Database["public"]["Enums"]["lot_statut"]
          temperature_consigne_c?: number | null
          transporteur_id?: string | null
          updated_at?: string
          variete?: string | null
        }
        Update: {
          client_id?: string
          commande_id?: string | null
          created_at?: string
          date_arrivee_prevue?: string | null
          date_arrivee_reelle?: string | null
          date_booking?: string | null
          date_depart?: string | null
          destination_pays?: string | null
          destination_port?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["transport_mode"]
          notes?: string | null
          numero_conteneur?: string | null
          origine_port?: string | null
          produit?: string
          reference?: string
          score_risque?: number | null
          statut?: Database["public"]["Enums"]["lot_statut"]
          temperature_consigne_c?: number | null
          transporteur_id?: string | null
          updated_at?: string
          variete?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_transporteur_id_fkey"
            columns: ["transporteur_id"]
            isOneToOne: false
            referencedRelation: "transporteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      mesures_capteur: {
        Row: {
          at: string
          created_at: string
          humidite_pct: number | null
          id: string
          lat: number | null
          lng: number | null
          lot_id: string
          temp_c: number | null
        }
        Insert: {
          at: string
          created_at?: string
          humidite_pct?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          lot_id: string
          temp_c?: number | null
        }
        Update: {
          at?: string
          created_at?: string
          humidite_pct?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          lot_id?: string
          temp_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mesures_capteur_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      origines: {
        Row: {
          created_at: string
          date_recolte: string | null
          id: string
          lot_id: string
          parcelle: string | null
          site: string
          traitements: string[]
          variete: string | null
        }
        Insert: {
          created_at?: string
          date_recolte?: string | null
          id?: string
          lot_id: string
          parcelle?: string | null
          site: string
          traitements?: string[]
          variete?: string | null
        }
        Update: {
          created_at?: string
          date_recolte?: string | null
          id?: string
          lot_id?: string
          parcelle?: string | null
          site?: string
          traitements?: string[]
          variete?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "origines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      preuves_produit: {
        Row: {
          created_at: string
          id: string
          lot_id: string
          prise_le: string | null
          storage_path: string | null
          type: Database["public"]["Enums"]["preuve_type"]
          visible_client: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          lot_id: string
          prise_le?: string | null
          storage_path?: string | null
          type: Database["public"]["Enums"]["preuve_type"]
          visible_client?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          lot_id?: string
          prise_le?: string | null
          storage_path?: string | null
          type?: Database["public"]["Enums"]["preuve_type"]
          visible_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "preuves_produit_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      rapports_qualite: {
        Row: {
          created_at: string
          defauts: string[]
          id: string
          lot_id: string
          recu_le: string | null
          score: number | null
          source: Database["public"]["Enums"]["qc_source"]
          storage_path: string | null
          verdict: Database["public"]["Enums"]["qc_verdict"]
        }
        Insert: {
          created_at?: string
          defauts?: string[]
          id?: string
          lot_id: string
          recu_le?: string | null
          score?: number | null
          source: Database["public"]["Enums"]["qc_source"]
          storage_path?: string | null
          verdict: Database["public"]["Enums"]["qc_verdict"]
        }
        Update: {
          created_at?: string
          defauts?: string[]
          id?: string
          lot_id?: string
          recu_le?: string | null
          score?: number | null
          source?: Database["public"]["Enums"]["qc_source"]
          storage_path?: string | null
          verdict?: Database["public"]["Enums"]["qc_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "rapports_qualite_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      transporteurs: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["transport_mode"] | null
          nom: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["transport_mode"] | null
          nom: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["transport_mode"] | null
          nom?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_client_id: { Args: never; Returns: string }
    }
    Enums: {
      document_statut: "recu" | "verifie" | "anomalie"
      document_type:
        | "facture"
        | "bl"
        | "phyto"
        | "packing_list"
        | "certificat_origine"
        | "ched_pp"
        | "autre"
      evenement_code:
        | "booking"
        | "loading"
        | "departure"
        | "transit"
        | "port_call"
        | "arrival"
        | "customs"
        | "delivery"
      lot_statut:
        | "booking"
        | "chargement"
        | "transit"
        | "arrive"
        | "livre"
        | "cloture"
        | "rejete"
      preuve_type: "photo_boite" | "qr_chargement" | "autre"
      qc_source: "qc_depart" | "retour_client"
      qc_verdict: "vert" | "orange" | "rouge"
      transport_mode: "sea" | "roro" | "air" | "road"
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
      document_statut: ["recu", "verifie", "anomalie"],
      document_type: [
        "facture",
        "bl",
        "phyto",
        "packing_list",
        "certificat_origine",
        "ched_pp",
        "autre",
      ],
      evenement_code: [
        "booking",
        "loading",
        "departure",
        "transit",
        "port_call",
        "arrival",
        "customs",
        "delivery",
      ],
      lot_statut: [
        "booking",
        "chargement",
        "transit",
        "arrive",
        "livre",
        "cloture",
        "rejete",
      ],
      preuve_type: ["photo_boite", "qr_chargement", "autre"],
      qc_source: ["qc_depart", "retour_client"],
      qc_verdict: ["vert", "orange", "rouge"],
      transport_mode: ["sea", "roro", "air", "road"],
    },
  },
} as const
