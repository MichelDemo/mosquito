import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  // Récupérer l'envoi via le token
  const { data: envoi } = await supabase
    .from('envois_participants')
    .select('id, participant_id, message_id')
    .eq('token', token)
    .single()

  if (!envoi) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  // Récupérer le topic_id via le message
  const { data: msg } = await supabase
    .from('messages_planifies')
    .select('topic_id')
    .eq('id', envoi.message_id)
    .single()

  if (!msg) {
    return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })
  }

  // Récupérer uniquement les envois futurs (en_attente) du même participant
  // pour le MÊME topic → désabonnement ciblé par contenu
  const { data: messagesMemeTopicIds } = await supabase
    .from('messages_planifies')
    .select('id')
    .eq('topic_id', msg.topic_id)

  const messageIds = (messagesMemeTopicIds ?? []).map((m) => m.id)

  if (messageIds.length > 0) {
    const { data: envoisAMarquer } = await supabase
      .from('envois_participants')
      .select('id')
      .eq('participant_id', envoi.participant_id)
      .eq('statut', 'en_attente')
      .in('message_id', messageIds)

    if (envoisAMarquer && envoisAMarquer.length > 0) {
      await supabase
        .from('envois_participants')
        .update({ desabonne: true })
        .in('id', envoisAMarquer.map((e) => e.id))
    }
  }

  return NextResponse.json({ success: true })
}
