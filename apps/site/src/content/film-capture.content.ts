import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmCapture = {
    content: {
        labels: {
            account: t({ en: "account", de: "Konto", es: "cuenta", pt: "conta", fr: "compte" }),
            amount: t({ en: "amount", de: "Betrag", es: "monto", pt: "valor", fr: "montant" }),
            category: t({ en: "category", de: "Kategorie", es: "categoría", pt: "categoria", fr: "catégorie" }),
            date: t({ en: "date", de: "Datum", es: "fecha", pt: "data", fr: "date" }),
            merchant: t({ en: "merchant", de: "Händler", es: "comercio", pt: "loja", fr: "commerçant" }),
        },
        newEntry: t({
            en: "New entry",
            de: "Neuer Eintrag",
            es: "Nuevo registro",
            pt: "Novo lançamento",
            fr: "Nouvelle opération",
        }),
        receipt: {
            account: t({
                en: "CHASE DEBIT",
                de: "CHASE DEBIT",
                es: "CHASE DEBITO",
                pt: "CHASE DEBITO",
                fr: "CHASE DEBIT",
            }),
            date: t({ en: "09/14/26", de: "14.09.26", es: "14/09/26", pt: "14/09/26", fr: "14/09/26" }),
            items: [
                t({
                    en: "ORGANIC EGGS",
                    de: "BIO-EIER",
                    es: "HUEVOS ORGANICOS",
                    pt: "OVOS ORGANICOS",
                    fr: "OEUFS BIO",
                }),
                t({
                    en: "SPARKLING 24CT",
                    de: "SPRUDEL 24ER",
                    es: "AGUA CON GAS 24",
                    pt: "AGUA COM GAS 24",
                    fr: "EAU GAZEUSE 24",
                }),
                t({ en: "SALMON 2LB", de: "LACHS 900G", es: "SALMON 2LB", pt: "SALMAO 2LB", fr: "SAUMON 2LB" }),
            ],
            total: t({ en: "TOTAL", de: "SUMME", es: "TOTAL", pt: "TOTAL", fr: "TOTAL" }),
        },
        sentence: t({
            en: "spent 42 at costco for groceries from chase today",
            de: "ausgegeben 42 bei costco für lebensmittel mit chase heute",
            es: "gasté 42 en costco para súper con chase hoy",
            pt: "gastei 42 no costco para mercado com chase hoje",
            fr: "j'ai dépensé 42 chez costco pour courses avec chase aujourd'hui",
        }),
        slots: {
            account: t({ en: "chase", de: "chase", es: "chase", pt: "chase", fr: "chase" }),
            amount: t({ en: "42", de: "42", es: "42", pt: "42", fr: "42" }),
            category: t({ en: "groceries", de: "lebensmittel", es: "súper", pt: "mercado", fr: "courses" }),
            date: t({ en: "today", de: "heute", es: "hoy", pt: "hoje", fr: "aujourd'hui" }),
            merchant: t({ en: "costco", de: "costco", es: "costco", pt: "costco", fr: "costco" }),
        },
        sub: t({
            en: "Groceries · Chase",
            de: "Lebensmittel · Chase",
            es: "Súper · Chase",
            pt: "Mercado · Chase",
            fr: "Courses · Chase",
        }),
        today: t({ en: "Today", de: "Heute", es: "Hoy", pt: "Hoje", fr: "Aujourd'hui" }),
    },
    key: "film-capture",
} satisfies Dictionary;

export default filmCapture;
