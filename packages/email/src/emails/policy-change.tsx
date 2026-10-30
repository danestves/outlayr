import { formatDate } from "../language";
import type { Language } from "../language";
import { Note, renderEmail } from "../note";
import type { NoteItem } from "../note";

export type { NoteItem } from "../note";

export type LegalDocument = "privacy" | "terms";

interface PolicyChangeEmailProps {
    changes: readonly NoteItem[];
    document: LegalDocument;
    effectiveAtMs: number;
    email: string;
    language: Language;
    timeZone?: string;
}

interface DocumentCopy {
    lead: (date: string) => string;
    name: string;
    subject: string;
}

interface PolicyChangeCopy {
    after: string;
    document: string;
    documents: Record<LegalDocument, DocumentCopy>;
    footer: (email: string) => string;
    intro: string;
    link: string;
    preview: string;
    takesEffect: string;
}

const COPY = {
    en: {
        after: "There's nothing you need to do. You can export or delete your data at any time in Settings.",
        document: "Document",
        documents: {
            privacy: {
                lead: (date) => `Our Privacy Policy changes on ${date}.`,
                name: "Privacy Policy",
                subject: "Updates to our Privacy Policy",
            },
            terms: {
                lead: (date) => `Our Terms of Use change on ${date}.`,
                name: "Terms of Use",
                subject: "Updates to our Terms of Use",
            },
        },
        footer: (email) => `A service notice sent to ${email} and every other Outlayr account.`,
        intro: "What changes:",
        link: "Read the new version",
        preview: "What changes, and when.",
        takesEffect: "Takes effect",
    },
    es: {
        after: "No tienes que hacer nada. Puedes exportar o borrar tus datos cuando quieras en Configuración.",
        document: "Documento",
        documents: {
            privacy: {
                lead: (date) => `Nuestra Política de privacidad cambia el ${date}.`,
                name: "Política de privacidad",
                subject: "Cambios en nuestra Política de privacidad",
            },
            terms: {
                lead: (date) => `Nuestros Términos de uso cambian el ${date}.`,
                name: "Términos de uso",
                subject: "Cambios en nuestros Términos de uso",
            },
        },
        footer: (email) => `Aviso de servicio enviado a ${email} y a todas las cuentas de Outlayr.`,
        intro: "Qué cambia:",
        link: "Leer la nueva versión",
        preview: "Qué cambia y desde cuándo.",
        takesEffect: "Entra en vigor",
    },
    fr: {
        after: "Vous n'avez rien à faire. Vous pouvez exporter ou supprimer vos données à tout moment dans Réglages.",
        document: "Document",
        documents: {
            privacy: {
                lead: (date) => `Notre politique de confidentialité change le ${date}.`,
                name: "Politique de confidentialité",
                subject: "Mise à jour de notre politique de confidentialité",
            },
            terms: {
                lead: (date) => `Nos conditions d'utilisation changent le ${date}.`,
                name: "Conditions d'utilisation",
                subject: "Mise à jour de nos conditions d'utilisation",
            },
        },
        footer: (email) => `Avis de service envoyé à ${email} et à tous les comptes Outlayr.`,
        intro: "Ce qui change :",
        link: "Lire la nouvelle version",
        preview: "Ce qui change, et à partir de quand.",
        takesEffect: "Entrée en vigueur",
    },
    pt: {
        after: "Você não precisa fazer nada. Pode exportar ou apagar seus dados quando quiser em Ajustes.",
        document: "Documento",
        documents: {
            privacy: {
                lead: (date) => `Nossa Política de Privacidade muda em ${date}.`,
                name: "Política de Privacidade",
                subject: "Mudanças na nossa Política de Privacidade",
            },
            terms: {
                lead: (date) => `Nossos Termos de Uso mudam em ${date}.`,
                name: "Termos de Uso",
                subject: "Mudanças nos nossos Termos de Uso",
            },
        },
        footer: (email) => `Aviso de serviço enviado para ${email} e todas as contas do Outlayr.`,
        intro: "O que muda:",
        link: "Ler a nova versão",
        preview: "O que muda e a partir de quando.",
        takesEffect: "Entra em vigor",
    },
} satisfies Record<Language, PolicyChangeCopy>;

const documentUrl = (document: LegalDocument, language: Language) =>
    `https://tryoutlayr.com${language === "es" ? "/es" : ""}/${document}`;

export default function PolicyChangeEmail({
    changes,
    document,
    effectiveAtMs,
    email,
    language,
    timeZone,
}: PolicyChangeEmailProps) {
    const copy = COPY[language];
    const legal = copy.documents[document];
    const date = formatDate(effectiveAtMs, language, timeZone);
    return (
        <Note
            after={copy.after}
            facts={[
                [copy.document, legal.name],
                [copy.takesEffect, date],
            ]}
            footer={copy.footer(email)}
            intro={copy.intro}
            items={changes}
            language={language}
            lead={legal.lead(date)}
            link={{ href: documentUrl(document, language), label: copy.link }}
            preview={copy.preview}
        />
    );
}

PolicyChangeEmail.PreviewProps = {
    changes: [
        { detail: "Off unless you turn it on in Settings.", label: "Product news by email" },
        { detail: "Resend sends those emails, only to people who turned them on.", label: "A new service provider" },
    ],
    document: "privacy",
    effectiveAtMs: Date.UTC(2026, 10, 15),
    email: "ana@example.com",
    language: "en",
} satisfies PolicyChangeEmailProps;

export const policyChangeEmail = (props: PolicyChangeEmailProps) =>
    renderEmail(COPY[props.language].documents[props.document].subject, <PolicyChangeEmail {...props} />);
