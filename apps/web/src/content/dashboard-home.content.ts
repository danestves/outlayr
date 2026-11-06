import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardHome = {
    content: {
        chart: {
            budget: insert(t({ en: "{{name}} budget {{amount}}", es: "Presupuesto de {{name}} {{amount}}" })),
            budgetGone: insert(t({ en: "{{day}}, budget gone", es: "{{day}}, presupuesto agotado" })),
            description: insert(
                t({
                    en: "Cumulative spending by category through {{day}}, against income.",
                    es: "Gasto acumulado por categoría hasta el {{day}}, frente a los ingresos.",
                })
            ),
            income: t({ en: "Income", es: "Ingresos" }),
            kept: t({ en: "Kept", es: "Ahorrado" }),
            seeCashFlow: t({ en: "See cash flow", es: "Ver flujo de caja" }),
            select: insert(t({ en: "Show {{name}}", es: "Ver {{name}}" })),
            title: t({ en: "Spending against income", es: "Gasto frente a ingresos" }),
            titleSpendOnly: t({ en: "Spending", es: "Gasto" }),
        },
        kpi: {
            income: t({ en: "Income", es: "Ingresos" }),
            kept: t({ en: "Kept", es: "Ahorrado" }),
            netWorth: t({ en: "Net worth", es: "Patrimonio" }),
            since: insert(t({ en: "since {{day}}", es: "desde el {{day}}" })),
            spent: t({ en: "Spent", es: "Gastado" }),
            versus: insert(t({ en: "vs {{range}}", es: "vs {{range}}" })),
        },
        panel: {
            accounts: t({ en: "Accounts", es: "Cuentas" }),
            average: insert(t({ en: "Avg {{amount}}", es: "Prom. {{amount}}" })),
            budgets: t({ en: "Budgets", es: "Presupuestos" }),
            byAccount: t({ en: "By account", es: "Por cuenta" }),
            byDay: t({ en: "By day", es: "Por día" }),
            clearCategory: insert(t({ en: "Clear {{name}}", es: "Quitar {{name}}" })),
            left: insert(t({ en: "{{amount}} left of budget", es: "Quedan {{amount}} del presupuesto" })),
            moreAccounts: insert(t({ en: "{{count}} more", es: "{{count}} más" })),
            net: insert(t({ en: "Net {{amount}}", es: "Neto {{amount}}" })),
            netOn: insert(t({ en: "Net {{amount}} on {{day}}", es: "Neto {{amount}} al {{day}}" })),
            noBudget: t({ en: "no budget", es: "sin presupuesto" }),
            of: t({ en: "of", es: "de" }),
            onPace: t({ en: "Within budget so far.", es: "Dentro del presupuesto por ahora." }),
            onTrack: insert(t({ en: "{{count}} of {{total}} on track", es: "{{count}} de {{total}} en regla" })),
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
            ranOutLast: insert(t({ en: "Ran out {{day}}.", es: "Se agotó el {{day}}." })),
            share: t({ en: "Share", es: "Parte" }),
            topMerchants: t({ en: "Top merchants", es: "Comercios principales" }),
            upcoming: t({ en: "Upcoming", es: "Próximos" }),
            upcomingWindow: t({ en: "Next 30 days", es: "Próximos 30 días" }),
            versus: t({ en: "vs last 3 months", es: "vs los últimos 3 meses" }),
        },
        transactions: {
            columns: {
                account: t({ en: "Account", es: "Cuenta" }),
                amount: t({ en: "Amount", es: "Monto" }),
                category: t({ en: "Category", es: "Categoría" }),
                date: t({ en: "Date", es: "Fecha" }),
                merchant: t({ en: "Merchant", es: "Comercio" }),
                note: t({ en: "Note", es: "Nota" }),
            },
            count: insert(t({ en: "{{count}} entries", es: "{{count}} movimientos" })),
            countOne: t({ en: "1 entry", es: "1 movimiento" }),
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
