import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const invite = {
    content: {
        code: t({ en: "Invite code", es: "Código de invitación" }),
        copied: t({ en: "Copied", es: "Copiado" }),
        copy: t({ en: "Copy", es: "Copiar" }),
        how: t({
            en: "Get Outlayr and sign in. Then tap Open in Outlayr, or enter the code in Settings under Invite friends.",
            es: "Descarga Outlayr e inicia sesión. Luego toca Abrir en Outlayr, o escribe el código en Configuración, en Invitar amigos.",
        }),
        lead: t({
            en: "A friend gave you a month of Outlayr Pro. It starts when you claim it, and nothing renews.",
            es: "Un amigo te regaló un mes de Outlayr Pro. Empieza cuando lo reclamas y no se renueva.",
        }),
        meta: {
            description: t({
                en: "Claim a free month of Outlayr Pro with a friend's invite code.",
                es: "Reclama un mes gratis de Outlayr Pro con el código de invitación de un amigo.",
            }),
            title: t({ en: "A month of Outlayr Pro, on a friend", es: "Un mes de Outlayr Pro, de un amigo" }),
        },
        open: t({ en: "Open in Outlayr", es: "Abrir en Outlayr" }),
        rules: t({
            en: "For new accounts that never had Pro. One invite per person.",
            es: "Para cuentas nuevas que nunca tuvieron Pro. Una invitación por persona.",
        }),
        title: t({ en: "A month of Pro, on a friend", es: "Un mes de Pro, de un amigo" }),
    },
    key: "invite",
} satisfies Dictionary;

export default invite;
