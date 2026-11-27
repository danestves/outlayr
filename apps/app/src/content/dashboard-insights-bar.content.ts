import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsBar = {
    content: {
        kinds: {
            label: t({
                en: "Period length",
                de: "Zeitraumlänge",
                es: "Duración del periodo",
                fr: "Durée de la période",
                pt: "Duração do período",
            }),
            month: t({ en: "Month", de: "Monat", es: "Mes", fr: "Mois", pt: "Mês" }),
            week: t({ en: "Week", de: "Woche", es: "Semana", fr: "Semaine", pt: "Semana" }),
            year: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
        },
        next: t({
            en: "Next period",
            de: "Nächster Zeitraum",
            es: "Periodo siguiente",
            fr: "Période suivante",
            pt: "Próximo período",
        }),
        previous: t({
            en: "Previous period",
            de: "Voriger Zeitraum",
            es: "Periodo anterior",
            fr: "Période précédente",
            pt: "Período anterior",
        }),
        range: insert(
            t({
                en: "{{from}} to {{to}}",
                de: "{{from}} bis {{to}}",
                es: "{{from}} al {{to}}",
                fr: "de {{from}} à {{to}}",
                pt: "{{from}} a {{to}}",
            })
        ),
        sections: t({
            en: "Insights sections",
            de: "Bereiche der Auswertungen",
            es: "Secciones de estadísticas",
            fr: "Sections des statistiques",
            pt: "Seções de estatísticas",
        }),
        tabs: {
            breakdown: t({
                en: "Breakdown",
                de: "Aufschlüsselung",
                es: "Desglose",
                fr: "Répartition",
                pt: "Detalhamento",
                "pt-PT": "Detalhe",
            }),
            cashFlow: t({
                en: "Cash flow",
                de: "Cashflow",
                es: "Flujo de caja",
                fr: "Flux de trésorerie",
                pt: "Fluxo de caixa",
            }),
            overview: t({
                en: "Overview",
                de: "Übersicht",
                es: "Vista general",
                fr: "Vue d'ensemble",
                pt: "Visão geral",
            }),
            recap: t({ en: "Recap", de: "Rückblick", es: "Resumen", fr: "Récapitulatif", pt: "Resumo" }),
            reports: t({ en: "Reports", de: "Berichte", es: "Reportes", fr: "Rapports", pt: "Relatórios" }),
            year: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
        },
    },
    key: "dashboard-insights-bar",
} satisfies Dictionary;

export default dashboardInsightsBar;
