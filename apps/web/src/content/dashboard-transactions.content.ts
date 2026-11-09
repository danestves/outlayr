import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardTransactions = {
    content: {
        amount: {
            chip: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            max: t({ en: "At most", es: "Como máximo", fr: "Au plus", pt: "No máximo" }),
            min: t({ en: "At least", es: "Como mínimo", fr: "Au moins", pt: "No mínimo" }),
        },
        bulk: {
            clear: t({
                en: "Clear selection",
                es: "Quitar selección",
                fr: "Effacer la sélection",
                pt: "Limpar seleção",
            }),
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            selectAll: t({ en: "Select all", es: "Seleccionar todo", fr: "Tout sélectionner", pt: "Selecionar tudo" }),
            selected: insert(
                t({
                    en: "{{count}} selected",
                    es: "{{count}} seleccionados",
                    fr: "{{count}} sélectionnées",
                    pt: "{{count}} selecionados",
                })
            ),
            selectEntry: insert(
                t({
                    en: "Select {{name}}",
                    es: "Seleccionar {{name}}",
                    fr: "Sélectionner {{name}}",
                    pt: "Selecionar {{name}}",
                })
            ),
            updated: insert(
                t({
                    en: "{{count}} updated",
                    es: "{{count}} actualizados",
                    fr: "{{count}} modifiées",
                    pt: "{{count}} atualizados",
                })
            ),
            updatedSkipped: insert(
                t({
                    en: "{{count}} updated, {{skipped}} unchanged",
                    es: "{{count}} actualizados, {{skipped}} sin cambios",
                    fr: "{{count}} modifiées, {{skipped}} inchangées",
                    pt: "{{count}} atualizados, {{skipped}} sem alteração",
                })
            ),
        },
        clearFilters: t({ en: "Clear filters", es: "Quitar filtros", fr: "Effacer les filtres", pt: "Limpar filtros" }),
        csv: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            inMain: insert(
                t({
                    en: "Amount in {{currency}}",
                    es: "Monto en {{currency}}",
                    fr: "Montant en {{currency}}",
                    pt: "Valor em {{currency}}",
                })
            ),
            merchant: t({ en: "Merchant", es: "Comercio", fr: "Commerçant", pt: "Estabelecimento" }),
            type: t({ en: "Type", es: "Tipo", fr: "Type", pt: "Tipo" }),
        },
        deleted: {
            failed: t({
                en: "Could not delete. Try again.",
                es: "No se pudo eliminar. Inténtalo de nuevo.",
                fr: "Suppression impossible. Réessayez.",
                pt: "Não foi possível excluir. Tente de novo.",
            }),
            many: insert(
                t({
                    en: "{{count}} entries deleted",
                    es: "{{count}} movimientos eliminados",
                    fr: "{{count}} opérations supprimées",
                    pt: "{{count}} lançamentos excluídos",
                })
            ),
            one: t({
                en: "Entry deleted",
                es: "Movimiento eliminado",
                fr: "Opération supprimée",
                pt: "Lançamento excluído",
            }),
            undo: t({ en: "Undo", es: "Deshacer", fr: "Annuler", pt: "Desfazer" }),
        },
        detail: {
            charged: t({ en: "Charged", es: "Cobrado", fr: "Débité", pt: "Cobrado" }),
            copied: t({ en: "Link copied", es: "Enlace copiado", fr: "Lien copié", pt: "Link copiado" }),
            copyLink: t({ en: "Copy link", es: "Copiar enlace", fr: "Copier le lien", pt: "Copiar link" }),
            done: t({ en: "Done", es: "Listo", fr: "Terminé", pt: "Concluído" }),
            edit: t({ en: "Edit", es: "Editar", fr: "Modifier", pt: "Editar" }),
            feeOf: insert(
                t({
                    en: "{{amount}} + {{fee}} card fee",
                    es: "{{amount}} + {{fee}} de comisión",
                    fr: "{{amount}} + {{fee}} de frais",
                    pt: "{{amount}} + {{fee}} de tarifa",
                })
            ),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            addFee: t({ en: "Add a fee", es: "Añadir comisión", fr: "Ajouter des frais", pt: "Adicionar taxa" }),
            editOnPhone: t({
                en: "Edit this on your phone.",
                es: "Edítalo en tu teléfono.",
                fr: "Modifiez-la sur votre téléphone.",
                pt: "Edite no seu celular.",
            }),
            fee: t({ en: "Fee", es: "Comisión", fr: "Frais", pt: "Tarifa" }),
            from: t({ en: "From", es: "Desde", fr: "De", pt: "De" }),
            fromAccount: insert(
                t({
                    en: "from {{account}}",
                    es: "desde {{account}}",
                    fr: "depuis {{account}}",
                    pt: "de {{account}}",
                })
            ),
            hints: {
                category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
                close: t({ en: "Close", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
                delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
                move: t({ en: "Move", es: "Mover", fr: "Parcourir", pt: "Navegar" }),
            },
            installments: t({ en: "Installments", es: "Cuotas", fr: "Échéances", pt: "Parcelas" }),
            more: t({ en: "More", es: "Más", fr: "Plus", pt: "Mais" }),
            moves: t({ en: "Moves", es: "Movimientos", fr: "Mouvements", pt: "Movimentos" }),
            next: t({
                en: "Next entry",
                es: "Movimiento siguiente",
                fr: "Opération suivante",
                pt: "Próximo lançamento",
            }),
            note: t({ en: "Note", es: "Nota", fr: "Note", pt: "Nota" }),
            off: t({ en: "Off", es: "No", fr: "Non", pt: "Não" }),
            perUnit: insert(
                t({
                    en: "{{rate}} per {{currency}}",
                    es: "{{rate}} por {{currency}}",
                    fr: "{{rate}} pour {{currency}}",
                    pt: "{{rate}} por {{currency}}",
                })
            ),
            previous: t({
                en: "Previous entry",
                es: "Movimiento anterior",
                fr: "Opération précédente",
                pt: "Lançamento anterior",
            }),
            rate: t({ en: "Rate", es: "Tasa", fr: "Taux", pt: "Taxa de câmbio" }),
            swap: t({ en: "Swap", es: "Intercambiar", fr: "Inverser", pt: "Inverter" }),
            to: t({ en: "To", es: "Hacia", fr: "Vers", pt: "Para" }),
        },
        empty: {
            line: t({
                en: "Add your first one here or on your phone.",
                es: "Añade el primero aquí o en tu teléfono.",
                fr: "Ajoutez la première ici ou sur votre téléphone.",
                pt: "Adicione o primeiro aqui ou no celular.",
            }),
            title: t({
                en: "No entries yet",
                es: "Aún no hay movimientos",
                fr: "Aucune opération pour l'instant",
                pt: "Nenhum lançamento ainda",
            }),
        },
        installmentOf: insert(
            t({ en: "{{at}} of {{of}}", es: "{{at}} de {{of}}", fr: "{{at}} sur {{of}}", pt: "{{at}} de {{of}}" })
        ),
        export: t({ en: "Export", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
        exportFile: t({
            en: "outlayr-transactions",
            es: "outlayr-movimientos",
            fr: "outlayr-operations",
            pt: "outlayr-lancamentos",
        }),
        footer: {
            in: t({ en: "In", es: "Entró", fr: "Entrées", pt: "Entrou" }),
            net: t({ en: "Net", es: "Neto", fr: "Solde", pt: "Saldo" }),
            out: t({ en: "Out", es: "Salió", fr: "Sorties", pt: "Saiu" }),
        },
        form: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            addAnother: t({ en: "Add another", es: "Añadir otro", fr: "En ajouter une autre", pt: "Adicionar outro" }),
            added: t({
                en: "Entry added",
                es: "Movimiento añadido",
                fr: "Opération ajoutée",
                pt: "Lançamento adicionado",
            }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            amountRequired: t({
                en: "Type an amount first",
                es: "Primero escribe un monto",
                fr: "Saisissez d'abord un montant",
                pt: "Primeiro digite um valor",
            }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            categoryRequired: t({
                en: "Pick a category first",
                es: "Primero elige una categoría",
                fr: "Choisissez d'abord une catégorie",
                pt: "Primeiro escolha uma categoria",
            }),
            createAccount: t({ en: "Create account", es: "Crear cuenta", fr: "Créer un compte", pt: "Criar conta" }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            dateRequired: t({
                en: "Pick a date first",
                es: "Primero elige una fecha",
                fr: "Choisissez d'abord une date",
                pt: "Primeiro escolha uma data",
            }),
            fee: t({ en: "Card fee", es: "Comisión", fr: "Frais de carte", pt: "Tarifa do cartão" }),
            feeNote: insert(
                t({
                    en: "Fee · {{merchant}}",
                    es: "Comisión · {{merchant}}",
                    fr: "Frais · {{merchant}}",
                    pt: "Tarifa · {{merchant}}",
                })
            ),
            feePlaceholder: t({ en: "3.72 or 3%", es: "3,72 o 3%", fr: "3,72 ou 3 %", pt: "3,72 ou 3%" }),
            logAgain: t({ en: "Log again", es: "Registrar de nuevo", fr: "Saisir à nouveau", pt: "Registrar de novo" }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            noAccountLine: t({
                en: "Create an account to keep this entry's balance somewhere.",
                es: "Crea una cuenta para llevar el saldo de este movimiento.",
                fr: "Créez un compte pour suivre le solde de cette opération.",
                pt: "Crie uma conta para acompanhar o saldo deste lançamento.",
            }),
            none: t({ en: "None", es: "Ninguna", fr: "Aucun", pt: "Nenhuma" }),
            note: t({ en: "Note", es: "Nota", fr: "Note", pt: "Nota" }),
            noteAdd: t({ en: "Add a note", es: "Añadir una nota", fr: "Ajouter une note", pt: "Adicionar nota" }),
            pickDate: t({ en: "Pick a date", es: "Elegir fecha", fr: "Choisir une date", pt: "Escolher data" }),
            removeFee: t({ en: "Remove fee", es: "Quitar comisión", fr: "Retirer les frais", pt: "Remover tarifa" }),
            rate: t({ en: "Rate", es: "Tasa", fr: "Taux", pt: "Cotação" }),
            rateCustom: t({ en: "My rate", es: "Mi tasa", fr: "Mon taux", pt: "Minha cotação" }),
            rateMissing: t({
                en: "No rate for this date. Use your own.",
                es: "No hay tasa para esta fecha. Usa la tuya.",
                fr: "Aucun taux à cette date. Utilisez le vôtre.",
                pt: "Sem cotação nesta data. Use a sua.",
            }),
            rateOfficial: t({ en: "Official", es: "Oficial", fr: "Officiel", pt: "Oficial" }),
            ratePerUsd: t({ en: "Per USD", es: "Por USD", fr: "Par USD", pt: "Por USD" }),
            rateRequired: t({
                en: "Type a rate first",
                es: "Primero escribe una tasa",
                fr: "Saisissez d'abord un taux",
                pt: "Primeiro digite uma cotação",
            }),
            repeat: t({ en: "Repeat", es: "Repetir", fr: "Répéter", pt: "Repetir" }),
            repeatDaily: t({ en: "Daily", es: "Diario", fr: "Quotidien", pt: "Diário" }),
            repeatMonthly: t({ en: "Monthly", es: "Mensual", fr: "Mensuel", pt: "Mensal" }),
            repeatNone: t({ en: "Does not repeat", es: "No se repite", fr: "Ne se répète pas", pt: "Não se repete" }),
            repeatWeekly: t({ en: "Weekly", es: "Semanal", fr: "Hebdomadaire", pt: "Semanal" }),
            repeatYearly: t({ en: "Yearly", es: "Anual", fr: "Annuel", pt: "Anual" }),
            saveFailed: t({
                en: "Could not save. Try again.",
                es: "No se pudo guardar. Inténtalo de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
            }),
            title: t({ en: "Entry", es: "Movimiento", fr: "Opération", pt: "Lançamento" }),
            total: t({ en: "Total", es: "Total", fr: "Total", pt: "Total" }),
        },
        kind: {
            expense: t({ en: "Expense", es: "Gasto", fr: "Dépense", pt: "Despesa" }),
            fee: t({ en: "Fee", es: "Comisión", fr: "Frais", pt: "Tarifa" }),
            income: t({ en: "Income", es: "Ingreso", fr: "Revenu", pt: "Receita" }),
            transfer: t({ en: "Transfer", es: "Transferencia", fr: "Virement", pt: "Transferência" }),
        },
        noMatch: {
            filters: t({
                en: "No entries match these filters",
                es: "Ningún movimiento coincide con estos filtros",
                fr: "Aucune opération ne correspond à ces filtres",
                pt: "Nenhum lançamento corresponde a estes filtros",
            }),
            query: insert(
                t({
                    en: "No entries for “{{query}}”",
                    es: "Ningún movimiento para «{{query}}»",
                    fr: "Aucune opération pour « {{query}} »",
                    pt: "Nenhum lançamento para “{{query}}”",
                })
            ),
            searchAll: t({
                en: "Search all time",
                es: "Buscar en todo",
                fr: "Chercher sur toute la période",
                pt: "Buscar em todo o período",
            }),
        },
        recurring: t({ en: "Recurring", es: "Recurrente", fr: "Récurrente", pt: "Recorrente" }),
        search: t({
            en: "Search merchant, note, amount",
            es: "Buscar comercio, nota, monto",
            fr: "Chercher commerçant, note, montant",
            pt: "Buscar estabelecimento, nota, valor",
        }),
        span: {
            all: t({ en: "All", es: "Todo", fr: "Tout", pt: "Tudo" }),
            from: t({ en: "From", es: "Desde", fr: "Du", pt: "De" }),
            range: t({ en: "Dates", es: "Fechas", fr: "Dates", pt: "Datas" }),
            to: t({ en: "To", es: "Hasta", fr: "Au", pt: "Até" }),
        },
        today: t({ en: "Today", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
        transfers: t({ en: "Transfers", es: "Transferencias", fr: "Virements", pt: "Transferências" }),
        yesterday: t({ en: "Yesterday", es: "Ayer", fr: "Hier", pt: "Ontem" }),
    },
    key: "dashboard-transactions",
} satisfies Dictionary;

export default dashboardTransactions;
