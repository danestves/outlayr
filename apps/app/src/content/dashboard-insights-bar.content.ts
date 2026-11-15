import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsBar = {
    content: {
        kinds: {
            label: t({ en: "Period length", de: "Zeitraumlänge", es: "Duración del periodo" }),
            month: t({ en: "Month", de: "Monat", es: "Mes" }),
            week: t({ en: "Week", de: "Woche", es: "Semana" }),
            year: t({ en: "Year", de: "Jahr", es: "Año" }),
        },
        next: t({ en: "Next period", de: "Nächster Zeitraum", es: "Periodo siguiente" }),
        previous: t({ en: "Previous period", de: "Voriger Zeitraum", es: "Periodo anterior" }),
        range: insert(t({ en: "{{from}} to {{to}}", de: "{{from}} bis {{to}}", es: "{{from}} al {{to}}" })),
        sections: t({ en: "Insights sections", de: "Bereiche der Auswertungen", es: "Secciones de estadísticas" }),
        tabs: {
            breakdown: t({ en: "Breakdown", de: "Aufschlüsselung", es: "Desglose" }),
            cashFlow: t({ en: "Cash flow", de: "Cashflow", es: "Flujo de caja" }),
            overview: t({ en: "Overview", de: "Übersicht", es: "Vista general" }),
            recap: t({ en: "Recap", de: "Rückblick", es: "Resumen" }),
            reports: t({ en: "Reports", de: "Berichte", es: "Reportes" }),
            year: t({ en: "Year", de: "Jahr", es: "Año" }),
        },
    },
    key: "dashboard-insights-bar",
} satisfies Dictionary;

export default dashboardInsightsBar;
