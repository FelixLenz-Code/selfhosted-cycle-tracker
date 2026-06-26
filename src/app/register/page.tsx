import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth-form";
import { isRegistrationEnabled } from "@/lib/app-settings";

// Pro Request rendern: liest den Registrierungs-Schalter aus der DB (zur Build-Zeit
// in CI gibt es keine DB), daher kein statisches Prerendering.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!(await isRegistrationEnabled())) {
    return (
      <AuthCard
        title="Registrierung deaktiviert"
        subtitle="Neue Konten können derzeit nicht angelegt werden."
      >
        <p className="text-sm text-black/60 dark:text-white/60">
          Wende dich an die Administration dieser Instanz, wenn du Zugang benötigst.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-violet-600 hover:underline"
        >
          Zur Anmeldung
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Konto erstellen" subtitle="Lege deinen Zugang zum Zyklustracker an.">
      <RegisterForm />
    </AuthCard>
  );
}
