'use client'

import { useState } from 'react'

interface Critere {
  id: string
  affirmation: string
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
          reponses: Object.entries(reponses).map(([critere_id, reponse]) => ({
            critere_id,
            reponse,
          })),
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
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">Évaluation enregistrée !</h2>
        <p className="text-green-700 text-sm">
          {prochainDate
            ? `Vous recevrez votre prochaine évaluation le ${new Date(prochainDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.`
            : 'Merci pour votre auto-évaluation.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {criteres.map((critere, idx) => {
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
                  <span className="text-gray-400 mr-2">{idx + 1}.</span>
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

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
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
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
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
