'use client'

import { useState } from 'react'

type Delai = '1w' | '2w' | '1m'

const OPTIONS_DELAI: { cle: Delai; libelle: string }[] = [
  { cle: '1w', libelle: 'Dans 1 semaine' },
  { cle: '2w', libelle: 'Dans 2 semaines' },
  { cle: '1m', libelle: 'Dans 1 mois' },
]

export default function PreferencesPage({ params }: { params: { token: string } }) {
  const [report, setReport] = useState<'attente' | 'confirme' | 'erreur'>('attente')
  const [desabo, setDesabo] = useState<'attente' | 'confirme' | 'erreur'>('attente')
  const [delaiEnCours, setDelaiEnCours] = useState<Delai | null>(null)
  const [desaboLoading, setDesaboLoading] = useState(false)

  const handleReporter = async (delai: Delai) => {
    setDelaiEnCours(delai)
    try {
      const res = await fetch('/api/reporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, delai }),
      })
      setReport(res.ok ? 'confirme' : 'erreur')
    } catch {
      setReport('erreur')
    } finally {
      setDelaiEnCours(null)
    }
  }

  const handleDesabonner = async () => {
    setDesaboLoading(true)
    try {
      const res = await fetch('/api/desabonner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      })
      setDesabo(res.ok ? 'confirme' : 'erreur')
    } catch {
      setDesabo('erreur')
    } finally {
      setDesaboLoading(false)
    }
  }

  const termine = report === 'confirme' || desabo === 'confirme'

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-4">🦟</div>

        {desabo === 'confirme' ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Désabonnement confirmé</h1>
            <p className="text-gray-500 text-sm">
              Vous ne recevrez plus de piqûres de rappel pour ce sujet.
            </p>
          </>
        ) : report === 'confirme' ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Rappel décalé</h1>
            <p className="text-gray-500 text-sm">
              Votre prochain rappel a bien été reporté. À très vite !
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Gérer mes rappels</h1>
            <p className="text-gray-500 text-sm mb-6">
              Choisissez ce que vous souhaitez faire pour ce sujet.
            </p>

            {/* Décaler le prochain rappel */}
            <div className="text-left mb-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Décaler mon prochain rappel
              </h2>
              <p className="text-xs text-gray-400 mb-3">
                Vous recevrez le prochain rappel plus tard, sans rien perdre.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {OPTIONS_DELAI.map(({ cle, libelle }) => (
                  <button
                    key={cle}
                    onClick={() => handleReporter(cle)}
                    disabled={delaiEnCours !== null}
                    className="w-full border border-gray-200 text-gray-800 font-medium py-2.5 rounded-lg hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {delaiEnCours === cle ? 'Report en cours…' : libelle}
                  </button>
                ))}
              </div>
              {report === 'erreur' && (
                <p className="mt-2 text-xs text-red-500">
                  Impossible de décaler le rappel. Lien invalide ou expiré.
                </p>
              )}
            </div>

            <div className="border-t border-gray-100 my-2" />

            {/* Se désabonner du sujet */}
            <div className="text-left mt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Ne plus recevoir les rappels de ce sujet
              </h2>
              <p className="text-xs text-gray-400 mb-3">
                Cette action ne peut pas être annulée.
              </p>
              <button
                onClick={handleDesabonner}
                disabled={desaboLoading}
                className="w-full bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {desaboLoading ? 'Traitement…' : 'Me désabonner de ce sujet'}
              </button>
              {desabo === 'erreur' && (
                <p className="mt-2 text-xs text-red-500">
                  Lien invalide ou expiré. Contactez votre formateur.
                </p>
              )}
            </div>
          </>
        )}

        {termine && (
          <p className="mt-6 text-xs text-gray-400">
            Vous pouvez fermer cette page.
          </p>
        )}

        <p className="mt-6 text-xs text-gray-300">
          Mosquito — La piqûre de rappel qui ne s&apos;oublie pas.
        </p>
      </div>
    </main>
  )
}
