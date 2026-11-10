import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsReports = {
    content: {
        accounts: {
            all: t({ en: "All accounts", es: "Todas las cuentas" }),
            count: insert(t({ en: "{{count}} accounts", es: "{{count}} cuentas" })),
            label: t({ en: "Accounts", es: "Cuentas" }),
        },
        bar: {
            export: t({ en: "Export", es: "Exportar" }),
            newReport: t({ en: "New report", es: "Nuevo reporte" }),
            saveReport: t({ en: "Save report", es: "Guardar reporte" }),
            share: t({ en: "Share", es: "Compartir" }),
            update: t({ en: "Update report", es: "Actualizar reporte" }),
        },
        by: insert(t({ en: "{{columns}} by {{rows}}", es: "{{columns}} por {{rows}}" })),
        rowsBy: insert(t({ en: "{{rows}} by {{columns}}", es: "{{rows}} por {{columns}}" })),
        chart: {
            label: insert(
                t({ en: "{{measure}} by {{rows}} and {{columns}}", es: "{{measure}} por {{rows}} y {{columns}}" })
            ),
        },
        chips: {
            columns: t({ en: "Columns", es: "Columnas" }),
            filter: t({ en: "Filter", es: "Filtro" }),
            measure: t({ en: "Measure", es: "Medida" }),
            removeTag: insert(t({ en: "Remove tag {{name}}", es: "Quitar la etiqueta {{name}}" })),
            rows: t({ en: "Rows", es: "Filas" }),
            tags: t({ en: "Tag", es: "Etiqueta" }),
            tagsNone: t({ en: "No tags yet", es: "Aún no hay etiquetas" }),
        },
        csv: {
            account: t({ en: "Account", es: "Cuenta" }),
            amount: t({ en: "Amount", es: "Monto" }),
            category: t({ en: "Category", es: "Categoría" }),
            date: t({ en: "Date", es: "Fecha" }),
            description: t({ en: "Description", es: "Descripción" }),
            income: t({ en: "Income", es: "Ingreso" }),
            spending: t({ en: "Spending", es: "Gasto" }),
            type: t({ en: "Type", es: "Tipo" }),
        },
        deleting: {
            body: t({
                en: "Your entries stay. Only the saved report goes away.",
                es: "Tus movimientos se quedan. Solo se va el reporte guardado.",
            }),
            cancel: t({ en: "Cancel", es: "Cancelar" }),
            confirm: t({ en: "Delete report", es: "Eliminar reporte" }),
            title: insert(t({ en: "Delete {{name}}?", es: "¿Eliminar {{name}}?" })),
        },
        dimensions: {
            account: t({ en: "Account", es: "Cuenta" }),
            category: t({ en: "Category", es: "Categoría" }),
            merchant: t({ en: "Merchant", es: "Comercio" }),
            subcategory: t({ en: "Subcategory", es: "Subcategoría" }),
            tag: t({ en: "Tag", es: "Etiqueta" }),
        },
        empty: {
            body: t({
                en: "Pick rows, columns and a range, then save it to come back to.",
                es: "Elige filas, columnas y un rango, y guárdalo para volver a él.",
            }),
            newReport: t({ en: "New report", es: "Nuevo reporte" }),
            templates: {
                merchants: t({ en: "Top merchants", es: "Comercios principales" }),
                monthByCategory: t({ en: "Month by category", es: "Mes por categoría" }),
                sixMonths: t({ en: "Last 6 months", es: "Últimos 6 meses" }),
                tagsByQuarter: t({ en: "Tags by quarter", es: "Etiquetas por trimestre" }),
                thisYear: t({ en: "This year", es: "Este año" }),
            },
            title: t({ en: "No reports yet", es: "Aún no hay reportes" }),
        },
        exporting: {
            averages: t({ en: "Average and comparison columns", es: "Columnas de promedio y comparación" }),
            cancel: t({ en: "Cancel", es: "Cancelar" }),
            chart: t({ en: "Chart", es: "Gráfico" }),
            chartNote: t({ en: "PDF only", es: "Solo PDF" }),
            csv: t({ en: "CSV", es: "CSV" }),
            csvNote: t({ en: "Table only, for spreadsheets", es: "Solo la tabla, para hojas de cálculo" }),
            entries: t({ en: "Every entry behind the totals", es: "Cada movimiento detrás de los totales" }),
            entriesNote: insert(t({ en: "{{count}} entries", es: "{{count}} movimientos" })),
            fileName: t({ en: "File name", es: "Nombre del archivo" }),
            format: t({ en: "Format", es: "Formato" }),
            pdf: t({ en: "PDF", es: "PDF" }),
            pdfNote: t({ en: "Chart and table, one page", es: "Gráfico y tabla, una página" }),
            run: insert(t({ en: "Export {{format}}", es: "Exportar {{format}}" })),
            table: t({ en: "Table", es: "Tabla" }),
            tableNote: insert(t({ en: "{{rows}} rows, {{columns}}", es: "{{rows}} filas, {{columns}}" })),
            title: insert(t({ en: "Export {{name}}", es: "Exportar {{name}}" })),
        },
        groupings: {
            month: {
                average: t({ en: "Average month", es: "Mes promedio" }),
                many: t({ en: "months", es: "meses" }),
                name: t({ en: "Month", es: "Mes" }),
                one: t({ en: "month", es: "mes" }),
            },
            none: {
                average: t({ en: "Average", es: "Promedio" }),
                many: t({ en: "periods", es: "periodos" }),
                name: t({ en: "None", es: "Ninguna" }),
                one: t({ en: "period", es: "periodo" }),
            },
            quarter: {
                average: t({ en: "Average quarter", es: "Trimestre promedio" }),
                many: t({ en: "quarters", es: "trimestres" }),
                name: t({ en: "Quarter", es: "Trimestre" }),
                one: t({ en: "quarter", es: "trimestre" }),
            },
            week: {
                average: t({ en: "Average week", es: "Semana promedio" }),
                many: t({ en: "weeks", es: "semanas" }),
                name: t({ en: "Week", es: "Semana" }),
                one: t({ en: "week", es: "semana" }),
            },
            year: {
                average: t({ en: "Average year", es: "Año promedio" }),
                many: t({ en: "years", es: "años" }),
                name: t({ en: "Year", es: "Año" }),
                one: t({ en: "year", es: "año" }),
            },
        },
        kpi: {
            entries: t({ en: "Entries", es: "Movimientos" }),
            rise: insert(t({ en: "Biggest rise, {{from}} to {{to}}", es: "Mayor alza, de {{from}} a {{to}}" })),
            riseNone: t({ en: "Biggest rise", es: "Mayor alza" }),
            total: insert(t({ en: "Total, {{count}} {{unit}}", es: "Total, {{count}} {{unit}}" })),
            totalPlain: t({ en: "Total", es: "Total" }),
        },
        library: {
            columns: {
                measure: t({ en: "Measure", es: "Medida" }),
                opened: t({ en: "Opened", es: "Abierto" }),
                range: t({ en: "Range", es: "Rango" }),
                report: t({ en: "Report", es: "Reporte" }),
                rowsByColumns: t({ en: "Rows by columns", es: "Filas por columnas" }),
                sharing: t({ en: "Sharing", es: "Compartido" }),
                total: t({ en: "Total", es: "Total" }),
            },
            count: insert(t({ en: "{{count}} reports", es: "{{count}} reportes" })),
            countOne: t({ en: "1 report", es: "1 reporte" }),
            noMatch: t({ en: "No report is called that.", es: "Ningún reporte se llama así." }),
            search: t({ en: "Search reports", es: "Buscar reportes" }),
            sharing: {
                all: t({ en: "All reports", es: "Todos los reportes" }),
                elsewhere: insert(
                    t({
                        en: "{{count}} links are on for reports saved in another browser.",
                        es: "Hay {{count}} enlaces activos de reportes guardados en otro navegador.",
                    })
                ),
                elsewhereOne: t({
                    en: "1 link is on for a report saved in another browser.",
                    es: "Hay 1 enlace activo de un reporte guardado en otro navegador.",
                }),
                filter: t({ en: "Shared", es: "Compartidos" }),
                linkOn: t({ en: "Link on", es: "Enlace activo" }),
                none: t({ en: "No report matches this filter.", es: "Ningún reporte coincide con este filtro." }),
                private: t({ en: "Private", es: "Privado" }),
                turnOff: t({ en: "Turn them off", es: "Desactivarlos" }),
                turnOffOne: t({ en: "Turn it off", es: "Desactivarlo" }),
            },
            today: t({ en: "Today", es: "Hoy" }),
        },
        measures: {
            average: t({ en: "Average per entry", es: "Promedio por movimiento" }),
            count: t({ en: "Entry count", es: "Cantidad de movimientos" }),
            income: t({ en: "Income", es: "Ingresos" }),
            net: t({ en: "Net", es: "Neto" }),
            spending: t({ en: "Spending", es: "Gastos" }),
        },
        noData: {
            clear: t({ en: "Clear filters", es: "Quitar filtros" }),
            title: t({ en: "Nothing matches", es: "No hay coincidencias" }),
            withFilters: insert(
                t({
                    en: "No entries match {{filters}} from {{range}}.",
                    es: "Ningún movimiento coincide con {{filters}} de {{range}}.",
                })
            ),
            without: insert(t({ en: "No entries from {{range}}.", es: "No hay movimientos de {{range}}." })),
        },
        range: {
            allTime: t({ en: "All time", es: "Todo el tiempo" }),
            from: t({ en: "From", es: "Desde" }),
            label: t({ en: "Dates", es: "Fechas" }),
            last: insert(t({ en: "Last {{count}} months", es: "Últimos {{count}} meses" })),
            lastYear: t({ en: "Last year", es: "Año pasado" }),
            thisYear: t({ en: "This year", es: "Este año" }),
            to: t({ en: "To", es: "Hasta" }),
            until: insert(t({ en: "{{from}} to {{to}}", es: "{{from}} a {{to}}" })),
        },
        renaming: {
            save: t({ en: "Rename", es: "Renombrar" }),
            title: t({ en: "Rename report", es: "Renombrar reporte" }),
        },
        rowMenu: {
            delete: t({ en: "Delete", es: "Eliminar" }),
            duplicate: t({ en: "Duplicate", es: "Duplicar" }),
            export: t({ en: "Export", es: "Exportar" }),
            more: insert(t({ en: "Actions for {{name}}", es: "Acciones de {{name}}" })),
            open: t({ en: "Open", es: "Abrir" }),
            rename: t({ en: "Rename", es: "Renombrar" }),
            share: t({ en: "Share link", es: "Compartir enlace" }),
        },
        saved: {
            all: t({ en: "All reports", es: "Todos los reportes" }),
            copy: insert(t({ en: "{{name}} copy", es: "Copia de {{name}}" })),
            none: t({ en: "Reports you save show up here.", es: "Los reportes que guardes aparecen aquí." }),
            months: insert(t({ en: "{{count}} mo", es: "{{count}} m" })),
            title: t({ en: "Saved", es: "Guardados" }),
            year: t({ en: "Year", es: "Año" }),
        },
        saving: {
            cancel: t({ en: "Cancel", es: "Cancelar" }),
            dates: t({ en: "Dates", es: "Fechas" }),
            fixed: t({ en: "Keep these dates", es: "Mantener estas fechas" }),
            name: t({ en: "Name", es: "Nombre" }),
            rolling: insert(t({ en: "Always last {{count}} months", es: "Siempre los últimos {{count}} meses" })),
            save: t({ en: "Save report", es: "Guardar reporte" }),
            title: t({ en: "Save report", es: "Guardar reporte" }),
        },
        sharing: {
            amounts: t({ en: "Show amounts", es: "Mostrar montos" }),
            amountsNote: t({ en: "Off shows percentages only.", es: "Desactivado muestra solo porcentajes." }),
            copied: t({ en: "Copied", es: "Copiado" }),
            copy: t({ en: "Copy", es: "Copiar" }),
            done: t({ en: "Done", es: "Listo" }),
            expires: t({ en: "Expires", es: "Vence" }),
            failed: t({
                en: "The link could not be updated. Try again.",
                es: "No se pudo actualizar el enlace. Inténtalo de nuevo.",
            }),
            lifetimes: {
                month: t({ en: "30 days", es: "30 días" }),
                never: t({ en: "Never", es: "Nunca" }),
                week: t({ en: "7 days", es: "7 días" }),
            },
            link: t({ en: "Link on", es: "Enlace activo" }),
            linkNote: t({
                en: "Anyone with it can view this report.",
                es: "Cualquiera que lo tenga puede ver este reporte.",
            }),
            title: insert(t({ en: "Share {{name}}", es: "Compartir {{name}}" })),
            url: t({ en: "Link to this report", es: "Enlace a este reporte" }),
        },
        specials: {
            noAccount: t({ en: "No account", es: "Sin cuenta" }),
            noMerchant: t({ en: "No merchant", es: "Sin comercio" }),
            other: t({ en: "Everything else", es: "Todo lo demás" }),
            untagged: t({ en: "Untagged", es: "Sin etiqueta" }),
        },
        table: {
            average: t({ en: "Average", es: "Promedio" }),
            total: t({ en: "Total", es: "Total" }),
            versus: insert(t({ en: "{{column}} vs average", es: "{{column}} vs promedio" })),
        },
    },
    key: "dashboard-insights-reports",
} satisfies Dictionary;

export default dashboardInsightsReports;
