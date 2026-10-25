import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const transfers = {
    content: {
        "transfers.a11y.balance": t({
            en: "{account}, {balance}",
            es: "{account}, {balance}",
            pt: "{account}, {balance}",
        }),
        "transfers.a11y.balanceChange": t({
            en: "{account}, {before}, then {after}",
            es: "{account}, {before}, luego {after}",
            pt: "{account}, {before}, depois {after}",
        }),
        "transfers.a11y.missing": t({
            en: "Missing: {field}",
            es: "Falta: {field}",
            pt: "Falta: {field}",
        }),
        "transfers.a11y.new": t({
            en: "New transfer",
            es: "Nueva transferencia",
            pt: "Nova transferência",
        }),
        "transfers.block.feeOverArrival": t({
            en: "The fee is {amount} more than arrives",
            es: "La comisión supera por {amount} lo que llega",
            pt: "A tarifa supera em {amount} o que chega",
            "pt-PT": "A comissão supera em {amount} o que chega",
        }),
        "transfers.block.nothingArrives": t({
            en: "Nothing would arrive. The fee takes it all.",
            es: "No llegaría nada: la comisión se lo lleva todo.",
            pt: "Nada chegaria: a tarifa leva tudo.",
            "pt-PT": "Nada chegaria: a comissão leva tudo.",
        }),
        "transfers.delete.row": t({
            en: "Delete Transfer",
            es: "Eliminar transferencia",
            pt: "Apagar transferência",
        }),
        "transfers.fee.chargedTo": t({
            en: "Charged to",
            es: "Se cobra en",
            pt: "Cobrada em",
        }),
        "transfers.fee.included": t({
            en: "Included",
            es: "Incluida",
            pt: "Incluída",
        }),
        "transfers.fee.note": t({
            en: "Fee · {from} → {to}",
            es: "Comisión · {from} → {to}",
            pt: "Tarifa · {from} → {to}",
            "pt-PT": "Comissão · {from} → {to}",
        }),
        "transfers.fee.onTop": t({
            en: "On top",
            es: "Aparte",
            pt: "À parte",
        }),
        "transfers.field.arrives": t({
            en: "Arrives",
            es: "Llega",
            pt: "Chega",
        }),
        "transfers.field.date": t({
            en: "Date",
            es: "Fecha",
            pt: "Data",
        }),
        "transfers.field.fee": t({
            en: "Fee",
            es: "Comisión",
            pt: "Tarifa",
            "pt-PT": "Comissão",
        }),
        "transfers.field.feeSide": t({
            en: "Fee charged to",
            es: "Comisión cobrada a",
            pt: "Tarifa cobrada em",
            "pt-PT": "Comissão cobrada em",
        }),
        "transfers.field.from": t({
            en: "From",
            es: "Desde",
            pt: "De",
        }),
        "transfers.field.note": t({
            en: "Note",
            es: "Nota",
            pt: "Nota",
        }),
        "transfers.field.outside": t({
            en: "From another account",
            es: "De otra cuenta",
            pt: "De outra conta",
        }),
        "transfers.field.rate": t({
            en: "Rate",
            es: "Tasa",
            "es-ES": "Tipo de cambio",
            pt: "Cotação",
        }),
        "transfers.field.rateType": t({
            en: "Rate source",
            es: "Fuente de la tasa",
            "es-ES": "Fuente del tipo de cambio",
            pt: "Fonte da cotação",
        }),
        "transfers.field.sent": t({
            en: "You send",
            es: "Envías",
            pt: "Você envia",
            "pt-PT": "Envia",
        }),
        "transfers.field.to": t({
            en: "To",
            es: "Hacia",
            pt: "Para",
        }),
        "transfers.gap.itsAFee": t({
            en: "It's a fee",
            es: "Es una comisión",
            pt: "É uma tarifa",
            "pt-PT": "É uma comissão",
        }),
        "transfers.gap.itsOnTop": t({
            en: "It's on top",
            es: "Es aparte",
            pt: "É à parte",
        }),
        "transfers.gap.less": t({
            en: "{amount} less arrived",
            es: "Llegaron {amount} de menos",
            pt: "Chegaram {amount} a menos",
        }),
        "transfers.gap.more": t({
            en: "{amount} more arrived",
            es: "Llegaron {amount} de más",
            pt: "Chegaram {amount} a mais",
        }),
        "transfers.gap.outside": t({
            en: "It came from another account",
            es: "Salió de otra cuenta",
            pt: "Veio de outra conta",
        }),
        "transfers.rate.lastUsed": t({
            en: "Last used · {date}",
            es: "Última · {date}",
            "es-ES": "Último · {date}",
            pt: "Última usada · {date}",
        }),
        "transfers.rate.unavailable": t({
            en: "No rate for this pair. Enter one.",
            es: "No hay tasa para este par. Ingresa una.",
            "es-ES": "No hay tipo de cambio para este par. Introduce uno.",
            pt: "Sem cotação para este par. Digite uma.",
            "pt-PT": "Sem cotação para este par. Introduza uma.",
        }),
        "transfers.save": t({
            en: "Save Transfer",
            es: "Guardar transferencia",
            pt: "Salvar transferência",
            "pt-PT": "Guardar transferência",
        }),
        "transfers.save.failed": t({
            en: "Couldn't save this transfer. Try again.",
            es: "No se pudo guardar la transferencia. Inténtalo de nuevo.",
            pt: "Não foi possível salvar a transferência. Tente de novo.",
            "pt-PT": "Não foi possível guardar a transferência. Tente de novo.",
        }),
        "transfers.saved.another": t({
            en: "Add another",
            es: "Agregar otra",
            "es-ES": "Añadir otra",
            pt: "Adicionar outra",
        }),
        "transfers.saved.from": t({
            en: "From {from}",
            es: "Desde {from}",
            pt: "De {from}",
        }),
        "transfers.saved.title": t({
            en: "Transfer added",
            es: "Transferencia agregada",
            "es-ES": "Transferencia añadida",
            pt: "Transferência adicionada",
        }),
        "transfers.sentence.blank.account": t({
            en: "an account",
            es: "una cuenta",
            pt: "uma conta",
        }),
        "transfers.sentence.blank.amount": t({
            en: "an amount",
            es: "un monto",
            "es-ES": "un importe",
            pt: "um valor",
        }),
        "transfers.sentence.blank.noFee": t({
            en: "No fee",
            es: "Sin comisión",
            pt: "Sem tarifa",
            "pt-PT": "Sem comissão",
        }),
        "transfers.sentence.blank.rate": t({
            en: "a rate",
            es: "una tasa",
            "es-ES": "un tipo de cambio",
            pt: "uma cotação",
        }),
        "transfers.sentence.fee": t({
            en: "A {fee} fee from {feeSide}.",
            es: "Comisión de {fee} desde {feeSide}.",
            pt: "Tarifa de {fee} cobrada em {feeSide}.",
            "pt-PT": "Comissão de {fee} cobrada em {feeSide}.",
        }),
        "transfers.sentence.feeArrives": t({
            en: "After a {fee} fee from {feeSide}, {arrives} arrives.",
            es: "Tras una comisión de {fee} desde {feeSide}, llegan {arrives}.",
            pt: "Após uma tarifa de {fee} cobrada em {feeSide}, chegam {arrives}.",
            "pt-PT": "Após uma comissão de {fee} cobrada em {feeSide}, chegam {arrives}.",
        }),
        "transfers.sentence.feeOnTop": t({
            en: "Plus a {fee} fee from {feeSide}.",
            es: "Más una comisión de {fee} desde {feeSide}.",
            pt: "Mais uma tarifa de {fee} cobrada em {feeSide}.",
            "pt-PT": "Mais uma comissão de {fee} cobrada em {feeSide}.",
        }),
        "transfers.sentence.move": t({
            en: "Move {amount} from {from} to {to} {when}.",
            es: "Mueve {amount} de {from} a {to} {when}.",
            pt: "Mova {amount} de {from} para {to} {when}.",
        }),
        "transfers.sentence.noFee": t({
            en: "{fee}.",
            es: "{fee}.",
            pt: "{fee}.",
        }),
        "transfers.sentence.outside": t({
            en: "Includes {outside} from another account.",
            es: "Incluye {outside} de otra cuenta.",
            pt: "Inclui {outside} de outra conta.",
        }),
        "transfers.sentence.rate": t({
            en: "At the {rateType} rate, {rate}, it arrives as {arrives}.",
            es: "A la tasa {rateType}, {rate}, llega como {arrives}.",
            "es-ES": "Al tipo de cambio {rateType}, {rate}, llega como {arrives}.",
            pt: "Pela cotação {rateType}, {rate}, chega como {arrives}.",
        }),
        "transfers.sentence.rateCustom": t({
            en: "At {rateType} rate, {rate}, it arrives as {arrives}.",
            es: "A {rateType}, {rate}, llega como {arrives}.",
            pt: "Pela {rateType}, {rate}, chega como {arrives}.",
        }),
        "transfers.title": t({
            en: "Transfer",
            es: "Transferencia",
            pt: "Transferência",
        }),
    },
    key: "transfers" as const,
} satisfies Dictionary;

export default transfers;
