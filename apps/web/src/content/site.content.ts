import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

import type answers from "./answers.content";

const site = {
    content: {
        answerLinks: {
            compare: {
                copilot: "Copilot",
                everydollar: "EveryDollar",
                fintonic: "Fintonic",
                monarch: "Monarch",
                pocketguard: "PocketGuard",
                "rocket-money": "Rocket Money",
                spendee: "Spendee",
                wallet: "Wallet by BudgetBakers",
                ynab: "YNAB",
            } satisfies Record<keyof typeof answers.content.compare, string>,
            guides: {
                "apple-pay-expense-tracker": t({ en: "Apple Pay", es: "Apple Pay" }),
                "best-expense-tracker-apps": t({ en: "Best expense trackers", es: "Mejores apps de gastos" }),
                "best-open-source-expense-tracker-apps": t({
                    en: "Open source trackers",
                    es: "Apps de código abierto",
                }),
                "best-subscription-tracker-apps": t({
                    en: "Best subscription trackers",
                    es: "Mejores apps de suscripciones",
                }),
                "budget-planner": t({ en: "Budgets", es: "Presupuestos" }),
                "expense-tracker-template": t({ en: "Spreadsheet template", es: "Plantilla de Excel" }),
                "mint-alternative": t({ en: "From Mint", es: "Desde Mint" }),
                "multi-currency-expense-tracker": t({ en: "Multi-currency", es: "Varias monedas" }),
                "receipt-scanner": t({ en: "Receipt scanner", es: "Escáner de recibos" }),
                "subscription-tracker": t({ en: "Subscriptions", es: "Suscripciones" }),
                "voice-expense-tracker": t({ en: "Voice entry", es: "Registro por voz" }),
            } satisfies Record<keyof typeof answers.content.guides, ReturnType<typeof t<string>>>,
        },
        badges: {
            appStore: t({ en: "Download on the App Store", es: "Descárgalo en el App Store" }),
            comingSoon: t({ en: "Coming soon", es: "Próximamente" }),
            googlePlay: t({ en: "Get it on Google Play", es: "Disponible en Google Play" }),
        },
        consent: {
            allow: t({ en: "Allow", es: "Permitir" }),
            anchor: t({ en: "this-website", es: "este-sitio-web" }),
            body: t({
                en: "A cookie lets us count repeat visits and see which pages help.",
                es: "Una cookie nos permite contar las visitas que vuelven y ver qué páginas ayudan.",
            }),
            decline: t({ en: "Decline", es: "Rechazar" }),
            label: "Cookies",
            privacy: t({ en: "Privacy", es: "Privacidad" }),
        },
        footer: {
            about: t({ en: "About", es: "Acerca de" }),
            company: t({ en: "Company", es: "Empresa" }),
            product: t({ en: "Product", es: "Producto" }),
            resources: t({ en: "Resources", es: "Recursos" }),
            tagline: t({
                en: "The expense tracker you log in one sentence.",
                es: "La app de gastos que llenas con una sola oración.",
            }),
            compare: t({ en: "Compare", es: "Comparar" }),
            email: t({ en: "Email", es: "Correo" }),
            guides: t({ en: "Guides", es: "Guías" }),
            language: t({ en: "Language", es: "Idioma" }),
            nav: t({ en: "Footer", es: "Pie de página" }),
            privacy: t({ en: "Privacy", es: "Privacidad" }),
            source: t({ en: "Source code", es: "Código fuente" }),
            support: t({ en: "Support", es: "Soporte" }),
            supportDetail: t({ en: "Common questions", es: "Preguntas frecuentes" }),
            terms: t({ en: "Terms", es: "Términos" }),
            tools: t({ en: "Calculators", es: "Calculadoras" }),
            trademarks: t({
                en: "App Store is a service mark of Apple Inc. Google Play and the Google Play logo are trademarks of Google LLC.",
                es: "App Store es una marca de servicio de Apple Inc. Google Play y el logotipo de Google Play son marcas comerciales de Google LLC.",
            }),
            updated: insert(t({ en: "Updated {{date}}", es: "{{date}}" })),
        },
        home: t({ en: "Outlayr home", es: "Inicio de Outlayr" }),
        nav: {
            close: t({ en: "Close menu", es: "Cerrar menú" }),
            features: t({ en: "Features", es: "Funciones" }),
            github: t({ en: "Outlayr on GitHub", es: "Outlayr en GitHub" }),
            how: t({ en: "How it works", es: "Cómo funciona" }),
            label: t({ en: "Main", es: "Principal" }),
            open: t({ en: "Open menu", es: "Abrir menú" }),
            pricing: t({ en: "Pricing", es: "Precios" }),
            skip: t({ en: "Skip to content", es: "Saltar al contenido" }),
        },
        legal: {
            contents: t({ en: "Contents", es: "Contenido" }),
            effective: insert(t({ en: "Effective {{date}}", es: "Vigente desde el {{date}}" })),
            updated: insert(t({ en: "Updated {{date}}", es: "Actualizado el {{date}}" })),
        },
        notFound: {
            meta: t({ en: "Error 404", es: "Error 404" }),
            pages: {
                deleteAccount: t({ en: "Delete your account", es: "Elimina tu cuenta" }),
                home: t({ en: "Home", es: "Inicio" }),
                privacy: t({ en: "Privacy Policy", es: "Política de privacidad" }),
                support: t({ en: "Support", es: "Soporte" }),
                terms: t({ en: "Terms of Use", es: "Términos de uso" }),
            },
            title: t({ en: "Nothing is filed under this address.", es: "No hay nada archivado en esta dirección." }),
        },
        theme: {
            dark: t({ en: "Dark", es: "Oscuro" }),
            label: t({ en: "Theme", es: "Tema" }),
            light: t({ en: "Light", es: "Claro" }),
            system: t({ en: "System", es: "Sistema" }),
        },
    },
    key: "site",
} satisfies Dictionary;

export default site;
