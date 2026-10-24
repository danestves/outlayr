import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

import type { PageRef } from "@/lib/site";

import {
    ACCOUNTS_SCREEN_ALT,
    BUDGETS_SCREEN_ALT,
    OPEN_SOURCE_ANSWER,
    OPEN_SOURCE_QUESTION,
    RECEIPT_SCAN_ANSWER,
} from "./shared";

const OUTLAYR_LEAD = {
    en: "Outlayr is an open source expense tracker you fill in by sentence, voice, or receipt, free to start.",
    es: "Outlayr es una app de código abierto para controlar tus gastos que llenas con una oración, con tu voz o con un recibo, gratis para empezar.",
} as const;

const RIVALS = {
    everydollar: {
        en: "EveryDollar is a budget app from Ramsey Solutions whose mobile app is sold in the United States, with bank connections in its paid version.",
        es: "EveryDollar es una app de presupuesto de Ramsey Solutions cuya app móvil se vende en Estados Unidos, con conexión al banco en su versión de pago.",
    },
    pocketguard: {
        en: "PocketGuard is a paid budget app that syncs linked bank accounts.",
        es: "PocketGuard es una app de presupuesto de pago que sincroniza cuentas de banco vinculadas.",
    },
    spendee: {
        en: "Spendee is a budget app with cash wallets in several currencies and bank sync in its Premium plan.",
        es: "Spendee es una app de presupuesto con billeteras de efectivo en varias monedas y sincronización bancaria en su plan Premium.",
    },
    wallet: {
        en: "Wallet by BudgetBakers is a money app with a free tier for tracking by hand and bank sync in Premium.",
        es: "Wallet by BudgetBakers es una app de finanzas con un plan gratis para registrar a mano y sincronización bancaria en Premium.",
    },
    copilot: {
        en: "Copilot is a paid money app for Apple devices and the web that syncs linked accounts.",
        es: "Copilot es una app de finanzas de pago para dispositivos Apple y la web que sincroniza cuentas vinculadas.",
    },
    rocketMoney: {
        en: "Rocket Money is a subscription and budget app for the United States that syncs linked accounts and cancels subscriptions as a Premium feature.",
        es: "Rocket Money es una app de suscripciones y presupuesto para Estados Unidos que sincroniza cuentas vinculadas y cancela suscripciones como función Premium.",
    },
    monarch: {
        en: "Monarch is a paid money dashboard that syncs linked accounts in the United States and Canada.",
        es: "Monarch es un panel de finanzas de pago que sincroniza cuentas vinculadas en Estados Unidos y Canadá.",
    },
    ynab: {
        en: "YNAB is a paid budgeting method built on bank imports.",
        es: "YNAB es un método de presupuesto de pago basado en importar movimientos del banco.",
    },
    fintonic: {
        en: "Fintonic is a free app in Spain that reads your connected Spanish bank accounts, scores your finances with its FinScore, and arranges loans with over 40 lenders.",
        es: "Fintonic es una app gratis en España que lee tus cuentas de bancos españoles conectadas, califica tus finanzas con su FinScore y te consigue préstamos con más de 40 entidades.",
    },
} as const;

const OUTLAYR_SUBSCRIPTIONS = t({
    en: "Log themselves on their day, with a monthly cost and a reminder before each charge",
    es: "Se registran solas en su día, con un costo mensual y un aviso antes de cada cobro",
});

const OUTLAYR = {
    budgets: t({
        en: "A limit per category or per month, with where the pace ends",
        es: "Un límite por categoría o por mes, y a dónde te lleva el ritmo",
    }),
    currencies: t({ en: "165, converted at the rate of the day", es: "165, convertidas con la tasa del día" }),
    entries: t({
        en: "One sentence, voice, receipt scan, CSV import",
        es: "Una oración, voz, escaneo de recibos, importación de CSV",
    }),
    focus: t({
        en: "Daily spending, budgets, and savings goals",
        es: "Gastos diarios, presupuestos y metas de ahorro",
    }),
    platforms: t({ en: "Android. iPhone soon", es: "Android. Pronto en iPhone" }),
    price: t({
        en: "Free. Pro is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once in the US. Prices vary by country",
        es: "Gratis. Pro cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago en Estados Unidos. Los precios cambian según el país",
    }),
};

const LABELS = {
    availability: t({ en: "Available in", es: "Disponible en" }),
    budgets: t({ en: "Budgets", es: "Presupuestos" }),
    currencies: t({ en: "Currencies", es: "Monedas" }),
    entries: t({ en: "Adding entries", es: "Cómo registras" }),
    focus: t({ en: "Tracks", es: "Sigue" }),
    license: t({ en: "License", es: "Licencia" }),
    phone: t({ en: "On a phone", es: "En el celular" }),
    platforms: t({ en: "Runs on", es: "Funciona en" }),
    price: t({ en: "Price", es: "Precio" }),
    subscriptions: t({ en: "Subscriptions", es: "Suscripciones" }),
    watch: t({ en: "Watch out for", es: "Ten en cuenta" }),
};

const LICENSE_ROW = {
    label: LABELS.license,
    outlayr: t({ en: "Open source, GPL-3.0", es: "Código abierto, GPL-3.0" }),
    rival: t({ en: "Closed source", es: "Código cerrado" }),
};

const COST_FAQ = {
    answer: t({
        en: "The tracker is free, with budgets, goals, subscriptions, and widgets. The free plan includes 20 voice or receipt captures every 30 days, 2 accounts, 2 category budgets, and accounts in one currency. Outlayr Pro raises those limits and adds sync. In the United States it is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once. Your app store shows the price for your country.",
        es: "El control de gastos es gratis, con presupuestos, metas, suscripciones y widgets. El plan gratis incluye 20 capturas de voz o de recibos cada 30 días, 2 cuentas, 2 presupuestos por categoría y cuentas en una moneda. Outlayr Pro sube esos límites y agrega la sincronización. En Estados Unidos cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago. Tu tienda de apps muestra el precio de tu país.",
    }),
    question: t({ en: "How much does Outlayr cost?", es: "¿Cuánto cuesta Outlayr?" }),
};

const RATE_FAQ = {
    answer: t({
        en: "The rate from the day of each purchase, so entries you already logged do not move when the rate does. You can also type the rate you actually got.",
        es: "La tasa del día de cada compra, así que los registros que ya hiciste no cambian cuando la tasa se mueve. También puedes escribir la tasa que te dieron.",
    }),
    question: t({ en: "Which exchange rate does Outlayr use?", es: "¿Qué tasa de cambio usa Outlayr?" }),
};

const START_FREE = t({ en: "Want to start free", es: "Quieres empezar gratis" });
const SAY_OR_SCAN = t({
    en: "Would rather say or scan a purchase than fill in a form",
    es: "Prefieres dictar o escanear una compra en vez de llenar un formulario",
});
const DAY_RATE = t({
    en: "Want each purchase converted at the rate from its day",
    es: "Quieres cada compra convertida con la tasa de su día",
});
const NEED_WEB = t({ en: "Need a web app today", es: "Necesitas una app web hoy" });
const OUTSIDE_US = t({ en: "Live outside the United States", es: "Vives fuera de Estados Unidos" });
const SEVERAL_CURRENCIES = t({ en: "Spend in more than one currency", es: "Gastas en más de una moneda" });
const SYNC_ACCOUNTS = t({
    en: "Want linked accounts to sync on their own",
    es: "Quieres que tus cuentas vinculadas se sincronicen solas",
});

