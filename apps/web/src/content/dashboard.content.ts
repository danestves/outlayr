import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboard = {
    content: {
        account: {
            connections: t({ en: "Connections", es: "Conexiones", fr: "Connexions", pt: "Conexões" }),
            darkMode: t({ en: "Dark mode", es: "Modo oscuro", fr: "Mode sombre", pt: "Modo escuro" }),
            exportData: t({
                en: "Export data",
                es: "Exportar datos",
                fr: "Exporter les données",
                pt: "Exportar dados",
            }),
            invite: t({
                en: "Invite a friend",
                es: "Invitar a un amigo",
                fr: "Inviter un ami",
                pt: "Convidar um amigo",
            }),
            label: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            plan: t({ en: "Pro plan", es: "Plan Pro", fr: "Forfait Pro", pt: "Plano Pro" }),
            settings: t({ en: "Settings", es: "Ajustes", fr: "Réglages", pt: "Ajustes" }),
            signOut: t({ en: "Sign out", es: "Cerrar sesión", fr: "Se déconnecter", pt: "Sair" }),
            terms: t({
                en: "Terms and privacy",
                es: "Términos y privacidad",
                fr: "Conditions et confidentialité",
                pt: "Termos e privacidade",
            }),
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
        loadingLabel: t({
            en: "Loading your ledger",
            es: "Cargando tus movimientos",
            fr: "Chargement de vos opérations",
            pt: "Carregando seus lançamentos",
        }),
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
            accounts: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            budgets: t({ en: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
            close: t({ en: "Close menu", es: "Cerrar menú", fr: "Fermer le menu", pt: "Fechar menu" }),
            collapse: t({
                en: "Toggle sidebar",
                es: "Alternar barra lateral",
                fr: "Afficher ou masquer la barre latérale",
                pt: "Alternar barra lateral",
            }),
            dashboard: t({ en: "Dashboard", es: "Panel", fr: "Tableau de bord", pt: "Painel" }),
            debts: t({ en: "Debts", es: "Deudas", fr: "Dettes", pt: "Dívidas" }),
            goals: t({ en: "Goals", es: "Metas", fr: "Objectifs", pt: "Metas" }),
            home: t({ en: "Outlayr home", es: "Inicio de Outlayr", fr: "Accueil d'Outlayr", pt: "Início do Outlayr" }),
            import: t({ en: "Import", es: "Importar", fr: "Importer", pt: "Importar" }),
            insights: t({ en: "Insights", es: "Estadísticas", fr: "Statistiques", pt: "Estatísticas" }),
            installments: t({ en: "Installments", es: "Cuotas", fr: "Échéances", pt: "Parcelas" }),
            label: t({ en: "Ledger", es: "Libro", fr: "Registre", pt: "Registro" }),
            open: t({ en: "Open menu", es: "Abrir menú", fr: "Ouvrir le menu", pt: "Abrir menu" }),
            plan: t({ en: "Plan", es: "Plan", fr: "Forfait", pt: "Plano" }),
            recurring: t({ en: "Recurring", es: "Recurrentes", fr: "Récurrents", pt: "Recorrentes" }),
            rules: t({ en: "Rules", es: "Reglas", fr: "Règles", pt: "Regras" }),
            search: t({ en: "Search", es: "Buscar", fr: "Rechercher", pt: "Buscar" }),
            soon: t({ en: "Soon", es: "Pronto", fr: "Bientôt", pt: "Em breve" }),
            tools: t({ en: "Tools", es: "Herramientas", fr: "Outils", pt: "Ferramentas" }),
            transactions: t({ en: "Transactions", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
        },
    },
    key: "dashboard",
} satisfies Dictionary;

export default dashboard;
