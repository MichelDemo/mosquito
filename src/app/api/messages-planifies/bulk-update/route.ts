import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface UpdateItem {
  id: string
  jours_apres_formation: number
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const updates: UpdateItem[] = body.updates

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Le champ updates est requis et doit être un tableau non vide.' },
        { status: 400 }
      )
    }

    for (const u of updates) {
      if (!u.id || typeof u.jours_apres_formation !== 'number') {
        return NextResponse.json(
          { error: 'Chaque entrée doit avoir un id et jours_apres_formation numérique.' },
          { status: 400 }
        )
      }
    }

    const messageIds = updates.map((u) => u.id)

    // Verify ownership: all messages must belong to a formation owned by the current user
    const { data: messages, error: fetchError } = await supabase
      .from('messages_planifies')
      .select('id, formation_id, formations(formateur_id)')
      .in('id', messageIds)

    if (fetchError) {
      console.error('Erreur vérification messages:', fetchError)
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des messages.' },
        { status: 500 }
      )
    }

    if (!messages || messages.length !== messageIds.length) {
      return NextResponse.json(
        { error: 'Un ou plusieurs messages sont introuvables.' },
        { status: 404 }
      )
    }

    for (const msg of messages) {
      const formation = (msg.formations as unknown) as { formateur_id: string } | null
      if (!formation || formation.formateur_id !== user.id) {
        return NextResponse.json(
          { error: 'Accès refusé à un ou plusieurs messages.' },
          { status: 403 }
        )
      }
    }

    // Apply updates sequentially
    for (const u of updates) {
      const { error: updateError } = await supabase
        .from('messages_planifies')
        .update({ jours_apres_formation: u.jours_apres_formation })
        .eq('id', u.id)

      if (updateError) {
        console.error('Erreur mise à jour message:', u.id, updateError)
        return NextResponse.json(
          { error: `Erreur lors de la mise à jour du message ${u.id}.` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur inattendue PATCH bulk-update:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
