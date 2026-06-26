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
  // Fruchtbares Fenster (Kinderwunsch), manuell.
  fertileStartDay: z.number().int().min(1).max(60),
  fertileEndDay: z.number().int().min(1).max(60),
  // Spaß-Zeit-Fenster; Ende offen (null) = bis zur nächsten Blutung.
  windowStartDay: z.number().int().min(1).max(60),
  windowEndDay: z.number().int().min(1).max(60).nullable(),
  notifyTime: z.string().regex(timeRe, { error: "Uhrzeit muss HH:MM sein." }),
  notifyAudience: z.enum(["owner", "partner", "both"]),
  avgCycleLengthOverride: z.number().int().min(20).max(45).nullable(),
});

export async function saveCycleSettings(
  _prev: CycleSettingsState,
  formData: FormData,
): Promise<CycleSettingsState> {
  const user = await requireUser();

  const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim());
  const overrideRaw = String(formData.get("avgCycleLengthOverride") ?? "").trim();
  // "bis zur nächsten Blutung" -> Ende offen (null)
  const untilBleeding = formData.get("untilBleeding") === "on" || formData.get("untilBleeding") === "true";
  const endRaw = String(formData.get("windowEndDay") ?? "").trim();

  const parsed = schema.safeParse({
    mode: formData.get("mode"),
    fertileStartDay: num(formData.get("fertileStartDay")),
    fertileEndDay: num(formData.get("fertileEndDay")),
    windowStartDay: num(formData.get("windowStartDay")),
    windowEndDay: untilBleeding || endRaw === "" ? null : Number(endRaw),
    notifyTime: formData.get("notifyTime"),
    notifyAudience: formData.get("notifyAudience"),
    avgCycleLengthOverride: overrideRaw === "" ? null : Number(overrideRaw),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  if (parsed.data.fertileStartDay > parsed.data.fertileEndDay) {
    return { error: "Fruchtbares Fenster: Start darf nicht nach dem Ende liegen." };
  }
  if (parsed.data.windowEndDay !== null && parsed.data.windowStartDay > parsed.data.windowEndDay) {
    return { error: "Spaß-Zeit: Start darf nicht nach dem Ende liegen." };
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
