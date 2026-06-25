"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { periodEntries } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { todayISO, diffDays } from "@/lib/cycle";

export type PeriodFormState = { error?: string } | undefined;

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
  .refine(
    (v) => !v.endDate || diffDays(v.endDate, v.startDate) >= 0,
    { error: "Das Enddatum darf nicht vor dem Startdatum liegen.", path: ["endDate"] },
  );

function refreshViews() {
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function addPeriod(
  _prev: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const user = await requireUser();

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
    ownerId: user.id,
    startDate,
    endDate,
    createdBy: user.id,
  });

  refreshViews();
  return undefined;
}

export async function endPeriod(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || todayISO();
  if (!id) return;

  await db
    .update(periodEntries)
    .set({ endDate })
    .where(and(eq(periodEntries.id, id), eq(periodEntries.ownerId, user.id)));

  refreshViews();
}

export async function deletePeriod(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(periodEntries)
    .where(and(eq(periodEntries.id, id), eq(periodEntries.ownerId, user.id)));

  refreshViews();
}
