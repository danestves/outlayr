import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const story = {
    content: {
        closingLead: t({
            en: "Free to start. No ads on any plan.",
            es: "Gratis para empezar. Sin anuncios en ningún plan.",
        }),
        faqLead: t({ en: "Something missing?", es: "¿Falta algo?" }),
        faqSupport: t({ en: "Write to support", es: "Escribe a soporte" }),
        features: {
            label: t({ en: "What you get", es: "Lo que obtienes" }),
            title: t({
                en: "Everything the month needs, from one sentence.",
                es: "Todo lo que el mes necesita, desde una oración.",
            }),
        },
        hero: {
            proof: [
                t({ en: "Free plan", es: "Plan gratis" }),
                t({ en: "No ads", es: "Sin anuncios" }),
                t({ en: "165 currencies", es: "165 monedas" }),
                t({ en: "3 languages", es: "3 idiomas" }),
            ],
            status: t({
                en: "Now on the App Store and Google Play.",
                es: "Ya en el App Store y Google Play.",
            }),
        },
        how: {
            label: t({ en: "How it works", es: "Cómo funciona" }),
            steps: [
                {
                    body: t({
                        en: "Type a sentence, hold to talk, or point the camera at a receipt. Bank CSV files come in too, with duplicates skipped.",
                        es: "Escribe una oración, mantén presionado para hablar o apunta la cámara a un recibo. También puedes importar el CSV de tu banco, sin duplicados.",
                    }),
                    film: t({
                        en: "A spoken sentence and a receipt each turn into the same entry.",
                        es: "Una oración dicha en voz alta y un recibo se convierten en el mismo registro.",
                    }),
                    title: t({ en: "Say it", es: "Dilo" }),
                },
                {
                    body: t({
                        en: "Each entry lands in its account, its category, and its budget. Rent and subscriptions log themselves on their day.",
                        es: "Cada registro llega a su cuenta, su categoría y su presupuesto. La renta y las suscripciones se registran solas en su día.",
                    }),
                    film: t({
                        en: "One Costco purchase lands in the Chase account, the groceries budget, and the month ahead.",
                        es: "Una compra en Costco llega a la cuenta de Chase, al presupuesto del súper y al mes que viene.",
                    }),
                    title: t({ en: "It sorts itself", es: "Se ordena solo" }),
                },
                {
                    body: t({
                        en: "Budgets tell you in plain words where this pace ends, and Insights shows what changed since last week.",
                        es: "Tus presupuestos te dicen en palabras simples a dónde te lleva este ritmo, y Estadísticas te muestra qué cambió desde la semana pasada.",
                    }),
                    film: t({
                        en: "The week fills in day by day, with the categories that moved most.",
                        es: "La semana se llena día por día, con las categorías que más cambiaron.",
                    }),
                    title: t({ en: "See where it is going", es: "Mira a dónde va" }),
                },
            ],
            title: t({ en: "Three steps. You only do the first.", es: "Tres pasos. Tú solo haces el primero." }),
            tryIt: t({ en: "Try it here", es: "Pruébalo aquí" }),
            ways: [
                t({ en: "Type", es: "Escribe" }),
                t({ en: "Voice", es: "Voz" }),
                t({ en: "Receipt", es: "Recibo" }),
                t({ en: "CSV", es: "CSV" }),
            ],
        },
        pause: t({ en: "Pause the film", es: "Pausar el video" }),
        play: t({ en: "Play the film", es: "Reproducir el video" }),
        pricing: {
            cents: t({ en: ".99", es: ".99" }),
            label: t({ en: "Pricing", es: "Precios" }),
            lead: t({
                en: "The tracker is free and has no ads. Pro lifts the limits and adds sync. Cancel anytime from your app store, or buy it once.",
                es: "La app es gratis y no tiene anuncios. Pro quita los límites y agrega la sincronización. Cancela cuando quieras desde tu tienda de apps, o cómpralo una sola vez.",
            }),
            month: t({ en: "a month", es: "al mes" }),
            note: t({
                en: "US prices. Your app store shows the price for your country.",
                es: "Precios de Estados Unidos. Tu tienda de apps muestra el precio de tu país.",
            }),
            other: t({ en: "Or $49.99 a year, or $129.99 once.", es: "O US$49.99 al año, o US$129.99 una sola vez." }),
            price: t({ en: "$7", es: "US$7" }),
            trial: t({ en: "7 days free on yearly", es: "7 días gratis en el plan anual" }),
            title: t({
                en: "Free to start. Pro when you want more.",
                es: "Gratis para empezar. Pro cuando quieras más.",
            }),
            zero: t({ en: "$0", es: "US$0" }),
        },
        problem: {
            body: t({
                en: "A card for groceries, cash for the taxi, subscriptions renewing in the background, a transfer to savings, a balance in another currency. By the time you open a spreadsheet, half of it is gone from memory.",
                es: "Una tarjeta para el súper, efectivo para el taxi, suscripciones que se renuevan solas, una transferencia a ahorros, un saldo en otra moneda. Cuando abres la hoja de cálculo, ya olvidaste la mitad.",
            }),
            fields: [
                t({ en: "Amount", es: "Monto" }),
                t({ en: "Merchant", es: "Comercio" }),
                t({ en: "Category", es: "Categoría" }),
                t({ en: "Account", es: "Cuenta" }),
                t({ en: "Date", es: "Fecha" }),
                t({ en: "Note", es: "Nota" }),
            ],
            film: t({
                en: "Receipts, card charges, renewals, cash, and a balance in bolívares scatter, then fall into one ordered list.",
                es: "Recibos, cargos a la tarjeta, renovaciones, efectivo y un saldo en bolívares se dispersan y luego caen en una sola lista ordenada.",
            }),
            formBody: t({
                en: "By the third coffee the form wins and the tracking stops. Outlayr reads a sentence instead, so logging takes about as long as sending a text.",
                es: "Para el tercer café, el formulario gana y dejas de registrar. Outlayr lee una oración, así que registrar toma lo mismo que mandar un mensaje.",
            }),
            formTitle: t({
                en: "And most trackers want six fields for one coffee.",
                es: "Y la mayoría de las apps te pide seis campos por un café.",
            }),
            inOutlayr: t({ en: "In Outlayr", es: "En Outlayr" }),
            label: t({ en: "The problem", es: "El problema" }),
            sentence: [
                { tag: "", text: t({ en: "Spent", es: "Gasté" }) },
                { tag: "amount", text: t({ en: "$42.00", es: "$42.00" }) },
                { tag: "", text: t({ en: "at", es: "en" }) },
                { tag: "merchant", text: t({ en: "Costco", es: "Mercado Libre" }) },
                { tag: "", text: t({ en: "for", es: "para" }) },
                { tag: "category", text: t({ en: "Groceries", es: "Compras" }) },
                { tag: "", text: t({ en: "from", es: "con" }) },
                { tag: "account", text: t({ en: "Chase", es: "BBVA" }) },
                { tag: "date", text: t({ en: "today", es: "hoy" }) },
            ],
            title: t({ en: "Your money lives in ten places.", es: "Tu dinero vive en diez lugares." }),
            usual: t({ en: "The usual way", es: "Lo de siempre" }),
        },
        screens: {
            label: t({ en: "Screens from the app", es: "Pantallas de la app" }),
        },
        tagline: t({
            en: "Say what you spent. Outlayr puts it in the right account, the right budget, and the right month, so you always know what is left.",
            es: "Di lo que gastaste. Outlayr lo pone en la cuenta correcta, el presupuesto correcto y el mes correcto, para que siempre sepas cuánto te queda.",
        }),
        trust: {
            items: [
                {
                    body: t({
                        en: "No ads on any plan. Your data is never sold.",
                        es: "Sin anuncios en ningún plan. Tus datos nunca se venden.",
                    }),
                    title: t({ en: "No ads, no selling", es: "Sin anuncios, sin ventas" }),
                },
                {
                    body: t({
                        en: "Face ID or Touch ID to open. The app switcher never shows your ledger.",
                        es: "Face ID o Touch ID para abrir. El selector de apps nunca muestra tus registros.",
                    }),
                    title: t({ en: "Locked when you want", es: "Bloqueada cuando quieras" }),
                },
                {
                    body: t({
                        en: "Entries save on the phone first, so typing an entry works anywhere.",
                        es: "Los registros se guardan primero en el celular, así que escribir un registro funciona en cualquier lugar.",
                    }),
                    title: t({ en: "Works with no signal", es: "Funciona sin señal" }),
                },
                {
                    body: t({
                        en: "Export a CSV, or a full archive you can restore from.",
                        es: "Exporta un CSV o un respaldo completo que puedes restaurar.",
                    }),
                    title: t({ en: "Yours to take", es: "Tuyos para llevar" }),
                },
            ],
            lead: t({
                en: "It reaches our servers only when you turn on sync or use a feature that needs them, like receipt scanning.",
                es: "Solo llega a nuestros servidores si activas la sincronización o usas una función que los necesita, como escanear recibos.",
            }),
            title: t({ en: "Your ledger stays on your phone.", es: "Tus registros se quedan en tu celular." }),
        },
    },
    key: "story",
} satisfies Dictionary;

export default story;
