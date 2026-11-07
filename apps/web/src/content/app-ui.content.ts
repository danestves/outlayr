import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const appUi = {
    content: {
        accounts: {
            cash: t({ en: "Cash", es: "Efectivo", pt: "Dinheiro", fr: "Espèces" }),
            label: t({
                en: "Eight accounts: Chase, Ally Savings, Zinli, PayPal, Apple Card, Amex Gold, and cash in dollars, Banesco in bolívares.",
                es: "Ocho cuentas: Chase, Ally Savings, Zinli, PayPal, Apple Card, Amex Gold y efectivo en dólares, Banesco en bolívares.",
                pt: "Oito contas: Chase, Ally Savings, Zinli, PayPal, Apple Card, Amex Gold e dinheiro em dólares, Banesco em bolívares.",
                fr: "Huit comptes : Chase, Ally Savings, Zinli, PayPal, Apple Card, Amex Gold, et des espèces en dollars, Banesco en bolivars.",
            }),
            transfer: t({ en: "Transfer", es: "Transferencia", pt: "Transferência", fr: "Virement" }),
        },
        budget: {
            aDay: t({ en: "A day", es: "Al día", pt: "Por dia", fr: "Par jour" }),
            daysLeft: t({ en: "18d left", es: "quedan 18d", pt: "faltam 18d", fr: "encore 18 j" }),
            label: t({
                en: "Budgets: $1,018.59 left this month of a $3,900 limit, $2,881 spent, $57 a day. On this pace the month ends $319 short.",
                es: "Presupuestos: quedan $1,018.59 este mes de un límite de $3,900, $2,881 gastados, $57 al día. A este ritmo, el mes termina $319 por debajo.",
                pt: "Orçamentos: $1,018.59 disponíveis este mês de um limite de $3,900, $2,881 gastos, $57 por dia. Nesse ritmo, o mês fecha $319 no vermelho.",
                fr: "Budgets : $1,018.59 restants ce mois-ci sur une limite de $3,900, $2,881 dépensés, $57 par jour. À ce rythme, le mois se termine avec $319 de déficit.",
            }),
            left: t({
                en: "left this month",
                es: "disponible este mes",
                pt: "disponível este mês",
                fr: "restant ce mois-ci",
            }),
            limit: t({ en: "Limit", es: "Límite", pt: "Limite", fr: "Limite" }),
            scope: t({
                en: "Everything · This month",
                es: "Todo · Este mes",
                pt: "Tudo · Este mês",
                fr: "Tout · Ce mois-ci",
            }),
            spent: t({ en: "Spent", es: "Gastado", pt: "Gasto", fr: "Dépensé" }),
        },
        days: [
            t({ en: "S", es: "D", pt: "D", fr: "D" }),
            t({ en: "M", es: "L", pt: "S", fr: "L" }),
            t({ en: "T", es: "M", pt: "T", fr: "M" }),
            t({ en: "W", es: "X", pt: "Q", fr: "M" }),
            t({ en: "T", es: "J", pt: "Q", fr: "J" }),
            t({ en: "F", es: "V", pt: "S", fr: "V" }),
            t({ en: "S", es: "S", pt: "S", fr: "S" }),
        ],
        entry: {
            account: t({ en: "account", es: "cuenta", pt: "conta", fr: "compte" }),
            amount: t({ en: "amount", es: "monto", pt: "valor", fr: "montant" }),
            category: t({ en: "category", es: "categoría", pt: "categoria", fr: "catégorie" }),
            date: t({ en: "date", es: "fecha", pt: "data", fr: "date" }),
            merchant: t({ en: "merchant", es: "comercio", pt: "loja", fr: "commerçant" }),
        },
        insights: {
            income: t({ en: "Income", es: "Ingreso", pt: "Receita", fr: "Revenus" }),
            label: t({
                en: "Insights for 6 to 12 Sep: $597.95 spent, 74% less than the week before. Income $1,450, net $852.05.",
                es: "Estadísticas del 6 al 12 de sep: $597.95 gastados, 74 % menos que la semana anterior. Ingresos $1,450, neto $852.05.",
                pt: "Estatísticas de 6 a 12 de set: $597.95 gastos, 74% a menos que na semana anterior. Receita $1,450, líquido $852.05.",
                fr: "Statistiques du 6 au 12 sept. : $597.95 dépensés, 74 % de moins que la semaine précédente. Revenus $1,450, net $852.05.",
            }),
            movers: t({ en: "Movers", es: "Cambios", pt: "Variações", fr: "Variations" }),
            net: t({ en: "Net", es: "Neto", pt: "Líquido", fr: "Net" }),
            note: t({
                en: "$1,685.51 less than 30 Aug – 5 Sep. Rent alone gave back $1,850.00.",
                es: "$1,685.51 menos que 30 ago – 5 sep. Solo Renta bajó $1,850.00.",
                pt: "$1,685.51 a menos que 30 ago a 5 set. Só Aluguel caiu $1,850.00.",
                fr: "$1,685.51 de moins que du 30 août au 5 sept., dont $1,850.00 rien que sur Loyer.",
            }),
            range: t({
                en: "Spent · 6 – 12 Sep",
                es: "Gastado · 6 – 12 sep",
                pt: "Gasto · 6 a 12 set",
                fr: "Dépenses · 6 au 12 sept.",
            }),
            utilities: t({ en: "Utilities", es: "Servicios", pt: "Contas da casa", fr: "Charges" }),
            versus: t({
                en: "vs 30 Aug – 5 Sep",
                es: "vs. 30 ago – 5 sep",
                pt: "vs. 30 ago a 5 set",
                fr: "vs 30 août au 5 sept.",
            }),
            groceries: t({ en: "Groceries", es: "Súper", pt: "Mercado", fr: "Courses" }),
            rent: t({ en: "Rent", es: "Renta", pt: "Aluguel", fr: "Loyer" }),
            fresh: t({ en: "new", es: "nuevo", pt: "novo", fr: "nouveau" }),
        },
        months: {
            nov: t({ en: "Nov", es: "nov", pt: "nov", fr: "nov." }),
            oct: t({ en: "Oct", es: "oct", pt: "out", fr: "oct." }),
            sep: t({ en: "Sep", es: "sep", pt: "set", fr: "sept." }),
        },
        upcoming: {
            label: t({
                en: "Upcoming: $2,036.54 a month across Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, rent, Netflix, and Planet Fitness.",
                es: "Próximos: $2,036.54 al mes entre Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, renta, Netflix y Planet Fitness.",
                pt: "Próximos: $2,036.54 por mês entre Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, aluguel, Netflix e Planet Fitness.",
                fr: "À venir : $2,036.54 par mois pour Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, le loyer, Netflix et Planet Fitness.",
            }),
            perMonth: t({ en: "Per month", es: "Al mes", pt: "Por mês", fr: "Par mois" }),
            rent: t({ en: "Rent", es: "Renta", pt: "Aluguel", fr: "Loyer" }),
            title: t({ en: "Upcoming", es: "Próximos", pt: "Próximos", fr: "À venir" }),
        },
    },
    key: "appUi",
} satisfies Dictionary;

export default appUi;
