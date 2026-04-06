'use client'

import { Send } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnvoyerMaintenantButton({ messageId }: { messageId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEnvoyer() {
    if (!confirm('Envoyer ce message maintenant à tous les participants ?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/messages/${messageId}/envoyer-maintenant`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        if (data.envoyes === 0 && data.erreurs?.length > 0) {
          alert(`⚠️ 0 envoi réussi.\n\nErreurs :\n${data.erreurs.join('\n')}`)
        } else {
          alert(`✅ ${data.envoyes} email(s) envoyé(s)`)
        }
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
      onClick={handleEnvoyer}
      disabled={loading}
      className="p-1.5 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
      title="Envoyer maintenant"
    >
      <Send className="h-4 w-4" />
    </button>
  )
}
