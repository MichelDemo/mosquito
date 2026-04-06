import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { envoyerEmailRappel, envoyerWhatsAppRappel } from '@/lib/email/brevo'

interface RouteContext {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: messageId } = params

  try {
    // Vérifier l'authentification
    const supabaseAuth = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()


    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Récupérer le message avec vérification de l'appartenance à la formation du formateur
    const { data: message, error: messageError } = await supabase
      .from('messages_planifies')
      .select(`
        id,
        statut,
        type_planification,
        date_envoi,
        jours_apres_formation,
        formation_id,
        topic_id,
        video_id,
        formations (
          id,
          nom,
          formateur_id,
          date_formation
        ),
        topics (
          titre
        ),
        videos (
          titre,
          vimeo_id
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message introuvable.' },
        { status: 404 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formation = message.formations as any as {
      id: string
      nom: string
      formateur_id: string
      date_formation: string | null
    } | null

    // Vérifier que le formateur connecté est propriétaire de la formation
    if (!formation || formation.formateur_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé.' },
        { status: 403 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topic = message.topics as any as { titre: string } | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const video = message.videos as any as { titre: string; vimeo_id: string } | null

    if (!topic || !video) {
      return NextResponse.json(
        { error: 'Données du message incomplètes.' },
        { status: 422 }
      )
    }

    // Récupérer tous les envois non désabonnés pour ce message
    const { data: envois, error: envoisError } = await supabase
      .from('envois_participants')
      .select(`
        id,
        token,
        participants (
          prenom,
          nom,
          email,
          telephone,
          canal_email,
          canal_whatsapp
        )
      `)
      .eq('message_id', messageId)
      .neq('desabonne', true)

    if (envoisError) {
      console.error('Erreur récupération envois:', envoisError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des destinataires.' },
        { status: 500 }
      )
    }

    if (!envois || envois.length === 0) {
      return NextResponse.json({ envoyes: 0, message: 'Aucun envoi en attente.' })
    }

    let envoyes = 0
    const erreurs: string[] = []
    const now = new Date()

    for (const envoi of envois) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const participant = envoi.participants as any as {
        prenom: string
        nom: string
        email: string
        telephone: string | null
        canal_email: boolean
        canal_whatsapp: boolean
      } | null

      if (!participant) {
        erreurs.push(`Envoi ${envoi.id}: participant manquant.`)
        continue
      }

      let envoiOk = false

      // Envoi email
      if (participant.canal_email !== false) {
        try {
          await envoyerEmailRappel({
            destinataire: { prenom: participant.prenom, nom: participant.nom, email: participant.email },
            formation: { nom: formation.nom },
            topic: { titre: topic.titre },
            video: { titre: video.titre },
            token: envoi.token,
            dateEnvoi: now,
          })
          envoiOk = true
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
          erreurs.push(`Email ${participant.email}: ${msg}`)
          console.error(`Erreur envoi email pour envoi ${envoi.id}:`, emailErr)
        }
      }

      // Envoi WhatsApp (indépendant — n'empêche pas l'email)
      if (participant.canal_whatsapp && participant.telephone &&
          process.env.BREVO_WHATSAPP_SENDER && process.env.BREVO_WHATSAPP_TEMPLATE_ID) {
        try {
          await envoyerWhatsAppRappel({
            destinataire: { prenom: participant.prenom, nom: participant.nom, telephone: participant.telephone },
            formation: { nom: formation.nom },
            topic: { titre: topic.titre },
            video: { titre: video.titre },
            token: envoi.token,
          })
          envoiOk = true
        } catch (waErr) {
          const msg = waErr instanceof Error ? waErr.message : String(waErr)
          erreurs.push(`WhatsApp ${participant.telephone}: ${msg}`)
          console.error(`Erreur envoi WhatsApp pour envoi ${envoi.id}:`, waErr)
        }
      }

      if (envoiOk) {
        await supabase
          .from('envois_participants')
          .update({ statut: 'envoye', envoye_le: now.toISOString() })
          .eq('id', envoi.id)
        envoyes++
      } else {
        await supabase
          .from('envois_participants')
          .update({ statut: 'erreur' })
          .eq('id', envoi.id)
      }
    }

    // Mettre à jour le statut du message si tous les envois sont traités
    if (envoyes > 0) {
      await supabase
        .from('messages_planifies')
        .update({ statut: 'envoye' })
        .eq('id', messageId)
    }

    return NextResponse.json({ envoyes, erreurs })
  } catch (err) {
    console.error('Erreur envoyer-maintenant:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}
