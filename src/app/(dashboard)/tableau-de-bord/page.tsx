export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, formations, messages_planifies, participants, topics } from '@/db/schema'
import { formationsDuFormateur } from '@/db/ownership'
import { getUser } from '@/lib/auth/session'
import { formatDate, statutBadgeClass } from '@/lib/utils'
import { BookOpen, GraduationCap, Send, Users } from 'lucide-react'

export default async function TableauDeBordPage() {
  const user = await getUser()
  if (!user) redirect('/connexion')

  // Chiffres du formateur connecté (le filtrage était fait par les politiques RLS de
  // Supabase) ; la bibliothèque de topics est commune à tous.
  const mesFormations = formationsDuFormateur(user.id)
  const [formationsCount, topicsCount, participantsCount, messagesCount, recentFormations] = await Promise.all([
    db.$count(formations, eq(formations.formateur_id, user.id)),
    db.$count(topics),
    db.$count(participants, inArray(participants.formation_id, mesFormations)),
    db.$count(
      envois_participants,
      and(
        eq(envois_participants.statut, 'envoye'),
        inArray(
          envois_participants.message_id,
          db
            .select({ id: messages_planifies.id })
            .from(messages_planifies)
            .where(inArray(messages_planifies.formation_id, mesFormations))
        )
      )
    ),
    db
      .select({
        id: formations.id,
        nom: formations.nom,
        statut: formations.statut,
        date_formation: formations.date_formation,
        created_at: formations.created_at,
      })
      .from(formations)
      .where(eq(formations.formateur_id, user.id))
      .orderBy(desc(formations.created_at))
      .limit(5),
  ])

  const stats = [
    {
      label: 'Formations actives',
      value: formationsCount ?? 0,
      icon: GraduationCap,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Topics disponibles',
      value: topicsCount ?? 0,
      icon: BookOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Participants total',
      value: participantsCount ?? 0,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Messages envoyés',
      value: messagesCount ?? 0,
      icon: Send,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  const statutLabel: Record<string, string> = {
    brouillon: 'Brouillon',
    active: 'Active',
    terminee: 'Terminée',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
            <div className={`${bg} rounded-lg p-3`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent formations */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Formations récentes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentFormations && recentFormations.length > 0 ? (
            recentFormations.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.nom}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {f.date_formation
                      ? formatDate(f.date_formation)
                      : formatDate(f.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutBadgeClass(f.statut)}`}
                >
                  {statutLabel[f.statut] ?? f.statut}
                </span>
              </div>
            ))
          ) : (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">
              Aucune formation pour le moment.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
