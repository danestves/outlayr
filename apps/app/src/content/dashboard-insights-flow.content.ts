import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsFlow = {
    content: {
        back: t({
            en: "Back to cash flow",
            de: "Zurück zum Cashflow",
            es: "Volver al flujo de caja",
            fr: "Retour au flux de trésorerie",
            pt: "Voltar ao fluxo de caixa",
        }),
        budget: insert(
            t({
                en: "Budget {{amount}}",
                de: "Budget {{amount}}",
                es: "Presupuesto {{amount}}",
                fr: "Budget de {{amount}}",
                pt: "Orçamento de {{amount}}",
            })
        ),
        cameFrom: t({ en: "Came from", de: "Kam von", es: "Vino de", fr: "Venu de", pt: "Veio de" }),
        chart: t({
            en: "Where it went",
            de: "Wohin es ging",
            es: "A dónde se fue",
            fr: "Où c'est allé",
            pt: "Para onde foi",
        }),
        chartLabel: t({
            en: "Income flowing into spending and savings",
            de: "Einnahmen, die in Ausgaben und Sparen fließen",
            es: "Ingresos que fluyen hacia gastos y ahorro",
            fr: "Revenus répartis entre dépenses et épargne",
            pt: "Receitas indo para despesas e poupança",
        }),
        other: t({ en: "Other", de: "Sonstige", es: "Otros", fr: "Autre", pt: "Outro" }),
        drill: {
            chartLabel: insert(
                t({
                    en: "{{category}} flowing into merchants",
                    de: "{{category}} fließt zu Händlern",
                    es: "{{category}} fluyendo hacia comercios",
                    fr: "{{category}} vers les commerçants",
                    pt: "{{category}} indo para comerciantes",
                })
            ),
            empty: insert(
                t({
                    en: "{{span}} has no {{category}} entries.",
                    de: "{{span}} hat keine Einträge in {{category}}.",
                    es: "{{span}} no tiene movimientos de {{category}}.",
                    fr: "{{span}} n'a pas d'opérations en {{category}}.",
                    pt: "{{span}} não tem lançamentos em {{category}}.",
                })
            ),
            emptyTitle: insert(
                t({
                    en: "Nothing in {{category}}",
                    de: "Nichts in {{category}}",
                    es: "Nada en {{category}}",
                    fr: "Rien dans {{category}}",
                    pt: "Nada em {{category}}",
                })
            ),
            entries: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entry: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Comerciante" }),
            of: insert(
                t({
                    en: "of {{amount}}",
                    de: "von {{amount}}",
                    es: "de {{amount}}",
                    fr: "de {{amount}}",
                    pt: "de {{amount}}",
                })
            ),
            ofCategory: insert(
                t({
                    en: "Of {{category}}",
                    de: "Von {{category}}",
                    es: "De {{category}}",
                    fr: "De {{category}}",
                    pt: "De {{category}}",
                })
            ),
            ofIncome: t({
                en: "Of income",
                de: "Von den Einnahmen",
                es: "Del ingreso",
                fr: "Des revenus",
                pt: "Das receitas",
            }),
            open: t({
                en: "Open category",
                de: "Kategorie öffnen",
                es: "Abrir categoría",
                fr: "Ouvrir la catégorie",
                pt: "Abrir categoria",
            }),
            over: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} au-dessus",
                    pt: "{{amount}} acima",
                })
            ),
            seeAll: t({ en: "See all", de: "Alle anzeigen", es: "Ver todos", fr: "Tout voir", pt: "Ver todos" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
            under: insert(
                t({
                    en: "{{amount}} left",
                    de: "{{amount}} übrig",
                    es: "{{amount}} disponibles",
                    fr: "{{amount}} restants",
                    pt: "Restam {{amount}}",
                })
            ),
            versus: insert(
                t({
                    en: "vs {{period}}",
                    de: "vs. {{period}}",
                    es: "vs {{period}}",
                    fr: "vs {{period}}",
                    pt: "vs {{period}}",
                })
            ),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
        },
        empty: {
            add: t({
                en: "Add entry",
                de: "Eintrag hinzufügen",
                es: "Agregar movimiento",
                fr: "Ajouter une opération",
                pt: "Adicionar lançamento",
            }),
            line: insert(
                t({
                    en: "{{span}} has no entries yet.",
                    de: "{{span}} hat noch keine Einträge.",
                    es: "{{span}} aún no tiene movimientos.",
                    fr: "{{span}} n'a pas encore d'opérations.",
                    pt: "{{span}} ainda não tem lançamentos.",
                })
            ),
            title: t({
                en: "Nothing came in or went out.",
                de: "Es ist nichts reingekommen oder rausgegangen.",
                es: "No entró ni salió nada.",
                fr: "Rien n'est entré ni sorti.",
                pt: "Nada entrou ou saiu.",
            }),
        },
        hub: {
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
        },
        kpi: {
            in: t({ en: "In", de: "Rein", es: "Entró", fr: "Entrées", pt: "Entrada" }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado", fr: "Épargné", pt: "Guardado" }),
            out: t({ en: "Out", de: "Raus", es: "Salió", fr: "Sorties", pt: "Saída" }),
            savings: t({ en: "Savings", de: "Gespart", es: "Ahorros", fr: "Épargne", pt: "Poupança" }),
        },
        ofIn: insert(
            t({
                en: "of {{amount}} in",
                de: "von {{amount}} Einnahmen",
                es: "de {{amount}} que entraron",
                fr: "sur {{amount}} en",
                pt: "de {{amount}} em",
            })
        ),
        ofIncome: t({ en: "of income", de: "der Einnahmen", es: "del ingreso", fr: "des revenus", pt: "das receitas" }),
        ofOut: insert(
            t({
                en: "of {{amount}} out",
                de: "von {{amount}} Ausgaben",
                es: "de {{amount}} que salieron",
                fr: "sur {{amount}} sortis",
                pt: "de {{amount}} de saída",
            })
        ),
        ofSpending: t({
            en: "of spending",
            de: "der Ausgaben",
            es: "del gasto",
            fr: "des dépenses",
            pt: "das despesas",
        }),
        sentence: {
            deficit: insert(
                t({
                    en: "You spent {{amount}} more than came in. It came out of your savings.",
                    de: "Du hast {{amount}} mehr ausgegeben, als reingekommen ist. Es kam aus deinen Ersparnissen.",
                    es: "Gastaste {{amount}} más de lo que entró. Salió de tus ahorros.",
                    fr: "Vous avez dépensé {{amount}} de plus que ce qui est entré. C'est sorti de votre épargne.",
                    pt: "Você gastou {{amount}} mais do que entrou. Saiu da sua poupança.",
                })
            ),
            even: insert(
                t({
                    en: "Everything that came in went out. {{category}} took {{percent}}% of it.",
                    de: "Alles, was reingekommen ist, ging wieder raus. {{category}} hat davon {{percent}} % genommen.",
                    es: "Todo lo que entró salió. {{category}} se llevó el {{percent}}% de eso.",
                    fr: "Tout ce qui est entré est sorti. {{category}} en a pris {{percent}} %.",
                    pt: "Tudo o que entrou saiu. {{category}} ficou com {{percent}}% disso.",
                })
            ),
            kept: insert(
                t({
                    en: "You kept {{kept}}% of what came in. {{category}} took {{percent}}% of it.",
                    de: "Du hast {{kept}} % von dem behalten, was reingekommen ist. {{category}} hat davon {{percent}} % genommen.",
                    es: "Ahorraste el {{kept}}% de lo que entró. {{category}} se llevó el {{percent}}% de eso.",
                    fr: "Vous avez épargné {{kept}} % de ce qui est entré. {{category}} en a pris {{percent}} %.",
                    pt: "Você guardou {{kept}}% do que entrou. {{category}} ficou com {{percent}}% disso.",
                })
            ),
            keptOnly: insert(
                t({
                    en: "You kept {{kept}}% of what came in.",
                    de: "Du hast {{kept}} % von dem behalten, was reingekommen ist.",
                    es: "Ahorraste el {{kept}}% de lo que entró.",
                    fr: "Vous avez épargné {{kept}} % de ce qui est entré.",
                    pt: "Você guardou {{kept}}% do que entrou.",
                })
            ),
        },
        tip: {
            budget: t({ en: "Budget", de: "Budget", es: "Presupuesto", fr: "Budget", pt: "Orçamento" }),
            drill: t({
                en: "Click to drill in",
                de: "Zum Vertiefen klicken",
                es: "Clic para ver el detalle",
                fr: "Cliquez pour explorer",
                pt: "Clique para detalhar",
            }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            ofIncome: t({
                en: "Of income",
                de: "Von den Einnahmen",
                es: "Del ingreso",
                fr: "Des revenus",
                pt: "Das receitas",
            }),
            ofSpending: t({
                en: "Of spending",
                de: "Von den Ausgaben",
                es: "Del gasto",
                fr: "Des dépenses",
                pt: "Das despesas",
            }),
            toCategory: insert(
                t({
                    en: "{{from}} to {{to}}",
                    de: "{{from}} zu {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "de {{from}} à {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
        },
        wentTo: t({ en: "Went to", de: "Ging an", es: "Fue a", fr: "Allé à", pt: "Foi para" }),
    },
    key: "dashboard-insights-flow",
} satisfies Dictionary;

export default dashboardInsightsFlow;
