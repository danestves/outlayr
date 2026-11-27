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
    keepUsing: string;
    link: string;
    preview: string;
    reply: string;
    takesEffect: string;
}

const COPY = {
    en: {
        after: "There's nothing you need to do. You can export your data or delete your account at any time in Settings.",
        both: {
            lead: (date) => `Our Privacy Policy and Terms of Use have changed. The new versions apply from ${date}.`,
            subject: "Updates to our Privacy Policy and Terms of Use",
        },
        documents: {
            privacy: {
                intro: "What changed in the Privacy Policy:",
                lead: (date) => `Our Privacy Policy has changed. The new version applies from ${date}.`,
                subject: "Updates to our Privacy Policy",
            },
            terms: {
                intro: "What changed in the Terms of Use:",
                lead: (date) => `Our Terms of Use have changed. The new version applies from ${date}.`,
                subject: "Updates to our Terms of Use",
            },
        },
        footer: (email) => `A service notice sent to ${email} and every other Outlayr account.`,
        keepUsing:
            "By continuing to use Outlayr, you accept the new Terms of Use and Privacy Policy. If you don't agree, cancel any subscription and delete your account.",
        link: "Read the new version",
        preview: "What changed, and from when.",
        reply: "Questions? Reply to this email.",
        takesEffect: "In effect from",
    },
    de: {
        after: "Du musst nichts tun. Du kannst jederzeit in den Einstellungen deine Daten exportieren oder dein Konto löschen.",
        both: {
            lead: (date) =>
                `Wir haben unsere Datenschutzerklärung und unsere Nutzungsbedingungen geändert. Die neuen Fassungen gelten ab dem ${date}.`,
            subject: "Änderungen an unserer Datenschutzerklärung und unseren Nutzungsbedingungen",
        },
        documents: {
            privacy: {
                intro: "Was sich in der Datenschutzerklärung geändert hat:",
                lead: (date) => `Wir haben unsere Datenschutzerklärung geändert. Die neue Fassung gilt ab dem ${date}.`,
                subject: "Änderungen an unserer Datenschutzerklärung",
            },
            terms: {
                intro: "Was sich in den Nutzungsbedingungen geändert hat:",
                lead: (date) => `Wir haben unsere Nutzungsbedingungen geändert. Die neue Fassung gilt ab dem ${date}.`,
                subject: "Änderungen an unseren Nutzungsbedingungen",
            },
        },
        footer: (email) => `Ein Servicehinweis, gesendet an ${email} und an alle anderen Outlayr-Konten.`,
        keepUsing:
            "Wenn du Outlayr weiter nutzt, akzeptierst du die neuen Nutzungsbedingungen und die neue Datenschutzerklärung. Wenn du nicht einverstanden bist, kündige jedes Abo und lösche dein Konto.",
        link: "Neue Fassung lesen",
        preview: "Was sich geändert hat und ab wann.",
        reply: "Fragen? Antworte auf diese E-Mail.",
        takesEffect: "Gilt ab",
    },
    es: {
        after: "No tienes que hacer nada. Puedes exportar tus datos o eliminar tu cuenta cuando quieras en Configuración.",
        both: {
            lead: (date) =>
                `Actualizamos nuestra Política de privacidad y nuestros Términos de uso. Las nuevas versiones aplican desde el ${date}.`,
            subject: "Cambios en nuestra Política de privacidad y nuestros Términos de uso",
        },
        documents: {
            privacy: {
                intro: "Qué cambió en la Política de privacidad:",
                lead: (date) =>
                    `Actualizamos nuestra Política de privacidad. La nueva versión aplica desde el ${date}.`,
                subject: "Cambios en nuestra Política de privacidad",
            },
            terms: {
                intro: "Qué cambió en los Términos de uso:",
                lead: (date) => `Actualizamos nuestros Términos de uso. La nueva versión aplica desde el ${date}.`,
                subject: "Cambios en nuestros Términos de uso",
            },
        },
        footer: (email) => `Aviso de servicio enviado a ${email} y a todas las cuentas de Outlayr.`,
        keepUsing:
            "Si sigues usando Outlayr, aceptas los nuevos Términos de uso y la nueva Política de privacidad. Si no estás de acuerdo, cancela cualquier suscripción y elimina tu cuenta.",
        link: "Leer la nueva versión",
        preview: "Qué cambió y desde cuándo.",
        reply: "¿Preguntas? Responde a este correo.",
        takesEffect: "Vigente desde",
    },
    fr: {
        after: "Vous n'avez rien à faire. Vous pouvez exporter vos données ou supprimer votre compte à tout moment dans Réglages.",
        both: {
            lead: (date) =>
                `Nous avons mis à jour notre politique de confidentialité et nos conditions d'utilisation. Les nouvelles versions s'appliquent à partir du ${date}.`,
            subject: "Mise à jour de notre politique de confidentialité et de nos conditions d'utilisation",
        },
        documents: {
            privacy: {
                intro: "Ce qui a changé dans la politique de confidentialité :",
                lead: (date) =>
                    `Nous avons mis à jour notre politique de confidentialité. La nouvelle version s'applique à partir du ${date}.`,
                subject: "Mise à jour de notre politique de confidentialité",
            },
            terms: {
                intro: "Ce qui a changé dans les conditions d'utilisation :",
                lead: (date) =>
                    `Nous avons mis à jour nos conditions d'utilisation. La nouvelle version s'applique à partir du ${date}.`,
                subject: "Mise à jour de nos conditions d'utilisation",
            },
        },
        footer: (email) => `Avis de service envoyé à ${email} et à tous les comptes Outlayr.`,
        keepUsing:
            "En continuant à utiliser Outlayr, vous acceptez les nouvelles Conditions d'utilisation et la nouvelle Politique de confidentialité. Si vous ne les acceptez pas, résiliez tout abonnement et supprimez votre compte.",
        link: "Lire la nouvelle version",
        preview: "Ce qui a changé, et à partir de quand.",
        reply: "Des questions ? Répondez à cet e-mail.",
        takesEffect: "En vigueur depuis",
    },
    pt: {
        after: "Você não precisa fazer nada. Pode exportar seus dados ou apagar sua conta quando quiser em Ajustes.",
        both: {
            lead: (date) =>
                `Atualizamos nossa Política de Privacidade e nossos Termos de Uso. As novas versões valem a partir de ${date}.`,
            subject: "Mudanças na nossa Política de Privacidade e nos nossos Termos de Uso",
        },
        documents: {
            privacy: {
                intro: "O que mudou na Política de Privacidade:",
                lead: (date) => `Atualizamos nossa Política de Privacidade. A nova versão vale a partir de ${date}.`,
                subject: "Mudanças na nossa Política de Privacidade",
            },
            terms: {
                intro: "O que mudou nos Termos de Uso:",
                lead: (date) => `Atualizamos nossos Termos de Uso. A nova versão vale a partir de ${date}.`,
                subject: "Mudanças nos nossos Termos de Uso",
            },
        },
        footer: (email) => `Aviso de serviço enviado para ${email} e todas as contas do Outlayr.`,
        keepUsing:
            "Ao continuar usando o Outlayr, você aceita os novos Termos de uso e a nova Política de privacidade. Se não concordar, cancele qualquer assinatura e apague sua conta.",
        link: "Ler a nova versão",
        preview: "O que mudou e a partir de quando.",
        reply: "Dúvidas? Responda a este e-mail.",
        takesEffect: "Em vigor desde",
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
            after={[copy.after, copy.keepUsing, copy.reply].join(" ")}
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
