import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const text = (en: string, de: string, es: string, fr: string, pt: string) => t({ en, de, es, fr, pt });

const dashboardImportMm = {
    content: {
        accounts: {
            asCard: text(
                "A new card or loan",
                "Eine neue Karte oder ein neuer Kredit",
                "Una tarjeta o préstamo nuevo",
                "Une nouvelle carte ou un prêt",
                "Um cartão ou empréstimo novo"
            ),
            asNew: text("A new account", "Ein neues Konto", "Una cuenta nueva", "Un nouveau compte", "Uma conta nova"),
            already: text(
                "Already in Outlayr",
                "Schon in Outlayr",
                "Ya en Outlayr",
                "Déjà dans Outlayr",
                "Já no Outlayr"
            ),
            balance: text("Balance", "Kontostand", "Saldo", "Solde", "Saldo"),
            bring: text("Bring it in as", "Importieren als", "Traer como", "Importer comme", "Trazer como"),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos"),
            goesTo: text("Goes to", "Geht nach", "Va a", "Va vers", "Vai para"),
            groupDeleted: text(
                "Deleted in Money Manager",
                "In Money Manager gelöscht",
                "Eliminadas en Money Manager",
                "Supprimés dans Money Manager",
                "Excluídas no Money Manager"
            ),
            groupHidden: text(
                "Hidden in Money Manager",
                "In Money Manager ausgeblendet",
                "Ocultas en Money Manager",
                "Masqués dans Money Manager",
                "Ocultas no Money Manager"
            ),
            groupOpen: text(
                "Open in Money Manager",
                "In Money Manager offen",
                "Abiertas en Money Manager",
                "Ouverts dans Money Manager",
                "Abertas no Money Manager"
            ),
            inMm: text(
                "In Money Manager",
                "In Money Manager",
                "En Money Manager",
                "Dans Money Manager",
                "No Money Manager"
            ),
            into: text("Into {name}", "In {name}", "En {name}", "Vers {name}", "Em {name}"),
            join: text(
                "Or join another account",
                "Oder mit einem anderen Konto zusammenführen",
                "O unir a otra cuenta",
                "Ou fusionner avec un autre compte",
                "Ou juntar a outra conta"
            ),
            leave: text("Leave it out", "Weglassen", "Dejarla fuera", "Ne pas l'importer", "Deixar de fora"),
            left: text("Left out", "Weggelassen", "Fuera", "Exclu", "Fora"),
            newCard: text(
                "New card or loan",
                "Neue Karte oder neuer Kredit",
                "Tarjeta o préstamo nuevo",
                "Nouvelle carte ou prêt",
                "Cartão ou empréstimo novo"
            ),
            newAccount: text("New", "Neu", "Nueva", "Nouveau", "Nova"),
            noAccount: text("No account", "Kein Konto", "Sin cuenta", "Sans compte", "Sem conta"),
            note: text(
                "Each balance is checked against Money Manager once the import is done.",
                "Jeder Kontostand wird mit Money Manager abgeglichen, sobald der Import fertig ist.",
                "Cada saldo se compara con Money Manager cuando termina la importación.",
                "Chaque solde est comparé à Money Manager une fois l'import terminé.",
                "Cada saldo é conferido com o Money Manager quando a importação termina."
            ),
            orphan: text(
                "Their accounts were deleted",
                "Ihre Konten wurden gelöscht",
                "Sus cuentas fueron eliminadas",
                "Leurs comptes ont été supprimés",
                "As contas deles foram excluídas"
            ),
            title: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas"),
        },
        balances: {
            account: text("Account", "Konto", "Cuenta", "Compte", "Conta"),
            adds: text(
                "Entries add up to",
                "Einträge ergeben",
                "Los movimientos suman",
                "Les opérations totalisent",
                "Os lançamentos somam"
            ),
            match: text("Match", "Stimmt", "Igualar", "Aligner", "Igualar"),
            note: text(
                "Each balance is checked again once the import is done.",
                "Jeder Kontostand wird noch einmal geprüft, sobald der Import fertig ist.",
                "Cada saldo se vuelve a comprobar cuando termina la importación.",
                "Chaque solde est revérifié une fois l'import terminé.",
                "Cada saldo é conferido de novo quando a importação termina."
            ),
            off: text("Off by", "Abweichung", "Diferencia", "Écart", "Diferença"),
            opens: text(
                "{name} opens at {opening}, so today it shows {shown}.",
                "{name} beginnt bei {opening}, deshalb zeigt es heute {shown}.",
                "{name} abre en {opening}, así que hoy muestra {shown}.",
                "{name} s'ouvre à {opening}, donc il affiche {shown} aujourd'hui.",
                "{name} abre em {opening}, então hoje mostra {shown}."
            ),
            opensZero: text(
                "{name} opens at zero, so today it shows {shown}.",
                "{name} beginnt bei null, deshalb zeigt es heute {shown}.",
                "{name} abre en cero, así que hoy muestra {shown}.",
                "{name} s'ouvre à zéro, donc il affiche {shown} aujourd'hui.",
                "{name} abre em zero, então hoje mostra {shown}."
            ),
            shows: text(
                "Money Manager shows",
                "Money Manager zeigt",
                "Money Manager muestra",
                "Money Manager affiche",
                "O Money Manager mostra"
            ),
            summary: text("{n} accounts", "{n} Konten", "{n} cuentas", "{n} comptes", "{n} contas"),
            summaryOff: text("{n} off", "{n} weichen ab", "{n} con diferencia", "{n} avec écart", "{n} com diferença"),
            title: text("Balances", "Kontostände", "Saldos", "Soldes", "Saldos"),
        },
        bar: {
            back: text("Back", "Zurück", "Atrás", "Retour", "Voltar"),
            cancel: text("Cancel", "Abbrechen", "Cancelar", "Annuler", "Cancelar"),
            done: text("Done", "Fertig", "Listo", "Terminé", "Concluir"),
            import: text(
                "Import {n} entries",
                "{n} Einträge importieren",
                "Importar {n} movimientos",
                "Importer {n} opérations",
                "Importar {n} lançamentos"
            ),
            title: text("Money Manager", "Money Manager", "Money Manager", "Money Manager", "Money Manager"),
        },
        budgets: {
            bring: text("Bring", "Importieren", "Traer", "Importer", "Trazer"),
            category: text("Category", "Kategorie", "Categoría", "Catégorie", "Categoria"),
            from: text("From", "Von", "Desde", "Depuis", "De"),
            fromLimits: text(
                "From Money Manager limits",
                "Aus den Limits von Money Manager",
                "De los límites de Money Manager",
                "Des limites de Money Manager",
                "Dos limites do Money Manager"
            ),
            fromName: text("From {name}", "Von {name}", "Desde {name}", "Depuis {name}", "De {name}"),
            hint: text(
                "They start this month, so what you already spent in it counts.",
                "Sie beginnen diesen Monat, deshalb zählt, was du darin schon ausgegeben hast.",
                "Empiezan este mes, así que lo que ya gastaste cuenta.",
                "Ils démarrent ce mois-ci, donc ce que vous avez déjà dépensé compte.",
                "Começam neste mês, então o que você já gastou conta."
            ),
            limit: text("Limit", "Limit", "Límite", "Limite", "Limite"),
            used: text("Spent", "Ausgegeben", "Gastado", "Dépensé", "Gasto"),
            spent: text(
                "Spent in {month}",
                "Ausgegeben im {month}",
                "Gastado en {month}",
                "Dépensé en {month}",
                "Gasto em {month}"
            ),
            title: text(
                "Monthly budgets",
                "Monatliche Budgets",
                "Presupuestos mensuales",
                "Budgets mensuels",
                "Orçamentos mensais"
            ),
            total: text(
                "{n} budgets, {amount} a month",
                "{n} Budgets, {amount} im Monat",
                "{n} presupuestos, {amount} al mes",
                "{n} budgets, {amount} par mois",
                "{n} orçamentos, {amount} por mês"
            ),
        },
        categories: {
            count: text("{n} of {total}", "{n} von {total}", "{n} de {total}", "{n} sur {total}", "{n} de {total}"),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos"),
            expenses: text("Expenses", "Ausgaben", "Gastos", "Dépenses", "Despesas"),
            goesTo: text("Goes to", "Geht nach", "Va a", "Va vers", "Vai para"),
            how: text("How", "Wie", "Cómo", "Comment", "Como"),
            inParent: text("In {parent}", "In {parent}", "En {parent}", "Dans {parent}", "Em {parent}"),
            income: text("Income", "Einnahmen", "Ingresos", "Revenus", "Receitas"),
            inMm: text(
                "In Money Manager",
                "In Money Manager",
                "En Money Manager",
                "Dans Money Manager",
                "No Money Manager"
            ),
            left: text("Left out", "Weggelassen", "Fuera", "Exclue", "Fora"),
            leave: text("Leave it out", "Weglassen", "Dejarla fuera", "Ne pas l'importer", "Deixar de fora"),
            matched: text("Matched", "Zugeordnet", "Emparejada", "Associée", "Associada"),
            mine: text("Mine", "Meine", "Las mías", "Les miennes", "As minhas"),
            newCategory: text(
                "New category",
                "Neue Kategorie",
                "Categoría nueva",
                "Nouvelle catégorie",
                "Categoria nova"
            ),
            newTag: text("New", "Neu", "Nueva", "Nouvelle", "Nova"),
            noEntries: text("No entries", "Keine Einträge", "Sin movimientos", "Aucune opération", "Sem lançamentos"),
            note: text(
                "Each one is matched to one of Outlayr's by meaning and keeps its name, unless several land on the same one.",
                "Jede wird nach Bedeutung einer Kategorie von Outlayr zugeordnet und behält ihren Namen, es sei denn, mehrere landen in derselben.",
                "Cada una se empareja con una de Outlayr por significado y conserva su nombre, salvo que varias caigan en la misma.",
                "Chacune est associée à une catégorie d'Outlayr selon son sens et garde son nom, sauf si plusieurs tombent sur la même.",
                "Cada uma é associada a uma do Outlayr pelo significado e mantém o nome, a menos que várias caiam na mesma."
            ),
            other: text(
                "Or another category",
                "Oder eine andere Kategorie",
                "O en otra categoría",
                "Ou une autre catégorie",
                "Ou em outra categoria"
            ),
            outlayrs: text("Outlayr's", "Von Outlayr", "Las de Outlayr", "Celles d'Outlayr", "As do Outlayr"),
            putIn: text("Put it in", "Ablegen in", "Poner en", "Placer dans", "Colocar em"),
            title: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias"),
            under: text(
                "Under {parent}",
                "Unter {parent}",
                "Dentro de {parent}",
                "Sous {parent}",
                "Dentro de {parent}"
            ),
            use: text(
                "Use categories",
                "Kategorien verwenden",
                "Usar categorías",
                "Utiliser les catégories",
                "Usar categorias"
            ),
        },
        done: {
            accounts: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas"),
            account: text("Account", "Konto", "Cuenta", "Compte", "Conta"),
            adjusted: text(
                "Opening balance adjusted",
                "Anfangssaldo angepasst",
                "Saldo inicial ajustado",
                "Solde d'ouverture ajusté",
                "Saldo inicial ajustado"
            ),
            balancesAll: text(
                "Balances, all {n} match",
                "Kontostände, alle {n} stimmen",
                "Saldos, los {n} coinciden",
                "Soldes, les {n} concordent",
                "Saldos, os {n} batem"
            ),
            balancesSome: text(
                "Balances, {n} of {total} match",
                "Kontostände, {n} von {total} stimmen",
                "Saldos, {n} de {total} coinciden",
                "Soldes, {n} sur {total} concordent",
                "Saldos, {n} de {total} batem"
            ),
            budgets: text("Budgets", "Budgets", "Presupuestos", "Budgets", "Orçamentos"),
            categories: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias"),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos"),
            inOutlayr: text("In Outlayr", "In Outlayr", "En Outlayr", "Dans Outlayr", "No Outlayr"),
            matchesMm: text(
                "Matches Money Manager",
                "Stimmt mit Money Manager überein",
                "Coincide con Money Manager",
                "Concorde avec Money Manager",
                "Bate com o Money Manager"
            ),
            movedIn: text(
                "Moved in, {day}",
                "Übernommen, {day}",
                "Importado el {day}",
                "Importé le {day}",
                "Importado em {day}"
            ),
            noCheck: text(
                "Money Manager kept no balances to check.",
                "Money Manager hat keine Kontostände zum Prüfen gespeichert.",
                "Money Manager no guardó saldos para comprobar.",
                "Money Manager n'a gardé aucun solde à vérifier.",
                "O Money Manager não guardou saldos para conferir."
            ),
            openTransactions: text(
                "Open transactions",
                "Einträge öffnen",
                "Abrir movimientos",
                "Ouvrir les opérations",
                "Abrir lançamentos"
            ),
            shows: text(
                "Money Manager shows",
                "Money Manager zeigt",
                "Money Manager muestra",
                "Money Manager affiche",
                "O Money Manager mostra"
            ),
            undo: text(
                "Undo import",
                "Import rückgängig machen",
                "Deshacer importación",
                "Annuler l'import",
                "Desfazer importação"
            ),
            undoBody: text(
                "{n} entries from {day}. Removes everything this import added. What you logged since stays.",
                "{n} Einträge vom {day}. Entfernt alles, was dieser Import hinzugefügt hat. Was du seitdem erfasst hast, bleibt.",
                "{n} movimientos del {day}. Quita todo lo que agregó esta importación. Lo que registraste después se queda.",
                "{n} opérations du {day}. Supprime tout ce que cet import a ajouté. Ce que vous avez saisi depuis reste.",
                "{n} lançamentos de {day}. Remove tudo o que esta importação adicionou. O que você registrou depois fica."
            ),
            undoConfirm: text(
                "Undo the Money Manager import?",
                "Den Money-Manager-Import rückgängig machen?",
                "¿Deshacer la importación de Money Manager?",
                "Annuler l'import Money Manager ?",
                "Desfazer a importação do Money Manager?"
            ),
            undoFailed: text(
                "Couldn't undo the import. Try again.",
                "Der Import konnte nicht rückgängig gemacht werden. Versuch es noch mal.",
                "No se pudo deshacer la importación. Inténtalo de nuevo.",
                "Impossible d'annuler l'import. Réessayez.",
                "Não foi possível desfazer a importação. Tente de novo."
            ),
            undoTitle: text(
                "Undo Money Manager import",
                "Money-Manager-Import rückgängig machen",
                "Deshacer importación de Money Manager",
                "Annuler l'import Money Manager",
                "Desfazer importação do Money Manager"
            ),
            undone: text(
                "Import undone",
                "Import rückgängig gemacht",
                "Importación deshecha",
                "Import annulé",
                "Importação desfeita"
            ),
        },
        failed: {
            back: text(
                "Back to overview",
                "Zurück zur Übersicht",
                "Volver al resumen",
                "Retour à l'aperçu",
                "Voltar ao resumo"
            ),
            body: text(
                "The write failed, so your ledger is unchanged.",
                "Das Schreiben ist fehlgeschlagen, dein Haushaltsbuch ist unverändert.",
                "La escritura falló, así que tu libro no cambió.",
                "L'écriture a échoué, votre registre n'a donc pas changé.",
                "A gravação falhou, então seu livro não mudou."
            ),
            retry: text("Try again", "Versuch es noch mal", "Intentar de nuevo", "Réessayer", "Tentar de novo"),
            title: text(
                "Nothing was imported",
                "Es wurde nichts importiert",
                "No se importó nada",
                "Rien n'a été importé",
                "Nada foi importado"
            ),
        },
        importing: {
            accounts: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas"),
            balance: text(
                "Balance check",
                "Kontostandprüfung",
                "Comprobación de saldos",
                "Vérification des soldes",
                "Conferência de saldos"
            ),
            body: text(
                "Writing {n} entries. Keep this tab open.",
                "{n} Einträge werden geschrieben. Lass diesen Tab offen.",
                "Escribiendo {n} movimientos. Mantén esta pestaña abierta.",
                "Écriture de {n} opérations. Gardez cet onglet ouvert.",
                "Gravando {n} lançamentos. Mantenha esta aba aberta."
            ),
            budgets: text(
                "Monthly budgets",
                "Monatliche Budgets",
                "Presupuestos mensuales",
                "Budgets mensuels",
                "Orçamentos mensais"
            ),
            categories: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias"),
            entries: text("Entries", "Einträge", "Movimientos", "Opérations", "Lançamentos"),
            heading: text("Importing", "Import läuft", "Importando", "Import en cours", "Importando"),
            steps: text("Steps", "Schritte", "Pasos", "Étapes", "Etapas"),
            title: text("Importing…", "Import läuft…", "Importando…", "Import en cours…", "Importando…"),
            writing: text("Writing", "Schreiben", "Escribiendo", "Écriture", "Gravando"),
        },
        intro: {
            backupTitle: text(
                "Make a backup first",
                "Zuerst ein Backup erstellen",
                "Haz un respaldo primero",
                "Faites d'abord une sauvegarde",
                "Faça um backup primeiro"
            ),
            choose: text(
                "Choose the backup",
                "Backup wählen",
                "Elegir el respaldo",
                "Choisir la sauvegarde",
                "Escolher o backup"
            ),
            comesOver: text("Comes over", "Wird übernommen", "Qué se importa", "Ce qui est importé", "O que vem junto"),
            drop: text(
                "Drop your backup here",
                "Lege dein Backup hier ab",
                "Suelta tu respaldo aquí",
                "Déposez votre sauvegarde ici",
                "Solte seu backup aqui"
            ),
            dropHint: text(
                "The file ends in .mmbackup",
                "Die Datei endet auf .mmbackup",
                "El archivo termina en .mmbackup",
                "Le fichier se termine par .mmbackup",
                "O arquivo termina em .mmbackup"
            ),
            items: [
                text(
                    "Entries and transfers",
                    "Einträge und Umbuchungen",
                    "Movimientos y transferencias",
                    "Opérations et virements",
                    "Lançamentos e transferências"
                ),
                text(
                    "Accounts and balances",
                    "Konten und Kontostände",
                    "Cuentas y saldos",
                    "Comptes et soldes",
                    "Contas e saldos"
                ),
                text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias"),
                text(
                    "Monthly budgets",
                    "Monatliche Budgets",
                    "Presupuestos mensuales",
                    "Budgets mensuels",
                    "Orçamentos mensais"
                ),
                text(
                    "Currencies and rates",
                    "Währungen und Kurse",
                    "Monedas y tasas",
                    "Devises et taux",
                    "Moedas e taxas"
                ),
            ],
            nothingFinal: text(
                "Nothing is final",
                "Nichts ist endgültig",
                "Nada es definitivo",
                "Rien n'est définitif",
                "Nada é definitivo"
            ),
            nothingFinalBody: text(
                "You check everything before it's written, and you can undo the import from History.",
                "Du prüfst alles, bevor es geschrieben wird, und kannst den Import im Verlauf rückgängig machen.",
                "Revisas todo antes de que se escriba, y puedes deshacer la importación desde el Historial.",
                "Vous vérifiez tout avant l'écriture, et vous pouvez annuler l'import depuis l'Historique.",
                "Você confere tudo antes de gravar e pode desfazer a importação pelo Histórico."
            ),
            steps: [
                text(
                    "In Money Manager, open Settings and find Backup.",
                    "Öffne in Money Manager die Einstellungen und such nach Backup.",
                    "En Money Manager, abre Ajustes y busca Respaldo.",
                    "Dans Money Manager, ouvrez Réglages et trouvez Sauvegarde.",
                    "No Money Manager, abra Ajustes e encontre Backup."
                ),
                text(
                    "Create a backup and share it to this computer.",
                    "Erstelle ein Backup und teile es an diesen Computer.",
                    "Crea un respaldo y pásalo a esta computadora.",
                    "Créez une sauvegarde et transférez-la sur cet ordinateur.",
                    "Crie um backup e passe-o para este computador."
                ),
                text(
                    "Drop it below, or choose it.",
                    "Lege es unten ab oder wähle es aus.",
                    "Suéltalo abajo, o elígelo.",
                    "Déposez-la ci-dessous, ou choisissez-la.",
                    "Solte-o abaixo, ou escolha-o."
                ),
            ],
        },
        overview: {
            accounts: text("Accounts", "Konten", "Cuentas", "Comptes", "Contas"),
            accountsDetail: text(
                "{open} open, {hidden} hidden",
                "{open} offen, {hidden} ausgeblendet",
                "{open} abiertas, {hidden} ocultas",
                "{open} ouverts, {hidden} masqués",
                "{open} abertas, {hidden} ocultas"
            ),
            budgets: text(
                "Monthly budgets",
                "Monatliche Budgets",
                "Presupuestos mensuales",
                "Budgets mensuels",
                "Orçamentos mensais"
            ),
            budgetsDetail: text("{n} budgets", "{n} Budgets", "{n} presupuestos", "{n} budgets", "{n} orçamentos"),
            categories: text("Categories", "Kategorien", "Categorías", "Catégories", "Categorias"),
            categoriesDetail: text(
                "{matched} matched, {created} new",
                "{matched} zugeordnet, {created} neu",
                "{matched} emparejadas, {created} nuevas",
                "{matched} associées, {created} nouvelles",
                "{matched} associadas, {created} novas"
            ),
            comingOver: text(
                "Coming over",
                "Wird übernommen",
                "Lo que se importa",
                "Ce qui est importé",
                "O que vem junto"
            ),
            currencies: text("Currencies", "Währungen", "Monedas", "Devises", "Moedas"),
            currenciesDetail: text(
                "{list} at Money Manager's rates",
                "{list} zu den Kursen von Money Manager",
                "{list} a las tasas de Money Manager",
                "{list} aux taux de Money Manager",
                "{list} nas taxas do Money Manager"
            ),
            deletedAccounts: text(
                "Deleted accounts",
                "Gelöschte Konten",
                "Cuentas eliminadas",
                "Comptes supprimés",
                "Contas excluídas"
            ),
            deletedEntries: text(
                "Deleted entries",
                "Gelöschte Einträge",
                "Movimientos eliminados",
                "Opérations supprimées",
                "Lançamentos excluídos"
            ),
            entries: text("{n} entries", "{n} Einträge", "{n} movimientos", "{n} opérations", "{n} lançamentos"),
            leftBehind: text("Left behind", "Zurückgelassen", "Lo que se queda", "Ce qui reste", "O que fica"),
            needs: text("Needs a look", "Braucht einen Blick", "Requiere atención", "À vérifier", "Precisa de atenção"),
            noCategory: text(
                "{n} with no category",
                "{n} ohne Kategorie",
                "{n} sin categoría",
                "{n} sans catégorie",
                "{n} sem categoria"
            ),
            offMany: text(
                "Balances don't add up",
                "Kontostände stimmen nicht",
                "Los saldos no cuadran",
                "Les soldes ne concordent pas",
                "Os saldos não batem"
            ),
            offManyDetail: text(
                "{n} accounts are off",
                "{n} Konten weichen ab",
                "{n} cuentas con diferencia",
                "{n} comptes avec un écart",
                "{n} contas com diferença"
            ),
            offOne: text(
                "{name} doesn't add up",
                "{name} stimmt nicht",
                "{name} no cuadra",
                "{name} ne concorde pas",
                "{name} não bate"
            ),
            offOneDetail: text(
                "Off by {amount}",
                "Abweichung von {amount}",
                "Diferencia de {amount}",
                "Écart de {amount}",
                "Diferença de {amount}"
            ),
            pairs: text(
                "{n} look like transfers",
                "{n} sehen nach Umbuchungen aus",
                "{n} parecen transferencias",
                "{n} ressemblent à des virements",
                "{n} parecem transferências"
            ),
            range: text("{from} to {to}", "{from} nach {to}", "{from} a {to}", "{from} à {to}", "{from} a {to}"),
            reminders: text("Reminders", "Erinnerungen", "Recordatorios", "Rappels", "Lembretes"),
            setUp: text(
                "Set up for you",
                "Für dich eingerichtet",
                "Preparado para ti",
                "Préparé pour vous",
                "Preparado para você"
            ),
            starting: text("Starting from", "Ab", "Empezando desde", "À partir de", "Começando de"),
            startingAll: text(
                "Everything in the backup",
                "Alles im Backup",
                "Todo lo del respaldo",
                "Tout le contenu de la sauvegarde",
                "Tudo do backup"
            ),
            startingCutoff: text(
                "Up to {day}, Outlayr has the rest",
                "Bis {day}, den Rest hat Outlayr",
                "Hasta el {day}, Outlayr tiene el resto",
                "Jusqu'au {day}, Outlayr a le reste",
                "Até {day}, o Outlayr tem o resto"
            ),
            startingSkip: text(
                "Everything, matches skipped",
                "Alles, Übereinstimmungen übersprungen",
                "Todo, sin las coincidencias",
                "Tout, sans les doublons",
                "Tudo, sem as coincidências"
            ),
            undo: text("Undo", "Rückgängig", "Deshacer", "Annuler", "Desfazer"),
            undoBody: text(
                "You can undo it from Import, History.",
                "Du kannst es unter Import, Verlauf rückgängig machen.",
                "Puedes deshacerlo desde Importar, Historial.",
                "Vous pouvez l'annuler depuis Importer, Historique.",
                "Você pode desfazer em Importar, Histórico."
            ),
        },
        reading: {
            file: text("File", "Datei", "Archivo", "Fichier", "Arquivo"),
            local: text(
                "Read on this device",
                "Auf diesem Gerät gelesen",
                "Se lee en este dispositivo",
                "Lu sur cet appareil",
                "Lido neste dispositivo"
            ),
            next: text("Comes next", "Als Nächstes", "Lo que sigue", "La suite", "O que vem a seguir"),
            nextBody: text(
                "You check accounts, categories and balances before anything is written.",
                "Du prüfst Konten, Kategorien und Kontostände, bevor etwas geschrieben wird.",
                "Revisas cuentas, categorías y saldos antes de que se escriba nada.",
                "Vous vérifiez comptes, catégories et soldes avant toute écriture.",
                "Você confere contas, categorias e saldos antes de gravar qualquer coisa."
            ),
            reading: text(
                "Reading the backup…",
                "Backup wird gelesen…",
                "Leyendo el respaldo…",
                "Lecture de la sauvegarde…",
                "Lendo o backup…"
            ),
            title: text(
                "Open the backup",
                "Backup öffnen",
                "Abrir el respaldo",
                "Ouvrir la sauvegarde",
                "Abrir o backup"
            ),
        },
        start: {
            all: text("Bring everything", "Alles übernehmen", "Traer todo", "Tout importer", "Trazer tudo"),
            allHint: text(
                "Those days may count twice.",
                "Diese Tage könnten doppelt zählen.",
                "Esos días podrían contarse dos veces.",
                "Ces jours pourraient compter deux fois.",
                "Esses dias podem contar duas vezes."
            ),
            both: text(
                "Both have entries from {day}",
                "Beide haben Einträge ab dem {day}",
                "Ambos tienen movimientos desde el {day}",
                "Les deux ont des opérations depuis le {day}",
                "Ambos têm lançamentos desde {day}"
            ),
            cutoff: text(
                "Stop Money Manager before {day}",
                "Money Manager vor dem {day} beenden",
                "Parar Money Manager antes del {day}",
                "Arrêter Money Manager avant le {day}",
                "Parar o Money Manager antes de {day}"
            ),
            cutoffHint: text(
                "Your Outlayr entries from then stay as they are.",
                "Deine Outlayr-Einträge ab dann bleiben, wie sie sind.",
                "Tus movimientos de Outlayr desde entonces quedan como están.",
                "Vos opérations Outlayr à partir de là restent telles quelles.",
                "Seus lançamentos do Outlayr a partir daí ficam como estão."
            ),
            entries: text("{n} entries", "{n} Einträge", "{n} movimientos", "{n} opérations", "{n} lançamentos"),
            from: text("From {day}", "Ab dem {day}", "Desde el {day}", "À partir du {day}", "A partir de {day}"),
            inMm: text(
                "In Money Manager",
                "In Money Manager",
                "En Money Manager",
                "Dans Money Manager",
                "No Money Manager"
            ),
            inOutlayr: text("In Outlayr", "In Outlayr", "En Outlayr", "Dans Outlayr", "No Outlayr"),
            question: text(
                "What should happen to those days?",
                "Was soll mit diesen Tagen passieren?",
                "¿Qué pasa con esos días?",
                "Que faire de ces jours ?",
                "O que fazer com esses dias?"
            ),
            same: text(
                "Same in both",
                "In beiden gleich",
                "Iguales en ambos",
                "Identiques dans les deux",
                "Iguais nos dois"
            ),
            skip: text(
                "Bring everything, skip matches",
                "Alles übernehmen, Übereinstimmungen überspringen",
                "Traer todo, omitir coincidencias",
                "Tout importer, ignorer les doublons",
                "Trazer tudo, pular coincidências"
            ),
            skipHint: text(
                "Same day, amount and currency count as a match. Found: {n}.",
                "Gleicher Tag, Betrag und gleiche Währung zählen als Übereinstimmung. Gefunden: {n}.",
                "Mismo día, monto y moneda cuentan como coincidencia. Encontradas: {n}.",
                "Même jour, montant et devise comptent comme un doublon. Trouvés : {n}.",
                "Mesmo dia, valor e moeda contam como coincidência. Encontradas: {n}."
            ),
            title: text("Starting from", "Ab", "Empezando desde", "À partir de", "Começando de"),
            why: text(
                "Why it matters",
                "Warum das wichtig ist",
                "Por qué importa",
                "Pourquoi c'est important",
                "Por que importa"
            ),
            whyBody: text(
                "Importing a day twice doubles what you spent. The default keeps the entries you already logged here.",
                "Wird ein Tag doppelt importiert, verdoppelt sich, was du ausgegeben hast. Die Standardeinstellung behält die Einträge, die du hier schon erfasst hast.",
                "Importar un día dos veces duplica lo que gastaste. Lo predeterminado conserva los movimientos que ya registraste aquí.",
                "Importer un jour deux fois double vos dépenses. Par défaut, on garde les opérations déjà saisies ici.",
                "Importar um dia duas vezes dobra o que você gastou. O padrão mantém os lançamentos que você já registrou aqui."
            ),
        },
        uncategorized: {
            account: text("Account", "Konto", "Cuenta", "Compte", "Conta"),
            amount: text("Amount", "Betrag", "Monto", "Montant", "Valor"),
            date: text("Date", "Datum", "Fecha", "Date", "Data"),
            from: text("From", "Von", "Desde", "De", "De"),
            hide: text("Hide", "Ausblenden", "Ocultar", "Masquer", "Ocultar"),
            leave: text(
                "Leave them without one",
                "Ohne Kategorie lassen",
                "Dejarlos sin categoría",
                "Les laisser sans catégorie",
                "Deixar sem categoria"
            ),
            leaveHint: text(
                "They still count in totals and balances.",
                "Sie zählen trotzdem in Summen und Kontoständen.",
                "Igual cuentan en los totales y saldos.",
                "Ils comptent quand même dans les totaux et les soldes.",
                "Continuam contando nos totais e saldos."
            ),
            makeTransfers: text(
                "Make them transfers",
                "Zu Umbuchungen machen",
                "Convertirlas en transferencias",
                "En faire des virements",
                "Transformar em transferências"
            ),
            more: text("{n} more", "{n} weitere", "{n} más", "{n} de plus", "mais {n}"),
            noNote: text("No note", "Keine Notiz", "Sin nota", "Sans note", "Sem nota"),
            note: text("Note", "Notiz", "Nota", "Note", "Nota"),
            other: text(
                "Put them in Other",
                "In Sonstiges ablegen",
                "Ponerlos en Otros",
                "Les mettre dans Autre",
                "Colocar em Outros"
            ),
            otherHint: text(
                "Expenses go to Other, income to Other income.",
                "Ausgaben kommen in Sonstiges, Einnahmen in Sonstige Einnahmen.",
                "Los gastos van a Otros, los ingresos a Otros ingresos.",
                "Les dépenses vont dans Autre, les revenus dans Autres revenus.",
                "As despesas vão para Outros, as receitas para Outras receitas."
            ),
            pairs: text(
                "{n} pairs look like a transfer",
                "{n} Paare sehen nach einer Umbuchung aus",
                "{n} pares parecen una transferencia",
                "{n} paires ressemblent à un virement",
                "{n} pares parecem uma transferência"
            ),
            pairsHint: text(
                "Same day and amount, out of one account and into another.",
                "Gleicher Tag und Betrag, von einem Konto raus und auf ein anderes rein.",
                "Mismo día y monto, sale de una cuenta y entra en otra.",
                "Même jour et même montant, sortant d'un compte et entrant dans un autre.",
                "Mesmo dia e valor, sai de uma conta e entra em outra."
            ),
            rest: text("The other {n}", "Die anderen {n}", "Los otros {n}", "Les {n} autres", "Os outros {n}"),
            show: text("Show", "Anzeigen", "Mostrar", "Afficher", "Mostrar"),
            subtitle: text(
                "Expenses {expense}, income {income}",
                "Ausgaben {expense}, Einnahmen {income}",
                "Gastos {expense}, ingresos {income}",
                "Dépenses {expense}, revenus {income}",
                "Despesas {expense}, receitas {income}"
            ),
            title: text("No category", "Keine Kategorie", "Sin categoría", "Sans catégorie", "Sem categoria"),
            to: text("To", "Nach", "Hasta", "Vers", "Para"),
            treatAlike: text(
                "Treat them like the rest",
                "Wie den Rest behandeln",
                "Tratarlas como el resto",
                "Les traiter comme le reste",
                "Tratar como o resto"
            ),
        },
        wrong: {
            chooseOther: text(
                "Choose a different file",
                "Andere Datei wählen",
                "Elegir otro archivo",
                "Choisir un autre fichier",
                "Escolher outro arquivo"
            ),
            damaged: text("Damaged", "Beschädigt", "Dañado", "Endommagé", "Danificado"),
            damagedBody: text(
                "Make a new backup and try again.",
                "Erstelle ein neues Backup und versuch es noch mal.",
                "Haz un respaldo nuevo e inténtalo de nuevo.",
                "Faites une nouvelle sauvegarde et réessayez.",
                "Faça um novo backup e tente de novo."
            ),
            damagedTitle: text(
                "This backup can't be read",
                "Dieses Backup kann nicht gelesen werden",
                "Este respaldo no se puede leer",
                "Cette sauvegarde est illisible",
                "Este backup não pode ser lido"
            ),
            file: text("File", "Datei", "Archivo", "Fichier", "Arquivo"),
            newer: text(
                "Newer version",
                "Neuere Version",
                "Versión más nueva",
                "Version plus récente",
                "Versão mais nova"
            ),
            newerBody: text(
                "Reload Outlayr, then try again.",
                "Lade Outlayr neu und versuch es noch mal.",
                "Recarga Outlayr e inténtalo de nuevo.",
                "Rechargez Outlayr, puis réessayez.",
                "Recarregue o Outlayr e tente de novo."
            ),
            newerTitle: text(
                "This backup is from a newer version",
                "Dieses Backup stammt von einer neueren Version",
                "Este respaldo es de una versión más nueva",
                "Cette sauvegarde vient d'une version plus récente",
                "Este backup é de uma versão mais nova"
            ),
            notBackupBody: text(
                "Outlayr reads the .mmbackup file that Money Manager by Orange Dog creates.",
                "Outlayr liest die .mmbackup-Datei, die Money Manager von Orange Dog erstellt.",
                "Outlayr lee el archivo .mmbackup que crea Money Manager de Orange Dog.",
                "Outlayr lit le fichier .mmbackup que crée Money Manager d'Orange Dog.",
                "O Outlayr lê o arquivo .mmbackup criado pelo Money Manager da Orange Dog."
            ),
            notBackupTitle: text(
                "This isn't a Money Manager backup",
                "Das ist kein Money-Manager-Backup",
                "Esto no es un respaldo de Money Manager",
                "Ce n'est pas une sauvegarde Money Manager",
                "Este não é um backup do Money Manager"
            ),
            notRead: text(
                "Not read, {size}",
                "Nicht gelesen, {size}",
                "Sin leer, {size}",
                "Non lu, {size}",
                "Não lido, {size}"
            ),
            reasons: text("Other reasons", "Andere Gründe", "Otros motivos", "Autres raisons", "Outros motivos"),
            realbyteBody: text(
                "It comes from Realbyte's Money Manager. Outlayr reads backups from Money Manager by Orange Dog.",
                "Sie stammt aus Money Manager von Realbyte. Outlayr liest Backups von Money Manager von Orange Dog.",
                "Viene de Money Manager de Realbyte. Outlayr lee respaldos de Money Manager de Orange Dog.",
                "Elle vient de Money Manager de Realbyte. Outlayr lit les sauvegardes de Money Manager d'Orange Dog.",
                "Ele vem do Money Manager da Realbyte. O Outlayr lê backups do Money Manager da Orange Dog."
            ),
            realbyteTitle: text(
                "This backup is from a different Money Manager",
                "Dieses Backup stammt aus einem anderen Money Manager",
                "Este respaldo es de otro Money Manager",
                "Cette sauvegarde vient d'un autre Money Manager",
                "Este backup é de outro Money Manager"
            ),
            title: text(
                "Can't read this file",
                "Diese Datei kann nicht gelesen werden",
                "No se puede leer este archivo",
                "Impossible de lire ce fichier",
                "Não foi possível ler este arquivo"
            ),
        },
    },
    key: "dashboard-import-mm",
} satisfies Dictionary;

export default dashboardImportMm;
