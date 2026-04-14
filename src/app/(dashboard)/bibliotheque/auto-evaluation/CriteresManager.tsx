'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronRight } from 'lucide-react'

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
  actif: boolean
}

interface Props {
  criteres: Critere[]
}

export default function CriteresManager({ criteres: initialCriteres }: Props) {
  const [criteres, setCriteres] = useState(initialCriteres)
  const [nouvelleAffirmation, setNouvelleAffirmation] = useState('')
  const [nouvelleCategorie, setNouvelleCategorie] = useState(CATEGORIES[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editingCategorie, setEditingCategorie] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Grouper par catégorie
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: criteres.filter((c) => c.categorie === cat),
  })).concat(
    criteres.filter((c) => !c.categorie || !CATEGORIES.includes(c.categorie)).length > 0
      ? [{ cat: 'Sans catégorie', items: criteres.filter((c) => !c.categorie || !CATEGORIES.includes(c.categorie)) }]
      : []
  )

  async function ajouter() {
    if (!nouvelleAffirmation.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/auto-eval-criteres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affirmation: nouvelleAffirmation.trim(),
          categorie: nouvelleCategorie,
          ordre: criteres.length,
        }),
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
        body: JSON.stringify({ id, affirmation: editingText, categorie: editingCategorie }),
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

  const toggleCollapse = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Affirmations</h2>
        <span className="text-xs text-gray-400">{criteres.length} critère(s)</span>
      </div>

      <div className="space-y-3 mb-6">
        {grouped.map(({ cat, items }) => {
          if (items.length === 0) return null
          const isCollapsed = collapsed[cat]
          return (
            <div key={cat} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{items.length}</span>
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                </div>
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-gray-50">
                  {items.map((c, idx) => (
                    <div key={c.id} className="flex items-start gap-3 px-4 py-3 bg-white">
                      <span className="text-xs text-gray-300 mt-0.5 w-5 flex-shrink-0">{idx + 1}.</span>
                      {editingId === c.id ? (
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') sauvegarder(c.id) }}
                            className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <select
                            value={editingCategorie}
                            onChange={(e) => setEditingCategorie(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button onClick={() => sauvegarder(c.id)} disabled={saving} className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                              <Save className="h-3 w-3" /> Enregistrer
                            </button>
                            <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200">
                              <X className="h-3 w-3" /> Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-700">{c.affirmation}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => { setEditingId(c.id); setEditingText(c.affirmation); setEditingCategorie(c.categorie ?? CATEGORIES[0]) }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                            >
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
              )}
            </div>
          )
        })}

        {criteres.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Aucun critère. Ajoutez votre première affirmation.</p>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 mb-2">Nouvelle affirmation</p>
        <select
          value={nouvelleCategorie}
          onChange={(e) => setNouvelleCategorie(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="text"
            value={nouvelleAffirmation}
            onChange={(e) => setNouvelleAffirmation(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ajouter() }}
            placeholder="Texte de l'affirmation…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={ajouter}
            disabled={saving || !nouvelleAffirmation.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
    </div>
  )
}
