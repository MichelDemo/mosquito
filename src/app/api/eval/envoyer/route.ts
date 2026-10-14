import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { auto_evaluations, formations, participants as participantsTable } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { envoyerEmailAutoEval } from '@/lib/email/brevo'
import { isUuid } from '@/lib/uuid'

// POST — envoie la première auto-évaluation à tous les participants d'une formation
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { formation_id } = await request.json()
  if (!formation_id) return NextResponse.json({ error: 'formation_id requis.' }, { status: 400 })

  // Vérifier ownership
  const [formation] = isUuid(formation_id)
    ? await db
        .select({ id: formations.id, nom: formations.nom })
        .from(formations)
        .where(and(eq(formations.id, formation_id), eq(formations.formateur_id, user.id)))
        .limit(1)
    : []

  if (!formation) return NextResponse.json({ error: 'Formation introuvable.' }, { status: 404 })

  // Récupérer les participants
  const participants = await db
    .select({
      id: participantsTable.id,
      prenom: participantsTable.prenom,
      nom: participantsTable.nom,
      email: participantsTable.email,
    })
    .from(participantsTable)
    .where(eq(participantsTable.formation_id, formation_id))

  if (!participants.length) {
    return NextResponse.json({ error: 'Aucun participant.' }, { status: 400 })
  }

  let envoyes = 0
  let erreurs = 0

  for (const participant of participants) {
    try {
      // Créer un token d'évaluation
      const newToken = crypto.randomUUID()
      await db.insert(auto_evaluations).values({
        participant_id: participant.id,
        formation_id: formation_id,
        token: newToken,
      })

      // Compter le numéro de l'évaluation
      const count = await db.$count(
        auto_evaluations,
        and(
          eq(auto_evaluations.participant_id, participant.id),
          eq(auto_evaluations.formation_id, formation_id)
        )
      )

      await envoyerEmailAutoEval({
        destinataire: { prenom: participant.prenom, nom: participant.nom, email: participant.email },
        formation: { nom: formation.nom },
        token: newToken,
        numeroEval: count || 1,
      })

      envoyes++
    } catch (err) {
      console.error(`Erreur envoi auto-eval participant ${participant.id}:`, err)
      erreurs++
    }
  }

  return NextResponse.json({ envoyes, erreurs })
}
