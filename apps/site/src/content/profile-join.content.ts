import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const profileJoin = {
    content: {
        code: t({ en: "Invite code", es: "Código de invitación" }),
        copied: t({ en: "Copied", es: "Copiado" }),
        copy: t({ en: "Copy", es: "Copiar" }),
        how: t({
            en: "Get Outlayr and sign in. Then tap Open in Outlayr, or enter the code in the app.",
            es: "Descarga Outlayr e inicia sesión. Luego toca Abrir en Outlayr, o escribe el código en la app.",
        }),
        lead: t({
            en: "Someone invited you to share a profile in Outlayr: the same entries, accounts and budgets on every device, with each entry showing who logged it.",
            es: "Alguien te invitó a compartir un perfil en Outlayr: los mismos movimientos, cuentas y presupuestos en cada dispositivo, y cada movimiento muestra quién lo registró.",
        }),
        meta: {
            description: t({
                en: "Open a shared Outlayr profile from an invite link.",
                es: "Abre un perfil compartido de Outlayr desde un enlace de invitación.",
            }),
            title: t({ en: "Join a shared profile", es: "Únete a un perfil compartido" }),
        },
        open: t({ en: "Open in Outlayr to join this profile", es: "Abrir en Outlayr para unirte a este perfil" }),
        title: t({ en: "Join a shared profile", es: "Únete a un perfil compartido" }),
    },
    key: "profileJoin",
} satisfies Dictionary;

export default profileJoin;
