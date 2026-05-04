import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteParams = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    const body = await request.json()
    const { titre, description } = body

    if (!titre || typeof titre !== 'string' || titre.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le titre est obligatoire' },
        { status: 400 }
      )
    }

    if (titre.trim().length > 200) {
      return NextResponse.json(
        { error: 'Le titre ne peut pas dépasser 200 caractères' },
        { status: 400 }
      )
    }

    const { data: topic, error } = await supabase
      .from('topics')
      .update({
        titre: titre.trim(),
        description: description?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du topic' },
        { status: 500 }
      )
    }

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: topic })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    // Cascade: delete related videos and quiz questions first
    await supabase.from('quiz_questions').delete().eq('topic_id', id)
    await supabase.from('videos').delete().eq('topic_id', id)

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du topic' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Topic supprimé avec succès' })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
