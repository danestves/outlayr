import { formatDate } from "../language";
import type { Language } from "../language";
import { Note, renderEmail } from "../note";
import type { NoteItem } from "../note";

export type { NoteItem } from "../note";

export type LegalDocument = "privacy" | "terms";

interface PolicyChangeEmailProps {
    documents: readonly { changes: readonly NoteItem[]; document: LegalDocument }[];
    effectiveAtMs: number;
    email: string;
    language: Language;
    timeZone?: string;
}

interface Announcement {
    lead: (date: string) => string;
    subject: string;
}

interface PolicyChangeCopy {
    after: string;
    both: Announcement;
    documents: Record<LegalDocument, Announcement & { intro: string }>;
    footer: (email: string) => string;
    keepUsing: (date: string) => string;
    link: string;
    preview: string;
    reply: string;
    takesEffect: string;
}

const COPY = {
    en: {
        after: "There's nothing you need to do. You can export or delete your data at any time in Settings.",
        both: {
            lead: (date) => `Our Privacy Policy and Terms of Use change on ${date}.`,
            subject: "Updates to our Privacy Policy and Terms of Use",
        },
        documents: {
            privacy: {
                intro: "What changes in the Privacy Policy:",
                lead: (date) => `Our Privacy Policy changes on ${date}.`,
                subject: "Updates to our Privacy Policy",
            },
            terms: {
                intro: "What changes in the Terms of Use:",
                lead: (date) => `Our Terms of Use change on ${date}.`,
                subject: "Updates to our Terms of Use",
            },
        },
        footer: (email) => `A service notice sent to ${email} and every other Outlayr account.`,
        keepUsing: (date) =>
            `If you keep using Outlayr on or after ${date}, the new terms apply. If you don't agree, cancel any subscription and delete your account before then.`,
        link: "Read the new version",
        preview: "What changes, and when.",
        reply: "Questions? Reply to this email.",
        takesEffect: "Takes effect",
    },
    es: {
        after: "No tienes que hacer nada. Puedes exportar o borrar tus datos cuando quieras en Configuración.",
        both: {
            lead: (date) => `Nuestra Política de privacidad y nuestros Términos de uso cambian el ${date}.`,
            subject: "Cambios en nuestra Política de privacidad y nuestros Términos de uso",
        },
        documents: {
            privacy: {
                intro: "Qué cambia en la Política de privacidad:",
                lead: (date) => `Nuestra Política de privacidad cambia el ${date}.`,
                subject: "Cambios en nuestra Política de privacidad",
            },
            terms: {
                intro: "Qué cambia en los Términos de uso:",
                lead: (date) => `Nuestros Términos de uso cambian el ${date}.`,
                subject: "Cambios en nuestros Términos de uso",
            },
        },
        footer: (email) => `Aviso de servicio enviado a ${email} y a todas las cuentas de Outlayr.`,
        keepUsing: (date) =>
            `Si sigues usando Outlayr a partir del ${date}, se te aplican los nuevos términos. Si no estás de acuerdo, cancela cualquier suscripción y elimina tu cuenta antes de esa fecha.`,
        link: "Leer la nueva versión",
        preview: "Qué cambia y desde cuándo.",
        reply: "¿Preguntas? Responde a este correo.",
        takesEffect: "Entra en vigor",
    },
    fr: {
        after: "Vous n'avez rien à faire. Vous pouvez exporter ou supprimer vos données à tout moment dans Réglages.",
        both: {
            lead: (date) => `Notre politique de confidentialité et nos conditions d'utilisation changent le ${date}.`,
            subject: "Mise à jour de notre politique de confidentialité et de nos conditions d'utilisation",
        },
        documents: {
            privacy: {
                intro: "Ce qui change dans la politique de confidentialité :",
                lead: (date) => `Notre politique de confidentialité change le ${date}.`,
                subject: "Mise à jour de notre politique de confidentialité",
            },
            terms: {
                intro: "Ce qui change dans les conditions d'utilisation :",
                lead: (date) => `Nos conditions d'utilisation changent le ${date}.`,
                subject: "Mise à jour de nos conditions d'utilisation",
            },
        },
        footer: (email) => `Avis de service envoyé à ${email} et à tous les comptes Outlayr.`,
        keepUsing: (date) =>
            `Si vous continuez à utiliser Outlayr à partir du ${date}, les nouvelles conditions s'appliquent. Si vous ne les acceptez pas, résiliez tout abonnement et supprimez votre compte avant cette date.`,
        link: "Lire la nouvelle version",
        preview: "Ce qui change, et à partir de quand.",
        reply: "Des questions ? Répondez à cet e-mail.",
        takesEffect: "Entrée en vigueur",
    },
    pt: {
        after: "Você não precisa fazer nada. Pode exportar ou apagar seus dados quando quiser em Ajustes.",
        both: {
            lead: (date) => `Nossa Política de Privacidade e nossos Termos de Uso mudam em ${date}.`,
            subject: "Mudanças na nossa Política de Privacidade e nos nossos Termos de Uso",
        },
        documents: {
            privacy: {
                intro: "O que muda na Política de Privacidade:",
                lead: (date) => `Nossa Política de Privacidade muda em ${date}.`,
                subject: "Mudanças na nossa Política de Privacidade",
            },
            terms: {
                intro: "O que muda nos Termos de Uso:",
                lead: (date) => `Nossos Termos de Uso mudam em ${date}.`,
                subject: "Mudanças nos nossos Termos de Uso",
            },
        },
        footer: (email) => `Aviso de serviço enviado para ${email} e todas as contas do Outlayr.`,
        keepUsing: (date) =>
            `Se você continuar usando o Outlayr a partir de ${date}, os novos termos se aplicam. Se não concordar, cancele qualquer assinatura e apague sua conta antes dessa data.`,
        link: "Ler a nova versão",
        preview: "O que muda e a partir de quando.",
        reply: "Dúvidas? Responda a este e-mail.",
        takesEffect: "Entra em vigor",
    },
} satisfies Record<Language, PolicyChangeCopy>;

