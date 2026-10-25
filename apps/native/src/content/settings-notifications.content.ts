import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsNotifications = {
    content: {
        "settings.notifications.channel": t({
            en: "Reminders",
            es: "Recordatorios",
            fr: "Rappels",
            pt: "Lembretes",
        }),
        "settings.notifications.custom": t({
            en: "Custom time",
            es: "Hora personalizada",
            fr: "Heure personnalisée",
            pt: "Horário personalizado",
            "pt-PT": "Hora personalizada",
        }),
        "settings.notifications.deniedBody": t({
            en: "Outlayr cannot ask again once you have declined. Turn notifications on for Outlayr in iOS Settings and this switch will follow.",
            es: "Como ya las rechazaste, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en Configuración y este interruptor se actualizará solo.",
            "es-ES":
                "Como ya las has rechazado, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en Ajustes y este interruptor se actualizará solo.",
            fr: "Après un refus, Outlayr ne peut plus vous le redemander. Activez les notifications d'Outlayr dans les Réglages d'iOS, et ce bouton suivra.",
            pt: "Como você já recusou, o Outlayr não pode perguntar de novo. Ative as notificações do Outlayr nos Ajustes do iOS e este botão se atualiza sozinho.",
            "pt-PT":
                "Como já recusou, o Outlayr não pode voltar a perguntar. Ative as notificações do Outlayr nas Definições do iOS e este botão atualiza-se sozinho.",
        }),
        "settings.notifications.deniedBody.android": t({
            en: "Outlayr cannot ask again once you have declined. Turn notifications on for Outlayr in your phone's settings and this switch will follow.",
            es: "Como ya las rechazaste, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en la configuración del celular y este interruptor se actualizará solo.",
            "es-ES":
                "Como ya las has rechazado, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en los ajustes del móvil y este interruptor se actualizará solo.",
            fr: "Après un refus, Outlayr ne peut plus vous le redemander. Activez les notifications d'Outlayr dans les paramètres de votre téléphone, et ce bouton suivra.",
            pt: "Como você já recusou, o Outlayr não pode perguntar de novo. Ative as notificações do Outlayr nas configurações do celular e este botão se atualiza sozinho.",
            "pt-PT":
                "Como já recusou, o Outlayr não pode voltar a perguntar. Ative as notificações do Outlayr nas definições do telemóvel e este botão atualiza-se sozinho.",
        }),
        "settings.notifications.deniedTitle": t({
            en: "Notifications are off",
            es: "Las notificaciones están desactivadas",
            fr: "Notifications désactivées",
            pt: "As notificações estão desativadas",
        }),
        "settings.notifications.evening": t({
            en: "Every evening",
            es: "Cada noche",
            fr: "Chaque soir",
            pt: "Toda noite",
            "pt-PT": "Todas as noites",
        }),
        "settings.notifications.eveningDetail": t({
            en: "A nudge at {time}, once the day is mostly done.",
            es: "Un aviso a las {time}, cuando el día ya casi termina.",
            fr: "Un petit rappel à {time}, quand la journée est presque finie.",
            pt: "Um lembrete às {time}, quando o dia já está quase no fim.",
        }),
        "settings.notifications.footer": t({
            en: "Only on days with nothing logged. From this device, never a server.",
            es: "Solo los días sin nada registrado. Desde este dispositivo, nunca desde un servidor.",
            fr: "Uniquement les jours sans opération saisie. Depuis cet appareil, jamais depuis un serveur.",
            pt: "Só nos dias sem nada registrado. Deste dispositivo, nunca de um servidor.",
            "pt-PT": "Só nos dias sem nada registado. Deste dispositivo, nunca de um servidor.",
        }),
        "settings.notifications.installmentFooter": t({
            en: "At your reminder time, the day before each installment you still owe, and before the day you said you'd pay a debt.",
            es: "A la hora de tus recordatorios, el día antes de cada cuota que aún debes y del día en que dijiste que pagarías una deuda.",
            fr: "À l'heure de vos rappels, la veille de chaque échéance restant due, et avant le jour où vous avez prévu de rembourser une dette.",
            pt: "No horário dos seus lembretes, no dia anterior a cada parcela que você ainda deve e antes do dia em que você disse que pagaria uma dívida.",
            "pt-PT":
                "À hora dos seus lembretes, no dia anterior a cada prestação que ainda deve e antes do dia em que disse que pagaria uma dívida.",
        }),
        "settings.notifications.installmentSection": t({
            en: "Installments",
            es: "Cuotas",
            fr: "Échéances",
            pt: "Parcelas",
            "pt-PT": "Prestações",
        }),
        "settings.notifications.installmentToggle": t({
            en: "Remind me the day before",
            es: "Avísame el día antes",
            fr: "Me rappeler la veille",
            pt: "Me avise no dia anterior",
            "pt-PT": "Avise-me no dia anterior",
        }),
        "settings.notifications.morning": t({
            en: "Every morning",
            es: "Cada mañana",
            fr: "Chaque matin",
            pt: "Toda manhã",
            "pt-PT": "Todas as manhãs",
        }),
        "settings.notifications.morningDetail": t({
            en: "A nudge at {time}, before the day has spent anything.",
            es: "Un aviso a las {time}, antes de que hayas gastado algo.",
            fr: "Un petit rappel à {time}, avant toute dépense de la journée.",
            pt: "Um lembrete às {time}, antes de você gastar qualquer coisa no dia.",
            "pt-PT": "Um lembrete às {time}, antes de gastar alguma coisa no dia.",
        }),
        "settings.notifications.nextAt": t({
            en: "Next reminder at {time}.",
            es: "Próximo recordatorio a las {time}.",
            fr: "Prochain rappel à {time}.",
            pt: "Próximo lembrete às {time}.",
        }),
        "settings.notifications.notNow": t({
            en: "Not now",
            es: "Ahora no",
            fr: "Pas maintenant",
            pt: "Agora não",
        }),
        "settings.notifications.openSettings": t({
            en: "Open Settings",
            es: "Abrir Configuración",
            "es-ES": "Abrir Ajustes",
            fr: "Ouvrir Réglages",
            pt: "Abrir Ajustes",
            "pt-PT": "Abrir Definições",
        }),
        "settings.notifications.section": t({
            en: "Daily reminder",
            es: "Recordatorio diario",
            fr: "Rappel quotidien",
            pt: "Lembrete diário",
        }),
        "settings.notifications.subscriptionFooter": t({
            en: "Each subscription decides how far ahead it warns you, on its own screen. Off silences all of them without changing what any one of them says.",
            es: "Cada suscripción define en su propia pantalla con cuánta anticipación te avisa. Si lo desactivas, se silencian todas sin cambiar su configuración.",
            fr: "Chaque abonnement choisit, sur son propre écran, combien de temps à l'avance vous prévenir. Désactiver ce réglage les met tous en sourdine sans rien changer à leurs paramètres.",
            pt: "Cada assinatura define, na própria tela, com quanta antecedência te avisa. Desativar silencia todas, sem mudar o que cada uma diz.",
            "pt-PT":
                "Cada subscrição define, no seu próprio ecrã, com quanta antecedência o avisa. Desativar silencia todas, sem alterar o que cada uma diz.",
        }),
        "settings.notifications.subscriptionSection": t({
            en: "Subscription charges",
            es: "Cobros de suscripciones",
            fr: "Prélèvements d'abonnements",
            pt: "Cobranças de assinaturas",
            "pt-PT": "Cobranças de subscrições",
        }),
        "settings.notifications.subscriptionToggle": t({
            en: "Warn me before a charge",
            es: "Avísame antes de un cobro",
            fr: "Me prévenir avant un prélèvement",
            pt: "Me avise antes de uma cobrança",
            "pt-PT": "Avise-me antes de uma cobrança",
        }),
        "settings.notifications.time": t({
            en: "Time",
            es: "Hora",
            fr: "Heure",
            pt: "Horário",
            "pt-PT": "Hora",
        }),
        "settings.notifications.toggle": t({
            en: "Remind me to log",
            es: "Recuérdame registrar",
            fr: "Me rappeler de saisir",
            pt: "Me lembre de registrar",
            "pt-PT": "Lembre-me de registar",
        }),
        "settings.notifications.whenSection": t({
            en: "When",
            es: "Cuándo",
            fr: "Quand",
            pt: "Quando",
        }),
    },
    key: "settings-notifications" as const,
} satisfies Dictionary;

export default settingsNotifications;
