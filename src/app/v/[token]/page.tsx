import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import QuizSection from './QuizSection'
import VideoPlayer from '@/components/VideoPlayer'

interface PageProps {
  params: { token: string }
}

async function marquerOuvert(token: string) {
  const supabase = createAdminSupabaseClient()
  const { data: envoi } = await supabase
    .from('envois_participants')
    .select('id, ouvert_le')
    .eq('token', token)
    .single()

  if (envoi && !envoi.ouvert_le) {
    await supabase
      .from('envois_participants')
      .update({ ouvert_le: new Date().toISOString() })
      .eq('id', envoi.id)
  }
}

export default async function PageVideo({ params }: PageProps) {
  const { token } = params
  const supabase = createAdminSupabaseClient()

  // Étape 1 : récupérer l'envoi de base
  const { data: envoi } = await supabase
    .from('envois_participants')
    .select('id, quiz_complete, participant_id, message_id, envoye_le')
    .eq('token', token)
    .single()

  if (!envoi) notFound()

  // Étape 2 : récupérer le participant
  const { data: participant } = await supabase
    .from('participants')
    .select('prenom, nom')
    .eq('id', envoi.participant_id)
    .single()

  // Étape 3 : récupérer le message avec topic, vidéo et formation
  const { data: msg } = await supabase
    .from('messages_planifies')
    .select('topic_id, video_id, formation_id')
    .eq('id', envoi.message_id)
    .single()

  if (!msg) notFound()

  const [{ data: formation }, { data: topic }, { data: video }] = await Promise.all([
    supabase.from('formations').select('nom').eq('id', msg.formation_id).single(),
    supabase.from('topics').select('titre').eq('id', msg.topic_id).single(),
    supabase.from('videos').select('titre, vimeo_id, storage_path').eq('id', msg.video_id).single(),
  ])

  if (!formation || !topic || !video) notFound()

  // Vérifier l'expiration du lien (7 jours après envoi)
  const DUREE_VALIDITE_JOURS = 7
  if (envoi.envoye_le) {
    const dateEnvoi = new Date(envoi.envoye_le as string)
    const dateExpiration = new Date(dateEnvoi.getTime() + DUREE_VALIDITE_JOURS * 24 * 60 * 60 * 1000)
    if (new Date() > dateExpiration) {
      return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">⏰</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Lien expiré</h1>
            <p className="text-gray-500 text-sm">
              Ce lien de rappel n'est plus valide. Il expire {DUREE_VALIDITE_JOURS} jours après l'envoi.
            </p>
            <p className="mt-4 text-xs text-gray-400">Mosquito — La piqûre de rappel qui ne s'oublie pas.</p>
          </div>
        </main>
      )
    }
  }

  await marquerOuvert(token)

  // URL via la route API dédiée (évite les problèmes de signed URL SSR)
  const videoUrl: string | null = video.storage_path
    ? `/api/video/${token}`
    : null

  // Questions du quiz
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, question, options, bonne_reponse, explication')
    .eq('topic_id', msg.topic_id)
    .order('created_at')

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Bandeau supérieur */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">
            🦟 Mosquito
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Bonjour {participant?.prenom ?? 'vous'},
          </h1>
          <p className="text-gray-500 text-base">
            Voici votre piqûre de rappel&nbsp;:
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 font-medium">{formation.nom}</span>
            <span className="text-gray-300">·</span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-3 py-1">{topic.titre}</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Vidéo */}
          <div className="p-6 pb-0">
            {videoUrl ? (
              <VideoPlayer url={videoUrl} titre={video.titre} />
            ) : video.vimeo_id ? (
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={`https://player.vimeo.com/video/${video.vimeo_id}?h=0&badge=0&player_id=0`}
                  className="absolute inset-0 w-full h-full rounded-xl"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={video.titre}
                />
              </div>
            ) : (
              <div className="relative w-full rounded-xl bg-gray-100 flex items-center justify-center" style={{ paddingTop: '56.25%' }}>
                <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                  Vidéo non disponible
                </p>
              </div>
            )}
          </div>

          {/* Titre de la vidéo */}
          <div className="px-6 py-5">
            <p className="text-sm text-gray-500">{video.titre}</p>
          </div>

          {/* Quiz */}
          {questions && questions.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-6">
              <QuizSection
                questions={questions as Array<{
                  id: string
                  question: string
                  options: string[]
                  bonne_reponse: number
                  explication: string | null
                }>}
                envoiId={envoi.id}
                token={token}
                dejaComplete={envoi.quiz_complete}
              />
            </div>
          )}
        </div>

        {/* Pied de page */}
        <footer className="mt-10 text-center text-xs text-gray-400">
          Ce message vous a été envoyé dans le cadre de votre formation.
        </footer>
      </div>
    </div>
  )
}
