'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Save, Pencil } from 'lucide-react'

interface Formation {
  id: string
  nom: string
  description: string | null
  date_formation: string | null
  statut: string
}

interface Props {
  formation: Formation
}

export default function EditFormationModal({ formation }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nom, setNom] = useState(formation.nom)
  const [description, setDescription] = useState(formation.description ?? '')
  const [dateFormation, setDateFormation] = useState(
    formation.date_formation ? formation.date_formation.slice(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setNom(formation.nom)
    setDescription(formation.description ?? '')
    setDateFormation(formation.date_formation ? formation.date_formation.slice(0, 10) : '')
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim()) {
      setError('Le nom est requis.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/formations/${formation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim(),
          description: description.trim() || null,
          date_formation: dateFormation || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        closeModal()
        router.refresh()
      } else {
        setError(data.error ?? 'Erreur lors de la mise à jour.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        title="Modifier la formation"
      >
        <Pencil className="h-4 w-4" />
        Modifier
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Modifier la formation</h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formation.statut !== 'brouillon' && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  Cette formation est {formation.statut === 'active' ? 'active' : 'terminée'}. Seules les informations de base peuvent être modifiées.
                </div>
              )}

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de la formation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Description optionnelle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de formation</label>
                <input
                  type="date"
                  value={dateFormation}
                  onChange={(e) => setDateFormation(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
