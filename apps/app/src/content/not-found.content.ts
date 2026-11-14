import { t } from "intlayer";
import type { Dictionary } from "intlayer";

export default {
    content: {
        home: t({ en: "Open Outlayr", es: "Abrir Outlayr", pt: "Abrir o Outlayr", fr: "Ouvrir Outlayr" }),
        meta: t({ en: "Error 404", es: "Error 404", pt: "Erro 404", fr: "Erreur 404" }),
        title: t({
            en: "Nothing is filed under this address",
            es: "No hay nada archivado en esta dirección",
            pt: "Não há nada arquivado neste endereço",
            fr: "Rien n'est classé à cette adresse",
        }),
    },
    key: "not-found",
} satisfies Dictionary;
