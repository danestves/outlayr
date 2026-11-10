import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsRecap = {
    content: {
        card: {
            first: insert(t({ en: "Spent {{amount}} in {{month}}", es: "Gasté {{amount}} en {{month}}" })),
            firstPlain: insert(t({ en: "Logged {{month}} with Outlayr", es: "Registré {{month}} con Outlayr" })),
            less: insert(
                t({ en: "Spent {{percent}}% less than {{month}}", es: "Gasté {{percent}}% menos que en {{month}}" })
            ),
            more: insert(
                t({ en: "Spent {{percent}}% more than {{month}}", es: "Gasté {{percent}}% más que en {{month}}" })
            ),
            same: insert(t({ en: "Spent the same as {{month}}", es: "Gasté lo mismo que en {{month}}" })),
            days: insert(
                t({ en: "{{logged}} of {{total}} days logged", es: "{{logged}} de {{total}} días registrados" })
            ),
            url: t({ en: "tryoutlayr.com", es: "tryoutlayr.com" }),
        },
        caught: {
            below: t({ en: "Below your usual", es: "Por debajo de lo habitual en" }),
            belowLine: insert(
                t({ en: "Your 3 month average is {{amount}}", es: "Tu promedio de 3 meses es {{amount}}" })
            ),
            none: t({
                en: "Nothing to count this month. Budgets and a few months of history make this list.",
                es: "Nada que contar este mes. Los presupuestos y unos meses de historial llenan esta lista.",
            }),
            over: insert(
                t({ en: "Over {{count}} of {{total}} budgets", es: "Excediste {{count}} de {{total}} presupuestos" })
            ),
            overBy: insert(t({ en: "{{name}} by {{amount}}", es: "{{name}} por {{amount}}" })),
            pro: t({ en: "Pro this month", es: "Pro este mes" }),
            proLine: insert(
                t({ en: "{{kept}} kept against {{cost}} for Pro.", es: "{{kept}} ahorrados frente a {{cost}} de Pro." })
            ),
            seeBudgets: t({ en: "See budgets", es: "Ver presupuestos" }),
            title: t({ en: "What Outlayr caught", es: "Lo que detectó Outlayr" }),
            under: t({ en: "Under your budgets", es: "Dentro de tus presupuestos" }),
            underLine: insert(
                t({
                    en: "{{kept}} of {{total}} budgets kept: {{names}}",
                    es: "{{kept}} de {{total}} presupuestos cumplidos: {{names}}",
                })
            ),
        },
        days: {
            logged: insert(t({ en: "{{logged}} of {{total}}", es: "{{logged}} de {{total}}" })),
            title: t({ en: "Days logged", es: "Días registrados" }),
        },
        dialog: {
            amounts: t({ en: "Show amounts", es: "Mostrar montos" }),
            amountsHint: t({ en: "Off keeps it to percentages.", es: "Apagado se queda en porcentajes." }),
            close: t({ en: "Close", es: "Cerrar" }),
            copied: t({ en: "Copied", es: "Copiada" }),
            copy: t({ en: "Copy image", es: "Copiar imagen" }),
            download: t({ en: "Download", es: "Descargar" }),
            failed: t({ en: "The card could not be made.", es: "No se pudo crear la tarjeta." }),
            note: t({
                en: "Only this card leaves your account. No merchants or accounts.",
                es: "Solo esta tarjeta sale de tu cuenta. Sin comercios ni cuentas.",
            }),
            preview: t({ en: "Recap card preview", es: "Vista previa de la tarjeta" }),
            share: t({ en: "Share", es: "Compartir" }),
            size: t({ en: "Size", es: "Tamaño" }),
            title: t({ en: "Share recap", es: "Compartir resumen" }),
        },
        empty: {
            add: t({ en: "Add entry", es: "Agregar movimiento" }),
            line: t({
                en: "No savings figure this month. It comes back after a month under your budgets or below your usual spending.",
                es: "No hay cifra de ahorro este mes. Vuelve después de un mes dentro de tus presupuestos o por debajo de tu gasto habitual.",
            }),
            title: insert(t({ en: "Nothing logged in {{month}}.", es: "No registraste nada en {{month}}." })),
        },
        kpi: {
            allDays: t({ en: "Every day logged", es: "Todos los días registrados" }),
            average: insert(
                t({ en: "Your 3 month average is {{amount}}", es: "Tu promedio de 3 meses es {{amount}}" })
            ),
            below: insert(t({ en: "Below your usual {{name}}", es: "Por debajo de tu {{name}} habitual" })),
            belowPlain: t({ en: "Below your usual", es: "Por debajo de lo habitual" }),
            budgetsKept: insert(
                t({ en: "{{kept}} of {{total}} budgets kept", es: "{{kept}} de {{total}} presupuestos cumplidos" })
            ),
            days: t({ en: "Days logged", es: "Días registrados" }),
            daysMissing: insert(t({ en: "{{count}} days without an entry", es: "{{count}} días sin movimientos" })),
            daysOf: insert(t({ en: "{{logged}} of {{total}}", es: "{{logged}} de {{total}}" })),
            noAverage: t({ en: "No average yet", es: "Aún sin promedio" }),
            noBudgets: t({ en: "No budgets this month", es: "Sin presupuestos este mes" }),
            nothingYet: t({ en: "Nothing yet", es: "Nada aún" }),
            oneDayMissing: t({ en: "1 day without an entry", es: "1 día sin movimientos" }),
            spent: t({ en: "Spent", es: "Gastado" }),
            under: t({ en: "Under your budgets", es: "Dentro de tus presupuestos" }),
            versus: insert(t({ en: "vs {{month}}", es: "vs {{month}}" })),
        },
        month: {
            next: t({ en: "Next month", es: "Mes siguiente" }),
            previous: t({ en: "Previous month", es: "Mes anterior" }),
        },
        movers: {
            title: t({ en: "Movers", es: "Cambios" }),
        },
        share: insert(t({ en: "Share my {{month}}", es: "Compartir mi {{month}}" })),
        where: {
            categories: insert(t({ en: "{{count}} categories", es: "{{count}} categorías" })),
            category: t({ en: "Category", es: "Categoría" }),
            ofSpending: t({ en: "Of spending", es: "Del gasto" }),
            share: t({ en: "Share", es: "Proporción" }),
            spent: t({ en: "Spent", es: "Gastado" }),
            title: t({ en: "Where it went", es: "En qué se fue" }),
            versus: insert(t({ en: "vs {{month}}", es: "vs {{month}}" })),
        },
    },
    key: "dashboard-insights-recap",
} satisfies Dictionary;

export default dashboardInsightsRecap;
