import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const exchange = {
    content: {
        convertFrom: t({
            en: "Convert from",
            de: "Umrechnen von",
            es: "Convertir de",
            fr: "Convertir depuis",
            pt: "Converter de",
        }),
        convertTo: t({
            en: "Convert to",
            de: "Umrechnen in",
            es: "Convertir a",
            fr: "Convertir vers",
            pt: "Converter para",
        }),
        currency: t({ en: "Currency", de: "Währung", es: "Moneda", fr: "Devise", pt: "Moeda" }),
        close: t({ en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        changeCurrency: insert(
            t({
                en: "{{name}}, change currency",
                de: "{{name}}, Währung ändern",
                es: "{{name}}, cambiar moneda",
                fr: "{{name}}, changer de devise",
                pt: "{{name}}, trocar moeda",
            })
        ),
        amountIn: insert(
            t({
                en: "Amount in {{name}}",
                de: "Betrag in {{name}}",
                es: "Monto en {{name}}",
                fr: "Montant en {{name}}",
                pt: "Valor em {{name}}",
            })
        ),
        unitIn: insert(
            t({
                en: "in {{name}}",
                de: "in {{name}}",
                es: "en {{name}}",
                fr: "en {{name}}",
                pt: "em {{name}}",
            })
        ),
    },
    key: "exchange",
} satisfies Dictionary;

export default exchange;
