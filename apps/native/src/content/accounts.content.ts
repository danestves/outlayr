import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const accounts = {
    content: {
        "accounts.a11y.balanceSign": t({
            en: "Toggle balance sign",
            es: "Cambiar el signo del saldo",
            pt: "Alternar o sinal do saldo",
        }),
        "accounts.a11y.edit": t({
            en: "Edit account",
            es: "Editar cuenta",
            pt: "Editar conta",
        }),
        "accounts.a11y.editBalance": t({
            en: "Edit balance",
            es: "Editar el saldo",
            pt: "Editar o saldo",
        }),
        "accounts.a11y.reorder": t({
            en: "Reorder accounts",
            es: "Reordenar cuentas",
            pt: "Reordenar contas",
        }),
        "accounts.add.account": t({
            en: "An account",
            es: "Una cuenta",
            pt: "Uma conta",
        }),
        "accounts.add.installments": t({
            en: "A purchase in installments",
            es: "Una compra en cuotas",
            "es-ES": "Una compra a plazos",
            pt: "Uma compra parcelada",
        }),
        "accounts.add.prompt": t({
            en: "Add an account, card or person",
            es: "Agrega una cuenta, tarjeta o persona",
            "es-ES": "Añade una cuenta, tarjeta o persona",
            pt: "Adicione uma conta, cartão ou pessoa",
        }),
        "accounts.addAccount": t({
            en: "Add Account",
            es: "Agregar cuenta",
            "es-ES": "Añadir cuenta",
            pt: "Adicionar conta",
        }),
        "accounts.census_one": t({
            en: "{count} account",
            es: "{count} cuenta",
            pt: "{count} conta",
        }),
        "accounts.census_other": t({
            en: "{count} accounts",
            es: "{count} cuentas",
            pt: "{count} contas",
        }),
        "accounts.chart.approximate": t({
            en: "Approximate",
            es: "Aproximado",
            pt: "Aproximado",
        }),
        "accounts.chart.heading": t({
            en: "Balance history",
            es: "Historial del saldo",
            pt: "Histórico do saldo",
        }),
        "accounts.chart.summary": t({
            en: "Balance history. {amount} on {date}.",
            es: "Historial del saldo. {amount} el {date}.",
            pt: "Histórico do saldo. {amount} em {date}.",
        }),
        "accounts.chart.summaryApproximate": t({
            en: "Balance history. Approximately {amount} on {date}.",
            es: "Historial del saldo. Aproximadamente {amount} el {date}.",
            pt: "Histórico do saldo. Aproximadamente {amount} em {date}.",
        }),
        "accounts.detail.empty": t({
            en: "Nothing attached yet — this account's transactions will gather here.",
            es: "Todavía no hay nada. Aquí vas a ver las transacciones de esta cuenta.",
            pt: "Ainda não há nada. Os lançamentos desta conta vão aparecer aqui.",
        }),
        "accounts.detail.startedAt": t({
            en: "Started at {amount} · {month}",
            es: "Empezó con {amount} · {month}",
            pt: "Começou com {amount} · {month}",
        }),
        "accounts.empty": t({
            en: "Money lives in places. Give yours its first one.",
            es: "El dinero vive en lugares. Dale al tuyo el primero.",
            pt: "O dinheiro mora em lugares. Dê ao seu o primeiro.",
        }),
        "accounts.error.deleteTitle": t({
            en: "Couldn't Delete Account",
            es: "No se pudo eliminar la cuenta",
            pt: "Não foi possível apagar a conta",
        }),
        "accounts.error.generic": t({
            en: "Something went wrong. Please try again.",
            es: "Algo salió mal. Inténtalo de nuevo.",
            pt: "Algo deu errado. Tente de novo.",
        }),
        "accounts.error.saveFailed": t({
            en: "Couldn't save this account. Try again.",
            es: "No se pudo guardar la cuenta. Inténtalo de nuevo.",
            pt: "Não foi possível salvar a conta. Tente de novo.",
        }),
        "accounts.field.balance": t({
            en: "Balance",
            es: "Saldo",
            pt: "Saldo",
        }),
        "accounts.field.currency": t({
            en: "Currency",
            es: "Moneda",
            pt: "Moeda",
        }),
        "accounts.field.kind": t({
            en: "Money I owe",
            es: "Dinero que debo",
            pt: "Dinheiro que eu devo",
        }),
        "accounts.field.name": t({
            en: "Name",
            es: "Nombre",
            pt: "Nome",
        }),
        "accounts.multiCurrency": t({
            en: "Multi-currency",
            es: "Multimoneda",
            pt: "Multimoeda",
        }),
        "accounts.namePlaceholder": t({
            en: "Chase, Cash, Nubank…",
            es: "Chase, Efectivo, Nubank…",
            "es-ES": "BBVA, Efectivo, Revolut…",
            pt: "Nubank, Dinheiro, Itaú…",
        }),
        "accounts.nav.edit": t({
            en: "Edit Account",
            es: "Editar cuenta",
            pt: "Editar conta",
        }),
        "accounts.nav.new": t({
            en: "New Account",
            es: "Nueva cuenta",
            pt: "Nova conta",
        }),
        "accounts.nav.newLiability": t({
            en: "New Card or Loan",
            es: "Nueva tarjeta o préstamo",
            pt: "Novo cartão ou empréstimo",
        }),
        "accounts.overview.heading": t({
            en: "Accounts",
            es: "Cuentas",
            pt: "Contas",
        }),
        "accounts.overview.more": t({
            en: "and {count} more",
            es: "y {count} más",
            pt: "e mais {count}",
        }),
        "accounts.overview.openHint": t({
            en: "Opens all accounts",
            es: "Abre todas las cuentas",
            pt: "Abre todas as contas",
        }),
        "accounts.overview.owed": t({
            en: "Owed",
            es: "Deuda",
            pt: "Dívida",
        }),
        "accounts.reorderTitle": t({
            en: "Reorder Accounts",
            es: "Reordenar cuentas",
            pt: "Reordenar contas",
        }),
        "accounts.saveAccount": t({
            en: "Save Account",
            es: "Guardar cuenta",
            pt: "Salvar conta",
        }),
        "accounts.section.liabilities": t({
            en: "Cards & loans",
            es: "Tarjetas y préstamos",
            pt: "Cartões e empréstimos",
        }),
        "accounts.section.people": t({
            en: "People",
            es: "Personas",
            pt: "Pessoas",
        }),
        "accounts.title": t({
            en: "Accounts",
            es: "Cuentas",
            pt: "Contas",
        }),
        "accounts.totals.have": t({
            en: "Have",
            es: "Tienes",
            pt: "Você tem",
        }),
        "accounts.totals.owe": t({
            en: "Owe",
            es: "Debes",
            pt: "Você deve",
        }),
        "accounts.undo.body": t({
            en: "Its transactions are kept — they just stop belonging to an account.",
            es: "Sus transacciones se conservan; solo dejan de pertenecer a una cuenta.",
            pt: "Os lançamentos são mantidos; só deixam de pertencer a uma conta.",
        }),
        "accounts.undo.deleted": t({
            en: "Account deleted",
            es: "Cuenta eliminada",
            pt: "Conta apagada",
        }),
    },
    key: "accounts" as const,
} satisfies Dictionary;

export default accounts;
