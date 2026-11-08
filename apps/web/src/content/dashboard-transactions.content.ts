import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardTransactions = {
    content: {
        amount: {
            chip: t({ en: "Amount", es: "Monto" }),
            max: t({ en: "At most", es: "Como máximo" }),
            min: t({ en: "At least", es: "Como mínimo" }),
        },
        clearFilters: t({ en: "Clear filters", es: "Quitar filtros" }),
        csv: {
            account: t({ en: "Account", es: "Cuenta" }),
            amount: t({ en: "Amount", es: "Monto" }),
            category: t({ en: "Category", es: "Categoría" }),
            currency: t({ en: "Currency", es: "Moneda" }),
            date: t({ en: "Date", es: "Fecha" }),
            inMain: insert(t({ en: "Amount in {{currency}}", es: "Monto en {{currency}}" })),
            merchant: t({ en: "Merchant", es: "Comercio" }),
            type: t({ en: "Type", es: "Tipo" }),
        },
        detail: {
            arrived: t({ en: "Arrived", es: "Llegó" }),
            charged: t({ en: "Charged", es: "Cobrado" }),
            close: t({ en: "Close", es: "Cerrar" }),
            date: t({ en: "Date", es: "Fecha" }),
            editOnPhone: t({ en: "Edit this on your phone.", es: "Edítalo en tu teléfono." }),
            fee: t({ en: "Fee", es: "Comisión" }),
            from: t({ en: "From", es: "Desde" }),
            next: t({ en: "Next entry", es: "Movimiento siguiente" }),
            note: t({ en: "Note", es: "Nota" }),
            previous: t({ en: "Previous entry", es: "Movimiento anterior" }),
            rate: t({ en: "Rate", es: "Tasa" }),
            repeats: t({ en: "Repeats", es: "Se repite" }),
            sent: t({ en: "Sent", es: "Enviado" }),
            to: t({ en: "To", es: "Hacia" }),
        },
        empty: {
            line: t({
                en: "Log one on your phone and it shows up here.",
                es: "Registra uno en tu teléfono y aparece aquí.",
            }),
            title: t({ en: "No entries yet", es: "Aún no hay movimientos" }),
        },
        export: t({ en: "Export", es: "Exportar" }),
        exportFile: t({ en: "outlayr-transactions", es: "outlayr-movimientos" }),
        footer: {
            in: t({ en: "In", es: "Entró" }),
            net: t({ en: "Net", es: "Neto" }),
            out: t({ en: "Out", es: "Salió" }),
        },
        kind: {
            expense: t({ en: "Expense", es: "Gasto" }),
            fee: t({ en: "Fee", es: "Comisión" }),
            income: t({ en: "Income", es: "Ingreso" }),
            transfer: t({ en: "Transfer", es: "Transferencia" }),
        },
        noMatch: {
            filters: t({ en: "No entries match these filters", es: "Ningún movimiento coincide con estos filtros" }),
            query: insert(t({ en: "No entries for “{{query}}”", es: "Ningún movimiento para «{{query}}»" })),
            searchAll: t({ en: "Search all time", es: "Buscar en todo" }),
        },
        recurring: t({ en: "Recurring", es: "Recurrente" }),
        search: t({ en: "Search merchant, note, amount", es: "Buscar comercio, nota, monto" }),
        span: {
            all: t({ en: "All", es: "Todo" }),
            from: t({ en: "From", es: "Desde" }),
            range: t({ en: "Dates", es: "Fechas" }),
            to: t({ en: "To", es: "Hasta" }),
        },
        today: t({ en: "Today", es: "Hoy" }),
        transfers: t({ en: "Transfers", es: "Transferencias" }),
        yesterday: t({ en: "Yesterday", es: "Ayer" }),
    },
    key: "dashboard-transactions",
} satisfies Dictionary;

export default dashboardTransactions;
