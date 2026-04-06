import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { data, error } = await supabase
    .from('messages_planifies')
    .select(`
      id, formation_id, topic_id, video_id,
      type_planification, date_envoi, jours_apres_formation, statut,
      topics ( titre ),
      videos ( id, titre )
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const body = await request.json()
  const { type_planification, date_envoi, jours_apres_formation, video_id } = body

  const { error } = await supabase
    .from('messages_planifies')
    .update({ type_planification, date_envoi, jours_apres_formation, video_id })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
