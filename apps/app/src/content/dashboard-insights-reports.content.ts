import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsReports = {
    content: {
        accounts: {
            all: t({ en: "All accounts", de: "Alle Konten", es: "Todas las cuentas" }),
            count: insert(t({ en: "{{count}} accounts", de: "{{count}} Konten", es: "{{count}} cuentas" })),
            label: t({ en: "Accounts", de: "Konten", es: "Cuentas" }),
        },
        bar: {
            export: t({ en: "Export", de: "Exportieren", es: "Exportar" }),
            newReport: t({ en: "New report", de: "Neuer Bericht", es: "Nuevo reporte" }),
            saveReport: t({ en: "Save report", de: "Bericht speichern", es: "Guardar reporte" }),
            share: t({ en: "Share", de: "Teilen", es: "Compartir" }),
            update: t({ en: "Update report", de: "Bericht aktualisieren", es: "Actualizar reporte" }),
        },
        by: insert(
            t({ en: "{{columns}} by {{rows}}", de: "{{columns}} nach {{rows}}", es: "{{columns}} por {{rows}}" })
        ),
        rowsBy: insert(
            t({ en: "{{rows}} by {{columns}}", de: "{{rows}} nach {{columns}}", es: "{{rows}} por {{columns}}" })
        ),
        chart: {
            label: insert(
                t({
                    en: "{{measure}} by {{rows}} and {{columns}}",
                    de: "{{measure}} nach {{rows}} und {{columns}}",
                    es: "{{measure}} por {{rows}} y {{columns}}",
                })
            ),
        },
        chips: {
            columns: t({ en: "Columns", de: "Spalten", es: "Columnas" }),
            filter: t({ en: "Filter", de: "Filter", es: "Filtro" }),
            measure: t({ en: "Measure", de: "Kennzahl", es: "Medida" }),
            removeTag: insert(
                t({ en: "Remove tag {{name}}", de: "Tag {{name}} entfernen", es: "Quitar la etiqueta {{name}}" })
            ),
            rows: t({ en: "Rows", de: "Zeilen", es: "Filas" }),
            tags: t({ en: "Tag", de: "Tag", es: "Etiqueta" }),
            tagsNone: t({ en: "No tags yet", de: "Noch keine Tags", es: "Aún no hay etiquetas" }),
        },
        csv: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha" }),
            description: t({ en: "Description", de: "Beschreibung", es: "Descripción" }),
            income: t({ en: "Income", de: "Einnahmen", es: "Ingreso" }),
            spending: t({ en: "Spending", de: "Ausgaben", es: "Gasto" }),
            type: t({ en: "Type", de: "Typ", es: "Tipo" }),
        },
        deleting: {
            body: t({
                en: "Your entries stay. Only the saved report goes away.",
                de: "Deine Einträge bleiben. Nur der gespeicherte Bericht verschwindet.",
                es: "Tus movimientos se quedan. Solo se va el reporte guardado.",
            }),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar" }),
            confirm: t({ en: "Delete report", de: "Bericht löschen", es: "Eliminar reporte" }),
            title: insert(t({ en: "Delete {{name}}?", de: "{{name}} löschen?", es: "¿Eliminar {{name}}?" })),
        },
        dimensions: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio" }),
            subcategory: t({ en: "Subcategory", de: "Unterkategorie", es: "Subcategoría" }),
            tag: t({ en: "Tag", de: "Tag", es: "Etiqueta" }),
        },
        empty: {
            body: t({
                en: "Pick rows, columns and a range, then save it to come back to.",
                de: "Wähle Zeilen, Spalten und einen Zeitraum und speichere ihn, um später zurückzukommen.",
                es: "Elige filas, columnas y un rango, y guárdalo para volver a él.",
            }),
            newReport: t({ en: "New report", de: "Neuer Bericht", es: "Nuevo reporte" }),
            templates: {
                merchants: t({ en: "Top merchants", de: "Top-Händler", es: "Comercios principales" }),
                monthByCategory: t({ en: "Month by category", de: "Monat nach Kategorie", es: "Mes por categoría" }),
                sixMonths: t({ en: "Last 6 months", de: "Letzte 6 Monate", es: "Últimos 6 meses" }),
                tagsByQuarter: t({ en: "Tags by quarter", de: "Tags nach Quartal", es: "Etiquetas por trimestre" }),
                thisYear: t({ en: "This year", de: "Dieses Jahr", es: "Este año" }),
            },
            title: t({ en: "No reports yet", de: "Noch keine Berichte", es: "Aún no hay reportes" }),
        },
        exporting: {
            averages: t({
                en: "Average and comparison columns",
                de: "Spalten für Durchschnitt und Vergleich",
                es: "Columnas de promedio y comparación",
            }),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar" }),
            chart: t({ en: "Chart", de: "Diagramm", es: "Gráfico" }),
            chartNote: t({ en: "PDF only", de: "Nur PDF", es: "Solo PDF" }),
            csv: t({ en: "CSV", de: "CSV", es: "CSV" }),
            csvNote: t({
                en: "Table only, for spreadsheets",
                de: "Nur Tabelle, für Tabellenkalkulationen",
                es: "Solo la tabla, para hojas de cálculo",
            }),
            entries: t({
                en: "Every entry behind the totals",
                de: "Jeder Eintrag hinter den Summen",
                es: "Cada movimiento detrás de los totales",
            }),
            entriesNote: insert(t({ en: "{{count}} entries", de: "{{count}} Einträge", es: "{{count}} movimientos" })),
            fileName: t({ en: "File name", de: "Dateiname", es: "Nombre del archivo" }),
            format: t({ en: "Format", de: "Format", es: "Formato" }),
            pdf: t({ en: "PDF", de: "PDF", es: "PDF" }),
            pdfNote: t({
                en: "Chart and table, one page",
                de: "Diagramm und Tabelle, eine Seite",
                es: "Gráfico y tabla, una página",
            }),
            run: insert(t({ en: "Export {{format}}", de: "{{format}} exportieren", es: "Exportar {{format}}" })),
            table: t({ en: "Table", de: "Tabelle", es: "Tabla" }),
            tableNote: insert(
                t({
                    en: "{{rows}} rows, {{columns}}",
                    de: "{{rows}} Zeilen, {{columns}}",
                    es: "{{rows}} filas, {{columns}}",
                })
            ),
            title: insert(t({ en: "Export {{name}}", de: "{{name}} exportieren", es: "Exportar {{name}}" })),
        },
        groupings: {
            month: {
                average: t({ en: "Average month", de: "Durchschnittsmonat", es: "Mes promedio" }),
                many: t({ en: "months", de: "Monate", es: "meses" }),
                name: t({ en: "Month", de: "Monat", es: "Mes" }),
                one: t({ en: "month", de: "Monat", es: "mes" }),
            },
            none: {
                average: t({ en: "Average", de: "Durchschnitt", es: "Promedio" }),
                many: t({ en: "periods", de: "Zeiträume", es: "periodos" }),
                name: t({ en: "None", de: "Keine", es: "Ninguna" }),
                one: t({ en: "period", de: "Zeitraum", es: "periodo" }),
            },
            quarter: {
                average: t({ en: "Average quarter", de: "Durchschnittsquartal", es: "Trimestre promedio" }),
                many: t({ en: "quarters", de: "Quartale", es: "trimestres" }),
                name: t({ en: "Quarter", de: "Quartal", es: "Trimestre" }),
                one: t({ en: "quarter", de: "Quartal", es: "trimestre" }),
            },
            week: {
                average: t({ en: "Average week", de: "Durchschnittswoche", es: "Semana promedio" }),
                many: t({ en: "weeks", de: "Wochen", es: "semanas" }),
                name: t({ en: "Week", de: "Woche", es: "Semana" }),
                one: t({ en: "week", de: "Woche", es: "semana" }),
            },
            year: {
                average: t({ en: "Average year", de: "Durchschnittsjahr", es: "Año promedio" }),
                many: t({ en: "years", de: "Jahre", es: "años" }),
                name: t({ en: "Year", de: "Jahr", es: "Año" }),
                one: t({ en: "year", de: "Jahr", es: "año" }),
            },
        },
        kpi: {
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos" }),
            rise: insert(
                t({
                    en: "Biggest rise, {{from}} to {{to}}",
                    de: "Größter Anstieg, {{from}} bis {{to}}",
                    es: "Mayor alza, de {{from}} a {{to}}",
                })
            ),
            riseNone: t({ en: "Biggest rise", de: "Größter Anstieg", es: "Mayor alza" }),
            total: insert(
                t({
                    en: "Total, {{count}} {{unit}}",
                    de: "Gesamt, {{count}} {{unit}}",
                    es: "Total, {{count}} {{unit}}",
                })
            ),
            totalPlain: t({ en: "Total", de: "Gesamt", es: "Total" }),
        },
        library: {
            columns: {
                measure: t({ en: "Measure", de: "Kennzahl", es: "Medida" }),
                opened: t({ en: "Opened", de: "Geöffnet", es: "Abierto" }),
                range: t({ en: "Range", de: "Zeitraum", es: "Rango" }),
                report: t({ en: "Report", de: "Bericht", es: "Reporte" }),
                rowsByColumns: t({ en: "Rows by columns", de: "Zeilen nach Spalten", es: "Filas por columnas" }),
                sharing: t({ en: "Sharing", de: "Freigabe", es: "Compartido" }),
                total: t({ en: "Total", de: "Gesamt", es: "Total" }),
            },
            count: insert(t({ en: "{{count}} reports", de: "{{count}} Berichte", es: "{{count}} reportes" })),
            countOne: t({ en: "1 report", de: "1 Bericht", es: "1 reporte" }),
            noMatch: t({
                en: "No report is called that.",
                de: "Kein Bericht heißt so.",
                es: "Ningún reporte se llama así.",
            }),
            search: t({ en: "Search reports", de: "Berichte durchsuchen", es: "Buscar reportes" }),
            sharing: {
                all: t({ en: "All reports", de: "Alle Berichte", es: "Todos los reportes" }),
                elsewhere: insert(
                    t({
                        en: "{{count}} links are on for reports saved in another browser.",
                        de: "{{count}} Links sind für Berichte aktiv, die in einem anderen Browser gespeichert wurden.",
                        es: "Hay {{count}} enlaces activos de reportes guardados en otro navegador.",
                    })
                ),
                elsewhereOne: t({
                    en: "1 link is on for a report saved in another browser.",
                    de: "1 Link ist für einen Bericht aktiv, der in einem anderen Browser gespeichert wurde.",
                    es: "Hay 1 enlace activo de un reporte guardado en otro navegador.",
                }),
                filter: t({ en: "Shared", de: "Geteilt", es: "Compartidos" }),
                linkOn: t({ en: "Link on", de: "Link aktiv", es: "Enlace activo" }),
                none: t({
                    en: "No report matches this filter.",
                    de: "Kein Bericht passt zu diesem Filter.",
                    es: "Ningún reporte coincide con este filtro.",
                }),
                private: t({ en: "Private", de: "Privat", es: "Privado" }),
                turnOff: t({ en: "Turn them off", de: "Ausschalten", es: "Desactivarlos" }),
                turnOffOne: t({ en: "Turn it off", de: "Ausschalten", es: "Desactivarlo" }),
            },
            today: t({ en: "Today", de: "Heute", es: "Hoy" }),
        },
        measures: {
            average: t({ en: "Average per entry", de: "Durchschnitt pro Eintrag", es: "Promedio por movimiento" }),
            count: t({ en: "Entry count", de: "Anzahl der Einträge", es: "Cantidad de movimientos" }),
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos" }),
            net: t({ en: "Net", de: "Netto", es: "Neto" }),
            spending: t({ en: "Spending", de: "Ausgaben", es: "Gastos" }),
        },
        noData: {
            clear: t({ en: "Clear filters", de: "Filter zurücksetzen", es: "Quitar filtros" }),
            title: t({ en: "Nothing matches", de: "Nichts passt", es: "No hay coincidencias" }),
            withFilters: insert(
                t({
                    en: "No entries match {{filters}} from {{range}}.",
                    de: "Keine Einträge passen zu {{filters}} aus {{range}}.",
                    es: "Ningún movimiento coincide con {{filters}} de {{range}}.",
                })
            ),
            without: insert(
                t({
                    en: "No entries from {{range}}.",
                    de: "Keine Einträge aus {{range}}.",
                    es: "No hay movimientos de {{range}}.",
                })
            ),
        },
        range: {
            allTime: t({ en: "All time", de: "Gesamte Zeit", es: "Todo el tiempo" }),
            from: t({ en: "From", de: "Von", es: "Desde" }),
            label: t({ en: "Dates", de: "Daten", es: "Fechas" }),
            last: insert(
                t({ en: "Last {{count}} months", de: "Letzte {{count}} Monate", es: "Últimos {{count}} meses" })
            ),
            lastYear: t({ en: "Last year", de: "Letztes Jahr", es: "Año pasado" }),
            thisYear: t({ en: "This year", de: "Dieses Jahr", es: "Este año" }),
            to: t({ en: "To", de: "Bis", es: "Hasta" }),
            until: insert(t({ en: "{{from}} to {{to}}", de: "{{from}} bis {{to}}", es: "{{from}} a {{to}}" })),
        },
        renaming: {
            save: t({ en: "Rename", de: "Umbenennen", es: "Renombrar" }),
            title: t({ en: "Rename report", de: "Bericht umbenennen", es: "Renombrar reporte" }),
        },
        rowMenu: {
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar" }),
            duplicate: t({ en: "Duplicate", de: "Duplizieren", es: "Duplicar" }),
            export: t({ en: "Export", de: "Exportieren", es: "Exportar" }),
            more: insert(t({ en: "Actions for {{name}}", de: "Aktionen für {{name}}", es: "Acciones de {{name}}" })),
            open: t({ en: "Open", de: "Öffnen", es: "Abrir" }),
            rename: t({ en: "Rename", de: "Umbenennen", es: "Renombrar" }),
            share: t({ en: "Share link", de: "Link teilen", es: "Compartir enlace" }),
        },
        saved: {
            all: t({ en: "All reports", de: "Alle Berichte", es: "Todos los reportes" }),
            copy: insert(t({ en: "{{name}} copy", de: "{{name}} Kopie", es: "Copia de {{name}}" })),
            none: t({
                en: "Reports you save show up here.",
                de: "Berichte, die du speicherst, erscheinen hier.",
                es: "Los reportes que guardes aparecen aquí.",
            }),
            months: insert(t({ en: "{{count}} mo", de: "{{count}} Mon.", es: "{{count}} m" })),
            title: t({ en: "Saved", de: "Gespeichert", es: "Guardados" }),
            year: t({ en: "Year", de: "Jahr", es: "Año" }),
        },
        saving: {
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar" }),
            dates: t({ en: "Dates", de: "Daten", es: "Fechas" }),
            fixed: t({ en: "Keep these dates", de: "Diese Daten beibehalten", es: "Mantener estas fechas" }),
            name: t({ en: "Name", de: "Name", es: "Nombre" }),
            rolling: insert(
                t({
                    en: "Always last {{count}} months",
                    de: "Immer die letzten {{count}} Monate",
                    es: "Siempre los últimos {{count}} meses",
                })
            ),
            save: t({ en: "Save report", de: "Bericht speichern", es: "Guardar reporte" }),
            title: t({ en: "Save report", de: "Bericht speichern", es: "Guardar reporte" }),
        },
        sharing: {
            amounts: t({ en: "Show amounts", de: "Beträge anzeigen", es: "Mostrar montos" }),
            amountsHeld: t({
                en: "This report has no percentages now. The link keeps its last copy.",
                de: "Dieser Bericht hat jetzt keine Prozentwerte. Der Link behält seine letzte Kopie.",
                es: "Este reporte ya no tiene porcentajes. El enlace conserva su última copia.",
            }),
            amountsNote: t({
                en: "Off shows percentages only.",
                de: "Aus zeigt nur Prozentwerte.",
                es: "Desactivado muestra solo porcentajes.",
            }),
            copied: t({ en: "Copied", de: "Kopiert", es: "Copiado" }),
            copy: t({ en: "Copy", de: "Kopieren", es: "Copiar" }),
            done: t({ en: "Done", de: "Fertig", es: "Listo" }),
            expires: t({ en: "Expires", de: "Läuft ab", es: "Vence" }),
            failed: t({
                en: "The link could not be updated. Try again.",
                de: "Der Link konnte nicht aktualisiert werden. Versuch es noch mal.",
                es: "No se pudo actualizar el enlace. Inténtalo de nuevo.",
            }),
            lifetimes: {
                month: t({ en: "30 days", de: "30 Tage", es: "30 días" }),
                never: t({ en: "Never", de: "Nie", es: "Nunca" }),
                week: t({ en: "7 days", de: "7 Tage", es: "7 días" }),
            },
            link: t({ en: "Link on", de: "Link aktiv", es: "Enlace activo" }),
            linkNote: t({
                en: "Anyone with it can view this report.",
                de: "Jeder mit dem Link kann diesen Bericht ansehen.",
                es: "Cualquiera que lo tenga puede ver este reporte.",
            }),
            title: insert(t({ en: "Share {{name}}", de: "{{name}} teilen", es: "Compartir {{name}}" })),
            url: t({ en: "Link to this report", de: "Link zu diesem Bericht", es: "Enlace a este reporte" }),
        },
        specials: {
            noAccount: t({ en: "No account", de: "Kein Konto", es: "Sin cuenta" }),
            noMerchant: t({ en: "No merchant", de: "Kein Händler", es: "Sin comercio" }),
            other: t({ en: "Everything else", de: "Alles andere", es: "Todo lo demás" }),
            untagged: t({ en: "Untagged", de: "Ohne Tag", es: "Sin etiqueta" }),
        },
        table: {
            average: t({ en: "Average", de: "Durchschnitt", es: "Promedio" }),
            total: t({ en: "Total", de: "Gesamt", es: "Total" }),
            versus: insert(
                t({ en: "{{column}} vs average", de: "{{column}} vs. Durchschnitt", es: "{{column}} vs promedio" })
            ),
        },
    },
    key: "dashboard-insights-reports",
} satisfies Dictionary;

export default dashboardInsightsReports;
