'use client'

import { useState } from 'react'
import { Send, Trash2, ClipboardList } from 'lucide-react'
import Link from 'next/link'

interface Evaluation {
  id: string
  completee_le: string
  participant: { prenom: string; nom: string } | null
  reponses: { critere_id: string; reponse: boolean }[]
}

interface Props {
  formationId: string
  evaluations: Evaluation[]
  totalCriteres: number
  totalParticipants: number
}

export default function AutoEvalFormation({
  formationId,
  evaluations: initialEvaluations,
  totalCriteres,
  totalParticipants,
}: Props) {
  const [evaluations, setEvaluations] = useState(initialEvaluations)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function envoyer() {
    setSending(true)
    setSendResult(null)
    setError(null)
    try {
      const res = await fetch('/api/eval/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation_id: formationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSendResult(`${data.envoyes} email(s) envoyé(s)${data.erreurs > 0 ? `, ${data.erreurs} erreur(s)` : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi.')
    } finally {
      setSending(false)
    }
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer cette évaluation et toutes ses réponses ?')) return
    try {
      const res = await fetch(`/api/eval/supprimer?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setEvaluations((prev) => prev.filter((e) => e.id !== id))
    } catch {
      setError('Impossible de supprimer.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Barre d'actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">
          {evaluations.length} évaluation(s) complétée(s) · {totalParticipants} participant(s)
        </p>
        <div className="flex items-center gap-2">
          {totalCriteres === 0 && (
            <Link
              href="/bibliotheque/auto-evaluation"
              className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
            >
              Configurer les critères →
            </Link>
          )}
          <button
            onClick={envoyer}
            disabled={sending || totalCriteres === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Envoi…' : 'Envoyer l\'évaluation'}
          </button>
        </div>
      </div>

      {sendResult && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          ✅ {sendResult}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Liste des évaluations */}
      {evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucune évaluation complétée pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evaluations.map((evaluation) => {
            const oui = evaluation.reponses.filter((r) => r.reponse).length
            const total = evaluation.reponses.length
            const pct = total > 0 ? Math.round((oui / total) * 100) : 0
            return (
              <div key={evaluation.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800">
                    {evaluation.participant?.prenom} {evaluation.participant?.nom}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(evaluation.completee_le).toLocaleDateString('fr-FR')}
                    </span>
                    <button
                      onClick={() => supprimer(evaluation.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="Supprimer cette évaluation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-20 text-right">
                    {oui}/{total} — {pct}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
