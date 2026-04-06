import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteParams = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    const body = await request.json()
    const { question, options, bonne_reponse, explication } = body

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'La question est obligatoire' }, { status: 400 })
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return NextResponse.json(
        { error: 'Quatre options sont obligatoires' },
        { status: 400 }
      )
    }

    for (let i = 0; i < options.length; i++) {
      if (!options[i] || typeof options[i] !== 'string' || options[i].trim().length === 0) {
        const labels = ['A', 'B', 'C', 'D']
        return NextResponse.json(
          { error: `L'option ${labels[i]} est obligatoire` },
          { status: 400 }
        )
      }
    }

    const bonneReponseNum = parseInt(String(bonne_reponse), 10)
    if (isNaN(bonneReponseNum) || bonneReponseNum < 0 || bonneReponseNum > 3) {
      return NextResponse.json(
        { error: 'La bonne réponse doit être entre 0 et 3' },
        { status: 400 }
      )
    }

    const { data: quizQuestion, error } = await supabase
      .from('quiz_questions')
      .update({
        question: question.trim(),
        options: options.map((o: string) => o.trim()),
        bonne_reponse: bonneReponseNum,
        explication: explication?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la question' },
        { status: 500 }
      )
    }

    if (!quizQuestion) {
      return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: quizQuestion })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer cette action' },
        { status: 401 }
      )
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la question' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Question supprimée avec succès' })
  } catch {
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}
