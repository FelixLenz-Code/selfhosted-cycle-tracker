import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users, partnerLinks } from "@/db/schema";
import type { CurrentUser } from "./dal";
import { isUuid } from "./ids";

export type OwnerAccess = {
  ownerId: string;
  ownerName: string;
  isSelf: boolean;
  canView: boolean;
  canEdit: boolean;
};

// Löst den Zugriff des angemeldeten Users auf einen (ggf. fremden) Owner auf.
// Ohne ownerIdParam oder bei eigener ID: voller Zugriff auf eigene Daten.
export async function resolveOwnerAccess(
  user: CurrentUser,
  ownerIdParam?: string,
): Promise<OwnerAccess | null> {
  if (!ownerIdParam || ownerIdParam === user.id) {
    return {
      ownerId: user.id,
      ownerName: user.displayName,
      isSelf: true,
      canView: true,
      canEdit: true,
    };
  }

  if (!isUuid(ownerIdParam)) return null;

  const rows = await db
    .select({
      canView: partnerLinks.canView,
      canEdit: partnerLinks.canEdit,
      ownerName: users.displayName,
    })
    .from(partnerLinks)
    .innerJoin(users, eq(users.id, partnerLinks.ownerId))
    .where(
      and(
        eq(partnerLinks.ownerId, ownerIdParam),
        eq(partnerLinks.partnerId, user.id),
        eq(partnerLinks.status, "accepted"),
      ),
    )
    .limit(1);

  const r = rows[0];
  if (!r || !r.canView) return null;

  return {
    ownerId: ownerIdParam,
    ownerName: r.ownerName,
    isSelf: false,
    canView: r.canView,
    canEdit: r.canEdit,
  };
}

// Prüft, ob der User für einen Owner Schreibrechte hat (für Server Actions).
export async function canEditOwner(userId: string, ownerId: string): Promise<boolean> {
  if (userId === ownerId) return true;
  if (!isUuid(ownerId)) return false;
  const rows = await db
    .select({ canEdit: partnerLinks.canEdit })
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.ownerId, ownerId),
        eq(partnerLinks.partnerId, userId),
        eq(partnerLinks.status, "accepted"),
      ),
    )
    .limit(1);
  return Boolean(rows[0]?.canEdit);
}

// Owner, deren Daten der User (als akzeptierter Partner) einsehen darf.
export async function getLinkedOwners(
  userId: string,
): Promise<{ ownerId: string; ownerName: string; canEdit: boolean }[]> {
  return db
    .select({
      ownerId: partnerLinks.ownerId,
      ownerName: users.displayName,
      canEdit: partnerLinks.canEdit,
    })
    .from(partnerLinks)
    .innerJoin(users, eq(users.id, partnerLinks.ownerId))
    .where(
      and(eq(partnerLinks.partnerId, userId), eq(partnerLinks.status, "accepted")),
    );
}

export type OutgoingLink = {
  id: string;
  status: "pending" | "accepted" | "revoked";
  canView: boolean;
  canEdit: boolean;
  invitedEmail: string | null;
  partnerId: string | null;
  partnerName: string | null;
};

// Vom Owner ausgehende Einladungen/Verknüpfungen.
export async function getOutgoingLinks(ownerId: string): Promise<OutgoingLink[]> {
  return db
    .select({
      id: partnerLinks.id,
      status: partnerLinks.status,
      canView: partnerLinks.canView,
      canEdit: partnerLinks.canEdit,
      invitedEmail: partnerLinks.invitedEmail,
      partnerId: partnerLinks.partnerId,
      partnerName: users.displayName,
    })
    .from(partnerLinks)
    .leftJoin(users, eq(users.id, partnerLinks.partnerId))
    .where(eq(partnerLinks.ownerId, ownerId));
}

export type IncomingInvite = {
  id: string;
  canView: boolean;
  canEdit: boolean;
  ownerName: string;
};

// Offene Einladungen an den aktuellen User (per partnerId oder invited_email).
export async function getIncomingInvites(
  userId: string,
  userEmail: string,
): Promise<IncomingInvite[]> {
  return db
    .select({
      id: partnerLinks.id,
      canView: partnerLinks.canView,
      canEdit: partnerLinks.canEdit,
      ownerName: users.displayName,
    })
    .from(partnerLinks)
    .innerJoin(users, eq(users.id, partnerLinks.ownerId))
    .where(
      and(
        eq(partnerLinks.status, "pending"),
        or(
          eq(partnerLinks.partnerId, userId),
          eq(partnerLinks.invitedEmail, userEmail),
        ),
      ),
    );
}
