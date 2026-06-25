"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { cycleSettings } from "@/db/schema";
import { requireUser } from "@/lib/dal";

export type CycleSettingsState = { error?: string; success?: string } | undefined;

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  mode: z.enum(["ttc", "avoid"]),
  windowStartOffset: z.number().int().min(-20).max(20),
  windowEndOffset: z.number().int().min(-20).max(20),
  notifyTime: z.string().regex(timeRe, { error: "Uhrzeit muss HH:MM sein." }),
  notifyAudience: z.enum(["owner", "partner", "both"]),
  lutealPhaseDays: z.number().int().min(8).max(20),
  avgCycleLengthOverride: z.number().int().min(20).max(45).nullable(),
});

export async function saveCycleSettings(
  _prev: CycleSettingsState,
  formData: FormData,
): Promise<CycleSettingsState> {
  const user = await requireUser();

  const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());
  const overrideRaw = String(formData.get("avgCycleLengthOverride") ?? "").trim();

  const parsed = schema.safeParse({
    mode: formData.get("mode"),
    windowStartOffset: num(formData.get("windowStartOffset")),
    windowEndOffset: num(formData.get("windowEndOffset")),
    notifyTime: formData.get("notifyTime"),
    notifyAudience: formData.get("notifyAudience"),
    lutealPhaseDays: num(formData.get("lutealPhaseDays")),
    avgCycleLengthOverride: overrideRaw === "" ? null : Number(overrideRaw),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  if (parsed.data.windowStartOffset > parsed.data.windowEndOffset) {
    return { error: "Fenster-Start darf nicht nach dem Fenster-Ende liegen." };
  }

  const d = parsed.data;
  await db
    .insert(cycleSettings)
    .values({ ownerId: user.id, ...d })
    .onConflictDoUpdate({ target: cycleSettings.ownerId, set: d });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Einstellungen gespeichert." };
}
