import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardEmail = {
    content: {
        address: t({ en: "Address", es: "Dirección", fr: "Adresse", pt: "Endereço" }),
        alwaysSent: t({ en: "Always sent", es: "Siempre se envían", fr: "Toujours envoyés", pt: "Sempre enviados" }),
        signIn: t({ en: "Sign-in codes", es: "Códigos de acceso", fr: "Codes de connexion", pt: "Códigos de acesso" }),
        welcome: t({
            en: "Welcome note",
            es: "Nota de bienvenida",
            fr: "Message de bienvenue",
            pt: "Nota de boas-vindas",
        }),
        billing: t({ en: "Pro and billing", es: "Pro y facturación", fr: "Pro et facturation", pt: "Pro e cobrança" }),
        policy: t({
            en: "Policy changes",
            es: "Cambios en las políticas",
            fr: "Changements de politique",
            pt: "Mudanças nas políticas",
        }),
    },
    key: "dashboard-email",
} satisfies Dictionary;

export default dashboardEmail;
