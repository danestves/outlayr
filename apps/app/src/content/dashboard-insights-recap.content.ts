import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsRecap = {
    content: {
        card: {
            first: insert(
                t({
                    en: "Spent {{amount}} in {{month}}",
                    de: "{{amount}} im {{month}} ausgegeben",
                    es: "Gasté {{amount}} en {{month}}",
                })
            ),
            firstPlain: insert(
                t({
                    en: "Logged {{month}} with Outlayr",
                    de: "{{month}} mit Outlayr erfasst",
                    es: "Registré {{month}} con Outlayr",
                })
            ),
            less: insert(
                t({
                    en: "Spent {{percent}}% less than {{month}}",
                    de: "{{percent}} % weniger ausgegeben als im {{month}}",
                    es: "Gasté {{percent}}% menos que en {{month}}",
                })
            ),
            more: insert(
                t({
                    en: "Spent {{percent}}% more than {{month}}",
                    de: "{{percent}} % mehr ausgegeben als im {{month}}",
                    es: "Gasté {{percent}}% más que en {{month}}",
                })
            ),
            same: insert(
                t({
                    en: "Spent the same as {{month}}",
                    de: "Genauso viel ausgegeben wie im {{month}}",
                    es: "Gasté lo mismo que en {{month}}",
                })
            ),
            days: insert(
                t({
                    en: "{{logged}} of {{total}} days logged",
                    de: "{{logged}} von {{total}} Tagen erfasst",
                    es: "{{logged}} de {{total}} días registrados",
                })
            ),
            url: t({ en: "tryoutlayr.com", de: "tryoutlayr.com", es: "tryoutlayr.com" }),
        },
        caught: {
            below: t({ en: "Below your usual", de: "Unter deinem Üblichen", es: "Por debajo de lo habitual en" }),
            belowLine: insert(
                t({
                    en: "Your 3 month average is {{amount}}",
                    de: "Dein 3-Monats-Durchschnitt liegt bei {{amount}}",
                    es: "Tu promedio de 3 meses es {{amount}}",
                })
            ),
            none: t({
                en: "Nothing to count this month. Budgets and a few months of history make this list.",
                de: "Diesen Monat gibt es nichts zu zählen. Budgets und ein paar Monate Verlauf füllen diese Liste.",
                es: "Nada que contar este mes. Los presupuestos y unos meses de historial llenan esta lista.",
            }),
            over: insert(
                t({
                    en: "Over {{count}} of {{total}} budgets",
                    de: "Über {{count}} von {{total}} Budgets",
                    es: "Excediste {{count}} de {{total}} presupuestos",
                })
            ),
            overBy: insert(
                t({ en: "{{name}} by {{amount}}", de: "{{name}} um {{amount}}", es: "{{name}} por {{amount}}" })
            ),
            pro: t({ en: "Pro this month", de: "Pro diesen Monat", es: "Pro este mes" }),
            proLine: insert(
                t({
                    en: "{{kept}} kept against {{cost}} for Pro.",
                    de: "{{kept}} behalten gegenüber {{cost}} für Pro.",
                    es: "{{kept}} ahorrados frente a {{cost}} de Pro.",
                })
            ),
            seeBudgets: t({ en: "See budgets", de: "Budgets ansehen", es: "Ver presupuestos" }),
            title: t({ en: "What Outlayr caught", de: "Was Outlayr aufgefallen ist", es: "Lo que detectó Outlayr" }),
            under: t({ en: "Under your budgets", de: "Unter deinen Budgets", es: "Dentro de tus presupuestos" }),
            underLine: insert(
                t({
                    en: "{{kept}} of {{total}} budgets kept: {{names}}",
                    de: "{{kept}} von {{total}} Budgets eingehalten: {{names}}",
                    es: "{{kept}} de {{total}} presupuestos cumplidos: {{names}}",
                })
            ),
        },
        days: {
            logged: insert(
                t({ en: "{{logged}} of {{total}}", de: "{{logged}} von {{total}}", es: "{{logged}} de {{total}}" })
            ),
            title: t({ en: "Days logged", de: "Erfasste Tage", es: "Días registrados" }),
        },
        dialog: {
            amounts: t({ en: "Show amounts", de: "Beträge anzeigen", es: "Mostrar montos" }),
            amountsHint: t({
                en: "Off keeps it to percentages.",
                de: "Aus zeigt nur Prozentwerte.",
                es: "Apagado se queda en porcentajes.",
            }),
            close: t({ en: "Close", de: "Schließen", es: "Cerrar" }),
            copied: t({ en: "Copied", de: "Kopiert", es: "Copiada" }),
            copy: t({ en: "Copy image", de: "Bild kopieren", es: "Copiar imagen" }),
            download: t({ en: "Download", de: "Herunterladen", es: "Descargar" }),
            failed: t({
                en: "The card could not be made.",
                de: "Die Karte konnte nicht erstellt werden.",
                es: "No se pudo crear la tarjeta.",
            }),
            note: t({
                en: "Only this card leaves your account. No merchants or accounts.",
                de: "Nur diese Karte verlässt dein Konto. Keine Händler oder Konten.",
                es: "Solo esta tarjeta sale de tu cuenta. Sin comercios ni cuentas.",
            }),
            preview: t({
                en: "Recap card preview",
                de: "Vorschau der Rückblick-Karte",
                es: "Vista previa de la tarjeta",
            }),
            share: t({ en: "Share", de: "Teilen", es: "Compartir" }),
            size: t({ en: "Size", de: "Größe", es: "Tamaño" }),
            title: t({ en: "Share recap", de: "Rückblick teilen", es: "Compartir resumen" }),
        },
        empty: {
            add: t({ en: "Add entry", de: "Eintrag hinzufügen", es: "Agregar movimiento" }),
            line: t({
                en: "No savings figure this month. It comes back after a month under your budgets or below your usual spending.",
                de: "Diesen Monat gibt es keinen Sparbetrag. Er kommt wieder, sobald du einen Monat unter deinen Budgets oder unter deinen üblichen Ausgaben bleibst.",
                es: "No hay cifra de ahorro este mes. Vuelve después de un mes dentro de tus presupuestos o por debajo de tu gasto habitual.",
            }),
            title: insert(
                t({
                    en: "Nothing logged in {{month}}.",
                    de: "Im {{month}} wurde nichts erfasst.",
                    es: "No registraste nada en {{month}}.",
                })
            ),
        },
        kpi: {
            allDays: t({ en: "Every day logged", de: "Jeden Tag erfasst", es: "Todos los días registrados" }),
            average: insert(
                t({
                    en: "Your 3 month average is {{amount}}",
                    de: "Dein 3-Monats-Durchschnitt liegt bei {{amount}}",
                    es: "Tu promedio de 3 meses es {{amount}}",
                })
            ),
            below: insert(
                t({
                    en: "Below your usual {{name}}",
                    de: "Unter deinem üblichen {{name}}",
                    es: "Por debajo de tu {{name}} habitual",
                })
            ),
            belowPlain: t({ en: "Below your usual", de: "Unter deinem Üblichen", es: "Por debajo de lo habitual" }),
            budgetsKept: insert(
                t({
                    en: "{{kept}} of {{total}} budgets kept",
                    de: "{{kept}} von {{total}} Budgets eingehalten",
                    es: "{{kept}} de {{total}} presupuestos cumplidos",
                })
            ),
            days: t({ en: "Days logged", de: "Erfasste Tage", es: "Días registrados" }),
            daysMissing: insert(
                t({
                    en: "{{count}} days without an entry",
                    de: "{{count}} Tage ohne Eintrag",
                    es: "{{count}} días sin movimientos",
                })
            ),
            daysOf: insert(
                t({ en: "{{logged}} of {{total}}", de: "{{logged}} von {{total}}", es: "{{logged}} de {{total}}" })
            ),
            noAverage: t({ en: "No average yet", de: "Noch kein Durchschnitt", es: "Aún sin promedio" }),
            noBudgets: t({
                en: "No budgets this month",
                de: "Diesen Monat keine Budgets",
                es: "Sin presupuestos este mes",
            }),
            nothingYet: t({ en: "Nothing yet", de: "Noch nichts", es: "Nada aún" }),
            oneDayMissing: t({ en: "1 day without an entry", de: "1 Tag ohne Eintrag", es: "1 día sin movimientos" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
            under: t({ en: "Under your budgets", de: "Unter deinen Budgets", es: "Dentro de tus presupuestos" }),
            versus: insert(t({ en: "vs {{month}}", de: "vs. {{month}}", es: "vs {{month}}" })),
        },
        month: {
            next: t({ en: "Next month", de: "Nächster Monat", es: "Mes siguiente" }),
            previous: t({ en: "Previous month", de: "Voriger Monat", es: "Mes anterior" }),
        },
        movers: {
            title: t({ en: "Movers", de: "Veränderungen", es: "Cambios" }),
        },
        share: insert(t({ en: "Share my {{month}}", de: "Meinen {{month}} teilen", es: "Compartir mi {{month}}" })),
        where: {
            categories: insert(
                t({ en: "{{count}} categories", de: "{{count}} Kategorien", es: "{{count}} categorías" })
            ),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría" }),
            ofSpending: t({ en: "Of spending", de: "Von den Ausgaben", es: "Del gasto" }),
            share: t({ en: "Share", de: "Anteil", es: "Proporción" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
            title: t({ en: "Where it went", de: "Wohin es ging", es: "En qué se fue" }),
            versus: insert(t({ en: "vs {{month}}", de: "vs. {{month}}", es: "vs {{month}}" })),
        },
    },
    key: "dashboard-insights-recap",
} satisfies Dictionary;

export default dashboardInsightsRecap;
