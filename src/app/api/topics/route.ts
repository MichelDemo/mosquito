import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: topics, error } = await supabase
      .from('topics')
      .select('*, videos(count)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des topics' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: topics })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
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
      .insert({
        titre: titre.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du topic' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: topic }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
