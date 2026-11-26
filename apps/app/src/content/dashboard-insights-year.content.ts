import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsYear = {
    content: {
        biggest: t({
            en: "Biggest category",
            de: "Größte Kategorie",
            es: "Categoría más grande",
            fr: "Plus grande catégorie",
            pt: "Maior categoria",
        }),
        budgeted: t({ en: "Budgeted", de: "Budgetiert", es: "Presupuestado", fr: "Budgété", pt: "Orçado" }),
        card: {
            below: t({
                en: "Below your average",
                de: "Unter deinem Durchschnitt",
                es: "Bajo tu promedio",
                fr: "En dessous de votre moyenne",
                pt: "Abaixo da sua média",
            }),
            highs: t({
                en: "Highs and lows",
                de: "Höhen und Tiefen",
                es: "Máximos y mínimos",
                fr: "Hauts et bas",
                pt: "Altos e baixos",
            }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado", fr: "Épargné", pt: "Guardado" }),
            manage: t({
                en: "Manage plan",
                de: "Plan verwalten",
                es: "Gestionar plan",
                fr: "Gérer le forfait",
                pt: "Gerenciar plano",
                "pt-PT": "Gerir plano",
            }),
            pro: t({ en: "Pro", de: "Pro", es: "Pro", fr: "Pro", pt: "Pro" }),
            proEnds: insert(
                t({
                    en: "Pro ends {{date}}.",
                    de: "Pro endet am {{date}}.",
                    es: "Pro termina el {{date}}.",
                    fr: "Le Pro se termine le {{date}}.",
                    pt: "O Pro termina em {{date}}.",
                })
            ),
            month: t({
                en: "Month by month",
                de: "Monat für Monat",
                es: "Mes a mes",
                fr: "Mois par mois",
                pt: "Mês a mês",
            }),
            where: t({
                en: "Where it went",
                de: "Wohin es ging",
                es: "A dónde se fue",
                fr: "Où c'est allé",
                pt: "Para onde foi",
            }),
        },
        chartLabel: t({
            en: "Spending in each month",
            de: "Ausgaben in jedem Monat",
            es: "Gasto de cada mes",
            fr: "Dépenses de chaque mois",
            pt: "Despesas em cada mês",
        }),
        empty: {
            line: insert(
                t({
                    en: "Come back after 3 months of entries. You have {{count}}.",
                    de: "Komm nach 3 Monaten mit Einträgen wieder. Du hast {{count}}.",
                    es: "Vuelve cuando tengas 3 meses de movimientos. Tienes {{count}}.",
                    fr: "Revenez après 3 mois d'opérations. Vous en avez {{count}}.",
                    pt: "Volte depois de 3 meses de lançamentos. Você tem {{count}}.",
                    "pt-PT": "Volte depois de 3 meses de registos. tem {{count}}.",
                })
            ),
            title: t({
                en: "Too early for a year.",
                de: "Noch zu früh für ein Jahr.",
                es: "Es pronto para un año.",
                fr: "Trop tôt pour une année.",
                pt: "Muito cedo para um ano.",
            }),
        },
        highest: t({
            en: "Highest month",
            de: "Teuerster Monat",
            es: "Mes más alto",
            fr: "Mois le plus élevé",
            pt: "Mês mais alto",
        }),
        kpi: {
            entries: t({
                en: "Entries logged",
                de: "Erfasste Einträge",
                es: "Movimientos",
                fr: "Opérations enregistrées",
                pt: "Lançamentos registrados",
                "pt-PT": "Registos registados",
            }),
            kept: t({
                en: "Kept under your budgets",
                de: "Unter deinen Budgets geblieben",
                es: "Ahorrado bajo tus presupuestos",
                fr: "Respecté dans vos budgets",
                pt: "Mantido dentro dos orçamentos",
            }),
            months: t({
                en: "Months under budget",
                de: "Monate im Budget",
                es: "Meses bajo presupuesto",
                fr: "Mois sous le budget",
                pt: "Meses abaixo do orçamento",
            }),
            monthsLogged: t({
                en: "Months logged",
                de: "Erfasste Monate",
                es: "Meses con datos",
                fr: "Mois enregistrés",
                pt: "Meses registrados",
                "pt-PT": "Meses registados",
            }),
            soFar: t({ en: "So far", de: "Bisher", es: "Hasta ahora", fr: "Jusqu'ici", pt: "Até agora" }),
            year: t({ en: "Your year", de: "Dein Jahr", es: "Tu año", fr: "Votre année", pt: "Seu ano" }),
        },
        legend: {
            average: insert(
                t({
                    en: "Average {{amount}}",
                    de: "Durchschnitt {{amount}}",
                    es: "Promedio {{amount}}",
                    fr: "Moyenne de {{amount}}",
                    pt: "Média de {{amount}}",
                })
            ),
            over: t({
                en: "Over budget",
                de: "Über dem Budget",
                es: "Sobre presupuesto",
                fr: "Au-dessus du budget",
                pt: "Acima do orçamento",
            }),
            under: t({
                en: "Under budget",
                de: "Im Budget",
                es: "Bajo presupuesto",
                fr: "Sous le budget",
                pt: "Abaixo do orçamento",
            }),
        },
        lowest: t({
            en: "Lowest month",
            de: "Günstigster Monat",
            es: "Mes más bajo",
            fr: "Mois le plus bas",
            pt: "Mês mais baixo",
        }),
        monthAverage: t({
            en: "Average month",
            de: "Durchschnittsmonat",
            es: "Mes promedio",
            fr: "Mois moyen",
            pt: "Mês médio",
        }),
        monthsOver: t({
            en: "Months over budget",
            de: "Monate über dem Budget",
            es: "Meses sobre presupuesto",
            fr: "Mois au-dessus du budget",
            pt: "Meses acima do orçamento",
        }),
        noBudgets: t({
            en: "No budgets",
            de: "Keine Budgets",
            es: "Sin presupuestos",
            fr: "Aucun budget",
            pt: "Sem orçamentos",
        }),
        ofTotal: insert(
            t({
                en: "{{count}} of {{total}}",
                de: "{{count}} von {{total}}",
                es: "{{count}} de {{total}}",
                fr: "{{count}} sur {{total}}",
                pt: "{{count}} de {{total}}",
            })
        ),
        seg: {
            label: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
            recent: t({
                en: "Last 12 months",
                de: "Letzte 12 Monate",
                es: "Últimos 12 meses",
                fr: "12 derniers mois",
                pt: "Últimos 12 meses",
            }),
        },
        sub: {
            keptLess: insert(
                t({
                    en: "{{amount}} less than the last 12 months",
                    de: "{{amount}} weniger als in den letzten 12 Monaten",
                    es: "{{amount}} menos que los últimos 12 meses",
                    fr: "{{amount}} de moins que les 12 derniers mois",
                    pt: "{{amount}} menos que os últimos 12 meses",
                })
            ),
            keptMore: insert(
                t({
                    en: "{{amount}} more than the last 12 months",
                    de: "{{amount}} mehr als in den letzten 12 Monaten",
                    es: "{{amount}} más que los últimos 12 meses",
                    fr: "{{amount}} de plus que les 12 derniers mois",
                    pt: "{{amount}} mais que os últimos 12 meses",
                })
            ),
            proTimes: insert(
                t({
                    en: "{{times}}x what Pro costs",
                    de: "{{times}}-mal so viel, wie Pro kostet",
                    es: "{{times}}x lo que cuesta Pro",
                    fr: "{{times}}x le coût du Pro",
                    pt: "{{times}}x o custo do Pro",
                })
            ),
            budgeted: insert(
                t({
                    en: "of {{amount}} budgeted",
                    de: "von {{amount}} budgetiert",
                    es: "de {{amount}} presupuestado",
                    fr: "sur {{amount}} budgétés",
                    pt: "de {{amount}} orçados",
                })
            ),
            aMonth: insert(
                t({
                    en: "About {{count}} a month",
                    de: "Etwa {{count}} im Monat",
                    es: "Cerca de {{count}} al mes",
                    fr: "Environ {{count}} par mois",
                    pt: "Cerca de {{count}} por mês",
                })
            ),
            pair: insert(
                t({
                    en: "{{from}} and {{to}} {{year}}",
                    de: "{{from}} und {{to}} {{year}}",
                    es: "{{from}} y {{to}} {{year}}",
                    fr: "{{from}} et {{to}} {{year}}",
                    pt: "{{from}} e {{to}} de {{year}}",
                })
            ),
            range: insert(
                t({
                    en: "{{from}} to {{to}}",
                    de: "{{from}} bis {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "de {{from}} à {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
            started: insert(
                t({
                    en: "Started in {{month}}",
                    de: "Gestartet im {{month}}",
                    es: "Desde {{month}}",
                    fr: "Commencé en {{month}}",
                    pt: "Começou em {{month}}",
                })
            ),
            vs: insert(
                t({
                    en: "{{span}}, vs {{year}}",
                    de: "{{span}}, im Vergleich zu {{year}}",
                    es: "{{span}}, vs {{year}}",
                    fr: "{{span}}, vs {{year}}",
                    pt: "{{span}}, vs {{year}}",
                })
            ),
        },
        tip: {
            budget: t({ en: "Budgets", de: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
        },
        twelveMonths: t({ en: "12 months", de: "12 Monate", es: "12 meses", fr: "12 mois", pt: "12 meses" }),
        monthsCount: insert(
            t({
                en: "{{count}} months",
                de: "{{count}} Monate",
                es: "{{count}} meses",
                fr: "{{count}} mois",
                pt: "{{count}} meses",
            })
        ),
    },
    key: "dashboard-insights-year",
} satisfies Dictionary;

export default dashboardInsightsYear;
