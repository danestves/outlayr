import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardNotifications = {
    content: {
        allowed: t({
            en: "Allowed in this browser",
            es: "Permitidas en este navegador",
            fr: "Autorisées dans ce navigateur",
            pt: "Permitidas neste navegador",
        }),
        notAllowed: t({
            en: "Not allowed in this browser",
            es: "No permitidas en este navegador",
            fr: "Non autorisées dans ce navigateur",
            pt: "Não permitidas neste navegador",
        }),
        offTitle: t({
            en: "Notifications are off",
            es: "Las notificaciones están desactivadas",
            fr: "Les notifications sont désactivées",
            pt: "As notificações estão desativadas",
        }),
        offBody: t({
            en: "Outlayr cannot ask again once you have declined. Allow them in your browser's site settings.",
            es: "Outlayr no puede volver a preguntar si las rechazaste. Permítelas en los ajustes del sitio de tu navegador.",
            fr: "Outlayr ne peut plus demander après un refus. Autorisez-les dans les réglages du site de votre navigateur.",
            pt: "O Outlayr não pode perguntar de novo depois de recusadas. Permita nas configurações do site no navegador.",
        }),
        unsupportedTitle: t({
            en: "This browser can't show reminders",
            es: "Este navegador no puede mostrar recordatorios",
            fr: "Ce navigateur ne peut pas afficher de rappels",
            pt: "Este navegador não pode mostrar lembretes",
        }),
        unsupportedBody: t({
            en: "Reminders on your phone are set in the Outlayr app.",
            es: "Los recordatorios de tu celular se configuran en la app de Outlayr.",
            fr: "Les rappels sur votre téléphone se règlent dans l'app Outlayr.",
            pt: "Os lembretes do celular são definidos no app Outlayr.",
        }),
        checkAgain: t({
            en: "Check again",
            es: "Comprobar de nuevo",
            fr: "Vérifier à nouveau",
            pt: "Verificar de novo",
        }),
        daily: t({ en: "Daily reminder", es: "Recordatorio diario", fr: "Rappel quotidien", pt: "Lembrete diário" }),
        remind: t({
            en: "Remind me to log",
            es: "Recuérdame registrar",
            fr: "Me rappeler de saisir",
            pt: "Lembrar de registrar",
        }),
        remindHint: t({
            en: "Only on days with nothing logged.",
            es: "Solo los días sin registros.",
            fr: "Seulement les jours sans saisie.",
            pt: "Só nos dias sem registros.",
        }),
        morning: t({ en: "Every morning", es: "Cada mañana", fr: "Chaque matin", pt: "Toda manhã" }),
        morningHint: insert(
            t({
                en: "A nudge at {{time}}, before the day has spent anything.",
                es: "Un aviso a las {{time}}, antes de que el día gaste algo.",
                fr: "Un rappel à {{time}}, avant les dépenses du jour.",
                pt: "Um aviso às {{time}}, antes de o dia gastar algo.",
            })
        ),
        evening: t({ en: "Every evening", es: "Cada noche", fr: "Chaque soir", pt: "Toda noite" }),
        eveningHint: insert(
            t({
                en: "A nudge at {{time}}, once the day is mostly done.",
                es: "Un aviso a las {{time}}, cuando el día casi termina.",
                fr: "Un rappel à {{time}}, quand la journée touche à sa fin.",
                pt: "Um aviso às {{time}}, quando o dia está quase no fim.",
            })
        ),
        custom: t({ en: "Custom time", es: "Otra hora", fr: "Autre heure", pt: "Outro horário" }),
        next: insert(
            t({
                en: "Next reminder at {{time}}.",
                es: "Próximo recordatorio a las {{time}}.",
                fr: "Prochain rappel à {{time}}.",
                pt: "Próximo lembrete às {{time}}.",
            })
        ),
        none: t({
            en: "No reminders will arrive.",
            es: "No llegarán recordatorios.",
            fr: "Aucun rappel n'arrivera.",
            pt: "Nenhum lembrete chegará.",
        }),
        failed: t({
            en: "Couldn't save that. Try again.",
            es: "No se pudo guardar. Inténtalo de nuevo.",
            fr: "Enregistrement impossible. Réessayez.",
            pt: "Não foi possível salvar. Tente de novo.",
        }),
    },
    key: "dashboard-notifications",
} satisfies Dictionary;

export default dashboardNotifications;
