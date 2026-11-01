import { t } from "intlayer";
import type { Dictionary } from "intlayer";

import {
    ACCOUNTS_SCREEN_ALT,
    BUDGETS_SCREEN_ALT,
    OPEN_SOURCE_ANSWER,
    OPEN_SOURCE_QUESTION,
    RECEIPT_SCAN_ANSWER,
} from "./shared";

const home = {
    content: {
        extras: [
            {
                label: t({ en: "Goals", es: "Metas" }),
                text: t({
                    en: "Save toward a date and see what you need each month.",
                    es: "Ahorra para una fecha y mira cuánto necesitas cada mes.",
                }),
            },
            {
                label: t({ en: "Split", es: "Dividir" }),
                text: t({
                    en: "Divide one purchase across several categories.",
                    es: "Reparte una compra entre varias categorías.",
                }),
            },
            {
                label: t({ en: "Currencies", es: "Monedas" }),
                text: t({
                    en: "Log in any of 165 currencies and read totals in yours, at the rate from the day it happened.",
                    es: "Registra en cualquiera de 165 monedas y mira los totales en la tuya, con la tasa del día en que ocurrió.",
                }),
            },
            {
                label: t({ en: "Widgets", es: "Widgets" }),
                text: t({
                    en: "Four for the iPhone Home Screen and Lock Screen: today’s spending, budget left, recent entries, insights.",
                    es: "Cuatro para la pantalla de inicio y la pantalla bloqueada del iPhone: el gasto de hoy, el presupuesto disponible, los registros recientes y tus estadísticas.",
                }),
            },
            {
                label: t({ en: "Apple Pay", es: "Apple Pay" }),
                text: t({
                    en: "On iPhone, pay with Apple Pay and a Shortcuts automation logs the purchase.",
                    es: "En iPhone, paga con Apple Pay y una automatización de Atajos registra la compra.",
                }),
            },
            {
                label: t({ en: "Search", es: "Buscar" }),
                text: t({
                    en: "Find any entry by note, category, or amount. On iPhone, entries show up in Spotlight too.",
                    es: "Encuentra cualquier registro por nota, categoría o monto. En iPhone, los registros también aparecen en Spotlight.",
                }),
            },
            {
                label: t({ en: "Offline", es: "Sin conexión" }),
                text: t({
                    en: "Entries save on the phone first, so logging works with no signal.",
                    es: "Los registros se guardan primero en el celular, así que puedes registrar sin señal.",
                }),
            },
            {
                label: t({ en: "Export", es: "Exportar" }),
                text: t({
                    en: "A CSV, or a full archive you can restore from.",
                    es: "Un CSV o un archivo completo desde el que puedes restaurar.",
                }),
            },
            {
                label: t({ en: "Lock", es: "Bloqueo" }),
                text: t({
                    en: "Face ID or Touch ID to open on iPhone, or your fingerprint or face on Android. The iPhone app switcher never shows your ledger.",
                    es: "Face ID o Touch ID para abrirla en iPhone, o tu huella o tu rostro en Android. El selector de apps del iPhone nunca muestra tu registro.",
                }),
            },
            {
                label: t({ en: "Appearance", es: "Apariencia" }),
                text: t({
                    en: "Light and dark, five accent colors, five app icons.",
                    es: "Claro y oscuro, cinco colores de acento y cinco íconos de la app.",
                }),
            },
        ],
        extrasTitle: t({ en: "Also in the app", es: "También en la app" }),
        faq: [
            {
                answer: t({
                    en: "Outlayr is an open source mobile expense tracker, budget app, and subscription tracker, made by danestves LLC. You log a purchase by typing one sentence, saying it, or scanning the receipt. Budgets, savings goals, subscriptions, and insights update as you log, in any of 165 currencies, in English, Spanish, Portuguese, or French.",
                    es: "Outlayr es una app móvil de código abierto para controlar tus gastos, tu presupuesto y tus suscripciones, hecha por danestves LLC. Registras una compra escribiendo una oración, dictándola o escaneando el recibo. Los presupuestos, las metas de ahorro, las suscripciones y las estadísticas se actualizan a medida que registras, en cualquiera de 165 monedas, en inglés, español, portugués o francés.",
                }),
                question: t({ en: "What is Outlayr?", es: "¿Qué es Outlayr?" }),
            },
            {
                answer: t({
                    en: "Yes. Logging, budgets, goals, insights, subscriptions, and widgets are free. The free plan includes 20 voice or receipt captures every 30 days, 2 accounts, and 2 category budgets. Outlayr Pro raises those limits and adds sync across devices and receipt photo backup.",
                    es: "Sí. Registrar gastos es gratis, igual que los presupuestos, las metas, las estadísticas, las suscripciones y los widgets. El plan gratis incluye 20 capturas de voz o de recibos cada 30 días, 2 cuentas y 2 presupuestos por categoría. Outlayr Pro sube esos límites y agrega la sincronización entre dispositivos y el respaldo de las fotos de tus recibos.",
                }),
                question: t({ en: "Is Outlayr free?", es: "¿Outlayr es gratis?" }),
            },
            {
                answer: t({
                    en: "Yes. In the United States, Outlayr Pro is $129.99 once, or $7.99 a month or $49.99 a year with 7 days free. Your app store shows the price for your country. There are no ads on any plan.",
                    es: "Sí. En Estados Unidos, Outlayr Pro cuesta US$129.99 en un solo pago, o US$7.99 al mes o US$49.99 al año con 7 días gratis. Tu tienda de apps muestra el precio de tu país. No hay anuncios en ningún plan.",
                }),
                question: t({
                    en: "Can I buy Outlayr Pro once instead of subscribing?",
                    es: "¿Puedo comprar Outlayr Pro en un solo pago en vez de suscribirme?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Subscriptions, bills, and paychecks log themselves on their day. Upcoming lists the next charges and what your subscriptions and bills cost per month, and a reminder can come before each charge.",
                    es: "Sí. Las suscripciones, los pagos fijos y el sueldo se registran solos en su día. Próximos muestra los próximos cobros y cuánto te cuestan al mes tus suscripciones y pagos fijos, y puede llegarte un aviso antes de cada cobro.",
                }),
                question: t({
                    en: "Does Outlayr track subscriptions and bills?",
                    es: "¿Outlayr lleva las suscripciones y los pagos fijos?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Outlayr is on the App Store for iPhone with iOS 18 or later, and on Google Play for Android.",
                    es: "Sí. Outlayr está en el App Store para iPhone con iOS 18 o posterior, y en Google Play para Android.",
                }),
                question: t({ en: "Is Outlayr on iPhone and Android?", es: "¿Outlayr está en iPhone y Android?" }),
            },
            {
                answer: RECEIPT_SCAN_ANSWER,
                question: t({ en: "How does receipt scanning work?", es: "¿Cómo funciona el escaneo de recibos?" }),
            },
            {
                answer: t({
                    en: "Yes. Outlayr supports 165 currencies. You can log a purchase in any of them, and totals convert to your main currency at the rate from the day it happened. Each account keeps its own currency: the free plan includes one, Pro allows more.",
                    es: "Sí. Outlayr admite 165 monedas. Puedes registrar una compra en cualquiera de ellas, y los totales se convierten a tu moneda principal con la tasa del día de la compra. Cada cuenta tiene su propia moneda: el plan gratis incluye una y Pro permite más.",
                }),
                question: t({
                    en: "Can I track expenses in different currencies?",
                    es: "¿Puedo registrar gastos en distintas monedas?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Entries save on your phone first, so typing an entry works with no signal. Voice entry and receipt scanning need a connection. With Pro, sync sends your entries to your other devices once you are back online.",
                    es: "Sí. Los registros se guardan primero en tu celular, así que puedes escribir uno sin señal. Para dictar y escanear recibos necesitas conexión. Con Pro, la sincronización envía tus registros a tus otros dispositivos cuando vuelves a tener conexión.",
                }),
                question: t({ en: "Does Outlayr work offline?", es: "¿Outlayr funciona sin conexión?" }),
            },
            {
                answer: t({
                    en: "Yes. Export a CSV from your bank or another app and import it. Duplicates are skipped, and category names that match yours, or merchants Outlayr already knows, are matched to your categories on your phone. With Pro, AI matching fills in the rest, and a category name still unmatched becomes a new category, listed before you save.",
                    es: "Sí. Exporta un CSV desde tu banco u otra app e impórtalo. Los duplicados se omiten, y los nombres de categoría que coinciden con los tuyos, o los comercios que Outlayr ya conoce, se asignan a tus categorías en tu celular. Con Pro, la asignación con IA completa el resto, y un nombre de categoría que siga sin coincidir se crea como categoría nueva, que ves antes de guardar.",
                }),
                question: t({ en: "Can I import a CSV from my bank?", es: "¿Puedo importar un CSV de mi banco?" }),
            },
            {
                answer: t({
                    en: "Your ledger is stored on your phone. It reaches our servers only if you sign in and turn on sync, or use a feature that needs them, like receipt scanning. Outlayr has no ads, and your data is never sold.",
                    es: "Tu registro se guarda en tu celular. Solo llega a nuestros servidores si inicias sesión y activas la sincronización, o si usas una función que los necesite, como el escaneo de recibos. Outlayr no tiene anuncios y tus datos nunca se venden.",
                }),
                question: t({ en: "Who can see my financial data?", es: "¿Quién puede ver mis datos financieros?" }),
            },
            { answer: OPEN_SOURCE_ANSWER, question: OPEN_SOURCE_QUESTION },
        ],
        faqTitle: t({ en: "Questions, answered", es: "Preguntas y respuestas" }),
        hero: {
            title: t({ en: "Track every expense in one sentence", es: "Registra cada gasto en una oración" }),
            videoLabel: t({
                en: "Logging a $42.00 grocery purchase at Costco in Outlayr, from the add menu to the Log.",
                es: "Cómo se registra en Outlayr una compra de súper de $42.00 en Costco, desde el menú para agregar hasta el Registro.",
            }),
        },
        limits: [
            { free: "20", label: t({ en: "Captures every 30 days", es: "Capturas cada 30 días" }), pro: "500" },
            {
                free: "2",
                label: t({ en: "Accounts", es: "Cuentas" }),
                pro: t({ en: "unlimited", es: "sin límite" }),
            },
            {
                free: "2",
                label: t({ en: "Category budgets", es: "Presupuestos por categoría" }),
                pro: t({ en: "unlimited", es: "sin límite" }),
            },
            {
                free: "1",
                label: t({ en: "Account currencies", es: "Monedas de cuentas" }),
                pro: t({ en: "unlimited", es: "sin límite" }),
            },
            { free: "1", label: t({ en: "App icons", es: "Íconos de la app" }), pro: "5" },
        ],
        meta: {
            description: t({
                en: "Outlayr is a mobile expense tracker and budget app. Log a purchase in one sentence, by voice, or from a receipt, and track every subscription. Free to start.",
                es: "Outlayr es una app para controlar tus gastos y tu presupuesto. Registra una compra en una oración, con tu voz o con un recibo, y controla tus suscripciones.",
            }),
            title: t({
                en: "Outlayr: Expense Tracker, Budget App & Subscription Tracker",
                es: "App para controlar gastos y presupuesto · Outlayr",
            }),
        },
        plansCopy: {
            footnote: t({
                en: "A capture is one voice entry or one receipt scan, and needs you signed in. Pro is billed monthly or yearly, or bought once, at the price your app store shows in your country.",
                es: "Una captura es un registro por voz o un escaneo de recibo, y requiere que hayas iniciado sesión. Pro se cobra al mes o al año, o se compra una sola vez, al precio que muestra tu tienda de apps en tu país.",
            }),
            lead: t({
                en: "The tracker is free. Pro lifts the limits and adds sync.",
                es: "La app es gratis. Pro quita los límites y agrega la sincronización.",
            }),
        },
        proOnly: [
            t({ en: "Sync across devices", es: "Sincronizar dispositivos" }),
            t({ en: "Receipt photo backup", es: "Respaldo de fotos" }),
            t({ en: "AI matching on import", es: "Coincidencia con IA al importar" }),
            t({ en: "Notion connection", es: "Conexión con Notion" }),
            t({ en: "Web merchant lookup", es: "Búsqueda web de comercios" }),
        ],
        tour: [
            {
                alt: BUDGETS_SCREEN_ALT,
                body: t({
                    en: "Set a limit per category or one for the whole month, and carry over what you didn’t spend. The chart shows where this pace ends, not just what’s left.",
                    es: "Pon un límite por categoría o uno para todo el mes, y acumula lo que no gastaste. El gráfico muestra a dónde te lleva este ritmo, no solo lo que queda.",
                }),
                title: t({ en: "Spot the overspend early", es: "Descubre a tiempo si te vas a pasar" }),
            },
            {
                alt: t({
                    en: "Outlayr Insights for 6 to 12 September: $597.95 spent, 74% less than the week before, a bar for each day, and the categories that moved most.",
                    es: "Estadísticas de Outlayr del 6 al 12 de septiembre: $597.95 gastados, 74% menos que la semana anterior, una barra por día y las categorías que más cambiaron.",
                }),
                body: t({
                    en: "Spending by day and by category, income against spending, and net worth over time. Start the month on payday and every chart follows.",
                    es: "Gastos por día y por categoría, ingresos frente a gastos y tu patrimonio a lo largo del tiempo. Empieza el mes el día de pago y todos los gráficos se ajustan.",
                }),
                title: t({ en: "See what moved since last week", es: "Mira qué cambió desde la semana pasada" }),
            },
            {
                alt: ACCOUNTS_SCREEN_ALT,
                body: t({
                    en: "Cash, cards, savings, and debts side by side. A transfer moves money between them without counting as spending.",
                    es: "Efectivo, tarjetas, ahorros y deudas, todo junto. Una transferencia mueve dinero entre tus cuentas sin contar como gasto.",
                }),
                title: t({ en: "Every account, every currency", es: "Cada cuenta, cada moneda" }),
            },
            {
                alt: t({
                    en: "Outlayr Upcoming entries: Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, rent, Netflix, and Planet Fitness, each with its next charge date, and $2,036.54 a month in total.",
                    es: "Próximos registros en Outlayr: Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, la renta, Netflix y Planet Fitness, cada uno con la fecha de su próximo cobro, y $2,036.54 al mes en total.",
                }),
                body: t({
                    en: "Rent, bills, and streaming log themselves on their day. Upcoming lists the next charges and what they add up to each month, and each one can remind you before it charges.",
                    es: "La renta, los servicios y el streaming se registran solos en su día. Próximos muestra los siguientes cobros y cuánto suman al mes, y cada uno puede avisarte antes de cobrarte.",
                }),
                title: t({
                    en: "What your subscriptions cost a month",
                    es: "Lo que te cuestan tus suscripciones al mes",
                }),
            },
        ],
    },
    key: "home",
} satisfies Dictionary;

export default home;
