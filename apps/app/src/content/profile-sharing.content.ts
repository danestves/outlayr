import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const profileSharing = {
    content: {
        deleteSharedBody: insert(
            t({
                en: "It leaves your devices and removes it for all {{count}} members. Entries stay on our servers until you delete your account.",
                de: "Es verschwindet von deinen Geräten und wird für alle {{count}} Mitglieder entfernt. Die Einträge bleiben auf unseren Servern, bis du dein Konto löschst.",
                es: "Sale de tus dispositivos y se elimina para los {{count}} miembros. Los movimientos siguen en nuestros servidores hasta que elimines tu cuenta.",
                fr: "Il quitte vos appareils et il est supprimé pour les {{count}} membres. Les opérations restent sur nos serveurs jusqu'à la suppression de votre compte.",
                pt: "Ele sai dos seus aparelhos e é removido para os {{count}} membros. Os lançamentos ficam nos nossos servidores até você excluir sua conta.",
            })
        ),
        details: {
            created: t({ en: "Created", de: "Erstellt", es: "Creado", fr: "Créé", pt: "Criado" }),
            currency: t({
                en: "Main currency",
                de: "Hauptwährung",
                es: "Moneda principal",
                fr: "Devise principale",
                pt: "Moeda principal",
            }),

            logged: insert(
                t({
                    en: "You logged {{count}} entries",
                    de: "Du hast {{count}} Einträge erfasst",
                    es: "Registraste {{count}} movimientos",
                    fr: "Vous avez saisi {{count}} opérations",
                    pt: "Você registrou {{count}} lançamentos",
                })
            ),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            owner: t({ en: "Owner", de: "Inhaber", es: "Dueño", fr: "Propriétaire", pt: "Dono" }),
            title: t({ en: "Details", de: "Details", es: "Detalles", fr: "Détails", pt: "Detalhes" }),
            you: t({ en: "You", de: "Du", es: "Tú", fr: "Vous", pt: "Você" }),
        },
        error: {
            close: t({
                en: "Open Outlayr",
                de: "Outlayr öffnen",
                es: "Abrir Outlayr",
                fr: "Ouvrir Outlayr",
                pt: "Abrir o Outlayr",
            }),

            expiredBody: insert(
                t({
                    en: "Ask {{name}} for a new link.",
                    de: "Bitte {{name}} um einen neuen Link.",
                    es: "Pídele a {{name}} un enlace nuevo.",
                    fr: "Demandez un nouveau lien à {{name}}.",
                    pt: "Peça um link novo para {{name}}.",
                })
            ),
            expiredBodyUnknown: t({
                en: "Ask whoever sent it for a new link.",
                de: "Bitte die Person, die ihn geschickt hat, um einen neuen Link.",
                es: "Pídele a quien te lo envió un enlace nuevo.",
                fr: "Demandez un nouveau lien à la personne qui vous l'a envoyé.",
                pt: "Peça um link novo para quem enviou.",
            }),
            expiredTitle: t({
                en: "Invite expired",
                de: "Einladung abgelaufen",
                es: "Invitación vencida",
                fr: "Invitation expirée",
                pt: "Convite expirado",
            }),

            fullBody: insert(
                t({
                    en: "All {{limit}} seats are taken. Ask {{name}} to free one.",
                    de: "Alle {{limit}} Plätze sind belegt. Bitte {{name}}, einen freizugeben.",
                    es: "Los {{limit}} puestos están ocupados. Pídele a {{name}} que libere uno.",
                    fr: "Les {{limit}} places sont prises. Demandez à {{name}} d'en libérer une.",
                    pt: "As {{limit}} vagas estão ocupadas. Peça a {{name}} para liberar uma.",
                })
            ),

            fullBodyUnknown: insert(
                t({
                    en: "All {{limit}} seats are taken. Ask the owner to free one.",
                    de: "Alle {{limit}} Plätze sind belegt. Bitte die Person, der das Profil gehört, einen freizugeben.",
                    es: "Los {{limit}} puestos están ocupados. Pídele al dueño que libere uno.",
                    fr: "Les {{limit}} places sont prises. Demandez au propriétaire d'en libérer une.",
                    pt: "As {{limit}} vagas estão ocupadas. Peça ao dono para liberar uma.",
                })
            ),

            fullTitle: insert(
                t({
                    en: "{{name}} is full",
                    de: "{{name}} ist voll",
                    es: "{{name}} está lleno",
                    fr: "{{name}} est complet",
                    pt: "{{name}} está cheio",
                })
            ),
            fullTitleUnknown: t({
                en: "This profile is full",
                de: "Dieses Profil ist voll",
                es: "Este perfil está lleno",
                fr: "Ce profil est complet",
                pt: "Este perfil está cheio",
            }),
            genericBody: t({
                en: "Try again in a minute.",
                de: "Versuch es in einer Minute noch mal.",
                es: "Inténtalo de nuevo en un minuto.",
                fr: "Réessayez dans une minute.",
                pt: "Tente de novo em um minuto.",
            }),
            genericTitle: t({
                en: "Couldn't join the profile",
                de: "Beitritt zum Profil fehlgeschlagen",
                es: "No se pudo unir al perfil",
                fr: "Impossible de rejoindre le profil",
                pt: "Não foi possível entrar no perfil",
            }),
            invalidBody: t({
                en: "The link is broken. Ask whoever sent it for a new one.",
                de: "Der Link ist kaputt. Bitte die Person, die ihn geschickt hat, um einen neuen.",
                es: "El enlace está roto. Pídele a quien te lo envió uno nuevo.",
                fr: "Le lien est cassé. Demandez-en un nouveau à la personne qui vous l'a envoyé.",
                pt: "O link está quebrado. Peça um novo para quem enviou.",
            }),
            invalidTitle: t({
                en: "Invite not valid",
                de: "Einladung ungültig",
                es: "Invitación no válida",
                fr: "Invitation non valide",
                pt: "Convite inválido",
            }),

            lapsedBody: insert(
                t({
                    en: "Ask {{name}} to check their Outlayr Pro.",
                    de: "Bitte {{name}}, das Outlayr Pro zu prüfen.",
                    es: "Pídele a {{name}} que revise su Outlayr Pro.",
                    fr: "Demandez à {{name}} de vérifier son Outlayr Pro.",
                    pt: "Peça a {{name}} para verificar o Outlayr Pro.",
                })
            ),
            lapsedBodyUnknown: t({
                en: "Ask the owner to check their Outlayr Pro.",
                de: "Bitte die Person, der das Profil gehört, das Outlayr Pro zu prüfen.",
                es: "Pídele al dueño que revise su Outlayr Pro.",
                fr: "Demandez au propriétaire de vérifier son Outlayr Pro.",
                pt: "Peça ao dono para verificar o Outlayr Pro.",
            }),

            lapsedTitle: insert(
                t({
                    en: "{{name}} isn't available",
                    de: "{{name}} ist nicht verfügbar",
                    es: "{{name}} no está disponible",
                    fr: "{{name}} n'est pas disponible",
                    pt: "{{name}} não está disponível",
                })
            ),
            lapsedTitleUnknown: t({
                en: "This profile isn't available",
                de: "Dieses Profil ist nicht verfügbar",
                es: "Este perfil no está disponible",
                fr: "Ce profil n'est pas disponible",
                pt: "Este perfil não está disponível",
            }),
            ownBody: t({
                en: "You already own it.",
                de: "Es gehört schon dir.",
                es: "Ya es tuyo.",
                fr: "Il vous appartient déjà.",
                pt: "Ele já é seu.",
            }),
            ownTitle: t({
                en: "This is your profile",
                de: "Das ist dein Profil",
                es: "Este es tu perfil",
                fr: "C'est votre profil",
                pt: "Este é o seu perfil",
            }),
        },
        invite: {
            anyone: t({
                en: "Anyone with the link can join",
                de: "Jeder mit dem Link kann beitreten",
                es: "Cualquiera con el enlace puede unirse",
                fr: "Toute personne avec le lien peut rejoindre",
                pt: "Qualquer pessoa com o link pode entrar",
            }),
            copied: t({
                en: "Invite link copied",
                de: "Einladungslink kopiert",
                es: "Enlace de invitación copiado",
                fr: "Lien d'invitation copié",
                pt: "Link do convite copiado",
            }),
            copy: t({ en: "Copy", de: "Kopieren", es: "Copiar", fr: "Copier", pt: "Copiar" }),
            copyFailed: t({
                en: "Couldn't copy the link. Select it and copy it instead.",
                de: "Der Link konnte nicht kopiert werden. Wähle ihn aus und kopiere ihn stattdessen.",
                es: "No se pudo copiar el enlace. Selecciónalo y cópialo.",
                fr: "Impossible de copier le lien. Sélectionnez-le et copiez-le.",
                pt: "Não foi possível copiar o link. Selecione-o e copie.",
            }),

            expires: insert(
                t({
                    en: "Expires {{date}}",
                    de: "Läuft am {{date}} ab",
                    es: "Vence el {{date}}",
                    fr: "Expire le {{date}}",
                    pt: "Expira em {{date}}",
                })
            ),
            failed: t({
                en: "Couldn't create a link. Try again.",
                de: "Der Link konnte nicht erstellt werden. Versuch es noch mal.",
                es: "No se pudo crear un enlace. Inténtalo de nuevo.",
                fr: "Impossible de créer un lien. Réessayez.",
                pt: "Não foi possível criar um link. Tente de novo.",
            }),

            full: insert(
                t({
                    en: "All {{limit}} seats are taken.",
                    de: "Alle {{limit}} Plätze sind belegt.",
                    es: "Los {{limit}} puestos están ocupados.",
                    fr: "Les {{limit}} places sont prises.",
                    pt: "As {{limit}} vagas estão ocupadas.",
                })
            ),
            seatsLeft: insert(
                t({
                    en: "{{count}} seats left",
                    de: "{{count}} Plätze frei",
                    es: "Quedan {{count}} puestos",
                    fr: "{{count}} places restantes",
                    pt: "Restam {{count}} vagas",
                })
            ),
            title: t({
                en: "Invite link",
                de: "Einladungslink",
                es: "Enlace de invitación",
                fr: "Lien d'invitation",
                pt: "Link do convite",
            }),
        },
        join: {
            action: t({ en: "Join", de: "Beitreten", es: "Unirme", fr: "Rejoindre", pt: "Entrar" }),
            add: t({
                en: "Add and edit entries",
                de: "Einträge hinzufügen und bearbeiten",
                es: "Agrega y edita movimientos",
                fr: "Ajouter et modifier des opérations",
                pt: "Adicione e edite lançamentos",
            }),

            invited: insert(
                t({
                    en: "{{name}} invited you to",
                    de: "{{name}} lädt dich ein zu",
                    es: "{{name}} te invitó a",
                    fr: "{{name}} vous invite à",
                    pt: "{{name}} convidou você para",
                })
            ),
            invitedUnknown: t({
                en: "You're invited to",
                de: "Du bist eingeladen zu",
                es: "Te invitaron a",
                fr: "Vous êtes invité à",
                pt: "Você foi convidado para",
            }),
            joining: t({
                en: "Joining…",
                de: "Beitritt läuft…",
                es: "Uniéndote…",
                fr: "Connexion…",
                pt: "Entrando…",
            }),
            leave: t({
                en: "Leave any time",
                de: "Jederzeit verlassen",
                es: "Sal cuando quieras",
                fr: "Partez quand vous voulez",
                pt: "Saia quando quiser",
            }),
            notNow: t({ en: "Not now", de: "Nicht jetzt", es: "Ahora no", fr: "Pas maintenant", pt: "Agora não" }),
            see: t({
                en: "See who logged each one",
                de: "Sieh, wer was erfasst hat",
                es: "Mira quién registró cada uno",
                fr: "Voyez qui a saisi chaque opération",
                pt: "Veja quem registrou cada um",
            }),
            title: t({
                en: "Join a shared profile",
                de: "Einem geteilten Profil beitreten",
                es: "Únete a un perfil compartido",
                fr: "Rejoindre un profil partagé",
                pt: "Entre em um perfil compartilhado",
            }),
        },
        leave: {
            action: t({ en: "Leave", de: "Verlassen", es: "Salir", fr: "Quitter", pt: "Sair" }),
            body: t({
                en: "It leaves your devices. Entries you logged stay for the others.",
                de: "Es verschwindet von deinen Geräten. Deine Einträge bleiben für die anderen.",
                es: "Sale de tus dispositivos. Los movimientos que registraste quedan para los demás.",
                fr: "Il quitte vos appareils. Les opérations que vous avez saisies restent pour les autres.",
                pt: "Ele sai dos seus aparelhos. Os lançamentos que você registrou ficam para os outros.",
            }),
            failed: t({
                en: "Couldn't leave the profile. Try again.",
                de: "Profil verlassen fehlgeschlagen. Versuch es noch mal.",
                es: "No se pudo salir del perfil. Inténtalo de nuevo.",
                fr: "Impossible de quitter le profil. Réessayez.",
                pt: "Não foi possível sair do perfil. Tente de novo.",
            }),
            hint: t({
                en: "Your entries stay for the others",
                de: "Deine Einträge bleiben für die anderen",
                es: "Tus movimientos quedan para los demás",
                fr: "Vos opérations restent pour les autres",
                pt: "Seus lançamentos ficam para os outros",
            }),

            unsynced: t({
                en: "Couldn't save your latest changes. Try again before leaving.",
                de: "Deine letzten Änderungen konnten nicht gespeichert werden. Versuch es vor dem Verlassen noch mal.",
                es: "No se pudieron guardar tus últimos cambios. Inténtalo de nuevo antes de salir.",
                fr: "Impossible d'enregistrer vos dernières modifications. Réessayez avant de quitter.",
                pt: "Não foi possível salvar suas últimas alterações. Tente de novo antes de sair.",
            }),
            label: t({
                en: "Leave profile",
                de: "Profil verlassen",
                es: "Salir del perfil",
                fr: "Quitter le profil",
                pt: "Sair do perfil",
            }),

            title: insert(
                t({
                    en: "Leave {{name}}?",
                    de: "{{name}} verlassen?",
                    es: "¿Salir de {{name}}?",
                    fr: "Quitter {{name}} ?",
                    pt: "Sair de {{name}}?",
                })
            ),
        },
        formerMembers: t({
            en: "Former members",
            de: "Ehemalige Mitglieder",
            es: "Miembros anteriores",
            fr: "Anciens membres",
            pt: "Membros anteriores",
        }),
        memberUnknown: t({ en: "Member", de: "Mitglied", es: "Miembro", fr: "Membre", pt: "Membro" }),
        members: {
            count: insert(
                t({
                    en: "{{count}} of {{limit}}",
                    de: "{{count}} von {{limit}}",
                    es: "{{count}} de {{limit}}",
                    fr: "{{count}} sur {{limit}}",
                    pt: "{{count}} de {{limit}}",
                })
            ),

            joined: insert(
                t({
                    en: "Joined {{date}}",
                    de: "Beigetreten am {{date}}",
                    es: "Se unió el {{date}}",
                    fr: "A rejoint le {{date}}",
                    pt: "Entrou em {{date}}",
                })
            ),
            owner: t({ en: "Owner", de: "Inhaber", es: "Dueño", fr: "Propriétaire", pt: "Dono" }),
            remove: t({ en: "Remove", de: "Entfernen", es: "Quitar", fr: "Retirer", pt: "Remover" }),
            removeBody: t({
                en: "They lose access on their devices. Entries they logged stay.",
                de: "Die Person verliert den Zugriff auf ihren Geräten. Ihre Einträge bleiben.",
                es: "Pierde el acceso en sus dispositivos. Los movimientos que registró quedan.",
                fr: "Cette personne perd l'accès sur ses appareils. Les opérations qu'elle a saisies restent.",
                pt: "A pessoa perde o acesso nos aparelhos dela. Os lançamentos que ela registrou ficam.",
            }),
            removeFailed: t({
                en: "Couldn't remove the member. Try again.",
                de: "Mitglied konnte nicht entfernt werden. Versuch es noch mal.",
                es: "No se pudo quitar al miembro. Inténtalo de nuevo.",
                fr: "Impossible de retirer le membre. Réessayez.",
                pt: "Não foi possível remover o membro. Tente de novo.",
            }),

            removeTitle: insert(
                t({
                    en: "Remove {{name}}?",
                    de: "{{name}} entfernen?",
                    es: "¿Quitar a {{name}}?",
                    fr: "Retirer {{name}} ?",
                    pt: "Remover {{name}}?",
                })
            ),

            shared: insert(
                t({
                    en: "Shared it {{date}}",
                    de: "Geteilt am {{date}}",
                    es: "Lo compartió el {{date}}",
                    fr: "Partagé le {{date}}",
                    pt: "Compartilhou em {{date}}",
                })
            ),
            title: t({ en: "Members", de: "Mitglieder", es: "Miembros", fr: "Membres", pt: "Membros" }),
            you: t({ en: "You", de: "Du", es: "Tú", fr: "Vous", pt: "Você" }),
        },
        month: {
            entries: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),

            title: insert(
                t({
                    en: "Logged in {{month}}",
                    de: "Erfasst im {{month}}",
                    es: "Registrado en {{month}}",
                    fr: "Saisi en {{month}}",
                    pt: "Registrado em {{month}}",
                })
            ),
        },

        ownerOf: insert(
            t({
                en: "Owner {{name}}",
                de: "Inhaber {{name}}",
                es: "Dueño {{name}}",
                fr: "Propriétaire {{name}}",
                pt: "Dono {{name}}",
            })
        ),
        removed: t({
            en: "You no longer have access to that profile. Its data is gone from this browser.",
            de: "Du hast keinen Zugriff mehr auf dieses Profil. Seine Daten sind aus diesem Browser entfernt.",
            es: "Ya no tienes acceso a ese perfil. Sus datos salieron de este navegador.",
            fr: "Vous n'avez plus accès à ce profil. Ses données ont quitté ce navigateur.",
            pt: "Você não tem mais acesso a esse perfil. Os dados dele saíram deste navegador.",
        }),
        open: t({ en: "Open", de: "Öffnen", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
        sharedWithYou: t({
            en: "Shared with you",
            de: "Mit dir geteilt",
            es: "Compartidos contigo",
            fr: "Partagés avec vous",
            pt: "Compartilhados com você",
        }),

        inviteTo: insert(
            t({
                en: "Invite to {{name}}",
                de: "Zu {{name}} einladen",
                es: "Invitar a {{name}}",
                fr: "Inviter à {{name}}",
                pt: "Convidar para {{name}}",
            })
        ),
        you: t({ en: "You", de: "Du", es: "Tú", fr: "Vous", pt: "Você" }),
    },
    key: "profile-sharing" as const,
} satisfies Dictionary;

export default profileSharing;
