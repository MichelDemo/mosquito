'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface Critere {
  id: string
  affirmation: string
  ordre: number
  actif: boolean
}

interface Props {
  criteres: Critere[]
}

export default function CriteresManager({ criteres: initialCriteres }: Props) {
  const [criteres, setCriteres] = useState(initialCriteres)
  const [nouvelleAffirmation, setNouvelleAffirmation] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ajouter() {
    if (!nouvelleAffirmation.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/auto-eval-criteres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affirmation: nouvelleAffirmation.trim(), ordre: criteres.length }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCriteres((prev) => [...prev, data])
      setNouvelleAffirmation('')
    } catch {
      setError("Impossible d'ajouter.")
    } finally {
      setSaving(false)
    }
  }

  async function sauvegarder(id: string) {
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

  async function supprimer(id: string) {
    if (!confirm('Supprimer ce critère ?')) return
    try {
      await fetch(`/api/auto-eval-criteres?id=${id}`, { method: 'DELETE' })
      setCriteres((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Impossible de supprimer.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Affirmations</h2>
        <span className="text-xs text-gray-400">{criteres.length} critère(s)</span>
      </div>

      <div className="space-y-2 mb-4">
        {criteres.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Aucun critère. Ajoutez votre première affirmation.</p>
        )}
        {criteres.map((c, idx) => (
          <div key={c.id} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-xs text-gray-400 mt-0.5 w-6 flex-shrink-0">{idx + 1}.</span>
            {editingId === c.id ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sauvegarder(c.id) }}
                  className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button onClick={() => sauvegarder(c.id)} disabled={saving} className="p-1.5 text-green-600 hover:text-green-700">
                  <Save className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
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
                  <button onClick={() => supprimer(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={nouvelleAffirmation}
          onChange={(e) => setNouvelleAffirmation(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ajouter() }}
          placeholder="Nouvelle affirmation…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={ajouter} disabled={saving || !nouvelleAffirmation.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
    </div>
  )
}
