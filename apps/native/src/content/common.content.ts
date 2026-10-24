import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const common = {
    content: {
        "common.back": t({
            en: "Back",
            es: "Atrás",
        }),
        "common.cancel": t({
            en: "Cancel",
            es: "Cancelar",
        }),
        "common.clearSearch": t({
            en: "Clear search",
            es: "Borrar búsqueda",
        }),
        "common.close": t({
            en: "Close",
            es: "Cerrar",
        }),
        "common.confirmHint": t({
            en: "Double tap to confirm",
            es: "Toca dos veces para confirmar",
        }),
        "common.continue": t({
            en: "Continue",
            es: "Continuar",
        }),
        "common.delete": t({
            en: "Delete",
            es: "Eliminar",
        }),
        "common.discard.body": t({
            en: "Your changes won't be saved.",
            es: "Tus cambios no se guardarán.",
        }),
        "common.discard.confirm": t({
            en: "Discard",
            es: "Descartar",
        }),
        "common.discard.discarded": t({
            en: "Edits discarded",
            es: "Cambios descartados",
        }),
        "common.discard.keep": t({
            en: "Keep editing",
            es: "Seguir editando",
        }),
        "common.discard.restoreFailed": t({
            en: "Edits not restored",
            es: "No se restauraron los cambios",
        }),
        "common.discard.restoreFailedBody": t({
            en: "It was changed or deleted in the meantime.",
            es: "Se modificó o se eliminó mientras tanto.",
        }),
        "common.discard.title": t({
            en: "Discard changes?",
            es: "¿Descartar los cambios?",
        }),
        "common.done": t({
            en: "Done",
            es: "Listo",
        }),
        "common.edit": t({
            en: "Edit",
            es: "Editar",
        }),
        "common.expense": t({
            en: "Expense",
            es: "Gasto",
        }),
        "common.hidden": t({
            en: "Hidden",
            es: "Oculto",
        }),
        "common.income": t({
            en: "Income",
            es: "Ingreso",
        }),
        "common.moveDown": t({
            en: "Move down",
            es: "Mover hacia abajo",
        }),
        "common.moveUp": t({
            en: "Move up",
            es: "Mover hacia arriba",
        }),
        "common.never": t({
            en: "Never",
            es: "Nunca",
        }),
        "common.next": t({
            en: "Next",
            es: "Siguiente",
        }),
        "common.off": t({
            en: "Off",
            es: "Desactivado",
        }),
        "common.on": t({
            en: "On",
            es: "Activado",
        }),
        "common.retry": t({
            en: "Try Again",
            es: "Reintentar",
        }),
        "common.save": t({
            en: "Save",
            es: "Guardar",
        }),
        "common.shown": t({
            en: "Shown",
            es: "Visible",
        }),
        "common.today": t({
            en: "Today",
            es: "Hoy",
        }),
        "common.tomorrow": t({
            en: "Tomorrow",
            es: "Mañana",
        }),
        "common.undo": t({
            en: "Undo",
            es: "Deshacer",
        }),
        "common.yesterday": t({
            en: "Yesterday",
            es: "Ayer",
        }),
        "error.boundary.body": t({
            en: "Outlayr hit an unexpected error. Your data is untouched — try again.",
            es: "Outlayr tuvo un error inesperado. Tus datos están intactos. Inténtalo de nuevo.",
        }),
        "error.boundary.title": t({
            en: "Something Went Wrong",
            es: "Algo salió mal",
        }),
        "nav.categories": t({
            en: "Categories",
            es: "Categorías",
        }),
        "nav.editCategory": t({
            en: "Edit Category",
            es: "Editar categoría",
        }),
        "nav.newCategory": t({
            en: "New Category",
            es: "Nueva categoría",
        }),
        "nav.newSubcategory": t({
            en: "New Subcategory",
            es: "Nueva subcategoría",
        }),
        "nav.newTransaction": t({
            en: "New Transaction",
            es: "Nueva transacción",
        }),
        "nav.search": t({
            en: "Search",
            es: "Buscar",
        }),
        "nav.settings.about": t({
            en: "About and credits",
            es: "Acerca de y créditos",
        }),
        "nav.settings.account": t({
            en: "Account",
            es: "Cuenta",
        }),
        "nav.settings.appIcon": t({
            en: "App icon",
            es: "Ícono de la app",
        }),
        "nav.settings.autoLog": t({
            en: "Auto-logging",
            es: "Registro automático",
        }),
        "nav.settings.currency": t({
            en: "Currency",
            es: "Moneda",
        }),
        "nav.settings.erase": t({
            en: "Erase data",
            es: "Borrar datos",
        }),
        "nav.settings.export": t({
            en: "Export data",
            es: "Exportar datos",
        }),
        "nav.settings.featureLab": t({
            en: "Feature lab",
            es: "Laboratorio de funciones",
        }),
        "nav.settings.notifications": t({
            en: "Notifications",
            es: "Notificaciones",
        }),
        "nav.settings.restore": t({
            en: "Restore data",
            es: "Restaurar datos",
        }),
        "nav.settings.time": t({
            en: "Time frames",
            es: "Períodos de tiempo",
        }),
        "nav.settings.upcoming": t({
            en: "Upcoming entries",
            es: "Próximos registros",
        }),
        "nav.settings.usage": t({
            en: "Usage",
            es: "Uso",
        }),
        "nav.settings.wallet": t({
            en: "Apple Pay",
            es: "Apple Pay",
        }),
        "nav.subcategory": t({
            en: "Subcategory",
            es: "Subcategoría",
        }),
        "nav.tab.budgets": t({
            en: "Budgets",
            es: "Presupuestos",
        }),
        "nav.tab.insights": t({
            en: "Insights",
            es: "Estadísticas",
        }),
        "nav.tab.log": t({
            en: "Log",
            es: "Registro",
        }),
        "nav.tab.settings": t({
            en: "Settings",
            es: "Configuración",
        }),
        "notFound.action": t({
            en: "Back to the Log",
            es: "Volver al registro",
        }),
        "notFound.body": t({
            en: "That link does not point anywhere in Outlayr. Your ledger is where you left it.",
            es: "Ese enlace no lleva a ninguna parte en Outlayr. Tu registro sigue donde lo dejaste.",
        }),
        "notFound.navTitle": t({
            en: "Not Found",
            es: "No encontrado",
        }),
        "notFound.title": t({
            en: "Nothing Here",
            es: "Aquí no hay nada",
        }),
        // Not the overall budget's label: this row deep-links to one category's cap.
        "spotlight.budget.fallback": t({
            en: "Budget",
            es: "Presupuesto",
        }),
        // Lowercase: a Spotlight keyword is a term someone types, not a label the app renders.
        "spotlight.budget.keyword": t({
            en: "budget",
            es: "presupuesto",
        }),
        "spotlight.budget.limit": t({
            en: "Limit {amount}",
            es: "Límite {amount}",
        }),
        "spotlight.budget.title": t({
            en: "{name} budget",
            es: "Presupuesto de {name}",
        }),
        "spotlight.entry": t({
            en: "Entry",
            es: "Registro",
        }),
    },
    key: "common" as const,
} satisfies Dictionary;

export default common;
