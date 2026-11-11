import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardBudgets = {
    content: {
        addLimit: t({
            en: "Add a limit",
            es: "Agregar un límite",
            fr: "Ajouter une limite",
            pt: "Adicionar um limite",
        }),
        ahead: {
            line: t({
                en: "No spending in this period yet.",
                es: "Todavía no hay gastos en este período.",
                fr: "Pas encore de dépenses sur cette période.",
                pt: "Ainda não há gastos neste período.",
            }),
            title: insert(
                t({
                    en: "{{month}} hasn't started",
                    es: "{{month}} todavía no empieza",
                    fr: "{{month}} n'a pas commencé",
                    pt: "{{month}} ainda não começou",
                })
            ),
        },
        allSpending: t({ en: "All spending", es: "Todo el gasto", fr: "Toutes les dépenses", pt: "Todos os gastos" }),
        back: t({
            en: "Back to Budgets",
            es: "Volver a Presupuestos",
            fr: "Retour aux budgets",
            pt: "Voltar para Orçamentos",
        }),
        cadence: {
            day: t({ en: "Day", es: "Día", fr: "Jour", pt: "Dia" }),
            month: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
            week: t({ en: "Week", es: "Semana", fr: "Semaine", pt: "Semana" }),
            year: t({ en: "Year", es: "Año", fr: "Année", pt: "Ano" }),
        },
        columns: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            against: t({ en: "Against limit", es: "Frente al límite", fr: "Face à la limite", pt: "Contra o limite" }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            left: t({ en: "Left", es: "Queda", fr: "Reste", pt: "Resta" }),
            limit: t({ en: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            merchant: t({ en: "Merchant", es: "Comercio", fr: "Marchand", pt: "Estabelecimento" }),
            range: insert(
                t({
                    en: "{{from}} to {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "{{from}} à {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
            share: t({ en: "Share", es: "Parte", fr: "Part", pt: "Parte" }),
            shareOfSpending: t({
                en: "Share of spending",
                es: "Parte del gasto",
                fr: "Part des dépenses",
                pt: "Parte dos gastos",
            }),
            spent: t({ en: "Spent", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            status: t({ en: "Status", es: "Estado", fr: "État", pt: "Status" }),
            used: t({ en: "Used", es: "Usado", fr: "Utilisé", pt: "Usado" }),
            window: {
                day: t({ en: "Day", es: "Día", fr: "Jour", pt: "Dia" }),
                month: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
                week: t({ en: "Week", es: "Semana", fr: "Semaine", pt: "Semana" }),
                year: t({ en: "Year", es: "Año", fr: "Année", pt: "Ano" }),
            },
        },
        delete: {
            body: insert(
                t({
                    en: "Transactions stay. {{name}} moves to No limit.",
                    es: "Las transacciones se quedan. {{name}} pasa a Sin límite.",
                    fr: "Les transactions restent. {{name}} passe en Sans limite.",
                    pt: "As transações ficam. {{name}} passa para Sem limite.",
                })
            ),
            confirm: t({
                en: "Delete budget",
                es: "Eliminar presupuesto",
                fr: "Supprimer le budget",
                pt: "Excluir orçamento",
            }),
            failed: t({
                en: "Couldn't delete. Try again.",
                es: "No se pudo eliminar. Inténtalo de nuevo.",
                fr: "Suppression impossible. Réessayez.",
                pt: "Não foi possível excluir. Tente de novo.",
            }),
            overallBody: t({
                en: "Transactions stay. Your spending no longer has an overall limit.",
                es: "Las transacciones se quedan. Tu gasto ya no tendrá un límite general.",
                fr: "Les transactions restent. Vos dépenses n'ont plus de limite globale.",
                pt: "As transações ficam. Seus gastos deixam de ter um limite geral.",
            }),
            title: insert(
                t({
                    en: "Delete the {{name}} budget?",
                    es: "¿Eliminar el presupuesto de {{name}}?",
                    fr: "Supprimer le budget {{name}} ?",
                    pt: "Excluir o orçamento de {{name}}?",
                })
            ),
            toast: t({
                en: "Budget deleted",
                es: "Presupuesto eliminado",
                fr: "Budget supprimé",
                pt: "Orçamento excluído",
            }),
        },
        detail: {
            budget: t({ en: "The budget", es: "El presupuesto", fr: "Le budget", pt: "O orçamento" }),
            carryOver: t({ en: "Carry over", es: "Arrastrar lo que sobra", fr: "Reporter", pt: "Transferir o saldo" }),
            closedNote: t({
                en: "Editing changes the current window, not this one.",
                es: "Editar cambia el período actual, no este.",
                fr: "Modifier change la période en cours, pas celle-ci.",
                pt: "Editar muda o período atual, não este.",
            }),
            edit: t({ en: "Edit", es: "Editar", fr: "Modifier", pt: "Editar" }),
            every: t({ en: "Every", es: "Cada", fr: "Chaque", pt: "A cada" }),
            from: t({ en: "From", es: "Desde", fr: "Depuis", pt: "Desde" }),
            last: {
                day: t({ en: "Last 5 days", es: "Últimos 5 días", fr: "5 derniers jours", pt: "Últimos 5 dias" }),
                month: t({ en: "Last 5 months", es: "Últimos 5 meses", fr: "5 derniers mois", pt: "Últimos 5 meses" }),
                week: t({
                    en: "Last 5 weeks",
                    es: "Últimas 5 semanas",
                    fr: "5 dernières semaines",
                    pt: "Últimas 5 semanas",
                }),
                year: t({ en: "Last 5 years", es: "Últimos 5 años", fr: "5 dernières années", pt: "Últimos 5 anos" }),
            },
            limit: t({ en: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            noSpending: t({
                en: "No spending in this period yet.",
                es: "Todavía no hay gastos en este período.",
                fr: "Pas encore de dépenses sur cette période.",
                pt: "Ainda não há gastos neste período.",
            }),
            notFound: t({
                en: "This category isn't here anymore.",
                es: "Esta categoría ya no existe.",
                fr: "Cette catégorie n'existe plus.",
                pt: "Esta categoria não existe mais.",
            }),
            overCount: insert(
                t({
                    en: "{{count}} of {{total}} over",
                    es: "{{count}} de {{total}} excedidos",
                    fr: "{{count}} sur {{total}} dépassés",
                    pt: "{{count}} de {{total}} excedidos",
                })
            ),
            transactions: t({ en: "Transactions", es: "Transacciones", fr: "Transactions", pt: "Transações" }),
        },
        footer: {
            categories: t({ en: "Categories", es: "Categorías", fr: "Catégories", pt: "Categorias" }),
            noLimit: t({ en: "No limit", es: "Sin límite", fr: "Sans limite", pt: "Sem limite" }),
            of: insert(
                t({
                    en: "{{spent}} of {{limit}}",
                    es: "{{spent}} de {{limit}}",
                    fr: "{{spent}} sur {{limit}}",
                    pt: "{{spent}} de {{limit}}",
                })
            ),
            total: t({ en: "Total", es: "Total", fr: "Total", pt: "Total" }),
            withLimit: t({ en: "With a limit", es: "Con límite", fr: "Avec limite", pt: "Com limite" }),
        },
        form: {
            alreadyOver: insert(
                t({
                    en: "Already {{spent}} spent. This starts you {{over}} over.",
                    es: "Ya gastaste {{spent}}. Empiezas {{over}} por encima.",
                    fr: "Déjà {{spent}} dépensés. Vous démarrez {{over}} au-dessus.",
                    pt: "Já foram {{spent}} gastos. Você começa {{over}} acima.",
                })
            ),
            cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            carryNote: t({
                en: "What you don't spend is added to the next period, and what you overspend is taken off it.",
                es: "Lo que no gastes se suma al próximo período, y lo que te excedas se le resta.",
                fr: "Ce que vous ne dépensez pas s'ajoute à la période suivante, et le dépassement en est retiré.",
                pt: "O que você não gastar é somado ao próximo período, e o que exceder é descontado dele.",
            }),
            carryOver: t({ en: "Carry over", es: "Arrastrar lo que sobra", fr: "Reporter", pt: "Transferir o saldo" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            choose: t({
                en: "Choose a category",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            close: t({ en: "Close", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
            covers: t({ en: "Covers", es: "Cubre", fr: "Couvre", pt: "Cobre" }),
            delete: t({
                en: "Delete budget",
                es: "Eliminar presupuesto",
                fr: "Supprimer le budget",
                pt: "Excluir orçamento",
            }),
            editTitle: t({
                en: "Edit budget",
                es: "Editar presupuesto",
                fr: "Modifier le budget",
                pt: "Editar orçamento",
            }),
            every: t({ en: "Every", es: "Cada", fr: "Chaque", pt: "A cada" }),
            failed: t({
                en: "Couldn't save. Try again.",
                es: "No se pudo guardar. Inténtalo de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
            }),
            from: t({ en: "From", es: "Desde", fr: "Depuis", pt: "Desde" }),
            hasLimit: t({ en: "Has a limit", es: "Ya tiene límite", fr: "A déjà une limite", pt: "Já tem limite" }),
            keepUnder: insert(
                t({
                    en: "Keep it under {{amount}}",
                    es: "Mantenlo bajo {{amount}}",
                    fr: "Rester sous {{amount}}",
                    pt: "Manter abaixo de {{amount}}",
                })
            ),
            limit: t({ en: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            limitHint: insert(
                t({
                    en: "Enter a limit above {{zero}}.",
                    es: "Ingresa un límite mayor que {{zero}}.",
                    fr: "Saisissez une limite supérieure à {{zero}}.",
                    pt: "Informe um limite acima de {{zero}}.",
                })
            ),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            nameHint: t({
                en: "Leave it blank to keep the category's own name.",
                es: "Déjalo en blanco para usar el nombre de la categoría.",
                fr: "Laissez vide pour garder le nom de la catégorie.",
                pt: "Deixe em branco para manter o nome da categoria.",
            }),
            newTitle: t({ en: "New budget", es: "Nuevo presupuesto", fr: "Nouveau budget", pt: "Novo orçamento" }),
            overallTitle: t({ en: "Overall limit", es: "Límite general", fr: "Limite globale", pt: "Limite geral" }),
            perDayLeft: insert(
                t({
                    en: "{{amount}} a day for the {{count}} days left",
                    es: "{{amount}} al día para los {{count}} días que quedan",
                    fr: "{{amount}} par jour pour les {{count}} jours restants",
                    pt: "{{amount}} por dia para os {{count}} dias restantes",
                })
            ),
            perDayLeftOne: insert(
                t({
                    en: "{{amount}} a day for the 1 day left",
                    es: "{{amount}} para el día que queda",
                    fr: "{{amount}} pour le dernier jour",
                    pt: "{{amount}} para o último dia",
                })
            ),
            pick: t({
                en: "Pick a category",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            pickHint: t({
                en: "Pick the category this limit covers.",
                es: "Elige la categoría que cubre este límite.",
                fr: "Choisissez la catégorie couverte par cette limite.",
                pt: "Escolha a categoria que este limite cobre.",
            }),
            save: t({ en: "Save", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            set: t({ en: "Set budget", es: "Crear presupuesto", fr: "Créer le budget", pt: "Criar orçamento" }),
            thisMonth: insert(
                t({
                    en: "{{amount}} this month",
                    es: "{{amount}} este mes",
                    fr: "{{amount}} ce mois-ci",
                    pt: "{{amount}} este mês",
                })
            ),
            typical: insert(
                t({
                    en: "typical {{amount}}",
                    es: "lo habitual {{amount}}",
                    fr: "habituel {{amount}}",
                    pt: "típico {{amount}}",
                })
            ),
            wentOver: insert(
                t({
                    en: "{{count}} of the last {{total}} went over",
                    es: "{{count}} de los últimos {{total}} se excedieron",
                    fr: "{{count}} des {{total}} derniers ont dépassé",
                    pt: "{{count}} dos últimos {{total}} excederam",
                })
            ),
            window: insert(
                t({
                    en: "This window becomes {{from}} to {{to}}. What was spent before it stays where it was spent.",
                    es: "Este período pasa a ser del {{from}} al {{to}}. Lo gastado antes se queda donde estaba.",
                    fr: "Cette période devient {{from}} à {{to}}. Ce qui a été dépensé avant reste où il était.",
                    pt: "Este período passa a ser de {{from}} a {{to}}. O que foi gasto antes fica onde estava.",
                })
            ),
            wouldHold: insert(
                t({
                    en: "{{window}} would have held, with {{amount}} to spare.",
                    es: "{{window}} se habría cumplido, con {{amount}} de sobra.",
                    fr: "{{window}} aurait tenu, avec {{amount}} de marge.",
                    pt: "{{window}} teria sido cumprido, com {{amount}} de sobra.",
                })
            ),
        },
        kpi: {
            cadence: {
                day: t({ en: "a day", es: "al día", fr: "par jour", pt: "por dia" }),
                month: t({ en: "a month", es: "al mes", fr: "par mois", pt: "por mês" }),
                week: t({ en: "a week", es: "a la semana", fr: "par semaine", pt: "por semana" }),
                year: t({ en: "a year", es: "al año", fr: "par an", pt: "por ano" }),
            },
            categories: insert(
                t({
                    en: "{{count}} categories",
                    es: "{{count}} categorías",
                    fr: "{{count}} catégories",
                    pt: "{{count}} categorias",
                })
            ),
            closed: t({ en: "Closed", es: "Cerrado", fr: "Clos", pt: "Fechado" }),
            count: insert(
                t({
                    en: "{{count}} of {{total}}",
                    es: "{{count}} de {{total}}",
                    fr: "{{count}} sur {{total}}",
                    pt: "{{count}} de {{total}}",
                })
            ),
            dayLeft: t({ en: "1 day left", es: "Queda 1 día", fr: "Encore 1 jour", pt: "Falta 1 dia" }),
            days: insert(
                t({ en: "{{count}} days", es: "{{count}} días", fr: "{{count}} jours", pt: "{{count}} dias" })
            ),
            daysLeft: insert(
                t({
                    en: "{{count}} days left",
                    es: "Quedan {{count}} días",
                    fr: "Encore {{count}} jours",
                    pt: "Faltam {{count}} dias",
                })
            ),
            daysToGo: insert(
                t({
                    en: "{{count}} days to go",
                    es: "Faltan {{count}} días",
                    fr: "Encore {{count}} jours",
                    pt: "Faltam {{count}} dias",
                })
            ),
            held: t({ en: "Held", es: "Se cumplió", fr: "Tenu", pt: "Cumprido" }),
            left: t({ en: "Left", es: "Queda", fr: "Reste", pt: "Resta" }),
            limit: t({ en: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            limits: t({ en: "Limits", es: "Límites", fr: "Limites", pt: "Limites" }),
            noLimit: t({ en: "No limit", es: "Sin límite", fr: "Sans limite", pt: "Sem limite" }),
            notBudgeted: t({ en: "Not budgeted", es: "Sin presupuesto", fr: "Hors budget", pt: "Sem orçamento" }),
            ofLimit: t({ en: "of limit", es: "del límite", fr: "de la limite", pt: "do limite" }),
            ofLimits: t({ en: "of limits", es: "de los límites", fr: "des limites", pt: "dos limites" }),
            ofSpending: t({ en: "of spending", es: "del gasto", fr: "des dépenses", pt: "dos gastos" }),
            onTrack: t({ en: "On track", es: "Al día", fr: "En bonne voie", pt: "No caminho" }),
            oneCategory: t({ en: "1 category", es: "1 categoría", fr: "1 catégorie", pt: "1 categoria" }),
            over: t({ en: "Over", es: "Excedido", fr: "Dépassé", pt: "Excedido" }),
            overBudget: t({ en: "Over budget", es: "Excedido", fr: "Budget dépassé", pt: "Excedido" }),
            overPace: t({ en: "Over pace", es: "Sobre el ritmo", fr: "Au-dessus du rythme", pt: "Acima do ritmo" }),
            perDay: insert(
                t({
                    en: "{{amount}} a day",
                    es: "{{amount}} al día",
                    fr: "{{amount}} par jour",
                    pt: "{{amount}} por dia",
                })
            ),
            spent: t({ en: "Spent", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            starts: t({ en: "Starts", es: "Empieza", fr: "Commence", pt: "Começa" }),
            typical: t({ en: "Typical", es: "Lo habitual", fr: "Habituel", pt: "Típico" }),
            underPace: t({ en: "Under pace", es: "Bajo el ritmo", fr: "Sous le rythme", pt: "Abaixo do ritmo" }),
        },
        menu: {
            category: t({
                en: "Category limit",
                es: "Límite por categoría",
                fr: "Limite par catégorie",
                pt: "Limite por categoria",
            }),
            change: t({ en: "Change limit", es: "Cambiar límite", fr: "Modifier la limite", pt: "Alterar limite" }),
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    es: "Más opciones para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            open: t({ en: "Open", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            overall: t({ en: "Overall limit", es: "Límite general", fr: "Limite globale", pt: "Limite geral" }),
        },
        newBudget: t({ en: "New budget", es: "Nuevo presupuesto", fr: "Nouveau budget", pt: "Novo orçamento" }),
        next: t({ en: "Next month", es: "Mes siguiente", fr: "Mois suivant", pt: "Próximo mês" }),
        noBudgets: {
            card: t({ en: "Categories", es: "Categorías", fr: "Catégories", pt: "Categorias" }),
            one: insert(
                t({
                    en: "{{first}} took most of {{month}}. Set a limit on it.",
                    es: "{{first}} se llevó la mayor parte de {{month}}. Ponle un límite.",
                    fr: "{{first}} a pris l'essentiel de {{month}}. Fixez-lui une limite.",
                    pt: "{{first}} levou a maior parte de {{month}}. Defina um limite nela.",
                })
            ),
            quiet: t({
                en: "Set a limit on a category to see how each month is going.",
                es: "Ponle un límite a una categoría para ver cómo va cada mes.",
                fr: "Fixez une limite sur une catégorie pour suivre chaque mois.",
                pt: "Defina um limite em uma categoria para ver como vai cada mês.",
            }),
            three: insert(
                t({
                    en: "{{first}}, {{second}} and {{third}} took most of {{month}}. Set a limit on any of them.",
                    es: "{{first}}, {{second}} y {{third}} se llevaron la mayor parte de {{month}}. Ponle un límite a cualquiera.",
                    fr: "{{first}}, {{second}} et {{third}} ont pris l'essentiel de {{month}}. Fixez une limite sur l'une d'elles.",
                    pt: "{{first}}, {{second}} e {{third}} levaram a maior parte de {{month}}. Defina um limite em qualquer uma.",
                })
            ),
            title: t({
                en: "No budgets yet",
                es: "Todavía no hay presupuestos",
                fr: "Pas encore de budget",
                pt: "Ainda não há orçamentos",
            }),
            two: insert(
                t({
                    en: "{{first}} and {{second}} took most of {{month}}. Set a limit on either of them.",
                    es: "{{first}} y {{second}} se llevaron la mayor parte de {{month}}. Ponle un límite a cualquiera.",
                    fr: "{{first}} et {{second}} ont pris l'essentiel de {{month}}. Fixez une limite sur l'une d'elles.",
                    pt: "{{first}} e {{second}} levaram a maior parte de {{month}}. Defina um limite em qualquer uma.",
                })
            ),
        },
        noData: {
            add: t({
                en: "Add a transaction",
                es: "Agregar una transacción",
                fr: "Ajouter une transaction",
                pt: "Adicionar uma transação",
            }),
            line: t({
                en: "Link budgets to categories and set appropriate expenditure goals.",
                es: "Vincula presupuestos a categorías y ponte metas de gasto adecuadas.",
                fr: "Liez des budgets à vos catégories et fixez des objectifs de dépenses adaptés.",
                pt: "Vincule orçamentos a categorias e defina metas de gasto adequadas.",
            }),
            title: t({
                en: "Budget your finances",
                es: "Presupuesta tus finanzas",
                fr: "Budgétez vos finances",
                pt: "Orce suas finanças",
            }),
        },
        none: t({ en: "None", es: "Ninguno", fr: "Aucune", pt: "Nenhum" }),
        pace: {
            chart: t({
                en: "Spent against pace",
                es: "Gasto frente al ritmo",
                fr: "Dépenses face au rythme",
                pt: "Gasto contra o ritmo",
            }),
            even: t({ en: "Even pace", es: "Ritmo parejo", fr: "Rythme régulier", pt: "Ritmo constante" }),
            evenToday: t({
                en: "Even pace today",
                es: "Ritmo parejo hoy",
                fr: "Rythme régulier aujourd'hui",
                pt: "Ritmo constante hoje",
            }),
            forDayLeft: insert(
                t({
                    en: "{{amount}} for the 1 day left",
                    es: "{{amount}} para el día que queda",
                    fr: "{{amount}} pour le dernier jour",
                    pt: "{{amount}} para o último dia",
                })
            ),
            forDaysLeft: insert(
                t({
                    en: "{{amount}} for the {{count}} days left",
                    es: "{{amount}} para los {{count}} días que quedan",
                    fr: "{{amount}} pour les {{count}} jours restants",
                    pt: "{{amount}} para os {{count}} dias restantes",
                })
            ),
            held: insert(
                t({
                    en: "Held, with {{amount}} to spare",
                    es: "Se cumplió, con {{amount}} de sobra",
                    fr: "Tenu, avec {{amount}} de marge",
                    pt: "Cumprido, com {{amount}} de sobra",
                })
            ),
            left: insert(
                t({ en: "{{amount}} left", es: "Quedan {{amount}}", fr: "Reste {{amount}}", pt: "Restam {{amount}}" })
            ),
            limit: t({ en: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            over: insert(
                t({ en: "{{amount}} over", es: "{{amount}} de más", fr: "{{amount}} de trop", pt: "{{amount}} a mais" })
            ),
            ranOut: insert(
                t({
                    en: "Ran out {{date}}, {{count}} days early",
                    es: "Se acabó el {{date}}, {{count}} días antes",
                    fr: "Épuisé le {{date}}, {{count}} jours plus tôt",
                    pt: "Acabou em {{date}}, {{count}} dias antes",
                })
            ),
            ranOutLast: insert(
                t({
                    en: "Ran out {{date}}",
                    es: "Se acabó el {{date}}",
                    fr: "Épuisé le {{date}}",
                    pt: "Acabou em {{date}}",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{date}}, 1 day early",
                    es: "Se acabó el {{date}}, 1 día antes",
                    fr: "Épuisé le {{date}}, 1 jour plus tôt",
                    pt: "Acabou em {{date}}, 1 dia antes",
                })
            ),
            spent: t({ en: "Spent", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            title: t({ en: "Pace", es: "Ritmo", fr: "Rythme", pt: "Ritmo" }),
            under: insert(
                t({
                    en: "{{amount}} under, {{count}} days left",
                    es: "{{amount}} por debajo, quedan {{count}} días",
                    fr: "{{amount}} en dessous, encore {{count}} jours",
                    pt: "{{amount}} abaixo, faltam {{count}} dias",
                })
            ),
            underOne: insert(
                t({
                    en: "{{amount}} under, 1 day left",
                    es: "{{amount}} por debajo, queda 1 día",
                    fr: "{{amount}} en dessous, encore 1 jour",
                    pt: "{{amount}} abaixo, falta 1 dia",
                })
            ),
        },
        plan: t({ en: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
        previous: t({ en: "Previous month", es: "Mes anterior", fr: "Mois précédent", pt: "Mês anterior" }),
        shareOf: insert(
            t({
                en: "{{percent}} of spending",
                es: "{{percent}} del gasto",
                fr: "{{percent}} des dépenses",
                pt: "{{percent}} dos gastos",
            })
        ),
        status: {
            held: t({ en: "Held", es: "Se cumplió", fr: "Tenu", pt: "Cumprido" }),
            noLimit: t({ en: "No limit", es: "Sin límite", fr: "Sans limite", pt: "Sem limite" }),
            notStarted: t({ en: "Not started", es: "Sin empezar", fr: "Pas commencé", pt: "Não começou" }),
            onTrack: t({ en: "On track", es: "Al día", fr: "En bonne voie", pt: "No caminho" }),
            over: insert(
                t({ en: "{{amount}} over", es: "{{amount}} de más", fr: "{{amount}} de trop", pt: "{{amount}} a mais" })
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
        title: t({ en: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
    },
    key: "dashboard-budgets",
} satisfies Dictionary;

export default dashboardBudgets;
