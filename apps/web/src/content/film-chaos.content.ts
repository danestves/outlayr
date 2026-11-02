import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmChaos = {
    content: {
        accounts: t({ en: "Accounts · 2", es: "Cuentas · 2" }),
        amazonDate: t({ en: "Sep 13", es: "13 sep" }),
        amazonOrder: t({ en: "ORDER", es: "PEDIDO" }),
        amazonTitle: t({ en: "Your Prime membership renewed", es: "Tu membresía Prime se renovó" }),
        cash: t({ en: "Cash", es: "Efectivo" }),
        csv: t({
            en: "Date,Description,Amount\n09/14/2026,VZWRLSS*APOCC VISB,-85.00\n09/14/2026,POS COSTCO WHSE #1157,-42.00\n09/13/2026,AMZN PRIME*2K4LM0,-139.00",
            es: "Fecha,Descripción,Monto\n14/09/2026,VZWRLSS*APOCC VISB,-85.00\n14/09/2026,POS COSTCO WHSE #1157,-42.00\n13/09/2026,AMZN PRIME*2K4LM0,-139.00",
        }),
        csvFile: t({ en: "chase_activity_0914.csv", es: "chase_movimientos_1409.csv" }),
        envelope: t({ en: "CASH · SEPT", es: "EFECTIVO · SEP" }),
        groceries: t({ en: "Groceries", es: "Súper" }),
        netflixBody: t({ en: "$22.99 will be charged to your card.", es: "Se cobrarán $22.99 a tu tarjeta." }),
        netflixTitle: t({ en: "Your membership renews 1 Oct", es: "Tu membresía se renueva el 1 oct" }),
        now: t({ en: "now", es: "ahora" }),
        pending: t({ en: "Pending", es: "Pendiente" }),
        receiptAccount: t({ en: "CHASE DEBIT", es: "CHASE DEBITO" }),
        receiptDate: t({ en: "09/14/26", es: "14/09/26" }),
        receiptItems: t({
            en: "KS ORGANIC EGGS|BANANAS 3LB|KS SPARKLING 24CT|AVOCADOS BAG|ROTISSERIE CHKN|KS SOURDOUGH",
            es: "HUEVOS ORGANICOS KS|PLATANOS 3LB|AGUA CON GAS KS 24|AGUACATES BOLSA|POLLO ROSTIZADO|PAN MASA MADRE KS",
        }),
        receiptTax: t({ en: "TAX", es: "IMPUESTO" }),
        subscriptions: t({ en: "Subscriptions", es: "Suscripciones" }),
        utilities: t({ en: "Utilities", es: "Servicios" }),
        week: t({ en: "This week", es: "Esta semana" }),
    },
    key: "film-chaos",
} satisfies Dictionary;

export default filmChaos;
