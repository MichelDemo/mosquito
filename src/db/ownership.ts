import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { formations } from '@/db/schema'

// Sous Supabase, une partie des routes s'appuyait sur les politiques RLS pour limiter un
// formateur à ses propres formations. Postgres n'a plus cette couche : on vérifie ici.

/** Sous-requête : id des formations du formateur (utilisable dans inArray). */
export function formationsDuFormateur(formateurId: string) {
  return db.select({ id: formations.id }).from(formations).where(eq(formations.formateur_id, formateurId))
}

export async function formationAppartientA(formationId: string, formateurId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: formations.id })
    .from(formations)
    .where(and(eq(formations.id, formationId), eq(formations.formateur_id, formateurId)))
    .limit(1)
  return Boolean(row)
}
