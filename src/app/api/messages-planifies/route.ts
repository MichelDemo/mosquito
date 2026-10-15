import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, formations, messages_planifies, participants } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

const MAX_MESSAGES = 45

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { formation_id, topic_id, video_id, type_planification, date_envoi, jours_apres_formation } = body

    if (!formation_id) {
      return NextResponse.json({ error: "L'identifiant de la formation est requis." }, { status: 400 })
    }
    if (!topic_id) {
      return NextResponse.json({ error: 'Le topic est requis.' }, { status: 400 })
    }
    if (!type_planification || !['date_fixe', 'delai_relatif'].includes(type_planification)) {
      return NextResponse.json({ error: 'Le type de planification est invalide.' }, { status: 400 })
    }
    if (type_planification === 'date_fixe' && !date_envoi) {
      return NextResponse.json({ error: "La date d'envoi est requise pour une planification à date fixe." }, { status: 400 })
    }
    if (type_planification === 'delai_relatif' && !jours_apres_formation) {
      return NextResponse.json({ error: 'Le délai en jours est requis pour une planification relative.' }, { status: 400 })
    }

    // Verify formation ownership
    const [formation] = isUuid(formation_id)
      ? await db
          .select({ id: formations.id, statut: formations.statut })
          .from(formations)
          .where(and(eq(formations.id, formation_id), eq(formations.formateur_id, user.id)))
          .limit(1)
      : []

    if (!formation) {
      return NextResponse.json({ error: 'Formation introuvable ou accès refusé.' }, { status: 404 })
    }

    // Check message count limit
    const count = await db.$count(messages_planifies, eq(messages_planifies.formation_id, formation_id))

    if (count >= MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Cette formation a déjà atteint le maximum de ${MAX_MESSAGES} messages planifiés.` },
        { status: 400 }
      )
    }

    // Determine the next order number
    const [lastMessage] = await db
      .select({ numero_ordre: messages_planifies.numero_ordre })
      .from(messages_planifies)
      .where(eq(messages_planifies.formation_id, formation_id))
      .orderBy(desc(messages_planifies.numero_ordre))
      .limit(1)

    const nextOrdre = lastMessage ? lastMessage.numero_ordre + 1 : 1

    // Insert the message
    let message
    try {
      ;[message] = await db
        .insert(messages_planifies)
        .values({
          formation_id,
          topic_id,
          video_id: video_id || null,
          type_planification,
          date_envoi: type_planification === 'date_fixe' ? date_envoi : null,
          jours_apres_formation: type_planification === 'delai_relatif' ? jours_apres_formation : null,
          numero_ordre: nextOrdre,
          statut: 'en_attente',
        })
        .returning()
    } catch (insertError) {
      console.error('Erreur création message planifié:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la création du message.' }, { status: 500 })
    }

    // If formation is already active, create envois for existing participants
    if (formation.statut === 'active') {
      const existants = await db
        .select({ id: participants.id })
        .from(participants)
        .where(eq(participants.formation_id, formation_id))

      if (existants.length > 0) {
        try {
          await db.insert(envois_participants).values(
            existants.map((p) => ({
              message_id: message.id,
              participant_id: p.id,
              statut: 'en_attente',
            }))
          )
        } catch (envoisError) {
          console.error('Erreur création envois_participants:', envoisError)
          // Non-blocking: message created, envois may need to be retried
        }
      }
    }

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    console.error('Erreur inattendue POST messages-planifies:', err)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}
