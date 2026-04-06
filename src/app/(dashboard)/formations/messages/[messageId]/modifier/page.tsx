'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

interface MessageData {
  id: string
  formation_id: string
  topic_id: string
  video_id: string | null
  type_planification: 'date_fixe' | 'delai_relatif'
  date_envoi: string | null
  jours_apres_formation: number | null
  statut: string
  topics: { titre: string } | null
  videos: { id: string; titre: string }[] | null
}

export default function ModifierMessagePage() {
  const router = useRouter()
  const params = useParams()
  const messageId = params.messageId as string

  const [message, setMessage] = useState<MessageData | null>(null)
  const [allVideos, setAllVideos] = useState<{ id: string; titre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [typePlanification, setTypePlanification] = useState<'date_fixe' | 'delai_relatif'>('date_fixe')
  const [dateEnvoi, setDateEnvoi] = useState('')
  const [joursApres, setJoursApres] = useState('')
  const [videoId, setVideoId] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/messages/${messageId}`)
        if (!res.ok) { setError('Message introuvable.'); return }
        const data: MessageData = await res.json()
        setMessage(data)
        setTypePlanification(data.type_planification)
        setDateEnvoi(data.date_envoi ? data.date_envoi.slice(0, 10) : '')
        setJoursApres(data.jours_apres_formation?.toString() ?? '')
        setVideoId(data.video_id ?? '')

        // Load videos for this topic
        const vRes = await fetch(`/api/videos?topic_id=${data.topic_id}`)
        if (vRes.ok) setAllVideos(await vRes.json())
      } catch {
        setError('Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [messageId])

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        type_planification: typePlanification,
        date_envoi: typePlanification === 'date_fixe' ? dateEnvoi || null : null,
        jours_apres_formation: typePlanification === 'delai_relatif' ? parseInt(joursApres) || null : null,
        video_id: videoId || null,
      }
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        router.push(`/formations/${message?.formation_id}`)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Erreur lors de la sauvegarde.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  if (error) return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <p className="text-red-600">{error}</p>
      <Link href="/formations" className="text-blue-600 hover:underline mt-4 inline-block">
        ← Retour aux formations
      </Link>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/formations/${message?.formation_id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la formation
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Modifier le message</h1>
          {message?.topics && (
            <p className="text-sm text-gray-500 mt-1">Topic : <span className="font-medium text-gray-700">{message.topics.titre}</span></p>
          )}
        </div>

        {/* Vidéo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vidéo à envoyer</label>
          <select
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choisir une vidéo —</option>
            {allVideos.map((v) => (
              <option key={v.id} value={v.id}>{v.titre}</option>
            ))}
          </select>
        </div>

        {/* Type de planification */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type de planification</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTypePlanification('date_fixe')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                typePlanification === 'date_fixe'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              Date fixe
            </button>
            <button
              type="button"
              onClick={() => setTypePlanification('delai_relatif')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                typePlanification === 'delai_relatif'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              Jours après formation
            </button>
          </div>
        </div>

        {/* Date ou délai */}
        {typePlanification === 'date_fixe' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'envoi</label>
            <input
              type="date"
              value={dateEnvoi}
              onChange={(e) => setDateEnvoi(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de jours après la formation</label>
            <input
              type="number"
              min="1"
              max="365"
              value={joursApres}
              onChange={(e) => setJoursApres(e.target.value)}
              placeholder="ex: 7"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Bouton sauvegarder */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
