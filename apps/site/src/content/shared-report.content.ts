import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const sharedReport = {
    content: {
        footer: insert(
            t({
                en: "Shared from Outlayr. The numbers are a copy made on {{date}}.",
                es: "Compartido desde Outlayr. Los números son una copia hecha el {{date}}.",
            })
        ),
        home: t({ en: "Outlayr home", es: "Inicio de Outlayr" }),
        largest: insert(t({ en: "Largest {{dimension}}", es: "Mayor {{dimension}}" })),
        meta: {
            description: t({
                en: "A report shared from Outlayr, the expense tracker.",
                es: "Un reporte compartido desde Outlayr, la app para registrar gastos.",
            }),
            title: insert(t({ en: "{{name}} · Outlayr", es: "{{name}} · Outlayr" })),
        },
        off: {
            body: t({
                en: "Whoever shared it turned it off, or it expired.",
                es: "Quien lo compartió lo desactivó, o venció.",
            }),
            home: t({ en: "Go to Outlayr", es: "Ir a Outlayr" }),
            title: t({ en: "This link is off", es: "Este enlace está desactivado" }),
        },
        percentages: t({ en: "Percentages", es: "Porcentajes" }),
        report: {
            chart: {
                label: insert(
                    t({ en: "{{measure}} by {{rows}} and {{columns}}", es: "{{measure}} por {{rows}} y {{columns}}" })
                ),
            },
            dimensions: {
                account: t({ en: "Account", es: "Cuenta" }),
                category: t({ en: "Category", es: "Categoría" }),
                merchant: t({ en: "Merchant", es: "Comercio" }),
                subcategory: t({ en: "Subcategory", es: "Subcategoría" }),
                tag: t({ en: "Tag", es: "Etiqueta" }),
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
                rise: insert(t({ en: "Biggest rise, {{from}} to {{to}}", es: "Mayor alza, de {{from}} a {{to}}" })),
                riseNone: t({ en: "Biggest rise", es: "Mayor alza" }),
                total: insert(t({ en: "Total, {{count}} {{unit}}", es: "Total, {{count}} {{unit}}" })),
                totalPlain: t({ en: "Total", es: "Total" }),
            },
            measures: {
                average: t({ en: "Average per entry", es: "Promedio por movimiento" }),
                count: t({ en: "Entry count", es: "Cantidad de movimientos" }),
                income: t({ en: "Income", es: "Ingresos" }),
                net: t({ en: "Net", es: "Neto" }),
                spending: t({ en: "Spending", es: "Gastos" }),
            },
            range: {
                until: insert(t({ en: "{{from}} to {{to}}", es: "{{from}} a {{to}}" })),
            },
            rowsBy: insert(t({ en: "{{rows}} by {{columns}}", es: "{{rows}} por {{columns}}" })),
            table: {
                average: t({ en: "Average", es: "Promedio" }),
                total: t({ en: "Total", es: "Total" }),
                versus: insert(t({ en: "{{column}} vs average", es: "{{column}} vs promedio" })),
            },
        },
        try: t({ en: "Try Outlayr", es: "Probar Outlayr" }),
        updated: insert(t({ en: "Updated {{date}}", es: "Actualizado el {{date}}" })),
    },
    key: "shared-report",
} satisfies Dictionary;

export default sharedReport;
