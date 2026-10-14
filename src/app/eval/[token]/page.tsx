import { notFound } from 'next/navigation'
import { and, asc, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { auto_eval_criteres, auto_eval_reponses, auto_evaluations, formations, participants } from '@/db/schema'
import { isUuid } from '@/lib/uuid'
import EvalForm from './EvalForm'

interface PageProps {
  params: { token: string }
}

export default async function PageEval({ params }: PageProps) {
  const { token } = params
  if (!isUuid(token)) notFound()

  // Récupérer l'évaluation par token
  const [evaluation] = await db
    .select({
      id: auto_evaluations.id,
      participant_id: auto_evaluations.participant_id,
      formation_id: auto_evaluations.formation_id,
      completee_le: auto_evaluations.completee_le,
      created_at: auto_evaluations.created_at,
    })
    .from(auto_evaluations)
    .where(eq(auto_evaluations.token, token))
    .limit(1)

  if (!evaluation) notFound()

  // Déjà complétée ?
  if (evaluation.completee_le) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Déjà complétée</h1>
          <p className="text-gray-500 text-sm">Vous avez déjà répondu à cette auto-évaluation.</p>
          <p className="mt-4 text-xs text-gray-400">Mosquito — La piqûre de rappel qui ne s'oublie pas.</p>
        </div>
      </main>
    )
  }

  // Récupérer participant, formation, critères en parallèle
  const [[participant], [formation], criteres] = await Promise.all([
    db
      .select({ prenom: participants.prenom, nom: participants.nom })
      .from(participants)
      .where(eq(participants.id, evaluation.participant_id))
      .limit(1),
    db
      .select({ nom: formations.nom })
      .from(formations)
      .where(eq(formations.id, evaluation.formation_id))
      .limit(1),
    db
      .select({
        id: auto_eval_criteres.id,
        affirmation: auto_eval_criteres.affirmation,
        categorie: auto_eval_criteres.categorie,
        ordre: auto_eval_criteres.ordre,
      })
      .from(auto_eval_criteres)
      .where(eq(auto_eval_criteres.actif, true))
      .orderBy(asc(auto_eval_criteres.ordre)),
  ])

  if (!formation || criteres.length === 0) notFound()

  // Évaluations déjà complétées de ce participant pour cette formation
  const dejaCompletees = and(
    eq(auto_evaluations.participant_id, evaluation.participant_id),
    eq(auto_evaluations.formation_id, evaluation.formation_id),
    isNotNull(auto_evaluations.completee_le)
  )

  // Compter le numéro de cette évaluation pour ce participant
  const numeroEval = (await db.$count(auto_evaluations, dejaCompletees)) + 1

  // Récupérer les réponses de la dernière évaluation complétée (pour comparaison)
  let precedentes = null
  if (numeroEval > 1) {
    const [derniereEval] = await db
      .select({ id: auto_evaluations.id })
      .from(auto_evaluations)
      .where(dejaCompletees)
      .orderBy(desc(auto_evaluations.completee_le))
      .limit(1)

    if (derniereEval) {
      precedentes = await db
        .select({ critere_id: auto_eval_reponses.critere_id, reponse: auto_eval_reponses.reponse })
        .from(auto_eval_reponses)
        .where(eq(auto_eval_reponses.evaluation_id, derniereEval.id))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bandeau */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">
            🦟 Mosquito
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Bonjour {participant?.prenom ?? 'vous'},
          </h1>
          <p className="text-gray-500 text-base">Auto-évaluation #{numeroEval}</p>
          <div className="mt-3">
            <span className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-xs font-medium">
              {formation.nom}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            Pour chaque affirmation, répondez Oui ou Non
          </h2>
          {numeroEval > 1 && (
            <p className="text-sm text-gray-500 mb-5">
              Votre réponse lors de l'évaluation précédente est indiquée pour chaque critère.
            </p>
          )}
          {numeroEval === 1 && <div className="mb-5" />}
          <EvalForm
            token={token}
            criteres={criteres}
            numeroEval={numeroEval}
            precedentes={precedentes}
          />
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400">
          Ce message vous a été envoyé dans le cadre de votre formation.
        </footer>
      </div>
    </div>
  )
}
