export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Video, ClipboardList } from 'lucide-react'
import TopicForm from './TopicForm'
import DeleteTopicButton from './DeleteTopicButton'

type TopicWithCount = {
  id: string
  titre: string
  description: string | null
  created_at: string
  updated_at: string
  video_count: number
}

export default async function BibliotequePage() {
  const supabase = createServerSupabaseClient()

  const { data: topics, error } = await supabase
    .from('topics')
    .select('*, videos(count)')
    .order('created_at', { ascending: false })

  const topicsWithCount: TopicWithCount[] = (topics ?? []).map((t: any) => ({
    id: t.id,
    titre: t.titre,
    description: t.description,
    created_at: t.created_at,
    updated_at: t.updated_at,
    video_count: t.videos?.[0]?.count ?? 0,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bibliothèque de contenus</h1>
            <p className="mt-1 text-sm text-gray-500">Gérez vos topics et vidéos de rappel</p>
          </div>
          <TopicForm />
        </div>

        {/* Auto-évaluation */}
        <div className="mb-8">
          <Link
            href="/bibliotheque/auto-evaluation"
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Auto-évaluation</p>
              <p className="text-xs text-gray-500">Gérez les critères et envoyez les évaluations à vos participants</p>
            </div>
          </Link>
        </div>

        {/* Grid */}
        {topicsWithCount.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Aucun topic. Créez votre premier topic pour commencer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topicsWithCount.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TopicCard({ topic }: { topic: TopicWithCount }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">{topic.titre}</h2>
        {topic.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{topic.description}</p>
        )}
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
          <Video className="h-3.5 w-3.5" />
          {topic.video_count}/3 vidéos
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <Link
          href={`/bibliotheque/${topic.id}`}
          className="flex-1 text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 transition-colors"
        >
          Gérer les vidéos
        </Link>
        <TopicForm topic={topic} mode="edit" />
        <DeleteTopicButton topicId={topic.id} />
      </div>
    </div>
  )
}

