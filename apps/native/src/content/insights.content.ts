import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const insights = {
    content: {
        "insights.balance": t({
            en: "Balance",
            es: "Saldo",
            pt: "Saldo",
        }),
        "insights.burndown.holding": t({
            en: "Burn-down chart, day {day} of {days}, {percent} percent of the limit left",
            es: "Gráfico de consumo, día {day} de {days}, queda el {percent} por ciento del límite",
            pt: "Gráfico de consumo, dia {day} de {days}, resta {percent} por cento do limite",
        }),
        "insights.burndown.over": t({
            en: "Burn-down chart, day {day} of {days}, {percent} percent over the limit",
            es: "Gráfico de consumo, día {day} de {days}, {percent} por ciento por encima del límite",
            pt: "Gráfico de consumo, dia {day} de {days}, {percent} por cento acima do limite",
        }),
        "insights.calendar.day": t({
            en: "{date}, {amount} spent",
            es: "{date}, {amount} gastados",
            pt: "{date}, {amount} gastos",
        }),
        "insights.calendar.dayApproximate": t({
            en: "{date}, approximately {amount} spent",
            es: "{date}, aproximadamente {amount} gastados",
            pt: "{date}, cerca de {amount} gastos",
        }),
        "insights.calendar.empty": t({
            en: "No spending in the last six months.",
            es: "Sin gastos en los últimos seis meses.",
            pt: "Nenhum gasto nos últimos seis meses.",
        }),
        "insights.calendar.less": t({
            en: "Less",
            es: "Menos",
            pt: "Menos",
        }),
        "insights.calendar.more": t({
            en: "More",
            es: "Más",
            pt: "Mais",
        }),
        "insights.calendar.range": t({
            en: "Last six months",
            es: "Últimos seis meses",
            pt: "Últimos seis meses",
        }),
        "insights.calendar.title": t({
            en: "Spending",
            es: "Gastos",
            pt: "Gastos",
        }),
        "insights.categories": t({
            en: "Categories",
            es: "Categorías",
            pt: "Categorias",
        }),
        "insights.category.clearFilter": t({
            en: "Clear category filter",
            es: "Quitar filtro de categoría",
            pt: "Limpar filtro de categoria",
        }),
        "insights.category.share": t({
            en: "{name} {percent} percent",
            es: "{name} {percent} por ciento",
            pt: "{name} {percent} por cento",
        }),
        "insights.list.empty": t({
            en: "No entries found.",
            es: "No se encontraron registros.",
            pt: "Nenhum lançamento encontrado.",
            "pt-PT": "Nenhum registo encontrado.",
        }),
        "insights.list.more": t({
            en: "{count} more",
            es: "{count} más",
            pt: "mais {count}",
        }),
        "insights.list.showAll": t({
            en: "Show all",
            es: "Ver todo",
            pt: "Ver tudo",
        }),
        "insights.measure.income": t({
            en: "Income",
            es: "Ingreso",
            pt: "Receita",
        }),
        "insights.measure.net": t({
            en: "Net",
            es: "Neto",
            pt: "Líquido",
        }),
        "insights.measure.spent": t({
            en: "Spent",
            es: "Gastado",
            pt: "Gasto",
        }),
        "insights.movers.new": t({
            en: "new",
            es: "nuevo",
            pt: "novo",
        }),
        "insights.movers.title": t({
            en: "Movers",
            es: "Cambios",
            pt: "Variações",
        }),
        "insights.movers.versus": t({
            en: "vs {label}",
            es: "vs. {label}",
            pt: "vs. {label}",
        }),
        "insights.net.slotAhead": t({
            en: "{date}, balance {amount} ahead",
            es: "{date}, saldo {amount} a favor",
            pt: "{date}, saldo positivo de {amount}",
        }),
        "insights.net.slotBehind": t({
            en: "{date}, balance {amount} behind",
            es: "{date}, saldo {amount} en contra",
            pt: "{date}, saldo negativo de {amount}",
        }),
        "insights.netWorth.change": t({
            en: "{amount} over six months",
            es: "{amount} en seis meses",
            pt: "{amount} em seis meses",
        }),
        "insights.netWorth.heading": t({
            en: "Net worth",
            es: "Patrimonio",
            pt: "Patrimônio",
            "pt-PT": "Património",
        }),
        "insights.netWorth.summary": t({
            en: "Net worth. {amount} on {date}.",
            es: "Patrimonio. {amount} el {date}.",
            pt: "Patrimônio. {amount} em {date}.",
            "pt-PT": "Património. {amount} em {date}.",
        }),
        "insights.netWorth.summaryApproximate": t({
            en: "Net worth. About {amount} on {date}.",
            es: "Patrimonio. Aproximadamente {amount} el {date}.",
            pt: "Patrimônio. Cerca de {amount} em {date}.",
            "pt-PT": "Património. Cerca de {amount} em {date}.",
        }),
        "insights.period.change": t({
            en: "Change period",
            es: "Cambiar período",
            pt: "Mudar período",
            "pt-PT": "Alterar período",
        }),
        "insights.period.month": t({
            en: "Month",
            es: "Mes",
            pt: "Mês",
        }),
        "insights.period.week": t({
            en: "Week",
            es: "Semana",
            pt: "Semana",
        }),
        "insights.period.year": t({
            en: "Year",
            es: "Año",
            pt: "Ano",
        }),
        "insights.quiet.accessibility": t({
            en: "{measure} has nothing to chart {period}. {sentence}",
            es: "{measure} no tiene nada que graficar {period}. {sentence}",
            "es-ES": "{measure} no tiene nada que mostrar {period}. {sentence}",
            pt: "{measure} não tem nada para mostrar {period}. {sentence}",
        }),
        "insights.quiet.alternative": t({
            en: "{measure} has {period} covered — tap it above.",
            es: "{measure} sí tiene datos {period}. Tócalo arriba.",
            pt: "{measure} tem dados {period}. Toque acima.",
        }),
        "insights.quiet.empty": t({
            en: "Nothing logged {period}.",
            es: "Nada registrado {period}.",
            pt: "Nada registrado {period}.",
            "pt-PT": "Nada registado {period}.",
        }),
        "insights.quiet.thisMonth": t({
            en: "this month",
            es: "este mes",
            pt: "este mês",
        }),
        "insights.quiet.thisWeek": t({
            en: "this week",
            es: "esta semana",
            pt: "esta semana",
        }),
        "insights.quiet.thisYear": t({
            en: "this year",
            es: "este año",
            pt: "este ano",
        }),
        "insights.quiet.title": t({
            en: "Nothing to chart",
            es: "Nada que graficar",
            "es-ES": "Nada que mostrar",
            pt: "Nada para mostrar",
        }),
        "insights.sample.badge": t({
            en: "Sample",
            es: "Ejemplo",
            pt: "Exemplo",
        }),
        "insights.sample.body": t({
            en: "Yours starts filling in from your first entry.",
            es: "El tuyo empieza a llenarse desde tu primer registro.",
            pt: "O seu começa a se preencher no seu primeiro lançamento.",
            "pt-PT": "O seu começa a preencher-se com o seu primeiro registo.",
        }),
        "insights.sample.cta": t({
            en: "Log your first expense",
            es: "Registra tu primer gasto",
            pt: "Registre sua primeira despesa",
            "pt-PT": "Registe a sua primeira despesa",
        }),
        "insights.sample.dining": t({
            en: "Dining Out",
            es: "Restaurantes",
            pt: "Restaurantes",
        }),
        "insights.sample.groceries": t({
            en: "Groceries",
            es: "Súper",
            pt: "Mercado",
            "pt-PT": "Supermercado",
        }),
        "insights.sample.headline": t({
            en: "This is what a month looks like",
            es: "Así se ve un mes",
            pt: "Assim fica um mês",
        }),
        "insights.sample.month": t({
            en: "March",
            es: "Marzo",
            pt: "Março",
        }),
        "insights.sample.priorLabel": t({
            en: "February",
            es: "Febrero",
            pt: "Fevereiro",
        }),
        "insights.sample.verdict": t({
            en: "{delta} less than February. {category} alone gave back {moved}.",
            es: "{delta} menos que febrero. Solo {category} bajó {moved}.",
            pt: "{delta} a menos que fevereiro. Só {category} caiu {moved}.",
        }),
        "insights.scope.clearBar": t({
            en: "Clear the selected bar",
            es: "Quitar la barra seleccionada",
            pt: "Limpar a barra selecionada",
        }),
        "insights.scope.clearCategory": t({
            en: "Clear the category filter",
            es: "Quitar el filtro de categoría",
            pt: "Limpar o filtro de categoria",
        }),
        "insights.scope.filteredCategory": t({
            en: "Filtered category",
            es: "Categoría filtrada",
            pt: "Categoria filtrada",
        }),
        "insights.scope.selectedPeriod": t({
            en: "Selected period",
            es: "Período seleccionado",
            pt: "Período selecionado",
        }),
        "insights.title": t({
            en: "Insights",
            es: "Estadísticas",
            pt: "Estatísticas",
        }),
        "insights.trend.dailyTotals": t({
            en: "Chart of daily totals",
            es: "Gráfico de totales diarios",
            pt: "Gráfico de totais diários",
        }),
        "insights.trend.falling": t({
            en: "Trend line, falling",
            es: "Línea de tendencia, a la baja",
            pt: "Linha de tendência, em queda",
        }),
        "insights.trend.flat": t({
            en: "Trend line, flat",
            es: "Línea de tendencia, estable",
            pt: "Linha de tendência, estável",
        }),
        "insights.trend.monthlyTotals": t({
            en: "Chart of monthly totals",
            es: "Gráfico de totales mensuales",
            pt: "Gráfico de totais mensais",
        }),
        "insights.trend.rising": t({
            en: "Trend line, rising",
            es: "Línea de tendencia, al alza",
            pt: "Linha de tendência, em alta",
        }),
        "insights.window.earlier": t({
            en: "Earlier",
            es: "Anterior",
            pt: "Anterior",
        }),
        "insights.window.later": t({
            en: "Later",
            es: "Siguiente",
            pt: "Próximo",
        }),
        "insights.window.now": t({
            en: "Now",
            es: "Ahora",
            pt: "Agora",
        }),
        "insights.window.shown": t({
            en: "Window shown",
            es: "Fechas mostradas",
            pt: "Datas exibidas",
            "pt-PT": "Datas mostradas",
        }),
        "insights.window.title": t({
            en: "Window",
            es: "Fechas",
            pt: "Datas",
        }),
    },
    key: "insights" as const,
} satisfies Dictionary;

export default insights;
