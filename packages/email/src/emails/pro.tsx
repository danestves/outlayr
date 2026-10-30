import { billing } from "../billing";
import type { Billing, Entitlement, StoreName } from "../billing";
import { formatDate } from "../language";
import type { Language } from "../language";
import { Note, renderEmail } from "../note";
import type { NoteItem, NoteProps } from "../note";

interface ProEmailProps extends Entitlement {
    email: string;
    language: Language;
    timeZone?: string;
}

interface ProCopy {
    after: {
        family: string;
        granted: string;
        lifetime: (store: StoreName) => string;
        subscription: (store: StoreName, date: string) => string;
    };
    billedBy: string;
    ends: string;
    familySharing: string;
    footer: (email: string) => string;
    intro: string;
    items: readonly NoteItem[];
    lead: string;
    lifetime: string;
    manage: string;
    plan: string;
    preview: string;
    renews: string;
    subject: string;
}

const COPY = {
    en: {
        after: {
            family: "Your family organizer manages the subscription.",
            granted: "There's nothing to cancel.",
            lifetime: (store) => `${store} sends the receipt. It's a one-time purchase, so there's nothing to cancel.`,
            subscription: (store, date) =>
                `${store} sends the receipt. Cancel any time before ${date} and Pro stays on until then.`,
        },
        billedBy: "Billed by",
        ends: "Ends",
        familySharing: "Family Sharing",
        footer: (email) => `Sent to ${email} because this account has Outlayr Pro.`,
        intro: "Here's what it turns on:",
        items: [
            { label: "Everything logs itself" },
            { label: "Sync with your other phone" },
            { label: "Every currency together" },
            { label: "Every installment plan" },
        ],
        lead: "Outlayr Pro is on.",
        lifetime: "Lifetime",
        manage: "Manage subscription",
        plan: "Plan",
        preview: "What Pro turns on, and how to manage it.",
        renews: "Renews",
        subject: "Outlayr Pro is on",
    },
    es: {
        after: {
            family: "Quien organiza tu familia gestiona la suscripción.",
            granted: "No hay nada que cancelar.",
            lifetime: (store) => `${store} te envía el recibo. Es un pago único, así que no hay nada que cancelar.`,
            subscription: (store, date) =>
                `${store} te envía el recibo. Cancela cuando quieras antes del ${date} y Pro sigue activo hasta entonces.`,
        },
        billedBy: "Cobrado por",
        ends: "Termina",
        familySharing: "Compartido en familia",
        footer: (email) => `Enviado a ${email} porque esta cuenta tiene Outlayr Pro.`,
        intro: "Esto es lo que activa:",
        items: [
            { label: "Todo se registra solo" },
            { label: "Sincroniza con tu otro teléfono" },
            { label: "Todas las monedas juntas" },
            { label: "Todos tus planes de cuotas" },
        ],
        lead: "Outlayr Pro está activo.",
        lifetime: "De por vida",
        manage: "Gestionar suscripción",
        plan: "Plan",
        preview: "Lo que activa Pro y cómo gestionarlo.",
        renews: "Se renueva",
        subject: "Outlayr Pro está activo",
    },
    fr: {
        after: {
            family: "L'organisateur de votre famille gère l'abonnement.",
            granted: "Il n'y a rien à résilier.",
            lifetime: (store) => `${store} vous envoie le reçu. C'est un achat unique, il n'y a donc rien à résilier.`,
            subscription: (store, date) =>
                `${store} vous envoie le reçu. Résiliez quand vous voulez avant le ${date} et Pro reste actif jusque-là.`,
        },
        billedBy: "Facturé par",
        ends: "Fin",
        familySharing: "Partage familial",
        footer: (email) => `Envoyé à ${email} parce que ce compte a Outlayr Pro.`,
        intro: "Voici ce qu'il active :",
        items: [
            { label: "Tout se saisit tout seul" },
            { label: "Synchronisé avec votre autre téléphone" },
            { label: "Toutes les devises ensemble" },
            { label: "Tous vos paiements échelonnés" },
        ],
        lead: "Outlayr Pro est activé.",
        lifetime: "À vie",
        manage: "Gérer l'abonnement",
        plan: "Formule",
        preview: "Ce que Pro active, et comment le gérer.",
        renews: "Renouvellement",
        subject: "Outlayr Pro est activé",
    },
    pt: {
        after: {
            family: "Quem organiza sua família gerencia a assinatura.",
            granted: "Não há nada para cancelar.",
            lifetime: (store) =>
                `A loja (${store}) envia o recibo. É uma compra única, então não há nada para cancelar.`,
            subscription: (store, date) =>
                `A loja (${store}) envia o recibo. Cancele quando quiser antes de ${date} e o Pro continua ativo até lá.`,
        },
        billedBy: "Cobrado por",
        ends: "Termina em",
        familySharing: "Compartilhamento familiar",
        footer: (email) => `Enviado para ${email} porque esta conta tem o Outlayr Pro.`,
        intro: "Isto é o que ele ativa:",
        items: [
            { label: "Tudo se registra sozinho" },
            { label: "Sincronize com seu outro celular" },
            { label: "Todas as moedas juntas" },
            { label: "Todos os seus parcelamentos" },
        ],
        lead: "O Outlayr Pro está ativo.",
        lifetime: "Vitalício",
        manage: "Gerenciar assinatura",
        plan: "Plano",
        preview: "O que o Pro ativa e como gerenciar.",
        renews: "Renova em",
        subject: "O Outlayr Pro está ativo",
    },
} satisfies Record<Language, ProCopy>;

type Details = Pick<NoteProps, "after" | "facts" | "link">;

function details(plan: Billing, copy: ProCopy, date: (ms: number) => string): Details {
    switch (plan.kind) {
        case "subscription": {
            return {
                after: copy.after.subscription(plan.storeName, date(plan.renewsAtMs)),
                facts: [
                    [copy.renews, date(plan.renewsAtMs)],
                    [copy.billedBy, plan.storeName],
                ],
                link: { href: plan.manageUrl, label: copy.manage },
            };
        }
        case "lifetime": {
            return {
                after: copy.after.lifetime(plan.storeName),
                facts: [
                    [copy.plan, copy.lifetime],
                    [copy.billedBy, plan.storeName],
                ],
            };
        }
        case "family": {
            return { after: copy.after.family, facts: [[copy.plan, copy.familySharing]] };
        }
        case "granted": {
            return {
                after: copy.after.granted,
                facts: plan.endsAtMs === undefined ? [] : [[copy.ends, date(plan.endsAtMs)]],
            };
        }
        default: {
            const unhandled: never = plan;
            throw new Error(`Unhandled billing: ${JSON.stringify(unhandled)}`);
        }
    }
}

export default function ProEmail({ email, language, timeZone, ...entitlement }: ProEmailProps) {
    const copy = COPY[language];
    return (
        <Note
            {...details(billing(entitlement), copy, (ms) => formatDate(ms, language, timeZone))}
            footer={copy.footer(email)}
            intro={copy.intro}
            items={copy.items}
            language={language}
            lead={copy.lead}
            preview={copy.preview}
        />
    );
}

ProEmail.PreviewProps = {
    email: "ana@example.com",
    expiresAtMs: Date.UTC(2027, 9, 30),
    familyShared: false,
    language: "en",
    productId: "outlayr_pro_yearly",
    store: "APP_STORE",
} satisfies ProEmailProps;

export const proEmail = (props: ProEmailProps) => renderEmail(COPY[props.language].subject, <ProEmail {...props} />);
