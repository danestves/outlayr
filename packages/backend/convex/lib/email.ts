import { env } from "@outlayr/env/backend";

export const EMAIL_CODE_TTL_SECONDS = 10 * 60;

type Language = "en" | "es";

interface Email {
    subject: string;
    text: string;
}

/** The app sends its own language, which can differ from the device's, on every request that can send mail. */
export function emailLanguage(headers: Headers | undefined): Language {
    return headers?.get("accept-language")?.toLowerCase().startsWith("es") ? "es" : "en";
}

export function codeEmail(otp: string, purpose: "verify" | "reset", language: Language): Email {
    const minutes = EMAIL_CODE_TTL_SECONDS / 60;
    if (language === "es") {
        const lead =
            purpose === "verify"
                ? "Usa este código para confirmar tu correo en Outlayr:"
                : "Usa este código para restablecer tu contraseña de Outlayr:";
        return {
            subject: `Tu código de Outlayr: ${otp}`,
            text: `${lead}\n\n${otp}\n\nCaduca en ${minutes} minutos. Si no lo pediste, puedes ignorar este correo.`,
        };
    }
    const lead =
        purpose === "verify"
            ? "Use this code to confirm your email for Outlayr:"
            : "Use this code to reset your Outlayr password:";
    return {
        subject: `Your Outlayr code: ${otp}`,
        text: `${lead}\n\n${otp}\n\nIt expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email.`,
    };
}

/** Sign-up answers an existing email exactly like a new one, so the owner hears about it here instead. */
export function accountExistsEmail(language: Language): Email {
    if (language === "es") {
        return {
            subject: "Ya tienes una cuenta de Outlayr",
            text: "Este correo ya tiene una cuenta de Outlayr. Inicia sesión con ella, o elige ¿Olvidaste tu contraseña? para crear una nueva.\n\nSi no lo pediste, puedes ignorar este correo.",
        };
    }
    return {
        subject: "You already have an Outlayr account",
        text: "This email already has an Outlayr account. Sign in with it, or choose Forgot password? to set a new one.\n\nIf you didn't ask for this, you can ignore this email.",
    };
}

const SEND_TIMEOUT_MS = 10_000;

export const emailConfigured = Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_EMAIL_TOKEN && env.EMAIL_FROM);

export async function sendEmail(to: string, { subject, text }: Email): Promise<void> {
    const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_EMAIL_TOKEN: token, EMAIL_FROM: from } = env;
    if (!(account && token && from)) {
        throw new Error("Email needs CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL_TOKEN and EMAIL_FROM");
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`, {
        body: JSON.stringify({ from: { address: from, name: "Outlayr" }, subject, text, to }),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`Cloudflare refused the email with ${response.status}`);
    }
}
