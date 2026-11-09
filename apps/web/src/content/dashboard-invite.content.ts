import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInvite = {
    content: {
        share: t({
            en: "Share invite",
            es: "Compartir invitación",
            fr: "Partager l'invitation",
            pt: "Compartilhar convite",
        }),
        shareMessage: insert(
            t({
                en: "A month of Outlayr Pro, on me. Code {{code}}: {{link}}",
                es: "Un mes de Outlayr Pro, de mi parte. Código {{code}}: {{link}}",
                fr: "Un mois d'Outlayr Pro, offert par moi. Code {{code}} : {{link}}",
                pt: "Um mês de Outlayr Pro, por minha conta. Código {{code}}: {{link}}",
            })
        ),
        monthsEarned: t({ en: "Months earned", es: "Meses ganados", fr: "Mois gagnés", pt: "Meses ganhos" }),
        lifetime: t({ en: "Lifetime", es: "En total", fr: "Au total", pt: "No total" }),
        yearlyLimit: t({ en: "Yearly limit", es: "Límite anual", fr: "Limite annuelle", pt: "Limite anual" }),
        friends: t({ en: "Friends", es: "Amigos", fr: "Amis", pt: "Amigos" }),
        stillLogging: insert(
            t({
                en: "{{count}} still logging",
                es: "{{count}} siguen registrando",
                fr: "{{count}} en cours",
                pt: "{{count}} ainda registrando",
            })
        ),
        noneYet: t({ en: "None yet", es: "Ninguno aún", fr: "Aucun pour l'instant", pt: "Nenhum ainda" }),
        headline: t({
            en: "Give a friend a month of Pro. Get one back.",
            es: "Regala a un amigo un mes de Pro. Recibe otro.",
            fr: "Offrez un mois de Pro à un ami. Recevez-en un.",
            pt: "Dê um mês de Pro a um amigo. Ganhe outro.",
        }),
        yourLink: t({ en: "Your link", es: "Tu enlace", fr: "Votre lien", pt: "Seu link" }),
        yourCode: t({ en: "Your code", es: "Tu código", fr: "Votre code", pt: "Seu código" }),
        copy: t({ en: "Copy", es: "Copiar", fr: "Copier", pt: "Copiar" }),
        copied: t({ en: "Copied", es: "Copiado", fr: "Copié", pt: "Copiado" }),
        copyFailed: t({
            en: "Couldn't copy. Select the text instead.",
            es: "No se pudo copiar. Selecciona el texto.",
            fr: "Copie impossible. Sélectionnez le texte.",
            pt: "Não foi possível copiar. Selecione o texto.",
        }),
        footnote: insert(
            t({
                en: "A month lands when a friend logs {{days}} days. Up to {{cap}} a year.",
                es: "Recibes un mes cuando un amigo registra {{days}} días. Hasta {{cap}} al año.",
                fr: "Un mois arrive quand un ami saisit {{days}} jours. Jusqu'à {{cap}} par an.",
                pt: "Um mês chega quando um amigo registra {{days}} dias. Até {{cap}} por ano.",
            })
        ),
        enter: t({
            en: "Have an invite code?",
            es: "¿Tienes un código de invitación?",
            fr: "Vous avez un code d'invitation ?",
            pt: "Tem um código de convite?",
        }),
        codeLabel: t({
            en: "Invite code",
            es: "Código de invitación",
            fr: "Code d'invitation",
            pt: "Código de convite",
        }),
        codePlaceholder: t({
            en: "8 letters and numbers",
            es: "8 letras y números",
            fr: "8 lettres et chiffres",
            pt: "8 letras e números",
        }),
        apply: t({ en: "Apply", es: "Aplicar", fr: "Appliquer", pt: "Aplicar" }),
        wrongCode: t({
            en: "Codes are 8 letters and numbers.",
            es: "Los códigos tienen 8 letras y números.",
            fr: "Les codes comptent 8 lettres et chiffres.",
            pt: "Os códigos têm 8 letras e números.",
        }),
        refusal: {
            hadPro: t({
                en: "Invites are for accounts that never had Pro.",
                es: "Las invitaciones son para cuentas que nunca tuvieron Pro.",
                fr: "Les invitations sont pour les comptes qui n'ont jamais eu Pro.",
                pt: "Convites são para contas que nunca tiveram Pro.",
            }),
            invalid: t({
                en: "That code doesn't match an invite.",
                es: "Ese código no corresponde a ninguna invitación.",
                fr: "Ce code ne correspond à aucune invitation.",
                pt: "Esse código não corresponde a nenhum convite.",
            }),
            notNew: t({
                en: "Invites are for new accounts.",
                es: "Las invitaciones son para cuentas nuevas.",
                fr: "Les invitations sont réservées aux nouveaux comptes.",
                pt: "Convites são para contas novas.",
            }),
            offline: t({
                en: "Couldn't reach Outlayr. Try again.",
                es: "No pudimos conectar con Outlayr. Inténtalo de nuevo.",
                fr: "Impossible de joindre Outlayr. Réessayez.",
                pt: "Não foi possível conectar ao Outlayr. Tente de novo.",
            }),
            own: t({
                en: "That's your own code.",
                es: "Ese es tu propio código.",
                fr: "C'est votre propre code.",
                pt: "Esse é o seu próprio código.",
            }),
            rateLimited: t({
                en: "Too many tries. Try again in an hour.",
                es: "Demasiados intentos. Prueba de nuevo en una hora.",
                fr: "Trop d'essais. Réessayez dans une heure.",
                pt: "Muitas tentativas. Tente de novo em uma hora.",
            }),
            unavailable: t({
                en: "Couldn't check your subscription.",
                es: "No pudimos revisar tu suscripción.",
                fr: "Impossible de vérifier votre abonnement.",
                pt: "Não foi possível verificar sua assinatura.",
            }),
            used: t({
                en: "You've already used an invite.",
                es: "Ya usaste una invitación.",
                fr: "Vous avez déjà utilisé une invitation.",
                pt: "Você já usou um convite.",
            }),
        },
        name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
        progress: t({ en: "Progress", es: "Progreso", fr: "Progression", pt: "Progresso" }),
        unnamed: t({ en: "A friend", es: "Un amigo", fr: "Un ami", pt: "Um amigo" }),
        logged: insert(
            t({
                en: "Logged {{days}} of {{total}} days",
                es: "Registró {{days}} de {{total}} días",
                fr: "{{days}} jours saisis sur {{total}}",
                pt: "Registrou {{days}} de {{total}} dias",
            })
        ),
        done: insert(
            t({
                en: "Logged {{days}} days · {{date}}",
                es: "Registró {{days}} días · {{date}}",
                fr: "{{days}} jours saisis · {{date}}",
                pt: "Registrou {{days}} dias · {{date}}",
            })
        ),
        status: {
            capped: t({ en: "Yearly limit", es: "Límite anual", fr: "Limite annuelle", pt: "Limite anual" }),
            counting: t({ en: "Pending", es: "Pendiente", fr: "En attente", pt: "Pendente" }),
            lifetime: t({ en: "Lifetime", es: "De por vida", fr: "À vie", pt: "Vitalício" }),
            rewarded: t({ en: "+1 month", es: "+1 mes", fr: "+1 mois", pt: "+1 mês" }),
        },
        emptyTitle: t({
            en: "No friends yet",
            es: "Aún no hay amigos",
            fr: "Aucun ami pour l'instant",
            pt: "Nenhum amigo ainda",
        }),
        emptyBody: insert(
            t({
                en: "A month lands when a friend logs {{days}} days.",
                es: "Recibes un mes cuando un amigo registra {{days}} días.",
                fr: "Un mois arrive quand un ami saisit {{days}} jours.",
                pt: "Um mês chega quando um amigo registra {{days}} dias.",
            })
        ),
        loadFailed: t({
            en: "Couldn't load your invite.",
            es: "No se pudo cargar tu invitación.",
            fr: "Impossible de charger votre invitation.",
            pt: "Não foi possível carregar seu convite.",
        }),
        retry: t({ en: "Retry", es: "Reintentar", fr: "Réessayer", pt: "Tentar de novo" }),
        claim: {
            title: insert(
                t({
                    en: "{{name}} gave you a month of Pro",
                    es: "{{name}} te regaló un mes de Pro",
                    fr: "{{name}} vous offre un mois de Pro",
                    pt: "{{name}} te deu um mês de Pro",
                })
            ),
            titleFriend: t({
                en: "A friend gave you a month of Pro",
                es: "Un amigo te regaló un mes de Pro",
                fr: "Un ami vous offre un mois de Pro",
                pt: "Um amigo te deu um mês de Pro",
            }),
            startsNow: t({
                en: "Starts now. Nothing renews.",
                es: "Empieza ahora. No se renueva.",
                fr: "Commence maintenant. Rien ne se renouvelle.",
                pt: "Começa agora. Nada é renovado.",
            }),
            shared: insert(
                t({
                    en: "{{name}} sees your first name and how many days you've logged, up to {{days}}.",
                    es: "{{name}} ve tu primer nombre y cuántos días llevas registrados, hasta {{days}}.",
                    fr: "{{name}} voit votre prénom et combien de jours vous avez saisis, jusqu'à {{days}}.",
                    pt: "{{name}} vê seu primeiro nome e quantos dias você registrou, até {{days}}.",
                })
            ),
            sharedFriend: insert(
                t({
                    en: "Your friend sees your first name and how many days you've logged, up to {{days}}.",
                    es: "Tu amigo ve tu primer nombre y cuántos días llevas registrados, hasta {{days}}.",
                    fr: "Votre ami voit votre prénom et combien de jours vous avez saisis, jusqu'à {{days}}.",
                    pt: "Seu amigo vê seu primeiro nome e quantos dias você registrou, até {{days}}.",
                })
            ),
            notNow: t({ en: "Not now", es: "Ahora no", fr: "Pas maintenant", pt: "Agora não" }),
            confirm: t({ en: "Claim month", es: "Reclamar mes", fr: "Activer le mois", pt: "Resgatar mês" }),
            claimed: t({
                en: "A month of Pro is yours",
                es: "Ya tienes un mes de Pro",
                fr: "Un mois de Pro est à vous",
                pt: "Um mês de Pro é seu",
            }),
        },
        landed: {
            who: insert(
                t({
                    en: "{{name}} logged {{days}} days",
                    es: "{{name}} registró {{days}} días",
                    fr: "{{name}} a saisi {{days}} jours",
                    pt: "{{name}} registrou {{days}} dias",
                })
            ),
            whoMany: insert(
                t({
                    en: "{{count}} friends logged {{days}} days",
                    es: "{{count}} amigos registraron {{days}} días",
                    fr: "{{count}} amis ont saisi {{days}} jours",
                    pt: "{{count}} amigos registraram {{days}} dias",
                })
            ),
            earnedOne: t({
                en: "You earned a month of Pro.",
                es: "Ganaste un mes de Pro.",
                fr: "Vous avez gagné un mois de Pro.",
                pt: "Você ganhou um mês de Pro.",
            }),
            earnedMany: insert(
                t({
                    en: "You earned {{count}} months of Pro.",
                    es: "Ganaste {{count}} meses de Pro.",
                    fr: "Vous avez gagné {{count}} mois de Pro.",
                    pt: "Você ganhou {{count}} meses de Pro.",
                })
            ),
            until: t({ en: "Pro until", es: "Pro hasta", fr: "Pro jusqu'au", pt: "Pro até" }),
            starts: t({ en: "Starts", es: "Empieza", fr: "Commence", pt: "Começa" }),
            after: t({
                en: "After your plan",
                es: "Al terminar tu plan",
                fr: "Après votre formule",
                pt: "Depois do seu plano",
            }),
            fromFriends: t({
                en: "Months from friends",
                es: "Meses de amigos",
                fr: "Mois offerts par vos amis",
                pt: "Meses de amigos",
            }),
            done: t({ en: "Done", es: "Listo", fr: "Terminé", pt: "Concluído" }),
            another: t({
                en: "Invite another friend",
                es: "Invitar a otro amigo",
                fr: "Inviter un autre ami",
                pt: "Convidar outro amigo",
            }),
        },
    },
    key: "dashboard-invite" as const,
} satisfies Dictionary;

export default dashboardInvite;
