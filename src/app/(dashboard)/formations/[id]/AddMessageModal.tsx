'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Save } from 'lucide-react'

interface Topic {
  id: string
  titre: string
}

interface Video {
  id: string
  titre: string
}

interface Props {
  formationId: string
  messageCount: number
}

const MAX_MESSAGES = 45

export default function AddMessageModal({ formationId, messageCount }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [topics, setTopics] = useState<Topic[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [topicId, setTopicId] = useState('')
  const [videoId, setVideoId] = useState('')
  const [typePlanification, setTypePlanification] = useState<'date_fixe' | 'delai_relatif'>('date_fixe')
  const [dateEnvoi, setDateEnvoi] = useState('')
  const [joursApres, setJoursApres] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loadingVideos, setLoadingVideos] = useState(false)

  async function openModal() {
    setTopicId('')
    setVideoId('')
    setTypePlanification('date_fixe')
    setDateEnvoi('')
    setJoursApres('')
    setError(null)
    setOpen(true)
    setLoadingTopics(true)
    try {
      const res = await fetch('/api/topics')
      if (res.ok) {
        const data = await res.json()
        setTopics(data.data ?? [])
      }
    } catch {
      // silently fail — topics will be empty
    } finally {
      setLoadingTopics(false)
    }
  }

  function closeModal() {
    setOpen(false)
    setError(null)
    setTopics([])
    setVideos([])
  }

  useEffect(() => {
    if (!topicId) {
      setVideos([])
      setVideoId('')
      return
    }
    setLoadingVideos(true)
    setVideoId('')
    fetch(`/api/videos?topic_id=${topicId}`)
      .then((r) => r.json())
      .then((data) => setVideos(Array.isArray(data) ? data : []))
      .catch(() => setVideos([]))
      .finally(() => setLoadingVideos(false))
  }, [topicId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!topicId) { setError('Veuillez sélectionner un topic.'); return }
    if (typePlanification === 'date_fixe' && !dateEnvoi) {
      setError("Veuillez saisir une date d'envoi."); return
    }
    if (typePlanification === 'delai_relatif' && !joursApres) {
      setError('Veuillez saisir un nombre de jours.'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/messages-planifies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation_id: formationId,
          topic_id: topicId,
          video_id: videoId || null,
          type_planification: typePlanification,
          date_envoi: typePlanification === 'date_fixe' ? dateEnvoi || null : null,
          jours_apres_formation: typePlanification === 'delai_relatif' ? parseInt(joursApres) || null : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        closeModal()
        router.refresh()
      } else {
        setError(data.error ?? 'Erreur lors de la création.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  const atMax = messageCount >= MAX_MESSAGES

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={atMax}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={atMax ? `Maximum ${MAX_MESSAGES} messages atteint` : 'Ajouter un message'}
      >
        <Plus className="h-4 w-4" />
        Ajouter un message
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Ajouter un message planifié</h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic <span className="text-red-500">*</span>
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  disabled={loadingTopics}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">— Choisir un topic —</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.titre}</option>
                  ))}
                </select>
              </div>

              {/* Video */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vidéo <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <select
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  disabled={!topicId || loadingVideos}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">— Choisir une vidéo —</option>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>{v.titre}</option>
                  ))}
                </select>
              </div>

              {/* Type planification */}
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

              {/* Date or delay */}
              {typePlanification === 'date_fixe' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'envoi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateEnvoi}
                    onChange={(e) => setDateEnvoi(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jours après la formation <span className="text-red-500">*</span>
                  </label>
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
