'use client'

import { useState } from 'react'

interface Question {
  id: string
  question: string
  options: string[]
  bonne_reponse: number
  explication: string | null
}

interface ResultatQuestion {
  question_id: string
  est_correcte: boolean
  feedback: string | null
}

interface QuizSectionProps {
  questions: Question[]
  envoiId: string
  token: string
  dejaComplete: boolean
}

export default function QuizSection({
  questions,
  envoiId,
  token,
  dejaComplete,
}: QuizSectionProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<{ score: number; total: number } | null>(null)
  const [resultats, setResultats] = useState<ResultatQuestion[]>([])
  const [error, setError] = useState<string | null>(null)

  if (dejaComplete) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
        <p className="text-green-700 font-medium">
          Vous avez déjà complété ce quiz.
        </p>
      </div>
    )
  }

  const handleChange = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const unanswered = questions.filter((q) => answers[q.id] === undefined)
    if (unanswered.length > 0) {
      setError('Veuillez répondre à toutes les questions avant de valider.')
      return
    }

    setLoading(true)
    try {
      const reponses = questions.map((q) => ({
        question_id: q.id,
        reponse_choisie: answers[q.id],
      }))

      const res = await fetch('/api/quiz/repondre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reponses }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Une erreur est survenue.')
      }

      const data = await res.json()
      setScore({ score: data.score, total: data.total })
      setResultats(data.resultats)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const LETTRES = ['A', 'B', 'C', 'D']

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-800 mb-5">
        Quiz de compréhension
      </h3>

      {submitted && score ? (
        <div>
          {/* Résultats par question */}
          <div className="space-y-5">
            {questions.map((q, idx) => {
              const resultat = resultats.find((r) => r.question_id === q.id)
              const isCorrect = resultat?.est_correcte ?? false
              const chosenIndex = answers[q.id]

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 ${
                    isCorrect
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5 ${
                        isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <p className="text-sm font-medium text-gray-800">
                      {idx + 1}. {q.question}
                    </p>
                  </div>

                  <div className="space-y-1 ml-7">
                    {q.options.map((option, optIdx) => {
                      const isChosen = chosenIndex === optIdx
                      const isCorrectOption = q.bonne_reponse === optIdx
                      return (
                        <div
                          key={optIdx}
                          className={`text-sm px-3 py-1.5 rounded-lg ${
                            isCorrectOption
                              ? 'bg-green-200 text-green-800 font-medium'
                              : isChosen && !isCorrectOption
                              ? 'bg-red-200 text-red-800 line-through'
                              : 'text-gray-600'
                          }`}
                        >
                          <span className="font-semibold mr-1">{LETTRES[optIdx]}.</span>
                          {option}
                        </div>
                      )
                    })}
                  </div>

                  {resultat?.feedback && (
                    <div className={`mt-3 ml-7 rounded-lg px-4 py-3 text-base leading-relaxed ${
                      isCorrect
                        ? 'bg-green-100 border-l-4 border-green-500 text-green-800'
                        : 'bg-orange-50 border-l-4 border-orange-400 text-orange-800'
                    }`}>
                      <span className="font-semibold mr-1">{isCorrect ? '✓' : '💡'}</span>
                      {resultat.feedback}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-gray-800 mb-3">
                {idx + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((option, optIdx) => {
                  const inputId = `q-${q.id}-opt-${optIdx}`
                  return (
                    <label
                      key={optIdx}
                      htmlFor={inputId}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                        answers[q.id] === optIdx
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                      }`}
                    >
                      <input
                        type="radio"
                        id={inputId}
                        name={`question-${q.id}`}
                        value={optIdx}
                        checked={answers[q.id] === optIdx}
                        onChange={() => handleChange(q.id, optIdx)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-500 w-5 flex-shrink-0">
                        {LETTRES[optIdx]}.
                      </span>
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {loading ? 'Validation en cours…' : 'Valider mes réponses'}
          </button>
        </form>
      )}
    </div>
  )
}
