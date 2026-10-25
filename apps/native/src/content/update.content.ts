import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const update = {
    content: {
        "update.failed": t({
            en: "The update did not install. Try again.",
            es: "La actualización no se instaló. Inténtalo de nuevo.",
            pt: "A atualização não foi instalada. Tente de novo.",
        }),
        "update.later": t({
            en: "Later",
            es: "Después",
            pt: "Depois",
        }),
        "update.meta": t({
            en: "Update · {version} · {date}",
            es: "Actualización · {version} · {date}",
            pt: "Atualização · {version} · {date}",
        }),
        "update.now": t({
            en: "Update now",
            es: "Actualizar ahora",
            pt: "Atualizar agora",
        }),
        "update.title": t({
            en: "What's new",
            es: "Novedades",
            pt: "Novidades",
        }),
        "update.updating": t({
            en: "Updating, the app restarts when it is done",
            es: "Actualizando, la app se reinicia al terminar",
            pt: "Atualizando, o app reinicia ao terminar",
        }),
    },
    key: "update" as const,
} satisfies Dictionary;

export default update;
