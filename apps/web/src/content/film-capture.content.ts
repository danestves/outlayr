import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmCapture = {
    content: {
        labels: {
            account: t({ en: "account", es: "cuenta" }),
            amount: t({ en: "amount", es: "monto" }),
            category: t({ en: "category", es: "categoría" }),
            date: t({ en: "date", es: "fecha" }),
            merchant: t({ en: "merchant", es: "comercio" }),
        },
        newEntry: t({ en: "New entry", es: "Nuevo registro" }),
        receipt: {
            account: t({ en: "CHASE DEBIT", es: "CHASE DEBITO" }),
            date: t({ en: "09/14/26", es: "14/09/26" }),
            items: [
                t({ en: "ORGANIC EGGS", es: "HUEVOS ORGANICOS" }),
                t({ en: "SPARKLING 24CT", es: "AGUA CON GAS 24" }),
                t({ en: "SALMON 2LB", es: "SALMON 2LB" }),
            ],
            total: t({ en: "TOTAL", es: "TOTAL" }),
        },
        sentence: t({
            en: "spent 42 at costco for groceries from chase today",
            es: "gasté 42 en costco para súper con chase hoy",
        }),
        slots: {
            account: t({ en: "chase", es: "chase" }),
            amount: t({ en: "42", es: "42" }),
            category: t({ en: "groceries", es: "súper" }),
            date: t({ en: "today", es: "hoy" }),
            merchant: t({ en: "costco", es: "costco" }),
        },
        sub: t({ en: "Groceries · Chase", es: "Súper · Chase" }),
        today: t({ en: "Today", es: "Hoy" }),
    },
    key: "film-capture",
} satisfies Dictionary;

export default filmCapture;
