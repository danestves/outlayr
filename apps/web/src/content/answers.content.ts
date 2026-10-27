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
    free: t({ en: "Free plan", es: "Plan gratis" }),
    license: t({ en: "License", es: "Licencia" }),
    phone: t({ en: "On a phone", es: "En el celular" }),
    platforms: t({ en: "Runs on", es: "Funciona en" }),
    price: t({ en: "Price", es: "Precio" }),
    style: t({ en: "Budget style", es: "Tipo de presupuesto" }),
    subscriptions: t({ en: "Subscriptions", es: "Suscripciones" }),
    watch: t({ en: "Watch out for", es: "Ten en cuenta" }),
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

const OUTLAYR_FREE = t({
    en: "2 accounts, 2 category budgets plus one for the month, 20 voice or receipt captures every 30 days, and accounts in one currency",
    es: "2 cuentas, 2 presupuestos por categoría más uno para el mes, 20 capturas de voz o de recibos cada 30 días y cuentas en una moneda",
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
                            en: "Yes. Outlayr is offered in 175 countries and regions, Chile and Mexico included, with 165 currencies, in English, Spanish, Portuguese, and French. Fintonic is offered only in Spain and connects Spanish banks.",
                            es: "Sí. Outlayr se ofrece en 175 países y regiones, Chile y México incluidos, con 165 monedas, en inglés, español, portugués y francés. Fintonic solo se ofrece en España y conecta bancos españoles.",
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
                moving: [
                    {
                        label: MOVING.export,
                        source: "https://www.fintonic.com/blog/descubre-el-nuevo-fintonic/",
                        text: t({
                            en: "Fintonic's site doesn't describe an export today. Its blog said in 2018 that you could download your movements as an Excel file, but not where to find it.",
                            es: "El sitio de Fintonic no explica hoy cómo exportar. Su blog decía en 2018 que podías descargar tus movimientos en un Excel, pero no dónde encontrarlo.",
                        }),
                    },
                    {
                        label: MOVING.file,
                        text: t({
                            en: "If you get an Excel file, save it as a comma-separated CSV first, since Outlayr reads only CSV files.",
                            es: "Si consigues un Excel, guárdalo primero como CSV separado por comas, porque Outlayr solo lee archivos CSV.",
                        }),
                    },
                    {
                        label: MOVING.into,
                        text: t({
                            en: "Import it in Settings, under Import data, as a CSV file, and check the columns Outlayr picked before you import. Or start fresh: type a purchase as one sentence, say it, or scan the receipt.",
                            es: "Impórtalo en Configuración, en Importar datos, como archivo CSV, y revisa las columnas que eligió Outlayr antes de importar. O empieza de cero: escribe una compra en una oración, díctala o escanea el recibo.",
                        }),
                    },
                    {
                        label: MOVING.lost,
                        text: t({
                            en: "Your FinScore, alerts, and loan offers stay in Fintonic.",
                            es: "Tu FinScore, las alertas y las ofertas de préstamos se quedan en Fintonic.",
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
            goodbudget: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you spend in more than one currency, want all your history on the free plan, or would rather say or scan a purchase than fill in a form. Goodbudget fits better if you budget with envelopes, need a web or iPhone app today, or want US bank accounts to sync in Premium.",
                            es: "Sí, si gastas en más de una moneda, quieres todo tu historial en el plan gratis o prefieres dictar o escanear una compra en vez de llenar un formulario. Goodbudget te conviene más si presupuestas con sobres, necesitas una app web o para iPhone hoy, o quieres que tus cuentas de bancos de EE. UU. se sincronicen en Premium.",
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
                        t({
                            en: "Need a web app or an iPhone app today",
                            es: "Necesitas una app web o para iPhone hoy",
                        }),
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
                            en: "Accounts and envelope amounts. Set your limits again on Budgets, and turn on carry-over to keep what you do not spend.",
                            es: "Las cuentas y los montos de los sobres. Vuelve a poner tus límites en Presupuestos y activa Acumular lo que sobre para conservar lo que no gastes.",
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
                    en: "Outlayr as a Goodbudget alternative.",
                    es: "Outlayr como alternativa a Goodbudget.",
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
                title: t({ en: "Outlayr as a Monarch alternative.", es: "Outlayr como alternativa a Monarch." }),
            },
            monefy: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want each purchase converted at the rate from its day, recurring entries and reminders on the free plan, or would rather say or scan a purchase than fill in a form. Monefy fits better if you want to log in two taps, sync through your own Google Drive or Dropbox, or use an iPhone today.",
                            es: "Sí, si quieres cada compra convertida con la tasa de su día, registros recurrentes y avisos en el plan gratis, o prefieres dictar o escanear una compra en vez de llenar un formulario. Monefy te conviene más si quieres registrar en dos toques, sincronizar con tu propio Google Drive o Dropbox, o usar un iPhone hoy.",
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
                        t({ en: "Use an iPhone today", es: "Usas un iPhone hoy" }),
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
                            en: "Accounts. On the free plan, Outlayr holds 2 accounts in one currency, and Pro allows any number of both.",
                            es: "Las cuentas. En el plan gratis, Outlayr permite 2 cuentas en una moneda, y Pro permite las que quieras de ambas.",
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
                title: t({ en: "Outlayr as a Monefy alternative.", es: "Outlayr como alternativa a Monefy." }),
            },
            "money-lover": {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want a free plan with no ads, recurring entries and reminders without paying, or voice and receipt captures that refill every 30 days. Money Lover fits better if you use an iPhone today, need a web app, or want linked bank accounts to sync on their own.",
                            es: "Sí, si quieres un plan gratis sin anuncios, registros recurrentes y avisos sin pagar, o capturas de voz y de recibos que se renuevan cada 30 días. Money Lover te conviene más si usas un iPhone hoy, necesitas una app web o quieres que tus cuentas de banco vinculadas se sincronicen solas.",
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
                    rival: [t({ en: "Use an iPhone today", es: "Usas un iPhone hoy" }), NEED_WEB, SYNC_ACCOUNTS],
                },
                lead: t({
                    en: `${OUTLAYR_LEAD.en} ${RIVALS.moneyLover.en}`,
                    es: `${OUTLAYR_LEAD.es} ${RIVALS.moneyLover.es}`,
                }),
                meta: {
                    description: t({
                        en: "Outlayr vs Money Lover: ads, recurring entries on the free plan, AI and receipt entry, platforms, and price. Money Lover facts checked in its help center, October 2026.",
                        es: "Outlayr vs Money Lover: anuncios, registros recurrentes gratis, registro con IA y recibos, plataformas y precio. Datos de Money Lover revisados en su centro de ayuda, octubre de 2026.",
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
                    en: "Outlayr as a Money Lover alternative.",
                    es: "Outlayr como alternativa a Money Lover.",
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
                    en: "Outlayr as an alternative to Wallet by BudgetBakers.",
                    es: "Outlayr como alternativa a Wallet by BudgetBakers.",
                }),
            },
            ynab: {
                faq: [
                    {
                        answer: t({
                            en: "It is if you want to start free, spend in more than one currency, or would rather say or scan a purchase than fill in a form. YNAB fits better if you want your bank to import transactions, or follow its give every dollar a job method. For six more options, see YNAB alternatives.",
                            es: "Sí, si quieres empezar gratis, gastas en más de una moneda o prefieres dictar o escanear una compra en vez de llenar un formulario. YNAB te conviene más si quieres que tu banco importe los movimientos, o si sigues su método de darle un trabajo a cada dólar. Para ver seis opciones más, mira Alternativas a YNAB.",
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
                title: t({ en: "Outlayr vs YNAB.", es: "Outlayr vs YNAB." }),
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
                    en: "An AI expense tracker turns a purchase you describe in your own words into a saved entry. In Outlayr, AI reads the sentence you say and the receipt you photograph, then fills in the amount, merchant, category, account, date, and currency. Typing fills the same sentence with taps, on your phone, with no signal needed.",
                    es: "Una app de gastos con IA convierte una compra que describes con tus palabras en un registro guardado. En Outlayr, la IA lee la oración que dictas y el recibo que fotografías, y llena el monto, el comercio, la categoría, la cuenta, la fecha y la moneda. Al escribir, llenas la misma oración con toques en tu celular, sin necesidad de señal.",
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
                    en: "Log an expense by typing or saying one sentence.",
                    es: "Registra un gasto escribiendo o dictando una oración.",
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
                                en: "This covers cards you swipe or tap without Apple Pay, as long as your bank's app sends a notification with the amount; those apps show up in the same list. When you pay with Apple Pay and your bank also sends a notification, the tap and the notification land as one entry, not two.",
                                es: "Así se registran las tarjetas que pasas o acercas sin Apple Pay, siempre que la app de tu banco envíe una notificación con el monto; esas apps aparecen en la misma lista. Cuando pagas con Apple Pay y tu banco también te envía una notificación, el pago y la notificación quedan en un solo registro, no en dos.",
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
                    en: "Log Apple Pay purchases as you pay.",
                    es: "Registra tus compras con Apple Pay al pagar.",
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
                                    en: "Android only until the iPhone app is out, and no web app. The free plan holds 2 category budgets plus one for the month",
                                    es: "Solo en Android hasta que salga la app para iPhone, y sin app web. El plan gratis permite 2 presupuestos por categoría más uno para el mes",
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
                            en: "Actual Budget is free software, with a server needed to sync devices. Goodbudget's free plan has 20 envelopes, 1 account, and 1 year of history. Spendee Basic has 1 wallet and 1 budget. EveryDollar has a free version, web only outside the US. Outlayr's free plan has 2 category budgets plus one for the month, and 2 accounts. Monarch, PocketGuard, and YNAB are paid after a trial.",
                            es: "Actual Budget es software gratis, con un servidor necesario para sincronizar dispositivos. El plan gratis de Goodbudget tiene 20 sobres, 1 cuenta y 1 año de historial. Spendee Basic tiene 1 billetera y 1 presupuesto. EveryDollar tiene una versión gratis, solo en la web fuera de EE. UU. El plan gratis de Outlayr tiene 2 presupuestos por categoría más uno para el mes, y 2 cuentas. Monarch, PocketGuard y YNAB son de pago después de una prueba.",
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
                    en: "The best budget apps, by how you budget.",
                    es: "Las mejores apps de presupuesto, según cómo presupuestas.",
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
                            en: "Yes. The app and this site are in English and Latin American Spanish, and the app is also in Spain's Spanish, in Portuguese from Brazil and from Portugal, and in French.",
                            es: "Sí. La app y este sitio están en inglés y en español de Latinoamérica, y la app también está en español de España, en portugués de Brasil y de Portugal, y en francés.",
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
                            en: "Rocket Money is available in the United States only, and Monarch in the United States and Canada. PocketGuard links accounts in the US, Canada, and the UK. Outlayr is offered in 175 countries and regions, in English, Spanish, Portuguese, and French.",
                            es: "Rocket Money solo está disponible en Estados Unidos, y Monarch en Estados Unidos y Canadá. PocketGuard vincula cuentas de EE. UU., Canadá y Reino Unido. Outlayr se ofrece en 175 países y regiones, en inglés, español, portugués y francés.",
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
                                en: "Outlayr, the app we make, logs an expense when you type a sentence, say it, or scan the receipt, in 165 currencies at the rate of the day. It is free to start on Android, with iPhone coming soon. If you already keep a spreadsheet, you can import it as a CSV.",
                                es: "Outlayr, la app que hacemos nosotros, registra un gasto cuando escribes una oración, la dictas o escaneas el recibo, en 165 monedas con la tasa del día. Es gratis para empezar en Android y pronto llegará a iPhone. Si ya llevas una hoja de cálculo, puedes importarla como CSV.",
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
                    en: "How to track your personal expenses.",
                    es: "Cómo llevar el control de tus gastos personales.",
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
                                    en: "Android only until the iPhone app is out, and no web app. A Mint CSV comes in without accounts, tags, or splits",
                                    es: "Solo en Android hasta que salga la app para iPhone, y sin app web. Un CSV de Mint entra sin cuentas, etiquetas ni divisiones",
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
                            en: "Yes, if you exported a CSV from Mint. Outlayr links each Mint category that matches one of yours by name, and flags rows that look already imported before you save. With Outlayr Pro, the other Mint category names are matched to yours with AI, up to 5,000 rows a file, so split a longer export by year.",
                            es: "Sí, si exportaste un CSV de Mint. Outlayr vincula cada categoría de Mint que coincide por nombre con una de las tuyas y marca las filas que parecen ya importadas antes de guardar. Con Outlayr Pro, los demás nombres de categoría de Mint se asignan a los tuyos con IA, hasta 5,000 filas por archivo, así que divide una exportación más larga por año.",
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
                                en: "Outlayr needs a date, an amount, and a category or description column, with commas between columns. Each Mint category that matches one of yours by name links on any plan. With Pro, AI matches the other category names to yours, up to 5,000 rows and 2 MB a file, and only merchant and category names are sent, never amounts, dates, or the file.",
                                es: "Outlayr necesita una columna de fecha, una de monto y una de categoría o descripción, con comas entre columnas. Cada categoría de Mint que coincide por nombre con una de las tuyas se vincula en cualquier plan. Con Pro, la IA asigna los demás nombres de categoría a los tuyos, hasta 5,000 filas y 2 MB por archivo, y solo se envían nombres de comercios y de categorías, nunca montos, fechas ni el archivo.",
                            }),
                            t({
                                en: "A Type column with words like debit and credit, or expense and income, keeps each row on its side. Without one, amounts come in positive and a row follows its category's income setting. Accounts, tags, and splits do not come in, so imported rows have no account.",
                                es: "Una columna Type con palabras como debit y credit, o expense e income, mantiene cada fila como gasto o ingreso. Sin ella, los montos entran en positivo y cada fila sigue lo que diga su categoría. Las cuentas, las etiquetas y las divisiones no entran, así que las filas importadas no tienen cuenta.",
                            }),
                            t({
                                en: "Rows that look already imported are flagged before you save, and rows Outlayr cannot read or match to a category are listed as skipped, with the reason.",
                                es: "Las filas que parecen ya importadas se marcan antes de guardar, y las que Outlayr no puede leer ni asignar a una categoría aparecen como omitidas, con el motivo.",
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
                    en: "Mint alternatives, and how to bring your Mint CSV.",
                    es: "Alternativas a Mint, y cómo traer tu CSV de Mint.",
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
                                en: "Outlayr is a multi-currency expense tracker that keeps the rate it used next to every entry. Rates for its 165 currencies come from Open Exchange Rates and refresh every hour. Bolívar rates come from Cotizave, which publishes the Banco Central de Venezuela (BCV) rate for the dollar and the euro and the USDT rate on Binance, and they refresh every 72 minutes.",
                                es: "Outlayr es una app para controlar gastos en varias monedas que guarda la tasa que usó junto a cada registro. Las tasas de sus 165 monedas vienen de Open Exchange Rates y se actualizan cada hora. Las del bolívar vienen de Cotizave, que publica la tasa del Banco Central de Venezuela (BCV) para el dólar y el euro y la tasa del USDT en Binance, y se actualizan cada 72 minutos.",
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
                                en: "In Venezuela, the official BCV rate and the rate people actually pay can be far apart. For a purchase in bolívares, Outlayr offers USD (BCV) and EUR (BCV), both from the central bank's published rates, and My rate for anything else, such as the parallel rate you paid.",
                                es: "En Venezuela, la tasa oficial del BCV y la que de verdad pagas pueden estar muy lejos. Para una compra en bolívares, Outlayr te ofrece USD (BCV) y EUR (BCV), las dos de las tasas que publica el banco central, y Mi tasa para cualquier otra, como la tasa paralela que pagaste.",
                            }),
                            t({
                                en: "If a shop priced something in dollars and charged you in bolívares, log the bolívar amount, tap the dollar amount, and type the dollar price; the rate comes out of the two. Changing dollars into bolívares between your own accounts is a transfer, not spending, and there the rate list also offers USDT (Binance), which is saved as your own rate.",
                                es: "Si una tienda puso el precio en dólares y te cobró en bolívares, registra el monto en bolívares, toca el monto en dólares y escribe el precio en dólares; la tasa sale de los dos. Cambiar dólares a bolívares entre tus propias cuentas es una transferencia, no un gasto, y ahí la lista de tasas también te ofrece USDT (Binance), que se guarda como tu propia tasa.",
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
                downloads: [
                    {
                        href: t({
                            en: "/templates/expense-tracker-template.xlsx",
                            es: "/templates/plantilla-control-de-gastos.xlsx",
                        }),
                        label: t({ en: "Download for Excel (.xlsx)", es: "Descargar para Excel (.xlsx)" }),
                    },
                    {
                        href: t({
                            en: "/templates/expense-tracker-template.csv",
                            es: "/templates/plantilla-control-de-gastos.csv",
                        }),
                        label: t({ en: "Download the CSV", es: "Descargar el CSV" }),
                    },
                ],
                facts: [
                    {
                        label: t({ en: "Sheets", es: "Hojas" }),
                        text: t({
                            en: "Transactions, Summary, and How to import, in an Excel workbook. The CSV is the Transactions sheet on its own",
                            es: "Movimientos, Resumen y Cómo importar, en un libro de Excel. El CSV es solo la hoja Movimientos",
                        }),
                    },
                    {
                        label: t({ en: "Summary", es: "Resumen" }),
                        text: t({
                            en: "Income, spending, and net for the month and currency you pick, spending against a budget per category, and a chart",
                            es: "Ingresos, gastos y neto del mes y la moneda que elijas, lo gastado contra un presupuesto por categoría y un gráfico",
                        }),
                    },
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
                            en: "In Settings, under Import data, as a CSV file. From the workbook, save the Transactions sheet as CSV first",
                            es: "En Configuración, en Importar datos, como archivo CSV. Desde el libro, guarda antes la hoja Movimientos como CSV",
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
                            en: "Yes, the Excel workbook and the CSV. Use them in any spreadsheet app for as long as you like. Importing into Outlayr is free too for every row whose category matches one of yours by name; the English file uses the categories a new Outlayr ledger starts with. Outlayr Pro matches other category names to yours with AI.",
                            es: "Sí, tanto el libro de Excel como el CSV. Úsalos en cualquier hoja de cálculo el tiempo que quieras. Importarlos a Outlayr también es gratis para cada fila cuya categoría coincide por nombre con una de las tuyas. Outlayr Pro asigna los demás nombres de categoría a los tuyos con IA.",
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
                            en: "No. Outlayr imports CSV files only. Open the Transactions sheet and save it as CSV UTF-8, which Excel writes for that sheet alone, then import that file.",
                            es: "No. Outlayr solo importa archivos CSV. Abre la hoja Movimientos y guárdala como CSV UTF-8, que Excel escribe solo para esa hoja, y luego importa ese archivo.",
                        }),
                        question: t({
                            en: "Can I import the Excel file directly?",
                            es: "¿Puedo importar el archivo de Excel directamente?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Only the rows on Transactions come in. Set your budgets again in Outlayr on Budgets, where it also shows where your pace ends.",
                            es: "No. Solo entran las filas de Movimientos. Vuelve a poner tus presupuestos en Outlayr, en Presupuestos, donde además te muestra a dónde te lleva tu ritmo.",
                        }),
                        question: t({
                            en: "Do my budgets import too?",
                            es: "¿Mis presupuestos también se importan?",
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
                    en: "An expense tracker template is a spreadsheet where you log each expense and it adds them up for you. This one is a free Excel workbook with a monthly summary, spending against a budget per category, and a chart, and also a plain CSV. Both have the columns Outlayr's CSV import reads, for when you move to the app.",
                    es: "Una plantilla de control de gastos es una hoja de cálculo donde anotas cada gasto y ella hace las sumas por ti. Esta es un libro de Excel gratis con un resumen del mes, lo gastado contra un presupuesto por categoría y un gráfico, y también un CSV simple. Los dos tienen las columnas que lee la importación de CSV de Outlayr, para cuando te cambies a la app.",
                }),
                meta: {
                    description: t({
                        en: "A free Excel expense tracker with a monthly summary for the currency you pick, spending against a budget by category, and a chart. Also as a CSV.",
                        es: "Plantilla de control de gastos en Excel gratis: resumen del mes por moneda, lo gastado contra un presupuesto por categoría y un gráfico. También en CSV.",
                    }),
                    title: t({
                        en: "Free Expense Tracker Template for Excel (2026) · Outlayr",
                        es: "Plantilla de control de gastos en Excel gratis · Outlayr",
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
                        }),
                        title: t({ en: "Fill it in", es: "Llénala" }),
                    },
                    {
                        text: t({
                            en: "From the Excel workbook, save only the Transactions sheet as CSV UTF-8. Keep commas between columns, and save the file to Files or iCloud Drive on your iPhone. On Android, save it to Downloads or Google Drive.",
                            es: "Desde el libro de Excel, guarda solo la hoja Movimientos como CSV UTF-8. Deja las comas entre columnas y guarda el archivo en Archivos o iCloud Drive en tu iPhone. En Android, guárdalo en Descargas o en Google Drive.",
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
                table: {
                    caption: t({
                        en: "The Summary sheet with the sample rows, for October 2026 in US dollars: 3,200.00 income, 1,776.67 spent, 1,423.33 net. Type a budget next to each category and Left fills in. Change the month or the currency at the top of the sheet.",
                        es: "La hoja Resumen con las filas de ejemplo, para octubre de 2026 en dólares: 1,500.00 de ingresos, 580.59 gastado y 919.41 neto. Salud y Restaurantes quedan en 0.00 porque se pagaron en bolívares y en pesos. Escribe un presupuesto junto a cada categoría y Disponible se llena solo. Cambia el mes o la moneda arriba de la hoja.",
                    }),
                    columns: [t({ en: "Spent", es: "Gastado" })],
                    corner: t({ en: "Category", es: "Categoría" }),
                    rows: [
                        { cells: [t({ en: "1,450.00", es: "450.00" })], label: t({ en: "Rent", es: "Renta" }) },
                        {
                            cells: [t({ en: "142.18", es: "85.40" })],
                            label: t({ en: "Groceries", es: "Supermercado" }),
                        },
                        { cells: [t({ en: "48.20", es: "0.00" })], label: t({ en: "Fuel", es: "Salud" }) },
                        { cells: [t({ en: "96.30", es: "38.20" })], label: t({ en: "Utilities", es: "Servicios" }) },
                        {
                            cells: [t({ en: "24.50", es: "0.00" })],
                            label: t({ en: "Dining Out", es: "Restaurantes" }),
                        },
                        {
                            cells: [t({ en: "15.49", es: "6.99" })],
                            label: t({ en: "Entertainment", es: "Entretenimiento" }),
                        },
                    ],
                },
                title: t({
                    en: "Free expense tracker template for Excel.",
                    es: "Plantilla de control de gastos en Excel, gratis.",
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
                    en: "Say an expense and Outlayr logs it.",
                    es: "Dicta un gasto y Outlayr lo registra.",
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
                                    en: "Android only until the iPhone app is out, and no web app. A YNAB export comes in as a comma-separated CSV, without accounts or split lines",
                                    es: "Solo en Android hasta que salga la app para iPhone, y sin app web. Una exportación de YNAB entra como CSV separado por comas, sin cuentas ni divisiones",
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
                            en: "Yes. Actual Budget is free software, though syncing devices needs a server. EveryDollar has a free version, Goodbudget a free plan with 20 envelopes, 1 account, and 1 year of history, and Outlayr a free plan with 2 accounts and 2 category budgets. Copilot, Monarch, and PocketGuard are paid after a trial.",
                            es: "Sí. Actual Budget es software gratis, aunque sincronizar dispositivos requiere un servidor. EveryDollar tiene una versión gratis, Goodbudget un plan gratis con 20 sobres, 1 cuenta y 1 año de historial, y Outlayr un plan gratis con 2 cuentas y 2 presupuestos por categoría. Copilot, Monarch y PocketGuard son de pago después de una prueba.",
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
                    en: "YNAB alternatives, by what you need.",
                    es: "Alternativas a YNAB, según lo que necesitas.",
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
            byline: t({ en: "By Daniel Esteves", es: "Por Daniel Esteves" }),
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
            exportsChecked: insert(
                t({
                    en: "Each export detail links to the page it was read on, checked {{date}}.",
                    es: "Cada dato de exportación enlaza a la página donde se leyó, revisado el {{date}}.",
                })
            ),
            movingFrom: insert(t({ en: "Moving from {{name}}", es: "Cómo pasarte desde {{name}}" })),
            related: t({ en: "Keep reading", es: "Sigue leyendo" }),
            sideBySide: insert(t({ en: "Outlayr and {{name}}, side by side", es: "Outlayr y {{name}}, lado a lado" })),
        },
    },
    key: "answers",
} satisfies Dictionary;

export default answers;
