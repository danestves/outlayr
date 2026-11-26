import { insert, plural, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardBudgets = {
    content: {
        addLimit: t({
            en: "Add a limit",
            de: "Limit hinzufügen",
            es: "Agregar un límite",
            "es-ES": "Añadir un límite",
            fr: "Ajouter une limite",
            pt: "Adicionar um limite",
        }),
        ahead: {
            line: t({
                en: "No spending in this period yet.",
                de: "In diesem Zeitraum noch keine Ausgaben.",
                es: "Todavía no hay gastos en este período.",
                fr: "Pas encore de dépenses sur cette période.",
                pt: "Ainda não há gastos neste período.",
            }),
            title: insert(
                t({
                    en: "{{month}} hasn't started",
                    de: "{{month}} hat noch nicht begonnen",
                    es: "{{month}} todavía no empieza",
                    fr: "{{month}} n'a pas commencé",
                    pt: "{{month}} ainda não começou",
                })
            ),
        },
        allSpending: t({
            en: "All spending",
            de: "Alle Ausgaben",
            es: "Todo el gasto",
            fr: "Toutes les dépenses",
            pt: "Todos os gastos",
        }),
        back: t({
            en: "Back to Budgets",
            de: "Zurück zu Budgets",
            es: "Volver a Presupuestos",
            fr: "Retour aux budgets",
            pt: "Voltar para Orçamentos",
        }),
        cadence: {
            day: t({ en: "Day", de: "Tag", es: "Día", fr: "Jour", pt: "Dia" }),
            month: t({ en: "Month", de: "Monat", es: "Mes", fr: "Mois", pt: "Mês" }),
            week: t({ en: "Week", de: "Woche", es: "Semana", fr: "Semaine", pt: "Semana" }),
            year: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
        },
        columns: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            against: t({
                en: "Against limit",
                de: "Gegen Limit",
                es: "Frente al límite",
                fr: "Face à la limite",
                pt: "Contra o limite",
            }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            left: t({ en: "Left", de: "Übrig", es: "Queda", fr: "Reste", pt: "Resta" }),
            limit: t({ en: "Limit", de: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Marchand", pt: "Estabelecimento" }),
            range: insert(
                t({
                    en: "{{from}} to {{to}}",
                    de: "{{from}} bis {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "{{from}} à {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
            share: t({ en: "Share", de: "Anteil", es: "Parte", fr: "Part", pt: "Parte" }),
            shareOfSpending: t({
                en: "Share of spending",
                de: "Anteil an den Ausgaben",
                es: "Parte del gasto",
                fr: "Part des dépenses",
                pt: "Parte dos gastos",
            }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            status: t({ en: "Status", de: "Status", es: "Estado", fr: "État", pt: "Status", "pt-PT": "Estado" }),
            used: t({ en: "Used", de: "Verbraucht", es: "Usado", fr: "Utilisé", pt: "Usado" }),
            window: {
                day: t({ en: "Day", de: "Tag", es: "Día", fr: "Jour", pt: "Dia" }),
                month: t({ en: "Month", de: "Monat", es: "Mes", fr: "Mois", pt: "Mês" }),
                week: t({ en: "Week", de: "Woche", es: "Semana", fr: "Semaine", pt: "Semana" }),
                year: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
            },
        },
        delete: {
            body: insert(
                t({
                    en: "Transactions stay. {{name}} moves to No limit.",
                    de: "Die Einträge bleiben. {{name}} wechselt zu Kein Limit.",
                    es: "Las transacciones se quedan. {{name}} pasa a Sin límite.",
                    fr: "Les transactions restent. {{name}} passe en Sans limite.",
                    pt: "As transações ficam. {{name}} passa para Sem limite.",
                })
            ),
            confirm: t({
                en: "Delete budget",
                de: "Budget löschen",
                es: "Eliminar presupuesto",
                fr: "Supprimer le budget",
                pt: "Excluir orçamento",
                "pt-PT": "Eliminar orçamento",
            }),
            failed: t({
                en: "Couldn't delete. Try again.",
                de: "Löschen hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo eliminar. Inténtalo de nuevo.",
                fr: "Suppression impossible. Réessayez.",
                pt: "Não foi possível excluir. Tente de novo.",
                "pt-PT": "Não foi possível eliminar. Tente de novo.",
            }),
            overallBody: t({
                en: "Transactions stay. Your spending no longer has an overall limit.",
                de: "Die Einträge bleiben. Deine Ausgaben haben kein Gesamtlimit mehr.",
                es: "Las transacciones se quedan. Tu gasto ya no tendrá un límite general.",
                fr: "Les transactions restent. Vos dépenses n'ont plus de limite globale.",
                pt: "As transações ficam. Seus gastos deixam de ter um limite geral.",
            }),
            title: insert(
                t({
                    en: "Delete the {{name}} budget?",
                    de: "Budget {{name}} löschen?",
                    es: "¿Eliminar el presupuesto de {{name}}?",
                    fr: "Supprimer le budget {{name}} ?",
                    pt: "Excluir o orçamento de {{name}}?",
                    "pt-PT": "Eliminar o orçamento de {{name}}?",
                })
            ),
            toast: t({
                en: "Budget deleted",
                de: "Budget gelöscht",
                es: "Presupuesto eliminado",
                fr: "Budget supprimé",
                pt: "Orçamento excluído",
                "pt-PT": "Orçamento eliminado",
            }),
        },
        detail: {
            budget: t({ en: "The budget", de: "Das Budget", es: "El presupuesto", fr: "Le budget", pt: "O orçamento" }),
            carryOver: t({
                en: "Carry over",
                de: "Übertragen",
                es: "Arrastrar lo que sobra",
                fr: "Reporter",
                pt: "Transferir o saldo",
            }),
            closedNote: t({
                en: "Editing changes the current window, not this one.",
                de: "Beim Bearbeiten ändert sich der aktuelle Zeitraum, nicht dieser.",
                es: "Editar cambia el período actual, no este.",
                fr: "Modifier change la période en cours, pas celle-ci.",
                pt: "Editar muda o período atual, não este.",
                "pt-PT": "Editar altera o período atual, não este.",
            }),
            edit: t({ en: "Edit", de: "Bearbeiten", es: "Editar", fr: "Modifier", pt: "Editar" }),
            every: t({ en: "Every", de: "Alle", es: "Cada", fr: "Chaque", pt: "A cada" }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "Depuis", pt: "Desde" }),
            last: {
                day: t({
                    en: "Last 5 days",
                    de: "Letzte 5 Tage",
                    es: "Últimos 5 días",
                    fr: "5 derniers jours",
                    pt: "Últimos 5 dias",
                }),
                month: t({
                    en: "Last 5 months",
                    de: "Letzte 5 Monate",
                    es: "Últimos 5 meses",
                    fr: "5 derniers mois",
                    pt: "Últimos 5 meses",
                }),
                week: t({
                    en: "Last 5 weeks",
                    de: "Letzte 5 Wochen",
                    es: "Últimas 5 semanas",
                    fr: "5 dernières semaines",
                    pt: "Últimas 5 semanas",
                }),
                year: t({
                    en: "Last 5 years",
                    de: "Letzte 5 Jahre",
                    es: "Últimos 5 años",
                    fr: "5 dernières années",
                    pt: "Últimos 5 anos",
                }),
            },
            limit: t({ en: "Limit", de: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            noSpending: t({
                en: "No spending in this period yet.",
                de: "In diesem Zeitraum noch keine Ausgaben.",
                es: "Todavía no hay gastos en este período.",
                fr: "Pas encore de dépenses sur cette période.",
                pt: "Ainda não há gastos neste período.",
            }),
            notFound: t({
                en: "This category isn't here anymore.",
                de: "Diese Kategorie gibt es nicht mehr.",
                es: "Esta categoría ya no existe.",
                fr: "Cette catégorie n'existe plus.",
                pt: "Esta categoria não existe mais.",
            }),
            overCount: insert(
                t({
                    en: "{{count}} of {{total}} over",
                    de: "{{count}} von {{total}} drüber",
                    es: "{{count}} de {{total}} excedidos",
                    fr: "{{count}} sur {{total}} dépassés",
                    pt: "{{count}} de {{total}} excedidos",
                })
            ),
            transactions: t({
                en: "Transactions",
                de: "Einträge",
                es: "Transacciones",
                fr: "Transactions",
                pt: "Transações",
            }),
        },
        footer: {
            categories: t({ en: "Categories", de: "Kategorien", es: "Categorías", fr: "Catégories", pt: "Categorias" }),
            noLimit: t({ en: "No limit", de: "Kein Limit", es: "Sin límite", fr: "Sans limite", pt: "Sem limite" }),
            of: insert(
                t({
                    en: "{{spent}} of {{limit}}",
                    de: "{{spent}} von {{limit}}",
                    es: "{{spent}} de {{limit}}",
                    fr: "{{spent}} sur {{limit}}",
                    pt: "{{spent}} de {{limit}}",
                })
            ),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
            withLimit: t({
                en: "With a limit",
                de: "Mit Limit",
                es: "Con límite",
                fr: "Avec limite",
                pt: "Com limite",
            }),
        },
        form: {
            alreadyOver: insert(
                t({
                    en: "Already {{spent}} spent. This starts you {{over}} over.",
                    de: "Schon {{spent}} ausgegeben. Damit startest du {{over}} drüber.",
                    es: "Ya gastaste {{spent}}. Empiezas {{over}} por encima.",
                    fr: "Déjà {{spent}} dépensés. Vous démarrez {{over}} au-dessus.",
                    pt: "Já foram {{spent}} gastos. Você começa {{over}} acima.",
                    "pt-PT": "Já foram {{spent}} gastos. começa {{over}} acima.",
                })
            ),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            carryNote: t({
                en: "What you don't spend is added to the next period, and what you overspend is taken off it.",
                de: "Was du nicht ausgibst, wird dem nächsten Zeitraum gutgeschrieben, und was du zu viel ausgibst, wird davon abgezogen.",
                es: "Lo que no gastes se suma al próximo período, y lo que te excedas se le resta.",
                fr: "Ce que vous ne dépensez pas s'ajoute à la période suivante, et le dépassement en est retiré.",
                pt: "O que você não gastar é somado ao próximo período, e o que exceder é descontado dele.",
                "pt-PT": "O que não gastar é somado ao próximo período, e o que exceder é descontado dele.",
            }),
            carryOver: t({
                en: "Carry over",
                de: "Übertragen",
                es: "Arrastrar lo que sobra",
                fr: "Reporter",
                pt: "Transferir o saldo",
            }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            choose: t({
                en: "Choose a category",
                de: "Kategorie wählen",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            close: t({ en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
            covers: t({ en: "Covers", de: "Deckt", es: "Cubre", fr: "Couvre", pt: "Cobre" }),
            delete: t({
                en: "Delete budget",
                de: "Budget löschen",
                es: "Eliminar presupuesto",
                fr: "Supprimer le budget",
                pt: "Excluir orçamento",
                "pt-PT": "Eliminar orçamento",
            }),
            editTitle: t({
                en: "Edit budget",
                de: "Budget bearbeiten",
                es: "Editar presupuesto",
                fr: "Modifier le budget",
                pt: "Editar orçamento",
            }),
            every: t({ en: "Every", de: "Alle", es: "Cada", fr: "Chaque", pt: "A cada" }),
            failed: t({
                en: "Couldn't save. Try again.",
                de: "Speichern hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo guardar. Inténtalo de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
                "pt-PT": "Não foi possível guardar. Tente de novo.",
            }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "Depuis", pt: "Desde" }),
            hasLimit: t({
                en: "Has a limit",
                de: "Hat ein Limit",
                es: "Ya tiene límite",
                fr: "A déjà une limite",
                pt: "Já tem limite",
            }),
            keepUnder: insert(
                t({
                    en: "Keep it under {{amount}}",
                    de: "Bleib unter {{amount}}",
                    es: "Mantenlo bajo {{amount}}",
                    fr: "Rester sous {{amount}}",
                    pt: "Manter abaixo de {{amount}}",
                })
            ),
            limit: t({ en: "Limit", de: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            limitHint: insert(
                t({
                    en: "Enter a limit above {{zero}}.",
                    de: "Gib ein Limit über {{zero}} ein.",
                    es: "Ingresa un límite mayor que {{zero}}.",
                    fr: "Saisissez une limite supérieure à {{zero}}.",
                    pt: "Informe um limite acima de {{zero}}.",
                })
            ),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            nameHint: t({
                en: "Leave it blank to keep the category's own name.",
                de: "Lass es leer, um den Namen der Kategorie zu behalten.",
                es: "Déjalo en blanco para usar el nombre de la categoría.",
                fr: "Laissez vide pour garder le nom de la catégorie.",
                pt: "Deixe em branco para manter o nome da categoria.",
            }),
            newTitle: t({
                en: "New budget",
                de: "Neues Budget",
                es: "Nuevo presupuesto",
                fr: "Nouveau budget",
                pt: "Novo orçamento",
            }),
            overallTitle: t({
                en: "Overall limit",
                de: "Gesamtlimit",
                es: "Límite general",
                fr: "Limite globale",
                pt: "Limite geral",
            }),
            perDayLeft: insert(
                t({
                    en: "{{amount}} a day for the {{count}} days left",
                    de: "{{amount}} am Tag für die verbleibenden {{count}} Tage",
                    es: "{{amount}} al día para los {{count}} días que quedan",
                    fr: "{{amount}} par jour pour les {{count}} jours restants",
                    pt: "{{amount}} por dia para os {{count}} dias restantes",
                })
            ),
            perDayLeftOne: insert(
                t({
                    en: "{{amount}} a day for the 1 day left",
                    de: "{{amount}} am Tag für den verbleibenden 1 Tag",
                    es: "{{amount}} para el día que queda",
                    fr: "{{amount}} pour le dernier jour",
                    pt: "{{amount}} para o último dia",
                })
            ),
            pick: t({
                en: "Pick a category",
                de: "Kategorie wählen",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            pickHint: t({
                en: "Pick the category this limit covers.",
                de: "Wähle die Kategorie, für die dieses Limit gilt.",
                es: "Elige la categoría que cubre este límite.",
                fr: "Choisissez la catégorie couverte par cette limite.",
                pt: "Escolha a categoria que este limite cobre.",
            }),
            save: t({
                en: "Save",
                de: "Speichern",
                es: "Guardar",
                fr: "Enregistrer",
                pt: "Salvar",
                "pt-PT": "Guardar",
            }),
            set: t({
                en: "Set budget",
                de: "Budget festlegen",
                es: "Crear presupuesto",
                fr: "Créer le budget",
                pt: "Criar orçamento",
            }),
            thisMonth: insert(
                t({
                    en: "{{amount}} this month",
                    de: "{{amount}} diesen Monat",
                    es: "{{amount}} este mes",
                    fr: "{{amount}} ce mois-ci",
                    pt: "{{amount}} este mês",
                })
            ),
            typical: insert(
                t({
                    en: "typical {{amount}}",
                    de: "üblich {{amount}}",
                    es: "lo habitual {{amount}}",
                    fr: "habituel {{amount}}",
                    pt: "típico {{amount}}",
                })
            ),
            wentOver: insert(
                t({
                    en: "{{count}} of the last {{total}} went over",
                    de: "{{count}} der letzten {{total}} waren drüber",
                    es: "{{count}} de los últimos {{total}} se excedieron",
                    fr: "{{count}} des {{total}} derniers ont dépassé",
                    pt: "{{count}} dos últimos {{total}} excederam",
                })
            ),
            window: insert(
                t({
                    en: "This window becomes {{from}} to {{to}}. What was spent before it stays where it was spent.",
                    de: "Dieser Zeitraum wird zu {{from}} bis {{to}}. Was davor ausgegeben wurde, bleibt dort, wo es ausgegeben wurde.",
                    es: "Este período pasa a ser del {{from}} al {{to}}. Lo gastado antes se queda donde estaba.",
                    fr: "Cette période devient {{from}} à {{to}}. Ce qui a été dépensé avant reste où il était.",
                    pt: "Este período passa a ser de {{from}} a {{to}}. O que foi gasto antes fica onde estava.",
                })
            ),
            wouldHold: insert(
                t({
                    en: "{{window}} would have held, with {{amount}} to spare.",
                    de: "{{window}} hätte gereicht, mit {{amount}} Puffer.",
                    es: "{{window}} se habría cumplido, con {{amount}} de sobra.",
                    fr: "{{window}} aurait tenu, avec {{amount}} de marge.",
                    pt: "{{window}} teria sido cumprido, com {{amount}} de sobra.",
                })
            ),
        },
        kpi: {
            cadence: {
                day: t({ en: "a day", de: "pro Tag", es: "al día", fr: "par jour", pt: "por dia" }),
                month: t({ en: "a month", de: "pro Monat", es: "al mes", fr: "par mois", pt: "por mês" }),
                week: t({ en: "a week", de: "pro Woche", es: "a la semana", fr: "par semaine", pt: "por semana" }),
                year: t({ en: "a year", de: "pro Jahr", es: "al año", fr: "par an", pt: "por ano" }),
            },
            categories: insert(
                t({
                    en: "{{count}} categories",
                    de: "{{count}} Kategorien",
                    es: "{{count}} categorías",
                    fr: "{{count}} catégories",
                    pt: "{{count}} categorias",
                })
            ),
            closed: t({ en: "Closed", de: "Abgeschlossen", es: "Cerrado", fr: "Clos", pt: "Fechado" }),
            count: insert(
                t({
                    en: "{{count}} of {{total}}",
                    de: "{{count}} von {{total}}",
                    es: "{{count}} de {{total}}",
                    fr: "{{count}} sur {{total}}",
                    pt: "{{count}} de {{total}}",
                })
            ),
            dayLeft: t({
                en: "1 day left",
                de: "Noch 1 Tag",
                es: "Queda 1 día",
                fr: "Encore 1 jour",
                pt: "Falta 1 dia",
            }),
            days: insert(
                t({
                    en: "{{count}} days",
                    de: "{{count}} Tage",
                    es: "{{count}} días",
                    fr: "{{count}} jours",
                    pt: "{{count}} dias",
                })
            ),
            daysLeft: insert(
                t({
                    en: "{{count}} days left",
                    de: "Noch {{count}} Tage",
                    es: "Quedan {{count}} días",
                    fr: "Encore {{count}} jours",
                    pt: "Faltam {{count}} dias",
                })
            ),
            daysToGo: plural({
                one: insert(
                    t({
                        en: "{{count}} day to go",
                        de: "Noch {{count}} Tag",
                        es: "Falta {{count}} día",
                        fr: "Encore {{count}} jour",
                        pt: "Falta {{count}} dia",
                    })
                ),
                other: insert(
                    t({
                        en: "{{count}} days to go",
                        de: "Noch {{count}} Tage",
                        es: "Faltan {{count}} días",
                        fr: "Encore {{count}} jours",
                        pt: "Faltam {{count}} dias",
                    })
                ),
            }),
            held: t({ en: "Held", de: "Eingehalten", es: "Se cumplió", fr: "Tenu", pt: "Cumprido" }),
            left: t({ en: "Left", de: "Übrig", es: "Queda", fr: "Reste", pt: "Resta" }),
            limit: t({ en: "Limit", de: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            limits: t({ en: "Limits", de: "Limits", es: "Límites", fr: "Limites", pt: "Limites" }),
            noLimit: t({ en: "No limit", de: "Kein Limit", es: "Sin límite", fr: "Sans limite", pt: "Sem limite" }),
            notBudgeted: t({
                en: "Not budgeted",
                de: "Nicht budgetiert",
                es: "Sin presupuesto",
                fr: "Hors budget",
                pt: "Sem orçamento",
            }),
            ofLimit: t({ en: "of limit", de: "vom Limit", es: "del límite", fr: "de la limite", pt: "do limite" }),
            ofLimits: t({
                en: "of limits",
                de: "von den Limits",
                es: "de los límites",
                fr: "des limites",
                pt: "dos limites",
            }),
            ofSpending: t({
                en: "of spending",
                de: "der Ausgaben",
                es: "del gasto",
                fr: "des dépenses",
                pt: "dos gastos",
            }),
            onTrack: t({ en: "On track", de: "Im Plan", es: "Al día", fr: "En bonne voie", pt: "No caminho" }),
            oneCategory: t({
                en: "1 category",
                de: "1 Kategorie",
                es: "1 categoría",
                fr: "1 catégorie",
                pt: "1 categoria",
            }),
            over: t({ en: "Over", de: "Drüber", es: "Excedido", fr: "Dépassé", pt: "Excedido" }),
            overBudget: t({
                en: "Over budget",
                de: "Über dem Budget",
                es: "Excedido",
                fr: "Budget dépassé",
                pt: "Excedido",
            }),
            overPace: t({
                en: "Over pace",
                de: "Über dem Tempo",
                es: "Sobre el ritmo",
                fr: "Au-dessus du rythme",
                pt: "Acima do ritmo",
            }),
            perDay: insert(
                t({
                    en: "{{amount}} a day",
                    de: "{{amount}} am Tag",
                    es: "{{amount}} al día",
                    fr: "{{amount}} par jour",
                    pt: "{{amount}} por dia",
                })
            ),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            starts: t({ en: "Starts", de: "Beginnt", es: "Empieza", fr: "Commence", pt: "Começa" }),
            typical: t({ en: "Typical", de: "Üblich", es: "Lo habitual", fr: "Habituel", pt: "Típico" }),
            underPace: t({
                en: "Under pace",
                de: "Unter dem Tempo",
                es: "Bajo el ritmo",
                fr: "Sous le rythme",
                pt: "Abaixo do ritmo",
            }),
        },
        menu: {
            category: t({
                en: "Category limit",
                de: "Kategorielimit",
                es: "Límite por categoría",
                fr: "Limite par catégorie",
                pt: "Limite por categoria",
            }),
            change: t({
                en: "Change limit",
                de: "Limit ändern",
                es: "Cambiar límite",
                fr: "Modifier la limite",
                pt: "Alterar limite",
            }),
            delete: t({
                en: "Delete",
                de: "Löschen",
                es: "Eliminar",
                fr: "Supprimer",
                pt: "Excluir",
                "pt-PT": "Eliminar",
            }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    de: "Mehr für {{name}}",
                    es: "Más opciones para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            open: t({ en: "Open", de: "Öffnen", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            overall: t({
                en: "Overall limit",
                de: "Gesamtlimit",
                es: "Límite general",
                fr: "Limite globale",
                pt: "Limite geral",
            }),
        },
        newBudget: t({
            en: "New budget",
            de: "Neues Budget",
            es: "Nuevo presupuesto",
            fr: "Nouveau budget",
            pt: "Novo orçamento",
        }),
        next: t({ en: "Next month", de: "Nächster Monat", es: "Mes siguiente", fr: "Mois suivant", pt: "Próximo mês" }),
        noBudgets: {
            card: t({ en: "Categories", de: "Kategorien", es: "Categorías", fr: "Catégories", pt: "Categorias" }),
            one: insert(
                t({
                    en: "{{first}} cost the most in {{month}}. Set a limit on it.",
                    de: "{{first}} hat im {{month}} am meisten gekostet. Setze dafür ein Limit.",
                    es: "{{first}} fue tu mayor gasto de {{month}}. Ponle un límite.",
                    fr: "{{first}} est votre plus grosse dépense en {{month}}. Fixez-lui une limite.",
                    pt: "{{first}} foi seu maior gasto de {{month}}. Defina um limite nele.",
                })
            ),
            quiet: t({
                en: "Set a limit on a category to see how each month is going.",
                de: "Setze ein Limit für eine Kategorie, um zu sehen, wie jeder Monat läuft.",
                es: "Ponle un límite a una categoría para ver cómo va cada mes.",
                fr: "Fixez une limite sur une catégorie pour suivre chaque mois.",
                pt: "Defina um limite em uma categoria para ver como vai cada mês.",
            }),
            three: insert(
                t({
                    en: "{{first}}, {{second}} and {{third}} cost the most in {{month}}. Set a limit on any of them.",
                    de: "{{first}}, {{second}} und {{third}} haben im {{month}} am meisten gekostet. Setze für eine davon ein Limit.",
                    es: "{{first}}, {{second}} y {{third}} fueron tus mayores gastos de {{month}}. Ponle un límite a cualquiera.",
                    fr: "{{first}}, {{second}} et {{third}} sont vos plus grosses dépenses en {{month}}. Fixez une limite sur l'une d'elles.",
                    pt: "{{first}}, {{second}} e {{third}} foram seus maiores gastos de {{month}}. Defina um limite em qualquer um deles.",
                })
            ),
            title: t({
                en: "No budgets yet",
                de: "Noch keine Budgets",
                es: "Todavía no hay presupuestos",
                fr: "Pas encore de budget",
                pt: "Ainda não há orçamentos",
            }),
            two: insert(
                t({
                    en: "{{first}} and {{second}} cost the most in {{month}}. Set a limit on either of them.",
                    de: "{{first}} und {{second}} haben im {{month}} am meisten gekostet. Setze für eine davon ein Limit.",
                    es: "{{first}} y {{second}} fueron tus mayores gastos de {{month}}. Ponle un límite a cualquiera.",
                    fr: "{{first}} et {{second}} sont vos plus grosses dépenses en {{month}}. Fixez une limite sur l'une d'elles.",
                    pt: "{{first}} e {{second}} foram seus maiores gastos de {{month}}. Defina um limite em qualquer um deles.",
                })
            ),
        },
        noData: {
            add: t({
                en: "Add a transaction",
                de: "Eintrag hinzufügen",
                es: "Agregar una transacción",
                "es-ES": "Añadir una transacción",
                fr: "Ajouter une transaction",
                pt: "Adicionar uma transação",
            }),
            line: t({
                en: "Link budgets to categories and set appropriate expenditure goals.",
                de: "Verknüpfe Budgets mit Kategorien und setze passende Ausgabenziele.",
                es: "Vincula presupuestos a categorías y ponte metas de gasto adecuadas.",
                fr: "Liez des budgets à vos catégories et fixez des objectifs de dépenses adaptés.",
                pt: "Vincule orçamentos a categorias e defina metas de gasto adequadas.",
            }),
            title: t({
                en: "Budget your finances",
                de: "Budgetiere deine Finanzen",
                es: "Presupuesta tus finanzas",
                fr: "Budgétez vos finances",
                pt: "Orce suas finanças",
            }),
        },
        none: t({ en: "None", de: "Keine", es: "Ninguno", fr: "Aucune", pt: "Nenhum" }),
        pace: {
            chart: t({
                en: "Spent against pace",
                de: "Ausgaben gegen Tempo",
                es: "Gasto frente al ritmo",
                fr: "Dépenses face au rythme",
                pt: "Gasto contra o ritmo",
            }),
            even: t({
                en: "Even pace",
                de: "Gleichmäßiges Tempo",
                es: "Ritmo parejo",
                fr: "Rythme régulier",
                pt: "Ritmo constante",
            }),
            evenToday: t({
                en: "Even pace today",
                de: "Gleichmäßiges Tempo heute",
                es: "Ritmo parejo hoy",
                fr: "Rythme régulier aujourd'hui",
                pt: "Ritmo constante hoje",
            }),
            forDayLeft: insert(
                t({
                    en: "{{amount}} for the 1 day left",
                    de: "{{amount}} für den verbleibenden 1 Tag",
                    es: "{{amount}} para el día que queda",
                    fr: "{{amount}} pour le dernier jour",
                    pt: "{{amount}} para o último dia",
                })
            ),
            forDaysLeft: insert(
                t({
                    en: "{{amount}} for the {{count}} days left",
                    de: "{{amount}} für die verbleibenden {{count}} Tage",
                    es: "{{amount}} para los {{count}} días que quedan",
                    fr: "{{amount}} pour les {{count}} jours restants",
                    pt: "{{amount}} para os {{count}} dias restantes",
                })
            ),
            held: insert(
                t({
                    en: "Held, with {{amount}} to spare",
                    de: "Eingehalten, mit {{amount}} Puffer",
                    es: "Se cumplió, con {{amount}} de sobra",
                    fr: "Tenu, avec {{amount}} de marge",
                    pt: "Cumprido, com {{amount}} de sobra",
                })
            ),
            left: insert(
                t({
                    en: "{{amount}} left",
                    de: "{{amount}} übrig",
                    es: "Quedan {{amount}}",
                    fr: "Reste {{amount}}",
                    pt: "Restam {{amount}}",
                })
            ),
            limit: t({ en: "Limit", de: "Limit", es: "Límite", fr: "Limite", pt: "Limite" }),
            over: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} de trop",
                    pt: "{{amount}} a mais",
                })
            ),
            ranOut: insert(
                t({
                    en: "Ran out {{date}}, {{count}} days early",
                    de: "Aufgebraucht am {{date}}, {{count}} Tage zu früh",
                    es: "Se acabó el {{date}}, {{count}} días antes",
                    fr: "Épuisé le {{date}}, {{count}} jours plus tôt",
                    pt: "Acabou em {{date}}, {{count}} dias antes",
                })
            ),
            ranOutLast: insert(
                t({
                    en: "Ran out {{date}}",
                    de: "Aufgebraucht am {{date}}",
                    es: "Se acabó el {{date}}",
                    fr: "Épuisé le {{date}}",
                    pt: "Acabou em {{date}}",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{date}}, 1 day early",
                    de: "Aufgebraucht am {{date}}, 1 Tag zu früh",
                    es: "Se acabó el {{date}}, 1 día antes",
                    fr: "Épuisé le {{date}}, 1 jour plus tôt",
                    pt: "Acabou em {{date}}, 1 dia antes",
                })
            ),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            title: t({ en: "Pace", de: "Tempo", es: "Ritmo", fr: "Rythme", pt: "Ritmo" }),
            under: insert(
                t({
                    en: "{{amount}} under, {{count}} days left",
                    de: "{{amount}} darunter, noch {{count}} Tage",
                    es: "{{amount}} por debajo, quedan {{count}} días",
                    fr: "{{amount}} en dessous, encore {{count}} jours",
                    pt: "{{amount}} abaixo, faltam {{count}} dias",
                })
            ),
            underOne: insert(
                t({
                    en: "{{amount}} under, 1 day left",
                    de: "{{amount}} darunter, noch 1 Tag",
                    es: "{{amount}} por debajo, queda 1 día",
                    fr: "{{amount}} en dessous, encore 1 jour",
                    pt: "{{amount}} abaixo, falta 1 dia",
                })
            ),
        },
        plan: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
        previous: t({
            en: "Previous month",
            de: "Voriger Monat",
            es: "Mes anterior",
            fr: "Mois précédent",
            pt: "Mês anterior",
        }),
        shareOf: insert(
            t({
                en: "{{percent}} of spending",
                de: "{{percent}} der Ausgaben",
                es: "{{percent}} del gasto",
                fr: "{{percent}} des dépenses",
                pt: "{{percent}} dos gastos",
            })
        ),
        status: {
            held: t({ en: "Held", de: "Eingehalten", es: "Se cumplió", fr: "Tenu", pt: "Cumprido" }),
            noLimit: t({ en: "No limit", de: "Kein Limit", es: "Sin límite", fr: "Sans limite", pt: "Sem limite" }),
            notStarted: t({
                en: "Not started",
                de: "Nicht gestartet",
                es: "Sin empezar",
                fr: "Pas commencé",
                pt: "Não começou",
            }),
            onTrack: t({ en: "On track", de: "Im Plan", es: "Al día", fr: "En bonne voie", pt: "No caminho" }),
            over: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} de trop",
                    pt: "{{amount}} a mais",
                })
            ),
            under: insert(
                t({
                    en: "{{amount}} under",
                    de: "{{amount}} darunter",
                    es: "{{amount}} por debajo",
                    fr: "{{amount}} en dessous",
                    pt: "{{amount}} abaixo",
                })
            ),
        },
        title: t({ en: "Budgets", de: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
    },
    key: "dashboard-budgets",
} satisfies Dictionary;

export default dashboardBudgets;
