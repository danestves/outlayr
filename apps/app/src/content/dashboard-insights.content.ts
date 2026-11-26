import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsights = {
    content: {
        budget: {
            none: t({ en: "No budget", de: "Kein Budget", es: "Sin límite", fr: "Sans budget", pt: "Sem orçamento" }),
        },
        cashFlow: {
            savings: t({ en: "Savings", de: "Gespart", es: "Ahorros", fr: "Épargne", pt: "Poupança" }),
            title: t({
                en: "Cash flow",
                de: "Cashflow",
                es: "Flujo de caja",
                fr: "Flux de trésorerie",
                pt: "Fluxo de caixa",
            }),
        },
        changes: {
            empty: t({
                en: "Not enough history to compare yet.",
                de: "Noch nicht genug Verlauf zum Vergleichen.",
                es: "Aún no hay historial suficiente para comparar.",

                fr: "Pas assez d'historique pour comparer.",
                pt: "Histórico insuficiente para comparar ainda.",
            }),
            other: t({ en: "Other", de: "Sonstige", es: "Otros", fr: "Autre", pt: "Outro" }),
            title: insert(
                t({
                    en: "{{period}} against usual",
                    de: "{{period}} im Vergleich zum Üblichen",
                    es: "{{period}} frente a lo normal",

                    fr: "{{period}} par rapport à l'habitude",
                    pt: "{{period}} frente ao habitual",
                })
            ),
            usual: t({ en: "Usual", de: "Üblich", es: "Lo normal", fr: "Habituel", pt: "Habitual" }),
        },
        empty: {
            cashFlow: t({
                en: "Nothing came in or went out.",
                de: "Es ist nichts reingekommen oder rausgegangen.",
                es: "No entró ni salió dinero.",

                fr: "Rien n'est entré ni sorti.",
                pt: "Nada entrou ou saiu.",
            }),
            spending: t({
                en: "No spending in this period.",
                de: "In diesem Zeitraum keine Ausgaben.",
                es: "Sin gastos en este periodo.",

                fr: "Aucune dépense sur cette période.",
                pt: "Sem gastos neste período.",
            }),
        },
        headline: {
            asUsual: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, about as usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, etwa wie üblich.",
                    es: "Gastaste {{amount}} en {{period}}, como de costumbre.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}, comme d'habitude.",
                    pt: "Você gastou {{amount}} em {{period}}, como de costume.",
                })
            ),
            less: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% less than usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, {{percent}} % weniger als üblich.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% menos de lo normal.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}, {{percent}} % de moins que d'habitude.",
                    pt: "Você gastou {{amount}} em {{period}}, {{percent}}% menos que o habitual.",
                })
            ),
            more: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% more than usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, {{percent}} % mehr als üblich.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% más de lo normal.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}, {{percent}} % de plus que d'habitude.",
                    pt: "Você gastou {{amount}} em {{period}}, {{percent}}% mais que o habitual.",
                })
            ),
            nothing: insert(
                t({
                    en: "You spent nothing in {{period}}.",
                    de: "Du hast in {{period}} nichts ausgegeben.",
                    es: "No gastaste nada en {{period}}.",

                    fr: "Vous n'avez rien dépensé en {{period}}.",
                    pt: "Você não gastou nada em {{period}}.",
                })
            ),
            plain: insert(
                t({
                    en: "You spent {{amount}} in {{period}}.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben.",
                    es: "Gastaste {{amount}} en {{period}}.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}.",
                    pt: "Você gastou {{amount}} em {{period}}.",
                })
            ),
            soFarAsUsual: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, about as usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, etwa wie üblich um diese Zeit.",
                    es: "Llevas {{amount}} gastados en {{period}}, como de costumbre a esta altura.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}, comme d'habitude à ce stade.",
                    pt: "Você gastou {{amount}} até agora em {{period}}, como de costume.",
                })
            ),
            soFarLess: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% less than usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, {{percent}} % weniger als um diese Zeit üblich.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% menos de lo normal a esta altura.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}, {{percent}} % de moins que d'habitude.",
                    pt: "Você gastou {{amount}} até agora em {{period}}, {{percent}}% menos que o habitual.",
                })
            ),
            soFarMore: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% more than usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, {{percent}} % mehr als um diese Zeit üblich.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% más de lo normal a esta altura.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}, {{percent}} % de plus que d'habitude.",
                    pt: "Você gastou {{amount}} até agora em {{period}}, {{percent}}% mais que o habitual.",
                })
            ),
            soFarPlain: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben.",
                    es: "Llevas {{amount}} gastados en {{period}}.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}.",
                    pt: "Você gastou {{amount}} até agora em {{period}}.",
                })
            ),
        },
        measures: {
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado", fr: "Épargné", pt: "Guardado" }),
            savings: t({ en: "Savings", de: "Gespart", es: "Ahorros", fr: "Épargne", pt: "Poupança" }),
        },
        months: {
            averageLabel: t({ en: "Avg", de: "Ø", es: "Prom.", fr: "Moy.", pt: "Méd." }),
            title: t({
                en: "Spending by month",
                de: "Ausgaben pro Monat",
                es: "Gasto por mes",
                fr: "Dépenses par mois",
                pt: "Despesas por mês",
            }),
        },
        netWorth: {
            title: t({ en: "Net worth", de: "Vermögen", es: "Patrimonio", fr: "Patrimoine", pt: "Patrimônio" }),
        },
        standsOut: {
            biggest: insert(
                t({
                    en: "{{amount}} at {{name}} on {{date}} is the biggest purchase",
                    de: "{{amount}} bei {{name}} am {{date}} ist der größte Einkauf",
                    es: "{{amount}} en {{name}} el {{date}} es la mayor compra",

                    fr: "{{amount}} chez {{name}} le {{date}} est le plus gros achat",
                    pt: "{{amount}} em {{name}} em {{date}} é a maior compra",
                })
            ),
            biggestUnnamed: insert(
                t({
                    en: "The biggest purchase, {{amount}}, was on {{date}}",
                    de: "Der größte Einkauf, {{amount}}, war am {{date}}",
                    es: "La mayor compra, {{amount}}, fue el {{date}}",

                    fr: "Le plus gros achat, {{amount}}, date du {{date}}",
                    pt: "A maior compra, {{amount}}, foi em {{date}}",
                })
            ),
            empty: t({
                en: "Nothing stands out yet.",
                de: "Noch fällt nichts auf.",
                es: "Nada destaca todavía.",
                fr: "Rien ne ressort encore.",
                pt: "Nada se destaca ainda.",
            }),
            kept: insert(
                t({
                    en: "{{percent}}% of income",
                    de: "{{percent}} % der Einnahmen",
                    es: "{{percent}}% del ingreso",
                    fr: "{{percent}} % des revenus",
                    pt: "{{percent}}% das receitas",
                })
            ),
            keptHighest: insert(
                t({
                    en: "highest in {{count}} months",
                    de: "höchster Wert seit {{count}} Monaten",
                    es: "el más alto en {{count}} meses",

                    fr: "plus élevé en {{count}} mois",
                    pt: "maior em {{count}} meses",
                })
            ),
            keptHighestSince: insert(
                t({
                    en: "highest since {{month}}",
                    de: "höchster Wert seit {{month}}",
                    es: "el más alto desde {{month}}",

                    fr: "plus élevé depuis {{month}}",
                    pt: "maior desde {{month}}",
                })
            ),
            keptLowest: insert(
                t({
                    en: "lowest in {{count}} months",
                    de: "niedrigster Wert seit {{count}} Monaten",
                    es: "el más bajo en {{count}} meses",

                    fr: "plus bas en {{count}} mois",
                    pt: "menor em {{count}} meses",
                })
            ),
            keptLowestSince: insert(
                t({
                    en: "lowest since {{month}}",
                    de: "niedrigster Wert seit {{month}}",
                    es: "el más bajo desde {{month}}",

                    fr: "plus bas depuis {{month}}",
                    pt: "menor desde {{month}}",
                })
            ),
            keptUsual: insert(
                t({
                    en: "Usually {{percent}}%",
                    de: "Üblich {{percent}} %",
                    es: "Normalmente {{percent}}%",
                    fr: "Habituellement {{percent}} %",
                    pt: "Normalmente {{percent}}%",
                })
            ),
            less: insert(
                t({
                    en: "{{amount}} less",
                    de: "{{amount}} weniger",
                    es: "{{amount}} menos",
                    fr: "{{amount}} de moins",
                    pt: "{{amount}} menos",
                })
            ),
            more: insert(
                t({
                    en: "{{amount}} more",
                    de: "{{amount}} mehr",
                    es: "{{amount}} más",
                    fr: "{{amount}} de plus",
                    pt: "{{amount}} mais",
                })
            ),
            over: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} au-dessus",
                    pt: "{{amount}} acima",
                })
            ),
            ranOut: insert(
                t({
                    en: "Ran out {{date}}, {{days}} days early",
                    de: "Aufgebraucht am {{date}}, {{days}} Tage zu früh",
                    es: "Se agotó el {{date}}, {{days}} días antes",

                    fr: "Épuisé le {{date}}, {{days}} jours avant",
                    pt: "Acabou em {{date}}, {{days}} dias antes",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{date}}, 1 day early",
                    de: "Aufgebraucht am {{date}}, 1 Tag zu früh",
                    es: "Se agotó el {{date}}, 1 día antes",

                    fr: "Épuisé le {{date}}, 1 jour avant",
                    pt: "Acabou em {{date}}, 1 dia antes",
                })
            ),
            title: t({
                en: "What stands out",
                de: "Was auffällt",
                es: "Qué destaca",
                fr: "Ce qui ressort",
                pt: "O que se destaca",
            }),
            usual: insert(
                t({
                    en: "You usually spend {{amount}} here",
                    de: "Hier gibst du üblicherweise {{amount}} aus",
                    es: "Normalmente gastas {{amount}} aquí",

                    fr: "Vous dépensez habituellement {{amount}} ici",
                    pt: "Você costuma gastar {{amount}} aqui",
                })
            ),
            usualByNow: insert(
                t({
                    en: "You usually spend {{amount}} here by now",
                    de: "Hier gibst du bis jetzt üblicherweise {{amount}} aus",
                    es: "Normalmente gastas {{amount}} aquí a esta altura",

                    fr: "Vous dépensez habituellement {{amount}} ici à ce stade",
                    pt: "Você costuma gastar {{amount}} aqui até agora",
                })
            ),
        },
        table: {
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            left: t({ en: "Left", de: "Übrig", es: "Queda", fr: "Restant", pt: "Restam" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
        },
        trend: {
            single: t({
                en: "Shows up after your second month.",
                de: "Erscheint nach deinem zweiten Monat.",
                es: "Aparece después de tu segundo mes.",

                fr: "Apparaît après votre deuxième mois.",
                pt: "Aparece depois do seu segundo mês.",
            }),
            spending: t({ en: "Spending", de: "Ausgaben", es: "Gastos", fr: "Dépenses", pt: "Despesas" }),
            title: t({
                en: "Income and spending",
                de: "Einnahmen und Ausgaben",
                es: "Ingresos y gastos",
                fr: "Revenus et dépenses",
                pt: "Receitas e despesas",
            }),
        },
    },
    key: "dashboard-insights",
} satisfies Dictionary;

export default dashboardInsights;
