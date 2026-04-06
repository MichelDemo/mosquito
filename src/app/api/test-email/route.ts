import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')

  if (!to) {
    return NextResponse.json({ error: 'Paramètre ?to=email manquant' }, { status: 400 })
  }

  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SENDER_EMAIL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey || apiKey === 'a_remplir') {
    return NextResponse.json({ error: 'BREVO_API_KEY non configurée' }, { status: 500 })
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Mosquito', email: sender },
      to: [{ email: to }],
      subject: '✅ Test Brevo — Mosquito fonctionne',
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <h2 style="color:#2563eb">Brevo est configuré ✅</h2>
          <p>Cet email confirme que l'envoi automatique fonctionne.</p>
          <p style="color:#6b7280;font-size:0.875rem">
            Expéditeur : ${sender}<br>
            App : ${appUrl}
          </p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: 'Erreur Brevo', details: err }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: `Email envoyé à ${to}` })
}
