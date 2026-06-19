'use client'

import { useState } from 'react'

type Delai = '1w' | '2w' | '1m' | '2m'

const OPTIONS_DELAI: { cle: Delai; libelle: string }[] = [
  { cle: '1w', libelle: 'Dans 1 semaine' },
  { cle: '2w', libelle: 'Dans 2 semaines' },
  { cle: '1m', libelle: 'Dans 1 mois' },
  { cle: '2m', libelle: 'Dans 2 mois' },
]

/**
 * Panneau « Gérer mes rappels » : décaler le prochain rappel ou se désabonner
 * du sujet. Réutilisé sur la page /preferences/[token] et sur la page vidéo
 * /v/[token]. Toutes les actions passent par le token de l'envoi.
 */
export default function ReminderPreferences({ token }: { token: string }) {
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
        body: JSON.stringify({ token, delai }),
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
        body: JSON.stringify({ token }),
      })
      setDesabo(res.ok ? 'confirme' : 'erreur')
    } catch {
      setDesabo('erreur')
    } finally {
      setDesaboLoading(false)
    }
  }

  if (desabo === 'confirme') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Désabonnement confirmé</h2>
        <p className="text-gray-500 text-sm">
          Vous ne recevrez plus de piqûres de rappel pour ce sujet.
        </p>
      </div>
    )
  }

  if (report === 'confirme') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="text-4xl mb-3">⏰</div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Rappel décalé</h2>
        <p className="text-gray-500 text-sm">
          Votre prochain rappel a bien été reporté. À très vite&nbsp;!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-900 mb-1">Gérer mes rappels</h2>
      <p className="text-gray-400 text-xs mb-5">
        Choisissez ce que vous souhaitez faire pour ce sujet.
      </p>

      {/* Décaler le prochain rappel */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Décaler mon prochain rappel
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Vous recevrez le prochain rappel plus tard, sans rien perdre.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS_DELAI.map(({ cle, libelle }) => (
            <button
              key={cle}
              onClick={() => handleReporter(cle)}
              disabled={delaiEnCours !== null}
              className="w-full border border-gray-200 text-gray-800 text-sm font-medium py-2.5 rounded-lg hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
            >
              {delaiEnCours === cle ? 'Report…' : libelle}
            </button>
          ))}
        </div>
        {report === 'erreur' && (
          <p className="mt-2 text-xs text-red-500">
            Impossible de décaler le rappel. Lien invalide ou expiré.
          </p>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* Se désabonner du sujet */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Ne plus recevoir les rappels de ce sujet
        </h3>
        <p className="text-xs text-gray-400 mb-3">Cette action ne peut pas être annulée.</p>
        <button
          onClick={handleDesabonner}
          disabled={desaboLoading}
          className="w-full bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {desaboLoading ? 'Traitement…' : 'Me désabonner de ce sujet'}
        </button>
        {desabo === 'erreur' && (
          <p className="mt-2 text-xs text-red-500">
            Lien invalide ou expiré. Contactez votre formateur.
          </p>
        )}
      </div>
    </div>
  )
}
