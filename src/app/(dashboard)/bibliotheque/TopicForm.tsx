'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const topicSchema = z.object({
  titre: z.string().min(1, 'Le titre est obligatoire').max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  description: z.string().max(1000, 'La description ne peut pas dépasser 1000 caractères').optional(),
})

type TopicFormValues = z.infer<typeof topicSchema>

type TopicRow = {
  id: string
  titre: string
  description: string | null
}

interface TopicFormProps {
  topic?: TopicRow
  mode?: 'create' | 'edit'
  open?: boolean
  onClose?: () => void
}

export default function TopicForm({ topic, mode = 'create', open: controlledOpen, onClose }: TopicFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      titre: topic?.titre ?? '',
      description: topic?.description ?? '',
    },
  })

  const handleOpen = () => {
    reset({
      titre: topic?.titre ?? '',
      description: topic?.description ?? '',
    })
    setInternalOpen(true)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setInternalOpen(false)
    }
    reset()
  }

  const onSubmit = async (data: TopicFormValues) => {
    setIsSubmitting(true)
    try {
      const url = mode === 'edit' && topic ? `/api/topics/${topic.id}` : '/api/topics'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error ?? 'Une erreur est survenue')
        return
      }

      toast.success(mode === 'edit' ? 'Topic mis à jour avec succès' : 'Topic créé avec succès')
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
      {/* Trigger button */}
      {mode === 'create' ? (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau topic
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          title="Modifier le topic"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal card */}
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'edit' ? 'Modifier le topic' : 'Nouveau topic'}
              </h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('titre')}
                  type="text"
                  placeholder="Ex: Marketing digital"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.titre && (
                  <p className="mt-1 text-xs text-red-500">{errors.titre.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Description optionnelle du topic..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                )}
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
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === 'edit' ? 'Enregistrer' : 'Créer le topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
