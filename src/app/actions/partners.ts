"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, partnerLinks } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { isUuid } from "@/lib/ids";
import { generateInviteCode, normalizeInviteCode, formatInviteCode } from "@/lib/invite-code";
import {
  getClientIp,
  isRateLimited,
  registerFailedAttempt,
  resetAttempts,
} from "@/lib/rate-limit";

export type InviteState = { error?: string; success?: string } | undefined;

const inviteSchema = z.object({
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }).trim().toLowerCase(),
  canEdit: z.boolean(),
});

export async function invitePartner(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await requireUser();

  // Wer keinen eigenen Zyklus trackt, hat keine Daten zum Freigeben.
  if (!user.tracksCycle) {
    return { error: "Du trackst keinen eigenen Zyklus, daher gibt es nichts freizugeben." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    canEdit: formData.get("canEdit") === "on" || formData.get("canEdit") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const { email, canEdit } = parsed.data;
  if (email === user.email.toLowerCase()) {
    return { error: "Du kannst dich nicht selbst einladen." };
  }

  // Existierenden Partner-Account auflösen (falls vorhanden)
  const partnerRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const partnerId = partnerRows[0]?.id ?? null;

  // Doppelte aktive Einladung verhindern
  const existing = await db
    .select({ id: partnerLinks.id })
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.ownerId, user.id),
        ne(partnerLinks.status, "revoked"),
        or(
          eq(partnerLinks.invitedEmail, email),
          partnerId ? eq(partnerLinks.partnerId, partnerId) : undefined,
        ),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return { error: "Für diese Person besteht bereits eine Einladung oder Verknüpfung." };
  }

  // Code nur nötig, wenn es noch kein Konto gibt: Bestehende Konten sind über
  // partner_id eindeutig zugeordnet und nehmen direkt in ihrer Liste an.
  const inviteCode = partnerId ? null : generateInviteCode();

  await db.insert(partnerLinks).values({
    ownerId: user.id,
    partnerId,
    invitedEmail: email,
    inviteCode,
    status: "pending",
    canView: true,
    canEdit,
  });

  revalidatePath("/partners");
  return {
    success: inviteCode
      ? `Einladung erstellt. Code zum Weitergeben: ${formatInviteCode(inviteCode)}`
      : "Einladung erstellt – sie erscheint direkt im Konto der Person.",
  };
}

