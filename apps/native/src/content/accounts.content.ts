import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const accounts = {
    content: {
        "accounts.a11y.balanceSign": t({
            en: "Toggle balance sign",
            es: "Cambiar el signo del saldo",
        }),
        "accounts.a11y.edit": t({
            en: "Edit account",
            es: "Editar cuenta",
        }),
        "accounts.a11y.editBalance": t({
            en: "Edit balance",
            es: "Editar el saldo",
        }),
        "accounts.a11y.reorder": t({
            en: "Reorder accounts",
            es: "Reordenar cuentas",
        }),
        "accounts.add.account": t({
            en: "An account",
            es: "Una cuenta",
        }),
        "accounts.add.installments": t({
            en: "A purchase in installments",
            es: "Una compra en cuotas",
        }),
        "accounts.add.prompt": t({
            en: "Add an account, card or person",
            es: "Agrega una cuenta, tarjeta o persona",
        }),
        "accounts.addAccount": t({
            en: "Add Account",
            es: "Agregar cuenta",
        }),
        "accounts.census_one": t({
            en: "{count} account",
            es: "{count} cuenta",
        }),
        "accounts.census_other": t({
            en: "{count} accounts",
            es: "{count} cuentas",
        }),
        "accounts.chart.approximate": t({
            en: "Approximate",
            es: "Aproximado",
        }),
        "accounts.chart.heading": t({
            en: "Balance history",
            es: "Historial del saldo",
        }),
        "accounts.chart.summary": t({
            en: "Balance history. {amount} on {date}.",
            es: "Historial del saldo. {amount} el {date}.",
        }),
        "accounts.chart.summaryApproximate": t({
            en: "Balance history. Approximately {amount} on {date}.",
            es: "Historial del saldo. Aproximadamente {amount} el {date}.",
        }),
        "accounts.detail.empty": t({
            en: "Nothing attached yet — this account's transactions will gather here.",
            es: "Todavía no hay nada. Aquí vas a ver las transacciones de esta cuenta.",
        }),
        "accounts.detail.startedAt": t({
            en: "Started at {amount} · {month}",
            es: "Empezó con {amount} · {month}",
        }),
        "accounts.empty": t({
            en: "Money lives in places. Give yours its first one.",
            es: "El dinero vive en lugares. Dale al tuyo el primero.",
        }),
        "accounts.error.deleteTitle": t({
            en: "Couldn't Delete Account",
            es: "No se pudo eliminar la cuenta",
        }),
        "accounts.error.generic": t({
            en: "Something went wrong. Please try again.",
            es: "Algo salió mal. Inténtalo de nuevo.",
        }),
        "accounts.error.saveFailed": t({
            en: "Couldn't save this account. Try again.",
            es: "No se pudo guardar la cuenta. Inténtalo de nuevo.",
        }),
        "accounts.field.balance": t({
            en: "Balance",
            es: "Saldo",
        }),
        "accounts.field.currency": t({
            en: "Currency",
            es: "Moneda",
        }),
        "accounts.field.kind": t({
            en: "Money I owe",
            es: "Dinero que debo",
        }),
        "accounts.field.name": t({
            en: "Name",
            es: "Nombre",
        }),
        "accounts.multiCurrency": t({
            en: "Multi-currency",
            es: "Multimoneda",
        }),
        "accounts.namePlaceholder": t({
            en: "Chase, Cash, Nubank…",
            es: "Chase, Efectivo, Nubank…",
        }),
        "accounts.nav.edit": t({
            en: "Edit Account",
            es: "Editar cuenta",
        }),
        "accounts.nav.new": t({
            en: "New Account",
            es: "Nueva cuenta",
        }),
        "accounts.nav.newLiability": t({
            en: "New Card or Loan",
            es: "Nueva tarjeta o préstamo",
        }),
        "accounts.overview.heading": t({
            en: "Accounts",
            es: "Cuentas",
        }),
        "accounts.overview.more": t({
            en: "and {count} more",
            es: "y {count} más",
        }),
        "accounts.overview.openHint": t({
            en: "Opens all accounts",
            es: "Abre todas las cuentas",
        }),
        "accounts.overview.owed": t({
            en: "Owed",
            es: "Deuda",
        }),
        "accounts.reorderTitle": t({
            en: "Reorder Accounts",
            es: "Reordenar cuentas",
        }),
        "accounts.saveAccount": t({
            en: "Save Account",
            es: "Guardar cuenta",
        }),
        "accounts.section.liabilities": t({
            en: "Cards & loans",
            es: "Tarjetas y préstamos",
        }),
        "accounts.section.people": t({
            en: "People",
            es: "Personas",
        }),
        "accounts.title": t({
            en: "Accounts",
            es: "Cuentas",
        }),
        "accounts.totals.have": t({
            en: "Have",
            es: "Tienes",
        }),
        "accounts.totals.owe": t({
            en: "Owe",
            es: "Debes",
        }),
        "accounts.undo.body": t({
            en: "Its transactions are kept — they just stop belonging to an account.",
            es: "Sus transacciones se conservan; solo dejan de pertenecer a una cuenta.",
        }),
        "accounts.undo.deleted": t({
            en: "Account deleted",
            es: "Cuenta eliminada",
        }),
    },
    key: "accounts" as const,
} satisfies Dictionary;

export default accounts;
