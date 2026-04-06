import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface TopicPlanification {
  topic_id: string
  jours_base?: number
}

interface ParticipantPayload {
  prenom: string
  nom: string
  email: string
  telephone?: string | null
}

interface CreateFormationBody {
  nom: string
  description?: string | null
  date_formation?: string | null
  topic_ids: string[]
  participants: ParticipantPayload[]
  messages: TopicPlanification[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour créer une formation.' },
        { status: 401 }
      )
    }

    const body: CreateFormationBody = await request.json()

    if (!body.nom?.trim()) {
      return NextResponse.json(
        { error: 'Le nom de la formation est requis.' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.topic_ids) || body.topic_ids.length === 0) {
      return NextResponse.json(
        { error: 'Sélectionnez au moins un topic.' },
        { status: 400 }
      )
    }

    if (body.topic_ids.length > 15) {
      return NextResponse.json(
        { error: 'Maximum 15 topics par formation.' },
        { status: 400 }
      )
    }

    // 1. Create the formation
    const { data: formation, error: formationError } = await supabase
      .from('formations')
      .insert({
        nom: body.nom.trim(),
        description: body.description?.trim() || null,
        date_formation: body.date_formation || null,
        formateur_id: session.user.id,
        statut: 'brouillon',
      })
      .select('id')
      .single()

    if (formationError || !formation) {
      console.error('Erreur création formation:', formationError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la formation.' },
        { status: 500 }
      )
    }

    const formationId = formation.id

    // 2. Create formation_topics (ordered)
    if (body.topic_ids.length > 0) {
      const topicInserts = body.topic_ids.map((topicId, index) => ({
        formation_id: formationId,
        topic_id: topicId,
        ordre: index + 1,
      }))

      const { error: topicsError } = await supabase
        .from('formation_topics')
        .insert(topicInserts)

      if (topicsError) {
        console.error('Erreur création topics:', topicsError)
        // Rollback formation
        await supabase.from('formations').delete().eq('id', formationId)
        return NextResponse.json(
          { error: "Erreur lors de l'association des topics." },
          { status: 500 }
        )
      }
    }

    // 3. Create participants
    if (Array.isArray(body.participants) && body.participants.length > 0) {
      const participantInserts = body.participants.map((p) => ({
        formation_id: formationId,
        prenom: p.prenom.trim(),
        nom: p.nom.trim(),
        email: p.email.trim().toLowerCase(),
        telephone: p.telephone?.trim() || null,
      }))

      const { error: participantsError } = await supabase
        .from('participants')
        .insert(participantInserts)

      if (participantsError) {
        console.error('Erreur création participants:', participantsError)
        return NextResponse.json(
          { error: "Erreur lors de l'ajout des participants." },
          { status: 500 }
        )
      }
    }

    // 4. Create messages_planifies — 3 relances per topic
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      // Build a map of jours_base per topic
      const joursBaseMap = new Map<string, number>()
      for (const msg of body.messages) {
        joursBaseMap.set(msg.topic_id, msg.jours_base ?? 15)
      }

      // Fetch videos for all topics at once, ordered by ordre
      const topicIds = body.messages.map((m) => m.topic_id)
      const { data: allVideos, error: videosError } = await supabase
        .from('videos')
        .select('id, topic_id, ordre')
        .in('topic_id', topicIds)
        .order('ordre', { ascending: true })

      if (videosError) {
        console.error('Erreur récupération vidéos:', videosError)
        return NextResponse.json(
          { error: 'Erreur lors de la récupération des vidéos.' },
          { status: 500 }
        )
      }

      // Group videos by topic_id
      const videosByTopic = new Map<string, { id: string; ordre: number }[]>()
      for (const v of allVideos ?? []) {
        const list = videosByTopic.get(v.topic_id) ?? []
        list.push({ id: v.id, ordre: v.ordre })
        videosByTopic.set(v.topic_id, list)
      }

      // Build message inserts: 3 per topic
      const messageInserts: {
        formation_id: string
        topic_id: string
        video_id: string | null
        numero_ordre: number
        type_planification: string
        date_envoi: null
        jours_apres_formation: number
        statut: string
        relance_numero: number
      }[] = []

      let ordre = 1
      // Preserve topic ordering from body.messages
      for (const msg of body.messages) {
        const joursBase = joursBaseMap.get(msg.topic_id) ?? 15
        const videos = videosByTopic.get(msg.topic_id) ?? []
        // Sort by ordre just to be safe
        videos.sort((a, b) => a.ordre - b.ordre)

        const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
        const relanceOffsets = [0, rand(30, 45), rand(90, 120)]
        for (let r = 0; r < 3; r++) {
          const video = videos[r] ?? videos[0] ?? null
          messageInserts.push({
            formation_id: formationId,
            topic_id: msg.topic_id,
            video_id: video?.id ?? null,
            numero_ordre: ordre,
            type_planification: 'delai_relatif',
            date_envoi: null,
            jours_apres_formation: joursBase + relanceOffsets[r],
            statut: 'en_attente',
            relance_numero: r + 1,
          })
          ordre++
        }
      }

      const { error: messagesError } = await supabase
        .from('messages_planifies')
        .insert(messageInserts)

      if (messagesError) {
        console.error('Erreur création messages:', messagesError)
        return NextResponse.json(
          { error: 'Erreur lors de la planification des messages.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ id: formationId }, { status: 201 })
  } catch (err) {
    console.error('Erreur inattendue:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
