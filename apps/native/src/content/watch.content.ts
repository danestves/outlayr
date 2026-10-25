import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const watch = {
    content: {
        "watch.all": t({
            en: "All",
            es: "Todas",
            fr: "Toutes",
            pt: "Todas",
        }),
        "watch.average": t({
            en: "Avg",
            es: "Prom.",
            "es-ES": "Media",
            fr: "Moy.",
            pt: "Méd.",
        }),
        "watch.empty": t({
            en: "Nothing logged yet",
            es: "Nada registrado aún",
            fr: "Aucune opération saisie",
            pt: "Nada registrado ainda",
            "pt-PT": "Nada registado ainda",
        }),
        "watch.recent": t({
            en: "Recent",
            es: "Recientes",
            fr: "Récentes",
            pt: "Recentes",
        }),
        "watch.spent": t({
            en: "spent",
            es: "gastado",
            fr: "dépensé",
            pt: "gasto",
        }),
        "watch.week": t({
            en: "Last 7 days",
            es: "Últimos 7 días",
            fr: "7 derniers jours",
            pt: "Últimos 7 dias",
        }),
    },
    key: "watch" as const,
} satisfies Dictionary;

export default watch;
