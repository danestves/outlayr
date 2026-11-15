import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsFlow = {
    content: {
        back: t({ en: "Back to cash flow", de: "Zurück zum Cashflow", es: "Volver al flujo de caja" }),
        budget: insert(t({ en: "Budget {{amount}}", de: "Budget {{amount}}", es: "Presupuesto {{amount}}" })),
        cameFrom: t({ en: "Came from", de: "Kam von", es: "Vino de" }),
        chart: t({ en: "Where it went", de: "Wohin es ging", es: "A dónde se fue" }),
        chartLabel: t({
            en: "Income flowing into spending and savings",
            de: "Einnahmen, die in Ausgaben und Sparen fließen",
            es: "Ingresos que fluyen hacia gastos y ahorro",
        }),
        other: t({ en: "Other", de: "Sonstige", es: "Otros" }),
        drill: {
            chartLabel: insert(
                t({
                    en: "{{category}} flowing into merchants",
                    de: "{{category}} fließt zu Händlern",
                    es: "{{category}} fluyendo hacia comercios",
                })
            ),
            empty: insert(
                t({
                    en: "{{span}} has no {{category}} entries.",
                    de: "{{span}} hat keine Einträge in {{category}}.",
                    es: "{{span}} no tiene movimientos de {{category}}.",
                })
            ),
            emptyTitle: insert(
                t({ en: "Nothing in {{category}}", de: "Nichts in {{category}}", es: "Nada en {{category}}" })
            ),
            entries: insert(t({ en: "{{count}} entries", de: "{{count}} Einträge", es: "{{count}} movimientos" })),
            entry: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio" }),
            of: insert(t({ en: "of {{amount}}", de: "von {{amount}}", es: "de {{amount}}" })),
            ofCategory: insert(t({ en: "Of {{category}}", de: "Von {{category}}", es: "De {{category}}" })),
            ofIncome: t({ en: "Of income", de: "Von den Einnahmen", es: "Del ingreso" }),
            open: t({ en: "Open category", de: "Kategorie öffnen", es: "Abrir categoría" }),
            over: insert(t({ en: "{{amount}} over", de: "{{amount}} drüber", es: "{{amount}} de más" })),
            seeAll: t({ en: "See all", de: "Alle anzeigen", es: "Ver todos" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
            total: t({ en: "Total", de: "Gesamt", es: "Total" }),
            under: insert(t({ en: "{{amount}} left", de: "{{amount}} übrig", es: "{{amount}} disponibles" })),
            versus: insert(t({ en: "vs {{period}}", de: "vs. {{period}}", es: "vs {{period}}" })),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha" }),
        },
        empty: {
            add: t({ en: "Add entry", de: "Eintrag hinzufügen", es: "Agregar movimiento" }),
            line: insert(
                t({
                    en: "{{span}} has no entries yet.",
                    de: "{{span}} hat noch keine Einträge.",
                    es: "{{span}} aún no tiene movimientos.",
                })
            ),
            title: t({
                en: "Nothing came in or went out.",
                de: "Es ist nichts reingekommen oder rausgegangen.",
                es: "No entró ni salió nada.",
            }),
        },
        hub: {
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
        },
        kpi: {
            in: t({ en: "In", de: "Rein", es: "Entró" }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado" }),
            out: t({ en: "Out", de: "Raus", es: "Salió" }),
            savings: t({ en: "Savings", de: "Gespart", es: "Ahorros" }),
        },
        ofIn: insert(t({ en: "of {{amount}} in", de: "von {{amount}} Einnahmen", es: "de {{amount}} que entraron" })),
        ofIncome: t({ en: "of income", de: "der Einnahmen", es: "del ingreso" }),
        ofOut: insert(t({ en: "of {{amount}} out", de: "von {{amount}} Ausgaben", es: "de {{amount}} que salieron" })),
        ofSpending: t({ en: "of spending", de: "der Ausgaben", es: "del gasto" }),
        sentence: {
            deficit: insert(
                t({
                    en: "You spent {{amount}} more than came in. It came out of your savings.",
                    de: "Du hast {{amount}} mehr ausgegeben, als reingekommen ist. Es kam aus deinen Ersparnissen.",
                    es: "Gastaste {{amount}} más de lo que entró. Salió de tus ahorros.",
                })
            ),
            even: insert(
                t({
                    en: "Everything that came in went out. {{category}} took {{percent}}% of it.",
                    de: "Alles, was reingekommen ist, ging wieder raus. {{category}} hat davon {{percent}} % genommen.",
                    es: "Todo lo que entró salió. {{category}} se llevó el {{percent}}% de eso.",
                })
            ),
            kept: insert(
                t({
                    en: "You kept {{kept}}% of what came in. {{category}} took {{percent}}% of it.",
                    de: "Du hast {{kept}} % von dem behalten, was reingekommen ist. {{category}} hat davon {{percent}} % genommen.",
                    es: "Ahorraste el {{kept}}% de lo que entró. {{category}} se llevó el {{percent}}% de eso.",
                })
            ),
            keptOnly: insert(
                t({
                    en: "You kept {{kept}}% of what came in.",
                    de: "Du hast {{kept}} % von dem behalten, was reingekommen ist.",
                    es: "Ahorraste el {{kept}}% de lo que entró.",
                })
            ),
        },
        tip: {
            budget: t({ en: "Budget", de: "Budget", es: "Presupuesto" }),
            drill: t({ en: "Click to drill in", de: "Zum Vertiefen klicken", es: "Clic para ver el detalle" }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos" }),
            ofIncome: t({ en: "Of income", de: "Von den Einnahmen", es: "Del ingreso" }),
            ofSpending: t({ en: "Of spending", de: "Von den Ausgaben", es: "Del gasto" }),
            toCategory: insert(t({ en: "{{from}} to {{to}}", de: "{{from}} zu {{to}}", es: "{{from}} a {{to}}" })),
        },
        wentTo: t({ en: "Went to", de: "Ging an", es: "Fue a" }),
    },
    key: "dashboard-insights-flow",
} satisfies Dictionary;

export default dashboardInsightsFlow;
