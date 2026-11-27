import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardHome = {
    content: {
        everyDay: {
            aDay: insert(
                t({
                    en: "{{amount}} a day",
                    de: "{{amount}} am Tag",
                    es: "{{amount}} al día",
                    fr: "{{amount}} par jour",
                    pt: "{{amount}} por dia",
                })
            ),
            biggest: t({ en: "Biggest", de: "Größter", es: "El mayor", fr: "Le plus élevé", pt: "Maior" }),
            biggestAfter: t({
                en: "Biggest after",
                de: "Größter nach",
                es: "El mayor después",
                fr: "Le plus élevé ensuite",
                pt: "Maior depois",
            }),
            entries: t({ en: "Entries", de: "Einträge", es: "Registros", fr: "Opérations", pt: "Lançamentos" }),
            emptyLine: t({
                en: "Days fill in as you log entries.",
                de: "Die Tage füllen sich, wenn du Einträge erfasst.",
                es: "Los días se llenan al registrar movimientos.",
                fr: "Les jours se remplissent au fil de vos opérations.",
                pt: "Os dias se preenchem conforme você lança.",
            }),
            emptyTitle: t({
                en: "Nothing spent yet",
                de: "Noch nichts ausgegeben",
                es: "Nada gastado aún",
                fr: "Aucune dépense pour l'instant",
                pt: "Nada gasto ainda",
            }),
            less: t({ en: "Less", de: "Weniger", es: "Menos", fr: "Moins", pt: "Menos" }),
            quietDays: insert(
                t({
                    en: "{{count}} days, no entries",
                    de: "{{count}} Tage, keine Einträge",
                    es: "{{count}} días, sin movimientos",
                    fr: "{{count}} jours, aucune opération",
                    pt: "{{count}} dias, sem lançamentos",
                })
            ),
            more: t({ en: "More", de: "Mehr", es: "Más", fr: "Plus", pt: "Mais" }),
            title: t({ en: "Every day", de: "Jeder Tag", es: "Cada día", fr: "Chaque jour", pt: "Todo dia" }),
            topDay: insert(
                t({
                    en: "{{name}} day",
                    de: "Tag: {{name}}",
                    es: "Día de {{name}}",
                    fr: "Jour {{name}}",
                    pt: "Dia de {{name}}",
                })
            ),
            monthTitle: t({ en: "Every month", de: "Jeder Monat", es: "Cada mes", fr: "Chaque mois", pt: "Todo mês" }),
            highest: t({ en: "Highest", de: "Höchster", es: "El más alto", fr: "Le plus haut", pt: "Maior" }),
            lowest: t({ en: "Lowest", de: "Niedrigster", es: "El más bajo", fr: "Le plus bas", pt: "Menor" }),
            oneEntry: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            manyEntries: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
        },
        kpi: {
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado", fr: "Épargné", pt: "Guardado" }),
            ofSpending: t({
                en: "Of spending",
                de: "Von den Ausgaben",
                es: "Del gasto",
                fr: "Des dépenses",
                pt: "Das despesas",
            }),
            points: insert(
                t({
                    en: "{{points}} pts",
                    de: "{{points}} Pkt.",
                    es: "{{points}} pts",
                    fr: "{{points}} pts",
                    pt: "{{points}} pts",
                })
            ),
            netWorth: t({ en: "Net worth", de: "Vermögen", es: "Patrimonio", fr: "Patrimoine", pt: "Patrimônio" }),
            now: t({ en: "Now", de: "Jetzt", es: "Ahora", fr: "Maintenant", pt: "Agora" }),
            share: insert(
                t({
                    en: "{{percent}}% of income",
                    de: "{{percent}} % der Einnahmen",
                    es: "{{percent}}% de los ingresos",
                    fr: "{{percent}} % des revenus",
                    pt: "{{percent}}% das receitas",
                })
            ),
            since: insert(
                t({
                    en: "since {{day}}",
                    de: "seit {{day}}",
                    es: "desde el {{day}}",
                    fr: "depuis le {{day}}",
                    pt: "desde {{day}}",
                })
            ),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            versus: insert(
                t({
                    en: "vs {{range}}",
                    de: "vs. {{range}}",
                    es: "vs {{range}}",
                    fr: "vs {{range}}",
                    pt: "vs {{range}}",
                })
            ),
        },
        quiet: {
            spentLine: t({
                en: "Spending against income shows here.",
                de: "Hier siehst du Ausgaben im Verhältnis zu den Einnahmen.",
                es: "Aquí verás tus gastos frente a tus ingresos.",
                fr: "Les dépenses par rapport aux revenus apparaissent ici.",
                pt: "Os gastos frente às receitas aparecem aqui.",
            }),
            spentTitle: t({
                en: "Nothing in this period",
                de: "Nichts in diesem Zeitraum",
                es: "Nada en este período",
                fr: "Rien sur cette période",
                pt: "Nada neste período",
            }),
        },
        setup: {
            accountFrom: insert(
                t({
                    en: "Say where that {{amount}} came from.",
                    de: "Sag, woher diese {{amount}} kamen.",
                    es: "Di de dónde salieron esos {{amount}}.",
                    fr: "Dites d'où viennent ces {{amount}}.",
                    pt: "Diga de onde vieram esses {{amount}}.",
                })
            ),
            accountLine: t({
                en: "Add where your money lives.",
                de: "Füge hinzu, wo dein Geld liegt.",
                es: "Añade dónde está tu dinero.",
                fr: "Ajoutez où se trouve votre argent.",
                pt: "Adicione onde seu dinheiro fica.",
            }),
            accountTitle: t({
                en: "No accounts yet",
                de: "Noch keine Konten",
                es: "Aún no hay cuentas",
                fr: "Aucun compte pour l'instant",
                pt: "Nenhuma conta ainda",
            }),
            addAccount: t({
                en: "Add account",
                de: "Konto hinzufügen",
                es: "Añadir cuenta",
                fr: "Ajouter un compte",
                pt: "Adicionar conta",
            }),
            addBudget: t({
                en: "Add budget",
                de: "Budget hinzufügen",
                es: "Añadir presupuesto",
                fr: "Ajouter un budget",
                pt: "Adicionar orçamento",
            }),
            budgetFirstSpend: insert(
                t({
                    en: "{{name}} is your first spend. Give it a limit.",
                    de: "{{name}} ist deine erste Ausgabe. Gib ihr ein Limit.",
                    es: "{{name}} es tu primer gasto. Ponle un límite.",
                    fr: "{{name}} est votre première dépense. Fixez-lui une limite.",
                    pt: "{{name}} é seu primeiro gasto. Defina um limite.",
                })
            ),
            budgetLine: t({
                en: "Set a limit for a category.",
                de: "Setze ein Limit für eine Kategorie.",
                es: "Pon un límite a una categoría.",
                fr: "Définissez une limite pour une catégorie.",
                pt: "Defina um limite para uma categoria.",
            }),
            daysTitle: t({
                en: "No days yet",
                de: "Noch keine Tage",
                es: "Aún no hay días",
                fr: "Pas encore de jours",
                pt: "Ainda sem dias",
            }),
            entryLast: t({
                en: "What did you last pay for?",
                de: "Wofür hast du zuletzt bezahlt?",
                es: "¿Qué fue lo último que pagaste?",
                fr: "Qu'avez-vous payé en dernier ?",
                pt: "Qual foi seu último pagamento?",
            }),
            entryLine: t({
                en: "Add one, or bring your history with you.",
                de: "Füge einen hinzu oder bring deinen Verlauf mit.",
                es: "Añade uno o trae tu historial.",
                fr: "Ajoutez-en une ou importez votre historique.",
                pt: "Adicione um ou traga seu histórico.",
            }),
            entryTitle: t({
                en: "No transactions yet",
                de: "Noch keine Einträge",
                es: "Aún no hay movimientos",
                fr: "Pas encore d'opérations",
                pt: "Ainda sem lançamentos",
            }),
            fillsIn: t({
                en: "Fills in with your first entry.",
                de: "Füllt sich mit deinem ersten Eintrag.",
                es: "Se llena con tu primer movimiento.",
                fr: "Se remplit avec votre première opération.",
                pt: "Se preenche com seu primeiro lançamento.",
            }),
            import: t({ en: "Import", de: "Import", es: "Importar", fr: "Importer", pt: "Importar" }),
            logIncome: t({
                en: "Log income to see the share.",
                de: "Erfasse Einnahmen, um den Anteil zu sehen.",
                es: "Registra ingresos para ver la proporción.",
                fr: "Enregistrez des revenus pour voir la part.",
                pt: "Registre receitas para ver a proporção.",
            }),
            phoneHint: t({
                en: "Do this on your phone and it shows up here.",
                de: "Mach das auf deinem Handy, dann erscheint es hier.",
                es: "Hazlo en tu teléfono y aparece aquí.",
                fr: "Faites-le sur votre téléphone et cela apparaîtra ici.",
                pt: "Faça isso no seu telefone e aparece aqui.",
            }),
            spent: insert(
                t({
                    en: "{{amount}} spent",
                    de: "{{amount}} ausgegeben",
                    es: "{{amount}} gastados",
                    fr: "{{amount}} dépensés",
                    pt: "{{amount}} gastos",
                })
            ),
            spentTitle: t({
                en: "Nothing spent yet",
                de: "Noch nichts ausgegeben",
                es: "Nada gastado aún",
                fr: "Aucune dépense pour l'instant",
                pt: "Nada gasto ainda",
            }),
            steps: {
                account: t({
                    en: "Add an account",
                    de: "Konto hinzufügen",
                    es: "Añade una cuenta",
                    fr: "Ajouter un compte",
                    pt: "Adicionar uma conta",
                }),
                budget: t({
                    en: "Set a budget",
                    de: "Budget festlegen",
                    es: "Crea un presupuesto",
                    fr: "Créer un budget",
                    pt: "Criar um orçamento",
                }),
                entry: t({
                    en: "Log an entry",
                    de: "Eintrag erfassen",
                    es: "Registra un movimiento",
                    fr: "Enregistrer une opération",
                    pt: "Registrar um lançamento",
                }),
            },
            titleAccount: t({
                en: "Start with your first account",
                de: "Starte mit deinem ersten Konto",
                es: "Empieza con tu primera cuenta",
                fr: "Commencez par votre premier compte",
                pt: "Comece com sua primeira conta",
            }),
            titleAccountNext: t({
                en: "Now add your first account",
                de: "Jetzt dein erstes Konto hinzufügen",
                es: "Ahora añade tu primera cuenta",
                fr: "Ajoutez maintenant votre premier compte",
                pt: "Agora adicione sua primeira conta",
            }),
            titleBudget: t({
                en: "Last one, set your first budget",
                de: "Zuletzt: dein erstes Budget festlegen",
                es: "Lo último, crea tu primer presupuesto",
                fr: "Dernière étape, créez votre premier budget",
                pt: "Último passo, crie seu primeiro orçamento",
            }),
            titleEntry: t({
                en: "Now log your first entry",
                de: "Jetzt deinen ersten Eintrag erfassen",
                es: "Ahora registra tu primer movimiento",
                fr: "Enregistrez maintenant votre première opération",
                pt: "Agora registre seu primeiro lançamento",
            }),
        },
        spentOfIncome: {
            cashFlow: t({
                en: "Cash flow",
                de: "Cashflow",
                es: "Flujo de caja",
                fr: "Flux de trésorerie",
                pt: "Fluxo de caixa",
            }),
            noIncome: t({
                en: "No income",
                de: "Keine Einnahmen",
                es: "Sin ingresos",
                fr: "Sans revenus",
                pt: "Sem receitas",
            }),
            over: t({ en: "over", de: "drüber", es: "de más", fr: "au-dessus", pt: "acima" }),
            title: t({
                en: "Spent of income",
                de: "Ausgaben von den Einnahmen",
                es: "Gastado de ingresos",
                fr: "Dépensé sur les revenus",
                pt: "Gasto das receitas",
            }),
            previousQuarter: t({
                en: "Previous quarter",
                de: "Voriges Quartal",
                es: "Trimestre anterior",
                fr: "Trimestre précédent",
                pt: "Trimestre anterior",
            }),
            thisQuarter: t({
                en: "This quarter",
                de: "Dieses Quartal",
                es: "Este trimestre",
                fr: "Ce trimestre",
                pt: "Este trimestre",
            }),
            sameMonths: insert(
                t({
                    en: "Same months, {{year}}",
                    de: "Gleiche Monate, {{year}}",
                    es: "Mismos meses, {{year}}",
                    fr: "Mêmes mois, {{year}}",
                    pt: "Mesmos meses, {{year}}",
                })
            ),
            whatIf: t({ en: "What if", de: "Was wäre wenn", es: "Y si", fr: "Et si", pt: "E se" }),
            whatIfHint: t({
                en: "Preview only, nothing is saved. Escape returns to the real amount.",
                de: "Nur Vorschau, nichts wird gespeichert. Mit Esc kehrst du zum echten Betrag zurück.",
                es: "Solo una vista previa, no se guarda nada. Escape vuelve al monto real.",
                fr: "Aperçu uniquement, rien n'est enregistré. Échap revient au montant réel.",
                pt: "Só prévia, nada é salvo. Esc volta ao valor real.",
            }),
            shareOfSpent: t({
                en: "Share of spent",
                de: "Anteil an den Ausgaben",
                es: "Parte del gasto",
                fr: "Part des dépenses",
                pt: "Parte do gasto",
            }),
            whatIfTag: t({ en: "If", de: "Wenn", es: "Si", fr: "Si", pt: "Se" }),
            wouldKeep: t({
                en: "Would keep",
                de: "Würde übrig bleiben",
                es: "Ahorrarías",
                fr: "Épargnerait",
                pt: "Guardaria",
            }),
        },
        panel: {
            accounts: t({ en: "Accounts", de: "Konten", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            addAnAccount: t({
                en: "Add an account",
                de: "Konto hinzufügen",
                es: "Añadir una cuenta",
                fr: "Ajouter un compte",
                pt: "Adicionar uma conta",
            }),
            average: insert(
                t({
                    en: "Avg {{amount}}",
                    de: "Ø {{amount}}",
                    es: "Prom. {{amount}}",
                    fr: "Moy. {{amount}}",
                    pt: "Méd. {{amount}}",
                })
            ),
            budgets: t({ en: "Budgets", de: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
            budgetsEmptyLine: t({
                en: "Set a monthly limit on a category and track it here.",
                de: "Lege ein Monatslimit für eine Kategorie fest und verfolge es hier.",
                es: "Pon un límite mensual a una categoría y síguelo aquí.",
                fr: "Définissez une limite mensuelle pour une catégorie et suivez-la ici.",
                pt: "Defina um limite mensal para uma categoria e acompanhe aqui.",
            }),
            budgetsEmptyTitle: t({
                en: "No budgets yet",
                de: "Noch keine Budgets",
                es: "Aún no hay presupuestos",
                fr: "Aucun budget pour l'instant",
                pt: "Nenhum orçamento ainda",
            }),
            budgetBiggest: insert(
                t({
                    en: "{{name}} is your biggest spend. Give it a limit.",
                    de: "{{name}} ist deine größte Ausgabe. Gib ihr ein Limit.",
                    es: "{{name}} es tu mayor gasto. Ponle un límite.",
                    fr: "{{name}} est ta plus grosse dépense. Fixe-lui une limite.",
                    pt: "{{name}} é o seu maior gasto. Defina um limite.",
                })
            ),
            details: t({ en: "Details", de: "Details", es: "Detalles", fr: "Détails", pt: "Detalhes" }),
            budgetEnded: insert(
                t({
                    en: "Ended {{day}}",
                    de: "Beendet {{day}}",
                    es: "Terminó el {{day}}",
                    fr: "Terminé le {{day}}",
                    pt: "Terminou em {{day}}",
                })
            ),
            budgetFilter: t({ en: "Filter", de: "Filter", es: "Filtrar", fr: "Filtrer", pt: "Filtrar" }),
            budgetLeft: t({ en: "Left", de: "Übrig", es: "Queda", fr: "Restant", pt: "Restam" }),
            budgetOverTotal: t({ en: "Over", de: "Drüber", es: "De más", fr: "Au-dessus", pt: "Acima" }),
            budgetResets: insert(
                t({
                    en: "Resets {{day}}",
                    de: "Wird zurückgesetzt {{day}}",
                    es: "Se renueva el {{day}}",
                    fr: "Se renouvelle le {{day}}",
                    pt: "Renova em {{day}}",
                })
            ),
            budgetUsed: insert(
                t({
                    en: "{{name}}: {{percent}}% used",
                    de: "{{name}}: {{percent}} % verbraucht",
                    es: "{{name}}: {{percent}} % usado",
                    fr: "{{name}} : {{percent}} % utilisé",
                    pt: "{{name}}: {{percent}}% usado",
                })
            ),
            noSubcategory: t({
                en: "No subcategory",
                de: "Keine Unterkategorie",
                es: "Sin subcategoría",
                fr: "Sans sous-catégorie",
                pt: "Sem subcategoria",
            }),
            onTrackLabel: t({ en: "On track", de: "Im Plan", es: "En regla", fr: "Dans les temps", pt: "Em dia" }),
            overCount: insert(
                t({
                    en: "{{count}} over",
                    de: "{{count}} drüber",
                    es: "{{count}} excedidos",
                    fr: "{{count}} au-dessus",
                    pt: "{{count}} acima",
                })
            ),
            overAmount: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} au-dessus",
                    pt: "{{amount}} acima",
                })
            ),
            onTrackCount: insert(
                t({
                    en: "{{count}} of {{total}}",
                    de: "{{count}} von {{total}}",
                    es: "{{count}} de {{total}}",
                    fr: "{{count}} sur {{total}}",
                    pt: "{{count}} de {{total}}",
                })
            ),
            byAccount: t({ en: "By account", de: "Nach Konto", es: "Por cuenta", fr: "Par compte", pt: "Por conta" }),
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día", fr: "Par jour", pt: "Por dia" }),
            left: insert(
                t({
                    en: "{{amount}} left of budget",
                    de: "{{amount}} vom Budget übrig",
                    es: "Quedan {{amount}} del presupuesto",
                    fr: "{{amount}} restants sur le budget",
                    pt: "Restam {{amount}} do orçamento",
                })
            ),
            moreAccounts: insert(
                t({
                    en: "{{count}} more",
                    de: "{{count}} weitere",
                    es: "{{count}} más",
                    fr: "{{count}} de plus",
                    pt: "mais {{count}}",
                })
            ),
            net: insert(
                t({
                    en: "Net {{amount}}",
                    de: "Netto {{amount}}",
                    es: "Neto {{amount}}",
                    fr: "Net {{amount}}",
                    pt: "Líquido de {{amount}}",
                })
            ),
            noAccounts: t({
                en: "No accounts yet.",
                de: "Noch keine Konten.",
                es: "Aún no hay cuentas.",
                fr: "Aucun compte pour l'instant.",
                pt: "Nenhuma conta ainda.",
            }),
            of: t({ en: "of", de: "von", es: "de", fr: "de", pt: "de" }),
            over: t({ en: "over", de: "drüber", es: "de más", fr: "au-dessus", pt: "acima" }),
            overBudget: insert(
                t({
                    en: "{{amount}} over budget",
                    de: "{{amount}} über dem Budget",
                    es: "{{amount}} sobre el presupuesto",
                    fr: "{{amount}} au-dessus du budget",
                    pt: "{{amount}} acima do orçamento",
                })
            ),
            peak: insert(
                t({
                    en: "Peak {{day}}",
                    de: "Spitze {{day}}",
                    es: "Máximo {{day}}",
                    fr: "Pic {{day}}",
                    pt: "Pico {{day}}",
                })
            ),
            ranOut: insert(
                t({
                    en: "Ran out {{day}}, {{days}} days early.",
                    de: "Aufgebraucht {{day}}, {{days}} Tage zu früh.",
                    es: "Se agotó el {{day}}, {{days}} días antes.",
                    fr: "Épuisé le {{day}}, {{days}} jours avant.",
                    pt: "Acabou em {{day}}, {{days}} dias antes.",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{day}}, 1 day early.",
                    de: "Aufgebraucht {{day}}, 1 Tag zu früh.",
                    es: "Se agotó el {{day}}, 1 día antes.",
                    fr: "Épuisé le {{day}}, 1 jour avant.",
                    pt: "Acabou em {{day}}, 1 dia antes.",
                })
            ),
            share: t({ en: "Share", de: "Anteil", es: "Parte", fr: "Part", pt: "Proporção" }),
            upcoming: t({ en: "Upcoming", de: "Anstehend", es: "Próximos", fr: "À venir", pt: "Próximos" }),
            versus: t({
                en: "vs last 3 months",
                de: "vs. letzte 3 Monate",
                es: "vs los últimos 3 meses",
                fr: "vs 3 derniers mois",
                pt: "vs últimos 3 meses",
            }),
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
        uncategorized: t({
            en: "Uncategorized",
            de: "Ohne Kategorie",
            es: "Sin categoría",
            fr: "Sans catégorie",
            pt: "Sem categoria",
        }),
    },
    key: "dashboard-home",
} satisfies Dictionary;

export default dashboardHome;
