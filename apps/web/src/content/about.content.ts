import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const about = {
    content: {
        allComparisons: t({ en: "All comparisons", es: "Todas las comparativas" }),
        allGuides: t({ en: "All guides", es: "Todas las guías" }),
        appIcon: t({ en: "App icon", es: "Ícono de la app" }),
        contact: {
            lead: t({
                en: "For support, press, or a question about the app.",
                es: "Para soporte, prensa o una pregunta sobre la app.",
            }),
            title: t({ en: "Write to us", es: "Escríbenos" }),
        },
        data: {
            label: t({ en: "Your data", es: "Tus datos" }),
            text: t({
                en: "Your ledger is stored on your phone. Without an account, your entries, amounts, and notes never leave it. With Pro, sync keeps a copy on our servers until you delete your account. Voice entries, receipt scans, and merchant suggestions are processed by Anthropic and ElevenLabs, and recordings and scanned photos are not stored. Your data is never sold.",
                es: "Tu registro se guarda en tu celular. Sin una cuenta, tus registros, montos y notas nunca salen de él. Con Pro, la sincronización guarda una copia en nuestros servidores hasta que elimines tu cuenta. Las entradas por voz, los escaneos de recibos y las sugerencias de comercios los procesan Anthropic y ElevenLabs, y no guardamos las grabaciones ni las fotos escaneadas. Tus datos nunca se venden.",
            }),
        },
        entity: t({
            en: "Outlayr is an open source mobile expense tracker, budget app, and subscription tracker, made by danestves LLC.",
            es: "Outlayr es una app móvil de código abierto para controlar tus gastos, tu presupuesto y tus suscripciones, hecha por danestves LLC.",
        }),
        facts: [
            {
                label: t({ en: "Logging", es: "Registro" }),
                text: t({
                    en: "Type a purchase as one sentence, say it, scan the receipt, or import a CSV. On iPhone, a Shortcuts automation can log each Apple Pay purchase.",
                    es: "Escribe una compra en una oración, díctala, escanea el recibo o importa un CSV. En iPhone, una automatización de Atajos puede registrar cada compra con Apple Pay.",
                }),
            },
            {
                label: t({ en: "Currencies", es: "Monedas" }),
                text: t({
                    en: "165 currencies. Totals convert to your main currency at the rate from the day of each purchase.",
                    es: "165 monedas. Los totales se convierten a tu moneda principal con la tasa del día de cada compra.",
                }),
            },
            {
                label: t({ en: "Platforms", es: "Plataformas" }),
                text: t({
                    en: "iPhone with iOS 18 or later. Android is coming soon to Google Play.",
                    es: "iPhone con iOS 18 o posterior. Pronto llegará a Google Play para Android.",
                }),
            },
            {
                label: t({ en: "Languages", es: "Idiomas" }),
                text: t({ en: "English and Latin American Spanish.", es: "Inglés y español de Latinoamérica." }),
            },
            {
                label: t({ en: "Account", es: "Cuenta" }),
                text: t({
                    en: "Optional. Signing in with Apple or Google is needed for sync, voice entry, receipt scanning, and to buy Pro.",
                    es: "Opcional. Necesitas iniciar sesión con Apple o Google para sincronizar, dictar registros, escanear recibos y comprar Pro.",
                }),
            },
            {
                label: t({ en: "Price", es: "Precio" }),
                text: t({
                    en: "Pro is billed monthly or yearly, or bought once, at prices set per country in your app store. There are no ads on any plan.",
                    es: "Pro se paga al mes, al año o en un solo pago, con precios por país en tu tienda de apps. No hay anuncios en ningún plan.",
                }),
            },
            {
                label: t({ en: "Free plan", es: "Plan gratis" }),
                text: t({
                    en: "Logging, budgets, goals, insights, subscriptions, and widgets, with 20 voice or receipt captures every 30 days, 2 accounts, 2 category budgets, 1 account currency, and 1 app icon.",
                    es: "Registros, presupuestos, metas, estadísticas, suscripciones y widgets, con 20 capturas de voz o de recibos cada 30 días, 2 cuentas, 2 presupuestos por categoría, 1 moneda para tus cuentas y 1 ícono de la app.",
                }),
            },
            {
                label: "Outlayr Pro",
                text: t({
                    en: "500 captures every 30 days, unlimited accounts, category budgets, and account currencies, sync across devices, receipt photo backup, AI matching on CSV import, web merchant lookup, and 5 app icons.",
                    es: "500 capturas cada 30 días, cuentas, presupuestos por categoría y monedas sin límite, sincronización entre dispositivos, respaldo de las fotos de tus recibos, asignación con IA al importar un CSV, búsqueda web de comercios y 5 íconos de la app.",
                }),
            },
            {
                label: t({ en: "Maker", es: "Empresa" }),
                text: t({
                    en: "danestves LLC, a Delaware limited liability company. 651 N Broad St, Suite 201, Middletown, DE 19709, USA.",
                    es: "danestves LLC, una sociedad de responsabilidad limitada de Delaware. 651 N Broad St, Suite 201, Middletown, DE 19709, EE. UU.",
                }),
            },
            {
                label: t({ en: "Does not", es: "No hace" }),
                text: t({
                    en: "Outlayr does not cancel subscriptions or negotiate bills for you.",
                    es: "Outlayr no cancela suscripciones ni negocia tus facturas por ti.",
                }),
            },
            {
                label: t({ en: "Source code", es: "Código fuente" }),
                text: t({
                    en: "Open source on GitHub at github.com/danestves/outlayr. The app is licensed under GPL-3.0 and the server under AGPL-3.0.",
                    es: "Código abierto en GitHub, en github.com/danestves/outlayr. La app usa la licencia GPL-3.0 y el servidor, AGPL-3.0.",
                }),
            },
        ],
        factsTitle: t({ en: "Outlayr at a glance", es: "Outlayr de un vistazo" }),
        meta: {
            description: t({
                en: "Outlayr is an open source mobile expense tracker, budget app, and subscription tracker, made by danestves LLC. Platforms, languages, plans, free limits, and where your data lives.",
                es: "Outlayr es una app móvil de código abierto para controlar tus gastos, tu presupuesto y tus suscripciones, hecha por danestves LLC. Plataformas, idiomas, planes, límites y dónde están tus datos.",
            }),
            title: t({
                en: "About Outlayr: the expense tracker by danestves LLC",
                es: "Acerca de Outlayr: la app de gastos de danestves LLC",
            }),
        },
        press: t({ en: "Press kit", es: "Kit de prensa" }),
        shots: {
            accounts: t({ en: "Accounts", es: "Cuentas" }),
            budgets: t({ en: "Budgets", es: "Presupuestos" }),
            insights: t({ en: "Insights", es: "Estadísticas" }),
            subscriptions: t({ en: "Subscriptions", es: "Suscripciones" }),
        },
        story: {
            body: [
                t({
                    en: "Money rarely sits in one place. There is the card you use every day, the cash in your pocket, the subscriptions that renew on their own, the paycheck, the trip priced in another currency. Each one is a layer, and together they get messy fast.",
                    es: "El dinero casi nunca está en un solo lugar. Está la tarjeta que usas a diario, el efectivo de tu bolsillo, las suscripciones que se renuevan solas, el sueldo, el viaje con precios en otra moneda. Cada una es una capa, y juntas se desordenan rápido.",
                }),
                t({
                    en: "Most trackers ask you to sort those layers by hand, one form field at a time, and by the third coffee the form wins. Outlayr starts from the sentence you would say anyway. Type a purchase, say it, or scan the receipt, and it lands in the right account, budget, and month.",
                    es: "La mayoría de las apps te piden ordenar esas capas a mano, un campo a la vez, y para el tercer café gana el formulario. Outlayr parte de la oración que dirías de todos modos. Escribe una compra, díctala o escanea el recibo, y queda en la cuenta, el presupuesto y el mes correctos.",
                }),
                t({
                    en: "From there, budgets, subscriptions, accounts, and 165 currencies keep up on their own, so every layer stays in view. Your ledger lives on your phone, an account is optional, and there are no ads on any plan.",
                    es: "Desde ahí, los presupuestos, las suscripciones, las cuentas y 165 monedas se actualizan solos, así que cada capa queda a la vista. Tu registro vive en tu celular, la cuenta es opcional y no hay anuncios en ningún plan.",
                }),
            ],
            title: t({ en: "Why we built it", es: "Por qué la creamos" }),
        },
        thesis: t({
            en: "Subscriptions, expenses, income, every account. Outlayr takes the messy layers of your money and gives you back control.",
            es: "Suscripciones, gastos, ingresos, cada cuenta. Outlayr toma las capas desordenadas de tu dinero y te devuelve el control.",
        }),
        title: t({ en: "Your money comes in layers.", es: "Tu dinero viene en capas." }),
    },
    key: "about",
} satisfies Dictionary;

export default about;
