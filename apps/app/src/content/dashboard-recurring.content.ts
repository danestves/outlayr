import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardRecurring = {
    content: {
        actions: {
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            edit: t({ en: "Edit", de: "Bearbeiten", es: "Editar", fr: "Modifier", pt: "Editar" }),
            logAgain: t({
                en: "Log again",
                de: "Erneut erfassen",
                es: "Registrar de nuevo",
                fr: "Saisir à nouveau",
                pt: "Lançar de novo",
            }),
            logIt: t({ en: "Log it", de: "Erfassen", es: "Registrar", fr: "Saisir", pt: "Lançar" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    de: "Mehr zu {{name}}",
                    es: "Más opciones de {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais opções de {{name}}",
                })
            ),
            open: t({ en: "Open", de: "Öffnen", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            pause: t({ en: "Pause", de: "Pausieren", es: "Pausar", fr: "Suspendre", pt: "Pausar" }),
            restart: t({ en: "Restart", de: "Neu starten", es: "Reanudar", fr: "Relancer", pt: "Retomar" }),
            resume: t({
                en: "Resume now",
                de: "Jetzt fortsetzen",
                es: "Reanudar ahora",
                fr: "Reprendre",
                pt: "Retomar agora",
            }),
            stop: t({
                en: "Stop repeating",
                de: "Nicht mehr wiederholen",
                es: "Dejar de repetir",
                fr: "Arrêter la répétition",
                pt: "Parar de repetir",
            }),
        },
        add: t({
            en: "Add recurring",
            de: "Wiederkehrend hinzufügen",
            es: "Agregar recurrente",
            fr: "Ajouter",
            pt: "Adicionar recorrente",
        }),
        all: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            anyAccount: t({
                en: "All accounts",
                de: "Alle Konten",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            anyCategory: t({
                en: "All categories",
                de: "Alle Kategorien",
                es: "Todas las categorías",
                fr: "Toutes les catégories",
                pt: "Todas as categorias",
            }),
            anyRepeat: t({
                en: "Any repeat",
                de: "Jede Wiederholung",
                es: "Cualquier frecuencia",
                fr: "Toute fréquence",
                pt: "Qualquer frequência",
            }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            clear: t({ en: "Clear", de: "Zurücksetzen", es: "Limpiar", fr: "Effacer", pt: "Limpar" }),
            footer: insert(
                t({
                    en: "{{active}} active, {{paused}} paused",
                    de: "{{active}} aktiv, {{paused}} pausiert",
                    es: "{{active}} activos, {{paused}} en pausa",
                    fr: "{{active}} actifs, {{paused}} suspendus",
                    pt: "{{active}} ativos, {{paused}} pausados",
                })
            ),
            noMatch: t({
                en: "Nothing matches these filters",
                de: "Keine Treffer für diese Filter",
                es: "Nada coincide con estos filtros",
                fr: "Rien ne correspond à ces filtres",
                pt: "Nada corresponde a esses filtros",
            }),
            repeats: t({ en: "Repeats", de: "Wiederholung", es: "Frecuencia", fr: "Fréquence", pt: "Frequência" }),
            search: t({ en: "Name, note", de: "Name, Notiz", es: "Nombre, nota", fr: "Nom, note", pt: "Nome, nota" }),
            sort: {
                amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
                name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
                next: t({
                    en: "Next date",
                    de: "Nächstes Datum",
                    es: "Próxima fecha",
                    fr: "Prochaine date",
                    pt: "Próxima data",
                }),
                perMonth: t({ en: "Per month", de: "Pro Monat", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            },
        },
        badge: {
            missed: t({ en: "Missed", de: "Verpasst", es: "Pendiente", fr: "Manqué", pt: "Atrasado" }),
            paused: t({ en: "Paused", de: "Pausiert", es: "En pausa", fr: "Suspendu", pt: "Pausado" }),
            stopped: t({ en: "Stopped", de: "Beendet", es: "Terminado", fr: "Arrêté", pt: "Encerrado" }),
            today: t({ en: "Today", de: "Heute", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
        },
        calendar: {
            byWeek: t({ en: "By week", de: "Nach Woche", es: "Por semana", fr: "Par semaine", pt: "Por semana" }),
            dueNow: t({ en: "Due now", de: "Jetzt fällig", es: "Por pagar", fr: "À payer", pt: "A pagar" }),
            missedOn: insert(
                t({
                    en: "{{amount}}, missed {{date}}",
                    de: "{{amount}}, verpasst am {{date}}",
                    es: "{{amount}}, pendiente desde el {{date}}",
                    fr: "{{amount}}, manqué le {{date}}",
                    pt: "{{amount}}, atrasado desde {{date}}",
                })
            ),
            nextMonth: t({
                en: "Next month",
                de: "Nächster Monat",
                es: "Mes siguiente",
                fr: "Mois suivant",
                pt: "Próximo mês",
            }),
            nothingDue: t({
                en: "Nothing is due",
                de: "Nichts fällig",
                es: "Nada por pagar",
                fr: "Rien à payer",
                pt: "Nada a pagar",
            }),
            nothingOn: t({
                en: "No charges on this day",
                de: "Keine Abbuchungen an diesem Tag",
                es: "Sin cobros este día",
                fr: "Aucun prélèvement ce jour",
                pt: "Sem cobranças neste dia",
            }),
            previousMonth: t({
                en: "Previous month",
                de: "Voriger Monat",
                es: "Mes anterior",
                fr: "Mois précédent",
                pt: "Mês anterior",
            }),
            today: t({ en: "Today", de: "Heute", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            todayLine: insert(
                t({
                    en: "{{amount}}, today",
                    de: "{{amount}}, heute",
                    es: "{{amount}}, hoy",
                    fr: "{{amount}}, aujourd'hui",
                    pt: "{{amount}}, hoje",
                })
            ),
            weekRange: insert(
                t({
                    en: "{{from}} to {{to}}",
                    de: "{{from}} bis {{to}}",
                    es: "{{from}} al {{to}}",
                    fr: "{{from}} au {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
        },
        cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        charges: insert(
            t({
                en: "{{count}} charges",
                de: "{{count}} Abbuchungen",
                es: "{{count}} cobros",
                fr: "{{count}} prélèvements",
                pt: "{{count}} cobranças",
            })
        ),
        chargesOne: t({ en: "1 charge", de: "1 Abbuchung", es: "1 cobro", fr: "1 prélèvement", pt: "1 cobrança" }),
        close: t({ en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        columns: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            gap: t({ en: "Gap", de: "Abstand", es: "Intervalo", fr: "Écart", pt: "Intervalo" }),
            looksLike: t({ en: "Looks like", de: "Sieht aus wie", es: "Parece", fr: "Semble", pt: "Parece" }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            nextDate: t({
                en: "Next date",
                de: "Nächstes Datum",
                es: "Próxima fecha",
                fr: "Prochaine date",
                pt: "Próxima data",
            }),
            pausedSince: t({
                en: "Paused since",
                de: "Pausiert seit",
                es: "En pausa desde",
                fr: "Suspendu depuis",
                pt: "Pausado desde",
            }),
            perMonth: t({ en: "Per month", de: "Pro Monat", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            repeats: t({ en: "Repeats", de: "Wiederholung", es: "Frecuencia", fr: "Fréquence", pt: "Frequência" }),
            resumes: t({ en: "Resumes", de: "Wird fortgesetzt", es: "Se reanuda", fr: "Reprise", pt: "Retoma" }),
            seen: t({ en: "Seen", de: "Erkannt", es: "Visto", fr: "Vu", pt: "Visto" }),
        },
        confirm: {
            link: insert(
                t({
                    en: "Link {{count}} past entries, {{from}} to {{to}}",
                    de: "{{count}} frühere Einträge verknüpfen, {{from}} bis {{to}}",
                    es: "Vincular {{count}} movimientos anteriores, del {{from}} al {{to}}",
                    fr: "Lier {{count}} opérations passées, du {{from}} au {{to}}",
                    pt: "Vincular {{count}} lançamentos anteriores, de {{from}} a {{to}}",
                })
            ),
            linkOne: insert(
                t({
                    en: "Link the past entry from {{from}}",
                    de: "Früheren Eintrag vom {{from}} verknüpfen",
                    es: "Vincular el movimiento anterior del {{from}}",
                    fr: "Lier l'opération passée du {{from}}",
                    pt: "Vincular o lançamento anterior de {{from}}",
                })
            ),
        },
        detected: {
            confirm: t({ en: "Confirm", de: "Bestätigen", es: "Confirmar", fr: "Confirmer", pt: "Confirmar" }),
            confirmAll: t({
                en: "Confirm all",
                de: "Alle bestätigen",
                es: "Confirmar todos",
                fr: "Tout confirmer",
                pt: "Confirmar todos",
            }),
            emptyLine: t({
                en: "Entries that repeat on a steady beat show up here.",
                de: "Einträge, die sich in gleichmäßigem Takt wiederholen, erscheinen hier.",
                es: "Los movimientos que se repiten con regularidad aparecen aquí.",
                fr: "Les opérations qui reviennent à intervalle régulier apparaissent ici.",
                pt: "Lançamentos que se repetem com regularidade aparecem aqui.",
            }),
            emptyTitle: t({
                en: "Nothing to confirm",
                de: "Nichts zu bestätigen",
                es: "Nada por confirmar",
                fr: "Rien à confirmer",
                pt: "Nada para confirmar",
            }),
            footer: insert(
                t({
                    en: "Same amount, about every {{count}} days",
                    de: "Gleicher Betrag, etwa alle {{count}} Tage",
                    es: "Mismo monto, cada {{count}} días aproximadamente",
                    fr: "Même montant, environ tous les {{count}} jours",
                    pt: "Mesmo valor, a cada {{count}} dias aproximadamente",
                })
            ),
            gapDays: insert(
                t({
                    en: "{{count}} days",
                    de: "{{count}} Tage",
                    es: "{{count}} días",
                    fr: "{{count}} jours",
                    pt: "{{count}} dias",
                })
            ),
            matching: insert(
                t({
                    en: "{{count}} matching entries",
                    de: "{{count}} passende Einträge",
                    es: "{{count}} movimientos coinciden",
                    fr: "{{count}} opérations correspondantes",
                    pt: "{{count}} lançamentos correspondentes",
                })
            ),
            notRecurring: t({
                en: "Not recurring",
                de: "Nicht wiederkehrend",
                es: "No es recurrente",
                fr: "Pas récurrent",
                pt: "Não é recorrente",
            }),
            perCycle: insert(
                t({
                    en: "{{amount}} {{cadence}}",
                    de: "{{amount}} {{cadence}}",
                    es: "{{amount}} {{cadence}}",
                    fr: "{{amount}} {{cadence}}",
                    pt: "{{amount}} {{cadence}}",
                })
            ),
            seeAll: t({ en: "See all", de: "Alle ansehen", es: "Ver todos", fr: "Tout voir", pt: "Ver todos" }),
            seeEntries: t({
                en: "See entries",
                de: "Einträge ansehen",
                es: "Ver movimientos",
                fr: "Voir les opérations",
                pt: "Ver lançamentos",
            }),
            seen: insert(
                t({
                    en: "{{count}} times",
                    de: "{{count}}-mal",
                    es: "{{count}} veces",
                    fr: "{{count}} fois",
                    pt: "{{count}} vezes",
                })
            ),
            since: insert(
                t({
                    en: "{{amount}} since {{month}}",
                    de: "{{amount}} seit {{month}}",
                    es: "{{amount}} desde {{month}}",
                    fr: "{{amount}} depuis {{month}}",
                    pt: "{{amount}} desde {{month}}",
                })
            ),
        },
        drawer: {
            allEntries: t({
                en: "All entries",
                de: "Alle Einträge",
                es: "Todos los movimientos",
                fr: "Toutes les opérations",
                pt: "Todos os lançamentos",
            }),
            ended: insert(
                t({
                    en: "{{repeats}}, ended {{date}}",
                    de: "{{repeats}}, beendet am {{date}}",
                    es: "{{repeats}}, terminó el {{date}}",
                    fr: "{{repeats}}, terminé le {{date}}",
                    pt: "{{repeats}}, encerrado em {{date}}",
                })
            ),
            historyAll: t({ en: "History", de: "Verlauf", es: "Historial", fr: "Historique", pt: "Histórico" }),
            history: t({
                en: "History, last 6 months",
                de: "Verlauf, letzte 6 Monate",
                es: "Historial, últimos 6 meses",
                fr: "Historique, 6 derniers mois",
                pt: "Histórico, últimos 6 meses",
            }),
            next: insert(
                t({
                    en: "{{repeats}}, next {{date}}",
                    de: "{{repeats}}, nächste am {{date}}",
                    es: "{{repeats}}, próximo el {{date}}",
                    fr: "{{repeats}}, prochain le {{date}}",
                    pt: "{{repeats}}, próximo em {{date}}",
                })
            ),
            nextItem: t({ en: "Next item", de: "Nächster Posten", es: "Siguiente", fr: "Suivant", pt: "Próximo" }),
            noHistory: t({
                en: "No charges logged yet",
                de: "Noch keine Abbuchungen erfasst",
                es: "Aún no hay cobros registrados",
                fr: "Aucun prélèvement saisi",
                pt: "Nenhuma cobrança lançada ainda",
            }),
            paused: insert(
                t({
                    en: "{{repeats}}, no charges for now",
                    de: "{{repeats}}, vorerst keine Abbuchungen",
                    es: "{{repeats}}, sin cobros por ahora",
                    fr: "{{repeats}}, aucun prélèvement pour l'instant",
                    pt: "{{repeats}}, sem cobranças por enquanto",
                })
            ),
            previousItem: t({
                en: "Previous item",
                de: "Voriger Posten",
                es: "Anterior",
                fr: "Précédent",
                pt: "Anterior",
            }),
            priceDown: insert(
                t({
                    en: "Price down {{amount}}",
                    de: "Preis um {{amount}} gesunken",
                    es: "Bajó {{amount}}",
                    fr: "Baisse de {{amount}}",
                    pt: "Caiu {{amount}}",
                })
            ),
            priceUp: insert(
                t({
                    en: "Price up {{amount}}",
                    de: "Preis um {{amount}} gestiegen",
                    es: "Subió {{amount}}",
                    fr: "Hausse de {{amount}}",
                    pt: "Subiu {{amount}}",
                })
            ),
            title: t({ en: "Recurring", de: "Wiederkehrend", es: "Recurrente", fr: "Récurrent", pt: "Recorrente" }),
        },
        empty: {
            import: t({
                en: "Import entries to detect them",
                de: "Importiere Einträge, um sie zu erkennen",
                es: "Importa movimientos para detectarlos",
                fr: "Importer des opérations pour les détecter",
                pt: "Importe lançamentos para detectá-los",
            }),
            line: t({
                en: "Add rent or a subscription and it shows up here before it charges.",
                de: "Füge Miete oder ein Abo hinzu, und es erscheint hier, bevor es abgebucht wird.",
                es: "Agrega el alquiler o una suscripción y aparecerá aquí antes de cobrarse.",
                fr: "Ajoutez un loyer ou un abonnement et il apparaît ici avant d'être prélevé.",
                pt: "Adicione o aluguel ou uma assinatura e ele aparece aqui antes da cobrança.",
            }),
            title: t({
                en: "Nothing is scheduled",
                de: "Nichts geplant",
                es: "No hay nada programado",
                fr: "Rien n'est programmé",
                pt: "Nada está programado",
            }),
        },
        export: t({ en: "Export", de: "Exportieren", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
        exportFile: t({ en: "recurring", de: "wiederkehrend", es: "recurrentes", fr: "recurrents", pt: "recorrentes" }),
        fields: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            ending: t({ en: "Ending", de: "Ende", es: "Termina", fr: "Fin", pt: "Termina" }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            nextCharge: t({
                en: "Next charge",
                de: "Nächste Abbuchung",
                es: "Próximo cobro",
                fr: "Prochain prélèvement",
                pt: "Próxima cobrança",
            }),
            nextCharges: t({
                en: "Next charges",
                de: "Nächste Abbuchungen",
                es: "Próximos cobros",
                fr: "Prochains prélèvements",
                pt: "Próximas cobranças",
            }),
            paidOn: t({ en: "Paid on", de: "Bezahlt am", es: "Pagado el", fr: "Payé le", pt: "Pago em" }),
            pausedSince: t({
                en: "Paused since",
                de: "Pausiert seit",
                es: "En pausa desde",
                fr: "Suspendu depuis",
                pt: "Pausado desde",
            }),
            perMonth: t({ en: "Per month", de: "Pro Monat", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            repeats: t({ en: "Repeats", de: "Wiederholung", es: "Se repite", fr: "Répétition", pt: "Repete" }),
            resumes: t({ en: "Resumes", de: "Wird fortgesetzt", es: "Se reanuda", fr: "Reprise", pt: "Retoma" }),
            starting: t({ en: "Starting", de: "Beginn", es: "Empieza", fr: "Début", pt: "Início" }),
        },
        footer: {
            ahead: insert(
                t({
                    en: "{{count}} charges ahead",
                    de: "{{count}} Abbuchungen stehen an",
                    es: "{{count}} cobros por venir",
                    fr: "{{count}} prélèvements à venir",
                    pt: "{{count}} cobranças à frente",
                })
            ),
            aheadOne: t({
                en: "1 charge ahead",
                de: "1 Abbuchung steht an",
                es: "1 cobro por venir",
                fr: "1 prélèvement à venir",
                pt: "1 cobrança à frente",
            }),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
        },
        form: {
            addTitle: t({
                en: "Add recurring",
                de: "Wiederkehrend hinzufügen",
                es: "Agregar recurrente",
                fr: "Ajouter un récurrent",
                pt: "Adicionar recorrente",
            }),
            adds: insert(
                t({
                    en: "Adds {{amount}} a month",
                    de: "Fügt {{amount}} pro Monat hinzu",
                    es: "Suma {{amount}} al mes",
                    fr: "Ajoute {{amount}} par mois",
                    pt: "Soma {{amount}} por mês",
                })
            ),
            back: t({ en: "Back", de: "Zurück", es: "Atrás", fr: "Retour", pt: "Voltar" }),
            custom: t({
                en: "Custom",
                de: "Benutzerdefiniert",
                es: "Personalizado",
                fr: "Personnalisé",
                pt: "Personalizado",
            }),
            customTitle: t({
                en: "Custom schedule",
                de: "Benutzerdefinierter Zeitplan",
                es: "Frecuencia personalizada",
                fr: "Fréquence personnalisée",
                pt: "Frequência personalizada",
            }),
            done: t({ en: "Done", de: "Fertig", es: "Listo", fr: "OK", pt: "Pronto" }),
            editTitle: insert(
                t({
                    en: "Edit {{name}}",
                    de: "{{name}} bearbeiten",
                    es: "Editar {{name}}",
                    fr: "Modifier {{name}}",
                    pt: "Editar {{name}}",
                })
            ),
            errors: {
                amount: insert(
                    t({
                        en: "Enter an amount above {{zero}}",
                        de: "Gib einen Betrag über {{zero}} ein",
                        es: "Escribe un monto mayor a {{zero}}",
                        fr: "Saisissez un montant supérieur à {{zero}}",
                        pt: "Digite um valor acima de {{zero}}",
                    })
                ),
                category: t({
                    en: "Pick a category",
                    de: "Kategorie wählen",
                    es: "Elige una categoría",
                    fr: "Choisissez une catégorie",
                    pt: "Escolha uma categoria",
                }),
                ending: t({
                    en: "Ending has to come after the start",
                    de: "Das Ende muss nach dem Beginn liegen",
                    es: "El final tiene que ser después del inicio",
                    fr: "La fin doit venir après le début",
                    pt: "O fim precisa ser depois do início",
                }),
                name: t({
                    en: "Give it a name",
                    de: "Gib einen Namen ein",
                    es: "Ponle un nombre",
                    fr: "Donnez-lui un nom",
                    pt: "Dê um nome",
                }),
            },
            every: t({ en: "Every", de: "Alle", es: "Cada", fr: "Tous les", pt: "A cada" }),
            expense: t({ en: "Expense", de: "Ausgabe", es: "Gasto", fr: "Dépense", pt: "Despesa" }),
            firstPayment: t({
                en: "First payment",
                de: "Erste Zahlung",
                es: "Primer pago",
                fr: "Premier paiement",
                pt: "Primeiro pagamento",
            }),
            income: t({ en: "Income", de: "Einnahme", es: "Ingreso", fr: "Revenu", pt: "Receita" }),
            keepNote: t({
                en: "Past entries keep their amount.",
                de: "Frühere Einträge behalten ihren Betrag.",
                es: "Los movimientos anteriores conservan su monto.",
                fr: "Les opérations passées gardent leur montant.",
                pt: "Lançamentos anteriores mantêm o valor.",
            }),
            namePlaceholder: t({
                en: "Hulu, rent, a gym",
                de: "Netflix, Miete, Fitnessstudio",
                es: "Netflix, alquiler, el gimnasio",
                fr: "Netflix, loyer, la salle de sport",
                pt: "Netflix, aluguel, a academia",
            }),
            never: t({ en: "Never", de: "Nie", es: "Nunca", fr: "Jamais", pt: "Nunca" }),
            noAccount: t({ en: "No account", de: "Kein Konto", es: "Sin cuenta", fr: "Aucun compte", pt: "Sem conta" }),
            onDate: t({
                en: "On a date",
                de: "An einem Datum",
                es: "En una fecha",
                fr: "À une date",
                pt: "Em uma data",
            }),
            pickCategory: t({
                en: "Pick a category",
                de: "Kategorie wählen",
                es: "Elige una categoría",
                fr: "Choisir une catégorie",
                pt: "Escolha uma categoria",
            }),
            save: t({ en: "Save", de: "Speichern", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            sentence: insert(
                t({
                    en: "{{every}}, starting {{start}}, ending {{end}}",
                    de: "{{every}}, beginnend am {{start}}, endend {{end}}",
                    es: "{{every}}, desde el {{start}}, termina {{end}}",
                    fr: "{{every}}, à partir du {{start}}, fin {{end}}",
                    pt: "{{every}}, a partir de {{start}}, termina {{end}}",
                })
            ),
            sentenceNever: t({ en: "never", de: "nie", es: "nunca", fr: "jamais", pt: "nunca" }),
            shortMonth: t({
                en: "Short month",
                de: "Kurzer Monat",
                es: "Mes corto",
                fr: "Mois court",
                pt: "Mês curto",
            }),
            shortNote: t({
                en: "A month too short for that day charges on its last day instead.",
                de: "In einem Monat, der für diesen Tag zu kurz ist, wird stattdessen am letzten Tag abgebucht.",
                es: "Si el mes no tiene ese día, se cobra el último día del mes.",
                fr: "Un mois trop court pour ce jour est prélevé à son dernier jour.",
                pt: "Um mês curto demais para esse dia cobra no último dia.",
            }),
            units: {
                days: t({ en: "Days", de: "Tage", es: "Días", fr: "Jours", pt: "Dias" }),
                months: t({ en: "Months", de: "Monate", es: "Meses", fr: "Mois", pt: "Meses" }),
                weeks: t({ en: "Weeks", de: "Wochen", es: "Semanas", fr: "Semaines", pt: "Semanas" }),
                years: t({ en: "Years", de: "Jahre", es: "Años", fr: "Ans", pt: "Anos" }),
            },
        },
        groups: {
            active: t({ en: "Active", de: "Aktiv", es: "Activos", fr: "Actifs", pt: "Ativos" }),
            later: t({ en: "Later", de: "Später", es: "Más adelante", fr: "Plus tard", pt: "Depois" }),
            missed: t({ en: "Missed", de: "Verpasst", es: "Pendientes", fr: "Manqués", pt: "Atrasados" }),
            paused: t({ en: "Paused", de: "Pausiert", es: "En pausa", fr: "Suspendus", pt: "Pausados" }),
            stopped: t({ en: "Stopped", de: "Beendet", es: "Terminados", fr: "Arrêtés", pt: "Encerrados" }),
            today: t({ en: "Today", de: "Heute", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            tomorrow: t({ en: "Tomorrow", de: "Morgen", es: "Mañana", fr: "Demain", pt: "Amanhã" }),
        },
        kpi: {
            aMonth: t({ en: "a month", de: "pro Monat", es: "al mes", fr: "par mois", pt: "por mês" }),
            detected: t({ en: "Detected", de: "Erkannt", es: "Detectados", fr: "Détectés", pt: "Detectados" }),
            dueNow: t({ en: "Due now", de: "Jetzt fällig", es: "Por pagar", fr: "À payer", pt: "A pagar" }),
            ifConfirmed: t({
                en: "If all confirmed",
                de: "Wenn alle bestätigt sind",
                es: "Si confirmas todos",
                fr: "Si tout est confirmé",
                pt: "Se confirmar todos",
            }),
            missed: insert(
                t({
                    en: "{{count}} missed",
                    de: "{{count}} verpasst",
                    es: "{{count}} pendientes",
                    fr: "{{count}} manqués",
                    pt: "{{count}} atrasados",
                })
            ),
            nothingDue: t({
                en: "Nothing due",
                de: "Nichts fällig",
                es: "Nada por pagar",
                fr: "Rien à payer",
                pt: "Nada a pagar",
            }),
            nothingToConfirm: t({
                en: "Nothing to confirm",
                de: "Nichts zu bestätigen",
                es: "Nada por confirmar",
                fr: "Rien à confirmer",
                pt: "Nada para confirmar",
            }),
            ofIncome: insert(
                t({
                    en: "{{share}}% of income",
                    de: "{{share}} % der Einnahmen",
                    es: "{{share}}% de los ingresos",
                    fr: "{{share}} % des revenus",
                    pt: "{{share}}% da renda",
                })
            ),
            pausedSaves: t({
                en: "Paused saves",
                de: "Pausiert spart",
                es: "La pausa ahorra",
                fr: "Économie en pause",
                pt: "A pausa economiza",
            }),
            perMonth: t({ en: "Per month", de: "Pro Monat", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            toConfirm: insert(
                t({
                    en: "{{count}} to confirm, a month",
                    de: "{{count}} zu bestätigen, pro Monat",
                    es: "{{count}} por confirmar, al mes",
                    fr: "{{count}} à confirmer, par mois",
                    pt: "{{count}} para confirmar, por mês",
                })
            ),
            today: insert(
                t({
                    en: "{{count}} today",
                    de: "{{count}} heute",
                    es: "{{count}} hoy",
                    fr: "{{count}} aujourd'hui",
                    pt: "{{count}} hoje",
                })
            ),
        },
        log: {
            dueOn: insert(
                t({
                    en: "Due {{date}}, no matching entry since.",
                    de: "Fällig am {{date}}, seitdem kein passender Eintrag.",
                    es: "Vencía el {{date}}, sin un movimiento que coincida desde entonces.",
                    fr: "Dû le {{date}}, aucune opération correspondante depuis.",
                    pt: "Vencia em {{date}}, sem lançamento correspondente desde então.",
                })
            ),
            dueToday: t({
                en: "Due today, no matching entry yet.",
                de: "Heute fällig, noch kein passender Eintrag.",
                es: "Vence hoy, aún sin un movimiento que coincida.",
                fr: "Dû aujourd'hui, aucune opération correspondante pour l'instant.",
                pt: "Vence hoje, ainda sem lançamento correspondente.",
            }),
            skip: t({
                en: "Skip this one",
                de: "Diese überspringen",
                es: "Omitir este",
                fr: "Passer celui-ci",
                pt: "Pular este",
            }),
            skipAll: insert(
                t({
                    en: "Skip {{count}} due",
                    de: "{{count}} Fällige überspringen",
                    es: "Omitir los {{count}} pendientes",
                    fr: "Passer les {{count}} échéances",
                    pt: "Pular os {{count}} pendentes",
                })
            ),
        },
        paused: {
            emptyLine: t({
                en: "Pause a subscription and it waits here until it comes back.",
                de: "Pausiere ein Abo, und es wartet hier, bis es wieder losgeht.",
                es: "Pausa una suscripción y esperará aquí hasta que vuelva.",
                fr: "Suspendez un abonnement et il attend ici son retour.",
                pt: "Pause uma assinatura e ela espera aqui até voltar.",
            }),
            emptyTitle: t({
                en: "Nothing is paused",
                de: "Nichts pausiert",
                es: "Nada está en pausa",
                fr: "Rien n'est suspendu",
                pt: "Nada está pausado",
            }),
            footer: insert(
                t({
                    en: "{{paused}} paused, {{stopped}} stopped",
                    de: "{{paused}} pausiert, {{stopped}} beendet",
                    es: "{{paused}} en pausa, {{stopped}} terminados",
                    fr: "{{paused}} suspendus, {{stopped}} arrêtés",
                    pt: "{{paused}} pausados, {{stopped}} encerrados",
                })
            ),
            wouldCost: t({ en: "Would cost", de: "Würde kosten", es: "Costaría", fr: "Coûterait", pt: "Custaria" }),
            whenIResume: t({
                en: "When I resume",
                de: "Wenn ich fortsetze",
                es: "Cuando la reanude",
                fr: "À la reprise",
                pt: "Quando eu retomar",
            }),
        },
        perMonth: {
            twelfth: t({
                en: "Yearly charges count as a twelfth",
                de: "Jährliche Abbuchungen zählen als Zwölftel",
                es: "Los cobros anuales cuentan como un doceavo",
                fr: "Les prélèvements annuels comptent pour un douzième",
                pt: "Cobranças anuais contam como um doze avos",
            }),
        },
        pause: {
            leaves: insert(
                t({
                    en: "{{amount}} leaves your monthly total while paused.",
                    de: "{{amount}} fällt während der Pause aus deiner Monatssumme.",
                    es: "{{amount}} sale de tu total mensual mientras esté en pausa.",
                    fr: "{{amount}} sort de votre total mensuel pendant la pause.",
                    pt: "{{amount}} sai do seu total mensal enquanto estiver pausado.",
                })
            ),
            next: t({
                en: "Skip the next charge",
                de: "Nächste Abbuchung überspringen",
                es: "Omitir el próximo cobro",
                fr: "Passer le prochain prélèvement",
                pt: "Pular a próxima cobrança",
            }),
            open: t({
                en: "Until I resume",
                de: "Bis ich fortsetze",
                es: "Hasta que la reanude",
                fr: "Jusqu'à la reprise",
                pt: "Até eu retomar",
            }),
            title: insert(
                t({
                    en: "Pause {{name}}",
                    de: "{{name}} pausieren",
                    es: "Pausar {{name}}",
                    fr: "Suspendre {{name}}",
                    pt: "Pausar {{name}}",
                })
            ),
            until: t({
                en: "Until a date",
                de: "Bis zu einem Datum",
                es: "Hasta una fecha",
                fr: "Jusqu'à une date",
                pt: "Até uma data",
            }),
        },
        remove: {
            also: insert(
                t({
                    en: "Also delete those {{count}} entries",
                    de: "Auch diese {{count}} Einträge löschen",
                    es: "Eliminar también esos {{count}} movimientos",
                    fr: "Supprimer aussi ces {{count}} opérations",
                    pt: "Excluir também esses {{count}} lançamentos",
                })
            ),
            alsoOne: t({
                en: "Also delete that entry",
                de: "Auch diesen Eintrag löschen",
                es: "Eliminar también ese movimiento",
                fr: "Supprimer aussi cette opération",
                pt: "Excluir também esse lançamento",
            }),
            body: insert(
                t({
                    en: "The schedule and its next charges go away. The {{count}} entries already logged stay in Transactions.",
                    de: "Der Zeitplan und seine nächsten Abbuchungen entfallen. Die {{count}} bereits erfassten Einträge bleiben unter Einträge.",
                    es: "La programación y sus próximos cobros desaparecen. Los {{count}} movimientos ya registrados se quedan en Movimientos.",
                    fr: "Le calendrier et ses prochains prélèvements disparaissent. Les {{count}} opérations déjà saisies restent dans Opérations.",
                    pt: "A programação e as próximas cobranças somem. Os {{count}} lançamentos já feitos ficam em Lançamentos.",
                })
            ),
            bodyNone: t({
                en: "The schedule and its next charges go away.",
                de: "Der Zeitplan und seine nächsten Abbuchungen entfallen.",
                es: "La programación y sus próximos cobros desaparecen.",
                fr: "Le calendrier et ses prochains prélèvements disparaissent.",
                pt: "A programação e as próximas cobranças somem.",
            }),
            bodyOne: t({
                en: "The schedule and its next charges go away. The entry already logged stays in Transactions.",
                de: "Der Zeitplan und seine nächsten Abbuchungen entfallen. Der bereits erfasste Eintrag bleibt unter Einträge.",
                es: "La programación y sus próximos cobros desaparecen. El movimiento ya registrado se queda en Movimientos.",
                fr: "Le calendrier et ses prochains prélèvements disparaissent. L'opération déjà saisie reste dans Opérations.",
                pt: "A programação e as próximas cobranças somem. O lançamento já feito fica em Lançamentos.",
            }),
            title: insert(
                t({
                    en: "Delete {{name}}?",
                    de: "{{name}} löschen?",
                    es: "¿Eliminar {{name}}?",
                    fr: "Supprimer {{name}} ?",
                    pt: "Excluir {{name}}?",
                })
            ),
        },
        repeat: {
            daily: t({ en: "Daily", de: "Täglich", es: "Diario", fr: "Quotidien", pt: "Diário" }),
            dailyWord: t({ en: "daily", de: "täglich", es: "al día", fr: "par jour", pt: "por dia" }),
            everyDays: insert(
                t({
                    en: "Every {{count}} days",
                    de: "Alle {{count}} Tage",
                    es: "Cada {{count}} días",
                    fr: "Tous les {{count}} jours",
                    pt: "A cada {{count}} dias",
                })
            ),
            everyMonths: insert(
                t({
                    en: "Every {{count}} months",
                    de: "Alle {{count}} Monate",
                    es: "Cada {{count}} meses",
                    fr: "Tous les {{count}} mois",
                    pt: "A cada {{count}} meses",
                })
            ),
            everyWeeks: insert(
                t({
                    en: "Every {{count}} weeks",
                    de: "Alle {{count}} Wochen",
                    es: "Cada {{count}} semanas",
                    fr: "Toutes les {{count}} semaines",
                    pt: "A cada {{count}} semanas",
                })
            ),
            everyYears: insert(
                t({
                    en: "Every {{count}} years",
                    de: "Alle {{count}} Jahre",
                    es: "Cada {{count}} años",
                    fr: "Tous les {{count}} ans",
                    pt: "A cada {{count}} anos",
                })
            ),
            long: {
                day: t({
                    en: "Every day",
                    de: "Jeden Tag",
                    es: "Todos los días",
                    fr: "Tous les jours",
                    pt: "Todos os dias",
                }),
                month: t({ en: "Every month", de: "Jeden Monat", es: "Cada mes", fr: "Tous les mois", pt: "Todo mês" }),
                onDay: insert(
                    t({
                        en: "{{every}}, on the {{day}}",
                        de: "{{every}}, am {{day}}",
                        es: "{{every}}, el día {{day}}",
                        fr: "{{every}}, le {{day}}",
                        pt: "{{every}}, no dia {{day}}",
                    })
                ),
                onWeekday: insert(
                    t({
                        en: "{{every}}, on {{weekday}}",
                        de: "{{every}}, am {{weekday}}",
                        es: "{{every}}, los {{weekday}}",
                        fr: "{{every}}, le {{weekday}}",
                        pt: "{{every}}, às {{weekday}}",
                    })
                ),
                week: t({
                    en: "Every week",
                    de: "Jede Woche",
                    es: "Cada semana",
                    fr: "Toutes les semaines",
                    pt: "Toda semana",
                }),
                year: t({ en: "Every year", de: "Jedes Jahr", es: "Cada año", fr: "Tous les ans", pt: "Todo ano" }),
            },
            monthly: t({ en: "Monthly", de: "Monatlich", es: "Mensual", fr: "Mensuel", pt: "Mensal" }),
            monthlyWord: t({ en: "monthly", de: "monatlich", es: "al mes", fr: "par mois", pt: "por mês" }),
            weekly: t({ en: "Weekly", de: "Wöchentlich", es: "Semanal", fr: "Hebdomadaire", pt: "Semanal" }),
            weeklyWord: t({ en: "weekly", de: "wöchentlich", es: "a la semana", fr: "par semaine", pt: "por semana" }),
            yearly: t({ en: "Yearly", de: "Jährlich", es: "Anual", fr: "Annuel", pt: "Anual" }),
            yearlyWord: t({ en: "yearly", de: "jährlich", es: "al año", fr: "par an", pt: "por ano" }),
        },
        tabs: {
            all: t({ en: "All", de: "Alle", es: "Todos", fr: "Tous", pt: "Todos" }),
            calendar: t({ en: "Calendar", de: "Kalender", es: "Calendario", fr: "Calendrier", pt: "Calendário" }),
            detected: t({ en: "Detected", de: "Erkannt", es: "Detectados", fr: "Détectés", pt: "Detectados" }),
            paused: t({ en: "Paused", de: "Pausiert", es: "En pausa", fr: "Suspendus", pt: "Pausados" }),
            upcoming: t({ en: "Upcoming", de: "Anstehend", es: "Próximos", fr: "À venir", pt: "Próximos" }),
        },
        title: t({ en: "Recurring", de: "Wiederkehrend", es: "Recurrentes", fr: "Récurrents", pt: "Recorrentes" }),
        toast: {
            added: insert(
                t({
                    en: "{{name}} added",
                    de: "{{name}} hinzugefügt",
                    es: "{{name}} agregado",
                    fr: "{{name}} ajouté",
                    pt: "{{name}} adicionado",
                })
            ),
            confirmed: insert(
                t({
                    en: "{{name}} confirmed",
                    de: "{{name}} bestätigt",
                    es: "{{name}} confirmado",
                    fr: "{{name}} confirmé",
                    pt: "{{name}} confirmado",
                })
            ),
            confirmedAll: insert(
                t({
                    en: "{{count}} confirmed",
                    de: "{{count}} bestätigt",
                    es: "{{count}} confirmados",
                    fr: "{{count}} confirmés",
                    pt: "{{count}} confirmados",
                })
            ),
            deleted: insert(
                t({
                    en: "{{name}} deleted",
                    de: "{{name}} gelöscht",
                    es: "{{name}} eliminado",
                    fr: "{{name}} supprimé",
                    pt: "{{name}} excluído",
                })
            ),
            dismissed: insert(
                t({
                    en: "{{name}} is not recurring",
                    de: "{{name}} ist nicht wiederkehrend",
                    es: "{{name}} no es recurrente",
                    fr: "{{name}} n'est pas récurrent",
                    pt: "{{name}} não é recorrente",
                })
            ),
            failed: t({
                en: "Couldn't save that. Try again.",
                de: "Das Speichern hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo guardar. Inténtalo de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não deu para salvar. Tente de novo.",
            }),
            logged: insert(
                t({
                    en: "{{name}} logged",
                    de: "{{name}} erfasst",
                    es: "{{name}} registrado",
                    fr: "{{name}} saisi",
                    pt: "{{name}} lançado",
                })
            ),
            paused: insert(
                t({
                    en: "{{name}} paused",
                    de: "{{name}} pausiert",
                    es: "{{name}} en pausa",
                    fr: "{{name}} suspendu",
                    pt: "{{name}} pausado",
                })
            ),
            restarted: insert(
                t({
                    en: "{{name}} restarted",
                    de: "{{name}} neu gestartet",
                    es: "{{name}} reanudado",
                    fr: "{{name}} relancé",
                    pt: "{{name}} retomado",
                })
            ),
            resumed: insert(
                t({
                    en: "{{name}} resumed",
                    de: "{{name}} fortgesetzt",
                    es: "{{name}} reanudado",
                    fr: "{{name}} repris",
                    pt: "{{name}} retomado",
                })
            ),
            saved: insert(
                t({
                    en: "{{name}} saved",
                    de: "{{name}} gespeichert",
                    es: "{{name}} guardado",
                    fr: "{{name}} enregistré",
                    pt: "{{name}} salvo",
                })
            ),
            skipped: insert(
                t({
                    en: "Skipped {{name}}",
                    de: "{{name}} übersprungen",
                    es: "{{name}} omitido",
                    fr: "{{name}} passé",
                    pt: "{{name}} pulado",
                })
            ),
            stopped: insert(
                t({
                    en: "{{name}} stops repeating",
                    de: "{{name}} wird nicht mehr wiederholt",
                    es: "{{name}} deja de repetirse",
                    fr: "{{name}} ne se répète plus",
                    pt: "{{name}} para de repetir",
                })
            ),
        },
    },
    key: "dashboard-recurring",
} satisfies Dictionary;

export default dashboardRecurring;
