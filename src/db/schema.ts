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
  createdAt: timestamp("created_at", { withTimezone: true })
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
  // E-Mail des Eingeladenen, falls Account noch nicht existiert/akzeptiert
  invitedEmail: text("invited_email"),
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

// --- Zyklus-Einstellungen (pro Frau) ---
export const cycleSettings = pgTable("cycle_settings", {
  ownerId: uuid("owner_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  avgCycleLengthOverride: integer("avg_cycle_length_override"),
  lutealPhaseDays: integer("luteal_phase_days").notNull().default(14),
  mode: cycleMode("mode").notNull().default("ttc"),
  windowStartOffset: integer("window_start_offset").notNull().default(-4),
  windowEndOffset: integer("window_end_offset").notNull().default(1),
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
