import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmCapture = {
    content: {
        labels: {
            account: t({ en: "account", es: "cuenta", pt: "conta", fr: "compte" }),
            amount: t({ en: "amount", es: "monto", pt: "valor", fr: "montant" }),
            category: t({ en: "category", es: "categoría", pt: "categoria", fr: "catégorie" }),
            date: t({ en: "date", es: "fecha", pt: "data", fr: "date" }),
            merchant: t({ en: "merchant", es: "comercio", pt: "loja", fr: "commerçant" }),
        },
        newEntry: t({ en: "New entry", es: "Nuevo registro", pt: "Novo lançamento", fr: "Nouvelle opération" }),
        receipt: {
            account: t({ en: "CHASE DEBIT", es: "CHASE DEBITO", pt: "CHASE DEBITO", fr: "CHASE DEBIT" }),
            date: t({ en: "09/14/26", es: "14/09/26", pt: "14/09/26", fr: "14/09/26" }),
            items: [
                t({ en: "ORGANIC EGGS", es: "HUEVOS ORGANICOS", pt: "OVOS ORGANICOS", fr: "OEUFS BIO" }),
                t({ en: "SPARKLING 24CT", es: "AGUA CON GAS 24", pt: "AGUA COM GAS 24", fr: "EAU GAZEUSE 24" }),
                t({ en: "SALMON 2LB", es: "SALMON 2LB", pt: "SALMAO 2LB", fr: "SAUMON 2LB" }),
            ],
            total: t({ en: "TOTAL", es: "TOTAL", pt: "TOTAL", fr: "TOTAL" }),
        },
        sentence: t({
            en: "spent 42 at costco for groceries from chase today",
            es: "gasté 42 en costco para súper con chase hoy",
            pt: "gastei 42 no costco para mercado com chase hoje",
            fr: "j'ai dépensé 42 chez costco pour courses avec chase aujourd'hui",
        }),
        slots: {
            account: t({ en: "chase", es: "chase", pt: "chase", fr: "chase" }),
            amount: t({ en: "42", es: "42", pt: "42", fr: "42" }),
            category: t({ en: "groceries", es: "súper", pt: "mercado", fr: "courses" }),
            date: t({ en: "today", es: "hoy", pt: "hoje", fr: "aujourd'hui" }),
            merchant: t({ en: "costco", es: "costco", pt: "costco", fr: "costco" }),
        },
        sub: t({ en: "Groceries · Chase", es: "Súper · Chase", pt: "Mercado · Chase", fr: "Courses · Chase" }),
        today: t({ en: "Today", es: "Hoy", pt: "Hoje", fr: "Aujourd'hui" }),
    },
    key: "film-capture",
} satisfies Dictionary;

export default filmCapture;
