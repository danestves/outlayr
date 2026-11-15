import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmSorted = {
    content: {
        aDay: t({ en: "A day", de: "Pro Tag", es: "Al día", pt: "Por dia", fr: "Par jour" }),
        accounts: t({ en: "8 accounts", de: "8 Konten", es: "8 cuentas", pt: "8 contas", fr: "8 comptes" }),
        cash: t({ en: "Cash", de: "Bargeld", es: "Efectivo", pt: "Dinheiro", fr: "Espèces" }),
        daysLeft: t({ en: "18d left", de: "noch 18 T.", es: "quedan 18d", pt: "faltam 18d", fr: "encore 18 j" }),
        groceries: t({ en: "Groceries", de: "Lebensmittel", es: "Súper", pt: "Mercado", fr: "Courses" }),
        left: t({
            en: "left this month",
            de: "übrig diesen Monat",
            es: "disponible este mes",
            pt: "disponível este mês",
            fr: "restant ce mois-ci",
        }),
        limit: t({ en: "Limit", de: "Limit", es: "Límite", pt: "Limite", fr: "Limite" }),
        logged: t({
            en: "Logged today",
            de: "Heute erfasst",
            es: "Registrado hoy",
            pt: "Lançado hoje",
            fr: "Enregistré aujourd'hui",
        }),
        oct: t({ en: "Oct", de: "Okt.", es: "oct", pt: "out", fr: "oct." }),
        of: t({ en: "of", de: "von", es: "de", pt: "de", fr: "sur" }),
        rent: t({ en: "Rent", de: "Miete", es: "Renta", pt: "Aluguel", fr: "Loyer" }),
        scope: t({
            en: "Everything · This month",
            de: "Alles · Diesen Monat",
            es: "Todo · Este mes",
            pt: "Tudo · Este mês",
            fr: "Tout · Ce mois-ci",
        }),
        spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", pt: "Gasto", fr: "Dépensé" }),
        upcoming: t({ en: "Upcoming", de: "Demnächst", es: "Próximos", pt: "Próximos", fr: "À venir" }),
    },
    key: "film-sorted",
} satisfies Dictionary;

export default filmSorted;
