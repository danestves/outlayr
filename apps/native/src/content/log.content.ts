import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const log = {
    content: {
        "log.add.import": t({
            en: "Import a CSV",
            es: "Importar un CSV",
            pt: "Importar um CSV",
        }),
        "log.add.menu": t({
            en: "Add",
            es: "Agregar",
            pt: "Adicionar",
        }),
        "log.add.scan": t({
            en: "Scan a receipt",
            es: "Escanear un recibo",
            pt: "Escanear um recibo",
        }),
        "log.add.transaction": t({
            en: "Add a transaction",
            es: "Agregar una transacción",
            pt: "Adicionar um lançamento",
        }),
        "log.add.transfer": t({
            en: "Move money",
            es: "Mover dinero",
            pt: "Mover dinheiro",
        }),
        "log.add.voice": t({
            en: "Speak an entry",
            es: "Dictar un registro",
            pt: "Ditar um lançamento",
        }),
        "log.amounts.hidden": t({
            en: "Amount hidden",
            es: "Monto oculto",
            pt: "Valor oculto",
        }),
        "log.amounts.hide": t({
            en: "Hide amounts",
            es: "Ocultar montos",
            pt: "Ocultar valores",
        }),
        "log.amounts.show": t({
            en: "Show amounts",
            es: "Mostrar montos",
            pt: "Mostrar valores",
        }),
        "log.chip.earlier": t({
            en: "Earlier",
            es: "Anterior",
            pt: "Anterior",
        }),
        "log.chip.later": t({
            en: "Later",
            es: "Siguiente",
            pt: "Próximo",
        }),
        "log.chip.now": t({
            en: "Now",
            es: "Ahora",
            pt: "Agora",
        }),
        "log.chip.remove": t({
            en: "Remove filter",
            es: "Quitar filtro",
            pt: "Remover filtro",
        }),
        "log.delete.failedBody": t({
            en: "Nothing was removed, so it's back on your log. Try again.",
            es: "No se eliminó nada, así que volvió a tu registro. Inténtalo de nuevo.",
            pt: "Nada foi apagado, então ele voltou para seus lançamentos. Tente de novo.",
        }),
        "log.delete.failedTitle": t({
            en: "Couldn't delete the entry",
            es: "No se pudo eliminar el registro",
            pt: "Não foi possível apagar o lançamento",
        }),
        "log.empty.body": t({
            en: "Your first entry sets the baseline everything else is measured against.",
            es: "Tu primer registro define la base con la que se compara todo lo demás.",
            pt: "Seu primeiro lançamento define a base com que todo o resto é comparado.",
        }),
        "log.empty.title": t({
            en: "Nothing logged yet",
            es: "Aún no hay registros",
            pt: "Nada registrado ainda",
        }),
        "log.filter.all": t({
            en: "all entries",
            es: "todos los registros",
            pt: "todos os lançamentos",
        }),
        "log.filter.category": t({
            en: "by category",
            es: "por categoría",
            pt: "por categoria",
        }),
        "log.filter.day": t({
            en: "by day",
            es: "por día",
            pt: "por dia",
        }),
        "log.filter.month": t({
            en: "by month",
            es: "por mes",
            pt: "por mês",
        }),
        "log.filter.recurring": t({
            en: "recurring",
            es: "recurrente",
            pt: "recorrente",
        }),
        "log.filter.transfers": t({
            en: "Transfers",
            es: "Transferencias",
            pt: "Transferências",
        }),
        "log.filter.type": t({
            en: "by type",
            es: "por tipo",
            pt: "por tipo",
        }),
        "log.filter.upcoming": t({
            en: "upcoming",
            es: "próximos",
            pt: "próximos",
        }),
        "log.filter.week": t({
            en: "by week",
            es: "por semana",
            pt: "por semana",
        }),
        "log.insights.also": t({
            en: "Also {period}",
            es: "También {period}",
            pt: "Também {period}",
        }),
        "log.insights.currency": t({
            en: "Currency",
            es: "Moneda",
            pt: "Moeda",
        }),
        "log.insights.currencyManage": t({
            en: "Edit favourites…",
            es: "Editar favoritas…",
            pt: "Editar favoritas…",
        }),
        "log.insights.currencyShown": t({
            en: "Currency shown",
            es: "Moneda mostrada",
            pt: "Moeda exibida",
        }),
        "log.ledger.showFigure": t({
            en: "Show this figure",
            es: "Mostrar esta cifra",
            pt: "Mostrar este valor",
        }),
        "log.measure.in": t({
            en: "In",
            es: "Entró",
            pt: "Entrou",
        }),
        "log.measure.net": t({
            en: "Net",
            es: "Neto",
            pt: "Líquido",
        }),
        "log.measure.out": t({
            en: "Out",
            es: "Salió",
            pt: "Saiu",
        }),
        "log.noResults": t({
            en: "No entries found.",
            es: "No se encontraron registros.",
            pt: "Nenhum lançamento encontrado.",
        }),
        "log.period.all": t({
            en: "all time",
            es: "todo el tiempo",
            pt: "todo o período",
        }),
        "log.period.day": t({
            en: "today",
            es: "hoy",
            pt: "hoje",
        }),
        "log.period.month": t({
            en: "this month",
            es: "este mes",
            pt: "este mês",
        }),
        "log.period.week": t({
            en: "this week",
            es: "esta semana",
            pt: "esta semana",
        }),
        "log.period.year": t({
            en: "this year",
            es: "este año",
            pt: "este ano",
        }),
        "log.row.actionsHint": t({
            en: "Double tap and hold to open actions for this entry",
            es: "Toca dos veces y mantén para abrir las acciones de este registro",
            pt: "Toque duas vezes e segure para abrir as ações deste lançamento",
        }),
        "log.row.amountExpense": t({
            en: "Expense {amount}",
            es: "Gasto de {amount}",
            pt: "Despesa de {amount}",
        }),
        "log.row.amountIncome": t({
            en: "Income {amount}",
            es: "Ingreso de {amount}",
            pt: "Receita de {amount}",
        }),
        "log.row.amountTransfer": t({
            en: "{amount} moved",
            es: "{amount} movidos",
            pt: "{amount} transferidos",
        }),
        "log.row.amountTransferIn": t({
            en: "{amount} moved in",
            es: "Entrada de {amount}",
            pt: "Entrada de {amount}",
        }),
        "log.row.amountTransferOut": t({
            en: "{amount} moved out",
            es: "Salida de {amount}",
            pt: "Saída de {amount}",
        }),
        "log.row.arrived": t({
            en: "{arrived} arrived",
            es: "Llegaron {arrived}",
            pt: "Chegaram {arrived}",
        }),
        "log.row.arrivedAfterFee": t({
            en: "{arrived} arrived after a {fee} fee",
            es: "Llegaron {arrived} tras una comisión de {fee}",
            pt: "Chegaram {arrived} após uma tarifa de {fee}",
        }),
        "log.row.delete": t({
            en: "Delete",
            es: "Eliminar",
            pt: "Apagar",
        }),
        "log.row.deleteAccessibility": t({
            en: "Delete transaction",
            es: "Eliminar transacción",
            pt: "Apagar lançamento",
        }),
        "log.row.fee": t({
            en: "+{amount} fee",
            es: "+{amount} de comisión",
            pt: "+{amount} de tarifa",
        }),
        "log.row.feeIncluded": t({
            en: "{subtitle}, fee included",
            es: "{subtitle}, comisión incluida",
            pt: "{subtitle}, tarifa incluída",
        }),
        "log.row.outside": t({
            en: "{amount} from another account",
            es: "{amount} de otra cuenta",
            pt: "{amount} de outra conta",
        }),
        "log.row.rateNeeded": t({
            en: "Rate needed",
            es: "Falta la tasa",
            pt: "Falta a cotação",
        }),
        "log.row.rateNeededAccessibility": t({
            en: "Custom exchange rate confirmation needed. Open this transaction to confirm it.",
            es: "Se necesita confirmar la tasa de cambio personalizada. Abre esta transacción para confirmarla.",
            pt: "É preciso confirmar a cotação personalizada. Abra este lançamento para confirmá-la.",
        }),
        "log.row.unplaced": t({
            en: "Currency not recorded, shown as {code}",
            es: "Moneda no registrada, se muestra como {code}",
            pt: "Moeda não registrada, exibida como {code}",
        }),
        "log.scope.clear": t({
            en: "Clear",
            es: "Quitar",
            pt: "Limpar",
        }),
        "log.scope.otherCurrencies": t({
            en: "Other currencies",
            es: "Otras monedas",
            pt: "Outras moedas",
        }),
        "log.title": t({
            en: "Log",
            es: "Registro",
            pt: "Lançamentos",
        }),
        "log.toolbar.filter": t({
            en: "Filter",
            es: "Filtrar",
            pt: "Filtrar",
        }),
        "log.toolbar.period": t({
            en: "Period",
            es: "Período",
            pt: "Período",
        }),
        "log.toolbar.search": t({
            en: "Search",
            es: "Buscar",
            pt: "Buscar",
        }),
        "log.toolbar.show": t({
            en: "Show",
            es: "Mostrar",
            pt: "Mostrar",
        }),
        "log.type.expense": t({
            en: "Expense",
            es: "Gasto",
            pt: "Despesa",
        }),
        "log.type.income": t({
            en: "Income",
            es: "Ingreso",
            pt: "Receita",
        }),
        "log.undo.deleted": t({
            en: "Log deleted",
            es: "Registro eliminado",
            pt: "Lançamento apagado",
        }),
        "log.upcoming.heading": t({
            en: "UPCOMING",
            es: "PRÓXIMOS",
            pt: "PRÓXIMOS",
        }),
        "log.repriced.body": t({
            en: "Was {from}. Future charges follow.",
            es: "Antes {from}. Los próximos cobros siguen el nuevo precio.",
            pt: "Antes {from}. As próximas cobranças seguem o novo preço.",
        }),
        "log.repriced.title": t({
            en: "{name} now costs {to}",
            es: "{name} ahora cuesta {to}",
            pt: "{name} agora custa {to}",
        }),
        "log.upcoming.perMonth": t({
            en: "PER MONTH",
            es: "AL MES",
            pt: "POR MÊS",
        }),
    },
    key: "log" as const,
} satisfies Dictionary;

export default log;
