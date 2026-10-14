import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, messages_planifies } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { envoyerEmailRappel, envoyerWhatsAppRappel } from '@/lib/email/brevo'
import { isUuid } from '@/lib/uuid'

interface RouteContext {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: messageId } = params

  try {
    // Vérifier l'authentification
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 }
      )
    }

    // Récupérer le message avec vérification de l'appartenance à la formation du formateur
    const message = isUuid(messageId)
      ? await db.query.messages_planifies.findFirst({
          columns: {
            id: true,
            statut: true,
            type_planification: true,
            date_envoi: true,
            jours_apres_formation: true,
            formation_id: true,
            topic_id: true,
            video_id: true,
          },
          with: {
            formations: { columns: { id: true, nom: true, formateur_id: true, date_formation: true } },
            topics: { columns: { titre: true } },
            videos: { columns: { titre: true, vimeo_id: true } },
          },
          where: eq(messages_planifies.id, messageId),
        })
      : undefined

    if (!message) {
      return NextResponse.json(
        { error: 'Message introuvable.' },
        { status: 404 }
      )
    }

    const formation = message.formations

    // Vérifier que le formateur connecté est propriétaire de la formation
    if (!formation || formation.formateur_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé.' },
        { status: 403 }
      )
    }

    const topic = message.topics
    const video = message.videos

    if (!topic || !video) {
      return NextResponse.json(
        { error: 'Données du message incomplètes.' },
        { status: 422 }
      )
    }

    // Récupérer tous les envois non désabonnés pour ce message
    let envois
    try {
      envois = await db.query.envois_participants.findMany({
        columns: { id: true, token: true },
        with: {
          participants: {
            columns: {
              prenom: true,
              nom: true,
              email: true,
              telephone: true,
              canal_email: true,
              canal_whatsapp: true,
            },
          },
        },
        where: and(eq(envois_participants.message_id, messageId), ne(envois_participants.desabonne, true)),
      })
    } catch (envoisError) {
      console.error('Erreur récupération envois:', envoisError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des destinataires.' },
        { status: 500 }
      )
    }

    if (envois.length === 0) {
      return NextResponse.json({ envoyes: 0, message: 'Aucun envoi en attente.' })
    }

    let envoyes = 0
    const erreurs: string[] = []
    const now = new Date()

    for (const envoi of envois) {
      const participant = envoi.participants

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
        await db
          .update(envois_participants)
          .set({ statut: 'envoye', envoye_le: now.toISOString() })
          .where(eq(envois_participants.id, envoi.id))
        envoyes++
      } else {
        await db
          .update(envois_participants)
          .set({ statut: 'erreur' })
          .where(eq(envois_participants.id, envoi.id))
      }
    }

    // Mettre à jour le statut du message si tous les envois sont traités
    if (envoyes > 0) {
      await db
        .update(messages_planifies)
        .set({ statut: 'envoye' })
        .where(eq(messages_planifies.id, messageId))
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
