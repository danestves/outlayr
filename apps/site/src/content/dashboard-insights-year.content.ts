import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsYear = {
    content: {
        biggest: t({ en: "Biggest category", es: "Categoría más grande" }),
        budgeted: t({ en: "Budgeted", es: "Presupuestado" }),
        card: {
            below: t({ en: "Below your average", es: "Bajo tu promedio" }),
            highs: t({ en: "Highs and lows", es: "Máximos y mínimos" }),
            kept: t({ en: "Kept", es: "Ahorrado" }),
            manage: t({ en: "Manage plan", es: "Gestionar plan" }),
            pro: t({ en: "Pro", es: "Pro" }),
            proEnds: insert(t({ en: "Pro ends {{date}}.", es: "Pro termina el {{date}}." })),
            month: t({ en: "Month by month", es: "Mes a mes" }),
            where: t({ en: "Where it went", es: "A dónde se fue" }),
        },
        chartLabel: t({ en: "Spending in each month", es: "Gasto de cada mes" }),
        empty: {
            line: insert(
                t({
                    en: "Come back after 3 months of entries. You have {{count}}.",
                    es: "Vuelve cuando tengas 3 meses de movimientos. Tienes {{count}}.",
                })
            ),
            title: t({ en: "Too early for a year.", es: "Es pronto para un año." }),
        },
        highest: t({ en: "Highest month", es: "Mes más alto" }),
        kpi: {
            entries: t({ en: "Entries logged", es: "Movimientos" }),
            kept: t({ en: "Kept under your budgets", es: "Ahorrado bajo tus presupuestos" }),
            months: t({ en: "Months under budget", es: "Meses bajo presupuesto" }),
            monthsLogged: t({ en: "Months logged", es: "Meses con datos" }),
            soFar: t({ en: "So far", es: "Hasta ahora" }),
            year: t({ en: "Your year", es: "Tu año" }),
        },
        legend: {
            average: insert(t({ en: "Average {{amount}}", es: "Promedio {{amount}}" })),
            over: t({ en: "Over budget", es: "Sobre presupuesto" }),
            under: t({ en: "Under budget", es: "Bajo presupuesto" }),
        },
        lowest: t({ en: "Lowest month", es: "Mes más bajo" }),
        monthAverage: t({ en: "Average month", es: "Mes promedio" }),
        monthsOver: t({ en: "Months over budget", es: "Meses sobre presupuesto" }),
        noBudgets: t({ en: "No budgets", es: "Sin presupuestos" }),
        ofTotal: insert(t({ en: "{{count}} of {{total}}", es: "{{count}} de {{total}}" })),
        seg: {
            label: t({ en: "Year", es: "Año" }),
            recent: t({ en: "Last 12 months", es: "Últimos 12 meses" }),
        },
        sub: {
            keptLess: insert(
                t({ en: "{{amount}} less than the last 12 months", es: "{{amount}} menos que los últimos 12 meses" })
            ),
            keptMore: insert(
                t({ en: "{{amount}} more than the last 12 months", es: "{{amount}} más que los últimos 12 meses" })
            ),
            proTimes: insert(t({ en: "{{times}}x what Pro costs", es: "{{times}}x lo que cuesta Pro" })),
            budgeted: insert(t({ en: "of {{amount}} budgeted", es: "de {{amount}} presupuestado" })),
            aMonth: insert(t({ en: "About {{count}} a month", es: "Cerca de {{count}} al mes" })),
            pair: insert(t({ en: "{{from}} and {{to}} {{year}}", es: "{{from}} y {{to}} {{year}}" })),
            range: insert(t({ en: "{{from}} to {{to}}", es: "{{from}} a {{to}}" })),
            started: insert(t({ en: "Started in {{month}}", es: "Desde {{month}}" })),
            vs: insert(t({ en: "{{span}}, vs {{year}}", es: "{{span}}, vs {{year}}" })),
        },
        tip: {
            budget: t({ en: "Budgets", es: "Presupuestos" }),
        },
        twelveMonths: t({ en: "12 months", es: "12 meses" }),
        monthsCount: insert(t({ en: "{{count}} months", es: "{{count}} meses" })),
    },
    key: "dashboard-insights-year",
} satisfies Dictionary;

export default dashboardInsightsYear;
