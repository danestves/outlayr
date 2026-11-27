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
            it: "Converti da",
            nl: "Omrekenen van",
            ja: "換算元",
            ko: "환산할 통화",
        }),
        convertTo: t({
            en: "Convert to",
            de: "Umrechnen in",
            es: "Convertir a",
            fr: "Convertir vers",
            pt: "Converter para",
            it: "Converti in",
            nl: "Omrekenen naar",
            ja: "換算先",
            ko: "환산 결과 통화",
        }),
        currency: t({
            en: "Currency",
            de: "Währung",
            es: "Moneda",
            fr: "Devise",
            pt: "Moeda",
            it: "Valuta",
            nl: "Valuta",
            ja: "通貨",
            ko: "통화",
        }),
        close: t({
            en: "Close",
            de: "Schließen",
            es: "Cerrar",
            fr: "Fermer",
            pt: "Fechar",
            it: "Chiudi",
            nl: "Sluiten",
            ja: "閉じる",
            ko: "닫기",
        }),
        changeCurrency: insert(
            t({
                en: "{{name}}, change currency",
                de: "{{name}}, Währung ändern",
                es: "{{name}}, cambiar moneda",
                fr: "{{name}}, changer de devise",
                pt: "{{name}}, trocar moeda",
                it: "{{name}}, cambia valuta",
                nl: "{{name}}, valuta wijzigen",
                ja: "{{name}}、通貨を変更",
                ko: "{{name}}, 통화 변경",
            })
        ),
        amountIn: insert(
            t({
                en: "Amount in {{name}}",
                de: "Betrag in {{name}}",
                es: "Monto en {{name}}",
                "es-ES": "Importe en {{name}}",
                fr: "Montant en {{name}}",
                pt: "Valor em {{name}}",
                it: "Importo in {{name}}",
                nl: "Bedrag in {{name}}",
                ja: "{{name}}での金額",
                ko: "{{name}} 금액",
            })
        ),
        unitIn: insert(
            t({
                en: "in {{name}}",
                de: "in {{name}}",
                es: "en {{name}}",
                fr: "en {{name}}",
                pt: "em {{name}}",
                it: "in {{name}}",
                nl: "in {{name}}",
                ja: "{{name}}",
                ko: "{{name}}",
            })
        ),
    },
    key: "exchange",
} satisfies Dictionary;

export default exchange;
