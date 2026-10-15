import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Vidéos stockées dans un bucket Railway (compatible S3). Les chemins (`videos.storage_path`)
// sont les mêmes que dans l'ancien bucket Supabase « videos ».

let client: S3Client | null = null

function s3() {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION ?? 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    })
  }
  return client
}

function bucket() {
  const name = process.env.S3_BUCKET
  if (!name) throw new Error('S3_BUCKET manquant')
  return name
}

/** URL de lecture temporaire (max 7 jours avec les signatures S3 v4). */
export function signedVideoUrl(path: string, expiresInSeconds: number): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: path }), {
    expiresIn: Math.min(expiresInSeconds, 7 * 24 * 3600),
  })
}

/**
 * URL d'envoi (PUT) valable 15 minutes. Type et taille font partie de la signature :
 * le navigateur ne peut envoyer que ce fichier-là, à ce chemin-là.
 */
export function signedUploadUrl(path: string, contentType: string, size: number): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucket(), Key: path, ContentType: contentType, ContentLength: size }),
    { expiresIn: 15 * 60 }
  )
}
