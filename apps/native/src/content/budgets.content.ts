import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const budgets = {
    content: {
        "budgets.action.changeLimit": t({
            en: "Change limit",
            es: "Cambiar límite",
        }),
        "budgets.action.delete": t({
            en: "Delete",
            es: "Eliminar",
        }),
        "budgets.action.moreA11y": t({
            en: "Budget actions",
            es: "Acciones del presupuesto",
        }),
        "budgets.card.a11yLeft": t({
            en: "{name}, {amount} left",
            es: "{name}, {amount} disponible",
        }),
        "budgets.card.a11yOver": t({
            en: "{name}, {amount} over budget",
            es: "{name}, {amount} de más",
        }),
        "budgets.days_one": t({
            en: "{count} day",
            es: "{count} día",
        }),
        "budgets.days_other": t({
            en: "{count} days",
            es: "{count} días",
        }),
        "budgets.delete.failedBody": t({
            en: "Something went wrong deleting this budget, so it is still here. Try again.",
            es: "Algo salió mal al eliminar este presupuesto, así que sigue aquí. Inténtalo de nuevo.",
        }),
        "budgets.delete.failedTitle": t({
            en: "Not deleted",
            es: "No se eliminó",
        }),
        "budgets.detail.emptyClosed": t({
            en: "Nothing was spent in this period.",
            es: "No se gastó nada en este período.",
        }),
        "budgets.detail.emptyOpen": t({
            en: "No spending in this period yet.",
            es: "Aún no hay gastos en este período.",
        }),
        "budgets.detail.leftEachDay": t({
            en: "{amount} left each day",
            es: "{amount} disponible por día",
        }),
        "budgets.detail.leftPeriod": t({
            en: "left {period}",
            es: "disponible {period}",
        }),
        "budgets.detail.limit": t({
            en: "{amount} limit",
            es: "límite de {amount}",
        }),
        "budgets.detail.overBudget": t({
            en: "over budget",
            es: "de más",
        }),
        "budgets.detail.overPeriod": t({
            en: "over {period}",
            es: "de más {period}",
        }),
        "budgets.detail.percentSpent": t({
            en: "{percent}% spent",
            es: "{percent}% gastado",
        }),
        "budgets.detail.spent": t({
            en: "{amount} spent",
            es: "{amount} gastado",
        }),
        "budgets.detail.transactions": t({
            en: "TRANSACTIONS",
            es: "TRANSACCIONES",
        }),
        "budgets.detail.unspent": t({
            en: "unspent",
            es: "sin gastar",
        }),
        "budgets.editor.carry": t({
            en: "Carry over what's left",
            es: "Acumular lo que sobre",
        }),
        "budgets.editor.carryNote": t({
            en: "What you don't spend is added to the next period, and what you overspend is taken off it.",
            es: "Lo que no gastes se suma al período siguiente, y lo que te pases se le resta.",
        }),
        "budgets.editor.closedWindow": t({
            en: "Editing changes the current window, not this one.",
            es: "Si lo editas, cambia el período actual, no este.",
        }),
        "budgets.editor.currency": t({
            en: "Set in {from}. Saving restates it in {to}.",
            es: "Está en {from}. Al guardar, se convierte a {to}.",
        }),
        "budgets.editor.dropCarry": t({
            en: "Turning this off drops the {carry} carried in.",
            es: "Si lo desactivas, pierdes los {carry} acumulados.",
        }),
        "budgets.editor.every": t({
            en: "Every",
            es: "Cada",
        }),
        "budgets.editor.from": t({
            en: "From",
            es: "Desde",
        }),
        "budgets.editor.limit": t({
            en: "Limit",
            es: "Límite",
        }),
        "budgets.editor.limitCarry": t({
            en: "{amount} this window, with {carry} carried in",
            es: "{amount} en este período, con {carry} acumulados",
        }),
        "budgets.editor.name": t({
            en: "Name",
            es: "Nombre",
        }),
        "budgets.editor.nameNote": t({
            en: "Leave it blank to keep the category's own name.",
            es: "Déjalo vacío para conservar el nombre de la categoría.",
        }),
        "budgets.editor.reslice": t({
            en: "This window becomes {window}. What was spent before it stays where it was spent.",
            es: "Este período pasa a ser {window}. Lo que gastaste antes se queda donde lo gastaste.",
        }),
        "budgets.editor.title": t({
            en: "THE BUDGET",
            es: "EL PRESUPUESTO",
        }),
        "budgets.empty.action": t({
            en: "Add a Transaction",
            es: "Agregar una transacción",
        }),
        "budgets.empty.body": t({
            en: "Link budgets to categories and set appropriate expenditure goals.",
            es: "Ponle un presupuesto a cada categoría y decide cuánto quieres gastar.",
        }),
        "budgets.empty.title": t({
            en: "Budget Your Finances",
            es: "Arma tu presupuesto",
        }),
        "budgets.expenses_one": t({
            en: "{count} expense",
            es: "{count} gasto",
        }),
        "budgets.expenses_other": t({
            en: "{count} expenses",
            es: "{count} gastos",
        }),
        "budgets.hero.a11yLeft": t({
            en: "{name}, {amount} left {period}",
            es: "{name}, {amount} disponible {period}",
        }),
        "budgets.hero.a11yOver": t({
            en: "{name}, {amount} over budget",
            es: "{name}, {amount} de más",
        }),
        "budgets.hero.eyebrow": t({
            en: "EVERYTHING · {period}",
            es: "TODO · {period}",
        }),
        "budgets.hero.leftPeriod": t({
            en: "left {period}",
            es: "disponible {period}",
        }),
        "budgets.hero.onDate": t({
            en: "{label} on {date}",
            es: "{label} el {date}",
        }),
        "budgets.hero.overBudget": t({
            en: "over budget",
            es: "de más",
        }),
        // Percent, not a worded fraction: "four fifths" does not survive translation.
        "budgets.hero.verdictBlame": t({
            en: "{name} took {percent}% of it.",
            es: "{name} se llevó el {percent}%.",
        }),
        "budgets.hero.verdictEndsShort": t({
            en: "Still solvent, but on this pace the period ends {amount} short.",
            es: "Todavía te alcanza, pero a este ritmo te van a faltar {amount} al final del período.",
        }),
        "budgets.hero.verdictRanOutEarly": t({
            en: "Ran out {date}, {days} early.",
            es: "Se te acabó el {date}, {days} antes.",
        }),
        "budgets.hero.verdictRanOutFinal": t({
            en: "Ran out {date}, on the period's final day.",
            es: "Se te acabó el {date}, el último día del período.",
        }),
        "budgets.list.budgets": t({
            en: "BUDGETS",
            es: "PRESUPUESTOS",
        }),
        "budgets.list.categories": t({
            en: "CATEGORIES",
            es: "CATEGORÍAS",
        }),
        "budgets.list.overCount": t({
            en: "{over} OF {total} OVER",
            es: "{over} DE {total} EXCEDIDOS",
        }),
        "budgets.measure.limit": t({
            en: "LIMIT",
            es: "LÍMITE",
        }),
        "budgets.measure.perDay": t({
            en: "A DAY",
            es: "AL DÍA",
        }),
        "budgets.measure.spent": t({
            en: "SPENT",
            es: "GASTADO",
        }),
        "budgets.name.default": t({
            en: "Budget",
            es: "Presupuesto",
        }),
        "budgets.perDay": t({
            en: "{amount}/day",
            es: "{amount}/día",
        }),
        "budgets.period.day": t({
            en: "today",
            es: "hoy",
        }),
        "budgets.period.month": t({
            en: "this month",
            es: "este mes",
        }),
        "budgets.period.other": t({
            en: "this period",
            es: "este período",
        }),
        "budgets.period.week": t({
            en: "this week",
            es: "esta semana",
        }),
        "budgets.period.year": t({
            en: "this year",
            es: "este año",
        }),
        // Title case: a chip is a label. `budgets.periodPhrase.*` is the mid-sentence form.
        "budgets.periodName.day": t({
            en: "Day",
            es: "Día",
        }),
        "budgets.periodName.month": t({
            en: "Month",
            es: "Mes",
        }),
        "budgets.periodName.week": t({
            en: "Week",
            es: "Semana",
        }),
        "budgets.periodName.year": t({
            en: "Year",
            es: "Año",
        }),
        "budgets.periodPhrase.day": t({
            en: "a day",
            es: "al día",
        }),
        "budgets.periodPhrase.month": t({
            en: "a month",
            es: "al mes",
        }),
        "budgets.periodPhrase.week": t({
            en: "a week",
            es: "a la semana",
        }),
        "budgets.periodPhrase.year": t({
            en: "a year",
            es: "al año",
        }),
        "budgets.picker.commit": t({
            en: "Keep it under {amount}",
            es: "Mantenlo por debajo de {amount}",
        }),
        "budgets.picker.drag": t({
            en: "DRAG TO SET A LIMIT",
            es: "ARRASTRA PARA PONER UN LÍMITE",
        }),
        "budgets.picker.dragA11y": t({
            en: "Limit {amount} {period}. Drag up or down to change it.",
            es: "Límite {amount} {period}. Arrastra hacia arriba o abajo para cambiarlo.",
        }),
        "budgets.picker.held": t({
            en: "{window} would have held — {amount} to spare.",
            es: "{window} te habría alcanzado, con {amount} de sobra.",
        }),
        "budgets.picker.nothingYet": t({
            en: "Nothing spent in {window} yet.",
            es: "Todavía no has gastado nada en {window}.",
        }),
        "budgets.picker.ranOutEarly": t({
            en: "You would have run out on {date}, {days} early.",
            es: "Se te habría acabado el {date}, {days} antes.",
        }),
        "budgets.picker.ranOutFinal": t({
            en: "You would have run out on {date}, the final day.",
            es: "Se te habría acabado el {date}, el último día.",
        }),
        "budgets.picker.sparseDays": t({
            en: "Only {days} into {window} — too early to say how it would have gone.",
            es: "Apenas van {days} de {window}. Es muy pronto para saber cómo habría ido.",
        }),
        "budgets.picker.sparseExpenses": t({
            en: "Only {expenses} so far — too little to say how {window} would have gone.",
            es: "Apenas {expenses} hasta ahora. Es muy poco para saber cómo habría ido {window}.",
        }),
        "budgets.picker.spent": t({
            en: "SPENT {amount}",
            es: "GASTADO {amount}",
        }),
        "budgets.rail.another": t({
            en: "Budget another category",
            es: "Presupuestar otra categoría",
        }),
        "budgets.rail.set": t({
            en: "Set a limit",
            es: "Poner un límite",
        }),
        "budgets.rail.title": t({
            en: "NOT BUDGETED YET",
            es: "AÚN SIN PRESUPUESTO",
        }),
        "budgets.rail.typical": t({
            en: "{amount} {period}, typically",
            es: "{amount} {period}, normalmente",
        }),
        "budgets.row.actionsHint": t({
            en: "Double tap and hold to open actions for this budget",
            es: "Toca dos veces y mantén para abrir las acciones de este presupuesto",
        }),
        "budgets.row.deleteA11y": t({
            en: "Delete the {name} budget",
            es: "Eliminar el presupuesto {name}",
        }),
        "budgets.save.failedBody": t({
            en: "Something went wrong writing this budget, so nothing was saved. Try again.",
            es: "Algo salió mal al guardar este presupuesto, así que no se guardó nada. Inténtalo de nuevo.",
        }),
        "budgets.save.failedTitle": t({
            en: "Not saved",
            es: "No se guardó",
        }),
        "budgets.scope.everything": t({
            en: "Everything",
            es: "Todo",
        }),
        "budgets.sheet.alreadySpent": t({
            en: "Already {amount} spent. This starts you {over} over.",
            es: "Ya llevas {amount} gastados. Empiezas {over} por encima.",
        }),
        "budgets.sheet.editLimitA11y": t({
            en: "Edit the limit",
            es: "Editar el límite",
        }),
        "budgets.sheet.lastWindows": t({
            en: "{over} of the last {total} went over",
            es: "Te pasaste en {over} de los últimos {total}",
        }),
        "budgets.sheet.perDay": t({
            en: "{amount} a day for the {days} left",
            es: "{amount} al día por los {days} que quedan",
        }),
        "budgets.sheet.singleton": t({
            en: "One overall budget at a time. This changes the one you have.",
            es: "Solo puedes tener un presupuesto general. Esto cambia el que ya tienes.",
        }),
        // Word order is the translator's: `{scope}` is a category name or "everything", `{period}` a period phrase.
        "budgets.sheet.stated": t({
            en: "Keep {scope} under {period}",
            es: "Tu límite para {scope} {period}",
        }),
        "budgets.sheet.tapToType": t({
            en: "tap to type",
            es: "toca para escribir",
        }),
        "budgets.sheet.typical": t({
            en: "typical {amount}",
            es: "normalmente {amount}",
        }),
        "budgets.spentOfLimit": t({
            en: "{spent} of {limit}",
            es: "{spent} de {limit}",
        }),
        "budgets.stepper.next": t({
            en: "Next period",
            es: "Período siguiente",
        }),
        "budgets.stepper.previous": t({
            en: "Previous period",
            es: "Período anterior",
        }),
        "budgets.suffix.left": t({
            en: "left",
            es: "disponible",
        }),
        "budgets.suffix.over": t({
            en: "over",
            es: "de más",
        }),
        "budgets.title": t({
            en: "Budgets",
            es: "Presupuestos",
        }),
        "budgets.undo.deleted": t({
            en: "Budget deleted",
            es: "Presupuesto eliminado",
        }),
        "budgets.widget.none": t({
            en: "No budget yet",
            es: "Aún sin presupuesto",
        }),
    },
    key: "budgets" as const,
} satisfies Dictionary;

export default budgets;
