import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const paywall = {
    content: {
        signOut: t({ en: "Sign out", es: "Cerrar sesión", fr: "Se déconnecter", pt: "Sair" }),
        headline: t({
            en: "Logs itself. Every currency. Every installment.",
            es: "Se registra solo. Cada moneda. Cada cuota.",
            fr: "Tout s'enregistre. Chaque devise. Chaque échéance.",
            pt: "Registra sozinho. Cada moeda. Cada parcela.",
        }),
        subhead: t({
            en: "Everything Free does, without the limits.",
            es: "Todo lo que hace Gratis, sin los límites.",
            fr: "Tout ce que fait Gratuit, sans les limites.",
            pt: "Tudo o que o Grátis faz, sem os limites.",
        }),
        changes: t({
            en: "What upgrading changes",
            es: "Qué cambia al mejorar",
            fr: "Ce que l'abonnement change",
            pt: "O que muda ao assinar",
        }),
        free: t({ en: "Free", es: "Gratis", fr: "Gratuit", pt: "Grátis" }),
        pro: t({ en: "Pro", es: "Pro", fr: "Pro", pt: "Pro" }),
        rows: {
            autoLog: t({
                en: "Auto-log / month",
                es: "Registro automático / mes",
                fr: "Saisie auto / mois",
                pt: "Registro automático / mês",
            }),
            captures: t({
                en: "Captures / 30 days",
                es: "Capturas / 30 días",
                fr: "Captures / 30 jours",
                pt: "Capturas / 30 dias",
            }),
            accounts: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            installmentApps: t({
                en: "Installment apps",
                es: "Apps de cuotas",
                fr: "Applis de paiement échelonné",
                pt: "Apps de parcelas",
            }),
            payoffPlans: t({
                en: "Payoff plans",
                es: "Planes de pago",
                fr: "Plans de remboursement",
                pt: "Planos de quitação",
            }),
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
            receipts: t({
                en: "Receipt photo backup",
                es: "Copia de fotos de recibos",
                fr: "Sauvegarde des photos de reçus",
                pt: "Backup de fotos de recibos",
            }),
            aiMatching: t({
                en: "AI matching on import",
                es: "Coincidencia con IA al importar",
                fr: "Rapprochement IA à l'import",
                pt: "Correspondência com IA ao importar",
            }),
            notion: t({
                en: "Notion connection",
                es: "Conexión con Notion",
                fr: "Connexion Notion",
                pt: "Conexão com Notion",
            }),
            merchantLookup: t({
                en: "Web merchant lookup",
                es: "Búsqueda web de comercios",
                fr: "Recherche web des commerçants",
                pt: "Busca web de estabelecimentos",
            }),
        },
        plans: {
            label: t({ en: "Plan", es: "Plan", fr: "Forfait", pt: "Plano" }),
            annual: t({ en: "Yearly", es: "Anual", fr: "Annuel", pt: "Anual" }),
            monthly: t({ en: "Monthly", es: "Mensual", fr: "Mensuel", pt: "Mensal" }),
            lifetime: t({ en: "Lifetime", es: "De por vida", fr: "À vie", pt: "Vitalício" }),
        },
        bestValue: t({ en: "Best value", es: "Mejor valor", fr: "Meilleure offre", pt: "Melhor valor" }),
        save: insert(
            t({
                en: "Save {{percent}}%",
                es: "Ahorra {{percent}}%",
                fr: "Économisez {{percent}} %",
                pt: "Economize {{percent}}%",
            })
        ),
        perYear: t({ en: "/ year", es: "/ año", fr: "/ an", pt: "/ ano" }),
        perMonth: t({ en: "/ month", es: "/ mes", fr: "/ mois", pt: "/ mês" }),
        perMo: t({ en: "/ mo", es: "/ mes", fr: "/ mois", pt: "/ mês" }),
        once: t({ en: "once", es: "una vez", fr: "une fois", pt: "uma vez" }),
        lifetimeNote: t({
            en: "Lifetime, nothing to renew",
            es: "De por vida, nada que renovar",
            fr: "À vie, rien à renouveler",
            pt: "Vitalício, nada para renovar",
        }),
        today: t({ en: "Today", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
        anytime: t({ en: "Anytime", es: "Cuando quieras", fr: "À tout moment", pt: "Quando quiser" }),
        everyDevice: t({ en: "Every device", es: "Cada dispositivo", fr: "Chaque appareil", pt: "Cada dispositivo" }),
        afterThat: t({ en: "After that", es: "Después", fr: "Ensuite", pt: "Depois" }),
        dayN: insert(t({ en: "Day {{day}}", es: "Día {{day}}", fr: "Jour {{day}}", pt: "Dia {{day}}" })),
        proUnlocks: t({ en: "Pro unlocks", es: "Se activa Pro", fr: "Pro s'active", pt: "O Pro é ativado" }),
        firstCharge: t({ en: "First charge", es: "Primer cobro", fr: "Premier paiement", pt: "Primeira cobrança" }),
        unlocksAndCharges: t({
            en: "Pro unlocks, first charge",
            es: "Se activa Pro, primer cobro",
            fr: "Pro s'active, premier paiement",
            pt: "O Pro é ativado, primeira cobrança",
        }),
        renewsFor: insert(
            t({
                en: "Renews for {{price}}",
                es: "Se renueva por {{price}}",
                fr: "Renouvellement à {{price}}",
                pt: "Renova por {{price}}",
            })
        ),
        cancelNoCharges: t({
            en: "Cancel, no more charges",
            es: "Cancela, sin más cobros",
            fr: "Résiliez, plus aucun paiement",
            pt: "Cancele, sem mais cobranças",
        }),
        unlocksOneCharge: t({
            en: "Pro unlocks, one charge",
            es: "Se activa Pro, un solo cobro",
            fr: "Pro s'active, un seul paiement",
            pt: "O Pro é ativado, uma só cobrança",
        }),
        sameLedger: t({
            en: "Same Pro, same ledger",
            es: "El mismo Pro, el mismo registro",
            fr: "Même Pro, même registre",
            pt: "O mesmo Pro, o mesmo registro",
        }),
        noMoreCharges: t({
            en: "No more charges",
            es: "Sin más cobros",
            fr: "Plus aucun paiement",
            pt: "Sem mais cobranças",
        }),
        startTrial: t({
            en: "Start 7 days free",
            es: "Empieza 7 días gratis",
            fr: "Essayer 7 jours gratuits",
            pt: "Começar 7 dias grátis",
        }),
        thenPerYear: insert(
            t({
                en: "then {{price}}/year. Cancel anytime",
                es: "luego {{price}}/año. Cancela cuando quieras",
                fr: "puis {{price}}/an. Résiliable à tout moment",
                pt: "depois {{price}}/ano. Cancele quando quiser",
            })
        ),
        continueWithYearly: t({
            en: "Continue with Yearly",
            es: "Continuar con Anual",
            fr: "Continuer avec Annuel",
            pt: "Continuar com Anual",
        }),
        chargedToday: t({
            en: "Charged today. Cancel anytime",
            es: "Se cobra hoy. Cancela cuando quieras",
            fr: "Débité aujourd'hui. Résiliable à tout moment",
            pt: "Cobrado hoje. Cancele quando quiser",
        }),
        getMonthly: insert(
            t({
                en: "Get Pro for {{price}}/month",
                es: "Obtén Pro por {{price}}/mes",
                fr: "Passer à Pro pour {{price}}/mois",
                pt: "Assinar o Pro por {{price}}/mês",
            })
        ),
        getLifetime: insert(
            t({
                en: "Get Pro for {{price}}",
                es: "Obtén Pro por {{price}}",
                fr: "Passer à Pro pour {{price}}",
                pt: "Obter o Pro por {{price}}",
            })
        ),
        cancelAnytime: t({
            en: "Cancel anytime",
            es: "Cancela cuando quieras",
            fr: "Résiliable à tout moment",
            pt: "Cancele quando quiser",
        }),
        unlocking: t({
            en: "Unlocking Pro...",
            es: "Activando Pro...",
            fr: "Activation de Pro...",
            pt: "Ativando o Pro...",
        }),
        restore: t({ en: "Restore", es: "Restaurar", fr: "Restaurer", pt: "Restaurar" }),
        restoring: t({ en: "Restoring...", es: "Restaurando...", fr: "Restauration...", pt: "Restaurando..." }),
        terms: t({ en: "Terms", es: "Términos", fr: "Conditions", pt: "Termos" }),
        privacy: t({ en: "Privacy", es: "Privacidad", fr: "Confidentialité", pt: "Privacidade" }),
        tryAgain: t({ en: "Try again", es: "Reintentar", fr: "Réessayer", pt: "Tentar novamente" }),
        writeToSupport: t({
            en: "Write to support",
            es: "Escribir a soporte",
            fr: "Écrire au support",
            pt: "Falar com o suporte",
        }),
        purchaseFailed: t({
            en: "The purchase did not finish. If you were charged, Restore will unlock Pro.",
            es: "La compra no terminó. Si te cobraron, Restaurar activará Pro.",
            fr: "L'achat n'a pas abouti. Si vous avez été débité, Restaurer activera Pro.",
            pt: "A compra não foi concluída. Se você foi cobrado, Restaurar ativará o Pro.",
        }),
        nothingRestored: t({
            en: "No active Pro on this account.",
            es: "No hay Pro activo en esta cuenta.",
            fr: "Aucun Pro actif sur ce compte.",
            pt: "Nenhum Pro ativo nesta conta.",
        }),
        restoreFailed: t({
            en: "The restore could not be completed. Check the connection and tap Restore again.",
            es: "No se pudo completar la restauración. Revisa la conexión y toca Restaurar de nuevo.",
            fr: "La restauration a échoué. Vérifiez la connexion et touchez à nouveau Restaurer.",
            pt: "Não foi possível restaurar. Verifique a conexão e toque em Restaurar de novo.",
        }),
        plansUnavailable: t({
            en: "Plans are not available right now.",
            es: "Los planes no están disponibles ahora.",
            fr: "Les forfaits ne sont pas disponibles pour le moment.",
            pt: "Os planos não estão disponíveis agora.",
        }),
        notConfirmed: t({
            en: "The purchase went through, but the server has not confirmed it yet. Try again in a moment.",
            es: "La compra se realizó, pero el servidor aún no la confirma. Reintenta en un momento.",
            fr: "L'achat a abouti, mais le serveur ne l'a pas encore confirmé. Réessayez dans un instant.",
            pt: "A compra foi concluída, mas o servidor ainda não a confirmou. Tente novamente em instantes.",
        }),
        didNotUnlock: t({
            en: "The purchase completed but Pro did not unlock. Try Restore, and write to support if it stays locked.",
            es: "La compra terminó pero Pro no se activó. Prueba Restaurar y escribe a soporte si sigue bloqueado.",
            fr: "L'achat a abouti mais Pro ne s'est pas activé. Essayez Restaurer et écrivez au support si rien ne change.",
            pt: "A compra foi concluída, mas o Pro não foi ativado. Tente Restaurar e fale com o suporte se continuar bloqueado.",
        }),
        endedOn: insert(
            t({
                en: "Your Pro ended {{date}}",
                es: "Tu Pro terminó el {{date}}",
                fr: "Votre Pro a pris fin le {{date}}",
                pt: "Seu Pro terminou em {{date}}",
            })
        ),
        endedSub: t({
            en: "Outlayr on the web needs Pro. Pick a plan to get back in.",
            es: "Outlayr en la web necesita Pro. Elige un plan para volver.",
            fr: "Outlayr sur le web nécessite Pro. Choisissez un forfait pour revenir.",
            pt: "O Outlayr na web precisa do Pro. Escolha um plano para voltar.",
        }),
        comesBack: t({ en: "What comes back", es: "Qué vuelve", fr: "Ce qui revient", pt: "O que volta" }),
        back: {
            ledger: t({
                en: "Your dashboard and ledger",
                es: "Tu panel y tu registro",
                fr: "Votre tableau de bord et votre registre",
                pt: "Seu painel e seu registro",
            }),
            ledgerHint: t({
                en: "Everything synced from your phone",
                es: "Todo lo sincronizado desde tu teléfono",
                fr: "Tout ce qui est synchronisé depuis votre téléphone",
                pt: "Tudo o que foi sincronizado do seu celular",
            }),
            sync: t({
                en: "Sync across devices",
                es: "Sincronizar entre dispositivos",
                fr: "Synchro entre appareils",
                pt: "Sincronizar entre dispositivos",
            }),
            syncHint: t({
                en: "And a backup if you lose your phone",
                es: "Y una copia si pierdes el teléfono",
                fr: "Et une sauvegarde si vous perdez votre téléphone",
                pt: "E um backup se você perder o celular",
            }),
            logs: t({
                en: "Everything logs itself",
                es: "Todo se registra solo",
                fr: "Tout s'enregistre",
                pt: "Tudo se registra sozinho",
            }),
            logsHint: t({
                en: "No monthly limit",
                es: "Sin límite mensual",
                fr: "Sans limite mensuelle",
                pt: "Sem limite mensal",
            }),
            currencies: t({
                en: "Every currency together",
                es: "Todas las monedas juntas",
                fr: "Toutes les devises réunies",
                pt: "Todas as moedas juntas",
            }),
            currenciesHint: t({
                en: "Totals at the day's rate",
                es: "Totales a la tasa del día",
                fr: "Totaux au taux du jour",
                pt: "Totais na cotação do dia",
            }),
            installments: t({
                en: "Every installment plan",
                es: "Todos los planes de cuotas",
                fr: "Tous les paiements échelonnés",
                pt: "Todos os planos de parcelas",
            }),
            installmentsHint: t({
                en: "No limit on apps or plans",
                es: "Sin límite de apps ni planes",
                fr: "Sans limite d'applis ni de plans",
                pt: "Sem limite de apps ou planos",
            }),
        },
        proName: t({ en: "Outlayr Pro", es: "Outlayr Pro", fr: "Outlayr Pro", pt: "Outlayr Pro" }),
        active: t({ en: "Active", es: "Activo", fr: "Actif", pt: "Ativo" }),
        notConfirmedBadge: t({ en: "Not confirmed", es: "Sin confirmar", fr: "Non confirmé", pt: "Não confirmado" }),
        price: t({ en: "Price", es: "Precio", fr: "Prix", pt: "Preço" }),
        renews: t({ en: "Renews", es: "Se renueva", fr: "Renouvellement", pt: "Renova" }),
        managePlan: t({ en: "Manage plan", es: "Administrar plan", fr: "Gérer le forfait", pt: "Gerenciar plano" }),
        openDashboard: t({
            en: "Open dashboard",
            es: "Abrir panel",
            fr: "Ouvrir le tableau de bord",
            pt: "Abrir painel",
        }),
        checkAgain: t({
            en: "Check again",
            es: "Comprobar de nuevo",
            fr: "Vérifier à nouveau",
            pt: "Verificar novamente",
        }),
        syncRow: t({ en: "Sync", es: "Sincronización", fr: "Synchro", pt: "Sincronização" }),
        aiRow: t({ en: "AI features", es: "Funciones de IA", fr: "Fonctions IA", pt: "Recursos de IA" }),
        off: t({ en: "Off", es: "Desactivado", fr: "Désactivé", pt: "Desativado" }),
        alreadyNotConfirmed: t({
            en: "Pro is active on this account, but the server has not confirmed it, so syncing and the AI features stay off until it does.",
            es: "Pro está activo en esta cuenta, pero el servidor no lo ha confirmado, así que la sincronización y las funciones de IA siguen desactivadas hasta entonces.",
            fr: "Pro est actif sur ce compte, mais le serveur ne l'a pas confirmé : la synchro et les fonctions IA restent désactivées d'ici là.",
            pt: "O Pro está ativo nesta conta, mas o servidor não o confirmou, então a sincronização e os recursos de IA ficam desativados até lá.",
        }),
        proIsOn: t({ en: "Pro is on.", es: "Pro está activo.", fr: "Pro est activé.", pt: "O Pro está ativo." }),
        proIsOnTrial: insert(
            t({
                en: "Pro is on. Free trial until {{date}}.",
                es: "Pro está activo. Prueba gratis hasta el {{date}}.",
                fr: "Pro est activé. Essai gratuit jusqu'au {{date}}.",
                pt: "O Pro está ativo. Teste grátis até {{date}}.",
            })
        ),
    },
    key: "paywall",
} satisfies Dictionary;

export default paywall;
