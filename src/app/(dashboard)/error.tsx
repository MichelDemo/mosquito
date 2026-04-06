'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Une erreur est survenue</h2>
        <p className="text-sm text-gray-500 mb-4">{error.message || 'Erreur inconnue'}</p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
