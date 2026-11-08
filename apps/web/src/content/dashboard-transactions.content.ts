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
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            editOnPhone: t({
                en: "Edit this on your phone.",
                es: "Edítalo en tu teléfono.",
                fr: "Modifiez-la sur votre téléphone.",
                pt: "Edite no seu celular.",
            }),
            fee: t({ en: "Fee", es: "Comisión", fr: "Frais", pt: "Tarifa" }),
            from: t({ en: "From", es: "Desde", fr: "De", pt: "De" }),
            next: t({
                en: "Next entry",
                es: "Movimiento siguiente",
                fr: "Opération suivante",
                pt: "Próximo lançamento",
            }),
            note: t({ en: "Note", es: "Nota", fr: "Note", pt: "Nota" }),
            previous: t({
                en: "Previous entry",
                es: "Movimiento anterior",
                fr: "Opération précédente",
                pt: "Lançamento anterior",
            }),
            rate: t({ en: "Rate", es: "Tasa", fr: "Taux", pt: "Taxa de câmbio" }),
            repeats: t({ en: "Repeats", es: "Se repite", fr: "Récurrente", pt: "Repete" }),
            to: t({ en: "To", es: "Hacia", fr: "Vers", pt: "Para" }),
        },
        empty: {
            line: t({
                en: "Log one on your phone and it shows up here.",
                es: "Registra uno en tu teléfono y aparece aquí.",
                fr: "Enregistrez-en une sur votre téléphone et elle s'affichera ici.",
                pt: "Registre um no celular e ele aparece aqui.",
            }),
            title: t({
                en: "No entries yet",
                es: "Aún no hay movimientos",
                fr: "Aucune opération pour l'instant",
                pt: "Nenhum lançamento ainda",
            }),
        },
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
