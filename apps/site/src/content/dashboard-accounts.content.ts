import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardAccounts = {
    content: {
        actions: {
            addAccount: t({ en: "Add account", es: "Añadir cuenta", fr: "Ajouter un compte", pt: "Adicionar conta" }),
            byBalance: t({ en: "By balance", es: "Por saldo", fr: "Par solde", pt: "Por saldo" }),
            changeCategory: t({
                en: "Change category",
                es: "Cambiar categoría",
                fr: "Changer de catégorie",
                pt: "Mudar categoria",
            }),
            check: t({ en: "Check balance", es: "Revisar saldo", fr: "Vérifier le solde", pt: "Conferir saldo" }),
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            moveToAccount: t({
                en: "Move to account",
                es: "Mover a otra cuenta",
                fr: "Déplacer vers un compte",
                pt: "Mover para outra conta",
            }),
            edit: t({ en: "Edit", es: "Editar", fr: "Modifier", pt: "Editar" }),
            import: t({ en: "Import", es: "Importar", fr: "Importer", pt: "Importar" }),
            importScreenshot: t({
                en: "Import from screenshot",
                es: "Importar de una captura",
                fr: "Importer depuis une capture",
                pt: "Importar de uma captura",
            }),
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
            payOffBy: t({ en: "Pay off by", es: "Saldar antes del", fr: "Solder avant le", pt: "Quitar até" }),
            newPurchase: t({ en: "New purchase", es: "Nueva compra", fr: "Nouvel achat", pt: "Nova compra" }),
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
            flowIn: t({ en: "In", es: "Entró", fr: "Entrées", pt: "Entrou" }),
            flowOut: t({ en: "Out", es: "Salió", fr: "Sorties", pt: "Saiu" }),
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
            compareBankApp: t({
                en: "Compare it with your bank app",
                es: "Compáralo con la app de tu banco",
                fr: "Comparez avec l'app de votre banque",
                pt: "Compare com o app do seu banco",
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
            entriesCount: insert(
                t({
                    en: "{{count}} entries",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entryCount: t({ en: "1 entry", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
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
            checkedBand: insert(
                t({
                    en: "Checked {{time}} · adjusted {{amount}}",
                    es: "Revisado {{time}} · ajustado {{amount}}",
                    fr: "Vérifié {{time}} · ajusté {{amount}}",
                    pt: "Conferido {{time}} · ajustado {{amount}}",
                })
            ),
            today: t({ en: "Today", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            adjusted: t({ en: "Adjusted", es: "Ajustado", fr: "Ajusté", pt: "Ajustado" }),
            adjustmentChip: t({ en: "Adjustment", es: "Ajuste", fr: "Ajustement", pt: "Ajuste" }),
            adjustmentRow: t({
                en: "Balance adjustment",
                es: "Ajuste de saldo",
                fr: "Ajustement du solde",
                pt: "Ajuste de saldo",
            }),
            oneTransferIn: insert(
                t({
                    en: "1 transfer in {{period}}",
                    es: "1 transferencia en {{period}}",
                    fr: "1 virement en {{period}}",
                    pt: "1 transferência em {{period}}",
                })
            ),
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
            noTransfers: t({
                en: "No transfers",
                es: "Sin transferencias",
                fr: "Aucun virement",
                pt: "Sem transferências",
            }),
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
            spent: t({ en: "Spent", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
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
        flows: {
            archive: t({ en: "Archive", es: "Archivar", fr: "Archiver", pt: "Arquivar" }),
            archiveBody: t({
                en: "It leaves your lists and totals. Every transaction is kept, and you can restore it anytime.",
                es: "Sale de tus listas y totales. Se conservan todos los movimientos y puedes restaurarla cuando quieras.",
                fr: "Il quitte vos listes et vos totaux. Toutes les opérations sont conservées et vous pouvez le restaurer à tout moment.",
                pt: "Ela sai das suas listas e totais. Todas as transações são mantidas e você pode restaurá-la quando quiser.",
            }),
            archiveFailed: insert(
                t({
                    en: "Couldn't archive {{name}}. Try again.",
                    es: "No se pudo archivar {{name}}. Inténtalo de nuevo.",
                    fr: "Impossible d'archiver {{name}}. Réessayez.",
                    pt: "Não foi possível arquivar {{name}}. Tente novamente.",
                })
            ),
            archiveTitle: insert(
                t({
                    en: "Archive {{name}}?",
                    es: "¿Archivar {{name}}?",
                    fr: "Archiver {{name}} ?",
                    pt: "Arquivar {{name}}?",
                })
            ),
            archived: t({ en: "Archived", es: "Archivadas", fr: "Archivés", pt: "Arquivadas" }),
            archivedNote: t({
                en: "Not counted in net worth",
                es: "No cuenta en el patrimonio",
                fr: "Non compté dans le patrimoine",
                pt: "Não conta no patrimônio",
            }),
            archivedOn: insert(
                t({
                    en: "archived {{date}}",
                    es: "archivada el {{date}}",
                    fr: "archivé le {{date}}",
                    pt: "arquivada em {{date}}",
                })
            ),
            archivedToast: insert(
                t({
                    en: "{{name}} archived",
                    es: "{{name}} archivada",
                    fr: "{{name}} archivé",
                    pt: "{{name}} arquivada",
                })
            ),
            balance: t({ en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            bank: t({ en: "Bank", es: "Banco", fr: "Banque", pt: "Banco" }),
            cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            purchaseInInstallments: t({
                en: "Purchase in installments",
                es: "Compra en cuotas",
                fr: "Achat en plusieurs fois",
                pt: "Compra parcelada",
            }),
            cardOrLoan: t({
                en: "Card or loan",
                es: "Tarjeta o préstamo",
                fr: "Carte ou prêt",
                pt: "Cartão ou empréstimo",
            }),
            cash: t({ en: "Cash", es: "Efectivo", fr: "Espèces", pt: "Dinheiro" }),
            checkAdjustment: t({ en: "Adjustment", es: "Ajuste", fr: "Ajustement", pt: "Ajuste" }),
            checkBack: t({ en: "Back", es: "Atrás", fr: "Retour", pt: "Voltar" }),
            checkCompare: t({
                en: "Compare it with your bank or wallet app.",
                es: "Compáralo con tu banco o billetera.",
                fr: "Comparez-le avec votre banque ou votre portefeuille.",
                pt: "Compare com seu banco ou carteira.",
            }),
            checkDifferent: t({
                en: "No, it's different",
                es: "No, es distinto",
                fr: "Non, c'est différent",
                pt: "Não, é diferente",
            }),
            checkFailed: insert(
                t({
                    en: "Couldn't check {{name}}. Try again.",
                    es: "No se pudo revisar {{name}}. Inténtalo de nuevo.",
                    fr: "Impossible de vérifier {{name}}. Réessayez.",
                    pt: "Não foi possível conferir {{name}}. Tente novamente.",
                })
            ),
            checkLog: insert(
                t({
                    en: "Log {{amount}} and mark checked",
                    es: "Registrar {{amount}} y marcar revisado",
                    fr: "Enregistrer {{amount}} et marquer vérifié",
                    pt: "Registrar {{amount}} e marcar conferido",
                })
            ),
            checkMarkChecked: t({
                en: "Mark checked",
                es: "Marcar revisado",
                fr: "Marquer vérifié",
                pt: "Marcar conferido",
            }),
            checkMatches: t({
                en: "Yes, it matches",
                es: "Sí, coincide",
                fr: "Oui, ça correspond",
                pt: "Sim, confere",
            }),
            checkNote: t({
                en: "Balance adjustment",
                es: "Ajuste de saldo",
                fr: "Ajustement du solde",
                pt: "Ajuste de saldo",
            }),
            checkOutlayrHas: t({ en: "Outlayr has", es: "Outlayr tiene", fr: "Outlayr indique", pt: "Outlayr tem" }),
            checkQuestion: t({
                en: "Does your bank show",
                es: "¿Tu banco muestra",
                fr: "Votre banque affiche-t-elle",
                pt: "Seu banco mostra",
            }),
            checkShows: insert(
                t({
                    en: "What {{name}} shows",
                    es: "Lo que muestra {{name}}",
                    fr: "Ce qu'affiche {{name}}",
                    pt: "O que {{name}} mostra",
                })
            ),
            checkTitle: insert(
                t({ en: "Check {{name}}", es: "Revisar {{name}}", fr: "Vérifier {{name}}", pt: "Conferir {{name}}" })
            ),
            checkedAdjusted: insert(
                t({
                    en: "{{name}} checked, {{amount}} adjusted",
                    es: "{{name}} revisada, {{amount}} ajustado",
                    fr: "{{name}} vérifié, {{amount}} ajusté",
                    pt: "{{name}} conferida, {{amount}} ajustado",
                })
            ),
            checkedToast: insert(
                t({ en: "{{name}} checked", es: "{{name}} revisada", fr: "{{name}} vérifié", pt: "{{name}} conferida" })
            ),
            choosePhoto: t({
                en: "Choose a photo",
                es: "Elegir una foto",
                fr: "Choisir une photo",
                pt: "Escolher uma foto",
            }),
            accountType: t({ en: "Account type", es: "Tipo de cuenta", fr: "Type de compte", pt: "Tipo de conta" }),
            creditLimit: t({
                en: "Credit limit",
                es: "Límite de crédito",
                fr: "Plafond de crédit",
                pt: "Limite de crédito",
            }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            currencyAll: t({ en: "All", es: "Todas", fr: "Toutes", pt: "Todas" }),
            currencySearch: t({
                en: "Search currencies",
                es: "Buscar monedas",
                fr: "Rechercher une devise",
                pt: "Buscar moedas",
            }),
            currencyYours: t({ en: "Your accounts", es: "Tus cuentas", fr: "Vos comptes", pt: "Suas contas" }),
            day: insert(t({ en: "Day {{day}}", es: "Día {{day}}", fr: "Jour {{day}}", pt: "Dia {{day}}" })),
            deleteAccount: t({
                en: "Delete account",
                es: "Eliminar cuenta",
                fr: "Supprimer le compte",
                pt: "Excluir conta",
            }),
            deleteBody: t({
                en: "Its transactions are kept; they just stop belonging to an account.",
                es: "Sus movimientos se conservan; solo dejan de pertenecer a una cuenta.",
                fr: "Ses opérations sont conservées ; elles ne sont simplement plus liées à un compte.",
                pt: "Suas transações são mantidas; só deixam de pertencer a uma conta.",
            }),
            deleteEmptyBody: t({
                en: "Nothing is attached to it, so only its starting balance goes.",
                es: "No tiene nada asociado, así que solo se va su saldo inicial.",
                fr: "Rien n'y est rattaché, seul son solde de départ disparaît.",
                pt: "Nada está ligado a ela, então só o saldo inicial sai.",
            }),
            deleteFailed: insert(
                t({
                    en: "Couldn't delete {{name}}. Try again.",
                    es: "No se pudo eliminar {{name}}. Inténtalo de nuevo.",
                    fr: "Impossible de supprimer {{name}}. Réessayez.",
                    pt: "Não foi possível excluir {{name}}. Tente novamente.",
                })
            ),
            deleteTitle: insert(
                t({
                    en: "Delete {{name}}?",
                    es: "¿Eliminar {{name}}?",
                    fr: "Supprimer {{name}} ?",
                    pt: "Excluir {{name}}?",
                })
            ),
            deletedToast: t({
                en: "Account deleted",
                es: "Cuenta eliminada",
                fr: "Compte supprimé",
                pt: "Conta excluída",
            }),
            editTitle: t({ en: "Edit account", es: "Editar cuenta", fr: "Modifier le compte", pt: "Editar conta" }),
            emoji: t({ en: "Emoji", es: "Emoji", fr: "Emoji", pt: "Emoji" }),
            icon: t({ en: "Icon", es: "Ícono", fr: "Icône", pt: "Ícone" }),
            lastEntry: t({
                en: "Last entry",
                es: "Último movimiento",
                fr: "Dernière opération",
                pt: "Último lançamento",
            }),
            logo: t({ en: "Logo", es: "Logo", fr: "Logo", pt: "Logo" }),
            logoSearch: t({
                en: "Search banks and cards",
                es: "Buscar bancos y tarjetas",
                fr: "Rechercher banques et cartes",
                pt: "Buscar bancos e cartões",
            }),
            moneyIOwe: t({
                en: "Money I owe",
                es: "Dinero que debo",
                fr: "Argent que je dois",
                pt: "Dinheiro que devo",
            }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            namePlaceholder: t({
                en: "Chase, Cash, Nubank…",
                es: "Chase, Efectivo, Nubank…",
                fr: "Chase, Espèces, Nubank…",
                pt: "Chase, Dinheiro, Nubank…",
            }),
            nameRequired: t({
                en: "Give this account a name.",
                es: "Ponle un nombre a esta cuenta.",
                fr: "Donnez un nom à ce compte.",
                pt: "Dê um nome a esta conta.",
            }),
            netWorthAfter: t({
                en: "Net worth after",
                es: "Patrimonio después",
                fr: "Patrimoine après",
                pt: "Patrimônio depois",
            }),
            newCardTitle: t({
                en: "New card or loan",
                es: "Nueva tarjeta o préstamo",
                fr: "Nouvelle carte ou prêt",
                pt: "Novo cartão ou empréstimo",
            }),
            newTitle: t({ en: "New account", es: "Nueva cuenta", fr: "Nouveau compte", pt: "Nova conta" }),
            paymentDue: t({ en: "Payment due", es: "Vencimiento del pago", fr: "Échéance", pt: "Vencimento" }),
            photo: t({ en: "Photo", es: "Foto", fr: "Photo", pt: "Foto" }),
            photoFailed: t({
                en: "Couldn't upload that photo.",
                es: "No se pudo subir esa foto.",
                fr: "Impossible d'envoyer cette photo.",
                pt: "Não foi possível enviar a foto.",
            }),
            plansDeleted: t({
                en: "Installment plans, deleted",
                es: "Planes a cuotas, eliminados",
                fr: "Paiements échelonnés, supprimés",
                pt: "Parcelamentos, excluídos",
            }),
            reorderDone: t({ en: "Done", es: "Listo", fr: "Terminé", pt: "Concluir" }),
            reorderFailed: t({
                en: "Couldn't save your order. Try again.",
                es: "No se pudo guardar tu orden. Inténtalo de nuevo.",
                fr: "Impossible d'enregistrer votre ordre. Réessayez.",
                pt: "Não foi possível salvar sua ordem. Tente novamente.",
            }),
            reorderHint: t({
                en: "Drag to reorder",
                es: "Arrastra para reordenar",
                fr: "Glissez pour réorganiser",
                pt: "Arraste para reordenar",
            }),
            reorderMove: insert(
                t({
                    en: "Move {{name}}. Use the up and down arrows.",
                    es: "Mover {{name}}. Usa las flechas arriba y abajo.",
                    fr: "Déplacer {{name}}. Utilisez les flèches haut et bas.",
                    pt: "Mover {{name}}. Use as setas para cima e para baixo.",
                })
            ),
            restore: t({ en: "Restore", es: "Restaurar", fr: "Restaurer", pt: "Restaurar" }),
            restoreFailed: insert(
                t({
                    en: "Couldn't restore {{name}}. Try again.",
                    es: "No se pudo restaurar {{name}}. Inténtalo de nuevo.",
                    fr: "Impossible de restaurer {{name}}. Réessayez.",
                    pt: "Não foi possível restaurar {{name}}. Tente novamente.",
                })
            ),
            saveCard: t({ en: "Save card", es: "Guardar tarjeta", fr: "Enregistrer la carte", pt: "Salvar cartão" }),
            saveAccount: t({
                en: "Save account",
                es: "Guardar cuenta",
                fr: "Enregistrer le compte",
                pt: "Salvar conta",
            }),
            saveFailed: t({
                en: "Couldn't save this account. Try again.",
                es: "No se pudo guardar esta cuenta. Inténtalo de nuevo.",
                fr: "Impossible d'enregistrer ce compte. Réessayez.",
                pt: "Não foi possível salvar esta conta. Tente novamente.",
            }),
            seeTransactions: t({
                en: "See transactions",
                es: "Ver movimientos",
                fr: "Voir les opérations",
                pt: "Ver transações",
            }),
            statementCloses: t({
                en: "Statement closes",
                es: "Cierre del corte",
                fr: "Clôture du relevé",
                pt: "Fechamento da fatura",
            }),
            transactionsKept: t({
                en: "Transactions kept",
                es: "Movimientos conservados",
                fr: "Opérations conservées",
                pt: "Transações mantidas",
            }),
            transactionsKeptRow: t({
                en: "Transactions, kept",
                es: "Movimientos, conservados",
                fr: "Opérations, conservées",
                pt: "Transações, mantidas",
            }),
            transfersDeleted: t({
                en: "Transfers, deleted",
                es: "Transferencias, eliminadas",
                fr: "Virements, supprimés",
                pt: "Transferências, excluídas",
            }),
            arrives: t({ en: "Arrives", es: "Llega", fr: "Arrive", pt: "Chega" }),
            balanceThen: insert(
                t({
                    en: "{{before}}, then {{after}}",
                    es: "{{before}}, luego {{after}}",
                    fr: "{{before}}, puis {{after}}",
                    pt: "{{before}}, depois {{after}}",
                })
            ),
            transferFeeNote: insert(
                t({
                    en: "Fee · {{from}} → {{to}}",
                    es: "Comisión · {{from}} → {{to}}",
                    fr: "Frais · {{from}} → {{to}}",
                    pt: "Tarifa · {{from}} → {{to}}",
                })
            ),
            newTransfer: t({
                en: "New transfer",
                es: "Nueva transferencia",
                fr: "Nouveau virement",
                pt: "Nova transferência",
            }),
            noFee: t({ en: "No fee", es: "Sin comisión", fr: "Sans frais", pt: "Sem taxa" }),
            officialRate: insert(
                t({
                    en: "Official {{rate}}",
                    es: "Oficial {{rate}}",
                    fr: "Officiel {{rate}}",
                    pt: "Oficial {{rate}}",
                })
            ),
            useOfficialRate: t({
                en: "Use official rate",
                es: "Usar tasa oficial",
                fr: "Utiliser le taux officiel",
                pt: "Usar cotação oficial",
            }),
            optional: t({ en: "Optional", es: "Opcional", fr: "Facultatif", pt: "Opcional" }),
            saveTransfer: t({
                en: "Save transfer",
                es: "Guardar transferencia",
                fr: "Enregistrer le virement",
                pt: "Salvar transferência",
            }),
            swap: t({ en: "Swap", es: "Intercambiar", fr: "Inverser", pt: "Inverter" }),
            transferNeedsAccounts: t({
                en: "Choose both accounts",
                es: "Elige las dos cuentas",
                fr: "Choisissez les deux comptes",
                pt: "Escolha as duas contas",
            }),
            transferNoRate: t({
                en: "No rate for this date. Pick another date.",
                es: "No hay tasa para esta fecha. Elige otra fecha.",
                fr: "Aucun taux pour cette date. Choisissez une autre date.",
                pt: "Sem taxa para esta data. Escolha outra data.",
            }),
            transferSameAccount: t({
                en: "Choose a different account",
                es: "Elige otra cuenta",
                fr: "Choisissez un autre compte",
                pt: "Escolha outra conta",
            }),
            transferSaved: t({
                en: "Transfer saved",
                es: "Transferencia guardada",
                fr: "Virement enregistré",
                pt: "Transferência salva",
            }),
            youSend: t({ en: "You send", es: "Envías", fr: "Vous envoyez", pt: "Você envia" }),
            undo: t({ en: "Undo", es: "Deshacer", fr: "Annuler", pt: "Desfazer" }),
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
            cardCount: insert(
                t({
                    en: "{{count}} cards",
                    es: "{{count}} tarjetas",
                    fr: "{{count}} cartes",
                    pt: "{{count}} cartões",
                })
            ),
            inCurrency: insert(
                t({ en: "In {{currency}}", es: "En {{currency}}", fr: "En {{currency}}", pt: "Em {{currency}}" })
            ),
            inMain: insert(
                t({
                    en: "In {{currency}}, your main currency",
                    es: "En {{currency}}, tu moneda principal",
                    fr: "En {{currency}}, votre devise principale",
                    pt: "Em {{currency}}, sua moeda principal",
                })
            ),
            oneAccount: t({ en: "1 account", es: "1 cuenta", fr: "1 compte", pt: "1 conta" }),
            oneCard: t({ en: "1 card", es: "1 tarjeta", fr: "1 carte", pt: "1 cartão" }),
            nothingScheduled: t({
                en: "Nothing scheduled.",
                es: "Nada programado.",
                fr: "Rien de prévu.",
                pt: "Nada agendado.",
            }),
            accounts: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            goals: t({ en: "Goals", es: "Metas", fr: "Objectifs", pt: "Metas" }),
            installments: t({ en: "Installments", es: "Cuotas", fr: "Échéances", pt: "Parcelas" }),
            payment: t({ en: "Payment", es: "Pago", fr: "Paiement", pt: "Pagamento" }),
            planFallback: t({ en: "Order", es: "Compra", fr: "Achat", pt: "Compra" }),
            planLeft: insert(
                t({
                    en: "{{amount}} left",
                    es: "faltan {{amount}}",
                    fr: "reste {{amount}}",
                    pt: "faltam {{amount}}",
                })
            ),
            planNth: insert(
                t({
                    en: "{{name}} {{sequence}} of {{count}}",
                    es: "{{name}} {{sequence}} de {{count}}",
                    fr: "{{name}} {{sequence}} sur {{count}}",
                    pt: "{{name}} {{sequence}} de {{count}}",
                })
            ),
            planPaid: insert(
                t({
                    en: "{{count}} paid",
                    es: "{{count}} pagadas",
                    fr: "{{count}} payées",
                    pt: "{{count}} pagas",
                })
            ),
            byCurrency: t({ en: "By currency", es: "Por moneda", fr: "Par devise", pt: "Por moeda" }),
            cards: t({
                en: "Cards and loans",
                es: "Tarjetas y préstamos",
                fr: "Cartes et prêts",
                pt: "Cartões e empréstimos",
            }),
            inSixMonths: insert(
                t({
                    en: "In {{currency}}, 6 months",
                    es: "En {{currency}}, 6 meses",
                    fr: "En {{currency}}, 6 mois",
                    pt: "Em {{currency}}, 6 meses",
                })
            ),
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
        purchase: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            accountRequired: t({
                en: "Pick an account.",
                es: "Elige una cuenta.",
                fr: "Choisissez un compte.",
                pt: "Escolha uma conta.",
            }),
            appsIn: insert(
                t({
                    en: "Installments in {{region}}",
                    es: "Cuotas en {{region}}",
                    fr: "Paiement fractionné en {{region}}",
                    pt: "Parcelas em {{region}}",
                })
            ),
            add: t({ en: "Add", es: "Añadir", fr: "Ajouter", pt: "Adicionar" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            count: t({ en: "Installments", es: "Cuotas", fr: "Échéances", pt: "Parcelas" }),
            each: t({ en: "Each", es: "Cada una", fr: "Chacune", pt: "Cada uma" }),
            every: t({ en: "Every", es: "Cada", fr: "Tous les", pt: "A cada" }),
            everyDays14: t({ en: "14 days", es: "14 días", fr: "14 jours", pt: "14 dias" }),
            everyDays15: t({ en: "15 days", es: "15 días", fr: "15 jours", pt: "15 dias" }),
            everyFifteenthAndLast: t({
                en: "15th and last day",
                es: "Día 15 y último día",
                fr: "Le 15 et le dernier jour",
                pt: "Dia 15 e último dia",
            }),
            everyFirstAndSixteenth: t({
                en: "1st and 16th",
                es: "Día 1 y 16",
                fr: "Le 1er et le 16",
                pt: "Dias 1 e 16",
            }),
            everyMonthly: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
            everyWeekly: t({ en: "Week", es: "Semana", fr: "Semaine", pt: "Semana" }),
            firstDue: t({ en: "First due", es: "Primer pago", fr: "Première échéance", pt: "Primeiro vencimento" }),
            for: t({ en: "For", es: "Por", fr: "Pour", pt: "Para" }),
            forPlaceholder: t({
                en: "What you bought",
                es: "Lo que compraste",
                fr: "Ce que vous avez acheté",
                pt: "O que você comprou",
            }),
            importScreenshot: t({
                en: "Import from a screenshot",
                es: "Importar de una captura",
                fr: "Importer une capture",
                pt: "Importar de uma captura",
            }),
            nameRequired: t({
                en: "Name the purchase.",
                es: "Ponle nombre a la compra.",
                fr: "Nommez l'achat.",
                pt: "Dê um nome à compra.",
            }),
            other: t({ en: "Other", es: "Otra", fr: "Autre", pt: "Outra" }),
            overPrice: insert(
                t({
                    en: "{{amount}} over the price",
                    es: "{{amount}} por encima del precio",
                    fr: "{{amount}} au-dessus du prix",
                    pt: "{{amount}} acima do preço",
                })
            ),
            paidNow: t({ en: "Paid now", es: "Pagado ahora", fr: "Payé maintenant", pt: "Pago agora" }),
            pick: t({ en: "Pick one", es: "Elige una", fr: "Choisir", pt: "Escolher" }),
            range: insert(
                t({
                    en: "{{from}} to {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "{{from}} au {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
            save: t({ en: "Save", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            saveFailed: t({
                en: "Couldn't save this purchase. Try again.",
                es: "No se pudo guardar esta compra. Inténtalo de nuevo.",
                fr: "Impossible d'enregistrer cet achat. Réessayez.",
                pt: "Não foi possível salvar esta compra. Tente novamente.",
            }),
            thenEach: insert(
                t({
                    en: "Then {{count}} × {{amount}}",
                    es: "Luego {{count}} × {{amount}}",
                    fr: "Puis {{count}} × {{amount}}",
                    pt: "Depois {{count}} × {{amount}}",
                })
            ),
            thenMixed: insert(
                t({
                    en: "Then {{count}} installments",
                    es: "Luego {{count}} cuotas",
                    fr: "Puis {{count}} échéances",
                    pt: "Depois {{count}} parcelas",
                })
            ),
            title: t({
                en: "New purchase in installments",
                es: "Nueva compra en cuotas",
                fr: "Nouvel achat en plusieurs fois",
                pt: "Nova compra parcelada",
            }),
            total: t({ en: "Total", es: "Total", fr: "Total", pt: "Total" }),
            totalRequired: t({
                en: "Enter the price.",
                es: "Escribe el precio.",
                fr: "Saisissez le prix.",
                pt: "Digite o preço.",
            }),
            upfront: t({ en: "Upfront", es: "Inicial", fr: "Acompte", pt: "Entrada" }),
            upfrontTooHigh: t({
                en: "The upfront leaves nothing to pay in installments.",
                es: "La inicial no deja nada para pagar en cuotas.",
                fr: "L'acompte ne laisse rien à payer en plusieurs fois.",
                pt: "A entrada não deixa nada para parcelar.",
            }),
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
