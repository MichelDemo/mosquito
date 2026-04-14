import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Video, HelpCircle, Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import VideoForm from './VideoForm'
import QuizForm from './QuizForm'
import VideoPreviewButton from '@/components/VideoPreviewButton'

type TopicRow = { id: string; titre: string; description: string | null; created_at: string; updated_at: string }
type VideoRow = { id: string; topic_id: string; titre: string; vimeo_id: string | null; storage_path: string | null; duree_secondes: number | null; ordre: number; created_at: string }
type QuizRow = { id: string; topic_id: string; question: string; options: string[]; bonne_reponse: number; feedback_correct: string | null; feedback_incorrect: string | null; created_at: string }

type PageProps = {
  params: { topicId: string }
}

export default async function TopicDetailPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient()
  const { topicId } = params

  const [topicRes, videosRes, questionsRes] = await Promise.all([
    supabase.from('topics').select('*').eq('id', topicId).single(),
    supabase.from('videos').select('*').eq('topic_id', topicId).order('ordre', { ascending: true }),
    supabase.from('quiz_questions').select('*').eq('topic_id', topicId).order('created_at', { ascending: true }),
  ])

  if (!topicRes.data) {
    notFound()
  }

  const topic = topicRes.data as unknown as TopicRow

  const videoList = (videosRes.data ?? []) as unknown as VideoRow[]
  const questionList = (questionsRes.data ?? []) as unknown as QuizRow[]
  const canAddVideo = videoList.length < 3

  // Génère des URLs signées (2h) pour les vidéos hébergées dans Supabase Storage
  const adminSupabase = createAdminSupabaseClient()
  const videoListWithUrls = await Promise.all(
    videoList.map(async (video) => {
      if (video.storage_path) {
        const { data } = await adminSupabase.storage
          .from('videos')
          .createSignedUrl(video.storage_path, 7200)
        return { ...video, previewUrl: data?.signedUrl ?? null }
      }
      return { ...video, previewUrl: null }
    })
  )

  const optionLabels = ['A', 'B', 'C', 'D'] as const

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Back button + Header */}
        <div>
          <Link
            href="/bibliotheque"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la bibliothèque
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{topic.titre}</h1>
              {topic.description && (
                <p className="mt-2 text-gray-500">{topic.description}</p>
              )}
            </div>
            <VideoForm topicId={topicId} disabled={!canAddVideo} />
          </div>
        </div>

        {/* Videos Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Vidéos</h2>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                {videoList.length}/3
              </span>
            </div>
          </div>

          {videoList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Video className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Aucune vidéo. Ajoutez jusqu&apos;à 3 vidéos de rappel.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {videoListWithUrls.map((video) => (
                <li key={video.id} className="flex items-center gap-4 px-6 py-4">
                  {/* Aperçu vidéo */}
                  {video.previewUrl ? (
                    <VideoPreviewButton url={video.previewUrl} titre={video.titre} />
                  ) : (
                    <div className="flex-shrink-0 w-28 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Video className="h-6 w-6 text-gray-300" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        {video.ordre}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{video.titre}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      {video.storage_path ? (
                        <span className="text-green-600">✓ Hébergée</span>
                      ) : video.vimeo_id ? (
                        <span>Vimeo: {video.vimeo_id}</span>
                      ) : null}
                      {video.duree_secondes && (
                        <span>{Math.floor(video.duree_secondes / 60)}min {video.duree_secondes % 60}s</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <VideoForm topicId={topicId} video={video} mode="edit" disabled={false} />
                    <DeleteButton entityType="videos" entityId={video.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quiz Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Questions QCM</h2>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                {questionList.length}
              </span>
            </div>
            <QuizForm topicId={topicId} />
          </div>

          {questionList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <HelpCircle className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Aucune question. Ajoutez des questions pour tester les participants.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {questionList.map((q, idx) => {
                const options = Array.isArray(q.options) ? q.options as string[] : []
                return (
                  <li key={q.id} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          <span className="text-gray-400 mr-2">Q{idx + 1}.</span>
                          {q.question}
                        </p>
                        <ul className="mt-3 space-y-1.5">
                          {options.map((opt, i) => (
                            <li
                              key={i}
                              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
                                i === q.bonne_reponse
                                  ? 'bg-green-50 text-green-800'
                                  : 'text-gray-600'
                              }`}
                            >
                              {i === q.bonne_reponse && (
                                <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                              )}
                              {i !== q.bonne_reponse && (
                                <span className="w-3.5 h-3.5 flex-shrink-0" />
                              )}
                              <span className="font-medium">{optionLabels[i]}.</span>
                              {opt}
                            </li>
                          ))}
                        </ul>
                        {(q.feedback_correct || q.feedback_incorrect) && (
                          <div className="mt-2 space-y-0.5">
                            {q.feedback_correct && (
                              <p className="text-xs text-green-600 italic">✓ {q.feedback_correct}</p>
                            )}
                            {q.feedback_incorrect && (
                              <p className="text-xs text-orange-500 italic">✗ {q.feedback_incorrect}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <QuizForm topicId={topicId} question={q} mode="edit" />
                        <DeleteButton entityType="quiz-questions" entityId={q.id} />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function DeleteButton({ entityType, entityId }: { entityType: string; entityId: string }) {
  return (
    <button
      data-entity-type={entityType}
      data-entity-id={entityId}
      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
      title="Supprimer"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
