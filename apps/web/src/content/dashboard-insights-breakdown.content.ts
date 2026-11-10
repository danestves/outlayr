import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsBreakdown = {
    content: {
        by: {
            category: t({ en: "Category", es: "Categoría" }),
            label: t({ en: "Group by", es: "Agrupar por" }),
            merchant: t({ en: "Merchant", es: "Comercio" }),
            subcategory: t({ en: "Subcategory", es: "Subcategoría" }),
            tag: t({ en: "Tag", es: "Etiqueta" }),
        },
        cards: {
            byDay: t({ en: "By day", es: "Por día" }),
            clearCategory: t({ en: "Clear category", es: "Quitar categoría" }),
            byMonth: t({ en: "By month", es: "Por mes" }),
            entries: t({ en: "Entries", es: "Movimientos" }),
            open: insert(t({ en: "Open {{name}}", es: "Abrir {{name}}" })),
            openTag: t({ en: "Open tag", es: "Abrir etiqueta" }),
            perDay: insert(t({ en: "{{amount}} a day", es: "{{amount}} al día" })),
            peak: insert(t({ en: "{{amount}} on {{date}}, {{name}}", es: "{{amount}} el {{date}}, {{name}}" })),
            peakPlain: insert(t({ en: "{{amount}} on {{date}}", es: "{{amount}} el {{date}}" })),
            seeAll: insert(t({ en: "See all {{count}}", es: "Ver los {{count}}" })),
            subcategories: t({ en: "Subcategories", es: "Subcategorías" }),
            tagByWeek: insert(t({ en: "{{tag}} by week", es: "{{tag}} por semana" })),
            taggedSpend: t({ en: "Tagged spend", es: "Gasto etiquetado" }),
            topMerchants: t({ en: "Top merchants", es: "Principales comercios" }),
        },
        chart: {
            day: insert(t({ en: "{{name}} on {{date}}", es: "{{name}} el {{date}}" })),
            label: t({ en: "Spending by day", es: "Gasto por día" }),
            labelMonth: t({ en: "Spending by month", es: "Gasto por mes" }),
            other: t({ en: "Everything else", es: "Todo lo demás" }),
            ofTotal: insert(t({ en: "of {{amount}}", es: "de {{amount}}" })),
            weekRange: insert(t({ en: "{{from}} to {{to}}", es: "{{from}} a {{to}}" })),
        },
        compare: {
            average: {
                month: t({ en: "3 month average", es: "Promedio de 3 meses" }),
                week: t({ en: "3 week average", es: "Promedio de 3 semanas" }),
                year: t({ en: "3 year average", es: "Promedio de 3 años" }),
            },
            bases: t({ en: "Compare with", es: "Comparar con" }),
            change: t({ en: "Change", es: "Cambio" }),
            chip: t({ en: "Compare", es: "Comparar" }),
            chipTo: insert(t({ en: "Compare to {{period}}", es: "Comparar con {{period}}" })),
            current: insert(t({ en: "{{period}}, in category color", es: "{{period}}, en el color de la categoría" })),
            title: insert(t({ en: "{{base}} vs {{current}}", es: "{{base}} vs {{current}}" })),
            off: t({ en: "Stop comparing", es: "Dejar de comparar" }),
        },
        empty: {
            add: t({ en: "Add entry", es: "Agregar movimiento" }),
            income: insert(
                t({
                    en: "Your {{amount}} of income is under Income above.",
                    es: "Tus {{amount}} de ingresos están en Ingresos, arriba.",
                })
            ),
            nothingIncome: t({ en: "No income here yet.", es: "Aún no hay ingresos aquí." }),
            nothingNet: t({ en: "Nothing moved here yet.", es: "Aún no hay movimientos aquí." }),
            nothingSpent: {
                month: t({ en: "Nothing spent this month.", es: "No hay gastos este mes." }),
                week: t({ en: "Nothing spent this week.", es: "No hay gastos esta semana." }),
                year: t({ en: "Nothing spent this year.", es: "No hay gastos este año." }),
            },
            title: t({ en: "Nothing to chart", es: "Nada que graficar" }),
        },
        kpi: {
            budgetLabel: insert(t({ en: "Budget {{amount}}", es: "Presupuesto {{amount}}" })),
            byDay: t({ en: "By day", es: "Por día" }),
            categories: t({ en: "Categories", es: "Categorías" }),
            change: t({ en: "Change", es: "Cambio" }),
            entries: t({ en: "Entries", es: "Movimientos" }),
            income: t({ en: "Income", es: "Ingresos" }),
            left: insert(t({ en: "{{amount}} left", es: "{{amount}} disponibles" })),
            merchants: t({ en: "Merchants", es: "Comercios" }),
            mostVisited: t({ en: "Most visited", es: "Más visitado" }),
            net: t({ en: "Net", es: "Neto" }),
            over: insert(t({ en: "{{amount}} over", es: "{{amount}} de más" })),
            spent: t({ en: "Spent", es: "Gastado" }),
            subcategories: t({ en: "Subcategories", es: "Subcategorías" }),
            tagged: t({ en: "Tagged", es: "Etiquetado" }),
            tagsUsed: t({ en: "Tags used", es: "Etiquetas usadas" }),
            untagged: t({ en: "Untagged", es: "Sin etiqueta" }),
        },
        metric: {
            income: t({ en: "Income", es: "Ingresos" }),
            label: t({ en: "Show", es: "Mostrar" }),
            net: t({ en: "Net", es: "Neto" }),
            spent: t({ en: "Spent", es: "Gastado" }),
        },
        line: {
            alone: insert(
                t({
                    en: "{{name}} alone {{verb}} {{amount}}.",
                    es: "Solo {{name}} {{verb}} {{amount}}.",
                })
            ),
            added: t({ en: "added", es: "sumó" }),
            less: insert(t({ en: "{{amount}} less than {{period}}.", es: "{{amount}} menos que en {{period}}." })),
            more: insert(t({ en: "{{amount}} more than {{period}}.", es: "{{amount}} más que en {{period}}." })),
            share: insert(t({ en: "{{share}} of {{period}}.", es: "{{share}} de {{period}}." })),
            tag: insert(
                t({
                    en: "{{amount}} more on {{tag}} than {{period}}.",
                    es: "{{amount}} más en {{tag}} que en {{period}}.",
                })
            ),
            tagLess: insert(
                t({
                    en: "{{amount}} less on {{tag}} than {{period}}.",
                    es: "{{amount}} menos en {{tag}} que en {{period}}.",
                })
            ),
            top: insert(
                t({
                    en: "Your top {{count}} merchants, after {{skipped}}, took {{share}} of {{period}}.",
                    es: "Tus {{count}} comercios principales, después de {{skipped}}, sumaron {{share}} de {{period}}.",
                })
            ),
            topPlain: insert(
                t({
                    en: "Your top {{count}} merchants took {{share}} of {{period}}.",
                    es: "Tus {{count}} comercios principales sumaron {{share}} de {{period}}.",
                })
            ),
            took: t({ en: "took off", es: "restó" }),
        },
        table: {
            account: t({ en: "Account", es: "Cuenta" }),
            amount: t({ en: "Amount", es: "Monto" }),
            average: t({ en: "Average", es: "Promedio" }),
            category: t({ en: "Category", es: "Categoría" }),
            change: t({ en: "Change", es: "Cambio" }),
            collapse: t({ en: "Show fewer", es: "Mostrar menos" }),
            date: t({ en: "Date", es: "Fecha" }),
            entries: t({ en: "Entries", es: "Movimientos" }),
            expand: t({ en: "Show all", es: "Mostrar todos" }),
            fresh: t({ en: "New", es: "Nuevo" }),
            merchant: t({ en: "Merchant", es: "Comercio" }),
            more: insert(t({ en: "{{count}} more", es: "{{count}} más" })),
            ofTotal: t({ en: "Of total", es: "Del total" }),
            percent: t({ en: "%", es: "%" }),
            share: t({ en: "Share", es: "Proporción" }),
            subcategory: t({ en: "Subcategory", es: "Subcategoría" }),
            tag: t({ en: "Tag", es: "Etiqueta" }),
            topCategory: t({ en: "Top category", es: "Categoría principal" }),
            total: t({ en: "Total", es: "Total" }),
            untagged: t({ en: "Untagged", es: "Sin etiqueta" }),
            versus: insert(t({ en: "vs {{period}}", es: "vs {{period}}" })),
        },
    },
    key: "dashboard-insights-breakdown",
} satisfies Dictionary;

export default dashboardInsightsBreakdown;
