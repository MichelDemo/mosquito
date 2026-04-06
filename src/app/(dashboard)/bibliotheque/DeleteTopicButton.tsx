'use client'

import { Trash2 } from 'lucide-react'
import { supprimerTopic } from './actions'
import { useState } from 'react'

export default function DeleteTopicButton({ topicId }: { topicId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Supprimer ce topic et toutes ses vidéos ?')) return
    setLoading(true)
    try {
      await supprimerTopic(topicId)
    } catch {
      alert('Erreur lors de la suppression.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
      title="Supprimer le topic"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
