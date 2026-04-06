'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteParticipantButton({ participantId }: { participantId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Supprimer ce participant ?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/participants/${participantId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Erreur lors de la suppression.')
      }
    } catch {
      alert('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Supprimer"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
