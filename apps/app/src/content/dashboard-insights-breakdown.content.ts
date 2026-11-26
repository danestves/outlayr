import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsBreakdown = {
    content: {
        by: {
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            label: t({
                en: "Group by",
                de: "Gruppieren nach",
                es: "Agrupar por",
                fr: "Grouper par",
                pt: "Agrupar por",
            }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Comerciante" }),
            subcategory: t({
                en: "Subcategory",
                de: "Unterkategorie",
                es: "Subcategoría",
                fr: "Sous-catégorie",
                pt: "Subcategoria",
            }),
            tag: t({ en: "Tag", de: "Tag", es: "Etiqueta", fr: "Étiquette", pt: "Etiqueta" }),
        },
        cards: {
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día", fr: "Par jour", pt: "Por dia" }),
            clearCategory: t({
                en: "Clear category",
                de: "Kategorie zurücksetzen",
                es: "Quitar categoría",
                fr: "Effacer la catégorie",
                pt: "Limpar categoria",
            }),
            byMonth: t({ en: "By month", de: "Nach Monat", es: "Por mes", fr: "Par mois", pt: "Por mês" }),
            entries: t({
                en: "Entries",
                de: "Einträge",
                es: "Movimientos",
                fr: "Opérations",
                pt: "Lançamentos",
                "pt-PT": "Registos",
            }),
            open: insert(
                t({
                    en: "Open {{name}}",
                    de: "{{name}} öffnen",
                    es: "Abrir {{name}}",
                    fr: "Ouvrir {{name}}",
                    pt: "Abrir {{name}}",
                })
            ),
            openTag: t({
                en: "Open tag",
                de: "Tag öffnen",
                es: "Abrir etiqueta",
                fr: "Ouvrir l'étiquette",
                pt: "Abrir etiqueta",
            }),
            perDay: insert(
                t({
                    en: "{{amount}} a day",
                    de: "{{amount}} am Tag",
                    es: "{{amount}} al día",
                    fr: "{{amount}} par jour",
                    pt: "{{amount}} por dia",
                })
            ),
            peak: insert(
                t({
                    en: "{{amount}} on {{date}}, {{name}}",
                    de: "{{amount}} am {{date}}, {{name}}",
                    es: "{{amount}} el {{date}}, {{name}}",
                    fr: "{{amount}} le {{date}}, {{name}}",
                    pt: "{{amount}} em {{date}}, {{name}}",
                })
            ),
            peakPlain: insert(
                t({
                    en: "{{amount}} on {{date}}",
                    de: "{{amount}} am {{date}}",
                    es: "{{amount}} el {{date}}",
                    fr: "{{amount}} le {{date}}",
                    pt: "{{amount}} em {{date}}",
                })
            ),
            seeAll: insert(
                t({
                    en: "See all {{count}}",
                    de: "Alle {{count}} anzeigen",
                    es: "Ver los {{count}}",
                    fr: "Voir les {{count}}",
                    pt: "Ver todos os {{count}}",
                })
            ),
            subcategories: t({
                en: "Subcategories",
                de: "Unterkategorien",
                es: "Subcategorías",
                fr: "Sous-catégories",
                pt: "Subcategorias",
            }),
            tagByWeek: insert(
                t({
                    en: "{{tag}} by week",
                    de: "{{tag}} nach Woche",
                    es: "{{tag}} por semana",
                    fr: "{{tag}} par semaine",
                    pt: "{{tag}} por semana",
                })
            ),
            taggedSpend: t({
                en: "Tagged spend",
                de: "Ausgaben mit Tag",
                es: "Gasto etiquetado",
                fr: "Dépenses étiquetées",
                pt: "Gasto com etiqueta",
            }),
            topMerchants: t({
                en: "Top merchants",
                de: "Top-Händler",
                es: "Principales comercios",
                fr: "Principaux commerçants",
                pt: "Principais comerciantes",
            }),
        },
        chart: {
            day: insert(
                t({
                    en: "{{name}} on {{date}}",
                    de: "{{name}} am {{date}}",
                    es: "{{name}} el {{date}}",
                    fr: "{{name}} le {{date}}",
                    pt: "{{name}} em {{date}}",
                })
            ),
            label: t({
                en: "Spending by day",
                de: "Ausgaben pro Tag",
                es: "Gasto por día",
                fr: "Dépenses par jour",
                pt: "Despesas por dia",
            }),
            labelMonth: t({
                en: "Spending by month",
                de: "Ausgaben pro Monat",
                es: "Gasto por mes",
                fr: "Dépenses par mois",
                pt: "Despesas por mês",
            }),
            other: t({
                en: "Everything else",
                de: "Alles andere",
                es: "Todo lo demás",
                fr: "Tout le reste",
                pt: "Todo o resto",
            }),
            ofTotal: insert(
                t({
                    en: "of {{amount}}",
                    de: "von {{amount}}",
                    es: "de {{amount}}",
                    fr: "de {{amount}}",
                    pt: "de {{amount}}",
                })
            ),
            weekRange: insert(
                t({
                    en: "{{from}} to {{to}}",
                    de: "{{from}} bis {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "de {{from}} à {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
        },
        compare: {
            average: {
                month: t({
                    en: "3 month average",
                    de: "3-Monats-Durchschnitt",
                    es: "Promedio de 3 meses",
                    fr: "moyenne sur 3 mois",
                    pt: "média de 3 meses",
                }),
                week: t({
                    en: "3 week average",
                    de: "3-Wochen-Durchschnitt",
                    es: "Promedio de 3 semanas",
                    fr: "moyenne sur 3 semaines",
                    pt: "média de 3 semanas",
                }),
                year: t({
                    en: "3 year average",
                    de: "3-Jahres-Durchschnitt",
                    es: "Promedio de 3 años",
                    fr: "moyenne sur 3 ans",
                    pt: "média de 3 anos",
                }),
            },
            bases: t({
                en: "Compare with",
                de: "Vergleichen mit",
                es: "Comparar con",
                fr: "Comparer avec",
                pt: "Comparar com",
            }),
            change: t({ en: "Change", de: "Veränderung", es: "Cambio", fr: "Variation", pt: "Variação" }),
            chip: t({ en: "Compare", de: "Vergleichen", es: "Comparar", fr: "Comparer", pt: "Comparar" }),
            chipTo: insert(
                t({
                    en: "Compare to {{period}}",
                    de: "Mit {{period}} vergleichen",
                    es: "Comparar con {{period}}",
                    fr: "Comparer à {{period}}",
                    pt: "Comparar com {{period}}",
                })
            ),
            current: insert(
                t({
                    en: "{{period}}, in category color",
                    de: "{{period}}, in der Kategoriefarbe",
                    es: "{{period}}, en el color de la categoría",
                    fr: "{{period}}, dans la couleur de la catégorie",
                    pt: "{{period}}, na cor da categoria",
                })
            ),
            title: insert(
                t({
                    en: "{{base}} vs {{current}}",
                    de: "{{base}} vs. {{current}}",
                    es: "{{base}} vs {{current}}",
                    fr: "{{base}} vs {{current}}",
                    pt: "{{base}} vs {{current}}",
                })
            ),
            off: t({
                en: "Stop comparing",
                de: "Vergleich beenden",
                es: "Dejar de comparar",
                fr: "Arrêter de comparer",
                pt: "Parar de comparar",
            }),
        },
        empty: {
            add: t({
                en: "Add entry",
                de: "Eintrag hinzufügen",
                es: "Agregar movimiento",
                "es-ES": "Añadir movimiento",
                fr: "Ajouter une opération",
                pt: "Adicionar lançamento",
                "pt-PT": "Adicionar registo",
            }),
            income: insert(
                t({
                    en: "Your {{amount}} of income is under Income above.",
                    de: "Deine {{amount}} Einnahmen stehen oben unter Einnahmen.",
                    es: "Tus {{amount}} de ingresos están en Ingresos, arriba.",
                    fr: "Vos {{amount}} de revenus se trouvent dans Revenus, ci-dessus.",
                    pt: "Suas receitas de {{amount}} estão em Receitas, acima.",
                })
            ),
            nothingIncome: t({
                en: "No income here yet.",
                de: "Hier noch keine Einnahmen.",
                es: "Aún no hay ingresos aquí.",
                fr: "Pas encore de revenus ici.",
                pt: "Ainda sem receitas aqui.",
            }),
            nothingNet: t({
                en: "Nothing moved here yet.",
                de: "Hier hat sich noch nichts bewegt.",
                es: "Aún no hay movimientos aquí.",
                fr: "Rien n'a encore bougé ici.",
                pt: "Ainda não houve movimento aqui.",
            }),
            nothingSpent: {
                month: t({
                    en: "Nothing spent this month.",
                    de: "Diesen Monat nichts ausgegeben.",
                    es: "No hay gastos este mes.",
                    fr: "Aucune dépense ce mois-ci.",
                    pt: "Nada gasto neste mês.",
                }),
                week: t({
                    en: "Nothing spent this week.",
                    de: "Diese Woche nichts ausgegeben.",
                    es: "No hay gastos esta semana.",
                    fr: "Aucune dépense cette semaine.",
                    pt: "Nada gasto nesta semana.",
                }),
                year: t({
                    en: "Nothing spent this year.",
                    de: "Dieses Jahr nichts ausgegeben.",
                    es: "No hay gastos este año.",
                    fr: "Aucune dépense cette année.",
                    pt: "Nada gasto neste ano.",
                }),
            },
            title: t({
                en: "Nothing to chart",
                de: "Nichts zum Darstellen",
                es: "Nada que graficar",
                "es-ES": "Nada que mostrar",
                fr: "Rien à afficher",
                pt: "Nada para mostrar",
            }),
        },
        kpi: {
            budgetLabel: insert(
                t({
                    en: "Budget {{amount}}",
                    de: "Budget {{amount}}",
                    es: "Presupuesto {{amount}}",
                    fr: "Budget de {{amount}}",
                    pt: "Orçamento de {{amount}}",
                })
            ),
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día", fr: "Par jour", pt: "Por dia" }),
            categories: t({ en: "Categories", de: "Kategorien", es: "Categorías", fr: "Catégories", pt: "Categorias" }),
            change: t({ en: "Change", de: "Veränderung", es: "Cambio", fr: "Variation", pt: "Variação" }),
            entries: t({
                en: "Entries",
                de: "Einträge",
                es: "Movimientos",
                fr: "Opérations",
                pt: "Lançamentos",
                "pt-PT": "Registos",
            }),
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            left: insert(
                t({
                    en: "{{amount}} left",
                    de: "{{amount}} übrig",
                    es: "{{amount}} disponibles",
                    fr: "{{amount}} restants",
                    pt: "Restam {{amount}}",
                })
            ),
            merchants: t({ en: "Merchants", de: "Händler", es: "Comercios", fr: "Commerçants", pt: "Comerciantes" }),
            mostVisited: t({
                en: "Most visited",
                de: "Am häufigsten besucht",
                es: "Más visitado",
                fr: "Le plus fréquenté",
                pt: "Mais visitado",
            }),
            net: t({ en: "Net", de: "Netto", es: "Neto", fr: "Net", pt: "Líquido" }),
            over: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} au-dessus",
                    pt: "{{amount}} acima",
                })
            ),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            subcategories: t({
                en: "Subcategories",
                de: "Unterkategorien",
                es: "Subcategorías",
                fr: "Sous-catégories",
                pt: "Subcategorias",
            }),
            tagged: t({ en: "Tagged", de: "Mit Tag", es: "Etiquetado", fr: "Étiqueté", pt: "Com etiqueta" }),
            tagsUsed: t({
                en: "Tags used",
                de: "Verwendete Tags",
                es: "Etiquetas usadas",
                fr: "Étiquettes utilisées",
                pt: "Etiquetas usadas",
            }),
            untagged: t({
                en: "Untagged",
                de: "Ohne Tag",
                es: "Sin etiqueta",
                fr: "Sans étiquette",
                pt: "Sem etiqueta",
            }),
        },
        metric: {
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            label: t({ en: "Show", de: "Anzeigen", es: "Mostrar", fr: "Afficher", pt: "Mostrar" }),
            net: t({ en: "Net", de: "Netto", es: "Neto", fr: "Net", pt: "Líquido" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
        },
        line: {
            alone: insert(
                t({
                    en: "{{name}} alone {{verb}} {{amount}}.",
                    de: "{{name}} allein: {{verb}} {{amount}}.",
                    es: "Solo {{name}} {{verb}} {{amount}}.",
                    fr: "Seul {{name}} {{verb}} {{amount}}.",
                    pt: "Só {{name}} {{verb}} {{amount}}.",
                })
            ),
            added: t({ en: "added", de: "plus", es: "sumó", fr: "a ajouté", pt: "somou" }),
            less: insert(
                t({
                    en: "{{amount}} less than {{period}}.",
                    de: "{{amount}} weniger als {{period}}.",
                    es: "{{amount}} menos que en {{period}}.",
                    fr: "{{amount}} de moins qu'en {{period}}.",
                    pt: "{{amount}} menos que em {{period}}.",
                })
            ),
            more: insert(
                t({
                    en: "{{amount}} more than {{period}}.",
                    de: "{{amount}} mehr als {{period}}.",
                    es: "{{amount}} más que en {{period}}.",
                    fr: "{{amount}} de plus qu'en {{period}}.",
                    pt: "{{amount}} mais que em {{period}}.",
                })
            ),
            share: insert(
                t({
                    en: "{{share}} of {{period}}.",
                    de: "{{share}} von {{period}}.",
                    es: "{{share}} de {{period}}.",
                    fr: "{{share}} de {{period}}.",
                    pt: "{{share}} de {{period}}.",
                })
            ),
            tag: insert(
                t({
                    en: "{{amount}} more on {{tag}} than {{period}}.",
                    de: "{{amount}} mehr für {{tag}} als {{period}}.",
                    es: "{{amount}} más en {{tag}} que en {{period}}.",
                    fr: "{{amount}} de plus sur {{tag}} qu'en {{period}}.",
                    pt: "{{amount}} mais em {{tag}} que em {{period}}.",
                })
            ),
            tagLess: insert(
                t({
                    en: "{{amount}} less on {{tag}} than {{period}}.",
                    de: "{{amount}} weniger für {{tag}} als {{period}}.",
                    es: "{{amount}} menos en {{tag}} que en {{period}}.",
                    fr: "{{amount}} de moins sur {{tag}} qu'en {{period}}.",
                    pt: "{{amount}} menos em {{tag}} que em {{period}}.",
                })
            ),
            top: insert(
                t({
                    en: "Your top {{count}} merchants, after {{skipped}}, took {{share}} of {{period}}.",
                    de: "Deine Top {{count}} Händler, nach {{skipped}}, machten {{share}} von {{period}} aus.",
                    es: "Tus {{count}} comercios principales, después de {{skipped}}, sumaron {{share}} de {{period}}.",
                    fr: "Vos {{count}} principaux commerçants, après {{skipped}}, ont pris {{share}} de {{period}}.",
                    pt: "Seus {{count}} principais comerciantes, depois de {{skipped}}, ficaram com {{share}} de {{period}}.",
                })
            ),
            topPlain: insert(
                t({
                    en: "Your top {{count}} merchants took {{share}} of {{period}}.",
                    de: "Deine Top {{count}} Händler machten {{share}} von {{period}} aus.",
                    es: "Tus {{count}} comercios principales sumaron {{share}} de {{period}}.",
                    fr: "Vos {{count}} principaux commerçants ont pris {{share}} de {{period}}.",
                    pt: "Seus {{count}} principais comerciantes ficaram com {{share}} de {{period}}.",
                })
            ),
            took: t({ en: "took off", de: "minus", es: "restó", fr: "a déduit", pt: "descontou" }),
        },
        table: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            average: t({ en: "Average", de: "Durchschnitt", es: "Promedio", fr: "Moyenne", pt: "Média" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            change: t({ en: "Change", de: "Veränderung", es: "Cambio", fr: "Variation", pt: "Variação" }),
            collapse: t({
                en: "Show fewer",
                de: "Weniger anzeigen",
                es: "Mostrar menos",
                fr: "Afficher moins",
                pt: "Mostrar menos",
            }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            entries: t({
                en: "Entries",
                de: "Einträge",
                es: "Movimientos",
                fr: "Opérations",
                pt: "Lançamentos",
                "pt-PT": "Registos",
            }),
            expand: t({
                en: "Show all",
                de: "Alle anzeigen",
                es: "Mostrar todos",
                fr: "Tout afficher",
                pt: "Mostrar todos",
            }),
            fresh: t({ en: "New", de: "Neu", es: "Nuevo", fr: "Nouveau", pt: "Novo" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Comerciante" }),
            more: insert(
                t({
                    en: "{{count}} more",
                    de: "{{count}} weitere",
                    es: "{{count}} más",
                    fr: "{{count}} de plus",
                    pt: "mais {{count}}",
                })
            ),
            ofTotal: t({ en: "Of total", de: "Vom Gesamten", es: "Del total", fr: "Du total", pt: "Do total" }),
            percent: t({ en: "%", de: "%", es: "%", fr: "%", pt: "%" }),
            share: t({
                en: "Share",
                de: "Anteil",
                es: "Proporción",
                fr: "Part",
                pt: "Proporção",
                "pt-PT": "Proporção",
            }),
            subcategory: t({
                en: "Subcategory",
                de: "Unterkategorie",
                es: "Subcategoría",
                fr: "Sous-catégorie",
                pt: "Subcategoria",
            }),
            tag: t({ en: "Tag", de: "Tag", es: "Etiqueta", fr: "Étiquette", pt: "Etiqueta" }),
            topCategory: t({
                en: "Top category",
                de: "Top-Kategorie",
                es: "Categoría principal",
                fr: "Catégorie principale",
                pt: "Categoria principal",
            }),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
            untagged: t({
                en: "Untagged",
                de: "Ohne Tag",
                es: "Sin etiqueta",
                fr: "Sans étiquette",
                pt: "Sem etiqueta",
            }),
            versus: insert(
                t({
                    en: "vs {{period}}",
                    de: "vs. {{period}}",
                    es: "vs {{period}}",
                    fr: "vs {{period}}",
                    pt: "vs {{period}}",
                })
            ),
        },
    },
    key: "dashboard-insights-breakdown",
} satisfies Dictionary;

export default dashboardInsightsBreakdown;
