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
        try: t({ en: "Try Outlayr", es: "Probar Outlayr" }),
        updated: insert(t({ en: "Updated {{date}}", es: "Actualizado el {{date}}" })),
    },
    key: "shared-report",
} satisfies Dictionary;

export default sharedReport;
