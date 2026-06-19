import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { addWeeks, addMonths } from 'date-fns'

// Délais proposés au destinataire pour décaler son prochain rappel.
const DELAIS = {
  '1w': (d: Date) => addWeeks(d, 1),
  '2w': (d: Date) => addWeeks(d, 2),
  '1m': (d: Date) => addMonths(d, 1),
  '2m': (d: Date) => addMonths(d, 2),
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

  // Identifier l'envoi (et le participant) via le token reçu
  const { data: envoiActuel } = await supabase
    .from('envois_participants')
    .select('id, participant_id, message_id')
    .eq('token', token)
    .single()

  if (!envoiActuel) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  const reporterA = DELAIS[delai as DelaiKey](new Date()).toISOString()

  // Rappels encore en attente de ce participant (non désabonnés).
  const { data: enAttente } = await supabase
    .from('envois_participants')
    .select('id, message_id, messages_planifies ( numero_ordre )')
    .eq('participant_id', envoiActuel.participant_id)
    .eq('statut', 'en_attente')
    .neq('desabonne', true)

  // Cible à décaler :
  //  - s'il existe des rappels à venir, on décale le prochain (numero_ordre min) ;
  //  - sinon (tous les rappels déjà envoyés), on ré-arme le rappel actuel pour
  //    qu'il soit renvoyé à la date choisie.
  let cibleEnvoiId: string
  let cibleMessageId: string
  let reArmer = false

  if (enAttente && enAttente.length > 0) {
    const prochain = [...enAttente].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oa = (a.messages_planifies as any)?.numero_ordre ?? Number.MAX_SAFE_INTEGER
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ob = (b.messages_planifies as any)?.numero_ordre ?? Number.MAX_SAFE_INTEGER
      return oa - ob
    })[0]
    cibleEnvoiId = prochain.id
    cibleMessageId = prochain.message_id
  } else {
    cibleEnvoiId = envoiActuel.id
    cibleMessageId = envoiActuel.message_id
    reArmer = true
  }

  const { error: updateError } = await supabase
    .from('envois_participants')
    .update(
      reArmer
        ? { reporter_a: reporterA, statut: 'en_attente' }
        : { reporter_a: reporterA }
    )
    .eq('id', cibleEnvoiId)

  if (updateError) {
    console.error('Erreur report rappel (envoi):', updateError)
    return NextResponse.json(
      { error: 'Impossible de décaler le rappel.' },
      { status: 500 }
    )
  }

  // S'assurer que le message parent sera repris par le cron (le décalage est
  // appliqué côté envoi via reporter_a). No-op si le message est déjà en attente.
  const { error: messageError } = await supabase
    .from('messages_planifies')
    .update({ statut: 'en_attente' })
    .eq('id', cibleMessageId)

  if (messageError) {
    console.error('Erreur report rappel (message):', messageError)
    return NextResponse.json(
      { error: 'Impossible de décaler le rappel.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, reporter_a: reporterA, reArme: reArmer })
}
