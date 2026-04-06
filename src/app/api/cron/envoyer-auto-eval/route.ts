import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { envoyerEmailAutoEval } from '@/lib/email/brevo'

// Cron job — envoie les auto-évaluations planifiées pour aujourd'hui
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const supabase = createAdminSupabaseClient()
  const today = new Date().toISOString()

  // Évaluations planifiées non encore complétées dont la date est passée
  const { data: evaluations } = await supabase
    .from('auto_evaluations')
    .select('id, token, participant_id, formation_id, prochaine_eval_at')
    .lte('prochaine_eval_at', today)
    .is('completee_le', null)
    .not('prochaine_eval_at', 'is', null)

  if (!evaluations?.length) {
    return NextResponse.json({ envoyes: 0, erreurs: 0, message: 'Aucune évaluation à envoyer.' })
  }

  let envoyes = 0
  let erreurs = 0

  for (const evaluation of evaluations) {
    try {
      const [{ data: participant }, { data: formation }] = await Promise.all([
        supabase.from('participants').select('prenom, nom, email').eq('id', evaluation.participant_id).single(),
        supabase.from('formations').select('nom').eq('id', evaluation.formation_id).single(),
      ])

      if (!participant || !formation) { erreurs++; continue }

      const { count } = await supabase
        .from('auto_evaluations')
        .select('id', { count: 'exact', head: true })
        .eq('participant_id', evaluation.participant_id)
        .eq('formation_id', evaluation.formation_id)
        .not('completee_le', 'is', null)

      await envoyerEmailAutoEval({
        destinataire: { prenom: participant.prenom, nom: participant.nom, email: participant.email },
        formation: { nom: formation.nom },
        token: evaluation.token,
        numeroEval: (count ?? 0) + 1,
      })

      // Marquer prochaine_eval_at comme traitée (null pour éviter les renvois)
      await supabase
        .from('auto_evaluations')
        .update({ prochaine_eval_at: null })
        .eq('id', evaluation.id)

      envoyes++
    } catch (err) {
      console.error(`Erreur cron auto-eval ${evaluation.id}:`, err)
      erreurs++
    }
  }

  return NextResponse.json({ envoyes, erreurs })
}
