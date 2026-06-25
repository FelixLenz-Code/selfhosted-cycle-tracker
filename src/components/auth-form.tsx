"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, login, type AuthState } from "@/app/actions/auth";

const inputClass =
  "w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium">
          Name
        </label>
        <input id="displayName" name="displayName" className={inputClass} />
        {state?.fieldErrors?.displayName && (
          <p className="text-xs text-red-500">{state.fieldErrors.displayName[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          E-Mail
        </label>
        <input id="email" name="email" type="email" className={inputClass} />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-red-500">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Passwort
        </label>
        <input id="password" name="password" type="password" className={inputClass} />
        {state?.fieldErrors?.password && (
          <p className="text-xs text-red-500">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "Wird erstellt …" : "Konto erstellen"}
      </button>

      <p className="text-center text-sm text-black/60 dark:text-white/60">
        Schon ein Konto?{" "}
        <Link href="/login" className="text-violet-600 hover:underline">
          Anmelden
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          E-Mail
        </label>
        <input id="email" name="email" type="email" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Passwort
        </label>
        <input id="password" name="password" type="password" className={inputClass} />
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "Anmelden …" : "Anmelden"}
      </button>

      <p className="text-center text-sm text-black/60 dark:text-white/60">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-violet-600 hover:underline">
          Registrieren
        </Link>
      </p>
    </form>
  );
}
