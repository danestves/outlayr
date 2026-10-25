import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const goals = {
    content: {
        "goals.a11y.card": t({
            en: "{name}. {saved} of {target}, {percent} percent. {standing}.",
            es: "{name}. {saved} de {target}, {percent} por ciento. {standing}.",
            pt: "{name}. {saved} de {target}, {percent} por cento. {standing}.",
        }),
        "goals.a11y.chart": t({
            en: "Balance against the pace this date demands. {standing}.",
            es: "Saldo frente al ritmo que necesitas para esta fecha. {standing}.",
            pt: "Saldo comparado ao ritmo que esta data exige. {standing}.",
        }),
        "goals.a11y.noStanding": t({
            en: "no pace to measure",
            es: "sin ritmo que medir",
            pt: "sem ritmo para medir",
        }),
        "goals.a11y.openHint": t({
            en: "Opens the goal",
            es: "Abre la meta",
            pt: "Abre a meta",
        }),
        "goals.a11y.unvalued": t({
            en: "{name}. No exchange rate for this account yet, so its progress cannot be stated.",
            es: "{name}. Aún no hay tasa de cambio para esta cuenta, así que no se puede mostrar su progreso.",
            "es-ES": "{name}. Aún no hay tipo de cambio para esta cuenta, así que no se puede mostrar su progreso.",
            pt: "{name}. Ainda não há cotação para esta conta, então não dá para mostrar o progresso.",
        }),
        "goals.add": t({
            en: "New goal",
            es: "Nueva meta",
            pt: "Nova meta",
        }),
        "goals.ahead": t({
            en: "ahead",
            es: "adelantada",
            pt: "adiantada",
        }),
        "goals.behind": t({
            en: "behind",
            es: "atrasada",
            pt: "atrasada",
        }),
        "goals.card.unvalued": t({
            en: "No rate yet",
            es: "Sin tasa aún",
            "es-ES": "Sin tipo de cambio aún",
            pt: "Sem cotação ainda",
        }),
        "goals.currencyMoved.body": t({
            en: "The ledger's currency changed while you were setting this goal, so the amount no longer means what it did. Set it again.",
            es: "La moneda de tu registro cambió mientras creabas esta meta, así que el monto ya no significa lo mismo. Créala de nuevo.",
            "es-ES":
                "La moneda de tu registro cambió mientras creabas esta meta, así que el importe ya no significa lo mismo. Créala de nuevo.",
            pt: "A moeda dos seus lançamentos mudou enquanto você criava esta meta, então o valor não significa mais o mesmo. Crie de novo.",
        }),
        "goals.currencyMoved.title": t({
            en: "No goal yet",
            es: "No se creó la meta",
            pt: "A meta não foi criada",
        }),
        "goals.detail.monthsLeft": t({
            en: "Months left",
            es: "Meses restantes",
            pt: "Meses restantes",
        }),
        "goals.detail.of": t({
            en: "of {amount} · {percent}%",
            es: "de {amount} · {percent}%",
            pt: "de {amount} · {percent}%",
        }),
        "goals.detail.pace": t({
            en: "Pace",
            es: "Ritmo",
            pt: "Ritmo",
        }),
        "goals.detail.perMonth": t({
            en: "Per month",
            es: "Al mes",
            pt: "Por mês",
        }),
        "goals.detail.unvalued": t({
            en: "No exchange rate for this account yet, so there is nothing to plot against the target.",
            es: "Aún no hay tasa de cambio para esta cuenta, así que no hay nada que trazar frente al objetivo.",
            "es-ES": "Aún no hay tipo de cambio para esta cuenta, así que no hay nada que trazar frente al objetivo.",
            pt: "Ainda não há cotação para esta conta, então não há nada para comparar com o objetivo.",
        }),
        "goals.detail.verdictAhead": t({
            en: "You're {amount} ahead of where the date needs you.",
            es: "Llevas {amount} de ventaja sobre lo que pide la fecha.",
            pt: "Você está {amount} à frente do que a data pede.",
        }),
        "goals.detail.verdictBehind": t({
            en: "You're {amount} short of where the date needs you.",
            es: "Te faltan {amount} para ir al día con la fecha.",
            pt: "Faltam {amount} para ficar em dia com a data.",
        }),
        "goals.detail.verdictOnPace": t({
            en: "You're on pace for {date}.",
            es: "Vas a buen ritmo para {date}.",
            pt: "Você está no ritmo para {date}.",
        }),
        // Dateless on purpose: the goal records a deadline, never the day the balance crossed the target.
        "goals.detail.verdictReached": t({
            en: "Reached. There's nothing left to put aside.",
            es: "Meta alcanzada. Ya no tienes que apartar nada.",
            pt: "Meta alcançada. Não precisa separar mais nada.",
        }),
        "goals.editor.account": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "goals.editor.accountNote": t({
            en: "Progress is this account's balance, so it can't be swapped.",
            es: "El progreso es el saldo de esta cuenta, así que no se puede cambiar.",
            pt: "O progresso é o saldo desta conta, então ela não pode ser trocada.",
        }),
        "goals.editor.by": t({
            en: "By",
            es: "Para",
            pt: "Até",
        }),
        "goals.editor.currency": t({
            en: "Set in {from}, read here in {to} at the rate on the day it was set.",
            es: "Definida en {from}, mostrada en {to} con la tasa del día en que se creó.",
            "es-ES": "Definida en {from}, mostrada en {to} con el tipo de cambio del día en que se creó.",
            pt: "Definida em {from}, exibida em {to} com a cotação do dia em que foi criada.",
        }),
        "goals.editor.delete": t({
            en: "Delete goal",
            es: "Eliminar meta",
            pt: "Apagar meta",
        }),
        "goals.editor.name": t({
            en: "Name",
            es: "Nombre",
            pt: "Nome",
        }),
        "goals.editor.target": t({
            en: "Target",
            es: "Objetivo",
            pt: "Objetivo",
        }),
        "goals.editor.targetNote": t({
            en: "Committing {amount} a month",
            es: "Apartas {amount} al mes",
            pt: "Você separa {amount} por mês",
        }),
        "goals.editor.title": t({
            en: "Edit",
            es: "Editar",
            pt: "Editar",
        }),
        "goals.empty.body": t({
            en: "A goal names an amount, an account and a date, then tells you what that costs a month.",
            es: "Una meta define un monto, una cuenta y una fecha, y te dice cuánto apartar al mes.",
            "es-ES": "Una meta define un importe, una cuenta y una fecha, y te dice cuánto apartar al mes.",
            pt: "Uma meta define um valor, uma conta e uma data, e diz quanto separar por mês.",
        }),
        "goals.failedBody": t({
            en: "Something went wrong saving this goal. Try again.",
            es: "Algo salió mal al guardar esta meta. Inténtalo de nuevo.",
            pt: "Algo deu errado ao salvar esta meta. Tente de novo.",
        }),
        "goals.failedTitle": t({
            en: "Goal not saved",
            es: "Meta no guardada",
            pt: "Meta não salva",
        }),
        "goals.form.defaultName": t({
            en: "Savings goal",
            es: "Meta de ahorro",
            pt: "Meta de economia",
        }),
        "goals.heading": t({
            en: "Goals",
            es: "Metas",
            pt: "Metas",
        }),
        "goals.onPace": t({
            en: "on pace",
            es: "a buen ritmo",
            pt: "no ritmo",
        }),
        "goals.pace": t({
            en: "{amount}/mo",
            es: "{amount}/mes",
            pt: "{amount}/mês",
        }),
        "goals.reached": t({
            en: "Reached",
            es: "Alcanzada",
            pt: "Alcançada",
        }),
        "goals.sheet.amountBlank": t({
            en: "an amount",
            es: "un monto",
            "es-ES": "un importe",
            pt: "um valor",
        }),
        "goals.sheet.commit": t({
            en: "Set goal",
            es: "Crear meta",
            pt: "Criar meta",
        }),
        "goals.sheet.demands": t({
            en: "Demands {amount} a month for {months} months",
            es: "Necesitas {amount} al mes durante {months} meses",
            pt: "Você precisa de {amount} por mês durante {months} meses",
        }),
        "goals.sheet.demandsNow": t({
            en: "That date is here — the whole {amount} is due now",
            es: "Esa fecha ya llegó: necesitas los {amount} completos ahora",
            pt: "Essa data já chegou: você precisa do total de {amount} agora",
        }),
        "goals.sheet.editTargetA11y": t({
            en: "Edit target amount",
            es: "Editar monto objetivo",
            "es-ES": "Editar importe objetivo",
            pt: "Editar o valor do objetivo",
        }),
        "goals.sheet.holds": t({
            en: "Holds {amount} today",
            es: "Tiene {amount} hoy",
            pt: "Tem {amount} hoje",
        }),
        // Word order is the translator's: the template owns it, not the tree.
        "goals.sheet.save": t({
            en: "Save goal",
            es: "Guardar meta",
            pt: "Salvar meta",
        }),
        "goals.sheet.stated": t({
            en: "Put {amount} in {account} by {date}",
            es: "Junta {amount} en {account} para {date}",
            "es-ES": "Ahorra {amount} en {account} para {date}",
            pt: "Junte {amount} em {account} até {date}",
        }),
        "goals.summary.toGo": t({
            en: "{amount} to go",
            es: "faltan {amount}",
            pt: "faltam {amount}",
        }),
        "goals.toGo": t({
            en: "to go",
            es: "por juntar",
            "es-ES": "por ahorrar",
            pt: "a juntar",
        }),
        "goals.undo.deleted": t({
            en: "Goal deleted",
            es: "Meta eliminada",
            pt: "Meta apagada",
        }),
        "goals.unvalued.body": t({
            en: "{account}'s balance can't be converted yet, and a goal freezes it as its starting point. Try again once its exchange rate is available.",
            es: "El saldo de {account} aún no se puede convertir, y una meta lo congela como punto de partida. Inténtalo de nuevo cuando haya tasa de cambio.",
            "es-ES":
                "El saldo de {account} aún no se puede convertir, y una meta lo congela como punto de partida. Inténtalo de nuevo cuando haya tipo de cambio.",
            pt: "O saldo de {account} ainda não pode ser convertido, e uma meta o congela como ponto de partida. Tente de novo quando houver cotação.",
        }),
        "goals.unvalued.title": t({
            en: "No goal yet",
            es: "No se creó la meta",
            pt: "A meta não foi criada",
        }),
    },
    key: "goals" as const,
} satisfies Dictionary;

export default goals;
