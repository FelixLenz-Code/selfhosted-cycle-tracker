import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  tracksCycle: boolean;
  isAdmin: boolean;
  createdAt: Date;
};

// Alle Nutzer, ältester zuerst (der erste ist der ursprüngliche Admin).
export async function listUsers(): Promise<AdminUserRow[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      tracksCycle: users.tracksCycle,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
}
