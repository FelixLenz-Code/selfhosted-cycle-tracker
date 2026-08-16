"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sexEntries, sexParticipants } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { canEditOwner, getParticipantCandidates } from "@/lib/access";
import { isUuid } from "@/lib/ids";
import { todayISO, diffDays } from "@/lib/cycle";
import { currentTimeHHMM, SEX_TYPE_VALUES, ORGASM_VALUES } from "@/lib/sex";

export type SexFormState = { error?: string; ok?: boolean } | undefined;

const schema = z.object({
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Bitte ein gültiges Datum wählen." })
    .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()), {
      error: "Ungültiges Datum.",
    }),
  occurredTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Uhrzeit muss HH:MM sein." }),
});

const participantSchema = z.object({
  userId: z.string(),
  type: z.enum(SEX_TYPE_VALUES, { error: "Bitte für jede Person eine Art auswählen." }),
  orgasm: z.enum(ORGASM_VALUES, { error: "Ungültige Orgasmus-Angabe." }),
});

type ParsedEntry = z.infer<typeof schema> & {
  participants: z.infer<typeof participantSchema>[];
};

function refreshViews() {
  revalidatePath("/sex");
  revalidatePath("/calendar");
}

function ownerIdFrom(formData: FormData, fallback: string): string {
  const v = String(formData.get("ownerId") ?? "");
  return v || fallback;
}

// Datum/Uhrzeit und die angehakten Beteiligten aus dem Formular lesen.
// Die Beteiligten werden gegen die erlaubten Personen des Owners geprüft, damit
// über einen direkten POST niemand Fremde in einen Eintrag schreiben kann.
async function parseEntry(
  formData: FormData,
  ownerId: string,
  // Beim Bearbeiten zusätzlich erlaubt: Personen, die bereits im Eintrag stehen.
  // Sonst ließe sich ein alter Eintrag nicht mehr speichern, wenn die
  // Partner-Verknüpfung inzwischen aufgehoben wurde.
  extraAllowed: Set<string> = new Set(),
): Promise<{ error: string } | { data: ParsedEntry }> {
  const parsed = schema.safeParse({
    occurredOn: formData.get("occurredOn"),
    occurredTime: String(formData.get("occurredTime") ?? "").slice(0, 5),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  // Nichts eintragen, was noch nicht passiert ist.
  const dayDiff = diffDays(parsed.data.occurredOn, todayISO());
  if (dayDiff > 0) return { error: "Das Datum darf nicht in der Zukunft liegen." };
  if (dayDiff === 0 && parsed.data.occurredTime > currentTimeHHMM()) {
    return { error: "Die Uhrzeit liegt in der Zukunft." };
  }

  const selected = formData.getAll("participants").map(String);
  if (selected.length === 0) {
    return { error: "Bitte mindestens eine beteiligte Person auswählen." };
  }

  const allowed = new Set((await getParticipantCandidates(ownerId)).map((c) => c.id));
  const participants: z.infer<typeof participantSchema>[] = [];
  const seen = new Set<string>();
  for (const userId of selected) {
    if (!allowed.has(userId) && !extraAllowed.has(userId)) {
      return { error: "Unbekannte Person im Eintrag." };
    }
    if (seen.has(userId)) continue;
    seen.add(userId);

    const p = participantSchema.safeParse({
      userId,
      type: formData.get(`type-${userId}`),
      orgasm: formData.get(`orgasm-${userId}`),
    });
    if (!p.success) {
      return { error: p.error.issues[0]?.message ?? "Ungültige Eingabe." };
    }
    participants.push(p.data);
  }

  return { data: { ...parsed.data, participants } };
}

export async function addSexEntry(
  _prev: SexFormState,
  formData: FormData,
): Promise<SexFormState> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);

  if (!(await canEditOwner(user.id, ownerId))) {
    return { error: "Keine Berechtigung zum Eintragen." };
  }

  const result = await parseEntry(formData, ownerId);
  if ("error" in result) return result;
  const { participants, ...entry } = result.data;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(sexEntries)
      .values({ ownerId, ...entry, createdBy: user.id })
      .returning({ id: sexEntries.id });
    await tx
      .insert(sexParticipants)
      .values(participants.map((p) => ({ entryId: row.id, ...p })));
  });

  refreshViews();
  return { ok: true };
}

export async function editSexEntry(
  _prev: SexFormState,
  formData: FormData,
): Promise<SexFormState> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Ungültiger Eintrag." };

  if (!(await canEditOwner(user.id, ownerId))) {
    return { error: "Keine Berechtigung zum Bearbeiten." };
  }

  const [existing] = await db
    .select({ id: sexEntries.id })
    .from(sexEntries)
    .where(and(eq(sexEntries.id, id), eq(sexEntries.ownerId, ownerId)))
    .limit(1);
  if (!existing) return { error: "Eintrag nicht gefunden." };

  const current = await db
    .select({ userId: sexParticipants.userId })
    .from(sexParticipants)
    .where(eq(sexParticipants.entryId, id));

  const result = await parseEntry(
    formData,
    ownerId,
    new Set(current.map((p) => p.userId)),
  );
  if ("error" in result) return result;
  const { participants, ...entry } = result.data;

  // Beteiligte werden komplett ersetzt – einfacher und robuster als ein Diff.
  await db.transaction(async (tx) => {
    await tx
      .update(sexEntries)
      .set(entry)
      .where(and(eq(sexEntries.id, id), eq(sexEntries.ownerId, ownerId)));
    await tx.delete(sexParticipants).where(eq(sexParticipants.entryId, id));
    await tx
      .insert(sexParticipants)
      .values(participants.map((p) => ({ entryId: id, ...p })));
  });

  refreshViews();
  return { ok: true };
}

export async function deleteSexEntry(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id) || !(await canEditOwner(user.id, ownerId))) return;

  // Beteiligte hängen per ON DELETE CASCADE am Eintrag.
  await db
    .delete(sexEntries)
    .where(and(eq(sexEntries.id, id), eq(sexEntries.ownerId, ownerId)));

  refreshViews();
}
