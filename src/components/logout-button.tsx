import { logout } from "@/app/actions/auth";
import { ConfirmSubmit } from "./confirm-submit";

const base =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors";

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Abmelden mit Doppelabfrage: erster Klick schaltet scharf (roter Haken),
// zweiter Klick meldet wirklich ab. Nur als Icon dargestellt.
export function LogoutButton() {
  return (
    <ConfirmSubmit
      action={logout}
      hidden={{}}
      label={<LogoutIcon />}
      confirmLabel={<CheckIcon />}
      idleAriaLabel="Abmelden"
      confirmAriaLabel="Abmelden bestätigen"
      idleClassName={`${base} border-black/15 text-black/70 hover:bg-black/5 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10`}
      confirmClassName={`${base} border-rose-500 bg-rose-500 text-white hover:bg-rose-600`}
    />
  );
}
