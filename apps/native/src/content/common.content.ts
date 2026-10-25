import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const common = {
    content: {
        "common.back": t({
            en: "Back",
            es: "Atrás",
            pt: "Voltar",
        }),
        "common.cancel": t({
            en: "Cancel",
            es: "Cancelar",
            pt: "Cancelar",
        }),
        "common.clearSearch": t({
            en: "Clear search",
            es: "Borrar búsqueda",
            pt: "Limpar busca",
        }),
        "common.close": t({
            en: "Close",
            es: "Cerrar",
            pt: "Fechar",
        }),
        "common.confirmHint": t({
            en: "Double tap to confirm",
            es: "Toca dos veces para confirmar",
            pt: "Toque duas vezes para confirmar",
        }),
        "common.continue": t({
            en: "Continue",
            es: "Continuar",
            pt: "Continuar",
        }),
        "common.delete": t({
            en: "Delete",
            es: "Eliminar",
            pt: "Apagar",
        }),
        "common.discard.body": t({
            en: "Your changes won't be saved.",
            es: "Tus cambios no se guardarán.",
            pt: "Suas alterações não serão salvas.",
        }),
        "common.discard.confirm": t({
            en: "Discard",
            es: "Descartar",
            pt: "Descartar",
        }),
        "common.discard.discarded": t({
            en: "Edits discarded",
            es: "Cambios descartados",
            pt: "Alterações descartadas",
        }),
        "common.discard.keep": t({
            en: "Keep editing",
            es: "Seguir editando",
            pt: "Continuar editando",
        }),
        "common.discard.restoreFailed": t({
            en: "Edits not restored",
            es: "No se restauraron los cambios",
            pt: "Alterações não restauradas",
        }),
        "common.discard.restoreFailedBody": t({
            en: "It was changed or deleted in the meantime.",
            es: "Se modificó o se eliminó mientras tanto.",
            pt: "Foi alterado ou apagado nesse meio-tempo.",
        }),
        "common.discard.title": t({
            en: "Discard changes?",
            es: "¿Descartar los cambios?",
            pt: "Descartar alterações?",
        }),
        "common.done": t({
            en: "Done",
            es: "Listo",
            pt: "OK",
        }),
        "common.edit": t({
            en: "Edit",
            es: "Editar",
            pt: "Editar",
        }),
        "common.expense": t({
            en: "Expense",
            es: "Gasto",
            pt: "Despesa",
        }),
        "common.hidden": t({
            en: "Hidden",
            es: "Oculto",
            pt: "Oculto",
        }),
        "common.income": t({
            en: "Income",
            es: "Ingreso",
            pt: "Receita",
        }),
        "common.moveDown": t({
            en: "Move down",
            es: "Mover hacia abajo",
            pt: "Mover para baixo",
        }),
        "common.moveUp": t({
            en: "Move up",
            es: "Mover hacia arriba",
            pt: "Mover para cima",
        }),
        "common.never": t({
            en: "Never",
            es: "Nunca",
            pt: "Nunca",
        }),
        "common.next": t({
            en: "Next",
            es: "Siguiente",
            pt: "Próximo",
        }),
        "common.off": t({
            en: "Off",
            es: "Desactivado",
            pt: "Desativado",
        }),
        "common.on": t({
            en: "On",
            es: "Activado",
            pt: "Ativado",
        }),
        "common.retry": t({
            en: "Try Again",
            es: "Reintentar",
            pt: "Tentar de novo",
        }),
        "common.save": t({
            en: "Save",
            es: "Guardar",
            pt: "Salvar",
        }),
        "common.shown": t({
            en: "Shown",
            es: "Visible",
            pt: "Visível",
        }),
        "common.today": t({
            en: "Today",
            es: "Hoy",
            pt: "Hoje",
        }),
        "common.tomorrow": t({
            en: "Tomorrow",
            es: "Mañana",
            pt: "Amanhã",
        }),
        "common.undo": t({
            en: "Undo",
            es: "Deshacer",
            pt: "Desfazer",
        }),
        "common.yesterday": t({
            en: "Yesterday",
            es: "Ayer",
            pt: "Ontem",
        }),
        "error.boundary.body": t({
            en: "Outlayr hit an unexpected error. Your data is untouched — try again.",
            es: "Outlayr tuvo un error inesperado. Tus datos están intactos. Inténtalo de nuevo.",
            pt: "O Outlayr encontrou um erro inesperado. Seus dados estão intactos. Tente de novo.",
        }),
        "error.boundary.title": t({
            en: "Something Went Wrong",
            es: "Algo salió mal",
            pt: "Algo deu errado",
        }),
        "nav.categories": t({
            en: "Categories",
            es: "Categorías",
            pt: "Categorias",
        }),
        "nav.editCategory": t({
            en: "Edit Category",
            es: "Editar categoría",
            pt: "Editar categoria",
        }),
        "nav.newCategory": t({
            en: "New Category",
            es: "Nueva categoría",
            pt: "Nova categoria",
        }),
        "nav.newSubcategory": t({
            en: "New Subcategory",
            es: "Nueva subcategoría",
            pt: "Nova subcategoria",
        }),
        "nav.newTransaction": t({
            en: "New Transaction",
            es: "Nueva transacción",
            pt: "Novo lançamento",
        }),
        "nav.search": t({
            en: "Search",
            es: "Buscar",
            pt: "Buscar",
        }),
        "nav.settings.about": t({
            en: "About and credits",
            es: "Acerca de y créditos",
            pt: "Sobre e créditos",
        }),
        "nav.settings.account": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "nav.settings.appIcon": t({
            en: "App icon",
            es: "Ícono de la app",
            pt: "Ícone do app",
        }),
        "nav.settings.currency": t({
            en: "Currency",
            es: "Moneda",
            pt: "Moeda",
        }),
        "nav.settings.erase": t({
            en: "Erase data",
            es: "Borrar datos",
            pt: "Apagar dados",
        }),
        "nav.settings.export": t({
            en: "Export data",
            es: "Exportar datos",
            pt: "Exportar dados",
        }),
        "nav.settings.featureLab": t({
            en: "Feature lab",
            es: "Laboratorio de funciones",
            pt: "Laboratório de recursos",
        }),
        "nav.settings.integrations": t({
            en: "Integrations",
            es: "Integraciones",
            pt: "Integrações",
        }),
        "nav.settings.notifications": t({
            en: "Notifications",
            es: "Notificaciones",
            pt: "Notificações",
        }),
        "nav.settings.restore": t({
            en: "Restore data",
            es: "Restaurar datos",
            pt: "Restaurar dados",
        }),
        "nav.settings.time": t({
            en: "Time frames",
            es: "Períodos de tiempo",
            pt: "Períodos",
        }),
        "nav.settings.upcoming": t({
            en: "Upcoming entries",
            es: "Próximos registros",
            pt: "Próximos lançamentos",
        }),
        "nav.settings.usage": t({
            en: "Usage",
            es: "Uso",
            pt: "Uso",
        }),
        "nav.settings.wallet": t({
            en: "Apple Pay",
            es: "Apple Pay",
            pt: "Apple Pay",
        }),
        "nav.settings.wallet.android": t({
            en: "Google Wallet and banks",
            es: "Google Wallet y bancos",
            pt: "Google Wallet e bancos",
        }),
        "nav.subcategory": t({
            en: "Subcategory",
            es: "Subcategoría",
            pt: "Subcategoria",
        }),
        "nav.tab.budgets": t({
            en: "Budgets",
            es: "Presupuestos",
            pt: "Orçamentos",
        }),
        "nav.tab.insights": t({
            en: "Insights",
            es: "Estadísticas",
            pt: "Estatísticas",
        }),
        "nav.tab.log": t({
            en: "Log",
            es: "Registro",
            pt: "Lançamentos",
        }),
        "nav.tab.settings": t({
            en: "Settings",
            es: "Configuración",
            pt: "Ajustes",
        }),
        "notFound.action": t({
            en: "Back to the Log",
            es: "Volver al registro",
            pt: "Voltar para Lançamentos",
        }),
        "notFound.body": t({
            en: "That link does not point anywhere in Outlayr. Your ledger is where you left it.",
            es: "Ese enlace no lleva a ninguna parte en Outlayr. Tu registro sigue donde lo dejaste.",
            pt: "Esse link não leva a lugar nenhum no Outlayr. Seus lançamentos continuam onde você deixou.",
        }),
        "notFound.navTitle": t({
            en: "Not Found",
            es: "No encontrado",
            pt: "Não encontrado",
        }),
        "notFound.title": t({
            en: "Nothing Here",
            es: "Aquí no hay nada",
            pt: "Nada aqui",
        }),
        // Not the overall budget's label: this row deep-links to one category's cap.
        "spotlight.budget.fallback": t({
            en: "Budget",
            es: "Presupuesto",
            pt: "Orçamento",
        }),
        // Lowercase: a Spotlight keyword is a term someone types, not a label the app renders.
        "spotlight.budget.keyword": t({
            en: "budget",
            es: "presupuesto",
            pt: "orçamento",
        }),
        "spotlight.budget.limit": t({
            en: "Limit {amount}",
            es: "Límite {amount}",
            pt: "Limite {amount}",
        }),
        "spotlight.budget.title": t({
            en: "{name} budget",
            es: "Presupuesto de {name}",
            pt: "Orçamento de {name}",
        }),
        "spotlight.entry": t({
            en: "Entry",
            es: "Registro",
            pt: "Lançamento",
        }),
    },
    key: "common" as const,
} satisfies Dictionary;

export default common;
