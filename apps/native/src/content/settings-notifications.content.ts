import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsNotifications = {
    content: {
        "settings.notifications.channel": t({
            en: "Reminders",
            es: "Recordatorios",
        }),
        "settings.notifications.custom": t({
            en: "Custom time",
            es: "Hora personalizada",
        }),
        "settings.notifications.deniedBody": t({
            en: "Outlayr cannot ask again once you have declined. Turn notifications on for Outlayr in iOS Settings and this switch will follow.",
            es: "Como ya las rechazaste, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en Configuración y este interruptor se actualizará solo.",
        }),
        "settings.notifications.deniedBody.android": t({
            en: "Outlayr cannot ask again once you have declined. Turn notifications on for Outlayr in your phone's settings and this switch will follow.",
            es: "Como ya las rechazaste, Outlayr no puede volver a preguntarte. Activa las notificaciones de Outlayr en la configuración del celular y este interruptor se actualizará solo.",
        }),
        "settings.notifications.deniedTitle": t({
            en: "Notifications are off",
            es: "Las notificaciones están desactivadas",
        }),
        "settings.notifications.evening": t({
            en: "Every evening",
            es: "Cada noche",
        }),
        "settings.notifications.eveningDetail": t({
            en: "A nudge at {time}, once the day is mostly done.",
            es: "Un aviso a las {time}, cuando el día ya casi termina.",
        }),
        "settings.notifications.footer": t({
            en: "Only on days with nothing logged. From this device, never a server.",
            es: "Solo los días sin nada registrado. Desde este dispositivo, nunca desde un servidor.",
        }),
        "settings.notifications.installmentFooter": t({
            en: "At your reminder time, the day before each installment you still owe, and before the day you said you'd pay a debt.",
            es: "A la hora de tus recordatorios, el día antes de cada cuota que aún debes y del día en que dijiste que pagarías una deuda.",
        }),
        "settings.notifications.installmentSection": t({
            en: "Installments",
            es: "Cuotas",
        }),
        "settings.notifications.installmentToggle": t({
            en: "Remind me the day before",
            es: "Avísame el día antes",
        }),
        "settings.notifications.morning": t({
            en: "Every morning",
            es: "Cada mañana",
        }),
        "settings.notifications.morningDetail": t({
            en: "A nudge at {time}, before the day has spent anything.",
            es: "Un aviso a las {time}, antes de que hayas gastado algo.",
        }),
        "settings.notifications.nextAt": t({
            en: "Next reminder at {time}.",
            es: "Próximo recordatorio a las {time}.",
        }),
        "settings.notifications.notNow": t({
            en: "Not now",
            es: "Ahora no",
        }),
        "settings.notifications.openSettings": t({
            en: "Open Settings",
            es: "Abrir Configuración",
        }),
        "settings.notifications.section": t({
            en: "Daily reminder",
            es: "Recordatorio diario",
        }),
        "settings.notifications.subscriptionFooter": t({
            en: "Each subscription decides how far ahead it warns you, on its own screen. Off silences all of them without changing what any one of them says.",
            es: "Cada suscripción define en su propia pantalla con cuánta anticipación te avisa. Si lo desactivas, se silencian todas sin cambiar su configuración.",
        }),
        "settings.notifications.subscriptionSection": t({
            en: "Subscription charges",
            es: "Cobros de suscripciones",
        }),
        "settings.notifications.subscriptionToggle": t({
            en: "Warn me before a charge",
            es: "Avísame antes de un cobro",
        }),
        "settings.notifications.time": t({
            en: "Time",
            es: "Hora",
        }),
        "settings.notifications.toggle": t({
            en: "Remind me to log",
            es: "Recuérdame registrar",
        }),
        "settings.notifications.whenSection": t({
            en: "When",
            es: "Cuándo",
        }),
    },
    key: "settings-notifications" as const,
} satisfies Dictionary;

export default settingsNotifications;
