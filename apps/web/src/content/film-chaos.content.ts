import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const filmChaos = {
    content: {
        accounts: t({ en: "Accounts · 2", es: "Cuentas · 2", pt: "Contas · 2", fr: "Comptes · 2" }),
        amazonDate: t({ en: "Sep 13", es: "13 sep", pt: "13 set", fr: "13 sept." }),
        amazonOrder: t({ en: "ORDER", es: "PEDIDO", pt: "PEDIDO", fr: "COMMANDE" }),
        amazonTitle: t({
            en: "Your Prime membership renewed",
            es: "Tu membresía Prime se renovó",
            pt: "Sua assinatura Prime foi renovada",
            fr: "Votre abonnement Prime a été renouvelé",
        }),
        cash: t({ en: "Cash", es: "Efectivo", pt: "Dinheiro", fr: "Espèces" }),
        csv: t({
            en: "Date,Description,Amount\n09/14/2026,VZWRLSS*APOCC VISB,-85.00\n09/14/2026,POS COSTCO WHSE #1157,-42.00\n09/13/2026,AMZN PRIME*2K4LM0,-139.00",
            es: "Fecha,Descripción,Monto\n14/09/2026,VZWRLSS*APOCC VISB,-85.00\n14/09/2026,POS COSTCO WHSE #1157,-42.00\n13/09/2026,AMZN PRIME*2K4LM0,-139.00",
            pt: "Data,Descrição,Valor\n14/09/2026,VZWRLSS*APOCC VISB,-85.00\n14/09/2026,POS COSTCO WHSE #1157,-42.00\n13/09/2026,AMZN PRIME*2K4LM0,-139.00",
            fr: "Date,Libellé,Montant\n14/09/2026,VZWRLSS*APOCC VISB,-85.00\n14/09/2026,POS COSTCO WHSE #1157,-42.00\n13/09/2026,AMZN PRIME*2K4LM0,-139.00",
        }),
        csvFile: t({
            en: "chase_activity_0914.csv",
            es: "chase_movimientos_1409.csv",
            pt: "chase_extrato_1409.csv",
            fr: "chase_releve_1409.csv",
        }),
        envelope: t({ en: "CASH · SEPT", es: "EFECTIVO · SEP", pt: "DINHEIRO · SET", fr: "ESPÈCES · SEPT" }),
        groceries: t({ en: "Groceries", es: "Súper", pt: "Mercado", fr: "Courses" }),
        netflixBody: t({
            en: "$22.99 will be charged to your card.",
            es: "Se cobrarán $22.99 a tu tarjeta.",
            pt: "$22.99 serão cobrados no seu cartão.",
            fr: "$22.99 seront débités sur votre carte.",
        }),
        netflixTitle: t({
            en: "Your membership renews 1 Oct",
            es: "Tu membresía se renueva el 1 oct",
            pt: "Sua assinatura renova em 1º de out",
            fr: "Votre abonnement est renouvelé le 1er oct.",
        }),
        now: t({ en: "now", es: "ahora", pt: "agora", fr: "maintenant" }),
        pending: t({ en: "Pending", es: "Pendiente", pt: "Pendente", fr: "En attente" }),
        receiptAccount: t({ en: "CHASE DEBIT", es: "CHASE DEBITO", pt: "CHASE DEBITO", fr: "CHASE DEBIT" }),
        receiptDate: t({ en: "09/14/26", es: "14/09/26", pt: "14/09/26", fr: "14/09/26" }),
        receiptItems: t({
            en: "KS ORGANIC EGGS|BANANAS 3LB|KS SPARKLING 24CT|AVOCADOS BAG|ROTISSERIE CHKN|KS SOURDOUGH",
            es: "HUEVOS ORGANICOS KS|PLATANOS 3LB|AGUA CON GAS KS 24|AGUACATES BOLSA|POLLO ROSTIZADO|PAN MASA MADRE KS",
            pt: "OVOS ORGANICOS KS|BANANAS 3LB|AGUA COM GAS KS 24|ABACATES SACO|FRANGO ASSADO|PAO DE FERMENTACAO KS",
            fr: "OEUFS BIO KS|BANANES 3LB|EAU GAZEUSE KS 24|AVOCATS SACHET|POULET ROTI|PAIN AU LEVAIN KS",
        }),
        receiptTax: t({ en: "TAX", es: "IMPUESTO", pt: "IMPOSTOS", fr: "TAXES" }),
        subscriptions: t({ en: "Subscriptions", es: "Suscripciones", pt: "Assinaturas", fr: "Abonnements" }),
        utilities: t({ en: "Utilities", es: "Servicios", pt: "Contas da casa", fr: "Charges" }),
        week: t({ en: "This week", es: "Esta semana", pt: "Esta semana", fr: "Cette semaine" }),
    },
    key: "film-chaos",
} satisfies Dictionary;

export default filmChaos;
