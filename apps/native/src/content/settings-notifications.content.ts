import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsNotifications = {
    content: {
        "settings.notifications.channel": t({
            en: "Reminders",
            es: "Recordatorios",
            pt: "Lembretes",
        }),
        "settings.notifications.custom": t({
            en: "Custom time",
            es: "Hora personalizada",
            pt: "Horário personalizado",
        }),
        "settings.notifications.deniedBody": t({
            en: "Outlayr cannot ask again once you have declined. Turn notifications on for Outlayr in iOS Settings and this switch will follow.",
            es: "Como ya las rechazaste, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en Configuración y este interruptor se actualizará solo.",
            pt: "Como você já recusou, o Outlayr não pode perguntar de novo. Ative as notificações do Outlayr nos Ajustes do iOS e este botão se atualiza sozinho.",
        }),
        "settings.notifications.deniedBody.android": t({
            en: "Outlayr cannot ask again once you have declined. Turn notifications on for Outlayr in your phone's settings and this switch will follow.",
            es: "Como ya las rechazaste, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en la configuración del celular y este interruptor se actualizará solo.",
            pt: "Como você já recusou, o Outlayr não pode perguntar de novo. Ative as notificações do Outlayr nas configurações do celular e este botão se atualiza sozinho.",
        }),
        "settings.notifications.deniedTitle": t({
            en: "Notifications are off",
            es: "Las notificaciones están desactivadas",
            pt: "As notificações estão desativadas",
        }),
        "settings.notifications.evening": t({
            en: "Every evening",
            es: "Cada noche",
            pt: "Toda noite",
        }),
        "settings.notifications.eveningDetail": t({
            en: "A nudge at {time}, once the day is mostly done.",
            es: "Un aviso a las {time}, cuando el día ya casi termina.",
            pt: "Um lembrete às {time}, quando o dia já está quase no fim.",
        }),
        "settings.notifications.footer": t({
            en: "Only on days with nothing logged. From this device, never a server.",
            es: "Solo los días sin nada registrado. Desde este dispositivo, nunca desde un servidor.",
            pt: "Só nos dias sem nada registrado. Deste dispositivo, nunca de um servidor.",
        }),
        "settings.notifications.installmentFooter": t({
            en: "At your reminder time, the day before each installment you still owe, and before the day you said you'd pay a debt.",
            es: "A la hora de tus recordatorios, el día antes de cada cuota que aún debes y del día en que dijiste que pagarías una deuda.",
            pt: "No horário dos seus lembretes, no dia anterior a cada parcela que você ainda deve e antes do dia em que você disse que pagaria uma dívida.",
        }),
        "settings.notifications.installmentSection": t({
            en: "Installments",
            es: "Cuotas",
            pt: "Parcelas",
        }),
        "settings.notifications.installmentToggle": t({
            en: "Remind me the day before",
            es: "Avísame el día antes",
            pt: "Me avise no dia anterior",
        }),
        "settings.notifications.morning": t({
            en: "Every morning",
            es: "Cada mañana",
            pt: "Toda manhã",
        }),
        "settings.notifications.morningDetail": t({
            en: "A nudge at {time}, before the day has spent anything.",
            es: "Un aviso a las {time}, antes de que hayas gastado algo.",
            pt: "Um lembrete às {time}, antes de você gastar qualquer coisa no dia.",
        }),
        "settings.notifications.nextAt": t({
            en: "Next reminder at {time}.",
            es: "Próximo recordatorio a las {time}.",
            pt: "Próximo lembrete às {time}.",
        }),
        "settings.notifications.notNow": t({
            en: "Not now",
            es: "Ahora no",
            pt: "Agora não",
        }),
        "settings.notifications.openSettings": t({
            en: "Open Settings",
            es: "Abrir Configuración",
            pt: "Abrir Ajustes",
        }),
        "settings.notifications.section": t({
            en: "Daily reminder",
            es: "Recordatorio diario",
            pt: "Lembrete diário",
        }),
        "settings.notifications.subscriptionFooter": t({
            en: "Each subscription decides how far ahead it warns you, on its own screen. Off silences all of them without changing what any one of them says.",
            es: "Cada suscripción define en su propia pantalla con cuánta anticipación te avisa. Si lo desactivas, se silencian todas sin cambiar su configuración.",
            pt: "Cada assinatura define, na própria tela, com quanta antecedência te avisa. Desativar silencia todas, sem mudar o que cada uma diz.",
        }),
        "settings.notifications.subscriptionSection": t({
            en: "Subscription charges",
            es: "Cobros de suscripciones",
            pt: "Cobranças de assinaturas",
        }),
        "settings.notifications.subscriptionToggle": t({
            en: "Warn me before a charge",
            es: "Avísame antes de un cobro",
            pt: "Me avise antes de uma cobrança",
        }),
        "settings.notifications.time": t({
            en: "Time",
            es: "Hora",
            pt: "Horário",
        }),
        "settings.notifications.toggle": t({
            en: "Remind me to log",
            es: "Recuérdame registrar",
            pt: "Me lembre de registrar",
        }),
        "settings.notifications.whenSection": t({
            en: "When",
            es: "Cuándo",
            pt: "Quando",
        }),
    },
    key: "settings-notifications" as const,
} satisfies Dictionary;

export default settingsNotifications;
