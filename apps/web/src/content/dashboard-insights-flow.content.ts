import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsFlow = {
    content: {
        back: t({ en: "Back to cash flow", es: "Volver al flujo de caja" }),
        budget: insert(t({ en: "Budget {{amount}}", es: "Presupuesto {{amount}}" })),
        cameFrom: t({ en: "Came from", es: "Vino de" }),
        chart: t({ en: "Where it went", es: "A dónde se fue" }),
        chartLabel: t({
            en: "Income flowing into spending and savings",
            es: "Ingresos que fluyen hacia gastos y ahorro",
        }),
        other: t({ en: "Other", es: "Otros" }),
        drill: {
            chartLabel: insert(
                t({ en: "{{category}} flowing into merchants", es: "{{category}} fluyendo hacia comercios" })
            ),
            empty: insert(
                t({ en: "{{span}} has no {{category}} entries.", es: "{{span}} no tiene movimientos de {{category}}." })
            ),
            emptyTitle: insert(t({ en: "Nothing in {{category}}", es: "Nada en {{category}}" })),
            entries: insert(t({ en: "{{count}} entries", es: "{{count}} movimientos" })),
            entry: t({ en: "1 entry", es: "1 movimiento" }),
            merchant: t({ en: "Merchant", es: "Comercio" }),
            of: insert(t({ en: "of {{amount}}", es: "de {{amount}}" })),
            ofCategory: insert(t({ en: "Of {{category}}", es: "De {{category}}" })),
            ofIncome: t({ en: "Of income", es: "Del ingreso" }),
            open: t({ en: "Open category", es: "Abrir categoría" }),
            over: insert(t({ en: "{{amount}} over", es: "{{amount}} de más" })),
            seeAll: t({ en: "See all", es: "Ver todos" }),
            spent: t({ en: "Spent", es: "Gastado" }),
            total: t({ en: "Total", es: "Total" }),
            under: insert(t({ en: "{{amount}} left", es: "{{amount}} disponibles" })),
            versus: insert(t({ en: "vs {{period}}", es: "vs {{period}}" })),
            amount: t({ en: "Amount", es: "Monto" }),
            date: t({ en: "Date", es: "Fecha" }),
        },
        empty: {
            add: t({ en: "Add entry", es: "Agregar movimiento" }),
            line: insert(t({ en: "{{span}} has no entries yet.", es: "{{span}} aún no tiene movimientos." })),
            title: t({ en: "Nothing came in or went out.", es: "No entró ni salió nada." }),
        },
        hub: {
            income: t({ en: "Income", es: "Ingresos" }),
            spent: t({ en: "Spent", es: "Gastado" }),
        },
        kpi: {
            in: t({ en: "In", es: "Entró" }),
            kept: t({ en: "Kept", es: "Ahorrado" }),
            out: t({ en: "Out", es: "Salió" }),
            savings: t({ en: "Savings", es: "Ahorros" }),
        },
        ofIn: insert(t({ en: "of {{amount}} in", es: "de {{amount}} que entraron" })),
        ofIncome: t({ en: "of income", es: "del ingreso" }),
        ofOut: insert(t({ en: "of {{amount}} out", es: "de {{amount}} que salieron" })),
        ofSpending: t({ en: "of spending", es: "del gasto" }),
        sentence: {
            deficit: insert(
                t({
                    en: "You spent {{amount}} more than came in. It came out of your savings.",
                    es: "Gastaste {{amount}} más de lo que entró. Salió de tus ahorros.",
                })
            ),
            even: insert(
                t({
                    en: "Everything that came in went out. {{category}} took {{percent}}% of it.",
                    es: "Todo lo que entró salió. {{category}} se llevó el {{percent}}% de eso.",
                })
            ),
            kept: insert(
                t({
                    en: "You kept {{kept}}% of what came in. {{category}} took {{percent}}% of it.",
                    es: "Ahorraste el {{kept}}% de lo que entró. {{category}} se llevó el {{percent}}% de eso.",
                })
            ),
            keptOnly: insert(
                t({
                    en: "You kept {{kept}}% of what came in.",
                    es: "Ahorraste el {{kept}}% de lo que entró.",
                })
            ),
        },
        tip: {
            budget: t({ en: "Budget", es: "Presupuesto" }),
            drill: t({ en: "Click to drill in", es: "Clic para ver el detalle" }),
            entries: t({ en: "Entries", es: "Movimientos" }),
            ofIncome: t({ en: "Of income", es: "Del ingreso" }),
            ofSpending: t({ en: "Of spending", es: "Del gasto" }),
            toCategory: insert(t({ en: "{{from}} to {{to}}", es: "{{from}} a {{to}}" })),
        },
        wentTo: t({ en: "Went to", es: "Fue a" }),
    },
    key: "dashboard-insights-flow",
} satisfies Dictionary;

export default dashboardInsightsFlow;
