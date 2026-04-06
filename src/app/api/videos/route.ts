import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topic_id')

  const query = supabase.from('videos').select('id, titre, ordre').order('ordre', { ascending: true })
  if (topicId) query.eq('topic_id', topicId)

  const { data, error } = await query
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { topic_id, titre, vimeo_id, storage_path, ordre, duree_secondes } = body

    if (!topic_id) {
      return NextResponse.json({ error: 'Le topic est obligatoire' }, { status: 400 })
    }

    if (!titre || typeof titre !== 'string' || titre.trim().length === 0) {
      return NextResponse.json({ error: 'Le titre est obligatoire' }, { status: 400 })
    }

    // Require at least one video source
    if (!storage_path && !vimeo_id) {
      return NextResponse.json(
        { error: 'Un fichier vidéo ou un identifiant Vimeo est obligatoire' },
        { status: 400 }
      )
    }

    // Validate vimeo_id format only when provided
    if (vimeo_id && !/^\d+$/.test(String(vimeo_id))) {
      return NextResponse.json(
        { error: "L'identifiant Vimeo doit être un nombre valide" },
        { status: 400 }
      )
    }

    const ordreNum = parseInt(String(ordre), 10)
    if (isNaN(ordreNum) || ordreNum < 1 || ordreNum > 3) {
      return NextResponse.json(
        { error: "L'ordre doit être compris entre 1 et 3" },
        { status: 400 }
      )
    }

    // Check max 3 videos per topic
    const { count, error: countError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('topic_id', topic_id)

    if (countError) {
      return NextResponse.json(
        { error: 'Erreur lors de la vérification du nombre de vidéos' },
        { status: 500 }
      )
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Ce topic a déjà atteint le maximum de 3 vidéos' },
        { status: 400 }
      )
    }

    const { data: video, error } = await supabase
      .from('videos')
      .insert({
        topic_id,
        titre: titre.trim(),
        vimeo_id: vimeo_id ? String(vimeo_id) : null,
        storage_path: storage_path ?? null,
        ordre: ordreNum,
        duree_secondes: duree_secondes ? parseInt(String(duree_secondes), 10) : null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de la vidéo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: video }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
