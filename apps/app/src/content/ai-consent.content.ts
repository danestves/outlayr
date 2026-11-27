import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const aiConsent = {
    content: {
        allow: t({ en: "Allow", de: "Erlauben", es: "Permitir", fr: "Autoriser", pt: "Permitir" }),
        notNow: t({ en: "Not now", de: "Nicht jetzt", es: "Ahora no", fr: "Pas maintenant", pt: "Agora não" }),
        privacy: t({
            en: "Privacy policy",
            de: "Datenschutzerklärung",
            es: "Política de privacidad",
            fr: "Politique de confidentialité",
            pt: "Política de privacidade",
        }),
        privacyHash: t({
            en: "suggestions-voice-and-receipts",
            de: "vorschläge-sprache-und-belege",
            es: "sugerencias-voz-y-recibos",
            fr: "suggestions-voix-et-tickets",
            pt: "sugestões-voz-e-recibos",
            "pt-PT": "sugestões-voz-e-talões",
        }),
        title: t({
            en: "Send data to third-party AI providers?",
            de: "Daten an KI-Anbieter von Drittanbietern senden?",
            es: "¿Enviar datos a proveedores de IA externos?",
            fr: "Envoyer des données à des fournisseurs d'IA tiers ?",
            pt: "Enviar dados a provedores de IA terceiros?",
            "pt-PT": "Enviar dados a fornecedores de IA terceiros?",
        }),
    },
    key: "ai-consent",
} satisfies Dictionary;

export default aiConsent;
