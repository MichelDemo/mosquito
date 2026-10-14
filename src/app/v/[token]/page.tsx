import { notFound } from 'next/navigation'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, quiz_questions } from '@/db/schema'
import { isUuid } from '@/lib/uuid'
import QuizSection from './QuizSection'
import VideoPlayer from '@/components/VideoPlayer'
import ReminderPreferences from '@/components/ReminderPreferences'

interface PageProps {
  params: { token: string }
}

async function marquerOuvert(envoiId: string) {
  await db
    .update(envois_participants)
    .set({ ouvert_le: new Date().toISOString() })
    .where(and(eq(envois_participants.id, envoiId), isNull(envois_participants.ouvert_le)))
}

export default async function PageVideo({ params }: PageProps) {
  const { token } = params
  if (!isUuid(token)) notFound()

  // Envoi → participant, et message → formation, topic, vidéo
  const envoi = await db.query.envois_participants.findFirst({
    columns: { id: true, quiz_complete: true, participant_id: true, message_id: true, envoye_le: true },
    with: {
      participants: { columns: { prenom: true, nom: true } },
      messages_planifies: {
        columns: { topic_id: true, video_id: true, formation_id: true },
        with: {
          formations: { columns: { nom: true } },
          topics: { columns: { titre: true } },
          videos: { columns: { titre: true, vimeo_id: true, storage_path: true } },
        },
      },
    },
    where: eq(envois_participants.token, token),
  })

  if (!envoi) notFound()

  const participant = envoi.participants
  const msg = envoi.messages_planifies

  if (!msg) notFound()

  const formation = msg.formations
  const topic = msg.topics
  const video = msg.videos

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

  await marquerOuvert(envoi.id)

  // URL via la route API dédiée (évite les problèmes de signed URL SSR)
  const videoUrl: string | null = video.storage_path
    ? `/api/video/${token}`
    : null

  // Questions du quiz
  const questions = await db
    .select({
      id: quiz_questions.id,
      question: quiz_questions.question,
      options: quiz_questions.options,
      bonne_reponse: quiz_questions.bonne_reponse,
      explication: quiz_questions.explication,
    })
    .from(quiz_questions)
    .where(eq(quiz_questions.topic_id, msg.topic_id))
    .orderBy(asc(quiz_questions.created_at))

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

        {/* Gérer mes rappels : décaler ou se désabonner */}
        <div className="mt-6">
          <ReminderPreferences token={token} />
        </div>

        {/* Pied de page */}
        <footer className="mt-10 text-center text-xs text-gray-400">
          Ce message vous a été envoyé dans le cadre de votre formation.
        </footer>
      </div>
    </div>
  )
}
