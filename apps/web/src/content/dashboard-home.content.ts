import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardHome = {
    content: {
        everyDay: {
            aDay: insert(t({ en: "{{amount}} a day", es: "{{amount}} al día" })),
            biggestAfter: t({ en: "Biggest after", es: "El mayor después" }),
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
            title: t({ en: "Spent of income", es: "Gastado de ingresos" }),
        },
        panel: {
            accounts: t({ en: "Accounts", es: "Cuentas" }),
            average: insert(t({ en: "Avg {{amount}}", es: "Prom. {{amount}}" })),
            budgets: t({ en: "Budgets", es: "Presupuestos" }),
            budgetsEmptyLine: t({ en: "Set one on your phone.", es: "Crea uno en tu teléfono." }),
            budgetsEmptyTitle: t({ en: "No budgets yet", es: "Aún no hay presupuestos" }),
            details: t({ en: "Details", es: "Detalles" }),
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
            all: t({ en: "All", es: "Todos" }),
            expenses: t({ en: "Expenses", es: "Gastos" }),
            incomeTab: t({ en: "Income", es: "Ingresos" }),
            seeAll: t({ en: "See all", es: "Ver todos" }),
            columns: {
                account: t({ en: "Account", es: "Cuenta" }),
                amount: t({ en: "Amount", es: "Monto" }),
                category: t({ en: "Category", es: "Categoría" }),
                date: t({ en: "Date", es: "Fecha" }),
                merchant: t({ en: "Merchant", es: "Comercio" }),
                note: t({ en: "Note", es: "Nota" }),
            },
            count: insert(t({ en: "{{count}} entries", es: "{{count}} movimientos" })),
            backTo: insert(t({ en: "Back to {{month}}", es: "Volver a {{month}}" })),
            countOne: t({ en: "1 entry", es: "1 movimiento" }),
            noAccount: t({ en: "No account", es: "Sin cuenta" }),
            quietLine: insert(
                t({ en: "Nothing logged between {{from}} and {{to}}.", es: "Nada registrado entre {{from}} y {{to}}." })
            ),
            quietTitle: t({ en: "No entries found", es: "No se encontraron movimientos" }),
            empty: t({ en: "No entries in this view.", es: "No hay movimientos en esta vista." }),
            next: t({ en: "Next page", es: "Página siguiente" }),
            previous: t({ en: "Previous page", es: "Página anterior" }),
            range: insert(t({ en: "{{from}}-{{to}} of {{total}}", es: "{{from}}-{{to}} de {{total}}" })),
            sort: {
                label: t({ en: "Sort", es: "Orden" }),
                largest: t({ en: "Largest", es: "Mayor monto" }),
                newest: t({ en: "Newest", es: "Más recientes" }),
                oldest: t({ en: "Oldest", es: "Más antiguos" }),
            },
            title: t({ en: "Transactions", es: "Movimientos" }),
            transfer: t({ en: "Transfer", es: "Transferencia" }),
        },
        uncategorized: t({ en: "Uncategorized", es: "Sin categoría" }),
    },
    key: "dashboard-home",
} satisfies Dictionary;

export default dashboardHome;
