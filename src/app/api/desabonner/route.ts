import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, messages_planifies } from '@/db/schema'
import { isUuid } from '@/lib/uuid'

export async function POST(request: NextRequest) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })
  }

  // Récupérer l'envoi via le token
  const [envoi] = isUuid(token)
    ? await db
        .select({
          id: envois_participants.id,
          participant_id: envois_participants.participant_id,
          message_id: envois_participants.message_id,
        })
        .from(envois_participants)
        .where(eq(envois_participants.token, token))
        .limit(1)
    : []

  if (!envoi) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  // Récupérer le topic_id via le message
  const [msg] = await db
    .select({ topic_id: messages_planifies.topic_id })
    .from(messages_planifies)
    .where(eq(messages_planifies.id, envoi.message_id))
    .limit(1)

  if (!msg) {
    return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })
  }

  // Marquer uniquement les envois futurs (en_attente) du même participant
  // pour le MÊME topic → désabonnement ciblé par contenu
  await db
    .update(envois_participants)
    .set({ desabonne: true })
    .where(
      and(
        eq(envois_participants.participant_id, envoi.participant_id),
        eq(envois_participants.statut, 'en_attente'),
        inArray(
          envois_participants.message_id,
          db
            .select({ id: messages_planifies.id })
            .from(messages_planifies)
            .where(eq(messages_planifies.topic_id, msg.topic_id))
        )
      )
    )

  return NextResponse.json({ success: true })
}
