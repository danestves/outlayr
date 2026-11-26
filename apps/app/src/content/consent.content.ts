import { t } from "intlayer";
import type { Dictionary } from "intlayer";

export default {
    content: {
        allow: t({ en: "Allow", de: "Erlauben", es: "Permitir", pt: "Permitir", fr: "Autoriser" }),
        anchor: t({
            en: "this-website",
            de: "diese-website",
            es: "este-sitio-web",
            pt: "este-site",
            fr: "ce-site-web",
        }),
        body: t({
            en: "A cookie lets us count repeat visits and see which pages help. While you’re signed in, what you do here is also linked to your account.",
            de: "Mit einem Cookie zählen wir wiederkehrende Besuche und sehen, welche Seiten helfen. Solange du angemeldet bist, wird auch das, was du hier tust, mit deinem Konto verknüpft.",
            es: "Una cookie nos permite contar las visitas que vuelven y ver qué páginas ayudan. Mientras tengas la sesión iniciada, lo que haces aquí también se vincula con tu cuenta.",
            pt: "Um cookie nos permite contar as visitas que voltam e ver quais páginas ajudam. Enquanto você estiver conectado, o que você faz aqui também fica vinculado à sua conta.",
            "pt-PT":
                "Um cookie permite-nos contar as visitas que regressam e ver que páginas ajudam. Enquanto tiver sessão iniciada, o que faz aqui também fica associado à sua conta.",
            fr: "Un cookie nous permet de compter les visites récurrentes et de voir quelles pages sont utiles. Tant que vous êtes connecté, ce que vous faites ici est aussi lié à votre compte.",
        }),
        decline: t({ en: "Decline", de: "Ablehnen", es: "Rechazar", pt: "Recusar", fr: "Refuser" }),
        label: "Cookies",
        privacy: t({ en: "Privacy", de: "Datenschutz", es: "Privacidad", pt: "Privacidade", fr: "Confidentialité" }),
    },
    key: "consent",
} satisfies Dictionary;
