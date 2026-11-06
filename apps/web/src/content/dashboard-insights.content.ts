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
        categories: {
            count: insert(t({ en: "{{count}} categories", es: "{{count}} categorías" })),
            countOne: t({ en: "1 category", es: "1 categoría" }),
            title: t({ en: "Categories", es: "Categorías" }),
        },
        daily: {
            average: insert(t({ en: "{{amount}} a day", es: "{{amount}} al día" })),
            averageWithout: insert(
                t({ en: "{{amount}} a day without {{name}}", es: "{{amount}} al día sin {{name}}" })
            ),
            title: t({ en: "Daily spend", es: "Gasto diario" }),
        },
        empty: {
            cashFlow: t({ en: "Nothing came in or went out.", es: "No entró ni salió dinero." }),
            spending: t({ en: "No spending in this period.", es: "Sin gastos en este periodo." }),
        },
        everything: {
            allCategories: t({ en: "All categories", es: "Todas las categorías" }),
            byDay: t({ en: "By day", es: "Por día" }),
            incomeNet: t({ en: "Income and net", es: "Ingreso y neto" }),
            title: t({ en: "Everything", es: "Todo" }),
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
            average: insert(t({ en: "Avg {{amount}}", es: "Prom. {{amount}}" })),
            title: t({ en: "6 months", es: "6 meses" }),
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
            spent: t({ en: "Spent", es: "Gastado" }),
        },
    },
    key: "dashboard-insights",
} satisfies Dictionary;

export default dashboardInsights;
