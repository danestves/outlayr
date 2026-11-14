import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardConnections = {
    content: {
        connect: t({
            en: "Connect an agent",
            es: "Conectar un agente",
            fr: "Connecter un agent",
            pt: "Conectar um agente",
        }),
        connectBody: t({
            en: "Add this server to your agent. It asks you to approve here before it reads your ledger.",
            es: "Agrega este servidor a tu agente. Te pedirá aprobarlo aquí antes de leer tus finanzas.",
            fr: "Ajoutez ce serveur à votre agent. Il vous demandera de l'approuver ici avant de lire vos comptes.",
            pt: "Adicione este servidor ao seu agente. Ele pedirá sua aprovação aqui antes de ler suas finanças.",
        }),
        agents: t({ en: "Agents", es: "Agentes", fr: "Agents", pt: "Agentes" }),
        agent: t({ en: "Agent", es: "Agente", fr: "Agent", pt: "Agente" }),
        access: t({ en: "Access", es: "Acceso", fr: "Accès", pt: "Acesso" }),
        connected: t({ en: "Connected", es: "Conectado", fr: "Connecté", pt: "Conectado" }),
        lastUsed: t({ en: "Last used", es: "Último uso", fr: "Dernière utilisation", pt: "Último uso" }),
        neverUsed: t({ en: "Not yet", es: "Aún no", fr: "Pas encore", pt: "Ainda não" }),
        read: t({ en: "Read", es: "Leer", fr: "Lecture", pt: "Ler" }),
        readLog: t({ en: "Read, log", es: "Leer, registrar", fr: "Lecture, saisie", pt: "Ler, registrar" }),
        logOnly: t({ en: "Log", es: "Registrar", fr: "Saisie", pt: "Registrar" }),
        server: t({ en: "Server", es: "Servidor", fr: "Serveur", pt: "Servidor" }),
        copyServer: t({
            en: "Copy server address",
            es: "Copiar dirección del servidor",
            fr: "Copier l'adresse du serveur",
            pt: "Copiar endereço do servidor",
        }),
        copied: t({ en: "Copied", es: "Copiado", fr: "Copié", pt: "Copiado" }),
        copyFailed: t({
            en: "Couldn't copy. Select it and copy by hand.",
            es: "No se pudo copiar. Selecciónalo y cópialo a mano.",
            fr: "Copie impossible. Sélectionnez-le et copiez-le à la main.",
            pt: "Não foi possível copiar. Selecione e copie manualmente.",
        }),
        done: t({ en: "Done", es: "Listo", fr: "Terminé", pt: "Concluído" }),
        more: insert(
            t({
                en: "More for {{name}}",
                es: "Más opciones de {{name}}",
                fr: "Plus pour {{name}}",
                pt: "Mais opções de {{name}}",
            })
        ),
        disconnect: t({ en: "Disconnect", es: "Desconectar", fr: "Déconnecter", pt: "Desconectar" }),
        disconnectTitle: insert(
            t({
                en: "Disconnect {{name}}?",
                es: "¿Desconectar {{name}}?",
                fr: "Déconnecter {{name}} ?",
                pt: "Desconectar {{name}}?",
            })
        ),
        disconnectBody: t({
            en: "It stops reaching your ledger right away. Entries it logged stay.",
            es: "Deja de acceder a tus finanzas de inmediato. Los registros que hizo se quedan.",
            fr: "Il n'accède plus à vos comptes immédiatement. Les entrées qu'il a saisies restent.",
            pt: "Ele deixa de acessar suas finanças na hora. Os registros que fez continuam.",
        }),
        disconnected: insert(
            t({
                en: "{{name}} disconnected",
                es: "{{name}} desconectado",
                fr: "{{name}} déconnecté",
                pt: "{{name}} desconectado",
            })
        ),
        disconnectFailed: t({
            en: "Couldn't disconnect. Try again.",
            es: "No se pudo desconectar. Inténtalo de nuevo.",
            fr: "Déconnexion impossible. Réessayez.",
            pt: "Não foi possível desconectar. Tente de novo.",
        }),
        cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        emptyTitle: t({ en: "Nothing connected", es: "Nada conectado", fr: "Rien de connecté", pt: "Nada conectado" }),
        emptyBody: t({
            en: "Let an agent read your ledger and log entries.",
            es: "Deja que un agente lea tus finanzas y registre movimientos.",
            fr: "Laissez un agent lire vos comptes et saisir des entrées.",
            pt: "Deixe um agente ler suas finanças e registrar lançamentos.",
        }),
    },
    key: "dashboard-connections",
} satisfies Dictionary;

export default dashboardConnections;
