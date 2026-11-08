import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardSettings = {
    content: {
        title: t({ en: "Settings", es: "Configuración", fr: "Réglages", pt: "Ajustes" }),
        saveFailed: t({
            en: "Couldn't save that change. Try again.",
            es: "No se pudo guardar ese cambio. Inténtalo de nuevo.",
            fr: "Impossible d'enregistrer ce changement. Réessayez.",
            pt: "Não foi possível salvar essa alteração. Tente novamente.",
        }),
        sections: {
            preferences: t({ en: "Preferences", es: "Preferencias", fr: "Préférences", pt: "Preferências" }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            time: t({ en: "Time", es: "Tiempo", fr: "Temps", pt: "Tempo" }),
        },
        money: {
            title: t({ en: "Money", es: "Dinero", fr: "Argent", pt: "Dinheiro" }),
            showCents: t({
                en: "Show cents",
                es: "Mostrar centavos",
                fr: "Afficher les centimes",
                pt: "Mostrar centavos",
            }),
            incomeTracking: t({
                en: "Income tracking",
                es: "Seguimiento de ingresos",
                fr: "Suivi des revenus",
                pt: "Controle de receitas",
            }),
        },
        appearance: {
            title: t({ en: "Appearance", es: "Apariencia", fr: "Apparence", pt: "Aparência" }),
            theme: t({ en: "Theme", es: "Tema", fr: "Thème", pt: "Tema" }),
            system: t({ en: "System", es: "Sistema", fr: "Système", pt: "Sistema" }),
            light: t({ en: "Light", es: "Claro", fr: "Clair", pt: "Claro" }),
            dark: t({ en: "Dark", es: "Oscuro", fr: "Sombre", pt: "Escuro" }),
            themeHint: t({
                en: "This browser only",
                es: "Solo en este navegador",
                fr: "Ce navigateur uniquement",
                pt: "Somente neste navegador",
            }),
            accent: t({ en: "Accent", es: "Acento", fr: "Couleur d'accent", pt: "Cor de destaque" }),
            animatedCharts: t({
                en: "Animated charts",
                es: "Gráficos animados",
                fr: "Graphiques animés",
                pt: "Gráficos animados",
            }),
            accents: {
                vermilion: t({ en: "Vermilion", es: "Bermellón", fr: "Vermillon", pt: "Vermelhão" }),
                plum: t({ en: "Plum", es: "Ciruela", fr: "Prune", pt: "Ameixa" }),
                ochre: t({ en: "Ochre", es: "Ocre", fr: "Ocre", pt: "Ocre" }),
                prussian: t({ en: "Prussian", es: "Azul de Prusia", fr: "Bleu de Prusse", pt: "Azul da Prússia" }),
                pine: t({ en: "Pine", es: "Pino", fr: "Pin", pt: "Pinho" }),
            },
        },
        upcoming: {
            title: t({
                en: "Upcoming entries",
                es: "Próximos registros",
                fr: "Opérations à venir",
                pt: "Próximos lançamentos",
            }),
            show: t({
                en: "Show on the Log",
                es: "Mostrar en el registro",
                fr: "Afficher dans le Journal",
                pt: "Mostrar em Lançamentos",
            }),
            showHint: t({
                en: "The next few sit at the top of the Log on your phone, above today.",
                es: "Los próximos aparecen al inicio del registro en tu teléfono, encima de hoy.",
                fr: "Les prochaines s'affichent en haut du Journal sur votre téléphone, au-dessus d'aujourd'hui.",
                pt: "Os próximos ficam no topo da aba Lançamentos no seu telefone, acima de hoje.",
            }),
            soon: t({
                en: "Limit to 14-Day Outlook",
                es: "Limitar a 14 días",
                fr: "Limiter aux 14 prochains jours",
                pt: "Limitar a 14 dias",
            }),
        },
        lab: {
            title: t({ en: "Feature lab", es: "Laboratorio de funciones", fr: "Labo", pt: "Laboratório de recursos" }),
            experimental: t({
                en: "Experimental: these can change or disappear.",
                es: "Experimental: esto puede cambiar o desaparecer.",
                fr: "Expérimental : ces options peuvent changer ou disparaître.",
                pt: "Experimental: isto pode mudar ou desaparecer.",
            }),
            confetti: t({
                en: "Celebrate expenses",
                es: "Celebrar gastos",
                fr: "Fêter les dépenses",
                pt: "Celebrar despesas",
            }),
            confettiNote: t({
                en: "Throws confetti over a transaction the moment you add it.",
                es: "Lanza confeti sobre una transacción en el momento en que la agregas.",
                fr: "Lance des confettis sur une opération dès que vous l'ajoutez.",
                pt: "Joga confete sobre um lançamento assim que você o adiciona.",
            }),
            lineGraph: t({
                en: "Show line graph",
                es: "Mostrar gráfico de líneas",
                fr: "Afficher la courbe",
                pt: "Mostrar gráfico de linha",
            }),
            budgetRows: t({
                en: "Budget rows",
                es: "Filas de presupuesto",
                fr: "Lignes de budget",
                pt: "Orçamentos em linhas",
            }),
            budgetRowsNote: t({
                en: "Off lays the budgets out as a two-up grid instead of a list.",
                es: "Si lo desactivas, los presupuestos se muestran en una cuadrícula de dos en dos en vez de una lista.",
                fr: "Désactivé, les budgets s'affichent en grille sur deux colonnes au lieu d'une liste.",
                pt: "Se desativado, os orçamentos aparecem em uma grade, dois por linha, em vez de uma lista.",
            }),
            swapTime: t({
                en: "Replace time label",
                es: "Reemplazar etiqueta de hora",
                fr: "Remplacer l'heure",
                pt: "Trocar o horário pela categoria",
            }),
            swapTimeNote: t({
                en: "Each transaction shows its category instead of its time.",
                es: "Cada transacción muestra su categoría en vez de su hora.",
                fr: "Chaque opération affiche sa catégorie au lieu de son heure.",
                pt: "Cada lançamento mostra a categoria em vez do horário.",
            }),
        },
        time: {
            starts: t({ en: "Starts on", es: "Empieza en", fr: "Commence le", pt: "Começa em" }),
            week: t({ en: "Week", es: "Semana", fr: "Semaine", pt: "Semana" }),
            month: t({ en: "Month", es: "Mes", fr: "Mois", pt: "Mês" }),
            monday: t({ en: "Monday", es: "Lunes", fr: "Lundi", pt: "Segunda-feira" }),
            sunday: t({ en: "Sunday", es: "Domingo", fr: "Dimanche", pt: "Domingo" }),
            weekNote: insert(
                t({
                    en: "This week: {{range}}",
                    es: "Esta semana: {{range}}",
                    fr: "Cette semaine : {{range}}",
                    pt: "Esta semana: {{range}}",
                })
            ),
            monthNote: insert(
                t({
                    en: "This month: {{range}}",
                    es: "Este mes: {{range}}",
                    fr: "Ce mois-ci : {{range}}",
                    pt: "Este mês: {{range}}",
                })
            ),
            day: insert(t({ en: "Day {{day}}", es: "Día {{day}}", fr: "Jour {{day}}", pt: "Dia {{day}}" })),
            format: t({ en: "Format", es: "Formato", fr: "Format", pt: "Formato" }),
            clock: t({ en: "Clock", es: "Reloj", fr: "Horloge", pt: "Relógio" }),
            twelveHour: t({ en: "12-hour", es: "12 horas", fr: "12 heures", pt: "12 horas" }),
            twentyFourHour: t({ en: "24-hour", es: "24 horas", fr: "24 heures", pt: "24 horas" }),
            timeZone: t({ en: "Time zone", es: "Zona horaria", fr: "Fuseau horaire", pt: "Fuso horário" }),
            timeZoneHint: t({
                en: "Follows your phone",
                es: "Sigue a tu teléfono",
                fr: "Suit votre téléphone",
                pt: "Segue o seu telefone",
            }),
            notSet: t({ en: "Not set", es: "Sin definir", fr: "Non défini", pt: "Não definido" }),
        },
        currency: {
            main: t({ en: "Main currency", es: "Moneda principal", fr: "Devise principale", pt: "Moeda principal" }),
            mainHint: t({
                en: "Totals convert to it at each day's rate",
                es: "Los totales se convierten a ella con la tasa de cada día",
                fr: "Les totaux sont convertis au taux de chaque jour",
                pt: "Os totais são convertidos com a cotação de cada dia",
            }),
            change: t({ en: "Change", es: "Cambiar", fr: "Changer", pt: "Alterar" }),
            format: t({ en: "Format", es: "Formato", fr: "Format", pt: "Formato" }),
            search: t({
                en: "Search currencies",
                es: "Buscar monedas",
                fr: "Rechercher une devise",
                pt: "Buscar moedas",
            }),
            inUse: t({ en: "In your accounts", es: "En tus cuentas", fr: "Dans vos comptes", pt: "Nas suas contas" }),
            all: t({ en: "All currencies", es: "Todas las monedas", fr: "Toutes les devises", pt: "Todas as moedas" }),
            none: t({
                en: "No currency matches",
                es: "Ninguna moneda coincide",
                fr: "Aucune devise trouvée",
                pt: "Nenhuma moeda encontrada",
            }),
            byCurrency: t({
                en: "Accounts by currency",
                es: "Cuentas por moneda",
                fr: "Comptes par devise",
                pt: "Contas por moeda",
            }),
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            balance: t({ en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" }),
            noAccounts: t({
                en: "No accounts yet",
                es: "Aún no hay cuentas",
                fr: "Aucun compte pour l'instant",
                pt: "Nenhuma conta ainda",
            }),
            close: t({ en: "Close", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        },
    },
    key: "dashboard-settings",
} satisfies Dictionary;

export default dashboardSettings;
