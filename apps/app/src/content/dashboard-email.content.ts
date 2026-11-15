import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardEmail = {
    content: {
        address: t({ en: "Address", de: "Adresse", es: "Dirección", fr: "Adresse", pt: "Endereço" }),
        alwaysSent: t({
            en: "Always sent",
            de: "Wird immer gesendet",
            es: "Siempre se envían",
            fr: "Toujours envoyés",
            pt: "Sempre enviados",
        }),
        signIn: t({
            en: "Sign-in codes",
            de: "Anmeldecodes",
            es: "Códigos de acceso",
            fr: "Codes de connexion",
            pt: "Códigos de acesso",
        }),
        welcome: t({
            en: "Welcome note",
            de: "Willkommensnachricht",
            es: "Nota de bienvenida",
            fr: "Message de bienvenue",
            pt: "Nota de boas-vindas",
        }),
        billing: t({
            en: "Pro and billing",
            de: "Pro und Abrechnung",
            es: "Pro y facturación",
            fr: "Pro et facturation",
            pt: "Pro e cobrança",
        }),
        policy: t({
            en: "Policy changes",
            de: "Änderungen der Richtlinien",
            es: "Cambios en las políticas",
            fr: "Changements de politique",
            pt: "Mudanças nas políticas",
        }),
    },
    key: "dashboard-email",
} satisfies Dictionary;

export default dashboardEmail;
