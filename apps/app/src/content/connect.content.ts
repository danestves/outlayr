import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const connect = {
    content: {
        genericError: t({
            en: "Something went wrong. Try again.",
            de: "Etwas ist schiefgelaufen. Versuch es noch mal.",
            es: "Algo salió mal. Inténtalo de nuevo.",
            fr: "Un problème est survenu. Réessayez.",
            pt: "Algo deu errado. Tente novamente.",
        }),
        noMatch: t({
            en: "No request matches that code.",
            de: "Keine Anfrage passt zu diesem Code.",
            es: "Ninguna solicitud coincide con ese código.",
            fr: "Aucune demande ne correspond à ce code.",
            pt: "Nenhuma solicitação corresponde a esse código.",
        }),
        checking: t({
            en: "Checking…",
            de: "Wird geprüft…",
            es: "Comprobando…",
            fr: "Vérification…",
            pt: "Verificando…",
        }),
        continueLabel: t({ en: "Continue", de: "Weiter", es: "Continuar", fr: "Continuer", pt: "Continuar" }),
        connectAgentTitle: t({
            en: "Connect an agent",
            de: "Agent verbinden",
            es: "Conectar un agente",
            fr: "Connecter un agent",
            pt: "Conectar um agente",
        }),
        codeLabel: t({
            en: "Code from your agent",
            de: "Code von deinem Agenten",
            es: "Código de tu agente",
            fr: "Code de votre agent",
            pt: "Código do seu agente",
        }),
        enterCode: t({
            en: "Enter a code",
            de: "Code eingeben",
            es: "Introducir un código",
            fr: "Saisir un code",
            pt: "Inserir um código",
        }),
        expiredBody: t({
            en: "This request has expired or was already used.",
            de: "Diese Anfrage ist abgelaufen oder wurde bereits verwendet.",
            es: "Esta solicitud caducó o ya se usó.",
            fr: "Cette demande a expiré ou a déjà été utilisée.",
            pt: "Esta solicitação expirou ou já foi usada.",
        }),
        closedTitle: t({
            en: "Connect request closed",
            de: "Verbindungsanfrage geschlossen",
            es: "Solicitud de conexión cerrada",
            fr: "Demande de connexion fermée",
            pt: "Solicitação de conexão encerrada",
        }),
        showCode: t({
            en: "Make sure your agent shows this code",
            de: "Stelle sicher, dass dein Agent diesen Code anzeigt",
            es: "Asegúrate de que tu agente muestre este código",
            fr: "Assurez-vous que votre agent affiche ce code",
            pt: "Certifique-se de que seu agente mostre este código",
        }),
        willBeAble: insert(
            t({
                en: "{{client}} will be able to:",
                de: "{{client}} kann dann:",
                es: "{{client}} podrá:",
                fr: "{{client}} pourra :",
                pt: "{{client}} poderá:",
            })
        ),
        approve: t({ en: "Approve", de: "Genehmigen", es: "Aprobar", fr: "Approuver", pt: "Aprovar" }),
        approving: t({
            en: "Approving…",
            de: "Wird genehmigt…",
            es: "Aprobando…",
            fr: "Approbation…",
            pt: "Aprovando…",
        }),
        allow: t({ en: "Allow", de: "Erlauben", es: "Permitir", fr: "Autoriser", pt: "Permitir" }),
        allowing: t({
            en: "Allowing…",
            de: "Wird erlaubt…",
            es: "Permitiendo…",
            fr: "Autorisation…",
            pt: "Permitindo…",
        }),
        approved: t({ en: "Approved", de: "Genehmigt", es: "Aprobado", fr: "Approuvé", pt: "Aprovado" }),
        done: t({
            en: "Done. Go back to your agent.",
            de: "Fertig. Geh zurück zu deinem Agenten.",
            es: "Listo. Vuelve a tu agente.",
            fr: "Terminé. Revenez à votre agent.",
            pt: "Pronto. Volte ao seu agente.",
        }),
        signedInAs: insert(
            t({
                en: "Signed in as {{email}}",
                de: "Angemeldet als {{email}}",
                es: "Sesión iniciada como {{email}}",
                fr: "Connecté en tant que {{email}}",
                pt: "Conectado como {{email}}",
            })
        ),
        deny: t({ en: "Deny", de: "Ablehnen", es: "Denegar", fr: "Refuser", pt: "Negar" }),
        connectClient: insert(
            t({
                en: "Connect {{client}}",
                de: "{{client}} verbinden",
                es: "Conectar {{client}}",
                fr: "Connecter {{client}}",
                pt: "Conectar {{client}}",
            })
        ),
        unverified: t({
            en: "unverified",
            de: "unbestätigt",
            es: "sin verificar",
            fr: "non vérifié",
            pt: "não verificado",
        }),
        anAgent: t({ en: "an agent", de: "einen Agenten", es: "un agente", fr: "un agent", pt: "um agente" }),
    },
    key: "connect",
} satisfies Dictionary;

export default connect;
