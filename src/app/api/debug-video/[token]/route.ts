import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const supabase = createAdminSupabaseClient()
  const { token } = params

  const { data: envoi, error: e1 } = await supabase
    .from('envois_participants')
    .select('id, quiz_complete, participant_id, message_id, envoi_le, statut')
    .eq('token', token)
    .single()

  if (!envoi) return NextResponse.json({ step: 'envoi_not_found', error: e1 })

  const { data: msg, error: e2 } = await supabase
    .from('messages_planifies')
    .select('id, topic_id, video_id, formation_id')
    .eq('id', envoi.message_id)
    .single()

  if (!msg) return NextResponse.json({ step: 'message_not_found', envoi, error: e2 })

  const { data: video, error: e3 } = await supabase
    .from('videos')
    .select('id, titre, storage_path, vimeo_id')
    .eq('id', msg.video_id)
    .single()

  return NextResponse.json({ ok: true, envoi, msg, video, video_error: e3 })
}
