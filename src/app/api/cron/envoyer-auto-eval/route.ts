import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm'
import { db } from '@/db'
import { auto_evaluations, formations, participants } from '@/db/schema'
import { envoyerEmailAutoEval } from '@/lib/email/brevo'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

// Cron job — envoie les auto-évaluations planifiées pour aujourd'hui
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const today = new Date().toISOString()

  // Évaluations planifiées non encore complétées dont la date est passée
  const evaluations = await db
    .select({
      id: auto_evaluations.id,
      token: auto_evaluations.token,
      participant_id: auto_evaluations.participant_id,
      formation_id: auto_evaluations.formation_id,
      prochaine_eval_at: auto_evaluations.prochaine_eval_at,
    })
    .from(auto_evaluations)
    .where(
      and(
        lte(auto_evaluations.prochaine_eval_at, today),
        isNull(auto_evaluations.completee_le),
        isNotNull(auto_evaluations.prochaine_eval_at)
      )
    )

  if (!evaluations.length) {
    return NextResponse.json({ envoyes: 0, erreurs: 0, message: 'Aucune évaluation à envoyer.' })
  }

  let envoyes = 0
  let erreurs = 0

  for (const evaluation of evaluations) {
    try {
      const [[participant], [formation]] = await Promise.all([
        db
          .select({ prenom: participants.prenom, nom: participants.nom, email: participants.email })
          .from(participants)
          .where(eq(participants.id, evaluation.participant_id))
          .limit(1),
        db
          .select({ nom: formations.nom })
          .from(formations)
          .where(eq(formations.id, evaluation.formation_id))
          .limit(1),
      ])

      if (!participant || !formation) { erreurs++; continue }

      const count = await db.$count(
        auto_evaluations,
        and(
          eq(auto_evaluations.participant_id, evaluation.participant_id),
          eq(auto_evaluations.formation_id, evaluation.formation_id),
          isNotNull(auto_evaluations.completee_le)
        )
      )

      await envoyerEmailAutoEval({
        destinataire: { prenom: participant.prenom, nom: participant.nom, email: participant.email },
        formation: { nom: formation.nom },
        token: evaluation.token,
        numeroEval: count + 1,
      })

      // Marquer prochaine_eval_at comme traitée (null pour éviter les renvois)
      await db
        .update(auto_evaluations)
        .set({ prochaine_eval_at: null })
        .where(eq(auto_evaluations.id, evaluation.id))

      envoyes++
    } catch (err) {
      console.error(`Erreur cron auto-eval ${evaluation.id}:`, err)
      erreurs++
    }
  }

  return NextResponse.json({ envoyes, erreurs })
}
