'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, X, Loader2, UploadCloud } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClientSupabaseClient } from '@/lib/supabase/client'

const videoSchema = z.object({
  titre: z.string().min(1, 'Le titre est obligatoire').max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  ordre: z.coerce.number().int().min(1).max(3),
  duree_secondes: z.coerce
    .number()
    .int()
    .min(1, 'La durée doit être supérieure à 0')
    .optional()
    .or(z.literal('')),
})

type VideoFormValues = z.infer<typeof videoSchema>

type VideoRow = {
  id: string
  topic_id: string
  titre: string
  vimeo_id: string | null
  storage_path: string | null
  ordre: number
  duree_secondes: number | null
}

interface VideoFormProps {
  topicId: string
  video?: VideoRow
  mode?: 'create' | 'edit'
  disabled?: boolean
}

export default function VideoForm({ topicId, video, mode = 'create', disabled = false }: VideoFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      titre: video?.titre ?? '',
      ordre: video?.ordre ?? 1,
      duree_secondes: video?.duree_secondes ?? undefined,
    },
  })

  const handleOpen = () => {
    reset({
      titre: video?.titre ?? '',
      ordre: video?.ordre ?? 1,
      duree_secondes: video?.duree_secondes ?? undefined,
    })
    setSelectedFile(null)
    setUploadProgress(0)
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    reset()
    setSelectedFile(null)
    setUploadProgress(0)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  const uploadFileToStorage = async (file: File, videoId: string): Promise<string> => {
    const supabase = createClientSupabaseClient()
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() ?? 'mp4'
    const storagePath = `${topicId}/${videoId}-${timestamp}.${ext}`

    setIsUploading(true)
    setUploadProgress(0)

    // Supabase JS client does not expose upload progress natively,
    // so we simulate intermediate progress and resolve at 100 on success.
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 85 ? prev + 5 : prev))
    }, 300)

    try {
      const { error } = await supabase.storage.from('videos').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

      if (error) throw new Error(error.message)

      setUploadProgress(100)
      return storagePath
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
    }
  }

  const onSubmit = async (data: VideoFormValues) => {
    if (!selectedFile && !video?.storage_path && mode === 'create') {
      toast.error('Veuillez sélectionner un fichier vidéo')
      return
    }

    setIsSubmitting(true)
    try {
      const url = mode === 'edit' && video ? `/api/videos/${video.id}` : '/api/videos'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      // Generate a temp ID for the file path when creating
      const tempId = video?.id ?? crypto.randomUUID()

      let storagePath: string | null = video?.storage_path ?? null

      if (selectedFile) {
        storagePath = await uploadFileToStorage(selectedFile, tempId)
      }

      const payload = {
        ...data,
        storage_path: storagePath || undefined,
        topic_id: topicId,
        duree_secondes: data.duree_secondes === '' ? null : data.duree_secondes,
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

      toast.success(mode === 'edit' ? 'Vidéo mise à jour avec succès' : 'Vidéo ajoutée avec succès')
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
          onClick={disabled ? undefined : handleOpen}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={disabled ? 'Maximum 3 vidéos atteint' : undefined}
        >
          <Plus className="h-4 w-4" />
          Ajouter une vidéo
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          title="Modifier la vidéo"
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
                {mode === 'edit' ? 'Modifier la vidéo' : 'Ajouter une vidéo'}
              </h2>
              <button onClick={handleClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('titre')}
                  type="text"
                  placeholder="Ex: Introduction au marketing digital"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.titre && <p className="mt-1 text-xs text-red-500">{errors.titre.message}</p>}
              </div>

              {/* Fichier vidéo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fichier vidéo
                </label>
                <div
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                      <UploadCloud className="h-4 w-4 text-blue-500" />
                      <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                      <span className="text-gray-400">({formatFileSize(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <UploadCloud className="h-6 w-6 text-gray-400" />
                      <p className="text-sm text-gray-500">Cliquez pour sélectionner un fichier</p>
                      <p className="text-xs text-gray-400">MP4, WebM, OGG, MOV — 500 Mo max</p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {isUploading && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Envoi en cours…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Ordre + Durée */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordre <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('ordre')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                  {errors.ordre && <p className="mt-1 text-xs text-red-500">{errors.ordre.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée (secondes)
                  </label>
                  <input
                    {...register('duree_secondes')}
                    type="number"
                    min={1}
                    placeholder="Ex: 300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.duree_secondes && (
                    <p className="mt-1 text-xs text-red-500">{errors.duree_secondes.message}</p>
                  )}
                </div>
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
                  disabled={isSubmitting || isUploading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === 'edit' ? 'Enregistrer' : 'Ajouter la vidéo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
