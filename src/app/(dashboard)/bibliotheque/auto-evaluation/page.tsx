export const dynamic = 'force-dynamic'

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import CriteresManager from './CriteresManager'
import EvalSender from './EvalSender'

export default async function AutoEvaluationPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/connexion')

  const admin = createAdminSupabaseClient()

  const [
    { data: criteres },
    { data: formations },
    { data: evalCompletes },
  ] = await Promise.all([
    admin.from('auto_eval_criteres').select('id, affirmation, categorie, ordre, actif').eq('actif', true).order('ordre'),
    supabase.from('formations').select('id, nom').eq('formateur_id', session.user.id).order('created_at', { ascending: false }),
    admin.from('auto_evaluations')
      .select('id, completee_le, formation_id, participant_id, auto_eval_reponses(critere_id, reponse)')
      .not('completee_le', 'is', null)
      .order('completee_le', { ascending: false }),
  ])

  // Enrichir avec prénoms/noms
  const participantIds = Array.from(new Set((evalCompletes ?? []).map((e) => e.participant_id)))
  const { data: evalParticipants } = participantIds.length
    ? await admin.from('participants').select('id, prenom, nom').in('id', participantIds)
    : { data: [] }

  const evaluations = (evalCompletes ?? []).map((e) => ({
    id: e.id,
    completee_le: e.completee_le as string,
    formation_id: e.formation_id,
    participant: evalParticipants?.find((p) => p.id === e.participant_id) ?? null,
    reponses: (e.auto_eval_reponses as { critere_id: string; reponse: boolean }[]) ?? [],
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <ClipboardList className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auto-évaluation</h1>
            <p className="text-sm text-gray-500">Gérez les critères et envoyez les évaluations à vos participants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche : critères */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <CriteresManager criteres={criteres ?? []} />
          </div>

          {/* Colonne droite : envoi + résultats */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            {(formations ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune formation disponible.</p>
            ) : (
              <EvalSender
                formations={formations ?? []}
                evaluations={evaluations}
                totalCriteres={(criteres ?? []).length}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
