import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { formation_id, prenom, nom, email, telephone, canal_email, canal_whatsapp } = body

    // Validation
    if (!formation_id) {
      return NextResponse.json(
        { error: "L'identifiant de la formation est requis." },
        { status: 400 }
      )
    }

    if (!prenom?.trim()) {
      return NextResponse.json(
        { error: 'Le prénom est requis.' },
        { status: 400 }
      )
    }

    if (!nom?.trim()) {
      return NextResponse.json(
        { error: 'Le nom est requis.' },
        { status: 400 }
      )
    }

    if (!email?.trim() || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: 'Adresse email invalide.' },
        { status: 400 }
      )
    }

    // Verify the formation belongs to the current user
    const { data: formation } = await supabase
      .from('formations')
      .select('id')
      .eq('id', formation_id)
      .eq('formateur_id', session.user.id)
      .single()

    if (!formation) {
      return NextResponse.json(
        { error: 'Formation introuvable ou accès refusé.' },
        { status: 404 }
      )
    }

    // Check for duplicate email in this formation
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('formation_id', formation_id)
      .eq('email', email.trim().toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Un participant avec cette adresse email existe déjà dans cette formation.' },
        { status: 409 }
      )
    }

    const { data: participant, error } = await supabase
      .from('participants')
      .insert({
        formation_id,
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        telephone: telephone?.trim() || null,
        canal_email: canal_email !== false,
        canal_whatsapp: canal_whatsapp === true,
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur ajout participant:', error)
      return NextResponse.json(
        { error: "Erreur lors de l'ajout du participant." },
        { status: 500 }
      )
    }

    // Si la formation est active, créer les envois_participants pour ce nouveau participant
    const { data: formationActive } = await supabase
      .from('formations')
      .select('statut')
      .eq('id', formation_id)
      .single()

    if (formationActive?.statut === 'active') {
      const adminSupabase = (await import('@/lib/supabase/server')).createAdminSupabaseClient()

      const { data: messages } = await adminSupabase
        .from('messages_planifies')
        .select('id')
        .eq('formation_id', formation_id)

      if (messages && messages.length > 0) {
        const envois = messages.map((msg) => ({
          participant_id: participant.id,
          message_id: msg.id,
          token: crypto.randomUUID(),
          statut: 'en_attente' as const,
        }))
        await adminSupabase.from('envois_participants').insert(envois)
      }
    }

    return NextResponse.json(participant, { status: 201 })
  } catch (err) {
    console.error('Erreur inattendue:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
