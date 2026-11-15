import { t } from "intlayer";
import type { Dictionary } from "intlayer";

export default {
    content: {
        title: t({
            en: "Could not load your ledger",
            de: "Dein Haushaltsbuch konnte nicht geladen werden",
            es: "No se pudieron cargar tus movimientos",
            fr: "Impossible de charger vos opérations",
            pt: "Não foi possível carregar seus lançamentos",
        }),
        body: t({
            en: "Try again in a moment.",
            de: "Versuch es gleich noch mal.",
            es: "Inténtalo de nuevo en un momento.",
            fr: "Réessayez dans un instant.",
            pt: "Tente de novo daqui a pouco.",
        }),
        retry: t({
            en: "Try again",
            de: "Versuch es noch mal",
            es: "Reintentar",
            fr: "Réessayer",
            pt: "Tentar novamente",
        }),
    },
    key: "not-synced",
} satisfies Dictionary;
