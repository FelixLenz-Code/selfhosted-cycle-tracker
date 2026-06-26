"use client";

import { useActionState, useState } from "react";
import {
  setUserAdmin,
  deleteUser,
  resetUserPassword,
  editUser,
  type AdminActionState,
} from "@/app/actions/admin";
import { ConfirmSubmit } from "./confirm-submit";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";
const btnClass =
  "rounded-md border border-black/15 dark:border-white/20 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10";

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  tracksCycle: boolean;
  isAdmin: boolean;
  createdAt: string;
};

export function AdminUserItem({
  user,
  currentUserId,
  adminCount,
}: {
  user: AdminUser;
  currentUserId: string;
  adminCount: number;
}) {
  const [panel, setPanel] = useState<null | "edit" | "password">(null);
  const [editState, editAction, editPending] = useActionState<AdminActionState, FormData>(
    editUser,
    undefined,
  );
  const [pwState, pwAction, pwPending] = useActionState<AdminActionState, FormData>(
    resetUserPassword,
    undefined,
  );

  const isSelf = user.id === currentUserId;
  const isLastAdmin = user.isAdmin && adminCount <= 1;

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{user.displayName}</span>
            {user.isAdmin && (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                Admin
              </span>
            )}
            {isSelf && (
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/15">
                Du
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-black/50 dark:text-white/50">
            {user.email} · {user.tracksCycle ? "eigener Zyklus" : "Begleitung"} · seit{" "}
            {user.createdAt}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {/* Admin-Recht geben/entziehen (letzter Admin bleibt geschützt) */}
          {!isLastAdmin && (
            <form action={setUserAdmin}>
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="makeAdmin" value={(!user.isAdmin).toString()} />
              <button type="submit" className={btnClass}>
                {user.isAdmin ? "Admin entziehen" : "Zu Admin machen"}
              </button>
            </form>
          )}
          <button
            type="button"
            className={btnClass}
            onClick={() => setPanel(panel === "edit" ? null : "edit")}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => setPanel(panel === "password" ? null : "password")}
          >
            Passwort
          </button>
          {!isSelf && !isLastAdmin && (
            <ConfirmSubmit
              action={deleteUser}
              hidden={{ id: user.id }}
              label="Löschen"
              confirmLabel="Wirklich löschen?"
              idleClassName="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10"
              confirmClassName="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
            />
          )}
        </div>
      </div>

      {panel === "edit" && (
        <form action={editAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={user.id} />
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-black/60 dark:text-white/60">Name</span>
            <input name="displayName" defaultValue={user.displayName} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-black/60 dark:text-white/60">E-Mail</span>
            <input
              name="email"
              type="email"
              defaultValue={user.email}
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={editPending}
            className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Speichern
          </button>
          {editState?.error && (
            <span className="text-xs text-red-600">{editState.error}</span>
          )}
          {editState?.ok && (
            <span className="text-xs text-green-600">{editState.ok}</span>
          )}
        </form>
      )}

      {panel === "password" && (
        <form action={pwAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={user.id} />
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-black/60 dark:text-white/60">Neues Passwort</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={pwPending}
            className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Setzen
          </button>
          {pwState?.error && <span className="text-xs text-red-600">{pwState.error}</span>}
          {pwState?.ok && <span className="text-xs text-green-600">{pwState.ok}</span>}
        </form>
      )}
    </li>
  );
}
