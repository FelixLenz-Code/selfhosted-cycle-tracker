ALTER TABLE "medications" ADD COLUMN "weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tracks_cycle" boolean DEFAULT true NOT NULL;