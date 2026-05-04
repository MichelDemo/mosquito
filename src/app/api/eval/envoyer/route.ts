import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { envoyerEmailAutoEval } from '@/lib/email/brevo'

// POST — envoie la première auto-évaluation à tous les participants d'une formation
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { formation_id } = await request.json()
  if (!formation_id) return NextResponse.json({ error: 'formation_id requis.' }, { status: 400 })

  // Vérifier ownership
  const { data: formation } = await supabase
    .from('formations')
    .select('id, nom')
    .eq('id', formation_id)
    .eq('formateur_id', user.id)
    .single()

  if (!formation) return NextResponse.json({ error: 'Formation introuvable.' }, { status: 404 })

  const admin = createAdminSupabaseClient()

  // Récupérer les participants
  const { data: participants } = await admin
    .from('participants')
    .select('id, prenom, nom, email')
    .eq('formation_id', formation_id)

  if (!participants?.length) {
    return NextResponse.json({ error: 'Aucun participant.' }, { status: 400 })
  }

  let envoyes = 0
  let erreurs = 0

  for (const participant of participants) {
    try {
      // Créer un token d'évaluation
      const newToken = crypto.randomUUID()
      await admin.from('auto_evaluations').insert({
        participant_id: participant.id,
        formation_id: formation_id,
        token: newToken,
      })

      // Compter le numéro de l'évaluation
      const { count } = await admin
        .from('auto_evaluations')
        .select('id', { count: 'exact', head: true })
        .eq('participant_id', participant.id)
        .eq('formation_id', formation_id)

      await envoyerEmailAutoEval({
        destinataire: { prenom: participant.prenom, nom: participant.nom, email: participant.email },
        formation: { nom: formation.nom },
        token: newToken,
        numeroEval: count ?? 1,
      })

      envoyes++
    } catch (err) {
      console.error(`Erreur envoi auto-eval participant ${participant.id}:`, err)
      erreurs++
    }
  }

  return NextResponse.json({ envoyes, erreurs })
}
