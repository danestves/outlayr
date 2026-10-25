import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const update = {
    content: {
        "update.failed": t({
            en: "The update did not install. Try again.",
            es: "La actualización no se instaló. Inténtalo de nuevo.",
            fr: "La mise à jour ne s'est pas installée. Réessayez.",
            pt: "A atualização não foi instalada. Tente de novo.",
        }),
        "update.later": t({
            en: "Later",
            es: "Después",
            fr: "Plus tard",
            pt: "Depois",
        }),
        "update.meta": t({
            en: "Update · {version} · {date}",
            es: "Actualización · {version} · {date}",
            fr: "Mise à jour · {version} · {date}",
            pt: "Atualização · {version} · {date}",
        }),
        "update.now": t({
            en: "Update now",
            es: "Actualizar ahora",
            fr: "Mettre à jour",
            pt: "Atualizar agora",
        }),
        "update.title": t({
            en: "What's new",
            es: "Novedades",
            fr: "Nouveautés",
            pt: "Novidades",
        }),
        "update.updating": t({
            en: "Updating, the app restarts when it is done",
            es: "Actualizando, la app se reinicia al terminar",
            fr: "Mise à jour en cours, l'app redémarrera à la fin",
            pt: "Atualizando, o app reinicia ao terminar",
            "pt-PT": "A atualizar, a app reinicia ao terminar",
        }),
    },
    key: "update" as const,
} satisfies Dictionary;

export default update;
