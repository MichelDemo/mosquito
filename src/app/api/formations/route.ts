import { NextRequest, NextResponse } from 'next/server'
import { asc, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { formation_topics, formations, messages_planifies, participants, videos } from '@/db/schema'
import { getUser } from '@/lib/auth/session'

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

// Erreur métier : message renvoyé tel quel au client (la transaction est annulée).
class ErreurCreation extends Error {}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
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

    // Formation, topics, participants et messages : tout est créé ou rien.
    const formationId = await db.transaction(async (tx) => {
      // 1. Create the formation
      const [formation] = await tx
        .insert(formations)
        .values({
          nom: body.nom.trim(),
          description: body.description?.trim() || null,
          date_formation: body.date_formation || null,
          formateur_id: user.id,
          statut: 'brouillon',
        })
        .returning({ id: formations.id })
        .catch((err) => {
          console.error('Erreur création formation:', err)
          throw new ErreurCreation('Erreur lors de la création de la formation.')
        })

      const formationId = formation.id

      // 2. Create formation_topics (ordered)
      await tx
        .insert(formation_topics)
        .values(
          body.topic_ids.map((topicId, index) => ({
            formation_id: formationId,
            topic_id: topicId,
            ordre: index + 1,
          }))
        )
        .catch((err) => {
          console.error('Erreur création topics:', err)
          throw new ErreurCreation("Erreur lors de l'association des topics.")
        })

      // 3. Create participants
      if (Array.isArray(body.participants) && body.participants.length > 0) {
        await tx
          .insert(participants)
          .values(
            body.participants.map((p) => ({
              formation_id: formationId,
              prenom: p.prenom.trim(),
              nom: p.nom.trim(),
              email: p.email.trim().toLowerCase(),
              telephone: p.telephone?.trim() || null,
            }))
          )
          .catch((err) => {
            console.error('Erreur création participants:', err)
            throw new ErreurCreation("Erreur lors de l'ajout des participants.")
          })
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
        const allVideos = await tx
          .select({ id: videos.id, topic_id: videos.topic_id, ordre: videos.ordre })
          .from(videos)
          .where(inArray(videos.topic_id, topicIds))
          .orderBy(asc(videos.ordre))
          .catch((err) => {
            console.error('Erreur récupération vidéos:', err)
            throw new ErreurCreation('Erreur lors de la récupération des vidéos.')
          })

        // Group videos by topic_id
        const videosByTopic = new Map<string, { id: string; ordre: number }[]>()
        for (const v of allVideos) {
          const list = videosByTopic.get(v.topic_id) ?? []
          list.push({ id: v.id, ordre: v.ordre })
          videosByTopic.set(v.topic_id, list)
        }

        // Build message inserts: 3 per topic
        const messageInserts: (typeof messages_planifies.$inferInsert)[] = []

        let ordre = 1
        // Preserve topic ordering from body.messages
        for (const msg of body.messages) {
          const joursBase = joursBaseMap.get(msg.topic_id) ?? 15
          const topicVideos = videosByTopic.get(msg.topic_id) ?? []
          // Sort by ordre just to be safe
          topicVideos.sort((a, b) => a.ordre - b.ordre)

          const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
          const relanceOffsets = [0, rand(30, 45), rand(90, 120)]
          for (let r = 0; r < 3; r++) {
            const video = topicVideos[r] ?? topicVideos[0] ?? null
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

        await tx
          .insert(messages_planifies)
          .values(messageInserts)
          .catch((err) => {
            console.error('Erreur création messages:', err)
            throw new ErreurCreation('Erreur lors de la planification des messages.')
          })
      }

      return formationId
    })

    return NextResponse.json({ id: formationId }, { status: 201 })
  } catch (err) {
    if (err instanceof ErreurCreation) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
    console.error('Erreur inattendue:', err)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    )
  }
}
