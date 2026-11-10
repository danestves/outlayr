import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardDebts = {
    content: {
        actions: {
            borrow: t({ en: "Borrow", es: "Pedir prestado", fr: "Emprunter", pt: "Pegar emprestado" }),
            borrowMore: t({ en: "Borrow more", es: "Pedir más", fr: "Emprunter plus", pt: "Pegar mais" }),
            changePlan: t({ en: "Change plan", es: "Cambiar plan", fr: "Modifier le plan", pt: "Mudar plano" }),
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            gotPaidBack: t({ en: "Got paid back", es: "Me pagaron", fr: "On m'a remboursé", pt: "Me pagaram" }),
            lend: t({ en: "Lend", es: "Prestar", fr: "Prêter", pt: "Emprestar" }),
            lendMore: t({ en: "Lend more", es: "Prestar más", fr: "Prêter plus", pt: "Emprestar mais" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    es: "Más opciones para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            open: t({ en: "Open", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            payBack: t({ en: "Pay back", es: "Pagar", fr: "Rembourser", pt: "Pagar" }),
            removePlan: t({ en: "Remove plan", es: "Quitar plan", fr: "Retirer le plan", pt: "Remover plano" }),
            rename: t({ en: "Rename", es: "Renombrar", fr: "Renommer", pt: "Renomear" }),
            setPlan: t({ en: "Set plan", es: "Crear plan", fr: "Fixer un plan", pt: "Criar plano" }),
        },
        back: t({ en: "Back to Debts", es: "Volver a Deudas", fr: "Retour aux dettes", pt: "Voltar para Dívidas" }),
        cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        columns: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            balance: t({ en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            last: t({ en: "Last movement", es: "Último movimiento", fr: "Dernier mouvement", pt: "Último movimento" }),
            movement: t({ en: "Movement", es: "Movimiento", fr: "Mouvement", pt: "Movimento" }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            note: t({ en: "Note", es: "Nota", fr: "Note", pt: "Nota" }),
            plan: t({ en: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
        },
        delete: {
            body: insert(
                t({
                    en: "Everything recorded with them is deleted too: {{count}} movements and a {{amount}} balance.",
                    es: "También se elimina todo lo registrado con esta persona: {{count}} movimientos y un saldo de {{amount}}.",
                    fr: "Tout ce qui est enregistré avec elle est aussi supprimé : {{count}} mouvements et un solde de {{amount}}.",
                    pt: "Tudo o que foi registrado com essa pessoa também é excluído: {{count}} movimentos e um saldo de {{amount}}.",
                })
            ),
            bodyOne: insert(
                t({
                    en: "Everything recorded with them is deleted too: 1 movement and a {{amount}} balance.",
                    es: "También se elimina todo lo registrado con esta persona: 1 movimiento y un saldo de {{amount}}.",
                    fr: "Tout ce qui est enregistré avec elle est aussi supprimé : 1 mouvement et un solde de {{amount}}.",
                    pt: "Tudo o que foi registrado com essa pessoa também é excluído: 1 movimento e um saldo de {{amount}}.",
                })
            ),
            confirm: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            failed: t({
                en: "Couldn't delete. Try again.",
                es: "No se pudo eliminar. Intenta de nuevo.",
                fr: "Suppression impossible. Réessayez.",
                pt: "Não foi possível excluir. Tente de novo.",
            }),
            title: insert(
                t({
                    en: "Delete {{name}}",
                    es: "Eliminar a {{name}}",
                    fr: "Supprimer {{name}}",
                    pt: "Excluir {{name}}",
                })
            ),
            toast: insert(
                t({
                    en: "{{name}} deleted",
                    es: "{{name}} eliminado",
                    fr: "{{name}} supprimé",
                    pt: "{{name}} excluído",
                })
            ),
        },
        detail: {
            balance: t({ en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            borrowed: t({ en: "Borrowed", es: "Prestado a ti", fr: "Emprunté", pt: "Emprestado a você" }),
            borrowedTotal: insert(
                t({
                    en: "{{amount}} borrowed",
                    es: "{{amount}} prestado a ti",
                    fr: "{{amount}} emprunté",
                    pt: "{{amount}} emprestado a você",
                })
            ),
            lent: t({ en: "Lent", es: "Prestado", fr: "Prêté", pt: "Emprestado" }),
            lentTotal: insert(
                t({
                    en: "{{amount}} lent",
                    es: "{{amount}} prestado",
                    fr: "{{amount}} prêté",
                    pt: "{{amount}} emprestado",
                })
            ),
            movements: t({ en: "Movements", es: "Movimientos", fr: "Mouvements", pt: "Movimentos" }),
            noMovements: t({
                en: "Nothing moved yet.",
                es: "Todavía no hay movimientos.",
                fr: "Aucun mouvement pour l'instant.",
                pt: "Ainda não há movimentos.",
            }),
            notFound: t({
                en: "This debt is gone.",
                es: "Esta deuda ya no existe.",
                fr: "Cette dette n'existe plus.",
                pt: "Esta dívida não existe mais.",
            }),
            once: t({ en: "1 time", es: "1 vez", fr: "1 fois", pt: "1 vez" }),
            onTrack: t({ en: "On track", es: "Al día", fr: "Dans les temps", pt: "Em dia" }),
            outside: t({ en: "Outside Outlayr", es: "Fuera de Outlayr", fr: "Hors d'Outlayr", pt: "Fora do Outlayr" }),
            paidBack: t({ en: "Paid back", es: "Pagado", fr: "Remboursé", pt: "Pago" }),
            paidBackTotal: insert(
                t({
                    en: "{{amount}} paid back",
                    es: "{{amount}} pagado",
                    fr: "{{amount}} remboursé",
                    pt: "{{amount}} pago",
                })
            ),
            plan: t({ en: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            settled: t({ en: "Settled", es: "Saldada", fr: "Soldée", pt: "Quitada" }),
            since: insert(
                t({ en: "Since {{date}}", es: "Desde el {{date}}", fr: "Depuis le {{date}}", pt: "Desde {{date}}" })
            ),
            theyPay: insert(
                t({
                    en: "{{name}} pays you back by {{date}}",
                    es: "{{name}} te paga antes del {{date}}",
                    fr: "{{name}} vous rembourse d'ici le {{date}}",
                    pt: "{{name}} te paga até {{date}}",
                })
            ),
            times: insert(
                t({ en: "{{count}} times", es: "{{count}} veces", fr: "{{count}} fois", pt: "{{count}} vezes" })
            ),
            youPay: insert(
                t({
                    en: "You pay {{name}} back by {{date}}",
                    es: "Le pagas a {{name}} antes del {{date}}",
                    fr: "Vous remboursez {{name}} d'ici le {{date}}",
                    pt: "Você paga {{name}} até {{date}}",
                })
            ),
        },
        due: {
            summary: insert(
                t({
                    en: "{{count}} payments · next {{name}} {{date}}",
                    es: "{{count}} pagos · el próximo, {{name}} el {{date}}",
                    fr: "{{count}} paiements · prochain : {{name}} le {{date}}",
                    pt: "{{count}} pagamentos · o próximo, {{name}} em {{date}}",
                })
            ),
            summaryOne: insert(
                t({
                    en: "1 payment · {{name}} {{date}}",
                    es: "1 pago · {{name}} el {{date}}",
                    fr: "1 paiement · {{name}} le {{date}}",
                    pt: "1 pagamento · {{name}} em {{date}}",
                })
            ),
            overdue: insert(
                t({
                    en: "{{count}} payments · {{name}} overdue since {{date}}",
                    es: "{{count}} pagos · {{name}} vencido desde el {{date}}",
                    fr: "{{count}} paiements · {{name}} en retard depuis le {{date}}",
                    pt: "{{count}} pagamentos · {{name}} atrasado desde {{date}}",
                })
            ),
            overdueOne: insert(
                t({
                    en: "1 payment · {{name}} overdue since {{date}}",
                    es: "1 pago · {{name}} vencido desde el {{date}}",
                    fr: "1 paiement · {{name}} en retard depuis le {{date}}",
                    pt: "1 pagamento · {{name}} atrasado desde {{date}}",
                })
            ),
            title: insert(
                t({
                    en: "Due in the next {{days}} days",
                    es: "Por pagar en los próximos {{days}} días",
                    fr: "À payer dans les {{days}} prochains jours",
                    pt: "A pagar nos próximos {{days}} dias",
                })
            ),
        },
        empty: {
            line: t({
                en: "And you owe nobody. What moves between you and someone else gathers here.",
                es: "Y tú no le debes a nadie. Lo que se mueva entre tú y otra persona se reúne aquí.",
                fr: "Et vous ne devez rien à personne. Ce qui circule entre vous et quelqu'un d'autre se retrouve ici.",
                pt: "E você não deve a ninguém. O que circular entre você e outra pessoa aparece aqui.",
            }),
            title: t({
                en: "Nobody owes you",
                es: "Nadie te debe",
                fr: "Personne ne vous doit rien",
                pt: "Ninguém te deve",
            }),
        },
        form: {
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            amountRequired: t({
                en: "Enter an amount above zero.",
                es: "Ingresa un monto mayor que cero.",
                fr: "Saisissez un montant supérieur à zéro.",
                pt: "Digite um valor maior que zero.",
            }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            categoryPlaceholder: t({
                en: "Choose a category",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            from: t({ en: "From", es: "Desde", fr: "Depuis", pt: "De" }),
            getBackBy: t({
                en: "Paid back by",
                es: "Que me pague antes del",
                fr: "Remboursé d'ici le",
                pt: "Que me pague até",
            }),
            inCurrency: insert(
                t({ en: "In {{currency}}", es: "En {{currency}}", fr: "En {{currency}}", pt: "Em {{currency}}" })
            ),
            inCurrencyRequired: insert(
                t({
                    en: "Enter what it is in {{currency}}.",
                    es: "Ingresa cuánto es en {{currency}}.",
                    fr: "Saisissez le montant en {{currency}}.",
                    pt: "Digite quanto é em {{currency}}.",
                })
            ),
            into: t({ en: "Into", es: "Hacia", fr: "Vers", pt: "Para" }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            namePlaceholder: t({
                en: "A person, a loan, Cashea",
                es: "Una persona, un préstamo, Cashea",
                fr: "Une personne, un prêt, Cashea",
                pt: "Uma pessoa, um empréstimo, Cashea",
            }),
            nameRequired: t({
                en: "Choose a person or add a name.",
                es: "Elige una persona o agrega un nombre.",
                fr: "Choisissez une personne ou ajoutez un nom.",
                pt: "Escolha uma pessoa ou adicione um nome.",
            }),
            newPerson: insert(
                t({
                    en: "Add “{{name}}”",
                    es: "Agregar “{{name}}”",
                    fr: "Ajouter « {{name}} »",
                    pt: "Adicionar “{{name}}”",
                })
            ),
            none: t({ en: "None", es: "Ninguna", fr: "Aucun", pt: "Nenhuma" }),
            note: t({ en: "Note", es: "Nota", fr: "Note", pt: "Nota" }),
            noRate: t({
                en: "No exchange rate for that day yet.",
                es: "Aún no hay tasa de cambio para ese día.",
                fr: "Pas encore de taux de change pour ce jour.",
                pt: "Ainda não há cotação para esse dia.",
            }),
            optional: t({ en: "Optional", es: "Opcional", fr: "Facultatif", pt: "Opcional" }),
            payBackBy: t({ en: "Pay back by", es: "Pagar antes del", fr: "Rembourser d'ici le", pt: "Pagar até" }),
            people: t({ en: "People", es: "Personas", fr: "Personnes", pt: "Pessoas" }),
            save: t({ en: "Save", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            saveFailed: t({
                en: "Couldn't save. Try again.",
                es: "No se pudo guardar. Intenta de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
            }),
        },
        groups: {
            settled: insert(
                t({
                    en: "Settled · {{count}}",
                    es: "Saldadas · {{count}}",
                    fr: "Soldées · {{count}}",
                    pt: "Quitadas · {{count}}",
                })
            ),
        },
        kinds: {
            borrowed: t({ en: "Borrowed", es: "Me prestaron", fr: "Emprunté", pt: "Peguei emprestado" }),
            boughtOnCredit: t({
                en: "Bought on credit",
                es: "Compra a crédito",
                fr: "Acheté à crédit",
                pt: "Compra a prazo",
            }),
            gotPaidBack: t({ en: "Got paid back", es: "Me pagaron", fr: "Remboursé", pt: "Me pagaram" }),
            lent: t({ en: "Lent", es: "Presté", fr: "Prêté", pt: "Emprestei" }),
            paidBack: t({ en: "Paid back", es: "Pagué", fr: "Remboursé", pt: "Paguei" }),
            soldOnCredit: t({ en: "Sold on credit", es: "Venta a crédito", fr: "Vendu à crédit", pt: "Venda a prazo" }),
        },
        kpi: {
            allClear: t({ en: "All clear", es: "Todo saldado", fr: "Tout est réglé", pt: "Tudo quitado" }),
            behind: insert(
                t({
                    en: "{{amount}} behind",
                    es: "{{amount}} atrasado",
                    fr: "{{amount}} de retard",
                    pt: "{{amount}} atrasado",
                })
            ),
            cards: t({
                en: "Cards and loans",
                es: "Tarjetas y préstamos",
                fr: "Cartes et prêts",
                pt: "Cartões e empréstimos",
            }),
            cardsMore: insert(
                t({
                    en: "{{name}} +{{count}}",
                    es: "{{name}} +{{count}}",
                    fr: "{{name}} +{{count}}",
                    pt: "{{name}} +{{count}}",
                })
            ),
            net: t({
                en: "Net with people",
                es: "Neto con personas",
                fr: "Solde avec les gens",
                pt: "Saldo com pessoas",
            }),
            none: t({ en: "None", es: "Ninguna", fr: "Aucune", pt: "Nenhum" }),
            onTrack: t({ en: "On track", es: "Al día", fr: "Dans les temps", pt: "Em dia" }),
            owesYou: t({ en: "Owes you", es: "Te deben", fr: "On vous doit", pt: "Te devem" }),
            people: insert(
                t({
                    en: "{{count}} people",
                    es: "{{count}} personas",
                    fr: "{{count}} personnes",
                    pt: "{{count}} pessoas",
                })
            ),
            person: t({ en: "1 person", es: "1 persona", fr: "1 personne", pt: "1 pessoa" }),
            youOwe: t({ en: "You owe", es: "Debes", fr: "Vous devez", pt: "Você deve" }),
        },
        newDebt: t({ en: "New debt", es: "Nueva deuda", fr: "Nouvelle dette", pt: "Nova dívida" }),
        newForm: {
            boughtNeedsCategory: t({
                en: "Bought on credit needs a category.",
                es: "La compra a crédito necesita una categoría.",
                fr: "Un achat à crédit a besoin d'une catégorie.",
                pt: "A compra a prazo precisa de uma categoria.",
            }),
            saved: insert(
                t({
                    en: "Saved with {{name}}",
                    es: "Guardado con {{name}}",
                    fr: "Enregistré avec {{name}}",
                    pt: "Salvo com {{name}}",
                })
            ),
            soldNeedsCategory: t({
                en: "Sold on credit needs a category.",
                es: "La venta a crédito necesita una categoría.",
                fr: "Une vente à crédit a besoin d'une catégorie.",
                pt: "A venda a prazo precisa de uma categoria.",
            }),
            title: t({ en: "New Debt", es: "Nueva deuda", fr: "Nouvelle dette", pt: "Nova dívida" }),
            verbs: {
                bought: t({
                    en: "Bought on credit",
                    es: "Compré a crédito",
                    fr: "Acheté à crédit",
                    pt: "Comprei a prazo",
                }),
                borrowed: t({ en: "I borrowed", es: "Me prestaron", fr: "J'ai emprunté", pt: "Peguei emprestado" }),
                lent: t({ en: "I lent", es: "Presté", fr: "J'ai prêté", pt: "Emprestei" }),
                sold: t({ en: "Sold on credit", es: "Vendí a crédito", fr: "Vendu à crédit", pt: "Vendi a prazo" }),
            },
        },
        owe: {
            categoryRequired: t({
                en: "Choose a category.",
                es: "Elige una categoría.",
                fr: "Choisissez une catégorie.",
                pt: "Escolha uma categoria.",
            }),
            choose: t({ en: "Choose", es: "Elegir", fr: "Choisir", pt: "Escolher" }),
            endOfMonth: t({ en: "End of month", es: "Fin de mes", fr: "Fin du mois", pt: "Fim do mês" }),
            illPay: t({ en: "I'll pay", es: "Pagaré", fr: "Je paierai", pt: "Vou pagar" }),
            noDate: t({ en: "No date", es: "Sin fecha", fr: "Sans date", pt: "Sem data" }),
            saved: insert(
                t({
                    en: "You owe {{name}} {{amount}}",
                    es: "Le debes {{amount}} a {{name}}",
                    fr: "Vous devez {{amount}} à {{name}}",
                    pt: "Você deve {{amount}} a {{name}}",
                })
            ),
            title: t({
                en: "Something I Owe",
                es: "Algo que debo",
                fr: "Quelque chose que je dois",
                pt: "Algo que devo",
            }),
            tomorrow: t({ en: "Tomorrow", es: "Mañana", fr: "Demain", pt: "Amanhã" }),
            whatFor: t({ en: "What for", es: "Por qué", fr: "Pour quoi", pt: "Pelo quê" }),
            whatForPlaceholder: t({
                en: "Plumbing, a repair",
                es: "Plomería, una reparación",
                fr: "Plomberie, une réparation",
                pt: "Encanamento, um conserto",
            }),
            who: t({ en: "Who", es: "A quién", fr: "À qui", pt: "A quem" }),
            whoPlaceholder: t({
                en: "A person or company",
                es: "Una persona o empresa",
                fr: "Une personne ou une entreprise",
                pt: "Uma pessoa ou empresa",
            }),
            whoRequired: t({
                en: "Say who you owe.",
                es: "Indica a quién le debes.",
                fr: "Indiquez à qui vous devez.",
                pt: "Diga a quem você deve.",
            }),
        },
        pay: {
            afterThis: t({ en: "After this", es: "Después de esto", fr: "Après ceci", pt: "Depois disso" }),
            all: insert(
                t({ en: "{{amount}} all", es: "{{amount}} todo", fr: "{{amount}} tout", pt: "{{amount}} tudo" })
            ),
            gotTitle: insert(
                t({
                    en: "{{name}} paid you back",
                    es: "{{name}} te pagó",
                    fr: "{{name}} vous a remboursé",
                    pt: "{{name}} te pagou",
                })
            ),
            owesYouNow: t({ en: "Owes you now", es: "Te debe ahora", fr: "Vous doit maintenant", pt: "Te deve agora" }),
            payTitle: insert(
                t({
                    en: "Pay back {{name}}",
                    es: "Pagarle a {{name}}",
                    fr: "Rembourser {{name}}",
                    pt: "Pagar {{name}}",
                })
            ),
            plan: insert(
                t({ en: "{{amount}} plan", es: "{{amount}} plan", fr: "{{amount}} plan", pt: "{{amount}} plano" })
            ),
            record: insert(
                t({
                    en: "Record {{amount}}",
                    es: "Registrar {{amount}}",
                    fr: "Enregistrer {{amount}}",
                    pt: "Registrar {{amount}}",
                })
            ),
            recordEmpty: t({ en: "Record", es: "Registrar", fr: "Enregistrer", pt: "Registrar" }),
            saved: insert(
                t({
                    en: "{{amount}} recorded with {{name}}",
                    es: "{{amount}} registrado con {{name}}",
                    fr: "{{amount}} enregistré avec {{name}}",
                    pt: "{{amount}} registrado com {{name}}",
                })
            ),
            submit: insert(
                t({ en: "Pay {{amount}}", es: "Pagar {{amount}}", fr: "Payer {{amount}}", pt: "Pagar {{amount}}" })
            ),
            submitEmpty: t({ en: "Pay", es: "Pagar", fr: "Payer", pt: "Pagar" }),
            withBehind: insert(
                t({
                    en: "{{amount}} with what's behind",
                    es: "{{amount}} con lo atrasado",
                    fr: "{{amount}} avec le retard",
                    pt: "{{amount}} com o atrasado",
                })
            ),
            youOweNow: t({ en: "You owe now", es: "Debes ahora", fr: "Vous devez maintenant", pt: "Você deve agora" }),
        },
        plan: {
            by: insert(
                t({
                    en: "{{amount}} by {{date}}",
                    es: "{{amount}} antes del {{date}}",
                    fr: "{{amount}} d'ici le {{date}}",
                    pt: "{{amount}} até {{date}}",
                })
            ),
            byDate: insert(
                t({ en: "By {{date}}", es: "Antes del {{date}}", fr: "D'ici le {{date}}", pt: "Até {{date}}" })
            ),
            byDays: insert(
                t({
                    en: "By {{date}} · {{count}} days",
                    es: "Antes del {{date}} · {{count}} días",
                    fr: "D'ici le {{date}} · {{count}} jours",
                    pt: "Até {{date}} · {{count}} dias",
                })
            ),
            dateRequired: t({
                en: "Pick a day after today.",
                es: "Elige un día después de hoy.",
                fr: "Choisissez un jour après aujourd'hui.",
                pt: "Escolha um dia depois de hoje.",
            }),
            early: insert(
                t({
                    en: "Paid back {{date}}, {{count}} days early",
                    es: "Pagado el {{date}}, {{count}} días antes",
                    fr: "Remboursé le {{date}}, {{count}} jours en avance",
                    pt: "Pago em {{date}}, {{count}} dias antes",
                })
            ),
            months: insert(
                t({ en: "{{count}} months", es: "{{count}} meses", fr: "{{count}} mois", pt: "{{count}} meses" })
            ),
            monthUntil: insert(
                t({
                    en: "A month until {{date}}",
                    es: "Al mes hasta el {{date}}",
                    fr: "Par mois jusqu'au {{date}}",
                    pt: "Por mês até {{date}}",
                })
            ),
            none: t({ en: "No plan", es: "Sin plan", fr: "Pas de plan", pt: "Sem plano" }),
            noRate: t({
                en: "No exchange rate prices this balance yet.",
                es: "Aún no hay tasa de cambio para este saldo.",
                fr: "Pas encore de taux de change pour ce solde.",
                pt: "Ainda não há cotação para este saldo.",
            }),
            illPay: insert(
                t({
                    en: "I'll pay {{date}}",
                    es: "Pagaré el {{date}}",
                    fr: "Je paierai le {{date}}",
                    pt: "Vou pagar em {{date}}",
                })
            ),
            paidBack: insert(
                t({
                    en: "Paid back {{date}}",
                    es: "Pagado el {{date}}",
                    fr: "Remboursé le {{date}}",
                    pt: "Pago em {{date}}",
                })
            ),
            paidOff: insert(
                t({
                    en: "Paid off {{date}}",
                    es: "Liquidado el {{date}}",
                    fr: "Soldé le {{date}}",
                    pt: "Quitado em {{date}}",
                })
            ),
            payOff: insert(
                t({
                    en: "Pay off by {{date}}",
                    es: "Liquidar antes del {{date}}",
                    fr: "Solder d'ici le {{date}}",
                    pt: "Quitar até {{date}}",
                })
            ),
            payOffBy: t({ en: "Pay off by", es: "Liquidar antes del", fr: "Solder d'ici le", pt: "Quitar até" }),
            perMonth: insert(
                t({
                    en: "{{amount}} a month until {{date}}",
                    es: "{{amount}} al mes hasta el {{date}}",
                    fr: "{{amount}} par mois jusqu'au {{date}}",
                    pt: "{{amount}} por mês até {{date}}",
                })
            ),
            plan: t({ en: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            removed: t({ en: "Plan removed", es: "Plan eliminado", fr: "Plan retiré", pt: "Plano removido" }),
            save: t({ en: "Save plan", es: "Guardar plan", fr: "Enregistrer le plan", pt: "Salvar plano" }),
            saved: t({ en: "Plan saved", es: "Plan guardado", fr: "Plan enregistré", pt: "Plano salvo" }),
            setTitle: t({ en: "Set plan", es: "Crear plan", fr: "Fixer un plan", pt: "Criar plano" }),
            title: t({ en: "Change plan", es: "Cambiar plan", fr: "Modifier le plan", pt: "Mudar plano" }),
            year: t({ en: "1 year", es: "1 año", fr: "1 an", pt: "1 ano" }),
        },
        rename: {
            required: t({ en: "Add a name.", es: "Agrega un nombre.", fr: "Ajoutez un nom.", pt: "Adicione um nome." }),
            saved: t({ en: "Renamed", es: "Nombre cambiado", fr: "Renommé", pt: "Renomeado" }),
            title: insert(
                t({
                    en: "Rename {{name}}",
                    es: "Renombrar a {{name}}",
                    fr: "Renommer {{name}}",
                    pt: "Renomear {{name}}",
                })
            ),
        },
        settle: {
            another: t({ en: "Another amount", es: "Otro monto", fr: "Autre montant", pt: "Outro valor" }),
            bodyOwesYou: insert(
                t({
                    en: "{{name}} paid back the full {{amount}}. This moves {{name}} to Settled and ends the plan.",
                    es: "{{name}} te pagó los {{amount}} completos. Así pasa a Saldadas y el plan termina.",
                    fr: "{{name}} a remboursé les {{amount}} en entier. {{name}} passe dans Soldées et le plan se termine.",
                    pt: "{{name}} pagou os {{amount}} inteiros. Assim vai para Quitadas e o plano termina.",
                })
            ),
            bodyYouOwe: insert(
                t({
                    en: "You pay back the full {{amount}}. This moves {{name}} to Settled and ends the plan.",
                    es: "Pagas los {{amount}} completos. Así {{name}} pasa a Saldadas y el plan termina.",
                    fr: "Vous remboursez les {{amount}} en entier. {{name}} passe dans Soldées et le plan se termine.",
                    pt: "Você paga os {{amount}} inteiros. Assim {{name}} vai para Quitadas e o plano termina.",
                })
            ),
            submit: insert(
                t({
                    en: "Settle {{amount}}",
                    es: "Saldar {{amount}}",
                    fr: "Solder {{amount}}",
                    pt: "Quitar {{amount}}",
                })
            ),
            title: insert(
                t({
                    en: "Settle with {{name}}",
                    es: "Saldar con {{name}}",
                    fr: "Solder avec {{name}}",
                    pt: "Quitar com {{name}}",
                })
            ),
            toast: insert(
                t({
                    en: "Settled with {{name}}",
                    es: "Saldado con {{name}}",
                    fr: "Soldé avec {{name}}",
                    pt: "Quitado com {{name}}",
                })
            ),
        },
        somethingIOwe: t({
            en: "Something I owe",
            es: "Algo que debo",
            fr: "Quelque chose que je dois",
            pt: "Algo que devo",
        }),
        tabs: {
            all: t({ en: "All", es: "Todas", fr: "Toutes", pt: "Todas" }),
            owesYou: t({ en: "Owes you", es: "Te deben", fr: "On vous doit", pt: "Te devem" }),
            settled: t({ en: "Settled", es: "Saldadas", fr: "Soldées", pt: "Quitadas" }),
            youOwe: t({ en: "You owe", es: "Debes", fr: "Vous devez", pt: "Você deve" }),
        },
        title: t({ en: "Debts", es: "Deudas", fr: "Dettes", pt: "Dívidas" }),
    },
    key: "dashboard-debts",
} satisfies Dictionary;

export default dashboardDebts;
