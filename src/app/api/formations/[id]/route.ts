import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

// ---------------------------------------------------------------------------
// GET /api/formations/:id
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    const { data: formation, error } = await supabase
      .from('formations')
      .select(`
        *,
        participants(*),
        formation_topics(*, topics(id, titre, videos(id, titre, ordre))),
        messages_planifies(*, topics(titre), videos(titre))
      `)
      .eq('id', params.id)
      .eq('formateur_id', user.id)
      .single()

    if (error || !formation) {
      return NextResponse.json(
        { error: 'Formation introuvable.' },
        { status: 404 }
      )
    }

    return NextResponse.json(formation)
  } catch (err) {
    console.error('Erreur GET formation:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PUT /api/formations/:id
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('formations')
      .select('id')
      .eq('id', params.id)
      .eq('formateur_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Formation introuvable ou accès refusé.' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Only allow updating safe fields
    const allowedFields = ['nom', 'description', 'date_formation', 'statut'] as const
    type AllowedField = (typeof allowedFields)[number]

    const updates: Partial<Record<AllowedField, string | null>> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field] ?? null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ valide à mettre à jour.' },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabase
      .from('formations')
      .update(updates)
      .eq('id', params.id)
      .select('id, nom, statut')
      .single()

    if (error) {
      console.error('Erreur update formation:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour.' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Erreur PUT formation:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/formations/:id
// ---------------------------------------------------------------------------

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    // Verify ownership before deleting
    const { data: existing } = await supabase
      .from('formations')
      .select('id')
      .eq('id', params.id)
      .eq('formateur_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Formation introuvable ou accès refusé.' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('formations')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Erreur suppression formation:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Formation supprimée avec succès.' })
  } catch (err) {
    console.error('Erreur DELETE formation:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
