import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, formations, messages_planifies, participants as participantsTable } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

interface RouteParams {
  params: { id: string }
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    // Verify ownership and current status
    const [formation] = isUuid(params.id)
      ? await db
          .select({ id: formations.id, statut: formations.statut })
          .from(formations)
          .where(and(eq(formations.id, params.id), eq(formations.formateur_id, user.id)))
          .limit(1)
      : []

    if (!formation) {
      return NextResponse.json(
        { error: 'Formation introuvable ou accès refusé.' },
        { status: 404 }
      )
    }

    if (formation.statut !== 'brouillon') {
      return NextResponse.json(
        { error: 'Seules les formations en brouillon peuvent être activées.' },
        { status: 400 }
      )
    }

    // Fetch all messages and participants
    const [messages, participants] = await Promise.all([
      db
        .select({ id: messages_planifies.id })
        .from(messages_planifies)
        .where(eq(messages_planifies.formation_id, params.id)),
      db
        .select({ id: participantsTable.id })
        .from(participantsTable)
        .where(eq(participantsTable.formation_id, params.id)),
    ])

    // Generate envois_participants (one per participant per message)
    const envoisInserts = messages.flatMap((message) =>
      participants.map((participant) => ({
        message_id: message.id,
        participant_id: participant.id,
        token: crypto.randomUUID(),
        statut: 'en_attente' as const,
        quiz_complete: false,
      }))
    )

    if (envoisInserts.length === 0) {
      return NextResponse.json(
        { error: `Aucun envoi à créer. Messages: ${messages.length}, Participants: ${participants.length}` },
        { status: 400 }
      )
    }

    // Activation et création des envois ensemble : en cas d'échec, la formation reste
    // en brouillon (plus besoin de « revert » manuel).
    try {
      await db.transaction(async (tx) => {
        await tx.update(formations).set({ statut: 'active' }).where(eq(formations.id, params.id))
        await tx.insert(envois_participants).values(envoisInserts)
      })
    } catch (envoisError) {
      console.error('Erreur création envois:', envoisError)
      return NextResponse.json(
        { error: 'Erreur lors de la génération des envois.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Formation activée avec succès.',
      envois_crees: envoisInserts.length,
    })
  } catch (err) {
    console.error('Erreur inattendue activation:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
