import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const pricing = {
    content: {
        bank: t({
            en: "Outlayr never links your bank, on any plan.",
            de: "Outlayr verbindet nie dein Bankkonto, in keinem Plan.",
            es: "Outlayr nunca se conecta a tu banco, en ningún plan.",
            pt: "O Outlayr nunca se conecta ao seu banco, em nenhum plano.",
            fr: "Outlayr ne se connecte jamais à votre banque, quelle que soit l'offre.",
        }),
        cancel: t({
            en: "Cancel anytime from your app store, or buy it once.",
            de: "Kündige jederzeit über deinen App Store oder kaufe es einmalig.",
            es: "Cancela cuando quieras desde tu tienda de apps, o cómpralo una sola vez.",
            pt: "Cancele quando quiser na sua loja de apps, ou compre uma única vez.",
            fr: "Résiliez quand vous voulez depuis votre boutique d'applications, ou achetez-le une seule fois.",
        }),
        capture: t({
            en: "A capture is one voice clip, one receipt photo, or one installment plan import of up to 5 screenshots, and needs you signed in. Typing a sentence never uses one. The free plan includes 30 captures every 30 days, and Pro includes 500.",
            de: "Eine Erfassung ist ein Sprachclip, ein Belegfoto oder ein Import von Ratenplänen mit bis zu 5 Screenshots und setzt voraus, dass du angemeldet bist. Einen Satz zu tippen verbraucht nie eine. Der Gratis-Plan enthält 30 Erfassungen alle 30 Tage, Pro enthält 500.",
            es: "Una captura es un clip de voz, una foto de un recibo o una importación de planes de cuotas de hasta 5 capturas de pantalla, y requiere que hayas iniciado sesión. Escribir una frase nunca gasta una. El plan gratis incluye 30 capturas cada 30 días, y Pro incluye 500.",
            pt: "Uma captura é um áudio de voz, uma foto de recibo ou uma importação de parcelamentos de até 5 capturas de tela, e exige que você tenha entrado na sua conta. Digitar uma frase nunca gasta uma. O plano grátis inclui 30 capturas a cada 30 dias, e o Pro inclui 500.",
            fr: "Une capture correspond à un extrait vocal, une photo de ticket ou un import d'échéanciers d'au plus 5 captures d'écran, et nécessite d'être connecté. Taper une phrase n'en consomme jamais. La formule gratuite comprend 30 captures tous les 30 jours, et Pro en comprend 500.",
        }),
        country: t({
            en: "These are US prices. Your app store shows the final price in your country before you buy.",
            de: "Das sind US-Preise. Dein App Store zeigt dir vor dem Kauf den endgültigen Preis für dein Land.",
            es: "Son precios de Estados Unidos. Tu tienda de apps te muestra el precio final de tu país antes de comprar.",
            pt: "Estes são os preços dos Estados Unidos. Sua loja de apps mostra o preço final do seu país antes da compra.",
            fr: "Ce sont les prix aux États-Unis. Votre boutique d'applications affiche le prix final de votre pays avant l'achat.",
        }),
        lead: t({
            en: "Outlayr is the expense tracker that never links your bank: log by sentence, voice, receipt or Apple Pay, in any of 165 currencies.",
            de: "Outlayr ist der Ausgaben-Tracker, der nie dein Bankkonto verbindet: Erfasse per Satz, Sprache, Beleg oder Apple Pay, in jeder von 165 Währungen.",
            es: "Outlayr es la app de gastos que nunca se conecta a tu banco: registra con una frase, tu voz, un recibo o Apple Pay, en cualquiera de 165 monedas.",
            pt: "O Outlayr é o app de gastos que nunca se conecta ao seu banco: registre por frase, voz, recibo ou Apple Pay, em qualquer uma de 165 moedas.",
            fr: "Outlayr est l'app de suivi des dépenses qui ne se connecte jamais à votre banque : saisissez par phrase, voix, ticket ou Apple Pay, dans l'une des 165 devises.",
        }),
        meta: {
            description: insert(
                t({
                    en: "Outlayr is free with no ads. Outlayr Pro costs {{monthly}} a month, {{yearly}} a year, or {{once}} once in the US. Free and Pro limits, and what a capture is.",
                    de: "Outlayr ist kostenlos und werbefrei. Outlayr Pro kostet in den USA {{monthly}} im Monat, {{yearly}} im Jahr oder {{once}} einmalig. Limits und was eine Erfassung ist.",
                    es: "Outlayr es gratis y sin anuncios. Outlayr Pro cuesta {{monthly}} al mes, {{yearly}} al año o {{once}} una sola vez en EE. UU. Límites y qué es una captura.",
                    pt: "O Outlayr é grátis e sem anúncios. O Outlayr Pro custa {{monthly}} por mês, {{yearly}} por ano ou {{once}} uma vez nos EUA. Limites e o que é uma captura.",
                    fr: "Outlayr est gratuit et sans publicité. Outlayr Pro coûte {{monthly}} par mois, {{yearly}} par an ou {{once}} une fois aux États-Unis. Limites et captures.",
                })
            ),
            title: t({
                en: "Outlayr pricing: free plan and Pro prices",
                de: "Outlayr Preise: Gratis-Plan und Pro-Preise",
                es: "Precios de Outlayr: plan gratis y precios de Pro",
                pt: "Preços do Outlayr: plano grátis e preços do Pro",
                fr: "Tarifs d'Outlayr : offre gratuite et prix de Pro",
            }),
        },
        more: t({
            en: "See full pricing",
            de: "Alle Preise ansehen",
            es: "Ver todos los precios",
            pt: "Ver todos os preços",
            fr: "Voir tous les tarifs",
        }),
        prices: insert(
            t({
                en: "Outlayr is free, with no ads on any plan. Outlayr Pro costs {{monthly}} a month, {{yearly}} a year with 7 days free, or {{once}} once.",
                de: "Outlayr ist kostenlos und hat in keinem Plan Werbung. Outlayr Pro kostet {{monthly}} im Monat, {{yearly}} im Jahr mit 7 Tagen gratis, oder {{once}} einmalig.",
                es: "Outlayr es gratis y no tiene anuncios en ningún plan. Outlayr Pro cuesta {{monthly}} al mes, {{yearly}} al año con 7 días gratis, o {{once}} una sola vez.",
                pt: "O Outlayr é grátis e não tem anúncios em nenhum plano. O Outlayr Pro custa {{monthly}} por mês, {{yearly}} por ano com 7 dias grátis, ou {{once}} uma única vez.",
                fr: "Outlayr est gratuit et sans publicité, quelle que soit l'offre. Outlayr Pro coûte {{monthly}} par mois, {{yearly}} par an avec 7 jours gratuits, ou {{once}} une seule fois.",
            })
        ),
        title: t({
            en: "Outlayr pricing",
            de: "Outlayr Preise",
            es: "Precios de Outlayr",
            pt: "Preços do Outlayr",
            fr: "Tarifs d'Outlayr",
        }),
    },
    key: "pricing",
} satisfies Dictionary;

export default pricing;
