import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, messages_planifies, quiz_questions, quiz_reponses } from '@/db/schema'
import { isUuid } from '@/lib/uuid'

interface ReponseItem {
  question_id: string
  reponse_choisie: number
}

interface RequestBody {
  token: string
  reponses: ReponseItem[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { token, reponses } = body

    if (!token || !reponses || !Array.isArray(reponses)) {
      return NextResponse.json(
        { error: 'Paramètres manquants ou invalides.' },
        { status: 400 }
      )
    }

    // Vérifier le token
    const [envoi] = isUuid(token)
      ? await db
          .select({
            id: envois_participants.id,
            quiz_complete: envois_participants.quiz_complete,
            message_id: envois_participants.message_id,
          })
          .from(envois_participants)
          .where(eq(envois_participants.token, token))
          .limit(1)
      : []

    if (!envoi) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré.' },
        { status: 404 }
      )
    }

    if (envoi.quiz_complete) {
      return NextResponse.json(
        { error: 'Ce quiz a déjà été complété.' },
        { status: 409 }
      )
    }

    // Récupérer les questions du topic associé
    const [message] = await db
      .select({ topic_id: messages_planifies.topic_id })
      .from(messages_planifies)
      .where(eq(messages_planifies.id, envoi.message_id))
      .limit(1)

    if (!message) {
      return NextResponse.json(
        { error: 'Message introuvable.' },
        { status: 404 }
      )
    }

    const questions = await db
      .select({
        id: quiz_questions.id,
        bonne_reponse: quiz_questions.bonne_reponse,
        feedback_correct: quiz_questions.feedback_correct,
        feedback_incorrect: quiz_questions.feedback_incorrect,
      })
      .from(quiz_questions)
      .where(eq(quiz_questions.topic_id, message.topic_id))

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Aucune question trouvée pour ce sujet.' },
        { status: 404 }
      )
    }

    // Construire une map des bonnes réponses
    const reponsesCorrectes = new Map(
      questions.map((q) => [q.id, {
        bonne_reponse: q.bonne_reponse,
        feedback_correct: q.feedback_correct,
        feedback_incorrect: q.feedback_incorrect,
      }])
    )

    const insertions: Array<{
      envoi_id: string
      question_id: string
      reponse_choisie: number
      est_correcte: boolean
      repondu_le: string
    }> = []

    const resultats: Array<{
      question_id: string
      est_correcte: boolean
      feedback: string | null
    }> = []

    let nbCorrectes = 0
    const now = new Date().toISOString()

    for (const reponse of reponses) {
      const questionData = reponsesCorrectes.get(reponse.question_id)
      if (!questionData) continue

      const estCorrecte = reponse.reponse_choisie === questionData.bonne_reponse
      if (estCorrecte) nbCorrectes++

      insertions.push({
        envoi_id: envoi.id,
        question_id: reponse.question_id,
        reponse_choisie: reponse.reponse_choisie,
        est_correcte: estCorrecte,
        repondu_le: now,
      })

      resultats.push({
        question_id: reponse.question_id,
        est_correcte: estCorrecte,
        feedback: estCorrecte ? questionData.feedback_correct : questionData.feedback_incorrect,
      })
    }

    // Sauvegarder les réponses et marquer le quiz comme complété, ensemble
    try {
      await db.transaction(async (tx) => {
        if (insertions.length > 0) await tx.insert(quiz_reponses).values(insertions)
        await tx
          .update(envois_participants)
          .set({ quiz_complete: true })
          .where(eq(envois_participants.id, envoi.id))
      })
    } catch (insertError) {
      console.error('Erreur insertion quiz_reponses:', insertError)
      const pgError = insertError as { message?: string; code?: string }
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde des réponses.', details: pgError.message, code: pgError.code },
        { status: 500 }
      )
    }

    return NextResponse.json({
      score: nbCorrectes,
      total: questions.length,
      resultats,
    })
  } catch (err) {
    console.error('Erreur quiz/repondre:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}
