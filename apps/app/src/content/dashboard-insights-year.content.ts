import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsYear = {
    content: {
        biggest: t({ en: "Biggest category", de: "Größte Kategorie", es: "Categoría más grande" }),
        budgeted: t({ en: "Budgeted", de: "Budgetiert", es: "Presupuestado" }),
        card: {
            below: t({ en: "Below your average", de: "Unter deinem Durchschnitt", es: "Bajo tu promedio" }),
            highs: t({ en: "Highs and lows", de: "Höhen und Tiefen", es: "Máximos y mínimos" }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado" }),
            manage: t({ en: "Manage plan", de: "Plan verwalten", es: "Gestionar plan" }),
            pro: t({ en: "Pro", de: "Pro", es: "Pro" }),
            proEnds: insert(
                t({ en: "Pro ends {{date}}.", de: "Pro endet am {{date}}.", es: "Pro termina el {{date}}." })
            ),
            month: t({ en: "Month by month", de: "Monat für Monat", es: "Mes a mes" }),
            where: t({ en: "Where it went", de: "Wohin es ging", es: "A dónde se fue" }),
        },
        chartLabel: t({ en: "Spending in each month", de: "Ausgaben in jedem Monat", es: "Gasto de cada mes" }),
        empty: {
            line: insert(
                t({
                    en: "Come back after 3 months of entries. You have {{count}}.",
                    de: "Komm nach 3 Monaten mit Einträgen wieder. Du hast {{count}}.",
                    es: "Vuelve cuando tengas 3 meses de movimientos. Tienes {{count}}.",
                })
            ),
            title: t({ en: "Too early for a year.", de: "Noch zu früh für ein Jahr.", es: "Es pronto para un año." }),
        },
        highest: t({ en: "Highest month", de: "Teuerster Monat", es: "Mes más alto" }),
        kpi: {
            entries: t({ en: "Entries logged", de: "Erfasste Einträge", es: "Movimientos" }),
            kept: t({
                en: "Kept under your budgets",
                de: "Unter deinen Budgets geblieben",
                es: "Ahorrado bajo tus presupuestos",
            }),
            months: t({ en: "Months under budget", de: "Monate im Budget", es: "Meses bajo presupuesto" }),
            monthsLogged: t({ en: "Months logged", de: "Erfasste Monate", es: "Meses con datos" }),
            soFar: t({ en: "So far", de: "Bisher", es: "Hasta ahora" }),
            year: t({ en: "Your year", de: "Dein Jahr", es: "Tu año" }),
        },
        legend: {
            average: insert(t({ en: "Average {{amount}}", de: "Durchschnitt {{amount}}", es: "Promedio {{amount}}" })),
            over: t({ en: "Over budget", de: "Über dem Budget", es: "Sobre presupuesto" }),
            under: t({ en: "Under budget", de: "Im Budget", es: "Bajo presupuesto" }),
        },
        lowest: t({ en: "Lowest month", de: "Günstigster Monat", es: "Mes más bajo" }),
        monthAverage: t({ en: "Average month", de: "Durchschnittsmonat", es: "Mes promedio" }),
        monthsOver: t({ en: "Months over budget", de: "Monate über dem Budget", es: "Meses sobre presupuesto" }),
        noBudgets: t({ en: "No budgets", de: "Keine Budgets", es: "Sin presupuestos" }),
        ofTotal: insert(
            t({ en: "{{count}} of {{total}}", de: "{{count}} von {{total}}", es: "{{count}} de {{total}}" })
        ),
        seg: {
            label: t({ en: "Year", de: "Jahr", es: "Año" }),
            recent: t({ en: "Last 12 months", de: "Letzte 12 Monate", es: "Últimos 12 meses" }),
        },
        sub: {
            keptLess: insert(
                t({
                    en: "{{amount}} less than the last 12 months",
                    de: "{{amount}} weniger als in den letzten 12 Monaten",
                    es: "{{amount}} menos que los últimos 12 meses",
                })
            ),
            keptMore: insert(
                t({
                    en: "{{amount}} more than the last 12 months",
                    de: "{{amount}} mehr als in den letzten 12 Monaten",
                    es: "{{amount}} más que los últimos 12 meses",
                })
            ),
            proTimes: insert(
                t({
                    en: "{{times}}x what Pro costs",
                    de: "{{times}}-mal so viel, wie Pro kostet",
                    es: "{{times}}x lo que cuesta Pro",
                })
            ),
            budgeted: insert(
                t({ en: "of {{amount}} budgeted", de: "von {{amount}} budgetiert", es: "de {{amount}} presupuestado" })
            ),
            aMonth: insert(
                t({ en: "About {{count}} a month", de: "Etwa {{count}} im Monat", es: "Cerca de {{count}} al mes" })
            ),
            pair: insert(
                t({
                    en: "{{from}} and {{to}} {{year}}",
                    de: "{{from}} und {{to}} {{year}}",
                    es: "{{from}} y {{to}} {{year}}",
                })
            ),
            range: insert(t({ en: "{{from}} to {{to}}", de: "{{from}} bis {{to}}", es: "{{from}} a {{to}}" })),
            started: insert(t({ en: "Started in {{month}}", de: "Gestartet im {{month}}", es: "Desde {{month}}" })),
            vs: insert(
                t({
                    en: "{{span}}, vs {{year}}",
                    de: "{{span}}, im Vergleich zu {{year}}",
                    es: "{{span}}, vs {{year}}",
                })
            ),
        },
        tip: {
            budget: t({ en: "Budgets", de: "Budgets", es: "Presupuestos" }),
        },
        twelveMonths: t({ en: "12 months", de: "12 Monate", es: "12 meses" }),
        monthsCount: insert(t({ en: "{{count}} months", de: "{{count}} Monate", es: "{{count}} meses" })),
    },
    key: "dashboard-insights-year",
} satisfies Dictionary;

export default dashboardInsightsYear;
