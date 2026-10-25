import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const alerts = {
    content: {
        "alerts.dayCard.failedBody": t({
            en: "The image couldn't be drawn.",
            es: "No se pudo generar la imagen.",
            pt: "Não foi possível gerar a imagem.",
        }),
        "alerts.dayCard.failedTitle": t({
            en: "Couldn't share the day",
            es: "No se pudo compartir el día",
            pt: "Não foi possível compartilhar o dia",
            "pt-PT": "Não foi possível partilhar o dia",
        }),
        "alerts.dayCard.share": t({
            en: "Share as Image",
            es: "Compartir como imagen",
            pt: "Compartilhar como imagem",
            "pt-PT": "Partilhar como imagem",
        }),
        "alerts.dayCard.shareTitle": t({
            en: "Share day",
            es: "Compartir el día",
            pt: "Compartilhar dia",
            "pt-PT": "Partilhar dia",
        }),
        "alerts.dayCard.undrawable": t({
            en: "The image couldn't be drawn on this device.",
            es: "No se pudo generar la imagen en este dispositivo.",
            pt: "Não foi possível gerar a imagem neste dispositivo.",
        }),
        "alerts.photo.failed": t({
            en: "Couldn't open your photos. Check Outlayr's permission and try again.",
            es: "No se pudieron abrir tus fotos. Revisa el permiso de Outlayr e inténtalo de nuevo.",
            pt: "Não foi possível abrir suas fotos. Verifique a permissão do Outlayr e tente de novo.",
            "pt-PT": "Não foi possível abrir as suas fotos. Verifique a permissão do Outlayr e tente de novo.",
        }),
        "alerts.transaction.logAgain": t({
            en: "Log Again",
            es: "Registrar de nuevo",
            pt: "Registrar de novo",
            "pt-PT": "Registar de novo",
        }),
        "alerts.transaction.stopRecurring": t({
            en: "Stop Recurring",
            es: "Dejar de repetir",
            pt: "Parar de repetir",
        }),
        "alerts.transfer.sharingUnavailable": t({
            en: "Sharing isn't available on this device.",
            es: "Compartir no está disponible en este dispositivo.",
            pt: "O compartilhamento não está disponível neste dispositivo.",
            "pt-PT": "A partilha não está disponível neste dispositivo.",
        }),
        "alerts.transfer.unreadableFile": t({
            en: "That file couldn't be read as text.",
            es: "No se pudo leer ese archivo como texto.",
            pt: "Não foi possível ler esse arquivo como texto.",
            "pt-PT": "Não foi possível ler esse ficheiro como texto.",
        }),
        "reminder.daily.catchUp": t({
            en: "Last: {entry}. Tap to catch up.",
            es: "Último: {entry}. Toca para ponerte al día.",
            pt: "Último: {entry}. Toque para pôr tudo em dia.",
        }),
        "reminder.daily.empty": t({
            en: "Nothing logged yet",
            es: "Aún no has registrado nada",
            pt: "Nada registrado ainda",
            "pt-PT": "Nada registado ainda",
        }),
        "reminder.daily.first": t({
            en: "Tap to add your first expense.",
            es: "Toca para agregar tu primer gasto.",
            "es-ES": "Toca para añadir tu primer gasto.",
            pt: "Toque para adicionar sua primeira despesa.",
            "pt-PT": "Toque para adicionar a sua primeira despesa.",
        }),
        "reminder.daily.lastOn": t({
            en: "Last: {entry}, {day}.",
            es: "Último: {entry}, el {day}.",
            pt: "Último: {entry}, {day}.",
        }),
        "reminder.daily.lastYesterday": t({
            en: "Last: {entry}, yesterday.",
            es: "Último: {entry}, ayer.",
            pt: "Último: {entry}, ontem.",
        }),
        "reminder.daily.since": t({
            en: "Nothing logged since {day}",
            es: "Nada registrado desde el {day}",
            pt: "Nada registrado desde {day}",
            "pt-PT": "Nada registado desde {day}",
        }),
        "reminder.daily.today": t({
            en: "Nothing logged today",
            es: "Nada registrado hoy",
            pt: "Nada registrado hoje",
            "pt-PT": "Nada registado hoje",
        }),
        "reminder.daily.yesterday": t({
            en: "Nothing logged yesterday",
            es: "Nada registrado ayer",
            pt: "Nada registrado ontem",
            "pt-PT": "Nada registado ontem",
        }),
        "reminder.digest.on": t({
            en: "{count} charges on {day}",
            es: "{count} cobros el {day}",
            pt: "{count} cobranças para {day}",
        }),
        "reminder.digest.today": t({
            en: "{count} charges today",
            es: "{count} cobros hoy",
            pt: "{count} cobranças hoje",
        }),
        "reminder.digest.tomorrow": t({
            en: "{count} charges tomorrow",
            es: "{count} cobros mañana",
            pt: "{count} cobranças amanhã",
        }),
        "reminder.due.untitled": t({
            en: "Subscription",
            es: "Suscripción",
            pt: "Assinatura",
            "pt-PT": "Subscrição",
        }),
    },
    key: "alerts" as const,
} satisfies Dictionary;

export default alerts;
