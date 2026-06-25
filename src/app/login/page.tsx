import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <AuthCard title="Anmelden" subtitle="Willkommen zurück beim Zyklustracker.">
      <LoginForm />
    </AuthCard>
  );
}
