import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { envoyerEmailRappel } from '@/lib/email/brevo'

export async function GET(request: NextRequest) {
  // Vérifier le secret d'autorisation
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
    return NextResponse.json(
      { error: 'Non autorisé.' },
      { status: 401 }
    )
  }

  const supabase = createAdminSupabaseClient()
  const today = new Date()
  const todayIso = today.toISOString()

  let traites = 0
  let erreurs = 0

  try {
    // Récupérer les messages en attente avec les données associées
    const { data: messages, error: messagesError } = await supabase
      .from('messages_planifies')
      .select(`
        id,
        type_planification,
        date_envoi,
        jours_apres_formation,
        formation_id,
        topic_id,
        video_id,
        formations (
          nom,
          date_formation
        ),
        topics (
          titre
        ),
        videos (
          titre,
          vimeo_id
        )
      `)
      .eq('statut', 'en_attente')

    if (messagesError) {
      console.error('Erreur récupération messages:', messagesError)
      return NextResponse.json({ error: 'Erreur base de données.' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ traites: 0, erreurs: 0, message: 'Aucun message à traiter.' })
    }

    for (const message of messages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formation = message.formations as any as { nom: string; date_formation: string | null } | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topic = message.topics as any as { titre: string } | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const video = message.videos as any as { titre: string; vimeo_id: string } | null

      if (!formation || !topic || !video) {
        console.warn(`Message ${message.id}: données manquantes, ignoré.`)
        continue
      }

      // Déterminer si le message doit être envoyé maintenant
      let doitEnvoyer = false

      if (message.type_planification === 'date_fixe') {
        if (message.date_envoi && message.date_envoi <= todayIso) {
          doitEnvoyer = true
        }
      } else if (message.type_planification === 'delai_relatif') {
        if (message.jours_apres_formation !== null && formation.date_formation) {
          const dateFormation = new Date(formation.date_formation)
          const dateEnvoi = new Date(dateFormation)
          dateEnvoi.setDate(dateEnvoi.getDate() + message.jours_apres_formation)
          if (dateEnvoi <= today) {
            doitEnvoyer = true
          }
        }
      }

      if (!doitEnvoyer) continue

      // Récupérer les envois en attente pour ce message
      const { data: envois, error: envoisError } = await supabase
        .from('envois_participants')
        .select(`
          id,
          token,
          participants (
            prenom,
            nom,
            email
          )
        `)
        .eq('message_id', message.id)
        .eq('statut', 'en_attente')

      if (envoisError) {
        console.error(`Erreur récupération envois pour message ${message.id}:`, envoisError)
        erreurs++
        continue
      }

      if (!envois || envois.length === 0) {
        // Aucun envoi à faire, marquer le message comme envoyé
        await supabase
          .from('messages_planifies')
          .update({ statut: 'envoye' })
          .eq('id', message.id)
        continue
      }

      let messageErreur = false

      for (const envoi of envois) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const participant = envoi.participants as any as {
          prenom: string
          nom: string
          email: string
        } | null

        if (!participant) {
          console.warn(`Envoi ${envoi.id}: participant manquant, ignoré.`)
          erreurs++
          messageErreur = true
          continue
        }

        try {
          await envoyerEmailRappel({
            destinataire: {
              prenom: participant.prenom,
              nom: participant.nom,
              email: participant.email,
            },
            formation: { nom: formation.nom },
            topic: { titre: topic.titre },
            video: { titre: video.titre },
            token: envoi.token,
            dateEnvoi: today,
          })

          await supabase
            .from('envois_participants')
            .update({
              statut: 'envoye',
              envoye_le: new Date().toISOString(),
            })
            .eq('id', envoi.id)

          traites++
        } catch (emailErr) {
          console.error(`Erreur envoi email pour envoi ${envoi.id}:`, emailErr)
          await supabase
            .from('envois_participants')
            .update({ statut: 'erreur' })
            .eq('id', envoi.id)
          erreurs++
          messageErreur = true
        }
      }

      // Mettre à jour le statut du message
      await supabase
        .from('messages_planifies')
        .update({ statut: messageErreur ? 'erreur' : 'envoye' })
        .eq('id', message.id)
    }

    return NextResponse.json({ traites, erreurs })
  } catch (err) {
    console.error('Erreur cron envoyer-messages:', err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.', traites, erreurs },
      { status: 500 }
    )
  }
}
