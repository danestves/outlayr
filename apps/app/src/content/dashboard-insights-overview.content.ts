import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsOverview = {
    content: {
        else: {
            allCategories: t({ en: "All categories", de: "Alle Kategorien", es: "Todas las categorías" }),
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día" }),
            incomeAndNet: t({ en: "Income and net", de: "Einnahmen und Netto", es: "Ingresos y neto" }),
            netWorth: t({ en: "Net worth", de: "Vermögen", es: "Patrimonio" }),
            perDay: insert(t({ en: "{{amount}} a day", de: "{{amount}} am Tag", es: "{{amount}} al día" })),
            title: t({ en: "Everything else", de: "Alles andere", es: "Todo lo demás" }),
            plan: insert(t({ en: "Plan {{year}}", de: "Plan {{year}}", es: "Plan {{year}}" })),
        },
        history: {
            entries: insert(t({ en: "{{count}} entries", de: "{{count}} Einträge", es: "{{count}} movimientos" })),
            entry: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento" }),
            month: t({
                en: "Pace, usual spending and answers start after 3 months.",
                de: "Tempo, übliche Ausgaben und Antworten gibt es nach 3 Monaten.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a los 3 meses.",
            }),
            title: t({ en: "Not enough history", de: "Noch nicht genug Verlauf", es: "Falta historial" }),
            week: t({
                en: "Pace, usual spending and answers start after 3 weeks.",
                de: "Tempo, übliche Ausgaben und Antworten gibt es nach 3 Wochen.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a las 3 semanas.",
            }),
            year: t({
                en: "Pace, usual spending and answers start after 3 years.",
                de: "Tempo, übliche Ausgaben und Antworten gibt es nach 3 Jahren.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a los 3 años.",
            }),
        },
        kpi: {
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día" }),
            days: insert(t({ en: "{{count}} days", de: "{{count}} Tage", es: "{{count}} días" })),
            entries: insert(t({ en: "{{count}} entries", de: "{{count}} Einträge", es: "{{count}} movimientos" })),
            entry: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento" }),
            first: {
                month: t({ en: "Your first month", de: "Dein erster Monat", es: "Tu primer mes" }),
                week: t({ en: "Your first week", de: "Deine erste Woche", es: "Tu primera semana" }),
                year: t({ en: "Your first year", de: "Dein erstes Jahr", es: "Tu primer año" }),
            },
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos" }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado" }),
            ofIncome: t({ en: "of income", de: "der Einnahmen", es: "del ingreso" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
            versus: insert(t({ en: "vs {{period}}", de: "vs. {{period}}", es: "vs {{period}}" })),
        },
        limit: {
            biggest: insert(
                t({
                    en: "{{spent}} so far. The biggest, {{name}} on {{date}}, was {{amount}}.",
                    de: "{{spent}} bisher. Der größte, {{name}} am {{date}}, waren {{amount}}.",
                    es: "{{spent}} hasta ahora. El mayor, {{name}} el {{date}}, fue de {{amount}}.",
                })
            ),
            biggestClosed: insert(
                t({
                    en: "{{spent}} in all. The biggest, {{name}} on {{date}}, was {{amount}}.",
                    de: "{{spent}} insgesamt. Der größte, {{name}} am {{date}}, waren {{amount}}.",
                    es: "{{spent}} en total. El mayor, {{name}} el {{date}}, fue de {{amount}}.",
                })
            ),
            biggestUnnamed: insert(
                t({
                    en: "{{spent}} so far. The biggest, on {{date}}, was {{amount}}.",
                    de: "{{spent}} bisher. Der größte, am {{date}}, waren {{amount}}.",
                    es: "{{spent}} hasta ahora. El mayor, el {{date}}, fue de {{amount}}.",
                })
            ),
            biggestUnnamedClosed: insert(
                t({
                    en: "{{spent}} in all. The biggest, on {{date}}, was {{amount}}.",
                    de: "{{spent}} insgesamt. Der größte, am {{date}}, waren {{amount}}.",
                    es: "{{spent}} en total. El mayor, el {{date}}, fue de {{amount}}.",
                })
            ),
            chart: insert(
                t({
                    en: "{{category}} by month against its limit",
                    de: "{{category}} pro Monat im Vergleich zum Limit",
                    es: "{{category}} por mes frente a su límite",
                })
            ),
            over: t({ en: "Over", de: "Drüber", es: "Excedido" }),
            statement: insert(
                t({
                    en: "{{category}} passed its {{limit}} limit",
                    de: "{{category}} hat das Limit von {{limit}} überschritten",
                    es: "{{category}} pasó su límite de {{limit}}",
                })
            ),
        },
        pace: {
            asUsual: t({
                en: "You're spending about as usual",
                de: "Du gibst etwa so viel aus wie üblich",
                es: "Estás gastando como de costumbre",
            }),
            chart: t({
                en: "Spending added up by day",
                de: "Ausgaben, nach Tagen aufsummiert",
                es: "Gasto acumulado por día",
            }),
            closedAsUsual: t({
                en: "You spent about as usual",
                de: "Du hast etwa so viel ausgegeben wie üblich",
                es: "Gastaste como de costumbre",
            }),
            closedLess: t({
                en: "You spent less than usual",
                de: "Du hast weniger ausgegeben als üblich",
                es: "Gastaste menos de lo normal",
            }),
            closedLine: insert(
                t({
                    en: "{{amount}} in {{period}}. You usually spend {{usual}}.",
                    de: "{{amount}} in {{period}}. Üblicherweise gibst du {{usual}} aus.",
                    es: "{{amount}} en {{period}}. Normalmente gastas {{usual}}.",
                })
            ),
            closedMore: t({
                en: "You spent more than usual",
                de: "Du hast mehr ausgegeben als üblich",
                es: "Gastaste más de lo normal",
            }),
            closedPlain: insert(
                t({ en: "You spent {{amount}}", de: "Du hast {{amount}} ausgegeben", es: "Gastaste {{amount}}" })
            ),
            course: insert(
                t({
                    en: "You're on course to end near {{amount}}. You usually spend {{usual}} by now.",
                    de: "Du landest voraussichtlich bei etwa {{amount}}. Üblicherweise gibst du bis jetzt {{usual}} aus.",
                    es: "Vas camino a cerrar cerca de {{amount}}. A esta altura normalmente gastas {{usual}}.",
                })
            ),
            faster: t({
                en: "You're spending faster than usual",
                de: "Du gibst schneller aus als üblich",
                es: "Estás gastando más rápido de lo normal",
            }),
            noUsual: t({
                en: "No usual to compare with yet.",
                de: "Noch kein üblicher Wert zum Vergleichen.",
                es: "Aún no hay un gasto normal con qué comparar.",
            }),
            nothing: t({ en: "Nothing spent yet", de: "Noch nichts ausgegeben", es: "Aún no hay gastos" }),
            plain: insert(
                t({
                    en: "You've spent {{amount}} so far",
                    de: "Du hast bisher {{amount}} ausgegeben",
                    es: "Has gastado {{amount}} hasta ahora",
                })
            ),
            slower: t({
                en: "You're spending slower than usual",
                de: "Du gibst langsamer aus als üblich",
                es: "Estás gastando más lento de lo normal",
            }),
            today: insert(t({ en: "Today {{amount}}", de: "Heute {{amount}}", es: "Hoy {{amount}}" })),
            usual: t({ en: "Usual", de: "Üblich", es: "Lo normal" }),
        },
        quiet: {
            line: t({
                en: "Every category is close to where it usually is.",
                de: "Jede Kategorie liegt nah an ihrem üblichen Wert.",
                es: "Cada categoría está cerca de lo normal.",
            }),
            title: t({ en: "Nothing stands out", de: "Nichts fällt auf", es: "Nada destaca" }),
        },
        sample: {
            badge: t({ en: "Sample", de: "Beispiel", es: "Ejemplo" }),
            categories: {
                dining: t({ en: "Dining Out", de: "Essengehen", es: "Restaurantes" }),
                groceries: t({ en: "Groceries", de: "Lebensmittel", es: "Mercado" }),
                rent: t({ en: "Rent", de: "Miete", es: "Alquiler" }),
                shopping: t({ en: "Shopping", de: "Shopping", es: "Compras" }),
                subscriptions: t({ en: "Subscriptions", de: "Abos", es: "Suscripciones" }),
                transport: t({ en: "Transport", de: "Verkehr", es: "Transporte" }),
            },
            cta: t({ en: "Log your first expense", de: "Erfasse deine erste Ausgabe", es: "Registra tu primer gasto" }),
            gaveBack: insert(
                t({
                    en: "{{category}} alone gave back {{amount}}.",
                    de: "Allein {{category}} brachte {{amount}} zurück.",
                    es: "Solo {{category}} devolvió {{amount}}.",
                })
            ),
            less: insert(
                t({
                    en: "{{amount}} less than {{period}}",
                    de: "{{amount}} weniger als {{period}}",
                    es: "{{amount}} menos que en {{period}}",
                })
            ),
            line: t({
                en: "Yours starts filling in from your first entry.",
                de: "Deiner füllt sich ab deinem ersten Eintrag.",
                es: "El tuyo empieza a llenarse con tu primer movimiento.",
            }),
            title: t({ en: "This is what a month looks like", de: "So sieht ein Monat aus", es: "Así se ve un mes" }),
        },
        see: insert(t({ en: "See {{category}}", de: "{{category}} ansehen", es: "Ver {{category}}" })),
        subscriptions: {
            foot: insert(
                t({
                    en: "{{amount}} a year. Next charge: {{name}} on {{date}}.",
                    de: "{{amount}} im Jahr. Nächste Abbuchung: {{name}} am {{date}}.",
                    es: "{{amount}} al año. Próximo cobro: {{name}} el {{date}}.",
                })
            ),
            one: insert(
                t({
                    en: "1 subscription costs you {{amount}} a month",
                    de: "1 Abo kostet dich {{amount}} im Monat",
                    es: "1 suscripción te cuesta {{amount}} al mes",
                })
            ),
            seeAll: t({ en: "See all", de: "Alle anzeigen", es: "Ver todas" }),
            statement: insert(
                t({
                    en: "{{count}} subscriptions cost you {{amount}} a month",
                    de: "{{count}} Abos kosten dich {{amount}} im Monat",
                    es: "{{count}} suscripciones te cuestan {{amount}} al mes",
                })
            ),
        },
        versus: {
            above: t({ en: "Above", de: "Darüber", es: "Por encima" }),
            below: t({ en: "Below", de: "Darunter", es: "Por debajo" }),
            closedOver: insert(
                t({
                    en: "{{category}} ended {{amount}} over its usual",
                    de: "{{category}} lag am Ende {{amount}} über dem üblichen Wert",
                    es: "{{category}} cerró {{amount}} por encima de lo normal",
                })
            ),
            closedUnder: insert(
                t({
                    en: "{{category}} ended {{amount}} under its usual",
                    de: "{{category}} lag am Ende {{amount}} unter dem üblichen Wert",
                    es: "{{category}} cerró {{amount}} por debajo de lo normal",
                })
            ),
            over: insert(
                t({
                    en: "{{category}} is {{amount}} over where you usually are by now",
                    de: "{{category}} liegt {{amount}} über deinem üblichen Stand zu diesem Zeitpunkt",
                    es: "{{category}} va {{amount}} por encima de lo normal a esta altura",
                })
            ),
            under: insert(
                t({
                    en: "{{category}} is {{amount}} under where you usually are by now",
                    de: "{{category}} liegt {{amount}} unter deinem üblichen Stand zu diesem Zeitpunkt",
                    es: "{{category}} va {{amount}} por debajo de lo normal a esta altura",
                })
            ),
            usual: t({ en: "Usual", de: "Üblich", es: "Lo normal" }),
            usualBy: insert(t({ en: "Usual by {{date}}", de: "Üblich bis {{date}}", es: "Lo normal al {{date}}" })),
        },
        where: {
            breakdown: t({ en: "Breakdown", de: "Aufschlüsselung", es: "Desglose" }),
            title: t({ en: "Where it went", de: "Wohin es ging", es: "En qué se fue" }),
        },
    },
    key: "dashboard-insights-overview",
} satisfies Dictionary;

export default dashboardInsightsOverview;
