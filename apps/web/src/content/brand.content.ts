import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const brand = {
    content: {
        claims: {
            columns: {
                claim: t({ en: "Claim", es: "Afirmación" }),
                verdict: t({ en: "OK to say?", es: "¿Se puede decir?" }),
            },
            price: {
                claim: insert(
                    t({
                        en: "Free to start, with no ads. Pro is {{monthly}} a month, {{yearly}} a year, or {{once}} once",
                        es: "Es gratis para empezar y no tiene anuncios. Pro cuesta {{monthly}} al mes, {{yearly}} al año o {{once}} una sola vez",
                    })
                ),
                verdict: t({
                    en: "Yes, US prices. Add that prices vary by country",
                    es: "Sí, son precios de EE. UU. Aclara que varían según el país",
                }),
            },
            rows: [
                {
                    claim: t({
                        en: "Log a purchase by typing one sentence, saying it, or scanning the receipt",
                        es: "Registras una compra escribiendo una oración, diciéndola o escaneando el recibo",
                    }),
                    ok: true,
                    verdict: t({ en: "Yes", es: "Sí" }),
                },
                {
                    claim: t({
                        en: "Your entries stay on your phone unless you turn on sync",
                        es: "Tus registros se quedan en tu celular a menos que actives la sincronización",
                    }),
                    ok: true,
                    verdict: t({ en: "Yes", es: "Sí" }),
                },
                {
                    claim: t({
                        en: "Apple Pay purchases log themselves",
                        es: "Las compras con Apple Pay se registran solas",
                    }),
                    ok: true,
                    verdict: t({
                        en: "Yes, on iPhone with a Shortcuts automation",
                        es: "Sí, en iPhone con una automatización de Atajos",
                    }),
                },
                {
                    claim: t({ en: "Connects to your bank account", es: "Se conecta a tu cuenta bancaria" }),
                    ok: false,
                    verdict: t({
                        en: "No. Outlayr never links bank accounts",
                        es: "No. Outlayr nunca conecta cuentas bancarias",
                    }),
                },
                {
                    claim: t({ en: "Gives financial advice", es: "Da asesoría financiera" }),
                    ok: false,
                    verdict: t({ en: "No", es: "No" }),
                },
            ],
            title: t({ en: "Claims check", es: "Qué se puede decir" }),
        },
        colors: {
            lead: t({
                en: "Ink and white carry almost everything. Vermilion is the one accent. Green and red only mean money in and out.",
                es: "La tinta y el blanco cargan casi todo. El bermellón es el único acento. El verde y el rojo solo significan dinero que entra y sale.",
            }),
            names: {
                income: t({ en: "Income", es: "Ingreso" }),
                ink: t({ en: "Ink", es: "Tinta" }),
                night: t({ en: "Night", es: "Noche" }),
                spend: t({ en: "Spend", es: "Gasto" }),
                vermilion: t({ en: "Vermilion", es: "Bermellón" }),
                white: t({ en: "White", es: "Blanco" }),
            },
            title: t({ en: "Colors and type", es: "Colores y tipografía" }),
            type: t({
                en: "Geist for words, Geist Mono for every amount. Both are free on Google Fonts.",
                es: "Geist para las palabras y Geist Mono para cada monto. Las dos son gratis en Google Fonts.",
            }),
        },
        contact: {
            action: t({ en: "Email us", es: "Escríbenos" }),
            label: t({ en: "Need something else?", es: "¿Necesitas algo más?" }),
        },
        download: t({ en: "Download everything", es: "Descargar todo" }),
        files: {
            appIcon: t({ en: "App icon", es: "Ícono de la app" }),
            broll: t({ en: "B-roll", es: "B-roll" }),
            brollLead: t({
                en: "Short animated clips of the app, silent, ready to cut into your edit. Square 1080 × 1080 at 60 fps, plus one vertical 1080 × 1920 cut for Shorts and Reels.",
                es: "Clips animados cortos de la app, sin audio, listos para tu edición. Cuadrados de 1080 × 1080 a 60 fps, y un corte vertical de 1080 × 1920 para Shorts y Reels.",
            }),
            clips: {
                capture: t({ en: "Logging an entry", es: "Registrar un gasto" }),
                chaos: t({ en: "Money in layers", es: "El dinero en capas" }),
                month: t({ en: "A month at a glance", es: "El mes de un vistazo" }),
                promo: t({ en: "Vertical cut", es: "Corte vertical" }),
                sorted: t({ en: "Sorted into categories", es: "Ordenado en categorías" }),
            },
            dark: t({ en: "Dark", es: "Oscuro" }),
            light: t({ en: "Light", es: "Claro" }),
            logo: t({ en: "Logo", es: "Logo" }),
            logoLead: t({
                en: "Keep the mark flat and whole, in ink, white, or vermilion. Write the name Outlayr, capital O, one word.",
                es: "Usa el símbolo plano y completo, en tinta, blanco o bermellón. Escribe el nombre Outlayr, con O mayúscula y en una sola palabra.",
            }),
            screens: t({ en: "Screenshots", es: "Capturas" }),
            screensLead: t({
                en: "Real screens from the app. Don't recolor or edit the interface.",
                es: "Pantallas reales de la app. No cambies los colores ni edites la interfaz.",
            }),
            shots: {
                accounts: t({ en: "Accounts", es: "Cuentas" }),
                budgets: t({ en: "Budgets", es: "Presupuestos" }),
                insights: t({ en: "Insights", es: "Análisis" }),
                log: t({ en: "Log an expense", es: "Registrar un gasto" }),
                subscriptions: t({ en: "Subscriptions", es: "Suscripciones" }),
            },
            title: t({ en: "Files", es: "Archivos" }),
        },
        lead: t({
            en: "What to say, what not to say, and every file you need for the edit.",
            es: "Qué decir, qué no decir y todos los archivos que necesitas para tu edición.",
        }),
        meta: {
            description: t({
                en: "Outlayr's brand kit for creators and press: a 30 second pitch, the claims you can make, logos, colors, screenshots, and B-roll.",
                es: "El kit de marca de Outlayr para creadores y prensa: un pitch de 30 segundos, lo que puedes afirmar, logos, colores, capturas y B-roll.",
            }),
            title: t({ en: "Outlayr brand kit", es: "Kit de marca de Outlayr" }),
        },
        pitch: {
            beats: [
                {
                    label: t({ en: "Hook", es: "Gancho" }),
                    say: t({ en: "I log a purchase in one sentence.", es: "Registro una compra en una sola oración." }),
                    show: t({
                        en: "Type “coffee 4.50”, say it, or snap the receipt, and show the entry filling in.",
                        es: "Escribe “café 4.50”, dilo o toma foto del recibo, y muestra cómo se llena el registro.",
                    }),
                },
                {
                    label: t({ en: "Proof", es: "Prueba" }),
                    say: t({
                        en: "Budgets, goals, and subscriptions update as I log.",
                        es: "Los presupuestos, metas y suscripciones se actualizan mientras registro.",
                    }),
                    show: t({
                        en: "Any of 165 currencies, with totals in yours at the rate from that day.",
                        es: "Cualquiera de 165 monedas, con los totales en la tuya a la tasa de ese día.",
                    }),
                },
                {
                    label: t({ en: "Close", es: "Cierre" }),
                    say: t({
                        en: "Free on iPhone and Android. No ads.",
                        es: "Gratis en iPhone y Android. Sin anuncios.",
                    }),
                    show: t({
                        en: "Pro adds sync and higher limits. Point to the link in your description.",
                        es: "Pro agrega sincronización y límites más altos. Señala el enlace en tu descripción.",
                    }),
                },
            ],
            title: t({ en: "The 30 second pitch", es: "El pitch de 30 segundos" }),
        },
        title: t({ en: "Making something about Outlayr?", es: "¿Vas a hacer algo sobre Outlayr?" }),
    },
    key: "brand",
} satisfies Dictionary;

export default brand;
