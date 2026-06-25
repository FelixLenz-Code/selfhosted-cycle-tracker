"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { medications } from "@/db/schema";
import { requireUser } from "@/lib/dal";

export type MedFormState = { error?: string } | undefined;

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const medSchema = z
  .object({
    name: z.string().min(1, { error: "Name ist erforderlich." }).max(100).trim(),
    dosage: z.string().max(100).trim().optional(),
    scheduleType: z.enum(["fixed_time", "cycle_relative"]),
    times: z
      .array(z.string().regex(timeRe, { error: "Uhrzeit muss HH:MM sein." }))
      .min(1, { error: "Mindestens eine Uhrzeit angeben (z. B. 08:00)." }),
    weekdays: z.array(z.number().int().min(1).max(7)),
    cycleDayFrom: z.number().int().min(1).max(60).nullable(),
    cycleDayTo: z.number().int().min(1).max(60).nullable(),
  })
  .refine(
    (v) =>
      v.scheduleType !== "cycle_relative" ||
      v.cycleDayFrom === null ||
      v.cycleDayTo === null ||
      v.cycleDayFrom <= v.cycleDayTo,
    { error: "Zyklustag 'von' darf nicht größer als 'bis' sein.", path: ["cycleDayTo"] },
  );

function parseForm(formData: FormData) {
  const times = String(formData.get("times") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const numOrNull = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : Number(s);
  };
  const weekdays = formData
    .getAll("weekdays")
    .map((v) => Number(v))
    .filter((n) => n >= 1 && n <= 7)
    .sort((a, b) => a - b);

  return medSchema.safeParse({
    name: formData.get("name"),
    dosage: String(formData.get("dosage") ?? "").trim() || undefined,
    scheduleType: formData.get("scheduleType"),
    times,
    weekdays,
    cycleDayFrom: numOrNull(formData.get("cycleDayFrom")),
    cycleDayTo: numOrNull(formData.get("cycleDayTo")),
  });
}

export async function addMedication(
  _prev: MedFormState,
  formData: FormData,
): Promise<MedFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const d = parsed.data;
  await db.insert(medications).values({
    ownerId: user.id,
    name: d.name,
    dosage: d.dosage ?? null,
    scheduleType: d.scheduleType,
    times: d.times,
    weekdays: d.scheduleType === "fixed_time" ? d.weekdays : [],
    cycleDayFrom: d.scheduleType === "cycle_relative" ? d.cycleDayFrom : null,
    cycleDayTo: d.scheduleType === "cycle_relative" ? d.cycleDayTo : null,
  });
  revalidatePath("/medications");
  return undefined;
}

export async function updateMedication(
  _prev: MedFormState,
  formData: FormData,
): Promise<MedFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Fehlende ID." };
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const d = parsed.data;
  await db
    .update(medications)
    .set({
      name: d.name,
      dosage: d.dosage ?? null,
      scheduleType: d.scheduleType,
      times: d.times,
      weekdays: d.scheduleType === "fixed_time" ? d.weekdays : [],
      cycleDayFrom: d.scheduleType === "cycle_relative" ? d.cycleDayFrom : null,
      cycleDayTo: d.scheduleType === "cycle_relative" ? d.cycleDayTo : null,
    })
    .where(and(eq(medications.id, id), eq(medications.ownerId, user.id)));
  revalidatePath("/medications");
  return undefined;
}

export async function deleteMedication(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .delete(medications)
    .where(and(eq(medications.id, id), eq(medications.ownerId, user.id)));
  revalidatePath("/medications");
}

export async function toggleMedication(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;
  await db
    .update(medications)
    .set({ active })
    .where(and(eq(medications.id, id), eq(medications.ownerId, user.id)));
  revalidatePath("/medications");
}
