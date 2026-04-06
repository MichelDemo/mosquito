import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { envoyerEmailAutoEval } from '@/lib/email/brevo'

export async function POST(request: NextRequest) {
  try {
    const { token, reponses, prochaine_eval_at } = await request.json()

    if (!token || !reponses?.length) {
      return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Récupérer l'évaluation
    const { data: evaluation } = await supabase
      .from('auto_evaluations')
      .select('id, participant_id, formation_id, completee_le')
      .eq('token', token)
      .single()

    if (!evaluation) return NextResponse.json({ error: 'Évaluation introuvable.' }, { status: 404 })
    if (evaluation.completee_le) return NextResponse.json({ error: 'Déjà complétée.' }, { status: 409 })

    // Insérer les réponses
    const rows = reponses.map((r: { critere_id: string; reponse: boolean }) => ({
      evaluation_id: evaluation.id,
      critere_id: r.critere_id,
      reponse: r.reponse,
    }))

    const { error: insertError } = await supabase.from('auto_eval_reponses').insert(rows)
    if (insertError) {
      console.error('Erreur insertion réponses:', insertError)
      return NextResponse.json({ error: 'Erreur enregistrement.' }, { status: 500 })
    }

    // Marquer comme complétée
    await supabase
      .from('auto_evaluations')
      .update({ completee_le: new Date().toISOString() })
      .eq('id', evaluation.id)

    // Planifier la prochaine évaluation si une date est fournie
    if (prochaine_eval_at) {
      const newToken = crypto.randomUUID()
      await supabase.from('auto_evaluations').insert({
        participant_id: evaluation.participant_id,
        formation_id: evaluation.formation_id,
        token: newToken,
        prochaine_eval_at,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erreur eval/repondre:', err)
    return NextResponse.json({ error: 'Erreur inattendue.' }, { status: 500 })
  }
}
