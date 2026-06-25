import { z } from "zod";

export const signupSchema = z.object({
  displayName: z
    .string()
    .min(2, { error: "Name muss mindestens 2 Zeichen lang sein." })
    .max(80)
    .trim(),
  email: z
    .email({ error: "Bitte eine gültige E-Mail-Adresse eingeben." })
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Passwort muss mindestens 8 Zeichen lang sein." }),
});

export const loginSchema = z.object({
  email: z.email({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Bitte Passwort eingeben." }),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
