export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GraduationCap, Plus, Settings } from 'lucide-react'
import DeleteFormationButton from './DeleteFormationButton'
import ActivateFormationButton from './ActivateFormationButton'

type FormationStatut = 'brouillon' | 'active' | 'terminee'

interface FormationRow {
  id: string
  nom: string
  statut: FormationStatut
  date_formation: string | null
  created_at: string
  participant_count: number
  topic_count: number
}

const statutConfig: Record<FormationStatut, { label: string; classes: string }> = {
  brouillon: { label: 'Brouillon', classes: 'bg-gray-100 text-gray-700' },
  active: { label: 'Active', classes: 'bg-green-100 text-green-700' },
  terminee: { label: 'Terminée', classes: 'bg-blue-100 text-blue-700' },
}

function StatutBadge({ statut }: { statut: FormationStatut }) {
  const config = statutConfig[statut]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function FormationsPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion')
  }

  const { data: formations, error } = await supabase
    .from('formations')
    .select(`
      id,
      nom,
      statut,
      date_formation,
      created_at,
      participants(id),
      formation_topics(id)
    `)
    .eq('formateur_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur chargement formations:', error)
  }

  const rows: FormationRow[] = (formations ?? []).map((f: any) => ({
    id: f.id,
    nom: f.nom,
    statut: f.statut as FormationStatut,
    date_formation: f.date_formation,
    created_at: f.created_at,
    participant_count: Array.isArray(f.participants) ? f.participants.length : 0,
    topic_count: Array.isArray(f.formation_topics) ? f.formation_topics.length : 0,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes formations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos formations et leurs rappels automatiques
          </p>
        </div>
        <Link
          href="/formations/nouvelle"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle formation
        </Link>
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <GraduationCap className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-base font-semibold text-gray-900">Aucune formation</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer votre première formation.
          </p>
          <Link
            href="/formations/nouvelle"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouvelle formation
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date formation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topics
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rows.map((formation) => (
                <tr key={formation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{formation.nom}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(formation.date_formation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatutBadge statut={formation.statut} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formation.participant_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formation.topic_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/formations/${formation.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Gérer
                      </Link>
                      {formation.statut === 'brouillon' && (
                        <ActivateFormationButton formationId={formation.id} />
                      )}
                      <DeleteFormationButton formationId={formation.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


