import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const MAX_MESSAGES = 45

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { formation_id, topic_id, video_id, type_planification, date_envoi, jours_apres_formation } = body

    if (!formation_id) {
      return NextResponse.json({ error: "L'identifiant de la formation est requis." }, { status: 400 })
    }
    if (!topic_id) {
      return NextResponse.json({ error: 'Le topic est requis.' }, { status: 400 })
    }
    if (!type_planification || !['date_fixe', 'delai_relatif'].includes(type_planification)) {
      return NextResponse.json({ error: 'Le type de planification est invalide.' }, { status: 400 })
    }
    if (type_planification === 'date_fixe' && !date_envoi) {
      return NextResponse.json({ error: "La date d'envoi est requise pour une planification à date fixe." }, { status: 400 })
    }
    if (type_planification === 'delai_relatif' && !jours_apres_formation) {
      return NextResponse.json({ error: 'Le délai en jours est requis pour une planification relative.' }, { status: 400 })
    }

    // Verify formation ownership
    const { data: formation } = await supabase
      .from('formations')
      .select('id, statut')
      .eq('id', formation_id)
      .eq('formateur_id', user.id)
      .single()

    if (!formation) {
      return NextResponse.json({ error: 'Formation introuvable ou accès refusé.' }, { status: 404 })
    }

    // Check message count limit
    const { count } = await supabase
      .from('messages_planifies')
      .select('*', { count: 'exact', head: true })
      .eq('formation_id', formation_id)

    if ((count ?? 0) >= MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Cette formation a déjà atteint le maximum de ${MAX_MESSAGES} messages planifiés.` },
        { status: 400 }
      )
    }

    // Determine the next order number
    const { data: lastMessage } = await supabase
      .from('messages_planifies')
      .select('numero_ordre')
      .eq('formation_id', formation_id)
      .order('numero_ordre', { ascending: false })
      .limit(1)
      .single()

    const nextOrdre = lastMessage ? lastMessage.numero_ordre + 1 : 1

    // Insert the message
    const { data: message, error: insertError } = await supabase
      .from('messages_planifies')
      .insert({
        formation_id,
        topic_id,
        video_id: video_id || null,
        type_planification,
        date_envoi: type_planification === 'date_fixe' ? date_envoi : null,
        jours_apres_formation: type_planification === 'delai_relatif' ? jours_apres_formation : null,
        numero_ordre: nextOrdre,
        statut: 'en_attente',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erreur création message planifié:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la création du message.' }, { status: 500 })
    }

    // If formation is already active, create envois for existing participants
    if (formation.statut === 'active') {
      const { data: participants } = await supabase
        .from('participants')
        .select('id')
        .eq('formation_id', formation_id)

      if (participants && participants.length > 0) {
        const envois = participants.map((p) => ({
          message_id: message.id,
          participant_id: p.id,
          statut: 'en_attente',
        }))

        const { error: envoisError } = await supabase
          .from('envois_participants')
          .insert(envois)

        if (envoisError) {
          console.error('Erreur création envois_participants:', envoisError)
          // Non-blocking: message created, envois may need to be retried
        }
      }
    }

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    console.error('Erreur inattendue POST messages-planifies:', err)
    return NextResponse.json({ error: 'Une erreur inattendue est survenue.' }, { status: 500 })
  }
}
