import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  integer,
  time,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// --- Enums ---
export const partnerStatus = pgEnum("partner_status", [
  "pending",
  "accepted",
  "revoked",
]);
export const cycleMode = pgEnum("cycle_mode", ["ttc", "avoid"]);
export const notifyAudience = pgEnum("notify_audience", [
  "owner",
  "partner",
  "both",
]);
export const medScheduleType = pgEnum("med_schedule_type", [
  "fixed_time",
  "cycle_relative",
]);
// Art des Sex-Eintrags: GV, Handarbeit, Vibrator/Toy
export const sexType = pgEnum("sex_type", ["intercourse", "manual", "toy"]);
// Orgasmus-Ergebnis je beteiligter Person
export const orgasmResult = pgEnum("orgasm_result", ["none", "yes", "ruined"]);
export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

// --- Users ---
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  // true = trackt eigenen Zyklus (menstruiert); false = begleitet jemanden (z. B. Partner)
  tracksCycle: boolean("tracks_cycle").notNull().default(true),
  // Admins verwalten Nutzer und die globale Registrierung.
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Globale App-Einstellungen (genau eine Zeile, id immer "global") ---
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("global"),
  // Steuert, ob sich neue Nutzer registrieren dürfen (vom Admin schaltbar).
  registrationEnabled: boolean("registration_enabled").notNull().default(true),
});

// --- Rate-Limiting (Login/Registrierung), Fixed-Window-Zähler je Schlüssel ---
export const rateLimitHits = pgTable("rate_limit_hits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Sessions (eigene, cookie-basierte Auth) ---
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // gehashter Session-Token
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Partner-Verknüpfung (Frau = owner, autorisiert Partner) ---
export const partnerLinks = pgTable("partner_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  // E-Mail des Eingeladenen – nur Merkhilfe für die einladende Person.
  // Bewusst KEIN Berechtigungsnachweis: E-Mail-Adressen sind nicht verifiziert.
  invitedEmail: text("invited_email"),
  // Geheimer Einlöse-Code für Einladungen an Personen ohne Konto. Wird von der
  // einladenden Person weitergegeben und ersetzt die frühere Zuordnung per
  // E-Mail-Adresse.
  inviteCode: text("invite_code").unique(),
  status: partnerStatus("status").notNull().default("pending"),
  canView: boolean("can_view").notNull().default(true),
  canEdit: boolean("can_edit").notNull().default(false),
  invitedAt: timestamp("invited_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

// --- Blutungsphasen ---
export const periodEntries = pgTable("period_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null = laufend
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Sex-Einträge (Tag + Uhrzeit) ---
// Wall-Clock-Werte: Datum und Uhrzeit werden genau so gespeichert, wie sie
// eingetragen wurden (kein Zeitzonen-Umrechnen wie bei Zeitstempeln).
// Art und Orgasmus hängen an den Beteiligten, nicht am Eintrag selbst.
export const sexEntries = pgTable("sex_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  occurredOn: date("occurred_on").notNull(),
  occurredTime: time("occurred_time").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Beteiligte eines Sex-Eintrags (eine Zeile je anwesender Person) ---
// Wer nicht dabei war, hat schlicht keine Zeile. Art und Orgasmus werden je
// Person erfasst, weil sie sich zwischen den Beteiligten unterscheiden können.
export const sexParticipants = pgTable(
  "sex_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => sexEntries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: sexType("type").notNull(),
    orgasm: orgasmResult("orgasm").notNull().default("none"),
  },
  (t) => [unique("sex_participants_entry_user_unique").on(t.entryId, t.userId)],
);

// --- Zyklus-Einstellungen (pro Frau) ---
export const cycleSettings = pgTable("cycle_settings", {
  ownerId: uuid("owner_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  avgCycleLengthOverride: integer("avg_cycle_length_override"),
  lutealPhaseDays: integer("luteal_phase_days").notNull().default(14),
  // Fokus für Benachrichtigung/Dashboard. Beide Fenster werden immer angezeigt.
  mode: cycleMode("mode").notNull().default("ttc"),
  // Fruchtbares Fenster (Kinderwunsch) als Zyklustage ab Blutungstag 1, manuell.
  fertileStartDay: integer("fertile_start_day").notNull().default(12),
  fertileEndDay: integer("fertile_end_day").notNull().default(16),
  // Spaß-Zeit-Fenster als Zyklustage ab Blutungstag 1. windowEndDay = null -> bis zur nächsten Blutung.
  windowStartDay: integer("window_start_day").notNull().default(28),
  windowEndDay: integer("window_end_day"),
  notifyTime: time("notify_time").notNull().default("09:00"),
  notifyAudience: notifyAudience("notify_audience").notNull().default("owner"),
  // Dedup für GV-Fenster-Push: Fensterstart-Datum, für das zuletzt benachrichtigt wurde
  lastGvNotified: date("last_gv_notified"),
});

// --- Medikamente ---
export const medications = pgTable("medications", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  active: boolean("active").notNull().default(true),
  scheduleType: medScheduleType("schedule_type").notNull().default("fixed_time"),
  times: jsonb("times").$type<string[]>().notNull().default([]), // ["08:00","20:00"]
  // Wochentage (ISO 1=Mo .. 7=So) für feste Zeiten; leer = täglich
  weekdays: jsonb("weekdays").$type<number[]>().notNull().default([]),
  cycleDayFrom: integer("cycle_day_from"),
  cycleDayTo: integer("cycle_day_to"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Medikamenten-Einnahme-Quittungen ---
export const medicationLogs = pgTable("medication_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  medicationId: uuid("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }),
});

// --- Web-Push-Subscriptions (ein Gerät = ein Eintrag) ---
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Geplante Benachrichtigungen (vom Worker abgearbeitet) ---
export const scheduledNotifications = pgTable("scheduled_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // z.B. "medication" | "fertility_window"
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  payloadJson: jsonb("payload_json").$type<Record<string, unknown>>(),
  status: notificationStatus("status").notNull().default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});
