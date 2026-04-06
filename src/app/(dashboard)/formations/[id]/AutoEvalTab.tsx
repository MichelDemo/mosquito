'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Save, X, Send } from 'lucide-react'

interface Critere {
  id: string
  affirmation: string
  ordre: number
  actif: boolean
}

interface Evaluation {
  id: string
  completee_le: string | null
  created_at: string
  participant: { prenom: string; nom: string } | null
  reponses: { critere_id: string; reponse: boolean }[]
}

interface Props {
  formationId: string
  criteres: Critere[]
  evaluations: Evaluation[]
}

export default function AutoEvalTab({ formationId, criteres: initialCriteres, evaluations }: Props) {
  const router = useRouter()
  const [criteres, setCriteres] = useState(initialCriteres)
  const [nouvelleAffirmation, setNouvelleAffirmation] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<string | null>(null)

  async function ajouterCritere() {
    if (!nouvelleAffirmation.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/auto-eval-criteres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation_id: formationId,
          affirmation: nouvelleAffirmation.trim(),
          ordre: criteres.length,
        }),
      })
      if (!res.ok) throw new Error('Erreur création.')
      const data = await res.json()
      setCriteres((prev) => [...prev, data])
      setNouvelleAffirmation('')
    } catch {
      setError('Impossible d\'ajouter le critère.')
    } finally {
      setSaving(false)
    }
  }

  async function sauvegarderEdit(id: string) {
    if (!editingText.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/auto-eval-criteres', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, affirmation: editingText }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCriteres((prev) => prev.map((c) => (c.id === id ? data : c)))
      setEditingId(null)
    } catch {
      setError('Impossible de modifier.')
    } finally {
      setSaving(false)
    }
  }

  async function supprimerCritere(id: string) {
    if (!confirm('Supprimer ce critère ?')) return
    try {
      await fetch(`/api/auto-eval-criteres?id=${id}`, { method: 'DELETE' })
      setCriteres((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Impossible de supprimer.')
    }
  }

  async function envoyerEvaluations() {
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
      setSendResult(`✅ ${data.envoyes} email(s) envoyé(s)${data.erreurs > 0 ? `, ${data.erreurs} erreur(s)` : ''}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi.')
    } finally {
      setSending(false)
    }
  }

  // Calcul du score par évaluation complétée
  const evalCompletes = evaluations.filter((e) => e.completee_le)

  return (
    <div className="space-y-8">

      {/* Gestion des critères */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Critères d'auto-évaluation</h3>
          <span className="text-xs text-gray-400">{criteres.length} critère(s)</span>
        </div>

        <div className="space-y-2 mb-4">
          {criteres.map((c, idx) => (
            <div key={c.id} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-400 mt-0.5 w-5 flex-shrink-0">{idx + 1}.</span>
              {editingId === c.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') sauvegarderEdit(c.id) }}
                  />
                  <button onClick={() => sauvegarderEdit(c.id)} disabled={saving}
                    className="p-1.5 text-green-600 hover:text-green-700">
                    <Save className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-700">{c.affirmation}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingId(c.id); setEditingText(c.affirmation) }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => supprimerCritere(c.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ajouter un critère */}
        <div className="flex gap-2">
          <input
            type="text"
            value={nouvelleAffirmation}
            onChange={(e) => setNouvelleAffirmation(e.target.value)}
            placeholder="Nouvelle affirmation…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => { if (e.key === 'Enter') ajouterCritere() }}
          />
          <button onClick={ajouterCritere} disabled={saving || !nouvelleAffirmation.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </section>

      {/* Envoi */}
      <section className="border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Envoyer l'auto-évaluation</h3>
            <p className="text-sm text-gray-500 mt-0.5">Envoie un email à tous les participants avec un lien unique.</p>
          </div>
          <button onClick={envoyerEvaluations} disabled={sending || criteres.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Send className="h-4 w-4" />
            {sending ? 'Envoi…' : 'Envoyer maintenant'}
          </button>
        </div>
        {sendResult && <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{sendResult}</p>}
        {error && <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
      </section>

      {/* Résultats */}
      {evalCompletes.length > 0 && (
        <section className="border-t border-gray-100 pt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Résultats ({evalCompletes.length})</h3>
          <div className="space-y-3">
            {evalCompletes.map((evaluation) => {
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
                      {new Date(evaluation.completee_le!).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                      {oui}/{total} Oui
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
