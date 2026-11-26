import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardDebts = {
    content: {
        actions: {
            borrow: t({
                en: "Borrow",
                de: "Leihen",
                es: "Pedir prestado",
                fr: "Emprunter",
                pt: "Pegar emprestado",
                "pt-PT": "Pedir emprestado",
            }),
            borrowMore: t({
                en: "Borrow more",
                de: "Mehr leihen",
                es: "Pedir más",
                fr: "Emprunter plus",
                pt: "Pegar mais",
                "pt-PT": "Pedir mais",
            }),
            changePlan: t({
                en: "Change plan",
                de: "Plan ändern",
                es: "Cambiar plan",
                fr: "Modifier le plan",
                pt: "Mudar plano",
            }),
            delete: t({
                en: "Delete",
                de: "Löschen",
                es: "Eliminar",
                fr: "Supprimer",
                pt: "Excluir",
                "pt-PT": "Eliminar",
            }),
            gotPaidBack: t({
                en: "Got paid back",
                de: "Zurückbekommen",
                es: "Me pagaron",
                fr: "On m'a remboursé",
                pt: "Me pagaram",
            }),
            lend: t({ en: "Lend", de: "Verleihen", es: "Prestar", fr: "Prêter", pt: "Emprestar" }),
            lendMore: t({
                en: "Lend more",
                de: "Mehr verleihen",
                es: "Prestar más",
                fr: "Prêter plus",
                pt: "Emprestar mais",
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
            payBack: t({ en: "Pay back", de: "Zurückzahlen", es: "Pagar", fr: "Rembourser", pt: "Pagar" }),
            removePlan: t({
                en: "Remove plan",
                de: "Plan entfernen",
                es: "Quitar plan",
                fr: "Retirer le plan",
                pt: "Remover plano",
            }),
            rename: t({ en: "Rename", de: "Umbenennen", es: "Renombrar", fr: "Renommer", pt: "Renomear" }),
            setPlan: t({
                en: "Set plan",
                de: "Plan festlegen",
                es: "Crear plan",
                fr: "Fixer un plan",
                pt: "Criar plano",
            }),
        },
        back: t({
            en: "Back to Debts",
            de: "Zurück zu Schulden",
            es: "Volver a Deudas",
            fr: "Retour aux dettes",
            pt: "Voltar para Dívidas",
        }),
        cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        columns: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            balance: t({ en: "Balance", de: "Saldo", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            last: t({
                en: "Last movement",
                de: "Letzte Bewegung",
                es: "Último movimiento",
                fr: "Dernier mouvement",
                pt: "Último movimento",
            }),
            movement: t({ en: "Movement", de: "Bewegung", es: "Movimiento", fr: "Mouvement", pt: "Movimento" }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            note: t({ en: "Note", de: "Notiz", es: "Nota", fr: "Note", pt: "Nota" }),
            plan: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
        },
        delete: {
            body: insert(
                t({
                    en: "Everything recorded with them is deleted too: {{count}} movements and a {{amount}} balance.",
                    de: "Alles, was mit dieser Person erfasst wurde, wird ebenfalls gelöscht: {{count}} Bewegungen und ein Saldo von {{amount}}.",
                    es: "También se elimina todo lo registrado con esta persona: {{count}} movimientos y un saldo de {{amount}}.",
                    fr: "Tout ce qui est enregistré avec elle est aussi supprimé : {{count}} mouvements et un solde de {{amount}}.",
                    pt: "Tudo o que foi registrado com essa pessoa também é excluído: {{count}} movimentos e um saldo de {{amount}}.",
                    "pt-PT":
                        "Tudo o que foi registado com essa pessoa também é eliminado: {{count}} movimentos e um saldo de {{amount}}.",
                })
            ),
            bodyOne: insert(
                t({
                    en: "Everything recorded with them is deleted too: 1 movement and a {{amount}} balance.",
                    de: "Alles, was mit dieser Person erfasst wurde, wird ebenfalls gelöscht: 1 Bewegung und ein Saldo von {{amount}}.",
                    es: "También se elimina todo lo registrado con esta persona: 1 movimiento y un saldo de {{amount}}.",
                    fr: "Tout ce qui est enregistré avec elle est aussi supprimé : 1 mouvement et un solde de {{amount}}.",
                    pt: "Tudo o que foi registrado com essa pessoa também é excluído: 1 movimento e um saldo de {{amount}}.",
                    "pt-PT":
                        "Tudo o que foi registado com essa pessoa também é eliminado: 1 movimento e um saldo de {{amount}}.",
                })
            ),
            confirm: t({
                en: "Delete",
                de: "Löschen",
                es: "Eliminar",
                fr: "Supprimer",
                pt: "Excluir",
                "pt-PT": "Eliminar",
            }),
            failed: t({
                en: "Couldn't delete. Try again.",
                de: "Löschen hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo eliminar. Intenta de nuevo.",
                fr: "Suppression impossible. Réessayez.",
                pt: "Não foi possível excluir. Tente de novo.",
                "pt-PT": "Não foi possível eliminar. Tente de novo.",
            }),
            title: insert(
                t({
                    en: "Delete {{name}}",
                    de: "{{name}} löschen",
                    es: "Eliminar a {{name}}",
                    fr: "Supprimer {{name}}",
                    pt: "Excluir {{name}}",
                    "pt-PT": "Eliminar {{name}}",
                })
            ),
            toast: insert(
                t({
                    en: "{{name}} deleted",
                    de: "{{name}} gelöscht",
                    es: "{{name}} eliminado",
                    fr: "{{name}} supprimé",
                    pt: "{{name}} excluído",
                    "pt-PT": "{{name}} eliminado",
                })
            ),
        },
        detail: {
            balance: t({ en: "Balance", de: "Saldo", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            borrowed: t({
                en: "Borrowed",
                de: "Geliehen",
                es: "Prestado a ti",
                fr: "Emprunté",
                pt: "Emprestado a você",
                "pt-PT": "Emprestado a",
            }),
            borrowedTotal: insert(
                t({
                    en: "{{amount}} borrowed",
                    de: "{{amount}} geliehen",
                    es: "{{amount}} prestado a ti",
                    fr: "{{amount}} emprunté",
                    pt: "{{amount}} emprestado a você",
                    "pt-PT": "{{amount}} emprestado a",
                })
            ),
            lent: t({ en: "Lent", de: "Verliehen", es: "Prestado", fr: "Prêté", pt: "Emprestado" }),
            lentTotal: insert(
                t({
                    en: "{{amount}} lent",
                    de: "{{amount}} verliehen",
                    es: "{{amount}} prestado",
                    fr: "{{amount}} prêté",
                    pt: "{{amount}} emprestado",
                })
            ),
            movements: t({ en: "Movements", de: "Bewegungen", es: "Movimientos", fr: "Mouvements", pt: "Movimentos" }),
            noMovements: t({
                en: "Nothing moved yet.",
                de: "Noch hat sich nichts bewegt.",
                es: "Todavía no hay movimientos.",
                fr: "Aucun mouvement pour l'instant.",
                pt: "Ainda não há movimentos.",
            }),
            notFound: t({
                en: "This debt is gone.",
                de: "Diese Schuld gibt es nicht mehr.",
                es: "Esta deuda ya no existe.",
                fr: "Cette dette n'existe plus.",
                pt: "Esta dívida não existe mais.",
            }),
            once: t({ en: "1 time", de: "1-mal", es: "1 vez", fr: "1 fois", pt: "1 vez" }),
            onTrack: t({
                en: "On track",
                de: "Im Plan",
                es: "Al día",
                fr: "Dans les temps",
                pt: "Em dia",
                "pt-PT": "Atualizado",
            }),
            outside: t({
                en: "Outside Outlayr",
                de: "Außerhalb von Outlayr",
                es: "Fuera de Outlayr",
                fr: "Hors d'Outlayr",
                pt: "Fora do Outlayr",
            }),
            paidBack: t({ en: "Paid back", de: "Zurückgezahlt", es: "Pagado", fr: "Remboursé", pt: "Pago" }),
            paidBackTotal: insert(
                t({
                    en: "{{amount}} paid back",
                    de: "{{amount}} zurückgezahlt",
                    es: "{{amount}} pagado",
                    fr: "{{amount}} remboursé",
                    pt: "{{amount}} pago",
                })
            ),
            plan: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            settled: t({ en: "Settled", de: "Beglichen", es: "Saldada", fr: "Soldée", pt: "Quitada" }),
            since: insert(
                t({
                    en: "Since {{date}}",
                    de: "Seit {{date}}",
                    es: "Desde el {{date}}",
                    fr: "Depuis le {{date}}",
                    pt: "Desde {{date}}",
                })
            ),
            theyPay: insert(
                t({
                    en: "{{name}} pays you back by {{date}}",
                    de: "{{name}} zahlt dir bis {{date}} zurück",
                    es: "{{name}} te paga antes del {{date}}",
                    fr: "{{name}} vous rembourse d'ici le {{date}}",
                    pt: "{{name}} te paga até {{date}}",
                    "pt-PT": "{{name}} paga-te até {{date}}",
                })
            ),
            times: insert(
                t({
                    en: "{{count}} times",
                    de: "{{count}}-mal",
                    es: "{{count}} veces",
                    fr: "{{count}} fois",
                    pt: "{{count}} vezes",
                })
            ),
            youPay: insert(
                t({
                    en: "You pay {{name}} back by {{date}}",
                    de: "Du zahlst {{name}} bis {{date}} zurück",
                    es: "Le pagas a {{name}} antes del {{date}}",
                    fr: "Vous remboursez {{name}} d'ici le {{date}}",
                    pt: "Você paga {{name}} até {{date}}",
                    "pt-PT": "Paga {{name}} até {{date}}",
                })
            ),
        },
        due: {
            summary: insert(
                t({
                    en: "{{count}} payments · next {{name}} {{date}}",
                    de: "{{count}} Zahlungen · als Nächstes {{name}} {{date}}",
                    es: "{{count}} pagos · el próximo, {{name}} el {{date}}",
                    fr: "{{count}} paiements · prochain : {{name}} le {{date}}",
                    pt: "{{count}} pagamentos · o próximo, {{name}} em {{date}}",
                })
            ),
            summaryOne: insert(
                t({
                    en: "1 payment · {{name}} {{date}}",
                    de: "1 Zahlung · {{name}} {{date}}",
                    es: "1 pago · {{name}} el {{date}}",
                    fr: "1 paiement · {{name}} le {{date}}",
                    pt: "1 pagamento · {{name}} em {{date}}",
                })
            ),
            overdue: insert(
                t({
                    en: "{{count}} payments · {{name}} overdue since {{date}}",
                    de: "{{count}} Zahlungen · {{name}} überfällig seit {{date}}",
                    es: "{{count}} pagos · {{name}} vencido desde el {{date}}",
                    fr: "{{count}} paiements · {{name}} en retard depuis le {{date}}",
                    pt: "{{count}} pagamentos · {{name}} atrasado desde {{date}}",
                })
            ),
            overdueOne: insert(
                t({
                    en: "1 payment · {{name}} overdue since {{date}}",
                    de: "1 Zahlung · {{name}} überfällig seit {{date}}",
                    es: "1 pago · {{name}} vencido desde el {{date}}",
                    fr: "1 paiement · {{name}} en retard depuis le {{date}}",
                    pt: "1 pagamento · {{name}} atrasado desde {{date}}",
                })
            ),
            open: t({
                en: "Open installments",
                de: "Raten öffnen",
                es: "Abrir cuotas",
                "es-ES": "Abrir plazos",
                fr: "Ouvrir les paiements échelonnés",
                pt: "Abrir parcelas",
                "pt-PT": "Abrir prestações",
            }),
            title: insert(
                t({
                    en: "Due in the next {{days}} days",
                    de: "Fällig in den nächsten {{days}} Tagen",
                    es: "Por pagar en los próximos {{days}} días",
                    fr: "À payer dans les {{days}} prochains jours",
                    pt: "A pagar nos próximos {{days}} dias",
                })
            ),
        },
        empty: {
            line: t({
                en: "And you owe nobody. What moves between you and someone else gathers here.",
                de: "Und du schuldest niemandem etwas. Was zwischen dir und anderen hin- und hergeht, sammelt sich hier.",
                es: "Y tú no le debes a nadie. Lo que se mueva entre tú y otra persona se reúne aquí.",
                fr: "Et vous ne devez rien à personne. Ce qui circule entre vous et quelqu'un d'autre se retrouve ici.",
                pt: "E você não deve a ninguém. O que circular entre você e outra pessoa aparece aqui.",
                "pt-PT": "E não deve a ninguém. O que circular entre e outra pessoa aparece aqui.",
            }),
            title: t({
                en: "Nobody owes you",
                de: "Niemand schuldet dir etwas",
                es: "Nadie te debe",
                fr: "Personne ne vous doit rien",
                pt: "Ninguém te deve",
                "pt-PT": "Ninguém lhe deve",
            }),
        },
        form: {
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            amountRequired: t({
                en: "Enter an amount above zero.",
                de: "Gib einen Betrag über null ein.",
                es: "Ingresa un monto mayor que cero.",
                "es-ES": "Ingresa un importe mayor que cero.",
                fr: "Saisissez un montant supérieur à zéro.",
                pt: "Digite um valor maior que zero.",
                "pt-PT": "Introduza um valor maior que zero.",
            }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            categoryPlaceholder: t({
                en: "Choose a category",
                de: "Kategorie wählen",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            currency: t({ en: "Currency", de: "Währung", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "Depuis", pt: "De" }),
            getBackBy: t({
                en: "Paid back by",
                de: "Zurück bis",
                es: "Que me pague antes del",
                fr: "Remboursé d'ici le",
                pt: "Que me pague até",
            }),
            inCurrency: insert(
                t({
                    en: "In {{currency}}",
                    de: "In {{currency}}",
                    es: "En {{currency}}",
                    fr: "En {{currency}}",
                    pt: "Em {{currency}}",
                })
            ),
            inCurrencyRequired: insert(
                t({
                    en: "Enter what it is in {{currency}}.",
                    de: "Gib ein, was es in {{currency}} ist.",
                    es: "Ingresa cuánto es en {{currency}}.",
                    fr: "Saisissez le montant en {{currency}}.",
                    pt: "Digite quanto é em {{currency}}.",
                    "pt-PT": "Introduza quanto é em {{currency}}.",
                })
            ),
            into: t({ en: "Into", de: "In", es: "Hacia", fr: "Vers", pt: "Para" }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            namePlaceholder: t({
                en: "A person, a loan, Cashea",
                de: "Eine Person, ein Kredit, Klarna",
                es: "Una persona, un préstamo, Cashea",
                fr: "Une personne, un prêt, Cashea",
                pt: "Uma pessoa, um empréstimo, Cashea",
            }),
            nameRequired: t({
                en: "Choose a person or add a name.",
                de: "Wähle eine Person oder gib einen Namen ein.",
                es: "Elige una persona o agrega un nombre.",
                "es-ES": "Elige una persona o añade un nombre.",
                fr: "Choisissez une personne ou ajoutez un nom.",
                pt: "Escolha uma pessoa ou adicione um nome.",
            }),
            newPerson: insert(
                t({
                    en: "Add “{{name}}”",
                    de: "„{{name}}“ hinzufügen",
                    es: "Agregar “{{name}}”",
                    "es-ES": "Añadir “{{name}}”",
                    fr: "Ajouter « {{name}} »",
                    pt: "Adicionar “{{name}}”",
                })
            ),
            none: t({ en: "None", de: "Keine", es: "Ninguna", fr: "Aucun", pt: "Nenhuma" }),
            note: t({ en: "Note", de: "Notiz", es: "Nota", fr: "Note", pt: "Nota" }),
            noRate: t({
                en: "No exchange rate for that day yet.",
                de: "Für diesen Tag gibt es noch keinen Wechselkurs.",
                es: "Aún no hay tasa de cambio para ese día.",
                "es-ES": "Aún No hay tipo de cambio de cambio para ese día.",
                fr: "Pas encore de taux de change pour ce jour.",
                pt: "Ainda não há cotação para esse dia.",
            }),
            optional: t({ en: "Optional", de: "Optional", es: "Opcional", fr: "Facultatif", pt: "Opcional" }),
            payBackBy: t({
                en: "Pay back by",
                de: "Zurückzahlen bis",
                es: "Pagar antes del",
                fr: "Rembourser d'ici le",
                pt: "Pagar até",
            }),
            people: t({ en: "People", de: "Personen", es: "Personas", fr: "Personnes", pt: "Pessoas" }),
            save: t({
                en: "Save",
                de: "Speichern",
                es: "Guardar",
                fr: "Enregistrer",
                pt: "Salvar",
                "pt-PT": "Guardar",
            }),
            saveFailed: t({
                en: "Couldn't save. Try again.",
                de: "Speichern hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo guardar. Intenta de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
                "pt-PT": "Não foi possível guardar. Tente de novo.",
            }),
        },
        groups: {
            settled: insert(
                t({
                    en: "Settled · {{count}}",
                    de: "Beglichen · {{count}}",
                    es: "Saldadas · {{count}}",
                    fr: "Soldées · {{count}}",
                    pt: "Quitadas · {{count}}",
                })
            ),
        },
        kinds: {
            borrowed: t({
                en: "Borrowed",
                de: "Geliehen",
                es: "Me prestaron",
                fr: "Emprunté",
                pt: "Peguei emprestado",
                "pt-PT": "Pedi emprestado",
            }),
            boughtOnCredit: t({
                en: "Bought on credit",
                de: "Auf Kredit gekauft",
                es: "Compra a crédito",
                fr: "Acheté à crédit",
                pt: "Compra a prazo",
            }),
            gotPaidBack: t({
                en: "Got paid back",
                de: "Zurückbekommen",
                es: "Me pagaron",
                fr: "Remboursé",
                pt: "Me pagaram",
            }),
            lent: t({ en: "Lent", de: "Verliehen", es: "Presté", fr: "Prêté", pt: "Emprestei" }),
            paidBack: t({ en: "Paid back", de: "Zurückgezahlt", es: "Pagué", fr: "Remboursé", pt: "Paguei" }),
            soldOnCredit: t({
                en: "Sold on credit",
                de: "Auf Kredit verkauft",
                es: "Venta a crédito",
                fr: "Vendu à crédit",
                pt: "Venda a prazo",
            }),
        },
        kpi: {
            allClear: t({
                en: "All clear",
                de: "Alles in Ordnung",
                es: "Todo saldado",
                fr: "Tout est réglé",
                pt: "Tudo quitado",
            }),
            behind: insert(
                t({
                    en: "{{amount}} behind",
                    de: "{{amount}} im Rückstand",
                    es: "{{amount}} atrasado",
                    fr: "{{amount}} de retard",
                    pt: "{{amount}} atrasado",
                })
            ),
            cards: t({
                en: "Cards and loans",
                de: "Karten und Kredite",
                es: "Tarjetas y préstamos",
                fr: "Cartes et prêts",
                pt: "Cartões e empréstimos",
            }),
            cardsMore: insert(
                t({
                    en: "{{name}} +{{count}}",
                    de: "{{name}} +{{count}}",
                    es: "{{name}} +{{count}}",
                    fr: "{{name}} +{{count}}",
                    pt: "{{name}} +{{count}}",
                })
            ),
            net: t({
                en: "Net with people",
                de: "Netto mit Personen",
                es: "Neto con personas",
                fr: "Solde avec les gens",
                pt: "Saldo com pessoas",
            }),
            none: t({ en: "None", de: "Keine", es: "Ninguna", fr: "Aucune", pt: "Nenhum" }),
            onTrack: t({
                en: "On track",
                de: "Im Plan",
                es: "Al día",
                fr: "Dans les temps",
                pt: "Em dia",
                "pt-PT": "Atualizado",
            }),
            owesYou: t({
                en: "Owes you",
                de: "Schuldet dir",
                es: "Te deben",
                fr: "On vous doit",
                pt: "Te devem",
                "pt-PT": "Devem-te",
            }),
            people: insert(
                t({
                    en: "{{count}} people",
                    de: "{{count}} Personen",
                    es: "{{count}} personas",
                    fr: "{{count}} personnes",
                    pt: "{{count}} pessoas",
                })
            ),
            person: t({ en: "1 person", de: "1 Person", es: "1 persona", fr: "1 personne", pt: "1 pessoa" }),
            youOwe: t({
                en: "You owe",
                de: "Du schuldest",
                es: "Debes",
                fr: "Vous devez",
                pt: "Você deve",
                "pt-PT": "Deve",
            }),
        },
        newDebt: t({ en: "New debt", de: "Neue Schuld", es: "Nueva deuda", fr: "Nouvelle dette", pt: "Nova dívida" }),
        newForm: {
            boughtNeedsCategory: t({
                en: "Bought on credit needs a category.",
                de: "Für „Auf Kredit gekauft“ brauchst du eine Kategorie.",
                es: "La compra a crédito necesita una categoría.",
                fr: "Un achat à crédit a besoin d'une catégorie.",
                pt: "A compra a prazo precisa de uma categoria.",
            }),
            saved: insert(
                t({
                    en: "Saved with {{name}}",
                    de: "Mit {{name}} gespeichert",
                    es: "Guardado con {{name}}",
                    fr: "Enregistré avec {{name}}",
                    pt: "Salvo com {{name}}",
                    "pt-PT": "Guardado com {{name}}",
                })
            ),
            soldNeedsCategory: t({
                en: "Sold on credit needs a category.",
                de: "Für „Auf Kredit verkauft“ brauchst du eine Kategorie.",
                es: "La venta a crédito necesita una categoría.",
                fr: "Une vente à crédit a besoin d'une catégorie.",
                pt: "A venda a prazo precisa de uma categoria.",
            }),
            title: t({ en: "New Debt", de: "Neue Schuld", es: "Nueva deuda", fr: "Nouvelle dette", pt: "Nova dívida" }),
            verbs: {
                bought: t({
                    en: "Bought on credit",
                    de: "Auf Kredit gekauft",
                    es: "Compré a crédito",
                    fr: "Acheté à crédit",
                    pt: "Comprei a prazo",
                }),
                borrowed: t({
                    en: "I borrowed",
                    de: "Ich habe geliehen",
                    es: "Me prestaron",
                    fr: "J'ai emprunté",
                    pt: "Peguei emprestado",
                    "pt-PT": "Pedi emprestado",
                }),
                lent: t({ en: "I lent", de: "Ich habe verliehen", es: "Presté", fr: "J'ai prêté", pt: "Emprestei" }),
                sold: t({
                    en: "Sold on credit",
                    de: "Auf Kredit verkauft",
                    es: "Vendí a crédito",
                    fr: "Vendu à crédit",
                    pt: "Vendi a prazo",
                }),
            },
        },
        owe: {
            categoryRequired: t({
                en: "Choose a category.",
                de: "Wähle eine Kategorie.",
                es: "Elige una categoría.",
                fr: "Choisissez une catégorie.",
                pt: "Escolha uma categoria.",
            }),
            choose: t({ en: "Choose", de: "Wählen", es: "Elegir", fr: "Choisir", pt: "Escolher" }),
            endOfMonth: t({
                en: "End of month",
                de: "Monatsende",
                es: "Fin de mes",
                fr: "Fin du mois",
                pt: "Fim do mês",
            }),
            illPay: t({ en: "I'll pay", de: "Ich zahle", es: "Voy a pagar", fr: "Je paierai", pt: "Vou pagar" }),
            noDate: t({ en: "No date", de: "Kein Datum", es: "Sin fecha", fr: "Sans date", pt: "Sem data" }),
            saved: insert(
                t({
                    en: "You owe {{name}} {{amount}}",
                    de: "Du schuldest {{name}} {{amount}}",
                    es: "Le debes {{amount}} a {{name}}",
                    fr: "Vous devez {{amount}} à {{name}}",
                    pt: "Você deve {{amount}} a {{name}}",
                    "pt-PT": "Deve {{amount}} a {{name}}",
                })
            ),
            title: t({
                en: "Something I Owe",
                de: "Etwas, das ich schulde",
                es: "Algo que debo",
                fr: "Quelque chose que je dois",
                pt: "Algo que devo",
            }),
            tomorrow: t({ en: "Tomorrow", de: "Morgen", es: "Mañana", fr: "Demain", pt: "Amanhã" }),
            whatFor: t({ en: "What for", de: "Wofür", es: "Por qué", fr: "Pour quoi", pt: "Pelo quê" }),
            whatForPlaceholder: t({
                en: "Plumbing, a repair",
                de: "Klempner, eine Reparatur",
                es: "Plomería, una reparación",
                "es-ES": "Fontanería, una reparación",
                fr: "Plomberie, une réparation",
                pt: "Encanamento, um conserto",
                "pt-PT": "Canalização, uma reparação",
            }),
            who: t({ en: "Who", de: "Wem", es: "A quién", fr: "À qui", pt: "A quem" }),
            whoPlaceholder: t({
                en: "A person or company",
                de: "Eine Person oder Firma",
                es: "Una persona o empresa",
                fr: "Une personne ou une entreprise",
                pt: "Uma pessoa ou empresa",
            }),
            whoRequired: t({
                en: "Say who you owe.",
                de: "Sag, wem du etwas schuldest.",
                es: "Indica a quién le debes.",
                fr: "Indiquez à qui vous devez.",
                pt: "Diga a quem você deve.",
                "pt-PT": "Diga a quem deve.",
            }),
        },
        pay: {
            afterThis: t({
                en: "After this",
                de: "Danach",
                es: "Después de esto",
                fr: "Après ceci",
                pt: "Depois disso",
            }),
            all: insert(
                t({
                    en: "{{amount}} all",
                    de: "{{amount}} insgesamt",
                    es: "{{amount}} todo",
                    fr: "{{amount}} tout",
                    pt: "{{amount}} tudo",
                })
            ),
            gotTitle: insert(
                t({
                    en: "{{name}} paid you back",
                    de: "{{name}} hat dir zurückgezahlt",
                    es: "{{name}} te pagó",
                    fr: "{{name}} vous a remboursé",
                    pt: "{{name}} te pagou",
                    "pt-PT": "{{name}} pagou-te",
                })
            ),
            owesYouNow: t({
                en: "Owes you now",
                de: "Schuldet dir jetzt",
                es: "Te debe ahora",
                fr: "Vous doit maintenant",
                pt: "Te deve agora",
                "pt-PT": "Deve-te agora",
            }),
            payTitle: insert(
                t({
                    en: "Pay back {{name}}",
                    de: "{{name}} zurückzahlen",
                    es: "Pagarle a {{name}}",
                    fr: "Rembourser {{name}}",
                    pt: "Pagar {{name}}",
                })
            ),
            plan: insert(
                t({
                    en: "{{amount}} plan",
                    de: "{{amount}} Plan",
                    es: "{{amount}} plan",
                    fr: "{{amount}} plan",
                    pt: "{{amount}} plano",
                })
            ),
            record: insert(
                t({
                    en: "Record {{amount}}",
                    de: "{{amount}} erfassen",
                    es: "Registrar {{amount}}",
                    fr: "Enregistrer {{amount}}",
                    pt: "Registrar {{amount}}",
                    "pt-PT": "Registar {{amount}}",
                })
            ),
            recordEmpty: t({
                en: "Record",
                de: "Erfassen",
                es: "Registrar",
                fr: "Enregistrer",
                pt: "Registrar",
                "pt-PT": "Registar",
            }),
            saved: insert(
                t({
                    en: "{{amount}} recorded with {{name}}",
                    de: "{{amount}} mit {{name}} erfasst",
                    es: "{{amount}} registrado con {{name}}",
                    fr: "{{amount}} enregistré avec {{name}}",
                    pt: "{{amount}} registrado com {{name}}",
                    "pt-PT": "{{amount}} registado com {{name}}",
                })
            ),
            submit: insert(
                t({
                    en: "Pay {{amount}}",
                    de: "{{amount}} zahlen",
                    es: "Pagar {{amount}}",
                    fr: "Payer {{amount}}",
                    pt: "Pagar {{amount}}",
                })
            ),
            submitEmpty: t({ en: "Pay", de: "Zahlen", es: "Pagar", fr: "Payer", pt: "Pagar" }),
            withBehind: insert(
                t({
                    en: "{{amount}} with what's behind",
                    de: "{{amount}} mit dem Rückstand",
                    es: "{{amount}} con lo atrasado",
                    fr: "{{amount}} avec le retard",
                    pt: "{{amount}} com o atrasado",
                })
            ),
            youOweNow: t({
                en: "You owe now",
                de: "Du schuldest jetzt",
                es: "Debes ahora",
                fr: "Vous devez maintenant",
                pt: "Você deve agora",
                "pt-PT": "Deve agora",
            }),
        },
        plan: {
            by: insert(
                t({
                    en: "{{amount}} by {{date}}",
                    de: "{{amount}} bis {{date}}",
                    es: "{{amount}} antes del {{date}}",
                    fr: "{{amount}} d'ici le {{date}}",
                    pt: "{{amount}} até {{date}}",
                })
            ),
            byDate: insert(
                t({
                    en: "By {{date}}",
                    de: "Bis {{date}}",
                    es: "Antes del {{date}}",
                    fr: "D'ici le {{date}}",
                    pt: "Até {{date}}",
                })
            ),
            byDays: insert(
                t({
                    en: "By {{date}} · {{count}} days",
                    de: "Bis {{date}} · {{count}} Tage",
                    es: "Antes del {{date}} · {{count}} días",
                    fr: "D'ici le {{date}} · {{count}} jours",
                    pt: "Até {{date}} · {{count}} dias",
                })
            ),
            dateRequired: t({
                en: "Pick a day after today.",
                de: "Wähle einen Tag nach heute.",
                es: "Elige un día después de hoy.",
                fr: "Choisissez un jour après aujourd'hui.",
                pt: "Escolha um dia depois de hoje.",
            }),
            early: insert(
                t({
                    en: "Paid back {{date}}, {{count}} days early",
                    de: "{{date}} zurückgezahlt, {{count}} Tage zu früh",
                    es: "Pagado el {{date}}, {{count}} días antes",
                    fr: "Remboursé le {{date}}, {{count}} jours en avance",
                    pt: "Pago em {{date}}, {{count}} dias antes",
                })
            ),
            months: insert(
                t({
                    en: "{{count}} months",
                    de: "{{count}} Monate",
                    es: "{{count}} meses",
                    fr: "{{count}} mois",
                    pt: "{{count}} meses",
                })
            ),
            monthUntil: insert(
                t({
                    en: "A month until {{date}}",
                    de: "Pro Monat bis {{date}}",
                    es: "Al mes hasta el {{date}}",
                    fr: "Par mois jusqu'au {{date}}",
                    pt: "Por mês até {{date}}",
                })
            ),
            none: t({ en: "No plan", de: "Kein Plan", es: "Sin plan", fr: "Pas de plan", pt: "Sem plano" }),
            noRate: t({
                en: "No exchange rate prices this balance yet.",
                de: "Für diesen Saldo gibt es noch keinen Wechselkurs.",
                es: "Aún no hay tasa de cambio para este saldo.",
                "es-ES": "Aún No hay tipo de cambio de cambio para este saldo.",
                fr: "Pas encore de taux de change pour ce solde.",
                pt: "Ainda não há cotação para este saldo.",
            }),
            illPay: insert(
                t({
                    en: "I'll pay {{date}}",
                    de: "Ich zahle am {{date}}",
                    es: "Voy a pagar el {{date}}",
                    fr: "Je paierai le {{date}}",
                    pt: "Vou pagar em {{date}}",
                })
            ),
            paidBack: insert(
                t({
                    en: "Paid back {{date}}",
                    de: "Zurückgezahlt am {{date}}",
                    es: "Pagado el {{date}}",
                    fr: "Remboursé le {{date}}",
                    pt: "Pago em {{date}}",
                })
            ),
            paidOff: insert(
                t({
                    en: "Paid off {{date}}",
                    de: "Abbezahlt am {{date}}",
                    es: "Liquidado el {{date}}",
                    fr: "Soldé le {{date}}",
                    pt: "Quitado em {{date}}",
                })
            ),
            payOff: insert(
                t({
                    en: "Pay off by {{date}}",
                    de: "Abbezahlen bis {{date}}",
                    es: "Liquidar antes del {{date}}",
                    fr: "Solder d'ici le {{date}}",
                    pt: "Quitar até {{date}}",
                })
            ),
            payOffBy: t({
                en: "Pay off by",
                de: "Abbezahlen bis",
                es: "Liquidar antes del",
                fr: "Solder d'ici le",
                pt: "Quitar até",
                "pt-PT": "Liquidar até",
            }),
            perMonth: insert(
                t({
                    en: "{{amount}} a month until {{date}}",
                    de: "{{amount}} im Monat bis {{date}}",
                    es: "{{amount}} al mes hasta el {{date}}",
                    fr: "{{amount}} par mois jusqu'au {{date}}",
                    pt: "{{amount}} por mês até {{date}}",
                })
            ),
            plan: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            removed: t({
                en: "Plan removed",
                de: "Plan entfernt",
                es: "Plan eliminado",
                fr: "Plan retiré",
                pt: "Plano removido",
            }),
            save: t({
                en: "Save plan",
                de: "Plan speichern",
                es: "Guardar plan",
                fr: "Enregistrer le plan",
                pt: "Salvar plano",
                "pt-PT": "Guardar plano",
            }),
            saved: t({
                en: "Plan saved",
                de: "Plan gespeichert",
                es: "Plan guardado",
                fr: "Plan enregistré",
                pt: "Plano salvo",
                "pt-PT": "Plano guardado",
            }),
            setTitle: t({
                en: "Set plan",
                de: "Plan festlegen",
                es: "Crear plan",
                fr: "Fixer un plan",
                pt: "Criar plano",
            }),
            title: t({
                en: "Change plan",
                de: "Plan ändern",
                es: "Cambiar plan",
                fr: "Modifier le plan",
                pt: "Mudar plano",
            }),
            year: t({ en: "1 year", de: "1 Jahr", es: "1 año", fr: "1 an", pt: "1 ano" }),
        },
        rename: {
            required: t({
                en: "Add a name.",
                de: "Gib einen Namen ein.",
                es: "Agrega un nombre.",
                "es-ES": "Añade un nombre.",
                fr: "Ajoutez un nom.",
                pt: "Adicione um nome.",
            }),
            saved: t({ en: "Renamed", de: "Umbenannt", es: "Nombre cambiado", fr: "Renommé", pt: "Renomeado" }),
            title: insert(
                t({
                    en: "Rename {{name}}",
                    de: "{{name}} umbenennen",
                    es: "Renombrar a {{name}}",
                    fr: "Renommer {{name}}",
                    pt: "Renomear {{name}}",
                })
            ),
        },
        settle: {
            another: t({
                en: "Another amount",
                de: "Anderer Betrag",
                es: "Otro monto",
                "es-ES": "Otro importe",
                fr: "Autre montant",
                pt: "Outro valor",
            }),
            bodyOwesYou: insert(
                t({
                    en: "{{name}} paid back the full {{amount}}. This moves {{name}} to Settled and ends the plan.",
                    de: "{{name}} hat die vollen {{amount}} zurückgezahlt. Dadurch wechselt {{name}} zu Beglichen und der Plan endet.",
                    es: "{{name}} te pagó los {{amount}} completos. Así pasa a Saldadas y el plan termina.",
                    fr: "{{name}} a remboursé les {{amount}} en entier. {{name}} passe dans Soldées et le plan se termine.",
                    pt: "{{name}} pagou os {{amount}} inteiros. Assim vai para Quitadas e o plano termina.",
                })
            ),
            bodyYouOwe: insert(
                t({
                    en: "You pay back the full {{amount}}. This moves {{name}} to Settled and ends the plan.",
                    de: "Du zahlst die vollen {{amount}} zurück. Dadurch wechselt {{name}} zu Beglichen und der Plan endet.",
                    es: "Pagas los {{amount}} completos. Así {{name}} pasa a Saldadas y el plan termina.",
                    fr: "Vous remboursez les {{amount}} en entier. {{name}} passe dans Soldées et le plan se termine.",
                    pt: "Você paga os {{amount}} inteiros. Assim {{name}} vai para Quitadas e o plano termina.",
                    "pt-PT": "Paga os {{amount}} inteiros. Assim {{name}} vai para Quitadas e o plano termina.",
                })
            ),
            submit: insert(
                t({
                    en: "Settle {{amount}}",
                    de: "{{amount}} begleichen",
                    es: "Saldar {{amount}}",
                    fr: "Solder {{amount}}",
                    pt: "Quitar {{amount}}",
                })
            ),
            title: insert(
                t({
                    en: "Settle with {{name}}",
                    de: "Mit {{name}} begleichen",
                    es: "Saldar con {{name}}",
                    fr: "Solder avec {{name}}",
                    pt: "Quitar com {{name}}",
                })
            ),
            toast: insert(
                t({
                    en: "Settled with {{name}}",
                    de: "Mit {{name}} beglichen",
                    es: "Saldado con {{name}}",
                    fr: "Soldé avec {{name}}",
                    pt: "Quitado com {{name}}",
                })
            ),
        },
        somethingIOwe: t({
            en: "Something I owe",
            de: "Etwas, das ich schulde",
            es: "Algo que debo",
            fr: "Quelque chose que je dois",
            pt: "Algo que devo",
        }),
        tabs: {
            all: t({ en: "All", de: "Alle", es: "Todas", fr: "Toutes", pt: "Todas" }),
            owesYou: t({
                en: "Owes you",
                de: "Schuldet dir",
                es: "Te deben",
                fr: "On vous doit",
                pt: "Te devem",
                "pt-PT": "Devem-te",
            }),
            settled: t({ en: "Settled", de: "Beglichen", es: "Saldadas", fr: "Soldées", pt: "Quitadas" }),
            youOwe: t({
                en: "You owe",
                de: "Du schuldest",
                es: "Debes",
                fr: "Vous devez",
                pt: "Você deve",
                "pt-PT": "Deve",
            }),
        },
        title: t({ en: "Debts", de: "Schulden", es: "Deudas", fr: "Dettes", pt: "Dívidas" }),
    },
    key: "dashboard-debts",
} satisfies Dictionary;

export default dashboardDebts;
