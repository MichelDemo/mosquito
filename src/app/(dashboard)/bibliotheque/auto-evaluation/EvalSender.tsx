'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface Formation {
  id: string
  nom: string
}

interface Evaluation {
  id: string
  completee_le: string
  formation_id: string
  participant: { prenom: string; nom: string } | null
  reponses: { critere_id: string; reponse: boolean }[]
}

interface Props {
  formations: Formation[]
  evaluations: Evaluation[]
  totalCriteres: number
}

export default function EvalSender({ formations, evaluations, totalCriteres }: Props) {
  const [formationId, setFormationId] = useState(formations[0]?.id ?? '')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const evalsFormation = evaluations.filter((e) => e.formation_id === formationId)

  async function envoyer() {
    if (!formationId) return
    setSending(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/eval/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation_id: formationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(`✅ ${data.envoyes} email(s) envoyé(s)${data.erreurs > 0 ? `, ${data.erreurs} erreur(s)` : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Envoi */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Envoyer une évaluation</h2>
        {totalCriteres === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            Ajoutez d'abord des critères avant d'envoyer une évaluation.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Formation</label>
              <select
                value={formationId}
                onChange={(e) => { setFormationId(e.target.value); setResult(null); setError(null) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
            <button onClick={envoyer} disabled={sending || !formationId}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Send className="h-4 w-4" />
              {sending ? 'Envoi…' : 'Envoyer à tous les participants'}
            </button>
            {result && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{result}</p>}
            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
          </div>
        )}
      </div>

      {/* Résultats */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Résultats — {formations.find((f) => f.id === formationId)?.nom ?? ''}
        </h2>
        {evalsFormation.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune évaluation complétée pour cette formation.</p>
        ) : (
          <div className="space-y-2">
            {evalsFormation.map((evaluation) => {
              const oui = evaluation.reponses.filter((r) => r.reponse).length
              const total = evaluation.reponses.length
              const pct = total > 0 ? Math.round((oui / total) * 100) : 0
              return (
                <div key={evaluation.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-800">
                      {evaluation.participant?.prenom} {evaluation.participant?.nom}
                    </p>
                    <span className="text-xs text-gray-400">
                      {new Date(evaluation.completee_le).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                      {oui}/{total} Oui
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
