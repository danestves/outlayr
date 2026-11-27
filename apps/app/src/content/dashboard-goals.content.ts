import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardGoals = {
    content: {
        add: {
            afterThis: t({
                en: "After this",
                de: "Danach",
                es: "Después de esto",
                fr: "Après ceci",
                pt: "Depois disso",
            }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            arrives: t({ en: "Arrives", de: "Kommt an", es: "Llega", fr: "Arrive", pt: "Chega" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "Depuis", pt: "De" }),
            into: t({ en: "Into", de: "In", es: "Hacia", fr: "Vers", pt: "Para" }),
            noRate: t({
                en: "No exchange rate for that day yet.",
                de: "Für diesen Tag gibt es noch keinen Wechselkurs.",
                es: "Aún no hay tasa de cambio para ese día.",
                "es-ES": "Aún No hay tipo de cambio de cambio para ese día.",
                fr: "Pas encore de taux de change pour ce jour.",
                pt: "Ainda não há cotação para esse dia.",
            }),
            noSource: t({
                en: "Add another account to move money from.",
                de: "Füge ein weiteres Konto hinzu, von dem du Geld verschieben kannst.",
                es: "Agrega otra cuenta desde la cual mover dinero.",
                "es-ES": "Añade otra cuenta desde la cual mover dinero.",
                fr: "Ajoutez un autre compte d'où transférer l'argent.",
                pt: "Adicione outra conta de onde mover o dinheiro.",
            }),
            note: t({
                en: "Logged as a transfer, since progress is this account's balance.",
                de: "Wird als Umbuchung erfasst, da der Fortschritt der Kontostand dieses Kontos ist.",
                es: "Se registra como transferencia, porque el progreso es el saldo de esta cuenta.",
                fr: "Enregistré comme virement, car la progression est le solde de ce compte.",
                pt: "Registrado como transferência, porque o progresso é o saldo desta conta.",
                "pt-PT": "Registado como transferência, porque o progresso é o saldo desta conta.",
            }),
            ofTarget: insert(
                t({
                    en: "{{saved}} of {{target}}",
                    de: "{{saved}} von {{target}}",
                    es: "{{saved}} de {{target}}",
                    fr: "{{saved}} sur {{target}}",
                    pt: "{{saved}} de {{target}}",
                })
            ),
            onlyHolds: insert(
                t({
                    en: "{{account}} only holds {{amount}}",
                    de: "{{account}} enthält nur {{amount}}",
                    es: "{{account}} solo tiene {{amount}}",
                    fr: "{{account}} ne contient que {{amount}}",
                    pt: "{{account}} só tem {{amount}}",
                })
            ),
            saved: insert(
                t({
                    en: "Added {{amount}} to {{name}}",
                    de: "{{amount}} zu {{name}} hinzugefügt",
                    es: "Agregaste {{amount}} a {{name}}",
                    "es-ES": "Añadiste {{amount}} a {{name}}",
                    fr: "{{amount}} ajoutés à {{name}}",
                    pt: "{{amount}} adicionados a {{name}}",
                })
            ),
            submit: insert(
                t({
                    en: "Add {{amount}}",
                    de: "{{amount}} hinzufügen",
                    es: "Agregar {{amount}}",
                    "es-ES": "Añadir {{amount}}",
                    fr: "Ajouter {{amount}}",
                    pt: "Adicionar {{amount}}",
                })
            ),
            submitEmpty: t({
                en: "Add money",
                de: "Geld hinzufügen",
                es: "Agregar dinero",
                "es-ES": "Añadir dinero",
                fr: "Ajouter de l'argent",
                pt: "Adicionar dinheiro",
            }),
            title: insert(
                t({
                    en: "Add money to {{name}}",
                    de: "Geld zu {{name}} hinzufügen",
                    es: "Agregar dinero a {{name}}",
                    "es-ES": "Añadir dinero a {{name}}",
                    fr: "Ajouter de l'argent à {{name}}",
                    pt: "Adicionar dinheiro a {{name}}",
                })
            ),
        },
        amountRequired: insert(
            t({
                en: "Enter an amount above {{zero}}.",
                de: "Gib einen Betrag über {{zero}} ein.",
                es: "Escribe un monto mayor que {{zero}}.",
                "es-ES": "Escribe un importe mayor que {{zero}}.",
                fr: "Saisissez un montant supérieur à {{zero}}.",
                pt: "Digite um valor acima de {{zero}}.",
                "pt-PT": "Introduza um valor acima de {{zero}}.",
            })
        ),
        back: t({
            en: "Back to goals",
            de: "Zurück zu den Sparzielen",
            es: "Volver a metas",
            fr: "Retour aux objectifs",
            pt: "Voltar às metas",
        }),
        cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        chart: {
            balance: t({ en: "Balance", de: "Kontostand", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            noRate: t({
                en: "No exchange rate for this account yet, so there is nothing to plot against the target.",
                de: "Für dieses Konto gibt es noch keinen Wechselkurs, deshalb lässt sich nichts gegen das Ziel darstellen.",
                es: "Aún no hay tasa de cambio para esta cuenta, así que no hay nada que trazar frente al objetivo.",
                "es-ES":
                    "Aún no hay tipo de cambio para esta cuenta, así que no hay nada que trazar frente al objetivo.",
                fr: "Pas encore de taux de change pour ce compte : rien à comparer à l'objectif.",
                pt: "Ainda não há cotação para esta conta, então não há nada para comparar com o objetivo.",
                "pt-PT": "Ainda não há cotação para esta conta, por isso não há nada para comparar com o valor-alvo.",
            }),
            pace: t({ en: "Pace", de: "Tempo", es: "Ritmo", fr: "Rythme", pt: "Ritmo" }),
            progress: t({ en: "Progress", de: "Fortschritt", es: "Progreso", fr: "Progression", pt: "Progresso" }),
            projected: insert(
                t({
                    en: "Projected {{month}}",
                    de: "Prognose {{month}}",
                    es: "Proyección {{month}}",
                    fr: "Prévu {{month}}",
                    pt: "Previsto {{month}}",
                })
            ),
            reachedNote: t({
                en: "Reached. There's nothing left to put aside.",
                de: "Erreicht. Es muss nichts mehr zur Seite gelegt werden.",
                es: "Alcanzada. No queda nada por apartar.",
                fr: "Atteint. Plus rien à mettre de côté.",
                pt: "Alcançada. Não falta nada para guardar.",
            }),
            reachedTitle: t({
                en: "Balance against target",
                de: "Kontostand gegenüber Ziel",
                es: "Saldo frente al objetivo",
                fr: "Solde face à l'objectif",
                pt: "Saldo frente ao objetivo",
            }),
            title: t({
                en: "Balance against pace",
                de: "Kontostand gegenüber Tempo",
                es: "Saldo frente al ritmo",
                fr: "Solde face au rythme",
                pt: "Saldo frente ao ritmo",
            }),
        },
        close: t({ en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        columns: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            added: t({
                en: "Added",
                de: "Hinzugefügt",
                es: "Agregado",
                "es-ES": "Añadido",
                fr: "Ajouté",
                pt: "Adicionado",
            }),
            balance: t({ en: "Balance", de: "Kontostand", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            by: t({ en: "By", de: "Bis", es: "Para", fr: "Pour le", pt: "Até" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "Depuis", pt: "De" }),
            goal: t({ en: "Goal", de: "Sparziel", es: "Meta", fr: "Objectif", pt: "Meta" }),
            holds: t({ en: "Holds", de: "Enthält", es: "Tiene", fr: "Contient", pt: "Tem" }),
            monthly: t({ en: "A month", de: "Pro Monat", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            pace: t({ en: "Pace", de: "Tempo", es: "Ritmo", fr: "Rythme", pt: "Ritmo" }),
            progress: t({ en: "Progress", de: "Fortschritt", es: "Progreso", fr: "Progression", pt: "Progresso" }),
            saved: t({ en: "Saved", de: "Gespart", es: "Ahorrado", fr: "Épargné", pt: "Guardado" }),
            status: t({ en: "Status", de: "Status", es: "Estado", fr: "Statut", pt: "Status", "pt-PT": "Estado" }),
            target: t({ en: "Target", de: "Ziel", es: "Objetivo", fr: "Cible", pt: "Objetivo" }),
        },
        contributions: {
            none: insert(
                t({
                    en: "Nothing has come in since {{date}}.",
                    de: "Seit {{date}} ist nichts hinzugekommen.",
                    es: "No ha entrado nada desde el {{date}}.",
                    fr: "Rien n'est entré depuis le {{date}}.",
                    pt: "Nada entrou desde {{date}}.",
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
            title: t({ en: "Contributions", de: "Einzahlungen", es: "Aportes", fr: "Versements", pt: "Aportes" }),
        },
        dateRequired: t({
            en: "Pick a date after today.",
            de: "Wähle ein Datum nach heute.",
            es: "Elige una fecha posterior a hoy.",
            fr: "Choisissez une date après aujourd'hui.",
            pt: "Escolha uma data depois de hoje.",
        }),
        delete: {
            body: insert(
                t({
                    en: "{{account}} and its {{amount}} stay where they are. Only the goal goes.",
                    de: "{{account}} und die {{amount}} darauf bleiben, wo sie sind. Nur das Sparziel verschwindet.",
                    es: "{{account}} y sus {{amount}} se quedan donde están. Solo se va la meta.",
                    fr: "{{account}} et ses {{amount}} restent en place. Seul l'objectif disparaît.",
                    pt: "{{account}} e seus {{amount}} ficam onde estão. Só a meta sai.",
                })
            ),
            confirm: t({
                en: "Delete goal",
                de: "Sparziel löschen",
                es: "Eliminar meta",
                fr: "Supprimer l'objectif",
                pt: "Apagar meta",
                "pt-PT": "Apagar objetivo",
            }),
            failed: t({
                en: "Couldn't delete the goal.",
                de: "Das Sparziel konnte nicht gelöscht werden.",
                es: "No se pudo eliminar la meta.",
                fr: "Impossible de supprimer l'objectif.",
                pt: "Não foi possível apagar a meta.",
            }),
            title: insert(
                t({
                    en: "Delete {{name}}?",
                    de: "{{name}} löschen?",
                    es: "¿Eliminar {{name}}?",
                    fr: "Supprimer {{name}} ?",
                    pt: "Apagar {{name}}?",
                })
            ),
            toast: t({
                en: "Goal deleted",
                de: "Sparziel gelöscht",
                es: "Meta eliminada",
                fr: "Objectif supprimé",
                pt: "Meta apagada",
                "pt-PT": "Objetivo apagado",
            }),
        },
        detail: {
            ahead: t({ en: "Ahead", de: "Voraus", es: "Adelantada", fr: "En avance", pt: "Adiantada" }),
            behind: t({ en: "Behind", de: "Im Rückstand", es: "Atrasada", fr: "En retard", pt: "Atrasada" }),
            byMonth: insert(
                t({
                    en: "by {{month}}",
                    de: "bis {{month}}",
                    es: "para {{month}}",
                    fr: "d'ici {{month}}",
                    pt: "até {{month}}",
                })
            ),
            cantCompare: t({
                en: "Can't compare",
                de: "Nicht vergleichbar",
                es: "No se puede comparar",
                fr: "Comparaison impossible",
                pt: "Sem comparação",
            }),
            monthsLeft: t({
                en: "Months left",
                de: "Verbleibende Monate",
                es: "Meses restantes",
                fr: "Mois restants",
                pt: "Meses restantes",
            }),
            nothingLeft: t({
                en: "nothing left to put aside",
                de: "nichts mehr zur Seite zu legen",
                es: "no queda nada por apartar",
                fr: "plus rien à mettre de côté",
                pt: "nada mais para guardar",
            }),
            noRate: t({
                en: "No rate yet",
                de: "Noch kein Kurs",
                es: "Sin tasa aún",
                "es-ES": "Sin tipo de cambio aún",
                fr: "Pas encore de taux",
                pt: "Sem cotação ainda",
            }),
            notFound: t({
                en: "This goal is gone.",
                de: "Dieses Sparziel gibt es nicht mehr.",
                es: "Esta meta ya no existe.",
                fr: "Cet objectif n'existe plus.",
                pt: "Esta meta não existe mais.",
            }),
            ofTarget: insert(
                t({
                    en: "of {{amount}}",
                    de: "von {{amount}}",
                    es: "de {{amount}}",
                    fr: "sur {{amount}}",
                    pt: "de {{amount}}",
                })
            ),
            onPace: t({ en: "On pace", de: "Im Plan", es: "A buen ritmo", fr: "Dans les temps", pt: "No ritmo" }),
            pace: t({ en: "Pace", de: "Tempo", es: "Ritmo", fr: "Rythme", pt: "Ritmo" }),
            pastTarget: t({
                en: "Past target",
                de: "Über dem Ziel",
                es: "Sobre el objetivo",
                fr: "Au-delà de la cible",
                pt: "Além do objetivo",
            }),
            perMonth: t({ en: "Per month", de: "Pro Monat", es: "Por mes", fr: "Par mois", pt: "Por mês" }),
            status: t({ en: "Status", de: "Status", es: "Estado", fr: "Statut", pt: "Status", "pt-PT": "Estado" }),
            target: t({ en: "Target", de: "Ziel", es: "Objetivo", fr: "Cible", pt: "Objetivo" }),
            toMakeDate: t({
                en: "to make the date",
                de: "um das Datum zu schaffen",
                es: "para llegar a la fecha",
                fr: "pour tenir la date",
                pt: "para chegar na data",
            }),
        },
        dialog: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            accountLocked: t({
                en: "Progress is this account's balance, so it can't be swapped.",
                de: "Der Fortschritt ist der Kontostand dieses Kontos, deshalb lässt es sich nicht tauschen.",
                es: "El progreso es el saldo de esta cuenta, así que no se puede cambiar.",
                fr: "La progression est le solde de ce compte, il ne peut donc pas être changé.",
                pt: "O progresso é o saldo desta conta, então ela não pode ser trocada.",
                "pt-PT": "O progresso é o saldo desta conta, por isso não pode ser trocada.",
            }),
            accountRequired: t({
                en: "Pick an account.",
                de: "Wähle ein Konto.",
                es: "Elige una cuenta.",
                fr: "Choisissez un compte.",
                pt: "Escolha uma conta.",
            }),
            already: insert(
                t({
                    en: "{{account}} already holds it",
                    de: "{{account}} enthält es schon",
                    es: "{{account}} ya lo tiene",
                    fr: "{{account}} le contient déjà",
                    pt: "{{account}} já tem esse valor",
                })
            ),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            by: t({ en: "By", de: "Bis", es: "Para", fr: "Pour le", pt: "Até" }),
            committing: insert(
                t({
                    en: "Committing {{amount}} a month",
                    de: "Du legst {{amount}} im Monat zurück",
                    es: "Comprometiendo {{amount}} al mes",
                    fr: "Engagement de {{amount}} par mois",
                    pt: "Comprometendo {{amount}} por mês",
                    "pt-PT": "A comprometer {{amount}} por mês",
                })
            ),
            createAccount: t({
                en: "Create account",
                de: "Konto erstellen",
                es: "Crear cuenta",
                fr: "Créer un compte",
                pt: "Criar conta",
            }),
            demands: insert(
                t({
                    en: "Demands {{amount}} a month for {{count}} months",
                    de: "Erfordert {{amount}} im Monat für {{count}} Monate",
                    es: "Pide {{amount}} al mes durante {{count}} meses",
                    fr: "Demande {{amount}} par mois pendant {{count}} mois",
                    pt: "Pede {{amount}} por mês durante {{count}} meses",
                })
            ),
            demandsNow: insert(
                t({
                    en: "Demands {{amount}} before the date",
                    de: "Erfordert {{amount}} vor dem Datum",
                    es: "Pide {{amount}} antes de la fecha",
                    fr: "Demande {{amount}} avant la date",
                    pt: "Pede {{amount}} antes da data",
                })
            ),
            demandsOne: insert(
                t({
                    en: "Demands {{amount}} a month for 1 month",
                    de: "Erfordert {{amount}} im Monat für 1 Monat",
                    es: "Pide {{amount}} al mes durante 1 mes",
                    fr: "Demande {{amount}} par mois pendant 1 mois",
                    pt: "Pede {{amount}} por mês durante 1 mês",
                })
            ),
            deleteGoal: t({
                en: "Delete goal",
                de: "Sparziel löschen",
                es: "Eliminar meta",
                fr: "Supprimer l'objectif",
                pt: "Apagar meta",
                "pt-PT": "Apagar objetivo",
            }),
            editTitle: t({
                en: "Edit goal",
                de: "Sparziel bearbeiten",
                es: "Editar meta",
                fr: "Modifier l'objectif",
                pt: "Editar meta",
            }),
            holdsToday: insert(
                t({
                    en: "Holds {{amount}} today",
                    de: "Enthält heute {{amount}}",
                    es: "Tiene {{amount}} hoy",
                    fr: "Contient {{amount}} aujourd'hui",
                    pt: "Tem {{amount}} hoje",
                })
            ),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            newTitle: t({
                en: "New goal",
                de: "Neues Sparziel",
                es: "Nueva meta",
                fr: "Nouvel objectif",
                pt: "Nova meta",
                "pt-PT": "Novo objetivo",
            }),
            noAccounts: t({
                en: "No accounts yet",
                de: "Noch keine Konten",
                es: "Aún no hay cuentas",
                fr: "Pas encore de compte",
                pt: "Ainda sem contas",
            }),
            noAccountsBody: t({
                en: "A goal starts from the account that holds the money.",
                de: "Ein Sparziel beginnt bei dem Konto, auf dem das Geld liegt.",
                es: "Una meta parte de la cuenta que guarda el dinero.",
                fr: "Un objectif part du compte qui contient l'argent.",
                pt: "Uma meta parte da conta que guarda o dinheiro.",
            }),
            ok: t({ en: "OK", de: "OK", es: "OK", fr: "OK", pt: "OK" }),
            saveFailed: t({
                en: "Couldn't save the goal. Try again.",
                de: "Das Sparziel konnte nicht gespeichert werden. Versuch es noch mal.",
                es: "No se pudo guardar la meta. Inténtalo de nuevo.",
                fr: "Impossible d'enregistrer l'objectif. Réessayez.",
                pt: "Não foi possível salvar a meta. Tente de novo.",
                "pt-PT": "Não foi possível guardar a meta. Tente de novo.",
            }),
            saveGoal: t({
                en: "Save goal",
                de: "Sparziel speichern",
                es: "Guardar meta",
                fr: "Enregistrer",
                pt: "Salvar meta",
                "pt-PT": "Guardar objetivo",
            }),
            setGoal: t({
                en: "Set goal",
                de: "Sparziel festlegen",
                es: "Crear meta",
                fr: "Créer l'objectif",
                pt: "Criar meta",
                "pt-PT": "Criar objetivo",
            }),
            summary: insert(
                t({
                    en: "Put {{amount}} in {{account}} by {{month}}",
                    de: "Lege {{amount}} bis {{month}} auf {{account}}",
                    es: "Juntar {{amount}} en {{account}} para {{month}}",
                    fr: "Mettre {{amount}} sur {{account}} d'ici {{month}}",
                    pt: "Juntar {{amount}} em {{account}} até {{month}}",
                })
            ),
            unvaluedBody: insert(
                t({
                    en: "{{account}}'s balance can't be converted yet, and a goal freezes it as its starting point. Try again once its exchange rate is available.",
                    de: "Der Kontostand von {{account}} lässt sich noch nicht umrechnen, und ein Sparziel hält ihn als Startpunkt fest. Versuch es noch mal, sobald sein Wechselkurs verfügbar ist.",
                    es: "El saldo de {{account}} aún no se puede convertir, y una meta lo congela como punto de partida. Inténtalo de nuevo cuando haya tasa de cambio.",
                    "es-ES":
                        "El saldo de {{account}} aún no se puede convertir, y una meta lo congela como punto de partida. Inténtalo de nuevo cuando haya tipo de cambio.",
                    fr: "Le solde de {{account}} ne peut pas encore être converti, et un objectif le fige comme point de départ. Réessayez quand son taux de change sera disponible.",
                    pt: "O saldo de {{account}} ainda não pode ser convertido, e uma meta o congela como ponto de partida. Tente de novo quando houver cotação.",
                })
            ),
            unvaluedTitle: t({
                en: "No goal yet",
                de: "Noch kein Sparziel",
                es: "No se creó la meta",
                fr: "Pas d'objectif",
                pt: "Meta não criada",
            }),
        },
        empty: {
            kept: insert(
                t({
                    en: "You kept {{amount}} in {{month}}. Name what it is for.",
                    de: "Du hast im {{month}} {{amount}} übrig behalten. Gib an, wofür sie gedacht sind.",
                    es: "Guardaste {{amount}} en {{month}}. Ponle nombre a para qué es.",
                    fr: "Vous avez gardé {{amount}} en {{month}}. Dites à quoi il servira.",
                    pt: "Você guardou {{amount}} em {{month}}. Dê um nome para o que ele é.",
                    "pt-PT": "Guardou {{amount}} em {{month}}. Dê um nome para o que ele é.",
                })
            ),
            line: t({
                en: "Name what an account's money is for, and see how far it has to go.",
                de: "Gib an, wofür das Geld eines Kontos gedacht ist, und sieh, wie weit es noch ist.",
                es: "Ponle nombre a para qué es el dinero de una cuenta y mira cuánto le falta.",
                fr: "Dites à quoi sert l'argent d'un compte et voyez ce qu'il reste à faire.",
                pt: "Dê um nome para o que o dinheiro de uma conta é e veja quanto falta.",
            }),
            title: t({
                en: "No goals yet",
                de: "Noch keine Sparziele",
                es: "Aún no hay metas",
                fr: "Pas encore d'objectif",
                pt: "Ainda sem metas",
            }),
        },
        kpi: {
            active: insert(
                t({
                    en: "{{count}} active goals",
                    de: "{{count}} aktive Sparziele",
                    es: "{{count}} metas activas",
                    fr: "{{count}} objectifs en cours",
                    pt: "{{count}} metas ativas",
                })
            ),
            activeNone: t({
                en: "No active goals",
                de: "Keine aktiven Sparziele",
                es: "Sin metas activas",
                fr: "Aucun objectif en cours",
                pt: "Sem metas ativas",
            }),
            activeOne: t({
                en: "1 active goal",
                de: "1 aktives Sparziel",
                es: "1 meta activa",
                fr: "1 objectif en cours",
                pt: "1 meta ativa",
            }),
            monthly: t({ en: "A month", de: "Pro Monat", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            nextUp: t({ en: "Next up", de: "Als Nächstes", es: "La próxima", fr: "Le prochain", pt: "A próxima" }),
            noIncome: t({
                en: "no income last month",
                de: "keine Einnahmen im letzten Monat",
                es: "sin ingresos el mes pasado",
                fr: "aucun revenu le mois dernier",
                pt: "sem renda no mês passado",
            }),
            ofIncome: t({
                en: "of income",
                de: "der Einnahmen",
                es: "de los ingresos",
                fr: "des revenus",
                pt: "da renda",
            }),
            reached: t({ en: "Reached", de: "Erreicht", es: "Alcanzadas", fr: "Atteints", pt: "Alcançadas" }),
            reachedMore: insert(
                t({
                    en: "{{name}} and {{count}} more",
                    de: "{{name}} und {{count}} weitere",
                    es: "{{name}} y {{count}} más",
                    fr: "{{name}} et {{count}} autres",
                    pt: "{{name}} e mais {{count}}",
                })
            ),
            reachedNone: t({
                en: "None yet",
                de: "Noch keine",
                es: "Ninguna aún",
                fr: "Aucun pour l'instant",
                pt: "Nenhuma ainda",
            }),
            toGo: t({ en: "To go", de: "Noch offen", es: "Por juntar", fr: "Reste", pt: "Falta" }),
        },
        menu: {
            addMoney: t({
                en: "Add money",
                de: "Geld hinzufügen",
                es: "Agregar dinero",
                "es-ES": "Añadir dinero",
                fr: "Ajouter de l'argent",
                pt: "Adicionar dinheiro",
            }),
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Apagar" }),
            edit: t({ en: "Edit", de: "Bearbeiten", es: "Editar", fr: "Modifier", pt: "Editar" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    de: "Mehr für {{name}}",
                    es: "Más para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            open: t({ en: "Open", de: "Öffnen", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
        },
        monthly: {
            average: t({ en: "Average", de: "Durchschnitt", es: "Promedio", fr: "Moyenne", pt: "Média" }),
            title: t({
                en: "Added each month",
                de: "Jeden Monat hinzugefügt",
                es: "Agregado cada mes",
                "es-ES": "Añadido cada mes",
                fr: "Ajouté chaque mois",
                pt: "Adicionado por mês",
            }),
        },
        newGoal: t({
            en: "New goal",
            de: "Neues Sparziel",
            es: "Nueva meta",
            fr: "Nouvel objectif",
            pt: "Nova meta",
            "pt-PT": "Novo objetivo",
        }),
        pace: {
            ahead: insert(
                t({
                    en: "{{amount}} ahead",
                    de: "{{amount}} voraus",
                    es: "{{amount}} adelante",
                    fr: "{{amount}} d'avance",
                    pt: "{{amount}} à frente",
                })
            ),
            behind: insert(
                t({
                    en: "{{amount}} behind",
                    de: "{{amount}} im Rückstand",
                    es: "{{amount}} atrás",
                    fr: "{{amount}} de retard",
                    pt: "{{amount}} atrás",
                })
            ),
            noRate: t({
                en: "No rate",
                de: "Kein Kurs",
                es: "Sin tasa",
                "es-ES": "Sin tipo de cambio",
                fr: "Sans taux",
                pt: "Sem cotação",
            }),
            onPace: t({ en: "On pace", de: "Im Plan", es: "A buen ritmo", fr: "Dans les temps", pt: "No ritmo" }),
            reached: t({
                en: "Reached",
                de: "Erreicht",
                es: "Alcanzada",
                fr: "Atteint",
                pt: "Alcançada",
                "pt-PT": "Alcançado",
            }),
        },
        sections: {
            active: t({ en: "Active", de: "Aktiv", es: "Activas", fr: "En cours", pt: "Ativas" }),
            range: insert(
                t({
                    en: "{{from}} to {{to}}",
                    de: "{{from}} bis {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "{{from}} à {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
            reached: t({ en: "Reached", de: "Erreicht", es: "Alcanzadas", fr: "Atteints", pt: "Alcançadas" }),
            road: t({
                en: "Road to each date",
                de: "Weg zu jedem Datum",
                es: "Camino a cada fecha",
                fr: "Chemin vers chaque date",
                pt: "Caminho até cada data",
            }),
        },
        summary: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            by: t({ en: "By", de: "Bis", es: "Para", fr: "Pour le", pt: "Até" }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            target: t({ en: "Target", de: "Ziel", es: "Objetivo", fr: "Cible", pt: "Objetivo" }),
            title: t({ en: "The goal", de: "Das Sparziel", es: "La meta", fr: "L'objectif", pt: "A meta" }),
        },
        title: t({ en: "Goals", de: "Sparziele", es: "Metas", fr: "Objectifs", pt: "Metas", "pt-PT": "Objetivos" }),
        toast: {
            created: t({
                en: "Goal set",
                de: "Sparziel festgelegt",
                es: "Meta creada",
                fr: "Objectif créé",
                pt: "Meta criada",
            }),
            saved: t({
                en: "Goal saved",
                de: "Sparziel gespeichert",
                es: "Meta guardada",
                fr: "Objectif enregistré",
                pt: "Meta salva",
                "pt-PT": "Meta guardada",
            }),
        },
    },
    key: "dashboard-goals",
} satisfies Dictionary;

export default dashboardGoals;
