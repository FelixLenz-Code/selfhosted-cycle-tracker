CREATE TYPE "public"."orgasm_result" AS ENUM('none', 'yes', 'ruined');--> statement-breakpoint
CREATE TABLE "sex_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "sex_type" NOT NULL,
	"orgasm" "orgasm_result" DEFAULT 'none' NOT NULL,
	CONSTRAINT "sex_participants_entry_user_unique" UNIQUE("entry_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "sex_participants" ADD CONSTRAINT "sex_participants_entry_id_sex_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."sex_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sex_participants" ADD CONSTRAINT "sex_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Bestandsdaten übernehmen: bisher hatte ein Eintrag genau eine Art und keine
-- Beteiligten. Die Art wandert auf die Person, zu der der Eintrag gehört; der
-- Orgasmus ist für Altdaten unbekannt und bleibt auf 'none'.
INSERT INTO "sex_participants" ("entry_id", "user_id", "type", "orgasm")
SELECT "id", "owner_id", "type", 'none' FROM "sex_entries";--> statement-breakpoint
ALTER TABLE "sex_entries" DROP COLUMN "type";