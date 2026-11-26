import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const profileJoin = {
    content: {
        how: t({
            en: "Get Outlayr and sign in. Then tap Open in Outlayr.",
            de: "Hol dir Outlayr und melde dich an. Tippe dann auf In Outlayr öffnen.",
            es: "Descarga Outlayr e inicia sesión. Luego toca Abrir en Outlayr.",
            fr: "Installez Outlayr et connectez-vous. Touchez ensuite Ouvrir dans Outlayr.",
            pt: "Baixe o Outlayr e entre na sua conta. Depois toque em Abrir no Outlayr.",
        }),
        lead: t({
            en: "Someone invited you to share a profile in Outlayr: the same entries, accounts and budgets on every device, with each entry showing who logged it.",
            de: "Jemand hat dich eingeladen, ein Profil in Outlayr zu teilen: dieselben Einträge, Konten und Budgets auf jedem Gerät, und jeder Eintrag zeigt, wer ihn erfasst hat.",
            es: "Alguien te invitó a compartir un perfil en Outlayr: los mismos movimientos, cuentas y presupuestos en cada dispositivo, y cada movimiento muestra quién lo registró.",
            fr: "Quelqu'un vous a invité à partager un profil dans Outlayr : les mêmes opérations, comptes et budgets sur chaque appareil, et chaque opération indique qui l'a saisie.",
            pt: "Alguém convidou você para compartilhar um perfil no Outlayr: os mesmos lançamentos, contas e orçamentos em todos os dispositivos, e cada lançamento mostra quem o registrou.",
        }),
        meta: {
            description: t({
                en: "Open a shared Outlayr profile from an invite link.",
                de: "Öffne ein geteiltes Outlayr-Profil über einen Einladungslink.",
                es: "Abre un perfil compartido de Outlayr desde un enlace de invitación.",
                fr: "Ouvrez un profil Outlayr partagé depuis un lien d'invitation.",
                pt: "Abra um perfil compartilhado do Outlayr por um link de convite.",
            }),
            title: t({
                en: "Join a shared profile",
                de: "Einem geteilten Profil beitreten",
                es: "Únete a un perfil compartido",
                fr: "Rejoindre un profil partagé",
                pt: "Entre em um perfil compartilhado",
            }),
        },
        open: t({
            en: "Open in Outlayr to join this profile",
            de: "In Outlayr öffnen, um diesem Profil beizutreten",
            es: "Abrir en Outlayr para unirte a este perfil",
            fr: "Ouvrir dans Outlayr pour rejoindre ce profil",
            pt: "Abrir no Outlayr para entrar neste perfil",
        }),
        web: t({
            en: "Join on the web",
            de: "Im Web beitreten",
            es: "Unirme en la web",
            fr: "Rejoindre sur le web",
            pt: "Entrar na web",
        }),
        title: t({
            en: "Join a shared profile",
            de: "Einem geteilten Profil beitreten",
            es: "Únete a un perfil compartido",
            fr: "Rejoindre un profil partagé",
            pt: "Entre em um perfil compartilhado",
        }),
    },
    key: "profileJoin",
} satisfies Dictionary;

export default profileJoin;
