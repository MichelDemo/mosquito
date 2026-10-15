'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { topics } from '@/db/schema'
import { getUser } from '@/lib/auth/session'
import { isUuid } from '@/lib/uuid'

export async function supprimerTopic(topicId: string) {
  const user = await getUser()
  if (!user) throw new Error('Non authentifié')

  try {
    if (isUuid(topicId)) await db.delete(topics).where(eq(topics.id, topicId))
  } catch (err) {
    throw new Error(`Erreur suppression: ${err instanceof Error ? err.message : String(err)}`)
  }

  revalidatePath('/bibliotheque')
}
