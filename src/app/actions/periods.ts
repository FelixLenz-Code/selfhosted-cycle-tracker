"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { periodEntries } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { canEditOwner } from "@/lib/access";
import { isUuid } from "@/lib/ids";
import { todayISO, diffDays } from "@/lib/cycle";

export type PeriodFormState = { error?: string; ok?: boolean } | undefined;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Bitte ein gültiges Datum wählen." })
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()), {
    error: "Ungültiges Datum.",
  });

const addPeriodSchema = z
  .object({
    startDate: isoDate,
    endDate: z.union([isoDate, z.literal("")]).optional(),
  })
  .refine((v) => !v.endDate || diffDays(v.endDate, v.startDate) >= 0, {
    error: "Das Enddatum darf nicht vor dem Startdatum liegen.",
    path: ["endDate"],
  });

function refreshViews() {
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

function ownerIdFrom(formData: FormData, fallback: string): string {
  const v = String(formData.get("ownerId") ?? "");
  return v || fallback;
}

export async function addPeriod(
  _prev: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);

  if (!(await canEditOwner(user.id, ownerId))) {
    return { error: "Keine Berechtigung zum Eintragen." };
  }

  const parsed = addPeriodSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const { startDate } = parsed.data;
  const endDate = parsed.data.endDate ? parsed.data.endDate : null;

  if (diffDays(startDate, todayISO()) > 0) {
    return { error: "Das Startdatum darf nicht in der Zukunft liegen." };
  }

  await db.insert(periodEntries).values({
    ownerId,
    startDate,
    endDate,
    createdBy: user.id,
  });

  refreshViews();
  return undefined;
}

export async function editPeriod(
  _prev: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Ungültiger Eintrag." };

  if (!(await canEditOwner(user.id, ownerId))) {
    return { error: "Keine Berechtigung zum Bearbeiten." };
  }

  const parsed = addPeriodSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const { startDate } = parsed.data;
  const endDate = parsed.data.endDate ? parsed.data.endDate : null;

  if (diffDays(startDate, todayISO()) > 0) {
    return { error: "Das Startdatum darf nicht in der Zukunft liegen." };
  }

  await db
    .update(periodEntries)
    .set({ startDate, endDate })
    .where(and(eq(periodEntries.id, id), eq(periodEntries.ownerId, ownerId)));

  refreshViews();
  return { ok: true };
}

export async function endPeriod(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);
  const id = String(formData.get("id") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || todayISO();
  if (!isUuid(id) || !(await canEditOwner(user.id, ownerId))) return;

  await db
    .update(periodEntries)
    .set({ endDate })
    .where(and(eq(periodEntries.id, id), eq(periodEntries.ownerId, ownerId)));

  refreshViews();
}

export async function deletePeriod(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ownerId = ownerIdFrom(formData, user.id);
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id) || !(await canEditOwner(user.id, ownerId))) return;

  await db
    .delete(periodEntries)
    .where(and(eq(periodEntries.id, id), eq(periodEntries.ownerId, ownerId)));

  refreshViews();
}
