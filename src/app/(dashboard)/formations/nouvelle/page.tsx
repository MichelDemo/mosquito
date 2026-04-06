'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ChevronRight, ChevronLeft, Check, Upload, X, Calendar } from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types & Schema
// ---------------------------------------------------------------------------

const informationsSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  date_formation: z.string().optional(),
})

type InformationsValues = z.infer<typeof informationsSchema>

interface TopicWithVideos {
  id: string
  titre: string
  videos: { id: string; titre: string; ordre: number }[]
}

interface Participant {
  prenom: string
  nom: string
  email: string
  telephone: string
}

interface MessagePlanification {
  topic_id: string
  jours_base: number
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { label: 'Informations' },
  { label: 'Topics' },
  { label: 'Participants' },
  { label: 'Planification' },
]

function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Étapes" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const done = index < current
          const active = index === current
          return (
            <li key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                    done
                      ? 'bg-blue-600 text-white'
                      : active
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                    active ? 'text-blue-600' : done ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-16 mx-2 mb-4 transition-colors ${
                    done ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Informations
// ---------------------------------------------------------------------------

function StepInformations({
  values,
  onChange,
}: {
  values: InformationsValues
  onChange: (v: InformationsValues) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InformationsValues>({
    resolver: zodResolver(informationsSchema),
    defaultValues: values,
  })

  return (
    <form id="step-form" onSubmit={handleSubmit(onChange)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de la formation <span className="text-red-500">*</span>
        </label>
        <input
          {...register('nom')}
          placeholder="Ex : Formation Excel avancé"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.nom && (
          <p className="mt-1 text-xs text-red-600">{errors.nom.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Description optionnelle de la formation"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date de formation
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            {...register('date_formation')}
            type="date"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Topics
// ---------------------------------------------------------------------------

function StepTopics({
  topics,
  selected,
  onToggle,
}: {
  topics: TopicWithVideos[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Sélectionnez jusqu'à 15 topics à inclure dans cette formation.{' '}
        <span className="font-medium text-blue-600">{selected.length}/15 sélectionné(s)</span>
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {topics.map((topic) => {
          const isSelected = selected.includes(topic.id)
          const isDisabled = !isSelected && selected.length >= 15
          return (
            <label
              key={topic.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onToggle(topic.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{topic.titre}</p>
                <p className="text-xs text-gray-500">{topic.videos.length} vidéo(s)</p>
              </div>
            </label>
          )
        })}
      </div>
      {topics.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          Aucun topic disponible dans la bibliothèque.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Participants
// ---------------------------------------------------------------------------

function StepParticipants({
  participants,
  onAdd,
  onRemove,
}: {
  participants: Participant[]
  onAdd: (p: Participant) => void
  onRemove: (index: number) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Participant>({
    defaultValues: { prenom: '', nom: '', email: '', telephone: '' },
  })

  const [csvError, setCsvError] = useState<string | null>(null)

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(null)

    const Papa = (await import('papaparse')).default
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const required = ['prenom', 'nom', 'email']
        const headers = results.meta.fields ?? []
        const missing = required.filter((h) => !headers.includes(h))
        if (missing.length > 0) {
          setCsvError(`Colonnes manquantes : ${missing.join(', ')}`)
          return
        }
        results.data.forEach((row) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(row.email)) return
          onAdd({
            prenom: row.prenom ?? '',
            nom: row.nom ?? '',
            email: row.email ?? '',
            telephone: row.telephone ?? '',
          })
        })
      },
      error: () => setCsvError('Erreur lors de la lecture du fichier CSV.'),
    })
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Ajouter individuellement</h3>
        <form
          onSubmit={handleSubmit((data) => {
            onAdd(data)
            reset()
          })}
          className="grid grid-cols-2 gap-3"
        >
          <div>
            <input
              {...register('prenom', { required: true })}
              placeholder="Prénom *"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              {...register('nom', { required: true })}
              placeholder="Nom *"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              {...register('email', { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })}
              placeholder="Email *"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              {...register('telephone')}
              placeholder="Téléphone"
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ajouter le participant
            </button>
          </div>
        </form>
      </div>

      {/* CSV import */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Importer depuis un CSV</h3>
        <p className="text-xs text-gray-500 mb-3">
          Colonnes requises : <code className="bg-gray-200 px-1 rounded">prenom</code>,{' '}
          <code className="bg-gray-200 px-1 rounded">nom</code>,{' '}
          <code className="bg-gray-200 px-1 rounded">email</code>,{' '}
          <code className="bg-gray-200 px-1 rounded">telephone</code> (optionnel)
        </p>
        <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
          <Upload className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Choisir un fichier CSV</span>
          <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
        </label>
        {csvError && <p className="mt-2 text-xs text-red-600">{csvError}</p>}
      </div>

      {/* Participant list */}
      {participants.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {participants.length} participant(s) ajouté(s)
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {participants.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 bg-white border border-gray-100 rounded-lg"
              >
                <span className="text-sm text-gray-800">
                  {p.prenom} {p.nom}{' '}
                  <span className="text-gray-400 text-xs">— {p.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Planification
// ---------------------------------------------------------------------------

function StepPlanification({
  topics,
  selectedTopicIds,
  messages,
  onChange,
}: {
  topics: TopicWithVideos[]
  selectedTopicIds: string[]
  messages: MessagePlanification[]
  onChange: (messages: MessagePlanification[]) => void
}) {
  const selectedTopics = topics.filter((t) => selectedTopicIds.includes(t.id))

  const updateJoursBase = (index: number, value: number) => {
    const next = messages.map((m, i) => (i === index ? { ...m, jours_base: value } : m))
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Définissez la date de la première relance pour chacun des {selectedTopics.length} topic(s).
        Les relances 2 et 3 seront automatiquement planifiées à J+30 et J+105 après la première.
      </p>

      {selectedTopics.map((topic, index) => {
        const msg = messages[index]
        if (!msg) return null
        const joursBase = msg.jours_base ?? 15
        return (
          <div key={topic.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0">
                {index + 1}
              </span>
              <h3 className="text-sm font-medium text-gray-900">{topic.titre}</h3>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Première relance — J+ jours après la formation
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">J+</span>
                <input
                  type="number"
                  min={1}
                  value={joursBase}
                  onChange={(e) =>
                    updateJoursBase(index, parseInt(e.target.value, 10) || 1)
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">jours</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                Relance 1 : J+{joursBase}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                Relance 2 : J+{joursBase + 30}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                Relance 3 : J+{joursBase + 105}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NouvelleFormationPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [topicsLibrary, setTopicsLibrary] = useState<TopicWithVideos[]>([])
  const [topicsLoaded, setTopicsLoaded] = useState(false)

  // State per step
  const [infos, setInfos] = useState<InformationsValues>({
    nom: '',
    description: '',
    date_formation: '',
  })
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<MessagePlanification[]>([])

  // Load topics library once on step 1 → 2 transition
  const loadTopics = async () => {
    if (topicsLoaded) return
    const supabase = createClientSupabaseClient()
    const { data } = await supabase
      .from('topics')
      .select('id, titre, videos(id, titre, ordre)')
      .order('titre')
    if (data) {
      const mapped: TopicWithVideos[] = (data as any[]).map((t) => ({
        id: t.id,
        titre: t.titre,
        videos: Array.isArray(t.videos) ? t.videos : [],
      }))
      setTopicsLibrary(mapped)
    }
    setTopicsLoaded(true)
  }

  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 15) return prev
      return [...prev, id]
    })
  }

  // When entering step 3, build messages array from selected topics
  const buildMessages = () => {
    const selected = topicsLibrary.filter((t) => selectedTopicIds.includes(t.id))
    const next: MessagePlanification[] = selected.map((t) => ({
      topic_id: t.id,
      jours_base: 15,
    }))
    setMessages(next)
  }

  const goNext = async () => {
    if (step === 0) {
      // Trigger form submit via hidden button trick — handled by StepInformations callback
      document.getElementById('step-submit-btn')?.click()
      return
    }
    if (step === 1) {
      if (selectedTopicIds.length === 0) {
        toast.error('Sélectionnez au moins un topic.')
        return
      }
      buildMessages()
    }
    setStep((s) => s + 1)
  }

  const goPrev = () => setStep((s) => s - 1)

  const handleInformationsSubmit = (values: InformationsValues) => {
    setInfos(values)
    loadTopics()
    setStep(1)
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/formations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: infos.nom,
          description: infos.description,
          date_formation: infos.date_formation || null,
          topic_ids: selectedTopicIds,
          participants,
          messages,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la création.')
        return
      }

      toast.success('Formation créée avec succès !')
      router.push(`/formations/${json.id}`)
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle formation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Créez une formation et planifiez vos rappels automatiques.
        </p>
      </div>

      <Stepper current={step} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {step === 0 && (
          <>
            <StepInformations values={infos} onChange={handleInformationsSubmit} />
            {/* Hidden trigger button for react-hook-form submission */}
            <button id="step-submit-btn" type="submit" form="step-form" className="hidden" />
          </>
        )}

        {step === 1 && (
          <StepTopics
            topics={topicsLibrary}
            selected={selectedTopicIds}
            onToggle={toggleTopic}
          />
        )}

        {step === 2 && (
          <StepParticipants
            participants={participants}
            onAdd={(p) => setParticipants((prev) => [...prev, p])}
            onRemove={(i) => setParticipants((prev) => prev.filter((_, idx) => idx !== i))}
          />
        )}

        {step === 3 && (
          <StepPlanification
            topics={topicsLibrary}
            selectedTopicIds={selectedTopicIds}
            messages={messages}
            onChange={setMessages}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        {step > 0 ? (
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création...' : 'Créer la formation'}
            {!loading && <Check className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
