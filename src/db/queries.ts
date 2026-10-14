import { desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { db } from '@/db'
import { topics, videos } from '@/db/schema'

/** Topics avec leur nombre de vidéos, au format `videos: [{ count }]` hérité de Supabase. */
export async function topicsAvecNombreDeVideos() {
  const rows = await db
    .select({ ...getTableColumns(topics), count: sql<number>`count(${videos.id})::int` })
    .from(topics)
    .leftJoin(videos, eq(videos.topic_id, topics.id))
    .groupBy(topics.id)
    .orderBy(desc(topics.created_at))
  return rows.map(({ count, ...topic }) => ({ ...topic, videos: [{ count }] }))
}