// Einladung, die dem angemeldeten Konto zugeordnet ist. Bewusst NUR über
// partner_id: Eine Zuordnung über invited_email wäre kein Nachweis, weil
// E-Mail-Adressen bei der Registrierung nicht verifiziert werden – wer die
// eingeladene Adresse kennt, könnte sich sonst damit registrieren und die
// Einladung übernehmen. Ohne bestehendes Konto läuft die Annahme über
// redeemInvite() mit dem geheimen Code.
async function findOwnInvite(linkId: string, userId: string) {
  const rows = await db
    .select()
    .from(partnerLinks)
    .where(and(eq(partnerLinks.id, linkId), eq(partnerLinks.partnerId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function acceptInvite(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  const invite = await findOwnInvite(id, user.id);
  if (!invite || invite.status !== "pending") return;

  await db
    .update(partnerLinks)
    .set({ status: "accepted", partnerId: user.id, acceptedAt: new Date() })
    .where(eq(partnerLinks.id, id));

  revalidatePath("/partners");
  revalidatePath("/dashboard");
}

export async function declineInvite(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  const invite = await findOwnInvite(id, user.id);
  if (!invite || invite.status !== "pending") return;

  await db.update(partnerLinks).set({ status: "revoked" }).where(eq(partnerLinks.id, id));
  revalidatePath("/partners");
}

// Einladung ohne bestehendes Konto: Annahme über den geheimen Code, den die
// einladende Person weitergibt.
export async function redeemInvite(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await requireUser();
  const code = normalizeInviteCode(String(formData.get("code") ?? ""));
  if (code.length < 8 || code.length > 32) {
    return { error: "Bitte den vollständigen Einladungs-Code eingeben." };
  }

  // Codes raten unattraktiv machen (pro Konto und pro IP begrenzt).
  const keys = [`invite:user:${user.id}`, `invite:ip:${await getClientIp()}`];
  if (await isRateLimited(keys)) {
    return { error: "Zu viele Versuche. Bitte in einigen Minuten erneut versuchen." };
  }

  const rows = await db
    .select()
    .from(partnerLinks)
    .where(and(eq(partnerLinks.inviteCode, code), eq(partnerLinks.status, "pending")))
    .limit(1);
  const invite = rows[0];

  // Eine bereits einem anderen Konto zugeordnete Einladung ist nicht einlösbar.
  if (!invite || invite.ownerId === user.id || (invite.partnerId && invite.partnerId !== user.id)) {
    await registerFailedAttempt(keys);
    return { error: "Code ist ungültig oder wurde bereits verwendet." };
  }

  await db
    .update(partnerLinks)
    .set({
      status: "accepted",
      partnerId: user.id,
      acceptedAt: new Date(),
      inviteCode: null, // einmalig verwendbar
    })
    .where(eq(partnerLinks.id, invite.id));

  await resetAttempts(keys);
  revalidatePath("/partners");
  revalidatePath("/dashboard");
  return { success: "Einladung angenommen." };
}

// Owner entfernt eine Verknüpfung/Einladung vollständig.
export async function revokeLink(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  await db
    .delete(partnerLinks)
    .where(and(eq(partnerLinks.id, id), eq(partnerLinks.ownerId, user.id)));

  revalidatePath("/partners");
  revalidatePath("/dashboard");
}

// Gegenseitig freigeben: Wenn jemand mir bereits Zugriff gegeben hat, gebe ich
// dieser Person Zugriff auf MEINE Daten (als Eigentümerin meiner Daten ist das
// meine Entscheidung -> direkt aktiv, nur Ansicht; Bearbeiten kann ich danach erlauben).
export async function reciprocateLink(formData: FormData): Promise<void> {
  const user = await requireUser();
  // Wer keinen eigenen Zyklus trackt, hat keine Daten zum Gegen-Freigeben.
  if (!user.tracksCycle) return;
  const targetId = String(formData.get("ownerId") ?? "");
  if (!isUuid(targetId) || targetId === user.id) return;

  // Beleg, dass die Zielperson mir bereits Zugriff gegeben hat (akzeptiert).
  const theyShareWithMe = await db
    .select({ id: partnerLinks.id })
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.ownerId, targetId),
        eq(partnerLinks.partnerId, user.id),
        eq(partnerLinks.status, "accepted"),
      ),
    )
    .limit(1);
  if (!theyShareWithMe[0]) return;

  // Schon eine (nicht widerrufene) Freigabe an diese Person?
  const existing = await db
    .select({ id: partnerLinks.id })
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.ownerId, user.id),
        eq(partnerLinks.partnerId, targetId),
        ne(partnerLinks.status, "revoked"),
      ),
    )
    .limit(1);
  if (existing[0]) return;

  const targetRows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!targetRows[0]) return;

  await db.insert(partnerLinks).values({
    ownerId: user.id,
    partnerId: targetId,
    invitedEmail: targetRows[0].email,
    status: "accepted",
    canView: true,
    canEdit: false,
    acceptedAt: new Date(),
  });

  revalidatePath("/partners");
  revalidatePath("/dashboard");
}

// Owner ändert die Bearbeitungsrechte einer Verknüpfung.
export async function setEditPermission(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const canEdit = String(formData.get("canEdit") ?? "") === "true";
  if (!isUuid(id)) return;

  await db
    .update(partnerLinks)
    .set({ canEdit })
    .where(and(eq(partnerLinks.id, id), eq(partnerLinks.ownerId, user.id)));

  revalidatePath("/partners");
}
