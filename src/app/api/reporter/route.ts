import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { addWeeks, addMonths } from 'date-fns'
import { db } from '@/db'
import { envois_participants, messages_planifies } from '@/db/schema'
import { isUuid } from '@/lib/uuid'

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

  // Identifier l'envoi (et le participant) via le token reçu
  const [envoiActuel] = isUuid(token)
    ? await db
        .select({
          id: envois_participants.id,
          participant_id: envois_participants.participant_id,
          message_id: envois_participants.message_id,
        })
        .from(envois_participants)
        .where(eq(envois_participants.token, token))
        .limit(1)
    : []

  if (!envoiActuel) {
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  const reporterA = DELAIS[delai as DelaiKey](new Date()).toISOString()

  // Rappels encore en attente de ce participant (non désabonnés).
  const enAttente = await db.query.envois_participants.findMany({
    columns: { id: true, message_id: true },
    with: { messages_planifies: { columns: { numero_ordre: true } } },
    where: and(
      eq(envois_participants.participant_id, envoiActuel.participant_id),
      eq(envois_participants.statut, 'en_attente'),
      ne(envois_participants.desabonne, true)
    ),
  })

  // Cible à décaler :
  //  - s'il existe des rappels à venir, on décale le prochain (numero_ordre min) ;
  //  - sinon (tous les rappels déjà envoyés), on ré-arme le rappel actuel pour
  //    qu'il soit renvoyé à la date choisie.
  let cibleEnvoiId: string
  let cibleMessageId: string
  let reArmer = false

  if (enAttente.length > 0) {
    const prochain = [...enAttente].sort((a, b) => {
      const oa = a.messages_planifies?.numero_ordre ?? Number.MAX_SAFE_INTEGER
      const ob = b.messages_planifies?.numero_ordre ?? Number.MAX_SAFE_INTEGER
      return oa - ob
    })[0]
    cibleEnvoiId = prochain.id
    cibleMessageId = prochain.message_id
  } else {
    cibleEnvoiId = envoiActuel.id
    cibleMessageId = envoiActuel.message_id
    reArmer = true
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(envois_participants)
        .set(reArmer ? { reporter_a: reporterA, statut: 'en_attente' } : { reporter_a: reporterA })
        .where(eq(envois_participants.id, cibleEnvoiId))

      // S'assurer que le message parent sera repris par le cron (le décalage est
      // appliqué côté envoi via reporter_a). No-op si le message est déjà en attente.
      await tx
        .update(messages_planifies)
        .set({ statut: 'en_attente' })
        .where(eq(messages_planifies.id, cibleMessageId))
    })
  } catch (err) {
    console.error('Erreur report rappel:', err)
    return NextResponse.json(
      { error: 'Impossible de décaler le rappel.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, reporter_a: reporterA, reArme: reArmer })
}
