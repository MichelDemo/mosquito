'use client'

import { useState } from 'react'

const CATEGORIES = [
  'AVANT — Préparation & Accueil',
  'PENDANT — Contenu & Pédagogie',
  'PENDANT — Interaction & Dynamique de groupe',
  'PENDANT — Posture & Communication',
  'APRÈS — Clôture & Bilan',
  'MÉTA — Progression personnelle',
]

interface Critere {
  id: string
  affirmation: string
  categorie: string | null
  ordre: number
}

interface ReponsesPrecedentes {
  critere_id: string
  reponse: boolean
}

interface Props {
  token: string
  criteres: Critere[]
  numeroEval: number
  precedentes: ReponsesPrecedentes[] | null
}

export default function EvalForm({ token, criteres, numeroEval, precedentes }: Props) {
  const [reponses, setReponses] = useState<Record<string, boolean | null>>(() =>
    Object.fromEntries(criteres.map((c) => [c.id, null]))
  )
  const [prochainDate, setProchainDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const touteRepondu = criteres.every((c) => reponses[c.id] !== null)
  const nbRepondus = criteres.filter((c) => reponses[c.id] !== null).length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!touteRepondu) {
      setError('Veuillez répondre à tous les critères.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/eval/repondre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reponses: Object.entries(reponses).map(([critere_id, reponse]) => ({ critere_id, reponse })),
          prochaine_eval_at: prochainDate || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la soumission.')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const scoreActuel = criteres.filter((c) => reponses[c.id] === true).length
    const total = criteres.length
    const pct = Math.round((scoreActuel / total) * 100)
    const scorePrecedent = precedentes ? precedentes.filter((p) => p.reponse === true).length : null
    const delta = scorePrecedent !== null ? scoreActuel - scorePrecedent : null

    const catStats = CATEGORIES.map((cat) => {
      const items = criteres.filter((c) => c.categorie === cat)
      if (items.length === 0) return null
      const oui = items.filter((c) => reponses[c.id] === true).length
      const ouiPrec = precedentes
        ? items.filter((c) => precedentes.find((p) => p.critere_id === c.id)?.reponse === true).length
        : null
      return { cat, oui, total: items.length, ouiPrec, delta: ouiPrec !== null ? oui - ouiPrec : null }
    }).filter(Boolean) as { cat: string; oui: number; total: number; ouiPrec: number | null; delta: number | null }[]

    return (
      <div className="space-y-5">
        {/* Score global */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Évaluation enregistrée !</h2>
          {prochainDate && (
            <p className="text-sm text-gray-500 mb-4">
              Prochaine évaluation le {new Date(prochainDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
          <div className="flex items-end justify-center gap-2 mt-3">
            <span className="text-5xl font-bold text-blue-600">{scoreActuel}</span>
            <span className="text-2xl text-gray-400 mb-1">/ {total}</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">{pct}% de réponses positives</p>

          {delta !== null && (
            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-sm font-semibold ${
              delta > 0 ? 'bg-green-100 text-green-700' : delta < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {delta > 0 ? `▲ +${delta} par rapport à la précédente` : delta < 0 ? `▼ ${delta} par rapport à la précédente` : '= Stable par rapport à la précédente'}
            </div>
          )}
        </div>

        {/* Détail par catégorie */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Détail par catégorie</p>
          {catStats.map(({ cat, oui, total: catTotal, delta: catDelta }) => {
            const catPct = Math.round((oui / catTotal) * 100)
            return (
              <div key={cat} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-600">{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{oui}/{catTotal}</span>
                    {catDelta !== null && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        catDelta > 0 ? 'bg-green-100 text-green-700' : catDelta < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {catDelta > 0 ? `+${catDelta}` : catDelta === 0 ? '=' : catDelta}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${catPct >= 75 ? 'bg-green-500' : catPct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                    style={{ width: `${catPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 pt-2">Mosquito — La piqûre de rappel qui ne s'oublie pas.</p>
      </div>
    )
  }

  // Grouper par catégorie
  const orderedCats = CATEGORIES.filter((cat) => criteres.some((c) => c.categorie === cat))
  const sansCat = criteres.filter((c) => !c.categorie || !CATEGORIES.includes(c.categorie))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Barre de progression */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{nbRepondus} / {criteres.length} réponses</span>
          <span>{Math.round((nbRepondus / criteres.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${(nbRepondus / criteres.length) * 100}%` }}
          />
        </div>
      </div>

      {orderedCats.map((cat) => {
        const items = criteres.filter((c) => c.categorie === cat)
        return (
          <div key={cat}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3 pb-1 border-b border-blue-100">
              {cat}
            </h3>
            <div className="space-y-2">
              {items.map((critere, idx) => {
                const reponse = reponses[critere.id]
                const precedente = precedentes?.find((p) => p.critere_id === critere.id)
                return (
                  <div
                    key={critere.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      reponse === true
                        ? 'border-green-300 bg-green-50'
                        : reponse === false
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          <span className="text-gray-300 mr-2 text-xs">{idx + 1}.</span>
                          {critere.affirmation}
                        </p>
                        {precedente !== undefined && numeroEval > 1 && (
                          <p className="mt-1 text-xs text-gray-400">
                            Éval. précédente :{' '}
                            <span className={precedente.reponse ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                              {precedente.reponse ? 'Oui' : 'Non'}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setReponses((prev) => ({ ...prev, [critere.id]: true }))}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                            reponse === true
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setReponses((prev) => ({ ...prev, [critere.id]: false }))}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                            reponse === false
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-500'
                          }`}
                        >
                          Non
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {sansCat.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Sans catégorie</h3>
          <div className="space-y-2">
            {sansCat.map((critere) => {
              const reponse = reponses[critere.id]
              return (
                <div key={critere.id} className={`rounded-xl border p-4 transition-colors ${reponse === true ? 'border-green-300 bg-green-50' : reponse === false ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-gray-800 flex-1">{critere.affirmation}</p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button type="button" onClick={() => setReponses((prev) => ({ ...prev, [critere.id]: true }))} className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${reponse === true ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'}`}>Oui</button>
                      <button type="button" onClick={() => setReponses((prev) => ({ ...prev, [critere.id]: false }))} className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${reponse === false ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-500'}`}>Non</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-blue-800 mb-2">
          Quand souhaitez-vous faire votre prochaine auto-évaluation ?
        </label>
        <input
          type="date"
          value={prochainDate}
          onChange={(e) => setProchainDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <p className="mt-1 text-xs text-blue-600">Optionnel — vous recevrez un email de rappel à cette date.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || !touteRepondu}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        {submitting ? 'Enregistrement…' : 'Valider mon auto-évaluation'}
      </button>
    </form>
  )
}
