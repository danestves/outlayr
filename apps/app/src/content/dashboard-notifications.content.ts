import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardNotifications = {
    content: {
        allowed: t({
            en: "Allowed in this browser",
            de: "In diesem Browser erlaubt",
            es: "Permitidas en este navegador",
            fr: "Autorisées dans ce navigateur",
            pt: "Permitidas neste navegador",
        }),
        notAllowed: t({
            en: "Not allowed in this browser",
            de: "In diesem Browser nicht erlaubt",
            es: "No permitidas en este navegador",
            fr: "Non autorisées dans ce navigateur",
            pt: "Não permitidas neste navegador",
        }),
        offTitle: t({
            en: "Notifications are off",
            de: "Benachrichtigungen sind aus",
            es: "Las notificaciones están desactivadas",
            fr: "Les notifications sont désactivées",
            pt: "As notificações estão desativadas",
        }),
        offBody: t({
            en: "Outlayr cannot ask again once you have declined. Allow them in your browser's site settings.",
            de: "Outlayr kann nach einer Ablehnung nicht erneut fragen. Erlaube sie in den Website-Einstellungen deines Browsers.",
            es: "Outlayr no puede volver a preguntar si las rechazaste. Permítelas en los ajustes del sitio de tu navegador.",
            fr: "Outlayr ne peut plus demander après un refus. Autorisez-les dans les réglages du site de votre navigateur.",
            pt: "O Outlayr não pode perguntar de novo depois de recusadas. Permita nas configurações do site no navegador.",
            "pt-PT":
                "O Outlayr não pode perguntar de novo depois de recusadas. Permita nas definições do site no navegador.",
        }),
        unsupportedTitle: t({
            en: "This browser can't show reminders",
            de: "Dieser Browser kann keine Erinnerungen anzeigen",
            es: "Este navegador no puede mostrar recordatorios",
            fr: "Ce navigateur ne peut pas afficher de rappels",
            pt: "Este navegador não pode mostrar lembretes",
        }),
        unsupportedBody: t({
            en: "Reminders on your phone are set in the Outlayr app.",
            de: "Erinnerungen auf deinem Handy stellst du in der Outlayr-App ein.",
            es: "Los recordatorios de tu celular se configuran en la app de Outlayr.",
            "es-ES": "Los recordatorios de tu móvil se configuran en la app de Outlayr.",
            fr: "Les rappels sur votre téléphone se règlent dans l'app Outlayr.",
            pt: "Os lembretes do celular são definidos no app Outlayr.",
            "pt-PT": "Os lembretes do telemóvel são definidos na app Outlayr.",
        }),
        checkAgain: t({
            en: "Check again",
            de: "Erneut prüfen",
            es: "Comprobar de nuevo",
            fr: "Vérifier à nouveau",
            pt: "Verificar de novo",
        }),
        daily: t({
            en: "Daily reminder",
            de: "Tägliche Erinnerung",
            es: "Recordatorio diario",
            fr: "Rappel quotidien",
            pt: "Lembrete diário",
        }),
        remind: t({
            en: "Remind me to log",
            de: "Erinnere mich ans Erfassen",
            es: "Recuérdame registrar",
            fr: "Me rappeler de saisir",
            pt: "Lembrar de registrar",
            "pt-PT": "Lembrar de registar",
        }),
        remindHint: t({
            en: "Only on days with nothing logged.",
            de: "Nur an Tagen ohne Einträge.",
            es: "Solo los días sin registros.",
            fr: "Seulement les jours sans saisie.",
            pt: "Só nos dias sem registros.",
            "pt-PT": "Só nos dias sem registos.",
        }),
        morning: t({
            en: "Every morning",
            de: "Jeden Morgen",
            es: "Cada mañana",
            fr: "Chaque matin",
            pt: "Toda manhã",
            "pt-PT": "Todas as manhãs",
        }),
        morningHint: insert(
            t({
                en: "A nudge at {{time}}, before the day has spent anything.",
                de: "Eine Erinnerung um {{time}}, bevor am Tag etwas ausgegeben wurde.",
                es: "Un aviso a las {{time}}, antes de que el día gaste algo.",
                fr: "Un rappel à {{time}}, avant les dépenses du jour.",
                pt: "Um aviso às {{time}}, antes de o dia gastar algo.",
            })
        ),
        evening: t({
            en: "Every evening",
            de: "Jeden Abend",
            es: "Cada noche",
            fr: "Chaque soir",
            pt: "Toda noite",
            "pt-PT": "Todas as noites",
        }),
        eveningHint: insert(
            t({
                en: "A nudge at {{time}}, once the day is mostly done.",
                de: "Eine Erinnerung um {{time}}, wenn der Tag fast vorbei ist.",
                es: "Un aviso a las {{time}}, cuando el día casi termina.",
                fr: "Un rappel à {{time}}, quand la journée touche à sa fin.",
                pt: "Um aviso às {{time}}, quando o dia está quase no fim.",
            })
        ),
        custom: t({ en: "Custom time", de: "Eigene Uhrzeit", es: "Otra hora", fr: "Autre heure", pt: "Outro horário" }),
        next: insert(
            t({
                en: "Next reminder at {{time}}.",
                de: "Nächste Erinnerung um {{time}}.",
                es: "Próximo recordatorio a las {{time}}.",
                fr: "Prochain rappel à {{time}}.",
                pt: "Próximo lembrete às {{time}}.",
            })
        ),
        none: t({
            en: "No reminders will arrive.",
            de: "Es kommen keine Erinnerungen.",
            es: "No llegarán recordatorios.",
            fr: "Aucun rappel n'arrivera.",
            pt: "Nenhum lembrete chegará.",
        }),
        failed: t({
            en: "Couldn't save that. Try again.",
            de: "Das hat nicht geklappt. Versuch es noch mal.",
            es: "No se pudo guardar. Inténtalo de nuevo.",
            fr: "Enregistrement impossible. Réessayez.",
            pt: "Não foi possível salvar. Tente de novo.",
            "pt-PT": "Não foi possível guardar. Tente de novo.",
        }),
    },
    key: "dashboard-notifications",
} satisfies Dictionary;

export default dashboardNotifications;
