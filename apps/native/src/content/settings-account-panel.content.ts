import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsAccountPanel = {
    content: {
        "settings.panel.capturesLeft": t({
            en: "Captures left",
            es: "Capturas restantes",
            fr: "Captures restantes",
            pt: "Capturas restantes",
        }),
        "settings.panel.goPro": t({
            en: "Go Pro",
            es: "Hazte Pro",
            fr: "Passer à Pro",
            pt: "Seja Pro",
        }),
        "settings.panel.plan": t({
            en: "Plan",
            es: "Plan",
            fr: "Formule",
            pt: "Plano",
        }),
        "settings.panel.signedInApple": t({
            en: "Signed in with Apple",
            es: "Sesión iniciada con Apple",
            fr: "Connecté avec Apple",
            pt: "Conectado com Apple",
            "pt-PT": "Sessão iniciada com Apple",
        }),
        "settings.panel.signedInGoogle": t({
            en: "Signed in with Google",
            es: "Sesión iniciada con Google",
            fr: "Connecté avec Google",
            pt: "Conectado com Google",
            "pt-PT": "Sessão iniciada com Google",
        }),
        "settings.panel.signedOutDetail": t({
            en: "Ledger lives on this phone",
            es: "Tu registro vive en este celular",
            "es-ES": "Tu registro vive en este móvil",
            fr: "Le journal reste sur ce téléphone",
            pt: "Seus lançamentos ficam neste celular",
            "pt-PT": "Os seus registos ficam neste telemóvel",
        }),
        "settings.panel.signInToSync": t({
            en: "Sign in to sync",
            es: "Inicia sesión para sincronizar",
            fr: "Connectez-vous pour synchroniser",
            pt: "Entre para sincronizar",
            "pt-PT": "Inicie sessão para sincronizar",
        }),
        "settings.panel.syncedDays": t({
            en: "{count} d ago",
            es: "hace {count} d",
            fr: "il y a {count} j",
            pt: "há {count} d",
        }),
        "settings.panel.syncedHours": t({
            en: "{count} h ago",
            es: "hace {count} h",
            fr: "il y a {count} h",
            pt: "há {count} h",
        }),
        "settings.panel.syncedMinutes": t({
            en: "{count} min ago",
            es: "hace {count} min",
            fr: "il y a {count} min",
            pt: "há {count} min",
        }),
        "settings.panel.syncedNow": t({
            en: "Just now",
            es: "Ahora mismo",
            fr: "À l'instant",
            pt: "Agora mesmo",
        }),
    },
    key: "settings-account-panel" as const,
} satisfies Dictionary;

export default settingsAccountPanel;
