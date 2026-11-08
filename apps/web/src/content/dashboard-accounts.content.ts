import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardAccounts = {
    content: {
        actions: {
            addAccount: t({ en: "Add account", es: "Añadir cuenta", fr: "Ajouter un compte", pt: "Adicionar conta" }),
            byBalance: t({ en: "By balance", es: "Por saldo", fr: "Par solde", pt: "Por saldo" }),
            check: t({ en: "Check balance", es: "Revisar saldo", fr: "Vérifier le solde", pt: "Conferir saldo" }),
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            edit: t({ en: "Edit", es: "Editar", fr: "Modifier", pt: "Editar" }),
            import: t({ en: "Import", es: "Importar", fr: "Importer", pt: "Importar" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    es: "Más opciones de {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            open: t({ en: "Open", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            reorder: t({
                en: "Reorder accounts",
                es: "Reordenar cuentas",
                fr: "Réorganiser les comptes",
                pt: "Reordenar contas",
            }),
            seeAll: t({ en: "See all", es: "Ver todo", fr: "Tout voir", pt: "Ver tudo" }),
            transfer: t({ en: "Transfer", es: "Transferir", fr: "Virement", pt: "Transferir" }),
            yourOrder: t({ en: "Your order", es: "Tu orden", fr: "Votre ordre", pt: "Sua ordem" }),
        },
        card: {
            available: insert(
                t({
                    en: "{{amount}} available",
                    es: "{{amount}} disponible",
                    fr: "{{amount}} disponibles",
                    pt: "{{amount}} disponível",
                })
            ),
            due: insert(
                t({ en: "due {{date}}", es: "vence el {{date}}", fr: "à payer le {{date}}", pt: "vence em {{date}}" })
            ),
            noLimit: t({ en: "No limit set", es: "Sin límite", fr: "Pas de plafond", pt: "Sem limite" }),
            nothingDue: insert(
                t({
                    en: "Nothing due {{date}}",
                    es: "Nada que pagar el {{date}}",
                    fr: "Rien à payer le {{date}}",
                    pt: "Nada a pagar em {{date}}",
                })
            ),
            overdue: insert(
                t({
                    en: "overdue since {{date}}",
                    es: "vencido desde el {{date}}",
                    fr: "en retard depuis le {{date}}",
                    pt: "vencido desde {{date}}",
                })
            ),
            closes: insert(
                t({ en: "closes {{date}}", es: "corte el {{date}}", fr: "relevé le {{date}}", pt: "fecha em {{date}}" })
            ),
        },
        check: {
            daysAgo: insert(
                t({
                    en: "checked {{count}} days ago",
                    es: "revisado hace {{count}} días",
                    fr: "vérifié il y a {{count}} jours",
                    pt: "conferido há {{count}} dias",
                })
            ),
            never: t({ en: "never checked", es: "sin revisar", fr: "jamais vérifié", pt: "nunca conferido" }),
            stale: insert(
                t({
                    en: "not checked in {{count}} days",
                    es: "sin revisar hace {{count}} días",
                    fr: "non vérifié depuis {{count}} jours",
                    pt: "sem conferir há {{count}} dias",
                })
            ),
            today: t({ en: "checked today", es: "revisado hoy", fr: "vérifié aujourd'hui", pt: "conferido hoje" }),
            yesterday: t({ en: "checked yesterday", es: "revisado ayer", fr: "vérifié hier", pt: "conferido ontem" }),
        },
        columns: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            balance: t({ en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            card: t({ en: "Card", es: "Tarjeta", fr: "Carte", pt: "Cartão" }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            inMain: insert(
                t({ en: "In {{currency}}", es: "En {{currency}}", fr: "En {{currency}}", pt: "Em {{currency}}" })
            ),
            last30: t({ en: "Last 30 days", es: "Últimos 30 días", fr: "30 derniers jours", pt: "Últimos 30 dias" }),
            statement: t({ en: "Statement", es: "Corte", fr: "Relevé", pt: "Fatura" }),
            used: t({ en: "Used of limit", es: "Usado del límite", fr: "Plafond utilisé", pt: "Usado do limite" }),
        },
        detail: {
            atRate: insert(
                t({
                    en: "At {{rate}}, {{date}}",
                    es: "A {{rate}}, {{date}}",
                    fr: "À {{rate}}, {{date}}",
                    pt: "A {{rate}}, {{date}}",
                })
            ),
            emptyBody: t({
                en: "This account's transactions will gather here.",
                es: "Los movimientos de esta cuenta aparecerán aquí.",
                fr: "Les opérations de ce compte s'afficheront ici.",
                pt: "Os lançamentos desta conta vão aparecer aqui.",
            }),
            emptyTitle: t({
                en: "Nothing attached yet",
                es: "Aún no hay movimientos",
                fr: "Rien pour l'instant",
                pt: "Nada por aqui ainda",
            }),
            importEntries: t({
                en: "Import entries",
                es: "Importar movimientos",
                fr: "Importer des opérations",
                pt: "Importar lançamentos",
            }),
            mainCurrency: t({
                en: "Main currency",
                es: "Moneda principal",
                fr: "Devise principale",
                pt: "Moeda principal",
            }),
            noEntries: insert(
                t({
                    en: "No entries in {{period}}",
                    es: "Sin movimientos en {{period}}",
                    fr: "Aucune opération en {{period}}",
                    pt: "Nenhum lançamento em {{period}}",
                })
            ),
            addEntry: t({
                en: "Add entry",
                es: "Añadir movimiento",
                fr: "Ajouter une opération",
                pt: "Adicionar lançamento",
            }),
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            available: t({ en: "Available", es: "Disponible", fr: "Disponible", pt: "Disponível" }),
            average: t({
                en: "Average in a month",
                es: "Promedio en un mes",
                fr: "Moyenne sur un mois",
                pt: "Média em um mês",
            }),
            back: t({
                en: "Back to accounts",
                es: "Volver a cuentas",
                fr: "Retour aux comptes",
                pt: "Voltar às contas",
            }),
            balance: t({ en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            cameIn: t({ en: "Came in", es: "Entró", fr: "Entrées", pt: "Entrou" }),
            card: t({ en: "Card", es: "Tarjeta", fr: "Carte", pt: "Cartão" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            check: t({ en: "Check", es: "Revisar", fr: "Vérifier", pt: "Conferir" }),
            checkLine: t({
                en: "Compare it with your bank.",
                es: "Compáralo con tu banco.",
                fr: "Comparez avec votre banque.",
                pt: "Compare com seu banco.",
            }),
            checkTitle: t({
                en: "Check your balance",
                es: "Revisa tu saldo",
                fr: "Vérifiez votre solde",
                pt: "Confira seu saldo",
            }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            day: insert(t({ en: "Day {{day}}", es: "Día {{day}}", fr: "Le {{day}}", pt: "Dia {{day}}" })),
            details: t({ en: "Details", es: "Detalles", fr: "Détails", pt: "Detalhes" }),
            dueClosed: insert(
                t({
                    en: "Due {{due}} · closed {{closed}}",
                    es: "Vence el {{due}} · corte del {{closed}}",
                    fr: "À payer le {{due}} · relevé du {{closed}}",
                    pt: "Vence em {{due}} · fechou em {{closed}}",
                })
            ),
            overdueSince: insert(
                t({
                    en: "Overdue since {{date}}",
                    es: "Vencido desde el {{date}}",
                    fr: "En retard depuis le {{date}}",
                    pt: "Atrasada desde {{date}}",
                })
            ),
            entries: t({ en: "Entries", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            entriesIn: insert(
                t({
                    en: "{{count}} entries in {{period}}",
                    es: "{{count}} movimientos en {{period}}",
                    fr: "{{count}} opérations en {{period}}",
                    pt: "{{count}} lançamentos em {{period}}",
                })
            ),
            entryIn: insert(
                t({
                    en: "1 entry in {{period}}",
                    es: "1 movimiento en {{period}}",
                    fr: "1 opération en {{period}}",
                    pt: "1 lançamento em {{period}}",
                })
            ),
            fromName: insert(t({ en: "From {{name}}", es: "De {{name}}", fr: "De {{name}}", pt: "De {{name}}" })),
            history: t({
                en: "Balance history",
                es: "Historial del saldo",
                fr: "Historique du solde",
                pt: "Histórico do saldo",
            }),
            limit: t({ en: "Credit limit", es: "Límite de crédito", fr: "Plafond", pt: "Limite de crédito" }),
            loan: t({ en: "Loan", es: "Préstamo", fr: "Prêt", pt: "Empréstimo" }),
            matchedAt: insert(
                t({
                    en: "Matched your bank at {{time}}",
                    es: "Coincidió con tu banco a las {{time}}",
                    fr: "Identique à votre banque à {{time}}",
                    pt: "Conferiu com seu banco às {{time}}",
                })
            ),
            matchedOn: insert(
                t({
                    en: "Matched your bank on {{date}}",
                    es: "Coincidió con tu banco el {{date}}",
                    fr: "Identique à votre banque le {{date}}",
                    pt: "Conferiu com seu banco em {{date}}",
                })
            ),
            merchant: t({ en: "Merchant", es: "Comercio", fr: "Marchand", pt: "Estabelecimento" }),
            moved: t({ en: "Moved", es: "Movido", fr: "Virements", pt: "Transferido" }),
            nextClose: insert(
                t({
                    en: "Next statement closes {{date}}",
                    es: "Próximo corte el {{date}}",
                    fr: "Prochain relevé le {{date}}",
                    pt: "Próxima fatura fecha em {{date}}",
                })
            ),
            noStatement: t({
                en: "No statement day set",
                es: "Sin fecha de corte",
                fr: "Pas de date de relevé",
                pt: "Sem data de fechamento",
            }),
            noTransfers: insert(
                t({
                    en: "No transfers in {{period}}",
                    es: "Sin transferencias en {{period}}",
                    fr: "Aucun virement en {{period}}",
                    pt: "Sem transferências em {{period}}",
                })
            ),
            nothingIn: insert(
                t({
                    en: "Nothing in {{period}}",
                    es: "Nada en {{period}}",
                    fr: "Rien en {{period}}",
                    pt: "Nada em {{period}}",
                })
            ),
            notFound: t({
                en: "This account is no longer here.",
                es: "Esta cuenta ya no está.",
                fr: "Ce compte n'existe plus.",
                pt: "Esta conta não existe mais.",
            }),
            ofLimit: insert(
                t({
                    en: "{{percent}}% of {{limit}}",
                    es: "{{percent}}% de {{limit}}",
                    fr: "{{percent}} % de {{limit}}",
                    pt: "{{percent}}% de {{limit}}",
                })
            ),
            opening: t({ en: "Opening balance", es: "Saldo inicial", fr: "Solde initial", pt: "Saldo inicial" }),
            owed: insert(
                t({ en: "{{amount}} owed", es: "{{amount}} adeudado", fr: "{{amount}} dû", pt: "{{amount}} devido" })
            ),
            owedLine: t({
                en: "Owed, statement plus new charges",
                es: "Adeudado, corte más cargos nuevos",
                fr: "Dû, relevé plus nouvelles dépenses",
                pt: "Devido, fatura mais novas compras",
            }),
            payCard: t({ en: "Pay card", es: "Pagar tarjeta", fr: "Payer la carte", pt: "Pagar cartão" }),
            since: t({ en: "Since statement", es: "Desde el corte", fr: "Depuis le relevé", pt: "Desde a fatura" }),
            spentFrom: insert(
                t({
                    en: "Spent from {{name}}",
                    es: "Gastado de {{name}}",
                    fr: "Dépensé depuis {{name}}",
                    pt: "Gasto de {{name}}",
                })
            ),
            statementDay: t({
                en: "Statement closes",
                es: "Fecha de corte",
                fr: "Date du relevé",
                pt: "Fechamento da fatura",
            }),
            paymentDay: t({ en: "Payment due", es: "Fecha de pago", fr: "Date de paiement", pt: "Vencimento" }),
            started: t({ en: "Started", es: "Inicio", fr: "Ouvert", pt: "Início" }),
            startedAt: insert(
                t({
                    en: "Started at {{amount}} · {{date}}",
                    es: "Empezó en {{amount}} · {{date}}",
                    fr: "Ouvert à {{amount}} · {{date}}",
                    pt: "Começou em {{amount}} · {{date}}",
                })
            ),
            statement: t({ en: "Statement", es: "Corte", fr: "Relevé", pt: "Fatura" }),
            transactions: t({ en: "Transactions", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            transfer: t({ en: "Transfer", es: "Transferencia", fr: "Virement", pt: "Transferência" }),
            transferFrom: insert(
                t({
                    en: "1 transfer, from {{name}}",
                    es: "1 transferencia, de {{name}}",
                    fr: "1 virement, depuis {{name}}",
                    pt: "1 transferência, de {{name}}",
                })
            ),
            transferTo: insert(
                t({
                    en: "1 transfer, to {{name}}",
                    es: "1 transferencia, a {{name}}",
                    fr: "1 virement, vers {{name}}",
                    pt: "1 transferência, para {{name}}",
                })
            ),
            transfersIn: insert(
                t({
                    en: "{{count}} transfers in {{period}}",
                    es: "{{count}} transferencias en {{period}}",
                    fr: "{{count}} virements en {{period}}",
                    pt: "{{count}} transferências em {{period}}",
                })
            ),
            type: t({ en: "Type", es: "Tipo", fr: "Type", pt: "Tipo" }),
            wentOut: t({ en: "Went out", es: "Salió", fr: "Sorties", pt: "Saiu" }),
        },
        empty: {
            line: t({
                en: "Money lives in places. Give yours its first one.",
                es: "El dinero vive en algún lugar. Dale al tuyo el primero.",
                fr: "L'argent vit quelque part. Donnez au vôtre son premier compte.",
                pt: "O dinheiro mora em algum lugar. Dê ao seu o primeiro.",
            }),
            title: t({
                en: "No accounts yet",
                es: "Aún no hay cuentas",
                fr: "Pas encore de compte",
                pt: "Nenhuma conta ainda",
            }),
        },
        kpi: {
            accounts: insert(
                t({
                    en: "{{count}} accounts",
                    es: "{{count}} cuentas",
                    fr: "{{count}} comptes",
                    pt: "{{count}} contas",
                })
            ),
            available: t({
                en: "Credit available",
                es: "Crédito disponible",
                fr: "Crédit disponible",
                pt: "Crédito disponível",
            }),
            have: t({ en: "Have", es: "Tienes", fr: "Avoirs", pt: "Tenho" }),
            netWorth: t({ en: "Net worth", es: "Patrimonio", fr: "Patrimoine", pt: "Patrimônio" }),
            of: insert(t({ en: "of {{amount}}", es: "de {{amount}}", fr: "sur {{amount}}", pt: "de {{amount}}" })),
            owe: t({ en: "Owe", es: "Debes", fr: "Dettes", pt: "Devo" }),
        },
        list: {
            accounts: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            byCurrency: t({ en: "By currency", es: "Por moneda", fr: "Par devise", pt: "Por moeda" }),
            cards: t({
                en: "Cards and loans",
                es: "Tarjetas y préstamos",
                fr: "Cartes et prêts",
                pt: "Cartões e empréstimos",
            }),
            inPeriod: insert(
                t({
                    en: "{{amount}} in {{period}}",
                    es: "{{amount}} en {{period}}",
                    fr: "{{amount}} en {{period}}",
                    pt: "{{amount}} em {{period}}",
                })
            ),
            noRate: insert(
                t({
                    en: "{{codes}} has no rate for today yet, so its total is approximate.",
                    es: "{{codes}} aún no tiene tasa de hoy, así que su total es aproximado.",
                    fr: "{{codes}} n'a pas encore de taux pour aujourd'hui, son total est donc approximatif.",
                    pt: "{{codes}} ainda não tem cotação de hoje, então o total é aproximado.",
                })
            ),
            rateTo: insert(
                t({
                    en: "{{from}} to {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "{{from}} en {{to}}",
                    pt: "{{from}} para {{to}}",
                })
            ),
            rates: t({ en: "Rates", es: "Tasas", fr: "Taux", pt: "Cotações" }),
            title: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            transfers: t({ en: "Transfers", es: "Transferencias", fr: "Virements", pt: "Transferências" }),
            transferTo: insert(t({ en: "To {{name}}", es: "A {{name}}", fr: "Vers {{name}}", pt: "Para {{name}}" })),
            upcoming: t({ en: "Upcoming", es: "Próximos", fr: "À venir", pt: "Próximos" }),
        },
        net: {
            accounts: insert(
                t({
                    en: "{{count}} accounts",
                    es: "{{count}} cuentas",
                    fr: "{{count}} comptes",
                    pt: "{{count}} contas",
                })
            ),
            byMonth: t({ en: "By month", es: "Por mes", fr: "Par mois", pt: "Por mês" }),
            change: t({ en: "Change", es: "Cambio", fr: "Variation", pt: "Variação" }),
            haveAndOwe: t({
                en: "Have and owe",
                es: "Tienes y debes",
                fr: "Avoirs et dettes",
                pt: "Tenho e devo",
            }),
            inMonth: insert(t({ en: "in {{period}}", es: "en {{period}}", fr: "en {{period}}", pt: "em {{period}}" })),
            keptIn: insert(
                t({
                    en: "Kept in {{period}}",
                    es: "Ahorrado en {{period}}",
                    fr: "Épargné en {{period}}",
                    pt: "Guardado em {{period}}",
                })
            ),
            month: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
            ofIncome: insert(
                t({
                    en: "of {{amount}} income",
                    es: "de {{amount}} de ingresos",
                    fr: "sur {{amount}} de revenus",
                    pt: "de {{amount}} de renda",
                })
            ),
            started: t({ en: "Started", es: "Inicio", fr: "Début", pt: "Início" }),
        },
        range: {
            month: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
            quarter: t({ en: "Quarter", es: "Trimestre", fr: "Trimestre", pt: "Trimestre" }),
            sixMonths: t({ en: "6 months", es: "6 meses", fr: "6 mois", pt: "6 meses" }),
            year: t({ en: "Year", es: "Año", fr: "Année", pt: "Ano" }),
            all: t({ en: "All", es: "Todo", fr: "Tout", pt: "Tudo" }),
        },
    },
    key: "dashboard-accounts",
} satisfies Dictionary;

export default dashboardAccounts;
