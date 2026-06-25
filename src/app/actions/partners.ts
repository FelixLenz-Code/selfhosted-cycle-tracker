"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, partnerLinks } from "@/db/schema";
import { requireUser } from "@/lib/dal";

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

  await db.insert(partnerLinks).values({
    ownerId: user.id,
    partnerId,
    invitedEmail: email,
    status: "pending",
    canView: true,
    canEdit,
  });

  revalidatePath("/partners");
  return { success: "Einladung erstellt." };
}

async function findOwnInvite(linkId: string, userId: string, userEmail: string) {
  const rows = await db
    .select()
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.id, linkId),
        or(
          eq(partnerLinks.partnerId, userId),
          eq(partnerLinks.invitedEmail, userEmail.toLowerCase()),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function acceptInvite(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const invite = await findOwnInvite(id, user.id, user.email);
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
  if (!id) return;

  const invite = await findOwnInvite(id, user.id, user.email);
  if (!invite || invite.status !== "pending") return;

  await db.update(partnerLinks).set({ status: "revoked" }).where(eq(partnerLinks.id, id));
  revalidatePath("/partners");
}

// Owner entfernt eine Verknüpfung/Einladung vollständig.
export async function revokeLink(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(partnerLinks)
    .where(and(eq(partnerLinks.id, id), eq(partnerLinks.ownerId, user.id)));

  revalidatePath("/partners");
  revalidatePath("/dashboard");
}

// Owner ändert die Bearbeitungsrechte einer Verknüpfung.
export async function setEditPermission(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const canEdit = String(formData.get("canEdit") ?? "") === "true";
  if (!id) return;

  await db
    .update(partnerLinks)
    .set({ canEdit })
    .where(and(eq(partnerLinks.id, id), eq(partnerLinks.ownerId, user.id)));

  revalidatePath("/partners");
}
