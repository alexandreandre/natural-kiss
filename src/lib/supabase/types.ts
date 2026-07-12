export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alertes: {
        Row: {
          created_at: string
          detectee_le: string
          id: string
          lot_id: string
          message: string
          resolue_le: string | null
          severite: Database["public"]["Enums"]["alerte_severite"]
          statut: Database["public"]["Enums"]["alerte_statut"]
          type: Database["public"]["Enums"]["alerte_type"]
          updated_at: string
          valeur_mesuree: number | null
        }
        Insert: {
          created_at?: string
          detectee_le?: string
          id?: string
          lot_id: string
          message: string
          resolue_le?: string | null
          severite?: Database["public"]["Enums"]["alerte_severite"]
          statut?: Database["public"]["Enums"]["alerte_statut"]
          type: Database["public"]["Enums"]["alerte_type"]
          updated_at?: string
          valeur_mesuree?: number | null
        }
        Update: {
          created_at?: string
          detectee_le?: string
          id?: string
          lot_id?: string
          message?: string
          resolue_le?: string | null
          severite?: Database["public"]["Enums"]["alerte_severite"]
          statut?: Database["public"]["Enums"]["alerte_statut"]
          type?: Database["public"]["Enums"]["alerte_type"]
          updated_at?: string
          valeur_mesuree?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alertes_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "alertes_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      anomalies_documentaires: {
        Row: {
          champ: string | null
          code: string
          created_at: string
          id: string
          lot_id: string
          message: string
          resolue: boolean
          severite: Database["public"]["Enums"]["anomalie_severite"]
          valeurs: Json
        }
        Insert: {
          champ?: string | null
          code: string
          created_at?: string
          id?: string
          lot_id: string
          message: string
          resolue?: boolean
          severite: Database["public"]["Enums"]["anomalie_severite"]
          valeurs?: Json
        }
        Update: {
          champ?: string | null
          code?: string
          created_at?: string
          id?: string
          lot_id?: string
          message?: string
          resolue?: boolean
          severite?: Database["public"]["Enums"]["anomalie_severite"]
          valeurs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_documentaires_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "anomalies_documentaires_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          date_expiration: string | null
          date_obtention: string | null
          id: string
          notes: string | null
          numero: string | null
          organisme: string | null
          pays: string[]
          produits: string[]
          statut: Database["public"]["Enums"]["certif_statut"]
          storage_path: string | null
          type: Database["public"]["Enums"]["certif_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_expiration?: string | null
          date_obtention?: string | null
          id?: string
          notes?: string | null
          numero?: string | null
          organisme?: string | null
          pays?: string[]
          produits?: string[]
          statut?: Database["public"]["Enums"]["certif_statut"]
          storage_path?: string | null
          type: Database["public"]["Enums"]["certif_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_expiration?: string | null
          date_obtention?: string | null
          id?: string
          notes?: string | null
          numero?: string | null
          organisme?: string | null
          pays?: string[]
          produits?: string[]
          statut?: Database["public"]["Enums"]["certif_statut"]
          storage_path?: string | null
          type?: Database["public"]["Enums"]["certif_type"]
          updated_at?: string
        }
        Relationships: []
      }
      certificats_destruction: {
        Row: {
          created_at: string
          emis_le: string
          id: string
          lot_id: string
          motif: string
          quantite: number | null
          storage_path: string | null
          unite: string | null
        }
        Insert: {
          created_at?: string
          emis_le?: string
          id?: string
          lot_id: string
          motif: string
          quantite?: number | null
          storage_path?: string | null
          unite?: string | null
        }
        Update: {
          created_at?: string
          emis_le?: string
          id?: string
          lot_id?: string
          motif?: string
          quantite?: number | null
          storage_path?: string | null
          unite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificats_destruction_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "certificats_destruction_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      conformite_checks: {
        Row: {
          created_at: string
          id: string
          libelle: string
          lot_id: string
          message: string | null
          regle: string
          statut: Database["public"]["Enums"]["conformite_statut"]
        }
        Insert: {
          created_at?: string
          id?: string
          libelle: string
          lot_id: string
          message?: string | null
          regle: string
          statut: Database["public"]["Enums"]["conformite_statut"]
        }
        Update: {
          created_at?: string
          id?: string
          libelle?: string
          lot_id?: string
          message?: string | null
          regle?: string
          statut?: Database["public"]["Enums"]["conformite_statut"]
        }
        Relationships: [
          {
            foreignKeyName: "conformite_checks_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "conformite_checks_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes: {
        Row: {
          certifs_manquantes: string[]
          certifs_requises: string[]
          client_id: string | null
          client_nom: string
          contact_email: string | null
          created_at: string
          decision: Database["public"]["Enums"]["demande_decision"]
          espace_client_cree: boolean
          id: string
          pack_envoye_at: string | null
          pays: string
          produit: string
          raison: string | null
          statut: Database["public"]["Enums"]["demande_statut"]
          updated_at: string
          volume: string | null
        }
        Insert: {
          certifs_manquantes?: string[]
          certifs_requises?: string[]
          client_id?: string | null
          client_nom: string
          contact_email?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["demande_decision"]
          espace_client_cree?: boolean
          id?: string
          pack_envoye_at?: string | null
          pays: string
          produit: string
          raison?: string | null
          statut?: Database["public"]["Enums"]["demande_statut"]
          updated_at?: string
          volume?: string | null
        }
        Update: {
          certifs_manquantes?: string[]
          certifs_requises?: string[]
          client_id?: string | null
          client_nom?: string
          contact_email?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["demande_decision"]
          espace_client_cree?: boolean
          id?: string
          pack_envoye_at?: string | null
          pays?: string
          produit?: string
          raison?: string | null
          statut?: Database["public"]["Enums"]["demande_statut"]
          updated_at?: string
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_booking: {
        Row: {
          canal: string | null
          client_id: string
          commande_id: string | null
          created_at: string
          date_souhaitee: string | null
          destination_pays: string | null
          destination_port: string | null
          dossier_texte: string
          envoyee_le: string | null
          id: string
          incoterm: string | null
          lot_id: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          notes: string | null
          planning_id: string | null
          produit: string
          quantite: number | null
          statut: Database["public"]["Enums"]["booking_statut"]
          unite: string | null
          updated_at: string
          variete: string | null
        }
        Insert: {
          canal?: string | null
          client_id: string
          commande_id?: string | null
          created_at?: string
          date_souhaitee?: string | null
          destination_pays?: string | null
          destination_port?: string | null
          dossier_texte: string
          envoyee_le?: string | null
          id?: string
          incoterm?: string | null
          lot_id?: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          notes?: string | null
          planning_id?: string | null
          produit: string
          quantite?: number | null
          statut?: Database["public"]["Enums"]["booking_statut"]
          unite?: string | null
          updated_at?: string
          variete?: string | null
        }
        Update: {
          canal?: string | null
          client_id?: string
          commande_id?: string | null
          created_at?: string
          date_souhaitee?: string | null
          destination_pays?: string | null
          destination_port?: string | null
          dossier_texte?: string
          envoyee_le?: string | null
          id?: string
          incoterm?: string | null
          lot_id?: string | null
          mode?: Database["public"]["Enums"]["transport_mode"]
          notes?: string | null
          planning_id?: string | null
          produit?: string
          quantite?: number | null
          statut?: Database["public"]["Enums"]["booking_statut"]
          unite?: string | null
          updated_at?: string
          variete?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_booking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_booking_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_booking_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "demandes_booking_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_booking_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          lot_id: string
          metadata: Json
          nom_fichier: string
          statut: Database["public"]["Enums"]["document_statut"]
          storage_path: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lot_id: string
          metadata?: Json
          nom_fichier: string
          statut?: Database["public"]["Enums"]["document_statut"]
          storage_path?: string | null
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lot_id?: string
          metadata?: Json
          nom_fichier?: string
          statut?: Database["public"]["Enums"]["document_statut"]
          storage_path?: string | null
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
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
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "evenements_timeline_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_journal: {
        Row: {
          created_at: string
          destinataire: string | null
          evenement: Database["public"]["Enums"]["gate_evenement"]
          id: string
          lot_id: string
          message: string | null
          meta: Json
        }
        Insert: {
          created_at?: string
          destinataire?: string | null
          evenement: Database["public"]["Enums"]["gate_evenement"]
          id?: string
          lot_id: string
          message?: string | null
          meta?: Json
        }
        Update: {
          created_at?: string
          destinataire?: string | null
          evenement?: Database["public"]["Enums"]["gate_evenement"]
          id?: string
          lot_id?: string
          message?: string | null
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gate_journal_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "gate_journal_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      litiges: {
        Row: {
          created_at: string
          description: string
          devise: string
          id: string
          lot_id: string
          montant_conteste: number | null
          ouvert_le: string
          resolu_le: string | null
          resolution: string | null
          statut: Database["public"]["Enums"]["litige_statut"]
          type: Database["public"]["Enums"]["litige_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          devise?: string
          id?: string
          lot_id: string
          montant_conteste?: number | null
          ouvert_le?: string
          resolu_le?: string | null
          resolution?: string | null
          statut?: Database["public"]["Enums"]["litige_statut"]
          type: Database["public"]["Enums"]["litige_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          devise?: string
          id?: string
          lot_id?: string
          montant_conteste?: number | null
          ouvert_le?: string
          resolu_le?: string | null
          resolution?: string | null
          statut?: Database["public"]["Enums"]["litige_statut"]
          type?: Database["public"]["Enums"]["litige_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "litiges_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "litiges_lot_id_fkey"
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
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
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
          ref: string | null
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
          ref?: string | null
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
          ref?: string | null
          site?: string
          traitements?: string[]
          variete?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "origines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "origines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          created_at: string
          devise: string
          echeance: string | null
          id: string
          lot_id: string
          montant: number | null
          notes: string | null
          paye_le: string | null
          statut: Database["public"]["Enums"]["paiement_statut"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          devise?: string
          echeance?: string | null
          id?: string
          lot_id: string
          montant?: number | null
          notes?: string | null
          paye_le?: string | null
          statut?: Database["public"]["Enums"]["paiement_statut"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          devise?: string
          echeance?: string | null
          id?: string
          lot_id?: string
          montant?: number | null
          notes?: string | null
          paye_le?: string | null
          statut?: Database["public"]["Enums"]["paiement_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: true
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "paiements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: true
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      planning: {
        Row: {
          client_id: string | null
          client_nom: string | null
          created_at: string
          destination_pays: string | null
          destination_port: string | null
          id: string
          lot_id: string | null
          notes: string | null
          produit: string
          quantite_prevue: number | null
          semaine_debut: string
          semaine_iso: string
          source: string
          unite: string | null
          updated_at: string
          variete: string | null
        }
        Insert: {
          client_id?: string | null
          client_nom?: string | null
          created_at?: string
          destination_pays?: string | null
          destination_port?: string | null
          id?: string
          lot_id?: string | null
          notes?: string | null
          produit: string
          quantite_prevue?: number | null
          semaine_debut: string
          semaine_iso: string
          source?: string
          unite?: string | null
          updated_at?: string
          variete?: string | null
        }
        Update: {
          client_id?: string | null
          client_nom?: string | null
          created_at?: string
          destination_pays?: string | null
          destination_port?: string | null
          id?: string
          lot_id?: string | null
          notes?: string | null
          produit?: string
          quantite_prevue?: number | null
          semaine_debut?: string
          semaine_iso?: string
          source?: string
          unite?: string | null
          updated_at?: string
          variete?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "planning_lot_id_fkey"
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
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "preuves_produit_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      qualite_imports: {
        Row: {
          created_at: string
          email_id: string
          expediteur: string | null
          id: string
          lot_id: string | null
          message: string | null
          nom_fichier: string
          rapport_id: string | null
          recu_le: string | null
          statut: Database["public"]["Enums"]["qualite_import_statut"]
          sujet: string | null
        }
        Insert: {
          created_at?: string
          email_id: string
          expediteur?: string | null
          id?: string
          lot_id?: string | null
          message?: string | null
          nom_fichier: string
          rapport_id?: string | null
          recu_le?: string | null
          statut: Database["public"]["Enums"]["qualite_import_statut"]
          sujet?: string | null
        }
        Update: {
          created_at?: string
          email_id?: string
          expediteur?: string | null
          id?: string
          lot_id?: string | null
          message?: string | null
          nom_fichier?: string
          rapport_id?: string | null
          recu_le?: string | null
          statut?: Database["public"]["Enums"]["qualite_import_statut"]
          sujet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualite_imports_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "qualite_imports_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualite_imports_rapport_id_fkey"
            columns: ["rapport_id"]
            isOneToOne: false
            referencedRelation: "rapports_qualite"
            referencedColumns: ["id"]
          },
        ]
      }
      rapports_qualite: {
        Row: {
          analyse_ia: Json
          analyse_le: string | null
          created_at: string
          defauts: string[]
          email_id: string | null
          id: string
          lot_id: string
          model: string | null
          nom_fichier: string | null
          recu_le: string | null
          resume: string | null
          score: number | null
          source: Database["public"]["Enums"]["qc_source"]
          storage_path: string | null
          verdict: Database["public"]["Enums"]["qc_verdict"]
        }
        Insert: {
          analyse_ia?: Json
          analyse_le?: string | null
          created_at?: string
          defauts?: string[]
          email_id?: string | null
          id?: string
          lot_id: string
          model?: string | null
          nom_fichier?: string | null
          recu_le?: string | null
          resume?: string | null
          score?: number | null
          source: Database["public"]["Enums"]["qc_source"]
          storage_path?: string | null
          verdict: Database["public"]["Enums"]["qc_verdict"]
        }
        Update: {
          analyse_ia?: Json
          analyse_le?: string | null
          created_at?: string
          defauts?: string[]
          email_id?: string | null
          id?: string
          lot_id?: string
          model?: string | null
          nom_fichier?: string | null
          recu_le?: string | null
          resume?: string | null
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
            referencedRelation: "lot_gate_status"
            referencedColumns: ["lot_id"]
          },
          {
            foreignKeyName: "rapports_qualite_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      taches_correction: {
        Row: {
          assignee: string | null
          certif_type: Database["public"]["Enums"]["certif_type"]
          created_at: string
          demande_id: string
          echeance: string | null
          id: string
          libelle: string
          pays: string
          produit: string
          statut: Database["public"]["Enums"]["tache_statut"]
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          certif_type: Database["public"]["Enums"]["certif_type"]
          created_at?: string
          demande_id: string
          echeance?: string | null
          id?: string
          libelle: string
          pays: string
          produit: string
          statut?: Database["public"]["Enums"]["tache_statut"]
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          certif_type?: Database["public"]["Enums"]["certif_type"]
          created_at?: string
          demande_id?: string
          echeance?: string | null
          id?: string
          libelle?: string
          pays?: string
          produit?: string
          statut?: Database["public"]["Enums"]["tache_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taches_correction_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demandes"
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
      lot_gate_status: {
        Row: {
          anomalies_bloquantes: number | null
          anomalies_total: number | null
          conformite_ko: number | null
          conformite_total: number | null
          lot_id: string | null
          mail_envoye: boolean | null
          statut: Database["public"]["Enums"]["gate_statut"] | null
        }
        Insert: {
          anomalies_bloquantes?: never
          anomalies_total?: never
          conformite_ko?: never
          conformite_total?: never
          lot_id?: string | null
          mail_envoye?: never
          statut?: never
        }
        Update: {
          anomalies_bloquantes?: never
          anomalies_total?: never
          conformite_ko?: never
          conformite_total?: never
          lot_id?: string | null
          mail_envoye?: never
          statut?: never
        }
        Relationships: []
      }
    }
    Functions: {
      current_client_id: { Args: never; Returns: string }
      current_client_ids: { Args: never; Returns: string[] }
      lot_belongs_to_current_user: {
        Args: { p_lot_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alerte_severite: "info" | "avertissement" | "critique"
      alerte_statut: "active" | "resolue" | "ignoree"
      alerte_type:
        | "retard_navire"
        | "excursion_temperature"
        | "document_manquant"
        | "risque_quarantaine"
      anomalie_severite: "mineure" | "majeure" | "critique"
      booking_statut: "brouillon" | "envoye" | "confirme"
      certif_statut: "valide" | "suspendue" | "expiree"
      certif_type: "ggap" | "grasp" | "brcgs" | "smeta" | "sedex"
      conformite_statut: "ok" | "manquant" | "non_conforme" | "non_applicable"
      demande_decision: "en_attente" | "suffisant" | "insuffisant"
      demande_statut: "recue" | "envoyee" | "en_correction" | "cloturee"
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
      gate_evenement: "check_ok" | "mail_envoye" | "override"
      gate_statut: "en_attente" | "vert" | "rouge"
      litige_statut: "ouvert" | "en_cours" | "resolu" | "clos"
      litige_type:
        | "facture_contestee"
        | "sous_evaluation_douaniere"
        | "qualite"
        | "autre"
      lot_statut:
        | "booking"
        | "chargement"
        | "transit"
        | "arrive"
        | "livre"
        | "cloture"
        | "rejete"
      paiement_statut: "a_venir" | "en_attente" | "partiel" | "paye" | "litige"
      preuve_type: "photo_boite" | "qr_chargement" | "autre"
      qc_source: "qc_depart" | "retour_client"
      qc_verdict: "vert" | "orange" | "rouge"
      qualite_import_statut: "rattache" | "non_rattache" | "erreur"
      tache_statut: "a_faire" | "en_cours" | "fait"
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
      alerte_severite: ["info", "avertissement", "critique"],
      alerte_statut: ["active", "resolue", "ignoree"],
      alerte_type: [
        "retard_navire",
        "excursion_temperature",
        "document_manquant",
        "risque_quarantaine",
      ],
      anomalie_severite: ["mineure", "majeure", "critique"],
      booking_statut: ["brouillon", "envoye", "confirme"],
      certif_statut: ["valide", "suspendue", "expiree"],
      certif_type: ["ggap", "grasp", "brcgs", "smeta", "sedex"],
      conformite_statut: ["ok", "manquant", "non_conforme", "non_applicable"],
      demande_decision: ["en_attente", "suffisant", "insuffisant"],
      demande_statut: ["recue", "envoyee", "en_correction", "cloturee"],
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
      gate_evenement: ["check_ok", "mail_envoye", "override"],
      gate_statut: ["en_attente", "vert", "rouge"],
      litige_statut: ["ouvert", "en_cours", "resolu", "clos"],
      litige_type: [
        "facture_contestee",
        "sous_evaluation_douaniere",
        "qualite",
        "autre",
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
      paiement_statut: ["a_venir", "en_attente", "partiel", "paye", "litige"],
      preuve_type: ["photo_boite", "qr_chargement", "autre"],
      qc_source: ["qc_depart", "retour_client"],
      qc_verdict: ["vert", "orange", "rouge"],
      qualite_import_statut: ["rattache", "non_rattache", "erreur"],
      tache_statut: ["a_faire", "en_cours", "fait"],
      transport_mode: ["sea", "roro", "air", "road"],
    },
  },
} as const

