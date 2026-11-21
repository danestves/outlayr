import { LANGUAGES } from "@outlayr/email/language";
import type { Language } from "@outlayr/email/language";
import * as Schema from "effect/Schema";

import { EmailProviderName, REQUIRED_VARIABLES } from "./emailSetup";

export const EMAIL_CODE_TTL_SECONDS = 10 * 60;

export interface Email {
    html?: string;
    replyTo?: string;
    subject: string;
    text: string;
}

/** The app sends its own language, which can differ from the device's, on every request that can send mail. */
export function emailLanguage(headers: Headers | undefined): Language {
    const primary = headers?.get("accept-language")?.toLowerCase().slice(0, 2);
    return LANGUAGES.find((language) => language === primary) ?? "en";
}

interface CodeCopy {
    change: string;
    expiry: (minutes: number) => string;
    reset: string;
    subject: (otp: string) => string;
    verify: string;
}

const CODE_EMAIL = {
    en: {
        change: "Use this code to change your Outlayr email to this address:",
        expiry: (minutes: number) =>
            `It expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email.`,
        reset: "Use this code to reset your Outlayr password:",
        subject: (otp: string) => `Your Outlayr code: ${otp}`,
        verify: "Use this code to confirm your email for Outlayr:",
    },
    de: {
        change: "Mit diesem Code änderst du deine Outlayr-E-Mail-Adresse auf diese Adresse:",
        expiry: (minutes: number) =>
            `Er läuft in ${minutes} Minuten ab. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
        reset: "Mit diesem Code setzt du dein Outlayr-Passwort zurück:",
        subject: (otp: string) => `Dein Outlayr-Code: ${otp}`,
        verify: "Mit diesem Code bestätigst du deine E-Mail-Adresse bei Outlayr:",
    },
    es: {
        change: "Usa este código para cambiar tu correo de Outlayr a esta dirección:",
        expiry: (minutes: number) => `Caduca en ${minutes} minutos. Si no lo pediste, puedes ignorar este correo.`,
        reset: "Usa este código para restablecer tu contraseña de Outlayr:",
        subject: (otp: string) => `Tu código de Outlayr: ${otp}`,
        verify: "Usa este código para confirmar tu correo en Outlayr:",
    },
    fr: {
        change: "Utilisez ce code pour remplacer votre e-mail Outlayr par cette adresse\u00A0:",
        expiry: (minutes: number) =>
            `Il expire dans ${minutes}\u00A0minutes. Si vous ne l'avez pas demandé, vous pouvez ignorer cet e-mail.`,
        reset: "Utilisez ce code pour réinitialiser votre mot de passe Outlayr\u00A0:",
        subject: (otp: string) => `Votre code Outlayr\u00A0: ${otp}`,
        verify: "Utilisez ce code pour confirmer votre e-mail sur Outlayr\u00A0:",
    },
    pt: {
        change: "Use este código para trocar seu e-mail do Outlayr por este endereço:",
        expiry: (minutes: number) => `Ele expira em ${minutes} minutos. Se você não pediu, pode ignorar este e-mail.`,
        reset: "Use este código para redefinir sua senha do Outlayr:",
        subject: (otp: string) => `Seu código do Outlayr: ${otp}`,
        verify: "Use este código para confirmar seu e-mail no Outlayr:",
    },
} satisfies Record<Language, CodeCopy>;

export function codeEmail(otp: string, purpose: "change" | "verify" | "reset", language: Language): Email {
    const copy = CODE_EMAIL[language];
    return {
        subject: copy.subject(otp),
        text: `${copy[purpose]}\n\n${otp}\n\n${copy.expiry(EMAIL_CODE_TTL_SECONDS / 60)}`,
    };
}

/** Sign-up answers an existing email exactly like a new one, so the owner hears about it here instead. */
const ACCOUNT_EXISTS_EMAIL = {
    en: {
        subject: "You already have an Outlayr account",
        text: "This email already has an Outlayr account. Sign in with it, or choose Forgot password? to set a new one.\n\nIf you didn't ask for this, you can ignore this email.",
    },
    de: {
        subject: "Du hast schon ein Outlayr-Konto",
        text: "Zu dieser E-Mail-Adresse gibt es schon ein Outlayr-Konto. Melde dich damit an oder wähle Passwort vergessen?, um ein neues festzulegen.\n\nWenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.",
    },
    es: {
        subject: "Ya tienes una cuenta de Outlayr",
        text: "Este correo ya tiene una cuenta de Outlayr. Inicia sesión con ella, o elige ¿Olvidaste tu contraseña? para crear una nueva.\n\nSi no lo pediste, puedes ignorar este correo.",
    },
    fr: {
        subject: "Vous avez déjà un compte Outlayr",
        text: "Cet e-mail a déjà un compte Outlayr. Connectez-vous avec, ou choisissez Mot de passe oublié\u00A0? pour en définir un nouveau.\n\nSi vous n'avez rien demandé, vous pouvez ignorer cet e-mail.",
    },
    pt: {
        subject: "Você já tem uma conta do Outlayr",
        text: "Este e-mail já tem uma conta do Outlayr. Entre com ela ou escolha Esqueceu a senha? para criar uma nova.\n\nSe você não pediu isso, pode ignorar este e-mail.",
    },
} satisfies Record<Language, Email>;

export function accountExistsEmail(language: Language): Email {
    return ACCOUNT_EXISTS_EMAIL[language];
}

export class EmailError extends Schema.TaggedError<EmailError>()("EmailError", {
    cause: Schema.optional(Schema.Defect()),
    provider: EmailProviderName,
    reason: Schema.Literals(["unconfigured", "transport", "status"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.provider === "log") {
            return "Email goes to the log; set EMAIL_PROVIDER to send it";
        }
        if (this.reason === "unconfigured") {
            return `${this.provider} email needs ${REQUIRED_VARIABLES[this.provider]}`;
        }
        if (this.reason === "status") {
            return `${this.provider} refused the email with ${this.status ?? "an error"}`;
        }
        return `${this.provider} email request failed`;
    }
}
