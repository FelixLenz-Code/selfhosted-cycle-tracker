ALTER TABLE "partner_links" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "partner_links" ADD CONSTRAINT "partner_links_invite_code_unique" UNIQUE("invite_code");--> statement-breakpoint
-- Bestehende offene Einladungen bekommen einen Code, damit sie nach dem Wegfall
-- der Zuordnung per (unbestätigter) E-Mail-Adresse weiter annehmbar bleiben.
UPDATE "partner_links"
SET "invite_code" = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
WHERE "status" = 'pending' AND "invite_code" IS NULL;
