import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const inviteClaim = {
    content: {
        signIn: t({
            en: "Sign in",
            de: "Anmelden",
            es: "Iniciar sesión",
            fr: "Se connecter",
            pt: "Entrar",
        }),
        signInToClaim: t({
            en: "Sign in to claim",
            de: "Anmelden und einlösen",
            es: "Inicia sesión para reclamarlo",
            fr: "Connectez-vous pour activer",
            pt: "Entre para resgatar",
        }),
        claim: t({
            en: "Claim",
            de: "Einlösen",
            es: "Reclamar",
            "es-ES": "Canjear",
            fr: "Activer",
            pt: "Resgatar",
        }),
        openDashboard: t({
            en: "Go to your dashboard",
            de: "Zum Dashboard",
            es: "Ir a tu panel",
            fr: "Aller au tableau de bord",
            pt: "Ir para o painel",
        }),
        titleFriend: t({
            en: "A month of Pro, on a friend",
            de: "Ein Monat Pro, von einem Freund",
            es: "Un mes de Pro, de un amigo",
            fr: "Un mois de Pro, offert par un ami",
            pt: "Um mês de Pro, de um amigo",
        }),
        body: t({
            en: "A friend gave you a month of Outlayr Pro. It starts when you claim it, and nothing renews.",
            de: "Ein Freund hat dir einen Monat Outlayr Pro geschenkt. Er beginnt, wenn du ihn einlöst, und nichts verlängert sich automatisch.",
            es: "Un amigo te regaló un mes de Outlayr Pro. Empieza cuando lo reclamas y no se renueva.",
            "es-ES": "Un amigo te ha regalado un mes de Outlayr Pro. Empieza cuando lo canjeas y no se renueva.",
            fr: "Un ami vous offre un mois d'Outlayr Pro. Il commence quand vous l'activez, et rien ne se renouvelle.",
            pt: "Um amigo te deu um mês de Outlayr Pro. Ele começa quando você resgata, e nada é renovado.",
            "pt-PT": "Um amigo ofereceu-lhe um mês de Outlayr Pro. Começa quando o resgatar, e nada é renovado.",
        }),
        finePrint: t({
            en: "For new accounts that never had Pro. One invite per person.",
            de: "Für neue Konten, die noch nie Pro hatten. Eine Einladung pro Person.",
            es: "Para cuentas nuevas que nunca tuvieron Pro. Una invitación por persona.",
            fr: "Pour les nouveaux comptes qui n'ont jamais eu Pro. Une invitation par personne.",
            pt: "Para contas novas que nunca tiveram Pro. Um convite por pessoa.",
        }),
        from: insert(
            t({
                en: "From {{name}}",
                de: "Von {{name}}",
                es: "De {{name}}",
                fr: "De la part de {{name}}",
                pt: "De {{name}}",
            })
        ),
        fromFriend: t({
            en: "From a friend",
            de: "Von einem Freund",
            es: "De un amigo",
            fr: "De la part d'un ami",
            pt: "De um amigo",
        }),
        invalidTitle: t({
            en: "This invite doesn't work",
            de: "Diese Einladung funktioniert nicht",
            es: "Esta invitación no funciona",
            fr: "Cette invitation ne fonctionne pas",
            pt: "Este convite não funciona",
        }),
        goHome: t({
            en: "Go to Outlayr",
            de: "Zu Outlayr",
            es: "Ir a Outlayr",
            fr: "Aller à Outlayr",
            pt: "Ir para o Outlayr",
        }),
        phone: t({
            en: "On a phone? Get Outlayr",
            de: "Auf dem Handy? Hol dir Outlayr",
            es: "¿Estás en el teléfono? Descarga Outlayr",
            "es-ES": "¿Estás en el móvil? Descarga Outlayr",
            fr: "Sur téléphone ? Installez Outlayr",
            pt: "No celular? Baixe o Outlayr",
            "pt-PT": "No telemóvel? Descarregue o Outlayr",
        }),
    },
    key: "invite-claim" as const,
} satisfies Dictionary;

export default inviteClaim;
