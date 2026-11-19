import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

export default {
    content: {
        confirm: {
            balanceDown: insert(
                t({
                    en: "{{account}} goes back down by the same amount.",
                    de: "{{account}} sinkt wieder um denselben Betrag.",
                    es: "{{account}} vuelve a bajar en el mismo monto.",
                    fr: "{{account}} redescend du même montant.",
                    pt: "{{account}} volta a cair no mesmo valor.",
                })
            ),
            balanceUp: insert(
                t({
                    en: "{{account}} goes back up by the same amount.",
                    de: "{{account}} steigt wieder um denselben Betrag.",
                    es: "{{account}} vuelve a subir en el mismo monto.",
                    fr: "{{account}} remonte du même montant.",
                    pt: "{{account}} volta a subir no mesmo valor.",
                })
            ),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            summary: insert(
                t({
                    en: "{{name}}, {{amount}} on {{date}}.",
                    de: "{{name}}, {{amount}} am {{date}}.",
                    es: "{{name}}, {{amount}} el {{date}}.",
                    fr: "{{name}}, {{amount}} le {{date}}.",
                    pt: "{{name}}, {{amount}} em {{date}}.",
                })
            ),
            title: t({
                en: "Delete this entry?",
                de: "Diesen Eintrag löschen?",
                es: "¿Eliminar este movimiento?",
                fr: "Supprimer cette opération ?",
                pt: "Excluir este lançamento?",
            }),
            transfer: t({
                en: "Both accounts go back by the same amount.",
                de: "Beide Konten gehen um denselben Betrag zurück.",
                es: "Ambas cuentas vuelven atrás en el mismo monto.",
                fr: "Les deux comptes reviennent du même montant.",
                pt: "As duas contas voltam no mesmo valor.",
            }),
        },
        crash: {
            body: t({
                en: "This page crashed. Your ledger is safe on this device.",
                de: "Diese Seite ist abgestürzt. Dein Haushaltsbuch ist auf diesem Gerät sicher.",
                es: "Esta página falló. Tus movimientos están a salvo en este dispositivo.",
                fr: "Cette page a planté. Vos opérations sont en sécurité sur cet appareil.",
                pt: "Esta página travou. Seus lançamentos estão seguros neste dispositivo.",
            }),
            copied: t({ en: "Copied", de: "Kopiert", es: "Copiado", fr: "Copié", pt: "Copiado" }),
            copyRef: t({
                en: "Copy reference",
                de: "Referenz kopieren",
                es: "Copiar referencia",
                fr: "Copier la référence",
                pt: "Copiar referência",
            }),
            ref: insert(
                t({ en: "Ref {{id}}", de: "Ref {{id}}", es: "Ref {{id}}", fr: "Réf {{id}}", pt: "Ref {{id}}" })
            ),
            reload: t({ en: "Reload", de: "Neu laden", es: "Recargar", fr: "Recharger", pt: "Recarregar" }),
            title: t({
                en: "Something went wrong",
                de: "Etwas ist schiefgelaufen",
                es: "Algo salió mal",
                fr: "Un problème est survenu",
                pt: "Algo deu errado",
            }),
        },
        lost: {
            body: t({
                en: "This link moved or never existed.",
                de: "Dieser Link wurde verschoben oder hat nie existiert.",
                es: "Este enlace cambió o nunca existió.",
                fr: "Ce lien a changé ou n'a jamais existé.",
                pt: "Este link mudou ou nunca existiu.",
            }),
            title: t({
                en: "Page not found",
                de: "Seite nicht gefunden",
                es: "Página no encontrada",
                fr: "Page introuvable",
                pt: "Página não encontrada",
            }),
        },
        notifications: {
            back: t({ en: "Back", de: "Zurück", es: "Volver", fr: "Retour", pt: "Voltar" }),
            dueToday: insert(
                t({
                    en: "{{name}} due today",
                    de: "{{name}} heute fällig",
                    es: "{{name}} vence hoy",
                    fr: "{{name}} à payer aujourd'hui",
                    pt: "{{name}} vence hoje",
                })
            ),
            earlier: t({ en: "Earlier", de: "Früher", es: "Antes", fr: "Plus tôt", pt: "Antes" }),
            emptyBody: t({
                en: "Repeating entries and installments show up here on the day they're due.",
                de: "Wiederkehrende Einträge und Raten erscheinen hier an dem Tag, an dem sie fällig sind.",
                es: "Los movimientos que se repiten y las cuotas aparecen aquí el día en que vencen.",
                fr: "Les opérations récurrentes et les échéances apparaissent ici le jour où elles tombent.",
                pt: "Lançamentos recorrentes e parcelas aparecem aqui no dia em que vencem.",
            }),
            emptyTitle: t({
                en: "Nothing due",
                de: "Nichts fällig",
                es: "Nada pendiente",
                fr: "Rien à payer",
                pt: "Nada pendente",
            }),
            installmentDueToday: insert(
                t({
                    en: "{{name}} installment due today",
                    de: "Rate für {{name}} heute fällig",
                    es: "Cuota de {{name}} vence hoy",
                    fr: "Échéance {{name}} aujourd'hui",
                    pt: "Parcela de {{name}} vence hoje",
                })
            ),
            installmentOverdue: insert(
                t({
                    en: "{{name}} installment overdue",
                    de: "Rate für {{name}} überfällig",
                    es: "Cuota de {{name}} ya venció",
                    fr: "Échéance {{name}} en retard",
                    pt: "Parcela de {{name}} venceu",
                })
            ),
            loading: t({
                en: "Loading notifications",
                de: "Benachrichtigungen werden geladen",
                es: "Cargando notificaciones",
                fr: "Chargement des notifications",
                pt: "Carregando notificações",
            }),
            overdue: insert(
                t({
                    en: "{{name}} overdue",
                    de: "{{name}} überfällig",
                    es: "{{name}} ya venció",
                    fr: "{{name}} en retard",
                    pt: "{{name}} venceu",
                })
            ),
            purchase: t({ en: "Purchase", de: "Kauf", es: "Compra", fr: "Achat", pt: "Compra" }),
            seeComing: t({
                en: "See what's coming",
                de: "Anstehendes ansehen",
                es: "Ver lo que viene",
                fr: "Voir ce qui arrive",
                pt: "Ver o que vem",
            }),
            seenFailed: t({
                en: "Couldn't mark these as read.",
                de: "Konnte nicht als gelesen markiert werden.",
                es: "No se pudieron marcar como leídas.",
                fr: "Impossible de les marquer comme lues.",
                pt: "Não foi possível marcar como lidas.",
            }),
            settings: t({
                en: "Notification settings",
                de: "Benachrichtigungseinstellungen",
                es: "Ajustes de notificaciones",
                fr: "Réglages des notifications",
                pt: "Ajustes de notificações",
            }),
            title: t({
                en: "Notifications",
                de: "Benachrichtigungen",
                es: "Notificaciones",
                fr: "Notifications",
                pt: "Notificações",
            }),
            today: t({ en: "Today", de: "Heute", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            unread: insert(
                t({
                    en: "{{count}} unread",
                    de: "{{count}} ungelesen",
                    es: "{{count}} sin leer",
                    fr: "{{count}} non lues",
                    pt: "{{count}} não lidas",
                })
            ),
        },
        offline: {
            line: t({
                en: "You're offline. Changes save here and sync when you're back.",
                de: "Du bist offline. Änderungen werden hier gespeichert und synchronisiert, sobald du zurück bist.",
                es: "Estás sin conexión. Los cambios se guardan aquí y se sincronizan cuando vuelvas.",
                fr: "Vous êtes hors ligne. Les modifications sont gardées ici et synchronisées à votre retour.",
                pt: "Você está offline. As alterações ficam salvas aqui e sincronizam quando você voltar.",
            }),
            waiting: insert(
                t({
                    en: "{{count}} waiting",
                    de: "{{count}} wartend",
                    es: "{{count}} en espera",
                    fr: "{{count}} en attente",
                    pt: "{{count}} aguardando",
                })
            ),
        },
        palette: {
            actions: t({ en: "Actions", de: "Aktionen", es: "Acciones", fr: "Actions", pt: "Ações" }),
            addAs: insert(
                t({
                    en: "Add “{{query}}” as an entry",
                    de: "„{{query}}“ als Eintrag hinzufügen",
                    es: "Añadir “{{query}}” como movimiento",
                    fr: "Ajouter « {{query}} » comme opération",
                    pt: "Adicionar “{{query}}” como lançamento",
                })
            ),
            addTransfer: t({
                en: "Add transfer",
                de: "Umbuchung hinzufügen",
                es: "Añadir transferencia",
                fr: "Ajouter un virement",
                pt: "Adicionar transferência",
            }),
            categories: t({
                en: "Categories",
                de: "Kategorien",
                es: "Categorías",
                fr: "Catégories",
                pt: "Categorias",
            }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            entryCount: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entryOne: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            goTo: t({ en: "Go to", de: "Gehe zu", es: "Ir a", fr: "Aller à", pt: "Ir para" }),
            label: t({
                en: "Search Outlayr",
                de: "Outlayr durchsuchen",
                es: "Buscar en Outlayr",
                fr: "Rechercher dans Outlayr",
                pt: "Buscar no Outlayr",
            }),
            merchants: t({
                en: "Merchants",
                de: "Händler",
                es: "Comercios",
                fr: "Commerçants",
                pt: "Estabelecimentos",
            }),
            move: t({ en: "Move", de: "Bewegen", es: "Mover", fr: "Déplacer", pt: "Mover" }),
            noEntry: insert(
                t({
                    en: "No entry matches “{{query}}”.",
                    de: "Kein Eintrag passt zu „{{query}}“.",
                    es: "Ningún movimiento coincide con “{{query}}”.",
                    fr: "Aucune opération ne correspond à « {{query}} ».",
                    pt: "Nenhum lançamento corresponde a “{{query}}”.",
                })
            ),
            noMatches: t({
                en: "No matches",
                de: "Keine Treffer",
                es: "Sin resultados",
                fr: "Aucun résultat",
                pt: "Nenhum resultado",
            }),
            note: t({ en: "Note:", de: "Notiz:", es: "Nota:", fr: "Note :", pt: "Nota:" }),
            open: t({ en: "Open", de: "Öffnen", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            placeholder: t({
                en: "Search entries, merchants, categories",
                de: "Einträge, Händler, Kategorien durchsuchen",
                es: "Buscar movimientos, comercios, categorías",
                fr: "Rechercher opérations, commerçants, catégories",
                pt: "Buscar lançamentos, estabelecimentos, categorias",
            }),
            resultCount: insert(
                t({
                    en: "{{count}} results",
                    de: "{{count}} Treffer",
                    es: "{{count}} resultados",
                    fr: "{{count}} résultats",
                    pt: "{{count}} resultados",
                })
            ),
            resultOne: t({ en: "1 result", de: "1 Treffer", es: "1 resultado", fr: "1 résultat", pt: "1 resultado" }),
            seeAll: t({
                en: "See all in Transactions",
                de: "Alle in Einträge ansehen",
                es: "Ver todo en Movimientos",
                fr: "Tout voir dans Opérations",
                pt: "Ver tudo em Lançamentos",
            }),
        },
        session: {
            body: t({
                en: "Sign in again to keep syncing. Your ledger stays right here, and changes wait until you're back.",
                de: "Melde dich erneut an, um weiter zu synchronisieren. Dein Haushaltsbuch bleibt hier, und Änderungen warten, bis du zurück bist.",
                es: "Inicia sesión otra vez para seguir sincronizando. Tus movimientos se quedan aquí y los cambios esperan hasta que vuelvas.",
                fr: "Reconnectez-vous pour continuer la synchronisation. Vos opérations restent ici, et les modifications attendent votre retour.",
                pt: "Entre novamente para continuar sincronizando. Seus lançamentos ficam aqui, e as alterações esperam até você voltar.",
            }),
            later: t({ en: "Not now", de: "Nicht jetzt", es: "Ahora no", fr: "Plus tard", pt: "Agora não" }),
            signIn: t({ en: "Sign in", de: "Anmelden", es: "Iniciar sesión", fr: "Se connecter", pt: "Entrar" }),
            title: t({
                en: "Session expired",
                de: "Sitzung abgelaufen",
                es: "La sesión expiró",
                fr: "Session expirée",
                pt: "Sessão expirada",
            }),
        },
        sync: {
            failed: insert(
                t({
                    en: "Sync failed. {{count}} changes wait here.",
                    de: "Synchronisierung fehlgeschlagen. {{count}} Änderungen warten hier.",
                    es: "La sincronización falló. {{count}} cambios esperan aquí.",
                    fr: "La synchronisation a échoué. {{count}} modifications attendent ici.",
                    pt: "A sincronização falhou. {{count}} alterações esperam aqui.",
                })
            ),
            failedNone: t({
                en: "Sync failed.",
                de: "Synchronisierung fehlgeschlagen.",
                es: "La sincronización falló.",
                fr: "La synchronisation a échoué.",
                pt: "A sincronização falhou.",
            }),
            failedOne: t({
                en: "Sync failed. 1 change waits here.",
                de: "Synchronisierung fehlgeschlagen. 1 Änderung wartet hier.",
                es: "La sincronización falló. 1 cambio espera aquí.",
                fr: "La synchronisation a échoué. 1 modification attend ici.",
                pt: "A sincronização falhou. 1 alteração espera aqui.",
            }),
            progress: insert(
                t({
                    en: "{{done}} of {{total}}",
                    de: "{{done}} von {{total}}",
                    es: "{{done}} de {{total}}",
                    fr: "{{done}} sur {{total}}",
                    pt: "{{done}} de {{total}}",
                })
            ),
            retry: t({ en: "Retry", de: "Erneut versuchen", es: "Reintentar", fr: "Réessayer", pt: "Tentar de novo" }),
            syncing: t({
                en: "Syncing",
                de: "Synchronisiert",
                es: "Sincronizando",
                fr: "Synchronisation",
                pt: "Sincronizando",
            }),
        },
        toDashboard: t({
            en: "Go to Dashboard",
            de: "Zum Dashboard",
            es: "Ir al panel",
            fr: "Aller au tableau de bord",
            pt: "Ir para o painel",
        }),
        transfer: {
            intro: t({
                en: "A transfer moves money between your accounts. Create one to start.",
                de: "Eine Umbuchung bewegt Geld zwischen deinen Konten. Erstelle eines, um zu beginnen.",
                es: "Una transferencia mueve dinero entre tus cuentas. Crea una para empezar.",
                fr: "Un virement déplace de l'argent entre vos comptes. Créez-en un pour commencer.",
                pt: "Uma transferência move dinheiro entre suas contas. Crie uma para começar.",
            }),
            noAccounts: t({
                en: "No accounts",
                de: "Keine Konten",
                es: "Sin cuentas",
                fr: "Aucun compte",
                pt: "Nenhuma conta",
            }),
        },
    },
    key: "dashboard-shell",
} satisfies Dictionary;
