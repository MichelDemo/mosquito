import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const supabase = createAdminSupabaseClient()

  // Récupérer l'envoi
  const { data: envoi, error: envoiError } = await supabase
    .from('envois_participants')
    .select('message_id, statut, desabonne')
    .eq('token', token)
    .single()

  if (envoiError || !envoi) {
    console.error('video/token: envoi introuvable', envoiError)
    return NextResponse.json({ error: 'Lien invalide.' }, { status: 404 })
  }

  // Récupérer le message → video_id
  const { data: msg, error: msgError } = await supabase
    .from('messages_planifies')
    .select('video_id')
    .eq('id', envoi.message_id)
    .single()

  if (msgError || !msg) {
    console.error('video/token: message introuvable', msgError)
    return NextResponse.json({ error: 'Vidéo introuvable.' }, { status: 404 })
  }

  // Récupérer le storage_path
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('storage_path, vimeo_id')
    .eq('id', msg.video_id)
    .single()

  if (videoError || !video) {
    console.error('video/token: video introuvable', videoError)
    return NextResponse.json({ error: 'Vidéo introuvable.' }, { status: 404 })
  }

  if (!video.storage_path) {
    console.error('video/token: storage_path est null pour video_id', msg.video_id)
    return NextResponse.json({ error: 'Pas de fichier vidéo.' }, { status: 404 })
  }

  console.log('video/token: génération URL signée pour', video.storage_path)

  // Générer l'URL signée — 7 jours (même durée que la validité du lien email)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('videos')
    .createSignedUrl(video.storage_path, 7 * 24 * 3600)

  if (signedError || !signedData?.signedUrl) {
    console.error('video/token: createSignedUrl échoué', {
      storage_path: video.storage_path,
      error: signedError,
    })
    return NextResponse.json(
      { error: 'Impossible de générer le lien vidéo.', detail: signedError?.message },
      { status: 500 }
    )
  }

  console.log('video/token: redirection vers URL signée OK')

  // Redirection sans cache — URL fraîche à chaque accès
  return NextResponse.redirect(signedData.signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
