// Copie les vidéos référencées par la table `videos` du bucket Supabase vers le bucket
// Railway (outil de migration, à supprimer une fois Supabase décommissionné).
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… DATABASE_URL=… S3_*=… node scripts/copy-videos-from-supabase.mjs
//
// Mêmes chemins des deux côtés ; chaque fichier est relu après envoi et comparé (SHA-256).
// Les fichiers déjà présents et identiques sont ignorés : le script peut être relancé.
import { createHash } from 'node:crypto'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import pg from 'pg'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, S3_BUCKET } = process.env
const auth = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
})
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

const db = new pg.Client({ connectionString: DATABASE_URL })
await db.connect()
const { rows } = await db.query('select titre, storage_path from videos where storage_path is not null order by titre')
await db.end()

let failed = 0
for (const { titre, storage_path: path } of rows) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/videos/${path}`, { headers: auth })
  if (!res.ok) {
    console.error(`✗ ${titre}: lecture Supabase HTTP ${res.status}`)
    failed++
    continue
  }
  const contentType = res.headers.get('content-type') ?? 'video/mp4'
  const source = Buffer.from(await res.arrayBuffer())
  const hash = sha256(source)

  const existing = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: path })).catch(() => null)
  if (existing?.ContentLength === source.length && existing.Metadata?.sha256 === hash) {
    console.log(`= ${titre} (${(source.length / 1e6).toFixed(1)} Mo) déjà copiée`)
    continue
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: path,
      Body: source,
      ContentType: contentType,
      CacheControl: 'max-age=3600',
      Metadata: { sha256: hash },
    })
  )
  const copy = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: path }))
  const copied = Buffer.from(await copy.Body.transformToByteArray())
  const ok = sha256(copied) === hash && copy.ContentType === contentType
  console.log(`${ok ? '✓' : '✗'} ${titre} (${(source.length / 1e6).toFixed(1)} Mo, ${contentType})`)
  if (!ok) failed++
}

if (failed) {
  console.error(`${failed} vidéo(s) en échec`)
  process.exitCode = 1
} else {
  console.log(`${rows.length} vidéo(s) présentes et vérifiées dans le bucket.`)
}
