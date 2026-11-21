import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const story = {
    content: {
        faqLead: t({
            en: "Something missing?",
            de: "Fehlt etwas?",
            es: "¿Falta algo?",
            pt: "Faltou alguma coisa?",
            fr: "Il manque quelque chose ?",
        }),
        faqSupport: t({
            en: "Write to support",
            de: "Schreib dem Support",
            es: "Escribe a soporte",
            pt: "Escreva para o suporte",
            fr: "Écrivez au support",
        }),
        pricing: {
            label: t({ en: "Pricing", de: "Preise", es: "Precios", pt: "Preços", fr: "Tarifs" }),
            lead: t({
                en: "The tracker is free and has no ads. Pro lifts the limits and adds sync. Cancel anytime from your app store, or buy it once.",
                de: "Der Tracker ist kostenlos und hat keine Werbung. Pro hebt die Grenzen an und bringt die Synchronisierung dazu. Kündige jederzeit über deinen App Store oder kaufe es einmalig.",
                es: "La app es gratis y no tiene anuncios. Pro quita los límites y agrega la sincronización. Cancela cuando quieras desde tu tienda de apps, o cómpralo una sola vez.",
                pt: "O app é grátis e não tem anúncios. O Pro tira os limites e adiciona a sincronização. Cancele quando quiser na sua loja de apps, ou compre uma única vez.",
                fr: "L'app est gratuite et sans publicité. Pro lève les limites et ajoute la synchronisation. Résiliez quand vous voulez depuis votre boutique d'applications, ou achetez-le une seule fois.",
            }),
            localNote: insert(
                t({
                    en: "Prices for {{country}}. Your app store shows the final price.",
                    de: "Preise für {{country}}. Dein App Store zeigt den endgültigen Preis.",
                    es: "Precios para {{country}}. Tu tienda de apps muestra el precio final.",
                    pt: "Preços para {{country}}. Sua loja de apps mostra o preço final.",
                    fr: "Prix pour {{country}}. Votre boutique d'applications affiche le prix final.",
                })
            ),
            month: t({ en: "a month", de: "im Monat", es: "al mes", pt: "por mês", fr: "par mois" }),
            note: t({
                en: "US prices. Your app store shows the price for your country.",
                de: "US-Preise. Dein App Store zeigt den Preis für dein Land.",
                es: "Precios de Estados Unidos. Tu tienda de apps muestra el precio de tu país.",
                pt: "Preços dos Estados Unidos. Sua loja de apps mostra o preço do seu país.",
                fr: "Prix aux États-Unis. Votre boutique d'applications affiche le prix de votre pays.",
            }),
            other: insert(
                t({
                    en: "Or {{yearly}} a year, or {{once}} once.",
                    de: "Oder {{yearly}} im Jahr, oder {{once}} einmalig.",
                    es: "O {{yearly}} al año, o {{once}} una sola vez.",
                    pt: "Ou {{yearly}} por ano, ou {{once}} uma única vez.",
                    fr: "Ou {{yearly}} par an, ou {{once}} une seule fois.",
                })
            ),
            trial: t({
                en: "3 days free on yearly",
                de: "3 Tage gratis beim Jahresabo",
                es: "3 días gratis en el plan anual",
                pt: "3 dias grátis no plano anual",
                fr: "3 jours gratuits sur l'offre annuelle",
            }),
            title: t({
                en: "Free to start. Pro when you want more",
                de: "Zum Start kostenlos. Pro, wenn du mehr willst",
                es: "Gratis para empezar. Pro cuando quieras más",
                pt: "Grátis para começar. Pro quando quiser mais",
                fr: "Gratuit pour commencer. Pro quand il vous en faut plus",
            }),
        },
    },
    key: "story",
} satisfies Dictionary;

export default story;
