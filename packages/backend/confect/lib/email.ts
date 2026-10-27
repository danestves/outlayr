import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { emailConfig } from "./config";

export const EMAIL_CODE_TTL_SECONDS = 10 * 60;

const LANGUAGES = ["en", "es", "fr", "pt"] as const;

type Language = (typeof LANGUAGES)[number];

interface Email {
    subject: string;
    text: string;
}

/** The app sends its own language, which can differ from the device's, on every request that can send mail. */
export function emailLanguage(headers: Headers | undefined): Language {
    const primary = headers?.get("accept-language")?.toLowerCase().slice(0, 2);
    return LANGUAGES.find((language) => language === primary) ?? "en";
}

interface CodeCopy {
    expiry: (minutes: number) => string;
    reset: string;
    subject: (otp: string) => string;
    verify: string;
}

const CODE_EMAIL = {
    en: {
        expiry: (minutes: number) =>
            `It expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email.`,
        reset: "Use this code to reset your Outlayr password:",
        subject: (otp: string) => `Your Outlayr code: ${otp}`,
        verify: "Use this code to confirm your email for Outlayr:",
    },
    es: {
        expiry: (minutes: number) => `Caduca en ${minutes} minutos. Si no lo pediste, puedes ignorar este correo.`,
        reset: "Usa este código para restablecer tu contraseña de Outlayr:",
        subject: (otp: string) => `Tu código de Outlayr: ${otp}`,
        verify: "Usa este código para confirmar tu correo en Outlayr:",
    },
    fr: {
        expiry: (minutes: number) =>
            `Il expire dans ${minutes}\u00A0minutes. Si vous ne l'avez pas demandé, vous pouvez ignorer cet e-mail.`,
        reset: "Utilisez ce code pour réinitialiser votre mot de passe Outlayr\u00A0:",
        subject: (otp: string) => `Votre code Outlayr\u00A0: ${otp}`,
        verify: "Utilisez ce code pour confirmer votre e-mail sur Outlayr\u00A0:",
    },
    pt: {
        expiry: (minutes: number) => `Ele expira em ${minutes} minutos. Se você não pediu, pode ignorar este e-mail.`,
        reset: "Use este código para redefinir sua senha do Outlayr:",
        subject: (otp: string) => `Seu código do Outlayr: ${otp}`,
        verify: "Use este código para confirmar seu e-mail no Outlayr:",
    },
} satisfies Record<Language, CodeCopy>;

export function codeEmail(otp: string, purpose: "verify" | "reset", language: Language): Email {
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

const SEND_TIMEOUT = Duration.seconds(10);

export class EmailError extends Schema.TaggedError<EmailError>()("EmailError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["unconfigured", "transport", "status"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.reason === "unconfigured") {
            return "Email needs CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL_TOKEN and EMAIL_FROM";
        }
        if (this.reason === "status") {
            return `Cloudflare refused the email with ${this.status}`;
        }
        return "Email request failed";
    }
}

const transport = (cause: unknown) => new EmailError({ cause, reason: "transport" });

export const sendEmail = Effect.fn("Email.send")(function* sendEmail(to: string, { subject, text }: Email) {
    const config = yield* emailConfig;
    if (Option.isNone(config)) {
        return yield* new EmailError({ reason: "unconfigured" });
    }
    const { accountId, from, token } = config.value;
    const request = yield* HttpClientRequest.post(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`
    ).pipe(
        HttpClientRequest.bearerToken(token),
        HttpClientRequest.bodyJson({ from: { address: from, name: "Outlayr" }, subject, text, to }),
        Effect.catchTags({ HttpBodyError: transport })
    );
    const response = yield* HttpClient.execute(request).pipe(
        Effect.timeout(SEND_TIMEOUT),
        Effect.catchTags({ HttpClientError: transport, TimeoutError: transport })
    );
    if (response.status < 200 || response.status >= 300) {
        return yield* new EmailError({ reason: "status", status: response.status });
    }
});
