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
                en: "Add an entry and it shows up here.",
                es: "Añade un movimiento y aparece aquí.",
                fr: "Ajoutez une opération et elle s'affichera ici.",
                pt: "Adicione um lançamento e ele aparece aqui.",
            }),
            label: t({ en: "Add", es: "Añadir", fr: "Ajouter", pt: "Adicionar" }),
            entry: t({
                en: "Add entry",
                es: "Añadir movimiento",
                fr: "Ajouter une opération",
                pt: "Adicionar lançamento",
            }),
        },
        loadingLabel: t({ en: "Loading your ledger", es: "Cargando tus movimientos" }),
        filters: {
            accounts: t({ en: "accounts", es: "cuentas", fr: "comptes", pt: "contas" }),
            accountsChip: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            allAccounts: t({
                en: "All accounts",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            allCategories: t({
                en: "All categories",
                es: "Todas las categorías",
                fr: "Toutes les catégories",
                pt: "Todas as categorias",
            }),
            categoryChip: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            clear: t({ en: "Clear", es: "Quitar", fr: "Effacer", pt: "Limpar" }),
            done: t({ en: "Done", es: "Listo", fr: "OK", pt: "Concluído" }),
            month: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
            period: t({ en: "Period", es: "Periodo", fr: "Période", pt: "Período" }),
            quarter: t({ en: "Quarter", es: "Trimestre", fr: "Trimestre", pt: "Trimestre" }),
            recent: t({ en: "Recent", es: "Recientes", fr: "Récents", pt: "Recentes" }),
            searchAccounts: t({
                en: "Search accounts",
                es: "Buscar cuentas",
                fr: "Rechercher un compte",
                pt: "Buscar contas",
            }),
            searchCategories: t({
                en: "Search categories",
                es: "Buscar categorías",
                fr: "Rechercher une catégorie",
                pt: "Buscar categorias",
            }),
            selected: insert(
                t({
                    en: "{{count}} selected",
                    es: "{{count}} seleccionadas",
                    fr: "{{count}} sélectionnées",
                    pt: "{{count}} selecionadas",
                })
            ),
            year: t({ en: "Year", es: "Año", fr: "Année", pt: "Ano" }),
            category: insert(
                t({ en: "{{name}} filter", es: "Filtro {{name}}", fr: "Filtre {{name}}", pt: "Filtro {{name}}" })
            ),
            removeCategory: insert(
                t({
                    en: "Remove {{name}} filter",
                    es: "Quitar filtro {{name}}",
                    fr: "Retirer le filtre {{name}}",
                    pt: "Remover filtro {{name}}",
                })
            ),
        },
        nav: {
            accounts: t({ en: "Accounts", es: "Cuentas" }),
            budgets: t({ en: "Budgets", es: "Presupuestos" }),
            close: t({ en: "Close menu", es: "Cerrar menú" }),
            collapse: t({ en: "Toggle sidebar", es: "Alternar barra lateral" }),
            dashboard: t({ en: "Dashboard", es: "Panel" }),
            debts: t({ en: "Debts", es: "Deudas" }),
            goals: t({ en: "Goals", es: "Metas" }),
            home: t({ en: "Outlayr home", es: "Inicio de Outlayr" }),
            import: t({ en: "Import", es: "Importar" }),
            insights: t({ en: "Insights", es: "Estadísticas" }),
            installments: t({ en: "Installments", es: "Cuotas" }),
            label: t({ en: "Ledger", es: "Libro" }),
            open: t({ en: "Open menu", es: "Abrir menú" }),
            plan: t({ en: "Plan", es: "Plan" }),
            recurring: t({ en: "Recurring", es: "Recurrentes" }),
            rules: t({ en: "Rules", es: "Reglas" }),
            search: t({ en: "Search", es: "Buscar" }),
            soon: t({ en: "Soon", es: "Pronto" }),
            tools: t({ en: "Tools", es: "Herramientas" }),
            transactions: t({ en: "Transactions", es: "Movimientos" }),
        },
    },
    key: "dashboard",
} satisfies Dictionary;

export default dashboard;