const documentUrl = (document: LegalDocument, language: Language) =>
    `https://tryoutlayr.com${language === "en" ? "" : `/${language}`}/${document}`;

const announcement = (copy: PolicyChangeCopy, documents: PolicyChangeEmailProps["documents"]) =>
    documents.length === 1 && documents[0] ? copy.documents[documents[0].document] : copy.both;

export default function PolicyChangeEmail({
    documents,
    effectiveAtMs,
    email,
    language,
    timeZone,
}: PolicyChangeEmailProps) {
    const copy = COPY[language];
    const date = formatDate(effectiveAtMs, language, timeZone);
    return (
        <Note
            after={[
                copy.after,
                documents.some(({ document }) => document === "terms") ? copy.keepUsing(date) : null,
                copy.reply,
            ]
                .filter((sentence) => sentence !== null)
                .join(" ")}
            facts={[[copy.takesEffect, date]]}
            footer={copy.footer(email)}
            language={language}
            lead={announcement(copy, documents).lead(date)}
            preview={copy.preview}
            sections={documents.map(({ changes, document }) => ({
                intro: copy.documents[document].intro,
                items: changes,
                link: { href: documentUrl(document, language), label: copy.link },
            }))}
        />
    );
}

PolicyChangeEmail.PreviewProps = {
    documents: [
        {
            changes: [
                { detail: "Off unless you turn it on in Settings.", label: "Product news by email" },
                {
                    detail: "Resend sends those emails, only to people who turned them on.",
                    label: "A new service provider",
                },
            ],
            document: "privacy",
        },
        { changes: [{ detail: "Up to 12 a year, no cash value.", label: "Invites" }], document: "terms" },
    ],
    effectiveAtMs: Date.UTC(2026, 10, 15),
    email: "ana@example.com",
    language: "en",
} satisfies PolicyChangeEmailProps;

export const policyChangeEmail = (props: PolicyChangeEmailProps) =>
    renderEmail(announcement(COPY[props.language], props.documents).subject, <PolicyChangeEmail {...props} />);
