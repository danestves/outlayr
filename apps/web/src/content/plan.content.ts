import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const plan = {
    content: {
        title: t({ en: "Manage plan", es: "Administrar plan", fr: "Gérer le forfait", pt: "Gerenciar plano" }),
        pro: t({ en: "Outlayr Pro", es: "Outlayr Pro", fr: "Outlayr Pro", pt: "Outlayr Pro" }),
        couldNotLoad: t({
            en: "Could not load your plan.",
            es: "No se pudo cargar tu plan.",
            fr: "Impossible de charger votre forfait.",
            pt: "Não foi possível carregar seu plano.",
        }),
        tryAgain: t({ en: "Try again", es: "Reintentar", fr: "Réessayer", pt: "Tentar novamente" }),
        plan: t({ en: "Plan", es: "Plan", fr: "Forfait", pt: "Plano" }),
        price: t({ en: "Price", es: "Precio", fr: "Prix", pt: "Preço" }),
        paid: t({ en: "Paid", es: "Pagado", fr: "Payé", pt: "Pago" }),
        bought: t({ en: "Bought", es: "Comprado", fr: "Acheté", pt: "Comprado" }),
        nextCharge: t({ en: "Next charge", es: "Próximo cobro", fr: "Prochain paiement", pt: "Próxima cobrança" }),
        firstCharge: t({ en: "First charge", es: "Primer cobro", fr: "Premier paiement", pt: "Primeira cobrança" }),
        proUntil: t({ en: "Pro until", es: "Pro hasta", fr: "Pro jusqu'au", pt: "Pro até" }),
        billedBy: t({ en: "Billed by", es: "Facturado por", fr: "Facturé par", pt: "Cobrado por" }),
        none: t({ en: "None", es: "Ninguno", fr: "Aucun", pt: "Nenhuma" }),
        names: {
            annual: t({ en: "Yearly", es: "Anual", fr: "Annuel", pt: "Anual" }),
            monthly: t({ en: "Monthly", es: "Mensual", fr: "Mensuel", pt: "Mensal" }),
            lifetime: t({ en: "Lifetime", es: "De por vida", fr: "À vie", pt: "Vitalício" }),
        },
        perYear: t({ en: "/ year", es: "/ año", fr: "/ an", pt: "/ ano" }),
        perMonth: t({ en: "/ month", es: "/ mes", fr: "/ mois", pt: "/ mês" }),
        once: t({ en: "once", es: "una vez", fr: "une fois", pt: "uma vez" }),
        badge: {
            renews: insert(
                t({
                    en: "Renews {{date}}",
                    es: "Se renueva el {{date}}",
                    fr: "Renouvellement le {{date}}",
                    pt: "Renova em {{date}}",
                })
            ),
            trial: insert(
                t({
                    en: "Free trial until {{date}}",
                    es: "Prueba gratis hasta el {{date}}",
                    fr: "Essai gratuit jusqu'au {{date}}",
                    pt: "Teste grátis até {{date}}",
                })
            ),
            ends: insert(
                t({
                    en: "Ends {{date}}, no renewal",
                    es: "Termina el {{date}}, sin renovación",
                    fr: "Prend fin le {{date}}, sans renouvellement",
                    pt: "Termina em {{date}}, sem renovação",
                })
            ),
            lifetime: t({
                en: "Lifetime, nothing to renew",
                es: "De por vida, nada que renovar",
                fr: "À vie, rien à renouveler",
                pt: "Vitalício, nada para renovar",
            }),
            ended: t({ en: "Ended", es: "Terminado", fr: "Terminé", pt: "Terminado" }),
        },
        trialTitle: t({
            en: "Your free trial is on",
            es: "Tu prueba gratis está activa",
            fr: "Votre essai gratuit est actif",
            pt: "Seu teste grátis está ativo",
        }),
        trialBody: insert(
            t({
                en: "Pro renews on {{date}}. Cancel before then and you won't be charged.",
                es: "Pro se renueva el {{date}}. Cancela antes y no se te cobrará.",
                fr: "Pro se renouvelle le {{date}}. Résiliez avant et vous ne serez pas débité.",
                pt: "O Pro renova em {{date}}. Cancele antes e você não será cobrado.",
            })
        ),
        trialFooter: t({
            en: "When the free trial ends it becomes a paid subscription, unless you cancel before then.",
            es: "Cuando termine la prueba gratis pasa a ser una suscripción de pago, salvo que canceles antes.",
            fr: "À la fin de l'essai gratuit, il devient un abonnement payant, sauf si vous résiliez avant.",
            pt: "Quando o teste grátis terminar, ele vira uma assinatura paga, a menos que você cancele antes.",
        }),
        renewsFooter: insert(
            t({
                en: "Pro renews {{date}} for {{price}}.",
                es: "Pro se renueva el {{date}} por {{price}}.",
                fr: "Pro se renouvelle le {{date}} pour {{price}}.",
                pt: "O Pro renova em {{date}} por {{price}}.",
            })
        ),
        endsFooter: t({
            en: "After that the web app locks and your phone moves to Free.",
            es: "Después, la app web se bloquea y tu teléfono pasa a Gratis.",
            fr: "Ensuite, l'application web se verrouille et votre téléphone passe à Gratuit.",
            pt: "Depois disso, o app web é bloqueado e seu celular passa para o Grátis.",
        }),
        storeFooter: t({
            en: "Subscriptions renew automatically until you cancel them.",
            es: "Las suscripciones se renuevan automáticamente hasta que las canceles.",
            fr: "Les abonnements se renouvellent automatiquement jusqu'à leur résiliation.",
            pt: "As assinaturas renovam automaticamente até você cancelar.",
        }),
        manageBilling: t({
            en: "Manage billing",
            es: "Administrar pagos",
            fr: "Gérer la facturation",
            pt: "Gerenciar cobrança",
        }),
        cancelSubscription: t({
            en: "Cancel subscription",
            es: "Cancelar suscripción",
            fr: "Résilier l'abonnement",
            pt: "Cancelar assinatura",
        }),
        cancelTrial: t({ en: "Cancel trial", es: "Cancelar prueba", fr: "Annuler l'essai", pt: "Cancelar teste" }),
        keepPro: t({ en: "Keep Pro", es: "Mantener Pro", fr: "Garder Pro", pt: "Manter o Pro" }),
        confirm: {
            title: t({
                en: "Cancel your subscription?",
                es: "¿Cancelar tu suscripción?",
                fr: "Résilier votre abonnement ?",
                pt: "Cancelar sua assinatura?",
            }),
            body: insert(
                t({
                    en: "Pro stays on until {{date}}. After that the web app locks, your phone moves to Free and we don't charge you again.",
                    es: "Pro sigue activo hasta el {{date}}. Después, la app web se bloquea, tu teléfono pasa a Gratis y no te cobramos más.",
                    fr: "Pro reste actif jusqu'au {{date}}. Ensuite, l'application web se verrouille, votre téléphone passe à Gratuit et nous ne vous débitons plus.",
                    pt: "O Pro continua ativo até {{date}}. Depois, o app web é bloqueado, seu celular passa para o Grátis e não cobramos mais.",
                })
            ),
            sync: t({ en: "Sync", es: "Sincronización", fr: "Synchro", pt: "Sincronização" }),
            off: t({ en: "Off", es: "Desactivada", fr: "Désactivée", pt: "Desativada" }),
            autoLog: t({ en: "Auto-log", es: "Registro automático", fr: "Saisie auto", pt: "Registro automático" }),
            budgets: t({
                en: "Category budgets",
                es: "Presupuestos por categoría",
                fr: "Budgets par catégorie",
                pt: "Orçamentos por categoria",
            }),
            toStripe: t({
                en: "Continue to Stripe",
                es: "Continuar en Stripe",
                fr: "Continuer sur Stripe",
                pt: "Continuar no Stripe",
            }),
        },
        use: {
            title: t({ en: "What you use", es: "Lo que usas", fr: "Ce que vous utilisez", pt: "O que você usa" }),
            onFree: t({
                en: "What changes on Free",
                es: "Qué cambia en Gratis",
                fr: "Ce qui change sur Gratuit",
                pt: "O que muda no Grátis",
            }),
            using: t({ en: "Using", es: "En uso", fr: "Utilisé", pt: "Em uso" }),
            limit: t({ en: "Free limit", es: "Límite Gratis", fr: "Limite Gratuit", pt: "Limite Grátis" }),
            proLimit: t({ en: "Pro limit", es: "Límite Pro", fr: "Limite Pro", pt: "Limite Pro" }),
            unlimited: t({ en: "Unlimited", es: "Ilimitado", fr: "Illimité", pt: "Ilimitado" }),
            over: t({ en: "Over", es: "Excedido", fr: "Dépassé", pt: "Acima" }),
            captures: t({
                en: "Captures, 30 days",
                es: "Capturas, 30 días",
                fr: "Captures, 30 jours",
                pt: "Capturas, 30 dias",
            }),
            accounts: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            budgets: t({
                en: "Category budgets",
                es: "Presupuestos por categoría",
                fr: "Budgets par catégorie",
                pt: "Orçamentos por categoria",
            }),
            currencies: t({
                en: "Account currencies",
                es: "Monedas de cuenta",
                fr: "Devises de compte",
                pt: "Moedas de conta",
            }),
            sync: t({
                en: "Sync across devices",
                es: "Sincronizar entre dispositivos",
                fr: "Synchro entre appareils",
                pt: "Sincronizar entre dispositivos",
            }),
            ai: t({
                en: "AI matching on import",
                es: "Coincidencia con IA al importar",
                fr: "Rapprochement IA à l'import",
                pt: "Correspondência com IA ao importar",
            }),
            on: t({ en: "On", es: "Activado", fr: "Activé", pt: "Ativado" }),
            off: t({ en: "Off", es: "Desactivado", fr: "Désactivé", pt: "Desativado" }),
        },
        also: {
            title: t({
                en: "Pro also gives you",
                es: "Pro también te da",
                fr: "Pro vous offre aussi",
                pt: "O Pro também oferece",
            }),
            logs: t({
                en: "Everything logs itself",
                es: "Todo se registra solo",
                fr: "Tout s'enregistre",
                pt: "Tudo se registra sozinho",
            }),
            logsHint: t({
                en: "Free stops at 30 a month",
                es: "Gratis se detiene en 30 al mes",
                fr: "Gratuit s'arrête à 30 par mois",
                pt: "O Grátis para em 30 por mês",
            }),
            currencies: t({
                en: "Every currency together",
                es: "Todas las monedas juntas",
                fr: "Toutes les devises réunies",
                pt: "Todas as moedas juntas",
            }),
            currenciesHint: t({
                en: "Free keeps 1",
                es: "Gratis mantiene 1",
                fr: "Gratuit en garde 1",
                pt: "O Grátis mantém 1",
            }),
            installments: t({
                en: "Every installment plan",
                es: "Todos los planes de cuotas",
                fr: "Tous les paiements échelonnés",
                pt: "Todos os planos de parcelas",
            }),
            installmentsHint: t({
                en: "Free tracks 2",
                es: "Gratis sigue 2",
                fr: "Gratuit en suit 2",
                pt: "O Grátis acompanha 2",
            }),
            sync: t({
                en: "Sync with your other phone",
                es: "Sincroniza con tu otro teléfono",
                fr: "Synchro avec votre autre téléphone",
                pt: "Sincronize com seu outro celular",
            }),
            syncHint: t({
                en: "And a backup if you lose this one",
                es: "Y una copia si pierdes este",
                fr: "Et une sauvegarde si vous perdez celui-ci",
                pt: "E um backup se você perder este",
            }),
        },
        freeTrial: t({ en: "Free trial", es: "Prueba gratis", fr: "Essai gratuit", pt: "Teste grátis" }),
        payments: t({ en: "Payments", es: "Pagos", fr: "Paiements", pt: "Pagamentos" }),
        lostAccess: t({
            en: "Lost access on another store?",
            es: "¿Perdiste el acceso en otra tienda?",
            fr: "Accès perdu sur une autre boutique ?",
            pt: "Perdeu o acesso em outra loja?",
        }),
        restore: t({ en: "Restore", es: "Restaurar", fr: "Restaurer", pt: "Restaurar" }),
        nothingRestored: t({
            en: "No active Pro on this account.",
            es: "No hay Pro activo en esta cuenta.",
            fr: "Aucun Pro actif sur ce compte.",
            pt: "Nenhum Pro ativo nesta conta.",
        }),
        restored: t({ en: "Pro restored.", es: "Pro restaurado.", fr: "Pro restauré.", pt: "Pro restaurado." }),
        failed: t({
            en: "That did not work. Try again.",
            es: "Eso no funcionó. Inténtalo de nuevo.",
            fr: "Cela n'a pas fonctionné. Réessayez.",
            pt: "Isso não funcionou. Tente novamente.",
        }),
        store: {
            app_store: {
                name: t({ en: "App Store", es: "App Store", fr: "App Store", pt: "App Store" }),
                title: t({
                    en: "Manage it in the App Store",
                    es: "Adminístralo en App Store",
                    fr: "Gérez-le dans l'App Store",
                    pt: "Gerencie na App Store",
                }),
                body: t({
                    en: "You bought Pro on your iPhone, so Apple bills it. Change or cancel it there.",
                    es: "Compraste Pro en tu iPhone, así que Apple lo factura. Cámbialo o cancélalo allí.",
                    fr: "Vous avez acheté Pro sur votre iPhone, Apple le facture donc. Modifiez-le ou résiliez-le là-bas.",
                    pt: "Você comprou o Pro no iPhone, então a Apple faz a cobrança. Altere ou cancele por lá.",
                }),
                step1: t({
                    en: "Open Settings on your iPhone",
                    es: "Abre Ajustes en tu iPhone",
                    fr: "Ouvrez Réglages sur votre iPhone",
                    pt: "Abra Ajustes no iPhone",
                }),
                step2: t({
                    en: "Tap your name, then Subscriptions",
                    es: "Toca tu nombre y luego Suscripciones",
                    fr: "Touchez votre nom, puis Abonnements",
                    pt: "Toque no seu nome e em Assinaturas",
                }),
                open: t({
                    en: "Open App Store",
                    es: "Abrir App Store",
                    fr: "Ouvrir l'App Store",
                    pt: "Abrir App Store",
                }),
                lifetime: {
                    title: t({
                        en: "Bought in the App Store",
                        es: "Comprado en App Store",
                        fr: "Acheté sur l'App Store",
                        pt: "Comprado na App Store",
                    }),
                    body: t({
                        en: "You paid once through Apple, so there's no subscription to manage or cancel.",
                        es: "Pagaste una sola vez a través de Apple, así que no hay ninguna suscripción que administrar ni cancelar.",
                        fr: "Vous avez payé une seule fois via Apple : il n'y a donc aucun abonnement à gérer ni à résilier.",
                        pt: "Você pagou uma única vez pela Apple, então não há assinatura para gerenciar nem cancelar.",
                    }),
                },
            },
            play_store: {
                name: t({ en: "Google Play", es: "Google Play", fr: "Google Play", pt: "Google Play" }),
                title: t({
                    en: "Manage it in Google Play",
                    es: "Adminístralo en Google Play",
                    fr: "Gérez-le dans Google Play",
                    pt: "Gerencie no Google Play",
                }),
                body: t({
                    en: "You bought Pro on your Android phone, so Google bills it. Change or cancel it there.",
                    es: "Compraste Pro en tu Android, así que Google lo factura. Cámbialo o cancélalo allí.",
                    fr: "Vous avez acheté Pro sur votre téléphone Android, Google le facture donc. Modifiez-le ou résiliez-le là-bas.",
                    pt: "Você comprou o Pro no Android, então o Google faz a cobrança. Altere ou cancele por lá.",
                }),
                step1: t({
                    en: "Open Google Play on your phone",
                    es: "Abre Google Play en tu teléfono",
                    fr: "Ouvrez Google Play sur votre téléphone",
                    pt: "Abra o Google Play no celular",
                }),
                step2: t({
                    en: "Tap your profile, then Payments and subscriptions",
                    es: "Toca tu perfil y luego Pagos y suscripciones",
                    fr: "Touchez votre profil, puis Paiements et abonnements",
                    pt: "Toque no perfil e em Pagamentos e assinaturas",
                }),
                open: t({
                    en: "Open Google Play",
                    es: "Abrir Google Play",
                    fr: "Ouvrir Google Play",
                    pt: "Abrir Google Play",
                }),
                lifetime: {
                    title: t({
                        en: "Bought on Google Play",
                        es: "Comprado en Google Play",
                        fr: "Acheté sur Google Play",
                        pt: "Comprado no Google Play",
                    }),
                    body: t({
                        en: "You paid once through Google, so there's no subscription to manage or cancel.",
                        es: "Pagaste una sola vez a través de Google, así que no hay ninguna suscripción que administrar ni cancelar.",
                        fr: "Vous avez payé une seule fois via Google : il n'y a donc aucun abonnement à gérer ni à résilier.",
                        pt: "Você pagou uma única vez pelo Google, então não há assinatura para gerenciar nem cancelar.",
                    }),
                },
            },
            step3: t({ en: "Tap Outlayr", es: "Toca Outlayr", fr: "Touchez Outlayr", pt: "Toque em Outlayr" }),
            stripe: t({ en: "Stripe", es: "Stripe", fr: "Stripe", pt: "Stripe" }),
        },
    },
    key: "plan",
} satisfies Dictionary;

export default plan;
