import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardSync = {
    content: {
        syncNow: t({
            en: "Sync now",
            de: "Jetzt synchronisieren",
            es: "Sincronizar ahora",
            fr: "Synchroniser",
            pt: "Sincronizar agora",
        }),
        retry: t({ en: "Retry", de: "Erneut versuchen", es: "Reintentar", fr: "Réessayer", pt: "Tentar de novo" }),
        status: t({ en: "Status", de: "Status", es: "Estado", fr: "État", pt: "Status" }),
        upToDate: t({ en: "Up to date", de: "Aktuell", es: "Al día", fr: "À jour", pt: "Em dia" }),
        on: t({ en: "On", de: "An", es: "Activa", fr: "Activée", pt: "Ativa" }),
        syncing: t({
            en: "Syncing",
            de: "Wird synchronisiert",
            es: "Sincronizando",
            fr: "Synchronisation",
            pt: "Sincronizando",
        }),
        inProgress: t({ en: "In progress", de: "Läuft", es: "En curso", fr: "En cours", pt: "Em andamento" }),
        notSyncing: t({
            en: "Not syncing",
            de: "Keine Synchronisierung",
            es: "Sin sincronizar",
            fr: "Non synchronisé",
            pt: "Sem sincronizar",
        }),
        failed: t({ en: "Failed", de: "Fehlgeschlagen", es: "Falló", fr: "Échec", pt: "Falhou" }),
        waiting: t({
            en: "Waiting to sync",
            de: "Wartet auf Synchronisierung",
            es: "Por sincronizar",
            fr: "En attente",
            pt: "Aguardando",
        }),
        changes: t({ en: "changes", de: "Änderungen", es: "cambios", fr: "modifications", pt: "alterações" }),
        ofChanges: insert(
            t({
                en: "of {{count}} changes",
                de: "von {{count}} Änderungen",
                es: "de {{count}} cambios",
                fr: "sur {{count}} modifications",
                pt: "de {{count}} alterações",
            })
        ),
        lastSynced: t({
            en: "Last synced",
            de: "Zuletzt synchronisiert",
            es: "Última sincronización",
            fr: "Dernière synchro",
            pt: "Última sincronização",
        }),
        notYet: t({ en: "Not yet", de: "Noch nicht", es: "Aún no", fr: "Pas encore", pt: "Ainda não" }),
        thisSession: t({
            en: "in this session",
            de: "in dieser Sitzung",
            es: "en esta sesión",
            fr: "dans cette session",
            pt: "nesta sessão",
        }),
        inLedger: t({
            en: "In this ledger",
            de: "In diesem Haushaltsbuch",
            es: "En estas finanzas",
            fr: "Dans ces comptes",
            pt: "Nestas finanças",
        }),
        transactions: t({ en: "transactions", de: "Einträge", es: "movimientos", fr: "opérations", pt: "lançamentos" }),
        unreachable: t({
            en: "Couldn't reach Outlayr",
            de: "Outlayr nicht erreichbar",
            es: "No se pudo conectar con Outlayr",
            fr: "Impossible de joindre Outlayr",
            pt: "Não foi possível acessar o Outlayr",
        }),
        completeHere: t({
            en: "Your ledger is complete here",
            de: "Dein Haushaltsbuch ist hier vollständig",
            es: "Tus finanzas están completas aquí",
            fr: "Vos comptes sont complets ici",
            pt: "Suas finanças estão completas aqui",
        }),
        replication: t({ en: "Replication", de: "Replikation", es: "Réplica", fr: "Réplication", pt: "Réplica" }),
        progress: insert(
            t({
                en: "{{done}} of {{total}}",
                de: "{{done}} von {{total}}",
                es: "{{done}} de {{total}}",
                fr: "{{done}} sur {{total}}",
                pt: "{{done}} de {{total}}",
            })
        ),
        account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
        sent: t({
            en: "Nothing left to send",
            de: "Nichts mehr zu senden",
            es: "Nada pendiente de enviar",
            fr: "Rien à envoyer",
            pt: "Nada a enviar",
        }),
    },
    key: "dashboard-sync",
} satisfies Dictionary;

export default dashboardSync;
