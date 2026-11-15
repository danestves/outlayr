import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboard = {
    content: {
        account: {
            connections: t({
                en: "Connections",
                de: "Verbindungen",
                es: "Conexiones",
                fr: "Connexions",
                pt: "Conexões",
            }),
            darkMode: t({
                en: "Dark mode",
                de: "Dunkelmodus",
                es: "Modo oscuro",
                fr: "Mode sombre",
                pt: "Modo escuro",
            }),
            exportData: t({
                en: "Export data",
                de: "Daten exportieren",
                es: "Exportar datos",
                fr: "Exporter les données",
                pt: "Exportar dados",
            }),
            invite: t({
                en: "Invite a friend",
                de: "Freund einladen",
                es: "Invitar a un amigo",
                fr: "Inviter un ami",
                pt: "Convidar um amigo",
            }),
            label: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            plan: t({ en: "Pro plan", de: "Pro-Plan", es: "Plan Pro", fr: "Forfait Pro", pt: "Plano Pro" }),
            settings: t({ en: "Settings", de: "Einstellungen", es: "Ajustes", fr: "Réglages", pt: "Ajustes" }),
            signOut: t({ en: "Sign out", de: "Abmelden", es: "Cerrar sesión", fr: "Se déconnecter", pt: "Sair" }),
            terms: t({
                en: "Terms and privacy",
                de: "Nutzungsbedingungen und Datenschutz",
                es: "Términos y privacidad",
                fr: "Conditions et confidentialité",
                pt: "Termos e privacidade",
            }),
        },
        add: {
            hint: t({
                en: "Add an entry and it shows up here.",
                de: "Füge einen Eintrag hinzu, dann erscheint er hier.",
                es: "Añade un movimiento y aparece aquí.",
                fr: "Ajoutez une opération et elle s'affichera ici.",
                pt: "Adicione um lançamento e ele aparece aqui.",
            }),
            label: t({ en: "Add", de: "Hinzufügen", es: "Añadir", fr: "Ajouter", pt: "Adicionar" }),
            entry: t({
                en: "Add entry",
                de: "Eintrag hinzufügen",
                es: "Añadir movimiento",
                fr: "Ajouter une opération",
                pt: "Adicionar lançamento",
            }),
        },
        loadingLabel: t({
            en: "Loading your ledger",
            de: "Dein Haushaltsbuch wird geladen",
            es: "Cargando tus movimientos",
            fr: "Chargement de vos opérations",
            pt: "Carregando seus lançamentos",
        }),
        filters: {
            accounts: t({ en: "accounts", de: "Konten", es: "cuentas", fr: "comptes", pt: "contas" }),
            accountsChip: t({ en: "Accounts", de: "Konten", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            allAccounts: t({
                en: "All accounts",
                de: "Alle Konten",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            allCategories: t({
                en: "All categories",
                de: "Alle Kategorien",
                es: "Todas las categorías",
                fr: "Toutes les catégories",
                pt: "Todas as categorias",
            }),
            categoryChip: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            clear: t({ en: "Clear", de: "Zurücksetzen", es: "Quitar", fr: "Effacer", pt: "Limpar" }),
            done: t({ en: "Done", de: "Fertig", es: "Listo", fr: "OK", pt: "Concluído" }),
            month: t({ en: "Month", de: "Monat", es: "Mes", fr: "Mois", pt: "Mês" }),
            period: t({ en: "Period", de: "Zeitraum", es: "Periodo", fr: "Période", pt: "Período" }),
            quarter: t({ en: "Quarter", de: "Quartal", es: "Trimestre", fr: "Trimestre", pt: "Trimestre" }),
            recent: t({ en: "Recent", de: "Zuletzt", es: "Recientes", fr: "Récents", pt: "Recentes" }),
            searchAccounts: t({
                en: "Search accounts",
                de: "Konten durchsuchen",
                es: "Buscar cuentas",
                fr: "Rechercher un compte",
                pt: "Buscar contas",
            }),
            searchCategories: t({
                en: "Search categories",
                de: "Kategorien durchsuchen",
                es: "Buscar categorías",
                fr: "Rechercher une catégorie",
                pt: "Buscar categorias",
            }),
            selected: insert(
                t({
                    en: "{{count}} selected",
                    de: "{{count}} ausgewählt",
                    es: "{{count}} seleccionadas",
                    fr: "{{count}} sélectionnées",
                    pt: "{{count}} selecionadas",
                })
            ),
            year: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
            category: insert(
                t({
                    en: "{{name}} filter",
                    de: "Filter {{name}}",
                    es: "Filtro {{name}}",
                    fr: "Filtre {{name}}",
                    pt: "Filtro {{name}}",
                })
            ),
            removeCategory: insert(
                t({
                    en: "Remove {{name}} filter",
                    de: "Filter {{name}} entfernen",
                    es: "Quitar filtro {{name}}",
                    fr: "Retirer le filtre {{name}}",
                    pt: "Remover filtro {{name}}",
                })
            ),
        },
        nav: {
            accounts: t({ en: "Accounts", de: "Konten", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            budgets: t({ en: "Budgets", de: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
            close: t({
                en: "Close menu",
                de: "Menü schließen",
                es: "Cerrar menú",
                fr: "Fermer le menu",
                pt: "Fechar menu",
            }),
            collapse: t({
                en: "Toggle sidebar",
                de: "Seitenleiste umschalten",
                es: "Alternar barra lateral",
                fr: "Afficher ou masquer la barre latérale",
                pt: "Alternar barra lateral",
            }),
            dashboard: t({ en: "Dashboard", de: "Dashboard", es: "Panel", fr: "Tableau de bord", pt: "Painel" }),
            debts: t({ en: "Debts", de: "Schulden", es: "Deudas", fr: "Dettes", pt: "Dívidas" }),
            goals: t({ en: "Goals", de: "Sparziele", es: "Metas", fr: "Objectifs", pt: "Metas" }),
            home: t({
                en: "Outlayr home",
                de: "Outlayr Startseite",
                es: "Inicio de Outlayr",
                fr: "Accueil d'Outlayr",
                pt: "Início do Outlayr",
            }),
            import: t({ en: "Import", de: "Import", es: "Importar", fr: "Importer", pt: "Importar" }),
            insights: t({
                en: "Insights",
                de: "Auswertungen",
                es: "Estadísticas",
                fr: "Statistiques",
                pt: "Estatísticas",
            }),
            installments: t({ en: "Installments", de: "Ratenpläne", es: "Cuotas", fr: "Échéances", pt: "Parcelas" }),
            label: t({ en: "Ledger", de: "Haushaltsbuch", es: "Libro", fr: "Registre", pt: "Registro" }),
            open: t({ en: "Open menu", de: "Menü öffnen", es: "Abrir menú", fr: "Ouvrir le menu", pt: "Abrir menu" }),
            plan: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Forfait", pt: "Plano" }),
            recurring: t({
                en: "Recurring",
                de: "Wiederkehrend",
                es: "Recurrentes",
                fr: "Récurrents",
                pt: "Recorrentes",
            }),
            rules: t({ en: "Rules", de: "Regeln", es: "Reglas", fr: "Règles", pt: "Regras" }),
            search: t({ en: "Search", de: "Suchen", es: "Buscar", fr: "Rechercher", pt: "Buscar" }),
            tools: t({ en: "Tools", de: "Werkzeuge", es: "Herramientas", fr: "Outils", pt: "Ferramentas" }),
            transactions: t({
                en: "Transactions",
                de: "Einträge",
                es: "Movimientos",
                fr: "Opérations",
                pt: "Lançamentos",
            }),
        },
    },
    key: "dashboard",
} satisfies Dictionary;

export default dashboard;
