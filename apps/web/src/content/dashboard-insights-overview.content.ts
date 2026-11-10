import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsOverview = {
    content: {
        else: {
            allCategories: t({ en: "All categories", es: "Todas las categorías" }),
            byDay: t({ en: "By day", es: "Por día" }),
            incomeAndNet: t({ en: "Income and net", es: "Ingresos y neto" }),
            netWorth: t({ en: "Net worth", es: "Patrimonio" }),
            perDay: insert(t({ en: "{{amount}} a day", es: "{{amount}} al día" })),
            title: t({ en: "Everything else", es: "Todo lo demás" }),
            plan: insert(t({ en: "Plan {{year}}", es: "Plan {{year}}" })),
        },
        history: {
            entries: insert(t({ en: "{{count}} entries", es: "{{count}} movimientos" })),
            entry: t({ en: "1 entry", es: "1 movimiento" }),
            month: t({
                en: "Pace, usual spending and answers start after 3 months.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a los 3 meses.",
            }),
            title: t({ en: "Not enough history", es: "Falta historial" }),
            week: t({
                en: "Pace, usual spending and answers start after 3 weeks.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a las 3 semanas.",
            }),
            year: t({
                en: "Pace, usual spending and answers start after 3 years.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a los 3 años.",
            }),
        },
        kpi: {
            byDay: t({ en: "By day", es: "Por día" }),
            days: insert(t({ en: "{{count}} days", es: "{{count}} días" })),
            entries: insert(t({ en: "{{count}} entries", es: "{{count}} movimientos" })),
            entry: t({ en: "1 entry", es: "1 movimiento" }),
            first: {
                month: t({ en: "Your first month", es: "Tu primer mes" }),
                week: t({ en: "Your first week", es: "Tu primera semana" }),
                year: t({ en: "Your first year", es: "Tu primer año" }),
            },
            income: t({ en: "Income", es: "Ingresos" }),
            kept: t({ en: "Kept", es: "Ahorrado" }),
            ofIncome: t({ en: "of income", es: "del ingreso" }),
            spent: t({ en: "Spent", es: "Gastado" }),
            versus: insert(t({ en: "vs {{period}}", es: "vs {{period}}" })),
        },
        limit: {
            biggest: insert(
                t({
                    en: "{{spent}} so far. The biggest, {{name}} on {{date}}, was {{amount}}.",
                    es: "{{spent}} hasta ahora. El mayor, {{name}} el {{date}}, fue de {{amount}}.",
                })
            ),
            biggestClosed: insert(
                t({
                    en: "{{spent}} in all. The biggest, {{name}} on {{date}}, was {{amount}}.",
                    es: "{{spent}} en total. El mayor, {{name}} el {{date}}, fue de {{amount}}.",
                })
            ),
            biggestUnnamed: insert(
                t({
                    en: "{{spent}} so far. The biggest, on {{date}}, was {{amount}}.",
                    es: "{{spent}} hasta ahora. El mayor, el {{date}}, fue de {{amount}}.",
                })
            ),
            biggestUnnamedClosed: insert(
                t({
                    en: "{{spent}} in all. The biggest, on {{date}}, was {{amount}}.",
                    es: "{{spent}} en total. El mayor, el {{date}}, fue de {{amount}}.",
                })
            ),
            chart: insert(
                t({ en: "{{category}} by month against its limit", es: "{{category}} por mes frente a su límite" })
            ),
            over: t({ en: "Over", es: "Excedido" }),
            statement: insert(
                t({ en: "{{category}} passed its {{limit}} limit", es: "{{category}} pasó su límite de {{limit}}" })
            ),
        },
        pace: {
            asUsual: t({ en: "You're spending about as usual", es: "Estás gastando como de costumbre" }),
            chart: t({ en: "Spending added up by day", es: "Gasto acumulado por día" }),
            closedAsUsual: t({ en: "You spent about as usual", es: "Gastaste como de costumbre" }),
            closedLess: t({ en: "You spent less than usual", es: "Gastaste menos de lo normal" }),
            closedLine: insert(
                t({
                    en: "{{amount}} in {{period}}. You usually spend {{usual}}.",
                    es: "{{amount}} en {{period}}. Normalmente gastas {{usual}}.",
                })
            ),
            closedMore: t({ en: "You spent more than usual", es: "Gastaste más de lo normal" }),
            closedPlain: insert(t({ en: "You spent {{amount}}", es: "Gastaste {{amount}}" })),
            course: insert(
                t({
                    en: "You're on course to end near {{amount}}. You usually spend {{usual}} by now.",
                    es: "Vas camino a cerrar cerca de {{amount}}. A esta altura normalmente gastas {{usual}}.",
                })
            ),
            faster: t({ en: "You're spending faster than usual", es: "Estás gastando más rápido de lo normal" }),
            noUsual: t({ en: "No usual to compare with yet.", es: "Aún no hay un gasto normal con qué comparar." }),
            nothing: t({ en: "Nothing spent yet", es: "Aún no hay gastos" }),
            plain: insert(t({ en: "You've spent {{amount}} so far", es: "Has gastado {{amount}} hasta ahora" })),
            slower: t({ en: "You're spending slower than usual", es: "Estás gastando más lento de lo normal" }),
            today: insert(t({ en: "Today {{amount}}", es: "Hoy {{amount}}" })),
            usual: t({ en: "Usual", es: "Lo normal" }),
        },
        quiet: {
            line: t({
                en: "Every category is close to where it usually is.",
                es: "Cada categoría está cerca de lo normal.",
            }),
            title: t({ en: "Nothing stands out", es: "Nada destaca" }),
        },
        sample: {
            badge: t({ en: "Sample", es: "Ejemplo" }),
            categories: {
                dining: t({ en: "Dining Out", es: "Restaurantes" }),
                groceries: t({ en: "Groceries", es: "Mercado" }),
                rent: t({ en: "Rent", es: "Alquiler" }),
                shopping: t({ en: "Shopping", es: "Compras" }),
                subscriptions: t({ en: "Subscriptions", es: "Suscripciones" }),
                transport: t({ en: "Transport", es: "Transporte" }),
            },
            cta: t({ en: "Log your first expense", es: "Registra tu primer gasto" }),
            gaveBack: insert(
                t({ en: "{{category}} alone gave back {{amount}}.", es: "Solo {{category}} devolvió {{amount}}." })
            ),
            less: insert(t({ en: "{{amount}} less than {{period}}", es: "{{amount}} menos que en {{period}}" })),
            line: t({
                en: "Yours starts filling in from your first entry.",
                es: "El tuyo empieza a llenarse con tu primer movimiento.",
            }),
            title: t({ en: "This is what a month looks like", es: "Así se ve un mes" }),
        },
        see: insert(t({ en: "See {{category}}", es: "Ver {{category}}" })),
        subscriptions: {
            foot: insert(
                t({
                    en: "{{amount}} a year. Next charge: {{name}} on {{date}}.",
                    es: "{{amount}} al año. Próximo cobro: {{name}} el {{date}}.",
                })
            ),
            one: insert(
                t({
                    en: "1 subscription costs you {{amount}} a month",
                    es: "1 suscripción te cuesta {{amount}} al mes",
                })
            ),
            seeAll: t({ en: "See all", es: "Ver todas" }),
            statement: insert(
                t({
                    en: "{{count}} subscriptions cost you {{amount}} a month",
                    es: "{{count}} suscripciones te cuestan {{amount}} al mes",
                })
            ),
        },
        versus: {
            above: t({ en: "Above", es: "Por encima" }),
            below: t({ en: "Below", es: "Por debajo" }),
            closedOver: insert(
                t({
                    en: "{{category}} ended {{amount}} over its usual",
                    es: "{{category}} cerró {{amount}} por encima de lo normal",
                })
            ),
            closedUnder: insert(
                t({
                    en: "{{category}} ended {{amount}} under its usual",
                    es: "{{category}} cerró {{amount}} por debajo de lo normal",
                })
            ),
            over: insert(
                t({
                    en: "{{category}} is {{amount}} over where you usually are by now",
                    es: "{{category}} va {{amount}} por encima de lo normal a esta altura",
                })
            ),
            under: insert(
                t({
                    en: "{{category}} is {{amount}} under where you usually are by now",
                    es: "{{category}} va {{amount}} por debajo de lo normal a esta altura",
                })
            ),
            usual: t({ en: "Usual", es: "Lo normal" }),
            usualBy: insert(t({ en: "Usual by {{date}}", es: "Lo normal al {{date}}" })),
        },
        where: {
            breakdown: t({ en: "Breakdown", es: "Desglose" }),
            title: t({ en: "Where it went", es: "En qué se fue" }),
        },
    },
    key: "dashboard-insights-overview",
} satisfies Dictionary;

export default dashboardInsightsOverview;
