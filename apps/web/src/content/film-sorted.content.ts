import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmSorted = {
    content: {
        aDay: t({ en: "A day", es: "Al día", pt: "Por dia", fr: "Par jour" }),
        accounts: t({ en: "8 accounts", es: "8 cuentas", pt: "8 contas", fr: "8 comptes" }),
        cash: t({ en: "Cash", es: "Efectivo", pt: "Dinheiro", fr: "Espèces" }),
        daysLeft: t({ en: "18d left", es: "quedan 18d", pt: "faltam 18d", fr: "encore 18 j" }),
        groceries: t({ en: "Groceries", es: "Súper", pt: "Mercado", fr: "Courses" }),
        left: t({
            en: "left this month",
            es: "disponible este mes",
            pt: "disponível este mês",
            fr: "restant ce mois-ci",
        }),
        limit: t({ en: "Limit", es: "Límite", pt: "Limite", fr: "Limite" }),
        logged: t({ en: "Logged today", es: "Registrado hoy", pt: "Lançado hoje", fr: "Enregistré aujourd'hui" }),
        oct: t({ en: "Oct", es: "oct", pt: "out", fr: "oct." }),
        of: t({ en: "of", es: "de", pt: "de", fr: "sur" }),
        rent: t({ en: "Rent", es: "Renta", pt: "Aluguel", fr: "Loyer" }),
        scope: t({
            en: "Everything · This month",
            es: "Todo · Este mes",
            pt: "Tudo · Este mês",
            fr: "Tout · Ce mois-ci",
        }),
        spent: t({ en: "Spent", es: "Gastado", pt: "Gasto", fr: "Dépensé" }),
        upcoming: t({ en: "Upcoming", es: "Próximos", pt: "Próximos", fr: "À venir" }),
    },
    key: "film-sorted",
} satisfies Dictionary;

export default filmSorted;
