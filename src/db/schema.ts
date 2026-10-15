import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

// Schéma repris à l'identique de l'ancienne base Supabase (contraintes mesurées sur la base
// de production : FK toutes en ON DELETE CASCADE, CHECK et UNIQUE ci-dessous). Les noms de
// propriétés gardent le snake_case des colonnes pour que le code lise les mêmes champs.

// timestamptz renvoyé en chaîne ISO (comme le faisait Supabase) plutôt qu'au format texte
// natif de Postgres, pour que le code existant reçoive exactement les mêmes valeurs.
const timestamptz = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'timestamp with time zone'
  },
  fromDriver(value) {
    return new Date(value).toISOString()
  },
})

const now = sql`now()`

/** Remplace auth.users de Supabase : mêmes id, pour que formations.formateur_id reste valide. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  // NULL tant que le mot de passe n'a pas été défini (scripts/set-password.mjs).
  password_hash: text('password_hash'),
  created_at: timestamptz('created_at').notNull().default(now),
})

export const formations = pgTable(
  'formations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nom: text('nom').notNull(),
    description: text('description'),
    formateur_id: uuid('formateur_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    statut: text('statut').notNull().default('brouillon'),
    date_formation: date('date_formation', { mode: 'string' }),
    created_at: timestamptz('created_at').notNull().default(now),
    updated_at: timestamptz('updated_at').notNull().default(now),
  },
  (t) => [
    check('formations_statut_check', sql`${t.statut} in ('brouillon', 'active', 'terminee')`),
    index('formations_formateur_id_idx').on(t.formateur_id),
  ]
)

export const topics = pgTable('topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  titre: text('titre').notNull(),
  description: text('description'),
  created_at: timestamptz('created_at').notNull().default(now),
  updated_at: timestamptz('updated_at').notNull().default(now),
})

export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topic_id: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    titre: text('titre').notNull(),
    vimeo_id: text('vimeo_id'),
    duree_secondes: integer('duree_secondes'),
    ordre: integer('ordre').notNull(),
    created_at: timestamptz('created_at').notNull().default(now),
    storage_path: text('storage_path'),
  },
  (t) => [
    check('videos_ordre_check', sql`${t.ordre} between 1 and 3`),
    unique('videos_topic_id_ordre_key').on(t.topic_id, t.ordre),
  ]
)

export const participants = pgTable(
  'participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formation_id: uuid('formation_id')
      .notNull()
      .references(() => formations.id, { onDelete: 'cascade' }),
    prenom: text('prenom').notNull(),
    nom: text('nom').notNull(),
    email: text('email').notNull(),
    telephone: text('telephone'),
    created_at: timestamptz('created_at').notNull().default(now),
    canal_email: boolean('canal_email').notNull().default(true),
    canal_whatsapp: boolean('canal_whatsapp').notNull().default(false),
  },
  (t) => [index('participants_formation_id_idx').on(t.formation_id)]
)

export const formation_topics = pgTable(
  'formation_topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formation_id: uuid('formation_id')
      .notNull()
      .references(() => formations.id, { onDelete: 'cascade' }),
    topic_id: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    ordre: integer('ordre').notNull(),
  },
  (t) => [unique('formation_topics_formation_id_topic_id_key').on(t.formation_id, t.topic_id)]
)

export const messages_planifies = pgTable(
  'messages_planifies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formation_id: uuid('formation_id')
      .notNull()
      .references(() => formations.id, { onDelete: 'cascade' }),
    topic_id: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    video_id: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }),
    numero_ordre: integer('numero_ordre').notNull(),
    type_planification: text('type_planification').notNull(),
    date_envoi: timestamptz('date_envoi'),
    jours_apres_formation: integer('jours_apres_formation'),
    statut: text('statut').notNull().default('en_attente'),
    created_at: timestamptz('created_at').notNull().default(now),
    relance_numero: integer('relance_numero').default(1),
  },
  (t) => [
    check('messages_planifies_numero_ordre_check', sql`${t.numero_ordre} > 0`),
    check(
      'messages_planifies_type_planification_check',
      sql`${t.type_planification} in ('date_fixe', 'delai_relatif')`
    ),
    check('messages_planifies_statut_check', sql`${t.statut} in ('en_attente', 'envoye', 'erreur')`),
    check('messages_planifies_relance_numero_check', sql`${t.relance_numero} between 1 and 3`),
    index('messages_planifies_formation_id_idx').on(t.formation_id),
  ]
)

export const envois_participants = pgTable(
  'envois_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    message_id: uuid('message_id')
      .notNull()
      .references(() => messages_planifies.id, { onDelete: 'cascade' }),
    participant_id: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    token: uuid('token').notNull().defaultRandom().unique(),
    envoye_le: timestamptz('envoye_le'),
    ouvert_le: timestamptz('ouvert_le'),
    quiz_complete: boolean('quiz_complete').notNull().default(false),
    statut: text('statut').notNull().default('en_attente'),
    created_at: timestamptz('created_at').notNull().default(now),
    desabonne: boolean('desabonne').default(false),
    // Si renseigné et dans le futur, le cron n'envoie pas cet envoi avant cette date.
    reporter_a: timestamptz('reporter_a'),
  },
  (t) => [
    check('envois_participants_statut_check', sql`${t.statut} in ('en_attente', 'envoye', 'erreur')`),
    index('envois_participants_message_id_idx').on(t.message_id),
    index('envois_participants_participant_id_idx').on(t.participant_id),
  ]
)

export const quiz_questions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topic_id: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    options: jsonb('options').$type<string[]>().notNull(),
    bonne_reponse: integer('bonne_reponse').notNull(),
    explication: text('explication'),
    created_at: timestamptz('created_at').notNull().default(now),
    feedback_correct: text('feedback_correct'),
    feedback_incorrect: text('feedback_incorrect'),
  },
  (t) => [check('quiz_questions_bonne_reponse_check', sql`${t.bonne_reponse} between 0 and 3`)]
)

export const quiz_reponses = pgTable(
  'quiz_reponses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    envoi_id: uuid('envoi_id')
      .notNull()
      .references(() => envois_participants.id, { onDelete: 'cascade' }),
    question_id: uuid('question_id')
      .notNull()
      .references(() => quiz_questions.id, { onDelete: 'cascade' }),
    reponse_choisie: integer('reponse_choisie').notNull(),
    est_correcte: boolean('est_correcte').notNull(),
    repondu_le: timestamptz('repondu_le').notNull().default(now),
  },
  (t) => [unique('quiz_reponses_envoi_id_question_id_key').on(t.envoi_id, t.question_id)]
)

export const auto_eval_criteres = pgTable('auto_eval_criteres', {
  id: uuid('id').primaryKey().defaultRandom(),
  affirmation: text('affirmation').notNull(),
  ordre: integer('ordre').notNull().default(0),
  actif: boolean('actif').notNull().default(true),
  created_at: timestamptz('created_at').default(now),
  categorie: text('categorie'),
})

export const auto_evaluations = pgTable(
  'auto_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participant_id: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    formation_id: uuid('formation_id')
      .notNull()
      .references(() => formations.id, { onDelete: 'cascade' }),
    token: uuid('token').notNull().defaultRandom().unique(),
    prochaine_eval_at: timestamptz('prochaine_eval_at'),
    completee_le: timestamptz('completee_le'),
    created_at: timestamptz('created_at').default(now),
  },
  (t) => [index('auto_evaluations_formation_id_idx').on(t.formation_id)]
)

export const auto_eval_reponses = pgTable(
  'auto_eval_reponses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    evaluation_id: uuid('evaluation_id')
      .notNull()
      .references(() => auto_evaluations.id, { onDelete: 'cascade' }),
    critere_id: uuid('critere_id')
      .notNull()
      .references(() => auto_eval_criteres.id, { onDelete: 'cascade' }),
    reponse: boolean('reponse').notNull(),
    created_at: timestamptz('created_at').default(now),
  },
  (t) => [
    unique('auto_eval_reponses_evaluation_id_critere_id_key').on(t.evaluation_id, t.critere_id),
  ]
)

// Relations nommées comme les tables, pour que les jointures gardent la forme des
// « embedded selects » Supabase (ex. participant.formations.formateur_id).
export const formationsRelations = relations(formations, ({ one, many }) => ({
  users: one(users, { fields: [formations.formateur_id], references: [users.id] }),
  participants: many(participants),
  formation_topics: many(formation_topics),
  messages_planifies: many(messages_planifies),
  auto_evaluations: many(auto_evaluations),
}))

export const topicsRelations = relations(topics, ({ many }) => ({
  videos: many(videos),
  quiz_questions: many(quiz_questions),
  formation_topics: many(formation_topics),
  messages_planifies: many(messages_planifies),
}))

export const videosRelations = relations(videos, ({ one, many }) => ({
  topics: one(topics, { fields: [videos.topic_id], references: [topics.id] }),
  messages_planifies: many(messages_planifies),
}))

export const participantsRelations = relations(participants, ({ one, many }) => ({
  formations: one(formations, { fields: [participants.formation_id], references: [formations.id] }),
  envois_participants: many(envois_participants),
  auto_evaluations: many(auto_evaluations),
}))

export const formationTopicsRelations = relations(formation_topics, ({ one }) => ({
  formations: one(formations, { fields: [formation_topics.formation_id], references: [formations.id] }),
  topics: one(topics, { fields: [formation_topics.topic_id], references: [topics.id] }),
}))

export const messagesPlanifiesRelations = relations(messages_planifies, ({ one, many }) => ({
  formations: one(formations, { fields: [messages_planifies.formation_id], references: [formations.id] }),
  topics: one(topics, { fields: [messages_planifies.topic_id], references: [topics.id] }),
  videos: one(videos, { fields: [messages_planifies.video_id], references: [videos.id] }),
  envois_participants: many(envois_participants),
}))

export const envoisParticipantsRelations = relations(envois_participants, ({ one, many }) => ({
  messages_planifies: one(messages_planifies, {
    fields: [envois_participants.message_id],
    references: [messages_planifies.id],
  }),
  participants: one(participants, {
    fields: [envois_participants.participant_id],
    references: [participants.id],
  }),
  quiz_reponses: many(quiz_reponses),
}))

export const quizQuestionsRelations = relations(quiz_questions, ({ one, many }) => ({
  topics: one(topics, { fields: [quiz_questions.topic_id], references: [topics.id] }),
  quiz_reponses: many(quiz_reponses),
}))

export const quizReponsesRelations = relations(quiz_reponses, ({ one }) => ({
  envois_participants: one(envois_participants, {
    fields: [quiz_reponses.envoi_id],
    references: [envois_participants.id],
  }),
  quiz_questions: one(quiz_questions, { fields: [quiz_reponses.question_id], references: [quiz_questions.id] }),
}))

export const autoEvalCriteresRelations = relations(auto_eval_criteres, ({ many }) => ({
  auto_eval_reponses: many(auto_eval_reponses),
}))

export const autoEvaluationsRelations = relations(auto_evaluations, ({ one, many }) => ({
  participants: one(participants, {
    fields: [auto_evaluations.participant_id],
    references: [participants.id],
  }),
  formations: one(formations, { fields: [auto_evaluations.formation_id], references: [formations.id] }),
  auto_eval_reponses: many(auto_eval_reponses),
}))

export const autoEvalReponsesRelations = relations(auto_eval_reponses, ({ one }) => ({
  auto_evaluations: one(auto_evaluations, {
    fields: [auto_eval_reponses.evaluation_id],
    references: [auto_evaluations.id],
  }),
  auto_eval_criteres: one(auto_eval_criteres, {
    fields: [auto_eval_reponses.critere_id],
    references: [auto_eval_criteres.id],
  }),
}))
