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
            "pt-PT": "Não foi possível carregar os seus registos",
            it: "Impossibile caricare il tuo registro",
            nl: "Je huishoudboekje kon niet worden geladen",
            ja: "家計簿を読み込めませんでした",
            ko: "가계부를 불러오지 못했어요",
        }),
        body: t({
            en: "Try again in a moment.",
            de: "Versuch es gleich noch mal.",
            es: "Inténtalo de nuevo en un momento.",
            fr: "Réessayez dans un instant.",
            pt: "Tente de novo daqui a pouco.",
            it: "Riprova tra un momento.",
            nl: "Probeer het zo meteen opnieuw.",
            ja: "しばらくしてからもう一度お試しください。",
            ko: "잠시 후 다시 시도해 주세요.",
        }),
        retry: t({
            en: "Try again",
            de: "Versuch es noch mal",
            es: "Reintentar",
            fr: "Réessayer",
            pt: "Tentar novamente",
            it: "Riprova",
            nl: "Opnieuw proberen",
            ja: "再試行",
            ko: "다시 시도",
        }),
    },
    key: "not-synced",
} satisfies Dictionary;
