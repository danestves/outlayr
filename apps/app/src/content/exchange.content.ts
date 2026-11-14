import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const exchange = {
    content: {
        convertFrom: t({ en: "Convert from", es: "Convertir de", fr: "Convertir depuis", pt: "Converter de" }),
        convertTo: t({ en: "Convert to", es: "Convertir a", fr: "Convertir vers", pt: "Converter para" }),
        close: t({ en: "Close", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        changeCurrency: insert(
            t({
                en: "{{name}}, change currency",
                es: "{{name}}, cambiar moneda",
                fr: "{{name}}, changer de devise",
                pt: "{{name}}, trocar moeda",
            })
        ),
        amountIn: insert(
            t({
                en: "Amount in {{name}}",
                es: "Monto en {{name}}",
                fr: "Montant en {{name}}",
                pt: "Valor em {{name}}",
            })
        ),
    },
    key: "exchange",
} satisfies Dictionary;

export default exchange;
