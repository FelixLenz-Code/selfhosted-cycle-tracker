import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <AuthCard title="Konto erstellen" subtitle="Lege deinen Zugang zum Zyklustracker an.">
      <RegisterForm />
    </AuthCard>
  );
}
