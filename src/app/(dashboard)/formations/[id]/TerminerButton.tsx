'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function TerminerButton({ formationId }: { formationId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTerminer = async () => {
    if (!confirm('Êtes-vous sûr de vouloir terminer cette formation ? Cette action est irréversible.')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/formations/${formationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'terminee' }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Erreur lors de la clôture de la formation.')
        return
      }

      toast.success('Formation terminée.')
      router.refresh()
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleTerminer}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Terminer la formation
    </button>
  )
}
