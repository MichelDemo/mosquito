'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ActivateButton({ formationId }: { formationId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleActivate = async () => {
    if (!confirm('Activer la formation ? Les participants recevront les messages selon le planning défini.')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/formations/${formationId}/activer`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'activation.")
        return
      }

      toast.success(`Formation activée — ${data.envois_crees} envoi(s) créé(s).`)
      router.refresh()
    } catch {
      toast.error('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
      Activer la formation
    </button>
  )
}
