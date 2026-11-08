import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsights = {
    content: {
        budget: {
            none: t({ en: "No budget", es: "Sin presupuesto" }),
        },
        cashFlow: {
            hub: t({ en: "Cash flow", es: "Flujo de caja" }),
            savings: t({ en: "Savings", es: "Ahorros" }),
            title: t({ en: "Cash flow", es: "Flujo de caja" }),
        },
        changes: {
            empty: t({
                en: "Not enough history to compare yet.",
                es: "Aún no hay historial suficiente para comparar.",
            }),
            less: t({ en: "Less than usual", es: "Menos de lo normal" }),
            more: t({ en: "More than usual", es: "Más de lo normal" }),
            other: t({ en: "Other", es: "Otros" }),
            running: t({ en: "Running total", es: "Acumulado" }),
            title: insert(t({ en: "{{period}} against usual", es: "{{period}} frente a lo normal" })),
            total: t({ en: "Total", es: "Total" }),
            usual: t({ en: "Usual", es: "Lo normal" }),
        },
        empty: {
            cashFlow: t({ en: "Nothing came in or went out.", es: "No entró ni salió dinero." }),
            spending: t({ en: "No spending in this period.", es: "Sin gastos en este periodo." }),
        },
        headline: {
            asUsual: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, about as usual.",
                    es: "Gastaste {{amount}} en {{period}}, como de costumbre.",
                })
            ),
            less: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% less than usual.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% menos de lo normal.",
                })
            ),
            more: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% more than usual.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% más de lo normal.",
                })
            ),
            nothing: insert(t({ en: "You spent nothing in {{period}}.", es: "No gastaste nada en {{period}}." })),
            plain: insert(t({ en: "You spent {{amount}} in {{period}}.", es: "Gastaste {{amount}} en {{period}}." })),
            soFarAsUsual: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, about as usual by now.",
                    es: "Llevas {{amount}} gastados en {{period}}, como de costumbre a esta altura.",
                })
            ),
            soFarLess: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% less than usual by now.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% menos de lo normal a esta altura.",
                })
            ),
            soFarMore: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% more than usual by now.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% más de lo normal a esta altura.",
                })
            ),
            soFarPlain: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}.",
                    es: "Llevas {{amount}} gastados en {{period}}.",
                })
            ),
        },
        measures: {
            in: t({ en: "In", es: "Entradas" }),
            kept: t({ en: "Kept", es: "Ahorrado" }),
            out: t({ en: "Out", es: "Salidas" }),
            savings: t({ en: "Savings", es: "Ahorros" }),
        },
        months: {
            averageLabel: t({ en: "Avg", es: "Prom." }),
            title: t({ en: "Spending by month", es: "Gasto por mes" }),
        },
        netWorth: {
            title: t({ en: "Net worth", es: "Patrimonio" }),
        },
        standsOut: {
            biggest: insert(
                t({
                    en: "{{amount}} at {{name}} on {{date}} is the biggest purchase.",
                    es: "{{amount}} en {{name}} el {{date}} es la mayor compra.",
                })
            ),
            biggestUnnamed: insert(
                t({
                    en: "The biggest purchase, {{amount}}, was on {{date}}.",
                    es: "La mayor compra, {{amount}}, fue el {{date}}.",
                })
            ),
            empty: t({ en: "Nothing stands out yet.", es: "Nada destaca todavía." }),
            kept: insert(t({ en: "{{percent}}% of income", es: "{{percent}}% del ingreso" })),
            keptHighest: insert(t({ en: "Highest in {{count}} months.", es: "El más alto en {{count}} meses." })),
            keptHighestSince: insert(t({ en: "Highest since {{month}}.", es: "El más alto desde {{month}}." })),
            keptLowest: insert(t({ en: "Lowest in {{count}} months.", es: "El más bajo en {{count}} meses." })),
            keptLowestSince: insert(t({ en: "Lowest since {{month}}.", es: "El más bajo desde {{month}}." })),
            keptUsual: insert(t({ en: "Usually {{percent}}%.", es: "Normalmente {{percent}}%." })),
            less: insert(t({ en: "{{amount}} less", es: "{{amount}} menos" })),
            more: insert(t({ en: "{{amount}} more", es: "{{amount}} más" })),
            over: insert(t({ en: "{{amount}} over", es: "{{amount}} de más" })),
            ranOut: insert(
                t({
                    en: "Budget ran out {{date}}, {{days}} days early.",
                    es: "El presupuesto se agotó el {{date}}, {{days}} días antes.",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Budget ran out {{date}}, 1 day early.",
                    es: "El presupuesto se agotó el {{date}}, 1 día antes.",
                })
            ),
            title: t({ en: "What stands out", es: "Qué destaca" }),
            usual: insert(t({ en: "You usually spend {{amount}} here.", es: "Normalmente gastas {{amount}} aquí." })),
            usualByNow: insert(
                t({
                    en: "You usually spend {{amount}} here by now.",
                    es: "Normalmente gastas {{amount}} aquí a esta altura.",
                })
            ),
        },
        table: {
            budget: t({ en: "Budget", es: "Presupuesto" }),
            category: t({ en: "Category", es: "Categoría" }),
            left: t({ en: "Left", es: "Queda" }),
            same: t({ en: "same", es: "igual" }),
            spent: t({ en: "Spent", es: "Gastado" }),
            vsUsual: t({ en: "vs usual", es: "vs. lo normal" }),
        },
        trend: {
            income: t({ en: "Income", es: "Ingresos" }),
            kept: insert(t({ en: "{{percent}}% kept", es: "{{percent}}% ahorrado" })),
            single: t({
                en: "Shows up after your second month.",
                es: "Aparece después de tu segundo mes.",
            }),
            spending: t({ en: "Spending", es: "Gastos" }),
            title: t({ en: "Income and spending", es: "Ingresos y gastos" }),
        },
    },
    key: "dashboard-insights",
} satisfies Dictionary;

export default dashboardInsights;
