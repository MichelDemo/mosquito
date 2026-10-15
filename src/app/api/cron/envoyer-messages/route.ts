import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import { envois_participants, messages_planifies } from '@/db/schema'
import { envoyerEmailRappel, envoyerWhatsAppRappel } from '@/lib/email/brevo'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vérifier le secret d'autorisation
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const expectedSecret = `Bearer ${cronSecret}`

  if (!cronSecret || authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const today = new Date()
  // Les timestamps sont lus en ISO (voir src/db/schema.ts) : la comparaison de chaînes
  // ci-dessous (date_envoi <= todayIso) reste donc valide.
  const todayIso = today.toISOString()

  let traites = 0
  let erreurs = 0

  try {
    // Récupérer les messages en attente avec les données associées
    let messages
    try {
      messages = await db.query.messages_planifies.findMany({
        columns: {
          id: true,
          type_planification: true,
          date_envoi: true,
          jours_apres_formation: true,
          formation_id: true,
          topic_id: true,
          video_id: true,
        },
        with: {
          formations: { columns: { nom: true, date_formation: true } },
          topics: { columns: { titre: true } },
          videos: { columns: { titre: true, vimeo_id: true } },
        },
        where: eq(messages_planifies.statut, 'en_attente'),
      })
    } catch (messagesError) {
      console.error('Erreur récupération messages:', messagesError)
      return NextResponse.json({ error: 'Erreur base de données.' }, { status: 500 })
    }

    if (messages.length === 0) {
      return NextResponse.json({ traites: 0, erreurs: 0, message: 'Aucun message à traiter.' })
    }

    for (const message of messages) {
      const formation = message.formations
      const topic = message.topics
      const video = message.videos

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
      // Exclure les destinataires désabonnés (sinon le lien « Ne plus recevoir »
      // des emails est sans effet sur les relances automatiques).
      let envois
      try {
        envois = await db.query.envois_participants.findMany({
          columns: { id: true, token: true, reporter_a: true },
          with: {
            participants: {
              columns: {
                prenom: true,
                nom: true,
                email: true,
                telephone: true,
                canal_email: true,
                canal_whatsapp: true,
              },
            },
          },
          where: and(
            eq(envois_participants.message_id, message.id),
            eq(envois_participants.statut, 'en_attente'),
            ne(envois_participants.desabonne, true)
          ),
        })
      } catch (envoisError) {
        console.error(`Erreur récupération envois pour message ${message.id}:`, envoisError)
        erreurs++
        continue
      }

      if (envois.length === 0) {
        // Aucun envoi à faire, marquer le message comme envoyé
        await db
          .update(messages_planifies)
          .set({ statut: 'envoye' })
          .where(eq(messages_planifies.id, message.id))
        continue
      }

      // Séparer les envois dûs des envois reportés par le destinataire.
      // Un envoi reporté reste « en_attente » jusqu'à sa nouvelle date.
      const estReporte = (e: { reporter_a: string | null }) =>
        Boolean(e.reporter_a && new Date(e.reporter_a) > today)
      const envoisDus = envois.filter((e) => !estReporte(e))
      const envoisReportes = envois.filter((e) => estReporte(e))

      let messageErreur = false

      for (const envoi of envoisDus) {
        const participant = envoi.participants

        if (!participant) {
          console.warn(`Envoi ${envoi.id}: participant manquant, ignoré.`)
          erreurs++
          messageErreur = true
          continue
        }

        let envoiOk = false

        // Envoi email — sauf si le participant a désactivé le canal email
        if (participant.canal_email !== false) {
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
            envoiOk = true
          } catch (emailErr) {
            console.error(`Erreur envoi email pour envoi ${envoi.id}:`, emailErr)
          }
        }

        // Envoi WhatsApp (indépendant — n'empêche pas l'email)
        if (participant.canal_whatsapp && participant.telephone &&
            process.env.BREVO_WHATSAPP_SENDER && process.env.BREVO_WHATSAPP_TEMPLATE_ID) {
          try {
            await envoyerWhatsAppRappel({
              destinataire: {
                prenom: participant.prenom,
                nom: participant.nom,
                telephone: participant.telephone,
              },
              formation: { nom: formation.nom },
              topic: { titre: topic.titre },
              video: { titre: video.titre },
              token: envoi.token,
            })
            envoiOk = true
          } catch (waErr) {
            console.error(`Erreur envoi WhatsApp pour envoi ${envoi.id}:`, waErr)
          }
        }

        if (envoiOk) {
          await db
            .update(envois_participants)
            .set({
              statut: 'envoye',
              envoye_le: new Date().toISOString(),
            })
            .where(eq(envois_participants.id, envoi.id))
          traites++
        } else {
          await db
            .update(envois_participants)
            .set({ statut: 'erreur' })
            .where(eq(envois_participants.id, envoi.id))
          erreurs++
          messageErreur = true
        }
      }

      // Mettre à jour le statut du message.
      // Tant que des envois sont reportés, le message reste « en_attente »
      // pour être repris lors d'un prochain passage du cron.
      const resterEnAttente = envoisReportes.length > 0
      await db
        .update(messages_planifies)
        .set({
          statut: resterEnAttente ? 'en_attente' : messageErreur ? 'erreur' : 'envoye',
        })
        .where(eq(messages_planifies.id, message.id))
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
