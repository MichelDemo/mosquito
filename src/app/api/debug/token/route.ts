import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t')

  if (!token) {
    return NextResponse.json({ error: 'Paramètre ?t=token manquant' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  const { data: envoi } = await supabase
    .from('envois_participants')
    .select('id, statut, token, created_at')
    .eq('token', token)
    .single()

  if (!envoi) {
    // Montre les 3 derniers tokens pour vérifier
    const { data: derniers } = await supabase
      .from('envois_participants')
      .select('token, statut, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    return NextResponse.json({
      found: false,
      token_recu: token,
      token_longueur: token.length,
      derniers: derniers?.map(e => ({
        debut: String(e.token).substring(0, 8) + '...',
        statut: e.statut,
        created_at: e.created_at,
      })),
    })
  }

  return NextResponse.json({ found: true, statut: envoi.statut, created_at: envoi.created_at })
}
