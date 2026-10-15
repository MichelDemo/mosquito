// Définit le mot de passe d'un compte formateur.
//
//   npm run set-password -- prenom@exemple.com
//
// En production : railway ssh --service mosquito -- npm run set-password -- prenom@exemple.com
// Le mot de passe est demandé sans être affiché (ou lu depuis NEW_PASSWORD, pour l'automatisation).
import bcrypt from 'bcryptjs'
import pg from 'pg'
import readline from 'node:readline'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Usage : npm run set-password -- adresse@email')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant')
  process.exit(1)
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Masque la saisie : on n'écrit que la question, pas les caractères tapés.
    rl._writeToOutput = (s) => {
      if (s.startsWith(question)) rl.output.write(question)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

let password = process.env.NEW_PASSWORD
if (!password) {
  password = await askHidden('Nouveau mot de passe : ')
  const confirmation = await askHidden('Confirmer : ')
  if (password !== confirmation) {
    console.error('Les deux saisies ne correspondent pas.')
    process.exit(1)
  }
}
if (password.length < 10) {
  console.error('Le mot de passe doit contenir au moins 10 caractères.')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const { rowCount } = await client.query('update users set password_hash = $1 where lower(email) = $2', [
    await bcrypt.hash(password, 12),
    email,
  ])
  if (rowCount === 0) {
    console.error(`Aucun compte pour ${email}.`)
    process.exitCode = 1
  } else {
    console.log(`Mot de passe défini pour ${email}.`)
  }
} finally {
  await client.end()
}
