'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil, Save, Mail, MessageCircle } from 'lucide-react'

interface Participant {
  id: string
  prenom: string
  nom: string
  email: string
  telephone: string | null
  canal_email: boolean
  canal_whatsapp: boolean
}

interface Props {
  participant: Participant
}

export default function EditParticipantModal({ participant }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [prenom, setPrenom] = useState(participant.prenom)
  const [nom, setNom] = useState(participant.nom)
  const [email, setEmail] = useState(participant.email)
  const [telephone, setTelephone] = useState(participant.telephone ?? '')
  const [canalEmail, setCanalEmail] = useState(participant.canal_email)
  const [canalWhatsapp, setCanalWhatsapp] = useState(participant.canal_whatsapp)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setPrenom(participant.prenom)
    setNom(participant.nom)
    setEmail(participant.email)
    setTelephone(participant.telephone ?? '')
    setCanalEmail(participant.canal_email)
    setCanalWhatsapp(participant.canal_whatsapp)
    setError(null)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!canalEmail && !canalWhatsapp) {
      setError('Au moins un canal de communication doit être sélectionné.')
      return
    }
    if (canalWhatsapp && !telephone.trim()) {
      setError('Un numéro de téléphone est requis pour WhatsApp.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim(),
          telephone: telephone.trim() || null,
          canal_email: canalEmail,
          canal_whatsapp: canalWhatsapp,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        closeModal()
        router.refresh()
      } else {
        setError(data.error ?? 'Erreur lors de la modification.')
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
        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
        title="Modifier le participant"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Modifier le participant</h2>
              <button type="button" onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone {canalWhatsapp && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+33 6 00 00 00 00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canaux de communication <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canalEmail}
                      onChange={(e) => setCanalEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Mail className="h-4 w-4 text-blue-500" /> Email
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canalWhatsapp}
                      onChange={(e) => setCanalWhatsapp(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp
                    </span>
                  </label>
                </div>
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
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
