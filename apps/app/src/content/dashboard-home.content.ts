import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardHome = {
    content: {
        everyDay: {
            aDay: insert(t({ en: "{{amount}} a day", de: "{{amount}} am Tag", es: "{{amount}} al día" })),
            biggest: t({ en: "Biggest", de: "Größter", es: "El mayor" }),
            biggestAfter: t({ en: "Biggest after", de: "Größter nach", es: "El mayor después" }),
            entries: t({ en: "Entries", de: "Einträge", es: "Registros" }),
            emptyLine: t({
                en: "Days fill in as you log entries.",
                de: "Die Tage füllen sich, wenn du Einträge erfasst.",
                es: "Los días se llenan al registrar movimientos.",
            }),
            emptyTitle: t({ en: "Nothing spent yet", de: "Noch nichts ausgegeben", es: "Nada gastado aún" }),
            less: t({ en: "Less", de: "Weniger", es: "Menos" }),
            quietDays: insert(
                t({
                    en: "{{count}} days, no entries",
                    de: "{{count}} Tage, keine Einträge",
                    es: "{{count}} días, sin movimientos",
                })
            ),
            more: t({ en: "More", de: "Mehr", es: "Más" }),
            title: t({ en: "Every day", de: "Jeder Tag", es: "Cada día" }),
            topDay: insert(t({ en: "{{name}} day", de: "Tag: {{name}}", es: "Día de {{name}}" })),
        },
        kpi: {
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos" }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado" }),
            ofSpending: t({ en: "Of spending", de: "Von den Ausgaben", es: "Del gasto" }),
            points: insert(t({ en: "{{points}} pts", de: "{{points}} Pkt.", es: "{{points}} pts" })),
            netWorth: t({ en: "Net worth", de: "Vermögen", es: "Patrimonio" }),
            now: t({ en: "Now", de: "Jetzt", es: "Ahora" }),
            share: insert(
                t({
                    en: "{{percent}}% of income",
                    de: "{{percent}} % der Einnahmen",
                    es: "{{percent}}% de los ingresos",
                })
            ),
            since: insert(t({ en: "since {{day}}", de: "seit {{day}}", es: "desde el {{day}}" })),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado" }),
            versus: insert(t({ en: "vs {{range}}", de: "vs. {{range}}", es: "vs {{range}}" })),
        },
        quiet: {
            spentLine: t({
                en: "Spending against income shows here.",
                de: "Hier siehst du Ausgaben im Verhältnis zu den Einnahmen.",
                es: "Aquí verás tus gastos frente a tus ingresos.",
            }),
            spentTitle: t({
                en: "Nothing in this period",
                de: "Nichts in diesem Zeitraum",
                es: "Nada en este período",
            }),
        },
        setup: {
            accountFrom: insert(
                t({
                    en: "Say where that {{amount}} came from.",
                    de: "Sag, woher diese {{amount}} kamen.",
                    es: "Di de dónde salieron esos {{amount}}.",
                })
            ),
            accountLine: t({
                en: "Add where your money lives.",
                de: "Füge hinzu, wo dein Geld liegt.",
                es: "Añade dónde está tu dinero.",
            }),
            accountTitle: t({ en: "No accounts yet", de: "Noch keine Konten", es: "Aún no hay cuentas" }),
            addAccount: t({ en: "Add account", de: "Konto hinzufügen", es: "Añadir cuenta" }),
            addBudget: t({ en: "Add budget", de: "Budget hinzufügen", es: "Añadir presupuesto" }),
            budgetFirstSpend: insert(
                t({
                    en: "{{name}} is your first spend. Give it a limit.",
                    de: "{{name}} ist deine erste Ausgabe. Gib ihr ein Limit.",
                    es: "{{name}} es tu primer gasto. Ponle un límite.",
                })
            ),
            budgetLine: t({
                en: "Set a limit for a category.",
                de: "Setze ein Limit für eine Kategorie.",
                es: "Pon un límite a una categoría.",
            }),
            daysTitle: t({ en: "No days yet", de: "Noch keine Tage", es: "Aún no hay días" }),
            entryLast: t({
                en: "What did you last pay for?",
                de: "Wofür hast du zuletzt bezahlt?",
                es: "¿Qué fue lo último que pagaste?",
            }),
            entryLine: t({
                en: "Add one, or bring your history with you.",
                de: "Füge einen hinzu oder bring deinen Verlauf mit.",
                es: "Añade uno o trae tu historial.",
            }),
            entryTitle: t({ en: "No transactions yet", de: "Noch keine Einträge", es: "Aún no hay movimientos" }),
            fillsIn: t({
                en: "Fills in with your first entry.",
                de: "Füllt sich mit deinem ersten Eintrag.",
                es: "Se llena con tu primer movimiento.",
            }),
            import: t({ en: "Import", de: "Import", es: "Importar" }),
            logIncome: t({
                en: "Log income to see the share.",
                de: "Erfasse Einnahmen, um den Anteil zu sehen.",
                es: "Registra ingresos para ver la proporción.",
            }),
            phoneHint: t({
                en: "Do this on your phone and it shows up here.",
                de: "Mach das auf deinem Handy, dann erscheint es hier.",
                es: "Hazlo en tu teléfono y aparece aquí.",
            }),
            spent: insert(t({ en: "{{amount}} spent", de: "{{amount}} ausgegeben", es: "{{amount}} gastados" })),
            spentTitle: t({ en: "Nothing spent yet", de: "Noch nichts ausgegeben", es: "Nada gastado aún" }),
            steps: {
                account: t({ en: "Add an account", de: "Konto hinzufügen", es: "Añade una cuenta" }),
                budget: t({ en: "Set a budget", de: "Budget festlegen", es: "Crea un presupuesto" }),
                entry: t({ en: "Log an entry", de: "Eintrag erfassen", es: "Registra un movimiento" }),
            },
            titleAccount: t({
                en: "Start with your first account",
                de: "Starte mit deinem ersten Konto",
                es: "Empieza con tu primera cuenta",
            }),
            titleAccountNext: t({
                en: "Now add your first account",
                de: "Jetzt dein erstes Konto hinzufügen",
                es: "Ahora añade tu primera cuenta",
            }),
            titleBudget: t({
                en: "Last one, set your first budget",
                de: "Zuletzt: dein erstes Budget festlegen",
                es: "Lo último, crea tu primer presupuesto",
            }),
            titleEntry: t({
                en: "Now log your first entry",
                de: "Jetzt deinen ersten Eintrag erfassen",
                es: "Ahora registra tu primer movimiento",
            }),
        },
        spentOfIncome: {
            cashFlow: t({ en: "Cash flow", de: "Cashflow", es: "Flujo de caja" }),
            noIncome: t({ en: "No income", de: "Keine Einnahmen", es: "Sin ingresos" }),
            over: t({ en: "over", de: "drüber", es: "de más" }),
            title: t({ en: "Spent of income", de: "Ausgaben von den Einnahmen", es: "Gastado de ingresos" }),
            whatIf: t({ en: "What if", de: "Was wäre wenn", es: "Y si" }),
            whatIfHint: t({
                en: "Preview only, nothing is saved. Escape returns to the real amount.",
                de: "Nur Vorschau, nichts wird gespeichert. Mit Esc kehrst du zum echten Betrag zurück.",
                es: "Solo una vista previa, no se guarda nada. Escape vuelve al monto real.",
            }),
            shareOfSpent: t({ en: "Share of spent", de: "Anteil an den Ausgaben", es: "Parte del gasto" }),
            whatIfTag: t({ en: "If", de: "Wenn", es: "Si" }),
            wouldKeep: t({ en: "Would keep", de: "Würde übrig bleiben", es: "Ahorrarías" }),
        },
        panel: {
            accounts: t({ en: "Accounts", de: "Konten", es: "Cuentas" }),
            addAnAccount: t({ en: "Add an account", de: "Konto hinzufügen", es: "Añadir una cuenta" }),
            average: insert(t({ en: "Avg {{amount}}", de: "Ø {{amount}}", es: "Prom. {{amount}}" })),
            budgets: t({ en: "Budgets", de: "Budgets", es: "Presupuestos" }),
            budgetsEmptyLine: t({
                en: "Set a monthly limit on a category and track it here.",
                de: "Lege ein Monatslimit für eine Kategorie fest und verfolge es hier.",
                es: "Pon un límite mensual a una categoría y síguelo aquí.",
            }),
            budgetsEmptyTitle: t({ en: "No budgets yet", de: "Noch keine Budgets", es: "Aún no hay presupuestos" }),
            budgetEnded: insert(t({ en: "Ended {{day}}", de: "Beendet {{day}}", es: "Terminó el {{day}}" })),
            budgetFilter: t({ en: "Filter", de: "Filter", es: "Filtrar" }),
            budgetLeft: t({ en: "Left", de: "Übrig", es: "Queda" }),
            budgetOverTotal: t({ en: "Over", de: "Drüber", es: "De más" }),
            budgetResets: insert(
                t({ en: "Resets {{day}}", de: "Wird zurückgesetzt {{day}}", es: "Se renueva el {{day}}" })
            ),
            budgetShowLess: t({ en: "Show less", de: "Weniger anzeigen", es: "Ver menos" }),
            budgetUsed: insert(
                t({
                    en: "{{name}}: {{percent}}% used",
                    de: "{{name}}: {{percent}} % verbraucht",
                    es: "{{name}}: {{percent}} % usado",
                })
            ),
            noSubcategory: t({ en: "No subcategory", de: "Keine Unterkategorie", es: "Sin subcategoría" }),
            onTrackLabel: t({ en: "On track", de: "Im Plan", es: "En regla" }),
            overCount: insert(t({ en: "{{count}} over", de: "{{count}} drüber", es: "{{count}} excedidos" })),
            overAmount: insert(t({ en: "{{amount}} over", de: "{{amount}} drüber", es: "{{amount}} de más" })),
            onTrackCount: insert(
                t({ en: "{{count}} of {{total}}", de: "{{count}} von {{total}}", es: "{{count}} de {{total}}" })
            ),
            byAccount: t({ en: "By account", de: "Nach Konto", es: "Por cuenta" }),
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día" }),
            left: insert(
                t({
                    en: "{{amount}} left of budget",
                    de: "{{amount}} vom Budget übrig",
                    es: "Quedan {{amount}} del presupuesto",
                })
            ),
            moreAccounts: insert(t({ en: "{{count}} more", de: "{{count}} weitere", es: "{{count}} más" })),
            net: insert(t({ en: "Net {{amount}}", de: "Netto {{amount}}", es: "Neto {{amount}}" })),
            noAccounts: t({ en: "No accounts yet.", de: "Noch keine Konten.", es: "Aún no hay cuentas." }),
            of: t({ en: "of", de: "von", es: "de" }),
            over: t({ en: "over", de: "drüber", es: "de más" }),
            overBudget: insert(
                t({
                    en: "{{amount}} over budget",
                    de: "{{amount}} über dem Budget",
                    es: "{{amount}} sobre el presupuesto",
                })
            ),
            peak: insert(t({ en: "Peak {{day}}", de: "Spitze {{day}}", es: "Máximo {{day}}" })),
            ranOut: insert(
                t({
                    en: "Ran out {{day}}, {{days}} days early.",
                    de: "Aufgebraucht {{day}}, {{days}} Tage zu früh.",
                    es: "Se agotó el {{day}}, {{days}} días antes.",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{day}}, 1 day early.",
                    de: "Aufgebraucht {{day}}, 1 Tag zu früh.",
                    es: "Se agotó el {{day}}, 1 día antes.",
                })
            ),
            share: t({ en: "Share", de: "Anteil", es: "Parte" }),
            upcoming: t({ en: "Upcoming", de: "Anstehend", es: "Próximos" }),
            versus: t({ en: "vs last 3 months", de: "vs. letzte 3 Monate", es: "vs los últimos 3 meses" }),
        },
        transactions: {
            all: t({ en: "All", de: "Alle", es: "Todos", fr: "Tout", pt: "Tudo" }),
            expenses: t({ en: "Expenses", de: "Ausgaben", es: "Gastos", fr: "Dépenses", pt: "Despesas" }),
            incomeTab: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            seeAll: t({ en: "See all", de: "Alle anzeigen", es: "Ver todos", fr: "Tout voir", pt: "Ver tudo" }),
            showLess: t({
                en: "Show less",
                de: "Weniger anzeigen",
                es: "Ver menos",
                fr: "Voir moins",
                pt: "Ver menos",
            }),
            shownOf: insert(
                t({
                    en: "{{shown}} of {{total}}",
                    de: "{{shown}} von {{total}}",
                    es: "{{shown}} de {{total}}",
                    fr: "{{shown}} sur {{total}}",
                    pt: "{{shown}} de {{total}}",
                })
            ),
            transferFee: t({
                en: "Transfer fee",
                de: "Umbuchungsgebühr",
                es: "Comisión de transferencia",
                fr: "Frais de virement",
                pt: "Tarifa de transferência",
            }),
            columns: {
                account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
                amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
                category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
                date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
                merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Comerciante" }),
                note: t({ en: "Note", de: "Notiz", es: "Nota", fr: "Note", pt: "Nota" }),
            },
            arrived: insert(
                t({
                    en: "{{amount}} arrived",
                    de: "{{amount}} eingegangen",
                    es: "Llegaron {{amount}}",
                    fr: "{{amount}} reçus",
                    pt: "{{amount}} recebidos",
                })
            ),
            cardFee: t({
                en: "Card fee",
                de: "Kartengebühr",
                es: "Comisión de tarjeta",
                fr: "Frais de carte",
                pt: "Tarifa do cartão",
            }),
            count: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            feeWord: t({ en: "fee", de: "Gebühr", es: "comisión", fr: "frais", pt: "tarifa" }),
            backTo: insert(
                t({
                    en: "Back to {{month}}",
                    de: "Zurück zu {{month}}",
                    es: "Volver a {{month}}",
                    fr: "Retour à {{month}}",
                    pt: "Voltar para {{month}}",
                })
            ),
            countOne: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            noAccount: t({ en: "No account", de: "Kein Konto", es: "Sin cuenta", fr: "Sans compte", pt: "Sem conta" }),
            quietLine: insert(
                t({
                    en: "Nothing logged between {{from}} and {{to}}.",
                    de: "Zwischen {{from}} und {{to}} wurde nichts erfasst.",
                    es: "Nada registrado entre {{from}} y {{to}}.",
                    fr: "Rien d'enregistré entre {{from}} et {{to}}.",
                    pt: "Nada registrado entre {{from}} e {{to}}.",
                })
            ),
            quietTitle: t({
                en: "No entries found",
                de: "Keine Einträge gefunden",
                es: "No se encontraron movimientos",
                fr: "Aucune opération trouvée",
                pt: "Nenhum lançamento encontrado",
            }),
            empty: t({
                en: "No entries in this view.",
                de: "Keine Einträge in dieser Ansicht.",
                es: "No hay movimientos en esta vista.",
                fr: "Aucune opération dans cette vue.",
                pt: "Nenhum lançamento nesta visão.",
            }),
            next: t({
                en: "Next page",
                de: "Nächste Seite",
                es: "Página siguiente",
                fr: "Page suivante",
                pt: "Próxima página",
            }),
            previous: t({
                en: "Previous page",
                de: "Vorherige Seite",
                es: "Página anterior",
                fr: "Page précédente",
                pt: "Página anterior",
            }),
            range: insert(
                t({
                    en: "{{from}}-{{to}} of {{total}}",
                    de: "{{from}}-{{to}} von {{total}}",
                    es: "{{from}}-{{to}} de {{total}}",
                    fr: "{{from}}-{{to}} sur {{total}}",
                    pt: "{{from}}-{{to}} de {{total}}",
                })
            ),
            sort: {
                label: t({ en: "Sort", de: "Sortieren", es: "Orden", fr: "Tri", pt: "Ordem" }),
                largest: t({
                    en: "Largest",
                    de: "Größte",
                    es: "Mayor monto",
                    fr: "Montant le plus élevé",
                    pt: "Maior valor",
                }),
                newest: t({
                    en: "Newest",
                    de: "Neueste",
                    es: "Más recientes",
                    fr: "Plus récentes",
                    pt: "Mais recentes",
                }),
                oldest: t({
                    en: "Oldest",
                    de: "Älteste",
                    es: "Más antiguos",
                    fr: "Plus anciennes",
                    pt: "Mais antigos",
                }),
            },
            title: t({ en: "Transactions", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            transfer: t({ en: "Transfer", de: "Umbuchung", es: "Transferencia", fr: "Virement", pt: "Transferência" }),
        },
        uncategorized: t({ en: "Uncategorized", de: "Ohne Kategorie", es: "Sin categoría" }),
    },
    key: "dashboard-home",
} satisfies Dictionary;

export default dashboardHome;
