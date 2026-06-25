ALTER TABLE "cycle_settings" ADD COLUMN "window_start_day" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "cycle_settings" ADD COLUMN "window_end_day" integer DEFAULT 15;