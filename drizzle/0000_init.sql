CREATE TABLE "auto_eval_criteres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affirmation" text NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"categorie" text
);
--> statement-breakpoint
CREATE TABLE "auto_eval_reponses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"critere_id" uuid NOT NULL,
	"reponse" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "auto_eval_reponses_evaluation_id_critere_id_key" UNIQUE("evaluation_id","critere_id")
);
--> statement-breakpoint
CREATE TABLE "auto_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"formation_id" uuid NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"prochaine_eval_at" timestamp with time zone,
	"completee_le" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "auto_evaluations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "envois_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"envoye_le" timestamp with time zone,
	"ouvert_le" timestamp with time zone,
	"quiz_complete" boolean DEFAULT false NOT NULL,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"desabonne" boolean DEFAULT false,
	"reporter_a" timestamp with time zone,
	CONSTRAINT "envois_participants_token_unique" UNIQUE("token"),
	CONSTRAINT "envois_participants_statut_check" CHECK ("envois_participants"."statut" in ('en_attente', 'envoye', 'erreur'))
);
--> statement-breakpoint
CREATE TABLE "formation_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formation_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"ordre" integer NOT NULL,
	CONSTRAINT "formation_topics_formation_id_topic_id_key" UNIQUE("formation_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "formations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"description" text,
	"formateur_id" uuid NOT NULL,
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"date_formation" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formations_statut_check" CHECK ("formations"."statut" in ('brouillon', 'active', 'terminee'))
);
--> statement-breakpoint
CREATE TABLE "messages_planifies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formation_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"video_id" uuid,
	"numero_ordre" integer NOT NULL,
	"type_planification" text NOT NULL,
	"date_envoi" timestamp with time zone,
	"jours_apres_formation" integer,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"relance_numero" integer DEFAULT 1,
	CONSTRAINT "messages_planifies_numero_ordre_check" CHECK ("messages_planifies"."numero_ordre" > 0),
	CONSTRAINT "messages_planifies_type_planification_check" CHECK ("messages_planifies"."type_planification" in ('date_fixe', 'delai_relatif')),
	CONSTRAINT "messages_planifies_statut_check" CHECK ("messages_planifies"."statut" in ('en_attente', 'envoye', 'erreur')),
	CONSTRAINT "messages_planifies_relance_numero_check" CHECK ("messages_planifies"."relance_numero" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formation_id" uuid NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"email" text NOT NULL,
	"telephone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canal_email" boolean DEFAULT true NOT NULL,
	"canal_whatsapp" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"bonne_reponse" integer NOT NULL,
	"explication" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"feedback_correct" text,
	"feedback_incorrect" text,
	CONSTRAINT "quiz_questions_bonne_reponse_check" CHECK ("quiz_questions"."bonne_reponse" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "quiz_reponses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"envoi_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"reponse_choisie" integer NOT NULL,
	"est_correcte" boolean NOT NULL,
	"repondu_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_reponses_envoi_id_question_id_key" UNIQUE("envoi_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titre" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"titre" text NOT NULL,
	"vimeo_id" text,
	"duree_secondes" integer,
	"ordre" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"storage_path" text,
	CONSTRAINT "videos_topic_id_ordre_key" UNIQUE("topic_id","ordre"),
	CONSTRAINT "videos_ordre_check" CHECK ("videos"."ordre" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "auto_eval_reponses" ADD CONSTRAINT "auto_eval_reponses_evaluation_id_auto_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."auto_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_eval_reponses" ADD CONSTRAINT "auto_eval_reponses_critere_id_auto_eval_criteres_id_fk" FOREIGN KEY ("critere_id") REFERENCES "public"."auto_eval_criteres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_evaluations" ADD CONSTRAINT "auto_evaluations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_evaluations" ADD CONSTRAINT "auto_evaluations_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envois_participants" ADD CONSTRAINT "envois_participants_message_id_messages_planifies_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages_planifies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envois_participants" ADD CONSTRAINT "envois_participants_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_topics" ADD CONSTRAINT "formation_topics_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_topics" ADD CONSTRAINT "formation_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formations" ADD CONSTRAINT "formations_formateur_id_users_id_fk" FOREIGN KEY ("formateur_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages_planifies" ADD CONSTRAINT "messages_planifies_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages_planifies" ADD CONSTRAINT "messages_planifies_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages_planifies" ADD CONSTRAINT "messages_planifies_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_reponses" ADD CONSTRAINT "quiz_reponses_envoi_id_envois_participants_id_fk" FOREIGN KEY ("envoi_id") REFERENCES "public"."envois_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_reponses" ADD CONSTRAINT "quiz_reponses_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auto_evaluations_formation_id_idx" ON "auto_evaluations" USING btree ("formation_id");--> statement-breakpoint
CREATE INDEX "envois_participants_message_id_idx" ON "envois_participants" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "envois_participants_participant_id_idx" ON "envois_participants" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "formations_formateur_id_idx" ON "formations" USING btree ("formateur_id");--> statement-breakpoint
CREATE INDEX "messages_planifies_formation_id_idx" ON "messages_planifies" USING btree ("formation_id");--> statement-breakpoint
CREATE INDEX "participants_formation_id_idx" ON "participants" USING btree ("formation_id");