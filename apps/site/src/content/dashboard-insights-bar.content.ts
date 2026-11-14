import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsBar = {
    content: {
        kinds: {
            label: t({ en: "Period length", es: "Duración del periodo" }),
            month: t({ en: "Month", es: "Mes" }),
            week: t({ en: "Week", es: "Semana" }),
            year: t({ en: "Year", es: "Año" }),
        },
        next: t({ en: "Next period", es: "Periodo siguiente" }),
        previous: t({ en: "Previous period", es: "Periodo anterior" }),
        range: insert(t({ en: "{{from}} to {{to}}", es: "{{from}} al {{to}}" })),
        sections: t({ en: "Insights sections", es: "Secciones de estadísticas" }),
        tabs: {
            breakdown: t({ en: "Breakdown", es: "Desglose" }),
            cashFlow: t({ en: "Cash flow", es: "Flujo de caja" }),
            overview: t({ en: "Overview", es: "Vista general" }),
            recap: t({ en: "Recap", es: "Resumen" }),
            reports: t({ en: "Reports", es: "Reportes" }),
            year: t({ en: "Year", es: "Año" }),
        },
    },
    key: "dashboard-insights-bar",
} satisfies Dictionary;

export default dashboardInsightsBar;
