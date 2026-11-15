import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsBreakdown = {
    content: {
        by: {
            category: t({ en: "Category", de: "Kategorie", es: "Categoría" }),
            label: t({ en: "Group by", de: "Gruppieren nach", es: "Agrupar por" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio" }),
            subcategory: t({ en: "Subcategory", de: "Unterkategorie", es: "Subcategoría" }),
            tag: t({ en: "Tag", de: "Tag", es: "Etiqueta" }),
        },
        cards: {
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día" }),
            clearCategory: t({ en: "Clear category", de: "Kategorie zurücksetzen", es: "Quitar categoría" }),
            byMonth: t({ en: "By month", de: "Nach Monat", es: "Por mes" }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos" }),
            open: insert(t({ en: "Open {{name}}", de: "{{name}} öffnen", es: "Abrir {{name}}" })),
            openTag: t({ en: "Open tag", de: "Tag öffnen", es: "Abrir etiqueta" }),
            perDay: insert(t({ en: "{{amount}} a day", de: "{{amount}} am Tag", es: "{{amount}} al día" })),
            peak: insert(
                t({
                    en: "{{amount}} on {{date}}, {{name}}",
                    de: "{{amount}} am {{date}}, {{name}}",
                    es: "{{amount}} el {{date}}, {{name}}",
                })
            ),
            peakPlain: insert(
                t({ en: "{{amount}} on {{date}}", de: "{{amount}} am {{date}}", es: "{{amount}} el {{date}}" })
            ),
            seeAll: insert(t({ en: "See all {{count}}", de: "Alle {{count}} anzeigen", es: "Ver los {{count}}" })),
            subcategories: t({ en: "Subcategories", de: "Unterkategorien", es: "Subcategorías" }),
            tagByWeek: insert(t({ en: "{{tag}} by week", de: "{{tag}} nach Woche", es: "{{tag}} por semana" })),
            taggedSpend: t({ en: "Tagged spend", de: "Ausgaben mit Tag", es: "Gasto etiquetado" }),
            topMerchants: t({ en: "Top merchants", de: "Top-Händler", es: "Principales comercios" }),
        },
        chart: {
            day: insert(t({ en: "{{name}} on {{date}}", de: "{{name}} am {{date}}", es: "{{name}} el {{date}}" })),
            label: t({ en: "Spending by day", de: "Ausgaben pro Tag", es: "Gasto por día" }),
            labelMonth: t({ en: "Spending by month", de: "Ausgaben pro Monat", es: "Gasto por mes" }),
            other: t({ en: "Everything else", de: "Alles andere", es: "Todo lo demás" }),
            ofTotal: insert(t({ en: "of {{amount}}", de: "von {{amount}}", es: "de {{amount}}" })),
            weekRange: insert(t({ en: "{{from}} to {{to}}", de: "{{from}} bis {{to}}", es: "{{from}} a {{to}}" })),
        },
        compare: {
            average: {
                month: t({ en: "3 month average", de: "3-Monats-Durchschnitt", es: "Promedio de 3 meses" }),
                week: t({ en: "3 week average", de: "3-Wochen-Durchschnitt", es: "Promedio de 3 semanas" }),
                year: t({ en: "3 year average", de: "3-Jahres-Durchschnitt", es: "Promedio de 3 años" }),
            },
            bases: t({ en: "Compare with", de: "Vergleichen mit", es: "Comparar con" }),
            change: t({ en: "Change", de: "Veränderung", es: "Cambio" }),
            chip: t({ en: "Compare", de: "Vergleichen", es: "Comparar" }),
            chipTo: insert(
                t({ en: "Compare to {{period}}", de: "Mit {{period}} vergleichen", es: "Comparar con {{period}}" })
            ),
            current: insert(
                t({
                    en: "{{period}}, in category color",
                    de: "{{period}}, in der Kategoriefarbe",
                    es: "{{period}}, en el color de la categoría",
                })
            ),
            title: insert(
                t({ en: "{{base}} vs {{current}}", de: "{{base}} vs. {{current}}", es: "{{base}} vs {{current}}" })
            ),
            off: t({ en: "Stop comparing", de: "Vergleich beenden", es: "Dejar de comparar" }),
        },
        empty: {
            add: t({ en: "Add entry", de: "Eintrag hinzufügen", es: "Agregar movimiento" }),
            income: insert(
                t({
                    en: "Your {{amount}} of income is under Income above.",
                    de: "Deine {{amount}} Einnahmen stehen oben unter Einnahmen.",
                    es: "Tus {{amount}} de ingresos están en Ingresos, arriba.",
                })
            ),
            nothingIncome: t({
                en: "No income here yet.",
                de: "Hier noch keine Einnahmen.",
                es: "Aún no hay ingresos aquí.",
            }),
            nothingNet: t({
                en: "Nothing moved here yet.",
                de: "Hier hat sich noch nichts bewegt.",
                es: "Aún no hay movimientos aquí.",
            }),
            nothingSpent: {
                month: t({
                    en: "Nothing spent this month.",
                    de: "Diesen Monat nichts ausgegeben.",
                    es: "No hay gastos este mes.",
                }),
                week: t({
                    en: "Nothing spent this week.",
                    de: "Diese Woche nichts ausgegeben.",
                    es: "No hay gastos esta semana.",
                }),
                year: t({
                    en: "Nothing spent this year.",
                    de: "Dieses Jahr nichts ausgegeben.",
                    es: "No hay gastos este año.",
                }),
            },
            title: t({ en: "Nothing to chart", de: "Nichts zum Darstellen", es: "Nada que graficar" }),
        },
        kpi: {
            budgetLabel: insert(t({ en: "Budget {{amount}}", de: "Budget {{amount}}", es: "Presupuesto {{amount}}" })),
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día" }),
            categories: t({ en: "Categories", de: "Kategorien", es: "Categorías" }),
            change: t({ en: "Change", de: "Veränderung", es: "Cambio" }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos" }),
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos" }),
            left: insert(t({ en: "{{amount}} left", de: "{{amount}} übrig", es: "{{amount}} disponibles" })),
            merchants: t({ en: "Merchants", de: "Händler", es: "Comercios" }),
            mostVisited: t({ en: "Most visited", de: "Am häufigsten besucht", es: "Más visitado" }),
            net: t({ en: "Net", de: "Netto", es: "Neto" }),
            over: insert(t({ en: "{{amount}} over", de: "{{amount}} drüber", es: "{{amount}} de más" })),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
            subcategories: t({ en: "Subcategories", de: "Unterkategorien", es: "Subcategorías" }),
            tagged: t({ en: "Tagged", de: "Mit Tag", es: "Etiquetado" }),
            tagsUsed: t({ en: "Tags used", de: "Verwendete Tags", es: "Etiquetas usadas" }),
            untagged: t({ en: "Untagged", de: "Ohne Tag", es: "Sin etiqueta" }),
        },
        metric: {
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos" }),
            label: t({ en: "Show", de: "Anzeigen", es: "Mostrar" }),
            net: t({ en: "Net", de: "Netto", es: "Neto" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
        },
        line: {
            alone: insert(
                t({
                    en: "{{name}} alone {{verb}} {{amount}}.",
                    de: "{{name}} allein: {{verb}} {{amount}}.",
                    es: "Solo {{name}} {{verb}} {{amount}}.",
                })
            ),
            added: t({ en: "added", de: "plus", es: "sumó" }),
            less: insert(
                t({
                    en: "{{amount}} less than {{period}}.",
                    de: "{{amount}} weniger als {{period}}.",
                    es: "{{amount}} menos que en {{period}}.",
                })
            ),
            more: insert(
                t({
                    en: "{{amount}} more than {{period}}.",
                    de: "{{amount}} mehr als {{period}}.",
                    es: "{{amount}} más que en {{period}}.",
                })
            ),
            share: insert(
                t({ en: "{{share}} of {{period}}.", de: "{{share}} von {{period}}.", es: "{{share}} de {{period}}." })
            ),
            tag: insert(
                t({
                    en: "{{amount}} more on {{tag}} than {{period}}.",
                    de: "{{amount}} mehr für {{tag}} als {{period}}.",
                    es: "{{amount}} más en {{tag}} que en {{period}}.",
                })
            ),
            tagLess: insert(
                t({
                    en: "{{amount}} less on {{tag}} than {{period}}.",
                    de: "{{amount}} weniger für {{tag}} als {{period}}.",
                    es: "{{amount}} menos en {{tag}} que en {{period}}.",
                })
            ),
            top: insert(
                t({
                    en: "Your top {{count}} merchants, after {{skipped}}, took {{share}} of {{period}}.",
                    de: "Deine Top {{count}} Händler, nach {{skipped}}, machten {{share}} von {{period}} aus.",
                    es: "Tus {{count}} comercios principales, después de {{skipped}}, sumaron {{share}} de {{period}}.",
                })
            ),
            topPlain: insert(
                t({
                    en: "Your top {{count}} merchants took {{share}} of {{period}}.",
                    de: "Deine Top {{count}} Händler machten {{share}} von {{period}} aus.",
                    es: "Tus {{count}} comercios principales sumaron {{share}} de {{period}}.",
                })
            ),
            took: t({ en: "took off", de: "minus", es: "restó" }),
        },
        table: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto" }),
            average: t({ en: "Average", de: "Durchschnitt", es: "Promedio" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría" }),
            change: t({ en: "Change", de: "Veränderung", es: "Cambio" }),
            collapse: t({ en: "Show fewer", de: "Weniger anzeigen", es: "Mostrar menos" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha" }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos" }),
            expand: t({ en: "Show all", de: "Alle anzeigen", es: "Mostrar todos" }),
            fresh: t({ en: "New", de: "Neu", es: "Nuevo" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio" }),
            more: insert(t({ en: "{{count}} more", de: "{{count}} weitere", es: "{{count}} más" })),
            ofTotal: t({ en: "Of total", de: "Vom Gesamten", es: "Del total" }),
            percent: t({ en: "%", de: "%", es: "%" }),
            share: t({ en: "Share", de: "Anteil", es: "Proporción" }),
            subcategory: t({ en: "Subcategory", de: "Unterkategorie", es: "Subcategoría" }),
            tag: t({ en: "Tag", de: "Tag", es: "Etiqueta" }),
            topCategory: t({ en: "Top category", de: "Top-Kategorie", es: "Categoría principal" }),
            total: t({ en: "Total", de: "Gesamt", es: "Total" }),
            untagged: t({ en: "Untagged", de: "Ohne Tag", es: "Sin etiqueta" }),
            versus: insert(t({ en: "vs {{period}}", de: "vs. {{period}}", es: "vs {{period}}" })),
        },
    },
    key: "dashboard-insights-breakdown",
} satisfies Dictionary;

export default dashboardInsightsBreakdown;
