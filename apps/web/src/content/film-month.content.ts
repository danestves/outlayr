import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmMonth = {
    content: {
        days: t({ en: "S M T W T F S", es: "D L M X J V S" }),
        fresh: t({ en: "new", es: "nuevo" }),
        groceries: t({ en: "Groceries", es: "Súper" }),
        income: t({ en: "Income", es: "Ingreso" }),
        movers: t({ en: "Movers", es: "Cambios" }),
        net: t({ en: "Net", es: "Neto" }),
        range: t({ en: "Spent · 6 – 12 Sep", es: "Gastado · 6 – 12 sep" }),
        rent: t({ en: "Rent", es: "Renta" }),
        utilities: t({ en: "Utilities", es: "Servicios" }),
        verdict: t({
            en: "$1,685.51 less than 30 Aug – 5 Sep. Rent alone gave back $1,850.00.",
            es: "$1,685.51 menos que 30 ago – 5 sep. Solo Renta bajó $1,850.00.",
        }),
        versus: t({ en: "vs 30 Aug – 5 Sep", es: "vs. 30 ago – 5 sep" }),
    },
    key: "film-month",
} satisfies Dictionary;

export default filmMonth;
