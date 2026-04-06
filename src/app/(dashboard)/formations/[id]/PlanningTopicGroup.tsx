'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, AlertCircle, Pencil, X, Save } from 'lucide-react'
import EnvoyerMaintenantButton from './EnvoyerMaintenantButton'
import DeleteMessageButton from './DeleteMessageButton'

type MessageStatut = 'en_attente' | 'envoye' | 'erreur'

interface RelanceMessage {
  id: string
  relance_numero: number
  statut: MessageStatut
  jours_apres_formation: number | null
  video_titre: string | null
}

interface Props {
  topicTitre: string
  relances: RelanceMessage[]
}

function MessageStatutBadge({ statut }: { statut: MessageStatut }) {
  if (statut === 'envoye') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Envoyé
      </span>
    )
  }
  if (statut === 'erreur') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3.5 w-3.5" /> Erreur
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Clock className="h-3.5 w-3.5" /> En attente
    </span>
  )
}

export default function PlanningTopicGroup({ topicTitre, relances }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local edit state: jours values for each relance (indexed 0-2)
  const sorted = [...relances].sort((a, b) => a.relance_numero - b.relance_numero)
  const initialJours = sorted.map((r) => r.jours_apres_formation ?? 15)
  const [joursValues, setJoursValues] = useState<number[]>(initialJours)

  const handleRelance1Change = (val: number) => {
    const v = Math.max(1, val)
    setJoursValues([v, v + 30, v + 105])
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      const updates = sorted.map((r, i) => ({
        id: r.id,
        jours_apres_formation: joursValues[i] ?? r.jours_apres_formation ?? 15,
      }))

      const res = await fetch('/api/messages-planifies/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la sauvegarde.')
        return
      }

      setEditing(false)
      router.refresh()
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setJoursValues(sorted.map((r) => r.jours_apres_formation ?? 15))
    setEditing(false)
    setError(null)
  }

  const relanceLabels = ['Relance 1', 'Relance 2', 'Relance 3']

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Topic header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{topicTitre}</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier les dates
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-700 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/40">
          <p className="text-xs text-gray-500 mb-3">
            Modifiez la date de la relance 1 — les relances 2 et 3 seront recalculées automatiquement.
          </p>
          <div className="flex flex-wrap gap-4">
            {relanceLabels.map((label, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{label}</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">J+</span>
                  <input
                    type="number"
                    min={1}
                    value={joursValues[i] ?? ''}
                    onChange={(e) => {
                      if (i === 0) {
                        handleRelance1Change(parseInt(e.target.value, 10) || 1)
                      } else {
                        const next = [...joursValues]
                        next[i] = parseInt(e.target.value, 10) || 1
                        setJoursValues(next)
                      }
                    }}
                    disabled={i !== 0}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relance rows */}
      <div className="divide-y divide-gray-50">
        {sorted.map((relance, i) => (
          <div
            key={relance.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold shrink-0">
              {relance.relance_numero}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">
                {relanceLabels[i] ?? `Relance ${relance.relance_numero}`}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {relance.video_titre ?? '—'}
              </p>
            </div>

            <div className="text-xs text-gray-500 shrink-0 tabular-nums">
              J+{relance.jours_apres_formation ?? '?'}
            </div>

            <MessageStatutBadge statut={relance.statut} />

            <div className="flex items-center gap-1 shrink-0">
              <EnvoyerMaintenantButton messageId={relance.id} />
              <DeleteMessageButton messageId={relance.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
