'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body>
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '4rem auto' }}>
          <h2 style={{ color: '#dc2626' }}>Erreur critique</h2>
          <p style={{ color: '#6b7280' }}>{error.message || 'Une erreur inattendue est survenue.'}</p>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#9ca3af' }}>
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
