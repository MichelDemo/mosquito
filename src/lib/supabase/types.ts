export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      topics: {
        Row: {
          id: string
          titre: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['topics']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['topics']['Insert']>
      }
      videos: {
        Row: {
          id: string
          topic_id: string
          titre: string
          vimeo_id: string
          duree_secondes: number | null
          ordre: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['videos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['videos']['Insert']>
      }
      quiz_questions: {
        Row: {
          id: string
          topic_id: string
          question: string
          options: Json
          bonne_reponse: number
          explication: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['quiz_questions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['quiz_questions']['Insert']>
      }
      formations: {
        Row: {
          id: string
          nom: string
          description: string | null
          formateur_id: string
          statut: 'brouillon' | 'active' | 'terminee'
          date_formation: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['formations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['formations']['Insert']>
      }
      formation_topics: {
        Row: {
          id: string
          formation_id: string
          topic_id: string
          ordre: number
        }
        Insert: Omit<Database['public']['Tables']['formation_topics']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['formation_topics']['Insert']>
      }
      participants: {
        Row: {
          id: string
          formation_id: string
          prenom: string
          nom: string
          email: string
          telephone: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['participants']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['participants']['Insert']>
      }
      messages_planifies: {
        Row: {
          id: string
          formation_id: string
          topic_id: string
          video_id: string
          numero_ordre: number
          type_planification: 'date_fixe' | 'delai_relatif'
          date_envoi: string | null
          jours_apres_formation: number | null
          statut: 'en_attente' | 'envoye' | 'erreur'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages_planifies']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages_planifies']['Insert']>
      }
      envois_participants: {
        Row: {
          id: string
          message_id: string
          participant_id: string
          token: string
          envoye_le: string | null
          ouvert_le: string | null
          quiz_complete: boolean
          statut: 'en_attente' | 'envoye' | 'erreur'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['envois_participants']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['envois_participants']['Insert']>
      }
      quiz_reponses: {
        Row: {
          id: string
          envoi_id: string
          question_id: string
          reponse_choisie: number
          est_correcte: boolean
          repondu_le: string
        }
        Insert: Omit<Database['public']['Tables']['quiz_reponses']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['quiz_reponses']['Insert']>
      }
    }
  }
}
