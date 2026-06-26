ALTER TABLE "cycle_settings" ALTER COLUMN "window_start_day" SET DEFAULT 28;--> statement-breakpoint
ALTER TABLE "cycle_settings" ALTER COLUMN "window_end_day" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cycle_settings" ADD COLUMN "fertile_start_day" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "cycle_settings" ADD COLUMN "fertile_end_day" integer DEFAULT 16 NOT NULL;--> statement-breakpoint
-- Bestehende Kinderwunsch-Nutzer: ihr bisheriges Fenster war die fruchtbare Zeit.
-- Diese Werte ins neue fruchtbare Fenster übernehmen und das Spaß-Fenster auf
-- sinnvolle Defaults (ab Tag 28 bis zur nächsten Blutung) zurücksetzen.
UPDATE "cycle_settings"
SET "fertile_start_day" = "window_start_day",
    "fertile_end_day" = COALESCE("window_end_day", "window_start_day" + 4),
    "window_start_day" = 28,
    "window_end_day" = NULL
WHERE "mode" = 'ttc';