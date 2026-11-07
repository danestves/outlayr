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
        es: "Fintonic es una app gratis de España que conecta tus bancos en modo lectura, te da una nota financiera, el FinScore, y busca préstamos entre más de 40 entidades.",
    },
    goodbudget: {
        en: "Goodbudget is an envelope budgeting app for the web, Android, and iPhone, with a free plan and bank sync for US banks in Premium.",
        es: "Goodbudget es una app de presupuesto por sobres para la web, Android y iPhone, con un plan gratis y sincronización con bancos de EE. UU. en Premium.",
    },
    monefy: {
        en: "Monefy is an expense tracker for iPhone and Android that records a purchase in two taps, free at its core, with an optional paid upgrade.",
        es: "Monefy es una app para controlar gastos en iPhone y Android que registra una compra en dos toques, gratis en lo básico, con una mejora de pago opcional.",
    },
    moneyLover: {
        en: "Money Lover is an expense tracker for iPhone, Android, and the web, free with ads, with a paid Premium and bank linking as a separate monthly subscription.",
        es: "Money Lover es una app para controlar gastos en iPhone, Android y la web, gratis con anuncios, con un Premium de pago y la conexión al banco como una suscripción mensual aparte.",
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
    platforms: t({ en: "iPhone and Android", es: "iPhone y Android" }),
    price: t({
        en: "Free. Pro is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once in the US. Prices vary by country",
        es: "Gratis. Pro cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago en Estados Unidos. Los precios cambian según el país",
    }),
};

const LABELS = {
    availability: t({ en: "Available in", es: "Disponible en", pt: "Disponível em", fr: "Disponible sur" }),
    budgets: t({ en: "Budgets", es: "Presupuestos", pt: "Orçamentos", fr: "Budgets" }),
    canada: t({ en: "In Canada", es: "En Canadá", pt: "No Canadá", fr: "Au Canada" }),
    currencies: t({ en: "Currencies", es: "Monedas", pt: "Moedas", fr: "Devises" }),
    entries: t({ en: "Adding entries", es: "Cómo registras", pt: "Como você registra", fr: "Saisie des opérations" }),
    focus: t({ en: "Tracks", es: "Sigue", pt: "Acompanha", fr: "Suit" }),
    free: t({ en: "Free plan", es: "Plan gratis", pt: "Plano grátis", fr: "Offre gratuite" }),
    license: t({ en: "License", es: "Licencia", pt: "Licença", fr: "Licence" }),
    phone: t({ en: "On a phone", es: "En el celular", pt: "No celular", fr: "Sur téléphone" }),
    platforms: t({ en: "Runs on", es: "Funciona en", pt: "Funciona em", fr: "Fonctionne sur" }),
    price: t({ en: "Price", es: "Precio", pt: "Preço", fr: "Prix" }),
    style: t({ en: "Budget style", es: "Tipo de presupuesto", pt: "Tipo de orçamento", fr: "Type de budget" }),
    subscriptions: t({ en: "Subscriptions", es: "Suscripciones", pt: "Assinaturas", fr: "Abonnements" }),
    watch: t({ en: "Watch out for", es: "Ten en cuenta", pt: "Fique atento a", fr: "Points d'attention" }),
};

const MOVING = {
    export: t({ en: "Export", es: "Exportar" }),
    file: t({ en: "The file", es: "El archivo" }),
    into: t({ en: "Into Outlayr", es: "En Outlayr" }),
    lost: t({ en: "Doesn't come across", es: "Lo que no pasa" }),
};

const LICENSE_ROW = {
    label: LABELS.license,
    outlayr: t({ en: "Open source, GPL-3.0", es: "Código abierto, GPL-3.0" }),
    rival: t({ en: "Closed source", es: "Código cerrado" }),
};

const COST_FAQ = {
    answer: t({
        en: "The tracker is free, with budgets, goals, subscriptions, and widgets. The free plan includes 20 voice or receipt captures every 30 days, 3 accounts, 2 category budgets, and accounts in one currency. Outlayr Pro raises those limits and adds sync. In the United States it is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once. Your app store shows the price for your country.",
        es: "El control de gastos es gratis, con presupuestos, metas, suscripciones y widgets. El plan gratis incluye 20 capturas de voz o de recibos cada 30 días, 3 cuentas, 2 presupuestos por categoría y cuentas en una moneda. Outlayr Pro sube esos límites y agrega la sincronización. En Estados Unidos cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago. Tu tienda de apps muestra el precio de tu país.",
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

const OUTLAYR_FREE = t({
    en: "3 accounts, 2 category budgets plus one for the month, 20 voice or receipt captures every 30 days, and accounts in one currency",
    es: "3 cuentas, 2 presupuestos por categoría más uno para el mes, 20 capturas de voz o de recibos cada 30 días y cuentas en una moneda",
});

const LIST_SOURCES = t({
    en: "Each detail about the other apps links to the page it was read on",
    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
});

const LIST_PICKED_FACTS = t({
    en: "Every detail about the other apps was read on that app's own site or help center on the date below the table, and links to the page it came from. These are the facts as each app states them, not results of our own testing.",
    es: "Cada dato de las otras apps se leyó en el sitio o el centro de ayuda de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió. Son los datos tal como los da cada app, no resultados de pruebas nuestras.",
});

const LIST_PICKED_OURS = t({
    en: "Outlayr is ours. It gets the same facts as the others, including its own Watch out for row.",
    es: "Outlayr es nuestra. Tiene los mismos datos que las demás, incluida su propia fila de Ten en cuenta.",
});

const LATAM = {
    cards: t({ en: "Credit cards", es: "Tarjetas de crédito" }),
    cash: t({ en: "Cash", es: "Efectivo" }),
    cuotas: t({ en: "Installments", es: "Cuotas" }),
    spanish: t({ en: "In Spanish", es: "En español" }),
};

const BRAZIL = {
    bank: t({ en: "Bank connection", es: "Conexión bancaria", pt: "Conexão com o banco" }),
    cards: t({ en: "Credit cards", es: "Tarjetas de crédito", pt: "Cartões de crédito" }),
    installments: t({ en: "Installments", es: "Cuotas", pt: "Parcelas" }),
    portuguese: t({ en: "In Portuguese", es: "En portugués", pt: "Em português" }),
};

const FRANCE = {
    bank: t({ en: "Bank sync", es: "Sincronización bancaria", fr: "Synchronisation bancaire" }),
    french: t({ en: "In French", es: "En francés", fr: "En français" }),
    quebec: t({ en: "In Quebec", es: "En Quebec", fr: "Au Québec" }),
};

const LISTED_IN_SPANISH = t({
    en: "Yes, and it is listed in the Argentina and Mexico App Stores",
    es: "Sí, y aparece en el App Store de Argentina y de México",
});

const OUTLAYR_WATCH = t({
    en: "Voice entry and receipt scans need an account and a connection, with 20 captures every 30 days on the free plan. There is no web app",
    es: "Dictar y escanear recibos requiere una cuenta y conexión, con 20 capturas cada 30 días en el plan gratis. No tiene app web",
});

const CSV_INTO_OUTLAYR = {
    en: "Import it in Settings, under Import data, as a CSV file. Outlayr needs a date, an amount, and a category or description column, with commas between columns, so save a file with semicolons or tabs as a comma CSV first. It finds the category by a header that says Category.",
    es: "Impórtalo en Configuración, en Importar datos, como archivo CSV. Outlayr necesita una columna de fecha, una de monto y una de categoría o descripción, con comas entre columnas, así que guarda antes como CSV con comas un archivo que use punto y coma o tabulaciones. Encuentra la categoría por un encabezado que diga Category.",
} as const;

const SIGN_LOST = {
    en: "Amounts come in positive, so add a Type column with Expense or Income if your file mixes both.",
    es: "Los montos entran en positivo, así que agrega una columna Type con Expense o Income si tu archivo mezcla los dos.",
} as const;

const ACTUAL = {
    facts: [
        {
            label: LABELS.price,
            source: "https://actualbudget.org/docs/install/",
            text: t({
                en: "Free. Syncing between devices needs a server you run or rent, such as PikaPods or Fly.io",
                es: "Gratis. Para sincronizar dispositivos necesitas un servidor propio o rentado, como PikaPods o Fly.io",
            }),
        },
        {
            label: LABELS.style,
            source: "https://actualbudget.org/",
            text: t({ en: "Envelopes", es: "Sobres" }),
        },
        {
            label: LABELS.entries,
            source: "https://actualbudget.org/",
            text: t({
                en: "By hand, QIF, OFX, QFX, CAMT.053, and CSV files, importers for YNAB4 and nYNAB, and bank sync through its server",
                es: "A mano, archivos QIF, OFX, QFX, CAMT.053 y CSV, importadores para YNAB4 y nYNAB, y sincronización bancaria a través de su servidor",
            }),
        },
        {
            label: LABELS.currencies,
            source: "https://actualbudget.org/docs/budgeting/multi-currency/",
            text: t({
                en: "One. It does not support multiple currencies, and an experimental rule converts at a fixed rate you type",
                es: "Una. No admite varias monedas, y una regla experimental convierte con una tasa fija que escribes tú",
            }),
        },
        {
            label: LABELS.platforms,
            source: "https://actualbudget.org/docs/install/",
            text: t({
                en: "Windows, Mac, Linux, and the browser through a server",
                es: "Windows, Mac, Linux y el navegador, a través de un servidor",
            }),
        },
        {
            label: LABELS.phone,
            source: "https://actualbudget.org/docs/install/",
            text: t({
                en: "A web page you install, which works offline",
                es: "Una página web que instalas y que funciona sin conexión",
            }),
        },
        {
            label: LABELS.watch,
            source: "https://actualbudget.org/docs/advanced/bank-sync/",
            text: t({
                en: "Devices do not sync until you run or rent a server, and its homepage still lists GoCardless bank sync, which is closed to new accounts",
                es: "Los dispositivos no se sincronizan hasta que montes o rentes un servidor, y su página principal todavía anuncia GoCardless, que ya no acepta cuentas nuevas",
            }),
        },
    ],
    name: "Actual Budget",
    slug: "actual",
    summary: t({
        en: "Actual Budget is a free, local-first envelope budgeting app for Windows, Mac, Linux, and the browser, open source under the MIT license.",
        es: "Actual Budget es una app gratis de presupuesto por sobres que guarda tus datos primero en tu equipo, para Windows, Mac, Linux y el navegador, de código abierto con licencia MIT.",
    }),
};

const COPILOT_FACTS = [
    {
        label: LABELS.price,
        source: "https://copilot.money/pricing/",
        text: t({
            en: "$95 a year, after a 1-month trial. No free plan",
            es: "US$95 al año, después de una prueba de 1 mes. Sin plan gratis",
        }),
    },
    {
        label: LABELS.entries,
        source: "https://www.copilot.money/faq",
        text: t({
            en: "Synced from linked US accounts, or by hand",
            es: "Sincronizados desde cuentas vinculadas de EE. UU., o a mano",
        }),
    },
    {
        label: LABELS.currencies,
        source: "https://help.copilot.money/en/articles/10715424-international-currency",
        text: t({ en: "US dollars only, with no conversion", es: "Solo dólares estadounidenses, sin conversión" }),
    },
    {
        label: LABELS.platforms,
        source: "https://help.copilot.money/en/articles/11780342-copilot-money-for-web",
        text: t({ en: "iPhone, iPad, Mac, web. No Android", es: "iPhone, iPad, Mac, web. Sin Android" }),
    },
];

const EVERYDOLLAR_FACTS = [
    {
        label: LABELS.price,
        source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/21544207900685-EveryDollar-Premium-Subscription-Cost",
        text: t({
            en: "Free version. Premium is $17.99 a month or $79.99 a year, after a 14-day trial",
            es: "Versión gratis. Premium cuesta US$17.99 al mes o US$79.99 al año, después de una prueba de 14 días",
        }),
    },
    {
        label: LABELS.style,
        source: "https://www.ramseysolutions.com/money/everydollar",
        text: t({ en: "A zero-based monthly budget", es: "Un presupuesto mensual de base cero" }),
    },
    {
        label: LABELS.entries,
        source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/360040571391-Export-Tracked-Transactions",
        text: t({
            en: "By hand. Bank connect pulls transactions in Premium. No file import",
            es: "A mano. La conexión al banco trae los movimientos en Premium. No importa archivos",
        }),
    },
    {
        label: LABELS.availability,
        source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/21544207900685-EveryDollar-Premium-Subscription-Cost",
        text: t({
            en: "Mobile app and Premium in the US only. Elsewhere, a free budget on EveryDollar.com",
            es: "App móvil y Premium solo en EE. UU. En otros países, un presupuesto gratis en EveryDollar.com",
        }),
    },
    {
        label: LABELS.platforms,
        source: "https://www.ramseysolutions.com/money/everydollar",
        text: t({ en: "Computer, phone, or tablet", es: "Computadora, celular o tableta" }),
    },
];

const GOODBUDGET = {
    facts: [
        {
            label: LABELS.price,
            source: "https://goodbudget.com/blog/2024/08/changes-to-goodbudgets-plan-offerings/",
            text: t({
                en: "Free plan. Premium is $10 a month or $80 a year",
                es: "Plan gratis. Premium cuesta US$10 al mes o US$80 al año",
            }),
        },
        {
            label: LABELS.free,
            source: "https://goodbudget.com/help/billing/subscribe-to-goodbudget/",
            text: t({
                en: "10 envelopes plus 10 annual or goal envelopes, 1 account, 2 devices, and 1 year of history",
                es: "10 sobres más 10 sobres anuales o de metas, 1 cuenta, 2 dispositivos y 1 año de historial",
            }),
        },
        {
            label: LABELS.style,
            source: "https://goodbudget.com/help/billing/subscribe-to-goodbudget/",
            text: t({ en: "Envelopes", es: "Sobres" }),
        },
        {
            label: LABELS.entries,
            source: "https://goodbudget.com/help/using-accounts/import/",
            text: t({
                en: "By hand, or QFX, OFX, and CSV files. Bank sync for US banks in Premium",
                es: "A mano, o archivos QFX, OFX y CSV. Sincronización con bancos de EE. UU. en Premium",
            }),
        },
        {
            label: LABELS.currencies,
            source: "https://goodbudget.com/help/budgeting-with-goodbudget/5/",
            text: t({
                en: "No currency symbols in the app or on the web",
                es: "No usa símbolos de moneda en la app ni en la web",
            }),
        },
        {
            label: LABELS.platforms,
            source: "https://goodbudget.com/help/mobile-apps/",
            text: t({ en: "Web, Android, iPhone", es: "Web, Android, iPhone" }),
        },
        {
            label: LABELS.watch,
            source: "https://goodbudget.com/help/billing/subscribe-to-goodbudget/",
            text: t({
                en: "The free plan keeps 1 year of history, 20 envelopes, and 1 account",
                es: "El plan gratis guarda 1 año de historial, 20 sobres y 1 cuenta",
            }),
        },
    ],
    name: "Goodbudget",
    slug: "goodbudget",
    summary: t(RIVALS.goodbudget),
};

const MONARCH = {
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
            source: "https://help.monarch.com/hc/en-us/articles/4409682789908-Importing-Transactions-Manually",
            text: t({
                en: "Synced from more than 13,000 banks and institutions, manual accounts, or CSV import on the web",
                es: "Sincronizados desde más de 13,000 bancos e instituciones, cuentas manuales o importación de CSV en la web",
            }),
        },
        {
            label: LABELS.currencies,
            source: "https://help.monarch.com/hc/en-us/articles/360048393552-International-Accounts-and-Currency",
            text: t({
                en: "Everything shows in dollars, with no conversion",
                es: "Todo se muestra en dólares, sin conversión",
            }),
        },
        {
            label: LABELS.platforms,
            source: "https://www.monarch.com/download",
            text: t({
                en: "Web, iPhone, iPad, Android, in the US and Canada",
                es: "Web, iPhone, iPad, Android, en EE. UU. y Canadá",
            }),
        },
        {
            label: LABELS.watch,
            source: "https://help.monarch.com/hc/en-us/articles/360048393552-International-Accounts-and-Currency",
            text: t({
                en: "Accounts in different currencies add up as if they were one: 10,000 CAD and 10,000 USD show as $20,000",
                es: "Las cuentas en monedas distintas se suman como si fueran una: 10,000 CAD y 10,000 USD aparecen como $20,000",
            }),
        },
    ],
    name: "Monarch Money",
    slug: "monarch",
    summary: t(RIVALS.monarch),
};

const OUTLAYR_FACTS = [
    { label: LABELS.price, text: OUTLAYR.price },
    { label: LABELS.style, text: OUTLAYR.budgets },
    { label: LABELS.entries, text: OUTLAYR.entries },
    { label: LABELS.currencies, text: OUTLAYR.currencies },
    { label: LABELS.platforms, text: OUTLAYR.platforms },
    { label: LABELS.free, text: OUTLAYR_FREE },
];

const POCKETGUARD = {
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
            label: LABELS.style,
            source: "https://pocketguard.com/pricing/",
            text: t({ en: "Zero-based, envelopes, or by category", es: "Base cero, sobres o por categoría" }),
        },
        {
            label: LABELS.entries,
            source: "https://pocketguard.com/help/pocketguard-plus-overview/",
            text: t({
                en: "Synced from linked accounts in the US and Canada, cash transactions, or CSV import",
                es: "Sincronizados desde cuentas vinculadas de EE. UU. y Canadá, movimientos en efectivo o importación de CSV",
            }),
        },
        {
            label: LABELS.platforms,
            source: "https://pocketguard.com/pricing/",
            text: t({ en: "Web, iPhone, Apple Watch, Android", es: "Web, iPhone, Apple Watch, Android" }),
        },
        {
            label: LABELS.watch,
            source: "https://pocketguard.com/pricing/",
            text: t({
                en: "Its pricing page shows no free plan, and its site says it is not available in some regions",
                es: "Su página de precios no muestra un plan gratis, y su sitio dice que no está disponible en algunas regiones",
            }),
        },
    ],
    name: "PocketGuard",
    slug: "pocketguard",
    summary: t(RIVALS.pocketguard),
};

const ROCKET_MONEY = {
    facts: [
        {
            label: LABELS.price,
            source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
            text: t({
                en: "Free plan. Premium is $7 to $14 a month, pay what you think is fair. Premium+ is $15 a month",
                es: "Plan gratis. Premium cuesta de US$7 a US$14 al mes, pagas lo que te parezca justo. Premium+ cuesta US$15 al mes",
            }),
        },
        {
            label: LABELS.entries,
            source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
            text: t({
                en: "Synced from linked accounts. Adding transactions by hand is Premium",
                es: "Sincronizados desde cuentas vinculadas. Agregar movimientos a mano es de Premium",
            }),
        },
        {
            label: LABELS.availability,
            source: "https://help.rocketmoney.com/en/articles/79778-does-rocket-money-support-international-banks",
            text: t({ en: "The US, with US banks", es: "Estados Unidos, con bancos de EE. UU." }),
        },
        {
            label: LABELS.platforms,
            source: "https://help.rocketmoney.com/en/articles/12166750-rocket-money-for-desktop",
            text: t({
                en: "iPhone, Android. The website is for Premium members",
                es: "iPhone, Android. El sitio web es solo para miembros Premium",
            }),
        },
        {
            label: LABELS.watch,
            source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
            text: t({
                en: "On the free plan you cannot add transactions by hand or export them",
                es: "En el plan gratis no puedes agregar movimientos a mano ni exportarlos",
            }),
        },
    ],
    name: "Rocket Money",
    slug: "rocket-money",
    summary: t({
        en: "Rocket Money is a subscription and bill tracker with budgeting for the United States, free to start, with a Premium plan you pay what you think is fair for.",
        es: "Rocket Money es una app para controlar suscripciones y facturas, con presupuesto, para Estados Unidos, gratis para empezar y con un plan Premium en el que pagas lo que te parezca justo.",
    }),
};

const SPENDEE = {
    facts: [
        {
            label: LABELS.price,
            source: "https://www.spendee.com/pricing",
            text: t({
                en: "Free Basic plan with 1 cash wallet and 1 budget. Plus $1.99 a month or $14.99 a year, Premium $5.99 a month or $35.99 a year, after a 7-day trial. Prices vary by country",
                es: "Plan Basic gratis con 1 billetera de efectivo y 1 presupuesto. Plus US$1.99 al mes o US$14.99 al año, Premium US$5.99 al mes o US$35.99 al año, después de una prueba de 7 días. Los precios cambian según el país",
            }),
        },
        {
            label: LABELS.entries,
            source: "https://help.spendee.com/article/209-data-import",
            text: t({
                en: "By hand, bank sync in Premium, or CSV and XLS files on the web, into cash wallets",
                es: "A mano, sincronización bancaria en Premium, o archivos CSV y XLS en la web, en billeteras de efectivo",
            }),
        },
        {
            label: LABELS.currencies,
            source: "https://help.spendee.com/article/231-how-to-setchange-the-currency-and-exchange-rate",
            text: t({
                en: "A currency per wallet, with your own exchange rate per transaction. A wallet's currency locks once it has transactions",
                es: "Una moneda por billetera, con tu propia tasa por movimiento. La moneda de una billetera queda fija cuando ya tiene movimientos",
            }),
        },
        {
            label: LABELS.platforms,
            source: "https://www.spendee.com/pricing",
            text: t({
                en: "iPhone, Android, web. Budgets are on the phone only for now",
                es: "iPhone, Android, web. Por ahora los presupuestos solo están en el celular",
            }),
        },
        {
            label: LABELS.watch,
            source: "https://help.spendee.com/article/137-export-transactions",
            text: t({
                en: "The free plan exports only the last 365 days, and export works on the phone only",
                es: "El plan gratis exporta solo los últimos 365 días, y exportar solo funciona en el celular",
            }),
        },
    ],
    name: "Spendee",
    slug: "spendee",
    summary: t(RIVALS.spendee),
};

const YNAB = {
    facts: [
        {
            label: LABELS.price,
            source: "https://www.ynab.com/pricing",
            text: t({
                en: "$14.99 a month or $109 a year, after a 34-day trial. Students get 365 days free",
                es: "US$14.99 al mes o US$109 al año, después de una prueba de 34 días. Los estudiantes tienen 365 días gratis",
            }),
        },
        {
            label: LABELS.style,
            source: "https://www.ynab.com/",
            text: t({
                en: "You decide what your money is for before you spend it",
                es: "Decides para qué es tu dinero antes de gastarlo",
            }),
        },
        {
            label: LABELS.entries,
            source: "https://www.ynab.com/whats-new/file-based-import-elevated",
            text: t({
                en: "By hand, Direct Import from select US, Canadian, UK, and EU banks, or CSV files",
                es: "A mano, Direct Import desde algunos bancos de EE. UU., Canadá, Reino Unido y la UE, o archivos CSV",
            }),
        },
        {
            label: LABELS.currencies,
            source: "https://www.ynab.com/pricing",
            text: t({ en: "One per plan", es: "Una por plan" }),
        },
        {
            label: LABELS.platforms,
            source: "https://www.ynab.com/pricing",
            text: t({ en: "iPhone, Android, web, Apple Watch", es: "iPhone, Android, web, Apple Watch" }),
        },
        {
            label: LABELS.watch,
            source: "https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9",
            text: t({
                en: "No free plan after the trial, and export is web only, without targets or category notes",
                es: "Sin plan gratis después de la prueba, y exportar es solo en la web, sin metas ni notas de categoría",
            }),
        },
    ],
    name: "YNAB",
    slug: "ynab",
    summary: t(RIVALS.ynab),
};

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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://help.copilot.money/en/articles/5944414-exporting-your-transaction-data",
                        text: t({
                            en: "On iPhone, open Settings, scroll to Account, tap Export your transactions, and save the CSV to Files. On a Mac, an iPad, or the web, export from the Transactions tab, all of them or a filtered set.",
                            es: "En iPhone, abre Settings, baja hasta Account, toca Export your transactions y guarda el CSV en Archivos. En una Mac, un iPad o la web, exporta desde la pestaña Transactions, todos o los que filtres.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://help.copilot.money/en/articles/5944414-exporting-your-transaction-data",
                        text: t({
                            en: "A CSV with the date, name, amount, category and parent category, transaction type, account, notes, and whether each transaction was excluded.",
                            es: "Un CSV con la fecha, el nombre, el monto, la categoría y su categoría principal, el tipo de movimiento, la cuenta, las notas y si cada movimiento estaba excluido.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import it in Settings, under Import data, as a CSV file. The date, the name, the category, and the amount come across. Delete the excluded rows first, since Outlayr imports every row, and check the columns Outlayr picked before you import.",
                            es: "Impórtalo en Configuración, en Importar datos, como archivo CSV. Pasan la fecha, el nombre, la categoría y el monto. Borra primero las filas excluidas, porque Outlayr importa todas, y revisa las columnas que eligió Outlayr antes de importar.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Parent categories, accounts, pending status, and links to recurring charges.",
                            es: "Las categorías principales, las cuentas, el estado pendiente y los vínculos con cobros recurrentes.",
                        }),
                    },
                ],
                related: ["/guides/ynab-alternatives", "/compare/monarch", "/compare/everydollar"] satisfies PageRef[],
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
                title: t({ en: "Outlayr as a Copilot alternative", es: "Outlayr como alternativa a Copilot" }),
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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/360040571391-Export-Tracked-Transactions",
                        text: t({
                            en: "Sign in at EveryDollar.com, scroll to the bottom of the budget, choose Download CSV, and pick the month's tracked transactions. Change the month in the drop-down at the top left and repeat for each month.",
                            es: "Inicia sesión en EveryDollar.com, baja hasta el final del presupuesto, elige Download CSV y escoge los movimientos registrados del mes. Cambia el mes en el menú de arriba a la izquierda y repite con cada mes.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/360040571391-Export-Tracked-Transactions",
                        text: t({
                            en: "One CSV per month, on the website and with Premium only. It holds each tracked transaction's budget group, budget item, type, date, merchant, account, amount, and note.",
                            es: "Un CSV por mes, solo en la web y con Premium. Tiene el grupo y la partida del presupuesto, el tipo, la fecha, el comercio, la cuenta, el monto y la nota de cada movimiento registrado.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import each month's file in Settings, under Import data, as a CSV file. Outlayr finds the date, the merchant, and the amount; pick the budget item column as the category by hand, since its name doesn't say category.",
                            es: "Importa el archivo de cada mes en Configuración, en Importar datos, como archivo CSV. Outlayr encuentra la fecha, el comercio y el monto; elige a mano la columna de la partida como categoría, porque su nombre no dice categoría.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Budget groups, accounts, untracked transactions, and what you planned for each item. A year of history takes 12 files.",
                            es: "Los grupos del presupuesto, las cuentas, los movimientos sin registrar y lo que planeaste para cada partida. Un año de historial son 12 archivos.",
                        }),
                    },
                ],
                related: ["/guides/best-budget-apps", "/compare/ynab", "/compare/copilot"] satisfies PageRef[],
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
                    en: "Outlayr as an EveryDollar alternative",
                    es: "Outlayr como alternativa a EveryDollar",
                }),
            },
            fintonic: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you live outside Spain, pay in cash as well as by card, or want to log a purchase by saying it or scanning the receipt. Fintonic fits better if you bank in Spain and want your accounts to sync on their own, a financial score, or help getting a loan.",
                            es: "Sí, si vives fuera de España, también pagas en efectivo o prefieres registrar tus gastos sin conectar tu banco, con una oración, tu voz o un recibo. Fintonic te conviene más si tu banco está en su lista y quieres que los movimientos lleguen solos, o si buscas una nota financiera y ayuda para conseguir un préstamo. Outlayr no se conecta a tu banco, no calcula una nota financiera ni ofrece préstamos. Lo más cercano es registrar compras desde Apple Pay en iPhone o desde las notificaciones de tus apps en Android.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Fintonic alternative?",
                            es: "¿Outlayr es una buena alternativa a Fintonic?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is offered in 175 countries and regions, Chile and Mexico included, with 165 currencies, in English, Spanish, Portuguese, and French. Fintonic's App Store listing is only in Spain, and the banks it lists operate there.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, entre ellos España, Chile y México, con 165 monedas, en inglés, francés, portugués y español de España y de Latinoamérica. Fintonic solo aparece en la App Store de España y los bancos de su lista operan allí. Su web todavía muestra México y Chile en el selector de país, pero al elegirlos sigues en la web de España.",
                        }),
                        question: t({
                            en: "Does Outlayr work in Chile and Mexico?",
                            es: "¿Outlayr funciona en España, Chile y México?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Type one sentence, say it, or scan the receipt, and file it under a cash account. Fintonic's help center says it shows only movements that went through a bank account.",
                            es: "Sí. Escribe una oración, díctala o escanea el recibo, y regístrala en una cuenta de efectivo. El centro de ayuda de Fintonic dice que no puedes añadir gastos en efectivo que no pasaron por el banco.",
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
                            es: "Quieres registrar tus gastos sin conectar tu banco",
                        }),
                    ],
                    rival: [
                        SYNC_ACCOUNTS,
                        t({
                            en: "Want a financial score and help getting a loan",
                            es: "Quieres una nota financiera y ayuda para conseguir un préstamo",
                        }),
                        t({ en: "Bank in Spain", es: "Tienes tus cuentas en un banco de su lista, en España" }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.fintonic.en}`,
                    es: `¿Buscas una alternativa a Fintonic? Outlayr es una app de código abierto para controlar tus gastos sin conectar tu banco: los registras con una oración, con tu voz o con un recibo, también en efectivo y fuera de España, gratis para empezar. ${RIVALS.fintonic.es} Si quieres que tus movimientos lleguen solos, te conviene más Fintonic.`,
                }),
                meta: {
                    description: t({
                        en: "Fintonic is a free app in Spain that reads Spanish bank accounts and arranges loans. Outlayr is an open source alternative for cash, cards, and 165 currencies.",
                        es: "¿Buscas una alternativa a Fintonic sin conectar tu banco? Outlayr registra gastos y efectivo con tu voz o un recibo. Compara precio, funciones y cómo cambiarte.",
                    }),
                    title: t({
                        en: "Fintonic Alternative: Outlayr vs Fintonic",
                        es: "Alternativa a Fintonic sin conectar tu banco: Outlayr vs Fintonic",
                    }),
                },
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://www.fintonic.com/blog/descubre-el-nuevo-fintonic/",
                        text: t({
                            en: "Fintonic's site doesn't describe an export today. Its blog said in 2018 that you could download your movements as an Excel file, but not where to find it.",
                            es: "Ni la web ni el centro de ayuda de Fintonic explican hoy cómo exportar. Su blog decía en 2018 que podías descargar todo tu histórico de movimientos en un Excel, pero no dónde encontrarlo.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        text: t({
                            en: "If you get an Excel file, save it as a comma-separated CSV first, since Outlayr can't open Excel files. Fintonic doesn't publish that file's columns. With Pro, Outlayr can also read a bank statement PDF with AI, if you allow it.",
                            es: "Si consigues un Excel, guárdalo primero como CSV separado por comas, porque Outlayr no abre archivos de Excel. Fintonic no publica qué columnas trae. Si no lo encuentras, descarga los movimientos en CSV desde tu banco, si te lo permite. Con Pro, Outlayr también lee con IA un extracto o estado de cuenta en PDF, si lo autorizas.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import it in Settings, under Import data, as a CSV file, and check the columns Outlayr picked before you import. Or start fresh: type a purchase as one sentence, say it, or scan the receipt.",
                            es: "En la sección Datos de la configuración de Outlayr, toca Importar y elige el CSV. Revisa las columnas que eligió Outlayr: necesita la fecha, el monto y una categoría o descripción. Pasan tus movimientos pasados, no la conexión con el banco. O empieza de cero: escribe una compra en una oración, díctala o escanea el recibo.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        source: "https://fintonic.ladesk.com/992441-C%C3%B3mo-puedo-darme-de-baja-en-Fintonic",
                        text: t({
                            en: "Your FinScore, alerts, and loan offers stay in Fintonic.",
                            es: "Tu FinScore, las alertas y las ofertas de préstamos se quedan en Fintonic. Guarda lo que quieras conservar antes de darte de baja: Fintonic avisa que pierdes el histórico de movimientos, las categorizaciones y las notas.",
                        }),
                    },
                ],
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
                            es: "Solo movimientos de los bancos que conectas, sin efectivo",
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
                        rival: t({
                            en: "Spain, with banks that operate there",
                            es: "España, con bancos que operan allí",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, Android, web", es: "iPhone, Android, web" }),
                    },
                    LICENSE_ROW,
                ],
                site: "fintonic.com",
                source: "https://www.fintonic.com/es-ES/inicio/",
                summary: t(RIVALS.fintonic),
                title: t({
                    en: "Outlayr as a Fintonic alternative",
                    es: "Outlayr, una alternativa a Fintonic sin conectar tu banco",
                }),
            },
            goodbudget: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you spend in more than one currency, want all your history on the free plan, or would rather say or scan a purchase than fill in a form. Goodbudget fits better if you budget with envelopes, need a web app today, or want US bank accounts to sync in Premium.",
                            es: "Sí, si gastas en más de una moneda, quieres todo tu historial en el plan gratis o prefieres dictar o escanear una compra en vez de llenar un formulario. Goodbudget te conviene más si presupuestas con sobres, necesitas una app web hoy, o quieres que tus cuentas de bancos de EE. UU. se sincronicen en Premium.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Goodbudget alternative?",
                            es: "¿Outlayr es una buena alternativa a Goodbudget?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Not by that name. You set a limit per category, or one for the month, for a day, a week, a month, or a year. Turn on carry-over and what you do not spend is added to the next period, much like cash left in an envelope, and what you overspend comes off the next one.",
                            es: "No con ese nombre. Pones un límite por categoría, o uno para el mes, por día, semana, mes o año. Activa Acumular lo que sobre y lo que no gastes se suma al período siguiente, como el efectivo que queda en un sobre, y lo que te pases se resta del siguiente.",
                        }),
                        question: t({ en: "Does Outlayr have envelopes?", es: "¿Outlayr tiene sobres?" }),
                    },
                    {
                        answer: t({
                            en: "Yes. Each purchase keeps its currency, from 165, and totals convert to your main currency at the rate from the day of each purchase. Goodbudget shows no currency symbols in the app or on the web.",
                            es: "Sí. Cada compra conserva su moneda, entre 165, y los totales se convierten a tu moneda principal con la tasa del día de cada compra. Goodbudget no muestra símbolos de moneda en la app ni en la web.",
                        }),
                        question: t({
                            en: "Does Outlayr show currencies?",
                            es: "¿Outlayr muestra monedas?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [
                        SEVERAL_CURRENCIES,
                        t({
                            en: "Want all your history on the free plan",
                            es: "Quieres todo tu historial en el plan gratis",
                        }),
                        SAY_OR_SCAN,
                    ],
                    rival: [
                        t({ en: "Budget with envelopes", es: "Presupuestas con sobres" }),
                        NEED_WEB,
                        t({
                            en: "Want US bank accounts to sync on their own",
                            es: "Quieres que tus cuentas de bancos de EE. UU. se sincronicen solas",
                        }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.goodbudget.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.goodbudget.es}`,
                }),
                meta: {
                    description: t({
                        en: "Outlayr vs Goodbudget: envelopes or category limits with a pace, currencies, free plans, and price. Goodbudget facts checked on its own site, October 2026.",
                        es: "Outlayr vs Goodbudget: sobres o límites con ritmo, monedas, planes gratis y precio. Datos de Goodbudget revisados en su propio sitio, octubre de 2026.",
                    }),
                    title: t({
                        en: "Goodbudget Alternative: Outlayr vs Goodbudget",
                        es: "Alternativa a Goodbudget: Outlayr vs Goodbudget",
                    }),
                },
                moving: [
                    {
                        label: MOVING.export,
                        text: t({
                            en: "How Goodbudget exports your history was not part of what we checked, so there are no export steps here. If you have your Goodbudget transactions as a CSV, the rows below say what Outlayr does with it.",
                            es: "Cómo exporta Goodbudget tu historial no fue parte de lo que revisamos, así que aquí no hay pasos para exportar. Si tienes tus movimientos de Goodbudget en un CSV, las filas de abajo dicen qué hace Outlayr con él.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://goodbudget.com/help/budgeting-with-goodbudget/5/",
                        text: t({
                            en: "Goodbudget shows no currency symbols, so add a Currency column with codes like USD or MXN if you track more than one. Rows without one land in your main currency.",
                            es: "Goodbudget no muestra símbolos de moneda, así que agrega una columna Currency con códigos como USD o MXN si llevas más de una. Las filas sin ella entran en tu moneda principal.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: `${CSV_INTO_OUTLAYR.en} If your envelope names sit under another header, rename it to Category. ${SIGN_LOST.en}`,
                            es: `${CSV_INTO_OUTLAYR.es} Si tus nombres de sobres están bajo otro encabezado, cámbialo a Category. ${SIGN_LOST.es}`,
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Accounts and envelope amounts. Set your limits again in Balances, under Categories, and turn on carry-over to keep what you do not spend.",
                            es: "Las cuentas y los montos de los sobres. Vuelve a poner tus límites en Saldos, en Categorías, y activa Acumular lo que sobre para conservar lo que no gastes.",
                        }),
                    },
                ],
                related: [
                    "/guides/best-budget-apps",
                    "/guides/ynab-alternatives",
                    "/guides/budget-planner",
                ] satisfies PageRef[],
                rival: "Goodbudget",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free plan. Premium is $10 a month or $80 a year",
                            es: "Plan gratis. Premium cuesta US$10 al mes o US$80 al año",
                        }),
                    },
                    {
                        label: LABELS.free,
                        outlayr: OUTLAYR_FREE,
                        rival: t({
                            en: "10 envelopes plus 10 annual or goal envelopes, 1 account, 2 devices, and 1 year of history",
                            es: "10 sobres más 10 sobres anuales o de metas, 1 cuenta, 2 dispositivos y 1 año de historial",
                        }),
                    },
                    {
                        label: LABELS.budgets,
                        outlayr: OUTLAYR.budgets,
                        rival: t({ en: "Envelopes", es: "Sobres" }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "By hand, or QFX, OFX, and CSV files. Bank sync for US banks in Premium",
                            es: "A mano, o archivos QFX, OFX y CSV. Sincronización con bancos de EE. UU. en Premium",
                        }),
                    },
                    {
                        label: LABELS.currencies,
                        outlayr: OUTLAYR.currencies,
                        rival: t({ en: "No currency symbols at all", es: "No usa símbolos de moneda" }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "Web, Android, iPhone", es: "Web, Android, iPhone" }),
                    },
                    {
                        label: LABELS.license,
                        outlayr: LICENSE_ROW.outlayr,
                        rival: t({
                            en: "No open source license stated",
                            es: "No indica una licencia de código abierto",
                        }),
                    },
                ],
                site: "goodbudget.com",
                source: "https://goodbudget.com/help/billing/subscribe-to-goodbudget/",
                summary: t(RIVALS.goodbudget),
                title: t({
                    en: "Outlayr as a Goodbudget alternative",
                    es: "Outlayr como alternativa a Goodbudget",
                }),
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
                            en: "Yes. Outlayr is offered in 175 countries and regions, in English, Spanish, Portuguese, and French. Monarch is available in the United States and Canada.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, en inglés, español, portugués y francés. Monarch está disponible en Estados Unidos y Canadá.",
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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://help.monarch.com/hc/en-us/articles/15526600975764-Downloading-Transaction-or-Account-History",
                        text: t({
                            en: "On the web, open Settings, then Data, and choose Download Transactions. For one account, open it, click Edit, then Download transactions.",
                            es: "En la web, abre Settings, luego Data, y elige Download Transactions. Para una sola cuenta, ábrela, haz clic en Edit y luego en Download transactions.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://help.monarch.com/hc/en-us/articles/15526600975764-Downloading-Transaction-or-Account-History",
                        text: t({
                            en: "A CSV. Monarch suggests 5,000 transactions or fewer per download, split by date range, and your history stays downloadable after your subscription or trial ends.",
                            es: "Un CSV. Monarch sugiere 5,000 movimientos o menos por descarga, divididos por fechas, y tu historial se puede descargar aunque termine tu suscripción o tu prueba.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import it in Settings, under Import data, as a CSV file. The date, the merchant, the category, and the amount come across. If amounts carry a minus sign, Outlayr drops it and reads every amount as positive, so refunds and income come in as expenses unless their category is an income category in Outlayr.",
                            es: "Impórtalo en Configuración, en Importar datos, como archivo CSV. Pasan la fecha, el comercio, la categoría y el monto. Si los montos llevan signo menos, Outlayr lo quita y lee cada monto en positivo, así que los reembolsos y los ingresos entran como gastos salvo que su categoría sea de ingresos en Outlayr.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Accounts, tags, balance history, and budgets.",
                            es: "Las cuentas, las etiquetas, el historial de saldos y los presupuestos.",
                        }),
                    },
                ],
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
                title: t({ en: "Outlayr as a Monarch alternative", es: "Outlayr como alternativa a Monarch" }),
            },
            monefy: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want each purchase converted at the rate from its day, recurring entries and reminders on the free plan, or would rather say or scan a purchase than fill in a form. Monefy fits better if you want to log in two taps or sync through your own Google Drive or Dropbox.",
                            es: "Sí, si quieres cada compra convertida con la tasa de su día, registros recurrentes y avisos en el plan gratis, o prefieres dictar o escanear una compra en vez de llenar un formulario. Monefy te conviene más si quieres registrar en dos toques o sincronizar con tu propio Google Drive o Dropbox.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Monefy alternative?",
                            es: "¿Outlayr es una buena alternativa a Monefy?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The rate from the day of each purchase, so entries you already logged do not move when the rate does. You can also type the rate you actually got. Monefy uses rates you type, and counts 1 to 1 when there is none.",
                            es: "La tasa del día de cada compra, así que los registros que ya hiciste no cambian cuando la tasa se mueve. También puedes escribir la tasa que te dieron. Monefy usa tasas que escribes tú, y cuenta 1 a 1 cuando no hay ninguna.",
                        }),
                        question: RATE_FAQ.question,
                    },
                    {
                        answer: t({
                            en: "Yes. Subscriptions, bills, and paychecks log themselves on their day, with a reminder before each charge, on the free plan. In Monefy, recurring transactions are part of the paid upgrade.",
                            es: "Sí. Las suscripciones, los pagos fijos y el sueldo se registran solos en su día, con un aviso antes de cada cobro, en el plan gratis. En Monefy, los movimientos recurrentes son parte de la mejora de pago.",
                        }),
                        question: t({
                            en: "Are recurring entries free in Outlayr?",
                            es: "¿Los registros recurrentes son gratis en Outlayr?",
                        }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [
                        DAY_RATE,
                        t({
                            en: "Want recurring entries and reminders on the free plan",
                            es: "Quieres registros recurrentes y avisos en el plan gratis",
                        }),
                        SAY_OR_SCAN,
                    ],
                    rival: [
                        t({
                            en: "Want to log a purchase in two taps",
                            es: "Quieres registrar una compra en dos toques",
                        }),
                        t({
                            en: "Want sync through your own Google Drive or Dropbox",
                            es: "Quieres sincronizar con tu propio Google Drive o Dropbox",
                        }),
                    ],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.monefy.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.monefy.es}`,
                }),
                meta: {
                    description: t({
                        en: "Outlayr vs Monefy: exchange rates from the day or typed by hand, recurring entries, sync, and price. Monefy facts checked on its own site, October 2026.",
                        es: "Outlayr vs Monefy: tasas del día o escritas a mano, registros recurrentes, sincronización y precio. Datos de Monefy revisados en su sitio, octubre de 2026.",
                    }),
                    title: t({
                        en: "Monefy Alternative: Outlayr vs Monefy",
                        es: "Alternativa a Monefy: Outlayr vs Monefy",
                    }),
                },
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://www.monefy.com/help-center",
                        text: t({
                            en: "How Monefy exports your entries was not part of what we checked. Its help center describes restoring a Monefy backup, not a CSV export, so there are no export steps here.",
                            es: "Cómo exporta Monefy tus registros no fue parte de lo que revisamos. Su centro de ayuda describe cómo restaurar un respaldo de Monefy, no una exportación a CSV, así que aquí no hay pasos para exportar.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://www.monefy.com/help-center",
                        text: t({
                            en: "Monefy gives each account its own currency. If you get your entries out as a CSV, keep a Currency column with 3-letter codes like EUR or VES, and each row keeps its currency.",
                            es: "Monefy le da a cada cuenta su propia moneda. Si sacas tus registros en un CSV, deja una columna Currency con códigos de 3 letras como EUR o VES, y cada fila conserva su moneda.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: `${CSV_INTO_OUTLAYR.en} ${SIGN_LOST.en}`,
                            es: `${CSV_INTO_OUTLAYR.es} ${SIGN_LOST.es}`,
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Accounts. On the free plan, Outlayr holds 3 accounts in one currency, and Pro allows any number of both.",
                            es: "Las cuentas. En el plan gratis, Outlayr permite 3 cuentas en una moneda, y Pro permite las que quieras de ambas.",
                        }),
                    },
                ],
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/guides/multi-currency-expense-tracker",
                    "/compare/spendee",
                ] satisfies PageRef[],
                rival: "Monefy",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free core app. A paid upgrade, priced in the app, adds unlimited accounts, recurring transactions, and advanced filters",
                            es: "La app básica es gratis. Una mejora de pago, con precio en la app, agrega cuentas ilimitadas, movimientos recurrentes y filtros avanzados",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "By hand in two taps. Its site mentions importing statements",
                            es: "A mano en dos toques. Su sitio menciona importar estados de cuenta",
                        }),
                    },
                    {
                        label: LABELS.currencies,
                        outlayr: OUTLAYR.currencies,
                        rival: t({
                            en: "150+, with rates you type. With no rate, it counts 1 to 1",
                            es: "Más de 150, con tasas que escribes tú. Sin tasa, cuenta 1 a 1",
                        }),
                    },
                    {
                        label: LABELS.subscriptions,
                        outlayr: OUTLAYR_SUBSCRIPTIONS,
                        rival: t({
                            en: "Recurring transactions are part of the paid upgrade",
                            es: "Los movimientos recurrentes son parte de la mejora de pago",
                        }),
                    },
                    {
                        label: t({ en: "Sync", es: "Sincronización" }),
                        outlayr: t({
                            en: "With Pro, through your Outlayr account",
                            es: "Con Pro, a través de tu cuenta de Outlayr",
                        }),
                        rival: t({
                            en: "A database file in your own Google Drive or Dropbox",
                            es: "Un archivo de base de datos en tu propio Google Drive o Dropbox",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({ en: "iPhone, Android", es: "iPhone, Android" }),
                    },
                    {
                        label: LABELS.license,
                        outlayr: LICENSE_ROW.outlayr,
                        rival: t({
                            en: "No open source license stated",
                            es: "No indica una licencia de código abierto",
                        }),
                    },
                ],
                site: "monefy.com",
                source: "https://www.monefy.com/",
                summary: t(RIVALS.monefy),
                title: t({ en: "Outlayr as a Monefy alternative", es: "Outlayr como alternativa a Monefy" }),
            },
            "money-lover": {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want a free plan with no ads, recurring entries and reminders without paying, or voice and receipt captures that refill every 30 days. Money Lover fits better if you need a web app or want linked bank accounts to sync on their own.",
                            es: "Sí, si quieres un plan gratis sin anuncios, registros recurrentes y avisos sin pagar, o capturas de voz y de recibos que se renuevan cada 30 días. Money Lover te conviene más si necesitas una app web o quieres que tus cuentas de banco vinculadas se sincronicen solas.",
                        }),
                        question: t({
                            en: "Is Outlayr a good Money Lover alternative?",
                            es: "¿Outlayr es una buena alternativa a Money Lover?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Subscriptions, bills, and paychecks log themselves on their day, with a reminder before each charge, on the free plan. Money Lover's free plan allows one recurring transaction and one bill, and its help center says recurring transactions don't sync across devices yet.",
                            es: "Sí. Las suscripciones, los pagos fijos y el sueldo se registran solos en su día, con un aviso antes de cada cobro, en el plan gratis. El plan gratis de Money Lover permite un movimiento recurrente y una factura, y su centro de ayuda dice que los movimientos recurrentes todavía no se sincronizan entre dispositivos.",
                        }),
                        question: t({
                            en: "Are recurring entries free in Outlayr?",
                            es: "¿Los registros recurrentes son gratis en Outlayr?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No, on no plan. Money Lover shows ads on its free plan, and Premium removes them.",
                            es: "No, en ningún plan. Money Lover muestra anuncios en su plan gratis, y Premium los quita.",
                        }),
                        question: t({ en: "Does Outlayr show ads?", es: "¿Outlayr muestra anuncios?" }),
                    },
                    COST_FAQ,
                ],
                fit: {
                    outlayr: [
                        t({
                            en: "Want a free plan with no ads",
                            es: "Quieres un plan gratis sin anuncios",
                        }),
                        t({
                            en: "Want recurring entries and reminders on the free plan",
                            es: "Quieres registros recurrentes y avisos en el plan gratis",
                        }),
                        t({
                            en: "Want voice and receipt captures that refill every 30 days",
                            es: "Quieres capturas de voz y de recibos que se renuevan cada 30 días",
                        }),
                    ],
                    rival: [NEED_WEB, SYNC_ACCOUNTS],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.moneyLover.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.moneyLover.es}`,
                }),
                meta: {
                    description: t({
                        en: "Outlayr vs Money Lover: ads, free recurring entries, AI and receipt entry, platforms, and price. Money Lover facts checked in its help center, October 2026.",
                        es: "Outlayr vs Money Lover: anuncios, registros recurrentes gratis, IA y recibos, plataformas y precio. Datos de su centro de ayuda, revisados en octubre de 2026.",
                    }),
                    title: t({
                        en: "Money Lover Alternative: Outlayr vs Money Lover",
                        es: "Alternativa a Money Lover: Outlayr vs Money Lover",
                    }),
                },
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://moneylover.zendesk.com/hc/en-us/articles/36369130766617-Export-to-Google-Sheet-CSV",
                        text: t({
                            en: "Money Lover lists CSV export as a Premium feature. On iPhone, open Account, then Settings, then Export CSV. On Android, open Account, then Tools, then Export CSV. Pick the wallet, the categories, and the time range.",
                            es: "Money Lover incluye la exportación a CSV en Premium. En iPhone, abre Account, luego Settings y luego Export CSV. En Android, abre Account, luego Tools y luego Export CSV. Elige la billetera, las categorías y el período.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://moneylover.zendesk.com/hc/en-us/articles/36369130766617-Export-to-Google-Sheet-CSV",
                        text: t({
                            en: "A CSV with commas, semicolons, or tabs between columns, as you choose. Money Lover doesn't list its columns.",
                            es: "Un CSV con comas, punto y coma o tabulaciones entre columnas, como elijas. Money Lover no publica sus columnas.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: `Choose commas when you export, then import it in Settings, under Import data, as a CSV file. Check that Outlayr picked the date, the amount, and the category before you import. ${SIGN_LOST.en}`,
                            es: `Elige comas al exportar y luego impórtalo en Configuración, en Importar datos, como archivo CSV. Revisa que Outlayr haya elegido la fecha, el monto y la categoría antes de importar. ${SIGN_LOST.es}`,
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Wallets, budgets, events, and debts and loans.",
                            es: "Las billeteras, los presupuestos, los eventos y las deudas y préstamos.",
                        }),
                    },
                ],
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/compare/monefy",
                    "/compare/wallet",
                ] satisfies PageRef[],
                rival: "Money Lover",
                rows: [
                    {
                        label: LABELS.price,
                        outlayr: OUTLAYR.price,
                        rival: t({
                            en: "Free with 1 wallet and 2 budgets. Premium, priced in the app, adds unlimited wallets, budgets, and recurring transactions. Bank linking is a separate monthly subscription with a 7-day trial",
                            es: "Gratis con 1 billetera y 2 presupuestos. Premium, con precio en la app, agrega billeteras, presupuestos y movimientos recurrentes ilimitados. La conexión al banco es una suscripción mensual aparte con 7 días de prueba",
                        }),
                    },
                    {
                        label: t({ en: "Ads", es: "Anuncios" }),
                        outlayr: t({ en: "None on any plan", es: "Ninguno en ningún plan" }),
                        rival: t({
                            en: "On the free plan. Premium removes them",
                            es: "En el plan gratis. Premium los quita",
                        }),
                    },
                    {
                        label: LABELS.entries,
                        outlayr: OUTLAYR.entries,
                        rival: t({
                            en: "By hand, a typed sentence, receipt scan, Apple Pay through Shortcuts on iPhone, and bank linking. Free accounts get 10 AI uses",
                            es: "A mano, una oración escrita, escaneo de recibos, Apple Pay con Atajos en iPhone y conexión al banco. Las cuentas gratis tienen 10 usos de IA",
                        }),
                    },
                    {
                        label: LABELS.currencies,
                        outlayr: OUTLAYR.currencies,
                        rival: t({
                            en: "One per wallet. An entry in another currency converts to the wallet's",
                            es: "Una por billetera. Un registro en otra moneda se convierte a la de la billetera",
                        }),
                    },
                    {
                        label: LABELS.subscriptions,
                        outlayr: OUTLAYR_SUBSCRIPTIONS,
                        rival: t({
                            en: "Recurring transactions and bills, one of each on the free plan. Recurring transactions don't sync across devices",
                            es: "Movimientos recurrentes y facturas, uno de cada uno en el plan gratis. Los movimientos recurrentes no se sincronizan entre dispositivos",
                        }),
                    },
                    {
                        label: LABELS.platforms,
                        outlayr: OUTLAYR.platforms,
                        rival: t({
                            en: "iPhone, iPad, Apple Watch, Android, and the web on a computer",
                            es: "iPhone, iPad, Apple Watch, Android y la web en una computadora",
                        }),
                    },
                    LICENSE_ROW,
                ],
                site: "moneylover.zendesk.com",
                source: "https://moneylover.zendesk.com/hc/en-us",
                summary: t(RIVALS.moneyLover),
                title: t({
                    en: "Outlayr as a Money Lover alternative",
                    es: "Outlayr como alternativa a Money Lover",
                }),
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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://web.archive.org/web/20261010222740/https://pocketguard.com/help/export-transactions/",
                        text: t({
                            en: "PocketGuard's help center lists Export transactions under Transactions, behind the download icon, or in the sidebar, as a PocketGuard Plus feature. It emails you a link that works for 24 hours.",
                            es: "El centro de ayuda de PocketGuard ubica Export transactions en Transactions, tras el ícono de descarga, o en la barra lateral, como función de PocketGuard Plus. Te envía por correo un enlace que dura 24 horas.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://web.archive.org/web/20261010222740/https://pocketguard.com/help/export-transactions/",
                        text: t({
                            en: "A CSV with the history of all your linked accounts. PocketGuard doesn't list its columns.",
                            es: "Un CSV con el historial de todas tus cuentas vinculadas. PocketGuard no publica sus columnas.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import it in Settings, under Import data, as a CSV file, and check that Outlayr picked the date, the amount, and the category before you import.",
                            es: "Impórtalo en Configuración, en Importar datos, como archivo CSV, y revisa que Outlayr haya elegido la fecha, el monto y la categoría antes de importar.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Outlayr's import has no field for accounts, budgets, or recurring bills, so set up charges that repeat again in Outlayr.",
                            es: "La importación de Outlayr no tiene campos para cuentas, presupuestos ni pagos recurrentes, así que vuelve a crear en Outlayr los cobros que se repiten.",
                        }),
                    },
                ],
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
                    en: "Outlayr as a PocketGuard alternative",
                    es: "Outlayr como alternativa a PocketGuard",
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
                            en: "Yes. Outlayr is offered in 175 countries and regions, with 165 currencies, in English, Spanish, Portuguese, and French. Rocket Money is available in the United States, with U.S. banks.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, con 165 monedas, en inglés, español, portugués y francés. Rocket Money está disponible en Estados Unidos, con bancos de EE. UU.",
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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://help.rocketmoney.com/en/articles/10296106-exporting-transactions",
                        text: t({
                            en: "In the app, open Transactions, tap the menu in the upper right, then CSV Download, pick your filters, and tap Export. On the web, open Transactions and choose Export.",
                            es: "En la app, abre Transactions, toca el menú arriba a la derecha, luego CSV Download, elige tus filtros y toca Export. En la web, abre Transactions y elige Export.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://help.rocketmoney.com/en/articles/10296106-exporting-transactions",
                        text: t({
                            en: "A CSV, sent as a download link by email. Export is a Premium feature, and the file opens only on a computer, not on a phone.",
                            es: "Un CSV que llega como enlace de descarga por correo. Exportar es una función Premium, y el archivo solo se abre en una computadora, no en el celular.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Save the file to Google Drive or iCloud Drive from your computer, then import it in Settings, under Import data, as a CSV file. Rocket Money doesn't list its columns, so check that Outlayr picked the date, the amount, and the category before you import.",
                            es: "Guarda el archivo en Google Drive o iCloud Drive desde tu computadora y luego impórtalo en Configuración, en Importar datos, como archivo CSV. Rocket Money no publica sus columnas, así que revisa que Outlayr haya elegido la fecha, el monto y la categoría antes de importar.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Outlayr's import has no field for accounts, tags, split lines, or budgets. Subscriptions come in as one-off entries, so set each one to repeat in Outlayr.",
                            es: "La importación de Outlayr no tiene campos para cuentas, etiquetas, divisiones ni presupuestos. Las suscripciones entran como registros sueltos, así que configura cada una para que se repita en Outlayr.",
                        }),
                    },
                ],
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
                    en: "Outlayr as a Rocket Money alternative",
                    es: "Outlayr como alternativa a Rocket Money",
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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://help.spendee.com/article/137-export-transactions",
                        text: t({
                            en: "In the phone app, open More, then Export, pick the wallets and the time period, and choose CSV. Export isn't in Spendee's web app yet.",
                            es: "En la app del celular, abre More, luego Export, elige las billeteras y el período, y escoge CSV. Exportar todavía no está en la app web de Spendee.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://help.spendee.com/article/137-export-transactions",
                        text: t({
                            en: "CSV or XLS. The free plan exports the last 365 days; Plus and Premium have no date limit.",
                            es: "CSV o XLS. El plan gratis exporta los últimos 365 días; Plus y Premium no tienen límite de fechas.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Choose CSV, since Outlayr doesn't read XLS files, then import it in Settings, under Import data, as a CSV file. Spendee doesn't list its columns, so check that Outlayr picked the date, the amount, and the category before you import.",
                            es: "Elige CSV, porque Outlayr no lee archivos XLS, y luego impórtalo en Configuración, en Importar datos, como archivo CSV. Spendee no publica sus columnas, así que revisa que Outlayr haya elegido la fecha, el monto y la categoría antes de importar.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Labels, wallets, and budgets, and on Spendee's free plan, anything older than a year.",
                            es: "Las etiquetas, las billeteras y los presupuestos, y en el plan gratis de Spendee, todo lo anterior a un año.",
                        }),
                    },
                ],
                related: [
                    "/guides/best-expense-tracker-apps",
                    "/compare/wallet",
                    "/compare/monefy",
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
                        rival: t({
                            en: "iPhone, Android, and web. Budgets on the web are coming",
                            es: "iPhone, Android y web. Los presupuestos en la web llegan pronto",
                        }),
                    },
                    LICENSE_ROW,
                ],
                site: "spendee.com",
                source: "https://www.spendee.com/pricing",
                summary: t(RIVALS.spendee),
                title: t({ en: "Outlayr as a Spendee alternative", es: "Outlayr como alternativa a Spendee" }),
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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://support.budgetbakers.com/hc/en-us/articles/7151606064018-How-to-export-transactions-from-Wallet",
                        text: t({
                            en: "On Android, open the menu at the top left, then Others, then Export, set any filters, and choose CSV. In the web app, open Records, select the rows, and choose Export, then Export to CSV. The iPhone app can't export.",
                            es: "En Android, abre el menú de arriba a la izquierda, luego Others y Export, pon los filtros que quieras y elige CSV. En la app web, abre Records, selecciona las filas y elige Export y luego Export to CSV. La app de iPhone no puede exportar.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://support.budgetbakers.com/hc/en-us/articles/10105401036690-Backup-Measures-and-Data-Loss",
                        text: t({
                            en: "CSV, XLS, or PDF, with each record's date, amount, category, and account. Export is a Premium feature, and it leaves out budgets, goals, and recurring payments.",
                            es: "CSV, XLS o PDF, con la fecha, el monto, la categoría y la cuenta de cada registro. Exportar es una función Premium, y no incluye presupuestos, metas ni pagos recurrentes.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import the CSV in Settings, under Import data, as a CSV file. The date, the category, and the amount come across.",
                            es: "Importa el CSV en Configuración, en Importar datos, como archivo CSV. Pasan la fecha, la categoría y el monto.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Accounts, payment types, and transfers as transfers.",
                            es: "Las cuentas, los tipos de pago y las transferencias como transferencias.",
                        }),
                    },
                ],
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
                    en: "Outlayr as an alternative to Wallet by BudgetBakers",
                    es: "Outlayr como alternativa a Wallet by BudgetBakers",
                }),
            },
            ynab: {
                faq: [
                    {
                        answer: t({
                            en: "Outlayr, if you want to start free, spend in more than one currency, or would rather say or scan a purchase than fill in a form. YNAB fits better if you want your bank to import transactions, or follow its give every dollar a job method. For six more options, see YNAB alternatives.",
                            es: "Outlayr, si quieres empezar gratis, gastas en más de una moneda o prefieres dictar o escanear una compra en vez de llenar un formulario. YNAB te conviene más si quieres que tu banco importe los movimientos, o si sigues su método de darle un trabajo a cada dólar. Para ver seis opciones más, mira Alternativas a YNAB.",
                        }),
                        question: t({
                            en: "Should I use Outlayr or YNAB?",
                            es: "¿Me conviene Outlayr o YNAB?",
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
                        en: "YNAB is $14.99 a month or $109 a year, with one currency per plan. Outlayr starts free with 165 currencies. Price, entries, and platforms side by side.",
                        es: "YNAB cuesta US$14.99 al mes o US$109 al año, con una moneda por plan. Outlayr empieza gratis, con 165 monedas. Precio, registros y plataformas lado a lado.",
                    }),
                    title: t({
                        en: "Outlayr vs YNAB: Price, Currencies, Platforms (2026)",
                        es: "Outlayr vs YNAB: precio, monedas y plataformas (2026)",
                    }),
                },
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9",
                        text: t({
                            en: "On the web, click your plan name at the top of the sidebar and choose Export Plan. It downloads your plan and your transactions as two files. To export only some transactions, select them in an account and choose More, then Export.",
                            es: "En la web, haz clic en el nombre de tu plan arriba de la barra lateral y elige Export Plan. Descarga tu plan y tus movimientos en dos archivos. Para exportar solo algunos movimientos, selecciónalos en una cuenta y elige More y luego Export.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        source: "https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9",
                        text: t({
                            en: "CSV, or TSV for currencies written with a decimal comma. Export works only on the web, and it leaves out targets and category notes.",
                            es: "CSV, o TSV para las monedas que usan coma decimal. Solo se exporta desde la web, y no incluye las metas ni las notas de categoría.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import the transactions file in Settings, under Import data, as a CSV file. The date, the payee or memo, the category, and the amount come across. Outlayr reads only comma-separated files, so save a TSV as CSV first, and it reads one amount column, kept positive, so add a Type column with Income or Expense if your file splits outflow and inflow.",
                            es: "Importa el archivo de movimientos en Configuración, en Importar datos, como archivo CSV. Pasan la fecha, el beneficiario o la nota, la categoría y el monto. Outlayr solo lee archivos separados por comas, así que guarda un TSV como CSV primero, y lee una sola columna de monto, siempre en positivo, así que agrega una columna Type con Income o Expense si tu archivo separa salidas y entradas.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Accounts, flags, cleared status, split lines, and the plan file with what you assigned to each category.",
                            es: "Las cuentas, las banderas, el estado de conciliado, las divisiones y el archivo del plan con lo que asignaste a cada categoría.",
                        }),
                    },
                ],
                related: ["/guides/ynab-alternatives", "/compare/everydollar", "/compare/copilot"] satisfies PageRef[],
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
                title: t({ en: "Outlayr vs YNAB", es: "Outlayr vs YNAB" }),
            },
        },
        guides: {
            "ai-expense-tracker": {
                facts: [
                    {
                        label: t({ en: "Fills in", es: "Llena" }),
                        text: t({
                            en: "The amount, the merchant, the category, the account, the date, and the currency",
                            es: "El monto, el comercio, la categoría, la cuenta, la fecha y la moneda",
                        }),
                    },
                    {
                        label: t({ en: "Say it", es: "Díctala" }),
                        text: t({
                            en: "In your own words, in English, Spanish, Portuguese, or French, up to 45 seconds a clip",
                            es: "Con tus palabras, en inglés, español, portugués o francés, hasta 45 segundos por grabación",
                        }),
                    },
                    {
                        label: t({ en: "Type it", es: "Escríbela" }),
                        text: t({
                            en: "Tap each underlined word of the sentence. It works with no signal and no account",
                            es: "Toca cada palabra subrayada de la oración. Funciona sin señal y sin cuenta",
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
                        label: t({ en: "Free plan", es: "Plan gratis" }),
                        text: t({
                            en: "Typing has no limit. 20 voice or receipt captures every 30 days, 500 with Pro",
                            es: "Escribir no tiene límite. 20 capturas de voz o de recibos cada 30 días, 500 con Pro",
                        }),
                    },
                    {
                        label: t({ en: "Needs", es: "Requiere" }),
                        text: t({
                            en: "Voice and receipts need an account and a connection. Typing needs neither",
                            es: "La voz y los recibos requieren una cuenta y conexión. Escribir no requiere ninguna de las dos",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "For voice and receipts, yes. AI reads what you say or the receipt you photograph and fills in the entry for you to check. Typing is a sentence you fill in by tapping. Once you allow AI features, Outlayr can also suggest a category for a merchant it does not know, sending the merchant name but never the amount, the date, or the account.",
                            es: "Para la voz y los recibos, sí. La IA lee lo que dictas o el recibo que fotografías y llena el registro para que lo revises. Escribir es llenar una oración tocando cada palabra. Cuando permites las funciones de IA, Outlayr también puede sugerir una categoría para un comercio que no conoce, enviando el nombre del comercio pero nunca el monto, la fecha ni la cuenta.",
                        }),
                        question: t({
                            en: "Is Outlayr an AI expense tracker?",
                            es: "¿Outlayr es una app de gastos con IA?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. The typed sentence is a form: you tap each word to fill it in. To log a purchase in your own words, say it, and voice entry fills in the same sentence from what it hears.",
                            es: "No. La oración que escribes es un formulario: tocas cada palabra para llenarla. Para registrar una compra con tus palabras, díctala, y el registro por voz llena la misma oración con lo que escucha.",
                        }),
                        question: t({
                            en: "Can I type a purchase in my own words?",
                            es: "¿Puedo escribir una compra con mis propias palabras?",
                        }),
                    },
                    {
                        answer: t({
                            en: "English, Spanish, Portuguese, and French. Voice entry listens in the language the app is set to.",
                            es: "Inglés, español, portugués y francés. El registro por voz escucha en el idioma que tenga la app.",
                        }),
                        question: t({ en: "Which languages does it understand?", es: "¿Qué idiomas entiende?" }),
                    },
                    {
                        answer: t({
                            en: "20 captures every 30 days, shared with receipt scans, and each clip is one. Outlayr Pro raises that to 500. Typing has no limit.",
                            es: "20 capturas cada 30 días, compartidas con el escaneo de recibos, y cada grabación es una. Outlayr Pro lo sube a 500. Escribir no tiene límite.",
                        }),
                        question: t({
                            en: "How many voice entries are free?",
                            es: "¿Cuántos registros por voz son gratis?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Say what changed, like “no, that was yesterday” or “make it groceries”, and only that field updates. Or tap Finish in the form and edit it by hand.",
                            es: "Di lo que cambió, como “no, fue ayer” o “ponlo en supermercado”, y solo ese campo se actualiza. O toca Terminar en el formulario y edítalo a mano.",
                        }),
                        question: t({ en: "What if it gets a field wrong?", es: "¿Y si se equivoca en un campo?" }),
                    },
                ],
                lead: t({
                    en: "An AI expense tracker turns a purchase you describe in your own words into a saved entry. In Outlayr, AI reads the sentence you say, the receipt you photograph, and the bank notifications it logs, then fills in the amount, merchant, category, account, date, and currency. Typing fills the same sentence with taps, on your phone, with no signal needed.",
                    es: "Una app de gastos con IA convierte una compra que describes con tus palabras en un registro guardado. En Outlayr, la IA lee la oración que dictas, el recibo que fotografías y las notificaciones del banco que registra, y llena el monto, el comercio, la categoría, la cuenta, la fecha y la moneda. Al escribir, llenas la misma oración con toques en tu celular, sin necesidad de señal.",
                }),
                meta: {
                    description: t({
                        en: "Say a purchase in your own words and Outlayr's AI fills in the amount, merchant, category, account, date, and currency. Typing it works offline.",
                        es: "Dicta una compra y la IA de Outlayr llena el monto, el comercio, la categoría, la cuenta, la fecha y la moneda. Escribirla funciona sin conexión.",
                    }),
                    title: t({
                        en: "AI Expense Tracker: Log a Purchase in One Sentence · Outlayr",
                        es: "Control de gastos con IA: dicta una compra · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "These examples assume a ledger in US dollars with accounts named Amex, Visa, Chase, and Zinli, and categories named Coffee, Dining Out, Freelance, and Entertainment. Outlayr matches against the names you have.",
                                es: "Estos ejemplos suponen un registro en dólares con cuentas llamadas Amex, Banesco, Zinli y Visa, y categorías llamadas Café, Salud, Freelance y Entretenimiento. Outlayr compara con los nombres que tú tengas.",
                            }),
                            t({
                                en: "“Twelve fifty at Starbucks yesterday on the Amex” becomes $12.50 at Starbucks, under Coffee, on the Amex, dated yesterday. Saying “No, that was today, and put it under groceries” then changes only the date and the category.",
                                es: "“Doce cincuenta en Starbucks ayer con la Amex” queda como 12.50 USD en Starbucks, en Café, con la Amex, con fecha de ayer. Si luego dices “No, fue hoy, y ponlo en supermercado”, solo cambian la fecha y la categoría.",
                            }),
                            t({
                                en: "“Twenty euros for lunch at Café de Flore on the Visa” becomes €20.00 at Café de Flore, under Dining Out, on the Visa, dated today, counted in dollars at the rate from that day.",
                                es: "“Mil doscientos cincuenta bolívares en Farmatodo con Banesco” queda como 1,250.00 VES en Farmatodo, en Salud, con Banesco, con fecha de hoy, sumado en dólares con la tasa de ese día.",
                            }),
                            t({
                                en: "“Got paid 1,450 from Upwork into Zinli last Friday” becomes $1,450.00 received from Upwork, under Freelance, into Zinli, dated last Friday.",
                                es: "“Me pagaron 1,450 de Upwork en Zinli el viernes pasado” queda como 1,450.00 USD recibidos de Upwork, en Freelance, en Zinli, con fecha del viernes pasado.",
                            }),
                            t({
                                en: "“Netflix, 15.49 every month on the Chase card” becomes $15.49 at Netflix, under Entertainment, on Chase, dated today and repeating every month.",
                                es: "“Netflix, 6.99 cada mes con la Visa” queda como 6.99 USD en Netflix, en Entretenimiento, con la Visa, con fecha de hoy y repitiéndose cada mes.",
                            }),
                        ],
                        id: "examples",
                        title: t({ en: "Four examples", es: "Cuatro ejemplos" }),
                    },
                    {
                        body: [
                            t({
                                en: "Typed entries save on your phone first, so a purchase logged on a plane is on the Log right away. A purchase in another currency converts at the newest rate already saved on your phone for that day or before, and you can type the rate you got instead.",
                                es: "Los registros que escribes se guardan primero en tu celular, así que una compra que anotas en un avión aparece en el Registro al momento. Una compra en otra moneda se convierte con la tasa más reciente que ya está guardada en tu celular para ese día o antes, y también puedes escribir la tasa que te dieron.",
                            }),
                            t({
                                en: "Voice entry and receipt scanning need a connection. With none, they say you are offline and nothing is sent. With Pro, sync sends your entries to your other devices once you are back online.",
                                es: "El registro por voz y el escaneo de recibos necesitan conexión. Sin ella, te avisan que estás sin conexión y no se envía nada. Con Pro, la sincronización envía tus registros a tus otros dispositivos cuando vuelves a tener conexión.",
                            }),
                        ],
                        id: "offline",
                        title: t({ en: "What happens offline", es: "Qué pasa sin conexión" }),
                    },
                    {
                        body: [
                            t({
                                en: "Without an account you can type entries, set budgets and subscriptions, import a CSV matched by category name, and export your data. Signing in is needed for voice entry and receipt scanning, and, with Pro, for AI matching on import and for sync.",
                                es: "Sin cuenta puedes escribir registros, armar presupuestos y suscripciones, importar un CSV emparejado por nombre de categoría y exportar tus datos. Iniciar sesión es necesario para dictar registros y escanear recibos, y, con Pro, para la asignación con IA al importar y para la sincronización.",
                            }),
                            t({
                                en: "Before the first clip or receipt, Outlayr asks whether it may send data to its AI providers. A voice clip sends the recording, your account and category names, your currency, your language, and today's date, and no balances or past entries.",
                                es: "Antes de la primera grabación o del primer recibo, Outlayr te pregunta si puede enviar datos a sus proveedores de IA. Una grabación envía el audio, los nombres de tus cuentas y categorías, tu moneda, tu idioma y la fecha de hoy, y ni saldos ni registros anteriores.",
                            }),
                        ],
                        id: "account",
                        title: t({ en: "What needs an account", es: "Qué requiere una cuenta" }),
                    },
                ],
                plateAlt: t({
                    en: "Outlayr voice entry: a spoken sentence becomes $12.50 at Blue Bottle under Coffee, and a spoken correction moves it to yesterday.",
                    es: "Registro por voz de Outlayr: una oración dictada se convierte en $12.50 en Juan Valdez en Café, y una corrección dicha lo pasa a ayer.",
                }),
                related: [
                    "/guides/voice-expense-tracker",
                    "/guides/receipt-scanner",
                    "/guides/multi-currency-expense-tracker",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Tap the + button, then Add a transaction to type it, or Speak an entry to say it.",
                            es: "Toca el botón +, luego Agregar una transacción para escribirla, o Dictar un registro para decirla.",
                        }),
                        title: t({ en: "Open the form", es: "Abre el formulario" }),
                    },
                    {
                        text: t({
                            en: "To type it, tap each underlined word of the sentence, like Spent $12.50 at Blue Bottle for Coffee from Apple Card today. To say it, describe the purchase the way you would tell a friend.",
                            es: "Para escribirla, toca cada palabra subrayada de la oración, como Gasté $12.50 en Blue Bottle para Café con Apple Card hoy. Para dictarla, describe la compra como se la contarías a un amigo.",
                        }),
                        title: t({ en: "Fill in the sentence", es: "Llena la oración" }),
                    },
                    {
                        text: t({
                            en: "Check each word, say a correction or tap the one that is off, then save. Your budgets update right away.",
                            es: "Revisa cada palabra, di una corrección o toca la que no está bien, y guarda. Tus presupuestos se actualizan al momento.",
                        }),
                        title: t({ en: "Check and save", es: "Revisa y guarda" }),
                    },
                ],
                table: {
                    caption: t({
                        en: "Categories and accounts come from your own lists. A spoken date can go back up to a year.",
                        es: "Las categorías y las cuentas salen de tus propias listas. Una fecha dictada puede ir hasta un año atrás.",
                    }),
                    columns: [
                        t({ en: "When you say it", es: "Cuando lo dictas" }),
                        t({ en: "When you type it", es: "Cuando lo escribes" }),
                    ],
                    corner: t({ en: "Field", es: "Campo" }),
                    rows: [
                        {
                            cells: [
                                t({
                                    en: "The number you say, like “twelve fifty”",
                                    es: "El número que dices, como “doce cincuenta”",
                                }),
                                t({ en: "The number pad", es: "El teclado numérico" }),
                            ],
                            label: t({ en: "Amount", es: "Monto" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "Where the money went or came from: “at Starbucks”, “from Upwork”. With none, a short description of the purchase",
                                    es: "A dónde fue o de dónde vino el dinero: “en Starbucks”, “de Upwork”. Si no dices ninguno, una descripción corta de la compra",
                                }),
                                t({
                                    en: "You type the name. A merchant you logged before, or a well-known one, brings its category",
                                    es: "Escribes el nombre. Un comercio que ya registraste, o uno conocido, trae su categoría",
                                }),
                            ],
                            label: t({ en: "Merchant", es: "Comercio" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "Words like “for coffee” or “under groceries”, matched to your categories. It never makes up a new one",
                                    es: "Palabras como “de café” o “en supermercado”, emparejadas con tus categorías. Nunca inventa una nueva",
                                }),
                                t({ en: "You pick it from your categories", es: "La eliges entre tus categorías" }),
                            ],
                            label: t({ en: "Category", es: "Categoría" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "One of your account names, like “on the Amex”. A name that matches none of yours is left for you to pick",
                                    es: "El nombre de una de tus cuentas, como “con la Amex”. Si no coincide con ninguna, queda para que la elijas",
                                }),
                                t({ en: "You pick it from your accounts", es: "La eliges entre tus cuentas" }),
                            ],
                            label: t({ en: "Account", es: "Cuenta" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "“yesterday”, “last Friday”, “this morning”. Nothing said means today",
                                    es: "“ayer”, “el viernes pasado”, “esta mañana”. Si no dices nada, es hoy",
                                }),
                                t({
                                    en: "Today, yesterday, a day of the past week, or the calendar",
                                    es: "Hoy, ayer, un día de la última semana o el calendario",
                                }),
                            ],
                            label: t({ en: "Date", es: "Fecha" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "Only a currency you name, like “euros”, “MXN”, or “€”. Otherwise your main currency",
                                    es: "Solo una moneda que nombres, como “euros”, “MXN” o “€”. Si no, tu moneda principal",
                                }),
                                t({ en: "Tap the code next to the amount", es: "Toca el código junto al monto" }),
                            ],
                            label: t({ en: "Currency", es: "Moneda" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "“got paid” or “a refund” logs income, and “moved 500 from Checking to Savings” logs a transfer. Anything else is an expense",
                                    es: "“me pagaron” o “un reembolso” registra un ingreso, y “pasé 500 de Ahorros a Corriente” registra una transferencia. Todo lo demás es un gasto",
                                }),
                                t({
                                    en: "Tap Spent to switch it to Received",
                                    es: "Toca Gasté para cambiarlo a Recibí",
                                }),
                            ],
                            label: t({ en: "Expense or income", es: "Gasto o ingreso" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "“every month”, “weekly”, “a subscription”",
                                    es: "“cada mes”, “cada semana”, “una suscripción”",
                                }),
                                t({ en: "Tap repeat under the sentence", es: "Toca repetir debajo de la oración" }),
                            ],
                            label: t({ en: "Repeats", es: "Se repite" }),
                        },
                    ],
                },
                title: t({
                    en: "Log an expense by typing or saying one sentence",
                    es: "Registra un gasto escribiendo o dictando una oración",
                }),
            },
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
                    {
                        answer: t({
                            en: "No. It works on the free plan and doesn't use your voice or receipt captures. The automation runs on your iPhone and passes Outlayr the amount, the store, and the card from Wallet.",
                            es: "No. Funciona en el plan gratis y no usa tus capturas de voz ni de recibos. La automatización se ejecuta en tu iPhone y le pasa a Outlayr el monto, la tienda y la tarjeta desde Wallet.",
                        }),
                        question: t({
                            en: "Does Apple Pay logging cost anything?",
                            es: "¿Registrar con Apple Pay cuesta algo?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. The automation can run for any card in Wallet, and you choose the Outlayr account for each card the first time you pay with it.",
                            es: "Sí. La automatización puede ejecutarse con cualquier tarjeta de Wallet, y eliges la cuenta de Outlayr de cada tarjeta la primera vez que pagas con ella.",
                        }),
                        question: t({
                            en: "Does it work with every card in Wallet?",
                            es: "¿Funciona con todas las tarjetas de Wallet?",
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
                more: [
                    {
                        body: [
                            t({
                                en: "Before iOS 27 there is no shared shortcut, so setting up the Apple Pay expense tracker takes a few taps in the Shortcuts app. Open Automation, tap +, and choose Wallet, which is called Transaction before iOS 26. Pick your cards, turn Run Immediately on and Notify When Run off, then tap Next and New Blank Automation.",
                                es: "Antes de iOS 27 no hay un atajo compartido, así que configurar el control de gastos con Apple Pay toma unos toques en la app Atajos. Abre Automatización, toca + y elige Wallet, que se llama Transacción antes de iOS 26. Elige tus tarjetas, deja Ejecutar de inmediato activado y Notificar al ejecutar desactivado, y toca Siguiente y luego Nueva automatización en blanco.",
                            }),
                            t({
                                en: "Tap Add Action, search Outlayr, and pick Log a Wallet Transaction. Fill its Amount, Merchant, and Card fields from the Shortcut Input, then tap Done. Outlayr's Settings, under Apple Pay, walks through the same steps.",
                                es: "Toca Agregar acción, busca Outlayr y elige Log a Wallet Transaction. Completa sus campos Amount, Merchant y Card con la Entrada de atajo y toca Listo. En Configuración de Outlayr, en Apple Pay, están los mismos pasos.",
                            }),
                        ],
                        id: "by-hand",
                        title: t({ en: "Set it up by hand before iOS 27", es: "Configúralo a mano antes de iOS 27" }),
                    },
                    {
                        body: [
                            t({
                                en: "The first purchase with a new card adds it to Settings, under Apple Pay, where Outlayr asks which account it is. From then on, that card's purchases go to that account. A store Outlayr hasn't seen asks you to pick a category, and you can change any entry later like one you typed.",
                                es: "La primera compra con una tarjeta nueva la agrega a Configuración, en Apple Pay, donde Outlayr te pregunta qué cuenta es. Desde ahí, las compras de esa tarjeta van a esa cuenta. Una tienda que Outlayr no conoce te pide elegir una categoría, y puedes cambiar cualquier registro después como uno que escribiste.",
                            }),
                            t({
                                en: "The same screen shows when the automation last ran and the purchases it logged, so you can tell it's working. Pay with a card to try it. If a card is filed under the wrong account, choose another one there, and its next purchases follow.",
                                es: "La misma pantalla muestra cuándo se ejecutó la automatización por última vez y las compras que registró, para que sepas que funciona. Paga con una tarjeta para probarlo. Si una tarjeta quedó en la cuenta equivocada, elige otra ahí, y sus siguientes compras irán a esa cuenta.",
                            }),
                        ],
                        id: "cards",
                        title: t({ en: "Cards, accounts, and categories", es: "Tarjetas, cuentas y categorías" }),
                    },
                    {
                        body: [
                            t({
                                en: "A second shortcut, Outlayr - Bank Notifications, reads the purchase notifications your bank's app sends. Get the bank shortcut from the same screen, tap App and pick your banks, then turn it on in Automation. Pick only bank and card apps.",
                                es: "Un segundo atajo, Outlayr - Bank Notifications, lee las notificaciones de compra que envía la app de tu banco. Obtén el atajo del banco desde la misma pantalla, toca App y elige tus bancos, y actívalo en Automatización. Elige solo apps de bancos y tarjetas.",
                            }),
                            t({
                                en: "This covers cards you swipe or tap without Apple Pay, as long as your bank's app sends a notification with the amount; those apps show up in the same list. When you pay with Apple Pay and your bank also sends a notification, the tap and the notification land as one entry, not two. With Smart fill on, a notification that shows an amount goes to Anthropic to read the merchant and amount, and its text isn't kept.",
                                es: "Así se registran las tarjetas que pasas o acercas sin Apple Pay, siempre que la app de tu banco envíe una notificación con el monto; esas apps aparecen en la misma lista. Cuando pagas con Apple Pay y tu banco también te envía una notificación, el pago y la notificación quedan en un solo registro, no en dos. Con Autocompletado activado, una notificación que muestra un monto va a Anthropic para leer el comercio y el monto, y no guardamos su texto.",
                            }),
                        ],
                        id: "bank-apps",
                        title: t({ en: "Cards that aren't in Apple Pay", es: "Tarjetas que no están en Apple Pay" }),
                    },
                    {
                        body: [
                            t({
                                en: "Each tap runs in the background, so Outlayr doesn't open. A notification shows the amount and the store, with the category Outlayr already uses for that store, or a note to pick one when the store is new. Apple Pay logging works on the free plan and doesn't use any of your captures.",
                                es: "Cada pago se registra en segundo plano, así que Outlayr no se abre. Una notificación muestra el monto y la tienda, con la categoría que Outlayr ya usa para esa tienda, o un aviso para elegir una cuando la tienda es nueva. El registro con Apple Pay funciona en el plan gratis y no usa ninguna de tus capturas.",
                            }),
                            t({
                                en: "The currency comes from the amount's symbol. When a symbol belongs to several currencies, like $, Outlayr uses the currency of the account the card is filed under, so a peso card logs pesos. Wallet can run the automation twice for one purchase, when the card is authorized and again when the charge settles, and Outlayr keeps one entry.",
                                es: "La moneda sale del símbolo del monto. Cuando un símbolo es de varias monedas, como $, Outlayr usa la moneda de la cuenta donde está la tarjeta, así que una tarjeta en pesos registra pesos. Wallet puede ejecutar la automatización dos veces por una compra, cuando se autoriza la tarjeta y otra vez cuando se liquida el cobro, y Outlayr deja un solo registro.",
                            }),
                        ],
                        id: "after-tap",
                        title: t({ en: "What happens after a tap", es: "Qué pasa después de pagar" }),
                    },
                ],
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
                    en: "Log Apple Pay purchases as you pay",
                    es: "Registra tus compras con Apple Pay al pagar",
                }),
            },
            "best-budget-apps": {
                apps: [
                    ACTUAL,
                    {
                        facts: [
                            ...EVERYDOLLAR_FACTS,
                            {
                                label: LABELS.watch,
                                source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/21544207900685-EveryDollar-Premium-Subscription-Cost",
                                text: t({
                                    en: "Outside the US you get only the free web budget, with no mobile app",
                                    es: "Fuera de EE. UU. solo tienes el presupuesto gratis en la web, sin app móvil",
                                }),
                            },
                        ],
                        name: "EveryDollar",
                        slug: "everydollar",
                        summary: t(RIVALS.everydollar),
                    },
                    GOODBUDGET,
                    MONARCH,
                    {
                        facts: [
                            ...OUTLAYR_FACTS,
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "No web app. The free plan holds 2 category budgets plus one for the month",
                                    es: "Sin app web. El plan gratis permite 2 presupuestos por categoría más uno para el mes",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t(OUTLAYR_LEAD),
                    },
                    POCKETGUARD,
                    SPENDEE,
                    YNAB,
                ],
                facts: [
                    {
                        label: "Actual Budget",
                        text: t({
                            en: "Best if you want free envelope budgeting on a computer, and can run or rent a server to sync",
                            es: "Ideal si quieres presupuestar por sobres gratis en la computadora y puedes montar o rentar un servidor para sincronizar",
                        }),
                    },
                    {
                        label: "EveryDollar",
                        text: t({
                            en: "Best if you live in the US and want a zero-based monthly budget with a free version",
                            es: "Ideal si vives en EE. UU. y quieres un presupuesto mensual de base cero con versión gratis",
                        }),
                    },
                    {
                        label: "Goodbudget",
                        text: t({
                            en: "Best if you want envelopes on the web, Android, and iPhone, starting free",
                            es: "Ideal si quieres sobres en la web, Android y iPhone, empezando gratis",
                        }),
                    },
                    {
                        label: "Monarch Money",
                        text: t({
                            en: "Best if you live in the US or Canada and want budgets next to net worth, reports, and goals from linked accounts",
                            es: "Ideal si vives en EE. UU. o Canadá y quieres tus presupuestos junto a tu patrimonio, reportes y metas desde cuentas vinculadas",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you want a limit per category or for the month that says where your pace ends, in any of 165 currencies",
                            es: "Ideal si quieres un límite por categoría o para el mes que te diga a dónde te lleva tu ritmo, en cualquiera de 165 monedas",
                        }),
                    },
                    {
                        label: "PocketGuard",
                        text: t({
                            en: "Best if you live in the US or Canada and want zero-based, envelope, or category budgets from linked accounts",
                            es: "Ideal si vives en EE. UU. o Canadá y quieres presupuestos de base cero, por sobres o por categoría desde cuentas vinculadas",
                        }),
                    },
                    {
                        label: "Spendee",
                        text: t({
                            en: "Best if you want wallets in different currencies, with bank sync in Premium for banks across Europe and Latin America",
                            es: "Ideal si quieres billeteras en distintas monedas, con sincronización en Premium para bancos de Europa y Latinoamérica",
                        }),
                    },
                    {
                        label: "YNAB",
                        text: t({
                            en: "Best if you want to decide what each dollar is for before you spend it, and are fine paying after the trial",
                            es: "Ideal si quieres decidir para qué es cada dólar antes de gastarlo y no te molesta pagar después de la prueba",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "The one that matches how you budget. For envelopes, Actual Budget is free on a computer and Goodbudget runs on the web and both phones. To plan every dollar ahead, EveryDollar is zero-based in the US, and YNAB has you decide what your money is for before you spend it. PocketGuard offers several styles with linked accounts in the US and Canada. Outlayr sets a limit per category or month and says where your pace ends.",
                            es: "La que coincide con cómo presupuestas. Para sobres, Actual Budget es gratis en la computadora y Goodbudget funciona en la web y en los dos celulares. Para planear cada dólar por adelantado, EveryDollar es de base cero en EE. UU., y YNAB te pide decidir para qué es tu dinero antes de gastarlo. PocketGuard ofrece varios estilos con cuentas vinculadas en EE. UU. y Canadá. Outlayr pone un límite por categoría o por mes y te dice a dónde te lleva tu ritmo.",
                        }),
                        question: t({
                            en: "What is the best budget app?",
                            es: "¿Cuál es la mejor app de presupuesto?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Actual Budget is free software, with a server needed to sync devices. Goodbudget's free plan has 20 envelopes, 1 account, and 1 year of history. Spendee Basic has 1 wallet and 1 budget. EveryDollar has a free version, web only outside the US. Outlayr's free plan has 2 category budgets plus one for the month, and 3 accounts. Monarch, PocketGuard, and YNAB are paid after a trial.",
                            es: "Actual Budget es software gratis, con un servidor necesario para sincronizar dispositivos. El plan gratis de Goodbudget tiene 20 sobres, 1 cuenta y 1 año de historial. Spendee Basic tiene 1 billetera y 1 presupuesto. EveryDollar tiene una versión gratis, solo en la web fuera de EE. UU. El plan gratis de Outlayr tiene 2 presupuestos por categoría más uno para el mes, y 3 cuentas. Monarch, PocketGuard y YNAB son de pago después de una prueba.",
                        }),
                        question: t({
                            en: "What is the best free budget app?",
                            es: "¿Cuál es la mejor app de presupuesto gratis?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Outlayr converts 165 currencies to your main one at the rate from the day of each purchase. Spendee gives each wallet its own currency and lets you set a rate per transaction. YNAB uses one currency per plan, Actual Budget one with an experimental fixed-rate rule, and Monarch shows everything as dollars. Goodbudget shows no currency symbols. EveryDollar and PocketGuard do not say.",
                            es: "Outlayr convierte 165 monedas a tu moneda principal con la tasa del día de cada compra. Spendee le da a cada billetera su propia moneda y te deja poner una tasa por movimiento. YNAB usa una moneda por plan, Actual Budget una con una regla experimental de tasa fija y Monarch lo muestra todo en dólares. Goodbudget no muestra símbolos de moneda. EveryDollar y PocketGuard no lo dicen.",
                        }),
                        question: t({
                            en: "Which budget app works in more than one currency?",
                            es: "¿Qué app de presupuesto funciona con más de una moneda?",
                        }),
                    },
                    {
                        answer: t({
                            en: "EveryDollar's mobile app and Premium are US only, and Monarch is for the US and Canada. PocketGuard links accounts in the US and Canada, and Goodbudget's bank sync is for US banks. YNAB imports from select US, Canadian, UK, and EU banks. Spendee connects banks in many countries, including much of Europe and Latin America. Outlayr works in English, Spanish, Portuguese, and French, with 165 currencies.",
                            es: "La app móvil y el Premium de EveryDollar son solo para EE. UU., y Monarch es para EE. UU. y Canadá. PocketGuard vincula cuentas de EE. UU. y Canadá, y la sincronización de Goodbudget es para bancos de EE. UU. YNAB importa desde algunos bancos de EE. UU., Canadá, Reino Unido y la UE. Spendee conecta bancos de muchos países, entre ellos buena parte de Europa y Latinoamérica. Outlayr funciona en inglés, español, portugués y francés, con 165 monedas.",
                        }),
                        question: t({
                            en: "Which budget apps work outside the United States?",
                            es: "¿Qué apps de presupuesto funcionan fuera de Estados Unidos?",
                        }),
                    },
                    COST_FAQ,
                ],
                lead: t({
                    en: "A budget app sets how much you plan to spend and tracks what you actually spend against it. Eight follow, each best for a different way to budget: Actual Budget, EveryDollar, Goodbudget, Monarch Money, Outlayr, PocketGuard, Spendee, and YNAB. Outlayr is ours; the other seven are not.",
                    es: "Una app de presupuesto define cuánto planeas gastar y sigue lo que de verdad gastas contra ese plan. Aquí van ocho, cada una mejor para una forma distinta de presupuestar: Actual Budget, EveryDollar, Goodbudget, Monarch Money, Outlayr, PocketGuard, Spendee y YNAB. Outlayr es nuestra; las otras siete no.",
                }),
                meta: {
                    description: t({
                        en: "Eight budget apps by how they budget: envelopes, zero-based, or a limit with a pace. Price, platforms, entries, and currencies, checked October 2026.",
                        es: "Ocho apps de presupuesto por estilo: sobres, base cero o un límite con ritmo. Precio, plataformas, registros y monedas, revisados en octubre de 2026.",
                    }),
                    title: t({
                        en: "Best Budget Apps, Compared (2026) · Outlayr",
                        es: "Mejores apps de presupuesto, comparadas (2026) · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "Envelopes. You split your money into envelopes, one per category, and spend only what is in each. When one is empty, that spending stops until you refill it. Actual Budget and Goodbudget are built on envelopes, and PocketGuard offers them too.",
                                es: "Sobres. Divides tu dinero en sobres, uno por categoría, y gastas solo lo que hay en cada uno. Cuando uno se vacía, ese gasto se detiene hasta que lo vuelvas a llenar. Actual Budget y Goodbudget funcionan con sobres, y PocketGuard también los ofrece.",
                            }),
                            t({
                                en: "Zero-based. Before the month starts, you give every unit of income a job until nothing is left to assign. EveryDollar is a zero-based monthly budget, and PocketGuard offers it too. YNAB works the same way in its own words: you decide what your money is for before you spend it.",
                                es: "Base cero. Antes de que empiece el mes, le das un trabajo a cada unidad de tu ingreso hasta que no queda nada por asignar. EveryDollar es un presupuesto mensual de base cero, y PocketGuard también lo ofrece. YNAB funciona igual, en sus propias palabras: decides para qué es tu dinero antes de gastarlo.",
                            }),
                            t({
                                en: "A limit with a pace. You set a limit per category, or one for the month, and log as you go. The app tells you what is left and where your pace ends. Outlayr works this way, carries over what you did not spend, and says how far short this pace ends or the day the money ran out.",
                                es: "Un límite con ritmo. Pones un límite por categoría, o uno para el mes, y registras sobre la marcha. La app te dice cuánto queda y a dónde te lleva tu ritmo. Outlayr funciona así, acumula lo que no gastaste y te dice cuánto te va a faltar a este ritmo o el día en que se acabó el dinero.",
                            }),
                            t({
                                en: "If you want to plan every dollar ahead, start zero-based. If you want to stop overspending in a few categories without planning the whole month, a limit with a pace takes less upkeep. Envelopes suit people who think in cash, even when they pay by card.",
                                es: "Si quieres planear cada peso por adelantado, empieza con base cero. Si quieres dejar de pasarte en unas pocas categorías sin planear todo el mes, un límite con ritmo pide menos trabajo. Los sobres son para quien piensa en efectivo, aunque pague con tarjeta.",
                            }),
                        ],
                        id: "kinds",
                        title: t({
                            en: "Which kind of budget app fits you",
                            es: "Qué tipo de app de presupuesto te conviene",
                        }),
                    },
                ],
                picked: [
                    t({
                        en: "Each app here plans what you will spend, not only what you spent, and each one fits a different way to budget, from envelopes to zero-based to a limit with a pace. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista planea lo que vas a gastar, no solo lo que ya gastaste, y cada una sirve para una forma distinta de presupuestar, de los sobres a la base cero o a un límite con ritmo. Van en orden alfabético, no por puesto.",
                    }),
                    LIST_PICKED_FACTS,
                    LIST_PICKED_OURS,
                ],
                related: [
                    "/guides/budget-planner",
                    "/guides/ynab-alternatives",
                    "/compare/goodbudget",
                ] satisfies PageRef[],
                sources: LIST_SOURCES,
                title: t({
                    en: "The best budget apps, by how you budget",
                    es: "Las mejores apps de presupuesto, según cómo presupuestas",
                }),
            },
            "best-budget-apps-canada": {
                apps: [
                    {
                        ...ACTUAL,
                        facts: [
                            ...ACTUAL.facts,
                            {
                                label: LABELS.canada,
                                source: "https://actualbudget.org/docs/advanced/bank-sync/",
                                text: t({
                                    en: "Bank sync through SimpleFIN Bridge, which covers North American banks, set up on your own server",
                                    es: "Sincronización bancaria con SimpleFIN Bridge, que cubre bancos de Norteamérica, configurada en tu propio servidor",
                                }),
                            },
                        ],
                    },
                    {
                        ...GOODBUDGET,
                        facts: [
                            ...GOODBUDGET.facts,
                            {
                                label: LABELS.canada,
                                source: "https://goodbudget.com/help/using-accounts/import/",
                                text: t({
                                    en: "Bank sync is for US banks, so Canadian accounts go in by hand or from a QFX, OFX, or CSV file",
                                    es: "La sincronización es para bancos de EE. UU., así que las cuentas canadienses entran a mano o desde un archivo QFX, OFX o CSV",
                                }),
                            },
                        ],
                    },
                    {
                        ...MONARCH,
                        facts: [
                            ...MONARCH.facts,
                            {
                                label: LABELS.canada,
                                source: "https://www.monarch.com/canada",
                                text: t({
                                    en: "Available, billed in US dollars, with a 7-day trial to check that your banks connect",
                                    es: "Disponible, con cobro en dólares estadounidenses y una prueba de 7 días para comprobar que tus bancos conectan",
                                }),
                            },
                        ],
                    },
                    {
                        facts: [
                            ...OUTLAYR_FACTS,
                            {
                                label: LABELS.canada,
                                text: t({
                                    en: "Set CAD as your main currency. Entries are typed, said, scanned, or imported from your bank's CSV, with no bank login",
                                    es: "Pon CAD como moneda principal. Los registros se escriben, se dictan, se escanean o se importan del CSV de tu banco, sin iniciar sesión en el banco",
                                }),
                            },
                            { label: LABELS.watch, text: OUTLAYR_WATCH },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t(OUTLAYR_LEAD),
                    },
                    {
                        ...POCKETGUARD,
                        facts: [
                            ...POCKETGUARD.facts,
                            {
                                label: LABELS.canada,
                                source: "https://pocketguard.com/help/what-countries-does-pocketguard-support/",
                                text: t({
                                    en: "Supports bank accounts and cards from Canada",
                                    es: "Admite cuentas bancarias y tarjetas de Canadá",
                                }),
                            },
                        ],
                    },
                    {
                        ...SPENDEE,
                        facts: [
                            ...SPENDEE.facts,
                            {
                                label: LABELS.canada,
                                source: "https://help.spendee.com/article/231-how-to-setchange-the-currency-and-exchange-rate",
                                text: t({
                                    en: "A wallet can be in CAD. Bank sync is in Premium, so check that your bank is on its list first",
                                    es: "Una billetera puede estar en CAD. La sincronización bancaria es de Premium, así que revisa antes que tu banco esté en su lista",
                                }),
                            },
                        ],
                    },
                    {
                        ...YNAB,
                        facts: [
                            ...YNAB.facts,
                            {
                                label: LABELS.canada,
                                source: "https://www.ynab.com/pricing",
                                text: t({
                                    en: "Priced in US dollars. Direct Import covers select Canadian banks",
                                    es: "Con precio en dólares estadounidenses. Direct Import cubre algunos bancos canadienses",
                                }),
                            },
                        ],
                    },
                ],
                facts: [
                    {
                        label: "Actual Budget",
                        text: t({
                            en: "Best if you want free envelope budgeting on a computer and can run a server for bank sync",
                            es: "Ideal si quieres presupuestar por sobres gratis en la computadora y puedes montar un servidor para sincronizar el banco",
                        }),
                    },
                    {
                        label: "Goodbudget",
                        text: t({
                            en: "Best if you want envelopes on the web and both phones, starting free, without linking a bank",
                            es: "Ideal si quieres sobres en la web y en los dos celulares, empezando gratis, sin vincular un banco",
                        }),
                    },
                    {
                        label: "Monarch Money",
                        text: t({
                            en: "Best if you want budgets next to net worth from linked Canadian accounts, and can pay in US dollars",
                            es: "Ideal si quieres tus presupuestos junto a tu patrimonio desde cuentas canadienses vinculadas, y puedes pagar en dólares estadounidenses",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you want to budget in CAD without a bank login, logging a purchase in one sentence",
                            es: "Ideal si quieres presupuestar en CAD sin iniciar sesión en tu banco, registrando una compra en una oración",
                        }),
                    },
                    {
                        label: "PocketGuard",
                        text: t({
                            en: "Best if you want zero-based, envelope, or category budgets from linked Canadian accounts",
                            es: "Ideal si quieres presupuestos de base cero, por sobres o por categoría desde cuentas canadienses vinculadas",
                        }),
                    },
                    {
                        label: "Spendee",
                        text: t({
                            en: "Best if you want a free start with a CAD wallet and other currencies beside it",
                            es: "Ideal si quieres empezar gratis con una billetera en CAD y otras monedas al lado",
                        }),
                    },
                    {
                        label: "YNAB",
                        text: t({
                            en: "Best if you want to decide what each dollar is for before you spend it, and are fine paying in US dollars",
                            es: "Ideal si quieres decidir para qué es cada dólar antes de gastarlo y no te molesta pagar en dólares estadounidenses",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "The one that fits how you budget and whether you want to link a bank. To budget without a bank login, Goodbudget and Outlayr start free, and Actual Budget is free on a computer. To link Canadian accounts, Monarch and PocketGuard sync them, and YNAB imports from select Canadian banks.",
                            es: "La que coincide con cómo presupuestas y con si quieres vincular un banco. Para presupuestar sin iniciar sesión en el banco, Goodbudget y Outlayr empiezan gratis, y Actual Budget es gratis en la computadora. Para vincular cuentas canadienses, Monarch y PocketGuard las sincronizan, y YNAB importa desde algunos bancos canadienses.",
                        }),
                        question: t({
                            en: "What is the best budget app in Canada?",
                            es: "¿Cuál es la mejor app de presupuesto en Canadá?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Actual Budget is free software, with a server needed to sync. Goodbudget's free plan has 20 envelopes, 1 account, and 1 year of history. Spendee Basic has 1 wallet and 1 budget. Outlayr's free plan has 2 category budgets plus one for the month, and 3 accounts. Monarch, PocketGuard, and YNAB are paid after a trial.",
                            es: "Actual Budget es software gratis, con un servidor necesario para sincronizar. El plan gratis de Goodbudget tiene 20 sobres, 1 cuenta y 1 año de historial. Spendee Basic tiene 1 billetera y 1 presupuesto. El plan gratis de Outlayr tiene 2 presupuestos por categoría más uno para el mes, y 3 cuentas. Monarch, PocketGuard y YNAB son de pago después de una prueba.",
                        }),
                        question: t({
                            en: "Is there a free budget app in Canada?",
                            es: "¿Hay una app de presupuesto gratis en Canadá?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Goodbudget, Outlayr, Spendee, and YNAB all work by hand or from a file your bank exports, and Actual Budget does without its server. Monarch also takes manual accounts. None of them needs your RBC, TD, Scotiabank, BMO, or CIBC login to budget.",
                            es: "Sí. Goodbudget, Outlayr, Spendee y YNAB funcionan a mano o con un archivo que exporta tu banco, y Actual Budget también sin su servidor. Monarch también acepta cuentas manuales. Ninguna necesita tu usuario de RBC, TD, Scotiabank, BMO o CIBC para presupuestar.",
                        }),
                        question: t({
                            en: "Can I use a budget app without linking my bank?",
                            es: "¿Puedo usar una app de presupuesto sin vincular mi banco?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Copilot syncs only US financial institutions, and Rocket Money works with US banks. EveryDollar sells its mobile app and Premium in the US only. That is why none of them is on this list.",
                            es: "Copilot solo sincroniza instituciones financieras de EE. UU., y Rocket Money funciona con bancos de EE. UU. EveryDollar vende su app móvil y su Premium solo en EE. UU. Por eso ninguna está en esta lista.",
                        }),
                        question: t({
                            en: "Do Copilot, Rocket Money, and EveryDollar work in Canada?",
                            es: "¿Copilot, Rocket Money y EveryDollar funcionan en Canadá?",
                        }),
                    },
                    COST_FAQ,
                ],
                lead: t({
                    en: "Seven budget apps that work in Canada, each best for a different way to budget: Actual Budget, Goodbudget, Monarch Money, Outlayr, PocketGuard, Spendee, and YNAB. Most bill in US dollars and link Canadian banks unevenly, so each one says what it costs and whether it works without your bank login. Outlayr is ours; the other six are not.",
                    es: "Siete apps de presupuesto que funcionan en Canadá, cada una mejor para una forma distinta de presupuestar: Actual Budget, Goodbudget, Monarch Money, Outlayr, PocketGuard, Spendee y YNAB. La mayoría cobra en dólares estadounidenses y conecta bancos canadienses de forma desigual, así que cada una dice cuánto cuesta y si funciona sin tu usuario del banco. Outlayr es nuestra; las otras seis no.",
                }),
                meta: {
                    description: t({
                        en: "Seven budget apps that work in Canada, with price, free plan, and whether each needs your bank login. Budget in CAD, checked November 2026.",
                        es: "Siete apps de presupuesto que funcionan en Canadá, con precio, plan gratis y si cada una necesita tu usuario del banco. Presupuesto en CAD, revisado en noviembre de 2026.",
                    }),
                    title: t({
                        en: "Best Budget Apps in Canada (2026), With or Without Your Bank · Outlayr",
                        es: "Mejores apps de presupuesto en Canadá (2026), con o sin tu banco · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "Linking a bank pulls in transactions on their own, through a third-party connection that has to support your bank. Monarch asks Canadians to use its 7-day trial to check that their institutions connect reliably. If your bank is not covered, a linked app has little left to show.",
                                es: "Vincular un banco trae los movimientos solos, a través de una conexión de terceros que tiene que admitir tu banco. Monarch le pide a quien vive en Canadá usar su prueba de 7 días para comprobar que sus instituciones conectan bien. Si tu banco no está cubierto, a una app vinculada le queda poco que mostrar.",
                            }),
                            t({
                                en: "Without a link, you log purchases yourself or import the CSV your bank lets you download from online banking. It takes a minute a day, works with any bank or credit union, and no app holds your banking password.",
                                es: "Sin vincular, registras tú las compras o importas el CSV que tu banco te deja descargar desde la banca en línea. Toma un minuto al día, funciona con cualquier banco o cooperativa de crédito, y ninguna app guarda tu contraseña del banco.",
                            }),
                        ],
                        id: "bank-or-not",
                        title: t({
                            en: "Linking your bank, or not",
                            es: "Vincular tu banco, o no",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "Monarch, PocketGuard, and YNAB list their prices in US dollars, so what you pay in Canada moves with the exchange rate and your card's foreign transaction fee. When a plan is sold through the App Store or Google Play, the store charges in CAD.",
                                es: "Monarch, PocketGuard y YNAB publican sus precios en dólares estadounidenses, así que lo que pagas en Canadá cambia con la tasa y con la comisión por compras en el extranjero de tu tarjeta. Cuando un plan se vende por el App Store o Google Play, la tienda cobra en CAD.",
                            }),
                            t({
                                en: "Monarch adds accounts in different currencies as if they were one, so a US dollar account next to a CAD one gives misleading totals. Outlayr and Spendee keep each account in its own currency.",
                                es: "Monarch suma cuentas en monedas distintas como si fueran una, así que una cuenta en dólares estadounidenses junto a una en CAD da totales engañosos. Outlayr y Spendee mantienen cada cuenta en su propia moneda.",
                            }),
                        ],
                        id: "cad",
                        title: t({ en: "Paying and budgeting in CAD", es: "Pagar y presupuestar en CAD" }),
                    },
                ],
                picked: [
                    t({
                        en: "Each app here plans what you will spend, works for someone living in Canada, and fits a different way to budget. Copilot, EveryDollar, and Rocket Money are left out because they are built for the US. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista planea lo que vas a gastar, sirve para quien vive en Canadá y encaja con una forma distinta de presupuestar. Copilot, EveryDollar y Rocket Money quedan fuera porque están hechas para EE. UU. Van en orden alfabético, no por puesto.",
                    }),
                    LIST_PICKED_FACTS,
                    LIST_PICKED_OURS,
                ],
                plateAlt: t({
                    en: "A November budget in Canadian dollars with no bank linked: $1,284.60 left, Groceries $412 of $600, Transit $128 of $156, Eating out over at $171 of $150.",
                    es: "Un presupuesto de noviembre en dólares canadienses sin banco vinculado: quedan $1,284.60, Supermercado $412 de $600, Transporte $128 de $156, Comer fuera pasado con $171 de $150.",
                }),
                related: ["/guides/best-budget-apps", "/guides/budget-planner", "/compare/monarch"] satisfies PageRef[],
                sources: LIST_SOURCES,
                title: t({
                    en: "The best budget apps in Canada, with or without your bank",
                    es: "Las mejores apps de presupuesto en Canadá, con o sin tu banco",
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
                                source: "https://apps.apple.com/us/app/money-manager-remove-ads/id564730202",
                                text: t({
                                    en: "Free version. The full iPhone app is $5.99 once on the US App Store, not a subscription",
                                    es: "Versión gratis. La app completa para iPhone cuesta US$5.99 en un solo pago en el App Store de EE. UU., sin suscripción",
                                }),
                            },
                            {
                                label: t({ en: "Free plan", es: "Plan gratis" }),
                                source: "https://apps.apple.com/us/app/money-manager-expense-budget/id560481810",
                                text: t({
                                    en: "Up to 10 accounts on iPhone",
                                    es: "Hasta 10 cuentas en iPhone",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree",
                                text: t({
                                    en: "By hand, with backups and restores through Excel files",
                                    es: "A mano, con copias de seguridad y restauración en archivos de Excel",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://apps.apple.com/mx/app/id560481810",
                                text: t({
                                    en: "Several at once, and you can update the exchange rate over the internet",
                                    es: "Varias a la vez, y puedes actualizar la tasa de cambio por internet",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.realbyteapps.com/",
                                text: t({ en: "iPhone, Android", es: "iPhone, Android" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/mx/app/id560481810",
                                text: t({
                                    en: "Syncing your data is a subscription, at $2.49 a month or $19.99 a year",
                                    es: "Sincronizar tus datos es una suscripción, de US$2.49 al mes o US$19.99 al año",
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
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/us/app/subscription-tracker-outlayr/id6801652978",
                                text: OUTLAYR.price,
                            },
                            { label: LABELS.entries, text: OUTLAYR.entries },
                            {
                                label: LABELS.currencies,
                                source: "https://github.com/danestves/outlayr/blob/main/packages/money/src/catalog.generated.ts",
                                text: OUTLAYR.currencies,
                            },
                            { label: LABELS.platforms, text: OUTLAYR.platforms },
                            {
                                label: t({ en: "Free plan", es: "Plan gratis" }),
                                source: "https://github.com/danestves/outlayr/blob/main/apps/native/src/domain/pro-limits.ts",
                                text: t({
                                    en: "3 accounts, 2 category budgets, and accounts in one currency",
                                    es: "3 cuentas, 2 presupuestos por categoría y cuentas en una moneda",
                                }),
                            },
                            {
                                label: t({ en: "Bank notifications", es: "Notificaciones del banco" }),
                                source: t({
                                    en: "https://tryoutlayr.com/blog/reading-bank-notifications-with-ai",
                                    es: "https://tryoutlayr.com/es/blog/reading-bank-notifications-with-ai",
                                }),
                                text: t({
                                    en: "Logged through a Shortcuts automation on iPhone or notification access on Android, 30 a month for free. A regex parser once filed a $22.99 SiteGround charge under Groceries, so with Smart fill on, notifications that show an amount now go to Anthropic",
                                    es: "Se registran con una automatización de Atajos en iPhone o con el acceso a notificaciones en Android, 30 al mes gratis. Un lector con expresiones regulares registró un cargo de SiteGround de US$22.99 en Supermercado, así que con el autocompletado activo, las notificaciones con un monto ahora van a Anthropic",
                                }),
                            },
                            {
                                label: t({ en: "Moving in", es: "Si vienes de otra app" }),
                                source: "https://github.com/danestves/outlayr/blob/main/apps/native/src/domain/money-manager/archive.ts",
                                text: t({
                                    en: "CSV files and .mmbackup files from Orange Dog's Money Manager, both read on the phone. Backups from Realbyte's Money Manager, the one on this page, are not supported. Free plan limits still apply",
                                    es: "Archivos CSV y archivos .mmbackup del Money Manager de Orange Dog, ambos leídos en el celular. Las copias del Money Manager de Realbyte, el de esta página, no son compatibles. Los límites del plan gratis siguen aplicando",
                                }),
                            },
                            {
                                label: t({ en: "What leaves the phone", es: "Qué sale del celular" }),
                                source: t({
                                    en: "https://tryoutlayr.com/privacy",
                                    es: "https://tryoutlayr.com/es/privacy",
                                }),
                                text: t({
                                    en: "Without an account, your entries, amounts, and notes stay on the phone. Usage analytics go to PostHog, on by default outside the EEA and UK, and you can turn them off",
                                    es: "Sin una cuenta, tus registros, montos y notas se quedan en el celular. Las analíticas de uso van a PostHog, activas por defecto fuera del EEE y el Reino Unido, y puedes apagarlas",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://github.com/danestves/outlayr/blob/main/packages/backend/confect/lib/captures.ts",
                                text: t({
                                    en: "It does not connect to your bank. Voice entry and receipt scans need an account and a connection, with 20 captures every 30 days on the free plan",
                                    es: "No se conecta con tu banco. Dictar y escanear recibos requiere una cuenta y conexión, con 20 capturas cada 30 días en el plan gratis",
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
                                source: "https://apps.apple.com/us/app/wallet-daily-budget-profit/id1032467659",
                                text: t({
                                    en: "Free tier. The US App Store lists Premium from $5.99 up to $49.99 for lifetime",
                                    es: "Plan gratis. El App Store de EE. UU. muestra Premium desde US$5.99 hasta US$49.99 de por vida",
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
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "Bank sync needs Premium, and the free tier is for tracking by hand",
                                    es: "La sincronización bancaria requiere Premium, y el plan gratis es para registrar a mano",
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
                            en: "Best if you want double-entry accounts for cards, savings, and loans, with the full version paid once",
                            es: "Ideal si quieres contabilidad de doble entrada para tarjetas, ahorros y préstamos, con la versión completa en un solo pago",
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
                            en: "It depends on how you want to log. Monefy logs a purchase in two taps. Money Manager keeps double-entry accounts, up to 10 on its free iPhone version. Spendee and Wallet by BudgetBakers start free and sync bank accounts in Premium. Outlayr logs by sentence, voice, or receipt on its free plan. YNAB is paid after a 34-day trial.",
                            es: "Depende de cómo quieras registrar. Monefy registra una compra en dos toques. Money Manager lleva contabilidad de doble entrada, con hasta 10 cuentas en su versión gratis para iPhone. Spendee y Wallet by BudgetBakers empiezan gratis y sincronizan cuentas de banco en Premium. Outlayr registra con una oración, tu voz o un recibo en su plan gratis. YNAB es de pago después de una prueba de 34 días.",
                        }),
                        question: t({
                            en: "What is the best free expense tracker app?",
                            es: "¿Cuál es la mejor app gratis para controlar gastos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Monefy supports 150+ currencies, Wallet by BudgetBakers converts at real-time rates, and Spendee supports several. Money Manager uses several at once and lets you update the rate over the internet, and YNAB uses one currency per spending plan. Outlayr has 165 and converts each purchase at the rate from its day. Its free plan holds accounts in one currency.",
                            es: "Monefy admite más de 150 monedas, Wallet by BudgetBakers convierte con tasas en tiempo real y Spendee admite varias. Money Manager usa varias a la vez y te deja actualizar la tasa por internet, y YNAB usa una moneda por plan de gastos. Outlayr tiene 165 y convierte cada compra con la tasa de su día. Su plan gratis permite cuentas en una moneda.",
                        }),
                        question: t({
                            en: "Which expense tracker handles more than one currency?",
                            es: "¿Qué app para controlar gastos maneja varias monedas?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Outlayr has no bank connection. It logs what you type, say, or scan, your CSV files, and on iPhone and Android the purchase notifications you turn on. If you want your bank's transactions pulled in for you, Spendee and Wallet by BudgetBakers do it in Premium, and YNAB imports from select US, Canadian, UK, and EU banks.",
                            es: "No. Outlayr no tiene conexión con bancos. Registra lo que escribes, dices o escaneas, tus archivos CSV y, en iPhone y Android, las notificaciones de compra que actives. Si quieres que los movimientos de tu banco entren solos, Spendee y Wallet by BudgetBakers lo hacen en Premium, y YNAB importa desde algunos bancos de EE. UU., Canadá, Reino Unido y la UE.",
                        }),
                        question: t({
                            en: "Does Outlayr connect to my bank?",
                            es: "¿Outlayr se conecta con mi banco?",
                        }),
                    },
                    COST_FAQ,
                    {
                        answer: t({
                            en: "Yes. The app and this site are in English and Latin American Spanish, and the app is also in Spain's Spanish, in Portuguese from Brazil and from Portugal, and in French.",
                            es: "Sí. La app y este sitio están en inglés y en español de Latinoamérica, y la app también está en español de España, en portugués de Brasil y de Portugal, y en francés.",
                        }),
                        question: t({ en: "Is Outlayr in Spanish?", es: "¿Outlayr está en español?" }),
                    },
                ],
                lead: t({
                    en: "Six expense trackers, each best for a different need: Monefy, Money Manager, Outlayr, Spendee, Wallet by BudgetBakers, and YNAB. All but YNAB are free to start. Outlayr is ours, and its code is public, so you can check what we say about it.",
                    es: "Seis apps para controlar gastos, cada una mejor para algo distinto: Monefy, Money Manager, Outlayr, Spendee, Wallet by BudgetBakers y YNAB. Todas menos YNAB son gratis para empezar. Outlayr es nuestra y su código es público, así que puedes comprobar lo que decimos de ella.",
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
                        en: "Every detail about the other apps was read on that app's own site or store listing on the date below the table, and links to the page it came from, so you can repeat the check. These are the facts as each app states them, not results of our own testing.",
                        es: "Cada dato de las otras apps se leyó en el sitio o en la ficha de la tienda de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió, para que puedas repetir la revisión. Son los datos tal como los da cada app, no resultados de pruebas nuestras.",
                    }),
                    t({
                        en: "Outlayr is ours. It gets the same facts as the others, including its own Watch out for row, and its limits link to the code, policy, or post behind them.",
                        es: "Outlayr es nuestra. Tiene los mismos datos que las demás, incluida su propia fila de Ten en cuenta, y sus límites enlazan al código, la política o la publicación que los respalda.",
                    }),
                ],
                related: [
                    "/guides/voice-expense-tracker",
                    "/guides/best-expense-tracker-apps-latin-america",
                    "/guides/best-open-source-expense-tracker-apps",
                ] satisfies PageRef[],
                sources: t({
                    en: "Each detail about the other apps links to the page it was read on",
                    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
                }),
                title: t({
                    en: "The best expense tracker apps, by what you need",
                    es: "La mejor app para controlar gastos, según lo que necesitas",
                }),
            },
            "best-expense-tracker-apps-latin-america": {
                apps: [
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://finyapp.io/",
                                text: t({
                                    en: "Free, with ads. Plus is $24.99 a year and Pro $39.99 a year, and new users get 14 days of Pro free",
                                    es: "Gratis, con publicidad. Plus cuesta US$24.99 al año y Pro US$39.99 al año, y los usuarios nuevos reciben 14 días de Pro gratis",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://finyapp.io/",
                                text: t({
                                    en: "By voice, photo, or chat, or by hand without a connection. Mercado Pago payments sync on their own in Argentina, Brazil, Mexico, Colombia, Chile, Peru, and Uruguay",
                                    es: "Con tu voz, una foto o el chat, o a mano sin conexión. Los pagos de Mercado Pago se sincronizan solos en Argentina, Brasil, México, Colombia, Chile, Perú y Uruguay",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://finyapp.io/",
                                text: t({
                                    en: "40+, including USD, EUR, MXN, ARS, and BRL",
                                    es: "Más de 40, entre ellas USD, EUR, MXN, ARS y BRL",
                                }),
                            },
                            {
                                label: LATAM.cuotas,
                                source: "https://finyapp.io/",
                                text: t({
                                    en: "Detects payments in cuotas and splits them automatically. Its site shows a payment of 180,000 in 3 cuotas logged as 3 cuotas of 60,000",
                                    es: "Detecta los pagos a cuotas y los divide automáticamente. Su sitio muestra un pago de 180.000 en 3 cuotas registrado como 3 cuotas de 60.000",
                                }),
                            },
                            {
                                label: LATAM.spanish,
                                source: "https://apps.apple.com/ar/app/id6760370721",
                                text: t({
                                    en: "Its site and App Store description are in Spanish, and it is listed in the Argentina and Mexico App Stores",
                                    es: "Su sitio y su descripción en el App Store están en español, y aparece en el App Store de Argentina y de México",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://finyapp.io/",
                                text: t({ en: "iPhone and Android", es: "iPhone y Android" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://finyapp.io/",
                                text: t({
                                    en: "The free plan shows ads and includes 100 transactions a month, 10 AI queries, and 2 scans",
                                    es: "El plan gratis muestra publicidad e incluye 100 transacciones por mes, 10 consultas a la IA y 2 escaneos",
                                }),
                            },
                        ],
                        name: "Finy",
                        slug: "finy",
                        summary: t({
                            en: "Finy is a personal finance app in Spanish for iPhone and Android that logs expenses by voice, photo, or chat.",
                            es: "Finy es una app de finanzas personales en español para iPhone y Android que registra gastos con tu voz, una foto o el chat.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/mx/app/mobills-budget-planner/id921838244",
                                text: t({
                                    en: "Free, with some limits. Premium is a subscription bought inside the app, priced in the store",
                                    es: "Gratis, con algunas limitaciones. Premium es una suscripción que compras dentro de la app, con precio en la tienda",
                                }),
                            },
                            {
                                label: LABELS.focus,
                                source: "https://apps.apple.com/mx/app/mobills-budget-planner/id921838244",
                                text: t({
                                    en: "Accounts, credit cards with their limit and amount due, budgets and goals by category, and alerts for bills to pay",
                                    es: "Cuentas, tarjetas de crédito con su límite y el monto a pagar, presupuestos y metas por categoría, y avisos de las cuentas por pagar",
                                }),
                            },
                            {
                                label: LATAM.spanish,
                                source: "https://apps.apple.com/ar/app/id921838244",
                                text: LISTED_IN_SPANISH,
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.mobills.com.br/",
                                text: t({ en: "iPhone, Android, web", es: "iPhone, Android, web" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.mobills.com.br/",
                                text: t({
                                    en: "Its website is in Brazilian Portuguese",
                                    es: "Su sitio web está en portugués de Brasil",
                                }),
                            },
                        ],
                        name: "Mobills",
                        slug: "mobills",
                        summary: t({
                            en: "Mobills is a Brazilian personal finance app for accounts, credit cards, budgets, and goals, with its app in Spanish.",
                            es: "Mobills es una app brasileña de finanzas personales para cuentas, tarjetas de crédito, presupuestos y metas, con su app en español.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "Free core app. An optional upgrade adds unlimited accounts, recurring transactions, and advanced filters",
                                    es: "La app básica es gratis. Una mejora opcional agrega cuentas ilimitadas, movimientos recurrentes y filtros avanzados",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://www.monefy.com/faq/",
                                text: t({
                                    en: "150+. You type each exchange rate in the settings, and with no rate set it counts 1 to 1",
                                    es: "Más de 150. Tú escribes cada tasa de cambio en los ajustes, y sin tasa cuenta 1 a 1",
                                }),
                            },
                            {
                                label: LATAM.cash,
                                source: "https://www.monefy.com/faq/",
                                text: t({
                                    en: "Cash, cards, and banks as separate accounts",
                                    es: "Efectivo, tarjetas y bancos como cuentas separadas",
                                }),
                            },
                            {
                                label: LATAM.spanish,
                                source: "https://apps.apple.com/ar/app/id1212024409",
                                text: LISTED_IN_SPANISH,
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
                        summary: t(RIVALS.monefy),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/mx/app/id560481810",
                                text: t({
                                    en: "Free, with in-app purchases. Its Data Sync Service is a subscription at $2.49 a month or $19.99 a year",
                                    es: "Gratis, con compras dentro de la app. Su servicio de sincronización de datos es una suscripción de US$2.49 al mes o US$19.99 al año",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://apps.apple.com/mx/app/id560481810",
                                text: t({
                                    en: "Several at once, and you can update the exchange rate over the internet",
                                    es: "Varias a la vez, y puedes actualizar la tasa de cambio por internet",
                                }),
                            },
                            {
                                label: LATAM.cards,
                                source: "https://apps.apple.com/mx/app/id560481810",
                                text: t({
                                    en: "Credit and debit cards. Enter the payment day and it shows the payment amount and the balance left",
                                    es: "Tarjetas de crédito y débito. Con el día de pago, muestra el monto a pagar y el saldo restante",
                                }),
                            },
                            {
                                label: LATAM.spanish,
                                source: "https://apps.apple.com/ar/app/id560481810",
                                text: LISTED_IN_SPANISH,
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.realbyteapps.com/",
                                text: t({ en: "iPhone, Android", es: "iPhone, Android" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/mx/app/id560481810",
                                text: t({
                                    en: "In the App Store in Spanish it is listed as Registro Contable: Gastos",
                                    es: "En el App Store en español aparece como Registro Contable: Gastos",
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
                            {
                                label: LATAM.cuotas,
                                text: t({
                                    en: "Splits a purchase into cuotas: what you pay now, then each payment on its own date, with a reminder the day before it is due. Installment apps such as Kueski Pay and Aplazo in Mexico are in its list",
                                    es: "Divide una compra en cuotas: lo que pagas hoy y cada pago con su fecha, con un aviso el día antes de cada uno. Las apps de cuotas como Kueski Pay y Aplazo en México están en su lista",
                                }),
                            },
                            {
                                label: LATAM.cash,
                                text: t({
                                    en: "Accounts for cash, cards, savings, and debts. Pro lets each one keep its own currency",
                                    es: "Cuentas para efectivo, tarjetas, ahorros y deudas. Con Pro, cada una puede tener su propia moneda",
                                }),
                            },
                            { label: LABELS.free, text: OUTLAYR_FREE },
                            { label: LATAM.spanish, text: LISTED_IN_SPANISH },
                            { label: LABELS.platforms, text: OUTLAYR.platforms },
                            { label: LABELS.watch, text: OUTLAYR_WATCH },
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
                                    en: "Free Basic plan. Plus $1.99 a month or $14.99 a year, Premium $5.99 a month or $35.99 a year, after a 7-day trial. Prices vary by country",
                                    es: "Plan Basic gratis. Plus US$1.99 al mes o US$14.99 al año, Premium US$5.99 al mes o US$35.99 al año, después de una prueba de 7 días. Los precios cambian según el país",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://help.spendee.com/article/231-how-to-setchange-the-currency-and-exchange-rate",
                                text: t({
                                    en: "A currency per wallet, with your own exchange rate per transaction",
                                    es: "Una moneda por billetera, con tu propia tasa de cambio por movimiento",
                                }),
                            },
                            {
                                label: LATAM.cash,
                                source: "https://www.spendee.com/pricing",
                                text: t({
                                    en: "Cash wallets: 1 on the free plan, unlimited on Plus and Premium",
                                    es: "Billeteras de efectivo: 1 en el plan gratis, ilimitadas en Plus y Premium",
                                }),
                            },
                            {
                                label: LATAM.spanish,
                                source: "https://apps.apple.com/ar/app/id635861140",
                                text: LISTED_IN_SPANISH,
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.spendee.com/pricing",
                                text: t({
                                    en: "iPhone, Android, web. Budgets are on the phone only for now",
                                    es: "iPhone, Android, web. Por ahora los presupuestos solo están en el celular",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://help.spendee.com/article/231-how-to-setchange-the-currency-and-exchange-rate",
                                text: t({
                                    en: "A wallet's currency cannot change once it has transactions",
                                    es: "La moneda de una billetera no se puede cambiar cuando ya tiene movimientos",
                                }),
                            },
                        ],
                        name: "Spendee",
                        slug: "spendee",
                        summary: t({
                            en: "Spendee is a budget app with a wallet for each currency, cash wallets, and shared wallets in its paid plans.",
                            es: "Spendee es una app de presupuesto con una billetera por moneda, billeteras de efectivo y billeteras compartidas en sus planes de pago.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "Free tier for tracking by hand. Premium comes as a subscription or as a one-time Lifetime plan",
                                    es: "Plan gratis para registrar a mano. Premium es una suscripción o un plan de por vida de pago único",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "By hand on the free tier. Bank sync in Premium",
                                    es: "A mano en el plan gratis. Sincronización bancaria en Premium",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "Several, with exchange rates calculated in real time",
                                    es: "Varias, con tasas de cambio calculadas en tiempo real",
                                }),
                            },
                            {
                                label: LATAM.cash,
                                source: "https://apps.apple.com/ar/app/id1032467659",
                                text: t({
                                    en: "Cash, credit and debit cards, and debts",
                                    es: "Efectivo, tarjetas de crédito y débito, y deudas",
                                }),
                            },
                            {
                                label: LATAM.spanish,
                                source: "https://apps.apple.com/ar/app/id1032467659",
                                text: LISTED_IN_SPANISH,
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({ en: "iPhone, Android, web", es: "iPhone, Android, web" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "Bank sync needs Premium",
                                    es: "La sincronización bancaria requiere Premium",
                                }),
                            },
                        ],
                        name: "Wallet by BudgetBakers",
                        slug: "wallet",
                        summary: t(RIVALS.wallet),
                    },
                ],
                facts: [
                    {
                        label: "Finy",
                        text: t({
                            en: "Best if you log by voice, photo, or chat, and want Mercado Pago payments to sync on their own",
                            es: "Ideal si registras con tu voz, una foto o el chat, y quieres que tus pagos de Mercado Pago se sincronicen solos",
                        }),
                    },
                    {
                        label: "Mobills",
                        text: t({
                            en: "Best if you want an app in Spanish that keeps each credit card's limit and amount due next to budgets and goals",
                            es: "Ideal si quieres una app en español que lleve el límite y el monto a pagar de cada tarjeta de crédito junto con presupuestos y metas",
                        }),
                    },
                    {
                        label: "Monefy",
                        text: t({
                            en: "Best if you want to log in two taps and type the exchange rate yourself",
                            es: "Ideal si quieres registrar en dos toques y escribir tú la tasa de cambio",
                        }),
                    },
                    {
                        label: "Money Manager",
                        text: t({
                            en: "Best if you want credit and debit cards with a payment day, and several currencies at once",
                            es: "Ideal si quieres tarjetas de crédito y débito con su día de pago, y varias monedas a la vez",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you spend in pesos and dollars at the rate of each day, split purchases into cuotas, or want to log by sentence, voice, or receipt",
                            es: "Ideal si gastas en pesos y en dólares con la tasa de cada día, divides compras en cuotas o quieres registrar con una oración, tu voz o un recibo",
                        }),
                    },
                    {
                        label: "Spendee",
                        text: t({
                            en: "Best if you want a wallet per currency, with your own rate per transaction",
                            es: "Ideal si quieres una billetera por moneda, con tu propia tasa por movimiento",
                        }),
                    },
                    {
                        label: "Wallet by BudgetBakers",
                        text: t({
                            en: "Best if you want exchange rates in real time and bank sync in Premium",
                            es: "Ideal si quieres tasas de cambio en tiempo real y sincronización bancaria en Premium",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on how you spend. Finy logs by voice, photo, or chat and splits cuotas on its own. Mobills keeps credit cards with their limit and amount due. Monefy logs a purchase in two taps. Money Manager shows the payment amount and the balance left on a card. Spendee keeps a wallet per currency. Wallet by BudgetBakers converts at real-time rates. Outlayr logs by sentence, voice, or receipt and splits purchases into cuotas. All seven are free to start, and all of them are listed in the App Store for Argentina and Mexico with a description in Spanish.",
                            es: "Depende de cómo gastes. Finy registra con tu voz, una foto o el chat, y divide las cuotas solo. Mobills lleva tus tarjetas de crédito con su límite y el monto a pagar. Monefy registra una compra en dos toques. Money Manager muestra el monto del pago y el saldo restante de una tarjeta. Spendee tiene una billetera por moneda. Wallet by BudgetBakers convierte con tasas en tiempo real. Outlayr registra con una oración, tu voz o un recibo, y divide las compras en cuotas. Las siete son gratis para empezar, y todas aparecen en el App Store de Argentina y de México con su descripción en español.",
                        }),
                        question: t({
                            en: "What is the best expense tracker app in Argentina or Mexico?",
                            es: "¿Cuál es la mejor app para controlar gastos en Argentina o México?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Finy supports 40+ currencies, including ARS, MXN, and USD. Monefy supports 150+ and you type each exchange rate. Money Manager uses several at once and lets you update the rate over the internet. Spendee gives each wallet a currency, with your own rate per transaction. Wallet by BudgetBakers converts at real-time rates. The Mobills listing does not describe using more than one currency. Outlayr has 165 and converts each purchase at the rate from its day. Its free plan holds accounts in one currency.",
                            es: "Finy admite más de 40 monedas, entre ellas ARS, MXN y USD. Monefy admite más de 150 y tú escribes cada tasa de cambio. Money Manager usa varias a la vez y te deja actualizar la tasa por internet. Spendee le da una moneda a cada billetera, con tu propia tasa por movimiento. Wallet by BudgetBakers convierte con tasas en tiempo real. La ficha de Mobills no describe el uso de más de una moneda. Outlayr tiene 165 y convierte cada compra con la tasa de su día. Su plan gratis permite cuentas en una moneda.",
                        }),
                        question: t({
                            en: "Which expense tracker handles pesos and dollars together?",
                            es: "¿Qué app para controlar gastos lleva pesos y dólares juntos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Finy detects payments in cuotas and splits them automatically. Outlayr splits a purchase into cuotas, or meses sin intereses: what you pay now, then each payment on its own date, with a reminder the day before it is due. The pages we read for the other five do not describe splitting a purchase into cuotas. Mobills, Money Manager, and Wallet by BudgetBakers describe credit cards, so check how they handle yours.",
                            es: "Finy detecta los pagos a cuotas y los divide automáticamente. Outlayr divide una compra en cuotas, o en meses sin intereses: lo que pagas hoy y cada pago con su fecha, con un aviso el día antes. Las páginas de las otras cinco apps que revisamos no describen dividir una compra en cuotas. Mobills, Money Manager y Wallet by BudgetBakers describen tarjetas de crédito, así que revisa cómo manejan la tuya.",
                        }),
                        question: t({
                            en: "Which app handles cuotas or meses sin intereses?",
                            es: "¿Qué app maneja cuotas o meses sin intereses?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Monefy keeps cash as its own account, Spendee as a cash wallet, Wallet by BudgetBakers among the money it tracks, and Outlayr as an account in its own currency. The pages we read for Finy, Mobills, and Money Manager do not mention cash.",
                            es: "Monefy lleva el efectivo como una cuenta aparte, Spendee como una billetera de efectivo, Wallet by BudgetBakers entre el dinero que sigue y Outlayr como una cuenta en su propia moneda. Las páginas de Finy, Mobills y Money Manager que revisamos no mencionan el efectivo.",
                        }),
                        question: t({
                            en: "Which expense tracker works if I pay in cash?",
                            es: "¿Qué app para controlar gastos sirve si pago en efectivo?",
                        }),
                    },
                    COST_FAQ,
                    RATE_FAQ,
                    {
                        answer: t({
                            en: "Yes. Outlayr is listed in the App Store for Argentina and for Mexico with a description in Spanish, and it is offered in 175 countries and regions. Your app store shows the price for your country.",
                            es: "Sí. Outlayr aparece en el App Store de Argentina y de México con su descripción en español, y se ofrece en 175 países y regiones. Tu tienda de apps muestra el precio de tu país.",
                        }),
                        question: t({
                            en: "Is Outlayr available in Argentina and Mexico?",
                            es: "¿Outlayr está disponible en Argentina y México?",
                        }),
                    },
                ],
                lead: t({
                    en: "Seven expense trackers for Argentina, Mexico, and the rest of Latin America, each best for a different need: Finy, Mobills, Monefy, Money Manager, Outlayr, Spendee, and Wallet by BudgetBakers. All seven are free to start. Outlayr is ours; the other six are not.",
                    es: "Siete apps para controlar gastos en Argentina, México y el resto de Latinoamérica, cada una mejor para algo distinto: Finy, Mobills, Monefy, Money Manager, Outlayr, Spendee y Wallet by BudgetBakers. Las siete son gratis para empezar. Outlayr es nuestra; las otras seis no.",
                }),
                meta: {
                    description: t({
                        en: "Seven expense tracker apps compared for Argentina and Mexico: pesos and dollars, cuotas, cash, and price. Outlayr is ours; the other six are not.",
                        es: "Compara 7 apps para controlar gastos en Argentina y México y elige tu gestor de gastos: pesos y dólares, cuotas, efectivo y precio. Outlayr es nuestra.",
                    }),
                    title: t({
                        en: "Best Expense Tracker Apps in Argentina and Mexico (2026) · Outlayr",
                        es: "Mejores apps para controlar gastos en Argentina y México (2026) · Outlayr",
                    }),
                },
                picked: [
                    t({
                        en: "Each app here has a Spanish description in the App Store for Argentina and Mexico, and each fits a different need, from logging in two taps to spending in pesos and dollars or splitting a purchase into cuotas. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista tiene su descripción en español en el App Store de Argentina y de México, y cada una sirve para algo distinto, desde registrar en dos toques hasta gastar en pesos y en dólares o dividir una compra en cuotas. Van en orden alfabético, no por puesto.",
                    }),
                    t({
                        en: "Every detail about the other apps was read on that app's own site, help center, or App Store listing on the date below the table, and links to the page it came from. These are the facts as each app states them, not results of our own testing. A feature a page does not mention is left out, not marked as missing.",
                        es: "Cada dato de las otras apps se leyó en el sitio, el centro de ayuda o la ficha del App Store de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió. Son los datos tal como los da cada app, no resultados de pruebas nuestras. Lo que una página no menciona se deja fuera, no se marca como faltante.",
                    }),
                    LIST_PICKED_OURS,
                ],
                related: [
                    "/guides/multi-currency-expense-tracker",
                    "/tools/installment-calculator",
                    "/tools/dolar-hoy-bolivia",
                ] satisfies PageRef[],
                sources: LIST_SOURCES,
                title: t({
                    en: "The best expense tracker apps in Argentina, Mexico, and the rest of Latin America",
                    es: "La mejor app para controlar gastos en Argentina, México y el resto de Latinoamérica",
                }),
            },
            "best-expense-tracker-apps-brazil": {
                apps: [
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://meudinheiroweb.com.br/pessoal/planos/",
                                text: t({
                                    en: "Básico is free for 12 months, with up to 100 entries a month. Pessoal, Plus, and Família are paid, and the plans page does not show their prices",
                                    es: "Básico es gratis por 12 meses, con hasta 100 registros al mes. Pessoal, Plus y Família son de pago, y la página de planes no muestra sus precios",
                                    pt: "O Básico é grátis por 12 meses, com até 100 lançamentos por mês. Pessoal, Plus e Família são pagos, e a página de planos não mostra os preços",
                                }),
                            },
                            {
                                label: BRAZIL.bank,
                                source: "https://www.meudinheiroweb.com.br/",
                                text: t({
                                    en: "Syncs your bank transactions through Open Finance",
                                    es: "Sincroniza tus movimientos bancarios por Open Finance",
                                    pt: "Sincroniza suas movimentações bancárias pelo Open Finance",
                                }),
                            },
                            {
                                label: BRAZIL.cards,
                                source: "https://meudinheiroweb.com.br/pessoal/planos/",
                                text: t({
                                    en: "Credit card control from the Pessoal plan up. Básico does not include it",
                                    es: "Control de tarjetas de crédito desde el plan Pessoal. Básico no lo incluye",
                                    pt: "Controle de cartão de crédito a partir do plano Pessoal. O Básico não inclui",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://meudinheiroweb.com.br/pessoal/planos/",
                                text: t({
                                    en: "Accounts in another currency: 1 on Plus, 3 on Família",
                                    es: "Cuentas en otra moneda: 1 en Plus, 3 en Família",
                                    pt: "Contas em outra moeda: 1 no Plus, 3 no Família",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.meudinheiroweb.com.br/",
                                text: t({
                                    en: "Web, with the Android and iPhone apps on every plan",
                                    es: "Web, con las apps de Android y iPhone en todos los planes",
                                    pt: "Web, com os apps de Android e iPhone em todos os planos",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.meudinheiroweb.com.br/",
                                text: t({
                                    en: "Plans do not renew on their own: you subscribe again to keep one, and Básico is free only for the first 12 months",
                                    es: "Los planes no se renuevan solos: vuelves a suscribirte para mantener uno, y Básico es gratis solo los primeros 12 meses",
                                    pt: "Os planos não renovam sozinhos: você assina de novo para manter um, e o Básico só é grátis nos primeiros 12 meses",
                                }),
                            },
                        ],
                        name: "Meu Dinheiro",
                        slug: "meu-dinheiro",
                        summary: t({
                            en: "Meu Dinheiro is a Brazilian money manager for the web, with Android and iPhone apps, for personal and business finances.",
                            es: "Meu Dinheiro es un gestor financiero brasileño para la web, con apps de Android y iPhone, para finanzas personales y de empresa.",
                            pt: "O Meu Dinheiro é um gestor financeiro brasileiro para a web, com apps de Android e iPhone, para finanças pessoais e da empresa.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/br/app/minhas-economias/id520869873",
                                text: t({
                                    en: "Free, with in-app purchases. Meu Clube Mensal is R$ 24,90, and the other Meu Clube options run from R$ 119,00 to R$ 199,90",
                                    es: "Gratis, con compras dentro de la app. Meu Clube Mensal cuesta R$ 24,90, y las otras opciones de Meu Clube van de R$ 119,00 a R$ 199,90",
                                    pt: "Grátis, com compras no app. O Meu Clube Mensal custa R$ 24,90, e as outras opções do Meu Clube vão de R$ 119,00 a R$ 199,90",
                                }),
                            },
                            {
                                label: BRAZIL.bank,
                                source: "https://www.minhaseconomias.com.br/",
                                text: t({
                                    en: "Connects accounts and cards through Open Finance, or you add them by hand",
                                    es: "Conecta cuentas y tarjetas por Open Finance, o las agregas a mano",
                                    pt: "Conecta contas e cartões pelo Open Finance, ou você cadastra à mão",
                                }),
                            },
                            {
                                label: LABELS.budgets,
                                source: "https://www.minhaseconomias.com.br/",
                                text: t({
                                    en: "Spending limits with alerts, and goals you follow in the app",
                                    es: "Límites de gasto con alertas, y metas que sigues en la app",
                                    pt: "Limites de gastos com alertas, e objetivos que você acompanha no app",
                                }),
                            },
                            {
                                label: LABELS.focus,
                                source: "https://www.minhaseconomias.com.br/",
                                text: t({
                                    en: "Categories, subcategories, tags, family members, and automatic rules",
                                    es: "Categorías, subcategorías, etiquetas, miembros de la familia y reglas automáticas",
                                    pt: "Categorias, subcategorias, tags, membros da família e regras automáticas",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.minhaseconomias.com.br/",
                                text: t({ en: "iPhone and Android", es: "iPhone y Android", pt: "iPhone e Android" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/br/app/minhas-economias/id520869873",
                                text: t({
                                    en: "The App Store lists the Meu Clube prices without saying how long each one lasts",
                                    es: "El App Store muestra los precios de Meu Clube sin decir cuánto dura cada uno",
                                    pt: "A App Store mostra os preços do Meu Clube sem dizer quanto tempo cada um dura",
                                }),
                            },
                        ],
                        name: "Minhas Economias",
                        slug: "minhas-economias",
                        summary: t({
                            en: "Minhas Economias is a Brazilian budget app that connects your accounts and cards through Open Finance and sets spending limits with alerts.",
                            es: "Minhas Economias es una app brasileña de presupuesto que conecta tus cuentas y tarjetas por Open Finance y pone límites de gasto con alertas.",
                            pt: "O Minhas Economias é um app brasileiro de orçamento que conecta suas contas e cartões pelo Open Finance e define limites de gastos com alertas.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.mobills.com.br/pricing/",
                                text: t({
                                    en: "Mobills Premium is R$ 99,90 a year, which the site puts at under R$ 8,40 a month",
                                    es: "Mobills Premium cuesta R$ 99,90 al año, que el sitio presenta como menos de R$ 8,40 al mes",
                                    pt: "O Mobills Premium custa R$ 99,90 por ano, menos de R$ 8,40 por mês, segundo o site",
                                }),
                            },
                            {
                                label: LABELS.free,
                                source: "https://apps.apple.com/br/app/id921838244",
                                text: t({
                                    en: "Free to download, with in-app purchases. The listing does not spell out the free version's limits",
                                    es: "Gratis para descargar, con compras dentro de la app. La ficha no detalla los límites de la versión gratis",
                                    pt: "Grátis para baixar, com compras no app. A página da loja não detalha os limites da versão grátis",
                                }),
                            },
                            {
                                label: BRAZIL.bank,
                                source: "https://apps.apple.com/br/app/id921838244",
                                text: t({
                                    en: "Automatic integrations with the main banks, in Premium",
                                    es: "Integraciones automáticas con los principales bancos, en Premium",
                                    pt: "Integrações automáticas com os principais bancos, no Premium",
                                }),
                            },
                            {
                                label: BRAZIL.cards,
                                source: "https://www.mobills.com.br/pricing/",
                                text: t({
                                    en: "All your credit cards in one place, in Premium",
                                    es: "Todas tus tarjetas de crédito en un solo lugar, en Premium",
                                    pt: "Todos os seus cartões de crédito em um só lugar, no Premium",
                                }),
                            },
                            {
                                label: LABELS.budgets,
                                source: "https://www.mobills.com.br/",
                                text: t({
                                    en: "Monthly budgets and goals",
                                    es: "Presupuestos mensuales y metas",
                                    pt: "Orçamentos mensais e objetivos",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.mobills.com.br/",
                                text: t({ en: "iPhone and Android", es: "iPhone y Android", pt: "iPhone e Android" }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/br/app/id921838244",
                                text: t({
                                    en: "Bank integrations need Premium",
                                    es: "Las integraciones bancarias requieren Premium",
                                    pt: "As integrações com bancos exigem o Premium",
                                }),
                            },
                        ],
                        name: "Mobills",
                        slug: "mobills",
                        summary: t({
                            en: "Mobills is a Brazilian personal finance app for accounts, credit cards, budgets, and goals, with bank integrations in Premium.",
                            es: "Mobills es una app brasileña de finanzas personales para cuentas, tarjetas de crédito, presupuestos y metas, con integraciones bancarias en Premium.",
                            pt: "O Mobills é um app brasileiro de finanças pessoais para contas, cartões de crédito, orçamentos e objetivos, com integrações bancárias no Premium.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/br/app/id1212024409",
                                text: t({
                                    en: "Free, with in-app purchases. Monefy Premium is listed at R$ 219,90 and R$ 299,90",
                                    es: "Gratis, con compras dentro de la app. Monefy Premium aparece a R$ 219,90 y R$ 299,90",
                                    pt: "Grátis, com compras no app. O Monefy Premium aparece por R$ 219,90 e R$ 299,90",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "By hand, any purchase in two taps",
                                    es: "A mano, cualquier compra en dos toques",
                                    pt: "À mão, qualquer compra em dois toques",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://www.monefy.com/",
                                text: t({ en: "150+", es: "Más de 150", pt: "Mais de 150" }),
                            },
                            {
                                label: BRAZIL.portuguese,
                                source: "https://apps.apple.com/br/app/id1212024409",
                                text: t({
                                    en: "Yes, Portuguese and 15 other languages",
                                    es: "Sí, portugués y 15 idiomas más",
                                    pt: "Sim, português e mais 15 idiomas",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "iPhone and Android, synced through Google Drive or Dropbox",
                                    es: "iPhone y Android, con sincronización por Google Drive o Dropbox",
                                    pt: "iPhone e Android, com sincronização pelo Google Drive ou Dropbox",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "Unlimited accounts and recurring transactions need the paid upgrade",
                                    es: "Las cuentas ilimitadas y los movimientos recurrentes requieren la mejora de pago",
                                    pt: "Contas ilimitadas e lançamentos recorrentes exigem a versão paga",
                                }),
                            },
                        ],
                        name: "Monefy",
                        slug: "monefy",
                        summary: t({
                            en: "Monefy is an expense tracker for iPhone and Android that records a purchase in two taps, free at its core, with an optional paid upgrade.",
                            es: "Monefy es una app para controlar gastos en iPhone y Android que registra una compra en dos toques, gratis en lo básico, con una mejora de pago opcional.",
                            pt: "O Monefy é um app de controle de gastos para iPhone e Android que registra uma compra em dois toques, grátis no básico, com uma versão paga opcional.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://www.organizze.com.br/planos/",
                                text: t({
                                    en: "Manual R$ 39 a month, or 12x R$ 29,90 billed yearly. Conectado R$ 49 a month or 12x R$ 39,90. Conectado Plus R$ 79 a month or 12x R$ 69,90. Manual has 7 days free",
                                    es: "Manual R$ 39 al mes, o 12x R$ 29,90 con cobro anual. Conectado R$ 49 al mes o 12x R$ 39,90. Conectado Plus R$ 79 al mes o 12x R$ 69,90. Manual tiene 7 días gratis",
                                    pt: "Manual R$ 39 por mês, ou 12x de R$ 29,90 cobrado anualmente. Conectado R$ 49 por mês ou 12x de R$ 39,90. Conectado Plus R$ 79 por mês ou 12x de R$ 69,90. O Manual tem 7 dias grátis",
                                }),
                            },
                            {
                                label: BRAZIL.bank,
                                source: "https://www.organizze.com.br/planos/",
                                text: t({
                                    en: "Conexão Bancária from the Conectado plan, with up to 3 connected accounts or cards. Conectado Plus allows 10, business accounts included",
                                    es: "Conexão Bancária desde el plan Conectado, con hasta 3 cuentas o tarjetas conectadas. Conectado Plus permite 10, cuentas de empresa incluidas",
                                    pt: "Conexão Bancária a partir do plano Conectado, com até 3 contas ou cartões conectados. O Conectado Plus permite 10, incluindo contas Pessoa Jurídica",
                                }),
                            },
                            {
                                label: BRAZIL.cards,
                                source: "https://apps.apple.com/br/app/id677699286",
                                text: t({
                                    en: "Fixed bills, expenses, and card statements in one place",
                                    es: "Cuentas fijas, gastos y resúmenes de tarjeta en un solo lugar",
                                    pt: "Contas fixas, despesas e faturas em um só lugar",
                                }),
                            },
                            {
                                label: BRAZIL.installments,
                                source: "https://apps.apple.com/br/app/id677699286",
                                text: t({
                                    en: "Fixed, installment, and recurring expenses",
                                    es: "Gastos fijos, en cuotas y recurrentes",
                                    pt: "Despesas fixas, parceladas e recorrentes",
                                }),
                            },
                            {
                                label: LABELS.budgets,
                                source: "https://apps.apple.com/br/app/id677699286",
                                text: t({
                                    en: "Limits per category, followed through the month",
                                    es: "Límites por categoría, con seguimiento durante el mes",
                                    pt: "Limites por categoria, acompanhados ao longo do mês",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.organizze.com.br/",
                                text: t({
                                    en: "Phone and computer, through the app and the browser",
                                    es: "Celular y computadora, con la app y el navegador",
                                    pt: "Celular e computador, pelo app e pelo navegador",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.organizze.com.br/planos/",
                                text: t({
                                    en: "Its plans page has no free plan: after the 7 day trial, every plan is paid, and bank connection starts at Conectado",
                                    es: "Su página de planes no tiene plan gratis: tras la prueba de 7 días, todos los planes son de pago, y la conexión bancaria empieza en Conectado",
                                    pt: "A página de planos não tem plano grátis: depois do teste de 7 dias, todos os planos são pagos, e a conexão bancária começa no Conectado",
                                }),
                            },
                        ],
                        name: "Organizze",
                        slug: "organizze",
                        summary: t({
                            en: "Organizze is a Brazilian personal finance app for phone and browser, with category limits and bank connection through Open Finance on its Conectado plans.",
                            es: "Organizze es una app brasileña de finanzas personales para celular y navegador, con límites por categoría y conexión bancaria por Open Finance en sus planes Conectado.",
                            pt: "O Organizze é um app brasileiro de finanças pessoais para celular e navegador, com limites por categoria e conexão bancária via Open Finance nos planos Conectado.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                text: t({
                                    en: "Free. Pro is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once in the US. Prices vary by country",
                                    es: "Gratis. Pro cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago en Estados Unidos. Los precios cambian según el país",
                                    pt: "Grátis. O Pro custa US$7.99 por mês, US$49.99 por ano com 7 dias grátis ou US$129.99 em pagamento único nos Estados Unidos. Os preços mudam conforme o país",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                text: t({
                                    en: "One sentence, voice, receipt scan, CSV import",
                                    es: "Una oración, voz, escaneo de recibos, importación de CSV",
                                    pt: "Uma frase, voz, escaneamento de recibos, importação de CSV",
                                }),
                            },
                            {
                                label: BRAZIL.bank,
                                text: t({
                                    en: "None. It does not connect to your bank. On Android it can log purchases from the notifications of apps you turn on, such as your bank's, up to 30 a month on the free plan",
                                    es: "No tiene. No se conecta a tu banco. En Android puede registrar compras desde las notificaciones de las apps que actives, como la de tu banco, hasta 30 al mes en el plan gratis",
                                    pt: "Não tem. Ele não se conecta ao seu banco. No Android, pode lançar compras a partir das notificações dos apps que você ativar, como o do seu banco, até 30 por mês no plano grátis",
                                }),
                            },
                            {
                                label: BRAZIL.installments,
                                text: t({
                                    en: "Splits a purchase into installments: what you pay now, then each payment on its own date, with a reminder the day before it is due",
                                    es: "Divide una compra en cuotas: lo que pagas hoy y cada pago con su fecha, con un aviso el día antes de cada uno",
                                    pt: "Divide uma compra em parcelas: o que você paga agora e cada parcela na sua data, com um aviso no dia anterior ao vencimento",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                text: t({
                                    en: "165, converted at the rate of the day",
                                    es: "165, convertidas con la tasa del día",
                                    pt: "165, convertidas pela cotação do dia",
                                }),
                            },
                            {
                                label: LABELS.free,
                                text: t({
                                    en: "3 accounts, 2 category budgets plus one for the month, 20 voice or receipt captures every 30 days, and accounts in one currency",
                                    es: "3 cuentas, 2 presupuestos por categoría más uno para el mes, 20 capturas de voz o de recibos cada 30 días y cuentas en una moneda",
                                    pt: "3 contas, 2 orçamentos por categoria mais um para o mês, 20 capturas por voz ou de recibos a cada 30 dias e contas em uma moeda",
                                }),
                            },
                            {
                                label: BRAZIL.portuguese,
                                text: t({
                                    en: "Yes, along with English, Spanish, and French",
                                    es: "Sí, además de inglés, español y francés",
                                    pt: "Sim, além de inglês, espanhol e francês",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                text: t({ en: "iPhone and Android", es: "iPhone y Android", pt: "iPhone e Android" }),
                            },
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "No bank sync, so every entry starts with you. Voice entry and receipt scans need an account and a connection, with 20 captures every 30 days on the free plan. There is no web app",
                                    es: "No sincroniza con el banco, así que cada registro empieza por ti. Dictar y escanear recibos requiere una cuenta y conexión, con 20 capturas cada 30 días en el plan gratis. No tiene app web",
                                    pt: "Não sincroniza com o banco, então cada lançamento começa por você. Lançar por voz e escanear recibos exige uma conta e conexão, com 20 capturas a cada 30 dias no plano grátis. Não tem versão web",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t({
                            en: "Outlayr is an open source expense tracker you fill in by sentence, voice, or receipt, free to start.",
                            es: "Outlayr es una app de código abierto para controlar tus gastos que llenas con una oración, con tu voz o con un recibo, gratis para empezar.",
                            pt: "O Outlayr é um app de código aberto para controlar seus gastos, que você preenche com uma frase, com a voz ou com um recibo, grátis para começar.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/br/app/id1032467659",
                                text: t({
                                    en: "Free, with in-app purchases. Premium from R$ 31,90, and Lifetime Premium is R$ 279,90",
                                    es: "Gratis, con compras dentro de la app. Premium desde R$ 31,90, y Lifetime Premium cuesta R$ 279,90",
                                    pt: "Grátis, com compras no app. Premium a partir de R$ 31,90, e o Lifetime Premium custa R$ 279,90",
                                }),
                            },
                            {
                                label: BRAZIL.bank,
                                source: "https://apps.apple.com/br/app/id1032467659",
                                text: t({
                                    en: "In Premium, with 4,000 participating banks worldwide. The listing does not say which banks in Brazil",
                                    es: "En Premium, con 4.000 bancos participantes en todo el mundo. La ficha no dice cuáles hay en Brasil",
                                    pt: "No Premium, com 4.000 bancos participantes no mundo inteiro. A página da loja não diz quais são do Brasil",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "Several, with exchange rates calculated in real time",
                                    es: "Varias, con tasas de cambio calculadas en tiempo real",
                                    pt: "Várias, com cotações calculadas em tempo real",
                                }),
                            },
                            {
                                label: BRAZIL.portuguese,
                                source: "https://apps.apple.com/br/app/id1032467659",
                                text: t({
                                    en: "Yes, Portuguese and 47 other languages",
                                    es: "Sí, portugués y 47 idiomas más",
                                    pt: "Sim, português e mais 47 idiomas",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "iPhone, Android, web",
                                    es: "iPhone, Android, web",
                                    pt: "iPhone, Android, web",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "The free tier is for tracking by hand. Bank sync needs Premium",
                                    es: "El plan gratis es para registrar a mano. La sincronización bancaria requiere Premium",
                                    pt: "O plano grátis é para lançar à mão. A sincronização bancária exige o Premium",
                                }),
                            },
                        ],
                        name: "Wallet by BudgetBakers",
                        slug: "wallet",
                        summary: t({
                            en: "Wallet by BudgetBakers is a money app with a free tier for tracking by hand and bank sync in Premium.",
                            es: "Wallet by BudgetBakers es una app de finanzas con un plan gratis para registrar a mano y sincronización bancaria en Premium.",
                            pt: "O Wallet by BudgetBakers é um app de finanças com um plano grátis para lançar à mão e sincronização bancária no Premium.",
                        }),
                    },
                ],
                facts: [
                    {
                        label: "Meu Dinheiro",
                        text: t({
                            en: "Best if you would rather manage your money in a browser, with the phone apps alongside",
                            es: "Ideal si prefieres manejar tu dinero en el navegador, con las apps del celular al lado",
                            pt: "Ideal se você prefere cuidar do dinheiro no navegador, com os apps do celular junto",
                        }),
                    },
                    {
                        label: "Minhas Economias",
                        text: t({
                            en: "Best if you want accounts and cards to come in through Open Finance, with spending limits that alert you",
                            es: "Ideal si quieres que cuentas y tarjetas lleguen por Open Finance, con límites de gasto que te avisan",
                            pt: "Ideal se você quer que contas e cartões entrem pelo Open Finance, com limites de gastos que avisam",
                        }),
                    },
                    {
                        label: "Mobills",
                        text: t({
                            en: "Best if you want every credit card, budget, and goal in one Brazilian app at a yearly price",
                            es: "Ideal si quieres todas tus tarjetas, presupuestos y metas en una app brasileña con precio anual",
                            pt: "Ideal se você quer todos os cartões, orçamentos e objetivos em um app brasileiro com preço anual",
                        }),
                    },
                    {
                        label: "Monefy",
                        text: t({
                            en: "Best if you want to log in two taps, free, without connecting anything",
                            es: "Ideal si quieres registrar en dos toques, gratis, sin conectar nada",
                            pt: "Ideal se você quer lançar em dois toques, de graça, sem conectar nada",
                        }),
                    },
                    {
                        label: "Organizze",
                        text: t({
                            en: "Best if you pay for bank connection and want card statements and installment expenses in the same place",
                            es: "Ideal si pagas por la conexión bancaria y quieres resúmenes de tarjeta y gastos en cuotas en un mismo lugar",
                            pt: "Ideal se você paga pela conexão bancária e quer faturas e despesas parceladas no mesmo lugar",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you would rather log by sentence, voice, or receipt than connect a bank, or spend in reais and other currencies",
                            es: "Ideal si prefieres registrar con una oración, tu voz o un recibo antes que conectar un banco, o gastas en reales y otras monedas",
                            pt: "Ideal se você prefere lançar com uma frase, a voz ou um recibo em vez de conectar o banco, ou gasta em reais e outras moedas",
                        }),
                    },
                    {
                        label: "Wallet by BudgetBakers",
                        text: t({
                            en: "Best if you want a free tier by hand and real time exchange rates, on the phone and the web",
                            es: "Ideal si quieres un plan gratis a mano y tasas de cambio en tiempo real, en el celular y la web",
                            pt: "Ideal se você quer um plano grátis à mão e cotações em tempo real, no celular e na web",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on how you want entries to get in. Organizze, Minhas Economias, Meu Dinheiro, and Mobills connect to Brazilian banks through Open Finance or their own integrations, Organizze and Mobills only on a paid plan. Monefy and Outlayr do not connect to a bank: Monefy logs a purchase in two taps, and Outlayr logs it by sentence, voice, or receipt. Wallet by BudgetBakers has a free tier by hand and bank sync in Premium. All of them are in Portuguese.",
                            es: "Depende de cómo quieras que entren los registros. Organizze, Minhas Economias, Meu Dinheiro y Mobills se conectan a bancos de Brasil por Open Finance o integraciones propias, Organizze y Mobills solo en un plan de pago. Monefy y Outlayr no se conectan a un banco: Monefy registra una compra en dos toques, y Outlayr con una oración, tu voz o un recibo. Wallet by BudgetBakers tiene un plan gratis a mano y sincronización bancaria en Premium. Todas están en portugués.",
                            pt: "Depende de como você quer que os lançamentos entrem. Organizze, Minhas Economias, Meu Dinheiro e Mobills se conectam a bancos brasileiros pelo Open Finance ou por integrações próprias, Organizze e Mobills só em um plano pago. Monefy e Outlayr não se conectam ao banco: o Monefy registra uma compra em dois toques, e o Outlayr com uma frase, a voz ou um recibo. O Wallet by BudgetBakers tem um plano grátis à mão e sincronização bancária no Premium. Todos estão em português.",
                        }),
                        question: t({
                            en: "What is the best financial control app in Brazil?",
                            es: "¿Cuál es la mejor app de control financiero en Brasil?",
                            pt: "Qual é o melhor app de controle financeiro?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Organizze connects through Open Finance from its Conectado plan, R$ 49 a month, with up to 3 accounts or cards. Minhas Economias and Meu Dinheiro also sync through Open Finance. Mobills has automatic integrations with the main banks in Premium. Wallet by BudgetBakers syncs in Premium, but its listing does not say which Brazilian banks. Monefy and Outlayr do not connect to banks.",
                            es: "Organizze se conecta por Open Finance desde su plan Conectado, R$ 49 al mes, con hasta 3 cuentas o tarjetas. Minhas Economias y Meu Dinheiro también sincronizan por Open Finance. Mobills tiene integraciones automáticas con los principales bancos en Premium. Wallet by BudgetBakers sincroniza en Premium, pero su ficha no dice qué bancos de Brasil. Monefy y Outlayr no se conectan a bancos.",
                            pt: "O Organizze conecta pelo Open Finance a partir do plano Conectado, R$ 49 por mês, com até 3 contas ou cartões. Minhas Economias e Meu Dinheiro também sincronizam pelo Open Finance. O Mobills tem integrações automáticas com os principais bancos no Premium. O Wallet by BudgetBakers sincroniza no Premium, mas a página da loja não diz quais bancos brasileiros. Monefy e Outlayr não se conectam a bancos.",
                        }),
                        question: t({
                            en: "Which app connects to my bank through Open Finance?",
                            es: "¿Qué app se conecta a mi banco por Open Finance?",
                            pt: "Qual app se conecta ao meu banco pelo Open Finance?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Monefy is free at its core. Wallet by BudgetBakers has a free tier for tracking by hand. Meu Dinheiro's Básico is free for 12 months, up to 100 entries a month. Minhas Economias and Mobills are free to download, with paid plans inside. Outlayr has a free plan with 3 accounts and 20 voice or receipt captures every 30 days. Organizze's plans page has no free plan, only 7 days free on Manual.",
                            es: "Monefy es gratis en lo básico. Wallet by BudgetBakers tiene un plan gratis para registrar a mano. Básico de Meu Dinheiro es gratis por 12 meses, hasta 100 registros al mes. Minhas Economias y Mobills son gratis para descargar, con planes de pago dentro. Outlayr tiene un plan gratis con 3 cuentas y 20 capturas de voz o de recibos cada 30 días. La página de planes de Organizze no tiene plan gratis, solo 7 días gratis en Manual.",
                            pt: "O Monefy é grátis no básico. O Wallet by BudgetBakers tem um plano grátis para lançar à mão. O Básico do Meu Dinheiro é grátis por 12 meses, com até 100 lançamentos por mês. Minhas Economias e Mobills são grátis para baixar, com planos pagos dentro do app. O Outlayr tem um plano grátis com 3 contas e 20 capturas por voz ou de recibos a cada 30 dias. A página de planos do Organizze não tem plano grátis, só 7 dias grátis no Manual.",
                        }),
                        question: t({
                            en: "Which expense control app is free?",
                            es: "¿Qué app de control de gastos es gratis?",
                            pt: "Qual app de controle de gastos é grátis?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Organizze records fixed, installment, and recurring expenses. Outlayr splits a purchase into installments: what you pay now, then each payment on its own date, with a reminder the day before it is due. The pages we read for the other five do not describe installment purchases.",
                            es: "Organizze registra gastos fijos, en cuotas y recurrentes. Outlayr divide una compra en cuotas: lo que pagas hoy y cada pago con su fecha, con un aviso el día antes. Las páginas de las otras cinco apps que revisamos no describen compras en cuotas.",
                            pt: "O Organizze registra despesas fixas, parceladas e recorrentes. O Outlayr divide uma compra em parcelas: o que você paga agora e cada parcela na sua data, com um aviso no dia anterior ao vencimento. As páginas dos outros cinco apps que lemos não descrevem compras parceladas.",
                        }),
                        question: t({
                            en: "Which app handles purchases in installments?",
                            es: "¿Qué app maneja compras en cuotas?",
                            pt: "Qual app controla compras parceladas?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The tracker is free, with budgets, goals, subscriptions, and widgets. The free plan includes 20 voice or receipt captures every 30 days, 3 accounts, 2 category budgets, and accounts in one currency. Outlayr Pro raises those limits and adds sync. In the United States it is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once. Your app store shows the price for your country.",
                            es: "El control de gastos es gratis, con presupuestos, metas, suscripciones y widgets. El plan gratis incluye 20 capturas de voz o de recibos cada 30 días, 3 cuentas, 2 presupuestos por categoría y cuentas en una moneda. Outlayr Pro sube esos límites y agrega la sincronización. En Estados Unidos cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago. Tu tienda de apps muestra el precio de tu país.",
                            pt: "Registrar gastos é grátis, assim como orçamentos, metas, assinaturas e widgets. O plano grátis inclui 20 capturas por voz ou de recibos a cada 30 dias, 3 contas, 2 orçamentos por categoria e contas em uma moeda. O Outlayr Pro aumenta esses limites e adiciona a sincronização. Nos Estados Unidos, custa US$7.99 por mês, US$49.99 por ano com 7 dias grátis ou US$129.99 em pagamento único. Sua loja de apps mostra o preço do seu país.",
                        }),
                        question: t({
                            en: "How much does Outlayr cost?",
                            es: "¿Cuánto cuesta Outlayr?",
                            pt: "Quanto custa o Outlayr?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is offered in 175 countries and regions, and the app is in Portuguese, English, Spanish, and French. Your app store shows the price for your country.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, y la app está en portugués, inglés, español y francés. Tu tienda de apps muestra el precio de tu país.",
                            pt: "Sim. O Outlayr é oferecido em 175 países e regiões, e o app está em português, inglês, espanhol e francês. Sua loja de apps mostra o preço do seu país.",
                        }),
                        question: t({
                            en: "Is Outlayr available in Brazil?",
                            es: "¿Outlayr está disponible en Brasil?",
                            pt: "O Outlayr está disponível no Brasil?",
                        }),
                    },
                ],
                lead: t({
                    en: "Seven financial control apps for Brazil, each best for a different need: Meu Dinheiro, Minhas Economias, Mobills, Monefy, Organizze, Outlayr, and Wallet by BudgetBakers. Five connect to your bank, some only on a paid plan; Monefy and Outlayr do not. Outlayr is ours; the other six are not.",
                    es: "Siete apps de control financiero para Brasil, cada una mejor para algo distinto: Meu Dinheiro, Minhas Economias, Mobills, Monefy, Organizze, Outlayr y Wallet by BudgetBakers. Cinco se conectan a tu banco, algunas solo en un plan de pago; Monefy y Outlayr no. Outlayr es nuestra; las otras seis no.",
                    pt: "Sete apps de controle financeiro para o Brasil, cada um melhor para uma necessidade: Meu Dinheiro, Minhas Economias, Mobills, Monefy, Organizze, Outlayr e Wallet by BudgetBakers. Cinco se conectam ao seu banco, alguns só em um plano pago; Monefy e Outlayr não. O Outlayr é nosso; os outros seis não.",
                }),
                meta: {
                    description: t({
                        en: "Seven financial control apps compared for Brazil: price in reais, Open Finance, credit cards, and installments. Outlayr is ours; the other six are not.",
                        es: "Compara 7 apps de control financiero para Brasil: precio en reales, Open Finance, tarjetas de crédito y cuotas. Outlayr es nuestra; las otras seis no.",
                        pt: "Compare 7 apps de controle financeiro: preço em reais, Open Finance, cartões e parcelas. Mobills, Organizze e mais. O Outlayr é nosso.",
                    }),
                    title: t({
                        en: "Best Financial Control Apps in Brazil (2026) · Outlayr",
                        es: "Mejores apps de control financiero en Brasil (2026) · Outlayr",
                        pt: "Melhor app de controle financeiro (2026) · Outlayr",
                    }),
                },
                picked: [
                    t({
                        en: "Each app here is in Portuguese and sold in Brazil, and each fits a different need, from Open Finance bank connection to logging in two taps without connecting anything. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista está en portugués y se vende en Brasil, y cada una sirve para algo distinto, desde la conexión bancaria por Open Finance hasta registrar en dos toques sin conectar nada. Van en orden alfabético, no por puesto.",
                        pt: "Cada app desta lista está em português e é vendido no Brasil, e cada um serve para uma coisa, da conexão bancária pelo Open Finance a lançar em dois toques sem conectar nada. Estão em ordem alfabética, não por posição.",
                    }),
                    t({
                        en: "Every detail about the other apps was read on that app's own site, plans page, or Brazilian App Store listing on the date below the table, and links to the page it came from. Prices are in reais as each page shows them. These are the facts as each app states them, not results of our own testing. A feature a page does not mention is left out, not marked as missing.",
                        es: "Cada dato de las otras apps se leyó en el sitio, la página de planes o la ficha del App Store de Brasil de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió. Los precios están en reales, como los muestra cada página. Son los datos tal como los da cada app, no resultados de pruebas nuestras. Lo que una página no menciona se deja fuera, no se marca como faltante.",
                        pt: "Cada dado dos outros apps foi lido no site, na página de planos ou na página da App Store brasileira desse app na data que aparece abaixo da tabela, e tem link para a página de onde saiu. Os preços estão em reais, como cada página mostra. São os dados como cada app os informa, não resultados de testes nossos. O que uma página não menciona fica de fora, não é marcado como ausente.",
                    }),
                    t({
                        en: "Outlayr is ours. It gets the same facts as the others, including its own Watch out for row.",
                        es: "Outlayr es nuestra. Tiene los mismos datos que las demás, incluida su propia fila de Ten en cuenta.",
                        pt: "O Outlayr é nosso. Ele tem os mesmos dados que os outros, incluindo a própria linha de Fique atento a.",
                    }),
                ],
                related: [
                    "/guides/expense-tracker-template",
                    "/tools/installment-calculator",
                    "/tools/50-30-20-budget-calculator",
                ] satisfies PageRef[],
                sources: t({
                    en: "Each detail about the other apps links to the page it was read on",
                    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
                    pt: "Os dados dos outros apps têm link para a página onde foram lidos",
                }),
                title: t({
                    en: "The best financial control apps in Brazil",
                    es: "La mejor app de control financiero en Brasil",
                    pt: "O melhor app de controle financeiro no Brasil",
                }),
            },
            "best-budget-apps-france": {
                apps: [
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/fr/app/bankin-g%C3%A9rer-son-budget/id447040033",
                                text: t({
                                    en: "Free, with in-app purchases. Bankin' Plus is 4,99 € a month or 39,99 € a year, Bankin' Pro 19,99 € a month or 99,99 € a year",
                                    es: "Gratis, con compras dentro de la app. Bankin' Plus cuesta 4,99 € al mes o 39,99 € al año, Bankin' Pro 19,99 € al mes o 99,99 € al año",
                                    fr: "Gratuit, avec achats intégrés. Bankin' Plus : 4,99 € par mois ou 39,99 € par an. Bankin' Pro : 19,99 € par mois ou 99,99 € par an",
                                }),
                            },
                            {
                                label: FRANCE.bank,
                                source: "https://apps.apple.com/fr/app/bankin-g%C3%A9rer-son-budget/id447040033",
                                text: t({
                                    en: "350+ banks in 4 countries: France, the United Kingdom, Spain, and Germany",
                                    es: "Más de 350 bancos en 4 países: Francia, Reino Unido, España y Alemania",
                                    fr: "Plus de 350 banques dans 4 pays : France, Royaume-Uni, Espagne et Allemagne",
                                }),
                            },
                            {
                                label: LABELS.budgets,
                                source: "https://apps.apple.com/fr/app/bankin-g%C3%A9rer-son-budget/id447040033",
                                text: t({
                                    en: "A budget per spending category, an end of month balance forecast, and alerts before an overdraft",
                                    es: "Un presupuesto por categoría de gasto, una previsión del saldo a fin de mes y alertas antes de un sobregiro",
                                    fr: "Un budget par catégorie de dépenses, une prévision du solde de fin de mois et des alertes avant un découvert",
                                }),
                            },
                            {
                                label: FRANCE.quebec,
                                source: "https://apps.apple.com/ca/app/bankin-budget-et-comptes/id447040033?l=fr",
                                text: t({
                                    en: "In the Canadian App Store, but its developer says in review replies that it does not support Canadian banks",
                                    es: "Está en el App Store de Canadá, pero su desarrollador dice en respuestas a reseñas que no admite bancos canadienses",
                                    fr: "Présente dans l'App Store canadien, mais l'éditeur répond dans les avis qu'il ne prend pas en charge les banques canadiennes",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://bankin.com/",
                                text: t({
                                    en: "iPhone, Android, web",
                                    es: "iPhone, Android, web",
                                    fr: "iPhone, Android, web",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://bankin.com/fr/pluspro.html",
                                text: t({
                                    en: "Your own categories and the budget history are listed under Plus and Pro",
                                    es: "Las categorías propias y el historial del presupuesto aparecen en Plus y Pro",
                                    fr: "Les catégories personnalisées et l'historique du budget figurent dans Plus et Pro",
                                }),
                            },
                        ],
                        name: "Bankin'",
                        slug: "bankin",
                        summary: t({
                            en: "Bankin' is a French budget app that syncs and categorizes your bank accounts, with Plus and Pro subscriptions.",
                            es: "Bankin' es una app francesa de presupuesto que sincroniza y clasifica tus cuentas bancarias, con suscripciones Plus y Pro.",
                            fr: "Bankin' est une app française de budget qui synchronise et catégorise vos comptes bancaires, avec les abonnements Plus et Pro.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://finary.com/fr/pricing",
                                text: t({
                                    en: "Free plan. Lite is 54,99 € a year, Plus 149,99 € a year, and Pro 349,99 € a year",
                                    es: "Plan gratis. Lite cuesta 54,99 € al año, Plus 149,99 € al año y Pro 349,99 € al año",
                                    fr: "Offre gratuite. Lite : 54,99 € par an, Plus : 149,99 € par an, Pro : 349,99 € par an",
                                }),
                            },
                            {
                                label: LABELS.focus,
                                source: "https://finary.com/fr",
                                text: t({
                                    en: "Your whole net worth, from 20,000+ banks, brokers, and crypto platforms worldwide",
                                    es: "Todo tu patrimonio, desde más de 20.000 bancos, brókeres y plataformas cripto de todo el mundo",
                                    fr: "Tout votre patrimoine, depuis plus de 20 000 banques, courtiers et plateformes crypto dans le monde",
                                }),
                            },
                            {
                                label: FRANCE.bank,
                                source: "https://finary.com/fr/pricing",
                                text: t({
                                    en: "2 bank syncs on the free plan, unlimited on Lite, Plus, and Pro",
                                    es: "2 sincronizaciones bancarias en el plan gratis, ilimitadas en Lite, Plus y Pro",
                                    fr: "2 synchronisations bancaires en offre gratuite, illimitées en Lite, Plus et Pro",
                                }),
                            },
                            {
                                label: LABELS.budgets,
                                source: "https://finary.com/fr/pricing",
                                text: t({
                                    en: "Budget management on Plus and Pro only",
                                    es: "Gestión del presupuesto solo en Plus y Pro",
                                    fr: "Gestion du budget en Plus et Pro uniquement",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://finary.com/fr",
                                text: t({
                                    en: "Web, iPhone, Android",
                                    es: "Web, iPhone, Android",
                                    fr: "Web, iPhone, Android",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://finary.com/fr/pricing",
                                text: t({
                                    en: "Neither the free plan nor Lite includes budget management, so budgeting starts at 149,99 € a year",
                                    es: "Ni el plan gratis ni Lite incluyen la gestión del presupuesto, así que presupuestar empieza en 149,99 € al año",
                                    fr: "Ni l'offre gratuite ni Lite n'incluent la gestion du budget, qui commence donc à 149,99 € par an",
                                }),
                            },
                        ],
                        name: "Finary",
                        slug: "finary",
                        summary: t({
                            en: "Finary is a French wealth app that tracks bank accounts, investments, and crypto in one place, with budgeting on its Plus plan.",
                            es: "Finary es una app francesa de patrimonio que sigue cuentas bancarias, inversiones y cripto en un solo lugar, con presupuesto en su plan Plus.",
                            fr: "Finary est une app française de suivi de patrimoine qui réunit comptes bancaires, placements et crypto, avec la gestion du budget dans son offre Plus.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/FR/app/id440509306",
                                text: t({
                                    en: "Free, with in-app purchases. Linxo Premium is 5,99 € for a month or 47,99 € for a year",
                                    es: "Gratis, con compras dentro de la app. Linxo Premium cuesta 5,99 € por un mes o 47,99 € por un año",
                                    fr: "Gratuit, avec achats intégrés. Linxo Premium : 5,99 € pour 1 mois ou 47,99 € pour 1 an",
                                }),
                            },
                            {
                                label: FRANCE.bank,
                                source: "https://apps.apple.com/FR/app/id440509306",
                                text: t({
                                    en: "Close to 320 banks and account types, such as Crédit Agricole, Société Générale, BNP Paribas, LCL, Boursorama, Revolut, and N26",
                                    es: "Cerca de 320 bancos y tipos de cuenta, como Crédit Agricole, Société Générale, BNP Paribas, LCL, Boursorama, Revolut y N26",
                                    fr: "Près de 320 banques et types de comptes, dont Crédit Agricole, Société Générale, BNP Paribas, LCL, Boursorama, Revolut et N26",
                                }),
                            },
                            {
                                label: LABELS.focus,
                                source: "https://apps.apple.com/FR/app/id440509306",
                                text: t({
                                    en: "Automatic categories, charts, alerts for salary and bank fees, and savings accounts such as PEA and life insurance",
                                    es: "Categorías automáticas, gráficos, alertas de sueldo y comisiones bancarias, y cuentas de ahorro como el PEA y el seguro de vida",
                                    fr: "Catégories automatiques, graphiques, alertes de salaire et de frais bancaires, et comptes d'épargne comme le PEA ou l'assurance vie",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.linxo.com/",
                                text: t({
                                    en: "iPhone, Android, web",
                                    es: "iPhone, Android, web",
                                    fr: "iPhone, Android, web",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/FR/app/id440509306",
                                text: t({
                                    en: "The 30 day balance forecast and unlimited search history need Premium",
                                    es: "La previsión del saldo a 30 días y el historial de búsqueda ilimitado requieren Premium",
                                    fr: "La prévision du solde sur 30 jours et l'historique de recherche illimité demandent Premium",
                                }),
                            },
                        ],
                        name: "Linxo",
                        slug: "linxo",
                        summary: t({
                            en: "Linxo is a French budget app that gathers your bank accounts in one place and sorts spending into categories, free with a Premium option.",
                            es: "Linxo es una app francesa de presupuesto que reúne tus cuentas bancarias en un lugar y clasifica tus gastos, gratis con una opción Premium.",
                            fr: "Linxo est une app française de budget qui réunit vos comptes bancaires au même endroit et classe vos dépenses, gratuite avec une option Premium.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/fr/app/id1212024409",
                                text: t({
                                    en: "Free, with in-app purchases. Monefy Premium is listed at 42,99 € and 69,99 €",
                                    es: "Gratis, con compras dentro de la app. Monefy Premium aparece a 42,99 € y 69,99 €",
                                    fr: "Gratuit, avec achats intégrés. Monefy Premium est affiché à 42,99 € et 69,99 €",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "By hand, any purchase in two taps",
                                    es: "A mano, cualquier compra en dos toques",
                                    fr: "À la main, chaque achat en deux touches",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://www.monefy.com/",
                                text: t({ en: "150+", es: "Más de 150", fr: "Plus de 150" }),
                            },
                            {
                                label: FRANCE.french,
                                source: "https://apps.apple.com/fr/app/id1212024409",
                                text: t({
                                    en: "Yes, French and 15 other languages",
                                    es: "Sí, francés y 15 idiomas más",
                                    fr: "Oui, français et 15 autres langues",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "iPhone and Android, synced through Google Drive or Dropbox",
                                    es: "iPhone y Android, con sincronización por Google Drive o Dropbox",
                                    fr: "iPhone et Android, synchronisés par Google Drive ou Dropbox",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.monefy.com/",
                                text: t({
                                    en: "Unlimited accounts and recurring transactions need the paid upgrade",
                                    es: "Las cuentas ilimitadas y los movimientos recurrentes requieren la mejora de pago",
                                    fr: "Les comptes illimités et les opérations récurrentes demandent la version payante",
                                }),
                            },
                        ],
                        name: "Monefy",
                        slug: "monefy",
                        summary: t({
                            en: "Monefy is an expense tracker for iPhone and Android that records a purchase in two taps, free at its core, with an optional paid upgrade.",
                            es: "Monefy es una app para controlar gastos en iPhone y Android que registra una compra en dos toques, gratis en lo básico, con una mejora de pago opcional.",
                            fr: "Monefy est une app de suivi des dépenses pour iPhone et Android qui enregistre un achat en deux touches, gratuite pour l'essentiel, avec une version payante en option.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                text: t({
                                    en: "Free. Pro is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once in the US. Prices vary by country",
                                    es: "Gratis. Pro cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago en Estados Unidos. Los precios cambian según el país",
                                    fr: "Gratuit. Pro coûte US$7.99 par mois, US$49.99 par an avec 7 jours gratuits ou US$129.99 en un seul paiement aux États-Unis. Les prix varient selon le pays",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                text: t({
                                    en: "One sentence, voice, receipt scan, CSV import",
                                    es: "Una oración, voz, escaneo de recibos, importación de CSV",
                                    fr: "Une phrase, la voix, le scan de tickets, l'import CSV",
                                }),
                            },
                            {
                                label: FRANCE.bank,
                                text: t({
                                    en: "None. It does not connect to your bank. On Android it can log purchases from the notifications of apps you turn on, such as your bank's, up to 30 a month on the free plan",
                                    es: "No tiene. No se conecta a tu banco. En Android puede registrar compras desde las notificaciones de las apps que actives, como la de tu banco, hasta 30 al mes en el plan gratis",
                                    fr: "Aucune. Outlayr ne se connecte pas à votre banque. Sur Android, il peut enregistrer les achats à partir des notifications des apps que vous activez, comme celle de votre banque, jusqu'à 30 par mois en formule gratuite",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                text: t({
                                    en: "165, converted at the rate of the day",
                                    es: "165, convertidas con la tasa del día",
                                    fr: "165, converties au taux du jour",
                                }),
                            },
                            {
                                label: FRANCE.quebec,
                                text: t({
                                    en: "Works the same: there is no bank to connect, and it is offered in 175 countries and regions, Canada included",
                                    es: "Funciona igual: no hay banco que conectar, y se ofrece en 175 países y regiones, Canadá incluido",
                                    fr: "Fonctionne de la même façon : pas de banque à connecter, et l'app est proposée dans 175 pays et régions, dont le Canada",
                                }),
                            },
                            {
                                label: FRANCE.french,
                                text: t({
                                    en: "Yes, along with English, Spanish, and Portuguese",
                                    es: "Sí, además de inglés, español y portugués",
                                    fr: "Oui, ainsi qu'en anglais, espagnol et portugais",
                                }),
                            },
                            {
                                label: LABELS.free,
                                text: t({
                                    en: "3 accounts, 2 category budgets plus one for the month, 20 voice or receipt captures every 30 days, and accounts in one currency",
                                    es: "3 cuentas, 2 presupuestos por categoría más uno para el mes, 20 capturas de voz o de recibos cada 30 días y cuentas en una moneda",
                                    fr: "3 comptes, 2 budgets par catégorie plus un pour le mois, 20 captures vocales ou de tickets tous les 30 jours et des comptes dans une seule devise",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                text: t({ en: "iPhone and Android", es: "iPhone y Android", fr: "iPhone et Android" }),
                            },
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "No bank sync, so every entry starts with you. Voice entry and receipt scans need an account and a connection, with 20 captures every 30 days on the free plan. There is no web app",
                                    es: "No sincroniza con el banco, así que cada registro empieza por ti. Dictar y escanear recibos requiere una cuenta y conexión, con 20 capturas cada 30 días en el plan gratis. No tiene app web",
                                    fr: "Pas de synchronisation bancaire, donc chaque opération part de vous. La saisie vocale et le scan de tickets demandent un compte et une connexion, avec 20 captures tous les 30 jours en formule gratuite. Pas de version web",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t({
                            en: "Outlayr is an open source expense tracker you fill in by sentence, voice, or receipt, free to start.",
                            es: "Outlayr es una app de código abierto para controlar tus gastos que llenas con una oración, con tu voz o con un recibo, gratis para empezar.",
                            fr: "Outlayr est une app open source de suivi des dépenses que vous remplissez par une phrase, à la voix ou avec un ticket, gratuite pour commencer.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/fr/app/id1032467659",
                                text: t({
                                    en: "Free, with in-app purchases. Premium from 5,99 €, and Lifetime Premium is 49,99 €",
                                    es: "Gratis, con compras dentro de la app. Premium desde 5,99 €, y Lifetime Premium cuesta 49,99 €",
                                    fr: "Gratuit, avec achats intégrés. Premium à partir de 5,99 €, et Lifetime Premium à 49,99 €",
                                }),
                            },
                            {
                                label: FRANCE.bank,
                                source: "https://apps.apple.com/fr/app/id1032467659",
                                text: t({
                                    en: "In Premium, with 4,000 participating banks worldwide",
                                    es: "En Premium, con 4.000 bancos participantes en todo el mundo",
                                    fr: "En Premium, avec 4 000 banques participantes dans le monde",
                                }),
                            },
                            {
                                label: LABELS.currencies,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "Several, with exchange rates calculated in real time",
                                    es: "Varias, con tasas de cambio calculadas en tiempo real",
                                    fr: "Plusieurs, avec des taux de change calculés en temps réel",
                                }),
                            },
                            {
                                label: FRANCE.french,
                                source: "https://apps.apple.com/fr/app/id1032467659",
                                text: t({
                                    en: "Yes, French and 47 other languages",
                                    es: "Sí, francés y 47 idiomas más",
                                    fr: "Oui, français et 47 autres langues",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "iPhone, Android, web",
                                    es: "iPhone, Android, web",
                                    fr: "iPhone, Android, web",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://budgetbakers.com/en/products/wallet/",
                                text: t({
                                    en: "The free tier is for tracking by hand. Bank sync needs Premium",
                                    es: "El plan gratis es para registrar a mano. La sincronización bancaria requiere Premium",
                                    fr: "L'offre gratuite sert à saisir à la main. La synchronisation bancaire demande Premium",
                                }),
                            },
                        ],
                        name: "Wallet by BudgetBakers",
                        slug: "wallet",
                        summary: t({
                            en: "Wallet by BudgetBakers is a money app with a free tier for tracking by hand and bank sync in Premium.",
                            es: "Wallet by BudgetBakers es una app de finanzas con un plan gratis para registrar a mano y sincronización bancaria en Premium.",
                            fr: "Wallet by BudgetBakers est une app de finances avec une offre gratuite pour saisir à la main et la synchronisation bancaire en Premium.",
                        }),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/fr/app/ynab/id1010865877",
                                text: t({
                                    en: "Free for 30 days, then a monthly or yearly subscription, listed at 15,49 € and 119,00 € in the French App Store",
                                    es: "Gratis 30 días, luego una suscripción mensual o anual, a 15,49 € y 119,00 € en el App Store de Francia",
                                    fr: "Gratuit 30 jours, puis un abonnement mensuel ou annuel, affiché à 15,49 € et 119,00 € dans l'App Store français",
                                }),
                            },
                            {
                                label: LABELS.style,
                                source: "https://www.ynab.com/",
                                text: t({
                                    en: "You decide what your money is for before you spend it",
                                    es: "Decides para qué es tu dinero antes de gastarlo",
                                    fr: "Vous décidez à quoi sert votre argent avant de le dépenser",
                                }),
                            },
                            {
                                label: FRANCE.bank,
                                source: "https://www.ynab.com/pricing",
                                text: t({
                                    en: "Direct import from select US, Canadian, UK, and EU banks, and file import for the rest",
                                    es: "Importación directa desde algunos bancos de EE. UU., Canadá, Reino Unido y la UE, e importación de archivos para el resto",
                                    fr: "Import direct depuis certaines banques des États-Unis, du Canada, du Royaume-Uni et de l'UE, et import de fichiers pour les autres",
                                }),
                            },
                            {
                                label: FRANCE.quebec,
                                source: "https://www.ynab.com/pricing",
                                text: t({
                                    en: "Its direct import covers select Canadian banks",
                                    es: "Su importación directa cubre algunos bancos canadienses",
                                    fr: "Son import direct couvre certaines banques canadiennes",
                                }),
                            },
                            {
                                label: FRANCE.french,
                                source: "https://apps.apple.com/fr/app/ynab/id1010865877",
                                text: t({
                                    en: "No, the app is in English only",
                                    es: "No, la app solo está en inglés",
                                    fr: "Non, l'app est uniquement en anglais",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://www.ynab.com/",
                                text: t({
                                    en: "iPhone, Android, web, Apple Watch",
                                    es: "iPhone, Android, web, Apple Watch",
                                    fr: "iPhone, Android, web, Apple Watch",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.ynab.com/pricing",
                                text: t({
                                    en: "No free plan after the trial, and direct import reaches only select EU banks",
                                    es: "No hay plan gratis después de la prueba, y la importación directa llega solo a algunos bancos de la UE",
                                    fr: "Pas d'offre gratuite après l'essai, et l'import direct ne couvre que certaines banques de l'UE",
                                }),
                            },
                        ],
                        name: "YNAB",
                        slug: "ynab",
                        summary: t({
                            en: "YNAB is a paid budgeting method built on bank imports, in English, with direct import from select banks in Canada and the EU.",
                            es: "YNAB es un método de presupuesto de pago basado en importar movimientos del banco, en inglés, con importación directa de algunos bancos de Canadá y la UE.",
                            fr: "YNAB est une méthode de budget payante fondée sur l'import bancaire, en anglais, avec un import direct depuis certaines banques du Canada et de l'UE.",
                        }),
                    },
                ],
                facts: [
                    {
                        label: "Bankin'",
                        text: t({
                            en: "Best if your banks are in France, the UK, Spain, or Germany and you want a budget per category built from them",
                            es: "Ideal si tus bancos están en Francia, Reino Unido, España o Alemania y quieres un presupuesto por categoría hecho con ellos",
                            fr: "Idéal si vos banques sont en France, au Royaume-Uni, en Espagne ou en Allemagne et que vous voulez un budget par catégorie à partir d'elles",
                        }),
                    },
                    {
                        label: "Finary",
                        text: t({
                            en: "Best if you mostly follow savings and investments, and budgeting comes second",
                            es: "Ideal si sigues sobre todo ahorro e inversiones, y el presupuesto viene después",
                            fr: "Idéal si vous suivez surtout votre épargne et vos placements, le budget venant ensuite",
                        }),
                    },
                    {
                        label: "Linxo",
                        text: t({
                            en: "Best if you want your French bank accounts sorted into categories for free",
                            es: "Ideal si quieres tus cuentas de bancos franceses clasificadas por categoría, gratis",
                            fr: "Idéal si vous voulez vos comptes de banques françaises classés par catégorie, gratuitement",
                        }),
                    },
                    {
                        label: "Monefy",
                        text: t({
                            en: "Best if you want to log in two taps, free, without connecting anything",
                            es: "Ideal si quieres registrar en dos toques, gratis, sin conectar nada",
                            fr: "Idéal si vous voulez saisir en deux touches, gratuitement, sans rien connecter",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you would rather log by sentence, voice, or receipt than connect a bank, wherever you live, or spend in more than one currency",
                            es: "Ideal si prefieres registrar con una oración, tu voz o un recibo antes que conectar un banco, vivas donde vivas, o gastas en más de una moneda",
                            fr: "Idéal si vous préférez saisir par une phrase, à la voix ou avec un ticket plutôt que connecter une banque, où que vous viviez, ou si vous dépensez dans plusieurs devises",
                        }),
                    },
                    {
                        label: "Wallet by BudgetBakers",
                        text: t({
                            en: "Best if you want a free tier by hand, real time exchange rates, and bank sync in Premium",
                            es: "Ideal si quieres un plan gratis a mano, tasas de cambio en tiempo real y sincronización bancaria en Premium",
                            fr: "Idéal si vous voulez une offre gratuite à la main, des taux de change en temps réel et la synchronisation bancaire en Premium",
                        }),
                    },
                    {
                        label: "YNAB",
                        text: t({
                            en: "Best if you read English, live in Quebec, and want a strict budgeting method with Canadian bank import",
                            es: "Ideal si lees en inglés, vives en Quebec y quieres un método de presupuesto estricto con importación de bancos canadienses",
                            fr: "Idéal si vous lisez l'anglais, vivez au Québec et voulez une méthode de budget stricte avec import de banques canadiennes",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on where your bank is and how you want entries to get in. In France, Bankin' and Linxo sync your bank accounts and sort the spending, both free with paid options. Finary suits net worth more than budgets. Monefy and Outlayr do not connect to a bank: Monefy logs a purchase in two taps, and Outlayr logs it by sentence, voice, or receipt. Wallet by BudgetBakers has a free tier by hand. YNAB is a paid method in English.",
                            es: "Depende de dónde esté tu banco y de cómo quieras que entren los registros. En Francia, Bankin' y Linxo sincronizan tus cuentas y clasifican el gasto, las dos gratis con opciones de pago. Finary sirve más para el patrimonio que para el presupuesto. Monefy y Outlayr no se conectan a un banco: Monefy registra una compra en dos toques, y Outlayr con una oración, tu voz o un recibo. Wallet by BudgetBakers tiene un plan gratis a mano. YNAB es un método de pago en inglés.",
                            fr: "Tout dépend de l'endroit où se trouve votre banque et de la façon dont vous voulez saisir. En France, Bankin' et Linxo synchronisent vos comptes et classent vos dépenses, tous deux gratuits avec des options payantes. Finary convient mieux au patrimoine qu'au budget. Monefy et Outlayr ne se connectent pas à une banque : Monefy enregistre un achat en deux touches, Outlayr par une phrase, à la voix ou avec un ticket. Wallet by BudgetBakers a une offre gratuite à la main. YNAB est une méthode payante en anglais.",
                        }),
                        question: t({
                            en: "What is the best budget app?",
                            es: "¿Cuál es la mejor app de presupuesto?",
                            fr: "Quelle est la meilleure application de gestion de budget ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Linxo and Bankin' are free, with Premium at 5,99 € a month for Linxo and Plus at 4,99 € a month for Bankin'. Monefy is free at its core. Wallet by BudgetBakers has a free tier by hand. Finary is free, but budget management needs Plus. Outlayr has a free plan with 3 accounts and 20 voice or receipt captures every 30 days. YNAB is free for 30 days, then paid.",
                            es: "Linxo y Bankin' son gratis, con Premium a 5,99 € al mes en Linxo y Plus a 4,99 € al mes en Bankin'. Monefy es gratis en lo básico. Wallet by BudgetBakers tiene un plan gratis a mano. Finary es gratis, pero la gestión del presupuesto requiere Plus. Outlayr tiene un plan gratis con 3 cuentas y 20 capturas de voz o de recibos cada 30 días. YNAB es gratis 30 días y luego de pago.",
                            fr: "Linxo et Bankin' sont gratuits, avec Premium à 5,99 € par mois chez Linxo et Plus à 4,99 € par mois chez Bankin'. Monefy est gratuit pour l'essentiel. Wallet by BudgetBakers a une offre gratuite à la main. Finary est gratuit, mais la gestion du budget demande Plus. Outlayr a une formule gratuite avec 3 comptes et 20 captures vocales ou de tickets tous les 30 jours. YNAB est gratuit 30 jours, puis payant.",
                        }),
                        question: t({
                            en: "Which budget app is free?",
                            es: "¿Qué app de presupuesto es gratis?",
                            fr: "Quelle appli budget gratuite choisir ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Bankin' connects to banks in France, the UK, Spain, and Germany, and its developer says it does not support Canadian banks. Linxo's listing names banks such as Crédit Agricole, BNP Paribas, Revolut, and N26, and no Canadian bank. YNAB's direct import covers select Canadian banks, in English. Wallet by BudgetBakers and Finary state worldwide bank counts without naming Canada. Monefy and Outlayr connect to no bank, so they work the same in Quebec, both in French.",
                            es: "Bankin' se conecta a bancos de Francia, Reino Unido, España y Alemania, y su desarrollador dice que no admite bancos canadienses. La ficha de Linxo nombra bancos como Crédit Agricole, BNP Paribas, Revolut y N26, y ningún banco canadiense. La importación directa de YNAB cubre algunos bancos canadienses, en inglés. Wallet by BudgetBakers y Finary dan cifras de bancos en todo el mundo sin nombrar Canadá. Monefy y Outlayr no se conectan a ningún banco, así que funcionan igual en Quebec, las dos en francés.",
                            fr: "Bankin' se connecte aux banques de France, du Royaume-Uni, d'Espagne et d'Allemagne, et son éditeur indique ne pas prendre en charge les banques canadiennes. La fiche de Linxo cite des banques comme Crédit Agricole, BNP Paribas, Revolut et N26, et aucune banque canadienne. L'import direct de YNAB couvre certaines banques canadiennes, en anglais. Wallet by BudgetBakers et Finary annoncent des banques dans le monde entier sans citer le Canada. Monefy et Outlayr ne se connectent à aucune banque et fonctionnent donc de la même façon au Québec, tous deux en français.",
                        }),
                        question: t({
                            en: "Which budget app works in Quebec?",
                            es: "¿Qué app de presupuesto funciona en Quebec?",
                            fr: "Quelle application budget utiliser au Québec ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Bankin' lists 350+ banks in France, the UK, Spain, and Germany; Belgium is not among its 4 countries. Linxo lists close to 320 banks and account types. Finary syncs 2 accounts free and unlimited on paid plans. Wallet by BudgetBakers syncs in Premium. YNAB imports directly from select EU banks. Outlayr does not connect to a bank; on Android it can log purchases from your bank app's notifications.",
                            es: "Bankin' anuncia más de 350 bancos en Francia, Reino Unido, España y Alemania; Bélgica no está entre sus 4 países. Linxo anuncia cerca de 320 bancos y tipos de cuenta. Finary sincroniza 2 cuentas gratis e ilimitadas en sus planes de pago. Wallet by BudgetBakers sincroniza en Premium. YNAB importa directamente desde algunos bancos de la UE. Outlayr no se conecta a un banco; en Android puede registrar compras desde las notificaciones de la app de tu banco.",
                            fr: "Bankin' annonce plus de 350 banques en France, au Royaume-Uni, en Espagne et en Allemagne ; la Belgique ne fait pas partie de ses 4 pays. Linxo annonce près de 320 banques et types de comptes. Finary synchronise 2 comptes gratuitement et sans limite dans ses offres payantes. Wallet by BudgetBakers synchronise en Premium. YNAB importe directement depuis certaines banques de l'UE. Outlayr ne se connecte pas à une banque ; sur Android, il peut enregistrer les achats à partir des notifications de l'app de votre banque.",
                        }),
                        question: t({
                            en: "Which budget app connects to my bank?",
                            es: "¿Qué app de presupuesto se conecta a mi banco?",
                            fr: "Quelle application budget se connecte à ma banque ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The tracker is free, with budgets, goals, subscriptions, and widgets. The free plan includes 20 voice or receipt captures every 30 days, 3 accounts, 2 category budgets, and accounts in one currency. Outlayr Pro raises those limits and adds sync. In the United States it is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once. Your app store shows the price for your country.",
                            es: "El control de gastos es gratis, con presupuestos, metas, suscripciones y widgets. El plan gratis incluye 20 capturas de voz o de recibos cada 30 días, 3 cuentas, 2 presupuestos por categoría y cuentas en una moneda. Outlayr Pro sube esos límites y agrega la sincronización. En Estados Unidos cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago. Tu tienda de apps muestra el precio de tu país.",
                            fr: "La saisie, les budgets, les objectifs, les abonnements et les widgets sont gratuits. La formule gratuite comprend 20 captures vocales ou de tickets tous les 30 jours, 3 comptes, 2 budgets par catégorie et des comptes dans une seule devise. Outlayr Pro relève ces limites et ajoute la synchronisation. Aux États-Unis, il coûte US$7.99 par mois, US$49.99 par an avec 7 jours gratuits ou US$129.99 en un seul paiement. Votre boutique d'apps affiche le prix de votre pays.",
                        }),
                        question: t({
                            en: "How much does Outlayr cost?",
                            es: "¿Cuánto cuesta Outlayr?",
                            fr: "Combien coûte Outlayr ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is offered in 175 countries and regions, Canada included, and the app is in French, English, Spanish, and Portuguese. Your app store shows the price for your country.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, Canadá incluido, y la app está en francés, inglés, español y portugués. Tu tienda de apps muestra el precio de tu país.",
                            fr: "Oui. Outlayr est proposé dans 175 pays et régions, dont le Canada, et l'app est en français, anglais, espagnol et portugais. Votre boutique d'apps affiche le prix de votre pays.",
                        }),
                        question: t({
                            en: "Is Outlayr available in France, Quebec, and Belgium?",
                            es: "¿Outlayr está disponible en Francia, Quebec y Bélgica?",
                            fr: "Outlayr est-il disponible en France, au Québec et en Belgique ?",
                        }),
                    },
                ],
                lead: t({
                    en: "Seven budget apps for France, Quebec, and Belgium, each best for a different need: Bankin', Finary, Linxo, Monefy, Outlayr, Wallet by BudgetBakers, and YNAB. Bankin' and Linxo sync French bank accounts; Monefy and Outlayr connect to none, so they work the same anywhere. Outlayr is ours; the other six are not.",
                    es: "Siete apps de presupuesto para Francia, Quebec y Bélgica, cada una mejor para algo distinto: Bankin', Finary, Linxo, Monefy, Outlayr, Wallet by BudgetBakers y YNAB. Bankin' y Linxo sincronizan cuentas de bancos franceses; Monefy y Outlayr no se conectan a ninguno, así que funcionan igual en cualquier lugar. Outlayr es nuestra; las otras seis no.",
                    fr: "Sept applications de budget pour la France, le Québec et la Belgique, chacune meilleure pour un besoin : Bankin', Finary, Linxo, Monefy, Outlayr, Wallet by BudgetBakers et YNAB. Bankin' et Linxo synchronisent les comptes des banques françaises ; Monefy et Outlayr ne se connectent à aucune et fonctionnent donc partout. Outlayr est la nôtre ; les six autres non.",
                }),
                meta: {
                    description: t({
                        en: "Seven budget apps compared for France, Quebec, and Belgium: price in euros, bank sync, free plans, and French. Outlayr is ours; the other six are not.",
                        es: "Compara 7 apps de presupuesto para Francia, Quebec y Bélgica: precio en euros, sincronización bancaria, plan gratis y francés. Outlayr es nuestra.",
                        fr: "7 applications de budget comparées pour la France, le Québec et la Belgique : prix, synchro bancaire, offre gratuite. Outlayr est la nôtre.",
                    }),
                    title: t({
                        en: "Best Budget Apps in France and Quebec (2026) · Outlayr",
                        es: "Mejores apps de presupuesto en Francia y Quebec (2026) · Outlayr",
                        fr: "Meilleure application de gestion de budget 2026 · Outlayr",
                    }),
                },
                picked: [
                    t({
                        en: "Each app here is sold in France, and each fits a different need, from syncing French bank accounts to logging in two taps without connecting anything. For Quebec and Belgium, the bank rows say which countries each app's bank connection covers. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista se vende en Francia, y cada una sirve para algo distinto, desde sincronizar cuentas de bancos franceses hasta registrar en dos toques sin conectar nada. Para Quebec y Bélgica, las filas de banco dicen qué países cubre la conexión bancaria de cada app. Van en orden alfabético, no por puesto.",
                        fr: "Chaque app de cette liste est vendue en France, et chacune répond à un besoin différent, de la synchronisation des comptes de banques françaises à la saisie en deux touches sans rien connecter. Pour le Québec et la Belgique, les lignes bancaires indiquent les pays que couvre la connexion de chaque app. Elles sont classées par ordre alphabétique, pas par rang.",
                    }),
                    t({
                        en: "Every detail about the other apps was read on that app's own site, pricing page, or App Store listing on the date below the table, and links to the page it came from. Prices are in euros as each page shows them. These are the facts as each app states them, not results of our own testing. A feature a page does not mention is left out, not marked as missing.",
                        es: "Cada dato de las otras apps se leyó en el sitio, la página de precios o la ficha del App Store de esa app en la fecha que aparece bajo la tabla, y enlaza a la página de donde salió. Los precios están en euros, como los muestra cada página. Son los datos tal como los da cada app, no resultados de pruebas nuestras. Lo que una página no menciona se deja fuera, no se marca como faltante.",
                        fr: "Chaque information sur les autres apps a été lue sur le site, la page de tarifs ou la fiche App Store de l'app à la date indiquée sous le tableau, avec un lien vers la page d'origine. Les prix sont en euros, tels que chaque page les affiche. Ce sont les informations données par chaque app, pas des résultats de nos propres tests. Ce qu'une page ne mentionne pas est laissé de côté, pas marqué comme absent.",
                    }),
                    t({
                        en: "Outlayr is ours. It gets the same facts as the others, including its own Watch out for row.",
                        es: "Outlayr es nuestra. Tiene los mismos datos que las demás, incluida su propia fila de Ten en cuenta.",
                        fr: "Outlayr est la nôtre. Elle a les mêmes informations que les autres, y compris sa propre ligne Points d'attention.",
                    }),
                ],
                related: [
                    "/guides/expense-tracker-template",
                    "/tools/50-30-20-budget-calculator",
                    "/guides/best-budget-apps",
                ] satisfies PageRef[],
                sources: t({
                    en: "Each detail about the other apps links to the page it was read on",
                    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
                    fr: "Les informations sur les autres apps renvoient à la page où elles ont été lues",
                }),
                title: t({
                    en: "The best budget apps in France, Quebec, and Belgium",
                    es: "La mejor app de presupuesto en Francia, Quebec y Bélgica",
                    fr: "La meilleure application de budget en France, au Québec et en Belgique",
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
                                source: "https://actualbudget.org/docs/transactions/importing/",
                                text: t({
                                    en: "By hand, or CSV, QIF, OFX, QFX, or CAMT files",
                                    es: "A mano, o archivos CSV, QIF, OFX, QFX o CAMT",
                                }),
                            },
                            {
                                label: t({ en: "Bank sync", es: "Sincronización bancaria" }),
                                source: "https://actualbudget.org/docs/advanced/bank-sync/",
                                text: t({
                                    en: "Through a server you run and your own API keys, with Enable Banking in Europe, SimpleFIN in North America, Akahu in New Zealand, or Pluggy.ai in Brazil",
                                    es: "Con un servidor propio y tus propias claves de API, con Enable Banking en Europa, SimpleFIN en Norteamérica, Akahu en Nueva Zelanda o Pluggy.ai en Brasil",
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
                                source: "https://actualbudget.org/docs/faq/",
                                text: t({
                                    en: "A web app you install to the home screen, or an official iOS app in beta on TestFlight. There is no official Android app yet",
                                    es: "Una app web que instalas en la pantalla de inicio, o una app oficial para iOS en beta en TestFlight. Todavía no hay app oficial para Android",
                                }),
                            },
                            {
                                label: LABELS.license,
                                source: "https://github.com/actualbudget/actual/blob/master/LICENSE.txt",
                                text: t({
                                    en: "MIT",
                                    es: "MIT",
                                }),
                            },
                            {
                                label: t({ en: "Latest release", es: "Última versión" }),
                                source: "https://github.com/actualbudget/actual/releases/tag/v26.11.0",
                                text: t({
                                    en: "v26.11.0, November 2, 2026",
                                    es: "v26.11.0, 2 de noviembre de 2026",
                                }),
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
                                source: "https://github.com/jameskokoska/Cashew/issues/725#issuecomment-4362504635",
                                text: t({
                                    en: 'GPL-3.0 for the public repository, not for the current app. The maintainer wrote in May 2026: "For now, the production code will be not publicly available. Please note this is not a forever decision."',
                                    es: "GPL-3.0 para el repositorio público, no para la app actual. En mayo de 2026 su creador escribió que, por ahora, el código de producción no será público, y que no es una decisión para siempre",
                                }),
                            },
                            {
                                label: t({ en: "Latest release", es: "Última versión" }),
                                source: "https://apps.apple.com/us/app/cashew-expense-budget-tracker/id6463662930",
                                text: t({
                                    en: "5.10 on the App Store, October 22, 2026",
                                    es: "5.10 en el App Store, 22 de octubre de 2026",
                                }),
                            },
                            {
                                label: t({ en: "Public code", es: "Código público" }),
                                source: "https://github.com/jameskokoska/Cashew/commits/main/",
                                text: t({
                                    en: "Stops at version 5.4.3, with the last code change on October 9, 2024. Later commits only edit the README",
                                    es: "Llega hasta la versión 5.4.3, con el último cambio de código el 9 de octubre de 2024. Los commits posteriores solo editan el README",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://github.com/jameskokoska/Cashew/issues/725#issuecomment-4364354802",
                                text: t({
                                    en: "You can't read the code of the app you install, though the maintainer says its privacy policy and handling of data are unchanged. Some features are in Cashew Pro, a paid upgrade",
                                    es: "No puedes leer el código de la app que instalas, aunque su creador dice que su política de privacidad y el manejo de datos no cambiaron. Algunas funciones están en Cashew Pro, una mejora de pago",
                                }),
                            },
                        ],
                        name: "Cashew",
                        slug: "cashew",
                        summary: t({
                            en: "Cashew is an expense and budget tracker for iPhone, Android, and the web, free with an optional Pro. Its older code is public under GPL-3.0, but the code of the current app is not.",
                            es: "Cashew es una app de gastos y presupuesto para iPhone, Android y la web, gratis con un Pro opcional. Su código anterior es público con licencia GPL-3.0, pero el de la app actual no.",
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
                                source: "https://github.com/firefly-iii/firefly-iii/blob/main/LICENSE",
                                text: t({
                                    en: "AGPL-3.0",
                                    es: "AGPL-3.0",
                                }),
                            },
                            {
                                label: t({ en: "Latest release", es: "Última versión" }),
                                source: "https://github.com/firefly-iii/firefly-iii/releases/tag/v6.7.9",
                                text: t({
                                    en: "v6.7.9, October 11, 2026",
                                    es: "v6.7.9, 11 de octubre de 2026",
                                }),
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
                                source: "https://github.com/flow-mn/flow/blob/develop/LICENSE",
                                text: t({
                                    en: "GPL-3.0",
                                    es: "GPL-3.0",
                                }),
                            },
                            {
                                label: t({ en: "Latest release", es: "Última versión" }),
                                source: "https://github.com/flow-mn/flow/releases/tag/0.26.0",
                                text: t({
                                    en: "0.26.0, October 18, 2026. The App Store shows the same version as the code",
                                    es: "0.26.0, 18 de octubre de 2026. El App Store muestra la misma versión que el código",
                                }),
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
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/us/app/subscription-tracker-outlayr/id6801652978",
                                text: OUTLAYR.price,
                            },
                            { label: LABELS.entries, text: OUTLAYR.entries },
                            {
                                label: LABELS.currencies,
                                source: "https://github.com/danestves/outlayr/blob/main/packages/money/src/catalog.generated.ts",
                                text: OUTLAYR.currencies,
                            },
                            { label: LABELS.platforms, text: OUTLAYR.platforms },
                            {
                                label: LABELS.license,
                                source: "https://github.com/danestves/outlayr#license",
                                text: t({
                                    en: "GPL-3.0 app, AGPL-3.0 server",
                                    es: "App GPL-3.0, servidor AGPL-3.0",
                                }),
                            },
                            {
                                label: t({ en: "Latest release", es: "Última versión" }),
                                source: "https://apps.apple.com/us/app/subscription-tracker-outlayr/id6801652978",
                                text: t({
                                    en: "1.11.0 on the App Store, November 5, 2026. The repository has no tagged releases, so you can't match a store build to a commit",
                                    es: "1.11.0 en el App Store, 5 de noviembre de 2026. El repositorio no tiene versiones etiquetadas, así que no puedes vincular una versión de la tienda con un commit",
                                }),
                            },
                            {
                                label: t({ en: "Not in the code", es: "Fuera del código" }),
                                source: "https://github.com/danestves/outlayr#without-a-hugeicons-pro-license",
                                text: t({
                                    en: "The icons come from Hugeicons Pro, a paid package. Without a license, a build draws free icons, with a dashed circle for any the free set lacks, and type-checking and a few test suites still need the paid packages",
                                    es: "Los íconos vienen de Hugeicons Pro, un paquete de pago. Sin licencia, una compilación usa íconos gratis, con un círculo punteado para los que falten, y la revisión de tipos y algunas pruebas siguen necesitando los paquetes de pago",
                                }),
                            },
                            {
                                label: t({ en: "Your own server", es: "Servidor propio" }),
                                source: "https://github.com/danestves/outlayr#getting-started",
                                text: t({
                                    en: "The repository documents a local server for development, not a self-hosting guide, and the store apps connect only to Outlayr's servers. A build with no server has no sign-in, sync, exchange rates, or AI. If you want your own server, pick Actual Budget or Firefly III",
                                    es: "El repositorio documenta un servidor local para desarrollo, no una guía para alojarlo, y las apps de las tiendas solo se conectan a los servidores de Outlayr. Una compilación sin servidor no tiene inicio de sesión, sincronización, tasas de cambio ni IA. Si quieres tu propio servidor, elige Actual Budget o Firefly III",
                                }),
                            },
                            {
                                label: t({ en: "What leaves the phone", es: "Qué sale del celular" }),
                                source: t({
                                    en: "https://tryoutlayr.com/privacy",
                                    es: "https://tryoutlayr.com/es/privacy",
                                }),
                                text: t({
                                    en: "Without an account, your entries, amounts, and notes stay on the phone. Usage analytics and crash reports go to PostHog, on by default outside the EEA and UK, never with amounts, merchants, notes, or names. You can turn them off",
                                    es: "Sin una cuenta, tus registros, montos y notas se quedan en el celular. Las analíticas de uso y los reportes de fallas van a PostHog, activos por defecto fuera del EEE y el Reino Unido, nunca con montos, comercios, notas ni nombres. Puedes apagarlos",
                                }),
                            },
                            {
                                label: t({ en: "Importing", es: "Importación" }),
                                source: t({
                                    en: "https://tryoutlayr.com/privacy#csv-import",
                                    es: "https://tryoutlayr.com/es/privacy#importación-de-csv",
                                }),
                                text: t({
                                    en: "CSV files are read on the phone. With Pro and Smart fill, up to 200 descriptions it can't match go to Anthropic at a time, with runs of four or more digits removed. PDF statements, also Pro, are uploaded, read, and deleted. No OFX or QIF, which Actual Budget reads",
                                    es: "Los archivos CSV se leen en el celular. Con Pro y el autocompletado, hasta 200 descripciones que no reconoce van a Anthropic cada vez, sin las series de cuatro dígitos o más. Los estados de cuenta en PDF, también con Pro, se suben, se leen y se borran. No lee OFX ni QIF, que Actual Budget sí lee",
                                }),
                            },
                            {
                                label: t({ en: "Public numbers", es: "Números públicos" }),
                                source: t({ en: "https://tryoutlayr.com/open", es: "https://tryoutlayr.com/es/open" }),
                                text: t({
                                    en: "People, entries, and revenue, updated daily, each linked to the code that counts it",
                                    es: "Personas, registros e ingresos, actualizados a diario, cada uno enlazado al código que lo cuenta",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "Voice entry and receipt scans run on Outlayr's servers through Anthropic and ElevenLabs, and need an account. Typing works offline, but new exchange rates need a connection",
                                    es: "Dictar y escanear recibos pasa por los servidores de Outlayr, con Anthropic y ElevenLabs, y requiere una cuenta. Escribir funciona sin conexión, pero las tasas de cambio nuevas necesitan conexión",
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
                            en: "Best if you want one app on iPhone, Android, and the web, with CSV and Google Sheets import, and don't need to read its current code",
                            es: "Ideal si quieres una sola app en iPhone, Android y la web, con importación de CSV y Google Sheets, y no necesitas leer su código actual",
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
                            en: "It depends on where you want it to run. Flow is a phone app that works offline. Actual Budget runs on Windows, macOS, Linux, and the web, with envelope budgeting. Firefly III runs on your own server. Outlayr logs by sentence, voice, or receipt on iPhone and Android. All four publish the code of their current version and are free to start. Cashew is free too, but the code of its current app is no longer public.",
                            es: "Depende de dónde quieras usarla. Flow es una app para el celular que funciona sin conexión. Actual Budget funciona en Windows, macOS, Linux y la web, con presupuesto por sobres. Firefly III funciona en tu propio servidor. Outlayr registra con una oración, tu voz o un recibo en iPhone y Android. Las cuatro publican el código de su versión actual y son gratis para empezar. Cashew también es gratis, pero el código de su app actual ya no es público.",
                        }),
                        question: t({
                            en: "What is the best open source expense tracker?",
                            es: "¿Cuál es la mejor app de gastos de código abierto?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Flow and Outlayr are on the App Store with public code. Actual Budget has an official iOS app in beta on TestFlight, or a web app you install to the home screen. Firefly III works through apps made by third parties. Cashew is on the App Store too, but the code of its current app is not public.",
                            es: "Flow y Outlayr están en el App Store con código público. Actual Budget tiene una app oficial para iOS en beta en TestFlight, o una app web que instalas en la pantalla de inicio. Firefly III funciona con apps hechas por terceros. Cashew también está en el App Store, pero el código de su app actual no es público.",
                        }),
                        question: t({
                            en: "Which open source expense tracker works on iPhone?",
                            es: "¿Qué app de gastos de código abierto funciona en iPhone?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Only in part. Its public repository is still GPL-3.0, but the code stops at version 5.4.3, last changed on October 9, 2024, while the App Store has 5.10. In May 2026 its maintainer said the production code will not be public for now, and that this is not a forever decision.",
                            es: "Solo en parte. Su repositorio público sigue con licencia GPL-3.0, pero el código llega hasta la versión 5.4.3, con su último cambio el 9 de octubre de 2024, mientras que el App Store tiene la 5.10. En mayo de 2026 su creador dijo que, por ahora, el código de producción no será público, y que no es una decisión para siempre.",
                        }),
                        question: t({
                            en: "Is Cashew still open source?",
                            es: "¿Cashew sigue siendo de código abierto?",
                        }),
                    },
                    { answer: OPEN_SOURCE_ANSWER, question: OPEN_SOURCE_QUESTION },
                    COST_FAQ,
                ],
                lead: t({
                    en: "Four open source expense trackers whose current code anyone can read, each best for a different need: Actual Budget, Firefly III, Flow, and Outlayr. Cashew is here too, because its public repository is GPL-3.0, but the code of its current app is no longer public. Outlayr is ours; the others are not.",
                    es: "Cuatro apps de gastos de código abierto cuyo código actual cualquiera puede leer, cada una mejor para algo distinto: Actual Budget, Firefly III, Flow y Outlayr. Cashew también aparece porque su repositorio público tiene licencia GPL-3.0, pero el código de su app actual ya no es público. Outlayr es nuestra; las demás no.",
                }),
                meta: {
                    description: t({
                        en: "Actual Budget, Firefly III, Flow, and Outlayr compared on license, latest release, and platforms, plus what changed at Cashew. Outlayr is ours.",
                        es: "Actual Budget, Firefly III, Flow y Outlayr comparadas en licencia, última versión y plataformas, y qué cambió en Cashew. Outlayr es nuestra.",
                    }),
                    title: t({
                        en: "Best Open Source Expense Tracker Apps (2026) · Outlayr",
                        es: "Mejores apps de gastos de código abierto (2026) · Outlayr",
                    }),
                },
                picked: [
                    t({
                        en: "Four apps here publish the code of their current version under an open source license, and each one fits a different need, from a phone app that works offline to a server you run yourself. Cashew's rows explain why it is the exception. They are in alphabetical order, not ranked.",
                        es: "Cuatro apps de esta lista publican el código de su versión actual con una licencia de código abierto, y cada una sirve para algo distinto, desde una app para el celular que funciona sin conexión hasta un servidor que manejas tú. Las filas de Cashew explican por qué es la excepción. Van en orden alfabético, no por puesto.",
                    }),
                    t({
                        en: "On the date below the table, we read each app's license, latest release, and commit history on GitHub, compared the version in the code with the App Store where an app is sold there, and read its docs and site. Each row links to the page it came from, so you can repeat the check. These are the facts as each app publishes them, not results of our own testing.",
                        es: "En la fecha que aparece bajo la tabla, leímos la licencia, la última versión y el historial de commits de cada app en GitHub, comparamos la versión del código con la del App Store cuando la app está ahí, y leímos su documentación y su sitio. Cada fila enlaza a la página de donde salió, para que puedas repetir la revisión. Son los datos tal como los publica cada app, no resultados de pruebas nuestras.",
                    }),
                    t({
                        en: "Outlayr is ours. It gets the same facts as the others, plus what isn't open and what leaves the phone, each linked to the code or policy behind it.",
                        es: "Outlayr es nuestra. Tiene los mismos datos que las demás, además de lo que no es abierto y lo que sale del celular, cada uno enlazado al código o la política que lo respalda.",
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
                    en: "The best open source expense trackers, by what you need",
                    es: "La mejor app de gastos de código abierto, según lo que necesitas",
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
                                    en: "Free to start, with in-app purchases from $0.99 to $2.99 in the US App Store, including one that unlocks a subscription limit",
                                    es: "Gratis para empezar, con compras dentro de la app de US$0.99 a US$2.99 en el App Store de EE. UU., entre ellas una que desbloquea un límite de suscripciones",
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
                                label: t({ en: "Privacy", es: "Privacidad" }),
                                source: "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
                                text: t({
                                    en: "Its listing describes no bank or email connection. It says the app may collect identifiers, purchase history, usage data, and diagnostics",
                                    es: "Su ficha no describe ninguna conexión con el banco ni con el correo. Dice que la app puede recopilar identificadores, historial de compras, datos de uso y diagnósticos",
                                }),
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
                                label: t({ en: "Privacy", es: "Privacidad" }),
                                source: "https://www.monarch.com/pricing",
                                text: t({
                                    en: "Holds your transaction history from linked accounts. Monarch says it never sells your financial data",
                                    es: "Guarda el historial de movimientos de tus cuentas vinculadas. Monarch dice que nunca vende tus datos financieros",
                                }),
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
                                label: t({ en: "Privacy", es: "Privacidad" }),
                                text: t({
                                    en: "No bank or inbox link. Your ledger stays on the phone unless you turn on sync or use a server feature such as voice or receipt capture",
                                    es: "No se conecta al banco ni al correo. Tu registro se queda en el teléfono, salvo que actives la sincronización o uses una función del servidor, como registrar por voz o con un recibo",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "It doesn't find subscriptions for you, cancel them, or negotiate bills. Each charge logs the amount you entered, so it won't notice a price change or a failed payment",
                                    es: "No encuentra suscripciones por ti, no las cancela ni negocia facturas. Cada cobro registra el monto que pusiste, así que no notará si sube el precio o si falla un pago",
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
                                source: "https://apps.apple.com/us/app/pocketguard-budget-app/id949414211",
                                text: t({
                                    en: "$12.99 a month or $74.99 a year in the US App Store, after a 7-day trial",
                                    es: "US$12.99 al mes o US$74.99 al año en el App Store de EE. UU., después de una prueba de 7 días",
                                }),
                            },
                            {
                                label: t({ en: "Pay once", es: "Pago único" }),
                                source: "https://pocketguard.com/pricing/",
                                text: t({
                                    en: "Its site offers some customers a one-time plan, priced by country",
                                    es: "Su sitio les ofrece a algunos clientes un plan de pago único, con precio según el país",
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
                                    en: "Linked accounts at institutions in the US, Canada, and the UK",
                                    es: "Cuentas vinculadas de instituciones en EE. UU., Canadá y Reino Unido",
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
                                label: t({ en: "Privacy", es: "Privacidad" }),
                                source: "https://pocketguard.com/security/",
                                text: t({
                                    en: "Reads your transactions through Plaid, Finicity, or Salt Edge with read-only access. PocketGuard says it can't move money and doesn't sell your data",
                                    es: "Lee tus movimientos a través de Plaid, Finicity o Salt Edge con acceso de solo lectura. PocketGuard dice que no puede mover dinero y que no vende tus datos",
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
                                    en: "Its team negotiates bills on Premium+, at no additional cost beyond the $15 a month",
                                    es: "Su equipo negocia tus facturas con Premium+, sin costo adicional a los US$15 al mes",
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
                                label: t({ en: "Privacy", es: "Privacidad" }),
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "Connects through Plaid and holds your transaction history. Rocket Money says your bank credentials are never stored on its servers",
                                    es: "Se conecta a través de Plaid y guarda el historial de tus movimientos. Rocket Money dice que tus credenciales del banco nunca se guardan en sus servidores",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost",
                                text: t({
                                    en: "Only in the United States, the free plan leaves out cancellation and upcoming bills, and manual transactions need Premium",
                                    es: "Solo en Estados Unidos, el plan gratis no incluye la cancelación ni los pagos próximos, y los movimientos a mano requieren Premium",
                                }),
                            },
                        ],
                        name: "Rocket Money",
                        slug: "rocket-money",
                        summary: t(RIVALS.rocketMoney),
                    },
                    {
                        facts: [
                            {
                                label: LABELS.price,
                                source: "https://apps.apple.com/us/app/id6758765733",
                                text: t({
                                    en: "Free for up to 5 subscriptions. Pro is $4.99 a month, $14.99 a year, or $24.99 once in the US App Store",
                                    es: "Gratis hasta 5 suscripciones. Pro cuesta US$4.99 al mes, US$14.99 al año o US$24.99 en un solo pago en el App Store de EE. UU.",
                                }),
                            },
                            {
                                label: LABELS.entries,
                                source: "https://apps.apple.com/us/app/id6758765733",
                                text: t({
                                    en: "Imported from Gmail receipts, your App Store subscriptions, or a bank statement file. Statement import is a Pro feature",
                                    es: "Se importan desde recibos de Gmail, tus suscripciones del App Store o un archivo de estado de cuenta. Importar estados de cuenta es una función Pro",
                                }),
                            },
                            {
                                label: LABELS.subscriptions,
                                source: "https://apps.apple.com/us/app/id6758765733",
                                text: t({
                                    en: "Monthly and yearly totals, a bill calendar, reminders, and cancellation steps. You cancel each one yourself",
                                    es: "Totales al mes y al año, un calendario de cobros, avisos y pasos para cancelar. Tú cancelas cada una",
                                }),
                            },
                            {
                                label: LABELS.platforms,
                                source: "https://apps.apple.com/us/app/id6758765733",
                                text: t({ en: "iPhone, iPad", es: "iPhone, iPad" }),
                            },
                            {
                                label: t({ en: "Privacy", es: "Privacidad" }),
                                source: "https://apps.apple.com/us/app/id6758765733",
                                text: t({
                                    en: "Data stays on your device, with optional iCloud sync. Statements and receipts you import go to a service that reads them. Its privacy label says purchase history and identifiers may be used for third-party advertising",
                                    es: "Los datos se quedan en tu dispositivo, con sincronización opcional en iCloud. Los estados de cuenta y recibos que importas van a un servicio que los lee. Su etiqueta de privacidad dice que el historial de compras y los identificadores pueden usarse para publicidad de terceros",
                                }),
                            },
                            {
                                label: LABELS.watch,
                                source: "https://apps.apple.com/us/app/id6758765733",
                                text: t({
                                    en: "Apple devices only, 5 subscriptions on the free plan, and imported receipts or statements leave your device",
                                    es: "Solo para dispositivos Apple, 5 suscripciones en el plan gratis, y los recibos o estados de cuenta que importas salen de tu dispositivo",
                                }),
                            },
                        ],
                        name: "Subcut",
                        slug: "subcut",
                        summary: t({
                            en: "Subcut is an iPhone and iPad app that finds subscriptions in your Gmail receipts or a bank statement file, without linking a bank.",
                            es: "Subcut es una app para iPhone y iPad que encuentra suscripciones en tus recibos de Gmail o en un archivo de estado de cuenta, sin vincular un banco.",
                        }),
                    },
                ],
                facts: [
                    {
                        label: "Bobby",
                        text: t({
                            en: "Best if you know what you pay for and want a plain list on iPhone, with no bank or email connection",
                            es: "Ideal si ya sabes lo que pagas y quieres una lista simple en iPhone, sin conectar el banco ni el correo",
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
                    {
                        label: "Subcut",
                        text: t({
                            en: "Best if you use Gmail on an iPhone or iPad and want subscriptions found without linking a bank",
                            es: "Ideal si usas Gmail en iPhone o iPad y quieres que encuentre tus suscripciones sin vincular un banco",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on whether you need the app to find your subscriptions. PocketGuard, Monarch, and Rocket Money find them in linked accounts, and in the United States Rocket Money's team can also cancel them on Premium. Subcut finds them in Gmail receipts or a statement file. Bobby and Outlayr work from a list you add yourself, and Outlayr logs each charge next to your daily spending.",
                            es: "Depende de si necesitas que la app encuentre tus suscripciones. PocketGuard, Monarch y Rocket Money las encuentran en tus cuentas vinculadas, y en Estados Unidos el equipo de Rocket Money también puede cancelarlas con Premium. Subcut las encuentra en recibos de Gmail o en un archivo de estado de cuenta. Bobby y Outlayr funcionan con una lista que agregas tú, y Outlayr registra cada cobro junto a tus gastos diarios.",
                        }),
                        question: t({
                            en: "What is the best app to track subscriptions?",
                            es: "¿Cuál es la mejor app para gestionar suscripciones?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes, with limits. Outlayr's subscriptions, reminders, and Upcoming are on its free plan, but you add each subscription yourself. Rocket Money's free plan finds subscriptions in the United States but leaves out upcoming bills and cancellation. Subcut is free for up to 5 subscriptions, and Bobby is free to start with paid unlocks. PocketGuard and Monarch are paid after a 7-day trial.",
                            es: "Sí, con límites. En Outlayr, las suscripciones, los avisos y Próximos son parte del plan gratis, pero agregas tú cada suscripción. El plan gratis de Rocket Money encuentra suscripciones en Estados Unidos, pero no incluye los pagos próximos ni la cancelación. Subcut es gratis hasta 5 suscripciones, y Bobby es gratis para empezar, con funciones de pago. PocketGuard y Monarch son de pago después de una prueba de 7 días.",
                        }),
                        question: t({
                            en: "Is there a free subscription tracker app?",
                            es: "¿Hay una app gratis para controlar suscripciones?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Bobby and Outlayr work from a list you add yourself, and Subcut can read Gmail receipts or a statement file instead. The apps that find subscriptions in linked accounts are Rocket Money, Monarch, and PocketGuard.",
                            es: "No. Bobby y Outlayr funcionan con una lista que agregas tú, y Subcut puede leer recibos de Gmail o un archivo de estado de cuenta. Las apps que encuentran suscripciones en cuentas vinculadas son Rocket Money, Monarch y PocketGuard.",
                        }),
                        question: t({
                            en: "Do I have to link my bank to track subscriptions?",
                            es: "¿Tengo que vincular mi banco para controlar suscripciones?",
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
                            en: "Rocket Money is available in the United States only, and Monarch in the United States and Canada. PocketGuard links accounts in the US, Canada, and the UK. If your bank is elsewhere, use an app that doesn't link one: Bobby, Subcut, or Outlayr, which comes in English, Spanish, Portuguese, and French. Check your app store to confirm it's offered in your country.",
                            es: "Rocket Money solo está disponible en Estados Unidos, y Monarch en Estados Unidos y Canadá. PocketGuard vincula cuentas de EE. UU., Canadá y Reino Unido. Si tu banco está en otro país, usa una app que no lo vincule: Bobby, Subcut u Outlayr, que está en inglés, español, portugués y francés. Revisa tu tienda de apps para confirmar que se ofrece en tu país.",
                        }),
                        question: t({
                            en: "Which subscription trackers work outside the United States?",
                            es: "¿Qué apps de suscripciones funcionan fuera de Estados Unidos?",
                        }),
                    },
                ],
                lead: t({
                    en: "The best subscription tracker depends on how you want charges found. To catch the ones you forgot, link a bank with Rocket Money (US only), Monarch, or PocketGuard, or read your Gmail receipts with Subcut. To share neither, keep your own list in Bobby or Outlayr. Outlayr is ours, and it doesn't find subscriptions for you, cancel them, or negotiate bills.",
                    es: "La mejor app para controlar suscripciones depende de cómo quieres encontrar los cobros. Para dar con los que olvidaste, vincula tu banco con Rocket Money (solo en EE. UU.), Monarch o PocketGuard, o lee tus recibos de Gmail con Subcut. Para no compartir ninguno de los dos, lleva tu propia lista en Bobby o en Outlayr. Outlayr es nuestra, y no encuentra suscripciones por ti, no las cancela ni negocia facturas.",
                }),
                meta: {
                    description: t({
                        en: "Six subscription tracker apps compared by how they find charges: bank link, Gmail receipts, or your own list. Prices, free plans, and privacy. Outlayr is ours.",
                        es: "Seis apps de suscripciones según cómo encuentran los cobros: banco, recibos de Gmail o tu propia lista. Precios, planes gratis y privacidad. Outlayr es nuestra.",
                    }),
                    title: t({
                        en: "Best Subscription Tracker Apps (2026), Free and Paid · Outlayr",
                        es: "Mejores apps de suscripciones (2026), gratis y de pago · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "Bank-linked apps read your transactions and look for charges that repeat, so they catch subscriptions you forgot, whichever card pays them. Rocket Money, Monarch, and PocketGuard work this way. Rocket Money can find them for free in the United States; Monarch and PocketGuard cost $74.99 to $99.99 a year. The tradeoff is that the app and its data provider see your transaction history, and your bank has to be supported, which here means the US, Canada, or the UK.",
                                es: "Las apps que se vinculan al banco leen tus movimientos y buscan cobros que se repiten, así que encuentran las suscripciones que olvidaste, sin importar con qué tarjeta las pagas. Rocket Money, Monarch y PocketGuard funcionan así. Rocket Money puede encontrarlas gratis en Estados Unidos; Monarch y PocketGuard cuestan de US$74.99 a US$99.99 al año. A cambio, la app y su proveedor de datos ven el historial de tus movimientos, y tu banco tiene que estar soportado, lo que aquí significa EE. UU., Canadá o Reino Unido.",
                            }),
                            t({
                                en: "Email-based apps read receipts and confirmation emails instead, so you don't share bank access. Subcut does this with Gmail and is free for up to 5 subscriptions. The tradeoff is that you give the app access to your inbox, and it can only find what sent a receipt to that address.",
                                es: "Las apps que leen el correo revisan recibos y correos de confirmación, así que no compartes el acceso a tu banco. Subcut lo hace con Gmail y es gratis hasta 5 suscripciones. A cambio, le das a la app acceso a tu correo, y solo encuentra lo que mandó un recibo a esa dirección.",
                            }),
                            t({
                                en: "Manual lists like Bobby and Outlayr need no connection and work with any bank, in any country, for free or a few dollars. They share the least, but you have to know what you pay for and type it in, and a price change won't show up until you edit it.",
                                es: "Las listas manuales como Bobby y Outlayr no necesitan ninguna conexión y sirven con cualquier banco, en cualquier país, gratis o por pocos dólares. Son las que menos datos comparten, pero tienes que saber lo que pagas y escribirlo, y un cambio de precio no aparece hasta que lo edites.",
                            }),
                            t({
                                en: "Not sure what you're paying for? Start free: your Apple account and Google Play each list the subscriptions billed through them, though not the ones charged straight to your card. If that leaves gaps, a statement or an app that finds charges will fill them. If you already know your list, a manual app is enough.",
                                es: "¿No sabes bien qué estás pagando? Empieza gratis: tu cuenta de Apple y Google Play muestran las suscripciones que se cobran a través de ellas, pero no las que se cargan directo a tu tarjeta. Si te faltan algunas, un estado de cuenta o una app que encuentre los cobros las completa. Si ya conoces tu lista, te basta con una app manual.",
                            }),
                        ],
                        id: t({ en: "how-to-choose", es: "como-elegir" }),
                        title: t({
                            en: "How to choose: bank link, email, or manual list",
                            es: "Cómo elegir: banco, correo o lista manual",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "List every charge from your last two or three card statements, your email receipts, and your App Store or Google Play subscriptions. Turn each price into a yearly cost: a weekly charge counts 52 times, a monthly one 12, one every 3 months 4, and a yearly one once. Add them up and divide by 12 for the monthly figure.",
                                es: "Anota cada cobro de tus últimos dos o tres estados de cuenta, tus recibos por correo y tus suscripciones del App Store o de Google Play. Convierte cada precio en un costo anual: un cobro semanal cuenta 52 veces, uno mensual 12, uno cada 3 meses 4 y uno anual una vez. Súmalos y divide entre 12 para tener la cifra mensual.",
                            }),
                            t({
                                en: "For example, $15 a month, $120 a year, and $5 a week come to $560 a year, or $46.67 a month. The subscription cost calculator linked below does this math for you, and nothing you type leaves your browser.",
                                es: "Por ejemplo, US$15 al mes, US$120 al año y US$5 a la semana suman US$560 al año, o US$46.67 al mes. La calculadora de suscripciones que está enlazada abajo hace esta cuenta por ti, y nada de lo que escribes sale de tu navegador.",
                            }),
                        ],
                        id: t({ en: "how-much-you-spend", es: "cuanto-gastas" }),
                        title: t({
                            en: "How much am I spending on subscriptions?",
                            es: "¿Cuánto gasto en suscripciones?",
                        }),
                    },
                ],
                picked: [
                    t({
                        en: "Each app here shows what your subscriptions cost, and they differ in how the subscriptions get in: from linked accounts, from email or files, or by hand. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista te muestra cuánto cuestan tus suscripciones, y se diferencian en cómo entran: desde cuentas vinculadas, desde el correo o archivos, o a mano. Van en orden alfabético, no por puesto.",
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
                    "/tools/subscription-cost-calculator",
                    "/guides/subscription-tracker",
                    "/compare/rocket-money",
                ] satisfies PageRef[],
                sources: t({
                    en: "Each detail about the other apps links to the page it was read on",
                    es: "Los datos de las otras apps enlazan a la página donde se leyeron",
                }),
                title: t({
                    en: "The best subscription tracker apps, by what you need",
                    es: "Las mejores apps para controlar suscripciones, según lo que necesitas",
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
                more: [
                    {
                        body: [
                            t({
                                en: "Outlayr's budget planner starts from what you already spend. Each category without a budget shows what you typically spend there, and as you drag to set a limit, Outlayr replays your last period against it: whether it would have held and with how much to spare, or the day you would have run out.",
                                es: "La app de presupuesto mensual de Outlayr parte de lo que ya gastas. Cada categoría sin presupuesto muestra lo que gastas normalmente ahí, y mientras arrastras para poner un límite, Outlayr repasa tu último período con ese límite: si te habría alcanzado y con cuánto de sobra, o el día en que se te habría acabado.",
                            }),
                            t({
                                en: "A budget can cover one category or everything, for a day, a week, a month, or a year. If you start one partway through a period, Outlayr tells you how much is already spent, so you know if you begin over. Not sure where to start? The 50/30/20 calculator splits your take home pay into needs, wants, and savings.",
                                es: "Un presupuesto puede cubrir una categoría o todo, por un día, una semana, un mes o un año. Si empiezas uno a mitad de un período, Outlayr te dice cuánto llevas gastado, para que sepas si empiezas por encima. ¿No sabes por dónde empezar? La calculadora 50/30/20 reparte tu sueldo neto entre necesidades, gustos y ahorro.",
                            }),
                        ],
                        id: "limit",
                        title: t({
                            en: "Pick a limit from your own numbers",
                            es: "Elige un límite con tus propios números",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "Each budget shows what is left, what is left each day, and the share already spent. When your pace runs ahead of the limit, it says so in plain words, like still solvent, but on this pace the period ends $319 short. If the money already ran out, it shows the day and how many days early.",
                                es: "Cada presupuesto muestra lo que queda, lo que queda por día y cuánto llevas gastado. Cuando tu ritmo va por delante del límite, te lo dice en palabras simples, por ejemplo todavía te alcanza, pero a este ritmo te van a faltar $319 al final del período. Si el dinero ya se acabó, te muestra el día y cuántos días antes.",
                            }),
                            t({
                                en: "The overall budget also names the category that took the biggest share, so you know where to look first.",
                                es: "El presupuesto general también te dice qué categoría se llevó la mayor parte, para que sepas dónde mirar primero.",
                            }),
                        ],
                        id: "pace",
                        title: t({
                            en: "Read the pace, not just what's left",
                            es: "Mira el ritmo, no solo lo que queda",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "Turn on carry-over and what you don't spend is added to the next period, while what you overspend is taken off it, so a quiet month gives you room in the next one. Turning it off later drops what was carried in.",
                                es: "Activa Acumular lo que sobre y lo que no gastes se suma al período siguiente, y lo que te pases se le resta, así que un mes tranquilo te da margen en el siguiente. Si lo desactivas después, se pierde lo acumulado.",
                            }),
                            t({
                                en: "If you're paid on the 15th, set your month to start on the 15th in Settings, under Time frames, and budgets and insights run from payday to payday. The free plan includes 2 category budgets plus the overall one; Outlayr Pro has no limit.",
                                es: "Si te pagan el 15, pon que tu mes empiece el 15 en Configuración, en Períodos de tiempo, y los presupuestos y las estadísticas corren de un día de pago al siguiente. El plan gratis incluye 2 presupuestos por categoría además del general; Outlayr Pro no tiene límite.",
                            }),
                        ],
                        id: "payday",
                        title: t({ en: "Carry-over and payday", es: "Acumular y el día de pago" }),
                    },
                    {
                        body: [
                            t({
                                en: "Use one overall budget if you want a single number for the month, or category budgets for the places where money leaks, like Dining Out or Subscriptions. They work together: the overall budget counts everything, and each category budget counts only its own entries.",
                                es: "Usa un presupuesto general si quieres un solo número para el mes, o presupuestos por categoría para donde se te va el dinero, como Restaurantes o Suscripciones. Funcionan juntos: el general cuenta todo, y cada presupuesto por categoría cuenta solo sus registros.",
                            }),
                            t({
                                en: "Budgets update as you log, whether you type a sentence, say it, scan a receipt, or import a CSV, and subscriptions count on the day they charge. Transfers between your own accounts never count as spending. Changing a limit applies to the current period, and past periods stay as they were.",
                                es: "Los presupuestos se actualizan mientras registras, ya sea que escribas una oración, la dictes, escanees un recibo o importes un CSV, y las suscripciones cuentan el día que te cobran. Las transferencias entre tus propias cuentas nunca cuentan como gasto. Cambiar un límite aplica al período actual, y los períodos anteriores quedan como estaban.",
                            }),
                        ],
                        id: "kinds",
                        title: t({
                            en: "One overall budget, or one per category",
                            es: "Un presupuesto general, o uno por categoría",
                        }),
                    },
                ],
                plateAlt: BUDGETS_SCREEN_ALT,
                related: [
                    "/guides/best-budget-apps",
                    "/tools/50-30-20-budget-calculator",
                    "/tools/installment-calculator",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "In Balances, under Categories, pick a category or set one limit for the month. Categories without a budget show what you typically spend.",
                            es: "En Saldos, en Categorías, elige una categoría o pon un límite para el mes. Las categorías sin presupuesto muestran lo que gastas normalmente.",
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
                            en: "If this pace runs past the limit, Outlayr says by how much, or the day the money ran out.",
                            es: "Si este ritmo pasa el límite, Outlayr te dice por cuánto, o el día en que se acabó el dinero.",
                        }),
                        title: t({ en: "Read the pace", es: "Mira el ritmo" }),
                    },
                ],
                title: t({
                    en: "Plan a budget and see where this pace ends",
                    es: "Arma tu presupuesto y ve a dónde te lleva este ritmo",
                }),
            },
            "how-to-pay-cashea": {
                facts: [
                    {
                        label: t({ en: "How you pay", es: "Cómo pagas" }),
                        source: "https://intercom.help/cashea/es/articles/6198516-como-funciona-el-pago-inicial",
                        text: t({
                            en: "An upfront payment when you buy, then equal installments with no interest",
                            es: "Una inicial al comprar y luego cuotas iguales sin interés",
                        }),
                    },
                    {
                        label: t({ en: "Due", es: "Vencimiento" }),
                        source: "https://intercom.help/cashea/es/articles/6602490-cuando-vence-mi-proxima-cuota",
                        text: t({
                            en: "Every 14 days from the day you bought",
                            es: "Cada 14 días desde el día de la compra",
                        }),
                    },
                    {
                        label: t({ en: "Methods", es: "Métodos" }),
                        source: "https://intercom.help/cashea/es/articles/8076020-metodos-de-pago",
                        text: t({
                            en: "Pago Móvil, a bank transfer in bolívares, or a deposit in bolívares or dollars",
                            es: "Pago Móvil, transferencia bancaria en bolívares, o depósito en bolívares o dólares",
                        }),
                    },
                    {
                        label: t({ en: "Where", es: "Dónde" }),
                        source: "https://intercom.help/cashea/es/articles/8526831-como-pagar-por-la-app",
                        text: t({
                            en: "Only to the account the app shows for that installment",
                            es: "Solo a la cuenta que te muestra la app para esa cuota",
                        }),
                    },
                    {
                        label: t({ en: "Reporting", es: "Reporte" }),
                        source: "https://intercom.help/cashea/es/articles/15330725-como-puedo-reportar-el-pago-por-la-app",
                        text: t({
                            en: "Ya pagué, then the date, amount, reference, and receipt. A Pago Móvil from Banesco counts as Transferencia",
                            es: "Ya pagué, luego la fecha, el monto, la referencia y el comprobante. Un Pago Móvil desde Banesco va como Transferencia",
                        }),
                    },
                    {
                        label: t({ en: "One purchase per payment", es: "Una compra por pago" }),
                        source: "https://intercom.help/cashea/es/articles/8526826-como-encuentro-los-datos-de-pago",
                        text: t({
                            en: "One payment can't cover installments from different purchases",
                            es: "Un pago no puede cubrir cuotas de compras diferentes",
                        }),
                    },
                    {
                        label: t({ en: "Paying early", es: "Adelantar" }),
                        source: "https://intercom.help/cashea/es/articles/6602906-puedo-pagar-mis-cuotas-por-adelantado",
                        text: t({
                            en: "Pay early or in part, in the app, as long as each installment is whole by its due date",
                            es: "Adelanta o abona parte, por la app, siempre que cada cuota esté completa en su vencimiento",
                        }),
                    },
                    {
                        label: t({ en: "Number of installments", es: "Número de cuotas" }),
                        source: "https://intercom.help/cashea/es/articles/6602447-puedo-elegir-el-numero-de-cuotas",
                        text: t({
                            en: "Set by the product, not by you. The app shows it",
                            es: "Lo define el producto, no tú. La app te lo muestra",
                        }),
                    },
                    {
                        label: t({ en: "Upfront payment", es: "Inicial" }),
                        source: "https://intercom.help/cashea/es/articles/6198516-como-funciona-el-pago-inicial",
                        text: t({
                            en: "From 60% at Level 1, lower as your level rises",
                            es: "Desde 60% en el Nivel 1, menos a medida que subes de nivel",
                        }),
                    },
                    {
                        label: t({ en: "Late", es: "Atraso" }),
                        source: "https://intercom.help/cashea/es/articles/8526833-atraso-y-periodo-de-gracia",
                        text: t({
                            en: "2 days of grace, then $4 per late installment, and your purchase line is blocked until you pay",
                            es: "2 días de gracia, luego $4 por cada cuota vencida, y tu línea de compra queda bloqueada hasta que pagues",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "In the Cashea app. Tap Mis Compras or the calendar under it, pick the installment under Próximos pagos or Pagar, and pay with one of the methods the app shows, to the account it shows. Then tap Ya pagué, enter the date, the amount, and the reference number, and upload a photo of the receipt.",
                            es: "En la app de Cashea. Toca Mis Compras o el calendario de abajo, elige la cuota en Próximos pagos o Pagar, y paga con uno de los métodos que te muestra la app, a la cuenta que te muestra. Después toca Ya pagué, escribe la fecha, el monto y el número de referencia, y sube una foto del comprobante.",
                        }),
                        question: t({
                            en: "How do I pay a Cashea installment?",
                            es: "¿Cómo pago una cuota de Cashea?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Pago Móvil, a bank transfer in bolívares, or a deposit in bolívares or dollars. The methods available depend on the store you bought from. For an in-store purchase, the upfront payment is made at the register with whatever the store accepts.",
                            es: "Pago Móvil, transferencia bancaria en bolívares, o depósito en bolívares o dólares. Los métodos disponibles dependen de la tienda donde compraste. En una compra en tienda física, la inicial se paga en caja con lo que acepte la tienda.",
                        }),
                        question: t({
                            en: "What payment methods does Cashea take?",
                            es: "¿Qué métodos de pago acepta Cashea?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. You can pay installments early, or pay part of one, as long as the whole installment is paid by its due date. Early payments are made only in the app.",
                            es: "Sí. Puedes adelantar cuotas o abonar parte de una, siempre que la cuota completa esté pagada en su fecha de vencimiento. Los adelantos se hacen solo por la app.",
                        }),
                        question: t({
                            en: "Can I pay Cashea installments early?",
                            es: "¿Puedo adelantar cuotas de Cashea?",
                        }),
                    },
                    {
                        answer: t({
                            en: "You have 2 extra days with no charge. After that, Cashea charges $4 for each late installment and blocks your purchase line until you catch up. Being late can also cost you points and your level.",
                            es: "Tienes 2 días adicionales sin cargo. Después, Cashea cobra $4 por cada cuota vencida y bloquea tu línea de compra hasta que te pongas al día. Atrasarte también te puede costar puntos y tu nivel.",
                        }),
                        question: t({
                            en: "What happens if I pay Cashea late?",
                            es: "¿Qué pasa si pago tarde una cuota de Cashea?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. There is one plan: an upfront payment and then installments. How many installments depends on the product, and the app shows it before you buy.",
                            es: "No. Hay una sola modalidad: una inicial y luego un plan de cuotas. Cuántas cuotas depende del producto, y la app te lo muestra antes de comprar.",
                        }),
                        question: t({
                            en: "Can I choose how many Cashea installments to pay?",
                            es: "¿Puedo elegir en cuántas cuotas pago en Cashea?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Outlayr is not affiliated with Cashea and does not take payments for it. It keeps track of your Cashea purchases next to the rest of your spending: the upfront payment, each installment, any late fee, and a reminder the day before each one is due.",
                            es: "No. Outlayr no está afiliada a Cashea y no recibe pagos para ella. Lleva tus compras de Cashea junto al resto de tus gastos: la inicial, cada cuota, los recargos por atraso y un aviso el día antes de cada pago.",
                        }),
                        question: t({
                            en: "Can I pay Cashea from Outlayr?",
                            es: "¿Puedo pagar Cashea desde Outlayr?",
                        }),
                    },
                ],
                lead: t({
                    en: "Cashea charges an upfront payment when you buy and the rest in installments with no interest, due every 14 days. You pay each one in the Cashea app with Pago Móvil, a transfer, or a deposit, to the account the app shows, and then report it with its reference number.",
                    es: "Cashea cobra una inicial al comprar y el resto en cuotas sin intereses que vencen cada 14 días. Cada una la pagas desde la app de Cashea con Pago Móvil, transferencia o depósito, a la cuenta que te muestra la app, y luego la reportas con su número de referencia.",
                }),
                meta: {
                    description: t({
                        en: "How to pay a Cashea installment step by step: payment methods, reporting the reference, paying early, and what a late payment costs, from Cashea's own help center.",
                        es: "Cómo pagar una cuota de Cashea paso a paso: métodos de pago, cómo reportar la referencia, adelantar cuotas y cuánto cuesta un atraso, según el centro de ayuda de Cashea.",
                    }),
                    title: t({
                        en: "How to Pay Cashea: Installments, Methods, and Late Fees · Outlayr",
                        es: "Cómo pagar Cashea: cuotas, métodos de pago y atrasos · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "After you pay, tap Ya pagué and then Sí, continuar. If the app asks for the payment details, enter the number you paid from, the date, and the reference digits, then upload the receipt with Subir comprobante.",
                                es: "Después de pagar, toca Ya pagué y luego Sí, continuar. Si la app te pide los datos del pago, escribe el número desde donde pagaste, la fecha y los dígitos de la referencia, y sube el comprobante con Subir comprobante.",
                            }),
                            t({
                                en: "On a cash deposit receipt from the bank, the number to report is the Serial, not the reference. On a Banco de Venezuela receipt it is the Operación number. A Pago Móvil sent from a Banesco account is reported as Transferencia.",
                                es: "En el comprobante de un depósito en efectivo, el número que reportas es el Serial y no la referencia. En un comprobante del Banco de Venezuela es el número de Operación. Un Pago Móvil desde una cuenta de Banesco se reporta como Transferencia.",
                            }),
                            t({
                                en: "One payment covers installments from one purchase only. To pay two purchases, make two payments.",
                                es: "Un pago cubre cuotas de una sola compra. Para pagar dos compras, haz dos pagos.",
                            }),
                        ],
                        id: "report",
                        title: t({ en: "Reporting the payment", es: "Cómo reportar el pago" }),
                    },
                    {
                        body: [
                            t({
                                en: "Cashea says it announces changes to a store's account only in the app, and that no one from Cashea or its stores will ask you for a payment outside it. Pay only to the account shown for that installment, and report any message asking you to pay somewhere else to Cashea's support.",
                                es: "Cashea dice que avisa los cambios en la cuenta de una tienda solo por la app, y que nadie de Cashea ni de sus tiendas te pedirá un pago por fuera de ella. Paga solo a la cuenta que aparece para esa cuota, y reporta a soporte de Cashea cualquier mensaje que te pida pagar en otro lado.",
                            }),
                        ],
                        id: "safe",
                        title: t({ en: "Pay only inside the app", es: "Paga solo dentro de la app" }),
                    },
                    {
                        body: [
                            t({
                                en: "Outlayr tracks purchases in installments from buy now, pay later apps such as Cashea: the upfront payment, each installment, and any late fees, with a reminder the day before each one is due. For an order already in progress, take a screenshot of its payment plan and Outlayr fills in each payment and what is already paid.",
                                es: "Outlayr lleva las compras en cuotas de apps como Cashea: la inicial, cada cuota y los recargos por atraso, con un aviso el día antes de cada pago. Para una compra que ya va por la mitad, toma una captura de su plan de pagos y Outlayr llena cada cuota y lo que ya pagaste.",
                            }),
                            t({
                                en: "The free plan holds 2 installment apps, and each screenshot counts as one capture. Outlayr is not affiliated with Cashea, and paying still happens in the Cashea app.",
                                es: "El plan gratis permite 2 apps de cuotas, y cada captura de pantalla cuenta como una captura. Outlayr no está afiliada a Cashea, y el pago se sigue haciendo en la app de Cashea.",
                            }),
                        ],
                        id: "outlayr",
                        title: t({
                            en: "Keep track of your Cashea installments",
                            es: "Lleva el control de tus cuotas de Cashea",
                        }),
                    },
                ],
                plateAlt: t({
                    en: "A $600 fridge bought in installments: a 60% upfront payment of $360 and installment 1 of $80 are paid, installment 2 of $80 is due Friday 21 November, and installment 3 is due 5 December. Two days of grace, then $4 per installment.",
                    es: "Una nevera de $600 comprada en cuotas: la inicial del 60%, $360, y la cuota 1 de $80 están pagadas, la cuota 2 de $80 vence el viernes 21 de noviembre y la cuota 3 el 5 de diciembre. Dos días de gracia, luego $4 por cuota.",
                }),
                related: [
                    "/tools/installment-calculator",
                    "/guides/multi-currency-expense-tracker",
                    "/guides/best-expense-tracker-apps-latin-america",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Tap Mis Compras or the calendar under it, then the installment under Próximos pagos or Pagar.",
                            es: "Toca Mis Compras o el calendario de abajo, y luego la cuota en Próximos pagos o Pagar.",
                        }),
                        title: t({ en: "Open the installment", es: "Abre la cuota" }),
                    },
                    {
                        text: t({
                            en: "Use Pago Móvil, a transfer, or a deposit, to the account details the app shows. Check them before you pay.",
                            es: "Usa Pago Móvil, transferencia o depósito, a los datos que te muestra la app. Revísalos antes de pagar.",
                        }),
                        title: t({ en: "Pay to the account shown", es: "Paga a la cuenta que aparece" }),
                    },
                    {
                        text: t({
                            en: "Tap Ya pagué, enter the date, amount, and reference number, and upload the receipt.",
                            es: "Toca Ya pagué, escribe la fecha, el monto y el número de referencia, y sube el comprobante.",
                        }),
                        title: t({ en: "Report it", es: "Repórtalo" }),
                    },
                ],
                title: t({
                    en: "How to pay Cashea: installments, methods, and late fees",
                    es: "Cómo pagar Cashea: cuotas, métodos y atrasos",
                }),
            },
            "how-to-track-expenses": {
                facts: [
                    {
                        label: t({ en: "Method", es: "Método" }),
                        text: t({
                            en: "A spreadsheet, an app, or cash envelopes",
                            es: "Hoja de cálculo, app o sobres de efectivo",
                        }),
                    },
                    {
                        label: t({ en: "Categories", es: "Categorías" }),
                        text: t({ en: "6 to 10 to start", es: "Entre 6 y 10 para empezar" }),
                    },
                    {
                        label: t({ en: "When to log", es: "Cuándo anotar" }),
                        text: t({ en: "The day you spend", es: "El mismo día del gasto" }),
                    },
                    {
                        label: t({ en: "Review", es: "Revisión" }),
                        text: t({
                            en: "10 minutes a week, and a close at month end",
                            es: "10 minutos cada semana y un cierre al final del mes",
                        }),
                    },
                    {
                        label: t({ en: "More than one currency", es: "Varias monedas" }),
                        text: t({
                            en: "Note the currency and the rate you paid at",
                            es: "Anota la moneda y la tasa con la que pagaste",
                        }),
                    },
                    {
                        label: t({ en: "Template", es: "Plantilla" }),
                        text: t({ en: "Free, in Excel or CSV", es: "Gratis, en Excel o en CSV" }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "The one you will use every day. If you spend the day at a computer, a spreadsheet; if you pay for most things from your phone, an app; if you pay mostly in cash, envelopes. You can also mix them: envelopes for groceries and a spreadsheet or an app for the rest.",
                            es: "La que vas a usar todos los días. Si pasas el día en la computadora, una hoja de cálculo; si pagas casi todo desde el celular, una app; si pagas casi todo en efectivo, sobres. También puedes combinarlos: sobres para el supermercado y una hoja o una app para lo demás.",
                        }),
                        question: t({
                            en: "What is the best way to track my expenses?",
                            es: "¿Cuál es la mejor forma de llevar el control de mis gastos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "6 to 10 at first. With too many, every expense becomes a decision and it is easier to quit. Split a category only when it grows, like food into groceries and eating out.",
                            es: "Entre 6 y 10 al principio. Con demasiadas, cada gasto se vuelve una decisión y es más fácil dejarlo. Divide una categoría solo cuando crezca, por ejemplo comida en supermercado y comidas fuera.",
                        }),
                        question: t({
                            en: "How many expense categories should I use?",
                            es: "¿Cuántas categorías de gastos debo usar?",
                        }),
                    },
                    {
                        answer: t({
                            en: "About 10 minutes a week, and a close at the end of the month. The weekly check lets you correct in time; the close tells you whether next month's plan needs to change.",
                            es: "Unos 10 minutos cada semana y un cierre al final del mes. La revisión semanal te deja corregir a tiempo; el cierre te dice si el plan del mes siguiente tiene que cambiar.",
                        }),
                        question: t({
                            en: "How often should I review my expenses?",
                            es: "¿Cada cuánto debo revisar mis gastos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Log each expense in the currency you paid in, with the rate you got that day. When you add up, convert everything to one main currency at each expense's rate. That way your totals do not change every time the rate moves.",
                            es: "Anota cada gasto en la moneda en que pagaste y la tasa que usaste ese día. Al sumar, convierte todo a una moneda principal con la tasa de cada gasto. Así tus totales no cambian cada vez que la tasa se mueve.",
                        }),
                        question: t({
                            en: "How do I track expenses in more than one currency?",
                            es: "¿Cómo llevo el control si gasto en dólares y en bolívares o pesos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Our Excel template has a transactions sheet, a monthly summary for the currency you pick, budget against spending per category, and a chart. It also comes as a CSV.",
                            es: "Sí. Nuestra plantilla en Excel trae una hoja de movimientos, un resumen del mes en la moneda que elijas, el presupuesto contra lo gastado por categoría y un gráfico. También viene en CSV.",
                        }),
                        question: t({
                            en: "Is there a free expense tracking template?",
                            es: "¿Hay una plantilla gratis para llevar el control de gastos?",
                        }),
                    },
                ],
                lead: t({
                    en: "Tracking your expenses means writing down everything you pay for, grouping it by category, and comparing at the end of the month what you spent with what you meant to spend. You can do it in a spreadsheet, in an app, or with cash envelopes. The method matters less than the habit: log every day, even when it is a small amount.",
                    es: "Llevar el control de tus gastos es anotar cada cosa que pagas, agruparla por categoría y comparar al final del mes lo que gastaste con lo que querías gastar. Se puede hacer con una hoja de cálculo, con una app o con sobres de efectivo. El método importa menos que la constancia: anotar todos los días, aunque sea poco.",
                }),
                meta: {
                    description: t({
                        en: "Three ways to track your expenses: a spreadsheet, an app, or cash envelopes. How to pick categories, log every expense, and review your month.",
                        es: "Tres formas de llevar el control de gastos: hoja de cálculo, app o sobres de efectivo. Cómo elegir categorías, anotar cada gasto y cerrar el mes.",
                    }),
                    title: t({
                        en: "How to Track Your Expenses: 3 Methods That Work · Outlayr",
                        es: "Cómo llevar el control de gastos personales · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "Spreadsheet. One row per expense, with the date, a note, the amount, the currency, and the category. A formula like SUMIFS adds up each category by month. Our free template already has those formulas, a monthly summary, and a chart.",
                                es: "Hoja de cálculo. Una fila por gasto, con fecha, nota, monto, moneda y categoría. Una fórmula como SUMAR.SI.CONJUNTO suma cada categoría por mes. Nuestra plantilla gratis ya trae esas fórmulas, un resumen del mes y un gráfico.",
                            }),
                            t({
                                en: "App. An app saves each expense in seconds and does the math for you. Some read receipts or understand what you say, and others connect to your bank. Before you pick one, check which countries it works in, whether it handles your currency, and what it costs after the trial.",
                                es: "App. Una app guarda cada gasto en segundos y hace las sumas por ti. Algunas leen recibos o entienden lo que dictas, y otras se conectan a tu banco. Antes de elegir, revisa en qué países funciona, si maneja tu moneda y cuánto cuesta después de la prueba.",
                            }),
                            t({
                                en: "Cash envelopes. At the start of the month you put each category's cash in its own envelope. When an envelope is empty, that spending is over until next month. It works well for groceries and going out, and badly for subscriptions and card payments. Some budget apps copy the method with virtual envelopes.",
                                es: "Sobres de efectivo. Al inicio del mes separas el efectivo de cada categoría en un sobre. Cuando un sobre se vacía, se acabó ese gasto hasta el mes siguiente. Funciona muy bien con el supermercado y las salidas, y mal con las suscripciones y los pagos con tarjeta. Algunas apps de presupuesto copian el método con sobres virtuales.",
                            }),
                        ],
                        id: "methods",
                        title: t({ en: "Three methods, compared", es: "Tres métodos, comparados" }),
                    },
                    {
                        body: [
                            t({
                                en: "If you do not know how much to give each category, the 50/30/20 rule is a starting point: 50% for needs, 30% for wants, and 20% for savings or debt. Our calculator does the math with your income, per week, every two weeks, or per month. After a month of logging, adjust the split to what you actually spend.",
                                es: "Si no sabes cuánto asignar a cada categoría, la regla 50/30/20 es un punto de partida: 50% para necesidades, 30% para gustos y 20% para ahorro o deudas. Nuestra calculadora hace la cuenta con tu ingreso, por semana, por quincena o por mes. Después de un mes de registros, ajusta los porcentajes a lo que de verdad gastas.",
                            }),
                        ],
                        id: "split",
                        title: t({ en: "How to split what you earn", es: "Cómo repartir lo que ganas" }),
                    },
                    {
                        body: [
                            t({
                                en: "If you are paid in dollars and spend in pesos or euros, log each expense in the currency you paid in, with the rate you got. To add up the month, convert everything to one currency at each day's rate, not today's. That way an expense from three weeks ago does not change when the rate moves.",
                                es: "Si te pagan en dólares y gastas en bolívares o en pesos, anota cada gasto en la moneda en que pagaste y la tasa que usaste. Para sumar el mes, conviértelo todo a una sola moneda con la tasa de cada día, no con la de hoy. Así un gasto de hace tres semanas no cambia cuando la tasa se mueve.",
                            }),
                        ],
                        id: "currencies",
                        title: t({
                            en: "If you spend in more than one currency",
                            es: "Si gastas en más de una moneda",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "Logging only the big expenses. The small ones add up to more than you think.",
                                es: "Anotar solo los gastos grandes. Los pequeños suman más de lo que parece.",
                            }),
                            t({
                                en: "Forgetting cash and bank fees, and starting with too many categories.",
                                es: "Olvidar el efectivo y las comisiones del banco, y empezar con demasiadas categorías.",
                            }),
                            t({
                                en: "Checking only once the money has run out, or quitting after a bad month. An expensive month is information too.",
                                es: "Revisar solo cuando ya se acabó el dinero, o dejarlo después de un mal mes. Un mes caro también es información.",
                            }),
                        ],
                        id: "mistakes",
                        title: t({ en: "Common mistakes", es: "Errores comunes" }),
                    },
                    {
                        body: [
                            t({
                                en: "Outlayr, the app we make, logs an expense when you type a sentence, say it, or scan the receipt, in 165 currencies at the rate of the day. It is free to start on iPhone and Android. If you already keep a spreadsheet, you can import it as a CSV.",
                                es: "Outlayr, la app que hacemos nosotros, registra un gasto cuando escribes una oración, la dictas o escaneas el recibo, en 165 monedas con la tasa del día. Es gratis para empezar en iPhone y Android. Si ya llevas una hoja de cálculo, puedes importarla como CSV.",
                            }),
                        ],
                        id: "app",
                        title: t({ en: "If you would rather use an app", es: "Si prefieres una app" }),
                    },
                ],
                related: [
                    "/guides/expense-tracker-template",
                    "/tools/50-30-20-budget-calculator",
                    "/guides/budget-planner",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "A spreadsheet if you like seeing the formulas, an app if you want to log from your phone in seconds, envelopes if you pay for almost everything in cash.",
                            es: "Hoja de cálculo si te gusta ver las fórmulas, app si quieres anotar desde el celular en segundos, sobres si pagas casi todo en efectivo.",
                        }),
                        title: t({ en: "Pick a method", es: "Elige un método" }),
                    },
                    {
                        text: t({
                            en: "Start with a few: housing, groceries, eating out, transport, utilities, health, subscriptions, and other. You can split them later.",
                            es: "Empieza con pocas: vivienda, supermercado, comidas fuera, transporte, servicios, salud, suscripciones y otros. Podrás dividirlas después.",
                        }),
                        title: t({ en: "Set your categories", es: "Define tus categorías" }),
                    },
                    {
                        text: t({
                            en: "Include the coffee, the tip, and the bank fees. Small things are what you forget.",
                            es: "Incluye el café, la propina y las comisiones del banco. Lo pequeño es lo que más se olvida.",
                        }),
                        title: t({ en: "Log every expense the same day", es: "Anota cada gasto el mismo día" }),
                    },
                    {
                        text: t({
                            en: "Rent, utilities, and subscriptions repeat. Write them down once with the day they charge, so none of them surprises you.",
                            es: "La renta, los servicios y las suscripciones se repiten. Anótalos una vez con su día de cobro para que no te sorprendan.",
                        }),
                        title: t({ en: "Log fixed costs once", es: "Registra lo fijo una sola vez" }),
                    },
                    {
                        text: t({
                            en: "Each week, look at what you have spent per category and compare it with the week before. At month end, add up each category, compare it with your plan, and adjust next month's.",
                            es: "Cada semana, mira cuánto llevas por categoría y compáralo con la semana anterior. Al final del mes, suma cada categoría, compárala con tu plan y ajusta el del mes siguiente.",
                        }),
                        title: t({ en: "Review weekly, close monthly", es: "Revisa cada semana, cierra cada mes" }),
                    },
                ],
                table: {
                    caption: t({
                        en: "You can mix them: envelopes for groceries, and a spreadsheet or an app for the rest.",
                        es: "Puedes combinarlos: sobres para el supermercado, y una hoja de cálculo o una app para lo demás.",
                    }),
                    columns: [
                        t({ en: "Suits you if", es: "Te conviene si" }),
                        t({ en: "What it asks of you", es: "Lo que pide de ti" }),
                    ],
                    corner: t({ en: "Method", es: "Método" }),
                    rows: [
                        {
                            cells: [
                                t({
                                    en: "You want full control, for free, and like seeing the formulas",
                                    es: "Quieres control total, gratis, y te gusta ver las fórmulas",
                                }),
                                t({
                                    en: "Opening it every day and typing each expense",
                                    es: "Abrirla cada día y escribir cada gasto",
                                }),
                            ],
                            label: t({ en: "Spreadsheet", es: "Hoja de cálculo" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "You want to log in seconds from your phone and have it add up for you",
                                    es: "Quieres anotar en segundos desde el celular y que sume sola",
                                }),
                                t({
                                    en: "Picking an app and, for some, paying a subscription",
                                    es: "Elegir una app y, en algunas, pagar una suscripción",
                                }),
                            ],
                            label: t({ en: "App", es: "App" }),
                        },
                        {
                            cells: [
                                t({
                                    en: "You pay for almost everything in cash and want a cap you cannot break",
                                    es: "Pagas casi todo en efectivo y quieres un tope que no se pueda pasar",
                                }),
                                t({
                                    en: "Taking out the cash and splitting it into envelopes. It does not work for card payments",
                                    es: "Retirar el efectivo y separarlo en sobres. No sirve para pagos con tarjeta",
                                }),
                            ],
                            label: t({ en: "Cash envelopes", es: "Sobres de efectivo" }),
                        },
                    ],
                },
                title: t({
                    en: "How to track your personal expenses",
                    es: "Cómo llevar el control de tus gastos personales",
                }),
            },
            "mint-alternative": {
                apps: [
                    {
                        facts: [
                            ...COPILOT_FACTS,
                            {
                                label: LABELS.watch,
                                source: "https://help.copilot.money/en/articles/10262766-investment-account-limitations",
                                text: t({
                                    en: "No CSV or XLS import, so your Mint history cannot come in",
                                    es: "No importa CSV ni XLS, así que tu historial de Mint no puede entrar",
                                }),
                            },
                        ],
                        name: "Copilot Money",
                        slug: "copilot",
                        summary: t(RIVALS.copilot),
                    },
                    {
                        facts: [
                            ...EVERYDOLLAR_FACTS,
                            {
                                label: LABELS.watch,
                                source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/360040571391-Export-Tracked-Transactions",
                                text: t({
                                    en: "It imports no files, so your Mint history cannot come in, and outside the US you get only the free web budget",
                                    es: "No importa archivos, así que tu historial de Mint no puede entrar, y fuera de EE. UU. solo tienes el presupuesto gratis en la web",
                                }),
                            },
                        ],
                        name: "EveryDollar",
                        slug: "everydollar",
                        summary: t(RIVALS.everydollar),
                    },
                    GOODBUDGET,
                    MONARCH,
                    {
                        facts: [
                            ...OUTLAYR_FACTS,
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "No web app. A Mint CSV comes in without accounts, tags, or splits",
                                    es: "Sin app web. Un CSV de Mint entra sin cuentas, etiquetas ni divisiones",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t(OUTLAYR_LEAD),
                    },
                    POCKETGUARD,
                    ROCKET_MONEY,
                    YNAB,
                ],
                facts: [
                    {
                        label: "Copilot Money",
                        text: t({
                            en: "Best if you live in the US, use an iPhone, iPad, or Mac, and want linked accounts to sync on their own",
                            es: "Ideal si vives en EE. UU., usas iPhone, iPad o Mac y quieres que tus cuentas vinculadas se sincronicen solas",
                        }),
                    },
                    {
                        label: "EveryDollar",
                        text: t({
                            en: "Best if you live in the US and want a zero-based monthly budget with a free version",
                            es: "Ideal si vives en EE. UU. y quieres un presupuesto mensual de base cero con versión gratis",
                        }),
                    },
                    {
                        label: "Goodbudget",
                        text: t({
                            en: "Best if you want envelopes by hand on the web, Android, and iPhone, and can bring a CSV",
                            es: "Ideal si quieres sobres a mano en la web, Android y iPhone, y puedes traer un CSV",
                        }),
                    },
                    {
                        label: "Monarch Money",
                        text: t({
                            en: "Best if you live in the US or Canada and want net worth, budgets, reports, and goals from linked accounts",
                            es: "Ideal si vives en EE. UU. o Canadá y quieres patrimonio, presupuestos, reportes y metas desde cuentas vinculadas",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you want to keep your Mint history from its CSV and log new purchases by sentence, voice, or receipt",
                            es: "Ideal si quieres conservar tu historial de Mint desde su CSV y registrar compras nuevas con una oración, tu voz o un recibo",
                        }),
                    },
                    {
                        label: "PocketGuard",
                        text: t({
                            en: "Best if you live in the US or Canada, want linked accounts to sync, and would rather pay once",
                            es: "Ideal si vives en EE. UU. o Canadá, quieres que tus cuentas vinculadas se sincronicen y prefieres pagar una sola vez",
                        }),
                    },
                    {
                        label: "Rocket Money",
                        text: t({
                            en: "Best if you live in the US and want subscriptions, bills, and a budget from linked accounts, starting free",
                            es: "Ideal si vives en EE. UU. y quieres suscripciones, facturas y presupuesto desde cuentas vinculadas, empezando gratis",
                        }),
                    },
                    {
                        label: "YNAB",
                        text: t({
                            en: "Best if you want to decide what your money is for before you spend it, with bank import in the US, Canada, the UK, or the EU",
                            es: "Ideal si quieres decidir para qué es tu dinero antes de gastarlo, con importación bancaria en EE. UU., Canadá, Reino Unido o la UE",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Intuit says Mint has been reimagined on Credit Karma. If you want a budget app instead, the eight on this page are options, and Outlayr imports the CSV you exported from Mint.",
                            es: "Intuit dice que Mint ahora vive en Credit Karma. Si prefieres una app de presupuesto, las ocho de esta página son opciones, y Outlayr importa el CSV que exportaste de Mint.",
                        }),
                        question: t({ en: "What replaced Mint?", es: "¿Qué reemplazó a Mint?" }),
                    },
                    {
                        answer: t({
                            en: "It depends on what you used Mint for. For linked accounts that sync on their own, Monarch works in the US and Canada, and Copilot and Rocket Money in the US. For a budget you run yourself, EveryDollar is zero-based, Goodbudget uses envelopes, and YNAB asks you to decide what money is for before you spend it. Outlayr imports your Mint CSV and logs new purchases by sentence, voice, or receipt.",
                            es: "Depende de para qué usabas Mint. Para cuentas vinculadas que se sincronizan solas, Monarch funciona en EE. UU. y Canadá, y Copilot y Rocket Money en EE. UU. Para un presupuesto que llevas tú, EveryDollar es de base cero, Goodbudget usa sobres y YNAB te pide decidir para qué es tu dinero antes de gastarlo. Outlayr importa tu CSV de Mint y registra compras nuevas con una oración, tu voz o un recibo.",
                        }),
                        question: t({
                            en: "What is the best Mint alternative?",
                            es: "¿Cuál es la mejor alternativa a Mint?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes, if you exported a CSV from Mint. Outlayr links each Mint category that matches one of yours by name, and flags rows that look already imported before you save. With Outlayr Pro, the other Mint category names are matched to yours with AI, up to 5,000 rows a file, so split a longer export by year. With Pro, a Mint category still unmatched becomes a new category; on the free plan those rows are skipped.",
                            es: "Sí, si exportaste un CSV de Mint. Outlayr vincula cada categoría de Mint que coincide por nombre con una de las tuyas y marca las filas que parecen ya importadas antes de guardar. Con Outlayr Pro, los demás nombres de categoría de Mint se asignan a los tuyos con IA, hasta 5,000 filas por archivo, así que divide una exportación más larga por año. Con Pro, una categoría de Mint que siga sin coincidencia se crea como categoría nueva; en el plan gratis esas filas se omiten.",
                        }),
                        question: t({
                            en: "Can I import my Mint data into Outlayr?",
                            es: "¿Puedo importar mis datos de Mint a Outlayr?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Goodbudget, Monarch on the web, Outlayr, PocketGuard, and YNAB. Copilot imports no CSV or XLS files, and EveryDollar imports no files. Rocket Money's site does not say.",
                            es: "Goodbudget, Monarch en la web, Outlayr, PocketGuard y YNAB. Copilot no importa archivos CSV ni XLS, y EveryDollar no importa archivos. El sitio de Rocket Money no lo dice.",
                        }),
                        question: t({
                            en: "Which Mint alternatives can import a CSV?",
                            es: "¿Qué alternativas a Mint pueden importar un CSV?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Logging, budgets, goals, and subscriptions are free, and so is importing the rows whose Mint category matches one of yours by name. Matching the other Mint category names to yours with AI, and creating a category for any still unmatched, needs Outlayr Pro, which is $7.99 a month, $49.99 a year, or $129.99 once in the United States.",
                            es: "Registrar, los presupuestos, las metas y las suscripciones son gratis, igual que importar las filas cuya categoría de Mint coincide por nombre con una de las tuyas. Asignar los demás nombres de categoría de Mint a los tuyos con IA, y crear una categoría para los que sigan sin coincidir, requiere Outlayr Pro, que en Estados Unidos cuesta US$7.99 al mes, US$49.99 al año o US$129.99 en un solo pago.",
                        }),
                        question: t({
                            en: "Is Outlayr free like Mint was?",
                            es: "¿Outlayr es gratis como lo era Mint?",
                        }),
                    },
                ],
                lead: t({
                    en: "A Mint alternative is an app that takes over the budgets and spending you kept in Mint, which Intuit says has been reimagined on Credit Karma. Eight follow, each best for something different: Copilot Money, EveryDollar, Goodbudget, Monarch Money, Outlayr, PocketGuard, Rocket Money, and YNAB. Outlayr is ours; the other seven are not, and it imports the CSV you exported from Mint.",
                    es: "Una alternativa a Mint es una app que se queda con los presupuestos y los gastos que llevabas en Mint, que según Intuit ahora vive en Credit Karma. Aquí van ocho, cada una mejor para algo distinto: Copilot Money, EveryDollar, Goodbudget, Monarch Money, Outlayr, PocketGuard, Rocket Money y YNAB. Outlayr es nuestra; las otras siete no, y Outlayr importa el CSV que exportaste de Mint.",
                }),
                meta: {
                    description: t({
                        en: "Mint now lives on Credit Karma. Eight apps to move to, from Monarch and Copilot to YNAB and Goodbudget, and how to import your Mint CSV into Outlayr.",
                        es: "Mint ahora vive en Credit Karma. Ocho apps a las que puedes cambiarte, de Monarch y Copilot a YNAB y Goodbudget, y cómo importar tu CSV de Mint a Outlayr.",
                    }),
                    title: t({
                        en: "Mint Alternatives in 2026: 8 Apps Compared · Outlayr",
                        es: "Alternativas a Mint en 2026: 8 apps comparadas · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "Outlayr needs a date, an amount, and a category or description column, with commas between columns. Each Mint category that matches one of yours by name links on any plan. With Pro, AI first matches the other category names to yours, up to 5,000 rows and 2 MB a file, and a name still unmatched becomes a new category; only merchant and category names are sent, never amounts, dates, or the file.",
                                es: "Outlayr necesita una columna de fecha, una de monto y una de categoría o descripción, con comas entre columnas. Cada categoría de Mint que coincide por nombre con una de las tuyas se vincula en cualquier plan. Con Pro, la IA primero asigna los demás nombres de categoría a los tuyos, hasta 5,000 filas y 2 MB por archivo, y un nombre que siga sin coincidir se crea como categoría nueva; solo se envían nombres de comercios y de categorías, nunca montos, fechas ni el archivo.",
                            }),
                            t({
                                en: "A Type column with words like debit and credit, or expense and income, keeps each row on its side. Without one, amounts come in positive and a row follows its category's income setting. Accounts, tags, and splits do not come in, so imported rows have no account.",
                                es: "Una columna Type con palabras como debit y credit, o expense e income, mantiene cada fila como gasto o ingreso. Sin ella, los montos entran en positivo y cada fila sigue lo que diga su categoría. Las cuentas, las etiquetas y las divisiones no entran, así que las filas importadas no tienen cuenta.",
                            }),
                            t({
                                en: "Rows that look already imported are flagged before you save, and rows Outlayr cannot read or match to a category are listed as skipped, with the reason; with Pro, the new categories it creates are listed as well.",
                                es: "Las filas que parecen ya importadas se marcan antes de guardar, y las que Outlayr no puede leer ni asignar a una categoría aparecen como omitidas, con el motivo; con Pro, también se listan las categorías nuevas que crea.",
                            }),
                        ],
                        id: "mint-csv",
                        title: t({ en: "What comes in from your Mint CSV", es: "Qué entra desde tu CSV de Mint" }),
                    },
                ],
                picked: [
                    t({
                        en: "Each app here is one people move to from Mint, and each one fits a different reason, from linked accounts to a budget you run yourself to keeping the history in your Mint CSV. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista es una a la que la gente se cambia desde Mint, y cada una sirve para algo distinto, de las cuentas vinculadas a un presupuesto que llevas tú o a conservar el historial de tu CSV de Mint. Van en orden alfabético, no por puesto.",
                    }),
                    LIST_PICKED_FACTS,
                    LIST_PICKED_OURS,
                ],
                related: [
                    "/guides/expense-tracker-template",
                    "/compare/monarch",
                    "/guides/best-budget-apps",
                ] satisfies PageRef[],
                sources: LIST_SOURCES,
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
                    en: "Mint alternatives, and how to bring your Mint CSV",
                    es: "Alternativas a Mint, y cómo traer tu CSV de Mint",
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
                            en: "The rate from the day of the purchase, from Open Exchange Rates, or for bolívares the BCV rate published through Cotizave. Entries you already logged do not change when the rate moves. You can type your own rate when the one you got was different.",
                            es: "La tasa del día de la compra, de Open Exchange Rates, o para los bolívares la tasa del BCV que publica Cotizave. Los registros que ya hiciste no cambian cuando la tasa se mueve. Puedes escribir tu propia tasa cuando la que te dieron fue distinta.",
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
                more: [
                    {
                        body: [
                            t({
                                en: "Outlayr is a multi-currency expense tracker that keeps the rate it used next to every entry. Rates for its 165 currencies come from Open Exchange Rates and refresh every hour. The Banco Central de Venezuela (BCV) rates for the dollar and the euro come from Cotizave.",
                                es: "Outlayr es una app para controlar gastos en varias monedas que guarda la tasa que usó junto a cada registro. Las tasas de sus 165 monedas vienen de Open Exchange Rates y se actualizan cada hora. Las tasas del Banco Central de Venezuela (BCV) para el dólar y el euro vienen de Cotizave.",
                            }),
                            t({
                                en: "Each rate shows how fresh it is, like As of 09:05 for one fetched today, or 3 days old when the newest rate is older than the day of the entry. If there is no rate yet for that day, Outlayr says so, and the entry counts in dollars once it has one.",
                                es: "Cada tasa muestra qué tan reciente es, por ejemplo Hoy, 09:05 para una de hoy, o De hace 3 días cuando la más nueva es anterior al día del registro. Si todavía no hay tasa para ese día, Outlayr te lo dice, y el registro suma en dólares cuando tenga una.",
                            }),
                        ],
                        id: "rates",
                        title: t({ en: "Where the rates come from", es: "De dónde salen las tasas" }),
                    },
                    {
                        body: [
                            t({
                                en: "When you log a purchase in another currency, the sentence also shows what it comes to in dollars and which rate did it, like $21.70 at the official rate. That is the rate from the day of the purchase, and it stays with the entry, so what you already logged doesn't move when the market does.",
                                es: "Cuando registras una compra en otra moneda, la oración también muestra cuánto es en dólares y con qué tasa, por ejemplo US$21.70 a la tasa oficial. Es la tasa del día de la compra, y se queda con el registro, así que lo que ya registraste no cambia cuando se mueve el mercado.",
                            }),
                            t({
                                en: "To use another rate, tap the rate in the sentence and pick one, or choose My rate and type the rate you actually got. Outlayr shows the last rate you typed so you can reuse it. You can also tap the dollar amount and type what you paid in dollars, and Outlayr works out the rate from the two amounts.",
                                es: "Para usar otra tasa, toca la tasa en la oración y elige otra, o elige Mi tasa y escribe la que te dieron. Outlayr te muestra la última tasa que escribiste para que la uses de nuevo. También puedes tocar el monto en dólares y escribir lo que pagaste en dólares, y Outlayr calcula la tasa a partir de los dos montos.",
                            }),
                        ],
                        id: "your-rate",
                        title: t({
                            en: "The rate of the day, or the one you got",
                            es: "La tasa del día, o la que te dieron",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "For a purchase in bolívares, Outlayr offers USD (BCV) and EUR (BCV), both from the central bank's published rates, and My rate for the rate you actually paid.",
                                es: "Para una compra en bolívares, Outlayr te ofrece USD (BCV) y EUR (BCV), las dos de las tasas que publica el banco central, y Mi tasa para la que de verdad pagaste.",
                            }),
                            t({
                                en: "If a shop priced something in dollars and charged you in bolívares, log the bolívar amount, tap the dollar amount, and type the dollar price; the rate comes out of the two. Changing dollars into bolívares between your own accounts is a transfer, not spending.",
                                es: "Si una tienda puso el precio en dólares y te cobró en bolívares, registra el monto en bolívares, toca el monto en dólares y escribe el precio en dólares; la tasa sale de los dos. Cambiar dólares a bolívares entre tus propias cuentas es una transferencia, no un gasto.",
                            }),
                        ],
                        id: "bolivares",
                        title: t({
                            en: "Bolívares: the BCV rate or the one you paid",
                            es: "Bolívares: la tasa del BCV o la que pagaste",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "On a trip, log each purchase in the currency on the receipt as you go, and every total still reads in your main currency. Each account keeps its own currency and balance, so a dollar card and cash in euros stay apart. You can log in any of the 165 currencies on any plan; the free plan holds accounts in one currency, and Outlayr Pro in as many as you need.",
                                es: "De viaje, registra cada compra en la moneda del recibo, y todos los totales se siguen leyendo en tu moneda principal. Cada cuenta tiene su propia moneda y su saldo, así que una tarjeta en dólares y el efectivo en euros quedan separados. Puedes registrar en cualquiera de las 165 monedas con cualquier plan; el plan gratis permite cuentas en una moneda, y Outlayr Pro en las que necesites.",
                            }),
                            t({
                                en: "Splitting costs with friends? The split expenses calculator works out who pays whom, once you agree on one currency and a rate.",
                                es: "¿Dividen gastos entre amigos? La calculadora para dividir gastos te dice quién le paga a quién, una vez que acuerden una moneda y una tasa.",
                            }),
                        ],
                        id: "travel",
                        title: t({ en: "On a trip", es: "De viaje" }),
                    },
                ],
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
                    en: "Track expenses in any currency, at home or on a trip",
                    es: "Controla tus gastos en cualquier moneda, en casa o de viaje",
                }),
            },
            "track-money-sent-home": {
                facts: [
                    {
                        label: t({ en: "Main currency", es: "Moneda principal" }),
                        text: t({
                            en: "The one you are paid in. Totals, budgets, and insights read in it",
                            es: "La que cobras. Los totales, los presupuestos y las estadísticas se leen en ella",
                        }),
                    },
                    {
                        label: t({ en: "Currencies", es: "Monedas" }),
                        text: t({
                            en: "165, from dollars and euros to bolívares and pesos",
                            es: "165, de dólares y euros a bolívares y pesos",
                        }),
                    },
                    {
                        label: t({ en: "Rate", es: "Tasa" }),
                        text: t({
                            en: "From the day, or the one you got",
                            es: "La del día, o la que te dieron",
                        }),
                    },
                    {
                        label: t({ en: "What you send", es: "Lo que envías" }),
                        text: t({
                            en: "A transfer between your accounts, or an expense in a category like Family",
                            es: "Una transferencia entre tus cuentas, o un gasto en una categoría como Familia",
                        }),
                    },
                    {
                        label: t({ en: "Fees", es: "Comisiones" }),
                        text: t({
                            en: "A fee on a transfer counts as spending. The transfer itself does not",
                            es: "La comisión de una transferencia cuenta como gasto. La transferencia no",
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
                            en: "No. Outlayr doesn't send or receive money. It records what you send, so you can see it next to the rest of your spending.",
                            es: "No. Outlayr no envía ni recibe dinero. Registra lo que envías para que lo veas junto al resto de tus gastos.",
                        }),
                        question: t({
                            en: "Can Outlayr send money home for me?",
                            es: "¿Outlayr envía dinero a mi familia?",
                        }),
                    },
                    {
                        answer: t({
                            en: "As a transfer when it goes to another account of yours that you track in Outlayr, like your own bolívar or peso account. As an expense when it leaves your accounts for someone else, in a category like Family. A transfer between your own accounts doesn't count as spending or against a budget. An expense does.",
                            es: "Como transferencia si va a otra cuenta tuya que llevas en Outlayr, como tu propia cuenta en bolívares o en pesos. Como gasto si sale de tus cuentas hacia otra persona, en una categoría como Familia. Una transferencia entre tus cuentas no cuenta como gasto ni contra un presupuesto. Un gasto sí.",
                        }),
                        question: t({
                            en: "Should I log what I send as a transfer or an expense?",
                            es: "¿Registro lo que envío como transferencia o como gasto?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes for logging: you can enter an expense in any of the 165 currencies, at the rate from that day or your own. The free plan holds accounts in one currency, so a transfer between a dollar account and a bolívar account needs Outlayr Pro.",
                            es: "Sí para registrar: puedes anotar un gasto en cualquiera de las 165 monedas, con la tasa del día o la tuya. El plan gratis permite cuentas en una moneda, así que una transferencia entre una cuenta en dólares y otra en bolívares necesita Outlayr Pro.",
                        }),
                        question: t({
                            en: "Does this work on the free plan?",
                            es: "¿Sirve con el plan gratis?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The rate from the day of the entry. For bolívares you can pick USD (BCV) or EUR (BCV), from the central bank's published rates. For other currencies, like pesos, Outlayr offers the Official rate, from Open Exchange Rates. You can always type My rate, the one you actually got.",
                            es: "La del día del registro. Para bolívares puedes elegir USD (BCV) o EUR (BCV), de las tasas que publica el banco central. Para otras monedas, como el peso argentino, Outlayr te ofrece la Oficial, de Open Exchange Rates. Siempre puedes escribir Mi tasa, la que de verdad te dieron.",
                        }),
                        question: t({
                            en: "Which exchange rate does Outlayr use?",
                            es: "¿Qué tasa de cambio usa Outlayr?",
                        }),
                    },
                ],
                lead: t({
                    en: "If you're paid in dollars or euros and part of it reaches home as bolívares or pesos, Outlayr lets you see it all in one place. Pick the currency you earn in, log what you send as a transfer between your accounts or as an expense, and budget in that currency. Outlayr keeps the record. It doesn't send the money.",
                    es: "Si cobras en dólares o euros y una parte llega a casa como bolívares o pesos, Outlayr te deja verlo todo en un solo lugar. Elige la moneda en que cobras, registra lo que envías como transferencia entre tus cuentas o como gasto, y haz tu presupuesto en esa moneda. Outlayr lleva el registro. No envía el dinero.",
                }),
                meta: {
                    description: t({
                        en: "Paid in dollars or euros and sending money home? Budget in the currency you earn and log what you send as a transfer or an expense in Outlayr, in 165 currencies.",
                        es: "¿Cobras en dólares o euros y envías dinero a tu familia? Haz tu presupuesto en la moneda en que cobras y registra lo que envías como transferencia o gasto en Outlayr, en 165 monedas.",
                    }),
                    title: t({
                        en: "Budget and Track the Money You Send Home · Outlayr",
                        es: "Presupuesto y control del dinero que envías a tu familia · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "In Settings, set Currency to the one your pay arrives in. Every total, budget, and chart reads in it. Anything you log in another currency, like bolívares or Argentine pesos, converts at the rate from that day and keeps it, so last month's entries don't move when the market does.",
                                es: "En Configuración, pon en Moneda la moneda en que te llega el pago. Todos los totales, presupuestos y gráficos se leen en ella. Lo que registres en otra moneda, como bolívares o pesos argentinos, se convierte con la tasa de ese día y se queda con ella, así que los registros del mes pasado no cambian cuando se mueve el mercado.",
                            }),
                            t({
                                en: "For a bolívar amount, Outlayr offers USD (BCV) and EUR (BCV), from the central bank's published rates. For other currencies, like pesos, it offers the Official rate, from Open Exchange Rates. My rate is always there, for the rate you actually got when you changed the money.",
                                es: "Para un monto en bolívares, Outlayr te ofrece USD (BCV) y EUR (BCV), de las tasas que publica el banco central. Para otras monedas, como el peso argentino, te ofrece la Oficial, de Open Exchange Rates. Mi tasa siempre está ahí, para la que de verdad te dieron cuando cambiaste el dinero.",
                            }),
                        ],
                        id: "one-currency",
                        title: t({ en: "One currency to read everything in", es: "Una moneda para leerlo todo" }),
                    },
                    {
                        body: [
                            t({
                                en: "If the money goes to an account of yours that you also track in Outlayr, like a bolívar or peso account, log it as a transfer. The sentence reads like Move $300 from your dollar account to your bolívar account today. Pick the rate source or type your own, and Outlayr shows what arrives in the other currency.",
                                es: "Si el dinero va a una cuenta tuya que también llevas en Outlayr, como una cuenta en bolívares o en pesos, regístralo como transferencia. La oración dice algo como Mueve US$300 de tu cuenta en dólares a tu cuenta en bolívares hoy. Elige la fuente de la tasa o escribe la tuya, y Outlayr te muestra cuánto llega en la otra moneda.",
                            }),
                            t({
                                en: "If a fee was charged, add it on the side that paid it, included in the amount or on top. The fee counts as spending. The transfer itself doesn't, so it doesn't count against a budget.",
                                es: "Si te cobraron una comisión, agrégala del lado que la pagó, incluida en el monto o aparte. La comisión cuenta como gasto. La transferencia no, así que no cuenta contra un presupuesto.",
                            }),
                            t({
                                en: "A transfer between two currencies needs accounts in two currencies. The free plan holds accounts in one, and Outlayr Pro in as many as you need.",
                                es: "Una transferencia entre dos monedas necesita cuentas en dos monedas. El plan gratis permite cuentas en una, y Outlayr Pro en las que necesites.",
                            }),
                        ],
                        id: "as-a-transfer",
                        title: t({
                            en: "As a transfer, when the money stays yours",
                            es: "Como transferencia, si el dinero sigue siendo tuyo",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "If the money goes to someone else's account, log it as an expense in the currency you paid, in a category like Family. Add Family from the suggested categories, or name your own.",
                                es: "Si el dinero va a la cuenta de otra persona, regístralo como gasto en la moneda en que pagaste, en una categoría como Familia. Agrega Familia desde las categorías sugeridas, o ponle el nombre que quieras.",
                            }),
                            t({
                                en: "An expense counts in your totals and in the budget on its category, which makes it the one to use for a monthly limit on what you send home.",
                                es: "Un gasto cuenta en tus totales y en el presupuesto de su categoría, así que es el que conviene si quieres un límite mensual para lo que envías a tu familia.",
                            }),
                        ],
                        id: "as-an-expense",
                        title: t({
                            en: "As an expense, when it goes to someone else",
                            es: "Como gasto, si va a otra persona",
                        }),
                    },
                    {
                        body: [
                            t({
                                en: "Log your pay as income, in the Paycheck category. Then set budgets in your currency: a monthly one on Family for what you send home, and one more for rent, groceries, or whatever else you spend on. Budgets can run by day, week, month, or year, and what you log in another currency counts at the rate from its day.",
                                es: "Registra lo que cobras como ingreso, en la categoría Sueldo. Después haz tus presupuestos en tu moneda: uno mensual en Familia para lo que envías, y uno más para el alquiler, el supermercado o lo demás que gastes. Los presupuestos pueden ser por día, semana, mes o año, y lo que registres en otra moneda cuenta con la tasa de su día.",
                            }),
                            t({
                                en: "If you're paid on the 15th, set your month to start on the 15th in Settings, under Time frames, and budgets and insights run from payday to payday. The free plan includes 2 category budgets plus the overall one; Outlayr Pro has no limit.",
                                es: "Si te pagan el 15, pon que tu mes empiece el 15 en Configuración, en Períodos de tiempo, y los presupuestos y las estadísticas corren de un día de pago al siguiente. El plan gratis incluye 2 presupuestos por categoría además del general; Outlayr Pro no tiene límite.",
                            }),
                        ],
                        id: "budget-in-what-you-earn",
                        title: t({ en: "Budget in what you earn", es: "Presupuesto en lo que cobras" }),
                    },
                ],
                related: [
                    "/guides/multi-currency-expense-tracker",
                    "/guides/budget-planner",
                    "/guides/best-expense-tracker-apps-latin-america",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Totals, budgets, and charts read in it.",
                            es: "Los totales, los presupuestos y los gráficos se leen en ella.",
                        }),
                        title: t({ en: "Pick the currency you earn in", es: "Elige la moneda en que cobras" }),
                    },
                    {
                        text: t({
                            en: "A transfer between your accounts, or an expense in a category like Family.",
                            es: "Una transferencia entre tus cuentas, o un gasto en una categoría como Familia.",
                        }),
                        title: t({ en: "Log what you send", es: "Registra lo que envías" }),
                    },
                    {
                        text: t({
                            en: "A monthly budget on Family for what you log there, and one more for the rest.",
                            es: "Un presupuesto mensual en Familia para lo que registres ahí, y uno más para el resto.",
                        }),
                        title: t({ en: "Budget in the same currency", es: "Haz tu presupuesto en la misma moneda" }),
                    },
                ],
                title: t({
                    en: "Budget in the currency you earn and track what you send home",
                    es: "Presupuesto en la moneda en que cobras y control de lo que envías a casa",
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
                    {
                        answer: t({
                            en: "The photo you scan is read by Anthropic's Claude and isn't stored after the scan. With Outlayr Pro, receipt photo backup keeps the photo with its entry through sync.",
                            es: "La foto que escaneas la lee Claude, de Anthropic, y no se guarda después del escaneo. Con Outlayr Pro, el respaldo de fotos guarda la foto junto a su registro con la sincronización.",
                        }),
                        question: t({
                            en: "Does Outlayr keep my receipt photos?",
                            es: "¿Outlayr guarda las fotos de mis recibos?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. It keeps store and item names as printed, without translating them, and reads the currency from the printed code, or from the symbol and your region. The entry converts at the rate from the receipt's date.",
                            es: "Sí. Deja los nombres de la tienda y de los productos como están impresos, sin traducirlos, y lee la moneda del código impreso, o del símbolo y tu región. El registro se convierte con la tasa de la fecha del recibo.",
                        }),
                        question: t({
                            en: "Can it read receipts in other languages and currencies?",
                            es: "¿Puede leer recibos en otros idiomas y monedas?",
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
                more: [
                    {
                        body: [
                            t({
                                en: "Outlayr's receipt scanner reads the store name the way the brand writes it, the purchase date, and the total you paid after tax, tip, and discounts. It also reads up to 60 lines with their quantity and price, the subtotal, tax, and tip lines, and how you paid, like Visa •••• 4242, when the receipt prints them.",
                                es: "El escáner de recibos de Outlayr lee el nombre de la tienda como lo escribe la marca, la fecha de la compra y el total que pagaste con impuestos, propina y descuentos. También lee hasta 60 líneas con su cantidad y su precio, las líneas de subtotal, impuesto y propina, y cómo pagaste, por ejemplo Visa •••• 4242, cuando el recibo las imprime.",
                            }),
                            t({
                                en: "It picks one of your own categories for the store and its items. If the payment line names a card that appears in one of your account names, the entry goes to that account. The currency comes from the code printed on the receipt, or from the symbol and your region when only a symbol is printed. A refund slip comes back as money in, not as a purchase.",
                                es: "Elige una de tus propias categorías según la tienda y lo que compraste. Si la línea de pago nombra una tarjeta que aparece en el nombre de una de tus cuentas, el registro va a esa cuenta. La moneda sale del código impreso en el recibo, o del símbolo y tu región cuando solo hay un símbolo. Un recibo de devolución vuelve como dinero que entra, no como una compra.",
                            }),
                        ],
                        id: "reads",
                        title: t({ en: "What a scan reads", es: "Qué lee un escaneo" }),
                    },
                    {
                        body: [
                            t({
                                en: "Nothing is saved until you look at it. The review shows the amount, the store, the category, the date, how you paid, and every line read from the receipt. Tap Save, or Finish in the form to change anything by hand, and Scan another if you have a stack of receipts to get through.",
                                es: "Nada se guarda hasta que lo revisas. La revisión muestra el monto, la tienda, la categoría, la fecha, cómo pagaste y cada línea leída del recibo. Toca Guardar, o Terminar en el formulario para cambiar algo a mano, y Escanear otro si tienes una pila de recibos por pasar.",
                            }),
                            t({
                                en: "If the photo has no receipt in it, or the receipt can't be read, Outlayr says so, and you can try again or pick another photo. A receipt in another currency is converted at the rate from its date, like any other entry.",
                                es: "Si la foto no tiene un recibo o no se puede leer, Outlayr te lo dice, y puedes intentarlo de nuevo o elegir otra foto. Un recibo en otra moneda se convierte con la tasa de su fecha, como cualquier otro registro.",
                            }),
                        ],
                        id: "review",
                        title: t({ en: "Check it before you save", es: "Revísalo antes de guardar" }),
                    },
                    {
                        body: [
                            t({
                                en: "Scanning needs an account, a connection, and your OK to send the photo to an AI provider. The photo is read by Anthropic's Claude, and it isn't stored after the scan. Each scan counts as one capture: 20 every 30 days on the free plan, shared with voice entry, and 500 with Outlayr Pro, which also backs up the receipt photo.",
                                es: "Para escanear necesitas una cuenta, conexión y aceptar que la foto se envíe a un proveedor de IA. La foto la lee Claude, de Anthropic, y no se guarda después del escaneo. Cada escaneo cuenta como una captura: 20 cada 30 días en el plan gratis, compartidas con el registro por voz, y 500 con Outlayr Pro, que además respalda la foto del recibo.",
                            }),
                            t({
                                en: "Typing works with no signal, so when you're offline you can type the purchase as one sentence and scan the next receipt later.",
                                es: "Escribir funciona sin señal, así que cuando estés sin conexión puedes escribir la compra en una oración y escanear el siguiente recibo después.",
                            }),
                        ],
                        id: "needs",
                        title: t({ en: "What a scan needs", es: "Qué necesita un escaneo" }),
                    },
                    {
                        body: [
                            t({
                                en: "Besides store receipts, the scanner reads invoices and bills, like a utility bill or a restaurant check with the tip written in. A menu, a product, or a photo of a screen isn't a receipt, and Outlayr says it didn't find one instead of guessing.",
                                es: "Además de los recibos de tiendas, el escáner lee facturas y cuentas, como el recibo de la luz o la cuenta de un restaurante con la propina escrita. Un menú, un producto o la foto de una pantalla no son un recibo, y Outlayr te dice que no encontró uno en vez de adivinar.",
                            }),
                            t({
                                en: "A printed date is read against today, so a two-digit year means the most recent one and a receipt is never dated in the future. Scanning a stack in a hurry? If you send many in a short time, Outlayr asks you to give it a moment before the next one.",
                                es: "Una fecha impresa se lee contra la de hoy, así que un año de dos dígitos es el más reciente y un recibo nunca queda con fecha futura. ¿Escaneas una pila con prisa? Si envías muchos en poco tiempo, Outlayr te pide un momento antes del siguiente.",
                            }),
                        ],
                        id: "what-counts",
                        title: t({ en: "Receipts, invoices, and bills", es: "Recibos, facturas y cuentas" }),
                    },
                ],
                plateAlt: t({
                    en: "A Target receipt read into an entry: store, date, total, and category, then saved to the Log.",
                    es: "Un recibo de Farmatodo convertido en un registro: tienda, fecha, total y categoría, y luego guardado en el Registro.",
                }),
                related: [
                    "/guides/voice-expense-tracker",
                    "/guides/ai-expense-tracker",
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
                title: t({ en: "Scan a receipt into an expense", es: "Convierte un recibo en un gasto" }),
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
                    en: "A subscription tracker that reminds you before each charge",
                    es: "Un control de suscripciones que te avisa antes de cada cobro",
                }),
            },
            "expense-tracker-template": {
                downloads: [
                    {
                        href: t({
                            en: "/templates/expense-tracker-template.xlsx",
                            es: "/templates/plantilla-control-de-gastos.xlsx",
                            pt: "/templates/planilha-controle-financeiro.xlsx",
                            fr: "/templates/modele-budget-mensuel.xlsx",
                        }),
                        label: t({
                            en: "Download for Excel (.xlsx)",
                            es: "Descargar para Excel (.xlsx)",
                            pt: "Baixar para Excel (.xlsx)",
                            fr: "Télécharger pour Excel (.xlsx)",
                        }),
                    },
                    {
                        href: t({
                            en: "/templates/expense-tracker-template.csv",
                            es: "/templates/plantilla-control-de-gastos.csv",
                            pt: "/templates/planilha-controle-financeiro.csv",
                            fr: "/templates/modele-budget-mensuel.csv",
                        }),
                        label: t({
                            en: "Download the CSV",
                            es: "Descargar el CSV",
                            pt: "Baixar o CSV",
                            fr: "Télécharger le CSV",
                        }),
                    },
                ],
                facts: [
                    {
                        label: t({ en: "Sheets", es: "Hojas", pt: "Abas", fr: "Feuilles" }),
                        text: t({
                            en: "Transactions, Summary, and How to import, in an Excel workbook. The CSV is the Transactions sheet on its own",
                            es: "Movimientos, Resumen y Cómo importar, en un libro de Excel. El CSV es solo la hoja Movimientos",
                            pt: "Lançamentos, Resumo e Como importar, em uma planilha de Excel. O CSV é só a aba Lançamentos",
                            fr: "Opérations, Résumé et Comment importer, dans un classeur Excel. Le CSV reprend la seule feuille Opérations",
                        }),
                    },
                    {
                        label: t({ en: "Summary", es: "Resumen", pt: "Resumo", fr: "Résumé" }),
                        text: t({
                            en: "Income, spending, and net for the month and currency you pick, spending against a budget per category, and a chart",
                            es: "Ingresos, gastos y neto del mes y la moneda que elijas, lo gastado contra un presupuesto por categoría y un gráfico",
                            pt: "Receitas, despesas e saldo do mês e da moeda que você escolher, o gasto de cada categoria contra um orçamento e um gráfico",
                            fr: "Revenus, dépenses et solde du mois et de la devise de votre choix, les dépenses face au budget de chaque catégorie et un graphique",
                        }),
                    },
                    {
                        label: t({ en: "Columns", es: "Columnas", pt: "Colunas", fr: "Colonnes" }),
                        text: t({
                            en: "Date, Note, Amount, Currency, Category, Type",
                            es: "Fecha, Nota, Monto, Moneda, Categoría y Tipo, con el nombre en inglés entre paréntesis",
                            pt: "Data, Nota, Valor, Moeda, Categoria e Tipo, com o nome em inglês entre parênteses",
                            fr: "Date, Libellé, Montant, Devise, Catégorie et Type, avec le nom anglais entre parenthèses quand il diffère",
                        }),
                    },
                    {
                        label: t({ en: "Opens in", es: "Abre en", pt: "Abre no", fr: "S'ouvre dans" }),
                        text: t({
                            en: "Excel, Numbers, and Google Sheets",
                            es: "Excel, Numbers y Google Sheets",
                            pt: "Excel, Numbers e Planilhas Google",
                            fr: "Excel, Numbers et Google Sheets",
                        }),
                    },
                    {
                        label: t({ en: "Dates", es: "Fechas", pt: "Datas", fr: "Dates" }),
                        text: t({
                            en: "Year first, like 2026-10-09. Dates like 10/09/2026 work too",
                            es: "Primero el año, como 2026-10-09. También sirven fechas como 09/10/2026",
                            pt: "Primeiro o ano, como 2026-10-09. Datas como 09/10/2026 também funcionam",
                            fr: "L'année d'abord, comme 2026-10-09. Les dates comme 09/10/2026 fonctionnent aussi",
                        }),
                    },
                    {
                        label: t({ en: "Amounts", es: "Montos", pt: "Valores", fr: "Montants" }),
                        text: t({
                            en: "A number, with a dot or a comma for decimals",
                            es: "Un número, con punto o coma para los decimales",
                            pt: "Um número, com ponto ou vírgula nos decimais",
                            fr: "Un nombre, avec un point ou une virgule pour les décimales",
                        }),
                    },
                    {
                        label: t({ en: "Type", es: "Tipo", pt: "Tipo", fr: "Type" }),
                        text: t({
                            en: "Expense or Income",
                            es: "Expense para un gasto, Income para un ingreso",
                            pt: "Expense para uma despesa, Income para uma receita",
                            fr: "Expense pour une dépense, Income pour un revenu",
                        }),
                    },
                    {
                        label: t({ en: "Import", es: "Importa", pt: "Importação", fr: "Import" }),
                        text: t({
                            en: "In Settings, under Import data, as a CSV file. From the workbook, save the Transactions sheet as CSV first",
                            es: "En Configuración, en Importar datos, como archivo CSV. Desde el libro, guarda antes la hoja Movimientos como CSV",
                            pt: "Em Ajustes, em Importar dados, como arquivo CSV. Na planilha de Excel, salve antes a aba Lançamentos como CSV",
                            fr: "Dans Réglages, sous Importer des données, en fichier CSV. Depuis le classeur, enregistrez d'abord la feuille Opérations en CSV",
                        }),
                    },
                    {
                        label: t({ en: "Plans", es: "Planes", pt: "Planos", fr: "Formules" }),
                        text: t({
                            en: "Rows whose category matches one of yours by name import on any plan. Outlayr Pro matches the rest with AI, up to 5,000 rows and 2 MB a file, and creates a category for any still unmatched",
                            es: "Las filas cuya categoría coincide por nombre con una de las tuyas se importan en cualquier plan. Outlayr Pro asigna el resto con IA, hasta 5,000 filas y 2 MB por archivo, y crea una categoría para cualquiera que siga sin coincidir",
                            pt: "As linhas cuja categoria tem o mesmo nome de uma das suas entram em qualquer plano. O Outlayr Pro associa o resto com IA, até 5.000 linhas e 2 MB por arquivo, e cria uma categoria para as que continuarem sem correspondência",
                            fr: "Les lignes dont la catégorie porte le même nom qu'une des vôtres s'importent avec toutes les formules. Outlayr Pro associe le reste avec l'IA, jusqu'à 5 000 lignes et 2 Mo par fichier, et crée une catégorie pour celles qui restent sans correspondance",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "Yes, the Excel workbook and the CSV. Use them in any spreadsheet app for as long as you like. Importing into Outlayr is free too for every row whose category matches one of yours by name; the English file uses the categories a new Outlayr ledger starts with. Outlayr Pro matches other category names to yours with AI and creates a category for any still unmatched.",
                            es: "Sí, tanto el libro de Excel como el CSV. Úsalos en cualquier hoja de cálculo el tiempo que quieras. Importarlos a Outlayr también es gratis para cada fila cuya categoría coincide por nombre con una de las tuyas. Outlayr Pro asigna los demás nombres de categoría a los tuyos con IA y crea una categoría para los que sigan sin coincidir.",
                            pt: "Sim, tanto a planilha de Excel quanto o CSV. Use os dois em qualquer app de planilhas pelo tempo que quiser. Importar para o Outlayr também é grátis para cada linha cuja categoria tem o mesmo nome de uma das suas. O Outlayr Pro associa os outros nomes de categoria aos seus com IA e cria uma categoria para os que continuarem sem correspondência.",
                            fr: "Oui, le classeur Excel comme le CSV. Utilisez-les dans n'importe quel tableur, aussi longtemps que vous voulez. L'import dans Outlayr est gratuit lui aussi pour chaque ligne dont la catégorie porte le même nom qu'une des vôtres. Outlayr Pro associe les autres noms de catégorie aux vôtres avec l'IA et crée une catégorie pour ceux qui restent sans correspondance.",
                        }),
                        question: t({
                            en: "Is the template free?",
                            es: "¿La plantilla es gratis?",
                            pt: "A planilha é grátis?",
                            fr: "Le modèle est-il gratuit ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes, and with Numbers. Outlayr reads a CSV with commas between columns. Some spreadsheet apps save CSV files with semicolons where decimals are written with a comma. If yours does, download the CSV from Google Sheets, which uses commas.",
                            es: "Sí, y también con Numbers. Outlayr lee un CSV con comas entre columnas. Algunas hojas de cálculo guardan los CSV con punto y coma en los países donde los decimales se escriben con coma. Si la tuya lo hace, descarga el CSV desde Google Sheets, que usa comas.",
                            pt: "Sim, e também com o Numbers. O Outlayr lê um CSV com vírgulas entre as colunas. Alguns apps de planilha salvam o CSV com ponto e vírgula nos países onde os decimais levam vírgula, como o Brasil. Se o seu fizer isso, baixe o CSV pelo Planilhas Google, que usa vírgulas.",
                            fr: "Oui, et avec Numbers. Outlayr lit un CSV avec des virgules entre les colonnes. Certains tableurs enregistrent les CSV avec des points-virgules dans les pays où les décimales s'écrivent avec une virgule, comme la France. Si c'est le cas du vôtre, téléchargez le CSV depuis Google Sheets, qui utilise des virgules.",
                        }),
                        question: t({
                            en: "Does it work with Excel and Google Sheets?",
                            es: "¿Funciona con Excel y Google Sheets?",
                            pt: "Funciona com Excel e Planilhas Google?",
                            fr: "Fonctionne-t-il avec Excel et Google Sheets ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Outlayr imports CSV files only. Open the Transactions sheet and save it as CSV UTF-8, which Excel writes for that sheet alone, then import that file.",
                            es: "No. Outlayr solo importa archivos CSV. Abre la hoja Movimientos y guárdala como CSV UTF-8, que Excel escribe solo para esa hoja, y luego importa ese archivo.",
                            pt: "Não. O Outlayr só importa arquivos CSV. Abra a aba Lançamentos e salve como CSV UTF-8, que o Excel grava só para essa aba, e depois importe esse arquivo.",
                            fr: "Non. Outlayr n'importe que des fichiers CSV. Ouvrez la feuille Opérations et enregistrez-la en CSV UTF-8, qu'Excel écrit pour cette seule feuille, puis importez ce fichier.",
                        }),
                        question: t({
                            en: "Can I import the Excel file directly?",
                            es: "¿Puedo importar el archivo de Excel directamente?",
                            pt: "Posso importar o arquivo do Excel direto?",
                            fr: "Puis-je importer directement le fichier Excel ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Only the rows on Transactions come in. Set your budgets again in Outlayr in Balances, under Categories, where it also shows where your pace ends.",
                            es: "No. Solo entran las filas de Movimientos. Vuelve a poner tus presupuestos en Outlayr, en Saldos, en Categorías, donde además te muestra a dónde te lleva tu ritmo.",
                            pt: "Não. Só entram as linhas de Lançamentos. Defina seus orçamentos de novo no Outlayr, em Saldos, em Categorias, onde ele também mostra aonde seu ritmo leva.",
                            fr: "Non. Seules les lignes d'Opérations sont importées. Recréez vos budgets dans Outlayr, dans Soldes, sous Catégories, où l'app montre aussi où mène votre rythme.",
                        }),
                        question: t({
                            en: "Do my budgets import too?",
                            es: "¿Mis presupuestos también se importan?",
                            pt: "Meus orçamentos também são importados?",
                            fr: "Mes budgets sont-ils importés aussi ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "It is listed as skipped before anything is saved, with the reason: an unreadable date or amount, or no matching category. With Pro, a category Outlayr does not have yet is created instead. Rows that look already imported are flagged too, so you can leave them out.",
                            es: "Aparece como omitida antes de guardar, con el motivo: una fecha o un monto ilegible, o sin categoría coincidente. Con Pro, una categoría que Outlayr aún no tiene se crea en su lugar. Las filas que parecen ya importadas también se marcan, para que las dejes fuera.",
                            pt: "Ela aparece como ignorada antes de qualquer coisa ser salva, com o motivo: uma data ou um valor ilegível, ou nenhuma categoria correspondente. Com o Pro, uma categoria que o Outlayr ainda não tem é criada no lugar. Linhas que parecem já importadas também são marcadas, para você deixá-las de fora.",
                            fr: "Elle apparaît comme ignorée avant tout enregistrement, avec la raison : une date ou un montant illisible, ou aucune catégorie correspondante. Avec Pro, une catégorie qu'Outlayr n'a pas encore est créée à la place. Les lignes qui semblent déjà importées sont signalées aussi, pour que vous puissiez les écarter.",
                        }),
                        question: t({
                            en: "What if a row cannot be read?",
                            es: "¿Y si una fila no se puede leer?",
                            pt: "E se uma linha não puder ser lida?",
                            fr: "Et si une ligne est illisible ?",
                        }),
                    },
                ],
                lead: t({
                    en: "An expense tracker template is a spreadsheet where you log each expense and it adds them up for you. This one is a free Excel workbook with a monthly summary, spending against a budget per category, and a chart, and also a plain CSV. Both have the columns Outlayr's CSV import reads, for when you move to the app.",
                    es: "Una plantilla de control de gastos es una hoja de cálculo donde anotas cada gasto y ella hace las sumas por ti. Esta es un libro de Excel gratis con un resumen del mes, lo gastado contra un presupuesto por categoría y un gráfico, y también un CSV simple. Los dos tienen las columnas que lee la importación de CSV de Outlayr, para cuando te cambies a la app.",
                    pt: "Uma planilha de controle de gastos é onde você anota cada despesa e ela faz as contas por você. Esta planilha de controle financeiro é grátis, feita no Excel para organizar o orçamento familiar, com resumo do mês, o gasto de cada categoria contra um orçamento e um gráfico, e vem também como um CSV simples. Os dois arquivos têm as colunas que a importação de CSV do Outlayr lê, para quando você passar para o app.",
                    fr: "Un modèle de budget est un tableau où vous notez chaque dépense et qui fait les totaux à votre place. Celui-ci est un tableau de budget Excel gratuit, avec un résumé mensuel, les dépenses face au budget de chaque catégorie et un graphique, et existe aussi en simple CSV. Les deux fichiers ont les colonnes que lit l'import CSV d'Outlayr, pour le jour où vous passerez à l'app.",
                }),
                meta: {
                    description: t({
                        en: "A free Excel expense tracker with a monthly summary for the currency you pick, spending against a budget by category, and a chart. Also as a CSV.",
                        es: "Plantilla de control de gastos en Excel gratis: resumen del mes por moneda, lo gastado contra un presupuesto por categoría y un gráfico. También en CSV.",
                        pt: "Planilha de gastos grátis no Excel: resumo do mês por moeda, o gasto de cada categoria contra o orçamento e um gráfico. Também em CSV.",
                        fr: "Modèle de budget mensuel Excel gratuit : résumé du mois par devise, dépenses face au budget de chaque catégorie et un graphique. Aussi en CSV.",
                    }),
                    title: t({
                        en: "Free Expense Tracker Template for Excel (2026) · Outlayr",
                        es: "Plantilla de control de gastos en Excel gratis · Outlayr",
                        pt: "Planilha de controle financeiro grátis no Excel · Outlayr",
                        fr: "Tableau de budget Excel gratuit, modèle mensuel · Outlayr",
                    }),
                },
                related: [
                    "/guides/mint-alternative",
                    "/guides/how-to-track-expenses",
                    "/guides/multi-currency-expense-tracker",
                ] satisfies PageRef[],
                steps: [
                    {
                        text: t({
                            en: "Delete the sample rows and add one row per expense or income. Keep the header row as it is so Outlayr finds each column.",
                            es: "Borra las filas de ejemplo y agrega una fila por cada gasto o ingreso. Deja la fila de encabezados como está para que Outlayr encuentre cada columna.",
                            pt: "Apague as linhas de exemplo e adicione uma linha para cada despesa ou receita. Deixe a linha de cabeçalhos como está para o Outlayr encontrar cada coluna.",
                            fr: "Supprimez les lignes d'exemple et ajoutez une ligne par dépense ou revenu. Gardez la ligne d'en-têtes telle quelle pour qu'Outlayr trouve chaque colonne.",
                        }),
                        title: t({ en: "Fill it in", es: "Llénala", pt: "Preencha", fr: "Remplissez-le" }),
                    },
                    {
                        text: t({
                            en: "From the Excel workbook, save only the Transactions sheet as CSV UTF-8. Keep commas between columns, and save the file to Files or iCloud Drive on your iPhone. On Android, save it to Downloads or Google Drive.",
                            es: "Desde el libro de Excel, guarda solo la hoja Movimientos como CSV UTF-8. Deja las comas entre columnas y guarda el archivo en Archivos o iCloud Drive en tu iPhone. En Android, guárdalo en Descargas o en Google Drive.",
                            pt: "Na planilha de Excel, salve só a aba Lançamentos como CSV UTF-8. Mantenha as vírgulas entre as colunas e salve o arquivo em Arquivos ou no iCloud Drive do seu iPhone. No Android, salve em Downloads ou no Google Drive.",
                            fr: "Depuis le classeur Excel, enregistrez seulement la feuille Opérations en CSV UTF-8. Gardez les virgules entre les colonnes et enregistrez le fichier dans Fichiers ou iCloud Drive sur votre iPhone. Sur Android, enregistrez-le dans Téléchargements ou Google Drive.",
                        }),
                        title: t({
                            en: "Save it as a CSV",
                            es: "Guárdala como CSV",
                            pt: "Salve como CSV",
                            fr: "Enregistrez-le en CSV",
                        }),
                    },
                    {
                        text: t({
                            en: "In Settings, tap Import data, then CSV file, and pick the file. Check the rows and tap Import.",
                            es: "En Configuración, toca Importar datos, luego Archivo CSV, y elige el archivo. Revisa las filas y toca Importar.",
                            pt: "Em Ajustes, toque em Importar dados, depois em Arquivo CSV, e escolha o arquivo. Revise as linhas e toque em Importar.",
                            fr: "Dans Réglages, touchez Importer des données, puis Fichier CSV, et choisissez le fichier. Vérifiez les lignes et touchez Importer.",
                        }),
                        title: t({
                            en: "Import it in Outlayr",
                            es: "Impórtala en Outlayr",
                            pt: "Importe no Outlayr",
                            fr: "Importez-le dans Outlayr",
                        }),
                    },
                ],
                table: {
                    caption: t({
                        en: "The Summary sheet with the sample rows, for October 2026 in US dollars: 3,200.00 income, 1,776.67 spent, 1,423.33 net. Type a budget next to each category and Left fills in. Change the month or the currency at the top of the sheet.",
                        es: "La hoja Resumen con las filas de ejemplo, para octubre de 2026 en dólares: 1,500.00 de ingresos, 580.59 gastado y 919.41 neto. Salud y Restaurantes quedan en 0.00 porque se pagaron en bolívares y en pesos. Escribe un presupuesto junto a cada categoría y Disponible se llena solo. Cambia el mes o la moneda arriba de la hoja.",
                        pt: "A aba Resumo com as linhas de exemplo, para outubro de 2026 em reais: 6.500,00 de receitas, 3.108,25 de despesas e 3.391,75 de saldo. O Uber em Buenos Aires fica de fora porque foi pago em pesos argentinos. Escreva um orçamento ao lado de cada categoria e Disponível se preenche sozinho. Mude o mês ou a moeda no alto da aba.",
                        fr: "La feuille Résumé avec les lignes d'exemple, pour octobre 2026 en euros : 2 400,00 de revenus, 1 087,99 de dépenses et 1 312,01 de solde. Restaurants reste à 0,00, car le dîner a été payé en dollars canadiens. Saisissez un budget à côté de chaque catégorie et Reste se remplit tout seul. Changez le mois ou la devise en haut de la feuille.",
                    }),
                    columns: [t({ en: "Spent", es: "Gastado", pt: "Gasto", fr: "Dépensé" })],
                    corner: t({ en: "Category", es: "Categoría", pt: "Categoria", fr: "Catégorie" }),
                    rows: [
                        {
                            cells: [t({ en: "1,450.00", es: "450.00", pt: "2.200,00", fr: "850,00" })],
                            label: t({ en: "Rent", es: "Renta", pt: "Aluguel", fr: "Loyer" }),
                        },
                        {
                            cells: [t({ en: "142.18", es: "85.40", pt: "486,90", fr: "96,40" })],
                            label: t({ en: "Groceries", es: "Supermercado", pt: "Mercado", fr: "Courses" }),
                        },
                        {
                            cells: [t({ en: "48.20", es: "0.00", pt: "89,70", fr: "18,90" })],
                            label: t({ en: "Fuel", es: "Salud", pt: "Saúde", fr: "Santé" }),
                        },
                        {
                            cells: [t({ en: "96.30", es: "38.20", pt: "214,35", fr: "64,20" })],
                            label: t({ en: "Utilities", es: "Servicios", pt: "Contas da casa", fr: "Charges" }),
                        },
                        {
                            cells: [t({ en: "24.50", es: "0.00", pt: "72,40", fr: "0,00" })],
                            label: t({ en: "Dining Out", es: "Restaurantes", pt: "Restaurantes", fr: "Restaurants" }),
                        },
                        {
                            cells: [t({ en: "15.49", es: "6.99", pt: "44,90", fr: "13,49" })],
                            label: t({ en: "Entertainment", es: "Entretenimiento", pt: "Lazer", fr: "Loisirs" }),
                        },
                    ],
                },
                title: t({
                    en: "Free expense tracker template for Excel",
                    es: "Plantilla de control de gastos en Excel, gratis",
                    pt: "Planilha de controle financeiro grátis para Excel",
                    fr: "Modèle de budget mensuel Excel, gratuit",
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
                            en: "English, Spanish, Portuguese, and French, following the app's language",
                            es: "Inglés, español, portugués y francés, según el idioma de la app",
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
                            en: "English, Spanish, Portuguese, and French. Outlayr listens in the language the app is set to.",
                            es: "Inglés, español, portugués y francés. Outlayr escucha en el idioma que tenga la app.",
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
                    "/guides/ai-expense-tracker",
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
                    en: "Say an expense and Outlayr logs it",
                    es: "Dicta un gasto y Outlayr lo registra",
                }),
            },
            "ynab-alternatives": {
                apps: [
                    ACTUAL,
                    {
                        facts: [
                            ...COPILOT_FACTS,
                            {
                                label: LABELS.watch,
                                source: "https://help.copilot.money/en/articles/10262766-investment-account-limitations",
                                text: t({
                                    en: "No CSV or XLS import, so your YNAB history cannot come in",
                                    es: "No importa CSV ni XLS, así que tu historial de YNAB no puede entrar",
                                }),
                            },
                        ],
                        name: "Copilot Money",
                        slug: "copilot",
                        summary: t(RIVALS.copilot),
                    },
                    {
                        facts: [
                            ...EVERYDOLLAR_FACTS,
                            {
                                label: LABELS.watch,
                                source: "https://everydollar.help.ramseysolutions.com/hc/en-us/articles/360040571391-Export-Tracked-Transactions",
                                text: t({
                                    en: "Outside the US you get only the free web budget, and CSV export is Premium, one month per file",
                                    es: "Fuera de EE. UU. solo tienes el presupuesto gratis en la web, y exportar a CSV es de Premium, un mes por archivo",
                                }),
                            },
                        ],
                        name: "EveryDollar",
                        slug: "everydollar",
                        summary: t(RIVALS.everydollar),
                    },
                    GOODBUDGET,
                    MONARCH,
                    {
                        facts: [
                            ...OUTLAYR_FACTS,
                            {
                                label: LABELS.watch,
                                text: t({
                                    en: "No web app. A YNAB export comes in as a comma-separated CSV, without accounts or split lines",
                                    es: "Sin app web. Una exportación de YNAB entra como CSV separado por comas, sin cuentas ni divisiones",
                                }),
                            },
                        ],
                        name: "Outlayr",
                        slug: "outlayr",
                        summary: t(OUTLAYR_LEAD),
                    },
                    POCKETGUARD,
                ],
                facts: [
                    {
                        label: "Actual Budget",
                        text: t({
                            en: "Best if you want free envelope budgeting on a computer, and to bring your YNAB plan with its YNAB importers",
                            es: "Ideal si quieres presupuestar por sobres gratis en la computadora y traer tu plan de YNAB con sus importadores",
                        }),
                    },
                    {
                        label: "Copilot Money",
                        text: t({
                            en: "Best if you live in the US, use an iPhone, iPad, or Mac, and want linked accounts to sync on their own",
                            es: "Ideal si vives en EE. UU., usas iPhone, iPad o Mac y quieres que tus cuentas vinculadas se sincronicen solas",
                        }),
                    },
                    {
                        label: "EveryDollar",
                        text: t({
                            en: "Best if you live in the US and want a zero-based monthly budget with a free version",
                            es: "Ideal si vives en EE. UU. y quieres un presupuesto mensual de base cero con versión gratis",
                        }),
                    },
                    {
                        label: "Goodbudget",
                        text: t({
                            en: "Best if you want envelopes by hand on the web, Android, and iPhone",
                            es: "Ideal si quieres sobres a mano en la web, Android y iPhone",
                        }),
                    },
                    {
                        label: "Monarch Money",
                        text: t({
                            en: "Best if you live in the US or Canada and want net worth, budgets, reports, and goals from linked accounts",
                            es: "Ideal si vives en EE. UU. o Canadá y quieres patrimonio, presupuestos, reportes y metas desde cuentas vinculadas",
                        }),
                    },
                    {
                        label: "Outlayr",
                        text: t({
                            en: "Best if you spend in more than one currency and want to start free, logging by sentence, voice, or receipt",
                            es: "Ideal si gastas en más de una moneda y quieres empezar gratis, registrando con una oración, tu voz o un recibo",
                        }),
                    },
                    {
                        label: "PocketGuard",
                        text: t({
                            en: "Best if you live in the US or Canada, want linked accounts to sync, and would rather pay once",
                            es: "Ideal si vives en EE. UU. o Canadá, quieres que tus cuentas vinculadas se sincronicen y prefieres pagar una sola vez",
                        }),
                    },
                ],
                faq: [
                    {
                        answer: t({
                            en: "It depends on what you want to keep. Actual Budget keeps envelope budgeting, free, and imports YNAB plans. EveryDollar keeps a zero-based monthly budget in the US. Goodbudget keeps envelopes on the web and both phones. Monarch and Copilot sync linked accounts in the US, and Monarch also in Canada. PocketGuard syncs linked accounts in the US and Canada and can be bought once. Outlayr starts free and logs by sentence, voice, or receipt in 165 currencies.",
                            es: "Depende de lo que quieras conservar. Actual Budget conserva el presupuesto por sobres, gratis, e importa planes de YNAB. EveryDollar conserva un presupuesto mensual de base cero en EE. UU. Goodbudget conserva los sobres en la web y en los dos celulares. Monarch y Copilot sincronizan cuentas vinculadas en EE. UU., y Monarch también en Canadá. PocketGuard sincroniza cuentas vinculadas en EE. UU. y Canadá y se puede comprar en un solo pago. Outlayr empieza gratis y registra con una oración, tu voz o un recibo en 165 monedas.",
                        }),
                        question: t({
                            en: "What is the best YNAB alternative?",
                            es: "¿Cuál es la mejor alternativa a YNAB?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Actual Budget is free software, though syncing devices needs a server. EveryDollar has a free version, Goodbudget a free plan with 20 envelopes, 1 account, and 1 year of history, and Outlayr a free plan with 3 accounts and 2 category budgets. Copilot, Monarch, and PocketGuard are paid after a trial.",
                            es: "Sí. Actual Budget es software gratis, aunque sincronizar dispositivos requiere un servidor. EveryDollar tiene una versión gratis, Goodbudget un plan gratis con 20 sobres, 1 cuenta y 1 año de historial, y Outlayr un plan gratis con 3 cuentas y 2 presupuestos por categoría. Copilot, Monarch y PocketGuard son de pago después de una prueba.",
                        }),
                        question: t({
                            en: "Is there a free YNAB alternative?",
                            es: "¿Hay una alternativa gratis a YNAB?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Of these seven, Outlayr is the only one whose own site says it converts between currencies: 165 of them, each purchase at the rate from its day. Actual Budget offers an experimental fixed-rate rule. Goodbudget shows no currency symbols, Monarch shows everything as dollars, and Copilot is US dollars only. EveryDollar and PocketGuard do not say.",
                            es: "De estas siete, Outlayr es la única cuyo propio sitio dice que convierte entre monedas: 165, cada compra con la tasa de su día. Actual Budget ofrece una regla experimental con tasa fija. Goodbudget no muestra símbolos de moneda, Monarch lo muestra todo en dólares y Copilot solo usa dólares estadounidenses. EveryDollar y PocketGuard no lo dicen.",
                        }),
                        question: t({
                            en: "Which YNAB alternative handles more than one currency?",
                            es: "¿Qué alternativa a YNAB maneja más de una moneda?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes, the transactions. Export your plan from YNAB's web app, then import the transactions file in Outlayr under Settings, Import data, CSV file. The date, the payee, and the category come in; accounts, splits, and targets do not. Save a tab-separated file as a comma CSV first.",
                            es: "Sí, los movimientos. Exporta tu plan desde la app web de YNAB y luego importa el archivo de movimientos en Outlayr en Configuración, Importar datos, Archivo CSV. Entran la fecha, el beneficiario y la categoría; no entran las cuentas, las divisiones ni las metas. Si el archivo está separado por tabulaciones, guárdalo antes como CSV con comas.",
                        }),
                        question: t({
                            en: "Can I move my YNAB history to Outlayr?",
                            es: "¿Puedo pasar mi historial de YNAB a Outlayr?",
                        }),
                    },
                    COST_FAQ,
                ],
                lead: t({
                    en: "A YNAB alternative is a budget app you move to when YNAB's $109 a year, its one currency per plan, or its way of budgeting stops fitting. Seven follow, each best for something different: Actual Budget, Copilot Money, EveryDollar, Goodbudget, Monarch Money, Outlayr, and PocketGuard. Outlayr is ours; the other six are not.",
                    es: "Una alternativa a YNAB es una app de presupuesto a la que te cambias cuando los US$109 al año de YNAB, su única moneda por plan o su forma de presupuestar dejan de servirte. Aquí van siete, cada una mejor para algo distinto: Actual Budget, Copilot Money, EveryDollar, Goodbudget, Monarch Money, Outlayr y PocketGuard. Outlayr es nuestra; las otras seis no.",
                }),
                meta: {
                    description: t({
                        en: "Actual Budget, Copilot, EveryDollar, Goodbudget, Monarch, Outlayr, and PocketGuard next to YNAB: price, platforms, how entries get in, and currencies.",
                        es: "Actual Budget, Copilot, EveryDollar, Goodbudget, Monarch, Outlayr y PocketGuard junto a YNAB: precio, plataformas, cómo registras y monedas.",
                    }),
                    title: t({
                        en: "7 YNAB Alternatives, Compared (2026) · Outlayr",
                        es: "7 alternativas a YNAB, comparadas (2026) · Outlayr",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "YNAB exports from its web app only. Click your plan's name at the top of the left sidebar, then Export Plan, and you get two files: your plan and your transactions. For currencies written with a decimal comma, YNAB writes tab-separated files. The export leaves out targets and category notes, and photos come out one at a time. If you only tried YNAB, export soon: it deletes inactive trial accounts 120 days after the trial ends.",
                                es: "YNAB exporta solo desde su app web. Haz clic en el nombre de tu plan, arriba en la barra lateral izquierda, y luego en Export Plan, y recibes dos archivos: tu plan y tus movimientos. En las monedas que usan coma decimal, YNAB escribe archivos separados por tabulaciones. La exportación no incluye las metas ni las notas de categoría, y las fotos salen de una en una. Si solo probaste YNAB, exporta pronto: borra las cuentas de prueba inactivas 120 días después de que termina la prueba.",
                            }),
                            t({
                                en: "Actual Budget has importers for YNAB4 and nYNAB. Goodbudget, Monarch on the web, PocketGuard, and Outlayr take a CSV. Copilot imports no CSV or XLS files, and EveryDollar imports no files.",
                                es: "Actual Budget tiene importadores para YNAB4 y nYNAB. Goodbudget, Monarch en la web, PocketGuard y Outlayr aceptan un CSV. Copilot no importa archivos CSV ni XLS, y EveryDollar no importa archivos.",
                            }),
                            t({
                                en: "In Outlayr, import the transactions file. The date, the payee, and the category come in, while accounts, flags, cleared status, split lines, the plan file, and targets do not. Outlayr reads comma-separated files only and one amount column, so save a tab-separated file as CSV first, and if your file splits outflow and inflow, merge them into one column and add a Type column with Expense or Income.",
                                es: "En Outlayr, importa el archivo de movimientos. Entran la fecha, el beneficiario y la categoría, y no entran las cuentas, las banderas, el estado de conciliado, las divisiones, el archivo del plan ni las metas. Outlayr solo lee archivos separados por comas y una sola columna de monto, así que guarda antes como CSV un archivo separado por tabulaciones, y si tu archivo separa salidas y entradas, únelas en una columna y agrega una columna Type con Expense o Income.",
                            }),
                        ],
                        id: "ynab-history",
                        title: t({ en: "Bringing your YNAB history", es: "Cómo traer tu historial de YNAB" }),
                    },
                ],
                picked: [
                    t({
                        en: "Each app here is a budget app people move to from YNAB, and each one fits a different reason to leave, from price to currencies to how entries get in. They are in alphabetical order, not ranked.",
                        es: "Cada app de esta lista es una app de presupuesto a la que la gente se cambia desde YNAB, y cada una sirve para una razón distinta para irse, del precio a las monedas o a cómo registras. Van en orden alfabético, no por puesto.",
                    }),
                    LIST_PICKED_FACTS,
                    LIST_PICKED_OURS,
                ],
                related: ["/compare/ynab", "/guides/best-budget-apps", "/compare/goodbudget"] satisfies PageRef[],
                sources: LIST_SOURCES,
                title: t({
                    en: "YNAB alternatives, by what you need",
                    es: "Alternativas a YNAB, según lo que necesitas",
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
                        en: "Outlayr next to YNAB, Monarch, Copilot, Spendee, and eight more apps: price, how entries get in, and platforms, checked at each app's own site.",
                        es: "Outlayr junto a YNAB, Monarch, Copilot, Spendee y ocho apps más: precio, cómo registras y plataformas, revisados en el sitio de cada app.",
                    }),
                    title: t({
                        en: "Outlayr vs YNAB, Monarch, Copilot, and More: Compared",
                        es: "Outlayr vs YNAB, Monarch, Copilot y más: comparativas",
                    }),
                },
                title: t({ en: "Outlayr next to the apps you know", es: "Outlayr junto a las apps que conoces" }),
            },
            guides: {
                lead: t({
                    en: "How each part of Outlayr works, step by step, with what the free plan includes.",
                    es: "Cómo funciona cada parte de Outlayr, paso a paso, con lo que incluye el plan gratis.",
                    pt: "Como cada parte do Outlayr funciona, passo a passo, com o que o plano grátis inclui.",
                    fr: "Comment fonctionne chaque partie d'Outlayr, étape par étape, avec ce que comprend la formule gratuite.",
                }),
                meta: {
                    title: t({
                        en: "Expense Tracking Guides · Outlayr",
                        es: "Guías para controlar tus gastos · Outlayr",
                        pt: "Guias para controlar seus gastos · Outlayr",
                        fr: "Guides pour suivre vos dépenses · Outlayr",
                    }),
                },
                title: t({
                    en: "Expense tracking guides, step by step",
                    es: "Guías para controlar tus gastos, paso a paso",
                    pt: "Guias para controlar seus gastos, passo a passo",
                    fr: "Guides pour suivre vos dépenses, étape par étape",
                }),
            },
        },
        labels: {
            feature: t({ en: "Feature", es: "Función", pt: "Recurso", fr: "Fonctionnalité" }),
            fit: t({
                en: "Which one fits",
                es: "Cuál te conviene",
                pt: "Qual combina com você",
                fr: "Lequel vous convient",
            }),
            fitHeading: insert(
                t({ en: "{{name}}, if you", es: "{{name}}, si", pt: "{{name}}, se você", fr: "{{name}}, si vous" })
            ),
            questions: t({ en: "Questions", es: "Preguntas", pt: "Perguntas", fr: "Questions" }),
            checked: insert(
                t({
                    en: ", checked {{date}}.",
                    es: ", revisados el {{date}}.",
                    pt: ", verificados em {{date}}.",
                    fr: ", vérifiées le {{date}}.",
                })
            ),
            source: insert(
                t({
                    en: "{{name}} details from",
                    es: "Datos de {{name}} tomados de",
                    pt: "Dados do {{name}} tirados de",
                    fr: "Informations sur {{name}} tirées de",
                })
            ),
            steps: t({ en: "How it works", es: "Cómo funciona", pt: "Como funciona", fr: "Comment ça marche" }),
            summary: {
                app: t({ en: "App", es: "App", pt: "App", fr: "App" }),
                bestIf: t({ en: "Who it fits", es: "Para quién es", pt: "Para quem é", fr: "Pour qui" }),
                platforms: LABELS.platforms,
                price: LABELS.price,
            },
            byline: t({
                en: "By Daniel Esteves",
                es: "Por Daniel Esteves",
                pt: "Por Daniel Esteves",
                fr: "Par Daniel Esteves",
            }),
            updatedOn: insert(
                t({
                    en: "Updated {{date}}",
                    es: "Actualizado el {{date}}",
                    pt: "Atualizado em {{date}}",
                    fr: "Mis à jour le {{date}}",
                })
            ),
            checkedOn: insert(
                t({
                    en: "Checked {{date}}",
                    es: "Revisado el {{date}}",
                    pt: "Verificado em {{date}}",
                    fr: "Vérifié le {{date}}",
                })
            ),
            contents: t({ en: "On this page", es: "En esta página", pt: "Nesta página", fr: "Sur cette page" }),
            picked: t({
                en: "How we picked",
                es: "Cómo las elegimos",
                pt: "Como escolhemos",
                fr: "Comment nous avons choisi",
            }),
            cta: {
                lead: t({
                    en: "Free to start. No ads on any plan.",
                    es: "Gratis para empezar. Sin anuncios en ningún plan.",
                    pt: "Grátis para começar. Sem anúncios em nenhum plano.",
                    fr: "Gratuit pour commencer. Aucune publicité, quelle que soit la formule.",
                }),
                title: t({
                    en: "Track every expense in one sentence",
                    es: "Registra cada gasto en una oración",
                    pt: "Registre cada gasto em uma frase",
                    fr: "Notez chaque dépense en une phrase",
                }),
            },
            exportsChecked: insert(
                t({
                    en: "Each export detail links to the page it was read on, checked {{date}}.",
                    es: "Cada dato de exportación enlaza a la página donde se leyó, revisado el {{date}}.",
                    pt: "Cada dado de exportação tem link para a página onde foi lido, verificado em {{date}}.",
                    fr: "Chaque détail d'export renvoie à la page où il a été relevé, vérifié le {{date}}.",
                })
            ),
            movingFrom: insert(
                t({
                    en: "Moving from {{name}}",
                    es: "Cómo pasarte desde {{name}}",
                    pt: "Como migrar do {{name}}",
                    fr: "Quitter {{name}} pour Outlayr",
                })
            ),
            related: t({ en: "Keep reading", es: "Sigue leyendo", pt: "Continue lendo", fr: "À lire aussi" }),
            sideBySide: insert(
                t({
                    en: "Outlayr and {{name}}, side by side",
                    es: "Outlayr y {{name}}, lado a lado",
                    pt: "Outlayr e {{name}} lado a lado",
                    fr: "Outlayr et {{name}} côte à côte",
                })
            ),
        },
    },
    key: "answers",
} satisfies Dictionary;

export default answers;