const answers = {
    content: {
        compare: {
            copilot: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want to start free, live outside the United States, or would rather say or scan a purchase than fill in a form. Copilot fits better if you want linked accounts to sync on their own, or use it on a Mac or an iPad.",
                            es: "Sí, si quieres empezar gratis, vives fuera de Estados Unidos o prefieres dictar o escanear una compra en vez de llenar un formulario. Copilot te conviene más si quieres que tus cuentas vinculadas se sincronicen solas, o si lo usas en una Mac o un iPad.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Copilot alternative?",
                            es: "¿Outlayr es una buena alternativa a Copilot?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes, 165 of them, converted to your main currency at the rate from the day of each purchase. Copilot supports US dollars only.",
                            es: "Sí, 165, convertidas a tu moneda principal con la tasa del día de cada compra. Copilot solo admite dólares estadounidenses.",
                        }),
                        question: t({
                            en: "Does Outlayr support currencies other than US dollars?",
                            es: "¿Outlayr admite monedas además del dólar estadounidense?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [START_FREE, OUTSIDE_US, SAY_OR_SCAN],
                    rival: [
                        SYNC_ACCOUNTS,
                        t({
                            en: "Use a Mac or an iPad as much as your phone",
                            es: "Usas una Mac o un iPad tanto como tu celular",
                        }),
                        t({ en: "Want a web app today", es: "Quieres una app web hoy" }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.copilot.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.copilot.es}`,
                }),
                meta: {
                    description: t({
                        en: "Copilot is a paid money app for Apple devices and the web that syncs linked accounts. Outlayr is an open source alternative, free to start.",
                        es: "Copilot es una app de pago para dispositivos Apple y la web que sincroniza tus cuentas. Outlayr es una alternativa de código abierto, gratis para empezar.",
                    }),
                    title: t({
                        en: "Copilot Money Alternative: Outlayr vs Copilot",
                        es: "Alternativa a Copilot Money: Outlayr vs Copilot",
                    }),
                },
                related: ["/compare/monarch", "/compare/everydollar", "/compare/ynab"] satisfies PageRef[],
                rival: "Copilot",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "$95 a year, after a 1-month free trial. No free plan",
                            es: "US$95 al año, después de una prueba gratis de 1 mes. Sin plan gratis",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({ en: "Synced from linked accounts", es: "Sincronizados desde cuentas vinculadas" }),
                    },
                    {
                        label: LABELS.currencies,
                        outlayr: OUTLAYR.currencies,
                        rival: t({ en: "US dollars only", es: "Solo dólares estadounidenses" }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, iPad, Mac, web", es: "iPhone, iPad, Mac, web" }),
                    },
                    LICENSE_ROW,
                ],
                site: "copilot.money",
                source: "https://www.copilot.money/faq",
                summary: t(RIVALS.copilot),
                title: t({ en: "Outlayr as a Copilot alternative.", es: "Outlayr como alternativa a Copilot." }),
            },
            everydollar: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you live outside the United States, spend in more than one currency, or would rather say or scan a purchase than fill in a form. EveryDollar fits better if you want transactions streamed from your bank, or budget on a computer too.",
                            es: "Sí, si vives fuera de Estados Unidos, gastas en más de una moneda o prefieres dictar o escanear una compra en vez de llenar un formulario. EveryDollar te conviene más si quieres que los movimientos lleguen desde tu banco, o si también haces tu presupuesto en la computadora.",
                        }),
                        question: t({
                            en: "Is Outlayr a good EveryDollar alternative?",
                            es: "¿Outlayr es una buena alternativa a EveryDollar?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is offered in 175 countries and regions, Canada included, with 165 currencies. EveryDollar's mobile app and Premium are only available in the United States; elsewhere you can make a free budget on EveryDollar.com.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, Canadá incluido, con 165 monedas. La app móvil y Premium de EveryDollar solo están disponibles en Estados Unidos; en otros países puedes armar un presupuesto gratis en EveryDollar.com.",
                        }),
                        question: t({
                            en: "Does Outlayr work in Canada and outside the United States?",
                            es: "¿Outlayr funciona en Canadá y fuera de Estados Unidos?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [OUTSIDE_US, SEVERAL_CURRENCIES, SAY_OR_SCAN],
                    rival: [
                        t({
                            en: "Want transactions streamed from your bank",
                            es: "Quieres que los movimientos lleguen desde tu banco",
                        }),
                        t({
                            en: "Want to budget on a computer too",
                            es: "También quieres hacer tu presupuesto en la computadora",
                        }),
                        t({ en: "Live in the United States", es: "Vives en Estados Unidos" }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.everydollar.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.everydollar.es}`,
                }),
                meta: {
                    description: t({
                        en: "EveryDollar is a Ramsey Solutions budget app sold in the US, with bank connections in Premium. Outlayr is an open source alternative in 165 currencies.",
                        es: "EveryDollar es una app de presupuesto de Ramsey que se vende en EE. UU. Outlayr es una alternativa de código abierto, gratis para empezar, con 165 monedas.",
                    }),
                    title: t({
                        en: "EveryDollar Alternative: Outlayr vs EveryDollar",
                        es: "Alternativa a EveryDollar: Outlayr vs EveryDollar",
                    }),
                },
                related: ["/compare/ynab", "/compare/copilot", "/tools/50-30-20-budget-calculator"] satisfies PageRef[],
                rival: "EveryDollar",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free version. Premium is $17.99 a month or $79.99 a year, after a 14-day trial",
                            es: "Versión gratis. Premium cuesta US$17.99 al mes o US$79.99 al año, después de una prueba de 14 días",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "Entered by hand. Bank connection in Premium",
                            es: "A mano. Conexión al banco en Premium",
                        }),
                    },
                    {
                        label: LABELS.availability,
                        outlayr: t({
                            en: "175 countries and regions",
                            es: "175 países y regiones",
                        }),
                        rival: t({
                            en: "Mobile app and Premium in the United States only. Elsewhere, a free budget on EveryDollar.com",
                            es: "App móvil y Premium solo en Estados Unidos. En otros países, un presupuesto gratis en EveryDollar.com",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "Computer, phone, or tablet", es: "Computadora, celular o tableta" }),
                    },
                    LICENSE_ROW,
                ],
                site: "ramseysolutions.com",
                source: "https://www.ramseysolutions.com/money/everydollar",
                summary: t(RIVALS.everydollar),
                title: t({
                    en: "Outlayr as an EveryDollar alternative.",
                    es: "Outlayr como alternativa a EveryDollar.",
                }),
            },
            fintonic: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you live outside Spain, pay in cash as well as by card, or want to log a purchase by saying it or scanning the receipt. Fintonic fits better if you bank in Spain and want your accounts to sync on their own, a financial score, or help getting a loan.",
                            es: "Sí, si vives fuera de España, también pagas en efectivo o quieres registrar una compra dictándola o escaneando el recibo. Fintonic te conviene más si tienes tus cuentas en un banco español y quieres que se sincronicen solas, una nota financiera o ayuda para conseguir un préstamo.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Fintonic alternative?",
                            es: "¿Outlayr es una buena alternativa a Fintonic?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is offered in 175 countries and regions, Chile and Mexico included, with 165 currencies, in English and Spanish. Fintonic is offered only in Spain and connects Spanish banks.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, Chile y México incluidos, con 165 monedas, en inglés y en español. Fintonic solo se ofrece en España y conecta bancos españoles.",
                        }),
                        question: t({
                            en: "Does Outlayr work in Chile and Mexico?",
                            es: "¿Outlayr funciona en Chile y México?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Type one sentence, say it, or scan the receipt, and file it under a cash account. Fintonic's help center says it shows only movements that went through a bank account.",
                            es: "Sí. Escribe una oración, díctala o escanea el recibo, y regístrala en una cuenta de efectivo. El centro de ayuda de Fintonic dice que solo muestra los movimientos que pasaron por una cuenta bancaria.",
                        }),
                        question: t({
                            en: "Can I log cash expenses in Outlayr?",
                            es: "¿Puedo registrar gastos en efectivo en Outlayr?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [
                        t({ en: "Live outside Spain", es: "Vives fuera de España" }),
                        t({ en: "Pay in cash as well as by card", es: "También pagas en efectivo" }),
                        t({
                            en: "Want to log a purchase by saying it or scanning the receipt",
                            es: "Quieres registrar una compra dictándola o escaneando el recibo",
                        }),
                    ],
                    rival: [
                        SYNC_ACCOUNTS,
                        t({
                            en: "Want a financial score and help getting a loan",
                            es: "Quieres una nota financiera y ayuda para conseguir un préstamo",
                        }),
                        t({ en: "Bank in Spain", es: "Tienes tus cuentas en un banco español" }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.fintonic.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.fintonic.es}`,
                }),
                meta: {
                    description: t({
                        en: "Fintonic is a free app in Spain that reads Spanish bank accounts and arranges loans. Outlayr is an open source alternative for cash, cards, and 165 currencies.",
                        es: "Fintonic es una app gratis en España que lee tus cuentas bancarias españolas. Outlayr es una alternativa de código abierto para efectivo y 165 monedas.",
                    }),
                    title: t({
                        en: "Fintonic Alternative: Outlayr vs Fintonic",
                        es: "Alternativa a Fintonic: Outlayr vs Fintonic",
                    }),
                },
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/guides/multi-currency-expense-tracker",
                    "/compare/wallet",
                ] satisfies PageRef[],
                rival: "Fintonic",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free. Lenders pay it when you take a loan through it",
                            es: "Gratis. Le pagan las entidades cuando contratas un préstamo con ella",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "Movements from connected Spanish bank accounts only",
                            es: "Solo movimientos de cuentas de bancos españoles conectadas",
                        }),
                    },
                    {
                        label: LABELS.focus,
                        outlayr: OUTLAYR.focus,
                        rival: t({
                            en: "Spending by category, its FinScore, and loans from over 40 lenders",
                            es: "Gastos por categoría, su FinScore y préstamos de más de 40 entidades",
                        }),
                    },
                    {
                        label: LABELS.availability,
                        outlayr: t({
                            en: "175 countries and regions",
                            es: "175 países y regiones",
                        }),
                        rival: t({ en: "Spain only, with Spanish banks", es: "Solo España, con bancos españoles" }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, Android", es: "iPhone, Android" }),
                    },
                    LICENSE_ROW,
                ],
                site: "fintonic.com",
                source: "https://www.fintonic.com/es-ES/inicio/",
                summary: t(RIVALS.fintonic),
                title: t({ en: "Outlayr as a Fintonic alternative.", es: "Outlayr como alternativa a Fintonic." }),
            },
            monarch: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want to start free, live outside the United States and Canada, or spend in more than one currency. Monarch fits better if you want linked accounts to sync on their own, or track investments next to spending.",
                            es: "Sí, si quieres empezar gratis, vives fuera de Estados Unidos y Canadá o gastas en más de una moneda. Monarch te conviene más si quieres que tus cuentas vinculadas se sincronicen solas, o seguir tus inversiones junto con tus gastos.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Monarch alternative?",
                            es: "¿Outlayr es una buena alternativa a Monarch?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is offered in 175 countries and regions, in English and Spanish. Monarch is available in the United States and Canada.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, en inglés y en español. Monarch está disponible en Estados Unidos y Canadá.",
                        }),
                        question: t({
                            en: "Is Outlayr available outside the United States and Canada?",
                            es: "¿Outlayr está disponible fuera de Estados Unidos y Canadá?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [
                        START_FREE,
                        t({
                            en: "Live outside the United States and Canada",
                            es: "Vives fuera de Estados Unidos y Canadá",
                        }),
                        SEVERAL_CURRENCIES,
                    ],
                    rival: [
                        SYNC_ACCOUNTS,
                        t({
                            en: "Track investments alongside spending",
                            es: "Sigues tus inversiones junto con tus gastos",
                        }),
                        NEED_WEB,
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.monarch.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.monarch.es}`,
                }),
                meta: {
                    description: t({
                        en: "Monarch is a paid money dashboard that syncs linked accounts in the US and Canada. Outlayr is an open source alternative in 175 countries and 165 currencies.",
                        es: "Monarch es un panel de finanzas de pago para EE. UU. y Canadá. Outlayr es una alternativa de código abierto, gratis para empezar, en 175 países y 165 monedas.",
                    }),
                    title: t({
                        en: "Monarch Money Alternative: Outlayr vs Monarch",
                        es: "Alternativa a Monarch Money: Outlayr vs Monarch",
                    }),
                },
                related: [
                    "/guides/best-subscription-tracker-apps",
                    "/compare/copilot",
                    "/guides/mint-alternative",
                ] satisfies PageRef[],
                rival: "Monarch",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "$14.99 a month or $99.99 a year, after a 7-day trial. Plus is $199.99 a year",
                            es: "US$14.99 al mes o US$99.99 al año, después de una prueba de 7 días. Plus cuesta US$199.99 al año",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({ en: "Synced from linked accounts", es: "Sincronizados desde cuentas vinculadas" }),
                    },
                    {
                        label: LABELS.focus,
                        outlayr: OUTLAYR.focus,
                        rival: t({
                            en: "Budgets, net worth, and investments across linked accounts",
                            es: "Presupuestos, patrimonio e inversiones en tus cuentas vinculadas",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, iPad, Android, web", es: "iPhone, iPad, Android, web" }),
                    },
                    LICENSE_ROW,
                ],
                site: "monarch.com",
                source: "https://www.monarch.com/pricing",
                summary: t(RIVALS.monarch),
                title: t({ en: "Outlayr as a Monarch alternative.", es: "Outlayr como alternativa a Monarch." }),
            },
            pocketguard: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want to start free, spend in more than one currency, or would rather say or scan a purchase than fill in a form. PocketGuard fits better if you want linked accounts to sync on their own, a web app today, or an Apple Watch app.",
                            es: "Sí, si quieres empezar gratis, gastas en más de una moneda o prefieres dictar o escanear una compra en vez de llenar un formulario. PocketGuard te conviene más si quieres que tus cuentas vinculadas se sincronicen solas, una app web hoy o una app para Apple Watch.",
                        }),
                        question: t({
                            en: "Is Outlayr a good PocketGuard alternative?",
                            es: "¿Outlayr es una buena alternativa a PocketGuard?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Subscriptions log themselves on their day, Upcoming shows what they cost per month, and a reminder can come before each charge. Like PocketGuard, Outlayr leaves cancelling to you.",
                            es: "Sí. Las suscripciones se registran solas en su día, Próximos muestra cuánto cuestan al mes y puede llegarte un aviso antes de cada cobro. Igual que PocketGuard, Outlayr te deja a ti la cancelación.",
                        }),
                        question: t({
                            en: "Does Outlayr track subscriptions like PocketGuard?",
                            es: "¿Outlayr controla suscripciones como PocketGuard?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [START_FREE, SEVERAL_CURRENCIES, SAY_OR_SCAN],
                    rival: [
                        SYNC_ACCOUNTS,
                        t({ en: "Want a web app today", es: "Quieres una app web hoy" }),
                        t({ en: "Use an Apple Watch with it", es: "La usas con un Apple Watch" }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.pocketguard.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.pocketguard.es}`,
                }),
                meta: {
                    description: t({
                        en: "PocketGuard is a paid budget app that syncs linked bank accounts. Outlayr is an open source alternative you fill in by sentence, voice, or receipt.",
                        es: "PocketGuard es una app de presupuesto de pago que sincroniza tus cuentas. Outlayr es una alternativa de código abierto que llenas con una oración, voz o recibo.",
                    }),
                    title: t({
                        en: "PocketGuard Alternative: Outlayr vs PocketGuard",
                        es: "Alternativa a PocketGuard: Outlayr vs PocketGuard",
                    }),
                },
                related: [
                    "/guides/best-subscription-tracker-apps",
                    "/compare/rocket-money",
                    "/guides/subscription-tracker",
                ] satisfies PageRef[],
                rival: "PocketGuard",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "$12.99 a month, $74.99 a year, or $149.99 once, after a 7-day trial",
                            es: "US$12.99 al mes, US$74.99 al año o US$149.99 en un solo pago, después de una prueba de 7 días",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "Synced from linked accounts, plus cash transactions and file import",
                            es: "Sincronizados desde cuentas vinculadas, más movimientos en efectivo e importación de archivos",
                        }),
                    },
                    {
                        label: LABELS.subscriptions,
                        outlayr: OUTLAYR_SUBSCRIPTIONS,
                        rival: t({
                            en: "Listed for you. You cancel each one with the service",
                            es: "Te las lista. Tú cancelas cada una con el servicio",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({
                            en: "Web, iPhone, Apple Watch, Android",
                            es: "Web, iPhone, Apple Watch, Android",
                        }),
                    },
                    LICENSE_ROW,
                ],
                site: "pocketguard.com",
                source: "https://pocketguard.com/pricing/",
                summary: t(RIVALS.pocketguard),
                title: t({
                    en: "Outlayr as a PocketGuard alternative.",
                    es: "Outlayr como alternativa a PocketGuard.",
                }),
            },
            "rocket-money": {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want to start free, live outside the United States, or spend in more than one currency. Rocket Money fits better if you want linked accounts to sync on their own, or want its team to cancel subscriptions for you.",
                            es: "Sí, si quieres empezar gratis, vives fuera de Estados Unidos o gastas en más de una moneda. Rocket Money te conviene más si quieres que tus cuentas vinculadas se sincronicen solas, o que su equipo cancele suscripciones por ti.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Rocket Money alternative?",
                            es: "¿Outlayr es una buena alternativa a Rocket Money?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Outlayr shows what each subscription costs and when it charges next, and can remind you before the charge, so you cancel with the service yourself. At Rocket Money, cancellation by its team is a Premium feature.",
                            es: "No. Outlayr te muestra cuánto cuesta cada suscripción y cuándo vuelve a cobrar, y puede avisarte antes del cobro, para que la canceles tú con el servicio. En Rocket Money, la cancelación por su equipo es una función Premium.",
                        }),
                        question: t({
                            en: "Does Outlayr cancel subscriptions like Rocket Money?",
                            es: "¿Outlayr cancela suscripciones como Rocket Money?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is offered in 175 countries and regions, with 165 currencies, in English and Spanish. Rocket Money is available in the United States, with U.S. banks.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, con 165 monedas, en inglés y en español. Rocket Money está disponible en Estados Unidos, con bancos de EE. UU.",
                        }),
                        question: t({
                            en: "Does Outlayr work outside the United States?",
                            es: "¿Outlayr funciona fuera de Estados Unidos?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [START_FREE, OUTSIDE_US, SEVERAL_CURRENCIES],
                    rival: [
                        SYNC_ACCOUNTS,
                        t({
                            en: "Want someone to cancel subscriptions for you",
                            es: "Quieres que alguien cancele tus suscripciones por ti",
                        }),
                        t({ en: "Want help negotiating your bills", es: "Quieres ayuda para negociar tus facturas" }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.rocketMoney.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.rocketMoney.es}`,
                }),
                meta: {
                    description: t({
                        en: "Rocket Money is a US subscription and budget app whose team cancels subscriptions in Premium. Outlayr is an open source alternative in 165 currencies.",
                        es: "Rocket Money es una app de suscripciones para EE. UU. que las cancela en Premium. Outlayr es una alternativa de código abierto con 165 monedas.",
                    }),
                    title: t({
                        en: "Rocket Money Alternative: Outlayr vs Rocket Money",
                        es: "Alternativa a Rocket Money: Outlayr vs Rocket Money",
                    }),
                },
                related: [
                    "/guides/best-subscription-tracker-apps",
                    "/compare/pocketguard",
                    "/guides/subscription-tracker",
                ] satisfies PageRef[],
                rival: "Rocket Money",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free plan. Premium is pay what you want, typically $7 to $14 a month. Premium+ is $15 a month",
                            es: "Plan gratis. Premium es paga lo que quieras, normalmente de US$7 a US$14 al mes. Premium+ cuesta US$15 al mes",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "Synced from linked accounts. Manual transactions are a Premium feature",
                            es: "Sincronizados desde cuentas vinculadas. Los movimientos a mano son una función Premium",
                        }),
                    },
                    {
                        label: LABELS.subscriptions,
                        outlayr: OUTLAYR_SUBSCRIPTIONS,
                        rival: t({
                            en: "Found in linked accounts. Cancellation by its team is a Premium feature",
                            es: "Las encuentra en tus cuentas vinculadas. La cancelación por su equipo es una función Premium",
                        }),
                    },
                    {
                        label: LABELS.availability,
                        outlayr: t({
                            en: "175 countries and regions, 165 currencies",
                            es: "175 países y regiones, 165 monedas",
                        }),
                        rival: t({
                            en: "The United States, with U.S. banks",
                            es: "Estados Unidos, con bancos de EE. UU.",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({
                            en: "iPhone, Android. Web is a Premium feature",
                            es: "iPhone, Android. La web es una función Premium",
                        }),
                    },
                    LICENSE_ROW,
                ],
                site: "rocketmoney.com",
                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                summary: t(RIVALS.rocketMoney),
                title: t({
                    en: "Outlayr as a Rocket Money alternative.",
                    es: "Outlayr como alternativa a Rocket Money.",
                }),
            },
            spendee: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you would rather say or scan a purchase than fill in a form, want each purchase converted at the rate from its day, or want two budgets on the free plan. Spendee fits better if you want bank sync.",
                            es: "Sí, si prefieres dictar o escanear una compra en vez de llenar un formulario, quieres cada compra convertida con la tasa de su día o quieres dos presupuestos en el plan gratis. Spendee te conviene más si quieres sincronización bancaria.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Spendee alternative?",
                            es: "¿Outlayr es una buena alternativa a Spendee?",
                        }),
                    },
                    RATE_FAQ,
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [
                        SAY_OR_SCAN,
                        DAY_RATE,
                        t({
                            en: "Want two budgets on the free plan",
                            es: "Quieres dos presupuestos en el plan gratis",
                        }),
                    ],
                    rival: [SYNC_ACCOUNTS],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.spendee.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.spendee.es}`,
                }),
                meta: {
                    description: t({
                        en: "Spendee is a budget app with cash wallets and bank sync in Premium. Outlayr is an open source alternative that converts each purchase at its day's rate.",
                        es: "Spendee es una app de presupuesto con sincronización bancaria en Premium. Outlayr es una alternativa de código abierto con la tasa del día de cada compra.",
                    }),
                    title: t({
                        en: "Spendee Alternative: Outlayr vs Spendee",
                        es: "Alternativa a Spendee: Outlayr vs Spendee",
                    }),
                },
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/compare/wallet",
                    "/compare/fintonic",
                ] satisfies PageRef[],
                rival: "Spendee",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free basic plan with 1 wallet and 1 budget. Plus $1.99 a month or $14.99 a year, Premium $5.99 a month or $35.99 a year, after a 7-day trial. Prices vary by country",
                            es: "Plan básico gratis con 1 billetera y 1 presupuesto. Plus US$1.99 al mes o US$14.99 al año, Premium US$5.99 al mes o US$35.99 al año, después de una prueba de 7 días. Los precios cambian según el país",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "Cash wallets by hand. Bank sync in Premium",
                            es: "Billeteras de efectivo a mano. Sincronización bancaria en Premium",
                        }),
                    },
                    {
                        label: LABELS.currencies,
                        outlayr: OUTLAYR.currencies,
                        rival: t({ en: "Several currencies", es: "Varias monedas" }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, Android. Web coming", es: "iPhone, Android. Web próximamente" }),
                    },
                    LICENSE_ROW,
                ],
                site: "spendee.com",
                source: "https://www.spendee.com/pricing",
                summary: t(RIVALS.spendee),
                title: t({ en: "Outlayr as a Spendee alternative.", es: "Outlayr como alternativa a Spendee." }),
            },
            wallet: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you would rather say or scan a purchase than fill in a form, or want each purchase converted at the rate from its day. Wallet fits better if you want bank sync, or need a web app today.",
                            es: "Sí, si prefieres dictar o escanear una compra en vez de llenar un formulario, o quieres cada compra convertida con la tasa de su día. Wallet te conviene más si quieres sincronización bancaria, o necesitas una app web hoy.",
                        }),
                        question: t({
                            en: "Is Outlayr a good alternative to Wallet by BudgetBakers?",
                            es: "¿Outlayr es una buena alternativa a Wallet by BudgetBakers?",
                        }),
                    },
                    RATE_FAQ,
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [SAY_OR_SCAN, DAY_RATE],
                    rival: [SYNC_ACCOUNTS, NEED_WEB],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.wallet.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.wallet.es}`,
                }),
                meta: {
                    description: t({
                        en: "Wallet by BudgetBakers has a free tier for tracking by hand and bank sync in Premium. Outlayr is an open source alternative you fill in by sentence.",
                        es: "Wallet by BudgetBakers registra a mano gratis y sincroniza bancos en Premium. Outlayr es una alternativa de código abierto, gratis para empezar.",
                    }),
                    title: t({
                        en: "Wallet by BudgetBakers Alternative: Outlayr vs Wallet",
                        es: "Alternativa a Wallet by BudgetBakers: Outlayr vs Wallet",
                    }),
                },
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/guides/best-open-source-expense-tracker-apps",
                    "/compare/fintonic",
                ] satisfies PageRef[],
                rival: "Wallet by BudgetBakers",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free tier. Premium monthly, yearly, or lifetime, priced in the app",
                            es: "Plan gratis. Premium al mes, al año o de por vida, con precio en la app",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "By hand on the free tier. Bank sync with over 15,000 institutions in Premium",
                            es: "A mano en el plan gratis. Sincronización con más de 15,000 instituciones en Premium",
                        }),
                    },
                    {
                        label: LABELS.currencies,
                        outlayr: OUTLAYR.currencies,
                        rival: t({
                            en: "Several, converted at real-time rates",
                            es: "Varias, convertidas con tasas en tiempo real",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, Android, web", es: "iPhone, Android, web" }),
                    },
                    LICENSE_ROW,
                ],
                site: "budgetbakers.com",
                source: "https://budgetbakers.com/en/products/wallet/",
                summary: t(RIVALS.wallet),
                title: t({
                    en: "Outlayr as an alternative to Wallet by BudgetBakers.",
                    es: "Outlayr como alternativa a Wallet by BudgetBakers.",
                }),
            },
            ynab: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want to start free, spend in more than one currency, or would rather say or scan a purchase than fill in a form. YNAB fits better if you want your bank to import transactions, or follow its give every dollar a job method.",
                            es: "Sí, si quieres empezar gratis, gastas en más de una moneda o prefieres dictar o escanear una compra en vez de llenar un formulario. YNAB te conviene más si quieres que tu banco importe los movimientos, o si sigues su método de darle un trabajo a cada dólar.",
                        }),
                        question: t({
                            en: "Is Outlayr a good YNAB alternative?",
                            es: "¿Outlayr es una buena alternativa a YNAB?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. You can log a purchase in any of 165 currencies, and totals convert at the rate from the day of each purchase. Each account keeps its own currency: the free plan holds accounts in one, Pro in any number. YNAB lets you pick one currency per spending plan.",
                            es: "Sí. Puedes registrar una compra en cualquiera de 165 monedas, y los totales se convierten con la tasa del día de cada compra. Cada cuenta tiene su propia moneda: el plan gratis permite cuentas en una, Pro en las que quieras. YNAB te deja elegir una moneda por plan de gastos.",
                        }),
                        question: t({
                            en: "Can Outlayr track more than one currency?",
                            es: "¿Outlayr puede llevar más de una moneda?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [START_FREE, SEVERAL_CURRENCIES, SAY_OR_SCAN],
                    rival: [
                        t({
                            en: "Want your bank to import transactions",
                            es: "Quieres que tu banco importe los movimientos",
                        }),
                        t({
                            en: "Follow the give every dollar a job method",
                            es: "Sigues el método de darle un trabajo a cada dólar",
                        }),
                        NEED_WEB,
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.ynab.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.ynab.es}`,
                }),
                meta: {
                    description: t({
                        en: "YNAB is a paid budgeting method built on bank imports, at $109 a year. Outlayr is an open source alternative you fill in by sentence, voice, or receipt.",
                        es: "YNAB es un método de presupuesto de pago, US$109 al año, basado en importar del banco. Outlayr es una alternativa de código abierto, gratis para empezar.",
                    }),
                    title: t({
                        en: "YNAB Alternative: Outlayr vs YNAB (Price, Currencies)",
                        es: "Alternativa a YNAB: Outlayr vs YNAB (precio y monedas)",
                    }),
                },
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/compare/everydollar",
                    "/compare/copilot",
                ] satisfies PageRef[],
                rival: "YNAB",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "$14.99 a month or $109 a year, after a 34-day trial",
                            es: "US$14.99 al mes o US$109 al año, después de una prueba de 34 días",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "Bank import for select US, Canadian, UK, and EU banks, file import, or by hand",
                            es: "Importación desde algunos bancos de EE. UU., Canadá, Reino Unido y la UE, importación de archivos o a mano",
                        }),
                    },
                    {
                        label: LABELS.budgets,
                        outlayr: OUTLAYR.budgets,
                        rival: t({
                            en: "A spending plan that gives every dollar a job",
                            es: "Un plan de gastos que le da un trabajo a cada dólar",
                        }),
                    },
                    {
                        label: LABELS.currencies,
                        outlayr: OUTLAYR.currencies,
                        rival: t({ en: "One per spending plan", es: "Una por plan de gastos" }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, Android, web", es: "iPhone, Android, web" }),
                    },
                    LICENSE_ROW,
                ],
                site: "ynab.com",
                source: "https://www.ynab.com/pricing",
                summary: t(RIVALS.ynab),
                title: t({ en: "Outlayr as a YNAB alternative.", es: "Outlayr como alternativa a YNAB." }),
            },
        },
        guides: {
            "apple-pay-expense-tracker": {
                facts: [
                    {
                        label: t({ en: "Trigger", es: "Disparador" }),
                        text: t({
                            en: "A Wallet automation in the Shortcuts app",
                            es: "Una automatización de Wallet en la app Atajos",
                        }),
                    },
                    {
                        label: t({ en: "Logged", es: "Registra" }),
                        text: t({
                            en: "The amount, the merchant, and the card you paid with",
                            es: "El monto, el comercio y la tarjeta con la que pagaste",
                        }),
                    },
                    {
                        label: t({ en: "Cards", es: "Tarjetas" }),
                        text: t({
                            en: "Each card files under the account you choose",
                            es: "Cada tarjeta se registra en la cuenta que elijas",
                        }),
                    },
                    {
                        label: t({ en: "Setup", es: "Configuración" }),
                        text: t({
                            en: "In Settings, under Apple Pay. On iOS 27, one shortcut installs it",
                            es: "En Configuración, en Apple Pay. En iOS 27, un atajo la instala",
                        }),
                    },
                    {
                        label: t({ en: "Bank apps", es: "Apps de banco" }),
                        text: t({
                            en: "A purchase notification from a bank app can log the same way",
                            es: "La notificación de compra de la app de tu banco puede registrarse igual",
                        }),
                    },
                    {
                        label: t({ en: "Runs on", es: "Funciona en" }),
                        text: "iPhone",
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Yes, on iPhone. Once the Shortcuts automation is on, each Apple Pay tap is logged in Outlayr with its amount and merchant.",
                            es: "Sí, en iPhone. Cuando la automatización de Atajos está activa, cada pago con Apple Pay se registra en Outlayr con su monto y su comercio.",
                        }),
                        question: t({
                            en: "Does Outlayr log Apple Pay purchases automatically?",
                            es: "¿Outlayr registra las compras con Apple Pay automáticamente?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Each card you pay with shows up in Settings, under Apple Pay. You choose the account its purchases go to.",
                            es: "Cada tarjeta con la que pagas aparece en Configuración, en Apple Pay. Tú eliges a qué cuenta van sus compras.",
                        }),
                        question: t({
                            en: "Which account does an Apple Pay purchase go to?",
                            es: "¿A qué cuenta va una compra con Apple Pay?",
                        }),
                    },
                    {
                        answer: t({
                            en: "A second automation reads the purchase notification from your bank's app and logs the amount and the merchant from its text.",
                            es: "Una segunda automatización lee la notificación de compra de la app de tu banco y registra el monto y el comercio a partir del texto.",
                        }),
                        question: t({
                            en: "What about cards that are not in Apple Pay?",
                            es: "¿Y las tarjetas que no están en Apple Pay?",
                        }),
                    },
                ],
                lead: t({
                    en: "On iPhone, Outlayr logs each Apple Pay purchase when you tap your card. A Shortcuts automation sends the amount, the merchant, and the card to the Log.",
                    es: "En iPhone, Outlayr registra cada compra con Apple Pay cuando acercas tu tarjeta. Una automatización de Atajos envía el monto, el comercio y la tarjeta al Registro.",
                }),
                meta: {
                    description: t({
                        en: "On iPhone, Outlayr logs each Apple Pay purchase when you tap your card. A Shortcuts automation sends the amount, the merchant, and the card to the Log.",
                        es: "En iPhone, Outlayr registra cada compra con Apple Pay al acercar tu tarjeta. Una automatización de Atajos envía el monto, el comercio y la tarjeta.",
                    }),
                    title: t({
                        en: "Apple Pay Expense Tracker: Log Each Tap · Outlayr",
                        es: "Control de gastos con Apple Pay: cada pago · Outlayr",
                    }),
                },
                plateAlt: t({
                    en: "Outlayr Log showing a $42.00 Costco purchase logged today, above the entries from earlier days.",
                    es: "Registro de Outlayr con una compra de $42.00 en Costco registrada hoy, arriba de los registros de días anteriores.",
                }),
                related: [
                    "/guides/voice-expense-tracker",
                    "/guides/receipt-scanner",
                    "/guides/best-expense-tracker-apps",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "On iOS 27, get the shortcut. On earlier versions, follow the steps there to add the automation by hand.",
                            es: "En iOS 27, obtén el atajo. En versiones anteriores, sigue los pasos que aparecen ahí para agregar la automatización a mano.",
                        }),
                        title: t({ en: "Open Settings, then Apple Pay", es: "Abre Configuración y luego Apple Pay" }),
                    },
                    {
                        text: t({
                            en: "The automation arrives turned off. Turn it on and pick the cards that should log.",
                            es: "La automatización llega desactivada. Actívala y elige las tarjetas que se van a registrar.",
                        }),
                        title: t({ en: "Turn it on in Shortcuts", es: "Actívala en Atajos" }),
                    },
                    {
                        text: t({
                            en: "Each tap lands on the Log. The card then shows up in Settings, where you choose its account.",
                            es: "Cada pago llega al Registro. La tarjeta aparece después en Configuración, donde eliges su cuenta.",
                        }),
                        title: t({ en: "Pay as usual", es: "Paga como siempre" }),
                    },
                ],
                title: t({
                    en: "Log Apple Pay purchases as you pay.",
                    es: "Registra tus compras con Apple Pay al pagar.",
                }),
            },
            "best-expense-tracker-apps": {
                apps: [
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "Free core app. A paid upgrade adds unlimited accounts and recurring transactions",
                                    es: "La app básica es gratis. Una mejora de pago agrega cuentas ilimitadas y movimientos recurrentes",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "By hand in two taps, or statements you import",
                                    es: "A mano en dos toques, o estados de cuenta que importas",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://www.monefy.com/",
                                text: t({ en: "150+", es: "Más de 150" }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "iPhone and Android, synced through Google Drive or Dropbox",
                                    es: "iPhone y Android, con sincronización por Google Drive o Dropbox",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "Unlimited accounts and recurring transactions need the paid upgrade",
                                    es: "Las cuentas ilimitadas y los movimientos recurrentes requieren la mejora de pago",
                                }),
                            },
                        ],
                        name: "Monefy",
                        slug: "monefy",
                        summary: t({
                            en: "Monefy is an expense tracker for iPhone and Android that logs a purchase in two taps, free at its core.",
                            es: "Monefy es una app para controlar gastos en iPhone y Android que registra una compra en dos toques, gratis en lo básico.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://help.realbyteapps.com/hc/en-us/articles/10669850586649-Is-the-paid-app-an-one-time-payment-or-a-subscription-service",
                                text: t({
                                    en: "Premium is a one-time purchase, not a subscription",
                                    es: "Premium es un solo pago, no una suscripción",
                                }),
                            },
                            {
                                label: t({ en: "Free plan", es: "Plan gratis" }),
                                source: "https://help.realbyteapps.com/hc/en-us/articles/360042746754-Refer-your-friends",
                                text: t({ en: "Up to 15 accounts", es: "Hasta 15 cuentas" }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://help.realbyteapps.com/hc/en-us/articles/360043536233-How-to-import-bulk-data-by-Excel-file",
                                text: t({
                                    en: "By hand, or in bulk from an Excel file",
                                    es: "A mano, o en bloque desde un archivo de Excel",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://help.realbyteapps.com/hc/en-us/articles/360042988234-How-to-add-sub-currencies",
                                text: t({
                                    en: "Sub-currencies next to a main one, with rates you update by hand",
                                    es: "Submonedas junto a una principal, con tasas que actualizas a mano",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.realbyteapps.com/",
                                text: t({ en: "iPhone, Android", es: "iPhone, Android" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://help.realbyteapps.com/hc/en-us/articles/360042988234-How-to-add-sub-currencies",
                                text: t({
                                    en: "Rates for other currencies are ones you update by hand",
                                    es: "Las tasas de las otras monedas las actualizas a mano",
                                }),
                            },
                        ],
                        name: "Money Manager",
                        slug: "money-manager",
                        summary: t({
                            en: "Money Manager, from Realbyte, is an expense and budget app for iPhone and Android with double-entry bookkeeping.",
                            es: "Money Manager, de Realbyte, es una app de gastos y presupuesto para iPhone y Android con contabilidad de doble entrada.",
                        }),
                    },
                    {
                        facts: [
                            { label: LABELS.price, text: OUTLAYR.price },
                            { label: LABELS.entries, text: OUTLAYR.entries },
                            { label: LABELS.currencies, text: OUTLAYR.currencies },
                            { label: LABELS.platforms, text: OUTLAYR.platforms },
                            {
                                label: t({ en: "Free plan", es: "Plan gratis" }),
                                text: t({
                                    en: "20 voice or receipt captures every 30 days, 2 accounts, 2 category budgets, and accounts in one currency",
                                    es: "20 capturas de voz o de recibos cada 30 días, 2 cuentas, 2 presupuestos por categoría y cuentas en una moneda",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "Voice entry and receipt scans need an account and a connection, with 20 captures every 30 days on the free plan. There is no web app",
                                    es: "Dictar y escanear recibos requiere una cuenta y conexión, con 20 capturas cada 30 días en el plan gratis. No tiene app web",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t(OUTLAYR_LEAD),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.spendee.com/pricing",
                                text: t({
                                    en: "Free basic plan with 1 wallet and 1 budget. Plus $1.99 a month or $14.99 a year, Premium $5.99 a month or $35.99 a year, after a 7-day trial. Prices vary by country",
                                    es: "Plan básico gratis con 1 billetera y 1 presupuesto. Plus US$1.99 al mes o US$14.99 al año, Premium US$5.99 al mes o US$35.99 al año, después de una prueba de 7 días. Los precios cambian según el país",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://www.spendee.com/pricing",
                                text: t({
                                    en: "Cash wallets by hand. Bank sync in Premium",
                                    es: "Billeteras de efectivo a mano. Sincronización bancaria en Premium",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://www.spendee.com/",
                                text: t({ en: "Several currencies", es: "Varias monedas" }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.spendee.com/pricing",
                                text: t({
                                    en: "iPhone, Android, and web. Budgets on the web are coming",
                                    es: "iPhone, Android y web. Los presupuestos en la web llegan pronto",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.spendee.com/pricing",
                                text: t({
                                    en: "The free plan holds 1 wallet and 1 budget, and bank sync needs Premium",
                                    es: "El plan gratis permite 1 billetera y 1 presupuesto, y la sincronización bancaria requiere Premium",
                                }),
                            },
                        ],
                        name: "Spendee",
                        slug: "spendee",
                        summary: t(RIVALS.spendee),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://support.budgetbakers.com/hc/en-us/articles/7151349344018-Everything-about-Premium",
                                text: t({
                                    en: "Free tier. Premium monthly, yearly, or lifetime, priced in the app",
                                    es: "Plan gratis. Premium al mes, al año o de por vida, con precio en la app",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "By hand on the free tier. Bank sync with over 15,000 institutions in Premium",
                                    es: "A mano en el plan gratis. Sincronización con más de 15,000 instituciones en Premium",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "Several, converted at real-time rates",
                                    es: "Varias, convertidas con tasas en tiempo real",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({ en: "iPhone, Android, web", es: "iPhone, Android, web" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://support.budgetbakers.com/hc/en-us/articles/7151349344018-Everything-about-Premium",
                                text: t({
                                    en: "Premium prices are shown only in the app, and bank sync needs Premium",
                                    es: "Los precios de Premium solo aparecen en la app, y la sincronización bancaria requiere Premium",
                                }),
                            },
                        ],
                        name: "Wallet by BudgetBakers",
                        slug: "wallet",
                        summary: t(RIVALS.wallet),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.ynab.com/pricing",
                                text: t({
                                    en: "$14.99 a month or $109 a year, after a 34-day trial",
                                    es: "US$14.99 al mes o US$109 al año, después de una prueba de 34 días",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://www.ynab.com/pricing",
                                text: t({
                                    en: "Bank import for select US, Canadian, UK, and EU banks, or file import",
                                    es: "Importación desde algunos bancos de EE. UU., Canadá, Reino Unido y la UE, o importación de archivos",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://www.ynab.com/pricing",
                                text: t({ en: "One per spending plan", es: "Una por plan de gastos" }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.ynab.com/our-app-lineup",
                                text: t({
                                    en: "iPhone, iPad, Android, Apple Watch, web",
                                    es: "iPhone, iPad, Android, Apple Watch, web",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.ynab.com/pricing",
                                text: t({
                                    en: "No free plan after the 34-day trial, and one currency per spending plan",
                                    es: "No tiene plan gratis después de la prueba de 34 días, y usa una moneda por plan de gastos",
                                }),
                            },
                        ],
                        name: "YNAB",
                        slug: "ynab",
                        summary: t(RIVALS.ynab),
                    },
                ],
                facts: [
                    {
                        label: "Monefy",
                        text: t({
                            en: "Best if you want to log a purchase in two taps, in any of 150+ currencies",
                            es: "Ideal si quieres registrar una compra en dos toques, en cualquiera de más de 150 monedas",
                        }),
                    },
                    {
                        label: "Money Manager",
                        text: t({
                            en: "Best if you want double-entry accounts for cards, savings, and loans, with Premium paid once",
                            es: "Ideal si quieres contabilidad de doble entrada para tarjetas, ahorros y préstamos, con Premium en un solo pago",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you want to log by sentence, voice, or receipt, with each purchase at the rate from its day",
                            es: "Ideal si quieres registrar con una oración, tu voz o un recibo, con cada compra a la tasa de su día",
                        }),
                    },
                    {
                        label: "Spendee",
                        text: t({
                            en: "Best if you want to share wallets with family or friends",
                            es: "Ideal si quieres compartir billeteras con tu familia o tus amigos",
                        }),
                    },
                    {
                        label: "Wallet by BudgetBakers",
                        text: t({
                            en: "Best if you want bank sync with banks in many countries, in Premium",
                            es: "Ideal si quieres sincronizar bancos de muchos países, en Premium",
                        }),
                    },
                    {
                        label: "YNAB",
                        text: t({
                            en: "Best if you want to give every dollar a job, with bank import in the US, Canada, the UK, or the EU",
                            es: "Ideal si quieres darle un trabajo a cada dólar, con importación bancaria en EE. UU., Canadá, Reino Unido o la UE",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on how you want to log. Monefy logs a purchase in two taps. Money Manager keeps double-entry accounts, up to 15 on its free version. Spendee and Wallet by BudgetBakers start free and sync bank accounts in Premium. Outlayr logs by sentence, voice, or receipt on its free plan. YNAB is paid after a 34-day trial.",
                            es: "Depende de cómo quieras registrar. Monefy registra una compra en dos toques. Money Manager lleva contabilidad de doble entrada, con hasta 15 cuentas en su versión gratis. Spendee y Wallet by BudgetBakers empiezan gratis y sincronizan cuentas de banco en Premium. Outlayr registra con una oración, tu voz o un recibo en su plan gratis. YNAB es de pago después de una prueba de 34 días.",
                        }),
                        question: t({
                            en: "What is the best free expense tracker app?",
                            es: "¿Cuál es la mejor app gratis para controlar gastos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Monefy supports 150+ currencies, Wallet by BudgetBakers converts at real-time rates, and Spendee supports several. Money Manager adds sub-currencies at rates you update by hand, and YNAB uses one currency per spending plan. Outlayr has 165 and converts each purchase at the rate from its day. Its free plan holds accounts in one currency.",
                            es: "Monefy admite más de 150 monedas, Wallet by BudgetBakers convierte con tasas en tiempo real y Spendee admite varias. Money Manager agrega submonedas con tasas que actualizas a mano, y YNAB usa una moneda por plan de gastos. Outlayr tiene 165 y convierte cada compra con la tasa de su día. Su plan gratis permite cuentas en una moneda.",
                        }),
                        question: t({
                            en: "Which expense tracker handles more than one currency?",
                            es: "¿Qué app para controlar gastos maneja varias monedas?",
                        }),
                    },
                    COST_FAQ,
                    {
                        answer: t({
                            en: "Yes. The app and this site are in English and Latin American Spanish.",
                            es: "Sí. La app y este sitio están en inglés y en español de Latinoamérica.",
                        }),
                        question: t({ en: "Is Outlayr in Spanish?", es: "¿Outlayr está en español?" }),
                    },
                ],
                lead: t({
                    en: "Six expense trackers, each best for a different need: Monefy, Money Manager, Outlayr, Spendee, Wallet by BudgetBakers, and YNAB. All but YNAB are free to start. Outlayr is ours; the other five are not.",
                    es: "Seis apps para controlar gastos, cada una mejor para algo distinto: Monefy, Money Manager, Outlayr, Spendee, Wallet by BudgetBakers y YNAB. Todas menos YNAB son gratis para empezar. Outlayr es nuestra; las otras cinco no.",
                }),
                meta: {
                    description: t({
                        en: "Monefy, Money Manager, Outlayr, Spendee, Wallet, and YNAB compared on price, entry, currencies, and platforms. Outlayr is ours; the other five are not.",
                        es: "Monefy, Money Manager, Outlayr, Spendee, Wallet y YNAB comparadas en precio, registro, monedas y plataformas. Outlayr es nuestra; las otras cinco no.",
                    }),
                    title: t({
                        en: "Best Expense Tracker Apps, Compared (2026) · Outlayr",
                        es: "Mejores apps para controlar gastos (2026) · Outlayr",
                    }),
                },
                picked: [
                    t({
                        en: "Each app here tracks what you spend on a phone, and each one fits a different need, from logging in two taps to syncing a bank or giving every dollar a job. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista lleva lo que gastas desde el celular, y cada una sirve para algo distinto, desde registrar en dos toques hasta sincronizar el banco o darle un trabajo a cada dólar. Van en orden alfabético, no por puesto.",
                    }),
                    t({
                        en: "Every detail about the other apps was read on that app's own site, help center, or store listing on the date below the table, and links to the page it came from. These are the facts as each app states them, not results of our own testing.",
                        es: "Cada dato de las otras apps se leyó en el sitio, el centro de ayuda o la ficha de la tienda de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió. Son los datos tal como los da cada app, no resultados de pruebas nuestras.",
                    }),
                    t({
                        en: "Outlayr is ours. It gets the same facts as the others, including its own Watch out for row.",
                        es: "Outlayr es nuestra. Tiene los mismos datos que las demás, incluida su propia fila de Ten en cuenta.",
                    }),
                ],
                related: [
                    "/guides/voice-expense-tracker",
                    "/compare/fintonic",
                    "/guides/best-open-source-expense-tracker-apps",
                ] satisfies PageRef[],
                sources: t({
                    en: "Each detail about the other apps links to the page it was read on",
                    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
                }),
                title: t({
                    en: "The best expense tracker apps, by what you need.",
                    es: "La mejor app para controlar gastos, según lo que necesitas.",
                }),
            },
            "best-open-source-expense-tracker-apps": {
                apps: [
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://actualbudget.org/",
                                text: t({
                                    en: "Free. Hosting its sync server on PikaPods is paid",
                                    es: "Gratis. Alojar su servidor de sincronización en PikaPods es de pago",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://actualbudget.org/docs/advanced/bank-sync/",
                                text: t({
                                    en: "By hand, QIF, OFX, QFX, CAMT.053, or CSV files, and bank sync through a server you run, with Enable Banking in Europe, SimpleFIN in North America, Akahu in New Zealand, or Pluggy.ai in Brazil",
                                    es: "A mano, archivos QIF, OFX, QFX, CAMT.053 o CSV, y sincronización bancaria con un servidor propio, con Enable Banking en Europa, SimpleFIN en Norteamérica, Akahu en Nueva Zelanda o Pluggy.ai en Brasil",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://actualbudget.org/docs/budgeting/multi-currency/",
                                text: t({
                                    en: "One per budget. Other currencies through an experimental rule that converts them",
                                    es: "Una por presupuesto. Otras monedas con una regla experimental que las convierte",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://actualbudget.org/download",
                                text: t({ en: "Windows, macOS, Linux", es: "Windows, macOS, Linux" }),
                            },
                            {
                                label: LABELS.phone,
                                source: "https://actualbudget.org/docs/faq",
                                text: t({
                                    en: "A web app you add to the home screen. The official phone apps are deprecated",
                                    es: "Una app web que agregas a la pantalla de inicio. Las apps oficiales para celular quedaron obsoletas",
                                }),
                            },
                            {
                                label: LABELS.license,
                                source: "https://github.com/actualbudget/actual",
                                text: t({ en: "MIT", es: "MIT" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://actualbudget.org/docs/install/",
                                text: t({
                                    en: "Your devices sync only through a server you run or rent",
                                    es: "Tus dispositivos solo se sincronizan con un servidor que manejas o alquilas",
                                }),
                            },
                        ],
                        name: "Actual Budget",
                        slug: "actual",
                        summary: t({
                            en: "Actual Budget is a local-first envelope budgeting app for Windows, macOS, Linux, and the web, free and open source under the MIT license.",
                            es: "Actual Budget es una app de presupuesto por sobres que guarda tus datos primero en tu equipo, para Windows, macOS, Linux y la web, gratis y de código abierto con licencia MIT.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/us/app/cashew-expense-budget-tracker/id6463662930",
                                text: t({
                                    en: "Free. Cashew Pro is $1.49 a month, $11.99 a year, or $19.99 once on the US App Store",
                                    es: "Gratis. Cashew Pro cuesta US$1.49 al mes, US$11.99 al año o US$19.99 en un solo pago en el App Store de EE. UU.",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://github.com/jameskokoska/Cashew",
                                text: t({
                                    en: "By hand, CSV or Google Sheets import, or links that fill in a transaction for you",
                                    es: "A mano, importando un CSV o una hoja de Google Sheets, o con enlaces que llenan un movimiento por ti",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://github.com/jameskokoska/Cashew",
                                text: t({
                                    en: "Several, with up-to-date conversion rates",
                                    es: "Varias, con tasas de conversión actualizadas",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://github.com/jameskokoska/Cashew",
                                text: t({ en: "iPhone, Android, web", es: "iPhone, Android, web" }),
                            },
                            {
                                label: LABELS.license,
                                source: "https://github.com/jameskokoska/Cashew",
                                text: t({ en: "GPL-3.0", es: "GPL-3.0" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/us/app/cashew-expense-budget-tracker/id6463662930",
                                text: t({
                                    en: "Some features are in Cashew Pro, a paid upgrade",
                                    es: "Algunas funciones están en Cashew Pro, una mejora de pago",
                                }),
                            },
                        ],
                        name: "Cashew",
                        slug: "cashew",
                        summary: t({
                            en: "Cashew is an expense and budget tracker for iPhone, Android, and the web, free with an optional Pro, and open source under GPL-3.0.",
                            es: "Cashew es una app de gastos y presupuesto para iPhone, Android y la web, gratis con un Pro opcional, y de código abierto con licencia GPL-3.0.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://github.com/firefly-iii/firefly-iii",
                                text: t({
                                    en: "Free to host yourself. Paid hosting on services like LumaDock or PikaPods",
                                    es: "Gratis si lo alojas tú. Alojamiento de pago en servicios como LumaDock o PikaPods",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://github.com/firefly-iii/data-importer",
                                text: t({
                                    en: "By hand, or the Data Importer for CSV and CAMT files and bank data from third-party providers, some of them paid",
                                    es: "A mano, o con el Data Importer para archivos CSV y CAMT y datos bancarios de proveedores externos, algunos de pago",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://github.com/firefly-iii/firefly-iii",
                                text: t({ en: "Any currency you want", es: "Cualquier moneda que quieras" }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://github.com/firefly-iii/firefly-iii",
                                text: t({
                                    en: "A web app on your own server, with Docker",
                                    es: "Una app web en tu propio servidor, con Docker",
                                }),
                            },
                            {
                                label: LABELS.phone,
                                source: "https://docs.firefly-iii.org/references/firefly-iii/third-parties/apps/",
                                text: t({
                                    en: "Through apps made by third parties, like Abacus or Waterfly III",
                                    es: "Con apps hechas por terceros, como Abacus o Waterfly III",
                                }),
                            },
                            {
                                label: LABELS.license,
                                source: "https://github.com/firefly-iii/firefly-iii",
                                text: t({ en: "AGPL-3.0", es: "AGPL-3.0" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://github.com/firefly-iii/firefly-iii",
                                text: t({
                                    en: "You run it on your own server with Docker, or pay for hosting, and phone apps come from third parties",
                                    es: "La usas en tu propio servidor con Docker, o pagas un alojamiento, y las apps para celular las hacen terceros",
                                }),
                            },
                        ],
                        name: "Firefly III",
                        slug: "firefly-iii",
                        summary: t({
                            en: "Firefly III is a self-hosted personal finance manager with budgets, rules, and recurring transactions, free and open source under AGPL-3.0.",
                            es: "Firefly III es un gestor de finanzas personales que alojas tú mismo, con presupuestos, reglas y movimientos recurrentes, gratis y de código abierto con licencia AGPL-3.0.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://flow.gege.mn/",
                                text: t({
                                    en: "Free, with optional donations",
                                    es: "Gratis, con donaciones opcionales",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://flow.gege.mn/",
                                text: t({
                                    en: "By hand, iOS Shortcuts, recurring entries, or receipts read by Eny, a separate service",
                                    es: "A mano, Atajos de iOS, movimientos recurrentes o recibos leídos por Eny, un servicio aparte",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://github.com/flow-mn/flow",
                                text: t({
                                    en: "As many as you want, crypto included. Rates need a connection",
                                    es: "Todas las que quieras, cripto incluidas. Las tasas necesitan conexión",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://github.com/flow-mn/flow",
                                text: t({ en: "iPhone and Android, in beta", es: "iPhone y Android, en beta" }),
                            },
                            {
                                label: LABELS.license,
                                source: "https://github.com/flow-mn/flow",
                                text: t({ en: "GPL-3.0", es: "GPL-3.0" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://github.com/flow-mn/flow",
                                text: t({
                                    en: "The phone apps are in beta, and exchange rates need a connection",
                                    es: "Las apps para celular están en beta, y las tasas de cambio necesitan conexión",
                                }),
                            },
                        ],
                        name: "Flow",
                        slug: "flow",
                        summary: t({
                            en: "Flow is a free expense tracker for iPhone and Android that works fully offline, with no analytics, open source under GPL-3.0.",
                            es: "Flow es una app gratis para controlar gastos en iPhone y Android que funciona sin conexión y sin analíticas, de código abierto con licencia GPL-3.0.",
                        }),
                    },
                    {
                        facts: [
                            { label: LABELS.price, text: OUTLAYR.price },
                            { label: LABELS.entries, text: OUTLAYR.entries },
                            { label: LABELS.currencies, text: OUTLAYR.currencies },
                            { label: LABELS.platforms, text: OUTLAYR.platforms },
                            {
                                label: LABELS.license,
                                source: "https://github.com/danestves/outlayr",
                                text: t({ en: "GPL-3.0 app, AGPL-3.0 server", es: "App GPL-3.0, servidor AGPL-3.0" }),
                            },
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "Voice entry and receipt scans run on Outlayr's servers through Anthropic and ElevenLabs, and need an account. Typing works offline",
                                    es: "Dictar y escanear recibos pasa por los servidores de Outlayr, con Anthropic y ElevenLabs, y requiere una cuenta. Escribir funciona sin conexión",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t(OUTLAYR_LEAD),
                    },
                ],
                facts: [
                    {
                        label: "Actual Budget",
                        text: t({
                            en: "Best if you want envelope budgeting on a computer, with bank sync through your own server in North America, Europe, New Zealand, or Brazil",
                            es: "Ideal si quieres presupuestar por sobres en la computadora, con sincronización bancaria desde tu propio servidor en Norteamérica, Europa, Nueva Zelanda o Brasil",
                        }),
                    },
                    {
                        label: "Cashew",
                        text: t({
                            en: "Best if you want one app on iPhone, Android, and the web, with CSV and Google Sheets import",
                            es: "Ideal si quieres una sola app en iPhone, Android y la web, con importación de CSV y Google Sheets",
                        }),
                    },
                    {
                        label: "Firefly III",
                        text: t({
                            en: "Best if you want to run it on your own server, in any currency, with rules and an API",
                            es: "Ideal si quieres usarla en tu propio servidor, en cualquier moneda, con reglas y una API",
                        }),
                    },
                    {
                        label: "Flow",
                        text: t({
                            en: "Best if you want a free phone app that works fully offline, with no analytics",
                            es: "Ideal si quieres una app gratis para el celular que funcione sin conexión y sin analíticas",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you want to log by sentence, voice, or receipt, with each purchase at the rate from its day",
                            es: "Ideal si quieres registrar con una oración, tu voz o un recibo, con cada compra a la tasa de su día",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on where you want it to run. Cashew and Flow are phone apps, and Cashew also runs on the web. Actual Budget runs on Windows, macOS, Linux, and the web, with envelope budgeting. Firefly III runs on your own server. Outlayr logs by sentence, voice, or receipt on Android, with iPhone coming. All five are free to start.",
                            es: "Depende de dónde quieras usarla. Cashew y Flow son apps para el celular, y Cashew también funciona en la web. Actual Budget funciona en Windows, macOS, Linux y la web, con presupuesto por sobres. Firefly III funciona en tu propio servidor. Outlayr registra con una oración, tu voz o un recibo en Android, y pronto llegará a iPhone. Las cinco son gratis para empezar.",
                        }),
                        question: t({
                            en: "What is the best open source expense tracker?",
                            es: "¿Cuál es la mejor app de gastos de código abierto?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Cashew, Flow, and Outlayr are on the App Store. Actual Budget runs as a web app you add to the home screen, since its official phone apps are deprecated. Firefly III works through apps made by third parties.",
                            es: "Cashew, Flow y Outlayr están en el App Store. Actual Budget funciona como una app web que agregas a la pantalla de inicio, porque sus apps oficiales para celular quedaron obsoletas. Firefly III funciona con apps hechas por terceros.",
                        }),
                        question: t({
                            en: "Which open source expense tracker works on iPhone?",
                            es: "¿Qué app de gastos de código abierto funciona en iPhone?",
                        }),
                    },
                    { answer: OPEN_SOURCE_ANSWER, question: OPEN_SOURCE_QUESTION },
                    COST_FAQ,
                ],
                lead: t({
                    en: "Five open source expense trackers, each best for a different need: Actual Budget, Cashew, Firefly III, Flow, and Outlayr. Anyone can read the code of all five. Outlayr is ours; the other four are not.",
                    es: "Cinco apps de gastos de código abierto, cada una mejor para algo distinto: Actual Budget, Cashew, Firefly III, Flow y Outlayr. Cualquiera puede leer el código de las cinco. Outlayr es nuestra; las otras cuatro no.",
                }),
                meta: {
                    description: t({
                        en: "Actual Budget, Cashew, Firefly III, Flow, and Outlayr compared on price, entry, currencies, platforms, and license. Outlayr is ours; the others are not.",
                        es: "Actual Budget, Cashew, Firefly III, Flow y Outlayr comparadas en precio, registro, monedas, plataformas y licencia. Outlayr es nuestra; las demás no.",
                    }),
                    title: t({
                        en: "Best Open Source Expense Tracker Apps (2026) · Outlayr",
                        es: "Mejores apps de gastos de código abierto (2026) · Outlayr",
                    }),
                },
                picked: [
                    t({
                        en: "Each app here publishes its code under an open source license, and each one fits a different need, from a phone app that works offline to a server you run yourself. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista publica su código con una licencia de código abierto, y cada una sirve para algo distinto, desde una app para el celular que funciona sin conexión hasta un servidor que manejas tú. Van en orden alfabético, no por puesto.",
                    }),
                    t({
                        en: "Every detail about the other apps was read on that app's own site, code repository, or store listing on the date below the table, and links to the page it came from. These are the facts as each app states them, not results of our own testing.",
                        es: "Cada dato de las otras apps se leyó en el sitio, el repositorio de código o la ficha de la tienda de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió. Son los datos tal como los da cada app, no resultados de pruebas nuestras.",
                    }),
                    t({
                        en: "Outlayr is ours. It gets the same facts as the others, including its own Watch out for row.",
                        es: "Outlayr es nuestra. Tiene los mismos datos que las demás, incluida su propia fila de Ten en cuenta.",
                    }),
                ],
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/compare/wallet",
                    "/compare/spendee",
                ] satisfies PageRef[],
                sources: t({
                    en: "Each detail about the other apps links to the page it was read on",
                    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
                }),
                title: t({
                    en: "The best open source expense trackers, by what you need.",
                    es: "La mejor app de gastos de código abierto, según lo que necesitas.",
                }),
            },
            "best-subscription-tracker-apps": {
                apps: [
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
                                text: t({
                                    en: "Free, with in-app purchases from $0.99 to $2.99 in the US App Store",
                                    es: "Gratis, con compras dentro de la app de US$0.99 a US$2.99 en el App Store de EE. UU.",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
                                text: t({
                                    en: "Picked from hundreds of known subscriptions, or added by hand",
                                    es: "Las eliges entre cientos de suscripciones conocidas o las agregas a mano",
                                }),
                            },
                            {
                                label: LABELS.subscriptions,
                                source: "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
                                text: t({
                                    en: "What they cost each month, and a notice when a bill is due",
                                    es: "Cuánto cuestan al mes y un aviso cuando vence un cobro",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
                                text: t({
                                    en: "Several, with exchange rates updated daily",
                                    es: "Varias, con tasas de cambio que se actualizan a diario",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
                                text: "iPhone",
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
                                text: t({
                                    en: "iPhone only, and you add each subscription yourself",
                                    es: "Solo para iPhone, y agregas tú cada suscripción",
                                }),
                            },
                        ],
                        name: "Bobby",
                        slug: "bobby",
                        summary: t({
                            en: "Bobby is an iPhone app that keeps a list of your subscriptions and notifies you when a bill is due.",
                            es: "Bobby es una app para iPhone que guarda la lista de tus suscripciones y te avisa cuando vence un cobro.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.monarch.com/pricing",
                                text: t({
                                    en: "$14.99 a month or $99.99 a year, after a 7-day trial. Plus is $199.99 a year",
                                    es: "US$14.99 al mes o US$99.99 al año, después de una prueba de 7 días. Plus cuesta US$199.99 al año",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://www.monarch.com/features/tracking",
                                text: t({
                                    en: "Synced from linked accounts",
                                    es: "Sincronizados desde cuentas vinculadas",
                                }),
                            },
                            {
                                label: LABELS.subscriptions,
                                source: "https://www.monarch.com/features/tracking",
                                text: t({
                                    en: "Found in your transactions and shown as a list or a calendar, with reminders",
                                    es: "Las detecta en tus movimientos y las muestra en lista o en calendario, con avisos",
                                }),
                            },
                            {
                                label: LABELS.availability,
                                source: "https://www.monarch.com/download",
                                text: t({ en: "The United States and Canada", es: "Estados Unidos y Canadá" }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.monarch.com/download",
                                text: t({ en: "Web, iPhone, iPad, Android", es: "Web, iPhone, iPad, Android" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.monarch.com/pricing",
                                text: t({
                                    en: "No free plan after the 7-day trial, and only in the United States and Canada",
                                    es: "No tiene plan gratis después de la prueba de 7 días, y solo funciona en Estados Unidos y Canadá",
                                }),
                            },
                        ],
                        name: "Monarch",
                        slug: "monarch",
                        summary: t(RIVALS.monarch),
                    },
                    {
                        facts: [
                            { label: LABELS.price, text: OUTLAYR.price },
                            { label: LABELS.entries, text: OUTLAYR.entries },
                            { label: LABELS.subscriptions, text: OUTLAYR_SUBSCRIPTIONS },
                            { label: LABELS.currencies, text: OUTLAYR.currencies },
                            { label: LABELS.platforms, text: OUTLAYR.platforms },
                            {
                                label: t({ en: "Free plan", es: "Plan gratis" }),
                                text: t({
                                    en: "Subscriptions, reminders, and Upcoming are free",
                                    es: "Las suscripciones, los avisos y Próximos son gratis",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "It doesn't find subscriptions for you, cancel them, or negotiate bills. You add each one once",
                                    es: "No encuentra suscripciones por ti, no las cancela ni negocia facturas. Agregas cada una una vez",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t(OUTLAYR_LEAD),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://pocketguard.com/pricing/",
                                text: t({
                                    en: "$12.99 a month, $74.99 a year, or $149.99 once, after a 7-day trial",
                                    es: "US$12.99 al mes, US$74.99 al año o US$149.99 en un solo pago, después de una prueba de 7 días",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://pocketguard.com/pricing/",
                                text: t({
                                    en: "Synced from linked accounts, plus cash transactions and file import",
                                    es: "Sincronizados desde cuentas vinculadas, más movimientos en efectivo e importación de archivos",
                                }),
                            },
                            {
                                label: LABELS.subscriptions,
                                source: "https://pocketguard.com/cancel-subscriptions/",
                                text: t({
                                    en: "Found in linked accounts. You cancel each one with the service",
                                    es: "Las encuentra en tus cuentas vinculadas. Tú cancelas cada una con el servicio",
                                }),
                            },
                            {
                                label: LABELS.availability,
                                source: "https://pocketguard.com/",
                                text: t({
                                    en: "Linked accounts in the US, Canada, and the UK",
                                    es: "Cuentas vinculadas en EE. UU., Canadá y Reino Unido",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://pocketguard.com/pricing/",
                                text: t({
                                    en: "Web, iPhone, Apple Watch, Android",
                                    es: "Web, iPhone, Apple Watch, Android",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://pocketguard.com/pricing/",
                                text: t({
                                    en: "No free plan after the 7-day trial, and you cancel each subscription with the service yourself",
                                    es: "No tiene plan gratis después de la prueba de 7 días, y cancelas tú cada suscripción con el servicio",
                                }),
                            },
                        ],
                        name: "PocketGuard",
                        slug: "pocketguard",
                        summary: t(RIVALS.pocketguard),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "Free plan. Premium is pay what you want, typically $7 to $14 a month. Premium+ is $15 a month",
                                    es: "Plan gratis. Premium es paga lo que quieras, normalmente de US$7 a US$14 al mes. Premium+ cuesta US$15 al mes",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "Synced from linked accounts. Manual transactions are a Premium feature",
                                    es: "Sincronizados desde cuentas vinculadas. Los movimientos a mano son una función Premium",
                                }),
                            },
                            {
                                label: LABELS.subscriptions,
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "Found in linked accounts. Its team cancels them for Premium members, usually in 2 to 10 days",
                                    es: "Las encuentra en tus cuentas vinculadas. Su equipo las cancela para los miembros Premium, normalmente en 2 a 10 días",
                                }),
                            },
                            {
                                label: t({ en: "Bills", es: "Facturas" }),
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "Its team negotiates bills, for 35% to 60% of the first year's savings when it works",
                                    es: "Su equipo negocia tus facturas, por el 35% al 60% del ahorro del primer año cuando lo logra",
                                }),
                            },
                            {
                                label: LABELS.availability,
                                source: "https://help.rocketmoney.com/en/articles/79778-does-rocket-money-support-international-banks",
                                text: t({
                                    en: "The United States, with U.S. banks",
                                    es: "Estados Unidos, con bancos de EE. UU.",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "iPhone, Android. Web is a Premium feature",
                                    es: "iPhone, Android. La web es una función Premium",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "Only in the United States, manual transactions need Premium, and bill negotiation costs 35% to 60% of the first year's savings",
                                    es: "Solo en Estados Unidos, los movimientos a mano requieren Premium y negociar facturas cuesta del 35% al 60% del ahorro del primer año",
                                }),
                            },
                        ],
                        name: "Rocket Money",
                        slug: "rocket-money",
                        summary: t(RIVALS.rocketMoney),
                    },
                ],
                facts: [
                    {
                        label: "Bobby",
                        text: t({
                            en: "Best if you want a plain list of your subscriptions on iPhone",
                            es: "Ideal si quieres una lista simple de tus suscripciones en iPhone",
                        }),
                    },
                    {
                        label: "Monarch",
                        text: t({
                            en: "Best if you want subscriptions next to budgets and investments from linked accounts, in the US or Canada",
                            es: "Ideal si quieres tus suscripciones junto a presupuestos e inversiones de cuentas vinculadas, en EE. UU. o Canadá",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you want subscriptions in the same log as your daily spending, in any of 165 currencies, on a free plan",
                            es: "Ideal si quieres tus suscripciones en el mismo registro que tus gastos del día, en cualquiera de 165 monedas, con un plan gratis",
                        }),
                    },
                    {
                        label: "PocketGuard",
                        text: t({
                            en: "Best if you want recurring charges found in linked accounts, then cancel them yourself",
                            es: "Ideal si quieres que encuentre los cobros recurrentes en tus cuentas vinculadas y cancelarlos tú",
                        }),
                    },
                    {
                        label: "Rocket Money",
                        text: t({
                            en: "Best if you live in the United States and want its team to cancel subscriptions for you",
                            es: "Ideal si vives en Estados Unidos y quieres que su equipo cancele suscripciones por ti",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on what you need. In the United States, Rocket Money's team can cancel subscriptions for you on Premium. PocketGuard and Monarch find recurring charges in linked accounts. Bobby keeps a plain list on iPhone. Outlayr logs each subscription on its day next to your daily spending, on a free plan.",
                            es: "Depende de lo que necesites. En Estados Unidos, el equipo de Rocket Money puede cancelar suscripciones por ti con Premium. PocketGuard y Monarch encuentran los cobros recurrentes en tus cuentas vinculadas. Bobby lleva una lista simple en iPhone. Outlayr registra cada suscripción en su día junto a tus gastos diarios, con un plan gratis.",
                        }),
                        question: t({
                            en: "What is the best app to track subscriptions?",
                            es: "¿Cuál es la mejor app para gestionar suscripciones?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. In Outlayr, subscriptions, reminders, and Upcoming are part of the free plan. Rocket Money's free plan tracks subscriptions, and Bobby is free with in-app purchases. PocketGuard and Monarch are paid after a 7-day trial.",
                            es: "Sí. En Outlayr, las suscripciones, los avisos y Próximos son parte del plan gratis. El plan gratis de Rocket Money controla suscripciones, y Bobby es gratis con compras dentro de la app. PocketGuard y Monarch son de pago después de una prueba de 7 días.",
                        }),
                        question: t({
                            en: "Is there a free subscription tracker app?",
                            es: "¿Hay una app gratis para controlar suscripciones?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. You add each subscription once, and Outlayr shows what it costs and when it charges next, and can remind you before the charge, so you cancel with the service yourself. Rocket Money's team cancels subscriptions for its Premium members.",
                            es: "No. Agregas cada suscripción una vez, y Outlayr te muestra cuánto cuesta y cuándo vuelve a cobrar, y puede avisarte antes del cobro, para que la canceles tú con el servicio. El equipo de Rocket Money cancela suscripciones para sus miembros Premium.",
                        }),
                        question: t({
                            en: "Does Outlayr cancel subscriptions?",
                            es: "¿Outlayr cancela suscripciones?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Rocket Money is available in the United States only, and Monarch in the United States and Canada. PocketGuard links accounts in the US, Canada, and the UK. Outlayr is offered in 175 countries and regions, in English and Spanish.",
                            es: "Rocket Money solo está disponible en Estados Unidos, y Monarch en Estados Unidos y Canadá. PocketGuard vincula cuentas de EE. UU., Canadá y Reino Unido. Outlayr se ofrece en 175 países y regiones, en inglés y en español.",
                        }),
                        question: t({
                            en: "Which subscription trackers work outside the United States?",
                            es: "¿Qué apps de suscripciones funcionan fuera de Estados Unidos?",
                        }),
                    },
                ],
                lead: t({
                    en: "Five apps to track subscriptions, each best for a different need: Bobby, Monarch, Outlayr, PocketGuard, and Rocket Money. Outlayr is ours; the other four are not. Outlayr does not cancel subscriptions or negotiate bills, and Rocket Money's team does both.",
                    es: "Cinco apps para controlar suscripciones, cada una mejor para algo distinto: Bobby, Monarch, Outlayr, PocketGuard y Rocket Money. Outlayr es nuestra; las otras cuatro no. Outlayr no cancela suscripciones ni negocia facturas, y el equipo de Rocket Money hace las dos cosas.",
                }),
                meta: {
                    description: t({
                        en: "Bobby, Monarch, Outlayr, PocketGuard, and Rocket Money compared on price, how subscriptions get in, and where each works. Outlayr is ours; the rest are not.",
                        es: "Bobby, Monarch, Outlayr, PocketGuard y Rocket Money comparadas en precio, cómo entran las suscripciones y dónde funcionan. Outlayr es nuestra.",
                    }),
                    title: t({
                        en: "Best Subscription Tracker Apps, Compared (2026) · Outlayr",
                        es: "Mejores apps para controlar suscripciones (2026) · Outlayr",
                    }),
                },
                picked: [
                    t({
                        en: "Each app here shows what your subscriptions cost, whether you add them yourself or the app finds them in linked accounts, and each one fits a different need. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista te muestra cuánto cuestan tus suscripciones, ya sea que las agregues tú o que la app las encuentre en tus cuentas vinculadas, y cada una sirve para algo distinto. Van en orden alfabético, no por puesto.",
                    }),
                    t({
                        en: "Every detail about the other apps was read on that app's own site, help center, or store listing on the date below the table, and links to the page it came from. These are the facts as each app states them, not results of our own testing.",
                        es: "Cada dato de las otras apps se leyó en el sitio, el centro de ayuda o la ficha de la tienda de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió. Son los datos tal como los da cada app, no resultados de pruebas nuestras.",
                    }),
                    t({
                        en: "Outlayr is ours. It gets the same facts as the others, including its own Watch out for row.",
                        es: "Outlayr es nuestra. Tiene los mismos datos que las demás, incluida su propia fila de Ten en cuenta.",
                    }),
                ],
                related: [
                    "/guides/subscription-tracker",
                    "/tools/subscription-cost-calculator",
                    "/compare/rocket-money",
                ] satisfies PageRef[],
                sources: t({
                    en: "Each detail about the other apps links to the page it was read on",
                    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
                }),
                title: t({
                    en: "The best subscription tracker apps, by what you need.",
                    es: "Las mejores apps para controlar suscripciones, según lo que necesitas.",
                }),
            },
            "budget-planner": {
                facts: [
                    {
                        label: t({ en: "Limits", es: "Límites" }),
                        text: t({
                            en: "One per category, or one overall budget",
                            es: "Uno por categoría, o un presupuesto general",
                        }),
                    },
                    {
                        label: t({ en: "Periods", es: "Períodos" }),
                        text: t({ en: "A day, a week, a month, or a year", es: "Un día, una semana, un mes o un año" }),
                    },
                    {
                        label: t({ en: "Carry-over", es: "Acumular" }),
                        text: t({
                            en: "What you don't spend is added to the next period, and what you overspend is taken off it",
                            es: "Lo que no gastas se suma al siguiente período, y lo que te pasas se resta",
                        }),
                    },
                    {
                        label: t({ en: "Pace", es: "Ritmo" }),
                        text: t({
                            en: "How far short this pace ends, or the day the money ran out",
                            es: "Cuánto te va a faltar a este ritmo, o el día en que se acabó el dinero",
                        }),
                    },
                    {
                        label: t({ en: "Month start", es: "Inicio del mes" }),
                        text: t({
                            en: "Any day of the month, like payday",
                            es: "Cualquier día del mes, como el día de pago",
                        }),
                    },
                    {
                        label: t({ en: "Free plan", es: "Plan gratis" }),
                        text: t({
                            en: "2 category budgets. Unlimited with Pro",
                            es: "2 presupuestos por categoría. Sin límite con Pro",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Yes. Set a limit per category or one for the whole month, and Outlayr shows what is left and where your current pace ends as you log.",
                            es: "Sí. Pon un límite por categoría o uno para todo el mes, y Outlayr te muestra lo que queda y a dónde te lleva tu ritmo mientras registras.",
                        }),
                        question: t({
                            en: "Can Outlayr plan a monthly budget?",
                            es: "¿Outlayr sirve para armar un presupuesto mensual?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. In Settings, under Time frames, pick the day your month starts. Budgets and insights then run from that day, so a month can start on payday.",
                            es: "Sí. En Configuración, en Períodos de tiempo, elige el día en que empieza tu mes. Los presupuestos y las estadísticas corren desde ese día, así que el mes puede empezar el día de pago.",
                        }),
                        question: t({
                            en: "Can my budget month start on payday?",
                            es: "¿Mi mes de presupuesto puede empezar el día de pago?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Turn on carry-over for a budget and what you don't spend is added to the next period. If you overspend, the difference is taken off the next one.",
                            es: "Activa la opción de acumular en un presupuesto y lo que no gastes se suma al siguiente período. Si te pasas, la diferencia se resta del siguiente.",
                        }),
                        question: t({
                            en: "What happens to money I don't spend?",
                            es: "¿Qué pasa con el dinero que no gasto?",
                        }),
                    },
                ],
                lead: t({
                    en: "Outlayr sets a budget per category or one for the whole month, carries over what you did not spend, and says where your current pace ends before the month does.",
                    es: "Outlayr pone un presupuesto por categoría o uno para todo el mes, acumula lo que no gastaste y te dice a dónde te lleva tu ritmo antes de que termine el mes.",
                }),
                meta: {
                    description: t({
                        en: "Outlayr sets a budget per category or one for the whole month, carries over what you did not spend, and says where your current pace ends.",
                        es: "Outlayr pone un presupuesto por categoría o uno para todo el mes, acumula lo que no gastaste y te dice a dónde te lleva tu ritmo antes de que termine el mes.",
                    }),
                    title: t({
                        en: "Budget Planner App: Limits, Carry-Over, and Pace · Outlayr",
                        es: "App de presupuesto mensual: límites y ritmo · Outlayr",
                    }),
                },
                plateAlt: BUDGETS_SCREEN_ALT,
                related: [
                    "/tools/50-30-20-budget-calculator",
                    "/tools/installment-calculator",
                    "/compare/ynab",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "On Budgets, pick a category or set one limit for the month. Categories without a budget show what you typically spend.",
                            es: "En Presupuestos, elige una categoría o pon un límite para el mes. Las categorías sin presupuesto muestran lo que gastas normalmente.",
                        }),
                        title: t({ en: "Set a limit", es: "Pon un límite" }),
                    },
                    {
                        text: t({
                            en: "Each entry updates what is left and the pace, whether you type, say, or scan it.",
                            es: "Cada registro actualiza lo que queda y el ritmo, ya sea que lo escribas, lo dictes o lo escanees.",
                        }),
                        title: t({ en: "Log as you spend", es: "Registra al gastar" }),
                    },
                    {
                        text: t({
                            en: "If this pace runs past the limit, Budgets says by how much, or the day the money ran out.",
                            es: "Si este ritmo pasa el límite, Presupuestos te dice por cuánto, o el día en que se acabó el dinero.",
                        }),
                        title: t({ en: "Read the pace", es: "Mira el ritmo" }),
                    },
                ],
                title: t({
                    en: "Plan a budget and see where this pace ends.",
                    es: "Arma tu presupuesto y ve a dónde te lleva este ritmo.",
                }),
            },
            "mint-alternative": {
                facts: [
                    {
                        label: t({ en: "Import", es: "Importa" }),
                        text: t({
                            en: "Your Mint CSV, with its date, description, amount, type, and category columns matched for you",
                            es: "Tu CSV de Mint, con las columnas de fecha, descripción, monto, tipo y categoría asignadas solas",
                        }),
                    },
                    {
                        label: t({ en: "Categories", es: "Categorías" }),
                        text: t({
                            en: "Mint's category names are matched to yours by AI matching",
                            es: "Los nombres de categoría de Mint se asignan a los tuyos con la asignación con IA",
                        }),
                    },
                    {
                        label: t({ en: "Duplicates", es: "Duplicados" }),
                        text: t({
                            en: "Rows that look already imported are flagged before you save",
                            es: "Las filas que parecen ya importadas se marcan antes de guardar",
                        }),
                    },
                    {
                        label: t({ en: "Budgets", es: "Presupuestos" }),
                        text: OUTLAYR.budgets,
                    },
                    {
                        label: t({ en: "After", es: "Después" }),
                        text: t({
                            en: "Log new purchases by sentence, voice, or receipt",
                            es: "Registra compras nuevas con una oración, con tu voz o con un recibo",
                        }),
                    },
                    {
                        label: t({ en: "Plans", es: "Planes" }),
                        text: t({
                            en: "Rows whose category matches one of yours by name import on any plan. Outlayr Pro matches the rest with AI, up to 5,000 rows a file",
                            es: "Las filas cuya categoría coincide por nombre con una de las tuyas se importan en cualquier plan. Outlayr Pro asigna el resto con IA, hasta 5,000 filas por archivo",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Intuit says Mint has been reimagined on Credit Karma. If you want a budget app instead, Outlayr imports the CSV you exported from Mint.",
                            es: "Intuit dice que Mint ahora vive en Credit Karma. Si prefieres una app de presupuesto, Outlayr importa el CSV que exportaste de Mint.",
                        }),
                        question: t({ en: "What replaced Mint?", es: "¿Qué reemplazó a Mint?" }),
                    },
                    {
                        answer: t({
                            en: "Yes, if you exported a CSV from Mint. Outlayr reads its date, description, amount, type, and category columns, links each Mint category that matches one of yours by name, and flags rows that look already imported before you save. With Outlayr Pro, the other Mint category names are matched to yours with AI, up to 5,000 rows a file, so split a longer export by year.",
                            es: "Sí, si exportaste un CSV de Mint. Outlayr lee sus columnas de fecha, descripción, monto, tipo y categoría, vincula cada categoría de Mint que coincide por nombre con una de las tuyas y marca las filas que parecen ya importadas antes de guardar. Con Outlayr Pro, los demás nombres de categoría de Mint se asignan a los tuyos con IA, hasta 5,000 filas por archivo, así que divide una exportación más larga por año.",
                        }),
                        question: t({
                            en: "Can I import my Mint data into Outlayr?",
                            es: "¿Puedo importar mis datos de Mint a Outlayr?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Logging, budgets, goals, and subscriptions are free, and so is importing the rows whose Mint category matches one of yours by name. Matching the other Mint category names to yours with AI needs Outlayr Pro, which is $7.99 a month, $49.99 a year, or $129.99 once in the United States.",
                            es: "Registrar, los presupuestos, las metas y las suscripciones son gratis, igual que importar las filas cuya categoría de Mint coincide por nombre con una de las tuyas. Asignar los demás nombres de categoría de Mint a los tuyos con IA requiere Outlayr Pro, que en Estados Unidos cuesta US$7.99 al mes, US$49.99 al año o US$129.99 en un solo pago.",
                        }),
                        question: t({
                            en: "Is Outlayr free like Mint was?",
                            es: "¿Outlayr es gratis como lo era Mint?",
                        }),
                    },
                ],
                lead: t({
                    en: "Mint has been reimagined on Credit Karma, in Intuit's words. Outlayr imports the CSV you exported from Mint, then keeps your budgets and spending going on your phone.",
                    es: "Mint ahora vive en Credit Karma, según Intuit. Outlayr importa el CSV que exportaste de Mint y sigue con tus presupuestos y tus gastos en tu celular.",
                }),
                meta: {
                    description: t({
                        en: "Mint now lives on Credit Karma. Outlayr imports the CSV you exported from Mint and keeps your budgets and spending going on your phone.",
                        es: "Mint ahora vive en Credit Karma, según Intuit. Outlayr importa el CSV que exportaste de Mint y sigue con tus presupuestos y tus gastos en tu celular.",
                    }),
                    title: t({
                        en: "Mint Alternative: Import Your Mint CSV · Outlayr",
                        es: "Alternativa a Mint: importa tu CSV de Mint · Outlayr",
                    }),
                },
                plateAlt: t({
                    en: "Outlayr Log with a $42.00 Costco purchase at the top and the entries from earlier days below.",
                    es: "Registro de Outlayr con una compra de $42.00 en Costco arriba y los registros de días anteriores abajo.",
                }),
                related: [
                    "/guides/expense-tracker-template",
                    "/compare/monarch",
                    "/guides/best-expense-tracker-apps",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Save the CSV you exported from Mint to Files or iCloud Drive on your iPhone. On Android, save it to Downloads or Google Drive. Split it by year if it has more than 5,000 rows.",
                            es: "Guarda el CSV que exportaste de Mint en Archivos o iCloud Drive en tu iPhone. En Android, guárdalo en Descargas o en Google Drive. Divídelo por año si tiene más de 5,000 filas.",
                        }),
                        title: t({ en: "Find your Mint CSV", es: "Busca tu CSV de Mint" }),
                    },
                    {
                        text: t({
                            en: "In Settings, tap Import data, then CSV file, and pick the file.",
                            es: "En Configuración, toca Importar datos, luego Archivo CSV, y elige el archivo.",
                        }),
                        title: t({ en: "Import it", es: "Impórtalo" }),
                    },
                    {
                        text: t({
                            en: "Check the rows, leave out any marked as already imported, and tap Import.",
                            es: "Revisa las filas, deja fuera las que aparecen como ya importadas y toca Importar.",
                        }),
                        title: t({ en: "Review and save", es: "Revisa y guarda" }),
                    },
                ],
                title: t({
                    en: "A Mint alternative that takes your Mint CSV.",
                    es: "Una alternativa a Mint que importa tu CSV de Mint.",
                }),
            },
            "multi-currency-expense-tracker": {
                facts: [
                    {
                        label: t({ en: "Currencies", es: "Monedas" }),
                        text: t({
                            en: "165, from the US dollar to the Venezuelan bolívar",
                            es: "165, del dólar estadounidense al bolívar venezolano",
                        }),
                    },
                    {
                        label: t({ en: "Rate", es: "Tasa" }),
                        text: t({
                            en: "From the day of the purchase, or one you type",
                            es: "La del día de la compra, o una que escribas",
                        }),
                    },
                    {
                        label: t({ en: "Accounts", es: "Cuentas" }),
                        text: t({
                            en: "Each keeps its own currency and balance",
                            es: "Cada una tiene su propia moneda y su saldo",
                        }),
                    },
                    {
                        label: t({ en: "Transfers", es: "Transferencias" }),
                        text: t({
                            en: "Move money between currencies without counting it as spending",
                            es: "Mueve dinero entre monedas sin que cuente como gasto",
                        }),
                    },
                    {
                        label: t({ en: "Totals", es: "Totales" }),
                        text: t({
                            en: "Budgets and insights read in your main currency",
                            es: "Los presupuestos y las estadísticas se leen en tu moneda principal",
                        }),
                    },
                    {
                        label: t({ en: "Free plan", es: "Plan gratis" }),
                        text: t({
                            en: "Log in any currency. Accounts in one currency, more with Pro",
                            es: "Registra en cualquier moneda. Cuentas en una moneda, más con Pro",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "The rate from the day of the purchase. Entries you already logged do not change when the rate moves. You can type your own rate when the one you got was different.",
                            es: "La tasa del día de la compra. Los registros que ya hiciste no cambian cuando la tasa se mueve. Puedes escribir tu propia tasa cuando la que te dieron fue distinta.",
                        }),
                        question: t({
                            en: "Which exchange rate does Outlayr use?",
                            es: "¿Qué tasa de cambio usa Outlayr?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. A dollar card, a bolívar bank account, and cash in euros each keep their own balance, and a transfer between them does not count as spending. The free plan holds accounts in one currency. Outlayr Pro allows any number.",
                            es: "Sí. Una tarjeta en dólares, una cuenta de banco en bolívares y efectivo en euros tienen cada uno su propio saldo, y una transferencia entre ellos no cuenta como gasto. El plan gratis permite cuentas en una moneda. Outlayr Pro permite las que quieras.",
                        }),
                        question: t({
                            en: "Can each account hold its own currency?",
                            es: "¿Cada cuenta puede tener su propia moneda?",
                        }),
                    },
                    {
                        answer: t({
                            en: "165. You can log a purchase in any of them on the free plan.",
                            es: "165. Puedes registrar una compra en cualquiera de ellas con el plan gratis.",
                        }),
                        question: t({
                            en: "How many currencies does Outlayr support?",
                            es: "¿Cuántas monedas admite Outlayr?",
                        }),
                    },
                ],
                lead: t({
                    en: "Outlayr logs each purchase in any of 165 currencies, from dollars and pesos to bolívares, and converts budgets and totals to your main currency at the rate from the day you paid. It works the same on a trip abroad and at home with more than one currency.",
                    es: "Outlayr registra cada compra en cualquiera de 165 monedas, de dólares y pesos a bolívares, y convierte tus presupuestos y totales a tu moneda principal con la tasa del día en que pagaste. Funciona igual de viaje y en casa con más de una moneda.",
                }),
                meta: {
                    description: t({
                        en: "Log each purchase in any of 165 currencies, from dollars to bolívares, and read budgets and totals in your main currency at the rate from the day you paid.",
                        es: "Registra cada compra en cualquiera de 165 monedas, de dólares a bolívares, y lee tus presupuestos en tu moneda principal con la tasa del día en que pagaste.",
                    }),
                    title: t({
                        en: "Multi-Currency Expense Tracker for Travel · Outlayr",
                        es: "Controla gastos en varias monedas y de viaje · Outlayr",
                    }),
                },
                plateAlt: ACCOUNTS_SCREEN_ALT,
                related: [
                    "/tools/split-expenses-calculator",
                    "/compare/spendee",
                    "/guides/expense-tracker-template",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Every total, budget, and chart reads in it.",
                            es: "Todos los totales, presupuestos y gráficos se leen en ella.",
                        }),
                        title: t({ en: "Pick your main currency", es: "Elige tu moneda principal" }),
                    },
                    {
                        text: t({
                            en: "Tap the currency in the sentence and pick the one on the receipt.",
                            es: "Toca la moneda en la oración y elige la del recibo.",
                        }),
                        title: t({ en: "Log in the currency you paid", es: "Registra en la moneda en que pagaste" }),
                    },
                    {
                        text: t({
                            en: "Each entry converts at the rate from its own day.",
                            es: "Cada registro se convierte con la tasa de su propio día.",
                        }),
                        title: t({ en: "Read one total", es: "Lee un solo total" }),
                    },
                ],
                title: t({
                    en: "Track expenses in any currency, at home or on a trip.",
                    es: "Controla tus gastos en cualquier moneda, en casa o de viaje.",
                }),
            },
            "receipt-scanner": {
                facts: [
                    {
                        label: t({ en: "Reads", es: "Lee" }),
                        text: t({
                            en: "The store, the date, the total, and every line",
                            es: "La tienda, la fecha, el total y cada línea",
                        }),
                    },
                    {
                        label: t({ en: "From", es: "Desde" }),
                        text: t({
                            en: "The camera, or a photo in your library",
                            es: "La cámara o una foto de tu galería",
                        }),
                    },
                    {
                        label: t({ en: "Review", es: "Revisión" }),
                        text: t({
                            en: "The entry comes back filled in for you to check and save",
                            es: "El registro vuelve lleno para que lo revises y lo guardes",
                        }),
                    },
                    {
                        label: t({ en: "Free plan", es: "Plan gratis" }),
                        text: t({
                            en: "20 captures every 30 days, shared with voice entry",
                            es: "20 capturas cada 30 días, compartidas con los registros por voz",
                        }),
                    },
                    {
                        label: "Pro",
                        text: t({
                            en: "500 captures every 30 days, and receipt photo backup",
                            es: "500 capturas cada 30 días y respaldo de las fotos de tus recibos",
                        }),
                    },
                    {
                        label: t({ en: "Needs", es: "Requiere" }),
                        text: t({ en: "An account and a connection", es: "Una cuenta y conexión" }),
                    },
                ],
                faq: [
                    {
                        answer: RECEIPT_SCAN_ANSWER,
                        question: t({
                            en: "How does receipt scanning work?",
                            es: "¿Cómo funciona el escaneo de recibos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes, up to a limit. The free plan includes 20 captures every 30 days, and a capture is one receipt scan or one voice entry. Outlayr Pro raises that to 500.",
                            es: "Sí, hasta un límite. El plan gratis incluye 20 capturas cada 30 días, y una captura es un escaneo de recibo o un registro por voz. Outlayr Pro lo sube a 500.",
                        }),
                        question: t({ en: "Is receipt scanning free?", es: "¿Escanear recibos es gratis?" }),
                    },
                    {
                        answer: t({
                            en: "No. Scanning a receipt needs a connection. Typing an entry works with no signal.",
                            es: "No. Para escanear un recibo necesitas conexión. Escribir un registro funciona sin señal.",
                        }),
                        question: t({
                            en: "Does receipt scanning work offline?",
                            es: "¿El escaneo de recibos funciona sin conexión?",
                        }),
                    },
                ],
                lead: t({
                    en: "Take a photo of a receipt and Outlayr reads the store, the date, the total, and every line, then fills in the entry for you to save.",
                    es: "Toma una foto de un recibo y Outlayr lee la tienda, la fecha, el total y cada línea, y llena el registro para que lo guardes.",
                }),
                meta: {
                    description: t({
                        en: "Take a photo of a receipt and Outlayr reads the store, the date, the total, and every line, then fills in the entry for you to save.",
                        es: "Toma una foto de un recibo y Outlayr lee la tienda, la fecha, el total y cada línea, y llena el registro para que lo guardes.",
                    }),
                    title: t({
                        en: "Receipt Scanner App: Photo to Expense · Outlayr",
                        es: "Escáner de recibos: de la foto al gasto · Outlayr",
                    }),
                },
                plateAlt: t({
                    en: "A Target receipt read into an entry: store, date, total, and category, then saved to the Log.",
                    es: "Un recibo de Farmatodo convertido en un registro: tienda, fecha, total y categoría, y luego guardado en el Registro.",
                }),
                related: [
                    "/guides/voice-expense-tracker",
                    "/guides/best-expense-tracker-apps",
                    "/guides/budget-planner",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Take a photo, or pick one from your library.",
                            es: "Toma una foto o elige una de tu galería.",
                        }),
                        title: t({ en: "Tap Scan a receipt", es: "Toca Escanear un recibo" }),
                    },
                    {
                        text: t({
                            en: "The store, the date, and the total come back filled in.",
                            es: "La tienda, la fecha y el total vuelven llenos.",
                        }),
                        title: t({ en: "Check the entry", es: "Revisa el registro" }),
                    },
                    {
                        text: t({
                            en: "It lands on the Log, and your budgets update.",
                            es: "Llega al Registro y tus presupuestos se actualizan.",
                        }),
                        title: t({ en: "Save", es: "Guarda" }),
                    },
                ],
                title: t({ en: "Scan a receipt into an expense.", es: "Convierte un recibo en un gasto." }),
            },
            "subscription-tracker": {
                facts: [
                    {
                        label: t({ en: "Repeats", es: "Se repite" }),
                        text: t({
                            en: "Daily, weekly, monthly, yearly, or a custom schedule",
                            es: "Diario, semanal, mensual, anual o un calendario personalizado",
                        }),
                    },
                    {
                        label: t({ en: "Logged", es: "Registra" }),
                        text: t({
                            en: "Each charge lands on the Log on its day, in its account and category",
                            es: "Cada cobro llega al Registro en su día, en su cuenta y su categoría",
                        }),
                    },
                    {
                        label: t({ en: "Per month", es: "Al mes" }),
                        text: t({
                            en: "What your subscriptions and bills cost, with yearly plans spread across the months",
                            es: "Lo que cuestan tus suscripciones y pagos fijos, con los planes anuales repartidos entre los meses",
                        }),
                    },
                    {
                        label: t({ en: "Reminders", es: "Avisos" }),
                        text: t({
                            en: "On the day, or 1, 2, 3, or 7 days before each charge",
                            es: "El mismo día, o 1, 2, 3 o 7 días antes de cada cobro",
                        }),
                    },
                    {
                        label: t({ en: "Bills and pay", es: "Pagos y sueldo" }),
                        text: t({
                            en: "Rent, utilities, and paychecks repeat the same way",
                            es: "La renta, los servicios y el sueldo se repiten igual",
                        }),
                    },
                    {
                        label: t({ en: "Currencies", es: "Monedas" }),
                        text: t({
                            en: "Each subscription in the currency it bills in",
                            es: "Cada suscripción en la moneda en que te cobra",
                        }),
                    },
                    {
                        label: t({ en: "Free plan", es: "Plan gratis" }),
                        text: t({
                            en: "Subscriptions, reminders, and Upcoming are free",
                            es: "Las suscripciones, los avisos y Próximos son gratis",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Yes. Add a subscription once with how often it repeats, and Outlayr logs each charge on its day. Upcoming lists the next charges and what they cost per month.",
                            es: "Sí. Agrega una suscripción una vez con la frecuencia con que se repite, y Outlayr registra cada cobro en su día. Próximos muestra los próximos cobros y cuánto cuestan al mes.",
                        }),
                        question: t({
                            en: "Can Outlayr track my subscriptions?",
                            es: "¿Outlayr puede controlar mis suscripciones?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Outlayr shows what each subscription costs and when it charges next, and can remind you before the charge, so you can cancel with the service in time.",
                            es: "No. Outlayr te muestra cuánto cuesta cada suscripción y cuándo vuelve a cobrar, y puede avisarte antes del cobro, para que la canceles a tiempo con el servicio.",
                        }),
                        question: t({
                            en: "Does Outlayr cancel subscriptions for me?",
                            es: "¿Outlayr cancela suscripciones por mí?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Each subscription chooses its own reminder: on the day, or 1, 2, 3, or 7 days before. One switch in Settings, under Notifications, silences all of them.",
                            es: "Cada suscripción elige su aviso: el mismo día, o 1, 2, 3 o 7 días antes. Un interruptor en Configuración, en Notificaciones, los silencia todos.",
                        }),
                        question: t({
                            en: "When does Outlayr remind me about a charge?",
                            es: "¿Cuándo me avisa Outlayr de un cobro?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Anything that repeats works the same way: rent, utilities, phone plans, and paychecks log themselves on their day, with the same reminders.",
                            es: "Sí. Todo lo que se repite funciona igual: la renta, los servicios, el plan del celular y el sueldo se registran solos en su día, con los mismos avisos.",
                        }),
                        question: t({
                            en: "Can it track bills and paychecks too?",
                            es: "¿También sirve para pagos fijos y el sueldo?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Recurring entries, reminders, and Upcoming are part of the free plan.",
                            es: "Sí. Los registros recurrentes, los avisos y Próximos son parte del plan gratis.",
                        }),
                        question: t({
                            en: "Is the subscription tracker free?",
                            es: "¿El control de suscripciones es gratis?",
                        }),
                    },
                ],
                lead: t({
                    en: "Outlayr logs each subscription on the day it charges, adds up what your subscriptions and bills cost per month, and can remind you before the next charge.",
                    es: "Outlayr registra cada suscripción el día que te cobra, suma cuánto te cuestan al mes tus suscripciones y pagos fijos, y puede avisarte antes del siguiente cobro.",
                }),
                meta: {
                    description: t({
                        en: "Outlayr logs each subscription on the day it charges, adds up what your subscriptions and bills cost a month, and reminds you before the next charge.",
                        es: "Outlayr registra cada suscripción el día que te cobra, suma lo que te cuestan al mes tus suscripciones y pagos fijos, y te avisa antes del siguiente cobro.",
                    }),
                    title: t({
                        en: "Subscription Tracker App with Reminders · Outlayr",
                        es: "App de control de suscripciones con avisos · Outlayr",
                    }),
                },
                plateAlt: t({
                    en: "Outlayr Upcoming entries: Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, rent, Netflix, and Planet Fitness, $2,036.54 per month in total.",
                    es: "Próximos registros en Outlayr: Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, la renta, Netflix y Planet Fitness, $2,036.54 al mes en total.",
                }),
                related: [
                    "/guides/best-subscription-tracker-apps",
                    "/tools/subscription-cost-calculator",
                    "/compare/rocket-money",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Type, say, or scan the first charge, then tap repeat and pick monthly, yearly, or a custom schedule.",
                            es: "Escribe, dicta o escanea el primer cobro, luego toca repetir y elige mensual, anual o un calendario personalizado.",
                        }),
                        title: t({ en: "Log it once", es: "Regístrala una vez" }),
                    },
                    {
                        text: t({
                            en: "Under Remind Me, pick the day of the charge or up to a week before.",
                            es: "En Recordarme, elige el día del cobro o hasta una semana antes.",
                        }),
                        title: t({ en: "Choose a reminder", es: "Elige un aviso" }),
                    },
                    {
                        text: t({
                            en: "Upcoming, at the top of the Log and under Upcoming entries in Settings, lists the next charges and what they cost per month.",
                            es: "Próximos, arriba del Registro y en Próximos registros dentro de Configuración, muestra los próximos cobros y cuánto cuestan al mes.",
                        }),
                        title: t({ en: "Read the monthly cost", es: "Mira el costo mensual" }),
                    },
                ],
                title: t({
                    en: "A subscription tracker that reminds you before each charge.",
                    es: "Un control de suscripciones que te avisa antes de cada cobro.",
                }),
            },
            "expense-tracker-template": {
                download: {
                    href: t({
                        en: "/templates/expense-tracker-template.csv",
                        es: "/templates/plantilla-control-de-gastos.csv",
                    }),
                    label: t({ en: "Download the template (CSV)", es: "Descargar la plantilla (CSV)" }),
                },
                facts: [
                    {
                        label: t({ en: "Columns", es: "Columnas" }),
                        text: t({
                            en: "Date, Note, Amount, Currency, Category, Type",
                            es: "Fecha, Nota, Monto, Moneda, Categoría y Tipo, con el nombre en inglés entre paréntesis",
                        }),
                    },
                    {
                        label: t({ en: "Opens in", es: "Abre en" }),
                        text: t({ en: "Excel, Numbers, and Google Sheets", es: "Excel, Numbers y Google Sheets" }),
                    },
                    {
                        label: t({ en: "Dates", es: "Fechas" }),
                        text: t({
                            en: "Year first, like 2026-10-09. Dates like 10/09/2026 work too",
                            es: "Primero el año, como 2026-10-09. También sirven fechas como 09/10/2026",
                        }),
                    },
                    {
                        label: t({ en: "Amounts", es: "Montos" }),
                        text: t({
                            en: "A number, with a dot or a comma for decimals",
                            es: "Un número, con punto o coma para los decimales",
                        }),
                    },
                    {
                        label: t({ en: "Type", es: "Tipo" }),
                        text: t({ en: "Expense or Income", es: "Expense para un gasto, Income para un ingreso" }),
                    },
                    {
                        label: t({ en: "Import", es: "Importa" }),
                        text: t({
                            en: "In Settings, under Import data, as a CSV file",
                            es: "En Configuración, en Importar datos, como archivo CSV",
                        }),
                    },
                    {
                        label: t({ en: "Plans", es: "Planes" }),
                        text: t({
                            en: "Rows whose category matches one of yours by name import on any plan. Outlayr Pro matches the rest with AI, up to 5,000 rows and 2 MB a file",
                            es: "Las filas cuya categoría coincide por nombre con una de las tuyas se importan en cualquier plan. Outlayr Pro asigna el resto con IA, hasta 5,000 filas y 2 MB por archivo",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Yes. Download it and use it in any spreadsheet app for as long as you like. Importing it into Outlayr is free too for every row whose category matches one of yours by name; the English file uses the categories a new Outlayr ledger starts with. Outlayr Pro matches other category names to yours with AI.",
                            es: "Sí. Descárgala y úsala en cualquier hoja de cálculo el tiempo que quieras. Importarla a Outlayr también es gratis para cada fila cuya categoría coincide por nombre con una de las tuyas. Outlayr Pro asigna los demás nombres de categoría a los tuyos con IA.",
                        }),
                        question: t({ en: "Is the template free?", es: "¿La plantilla es gratis?" }),
                    },
                    {
                        answer: t({
                            en: "Yes, and with Numbers. Outlayr reads a CSV with commas between columns. Some spreadsheet apps save CSV files with semicolons where decimals are written with a comma. If yours does, download the CSV from Google Sheets, which uses commas.",
                            es: "Sí, y también con Numbers. Outlayr lee un CSV con comas entre columnas. Algunas hojas de cálculo guardan los CSV con punto y coma en los países donde los decimales se escriben con coma. Si la tuya lo hace, descarga el CSV desde Google Sheets, que usa comas.",
                        }),
                        question: t({
                            en: "Does it work with Excel and Google Sheets?",
                            es: "¿Funciona con Excel y Google Sheets?",
                        }),
                    },
                    {
                        answer: t({
                            en: "It is listed as skipped before anything is saved, with the reason: an unreadable date or amount, or no matching category. Rows that look already imported are flagged too, so you can leave them out.",
                            es: "Aparece como omitida antes de guardar, con el motivo: una fecha o un monto ilegible, o sin categoría coincidente. Las filas que parecen ya importadas también se marcan, para que las dejes fuera.",
                        }),
                        question: t({ en: "What if a row cannot be read?", es: "¿Y si una fila no se puede leer?" }),
                    },
                ],
                lead: t({
                    en: "A free CSV template for Excel, Numbers, and Google Sheets, with the columns Outlayr's CSV import reads. Track your spending in the spreadsheet, and bring the rows into Outlayr when you move to the app.",
                    es: "Una plantilla CSV gratis para Excel, Numbers y Google Sheets, con las columnas que lee la importación de CSV de Outlayr. Lleva tus gastos en la hoja de cálculo y pasa las filas a Outlayr cuando te cambies a la app.",
                }),
                meta: {
                    description: t({
                        en: "A free CSV expense tracker template for Excel, Numbers, and Google Sheets, with the columns Outlayr's CSV import reads when you move to the app.",
                        es: "Plantilla CSV gratis para Excel, Numbers y Google Sheets, con las columnas que lee la importación de CSV de Outlayr cuando te cambies a la app.",
                    }),
                    title: t({
                        en: "Expense Tracker Template for Excel and Google Sheets",
                        es: "Plantilla de control de gastos para Excel (CSV) · Outlayr",
                    }),
                },
                related: [
                    "/guides/mint-alternative",
                    "/guides/best-expense-tracker-apps",
                    "/guides/multi-currency-expense-tracker",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Delete the sample rows and add one row per expense or income. Keep the header row as it is so Outlayr finds each column.",
                            es: "Borra las filas de ejemplo y agrega una fila por cada gasto o ingreso. Deja la fila de encabezados como está para que Outlayr encuentre cada columna.",
                        }),
                        title: t({ en: "Fill it in", es: "Llénala" }),
                    },
                    {
                        text: t({
                            en: "Keep commas between columns, and save the file to Files or iCloud Drive on your iPhone. On Android, save it to Downloads or Google Drive.",
                            es: "Deja las comas entre columnas y guarda el archivo en Archivos o iCloud Drive en tu iPhone. En Android, guárdalo en Descargas o en Google Drive.",
                        }),
                        title: t({ en: "Save it as a CSV", es: "Guárdala como CSV" }),
                    },
                    {
                        text: t({
                            en: "In Settings, tap Import data, then CSV file, and pick the file. Check the rows and tap Import.",
                            es: "En Configuración, toca Importar datos, luego Archivo CSV, y elige el archivo. Revisa las filas y toca Importar.",
                        }),
                        title: t({ en: "Import it in Outlayr", es: "Impórtala en Outlayr" }),
                    },
                ],
                title: t({
                    en: "An expense tracker template that Outlayr can import.",
                    es: "Plantilla de control de gastos en Excel que Outlayr puede importar.",
                }),
            },
            "voice-expense-tracker": {
                facts: [
                    {
                        label: t({ en: "Fills in", es: "Llena" }),
                        text: t({
                            en: "The amount, the merchant, the category, the account, the date, and the currency",
                            es: "El monto, el comercio, la categoría, la cuenta, la fecha y la moneda",
                        }),
                    },
                    {
                        label: t({ en: "Fixes", es: "Correcciones" }),
                        text: t({
                            en: "Say what changed, and only that part updates",
                            es: "Di lo que cambió y solo esa parte se actualiza",
                        }),
                    },
                    {
                        label: t({ en: "Also", es: "También" }),
                        text: t({
                            en: "Income, transfers between your accounts, and subscriptions that repeat",
                            es: "Ingresos, transferencias entre tus cuentas y suscripciones que se repiten",
                        }),
                    },
                    {
                        label: t({ en: "Languages", es: "Idiomas" }),
                        text: t({
                            en: "English and Spanish, following the app's language",
                            es: "Inglés y español, según el idioma de la app",
                        }),
                    },
                    {
                        label: t({ en: "Free plan", es: "Plan gratis" }),
                        text: t({
                            en: "20 captures every 30 days, shared with receipt scans. Each clip is one",
                            es: "20 capturas cada 30 días, compartidas con el escaneo de recibos. Cada grabación es una",
                        }),
                    },
                    {
                        label: "Pro",
                        text: t({ en: "500 captures every 30 days", es: "500 capturas cada 30 días" }),
                    },
                    {
                        label: t({ en: "Needs", es: "Requiere" }),
                        text: t({ en: "An account and a connection", es: "Una cuenta y conexión" }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Yes. Say a purchase in one sentence and Outlayr fills in the entry for you to check and save. If something is off, say what changed, like that it was yesterday.",
                            es: "Sí. Dicta una compra en una oración y Outlayr llena el registro para que lo revises y lo guardes. Si algo no está bien, di lo que cambió, por ejemplo que fue ayer.",
                        }),
                        question: t({
                            en: "Can I log expenses by voice in Outlayr?",
                            es: "¿Puedo registrar gastos por voz en Outlayr?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes, up to a limit. The free plan includes 20 captures every 30 days, shared with receipt scans, and each clip you say is one capture. Outlayr Pro raises that to 500.",
                            es: "Sí, hasta un límite. El plan gratis incluye 20 capturas cada 30 días, compartidas con el escaneo de recibos, y cada grabación que dictas es una captura. Outlayr Pro lo sube a 500.",
                        }),
                        question: t({ en: "Is voice entry free?", es: "¿Registrar por voz es gratis?" }),
                    },
                    {
                        answer: t({
                            en: "English and Spanish. Outlayr listens in the language the app is set to.",
                            es: "Inglés y español. Outlayr escucha en el idioma que tenga la app.",
                        }),
                        question: t({
                            en: "Which languages does voice entry understand?",
                            es: "¿Qué idiomas entiende el registro por voz?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Speaking an entry needs an account and a connection. Typing an entry works with no signal.",
                            es: "No. Para dictar un registro necesitas una cuenta y conexión. Escribir un registro funciona sin señal.",
                        }),
                        question: t({
                            en: "Does voice entry work offline?",
                            es: "¿El registro por voz funciona sin conexión?",
                        }),
                    },
                ],
                lead: t({
                    en: "Say a purchase in one sentence and Outlayr fills in the amount, the merchant, the category, the date, and the account you name. Check it, fix anything by saying it again, and save.",
                    es: "Dicta una compra en una oración y Outlayr llena el monto, el comercio, la categoría, la fecha y la cuenta que nombres. Revísala, corrige lo que haga falta diciéndolo de nuevo y guárdala.",
                }),
                meta: {
                    description: t({
                        en: "Say a purchase in one sentence and Outlayr fills in the amount, merchant, category, date, and account. Fix anything by saying it again, then save.",
                        es: "Dicta una compra en una oración y Outlayr llena el monto, el comercio, la categoría, la fecha y la cuenta. Corrige lo que haga falta diciéndolo de nuevo.",
                    }),
                    title: t({
                        en: "Voice Expense Tracker: Say What You Spent · Outlayr",
                        es: "Registra gastos por voz: dicta lo que gastaste · Outlayr",
                    }),
                },
                plateAlt: t({
                    en: "Outlayr voice entry: a spoken sentence becomes $12.50 at Blue Bottle under Coffee, and a spoken correction moves it to yesterday.",
                    es: "Registro por voz de Outlayr: una oración dictada se convierte en $12.50 en Juan Valdez en Café, y una corrección dicha lo pasa a ayer.",
                }),
                related: [
                    "/guides/receipt-scanner",
                    "/guides/best-expense-tracker-apps",
                    "/guides/apple-pay-expense-tracker",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Tap the + button, then Speak an entry.",
                            es: "Toca el botón +, luego Dictar un registro.",
                        }),
                        title: t({ en: "Open voice entry", es: "Abre el registro por voz" }),
                    },
                    {
                        text: t({
                            en: "Say the amount and where, like 12.50 at Blue Bottle for coffee on my Apple Card.",
                            es: "Di el monto y dónde, por ejemplo 12.50 de café en Juan Valdez con mi tarjeta Nu.",
                        }),
                        title: t({ en: "Say the purchase", es: "Dicta la compra" }),
                    },
                    {
                        text: t({
                            en: "Say a correction if something is off, then tap Save, or Finish in the form to edit it by hand.",
                            es: "Di una corrección si algo no está bien y toca Guardar, o Terminar en el formulario para editarlo a mano.",
                        }),
                        title: t({ en: "Check and save", es: "Revisa y guarda" }),
                    },
                ],
                title: t({
                    en: "Say an expense and Outlayr logs it.",
                    es: "Dicta un gasto y Outlayr lo registra.",
                }),
            },
        },
        hubs: {
            compare: {
                lead: t({
                    en: `${OUTLAYR_LEAD.en} Each page sets price, how entries get in, and platforms side by side, checked at the other app's own site.`,
                    es: `${OUTLAYR_LEAD.es} Cada página pone lado a lado el precio, cómo registras y las plataformas, revisados en el sitio de la otra app.`,
                }),
                meta: {
                    description: t({
                        en: "Outlayr next to YNAB, Monarch, Copilot, Spendee, and five more apps: price, how entries get in, and platforms, checked at each app's own site.",
                        es: "Outlayr junto a YNAB, Monarch, Copilot, Spendee y cinco apps más: precio, cómo registras y plataformas, revisados en el sitio de cada app.",
                    }),
                    title: t({
                        en: "Outlayr vs YNAB, Monarch, Copilot, and More: Compared",
                        es: "Outlayr vs YNAB, Monarch, Copilot y más: comparativas",
                    }),
                },
                title: t({ en: "Outlayr next to the apps you know.", es: "Outlayr junto a las apps que conoces." }),
            },
            guides: {
                lead: t({
                    en: "How each part of Outlayr works, step by step, with what the free plan includes.",
                    es: "Cómo funciona cada parte de Outlayr, paso a paso, con lo que incluye el plan gratis.",
                }),
                meta: {
                    title: t({
                        en: "Expense Tracking Guides · Outlayr",
                        es: "Guías para controlar tus gastos · Outlayr",
                    }),
                },
                title: t({
                    en: "Expense tracking guides, step by step.",
                    es: "Guías para controlar tus gastos, paso a paso.",
                }),
            },
        },
        labels: {
            feature: t({ en: "Feature", es: "Función" }),
            fit: t({ en: "Which one fits", es: "Cuál te conviene" }),
            fitHeading: insert(t({ en: "{{name}}, if you", es: "{{name}}, si" })),
            questions: t({ en: "Questions", es: "Preguntas" }),
            checked: insert(t({ en: ", checked {{date}}.", es: ", revisados el {{date}}." })),
            source: insert(t({ en: "{{name}} details from", es: "Datos de {{name}} tomados de" })),
            steps: t({ en: "How it works", es: "Cómo funciona" }),
            summary: {
                app: t({ en: "App", es: "App" }),
                bestIf: t({ en: "Who it fits", es: "Para quién es" }),
                platforms: LABELS.platforms,
                price: LABELS.price,
            },
            updatedOn: insert(t({ en: "Updated {{date}}", es: "Actualizado el {{date}}" })),
            checkedOn: insert(t({ en: "Checked {{date}}", es: "Revisado el {{date}}" })),
            contents: t({ en: "On this page", es: "En esta página" }),
            picked: t({ en: "How we picked", es: "Cómo las elegimos" }),
            cta: {
                lead: t({
                    en: "Free to start. No ads on any plan.",
                    es: "Gratis para empezar. Sin anuncios en ningún plan.",
                }),
                title: t({ en: "Track every expense in one sentence.", es: "Registra cada gasto en una oración." }),
            },
            outlayrDoes: t({ en: "What Outlayr does", es: "Qué hace Outlayr" }),
            outlayrPoints: {
                sentence: {
                    text: t({
                        en: "Type a purchase as one sentence, say it, or scan the receipt.",
                        es: "Escribe una compra en una oración, díctala o escanea el recibo.",
                    }),
                    title: t({ en: "Log in one sentence", es: "Registra en una oración" }),
                },
                currencies: {
                    text: t({
                        en: "Each purchase converts to your main currency at the rate from its day.",
                        es: "Cada compra se convierte a tu moneda principal con la tasa de su día.",
                    }),
                    title: t({ en: "165 currencies", es: "165 monedas" }),
                },
                ledger: {
                    text: t({
                        en: "It reaches our servers only if you sign in and turn on sync, or use a feature that needs them, like receipt scanning.",
                        es: "Solo llega a nuestros servidores si inicias sesión y activas la sincronización, o si usas una función que los necesite, como el escaneo de recibos.",
                    }),
                    title: t({ en: "Your ledger stays on your phone", es: "Tu registro se queda en tu celular" }),
                },
                free: {
                    text: t({
                        en: "Budgets, goals, subscriptions, and widgets are free. Outlayr Pro raises the limits and adds sync.",
                        es: "Los presupuestos, las metas, las suscripciones y los widgets son gratis. Outlayr Pro sube los límites y agrega la sincronización.",
                    }),
                    title: t({ en: "Free to start", es: "Gratis para empezar" }),
                },
            },
            related: t({ en: "Keep reading", es: "Sigue leyendo" }),
            sideBySide: insert(t({ en: "Outlayr and {{name}}, side by side", es: "Outlayr y {{name}}, lado a lado" })),
        },
    },
    key: "answers",
} satisfies Dictionary;

export default answers;
