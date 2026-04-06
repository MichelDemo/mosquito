'use client'

import { useState } from 'react'

export default function DesabonnerPage({ params }: { params: { token: string } }) {
  const [statut, setStatut] = useState<'attente' | 'confirme' | 'erreur'>('attente')
  const [loading, setLoading] = useState(false)

  const handleDesabonner = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/desabonner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      })
      if (res.ok) {
        setStatut('confirme')
      } else {
        setStatut('erreur')
      }
    } catch {
      setStatut('erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        {statut === 'attente' && (
          <>
            <div className="text-5xl mb-4">🦟</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Se désabonner des rappels
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Vous ne recevrez plus les prochaines piqûres de rappel pour ce contenu.
            </p>
            <button
              onClick={handleDesabonner}
              disabled={loading}
              className="w-full bg-red-600 text-white font-medium py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Traitement...' : 'Confirmer le désabonnement'}
            </button>
            <p className="mt-4 text-xs text-gray-400">
              Cette action ne peut pas être annulée.
            </p>
          </>
        )}

        {statut === 'confirme' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Désabonnement confirmé</h1>
            <p className="text-gray-500 text-sm">
              Vous ne recevrez plus de piqûres de rappel pour ce contenu spécifique.
            </p>
          </>
        )}

        {statut === 'erreur' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h1>
            <p className="text-gray-500 text-sm">
              Lien invalide ou expiré. Contactez votre formateur.
            </p>
          </>
        )}

        <p className="mt-6 text-xs text-gray-300">Mosquito — La piqûre de rappel qui ne s'oublie pas.</p>
      </div>
    </main>
  )
}
