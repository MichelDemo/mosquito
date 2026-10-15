import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { topics } from '@/db/schema'
import { getUser } from '@/lib/auth/session'

// Lit la base à chaque appel : jamais de mise en cache statique de la réponse.
export const dynamic = 'force-dynamic'

// GET — bibliothèque de topics avec leurs vidéos (assistant de création de formation)
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const data = await db.query.topics.findMany({
      columns: { id: true, titre: true },
      with: { videos: { columns: { id: true, titre: true, ordre: true } } },
      orderBy: asc(topics.titre),
    })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Erreur lecture topics:', err)
    return NextResponse.json({ error: 'Erreur lors de la récupération des topics' }, { status: 500 })
  }
}
