CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"registration_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Genau eine globale Einstellungszeile sicherstellen.
INSERT INTO "app_settings" ("id") VALUES ('global') ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
-- Bestehende Installationen: den zuerst registrierten Nutzer zum Admin machen.
UPDATE "users" SET "is_admin" = true
WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1);