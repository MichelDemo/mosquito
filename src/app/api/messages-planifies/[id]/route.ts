import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    // Verify ownership via formation
    const { data: message } = await supabase
      .from('messages_planifies')
      .select('id, formation_id, formations(formateur_id)')
      .eq('id', params.id)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })
    }

    const formation = (message as any).formations
    if (!formation || formation.formateur_id !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    // Delete related envois_participants first
    const { error: envoisError } = await supabase
      .from('envois_participants')
      .delete()
      .eq('message_id', params.id)

    if (envoisError) {
      console.error('Erreur suppression envois_participants:', envoisError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression des envois associés.' },
        { status: 500 }
      )
    }

    // Delete the message
    const { error } = await supabase
      .from('messages_planifies')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Erreur suppression message planifié:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du message.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Message supprimé avec succès.' })
  } catch (err) {
    console.error('Erreur inattendue DELETE message planifié:', err)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}
