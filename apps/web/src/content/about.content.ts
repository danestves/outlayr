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
                label: t({ en: "Debts", es: "Deudas" }),
                text: t({
                    en: "Money you lent or borrowed, a sale on credit, or a job or purchase you will pay later, each with its person and an optional payoff plan. One Accounts screen shows what you have and what you owe.",
                    es: "Lo que prestaste o te prestaron, una venta a crédito o un trabajo o una compra que pagarás después, cada uno con su persona y un plan de pago opcional. Una sola pantalla de Cuentas muestra lo que tienes y lo que debes.",
                }),
            },
            {
                label: t({ en: "Installments", es: "Cuotas" }),
                text: t({
                    en: "Purchases from buy now, pay later apps such as Cashea and Klarna: the upfront payment and each installment, a reminder the day before each one is due, and late fees. An order already in progress can be read from a screenshot of its payment plan.",
                    es: "Compras en apps de cuotas como Cashea y Klarna: la inicial y cada cuota, un aviso el día antes de cada pago y los recargos por atraso. Una compra que ya va por la mitad se puede leer desde una captura de su plan de pagos.",
                }),
            },
            {
                label: t({ en: "Platforms", es: "Plataformas" }),
                text: t({
                    en: "Android. iPhone with iOS 18 or later is coming soon to the App Store.",
                    es: "Android. Pronto llegará al App Store para iPhone con iOS 18 o posterior.",
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
                    en: "Free to start. In the United States, Pro is $7.99 a month, $49.99 a year with 7 days free, or $129.99 once. Your app store shows the price for your country. There are no ads on any plan.",
                    es: "Gratis para empezar. En Estados Unidos, Pro cuesta US$7.99 al mes, US$49.99 al año con 7 días gratis o US$129.99 en un solo pago. Tu tienda de apps muestra el precio de tu país. No hay anuncios en ningún plan.",
                }),
            },
            {
                label: t({ en: "Free plan", es: "Plan gratis" }),
                text: t({
                    en: "Logging, budgets, goals, insights, subscriptions, debts, installments, and widgets, with 20 voice, receipt, or payment plan captures every 30 days, 2 accounts, 2 installment apps, 3 people, 2 payoff plans, 2 category budgets, 1 account currency, and 1 app icon.",
                    es: "Registros, presupuestos, metas, estadísticas, suscripciones, deudas, cuotas y widgets, con 20 capturas de voz, de recibos o de planes de pago cada 30 días, 2 cuentas, 2 apps de cuotas, 3 personas, 2 planes de pago, 2 presupuestos por categoría, 1 moneda para tus cuentas y 1 ícono de la app.",
                }),
            },
            {
                label: "Outlayr Pro",
                text: t({
                    en: "500 captures every 30 days, unlimited accounts, installment apps, people, payoff plans, category budgets, and account currencies, sync across devices, receipt photo backup, AI matching on CSV import, web merchant lookup, and 5 app icons.",
                    es: "500 capturas cada 30 días, cuentas, apps de cuotas, personas, planes de pago, presupuestos por categoría y monedas sin límite, sincronización entre dispositivos, respaldo de las fotos de tus recibos, asignación con IA al importar un CSV, búsqueda web de comercios y 5 íconos de la app.",
                }),
            },
            {
                label: t({ en: "Maker", es: "Empresa" }),
                text: t({
                    en: "danestves LLC, a Delaware limited liability company. 651 N Broad St, Suite 201, Middletown, DE 19709, USA. Outlayr, the app by danestves LLC, is not affiliated with Outlayr, Inc. (outlayr.com), a payments company.",
                    es: "danestves LLC, una sociedad de responsabilidad limitada de Delaware. 651 N Broad St, Suite 201, Middletown, DE 19709, EE. UU. Outlayr, la app de danestves LLC, no tiene relación con Outlayr, Inc. (outlayr.com), una empresa de pagos.",
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
                en: "Outlayr is an open source expense tracker, budget app, and subscription tracker by danestves LLC: platforms, plans, free limits, and where your data lives.",
                es: "Outlayr es una app de código abierto para controlar gastos, presupuesto y suscripciones, de danestves LLC: plataformas, planes, límites y tus datos.",
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
