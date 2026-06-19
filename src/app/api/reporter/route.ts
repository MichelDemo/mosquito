import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { addWeeks, addMonths } from 'date-fns'

// Délais proposés au destinataire pour décaler son prochain rappel.
const DELAIS = {
  '1w': (d: Date) => addWeeks(d, 1),
  '2w': (d: Date) => addWeeks(d, 2),
  '1m': (d: Date) => addMonths(d, 1),
} as const

type DelaiKey = keyof typeof DELAIS

export async function POST(request: NextRequest) {
  const { token, delai } = await request.json()

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })
  }
  if (!delai || !(delai in DELAIS)) {
    return NextResponse.json({ error: 'Délai invalide.' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  // Identifier le participant via le token reçu
  const { data: envoiActuel } = await supabase
    .from('envois_participants')
    .select('participant_id')
    .eq('token', token)
    .single()

  if (!envoiActuel) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  // Récupérer les rappels encore en attente de ce participant.
  // On ne décale QUE le prochain (numero_ordre le plus petit).
  const { data: enAttente } = await supabase
    .from('envois_participants')
    .select('id, messages_planifies ( numero_ordre )')
    .eq('participant_id', envoiActuel.participant_id)
    .eq('statut', 'en_attente')
    .neq('desabonne', true)

  if (!enAttente || enAttente.length === 0) {
    return NextResponse.json(
      { error: 'Aucun rappel à venir à décaler.' },
      { status: 404 }
    )
  }

  const prochain = [...enAttente].sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oa = (a.messages_planifies as any)?.numero_ordre ?? Number.MAX_SAFE_INTEGER
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ob = (b.messages_planifies as any)?.numero_ordre ?? Number.MAX_SAFE_INTEGER
    return oa - ob
  })[0]

  const reporterA = DELAIS[delai as DelaiKey](new Date()).toISOString()

  const { error: updateError } = await supabase
    .from('envois_participants')
    .update({ reporter_a: reporterA })
    .eq('id', prochain.id)

  if (updateError) {
    console.error('Erreur report rappel:', updateError)
    return NextResponse.json(
      { error: 'Impossible de décaler le rappel.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, reporter_a: reporterA })
}
