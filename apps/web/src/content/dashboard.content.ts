import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboard = {
    content: {
        account: {
            connections: t({ en: "Connections", es: "Conexiones" }),
            darkMode: t({ en: "Dark mode", es: "Modo oscuro" }),
            exportData: t({ en: "Export data", es: "Exportar datos" }),
            invite: t({ en: "Invite a friend", es: "Invitar a un amigo" }),
            label: t({ en: "Account", es: "Cuenta" }),
            plan: t({ en: "Pro plan", es: "Plan Pro" }),
            settings: t({ en: "Settings", es: "Ajustes" }),
            signOut: t({ en: "Sign out", es: "Cerrar sesión" }),
            terms: t({ en: "Terms and privacy", es: "Términos y privacidad" }),
        },
        add: {
            hint: t({
                en: "Add entries on your phone and they show up here.",
                es: "Añade movimientos en tu teléfono y aparecen aquí.",
            }),
            label: t({ en: "Add", es: "Añadir" }),
            entry: t({ en: "Add entry", es: "Añadir movimiento" }),
        },
        loadingLabel: t({ en: "Loading your ledger", es: "Cargando tus movimientos" }),
        filters: {
            accounts: t({ en: "accounts", es: "cuentas" }),
            accountsChip: t({ en: "Accounts", es: "Cuentas" }),
            allAccounts: t({ en: "All accounts", es: "Todas las cuentas" }),
            allCategories: t({ en: "All categories", es: "Todas las categorías" }),
            categoryChip: t({ en: "Category", es: "Categoría" }),
            clear: t({ en: "Clear", es: "Quitar" }),
            quarter: t({ en: "Quarter", es: "Trimestre" }),
            recent: t({ en: "Recent", es: "Recientes" }),
            searchAccounts: t({ en: "Search accounts", es: "Buscar cuentas" }),
            searchCategories: t({ en: "Search categories", es: "Buscar categorías" }),
            selected: insert(t({ en: "{{count}} selected", es: "{{count}} seleccionadas" })),
            year: t({ en: "Year", es: "Año" }),
            category: insert(t({ en: "{{name}} filter", es: "Filtro {{name}}" })),
            removeCategory: insert(t({ en: "Remove {{name}} filter", es: "Quitar filtro {{name}}" })),
        },
        nav: {
            accounts: t({ en: "Accounts", es: "Cuentas" }),
            budgets: t({ en: "Budgets", es: "Presupuestos" }),
            collapse: t({ en: "Toggle sidebar", es: "Alternar barra lateral" }),
            dashboard: t({ en: "Dashboard", es: "Panel" }),
            debts: t({ en: "Debts", es: "Deudas" }),
            goals: t({ en: "Goals", es: "Metas" }),
            home: t({ en: "Outlayr home", es: "Inicio de Outlayr" }),
            import: t({ en: "Import", es: "Importar" }),
            insights: t({ en: "Insights", es: "Estadísticas" }),
            installments: t({ en: "Installments", es: "Cuotas" }),
            label: t({ en: "Ledger", es: "Libro" }),
            plan: t({ en: "Plan", es: "Plan" }),
            recurring: t({ en: "Recurring", es: "Recurrentes" }),
            rules: t({ en: "Rules", es: "Reglas" }),
            search: t({ en: "Search", es: "Buscar" }),
            tools: t({ en: "Tools", es: "Herramientas" }),
            transactions: t({ en: "Transactions", es: "Movimientos" }),
        },
    },
    key: "dashboard",
} satisfies Dictionary;

export default dashboard;
