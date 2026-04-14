import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

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

    const supabase = createAdminSupabaseClient()

    // Vérifier le token
    const { data: envoi, error: envoisError } = await supabase
      .from('envois_participants')
      .select('id, quiz_complete, message_id')
      .eq('token', token)
      .single()

    if (envoisError || !envoi) {
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
    const { data: message } = await supabase
      .from('messages_planifies')
      .select('topic_id')
      .eq('id', envoi.message_id)
      .single()

    if (!message) {
      return NextResponse.json(
        { error: 'Message introuvable.' },
        { status: 404 }
      )
    }

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, bonne_reponse, feedback_correct, feedback_incorrect')
      .eq('topic_id', message.topic_id)

    if (!questions || questions.length === 0) {
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

    // Sauvegarder les réponses
    const { error: insertError } = await supabase
      .from('quiz_reponses')
      .insert(insertions)

    if (insertError) {
      console.error('Erreur insertion quiz_reponses:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde des réponses.', details: insertError.message, code: insertError.code },
        { status: 500 }
      )
    }

    // Marquer le quiz comme complété
    await supabase
      .from('envois_participants')
      .update({ quiz_complete: true })
      .eq('id', envoi.id)

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
