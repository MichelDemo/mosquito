import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Vous devez être connecté.' }, { status: 401 })
    }

    const body = await request.json()
    const { prenom, nom, email, telephone, canal_email, canal_whatsapp } = body

    if (!prenom?.trim() || !nom?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Prénom, nom et email sont requis.' }, { status: 400 })
    }
    if (!canal_email && !canal_whatsapp) {
      return NextResponse.json({ error: 'Au moins un canal de communication est requis.' }, { status: 400 })
    }
    if (canal_whatsapp && !telephone?.trim()) {
      return NextResponse.json({ error: 'Numéro de téléphone requis pour WhatsApp.' }, { status: 400 })
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('id, formation_id, formations(formateur_id)')
      .eq('id', params.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Participant introuvable.' }, { status: 404 })
    }
    const formation = (participant as any).formations
    if (!formation || formation.formateur_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    const { data: updated, error } = await supabase
      .from('participants')
      .update({
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        telephone: telephone?.trim() || null,
        canal_email: canal_email === true,
        canal_whatsapp: canal_whatsapp === true,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Erreur modification participant:', error)
      return NextResponse.json({ error: 'Erreur lors de la modification.' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Erreur inattendue:', err)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}

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

    // Verify the participant belongs to a formation owned by the current user
    const { data: participant } = await supabase
      .from('participants')
      .select('id, formation_id, formations(formateur_id)')
      .eq('id', params.id)
      .single()

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant introuvable.' },
        { status: 404 }
      )
    }

    const formation = (participant as any).formations
    if (!formation || formation.formateur_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès refusé.' },
        { status: 403 }
      )
    }

    // Delete associated envois first (foreign key constraint)
    await supabase
      .from('envois_participants')
      .delete()
      .eq('participant_id', params.id)

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Erreur suppression participant:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du participant.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Participant supprimé avec succès.' })
  } catch (err) {
    console.error('Erreur inattendue:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
