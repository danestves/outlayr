import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const budgets = {
    content: {
        "budgets.action.changeLimit": t({
            en: "Change limit",
            es: "Cambiar límite",
            pt: "Alterar limite",
        }),
        "budgets.action.delete": t({
            en: "Delete",
            es: "Eliminar",
            pt: "Apagar",
        }),
        "budgets.action.moreA11y": t({
            en: "Budget actions",
            es: "Acciones del presupuesto",
            pt: "Ações do orçamento",
        }),
        "budgets.card.a11yLeft": t({
            en: "{name}, {amount} left",
            es: "{name}, {amount} disponible",
            pt: "{name}, {amount} disponível",
        }),
        "budgets.card.a11yOver": t({
            en: "{name}, {amount} over budget",
            es: "{name}, {amount} de más",
            pt: "{name}, {amount} a mais",
        }),
        "budgets.days_one": t({
            en: "{count} day",
            es: "{count} día",
            pt: "{count} dia",
        }),
        "budgets.days_other": t({
            en: "{count} days",
            es: "{count} días",
            pt: "{count} dias",
        }),
        "budgets.delete.failedBody": t({
            en: "Something went wrong deleting this budget, so it is still here. Try again.",
            es: "Algo salió mal al eliminar este presupuesto, así que sigue aquí. Inténtalo de nuevo.",
            pt: "Algo deu errado ao apagar este orçamento, então ele continua aqui. Tente de novo.",
        }),
        "budgets.delete.failedTitle": t({
            en: "Not deleted",
            es: "No se eliminó",
            pt: "Não foi apagado",
        }),
        "budgets.detail.emptyClosed": t({
            en: "Nothing was spent in this period.",
            es: "No se gastó nada en este período.",
            pt: "Nada foi gasto neste período.",
        }),
        "budgets.detail.emptyOpen": t({
            en: "No spending in this period yet.",
            es: "Aún no hay gastos en este período.",
            pt: "Ainda não há gastos neste período.",
        }),
        "budgets.detail.leftEachDay": t({
            en: "{amount} left each day",
            es: "{amount} disponible por día",
            pt: "{amount} disponível por dia",
        }),
        "budgets.detail.leftPeriod": t({
            en: "left {period}",
            es: "disponible {period}",
            pt: "disponível {period}",
        }),
        "budgets.detail.limit": t({
            en: "{amount} limit",
            es: "límite de {amount}",
            pt: "limite de {amount}",
        }),
        "budgets.detail.overBudget": t({
            en: "over budget",
            es: "de más",
            pt: "a mais",
        }),
        "budgets.detail.overPeriod": t({
            en: "over {period}",
            es: "de más {period}",
            pt: "a mais {period}",
        }),
        "budgets.detail.percentSpent": t({
            en: "{percent}% spent",
            es: "{percent}% gastado",
            pt: "{percent}% gasto",
        }),
        "budgets.detail.spent": t({
            en: "{amount} spent",
            es: "{amount} gastado",
            pt: "{amount} gastos",
        }),
        "budgets.detail.transactions": t({
            en: "TRANSACTIONS",
            es: "TRANSACCIONES",
            pt: "LANÇAMENTOS",
        }),
        "budgets.detail.unspent": t({
            en: "unspent",
            es: "sin gastar",
            pt: "não gasto",
        }),
        "budgets.editor.carry": t({
            en: "Carry over what's left",
            es: "Acumular lo que sobre",
            pt: "Acumular o que sobrar",
        }),
        "budgets.editor.carryNote": t({
            en: "What you don't spend is added to the next period, and what you overspend is taken off it.",
            es: "Lo que no gastes se suma al período siguiente, y lo que te pases se le resta.",
            pt: "O que você não gastar é somado ao próximo período, e o que passar é descontado dele.",
        }),
        "budgets.editor.closedWindow": t({
            en: "Editing changes the current window, not this one.",
            es: "Si lo editas, cambia el período actual, no este.",
            pt: "Editar muda o período atual, não este.",
        }),
        "budgets.editor.currency": t({
            en: "Set in {from}. Saving restates it in {to}.",
            es: "Está en {from}. Al guardar, se convierte a {to}.",
            pt: "Está em {from}. Ao salvar, é convertido para {to}.",
        }),
        "budgets.editor.dropCarry": t({
            en: "Turning this off drops the {carry} carried in.",
            es: "Si lo desactivas, pierdes los {carry} acumulados.",
            pt: "Se desativar, você perde os {carry} acumulados.",
        }),
        "budgets.editor.every": t({
            en: "Every",
            es: "Cada",
            pt: "A cada",
        }),
        "budgets.editor.from": t({
            en: "From",
            es: "Desde",
            pt: "Desde",
        }),
        "budgets.editor.limit": t({
            en: "Limit",
            es: "Límite",
            pt: "Limite",
        }),
        "budgets.editor.limitCarry": t({
            en: "{amount} this window, with {carry} carried in",
            es: "{amount} en este período, con {carry} acumulados",
            pt: "{amount} neste período, com {carry} acumulados",
        }),
        "budgets.editor.name": t({
            en: "Name",
            es: "Nombre",
            pt: "Nome",
        }),
        "budgets.editor.nameNote": t({
            en: "Leave it blank to keep the category's own name.",
            es: "Déjalo vacío para conservar el nombre de la categoría.",
            pt: "Deixe em branco para manter o nome da categoria.",
        }),
        "budgets.editor.reslice": t({
            en: "This window becomes {window}. What was spent before it stays where it was spent.",
            es: "Este período pasa a ser {window}. Lo que gastaste antes se queda donde lo gastaste.",
            pt: "Este período passa a ser {window}. O que foi gasto antes fica onde foi gasto.",
        }),
        "budgets.editor.title": t({
            en: "THE BUDGET",
            es: "EL PRESUPUESTO",
            pt: "O ORÇAMENTO",
        }),
        "budgets.empty.action": t({
            en: "Add a Transaction",
            es: "Agregar una transacción",
            pt: "Adicionar um lançamento",
        }),
        "budgets.empty.body": t({
            en: "Link budgets to categories and set appropriate expenditure goals.",
            es: "Ponle un presupuesto a cada categoría y decide cuánto quieres gastar.",
            pt: "Defina um orçamento para cada categoria e decida quanto quer gastar.",
        }),
        "budgets.empty.title": t({
            en: "Budget Your Finances",
            es: "Arma tu presupuesto",
            pt: "Monte seu orçamento",
        }),
        "budgets.expenses_one": t({
            en: "{count} expense",
            es: "{count} gasto",
            pt: "{count} despesa",
        }),
        "budgets.expenses_other": t({
            en: "{count} expenses",
            es: "{count} gastos",
            pt: "{count} despesas",
        }),
        "budgets.hero.a11yLeft": t({
            en: "{name}, {amount} left {period}",
            es: "{name}, {amount} disponible {period}",
            pt: "{name}, {amount} disponível {period}",
        }),
        "budgets.hero.a11yOver": t({
            en: "{name}, {amount} over budget",
            es: "{name}, {amount} de más",
            pt: "{name}, {amount} a mais",
        }),
        "budgets.hero.eyebrow": t({
            en: "EVERYTHING · {period}",
            es: "TODO · {period}",
            pt: "TUDO · {period}",
        }),
        "budgets.hero.leftPeriod": t({
            en: "left {period}",
            es: "disponible {period}",
            pt: "disponível {period}",
        }),
        "budgets.hero.onDate": t({
            en: "{label} on {date}",
            es: "{label} el {date}",
            pt: "{label} em {date}",
        }),
        "budgets.hero.overBudget": t({
            en: "over budget",
            es: "de más",
            pt: "a mais",
        }),
        // Percent, not a worded fraction: "four fifths" does not survive translation.
        "budgets.hero.verdictBlame": t({
            en: "{name} took {percent}% of it.",
            es: "{name} se llevó el {percent}%.",
            pt: "{name} ficou com {percent}%.",
        }),
        "budgets.hero.verdictEndsShort": t({
            en: "Still solvent, but on this pace the period ends {amount} short.",
            es: "Todavía te alcanza, pero a este ritmo te van a faltar {amount} al final del período.",
            pt: "Ainda dá, mas nesse ritmo vão faltar {amount} no fim do período.",
        }),
        "budgets.hero.verdictRanOutEarly": t({
            en: "Ran out {date}, {days} early.",
            es: "Se te acabó el {date}, {days} antes.",
            pt: "Acabou em {date}, {days} antes.",
        }),
        "budgets.hero.verdictRanOutFinal": t({
            en: "Ran out {date}, on the period's final day.",
            es: "Se te acabó el {date}, el último día del período.",
            pt: "Acabou em {date}, no último dia do período.",
        }),
        "budgets.list.budgets": t({
            en: "BUDGETS",
            es: "PRESUPUESTOS",
            pt: "ORÇAMENTOS",
        }),
        "budgets.list.categories": t({
            en: "CATEGORIES",
            es: "CATEGORÍAS",
            pt: "CATEGORIAS",
        }),
        "budgets.list.overCount": t({
            en: "{over} OF {total} OVER",
            es: "{over} DE {total} EXCEDIDOS",
            pt: "{over} DE {total} ESTOURADOS",
        }),
        "budgets.measure.limit": t({
            en: "LIMIT",
            es: "LÍMITE",
            pt: "LIMITE",
        }),
        "budgets.measure.perDay": t({
            en: "A DAY",
            es: "AL DÍA",
            pt: "POR DIA",
        }),
        "budgets.measure.spent": t({
            en: "SPENT",
            es: "GASTADO",
            pt: "GASTO",
        }),
        "budgets.name.default": t({
            en: "Budget",
            es: "Presupuesto",
            pt: "Orçamento",
        }),
        "budgets.perDay": t({
            en: "{amount}/day",
            es: "{amount}/día",
            pt: "{amount}/dia",
        }),
        "budgets.period.day": t({
            en: "today",
            es: "hoy",
            pt: "hoje",
        }),
        "budgets.period.month": t({
            en: "this month",
            es: "este mes",
            pt: "este mês",
        }),
        "budgets.period.other": t({
            en: "this period",
            es: "este período",
            pt: "este período",
        }),
        "budgets.period.week": t({
            en: "this week",
            es: "esta semana",
            pt: "esta semana",
        }),
        "budgets.period.year": t({
            en: "this year",
            es: "este año",
            pt: "este ano",
        }),
        // Title case: a chip is a label. `budgets.periodPhrase.*` is the mid-sentence form.
        "budgets.periodName.day": t({
            en: "Day",
            es: "Día",
            pt: "Dia",
        }),
        "budgets.periodName.month": t({
            en: "Month",
            es: "Mes",
            pt: "Mês",
        }),
        "budgets.periodName.week": t({
            en: "Week",
            es: "Semana",
            pt: "Semana",
        }),
        "budgets.periodName.year": t({
            en: "Year",
            es: "Año",
            pt: "Ano",
        }),
        "budgets.periodPhrase.day": t({
            en: "a day",
            es: "al día",
            pt: "por dia",
        }),
        "budgets.periodPhrase.month": t({
            en: "a month",
            es: "al mes",
            pt: "por mês",
        }),
        "budgets.periodPhrase.week": t({
            en: "a week",
            es: "a la semana",
            pt: "por semana",
        }),
        "budgets.periodPhrase.year": t({
            en: "a year",
            es: "al año",
            pt: "por ano",
        }),
        "budgets.picker.commit": t({
            en: "Keep it under {amount}",
            es: "Mantenlo por debajo de {amount}",
            pt: "Manter abaixo de {amount}",
        }),
        "budgets.picker.drag": t({
            en: "DRAG TO SET A LIMIT",
            es: "ARRASTRA PARA PONER UN LÍMITE",
            pt: "ARRASTE PARA DEFINIR UM LIMITE",
        }),
        "budgets.picker.dragA11y": t({
            en: "Limit {amount} {period}. Drag up or down to change it.",
            es: "Límite {amount} {period}. Arrastra hacia arriba o abajo para cambiarlo.",
            pt: "Limite de {amount} {period}. Arraste para cima ou para baixo para mudar.",
        }),
        "budgets.picker.held": t({
            en: "{window} would have held — {amount} to spare.",
            es: "{window} te habría alcanzado, con {amount} de sobra.",
            pt: "Em {window}, teria sobrado {amount}.",
        }),
        "budgets.picker.nothingYet": t({
            en: "Nothing spent in {window} yet.",
            es: "Todavía no has gastado nada en {window}.",
            pt: "Você ainda não gastou nada em {window}.",
        }),
        "budgets.picker.ranOutEarly": t({
            en: "You would have run out on {date}, {days} early.",
            es: "Se te habría acabado el {date}, {days} antes.",
            pt: "Teria acabado em {date}, {days} antes.",
        }),
        "budgets.picker.ranOutFinal": t({
            en: "You would have run out on {date}, the final day.",
            es: "Se te habría acabado el {date}, el último día.",
            pt: "Teria acabado em {date}, no último dia.",
        }),
        "budgets.picker.sparseDays": t({
            en: "Only {days} into {window} — too early to say how it would have gone.",
            es: "Apenas van {days} de {window}. Es muy pronto para saber cómo habría ido.",
            pt: "Só {days} de {window}. É cedo demais para saber como teria sido.",
        }),
        "budgets.picker.sparseExpenses": t({
            en: "Only {expenses} so far — too little to say how {window} would have gone.",
            es: "Apenas {expenses} hasta ahora. Es muy poco para saber cómo habría ido {window}.",
            pt: "Só {expenses} até agora. É pouco para saber como teria sido {window}.",
        }),
        "budgets.picker.spent": t({
            en: "SPENT {amount}",
            es: "GASTADO {amount}",
            pt: "GASTO {amount}",
        }),
        "budgets.rail.another": t({
            en: "Budget another category",
            es: "Presupuestar otra categoría",
            pt: "Orçamento para outra categoria",
        }),
        "budgets.rail.set": t({
            en: "Set a limit",
            es: "Poner un límite",
            pt: "Definir um limite",
        }),
        "budgets.rail.title": t({
            en: "NOT BUDGETED YET",
            es: "AÚN SIN PRESUPUESTO",
            pt: "AINDA SEM ORÇAMENTO",
        }),
        "budgets.rail.typical": t({
            en: "{amount} {period}, typically",
            es: "{amount} {period}, normalmente",
            pt: "{amount} {period}, normalmente",
        }),
        "budgets.row.actionsHint": t({
            en: "Double tap and hold to open actions for this budget",
            es: "Toca dos veces y mantén para abrir las acciones de este presupuesto",
            pt: "Toque duas vezes e segure para abrir as ações deste orçamento",
        }),
        "budgets.row.deleteA11y": t({
            en: "Delete the {name} budget",
            es: "Eliminar el presupuesto {name}",
            pt: "Apagar o orçamento {name}",
        }),
        "budgets.save.failedBody": t({
            en: "Something went wrong writing this budget, so nothing was saved. Try again.",
            es: "Algo salió mal al guardar este presupuesto, así que no se guardó nada. Inténtalo de nuevo.",
            pt: "Algo deu errado ao salvar este orçamento, então nada foi salvo. Tente de novo.",
        }),
        "budgets.save.failedTitle": t({
            en: "Not saved",
            es: "No se guardó",
            pt: "Não foi salvo",
        }),
        "budgets.scope.everything": t({
            en: "Everything",
            es: "Todo",
            pt: "Tudo",
        }),
        "budgets.sheet.alreadySpent": t({
            en: "Already {amount} spent. This starts you {over} over.",
            es: "Ya llevas {amount} gastados. Empiezas {over} por encima.",
            pt: "Você já gastou {amount}. Começa {over} acima do limite.",
        }),
        "budgets.sheet.editLimitA11y": t({
            en: "Edit the limit",
            es: "Editar el límite",
            pt: "Editar o limite",
        }),
        "budgets.sheet.lastWindows": t({
            en: "{over} of the last {total} went over",
            es: "Te pasaste en {over} de los últimos {total}",
            pt: "Você estourou em {over} dos últimos {total}",
        }),
        "budgets.sheet.perDay": t({
            en: "{amount} a day for the {days} left",
            es: "{amount} al día por los {days} que quedan",
            pt: "{amount} por dia nos {days} restantes",
        }),
        "budgets.sheet.singleton": t({
            en: "One overall budget at a time. This changes the one you have.",
            es: "Solo puedes tener un presupuesto general. Esto cambia el que ya tienes.",
            pt: "Só pode haver um orçamento geral. Isto muda o que você já tem.",
        }),
        // Word order is the translator's: `{scope}` is a category name or "everything", `{period}` a period phrase.
        "budgets.sheet.stated": t({
            en: "Keep {scope} under {period}",
            es: "Tu límite para {scope} {period}",
            pt: "Seu limite para {scope} {period}",
        }),
        "budgets.sheet.tapToType": t({
            en: "tap to type",
            es: "toca para escribir",
            pt: "toque para digitar",
        }),
        "budgets.sheet.typical": t({
            en: "typical {amount}",
            es: "normalmente {amount}",
            pt: "normalmente {amount}",
        }),
        "budgets.spentOfLimit": t({
            en: "{spent} of {limit}",
            es: "{spent} de {limit}",
            pt: "{spent} de {limit}",
        }),
        "budgets.stepper.next": t({
            en: "Next period",
            es: "Período siguiente",
            pt: "Próximo período",
        }),
        "budgets.stepper.previous": t({
            en: "Previous period",
            es: "Período anterior",
            pt: "Período anterior",
        }),
        "budgets.suffix.left": t({
            en: "left",
            es: "disponible",
            pt: "disponível",
        }),
        "budgets.suffix.over": t({
            en: "over",
            es: "de más",
            pt: "a mais",
        }),
        "budgets.title": t({
            en: "Budgets",
            es: "Presupuestos",
            pt: "Orçamentos",
        }),
        "budgets.undo.deleted": t({
            en: "Budget deleted",
            es: "Presupuesto eliminado",
            pt: "Orçamento apagado",
        }),
        "budgets.widget.none": t({
            en: "No budget yet",
            es: "Aún sin presupuesto",
            pt: "Ainda sem orçamento",
        }),
    },
    key: "budgets" as const,
} satisfies Dictionary;

export default budgets;
