'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, AlertCircle, CheckCircle2, X } from 'lucide-react'

interface ParsedParticipant {
  prenom: string
  nom: string
  email: string
  telephone: string
}

interface Props {
  formationId: string
  onSuccess: () => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REQUIRED_COLUMNS = ['prenom', 'nom', 'email']

export default function ParticipantCSVImport({ formationId, onSuccess }: Props) {
  const [parsed, setParsed] = useState<ParsedParticipant[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setParsed([])
    setErrors([])
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrors([])
    setParsed([])

    const Papa = (await import('papaparse')).default

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = (results.meta.fields ?? []).map((h) => h.trim().toLowerCase())

        // Check required columns
        const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col))
        if (missing.length > 0) {
          setErrors([`Colonnes manquantes : ${missing.join(', ')}`])
          return
        }

        const validRows: ParsedParticipant[] = []
        const rowErrors: string[] = []

        results.data.forEach((row, index) => {
          const lineNum = index + 2 // account for header row
          const email = (row.email ?? '').trim()
          const prenom = (row.prenom ?? '').trim()
          const nom = (row.nom ?? '').trim()

          if (!prenom) {
            rowErrors.push(`Ligne ${lineNum} : prénom manquant`)
            return
          }
          if (!nom) {
            rowErrors.push(`Ligne ${lineNum} : nom manquant`)
            return
          }
          if (!email || !EMAIL_REGEX.test(email)) {
            rowErrors.push(`Ligne ${lineNum} : adresse email invalide (${email || 'vide'})`)
            return
          }

          validRows.push({
            prenom,
            nom,
            email,
            telephone: (row.telephone ?? '').trim(),
          })
        })

        if (rowErrors.length > 0) {
          setErrors(rowErrors)
        }

        setParsed(validRows)
      },
      error: () => {
        setErrors(["Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier CSV valide."])
      },
    })
  }

  const handleImport = async () => {
    if (parsed.length === 0) return
    setLoading(true)

    try {
      const results = await Promise.allSettled(
        parsed.map((p) =>
          fetch('/api/participants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...p, formation_id: formationId }),
          })
        )
      )

      const failed = results.filter((r) => r.status === 'rejected').length
      const succeeded = results.length - failed

      if (failed > 0) {
        toast.warning(
          `${succeeded} participant(s) importé(s), ${failed} échec(s).`
        )
      } else {
        toast.success(`${succeeded} participant(s) importé(s) avec succès.`)
      }

      reset()
      onSuccess()
    } catch {
      toast.error("Erreur lors de l'importation. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const previewRows = parsed.slice(0, 10)
  const hiddenCount = parsed.length - previewRows.length

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          fileName
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <Upload className="h-7 w-7 text-gray-400" />
        {fileName ? (
          <span className="text-sm font-medium text-blue-700">{fileName}</span>
        ) : (
          <>
            <span className="text-sm font-medium text-gray-700">
              Glisser un fichier CSV ou cliquer pour choisir
            </span>
            <span className="text-xs text-gray-400">
              Colonnes requises : prenom, nom, email — optionnel : telephone
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="hidden"
        />
      </label>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errors.length === 1 ? 'Erreur détectée' : `${errors.length} erreurs détectées`}
          </div>
          <ul className="ml-6 space-y-0.5">
            {errors.map((err, i) => (
              <li key={i} className="text-xs text-red-600 list-disc">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview */}
      {parsed.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {parsed.length} participant(s) valide(s) détecté(s)
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Annuler"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-hidden border border-gray-100 rounded-lg">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Prénom</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nom</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Téléphone</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800">{row.prenom}</td>
                    <td className="px-3 py-2 text-gray-800">{row.nom}</td>
                    <td className="px-3 py-2 text-gray-600">{row.email}</td>
                    <td className="px-3 py-2 text-gray-500">{row.telephone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hiddenCount > 0 && (
            <p className="mt-1 text-xs text-gray-400 text-right">
              + {hiddenCount} autre(s) ligne(s) non affichée(s)
            </p>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            className="mt-3 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Importation...'
              : `Importer ${parsed.length} participant(s)`}
          </button>
        </div>
      )}
    </div>
  )
}
