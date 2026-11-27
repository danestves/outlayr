import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const aiConsent = {
    content: {
        allow: t({
            en: "Allow",
            de: "Erlauben",
            es: "Permitir",
            fr: "Autoriser",
            pt: "Permitir",
            it: "Consenti",
            nl: "Toestaan",
            ja: "許可",
            ko: "허용",
        }),
        notNow: t({
            en: "Not now",
            de: "Nicht jetzt",
            es: "Ahora no",
            fr: "Pas maintenant",
            pt: "Agora não",
            it: "Non ora",
            nl: "Niet nu",
            ja: "今はしない",
            ko: "나중에",
        }),
        privacy: t({
            en: "Privacy policy",
            de: "Datenschutzerklärung",
            es: "Política de privacidad",
            fr: "Politique de confidentialité",
            pt: "Política de privacidade",
            it: "Informativa sulla privacy",
            nl: "Privacybeleid",
            ja: "プライバシーポリシー",
            ko: "개인정보 처리방침",
        }),
        privacyHash: t({
            en: "suggestions-voice-and-receipts",
            de: "vorschläge-sprache-und-belege",
            es: "sugerencias-voz-y-recibos",
            fr: "suggestions-voix-et-tickets",
            pt: "sugestões-voz-e-recibos",
            "pt-PT": "sugestões-voz-e-talões",
            it: "suggestions-voice-and-receipts",
            nl: "suggestions-voice-and-receipts",
            ja: "suggestions-voice-and-receipts",
            ko: "suggestions-voice-and-receipts",
        }),
        title: t({
            en: "Send data to third-party AI providers?",
            de: "Daten an KI-Anbieter von Drittanbietern senden?",
            es: "¿Enviar datos a proveedores de IA externos?",
            fr: "Envoyer des données à des fournisseurs d'IA tiers ?",
            pt: "Enviar dados a provedores de IA terceiros?",
            "pt-PT": "Enviar dados a fornecedores de IA terceiros?",
            it: "Inviare dati a provider di IA di terze parti?",
            nl: "Gegevens naar AI-aanbieders van derden sturen?",
            ja: "サードパーティのAIプロバイダーにデータを送信しますか？",
            ko: "외부 AI 제공업체에 데이터를 보낼까요?",
        }),
    },
    key: "ai-consent",
} satisfies Dictionary;

export default aiConsent;
