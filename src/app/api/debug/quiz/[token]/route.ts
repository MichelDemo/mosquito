import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createAdminSupabaseClient()

  const { data: envoi } = await supabase
    .from('envois_participants')
    .select(`id, message_id, messages_planifies ( topic_id, video_id )`)
    .eq('token', params.token)
    .single()

  if (!envoi) return NextResponse.json({ error: 'Token introuvable' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = envoi.messages_planifies as any
  const topicId = Array.isArray(msg) ? msg[0]?.topic_id : msg?.topic_id

  const { data: questions, error } = await supabase
    .from('quiz_questions')
    .select('id, question, options, bonne_reponse')
    .eq('topic_id', topicId)

  return NextResponse.json({
    envoi_id: envoi.id,
    messages_planifies_raw: msg,
    topic_id_detected: topicId,
    questions_count: questions?.length ?? 0,
    questions_error: error,
    questions,
  })
}
