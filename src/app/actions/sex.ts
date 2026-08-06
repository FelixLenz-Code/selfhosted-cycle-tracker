"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sexEntries } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { canEditOwner } from "@/lib/access";
import { isUuid } from "@/lib/ids";
import { todayISO, diffDays } from "@/lib/cycle";
import { currentTimeHHMM, SEX_TYPE_VALUES } from "@/lib/sex";

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
  type: z.enum(SEX_TYPE_VALUES, { error: "Bitte eine Art auswählen." }),
});

function refreshViews() {
  revalidatePath("/sex");
  revalidatePath("/calendar");
}

function ownerIdFrom(formData: FormData, fallback: string): string {
  const v = String(formData.get("ownerId") ?? "");
  return v || fallback;
}

function parseEntry(formData: FormData): { error: string } | { data: z.infer<typeof schema> } {
  const parsed = schema.safeParse({
    occurredOn: formData.get("occurredOn"),
    occurredTime: String(formData.get("occurredTime") ?? "").slice(0, 5),
    type: formData.get("type"),
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

  return { data: parsed.data };
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

  const result = parseEntry(formData);
  if ("error" in result) return result;

  await db.insert(sexEntries).values({ ownerId, ...result.data, createdBy: user.id });

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

  const result = parseEntry(formData);
  if ("error" in result) return result;

  await db
    .update(sexEntries)
    .set(result.data)
    .where(and(eq(sexEntries.id, id), eq(sexEntries.ownerId, ownerId)));

  refreshViews();
  return { ok: true };
}

export async function deleteSexEntry(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id) || !(await canEditOwner(user.id, ownerId))) return;

  await db
    .delete(sexEntries)
    .where(and(eq(sexEntries.id, id), eq(sexEntries.ownerId, ownerId)));

  refreshViews();
}
