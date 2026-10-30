import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const policyNotice = {
    content: {
        "policyNotice.accept": t({
            en: "Using Outlayr from that date means you accept these changes.",
            es: "Si sigues usando Outlayr desde esa fecha, aceptas estos cambios.",
            fr: "Utiliser Outlayr à partir de cette date vaut acceptation de ces changements.",
            pt: "Usar o Outlayr a partir dessa data significa aceitar essas mudanças.",
            "pt-PT": "Usar o Outlayr a partir dessa data significa aceitar estas alterações.",
        }),
        "policyNotice.meta": t({
            en: "Takes effect · {date}",
            es: "Entra en vigor · {date}",
            fr: "Entrée en vigueur · {date}",
            pt: "Entra em vigor · {date}",
        }),
        "policyNotice.ok": t({
            en: "Got it",
            es: "Entendido",
            fr: "Compris",
            pt: "Entendi",
            "pt-PT": "Percebi",
        }),
        "policyNotice.privacy": t({
            en: "Updates to our Privacy Policy",
            es: "Cambios en nuestra Política de privacidad",
            fr: "Mise à jour de notre politique de confidentialité",
            pt: "Mudanças na nossa Política de Privacidade",
        }),
        "policyNotice.read": t({
            en: "Read the new version",
            es: "Leer la nueva versión",
            fr: "Lire la nouvelle version",
            pt: "Ler a nova versão",
        }),
        "policyNotice.terms": t({
            en: "Updates to our Terms of Use",
            es: "Cambios en nuestros Términos de uso",
            fr: "Mise à jour de nos conditions d'utilisation",
            pt: "Mudanças nos nossos Termos de Uso",
        }),
    },
    key: "policy-notice" as const,
} satisfies Dictionary;

export default policyNotice;
