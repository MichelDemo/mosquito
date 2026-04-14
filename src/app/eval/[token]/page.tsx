import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import EvalForm from './EvalForm'

interface PageProps {
  params: { token: string }
}

export default async function PageEval({ params }: PageProps) {
  const { token } = params
  const supabase = createAdminSupabaseClient()

  // Récupérer l'évaluation par token
  const { data: evaluation } = await supabase
    .from('auto_evaluations')
    .select('id, participant_id, formation_id, completee_le, created_at')
    .eq('token', token)
    .single()

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
  const [
    { data: participant },
    { data: formation },
    { data: criteres },
  ] = await Promise.all([
    supabase.from('participants').select('prenom, nom').eq('id', evaluation.participant_id).single(),
    supabase.from('formations').select('nom').eq('id', evaluation.formation_id).single(),
    supabase
      .from('auto_eval_criteres')
      .select('id, affirmation, categorie, ordre')
      .eq('actif', true)
      .order('ordre'),
  ])

  if (!formation || !criteres || criteres.length === 0) notFound()

  // Compter le numéro de cette évaluation pour ce participant
  const { count } = await supabase
    .from('auto_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('participant_id', evaluation.participant_id)
    .eq('formation_id', evaluation.formation_id)
    .not('completee_le', 'is', null)

  const numeroEval = (count ?? 0) + 1

  // Récupérer les réponses de la dernière évaluation complétée (pour comparaison)
  let precedentes = null
  if (numeroEval > 1) {
    const { data: derniereEval } = await supabase
      .from('auto_evaluations')
      .select('id')
      .eq('participant_id', evaluation.participant_id)
      .eq('formation_id', evaluation.formation_id)
      .not('completee_le', 'is', null)
      .order('completee_le', { ascending: false })
      .limit(1)
      .single()

    if (derniereEval) {
      const { data: repsDerniere } = await supabase
        .from('auto_eval_reponses')
        .select('critere_id, reponse')
        .eq('evaluation_id', derniereEval.id)
      precedentes = repsDerniere
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
