import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardBanks = {
    content: {
        banks: t({ en: "Banks", de: "Banken", es: "Bancos", fr: "Banques", pt: "Bancos" }),
        link: t({
            en: "Link a bank",
            de: "Bank verknüpfen",
            es: "Vincular un banco",
            fr: "Lier une banque",
            pt: "Vincular um banco",
        }),
        linkedOn: insert(
            t({
                en: "Linked {{date}}",
                de: "Verknüpft am {{date}}",
                es: "Vinculado el {{date}}",
                fr: "Liée le {{date}}",
                pt: "Vinculado em {{date}}",
            })
        ),
        account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
        kind: t({ en: "Kind", de: "Art", es: "Tipo", fr: "Type", pt: "Tipo" }),
        filesInto: t({
            en: "Files into",
            de: "Bucht in",
            es: "Se registra en",
            fr: "Classé dans",
            pt: "Lança em",
        }),
        status: t({ en: "Status", de: "Status", es: "Estado", fr: "État", pt: "Status" }),
        lastPulled: t({
            en: "Last pulled",
            de: "Zuletzt abgerufen",
            es: "Última actualización",
            fr: "Dernier relevé",
            pt: "Última atualização",
        }),
        notPulled: t({ en: "Not yet", de: "Noch nicht", es: "Aún no", fr: "Pas encore", pt: "Ainda não" }),
        kinds: {
            cash: t({ en: "Cash", de: "Konto", es: "Efectivo", fr: "Compte", pt: "Conta" }),
            credit: t({ en: "Credit", de: "Kredit", es: "Crédito", fr: "Crédit", pt: "Crédito" }),
            investment: t({
                en: "Investment",
                de: "Depot",
                es: "Inversión",
                fr: "Placement",
                pt: "Investimento",
            }),
            other: t({ en: "Other", de: "Sonstiges", es: "Otra", fr: "Autre", pt: "Outra" }),
        },
        statuses: {
            active: t({ en: "Active", de: "Aktiv", es: "Activa", fr: "Active", pt: "Ativa" }),
            relink: t({
                en: "Needs sign-in",
                de: "Anmeldung nötig",
                es: "Requiere inicio de sesión",
                fr: "Connexion requise",
                pt: "Precisa de login",
            }),
            disconnected: t({
                en: "Disconnected",
                de: "Getrennt",
                es: "Desconectada",
                fr: "Déconnectée",
                pt: "Desconectada",
            }),
        },
        chooseAccount: t({
            en: "Choose an account",
            de: "Konto wählen",
            es: "Elige una cuenta",
            fr: "Choisir un compte",
            pt: "Escolha uma conta",
        }),
        filingFailed: t({
            en: "Couldn't change where it files. Try again.",
            de: "Das Zielkonto ließ sich nicht ändern. Versuch es noch mal.",
            es: "No se pudo cambiar dónde se registra. Inténtalo de nuevo.",
            fr: "Impossible de changer le compte de classement. Réessayez.",
            pt: "Não foi possível mudar onde ela lança. Tente de novo.",
        }),
        signInAgain: t({
            en: "Sign in again",
            de: "Erneut anmelden",
            es: "Volver a iniciar sesión",
            fr: "Se reconnecter",
            pt: "Entrar de novo",
        }),
        footer: t({
            en: "Charges arrive as entries by themselves. Pending ones update when they post.",
            de: "Abbuchungen kommen von selbst als Einträge an. Vorgemerkte aktualisieren sich bei der Buchung.",
            es: "Los cargos llegan solos como movimientos. Los pendientes se actualizan al asentarse.",
            fr: "Les débits arrivent seuls comme écritures. Ceux en attente se mettent à jour une fois passés.",
            pt: "As cobranças chegam sozinhas como lançamentos. As pendentes se atualizam ao serem lançadas.",
        }),
        privacy: t({
            en: "Privacy",
            de: "Datenschutz",
            es: "Privacidad",
            fr: "Confidentialité",
            pt: "Privacidade",
        }),
        emptyTitle: t({
            en: "No banks linked yet",
            de: "Noch keine Bank verknüpft",
            es: "Aún no hay bancos vinculados",
            fr: "Aucune banque liée pour l'instant",
            pt: "Nenhum banco vinculado ainda",
        }),
        emptyBody: t({
            en: "Link checking, savings or a card. Its charges arrive as entries by themselves, pending ones included.",
            de: "Verknüpfe ein Giro-, Spar- oder Kartenkonto. Seine Abbuchungen kommen von selbst als Einträge an, vorgemerkte inklusive.",
            es: "Vincula una cuenta corriente, de ahorro o una tarjeta. Sus cargos llegan solos como movimientos, pendientes incluidos.",
            fr: "Liez un compte courant, un livret ou une carte. Ses débits arrivent seuls comme écritures, ceux en attente compris.",
            pt: "Vincule uma conta corrente, poupança ou um cartão. As cobranças chegam sozinhas como lançamentos, pendentes incluídas.",
        }),
        more: insert(
            t({
                en: "More for {{name}}",
                de: "Mehr für {{name}}",
                es: "Más opciones de {{name}}",
                fr: "Plus pour {{name}}",
                pt: "Mais opções de {{name}}",
            })
        ),
        unlink: t({
            en: "Unlink account",
            de: "Konto trennen",
            es: "Desvincular cuenta",
            fr: "Délier le compte",
            pt: "Desvincular conta",
        }),
        unlinkTitle: insert(
            t({
                en: "Unlink {{account}}?",
                de: "{{account}} trennen?",
                es: "¿Desvincular {{account}}?",
                fr: "Délier {{account}} ?",
                pt: "Desvincular {{account}}?",
            })
        ),
        unlinkBody: t({
            en: "New charges stop arriving. Entries already filed stay. We delete its bank, name and last 4 digits.",
            de: "Neue Abbuchungen kommen nicht mehr an. Bereits erfasste Einträge bleiben. Wir löschen Bank, Name und die letzten 4 Ziffern.",
            es: "Dejan de llegar cargos nuevos. Los movimientos ya registrados se quedan. Borramos su banco, nombre y últimos 4 dígitos.",
            fr: "Les nouveaux débits n'arrivent plus. Les écritures déjà classées restent. Nous supprimons sa banque, son nom et ses 4 derniers chiffres.",
            pt: "Novas cobranças deixam de chegar. Os lançamentos já feitos ficam. Apagamos o banco, o nome e os 4 últimos dígitos.",
        }),
        unlinkAction: t({ en: "Unlink", de: "Trennen", es: "Desvincular", fr: "Délier", pt: "Desvincular" }),
        unlinked: insert(
            t({
                en: "{{account}} unlinked",
                de: "{{account}} getrennt",
                es: "{{account}} desvinculada",
                fr: "{{account}} déliée",
                pt: "{{account}} desvinculada",
            })
        ),
        unlinkFailed: insert(
            t({
                en: "Couldn't unlink {{account}}",
                de: "{{account}} konnte nicht getrennt werden",
                es: "No se pudo desvincular {{account}}",
                fr: "Impossible de délier {{account}}",
                pt: "Não foi possível desvincular {{account}}",
            })
        ),
        cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        search: t({
            en: "Search banks",
            de: "Banken suchen",
            es: "Buscar bancos",
            fr: "Rechercher une banque",
            pt: "Buscar bancos",
        }),
        searching: t({ en: "Searching", de: "Suche läuft", es: "Buscando", fr: "Recherche", pt: "Buscando" }),
        noMatch: insert(
            t({
                en: 'No bank called "{{query}}"',
                de: 'Keine Bank namens „{{query}}"',
                es: 'Ningún banco se llama "{{query}}"',
                fr: "Aucune banque nommée « {{query}} »",
                pt: 'Nenhum banco chamado "{{query}}"',
            })
        ),
        searchFailed: t({
            en: "Couldn't load banks. Check your connection.",
            de: "Banken konnten nicht geladen werden. Prüf deine Verbindung.",
            es: "No se pudieron cargar los bancos. Revisa tu conexión.",
            fr: "Impossible de charger les banques. Vérifiez votre connexion.",
            pt: "Não foi possível carregar os bancos. Confira sua conexão.",
        }),
        catchAll: {
            US: t({
                en: "US banks",
                de: "US-Banken",
                es: "Bancos de EE. UU.",
                fr: "Banques américaines",
                pt: "Bancos dos EUA",
            }),
            USDetail: t({
                en: "Other banks in the United States",
                de: "Andere Banken in den USA",
                es: "Otros bancos en Estados Unidos",
                fr: "Autres banques aux États-Unis",
                pt: "Outros bancos nos Estados Unidos",
            }),
            CA: t({
                en: "Canadian banks",
                de: "Kanadische Banken",
                es: "Bancos de Canadá",
                fr: "Banques canadiennes",
                pt: "Bancos do Canadá",
            }),
            CADetail: t({
                en: "Other banks in Canada",
                de: "Andere Banken in Kanada",
                es: "Otros bancos en Canadá",
                fr: "Autres banques au Canada",
                pt: "Outros bancos no Canadá",
            }),
        },
        consentLogin: t({
            en: "Stripe handles the bank sign-in. Outlayr never sees your login.",
            de: "Stripe übernimmt die Bank-Anmeldung. Outlayr sieht deine Zugangsdaten nie.",
            es: "Stripe se encarga del inicio de sesión del banco. Outlayr nunca ve tus datos de acceso.",
            fr: "Stripe gère la connexion à la banque. Outlayr ne voit jamais vos identifiants.",
            pt: "O Stripe cuida do login no banco. O Outlayr nunca vê seus dados de acesso.",
        }),
        consentKeep: t({
            en: "We keep each account's bank, name and last 4 digits until you unlink it.",
            de: "Wir speichern Bank, Name und die letzten 4 Ziffern jedes Kontos, bis du es trennst.",
            es: "Guardamos el banco, el nombre y los últimos 4 dígitos de cada cuenta hasta que la desvincules.",
            fr: "Nous gardons la banque, le nom et les 4 derniers chiffres de chaque compte jusqu'à ce que vous le déliiez.",
            pt: "Guardamos o banco, o nome e os 4 últimos dígitos de cada conta até você desvinculá-la.",
        }),
        consentEntries: t({
            en: "Its transactions are added to your ledger as entries.",
            de: "Seine Umsätze werden als Einträge in dein Haushaltsbuch eingetragen.",
            es: "Sus movimientos se agregan a tu registro.",
            fr: "Ses opérations sont ajoutées à votre journal comme écritures.",
            pt: "As transações entram nos seus lançamentos.",
        }),
        privacyPolicy: t({
            en: "Privacy policy",
            de: "Datenschutzerklärung",
            es: "Política de privacidad",
            fr: "Politique de confidentialité",
            pt: "Política de privacidade",
        }),
        continue: t({
            en: "Continue to Stripe",
            de: "Weiter zu Stripe",
            es: "Continuar con Stripe",
            fr: "Continuer vers Stripe",
            pt: "Continuar no Stripe",
        }),
        linking: t({
            en: "Linking…",
            de: "Wird verknüpft…",
            es: "Vinculando…",
            fr: "Liaison en cours…",
            pt: "Vinculando…",
        }),
        resultTitle: insert(
            t({
                en: "{{bank}} linked",
                de: "{{bank}} verknüpft",
                es: "{{bank}} vinculado",
                fr: "{{bank}} liée",
                pt: "{{bank}} vinculado",
            })
        ),
        resultBody: t({
            en: "Each one files into the account shown. Change any of them now or later.",
            de: "Jedes bucht in das angezeigte Konto. Du kannst es jetzt oder später ändern.",
            es: "Cada una se registra en la cuenta que ves. Puedes cambiarla ahora o después.",
            fr: "Chacun est classé dans le compte affiché. Vous pouvez le changer maintenant ou plus tard.",
            pt: "Cada uma lança na conta mostrada. Você pode mudar agora ou depois.",
        }),
        done: t({ en: "Done", de: "Fertig", es: "Listo", fr: "Terminé", pt: "Concluído" }),
        signedInAgain: insert(
            t({
                en: "{{bank}} is working again",
                de: "{{bank}} funktioniert wieder",
                es: "{{bank}} vuelve a funcionar",
                fr: "{{bank}} fonctionne à nouveau",
                pt: "{{bank}} voltou a funcionar",
            })
        ),
        stillExpired: insert(
            t({
                en: "{{bank}} still needs a sign-in for one account",
                de: "{{bank}} braucht für ein Konto weiterhin eine Anmeldung",
                es: "{{bank}} todavía necesita que inicies sesión para una cuenta",
                fr: "{{bank}} demande toujours une connexion pour un compte",
                pt: "{{bank}} ainda precisa de login em uma conta",
            })
        ),
        failedTitle: insert(
            t({
                en: "{{bank}} wasn't linked",
                de: "{{bank}} wurde nicht verknüpft",
                es: "No se vinculó {{bank}}",
                fr: "{{bank}} n'a pas été liée",
                pt: "{{bank}} não foi vinculado",
            })
        ),
        failures: {
            canceled: t({
                en: "The bank sign-in closed before it finished. Nothing was saved.",
                de: "Die Bank-Anmeldung wurde vor dem Ende geschlossen. Nichts wurde gespeichert.",
                es: "El inicio de sesión del banco se cerró antes de terminar. No se guardó nada.",
                fr: "La connexion à la banque s'est fermée avant la fin. Rien n'a été enregistré.",
                pt: "O login do banco fechou antes de terminar. Nada foi salvo.",
            }),
            failed: t({
                en: "Stripe couldn't finish the link. Nothing was saved.",
                de: "Stripe konnte die Verknüpfung nicht abschließen. Nichts wurde gespeichert.",
                es: "Stripe no pudo terminar el vínculo. No se guardó nada.",
                fr: "Stripe n'a pas pu terminer le lien. Rien n'a été enregistré.",
                pt: "O Stripe não conseguiu concluir o vínculo. Nada foi salvo.",
            }),
            retired: t({
                en: "This bank can't be linked anymore. Search for it again.",
                de: "Diese Bank lässt sich nicht mehr verknüpfen. Such sie erneut.",
                es: "Este banco ya no se puede vincular. Búscalo de nuevo.",
                fr: "Cette banque ne peut plus être liée. Recherchez-la à nouveau.",
                pt: "Este banco não pode mais ser vinculado. Busque de novo.",
            }),
            expired: t({
                en: "That account still needs you to sign in. Try again and pick the same account.",
                de: "Dieses Konto braucht weiterhin eine neue Anmeldung. Versuch es erneut und wähle dasselbe Konto.",
                es: "Esa cuenta todavía necesita que inicies sesión. Inténtalo de nuevo y elige la misma cuenta.",
                fr: "Ce compte a toujours besoin que vous vous reconnectiez. Réessayez et choisissez le même compte.",
                pt: "Essa conta ainda precisa que você entre de novo. Tente de novo e escolha a mesma conta.",
            }),
        },
        notNow: t({ en: "Not now", de: "Nicht jetzt", es: "Ahora no", fr: "Pas maintenant", pt: "Agora não" }),
        tryAgain: t({
            en: "Try again",
            de: "Erneut versuchen",
            es: "Intentar de nuevo",
            fr: "Réessayer",
            pt: "Tentar de novo",
        }),
    },
    key: "dashboard-banks",
} satisfies Dictionary;

export default dashboardBanks;
