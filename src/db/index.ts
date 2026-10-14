import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Un seul pool par processus ; en dev, le rechargement à chaud réévalue ce module,
// on garde donc le pool sur globalThis pour ne pas ouvrir de connexions à chaque édition.
const globalForDb = globalThis as unknown as { mosquitoPool?: Pool }

const pool =
  globalForDb.mosquitoPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.mosquitoPool = pool

export const db = drizzle(pool, { schema })
export { schema }
