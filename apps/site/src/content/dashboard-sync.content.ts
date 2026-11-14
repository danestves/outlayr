import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardSync = {
    content: {
        syncNow: t({ en: "Sync now", es: "Sincronizar ahora", fr: "Synchroniser", pt: "Sincronizar agora" }),
        retry: t({ en: "Retry", es: "Reintentar", fr: "Réessayer", pt: "Tentar de novo" }),
        status: t({ en: "Status", es: "Estado", fr: "État", pt: "Status" }),
        upToDate: t({ en: "Up to date", es: "Al día", fr: "À jour", pt: "Em dia" }),
        on: t({ en: "On", es: "Activa", fr: "Activée", pt: "Ativa" }),
        syncing: t({ en: "Syncing", es: "Sincronizando", fr: "Synchronisation", pt: "Sincronizando" }),
        inProgress: t({ en: "In progress", es: "En curso", fr: "En cours", pt: "Em andamento" }),
        notSyncing: t({ en: "Not syncing", es: "Sin sincronizar", fr: "Non synchronisé", pt: "Sem sincronizar" }),
        failed: t({ en: "Failed", es: "Falló", fr: "Échec", pt: "Falhou" }),
        waiting: t({ en: "Waiting to sync", es: "Por sincronizar", fr: "En attente", pt: "Aguardando" }),
        changes: t({ en: "changes", es: "cambios", fr: "modifications", pt: "alterações" }),
        ofChanges: insert(
            t({
                en: "of {{count}} changes",
                es: "de {{count}} cambios",
                fr: "sur {{count}} modifications",
                pt: "de {{count}} alterações",
            })
        ),
        lastSynced: t({
            en: "Last synced",
            es: "Última sincronización",
            fr: "Dernière synchro",
            pt: "Última sincronização",
        }),
        notYet: t({ en: "Not yet", es: "Aún no", fr: "Pas encore", pt: "Ainda não" }),
        thisSession: t({ en: "in this session", es: "en esta sesión", fr: "dans cette session", pt: "nesta sessão" }),
        inLedger: t({ en: "In this ledger", es: "En estas finanzas", fr: "Dans ces comptes", pt: "Nestas finanças" }),
        transactions: t({ en: "transactions", es: "movimientos", fr: "opérations", pt: "lançamentos" }),
        unreachable: t({
            en: "Couldn't reach Outlayr",
            es: "No se pudo conectar con Outlayr",
            fr: "Impossible de joindre Outlayr",
            pt: "Não foi possível acessar o Outlayr",
        }),
        completeHere: t({
            en: "Your ledger is complete here",
            es: "Tus finanzas están completas aquí",
            fr: "Vos comptes sont complets ici",
            pt: "Suas finanças estão completas aqui",
        }),
        replication: t({ en: "Replication", es: "Réplica", fr: "Réplication", pt: "Réplica" }),
        progress: insert(
            t({
                en: "{{done}} of {{total}}",
                es: "{{done}} de {{total}}",
                fr: "{{done}} sur {{total}}",
                pt: "{{done}} de {{total}}",
            })
        ),
        account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
        sent: t({
            en: "Nothing left to send",
            es: "Nada pendiente de enviar",
            fr: "Rien à envoyer",
            pt: "Nada a enviar",
        }),
    },
    key: "dashboard-sync",
} satisfies Dictionary;

export default dashboardSync;
