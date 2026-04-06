export interface SendRappelWhatsAppParams {
  destinataire: { prenom: string; nom: string; telephone: string }
  formation: { nom: string }
  topic: { titre: string }
  video: { titre: string }
  token: string
}

export async function envoyerWhatsAppRappel(params: SendRappelWhatsAppParams): Promise<void> {
  const { destinataire, formation, topic, token } = params

  const apiKey = process.env.BREVO_API_KEY
  const senderNumber = process.env.BREVO_WHATSAPP_SENDER
  const templateId = process.env.BREVO_WHATSAPP_TEMPLATE_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey) throw new Error('BREVO_API_KEY non configurée.')
  if (!senderNumber) throw new Error('BREVO_WHATSAPP_SENDER non configurée.')
  if (!templateId) throw new Error('BREVO_WHATSAPP_TEMPLATE_ID non configurée.')
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL non configurée.')

  const videoUrl = `${appUrl}/v/${token}`

  // Normaliser le numéro : retirer espaces/tirets, remplacer 0 initial par 33
  let phone = destinataire.telephone.replace(/[\s\-\.]/g, '')
  if (phone.startsWith('+')) phone = phone.slice(1)
  if (phone.startsWith('0')) phone = '33' + phone.slice(1)

  const response = await fetch('https://api.brevo.com/v3/whatsapp/sendMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      senderNumber,
      contactNumber: phone,
      templateId: parseInt(templateId, 10),
      messageVars: [
        destinataire.prenom,
        formation.nom,
        topic.titre,
        videoUrl,
      ],
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Erreur Brevo WhatsApp (${response.status}): ${JSON.stringify(errorData)}`)
  }
}

export interface SendAutoEvalEmailParams {
  destinataire: { prenom: string; nom: string; email: string }
  formation: { nom: string }
  token: string
  numeroEval: number
}

export async function envoyerEmailAutoEval(params: SendAutoEvalEmailParams): Promise<void> {
  const { destinataire, formation, token, numeroEval } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const apiKey = process.env.BREVO_API_KEY

  if (!apiKey) throw new Error('BREVO_API_KEY non configurée.')
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL non configurée.')

  const evalUrl = `${appUrl}/eval/${token}`
  const subject = `Auto-évaluation #${numeroEval} — ${formation.nom}`

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2563eb;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#bfdbfe;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                Auto-évaluation #${numeroEval}
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">
                ${formation.nom}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                Bonjour <strong>${destinataire.prenom}</strong>,
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                Il est temps de faire le point sur vos acquis dans le cadre de la formation
                <strong style="color:#374151;">${formation.nom}</strong>.<br /><br />
                Répondez à quelques affirmations pour mesurer votre progression.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${evalUrl}"
                      style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;">
                      Commencer l'auto-évaluation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                Ce message vous a été envoyé dans le cadre de votre formation.<br />
                Mosquito — La piqûre de rappel qui ne s'oublie pas.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: {
        name: 'Mosquito',
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@rappels-formation.fr',
      },
      to: [{ email: destinataire.email, name: destinataire.prenom }],
      subject,
      htmlContent,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Erreur Brevo auto-eval (${response.status}): ${JSON.stringify(errorData)}`)
  }
}

export interface SendRappelEmailParams {
  destinataire: { prenom: string; nom: string; email: string }
  formation: { nom: string }
  topic: { titre: string }
  video: { titre: string }
  token: string
  dateEnvoi: Date
}

export async function envoyerEmailRappel(params: SendRappelEmailParams): Promise<void> {
  const { destinataire, formation, topic, video, token } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const apiKey = process.env.BREVO_API_KEY

  if (!apiKey) {
    throw new Error('BREVO_API_KEY non configurée.')
  }
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL non configurée.')
  }

  const videoUrl = `${appUrl}/v/${token}`

  const subject = `Votre piqûre de rappel : ${topic.titre} - ${formation.nom}`

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- En-tête -->
          <tr>
            <td style="background-color:#2563eb;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#bfdbfe;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                Piqûre de rappel
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">
                ${formation.nom}
              </h1>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                Bonjour <strong>${destinataire.prenom}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
                Voici votre message de rappel pour la formation
                <strong style="color:#374151;">${formation.nom}</strong>.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                Une vidéo sur le thème <strong style="color:#374151;">${topic.titre}</strong>
                est disponible pour vous aider à consolider vos apprentissages :
                <em>${video.titre}</em>.
              </p>

              <!-- Bouton CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a
                      href="${videoUrl}"
                      style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;"
                    >
                      Voir la vidéo
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Note quiz -->
              <p style="margin:32px 0 0;font-size:14px;color:#9ca3af;line-height:1.6;text-align:center;">
                Un quiz de compréhension vous attend sur la page vidéo.<br />
                Testez vos connaissances en quelques minutes !
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                Ce message vous a été envoyé dans le cadre de votre formation.<br />
                <a href="${appUrl}/desabonner/${token}" style="color:#9ca3af;text-decoration:underline;">
                  Ne plus recevoir les prochaines piqûres de rappel
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: 'Mosquito',
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@rappels-formation.fr',
      },
      to: [
        {
          email: destinataire.email,
          name: destinataire.prenom,
        },
      ],
      subject,
      htmlContent,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Erreur Brevo (${response.status}): ${JSON.stringify(errorData)}`
    )
  }
}
