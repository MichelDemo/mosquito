'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const quizSchema = z.object({
  question: z.string().min(1, 'La question est obligatoire').max(500, 'La question ne peut pas dépasser 500 caractères'),
  option_a: z.string().min(1, "L'option A est obligatoire").max(200, "L'option ne peut pas dépasser 200 caractères"),
  option_b: z.string().min(1, "L'option B est obligatoire").max(200, "L'option ne peut pas dépasser 200 caractères"),
  option_c: z.string().min(1, "L'option C est obligatoire").max(200, "L'option ne peut pas dépasser 200 caractères"),
  option_d: z.string().min(1, "L'option D est obligatoire").max(200, "L'option ne peut pas dépasser 200 caractères"),
  bonne_reponse: z.enum(['0', '1', '2', '3'], { required_error: 'Veuillez sélectionner la bonne réponse' }),
  explication: z.string().max(1000, "L'explication ne peut pas dépasser 1000 caractères").optional(),
})

type QuizFormValues = z.infer<typeof quizSchema>

type QuizQuestionRow = {
  id: string
  topic_id: string
  question: string
  options: unknown
  bonne_reponse: number
  explication: string | null
}

interface QuizFormProps {
  topicId: string
  question?: QuizQuestionRow
  mode?: 'create' | 'edit'
}

const optionLabels = [
  { key: 'option_a', label: 'Option A', value: '0' },
  { key: 'option_b', label: 'Option B', value: '1' },
  { key: 'option_c', label: 'Option C', value: '2' },
  { key: 'option_d', label: 'Option D', value: '3' },
] as const

export default function QuizForm({ topicId, question, mode = 'create' }: QuizFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const existingOptions = Array.isArray(question?.options) ? question.options as string[] : ['', '', '', '']

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      question: question?.question ?? '',
      option_a: existingOptions[0] ?? '',
      option_b: existingOptions[1] ?? '',
      option_c: existingOptions[2] ?? '',
      option_d: existingOptions[3] ?? '',
      bonne_reponse: question?.bonne_reponse !== undefined
        ? (String(question.bonne_reponse) as '0' | '1' | '2' | '3')
        : undefined,
      explication: question?.explication ?? '',
    },
  })

  const handleOpen = () => {
    reset({
      question: question?.question ?? '',
      option_a: existingOptions[0] ?? '',
      option_b: existingOptions[1] ?? '',
      option_c: existingOptions[2] ?? '',
      option_d: existingOptions[3] ?? '',
      bonne_reponse: question?.bonne_reponse !== undefined
        ? (String(question.bonne_reponse) as '0' | '1' | '2' | '3')
        : undefined,
      explication: question?.explication ?? '',
    })
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    reset()
  }

  const onSubmit = async (data: QuizFormValues) => {
    setIsSubmitting(true)
    try {
      const url = mode === 'edit' && question ? `/api/quiz-questions/${question.id}` : '/api/quiz-questions'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const payload = {
        topic_id: topicId,
        question: data.question,
        options: [data.option_a, data.option_b, data.option_c, data.option_d],
        bonne_reponse: parseInt(data.bonne_reponse, 10),
        explication: data.explication || null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error ?? 'Une erreur est survenue')
        return
      }

      toast.success(mode === 'edit' ? 'Question mise à jour avec succès' : 'Question ajoutée avec succès')
      handleClose()
      router.refresh()
    } catch {
      toast.error('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Trigger */}
      {mode === 'create' ? (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter une question
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          title="Modifier la question"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl p-6 z-10 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'edit' ? 'Modifier la question' : 'Ajouter une question QCM'}
              </h2>
              <button onClick={handleClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('question')}
                  rows={2}
                  placeholder="Ex: Quelle est la première étape du processus de vente ?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                {errors.question && <p className="mt-1 text-xs text-red-500">{errors.question.message}</p>}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Options <span className="text-red-500">*</span></p>
                {optionLabels.map(({ key, label, value }) => (
                  <div key={key} className="flex items-center gap-3">
                    {/* Radio */}
                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                      <input
                        {...register('bonne_reponse')}
                        type="radio"
                        value={value}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-xs font-semibold text-gray-500 w-6">{label.split(' ')[1]}</span>
                    </label>
                    <input
                      {...register(key as 'option_a' | 'option_b' | 'option_c' | 'option_d')}
                      type="text"
                      placeholder={label}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                ))}
                {errors.bonne_reponse && (
                  <p className="text-xs text-red-500">{errors.bonne_reponse.message}</p>
                )}
                {(errors.option_a || errors.option_b || errors.option_c || errors.option_d) && (
                  <p className="text-xs text-red-500">Toutes les options sont obligatoires</p>
                )}
                <p className="text-xs text-gray-400">Sélectionnez le bouton radio à gauche de la bonne réponse</p>
              </div>

              {/* Explication */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Explication <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  {...register('explication')}
                  rows={2}
                  placeholder="Ex: La prospection est la première étape car..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                {errors.explication && <p className="mt-1 text-xs text-red-500">{errors.explication.message}</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === 'edit' ? 'Enregistrer' : 'Ajouter la question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
