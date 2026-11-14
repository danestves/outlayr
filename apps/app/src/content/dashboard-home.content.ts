import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardHome = {
    content: {
        everyDay: {
            aDay: insert(t({ en: "{{amount}} a day", es: "{{amount}} al día" })),
            biggest: t({ en: "Biggest", es: "El mayor" }),
            biggestAfter: t({ en: "Biggest after", es: "El mayor después" }),
            entries: t({ en: "Entries", es: "Entradas" }),
            emptyLine: t({
                en: "Days fill in as you log entries.",
                es: "Los días se llenan al registrar movimientos.",
            }),
            emptyTitle: t({ en: "Nothing spent yet", es: "Nada gastado aún" }),
            less: t({ en: "Less", es: "Menos" }),
            quietDays: insert(t({ en: "{{count}} days, no entries", es: "{{count}} días, sin movimientos" })),
            more: t({ en: "More", es: "Más" }),
            title: t({ en: "Every day", es: "Cada día" }),
            topDay: insert(t({ en: "{{name}} day", es: "Día de {{name}}" })),
        },
        kpi: {
            income: t({ en: "Income", es: "Ingresos" }),
            kept: t({ en: "Kept", es: "Ahorrado" }),
            ofSpending: t({ en: "Of spending", es: "Del gasto" }),
            points: insert(t({ en: "{{points}} pts", es: "{{points}} pts" })),
            netWorth: t({ en: "Net worth", es: "Patrimonio" }),
            now: t({ en: "Now", es: "Ahora" }),
            share: insert(t({ en: "{{percent}}% of income", es: "{{percent}}% de los ingresos" })),
            since: insert(t({ en: "since {{day}}", es: "desde el {{day}}" })),
            spent: t({ en: "Spent", es: "Gastado" }),
            versus: insert(t({ en: "vs {{range}}", es: "vs {{range}}" })),
        },
        quiet: {
            spentLine: t({
                en: "Spending against income shows here.",
                es: "Aquí verás tus gastos frente a tus ingresos.",
            }),
            spentTitle: t({ en: "Nothing in this period", es: "Nada en este período" }),
        },
        setup: {
            accountFrom: insert(
                t({ en: "Say where that {{amount}} came from.", es: "Di de dónde salieron esos {{amount}}." })
            ),
            accountLine: t({ en: "Add where your money lives.", es: "Añade dónde está tu dinero." }),
            accountTitle: t({ en: "No accounts yet", es: "Aún no hay cuentas" }),
            addAccount: t({ en: "Add account", es: "Añadir cuenta" }),
            addBudget: t({ en: "Add budget", es: "Añadir presupuesto" }),
            budgetFirstSpend: insert(
                t({
                    en: "{{name}} is your first spend. Give it a limit.",
                    es: "{{name}} es tu primer gasto. Ponle un límite.",
                })
            ),
            budgetLine: t({ en: "Set a limit for a category.", es: "Pon un límite a una categoría." }),
            daysTitle: t({ en: "No days yet", es: "Aún no hay días" }),
            entryLast: t({ en: "What did you last pay for?", es: "¿Qué fue lo último que pagaste?" }),
            entryLine: t({ en: "Add one, or bring your history with you.", es: "Añade uno o trae tu historial." }),
            entryTitle: t({ en: "No transactions yet", es: "Aún no hay movimientos" }),
            fillsIn: t({ en: "Fills in with your first entry.", es: "Se llena con tu primer movimiento." }),
            import: t({ en: "Import", es: "Importar" }),
            logIncome: t({ en: "Log income to see the share.", es: "Registra ingresos para ver la proporción." }),
            phoneHint: t({
                en: "Do this on your phone and it shows up here.",
                es: "Hazlo en tu teléfono y aparece aquí.",
            }),
            spent: insert(t({ en: "{{amount}} spent", es: "{{amount}} gastados" })),
            spentTitle: t({ en: "Nothing spent yet", es: "Nada gastado aún" }),
            steps: {
                account: t({ en: "Add an account", es: "Añade una cuenta" }),
                budget: t({ en: "Set a budget", es: "Crea un presupuesto" }),
                entry: t({ en: "Log an entry", es: "Registra un movimiento" }),
            },
            titleAccount: t({ en: "Start with your first account", es: "Empieza con tu primera cuenta" }),
            titleAccountNext: t({ en: "Now add your first account", es: "Ahora añade tu primera cuenta" }),
            titleBudget: t({ en: "Last one, set your first budget", es: "Lo último, crea tu primer presupuesto" }),
            titleEntry: t({ en: "Now log your first entry", es: "Ahora registra tu primer movimiento" }),
        },
        spentOfIncome: {
            cashFlow: t({ en: "Cash flow", es: "Flujo de caja" }),
            noIncome: t({ en: "No income", es: "Sin ingresos" }),
            over: t({ en: "over", es: "de más" }),
            title: t({ en: "Spent of income", es: "Gastado de ingresos" }),
            whatIf: t({ en: "What if", es: "Y si" }),
            whatIfHint: t({
                en: "Preview only, nothing is saved. Escape returns to the real amount.",
                es: "Solo una vista previa, no se guarda nada. Escape vuelve al monto real.",
            }),
            shareOfSpent: t({ en: "Share of spent", es: "Parte del gasto" }),
            whatIfTag: t({ en: "If", es: "Si" }),
            wouldKeep: t({ en: "Would keep", es: "Ahorrarías" }),
        },
        panel: {
            accounts: t({ en: "Accounts", es: "Cuentas" }),
            addAnAccount: t({ en: "Add an account", es: "Añadir una cuenta" }),
            average: insert(t({ en: "Avg {{amount}}", es: "Prom. {{amount}}" })),
            budgets: t({ en: "Budgets", es: "Presupuestos" }),
            budgetsEmptyLine: t({
                en: "Set a monthly limit on a category and track it here.",
                es: "Pon un límite mensual a una categoría y síguelo aquí.",
            }),
            budgetsEmptyTitle: t({ en: "No budgets yet", es: "Aún no hay presupuestos" }),
            budgetEnded: insert(t({ en: "Ended {{day}}", es: "Terminó el {{day}}" })),
            budgetFilter: t({ en: "Filter", es: "Filtrar" }),
            budgetLeft: t({ en: "Left", es: "Queda" }),
            budgetOverTotal: t({ en: "Over", es: "De más" }),
            budgetResets: insert(t({ en: "Resets {{day}}", es: "Se renueva el {{day}}" })),
            budgetShowLess: t({ en: "Show less", es: "Ver menos" }),
            budgetUsed: insert(t({ en: "{{name}}: {{percent}}% used", es: "{{name}}: {{percent}} % usado" })),
            noSubcategory: t({ en: "No subcategory", es: "Sin subcategoría" }),
            onTrackLabel: t({ en: "On track", es: "En regla" }),
            overCount: insert(t({ en: "{{count}} over", es: "{{count}} excedidos" })),
            overAmount: insert(t({ en: "{{amount}} over", es: "{{amount}} de más" })),
            onTrackCount: insert(t({ en: "{{count}} of {{total}}", es: "{{count}} de {{total}}" })),
            byAccount: t({ en: "By account", es: "Por cuenta" }),
            byDay: t({ en: "By day", es: "Por día" }),
            left: insert(t({ en: "{{amount}} left of budget", es: "Quedan {{amount}} del presupuesto" })),
            moreAccounts: insert(t({ en: "{{count}} more", es: "{{count}} más" })),
            net: insert(t({ en: "Net {{amount}}", es: "Neto {{amount}}" })),
            noAccounts: t({ en: "No accounts yet.", es: "Aún no hay cuentas." }),
            of: t({ en: "of", es: "de" }),
            over: t({ en: "over", es: "de más" }),
            overBudget: insert(t({ en: "{{amount}} over budget", es: "{{amount}} sobre el presupuesto" })),
            peak: insert(t({ en: "Peak {{day}}", es: "Máximo {{day}}" })),
            ranOut: insert(
                t({
                    en: "Ran out {{day}}, {{days}} days early.",
                    es: "Se agotó el {{day}}, {{days}} días antes.",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{day}}, 1 day early.",
                    es: "Se agotó el {{day}}, 1 día antes.",
                })
            ),
            share: t({ en: "Share", es: "Parte" }),
            upcoming: t({ en: "Upcoming", es: "Próximos" }),
            versus: t({ en: "vs last 3 months", es: "vs los últimos 3 meses" }),
        },
        transactions: {
            all: t({ en: "All", es: "Todos", fr: "Tout", pt: "Tudo" }),
            expenses: t({ en: "Expenses", es: "Gastos", fr: "Dépenses", pt: "Despesas" }),
            incomeTab: t({ en: "Income", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            seeAll: t({ en: "See all", es: "Ver todos", fr: "Tout voir", pt: "Ver tudo" }),
            showLess: t({ en: "Show less", es: "Ver menos", fr: "Voir moins", pt: "Ver menos" }),
            shownOf: insert(
                t({
                    en: "{{shown}} of {{total}}",
                    es: "{{shown}} de {{total}}",
                    fr: "{{shown}} sur {{total}}",
                    pt: "{{shown}} de {{total}}",
                })
            ),
            transferFee: t({
                en: "Transfer fee",
                es: "Comisión de transferencia",
                fr: "Frais de virement",
                pt: "Tarifa de transferência",
            }),
            columns: {
                account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
                amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
                category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
                date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
                merchant: t({ en: "Merchant", es: "Comercio", fr: "Commerçant", pt: "Comerciante" }),
                note: t({ en: "Note", es: "Nota", fr: "Note", pt: "Nota" }),
            },
            arrived: insert(
                t({
                    en: "{{amount}} arrived",
                    es: "Llegaron {{amount}}",
                    fr: "{{amount}} reçus",
                    pt: "{{amount}} recebidos",
                })
            ),
            cardFee: t({ en: "Card fee", es: "Comisión de tarjeta", fr: "Frais de carte", pt: "Tarifa do cartão" }),
            count: insert(
                t({
                    en: "{{count}} entries",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entries: t({ en: "Entries", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            feeWord: t({ en: "fee", es: "comisión", fr: "frais", pt: "tarifa" }),
            backTo: insert(
                t({
                    en: "Back to {{month}}",
                    es: "Volver a {{month}}",
                    fr: "Retour à {{month}}",
                    pt: "Voltar para {{month}}",
                })
            ),
            countOne: t({ en: "1 entry", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            noAccount: t({ en: "No account", es: "Sin cuenta", fr: "Sans compte", pt: "Sem conta" }),
            quietLine: insert(
                t({
                    en: "Nothing logged between {{from}} and {{to}}.",
                    es: "Nada registrado entre {{from}} y {{to}}.",
                    fr: "Rien d'enregistré entre {{from}} et {{to}}.",
                    pt: "Nada registrado entre {{from}} e {{to}}.",
                })
            ),
            quietTitle: t({
                en: "No entries found",
                es: "No se encontraron movimientos",
                fr: "Aucune opération trouvée",
                pt: "Nenhum lançamento encontrado",
            }),
            empty: t({
                en: "No entries in this view.",
                es: "No hay movimientos en esta vista.",
                fr: "Aucune opération dans cette vue.",
                pt: "Nenhum lançamento nesta visão.",
            }),
            next: t({ en: "Next page", es: "Página siguiente", fr: "Page suivante", pt: "Próxima página" }),
            previous: t({ en: "Previous page", es: "Página anterior", fr: "Page précédente", pt: "Página anterior" }),
            range: insert(
                t({
                    en: "{{from}}-{{to}} of {{total}}",
                    es: "{{from}}-{{to}} de {{total}}",
                    fr: "{{from}}-{{to}} sur {{total}}",
                    pt: "{{from}}-{{to}} de {{total}}",
                })
            ),
            sort: {
                label: t({ en: "Sort", es: "Orden", fr: "Tri", pt: "Ordem" }),
                largest: t({ en: "Largest", es: "Mayor monto", fr: "Montant le plus élevé", pt: "Maior valor" }),
                newest: t({ en: "Newest", es: "Más recientes", fr: "Plus récentes", pt: "Mais recentes" }),
                oldest: t({ en: "Oldest", es: "Más antiguos", fr: "Plus anciennes", pt: "Mais antigos" }),
            },
            title: t({ en: "Transactions", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            transfer: t({ en: "Transfer", es: "Transferencia", fr: "Virement", pt: "Transferência" }),
        },
        uncategorized: t({ en: "Uncategorized", es: "Sin categoría" }),
    },
    key: "dashboard-home",
} satisfies Dictionary;

export default dashboardHome;
