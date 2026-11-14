import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmMonth = {
    content: {
        days: t({ en: "S M T W T F S", es: "D L M X J V S", pt: "D S T Q Q S S", fr: "D L M M J V S" }),
        fresh: t({ en: "new", es: "nuevo", pt: "novo", fr: "nouveau" }),
        groceries: t({ en: "Groceries", es: "Súper", pt: "Mercado", fr: "Courses" }),
        income: t({ en: "Income", es: "Ingreso", pt: "Receita", fr: "Revenus" }),
        movers: t({ en: "Movers", es: "Cambios", pt: "Variações", fr: "Variations" }),
        net: t({ en: "Net", es: "Neto", pt: "Líquido", fr: "Net" }),
        range: t({
            en: "Spent · 6 – 12 Sep",
            es: "Gastado · 6 – 12 sep",
            pt: "Gasto · 6 a 12 set",
            fr: "Dépenses · 6 au 12 sept.",
        }),
        rent: t({ en: "Rent", es: "Renta", pt: "Aluguel", fr: "Loyer" }),
        utilities: t({ en: "Utilities", es: "Servicios", pt: "Contas da casa", fr: "Charges" }),
        verdict: t({
            en: "$1,685.51 less than 30 Aug – 5 Sep. Rent alone gave back $1,850.00.",
            es: "$1,685.51 menos que 30 ago – 5 sep. Solo Renta bajó $1,850.00.",
            pt: "$1,685.51 a menos que 30 ago a 5 set. Só Aluguel caiu $1,850.00.",
            fr: "$1,685.51 de moins que du 30 août au 5 sept., dont $1,850.00 rien que sur Loyer.",
        }),
        versus: t({
            en: "vs 30 Aug – 5 Sep",
            es: "vs. 30 ago – 5 sep",
            pt: "vs. 30 ago a 5 set",
            fr: "vs 30 août au 5 sept.",
        }),
    },
    key: "film-month",
} satisfies Dictionary;

export default filmMonth;
