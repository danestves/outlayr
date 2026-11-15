import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsights = {
    content: {
        budget: {
            none: t({ en: "No budget", de: "Kein Budget", es: "Sin límite" }),
        },
        cashFlow: {
            savings: t({ en: "Savings", de: "Gespart", es: "Ahorros" }),
            title: t({ en: "Cash flow", de: "Cashflow", es: "Flujo de caja" }),
        },
        changes: {
            empty: t({
                en: "Not enough history to compare yet.",
                de: "Noch nicht genug Verlauf zum Vergleichen.",
                es: "Aún no hay historial suficiente para comparar.",
            }),
            other: t({ en: "Other", de: "Sonstige", es: "Otros" }),
            title: insert(
                t({
                    en: "{{period}} against usual",
                    de: "{{period}} im Vergleich zum Üblichen",
                    es: "{{period}} frente a lo normal",
                })
            ),
            usual: t({ en: "Usual", de: "Üblich", es: "Lo normal" }),
        },
        empty: {
            cashFlow: t({
                en: "Nothing came in or went out.",
                de: "Es ist nichts reingekommen oder rausgegangen.",
                es: "No entró ni salió dinero.",
            }),
            spending: t({
                en: "No spending in this period.",
                de: "In diesem Zeitraum keine Ausgaben.",
                es: "Sin gastos en este periodo.",
            }),
        },
        headline: {
            asUsual: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, about as usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, etwa wie üblich.",
                    es: "Gastaste {{amount}} en {{period}}, como de costumbre.",
                })
            ),
            less: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% less than usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, {{percent}} % weniger als üblich.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% menos de lo normal.",
                })
            ),
            more: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% more than usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, {{percent}} % mehr als üblich.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% más de lo normal.",
                })
            ),
            nothing: insert(
                t({
                    en: "You spent nothing in {{period}}.",
                    de: "Du hast in {{period}} nichts ausgegeben.",
                    es: "No gastaste nada en {{period}}.",
                })
            ),
            plain: insert(
                t({
                    en: "You spent {{amount}} in {{period}}.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben.",
                    es: "Gastaste {{amount}} en {{period}}.",
                })
            ),
            soFarAsUsual: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, about as usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, etwa wie üblich um diese Zeit.",
                    es: "Llevas {{amount}} gastados en {{period}}, como de costumbre a esta altura.",
                })
            ),
            soFarLess: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% less than usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, {{percent}} % weniger als um diese Zeit üblich.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% menos de lo normal a esta altura.",
                })
            ),
            soFarMore: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% more than usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, {{percent}} % mehr als um diese Zeit üblich.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% más de lo normal a esta altura.",
                })
            ),
            soFarPlain: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben.",
                    es: "Llevas {{amount}} gastados en {{period}}.",
                })
            ),
        },
        measures: {
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado" }),
            savings: t({ en: "Savings", de: "Gespart", es: "Ahorros" }),
        },
        months: {
            averageLabel: t({ en: "Avg", de: "Ø", es: "Prom." }),
            title: t({ en: "Spending by month", de: "Ausgaben pro Monat", es: "Gasto por mes" }),
        },
        netWorth: {
            title: t({ en: "Net worth", de: "Vermögen", es: "Patrimonio" }),
        },
        standsOut: {
            biggest: insert(
                t({
                    en: "{{amount}} at {{name}} on {{date}} is the biggest purchase",
                    de: "{{amount}} bei {{name}} am {{date}} ist der größte Einkauf",
                    es: "{{amount}} en {{name}} el {{date}} es la mayor compra",
                })
            ),
            biggestUnnamed: insert(
                t({
                    en: "The biggest purchase, {{amount}}, was on {{date}}",
                    de: "Der größte Einkauf, {{amount}}, war am {{date}}",
                    es: "La mayor compra, {{amount}}, fue el {{date}}",
                })
            ),
            empty: t({ en: "Nothing stands out yet.", de: "Noch fällt nichts auf.", es: "Nada destaca todavía." }),
            kept: insert(
                t({ en: "{{percent}}% of income", de: "{{percent}} % der Einnahmen", es: "{{percent}}% del ingreso" })
            ),
            keptHighest: insert(
                t({
                    en: "highest in {{count}} months",
                    de: "höchster Wert seit {{count}} Monaten",
                    es: "el más alto en {{count}} meses",
                })
            ),
            keptHighestSince: insert(
                t({
                    en: "highest since {{month}}",
                    de: "höchster Wert seit {{month}}",
                    es: "el más alto desde {{month}}",
                })
            ),
            keptLowest: insert(
                t({
                    en: "lowest in {{count}} months",
                    de: "niedrigster Wert seit {{count}} Monaten",
                    es: "el más bajo en {{count}} meses",
                })
            ),
            keptLowestSince: insert(
                t({
                    en: "lowest since {{month}}",
                    de: "niedrigster Wert seit {{month}}",
                    es: "el más bajo desde {{month}}",
                })
            ),
            keptUsual: insert(
                t({ en: "Usually {{percent}}%", de: "Üblich {{percent}} %", es: "Normalmente {{percent}}%" })
            ),
            less: insert(t({ en: "{{amount}} less", de: "{{amount}} weniger", es: "{{amount}} menos" })),
            more: insert(t({ en: "{{amount}} more", de: "{{amount}} mehr", es: "{{amount}} más" })),
            over: insert(t({ en: "{{amount}} over", de: "{{amount}} drüber", es: "{{amount}} de más" })),
            ranOut: insert(
                t({
                    en: "Ran out {{date}}, {{days}} days early",
                    de: "Aufgebraucht am {{date}}, {{days}} Tage zu früh",
                    es: "Se agotó el {{date}}, {{days}} días antes",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{date}}, 1 day early",
                    de: "Aufgebraucht am {{date}}, 1 Tag zu früh",
                    es: "Se agotó el {{date}}, 1 día antes",
                })
            ),
            title: t({ en: "What stands out", de: "Was auffällt", es: "Qué destaca" }),
            usual: insert(
                t({
                    en: "You usually spend {{amount}} here",
                    de: "Hier gibst du üblicherweise {{amount}} aus",
                    es: "Normalmente gastas {{amount}} aquí",
                })
            ),
            usualByNow: insert(
                t({
                    en: "You usually spend {{amount}} here by now",
                    de: "Hier gibst du bis jetzt üblicherweise {{amount}} aus",
                    es: "Normalmente gastas {{amount}} aquí a esta altura",
                })
            ),
        },
        table: {
            category: t({ en: "Category", de: "Kategorie", es: "Categoría" }),
            left: t({ en: "Left", de: "Übrig", es: "Queda" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
        },
        trend: {
            single: t({
                en: "Shows up after your second month.",
                de: "Erscheint nach deinem zweiten Monat.",
                es: "Aparece después de tu segundo mes.",
            }),
            spending: t({ en: "Spending", de: "Ausgaben", es: "Gastos" }),
            title: t({ en: "Income and spending", de: "Einnahmen und Ausgaben", es: "Ingresos y gastos" }),
        },
    },
    key: "dashboard-insights",
} satisfies Dictionary;

export default dashboardInsights;
