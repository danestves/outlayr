import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmSorted = {
    content: {
        aDay: t({ en: "A day", es: "Al día" }),
        accounts: t({ en: "8 accounts", es: "8 cuentas" }),
        cash: t({ en: "Cash", es: "Efectivo" }),
        daysLeft: t({ en: "18d left", es: "quedan 18d" }),
        groceries: t({ en: "Groceries", es: "Súper" }),
        left: t({ en: "left this month", es: "disponible este mes" }),
        limit: t({ en: "Limit", es: "Límite" }),
        logged: t({ en: "Logged today", es: "Registrado hoy" }),
        oct: t({ en: "Oct", es: "oct" }),
        of: t({ en: "of", es: "de" }),
        rent: t({ en: "Rent", es: "Renta" }),
        scope: t({ en: "Everything · This month", es: "Todo · Este mes" }),
        spent: t({ en: "Spent", es: "Gastado" }),
        upcoming: t({ en: "Upcoming", es: "Próximos" }),
    },
    key: "film-sorted",
} satisfies Dictionary;

export default filmSorted;
