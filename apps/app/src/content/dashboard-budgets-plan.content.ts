import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardBudgetsPlan = {
    content: {
        back: t({ en: "Back to the plan", es: "Volver al plan", fr: "Retour au plan", pt: "Voltar ao plano" }),
        chart: {
            backIn: insert(
                t({
                    en: "You're back in {{month}}.",
                    es: "En {{month}} te recuperas.",
                    fr: "Vous repassez au vert en {{month}}.",
                    pt: "Em {{month}} você se recupera.",
                })
            ),
            covered: t({
                en: "Every month ahead is covered.",
                es: "Cada mes por delante está cubierto.",
                fr: "Chaque mois à venir est couvert.",
                pt: "Cada mês pela frente está coberto.",
            }),
            runs: insert(
                t({
                    en: "{{month}} runs short on {{category}}.",
                    es: "En {{month}} falta por {{category}}.",
                    fr: "{{month}} manque à cause de {{category}}.",
                    pt: "Em {{month}} falta por {{category}}.",
                })
            ),
            runsPlain: insert(
                t({
                    en: "{{month}} runs short.",
                    es: "En {{month}} falta dinero.",
                    fr: "{{month}} manque d'argent.",
                    pt: "Em {{month}} falta dinheiro.",
                })
            ),
            runsRange: insert(
                t({
                    en: "{{from}} to {{to}} run short on {{category}}.",
                    es: "De {{from}} a {{to}} falta por {{category}}.",
                    fr: "De {{from}} à {{to}}, ça manque à cause de {{category}}.",
                    pt: "De {{from}} a {{to}} falta por {{category}}.",
                })
            ),
            runsRangePlain: insert(
                t({
                    en: "{{from}} to {{to}} run short.",
                    es: "De {{from}} a {{to}} falta dinero.",
                    fr: "De {{from}} à {{to}}, l'argent manque.",
                    pt: "De {{from}} a {{to}} falta dinheiro.",
                })
            ),
            short: insert(
                t({
                    en: "{{count}} of {{total}} short",
                    es: "{{count}} de {{total}} en falta",
                    fr: "{{count}} sur {{total}} en manque",
                    pt: "{{count}} de {{total}} em falta",
                })
            ),
            title: t({
                en: "Left each month",
                es: "Lo que queda cada mes",
                fr: "Reste chaque mois",
                pt: "Sobra a cada mês",
            }),
            yearEnds: t({
                en: "The year ends short.",
                es: "El año cierra en falta.",
                fr: "L'année finit en manque.",
                pt: "O ano termina em falta.",
            }),
        },
        columns: {
            aMonth: t({ en: "A month", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            arrived: t({ en: "Arrived", es: "Llegó", fr: "Arrivé", pt: "Chegou" }),
            biggest: t({ en: "Biggest", es: "El mayor", fr: "Le plus gros", pt: "O maior" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            goal: t({ en: "Goal", es: "Meta", fr: "Objectif", pt: "Meta" }),
            got: t({ en: "Got", es: "Recibido", fr: "Reçu", pt: "Recebido" }),
            in: t({ en: "In", es: "Entra", fr: "Entrées", pt: "Entra" }),
            left: t({ en: "Left", es: "Queda", fr: "Reste", pt: "Sobra" }),
            month: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
            note: t({ en: "Note", es: "Nota", fr: "Note", pt: "Nota" }),
            now: t({ en: "Now", es: "Ahora", fr: "Actuel", pt: "Agora" }),
            out: t({ en: "Out", es: "Sale", fr: "Sorties", pt: "Sai" }),
            planned: t({ en: "Planned", es: "Planificado", fr: "Planifié", pt: "Planejado" }),
            result: t({ en: "Result", es: "Resultado", fr: "Résultat", pt: "Resultado" }),
            setAside: t({ en: "Set aside", es: "Apartado", fr: "Mis de côté", pt: "Reservado" }),
            source: t({ en: "Source", es: "Fuente", fr: "Source", pt: "Fonte" }),
            spent: t({ en: "Spent", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            status: t({ en: "Status", es: "Estado", fr: "Statut", pt: "Status" }),
            toward: t({ en: "Toward", es: "Hacia", fr: "Vers", pt: "Rumo a" }),
            typical: t({ en: "Typical", es: "Habitual", fr: "Habituel", pt: "Habitual" }),
            used: t({ en: "Used", es: "Usado", fr: "Utilisé", pt: "Usado" }),
        },
        dialog: {
            aboveTypical: insert(
                t({
                    en: "{{month}} is {{amount}} above typical.",
                    es: "{{month}} está {{amount}} por encima de lo habitual.",
                    fr: "{{month}} dépasse l'habituel de {{amount}}.",
                    pt: "{{month}} está {{amount}} acima do habitual.",
                })
            ),
            addIncomeTitle: t({
                en: "Add income",
                es: "Agregar ingreso",
                fr: "Ajouter un revenu",
                pt: "Adicionar receita",
            }),
            addTitle: t({
                en: "Add a category",
                es: "Agregar una categoría",
                fr: "Ajouter une catégorie",
                pt: "Adicionar uma categoria",
            }),
            cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            chart: insert(
                t({
                    en: "{{name}}, month by month",
                    es: "{{name}}, mes a mes",
                    fr: "{{name}}, mois par mois",
                    pt: "{{name}}, mês a mês",
                })
            ),
            choose: t({
                en: "Choose a category",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            copyForward: insert(
                t({
                    en: "Copy {{month}} forward",
                    es: "Copiar {{month}} en adelante",
                    fr: "Copier {{month}} sur la suite",
                    pt: "Copiar {{month}} adiante",
                })
            ),
            failed: t({
                en: "Couldn't save the plan. Try again.",
                es: "No se pudo guardar el plan. Inténtalo de nuevo.",
                fr: "Impossible d'enregistrer le plan. Réessayez.",
                pt: "Não foi possível salvar o plano. Tente de novo.",
            }),
            fill: t({ en: "Fill", es: "Rellenar", fr: "Remplir", pt: "Preencher" }),
            fixes: insert(
                t({
                    en: "{{month}} stops running short.",
                    es: "{{month}} deja de quedarse en falta.",
                    fr: "{{month}} ne manque plus.",
                    pt: "{{month}} deixa de ficar em falta.",
                })
            ),
            fixesMany: insert(
                t({
                    en: "{{count}} months stop running short.",
                    es: "{{count}} meses dejan de quedarse en falta.",
                    fr: "{{count}} mois ne manquent plus.",
                    pt: "{{count}} meses deixam de ficar em falta.",
                })
            ),
            notEnough: t({
                en: "Not enough to cover the month.",
                es: "No alcanza para cubrir el mes.",
                fr: "Pas assez pour couvrir le mois.",
                pt: "Não basta para cobrir o mês.",
            }),
            outlines: t({
                en: "outlines are plan",
                es: "los contornos son el plan",
                fr: "les contours sont le plan",
                pt: "os contornos são o plano",
            }),
            overPlan: insert(
                t({
                    en: "{{month}} went {{amount}} over its plan.",
                    es: "{{month}} se pasó {{amount}} de su plan.",
                    fr: "{{month}} a dépassé son plan de {{amount}}.",
                    pt: "{{month}} passou {{amount}} do plano.",
                })
            ),
            planTitle: insert(
                t({
                    en: "Plan {{year}} for {{name}}",
                    es: "Plan {{year}} para {{name}}",
                    fr: "Plan {{year}} pour {{name}}",
                    pt: "Plano {{year}} para {{name}}",
                })
            ),
            same: t({
                en: "Same amount every month",
                es: "El mismo monto cada mes",
                fr: "Le même montant chaque mois",
                pt: "O mesmo valor todo mês",
            }),
            save: insert(
                t({
                    en: "Save the {{year}} plan",
                    es: "Guardar el plan {{year}}",
                    fr: "Enregistrer le plan {{year}}",
                    pt: "Salvar o plano {{year}}",
                })
            ),
            saved: t({ en: "Plan saved", es: "Plan guardado", fr: "Plan enregistré", pt: "Plano salvo" }),
            saves: t({ en: "Saves", es: "Ahorra", fr: "Économise", pt: "Economiza" }),
            stillShort: insert(
                t({
                    en: "Still {{amount}} short: more than that is spent already.",
                    es: "Aún faltan {{amount}}: ya se gastó más que eso.",
                    fr: "Il manque encore {{amount}} : plus a déjà été dépensé.",
                    pt: "Ainda faltam {{amount}}: já foi gasto mais do que isso.",
                })
            ),
            trimConfirm: insert(
                t({
                    en: "Trim to {{amount}} through {{month}}",
                    es: "Recortar a {{amount}} hasta {{month}}",
                    fr: "Réduire à {{amount}} jusqu'à {{month}}",
                    pt: "Cortar para {{amount}} até {{month}}",
                })
            ),
            trimTitle: insert(
                t({
                    en: "Trim {{name}} through {{month}}",
                    es: "Recortar {{name}} hasta {{month}}",
                    fr: "Réduire {{name}} jusqu'à {{month}}",
                    pt: "Cortar {{name}} até {{month}}",
                })
            ),
            trimTo: t({ en: "Trim to", es: "Recortar a", fr: "Réduire à", pt: "Cortar para" }),
            typical: insert(
                t({
                    en: "typical {{amount}}",
                    es: "habitual {{amount}}",
                    fr: "habituel {{amount}}",
                    pt: "habitual {{amount}}",
                })
            ),
            was: t({ en: "Was", es: "Era", fr: "Avant", pt: "Era" }),
        },
        empty: {
            monthLine: t({
                en: "Add what you expect to come in, then what each category should get.",
                es: "Agrega lo que esperas que entre y luego lo que debe recibir cada categoría.",
                fr: "Ajoutez ce que vous attendez en entrée, puis ce que chaque catégorie doit recevoir.",
                pt: "Adicione o que espera receber e depois quanto cada categoria deve ter.",
            }),
            monthTitle: insert(
                t({
                    en: "Nothing planned for {{month}}",
                    es: "Nada planificado para {{month}}",
                    fr: "Rien de planifié pour {{month}}",
                    pt: "Nada planejado para {{month}}",
                })
            ),
            planFirst: insert(
                t({
                    en: "Plan {{month}}",
                    es: "Planificar {{month}}",
                    fr: "Planifier {{month}}",
                    pt: "Planejar {{month}}",
                })
            ),
            yearLine: t({
                en: "Add what comes in and what goes out, month by month.",
                es: "Agrega lo que entra y lo que sale, mes a mes.",
                fr: "Ajoutez ce qui entre et ce qui sort, mois par mois.",
                pt: "Adicione o que entra e o que sai, mês a mês.",
            }),
            yearTitle: insert(
                t({
                    en: "Nothing planned for {{year}}",
                    es: "Nada planificado para {{year}}",
                    fr: "Rien de planifié pour {{year}}",
                    pt: "Nada planejado para {{year}}",
                })
            ),
        },
        kpi: {
            allArrived: t({ en: "All arrived", es: "Todo llegó", fr: "Tout est arrivé", pt: "Tudo chegou" }),
            count: insert(
                t({
                    en: "{{count}} of {{total}}",
                    es: "{{count}} de {{total}}",
                    fr: "{{count}} sur {{total}}",
                    pt: "{{count}} de {{total}}",
                })
            ),
            expected: t({ en: "Expected", es: "Previsto", fr: "Prévu", pt: "Previsto" }),
            fromGoals: t({
                en: "a month, from goals",
                es: "al mes, de las metas",
                fr: "par mois, des objectifs",
                pt: "por mês, das metas",
            }),
            goals: insert(
                t({ en: "{{count}} goals", es: "{{count}} metas", fr: "{{count}} objectifs", pt: "{{count}} metas" })
            ),
            in: t({ en: "In", es: "Entra", fr: "Entrées", pt: "Entra" }),
            leftByPlan: t({
                en: "Left by the plan",
                es: "Queda según el plan",
                fr: "Reste selon le plan",
                pt: "Sobra pelo plano",
            }),
            leftOver: t({ en: "Left over", es: "Sobró", fr: "Restant", pt: "Sobrou" }),
            leftThisMonth: t({
                en: "Left this month",
                es: "Queda este mes",
                fr: "Reste ce mois-ci",
                pt: "Sobra este mês",
            }),
            monthAhead: t({
                en: "1 month ahead",
                es: "1 mes por delante",
                fr: "1 mois à venir",
                pt: "1 mês pela frente",
            }),
            monthsAhead: insert(
                t({
                    en: "{{count}} months ahead",
                    es: "{{count}} meses por delante",
                    fr: "{{count}} mois à venir",
                    pt: "{{count}} meses pela frente",
                })
            ),
            monthsPlanned: t({
                en: "Months planned",
                es: "Meses planificados",
                fr: "Mois planifiés",
                pt: "Meses planejados",
            }),
            noGoals: t({ en: "No goals", es: "Sin metas", fr: "Aucun objectif", pt: "Nenhuma meta" }),
            noMonthsAhead: t({
                en: "No months ahead",
                es: "Sin meses por delante",
                fr: "Aucun mois à venir",
                pt: "Nenhum mês pela frente",
            }),
            notStarted: t({ en: "Not started", es: "Sin empezar", fr: "Pas commencé", pt: "Não começou" }),
            notYet: t({
                en: "Not expected yet",
                es: "Aún no previsto",
                fr: "Pas encore prévu",
                pt: "Ainda não previsto",
            }),
            nothingExpected: t({
                en: "Nothing expected",
                es: "Nada previsto",
                fr: "Rien de prévu",
                pt: "Nada previsto",
            }),
            nothingPlanned: t({
                en: "Nothing planned",
                es: "Nada planificado",
                fr: "Rien de planifié",
                pt: "Nada planejado",
            }),
            ofIncome: t({ en: "of income", es: "de los ingresos", fr: "des revenus", pt: "da renda" }),
            oneGoal: t({ en: "1 goal", es: "1 meta", fr: "1 objectif", pt: "1 meta" }),
            out: t({ en: "Out", es: "Sale", fr: "Sorties", pt: "Sai" }),
            overPlan: t({ en: "over plan", es: "sobre el plan", fr: "au-dessus du plan", pt: "acima do plano" }),
            perMonth: insert(
                t({
                    en: "{{amount}} a month",
                    es: "{{amount}} al mes",
                    fr: "{{amount}} par mois",
                    pt: "{{amount}} por mês",
                })
            ),
            planned: t({ en: "Planned", es: "Planificado", fr: "Planifié", pt: "Planejado" }),
            setAside: t({ en: "Set aside", es: "Apartado", fr: "Mis de côté", pt: "Reservado" }),
            setAsideAmount: insert(
                t({
                    en: "{{amount}} set aside",
                    es: "{{amount}} apartado",
                    fr: "{{amount}} mis de côté",
                    pt: "{{amount}} reservado",
                })
            ),
            shortBy: t({
                en: "Short by the plan",
                es: "Falta según el plan",
                fr: "Manque selon le plan",
                pt: "Falta pelo plano",
            }),
            spent: t({ en: "Spent", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            toCome: insert(
                t({
                    en: "{{amount}} still to come",
                    es: "Faltan {{amount}} por llegar",
                    fr: "{{amount}} encore à venir",
                    pt: "Faltam {{amount}} para chegar",
                })
            ),
            unassigned: t({
                en: "Not assigned yet",
                es: "Sin asignar",
                fr: "Pas encore attribué",
                pt: "Ainda não atribuído",
            }),
            underPlan: t({ en: "under plan", es: "bajo el plan", fr: "sous le plan", pt: "abaixo do plano" }),
        },
        menu: {
            more: insert(
                t({
                    en: "More for {{name}}",
                    es: "Más opciones para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            plan: insert(
                t({ en: "Plan {{year}}", es: "Planificar {{year}}", fr: "Planifier {{year}}", pt: "Planejar {{year}}" })
            ),
            trim: t({ en: "Trim", es: "Recortar", fr: "Réduire", pt: "Cortar" }),
        },
        month: {
            addCategory: t({
                en: "Add a category",
                es: "Agregar una categoría",
                fr: "Ajouter une catégorie",
                pt: "Adicionar uma categoria",
            }),
            addIncome: t({ en: "Add income", es: "Agregar ingreso", fr: "Ajouter un revenu", pt: "Adicionar receita" }),
            in: t({ en: "In", es: "Entra", fr: "Entrées", pt: "Entra" }),
            left: t({ en: "Left", es: "Queda", fr: "Reste", pt: "Sobra" }),
            leftOver: t({ en: "Left over", es: "Sobró", fr: "Restant", pt: "Sobrou" }),
            lockedNote: t({
                en: "Editing changes the current window, not this one.",
                es: "Editar cambia el periodo actual, no este.",
                fr: "Modifier change la période en cours, pas celle-ci.",
                pt: "Editar muda o período atual, não este.",
            }),
            noGoals: t({
                en: "No goals are setting money aside.",
                es: "Ninguna meta está apartando dinero.",
                fr: "Aucun objectif ne met d'argent de côté.",
                pt: "Nenhuma meta está reservando dinheiro.",
            }),
            noIncome: t({
                en: "Nothing has come in yet.",
                es: "Todavía no ha entrado nada.",
                fr: "Rien n'est encore arrivé.",
                pt: "Nada entrou ainda.",
            }),
            of: insert(
                t({
                    en: "{{spent}} of {{planned}}",
                    es: "{{spent}} de {{planned}}",
                    fr: "{{spent}} sur {{planned}}",
                    pt: "{{spent}} de {{planned}}",
                })
            ),
            out: t({ en: "Out", es: "Sale", fr: "Sorties", pt: "Sai" }),
            setAside: t({ en: "Set aside", es: "Apartado", fr: "Mis de côté", pt: "Reservado" }),
            spent: t({ en: "Spent", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            spentAgainst: t({
                en: "Spent against income",
                es: "Gasto frente a ingresos",
                fr: "Dépenses face aux revenus",
                pt: "Gasto frente à renda",
            }),
            whereItWent: t({ en: "Where it went", es: "A dónde fue", fr: "Où c'est allé", pt: "Para onde foi" }),
        },
        nextYear: t({ en: "Next year", es: "Año siguiente", fr: "Année suivante", pt: "Próximo ano" }),
        previousYear: t({ en: "Previous year", es: "Año anterior", fr: "Année précédente", pt: "Ano anterior" }),
        row: {
            expected: t({ en: "Expected", es: "Previsto", fr: "Prévu", pt: "Previsto" }),
            left: insert(
                t({ en: "{{amount}} left", es: "Quedan {{amount}}", fr: "Reste {{amount}}", pt: "Sobram {{amount}}" })
            ),
            onPlan: t({ en: "On plan", es: "Según el plan", fr: "Conforme au plan", pt: "Conforme o plano" }),
            over: insert(
                t({ en: "{{amount}} over", es: "{{amount}} de más", fr: "{{amount}} de trop", pt: "{{amount}} a mais" })
            ),
            paid: insert(
                t({ en: "{{amount}} paid", es: "{{amount}} pagado", fr: "{{amount}} payé", pt: "{{amount}} pago" })
            ),
            perDay: insert(
                t({ en: "{{amount}}/day", es: "{{amount}}/día", fr: "{{amount}}/jour", pt: "{{amount}}/dia" })
            ),
            toward: insert(
                t({
                    en: "{{amount}}, {{date}}",
                    es: "{{amount}}, {{date}}",
                    fr: "{{amount}}, {{date}}",
                    pt: "{{amount}}, {{date}}",
                })
            ),
            under: insert(
                t({
                    en: "{{amount}} under",
                    es: "{{amount}} por debajo",
                    fr: "{{amount}} en dessous",
                    pt: "{{amount}} abaixo",
                })
            ),
        },
        status: {
            ahead: t({ en: "Ahead", es: "Por venir", fr: "À venir", pt: "Por vir" }),
            closed: t({ en: "Closed", es: "Cerrado", fr: "Clos", pt: "Fechado" }),
            current: t({ en: "Current", es: "En curso", fr: "En cours", pt: "Atual" }),
            short: insert(
                t({
                    en: "{{amount}} short",
                    es: "Faltan {{amount}}",
                    fr: "{{amount}} manquants",
                    pt: "Faltam {{amount}}",
                })
            ),
        },
        title: t({ en: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
        uncategorizedIn: t({ en: "Other income", es: "Otros ingresos", fr: "Autres revenus", pt: "Outras receitas" }),
        uncategorizedOut: t({ en: "Uncategorized", es: "Sin categoría", fr: "Sans catégorie", pt: "Sem categoria" }),
    },
    key: "dashboard-budgets-plan",
} satisfies Dictionary;

export default dashboardBudgetsPlan;
