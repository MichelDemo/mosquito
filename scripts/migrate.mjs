// Applique les migrations Drizzle (dossier drizzle/) avant le démarrage de l'app.
// Lancé par `npm run start` : chaque déploiement met le schéma à jour, plus de SQL
// à coller à la main dans un tableau de bord.
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('migrate: DATABASE_URL manquant')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
try {
  await migrate(drizzle(pool), { migrationsFolder: new URL('../drizzle', import.meta.url).pathname })
  console.log('migrate: schéma à jour')
} finally {
  await pool.end()
}
