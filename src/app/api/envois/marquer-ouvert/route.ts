import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body: { token: string } = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant.' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    const { data: envoi, error } = await supabase
      .from('envois_participants')
      .select('id, ouvert_le')
      .eq('token', token)
      .single()

    if (error || !envoi) {
      return NextResponse.json(
        { error: 'Token invalide.' },
        { status: 404 }
      )
    }

    // Mettre à jour uniquement si pas encore ouvert
    if (!envoi.ouvert_le) {
      await supabase
        .from('envois_participants')
        .update({ ouvert_le: new Date().toISOString() })
        .eq('id', envoi.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur marquer-ouvert:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}
