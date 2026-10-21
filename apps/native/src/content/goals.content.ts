import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const goals = {
    content: {
        "goals.a11y.card": t({
            en: "{name}. {saved} of {target}, {percent} percent. {standing}.",
            es: "{name}. {saved} de {target}, {percent} por ciento. {standing}.",
        }),
        "goals.a11y.chart": t({
            en: "Balance against the pace this date demands. {standing}.",
            es: "Saldo frente al ritmo que necesitas para esta fecha. {standing}.",
        }),
        "goals.a11y.noStanding": t({
            en: "no pace to measure",
            es: "sin ritmo que medir",
        }),
        "goals.a11y.openHint": t({
            en: "Opens the goal",
            es: "Abre la meta",
        }),
        "goals.a11y.unvalued": t({
            en: "{name}. No exchange rate for this account yet, so its progress cannot be stated.",
            es: "{name}. Aún no hay tasa de cambio para esta cuenta, así que no se puede mostrar su progreso.",
        }),
        "goals.add": t({
            en: "New goal",
            es: "Nueva meta",
        }),
        "goals.ahead": t({
            en: "ahead",
            es: "adelantada",
        }),
        "goals.behind": t({
            en: "behind",
            es: "atrasada",
        }),
        "goals.card.unvalued": t({
            en: "No rate yet",
            es: "Sin tasa aún",
        }),
        "goals.currencyMoved.body": t({
            en: "The ledger's currency changed while you were setting this goal, so the amount no longer means what it did. Set it again.",
            es: "La moneda de tu registro cambió mientras creabas esta meta, así que el monto ya no significa lo mismo. Créala de nuevo.",
        }),
        "goals.currencyMoved.title": t({
            en: "No goal yet",
            es: "No se creó la meta",
        }),
        "goals.detail.monthsLeft": t({
            en: "Months left",
            es: "Meses restantes",
        }),
        "goals.detail.of": t({
            en: "of {amount} · {percent}%",
            es: "de {amount} · {percent}%",
        }),
        "goals.detail.pace": t({
            en: "Pace",
            es: "Ritmo",
        }),
        "goals.detail.perMonth": t({
            en: "Per month",
            es: "Al mes",
        }),
        "goals.detail.unvalued": t({
            en: "No exchange rate for this account yet, so there is nothing to plot against the target.",
            es: "Aún no hay tasa de cambio para esta cuenta, así que no hay nada que trazar frente al objetivo.",
        }),
        "goals.detail.verdictAhead": t({
            en: "You're {amount} ahead of where the date needs you.",
            es: "Llevas {amount} de ventaja sobre lo que pide la fecha.",
        }),
        "goals.detail.verdictBehind": t({
            en: "You're {amount} short of where the date needs you.",
            es: "Te faltan {amount} para ir al día con la fecha.",
        }),
        "goals.detail.verdictOnPace": t({
            en: "You're on pace for {date}.",
            es: "Vas a buen ritmo para {date}.",
        }),
        // Dateless on purpose: the goal records a deadline, never the day the balance crossed the target.
        "goals.detail.verdictReached": t({
            en: "Reached. There's nothing left to put aside.",
            es: "Meta alcanzada. Ya no tienes que apartar nada.",
        }),
        "goals.editor.account": t({
            en: "Account",
            es: "Cuenta",
        }),
        "goals.editor.accountNote": t({
            en: "Progress is this account's balance, so it can't be swapped.",
            es: "El progreso es el saldo de esta cuenta, así que no se puede cambiar.",
        }),
        "goals.editor.by": t({
            en: "By",
            es: "Para",
        }),
        "goals.editor.currency": t({
            en: "Set in {from}, read here in {to} at the rate on the day it was set.",
            es: "Definida en {from}, mostrada en {to} con la tasa del día en que se creó.",
        }),
        "goals.editor.delete": t({
            en: "Delete goal",
            es: "Eliminar meta",
        }),
        "goals.editor.name": t({
            en: "Name",
            es: "Nombre",
        }),
        "goals.editor.target": t({
            en: "Target",
            es: "Objetivo",
        }),
        "goals.editor.targetNote": t({
            en: "Committing {amount} a month",
            es: "Apartas {amount} al mes",
        }),
        "goals.editor.title": t({
            en: "Edit",
            es: "Editar",
        }),
        "goals.empty.body": t({
            en: "A goal names an amount, an account and a date, then tells you what that costs a month.",
            es: "Una meta define un monto, una cuenta y una fecha, y te dice cuánto apartar al mes.",
        }),
        "goals.failedBody": t({
            en: "Something went wrong saving this goal. Try again.",
            es: "Algo salió mal al guardar esta meta. Inténtalo de nuevo.",
        }),
        "goals.failedTitle": t({
            en: "Goal not saved",
            es: "Meta no guardada",
        }),
        "goals.form.defaultName": t({
            en: "Savings goal",
            es: "Meta de ahorro",
        }),
        "goals.heading": t({
            en: "Goals",
            es: "Metas",
        }),
        "goals.onPace": t({
            en: "on pace",
            es: "a buen ritmo",
        }),
        "goals.pace": t({
            en: "{amount}/mo",
            es: "{amount}/mes",
        }),
        "goals.reached": t({
            en: "Reached",
            es: "Alcanzada",
        }),
        "goals.sheet.amountBlank": t({
            en: "an amount",
            es: "un monto",
        }),
        "goals.sheet.commit": t({
            en: "Set goal",
            es: "Crear meta",
        }),
        "goals.sheet.demands": t({
            en: "Demands {amount} a month for {months} months",
            es: "Necesitas {amount} al mes durante {months} meses",
        }),
        "goals.sheet.demandsNow": t({
            en: "That date is here — the whole {amount} is due now",
            es: "Esa fecha ya llegó: necesitas los {amount} completos ahora",
        }),
        "goals.sheet.editTargetA11y": t({
            en: "Edit target amount",
            es: "Editar monto objetivo",
        }),
        "goals.sheet.holds": t({
            en: "Holds {amount} today",
            es: "Tiene {amount} hoy",
        }),
        // Word order is the translator's: the template owns it, not the tree.
        "goals.sheet.save": t({
            en: "Save goal",
            es: "Guardar meta",
        }),
        "goals.sheet.stated": t({
            en: "Put {amount} in {account} by {date}",
            es: "Junta {amount} en {account} para {date}",
        }),
        "goals.summary.toGo": t({
            en: "{amount} to go",
            es: "faltan {amount}",
        }),
        "goals.toGo": t({
            en: "to go",
            es: "por juntar",
        }),
        "goals.undo.deleted": t({
            en: "Goal deleted",
            es: "Meta eliminada",
        }),
        "goals.unvalued.body": t({
            en: "{account}'s balance can't be converted yet, and a goal freezes it as its starting point. Try again once its exchange rate is available.",
            es: "El saldo de {account} aún no se puede convertir, y una meta lo congela como punto de partida. Inténtalo de nuevo cuando haya tasa de cambio.",
        }),
        "goals.unvalued.title": t({
            en: "No goal yet",
            es: "No se creó la meta",
        }),
    },
    key: "goals" as const,
} satisfies Dictionary;

export default goals;
