// Copie unique des données Supabase → Postgres (outil de migration, à supprimer une fois
// Supabase décommissionné).
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… DATABASE_URL=… node scripts/migrate-from-supabase.mjs
//
// - Lit toutes les tables via l'API REST (clé service) + les comptes via l'API admin Auth.
// - Vide puis remplit la base cible dans UNE transaction, en conservant tous les id et tokens
//   (les liens déjà envoyés par e-mail doivent rester valides).
// - Vérifie ensuite ligne à ligne que le contenu est identique des deux côtés.
// Les mots de passe ne sont pas copiés (inaccessibles via l'API) : password_hash reste NULL.
import pg from 'pg'

// `date` lu tel quel ('2026-03-24') : par défaut pg en fait un Date en heure locale,
// ce qui décale d'un jour en Europe/Brussels (2026-03-23T23:00Z).
pg.types.setTypeParser(1082, (v) => v)

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et DATABASE_URL sont requis')
  process.exit(1)
}

// Ordre d'insertion compatible avec les clés étrangères.
const TABLES = [
  'topics',
  'auto_eval_criteres',
  'formations',
  'videos',
  'participants',
  'formation_topics',
  'messages_planifies',
  'envois_participants',
  'quiz_questions',
  'quiz_reponses',
  'auto_evaluations',
  'auto_eval_reponses',
]
const JSONB_COLUMNS = { quiz_questions: ['options'] }

const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }

async function fetchTable(table) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id`, {
      headers: { ...headers, Range: `${from}-${from + 999}` },
    })
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

async function fetchUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers })
  if (!res.ok) throw new Error(`auth users: HTTP ${res.status}`)
  const { users } = await res.json()
  return users.map((u) => ({ id: u.id, email: u.email.toLowerCase(), created_at: u.created_at }))
}

// Normalise une valeur pour la comparaison : timestamps en ISO, JSON trié par clés.
function norm(v) {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(v)) return new Date(v).toISOString()
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}
const canon = (rows) =>
  rows
    .map((r) => JSON.stringify(Object.fromEntries(Object.keys(r).sort().map((k) => [k, norm(r[k])]))))
    .sort()

console.log('Export Supabase…')
const data = { users: await fetchUsers() }
for (const t of TABLES) data[t] = await fetchTable(t)
for (const [t, rows] of Object.entries(data)) console.log(`  ${t.padEnd(22)} ${rows.length}`)

const client = new pg.Client({ connectionString: DATABASE_URL })
await client.connect()
try {
  await client.query('begin')
  // Préserve les comptes existants (et leur mot de passe) lors d'une re-synchronisation.
  const existing = await client.query('select id, password_hash from users')
  const hashes = new Map(existing.rows.map((r) => [r.id, r.password_hash]))
  await client.query(`truncate ${['users', ...TABLES].join(', ')} cascade`)

  for (const table of ['users', ...TABLES]) {
    for (const row of data[table]) {
      if (table === 'users') row.password_hash = hashes.get(row.id) ?? null
      const cols = Object.keys(row)
      const values = cols.map((c) => (JSONB_COLUMNS[table]?.includes(c) ? JSON.stringify(row[c]) : row[c]))
      await client.query(
        `insert into ${table} (${cols.map((c) => `"${c}"`).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
        values
      )
    }
  }

  // Vérification ligne à ligne, dans la transaction : en cas d'écart, rien n'est validé.
  console.log('Vérification…')
  let ok = true
  for (const table of ['users', ...TABLES]) {
    const cols = Object.keys(data[table][0] ?? {}).filter((c) => c !== 'password_hash')
    const src = data[table].map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])))
    const { rows } = cols.length
      ? await client.query(`select ${cols.map((c) => `"${c}"`).join(', ')} from ${table}`)
      : { rows: [] }
    const a = canon(src)
    const b = canon(rows)
    const same = a.length === b.length && a.every((x, i) => x === b[i])
    console.log(`  ${table.padEnd(22)} ${same ? 'identique' : 'ÉCART'} (${b.length} lignes)`)
    if (!same) {
      ok = false
      console.log('    source :', a.find((x) => !b.includes(x)))
      console.log('    cible  :', b.find((x) => !a.includes(x)))
    }
  }
  if (!ok) throw new Error('les données copiées diffèrent de la source — transaction annulée')
  await client.query('commit')
  console.log('Copie validée.')
} catch (err) {
  await client.query('rollback')
  console.error(err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
