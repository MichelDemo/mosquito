import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { auto_eval_reponses, auto_evaluations } from '@/db/schema'
import { isUuid } from '@/lib/uuid'

export async function POST(request: NextRequest) {
  try {
    const { token, reponses, prochaine_eval_at } = await request.json()

    if (!token || !reponses?.length) {
      return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })
    }

    // Récupérer l'évaluation
    const [evaluation] = isUuid(token)
      ? await db
          .select({
            id: auto_evaluations.id,
            participant_id: auto_evaluations.participant_id,
            formation_id: auto_evaluations.formation_id,
            completee_le: auto_evaluations.completee_le,
          })
          .from(auto_evaluations)
          .where(eq(auto_evaluations.token, token))
          .limit(1)
      : []

    if (!evaluation) return NextResponse.json({ error: 'Évaluation introuvable.' }, { status: 404 })
    if (evaluation.completee_le) return NextResponse.json({ error: 'Déjà complétée.' }, { status: 409 })

    // Insérer les réponses
    const rows = reponses.map((r: { critere_id: string; reponse: boolean }) => ({
      evaluation_id: evaluation.id,
      critere_id: r.critere_id,
      reponse: r.reponse,
    }))

    // Réponses, clôture et éventuelle évaluation suivante : tout ou rien.
    try {
      await db.transaction(async (tx) => {
        await tx.insert(auto_eval_reponses).values(rows)

        // Marquer comme complétée
        await tx
          .update(auto_evaluations)
          .set({ completee_le: new Date().toISOString() })
          .where(eq(auto_evaluations.id, evaluation.id))

        // Planifier la prochaine évaluation si une date est fournie
        if (prochaine_eval_at) {
          await tx.insert(auto_evaluations).values({
            participant_id: evaluation.participant_id,
            formation_id: evaluation.formation_id,
            token: crypto.randomUUID(),
            prochaine_eval_at,
          })
        }
      })
    } catch (insertError) {
      console.error('Erreur insertion réponses:', insertError)
      return NextResponse.json({ error: 'Erreur enregistrement.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erreur eval/repondre:', err)
    return NextResponse.json({ error: 'Erreur inattendue.' }, { status: 500 })
  }
}
