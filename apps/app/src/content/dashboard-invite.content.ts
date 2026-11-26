import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInvite = {
    content: {
        share: t({
            en: "Share invite",
            de: "Einladung teilen",
            es: "Compartir invitación",
            fr: "Partager l'invitation",
            pt: "Compartilhar convite",
            "pt-PT": "Partilhar convite",
        }),
        shareMessage: insert(
            t({
                en: "A month of Outlayr Pro, on me. Code {{code}}: {{link}}",
                de: "Ein Monat Outlayr Pro geht auf mich. Code {{code}}: {{link}}",
                es: "Un mes de Outlayr Pro, de mi parte. Código {{code}}: {{link}}",
                fr: "Un mois d'Outlayr Pro, offert par moi. Code {{code}} : {{link}}",
                pt: "Um mês de Outlayr Pro, por minha conta. Código {{code}}: {{link}}",
            })
        ),
        monthsEarned: t({
            en: "Months earned",
            de: "Verdiente Monate",
            es: "Meses ganados",
            fr: "Mois gagnés",
            pt: "Meses ganhos",
        }),
        lifetime: t({ en: "Lifetime", de: "Insgesamt", es: "En total", fr: "Au total", pt: "No total" }),
        yearlyLimit: t({
            en: "Yearly limit",
            de: "Jahreslimit",
            es: "Límite anual",
            fr: "Limite annuelle",
            pt: "Limite anual",
        }),
        friends: t({ en: "Friends", de: "Freunde", es: "Amigos", fr: "Amis", pt: "Amigos" }),
        stillLogging: insert(
            t({
                en: "{{count}} still logging",
                de: "{{count}} erfassen noch",
                es: "{{count}} siguen registrando",
                fr: "{{count}} en cours",
                pt: "{{count}} ainda registrando",
                "pt-PT": "{{count}} ainda a registar",
            })
        ),
        noneYet: t({
            en: "None yet",
            de: "Noch keine",
            es: "Ninguno aún",
            fr: "Aucun pour l'instant",
            pt: "Nenhum ainda",
        }),
        headline: t({
            en: "Give a friend a month of Pro. Get one back.",
            de: "Schenk einem Freund einen Monat Pro. Bekomm einen zurück.",
            es: "Regala a un amigo un mes de Pro. Recibe otro.",
            fr: "Offrez un mois de Pro à un ami. Recevez-en un.",
            pt: "Dê um mês de Pro a um amigo. Ganhe outro.",
            "pt-PT": "Ofereça um mês de Pro a um amigo. Receba outro.",
        }),
        yourLink: t({ en: "Your link", de: "Dein Link", es: "Tu enlace", fr: "Votre lien", pt: "Seu link" }),
        yourCode: t({ en: "Your code", de: "Dein Code", es: "Tu código", fr: "Votre code", pt: "Seu código" }),
        copy: t({ en: "Copy", de: "Kopieren", es: "Copiar", fr: "Copier", pt: "Copiar" }),
        copied: t({ en: "Copied", de: "Kopiert", es: "Copiado", fr: "Copié", pt: "Copiado" }),
        copyFailed: t({
            en: "Couldn't copy. Select the text instead.",
            de: "Kopieren hat nicht geklappt. Markiere stattdessen den Text.",
            es: "No se pudo copiar. Selecciona el texto.",
            fr: "Copie impossible. Sélectionnez le texte.",
            pt: "Não foi possível copiar. Selecione o texto.",
        }),
        footnote: insert(
            t({
                en: "A month lands when a friend logs {{days}} days. Up to {{cap}} a year.",
                de: "Ein Monat wird gutgeschrieben, sobald ein Freund {{days}} Tage erfasst. Bis zu {{cap}} im Jahr.",
                es: "Recibes un mes cuando un amigo registra {{days}} días. Hasta {{cap}} al año.",
                fr: "Un mois arrive quand un ami saisit {{days}} jours. Jusqu'à {{cap}} par an.",
                pt: "Um mês chega quando um amigo registra {{days}} dias. Até {{cap}} por ano.",
                "pt-PT": "Um mês chega quando um amigo regista {{days}} dias. Até {{cap}} por ano.",
            })
        ),
        footnotePaid: insert(
            t({
                en: "A month lands when a friend buys Pro. Up to {{cap}} a year.",
                de: "Ein Monat kommt, wenn ein Freund Pro kauft. Bis zu {{cap}} pro Jahr.",
                es: "Recibes un mes cuando un amigo compra Pro. Hasta {{cap}} al año.",
                fr: "Un mois arrive quand un ami achète Pro. Jusqu'à {{cap}} par an.",
                pt: "Um mês chega quando um amigo compra o Pro. Até {{cap}} por ano.",
            })
        ),
        enter: t({
            en: "Have an invite code?",
            de: "Hast du einen Einladungscode?",
            es: "¿Tienes un código de invitación?",
            fr: "Vous avez un code d'invitation ?",
            pt: "Tem um código de convite?",
        }),
        codeLabel: t({
            en: "Invite code",
            de: "Einladungscode",
            es: "Código de invitación",
            fr: "Code d'invitation",
            pt: "Código de convite",
        }),
        codePlaceholder: t({
            en: "8 letters and numbers",
            de: "8 Buchstaben und Zahlen",
            es: "8 letras y números",
            fr: "8 lettres et chiffres",
            pt: "8 letras e números",
        }),
        apply: t({ en: "Apply", de: "Anwenden", es: "Aplicar", fr: "Appliquer", pt: "Aplicar" }),
        checking: t({
            en: "Checking…",
            de: "Wird geprüft…",
            es: "Comprobando…",
            fr: "Vérification…",
            pt: "Verificando…",
            "pt-PT": "A verificar…",
        }),
        wrongCode: t({
            en: "Codes are 8 letters and numbers.",
            de: "Codes bestehen aus 8 Buchstaben und Zahlen.",
            es: "Los códigos tienen 8 letras y números.",
            fr: "Les codes comptent 8 lettres et chiffres.",
            pt: "Os códigos têm 8 letras e números.",
        }),
        refusal: {
            hadPro: t({
                en: "Invites are for accounts that never had Pro.",
                de: "Einladungen gelten für Konten, die noch nie Pro hatten.",
                es: "Las invitaciones son para cuentas que nunca tuvieron Pro.",
                fr: "Les invitations sont pour les comptes qui n'ont jamais eu Pro.",
                pt: "Convites são para contas que nunca tiveram Pro.",
                "pt-PT": "Os convites são para contas que nunca tiveram Pro.",
            }),
            invalid: t({
                en: "That code doesn't match an invite.",
                de: "Dieser Code passt zu keiner Einladung.",
                es: "Ese código no corresponde a ninguna invitación.",
                fr: "Ce code ne correspond à aucune invitation.",
                pt: "Esse código não corresponde a nenhum convite.",
            }),
            notNew: t({
                en: "Invites are for new accounts.",
                de: "Einladungen gelten für neue Konten.",
                es: "Las invitaciones son para cuentas nuevas.",
                fr: "Les invitations sont réservées aux nouveaux comptes.",
                pt: "Convites são para contas novas.",
                "pt-PT": "Os convites são para contas novas.",
            }),
            offline: t({
                en: "Couldn't reach Outlayr. Try again.",
                de: "Outlayr nicht erreichbar. Versuch es noch mal.",
                es: "No pudimos conectar con Outlayr. Inténtalo de nuevo.",
                fr: "Impossible de joindre Outlayr. Réessayez.",
                pt: "Não foi possível conectar ao Outlayr. Tente de novo.",
                "pt-PT": "Não foi possível ligar ao Outlayr. Tente novamente.",
            }),
            own: t({
                en: "That's your own code.",
                de: "Das ist dein eigener Code.",
                es: "Ese es tu propio código.",
                fr: "C'est votre propre code.",
                pt: "Esse é o seu próprio código.",
            }),
            rateLimited: t({
                en: "Too many tries. Try again in an hour.",
                de: "Zu viele Versuche. Versuch es in einer Stunde noch mal.",
                es: "Demasiados intentos. Prueba de nuevo en una hora.",
                fr: "Trop d'essais. Réessayez dans une heure.",
                pt: "Muitas tentativas. Tente de novo em uma hora.",
                "pt-PT": "Demasiadas tentativas. Tente novamente dentro de uma hora.",
            }),
            unavailable: t({
                en: "Couldn't check your subscription.",
                de: "Dein Abo konnte nicht geprüft werden.",
                es: "No pudimos revisar tu suscripción.",
                fr: "Impossible de vérifier votre abonnement.",
                pt: "Não foi possível verificar sua assinatura.",
                "pt-PT": "Não foi possível verificar a sua subscrição.",
            }),
            used: t({
                en: "You've already used an invite.",
                de: "Du hast schon eine Einladung eingelöst.",
                es: "Ya usaste una invitación.",
                "es-ES": "Ya has usado una invitación.",
                fr: "Vous avez déjà utilisé une invitation.",
                pt: "Você já usou um convite.",
                "pt-PT": "Já usou um convite.",
            }),
        },
        name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
        progress: t({ en: "Progress", de: "Fortschritt", es: "Progreso", fr: "Progression", pt: "Progresso" }),
        unnamed: t({ en: "A friend", de: "Ein Freund", es: "Un amigo", fr: "Un ami", pt: "Um amigo" }),
        logged: insert(
            t({
                en: "Logged {{days}} of {{total}} days",
                de: "{{days}} von {{total}} Tagen erfasst",
                es: "Registró {{days}} de {{total}} días",
                fr: "{{days}} jours saisis sur {{total}}",
                pt: "Registrou {{days}} de {{total}} dias",
                "pt-PT": "Registou {{days}} de {{total}} dias",
            })
        ),
        waiting: t({
            en: "No purchase yet",
            de: "Noch kein Kauf",
            es: "Aún sin compra",
            fr: "Pas encore d'achat",
            pt: "Nenhuma compra ainda",
            "pt-PT": "Ainda sem compra",
        }),
        done: insert(
            t({
                en: "Logged {{days}} days · {{date}}",
                de: "{{days}} Tage erfasst · {{date}}",
                es: "Registró {{days}} días · {{date}}",
                fr: "{{days}} jours saisis · {{date}}",
                pt: "Registrou {{days}} dias · {{date}}",
                "pt-PT": "Registou {{days}} dias · {{date}}",
            })
        ),
        bought: insert(
            t({
                en: "Bought Pro · {{date}}",
                de: "Pro gekauft · {{date}}",
                es: "Compró Pro · {{date}}",
                fr: "A acheté Pro · {{date}}",
                pt: "Comprou o Pro · {{date}}",
            })
        ),
        status: {
            capped: t({
                en: "Yearly limit",
                de: "Jahreslimit",
                es: "Límite anual",
                fr: "Limite annuelle",
                pt: "Limite anual",
            }),
            counting: t({ en: "Pending", de: "Ausstehend", es: "Pendiente", fr: "En attente", pt: "Pendente" }),
            lifetime: t({ en: "Lifetime", de: "Insgesamt", es: "De por vida", fr: "À vie", pt: "Vitalício" }),
            rewarded: t({ en: "+1 month", de: "+1 Monat", es: "+1 mes", fr: "+1 mois", pt: "+1 mês" }),
        },
        emptyTitle: t({
            en: "No friends yet",
            de: "Noch keine Freunde",
            es: "Aún no hay amigos",
            fr: "Aucun ami pour l'instant",
            pt: "Nenhum amigo ainda",
        }),
        emptyBody: insert(
            t({
                en: "A month lands when a friend logs {{days}} days.",
                de: "Ein Monat wird gutgeschrieben, sobald ein Freund {{days}} Tage erfasst.",
                es: "Recibes un mes cuando un amigo registra {{days}} días.",
                fr: "Un mois arrive quand un ami saisit {{days}} jours.",
                pt: "Um mês chega quando um amigo registra {{days}} dias.",
                "pt-PT": "Um mês chega quando um amigo regista {{days}} dias.",
            })
        ),
        emptyBodyPaid: t({
            en: "A month lands when a friend buys Pro.",
            de: "Ein Monat kommt, wenn ein Freund Pro kauft.",
            es: "Recibes un mes cuando un amigo compra Pro.",
            fr: "Un mois arrive quand un ami achète Pro.",
            pt: "Um mês chega quando um amigo compra o Pro.",
        }),
        loadFailed: t({
            en: "Couldn't load your invite.",
            de: "Deine Einladung konnte nicht geladen werden.",
            es: "No se pudo cargar tu invitación.",
            fr: "Impossible de charger votre invitation.",
            pt: "Não foi possível carregar seu convite.",
        }),
        retry: t({ en: "Retry", de: "Erneut versuchen", es: "Reintentar", fr: "Réessayer", pt: "Tentar de novo" }),
        claim: {
            title: insert(
                t({
                    en: "{{name}} gave you a month of Pro",
                    de: "{{name}} hat dir einen Monat Pro geschenkt",
                    es: "{{name}} te regaló un mes de Pro",
                    fr: "{{name}} vous offre un mois de Pro",
                    pt: "{{name}} te deu um mês de Pro",
                    "pt-PT": "{{name}} deu-te um mês de Pro",
                })
            ),
            titleFriend: t({
                en: "A friend gave you a month of Pro",
                de: "Ein Freund hat dir einen Monat Pro geschenkt",
                es: "Un amigo te regaló un mes de Pro",
                "es-ES": "Un amigo te ha regalado un mes de Pro",
                fr: "Un ami vous offre un mois de Pro",
                pt: "Um amigo te deu um mês de Pro",
                "pt-PT": "Um amigo ofereceu-lhe um mês de Pro",
            }),
            startsNow: t({
                en: "Starts now. Nothing renews.",
                de: "Startet jetzt. Nichts verlängert sich automatisch.",
                es: "Empieza ahora. No se renueva.",
                fr: "Commence maintenant. Rien ne se renouvelle.",
                pt: "Começa agora. Nada é renovado.",
            }),
            shared: insert(
                t({
                    en: "{{name}} sees your first name and how many days you've logged, up to {{days}}.",
                    de: "{{name}} sieht deinen Vornamen und an wie vielen Tagen du erfasst hast, bis zu {{days}}.",
                    es: "{{name}} ve tu primer nombre y cuántos días llevas registrados, hasta {{days}}.",
                    fr: "{{name}} voit votre prénom et combien de jours vous avez saisis, jusqu'à {{days}}.",
                    pt: "{{name}} vê seu primeiro nome e quantos dias você registrou, até {{days}}.",
                    "pt-PT": "{{name}} vê o seu primeiro nome e quantos dias registou, até {{days}}.",
                })
            ),
            sharedPaid: insert(
                t({
                    en: "{{name}} sees your first name and whether you buy Pro.",
                    de: "{{name}} sieht deinen Vornamen und ob du Pro kaufst.",
                    es: "{{name}} ve tu primer nombre y si compras Pro.",
                    fr: "{{name}} voit votre prénom et si vous achetez Pro.",
                    pt: "{{name}} vê seu primeiro nome e se você compra o Pro.",
                    "pt-PT": "{{name}} vê o seu primeiro nome e se compra o Pro.",
                })
            ),
            sharedFriend: insert(
                t({
                    en: "Your friend sees your first name and how many days you've logged, up to {{days}}.",
                    de: "Dein Freund sieht deinen Vornamen und an wie vielen Tagen du erfasst hast, bis zu {{days}}.",
                    es: "Tu amigo ve tu primer nombre y cuántos días llevas registrados, hasta {{days}}.",
                    fr: "Votre ami voit votre prénom et combien de jours vous avez saisis, jusqu'à {{days}}.",
                    pt: "Seu amigo vê seu primeiro nome e quantos dias você registrou, até {{days}}.",
                    "pt-PT": "O seu amigo vê o seu primeiro nome e quantos dias registou, até {{days}}.",
                })
            ),
            sharedFriendPaid: t({
                en: "Your friend sees your first name and whether you buy Pro.",
                de: "Dein Freund sieht deinen Vornamen und ob du Pro kaufst.",
                es: "Tu amigo ve tu primer nombre y si compras Pro.",
                "es-ES": "Tu amigo ve tu nombre y si compras Pro.",
                fr: "Votre ami voit votre prénom et si vous achetez Pro.",
                pt: "Seu amigo vê seu primeiro nome e se você compra o Pro.",
                "pt-PT": "O seu amigo vê o seu primeiro nome e se compra o Pro.",
            }),
            notNow: t({ en: "Not now", de: "Nicht jetzt", es: "Ahora no", fr: "Pas maintenant", pt: "Agora não" }),
            confirm: t({
                en: "Claim month",
                de: "Monat einlösen",
                es: "Reclamar mes",
                fr: "Activer le mois",
                pt: "Resgatar mês",
            }),
            claiming: t({
                en: "Claiming…",
                de: "Wird eingelöst…",
                es: "Reclamando…",
                fr: "Activation…",
                pt: "Resgatando…",
                "pt-PT": "A resgatar…",
            }),
            claimed: t({
                en: "A month of Pro is yours",
                de: "Ein Monat Pro gehört dir",
                es: "Ya tienes un mes de Pro",
                fr: "Un mois de Pro est à vous",
                pt: "Um mês de Pro é seu",
            }),
        },
        landed: {
            who: insert(
                t({
                    en: "{{name}} logged {{days}} days",
                    de: "{{name}} hat {{days}} Tage erfasst",
                    es: "{{name}} registró {{days}} días",
                    fr: "{{name}} a saisi {{days}} jours",
                    pt: "{{name}} registrou {{days}} dias",
                    "pt-PT": "{{name}} registou {{days}} dias",
                })
            ),
            whoPaid: insert(
                t({
                    en: "{{name}} bought Pro",
                    de: "{{name}} hat Pro gekauft",
                    es: "{{name}} compró Pro",
                    fr: "{{name}} a acheté Pro",
                    pt: "{{name}} comprou o Pro",
                })
            ),
            whoMany: insert(
                t({
                    en: "{{count}} friends logged {{days}} days",
                    de: "{{count}} Freunde haben {{days}} Tage erfasst",
                    es: "{{count}} amigos registraron {{days}} días",
                    fr: "{{count}} amis ont saisi {{days}} jours",
                    pt: "{{count}} amigos registraram {{days}} dias",
                    "pt-PT": "{{count}} amigos registaram {{days}} dias",
                })
            ),
            whoManyPaid: insert(
                t({
                    en: "{{count}} friends bought Pro",
                    de: "{{count}} Freunde haben Pro gekauft",
                    es: "{{count}} amigos compraron Pro",
                    fr: "{{count}} amis ont acheté Pro",
                    pt: "{{count}} amigos compraram o Pro",
                })
            ),
            earnedOne: t({
                en: "You earned a month of Pro.",
                de: "Du hast einen Monat Pro verdient.",
                es: "Ganaste un mes de Pro.",
                fr: "Vous avez gagné un mois de Pro.",
                pt: "Você ganhou um mês de Pro.",
                "pt-PT": "Ganhou um mês de Pro.",
            }),
            earnedMany: insert(
                t({
                    en: "You earned {{count}} months of Pro.",
                    de: "Du hast {{count}} Monate Pro verdient.",
                    es: "Ganaste {{count}} meses de Pro.",
                    fr: "Vous avez gagné {{count}} mois de Pro.",
                    pt: "Você ganhou {{count}} meses de Pro.",
                    "pt-PT": "Ganhou {{count}} meses de Pro.",
                })
            ),
            until: t({ en: "Pro until", de: "Pro bis", es: "Pro hasta", fr: "Pro jusqu'au", pt: "Pro até" }),
            starts: t({ en: "Starts", de: "Startet", es: "Empieza", fr: "Commence", pt: "Começa" }),
            after: t({
                en: "After your plan",
                de: "Nach deinem Plan",
                es: "Al terminar tu plan",
                fr: "Après votre formule",
                pt: "Depois do seu plano",
            }),
            fromFriends: t({
                en: "Months from friends",
                de: "Monate von Freunden",
                es: "Meses de amigos",
                fr: "Mois offerts par vos amis",
                pt: "Meses de amigos",
            }),
            done: t({ en: "Done", de: "Fertig", es: "Listo", "es-ES": "Hecho", fr: "Terminé", pt: "Concluído" }),
            another: t({
                en: "Invite another friend",
                de: "Weiteren Freund einladen",
                es: "Invitar a otro amigo",
                fr: "Inviter un autre ami",
                pt: "Convidar outro amigo",
            }),
        },
    },
    key: "dashboard-invite" as const,
} satisfies Dictionary;

export default dashboardInvite;
