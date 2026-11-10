import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardRecurring = {
    content: {
        actions: {
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            edit: t({ en: "Edit", es: "Editar", fr: "Modifier", pt: "Editar" }),
            logAgain: t({ en: "Log again", es: "Registrar de nuevo", fr: "Saisir à nouveau", pt: "Lançar de novo" }),
            logIt: t({ en: "Log it", es: "Registrar", fr: "Saisir", pt: "Lançar" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    es: "Más opciones de {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais opções de {{name}}",
                })
            ),
            open: t({ en: "Open", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            pause: t({ en: "Pause", es: "Pausar", fr: "Suspendre", pt: "Pausar" }),
            restart: t({ en: "Restart", es: "Reanudar", fr: "Relancer", pt: "Retomar" }),
            resume: t({ en: "Resume now", es: "Reanudar ahora", fr: "Reprendre", pt: "Retomar agora" }),
            stop: t({
                en: "Stop repeating",
                es: "Dejar de repetir",
                fr: "Arrêter la répétition",
                pt: "Parar de repetir",
            }),
        },
        add: t({ en: "Add recurring", es: "Agregar recurrente", fr: "Ajouter", pt: "Adicionar recorrente" }),
        all: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            anyAccount: t({
                en: "All accounts",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            anyCategory: t({
                en: "All categories",
                es: "Todas las categorías",
                fr: "Toutes les catégories",
                pt: "Todas as categorias",
            }),
            anyRepeat: t({
                en: "Any repeat",
                es: "Cualquier frecuencia",
                fr: "Toute fréquence",
                pt: "Qualquer frequência",
            }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            clear: t({ en: "Clear", es: "Limpiar", fr: "Effacer", pt: "Limpar" }),
            footer: insert(
                t({
                    en: "{{active}} active, {{paused}} paused",
                    es: "{{active}} activos, {{paused}} en pausa",
                    fr: "{{active}} actifs, {{paused}} suspendus",
                    pt: "{{active}} ativos, {{paused}} pausados",
                })
            ),
            noMatch: t({
                en: "Nothing matches these filters",
                es: "Nada coincide con estos filtros",
                fr: "Rien ne correspond à ces filtres",
                pt: "Nada corresponde a esses filtros",
            }),
            repeats: t({ en: "Repeats", es: "Frecuencia", fr: "Fréquence", pt: "Frequência" }),
            search: t({ en: "Name, note", es: "Nombre, nota", fr: "Nom, note", pt: "Nome, nota" }),
            sort: {
                amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
                name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
                next: t({ en: "Next date", es: "Próxima fecha", fr: "Prochaine date", pt: "Próxima data" }),
                perMonth: t({ en: "Per month", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            },
        },
        badge: {
            missed: t({ en: "Missed", es: "Pendiente", fr: "Manqué", pt: "Atrasado" }),
            paused: t({ en: "Paused", es: "En pausa", fr: "Suspendu", pt: "Pausado" }),
            stopped: t({ en: "Stopped", es: "Terminado", fr: "Arrêté", pt: "Encerrado" }),
            today: t({ en: "Today", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
        },
        calendar: {
            byWeek: t({ en: "By week", es: "Por semana", fr: "Par semaine", pt: "Por semana" }),
            dueNow: t({ en: "Due now", es: "Por pagar", fr: "À payer", pt: "A pagar" }),
            missedOn: insert(
                t({
                    en: "{{amount}}, missed {{date}}",
                    es: "{{amount}}, pendiente desde el {{date}}",
                    fr: "{{amount}}, manqué le {{date}}",
                    pt: "{{amount}}, atrasado desde {{date}}",
                })
            ),
            nextMonth: t({ en: "Next month", es: "Mes siguiente", fr: "Mois suivant", pt: "Próximo mês" }),
            nothingDue: t({ en: "Nothing is due", es: "Nada por pagar", fr: "Rien à payer", pt: "Nada a pagar" }),
            nothingOn: t({
                en: "No charges on this day",
                es: "Sin cobros este día",
                fr: "Aucun prélèvement ce jour",
                pt: "Sem cobranças neste dia",
            }),
            previousMonth: t({ en: "Previous month", es: "Mes anterior", fr: "Mois précédent", pt: "Mês anterior" }),
            today: t({ en: "Today", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            todayLine: insert(
                t({
                    en: "{{amount}}, today",
                    es: "{{amount}}, hoy",
                    fr: "{{amount}}, aujourd'hui",
                    pt: "{{amount}}, hoje",
                })
            ),
            weekRange: insert(
                t({
                    en: "{{from}} to {{to}}",
                    es: "{{from}} al {{to}}",
                    fr: "{{from}} au {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
        },
        cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        charges: insert(
            t({
                en: "{{count}} charges",
                es: "{{count}} cobros",
                fr: "{{count}} prélèvements",
                pt: "{{count}} cobranças",
            })
        ),
        chargesOne: t({ en: "1 charge", es: "1 cobro", fr: "1 prélèvement", pt: "1 cobrança" }),
        close: t({ en: "Close", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        columns: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            gap: t({ en: "Gap", es: "Intervalo", fr: "Écart", pt: "Intervalo" }),
            looksLike: t({ en: "Looks like", es: "Parece", fr: "Semble", pt: "Parece" }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            nextDate: t({ en: "Next date", es: "Próxima fecha", fr: "Prochaine date", pt: "Próxima data" }),
            pausedSince: t({ en: "Paused since", es: "En pausa desde", fr: "Suspendu depuis", pt: "Pausado desde" }),
            perMonth: t({ en: "Per month", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            repeats: t({ en: "Repeats", es: "Frecuencia", fr: "Fréquence", pt: "Frequência" }),
            resumes: t({ en: "Resumes", es: "Se reanuda", fr: "Reprise", pt: "Retoma" }),
            seen: t({ en: "Seen", es: "Visto", fr: "Vu", pt: "Visto" }),
        },
        confirm: {
            link: insert(
                t({
                    en: "Link {{count}} past entries, {{from}} to {{to}}",
                    es: "Vincular {{count}} movimientos anteriores, del {{from}} al {{to}}",
                    fr: "Lier {{count}} opérations passées, du {{from}} au {{to}}",
                    pt: "Vincular {{count}} lançamentos anteriores, de {{from}} a {{to}}",
                })
            ),
            linkOne: insert(
                t({
                    en: "Link the past entry from {{from}}",
                    es: "Vincular el movimiento anterior del {{from}}",
                    fr: "Lier l'opération passée du {{from}}",
                    pt: "Vincular o lançamento anterior de {{from}}",
                })
            ),
        },
        detected: {
            confirm: t({ en: "Confirm", es: "Confirmar", fr: "Confirmer", pt: "Confirmar" }),
            confirmAll: t({ en: "Confirm all", es: "Confirmar todos", fr: "Tout confirmer", pt: "Confirmar todos" }),
            emptyLine: t({
                en: "Entries that repeat on a steady beat show up here.",
                es: "Los movimientos que se repiten con regularidad aparecen aquí.",
                fr: "Les opérations qui reviennent à intervalle régulier apparaissent ici.",
                pt: "Lançamentos que se repetem com regularidade aparecem aqui.",
            }),
            emptyTitle: t({
                en: "Nothing to confirm",
                es: "Nada por confirmar",
                fr: "Rien à confirmer",
                pt: "Nada para confirmar",
            }),
            footer: insert(
                t({
                    en: "Same amount, about every {{count}} days",
                    es: "Mismo monto, cada {{count}} días aproximadamente",
                    fr: "Même montant, environ tous les {{count}} jours",
                    pt: "Mesmo valor, a cada {{count}} dias aproximadamente",
                })
            ),
            gapDays: insert(
                t({ en: "{{count}} days", es: "{{count}} días", fr: "{{count}} jours", pt: "{{count}} dias" })
            ),
            matching: insert(
                t({
                    en: "{{count}} matching entries",
                    es: "{{count}} movimientos coinciden",
                    fr: "{{count}} opérations correspondantes",
                    pt: "{{count}} lançamentos correspondentes",
                })
            ),
            notRecurring: t({
                en: "Not recurring",
                es: "No es recurrente",
                fr: "Pas récurrent",
                pt: "Não é recorrente",
            }),
            perCycle: insert(
                t({
                    en: "{{amount}} {{cadence}}",
                    es: "{{amount}} {{cadence}}",
                    fr: "{{amount}} {{cadence}}",
                    pt: "{{amount}} {{cadence}}",
                })
            ),
            seeAll: t({ en: "See all", es: "Ver todos", fr: "Tout voir", pt: "Ver todos" }),
            seeEntries: t({
                en: "See entries",
                es: "Ver movimientos",
                fr: "Voir les opérations",
                pt: "Ver lançamentos",
            }),
            seen: insert(
                t({ en: "{{count}} times", es: "{{count}} veces", fr: "{{count}} fois", pt: "{{count}} vezes" })
            ),
            since: insert(
                t({
                    en: "{{amount}} since {{month}}",
                    es: "{{amount}} desde {{month}}",
                    fr: "{{amount}} depuis {{month}}",
                    pt: "{{amount}} desde {{month}}",
                })
            ),
        },
        drawer: {
            allEntries: t({
                en: "All entries",
                es: "Todos los movimientos",
                fr: "Toutes les opérations",
                pt: "Todos os lançamentos",
            }),
            ended: insert(
                t({
                    en: "{{repeats}}, ended {{date}}",
                    es: "{{repeats}}, terminó el {{date}}",
                    fr: "{{repeats}}, terminé le {{date}}",
                    pt: "{{repeats}}, encerrado em {{date}}",
                })
            ),
            historyAll: t({ en: "History", es: "Historial", fr: "Historique", pt: "Histórico" }),
            history: t({
                en: "History, last 6 months",
                es: "Historial, últimos 6 meses",
                fr: "Historique, 6 derniers mois",
                pt: "Histórico, últimos 6 meses",
            }),
            next: insert(
                t({
                    en: "{{repeats}}, next {{date}}",
                    es: "{{repeats}}, próximo el {{date}}",
                    fr: "{{repeats}}, prochain le {{date}}",
                    pt: "{{repeats}}, próximo em {{date}}",
                })
            ),
            nextItem: t({ en: "Next item", es: "Siguiente", fr: "Suivant", pt: "Próximo" }),
            noHistory: t({
                en: "No charges logged yet",
                es: "Aún no hay cobros registrados",
                fr: "Aucun prélèvement saisi",
                pt: "Nenhuma cobrança lançada ainda",
            }),
            paused: insert(
                t({
                    en: "{{repeats}}, no charges for now",
                    es: "{{repeats}}, sin cobros por ahora",
                    fr: "{{repeats}}, aucun prélèvement pour l'instant",
                    pt: "{{repeats}}, sem cobranças por enquanto",
                })
            ),
            previousItem: t({ en: "Previous item", es: "Anterior", fr: "Précédent", pt: "Anterior" }),
            priceDown: insert(
                t({
                    en: "Price down {{amount}}",
                    es: "Bajó {{amount}}",
                    fr: "Baisse de {{amount}}",
                    pt: "Caiu {{amount}}",
                })
            ),
            priceUp: insert(
                t({
                    en: "Price up {{amount}}",
                    es: "Subió {{amount}}",
                    fr: "Hausse de {{amount}}",
                    pt: "Subiu {{amount}}",
                })
            ),
            title: t({ en: "Recurring", es: "Recurrente", fr: "Récurrent", pt: "Recorrente" }),
        },
        empty: {
            import: t({
                en: "Import entries to detect them",
                es: "Importa movimientos para detectarlos",
                fr: "Importer des opérations pour les détecter",
                pt: "Importe lançamentos para detectá-los",
            }),
            line: t({
                en: "Add rent or a subscription and it shows up here before it charges.",
                es: "Agrega el alquiler o una suscripción y aparecerá aquí antes de cobrarse.",
                fr: "Ajoutez un loyer ou un abonnement et il apparaît ici avant d'être prélevé.",
                pt: "Adicione o aluguel ou uma assinatura e ele aparece aqui antes da cobrança.",
            }),
            title: t({
                en: "Nothing is scheduled",
                es: "No hay nada programado",
                fr: "Rien n'est programmé",
                pt: "Nada está programado",
            }),
        },
        export: t({ en: "Export", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
        exportFile: t({ en: "recurring", es: "recurrentes", fr: "recurrents", pt: "recorrentes" }),
        fields: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            ending: t({ en: "Ending", es: "Termina", fr: "Fin", pt: "Termina" }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            nextCharge: t({
                en: "Next charge",
                es: "Próximo cobro",
                fr: "Prochain prélèvement",
                pt: "Próxima cobrança",
            }),
            nextCharges: t({
                en: "Next charges",
                es: "Próximos cobros",
                fr: "Prochains prélèvements",
                pt: "Próximas cobranças",
            }),
            paidOn: t({ en: "Paid on", es: "Pagado el", fr: "Payé le", pt: "Pago em" }),
            pausedSince: t({ en: "Paused since", es: "En pausa desde", fr: "Suspendu depuis", pt: "Pausado desde" }),
            perMonth: t({ en: "Per month", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            repeats: t({ en: "Repeats", es: "Se repite", fr: "Répétition", pt: "Repete" }),
            resumes: t({ en: "Resumes", es: "Se reanuda", fr: "Reprise", pt: "Retoma" }),
            starting: t({ en: "Starting", es: "Empieza", fr: "Début", pt: "Início" }),
        },
        footer: {
            ahead: insert(
                t({
                    en: "{{count}} charges ahead",
                    es: "{{count}} cobros por venir",
                    fr: "{{count}} prélèvements à venir",
                    pt: "{{count}} cobranças à frente",
                })
            ),
            aheadOne: t({
                en: "1 charge ahead",
                es: "1 cobro por venir",
                fr: "1 prélèvement à venir",
                pt: "1 cobrança à frente",
            }),
            total: t({ en: "Total", es: "Total", fr: "Total", pt: "Total" }),
        },
        form: {
            addTitle: t({
                en: "Add recurring",
                es: "Agregar recurrente",
                fr: "Ajouter un récurrent",
                pt: "Adicionar recorrente",
            }),
            adds: insert(
                t({
                    en: "Adds {{amount}} a month",
                    es: "Suma {{amount}} al mes",
                    fr: "Ajoute {{amount}} par mois",
                    pt: "Soma {{amount}} por mês",
                })
            ),
            back: t({ en: "Back", es: "Atrás", fr: "Retour", pt: "Voltar" }),
            custom: t({ en: "Custom", es: "Personalizado", fr: "Personnalisé", pt: "Personalizado" }),
            customTitle: t({
                en: "Custom schedule",
                es: "Frecuencia personalizada",
                fr: "Fréquence personnalisée",
                pt: "Frequência personalizada",
            }),
            done: t({ en: "Done", es: "Listo", fr: "OK", pt: "Pronto" }),
            editTitle: insert(
                t({ en: "Edit {{name}}", es: "Editar {{name}}", fr: "Modifier {{name}}", pt: "Editar {{name}}" })
            ),
            errors: {
                amount: insert(
                    t({
                        en: "Enter an amount above {{zero}}",
                        es: "Escribe un monto mayor a {{zero}}",
                        fr: "Saisissez un montant supérieur à {{zero}}",
                        pt: "Digite um valor acima de {{zero}}",
                    })
                ),
                category: t({
                    en: "Pick a category",
                    es: "Elige una categoría",
                    fr: "Choisissez une catégorie",
                    pt: "Escolha uma categoria",
                }),
                ending: t({
                    en: "Ending has to come after the start",
                    es: "El final tiene que ser después del inicio",
                    fr: "La fin doit venir après le début",
                    pt: "O fim precisa ser depois do início",
                }),
                name: t({ en: "Give it a name", es: "Ponle un nombre", fr: "Donnez-lui un nom", pt: "Dê um nome" }),
            },
            every: t({ en: "Every", es: "Cada", fr: "Tous les", pt: "A cada" }),
            expense: t({ en: "Expense", es: "Gasto", fr: "Dépense", pt: "Despesa" }),
            firstPayment: t({
                en: "First payment",
                es: "Primer pago",
                fr: "Premier paiement",
                pt: "Primeiro pagamento",
            }),
            income: t({ en: "Income", es: "Ingreso", fr: "Revenu", pt: "Receita" }),
            keepNote: t({
                en: "Past entries keep their amount.",
                es: "Los movimientos anteriores conservan su monto.",
                fr: "Les opérations passées gardent leur montant.",
                pt: "Lançamentos anteriores mantêm o valor.",
            }),
            namePlaceholder: t({
                en: "Hulu, rent, a gym",
                es: "Netflix, alquiler, el gimnasio",
                fr: "Netflix, loyer, la salle de sport",
                pt: "Netflix, aluguel, a academia",
            }),
            never: t({ en: "Never", es: "Nunca", fr: "Jamais", pt: "Nunca" }),
            noAccount: t({ en: "No account", es: "Sin cuenta", fr: "Aucun compte", pt: "Sem conta" }),
            onDate: t({ en: "On a date", es: "En una fecha", fr: "À une date", pt: "Em uma data" }),
            pickCategory: t({
                en: "Pick a category",
                es: "Elige una categoría",
                fr: "Choisir une catégorie",
                pt: "Escolha uma categoria",
            }),
            save: t({ en: "Save", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            sentence: insert(
                t({
                    en: "{{every}}, starting {{start}}, ending {{end}}",
                    es: "{{every}}, desde el {{start}}, termina {{end}}",
                    fr: "{{every}}, à partir du {{start}}, fin {{end}}",
                    pt: "{{every}}, a partir de {{start}}, termina {{end}}",
                })
            ),
            sentenceNever: t({ en: "never", es: "nunca", fr: "jamais", pt: "nunca" }),
            shortMonth: t({ en: "Short month", es: "Mes corto", fr: "Mois court", pt: "Mês curto" }),
            shortNote: t({
                en: "A month too short for that day charges on its last day instead.",
                es: "Si el mes no tiene ese día, se cobra el último día del mes.",
                fr: "Un mois trop court pour ce jour est prélevé à son dernier jour.",
                pt: "Um mês curto demais para esse dia cobra no último dia.",
            }),
            units: {
                days: t({ en: "Days", es: "Días", fr: "Jours", pt: "Dias" }),
                months: t({ en: "Months", es: "Meses", fr: "Mois", pt: "Meses" }),
                weeks: t({ en: "Weeks", es: "Semanas", fr: "Semaines", pt: "Semanas" }),
                years: t({ en: "Years", es: "Años", fr: "Ans", pt: "Anos" }),
            },
        },
        groups: {
            active: t({ en: "Active", es: "Activos", fr: "Actifs", pt: "Ativos" }),
            later: t({ en: "Later", es: "Más adelante", fr: "Plus tard", pt: "Depois" }),
            missed: t({ en: "Missed", es: "Pendientes", fr: "Manqués", pt: "Atrasados" }),
            paused: t({ en: "Paused", es: "En pausa", fr: "Suspendus", pt: "Pausados" }),
            stopped: t({ en: "Stopped", es: "Terminados", fr: "Arrêtés", pt: "Encerrados" }),
            today: t({ en: "Today", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            tomorrow: t({ en: "Tomorrow", es: "Mañana", fr: "Demain", pt: "Amanhã" }),
        },
        kpi: {
            aMonth: t({ en: "a month", es: "al mes", fr: "par mois", pt: "por mês" }),
            detected: t({ en: "Detected", es: "Detectados", fr: "Détectés", pt: "Detectados" }),
            dueNow: t({ en: "Due now", es: "Por pagar", fr: "À payer", pt: "A pagar" }),
            ifConfirmed: t({
                en: "If all confirmed",
                es: "Si confirmas todos",
                fr: "Si tout est confirmé",
                pt: "Se confirmar todos",
            }),
            missed: insert(
                t({
                    en: "{{count}} missed",
                    es: "{{count}} pendientes",
                    fr: "{{count}} manqués",
                    pt: "{{count}} atrasados",
                })
            ),
            nothingDue: t({ en: "Nothing due", es: "Nada por pagar", fr: "Rien à payer", pt: "Nada a pagar" }),
            nothingToConfirm: t({
                en: "Nothing to confirm",
                es: "Nada por confirmar",
                fr: "Rien à confirmer",
                pt: "Nada para confirmar",
            }),
            ofIncome: insert(
                t({
                    en: "{{share}}% of income",
                    es: "{{share}}% de los ingresos",
                    fr: "{{share}} % des revenus",
                    pt: "{{share}}% da renda",
                })
            ),
            pausedSaves: t({
                en: "Paused saves",
                es: "La pausa ahorra",
                fr: "Économie en pause",
                pt: "A pausa economiza",
            }),
            perMonth: t({ en: "Per month", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            toConfirm: insert(
                t({
                    en: "{{count}} to confirm, a month",
                    es: "{{count}} por confirmar, al mes",
                    fr: "{{count}} à confirmer, par mois",
                    pt: "{{count}} para confirmar, por mês",
                })
            ),
            today: insert(
                t({ en: "{{count}} today", es: "{{count}} hoy", fr: "{{count}} aujourd'hui", pt: "{{count}} hoje" })
            ),
        },
        log: {
            dueOn: insert(
                t({
                    en: "Due {{date}}, no matching entry since.",
                    es: "Vencía el {{date}}, sin un movimiento que coincida desde entonces.",
                    fr: "Dû le {{date}}, aucune opération correspondante depuis.",
                    pt: "Vencia em {{date}}, sem lançamento correspondente desde então.",
                })
            ),
            dueToday: t({
                en: "Due today, no matching entry yet.",
                es: "Vence hoy, aún sin un movimiento que coincida.",
                fr: "Dû aujourd'hui, aucune opération correspondante pour l'instant.",
                pt: "Vence hoje, ainda sem lançamento correspondente.",
            }),
            skip: t({ en: "Skip this one", es: "Omitir este", fr: "Passer celui-ci", pt: "Pular este" }),
        },
        paused: {
            emptyLine: t({
                en: "Pause a subscription and it waits here until it comes back.",
                es: "Pausa una suscripción y esperará aquí hasta que vuelva.",
                fr: "Suspendez un abonnement et il attend ici son retour.",
                pt: "Pause uma assinatura e ela espera aqui até voltar.",
            }),
            emptyTitle: t({
                en: "Nothing is paused",
                es: "Nada está en pausa",
                fr: "Rien n'est suspendu",
                pt: "Nada está pausado",
            }),
            footer: insert(
                t({
                    en: "{{paused}} paused, {{stopped}} stopped",
                    es: "{{paused}} en pausa, {{stopped}} terminados",
                    fr: "{{paused}} suspendus, {{stopped}} arrêtés",
                    pt: "{{paused}} pausados, {{stopped}} encerrados",
                })
            ),
            whenIResume: t({
                en: "When I resume",
                es: "Cuando la reanude",
                fr: "À la reprise",
                pt: "Quando eu retomar",
            }),
        },
        perMonth: {
            twelfth: t({
                en: "Yearly charges count as a twelfth",
                es: "Los cobros anuales cuentan como un doceavo",
                fr: "Les prélèvements annuels comptent pour un douzième",
                pt: "Cobranças anuais contam como um doze avos",
            }),
        },
        pause: {
            leaves: insert(
                t({
                    en: "{{amount}} leaves your monthly total while paused.",
                    es: "{{amount}} sale de tu total mensual mientras esté en pausa.",
                    fr: "{{amount}} sort de votre total mensuel pendant la pause.",
                    pt: "{{amount}} sai do seu total mensal enquanto estiver pausado.",
                })
            ),
            next: t({
                en: "Skip the next charge",
                es: "Omitir el próximo cobro",
                fr: "Passer le prochain prélèvement",
                pt: "Pular a próxima cobrança",
            }),
            open: t({
                en: "Until I resume",
                es: "Hasta que la reanude",
                fr: "Jusqu'à la reprise",
                pt: "Até eu retomar",
            }),
            title: insert(
                t({ en: "Pause {{name}}", es: "Pausar {{name}}", fr: "Suspendre {{name}}", pt: "Pausar {{name}}" })
            ),
            until: t({ en: "Until a date", es: "Hasta una fecha", fr: "Jusqu'à une date", pt: "Até uma data" }),
        },
        remove: {
            also: insert(
                t({
                    en: "Also delete those {{count}} entries",
                    es: "Eliminar también esos {{count}} movimientos",
                    fr: "Supprimer aussi ces {{count}} opérations",
                    pt: "Excluir também esses {{count}} lançamentos",
                })
            ),
            alsoOne: t({
                en: "Also delete that entry",
                es: "Eliminar también ese movimiento",
                fr: "Supprimer aussi cette opération",
                pt: "Excluir também esse lançamento",
            }),
            body: insert(
                t({
                    en: "The schedule and its next charges go away. The {{count}} entries already logged stay in Transactions.",
                    es: "La programación y sus próximos cobros desaparecen. Los {{count}} movimientos ya registrados se quedan en Movimientos.",
                    fr: "Le calendrier et ses prochains prélèvements disparaissent. Les {{count}} opérations déjà saisies restent dans Opérations.",
                    pt: "A programação e as próximas cobranças somem. Os {{count}} lançamentos já feitos ficam em Lançamentos.",
                })
            ),
            bodyNone: t({
                en: "The schedule and its next charges go away.",
                es: "La programación y sus próximos cobros desaparecen.",
                fr: "Le calendrier et ses prochains prélèvements disparaissent.",
                pt: "A programação e as próximas cobranças somem.",
            }),
            bodyOne: t({
                en: "The schedule and its next charges go away. The entry already logged stays in Transactions.",
                es: "La programación y sus próximos cobros desaparecen. El movimiento ya registrado se queda en Movimientos.",
                fr: "Le calendrier et ses prochains prélèvements disparaissent. L'opération déjà saisie reste dans Opérations.",
                pt: "A programação e as próximas cobranças somem. O lançamento já feito fica em Lançamentos.",
            }),
            title: insert(
                t({
                    en: "Delete {{name}}?",
                    es: "¿Eliminar {{name}}?",
                    fr: "Supprimer {{name}} ?",
                    pt: "Excluir {{name}}?",
                })
            ),
        },
        repeat: {
            daily: t({ en: "Daily", es: "Diario", fr: "Quotidien", pt: "Diário" }),
            dailyWord: t({ en: "daily", es: "al día", fr: "par jour", pt: "por dia" }),
            everyDays: insert(
                t({
                    en: "Every {{count}} days",
                    es: "Cada {{count}} días",
                    fr: "Tous les {{count}} jours",
                    pt: "A cada {{count}} dias",
                })
            ),
            everyMonths: insert(
                t({
                    en: "Every {{count}} months",
                    es: "Cada {{count}} meses",
                    fr: "Tous les {{count}} mois",
                    pt: "A cada {{count}} meses",
                })
            ),
            everyWeeks: insert(
                t({
                    en: "Every {{count}} weeks",
                    es: "Cada {{count}} semanas",
                    fr: "Toutes les {{count}} semaines",
                    pt: "A cada {{count}} semanas",
                })
            ),
            everyYears: insert(
                t({
                    en: "Every {{count}} years",
                    es: "Cada {{count}} años",
                    fr: "Tous les {{count}} ans",
                    pt: "A cada {{count}} anos",
                })
            ),
            long: {
                day: t({ en: "Every day", es: "Todos los días", fr: "Tous les jours", pt: "Todos os dias" }),
                month: t({ en: "Every month", es: "Cada mes", fr: "Tous les mois", pt: "Todo mês" }),
                onDay: insert(
                    t({
                        en: "{{every}}, on the {{day}}",
                        es: "{{every}}, el día {{day}}",
                        fr: "{{every}}, le {{day}}",
                        pt: "{{every}}, no dia {{day}}",
                    })
                ),
                onWeekday: insert(
                    t({
                        en: "{{every}}, on {{weekday}}",
                        es: "{{every}}, los {{weekday}}",
                        fr: "{{every}}, le {{weekday}}",
                        pt: "{{every}}, às {{weekday}}",
                    })
                ),
                week: t({ en: "Every week", es: "Cada semana", fr: "Toutes les semaines", pt: "Toda semana" }),
                year: t({ en: "Every year", es: "Cada año", fr: "Tous les ans", pt: "Todo ano" }),
            },
            monthly: t({ en: "Monthly", es: "Mensual", fr: "Mensuel", pt: "Mensal" }),
            monthlyWord: t({ en: "monthly", es: "al mes", fr: "par mois", pt: "por mês" }),
            weekly: t({ en: "Weekly", es: "Semanal", fr: "Hebdomadaire", pt: "Semanal" }),
            weeklyWord: t({ en: "weekly", es: "a la semana", fr: "par semaine", pt: "por semana" }),
            yearly: t({ en: "Yearly", es: "Anual", fr: "Annuel", pt: "Anual" }),
            yearlyWord: t({ en: "yearly", es: "al año", fr: "par an", pt: "por ano" }),
        },
        tabs: {
            all: t({ en: "All", es: "Todos", fr: "Tous", pt: "Todos" }),
            calendar: t({ en: "Calendar", es: "Calendario", fr: "Calendrier", pt: "Calendário" }),
            detected: t({ en: "Detected", es: "Detectados", fr: "Détectés", pt: "Detectados" }),
            paused: t({ en: "Paused", es: "En pausa", fr: "Suspendus", pt: "Pausados" }),
            upcoming: t({ en: "Upcoming", es: "Próximos", fr: "À venir", pt: "Próximos" }),
        },
        title: t({ en: "Recurring", es: "Recurrentes", fr: "Récurrents", pt: "Recorrentes" }),
        toast: {
            added: insert(
                t({ en: "{{name}} added", es: "{{name}} agregado", fr: "{{name}} ajouté", pt: "{{name}} adicionado" })
            ),
            confirmed: insert(
                t({
                    en: "{{name}} confirmed",
                    es: "{{name}} confirmado",
                    fr: "{{name}} confirmé",
                    pt: "{{name}} confirmado",
                })
            ),
            confirmedAll: insert(
                t({
                    en: "{{count}} confirmed",
                    es: "{{count}} confirmados",
                    fr: "{{count}} confirmés",
                    pt: "{{count}} confirmados",
                })
            ),
            deleted: insert(
                t({
                    en: "{{name}} deleted",
                    es: "{{name}} eliminado",
                    fr: "{{name}} supprimé",
                    pt: "{{name}} excluído",
                })
            ),
            dismissed: insert(
                t({
                    en: "{{name}} is not recurring",
                    es: "{{name}} no es recurrente",
                    fr: "{{name}} n'est pas récurrent",
                    pt: "{{name}} não é recorrente",
                })
            ),
            failed: t({
                en: "Couldn't save that. Try again.",
                es: "No se pudo guardar. Inténtalo de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não deu para salvar. Tente de novo.",
            }),
            logged: insert(
                t({ en: "{{name}} logged", es: "{{name}} registrado", fr: "{{name}} saisi", pt: "{{name}} lançado" })
            ),
            paused: insert(
                t({ en: "{{name}} paused", es: "{{name}} en pausa", fr: "{{name}} suspendu", pt: "{{name}} pausado" })
            ),
            restarted: insert(
                t({
                    en: "{{name}} restarted",
                    es: "{{name}} reanudado",
                    fr: "{{name}} relancé",
                    pt: "{{name}} retomado",
                })
            ),
            resumed: insert(
                t({ en: "{{name}} resumed", es: "{{name}} reanudado", fr: "{{name}} repris", pt: "{{name}} retomado" })
            ),
            saved: insert(
                t({ en: "{{name}} saved", es: "{{name}} guardado", fr: "{{name}} enregistré", pt: "{{name}} salvo" })
            ),
            skipped: insert(
                t({ en: "Skipped {{name}}", es: "{{name}} omitido", fr: "{{name}} passé", pt: "{{name}} pulado" })
            ),
            stopped: insert(
                t({
                    en: "{{name}} stops repeating",
                    es: "{{name}} deja de repetirse",
                    fr: "{{name}} ne se répète plus",
                    pt: "{{name}} para de repetir",
                })
            ),
            undo: t({ en: "Undo", es: "Deshacer", fr: "Annuler", pt: "Desfazer" }),
        },
    },
    key: "dashboard-recurring",
} satisfies Dictionary;

export default dashboardRecurring;
