import { t } from "intlayer";
import type { Dictionary } from "intlayer";

export default {
    content: {
        allow: t({ en: "Allow", es: "Permitir", pt: "Permitir", fr: "Autoriser" }),
        anchor: t({ en: "this-website", es: "este-sitio-web", pt: "this-website", fr: "this-website" }),
        body: t({
            en: "A cookie lets us count repeat visits and see which pages help.",
            es: "Una cookie nos permite contar las visitas que vuelven y ver qué páginas ayudan.",
            pt: "Um cookie nos permite contar as visitas que voltam e ver quais páginas ajudam.",
            fr: "Un cookie nous permet de compter les visites récurrentes et de voir quelles pages sont utiles.",
        }),
        decline: t({ en: "Decline", es: "Rechazar", pt: "Recusar", fr: "Refuser" }),
        label: "Cookies",
        privacy: t({ en: "Privacy", es: "Privacidad", pt: "Privacidade", fr: "Confidentialité" }),
    },
    key: "consent",
} satisfies Dictionary;
