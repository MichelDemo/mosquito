import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { Tabs } from './Tabs'
import EditFormationModal from './EditFormationModal'
import AddParticipantModal from './AddParticipantModal'
import AddMessageModal from './AddMessageModal'
import DeleteParticipantButton from './DeleteParticipantButton'
import EditParticipantModal from './EditParticipantModal'
import TerminerButton from './TerminerButton'
import ActivateButton from './ActivateButton'
import PlanningTopicGroup from './PlanningTopicGroup'

type FormationStatut = 'brouillon' | 'active' | 'terminee'

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
    month: 'long',
    year: 'numeric',
  })
}


export default async function FormationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/connexion')

  // Fetch formation
  const { data: formation, error } = await supabase
    .from('formations')
    .select('*')
    .eq('id', params.id)
    .eq('formateur_id', session.user.id)
    .single()

  if (error || !formation) notFound()

  // Fetch participants
  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('formation_id', params.id)
    .order('created_at', { ascending: true })

  // Fetch messages planifiés with topic + video info
  const { data: messages } = await supabase
    .from('messages_planifies')
    .select(`
      id,
      numero_ordre,
      statut,
      type_planification,
      date_envoi,
      jours_apres_formation,
      topic_id,
      relance_numero,
      topics(titre),
      videos(titre)
    `)
    .eq('formation_id', params.id)
    .order('numero_ordre', { ascending: true })

  // Fetch stats
  const { data: envois } = await supabase
    .from('envois_participants')
    .select('statut, ouvert_le, quiz_complete')
    .in(
      'message_id',
      (messages ?? []).map((m) => m.id)
    )

  const totalEnvoyes = envois?.filter((e) => e.statut === 'envoye').length ?? 0
  const totalOuverts = envois?.filter((e) => e.ouvert_le !== null).length ?? 0
  const totalQuiz = envois?.filter((e) => e.quiz_complete).length ?? 0

  const tauxOuverture =
    totalEnvoyes > 0 ? Math.round((totalOuverts / totalEnvoyes) * 100) : 0

  // Per-participant stats
  const participantStats = (participants ?? []).map((p) => ({
    id: p.id,
    prenom: p.prenom,
    nom: p.nom,
    email: p.email,
    status: 'En cours',
  }))

  const messageCount = (messages ?? []).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{formation.nom}</h1>
            <StatutBadge statut={formation.statut as FormationStatut} />
            <EditFormationModal formation={formation} />
          </div>
          {formation.date_formation && (
            <p className="mt-1 text-sm text-gray-500">
              Formation du {formatDate(formation.date_formation)}
            </p>
          )}
          {formation.description && (
            <p className="mt-1 text-sm text-gray-600 max-w-xl">{formation.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {formation.statut === 'brouillon' && (
            <ActivateButton formationId={params.id} />
          )}
          {formation.statut === 'active' && (
            <TerminerButton formationId={params.id} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'participants',
            label: 'Participants',
            icon: 'Users',
            content: (
              <ParticipantsTab
                formationId={params.id}
                participants={participants ?? []}
              />
            ),
          },
          {
            id: 'planning',
            label: 'Planning',
            icon: 'Calendar',
            content: (
              <PlanningTab
                formationId={params.id}
                messages={(messages as any[]) ?? []}
                messageCount={messageCount}
              />
            ),
          },
          {
            id: 'statistiques',
            label: 'Statistiques',
            icon: 'BarChart3',
            content: (
              <StatistiquesTab
                totalEnvoyes={totalEnvoyes}
                tauxOuverture={tauxOuverture}
                totalQuiz={totalQuiz}
                participants={participantStats}
              />
            ),
          },
        ]}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Participants tab
// ---------------------------------------------------------------------------

function ParticipantsTab({
  formationId,
  participants,
}: {
  formationId: string
  participants: {
    id: string
    prenom: string
    nom: string
    email: string
    telephone: string | null
    canal_email: boolean
    canal_whatsapp: boolean
    created_at: string
  }[]
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{participants.length} participant(s)</p>
        <AddParticipantModal formationId={formationId} />
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucun participant pour l'instant.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-100 rounded-lg">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prénom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canaux</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date ajout</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{p.prenom}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{p.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      {p.canal_email && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700" title="Email">
                          ✉
                        </span>
                      )}
                      {p.canal_whatsapp && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700" title="WhatsApp">
                          💬
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditParticipantModal participant={p} />
                      <DeleteParticipantButton participantId={p.id} />
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

// ---------------------------------------------------------------------------
// Planning tab
// ---------------------------------------------------------------------------

interface PlanningMessage {
  id: string
  numero_ordre: number
  statut: string
  type_planification: string
  date_envoi: string | null
  jours_apres_formation: number | null
  topic_id: string | null
  relance_numero: number | null
  topics: { titre: string } | null
  videos: { titre: string } | null
}

interface TopicGroup {
  topic_id: string
  topic_titre: string
  relances: {
    id: string
    relance_numero: number
    statut: string
    jours_apres_formation: number | null
    video_titre: string | null
  }[]
}

function PlanningTab({
  formationId,
  messages,
  messageCount,
}: {
  formationId: string
  messages: PlanningMessage[]
  messageCount: number
}) {
  // Group messages by topic_id, preserving topic order
  const groupMap = new Map<string, TopicGroup>()
  for (const msg of messages) {
    const tid = msg.topic_id ?? '__unknown__'
    if (!groupMap.has(tid)) {
      groupMap.set(tid, {
        topic_id: tid,
        topic_titre: msg.topics?.titre ?? '—',
        relances: [],
      })
    }
    groupMap.get(tid)!.relances.push({
      id: msg.id,
      relance_numero: msg.relance_numero ?? 1,
      statut: msg.statut,
      jours_apres_formation: msg.jours_apres_formation,
      video_titre: msg.videos?.titre ?? null,
    })
  }
  const groups = Array.from(groupMap.values())

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {groups.length} topic(s) — {messageCount} relance(s) planifiée(s)
        </p>
        <AddMessageModal formationId={formationId} messageCount={messageCount} />
      </div>

      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun message planifié.</p>
          </div>
        )}
        {groups.map((group) => (
          <PlanningTopicGroup
            key={group.topic_id}
            topicTitre={group.topic_titre}
            relances={group.relances as {
              id: string
              relance_numero: number
              statut: 'en_attente' | 'envoye' | 'erreur'
              jours_apres_formation: number | null
              video_titre: string | null
            }[]}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Statistiques tab
// ---------------------------------------------------------------------------

function StatistiquesTab({
  totalEnvoyes,
  tauxOuverture,
  totalQuiz,
  participants,
}: {
  totalEnvoyes: number
  tauxOuverture: number
  totalQuiz: number
  participants: { id: string; prenom: string; nom: string; email: string; status: string }[]
}) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
            Messages envoyés
          </p>
          <p className="text-3xl font-bold text-blue-700">{totalEnvoyes}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
            Taux d'ouverture
          </p>
          <p className="text-3xl font-bold text-green-700">{tauxOuverture}%</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
            Quiz complétés
          </p>
          <p className="text-3xl font-bold text-purple-700">{totalQuiz}</p>
        </div>
      </div>

      {/* Participants table */}
      {participants.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Suivi par participant</h3>
          <div className="overflow-hidden border border-gray-100 rounded-lg">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {p.prenom} {p.nom}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action buttons (server-friendly form buttons)
// ---------------------------------------------------------------------------


