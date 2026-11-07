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
                goodbudget: "Goodbudget",
                monarch: "Monarch",
                monefy: "Monefy",
                "money-lover": "Money Lover",
                pocketguard: "PocketGuard",
                "rocket-money": "Rocket Money",
                spendee: "Spendee",
                wallet: "Wallet by BudgetBakers",
                ynab: "YNAB",
            } satisfies Record<keyof typeof answers.content.compare, string>,
            guides: {
                "ai-expense-tracker": t({
                    en: "AI expense tracker",
                    es: "Gastos con IA",
                    pt: "Gastos com IA",
                    fr: "Dépenses avec l'IA",
                }),
                "apple-pay-expense-tracker": t({ en: "Apple Pay", es: "Apple Pay", pt: "Apple Pay", fr: "Apple Pay" }),
                "best-budget-apps": t({
                    en: "Best budget apps",
                    es: "Mejores apps de presupuesto",
                    pt: "Melhores apps de orçamento",
                    fr: "Meilleures apps de budget",
                }),
                "best-budget-apps-canada": t({
                    en: "Budget apps in Canada",
                    es: "Apps de presupuesto en Canadá",
                    pt: "Apps de orçamento no Canadá",
                    fr: "Applis budget au Canada",
                }),
                "best-budget-apps-france": t({
                    en: "Budget apps in France",
                    es: "Apps de presupuesto en Francia",
                    pt: "Apps de orçamento na França",
                    fr: "Applis de budget en France",
                }),
                "best-expense-tracker-apps": t({
                    en: "Best expense trackers",
                    es: "Mejores apps de gastos",
                    pt: "Melhores apps de gastos",
                    fr: "Meilleures apps de dépenses",
                }),
                "best-expense-tracker-apps-brazil": t({
                    en: "Expense trackers in Brazil",
                    es: "Apps de gastos en Brasil",
                    pt: "Apps de controle financeiro",
                    fr: "Apps de dépenses au Brésil",
                }),
                "best-expense-tracker-apps-latin-america": t({
                    en: "Expense trackers in Latin America",
                    es: "Apps de gastos en Latinoamérica",
                    pt: "Apps de gastos na América Latina",
                    fr: "Apps de dépenses en Amérique latine",
                }),
                "best-open-source-expense-tracker-apps": t({
                    en: "Open source trackers",
                    es: "Apps de código abierto",
                    pt: "Apps de código aberto",
                    fr: "Apps open source",
                }),
                "best-subscription-tracker-apps": t({
                    en: "Best subscription trackers",
                    es: "Mejores apps de suscripciones",
                    pt: "Melhores apps de assinaturas",
                    fr: "Meilleures apps d'abonnements",
                }),
                "budget-planner": t({ en: "Budgets", es: "Presupuestos", pt: "Orçamentos", fr: "Budgets" }),
                "expense-tracker-template": t({
                    en: "Spreadsheet template",
                    es: "Plantilla de Excel",
                    pt: "Modelo de planilha",
                    fr: "Modèle de tableur",
                }),
                "how-to-pay-cashea": t({
                    en: "How to pay Cashea",
                    es: "Cómo pagar Cashea",
                    pt: "Como pagar a Cashea",
                    fr: "Comment payer Cashea",
                }),
                "how-to-track-expenses": t({
                    en: "How to track expenses",
                    es: "Cómo controlar gastos",
                    pt: "Como controlar gastos",
                    fr: "Comment suivre ses dépenses",
                }),
                "mint-alternative": t({
                    en: "Mint alternatives",
                    es: "Alternativas a Mint",
                    pt: "Alternativas ao Mint",
                    fr: "Alternatives à Mint",
                }),
                "multi-currency-expense-tracker": t({
                    en: "Multi-currency",
                    es: "Varias monedas",
                    pt: "Várias moedas",
                    fr: "Plusieurs devises",
                }),
                "receipt-scanner": t({
                    en: "Receipt scanner",
                    es: "Escáner de recibos",
                    pt: "Escanear recibos",
                    fr: "Scan de tickets",
                }),
                "subscription-tracker": t({
                    en: "Subscriptions",
                    es: "Suscripciones",
                    pt: "Assinaturas",
                    fr: "Abonnements",
                }),
                "track-money-sent-home": t({
                    en: "Money sent home",
                    es: "Dinero que envías a casa",
                    pt: "Dinheiro que você envia para casa",
                    fr: "Argent envoyé à vos proches",
                }),
                "voice-expense-tracker": t({
                    en: "Voice entry",
                    es: "Registro por voz",
                    pt: "Lançamento por voz",
                    fr: "Saisie vocale",
                }),
                "ynab-alternatives": t({
                    en: "YNAB alternatives",
                    es: "Alternativas a YNAB",
                    pt: "Alternativas ao YNAB",
                    fr: "Alternatives à YNAB",
                }),
            } satisfies Record<keyof typeof answers.content.guides, ReturnType<typeof t<string>>>,
        },
        badges: {
            appStore: t({
                en: "Download on the App Store",
                es: "Descárgalo en el App Store",
                pt: "Baixar na App Store",
                fr: "Télécharger dans l'App Store",
            }),
            googlePlay: t({
                en: "Get it on Google Play",
                es: "Disponible en Google Play",
                pt: "Disponível no Google Play",
                fr: "Disponible sur Google Play",
            }),
        },
        consent: {
            allow: t({ en: "Allow", es: "Permitir", pt: "Permitir", fr: "Autoriser" }),
            anchor: t({ en: "this-website", es: "este-sitio-web", pt: "this-website", fr: "this-website" }),
            body: t({
                en: "A cookie lets us count repeat visits and see which pages help.",
                es: "Una cookie nos permite contar las visitas que vuelven y ver qué páginas ayudan.",
                pt: "Um cookie nos permite contar as visitas que voltam e ver quais páginas ajudam.",
                fr: "Un cookie nous permet de compter les visites récurrentes et de voir quelles pages sont utiles.",
            }),
            decline: t({ en: "Decline", es: "Rechazar", pt: "Recusar", fr: "Refuser" }),
            label: "Cookies",
            privacy: t({ en: "Privacy", es: "Privacidad", pt: "Privacidade", fr: "Confidentialité" }),
        },
        footer: {
            about: t({ en: "About", es: "Acerca de", pt: "Sobre", fr: "À propos" }),
            blog: "Blog",
            company: t({ en: "Company", es: "Empresa", pt: "Empresa", fr: "Entreprise" }),
            product: t({ en: "Product", es: "Producto", pt: "Produto", fr: "Produit" }),
            resources: t({ en: "Resources", es: "Recursos", pt: "Recursos", fr: "Ressources" }),
            tagline: t({
                en: "The expense tracker you log in one sentence.",
                es: "La app de gastos que llenas con una sola oración.",
                pt: "O app de gastos que você preenche com uma frase só.",
                fr: "L'app de dépenses qu'on remplit en une seule phrase.",
            }),
            compare: t({ en: "Compare", es: "Comparar", pt: "Comparar", fr: "Comparer" }),
            email: t({ en: "Email", es: "Correo", pt: "E-mail", fr: "E-mail" }),
            guides: t({ en: "Guides", es: "Guías", pt: "Guias", fr: "Guides" }),
            language: t({ en: "Language", es: "Idioma", pt: "Idioma", fr: "Langue" }),
            listings: {
                alternativeTo: t({
                    en: "Listed on AlternativeTo",
                    es: "En AlternativeTo",
                    pt: "No AlternativeTo",
                    fr: "Sur AlternativeTo",
                }),
                peerPush: t({
                    en: "Trending on PeerPush",
                    es: "Tendencia en PeerPush",
                    pt: "Em alta no PeerPush",
                    fr: "Tendance sur PeerPush",
                }),
                productHunt: t({
                    en: "On Product Hunt",
                    es: "En Product Hunt",
                    pt: "No Product Hunt",
                    fr: "Sur Product Hunt",
                }),
            },
            nav: t({ en: "Footer", es: "Pie de página", pt: "Rodapé", fr: "Pied de page" }),
            open: t({ en: "Open numbers", es: "Números abiertos", pt: "Números abertos", fr: "Chiffres ouverts" }),
            privacy: t({ en: "Privacy", es: "Privacidad", pt: "Privacidade", fr: "Confidentialité" }),
            source: t({ en: "Source code", es: "Código fuente", pt: "Código-fonte", fr: "Code source" }),
            support: t({ en: "Support", es: "Soporte", pt: "Suporte", fr: "Assistance" }),
            supportDetail: t({
                en: "Common questions",
                es: "Preguntas frecuentes",
                pt: "Perguntas frequentes",
                fr: "Questions fréquentes",
            }),
            terms: t({ en: "Terms", es: "Términos", pt: "Termos", fr: "Conditions" }),
            tools: t({ en: "Calculators", es: "Calculadoras", pt: "Calculadoras", fr: "Calculateurs" }),
            trademarks: t({
                en: "App Store is a service mark of Apple Inc. Google Play and the Google Play logo are trademarks of Google LLC.",
                es: "App Store es una marca de servicio de Apple Inc. Google Play y el logotipo de Google Play son marcas comerciales de Google LLC.",
                pt: "App Store é uma marca de serviço da Apple Inc. Google Play e o logotipo do Google Play são marcas comerciais da Google LLC.",
                fr: "App Store est une marque de service d'Apple Inc. Google Play et le logo Google Play sont des marques de Google LLC.",
            }),
            updated: insert(
                t({
                    en: "Updated {{date}}",
                    es: "{{date}}",
                    pt: "Atualizado em {{date}}",
                    fr: "Mis à jour le {{date}}",
                })
            ),
        },
        home: t({
            en: "Outlayr home",
            es: "Inicio de Outlayr",
            pt: "Página inicial do Outlayr",
            fr: "Accueil Outlayr",
        }),
        nav: {
            close: t({ en: "Close menu", es: "Cerrar menú", pt: "Fechar menu", fr: "Fermer le menu" }),
            features: t({ en: "Features", es: "Funciones", pt: "Recursos", fr: "Fonctionnalités" }),
            github: t({
                en: "Outlayr on GitHub",
                es: "Outlayr en GitHub",
                pt: "Outlayr no GitHub",
                fr: "Outlayr sur GitHub",
            }),
            how: t({ en: "How it works", es: "Cómo funciona", pt: "Como funciona", fr: "Comment ça marche" }),
            label: t({ en: "Main", es: "Principal", pt: "Principal", fr: "Principal" }),
            open: t({ en: "Open menu", es: "Abrir menú", pt: "Abrir menu", fr: "Ouvrir le menu" }),
            pricing: t({ en: "Pricing", es: "Precios", pt: "Preços", fr: "Tarifs" }),
            skip: t({
                en: "Skip to content",
                es: "Saltar al contenido",
                pt: "Pular para o conteúdo",
                fr: "Aller au contenu",
            }),
        },
        legal: {
            contents: t({ en: "Contents", es: "Contenido", pt: "Conteúdo", fr: "Sommaire" }),
            effective: insert(
                t({
                    en: "Effective {{date}}",
                    es: "Vigente desde el {{date}}",
                    pt: "Em vigor desde {{date}}",
                    fr: "En vigueur depuis le {{date}}",
                })
            ),
            updated: insert(
                t({
                    en: "Updated {{date}}",
                    es: "Actualizado el {{date}}",
                    pt: "Atualizado em {{date}}",
                    fr: "Mis à jour le {{date}}",
                })
            ),
        },
        notFound: {
            meta: t({ en: "Error 404", es: "Error 404", pt: "Erro 404", fr: "Erreur 404" }),
            pages: {
                deleteAccount: t({
                    en: "Delete your account",
                    es: "Elimina tu cuenta",
                    pt: "Exclua sua conta",
                    fr: "Supprimez votre compte",
                }),
                home: t({ en: "Home", es: "Inicio", pt: "Início", fr: "Accueil" }),
                privacy: t({
                    en: "Privacy Policy",
                    es: "Política de privacidad",
                    pt: "Política de privacidade",
                    fr: "Politique de confidentialité",
                }),
                support: t({ en: "Support", es: "Soporte", pt: "Suporte", fr: "Assistance" }),
                terms: t({
                    en: "Terms of Use",
                    es: "Términos de uso",
                    pt: "Termos de uso",
                    fr: "Conditions d'utilisation",
                }),
            },
            title: t({
                en: "Nothing is filed under this address",
                es: "No hay nada archivado en esta dirección",
                pt: "Não há nada arquivado neste endereço",
                fr: "Rien n'est classé à cette adresse",
            }),
        },
        theme: {
            dark: t({ en: "Dark", es: "Oscuro", pt: "Escuro", fr: "Sombre" }),
            label: t({ en: "Theme", es: "Tema", pt: "Tema", fr: "Thème" }),
            light: t({ en: "Light", es: "Claro", pt: "Claro", fr: "Clair" }),
            system: t({ en: "System", es: "Sistema", pt: "Sistema", fr: "Système" }),
        },
    },
    key: "site",
} satisfies Dictionary;

export default site;
