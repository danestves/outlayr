import { formatDate } from "../language";
import type { Language } from "../language";
import { Note, renderEmail } from "../note";

interface Price {
    amount: number;
    currency: string;
}

interface TrialEndingEmailProps {
    chargeAtMs: number;
    email: string;
    language: Language;
    manageUrl: string;
    price: Price | null;
    timeZone?: string;
}

interface TrialEndingCopy {
    after: string;
    amount: string;
    billedBy: string;
    firstCharge: string;
    footer: (email: string) => string;
    intro: string;
    lead: string;
    manage: string;
    perYear: (price: string) => string;
    preview: string;
    subject: (date: string) => string;
}

const COPY = {
    en: {
        after: "If you cancel, Pro stays on until the trial ends.",
        amount: "Amount",
        billedBy: "Billed by",
        firstCharge: "First charge",
        footer: (email) => `Sent to ${email} because this account started an Outlayr Pro free trial.`,
        intro: "To keep Pro, there's nothing to do. To stop it, cancel before then and you won't pay.",
        lead: "Your Outlayr Pro trial ends in two days.",
        manage: "Manage plan",
        perYear: (price) => `${price} / year`,
        preview: "When the first charge comes, and how to cancel before it.",
        subject: (date) => `Your Outlayr Pro trial ends on ${date}`,
    },
    es: {
        after: "Si cancelas, Pro sigue activo hasta que termine la prueba.",
        amount: "Monto",
        billedBy: "Cobrado por",
        firstCharge: "Primer cobro",
        footer: (email) => `Enviado a ${email} porque esta cuenta empezó una prueba gratis de Outlayr Pro.`,
        intro: "Para seguir con Pro, no tienes que hacer nada. Para dejarlo, cancela antes de esa fecha y no pagas.",
        lead: "Tu prueba de Outlayr Pro termina en dos días.",
        manage: "Gestionar plan",
        perYear: (price) => `${price} / año`,
        preview: "Cuándo llega el primer cobro y cómo cancelar antes.",
        subject: (date) => `Tu prueba de Outlayr Pro termina el ${date}`,
    },
    fr: {
        after: "Si vous résiliez, Pro reste actif jusqu'à la fin de l'essai.",
        amount: "Montant",
        billedBy: "Facturé par",
        firstCharge: "Premier paiement",
        footer: (email) => `Envoyé à ${email} parce que ce compte a commencé un essai gratuit d'Outlayr Pro.`,
        intro: "Pour garder Pro, vous n'avez rien à faire. Pour l'arrêter, résiliez avant cette date et vous ne paierez rien.",
        lead: "Votre essai d'Outlayr Pro se termine dans deux jours.",
        manage: "Gérer la formule",
        perYear: (price) => `${price} / an`,
        preview: "Quand arrive le premier paiement, et comment résilier avant.",
        subject: (date) => `Votre essai d'Outlayr Pro se termine le ${date}`,
    },
    pt: {
        after: "Se você cancelar, o Pro continua ativo até o fim do teste.",
        amount: "Valor",
        billedBy: "Cobrado por",
        firstCharge: "Primeira cobrança",
        footer: (email) => `Enviado para ${email} porque esta conta começou um teste grátis do Outlayr Pro.`,
        intro: "Para manter o Pro, não precisa fazer nada. Para parar, cancele antes dessa data e você não paga.",
        lead: "Seu teste do Outlayr Pro termina em dois dias.",
        manage: "Gerenciar plano",
        perYear: (price) => `${price} / ano`,
        preview: "Quando vem a primeira cobrança e como cancelar antes.",
        subject: (date) => `Seu teste do Outlayr Pro termina em ${date}`,
    },
} satisfies Record<Language, TrialEndingCopy>;

const money = ({ amount, currency }: Price, language: Language) =>
    new Intl.NumberFormat(language, { currency, style: "currency" }).format(amount);

export default function TrialEndingEmail({
    chargeAtMs,
    email,
    language,
    manageUrl,
    price,
    timeZone,
}: TrialEndingEmailProps) {
    const copy = COPY[language];
    const date = formatDate(chargeAtMs, language, timeZone);
    const facts: [string, string][] = [[copy.firstCharge, date]];
    if (price !== null) {
        facts.push([copy.amount, copy.perYear(money(price, language))]);
    }
    facts.push([copy.billedBy, "Stripe"]);
    return (
        <Note
            after={copy.after}
            facts={facts}
            footer={copy.footer(email)}
            language={language}
            lead={copy.lead}
            preview={copy.preview}
            sections={[{ intro: copy.intro, items: [], link: { href: manageUrl, label: copy.manage } }]}
        />
    );
}

TrialEndingEmail.PreviewProps = {
    chargeAtMs: Date.UTC(2027, 0, 17),
    email: "ana@example.com",
    language: "en",
    manageUrl: "https://tryoutlayr.com/app/settings/plan",
    price: { amount: 49.99, currency: "USD" },
} satisfies TrialEndingEmailProps;

export const trialEndingEmail = (props: TrialEndingEmailProps) =>
    renderEmail(
        COPY[props.language].subject(formatDate(props.chargeAtMs, props.language, props.timeZone)),
        <TrialEndingEmail {...props} />
    );
