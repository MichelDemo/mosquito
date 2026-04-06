'use client'

import { Zap } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ActivateFormationButton({ formationId }: { formationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleActivate() {
    if (!confirm('Activer cette formation ? Les liens uniques seront générés pour tous les participants.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/formations/${formationId}/activer`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(`✅ Formation activée — ${data.envois_crees} envoi(s) créé(s)`)
        router.refresh()
      } else {
        alert(`❌ Erreur : ${data.error}`)
      }
    } catch {
      alert('❌ Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
    >
      <Zap className="h-3.5 w-3.5" />
      {loading ? 'Activation...' : 'Activer'}
    </button>
  )
}
