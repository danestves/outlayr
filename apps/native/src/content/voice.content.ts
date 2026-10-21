import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const voice = {
    content: {
        "voice.action.edit": t({
            en: "Edit",
            es: "Editar",
        }),
        "voice.action.finish": t({
            en: "Finish in the form",
            es: "Terminar en el formulario",
        }),
        "voice.action.fix": t({
            en: "Fix it",
            es: "Corregir",
        }),
        "voice.action.retry": t({
            en: "Say it again",
            es: "Dilo de nuevo",
        }),
        "voice.action.save": t({
            en: "Save",
            es: "Guardar",
        }),
        "voice.action.settings": t({
            en: "Open Settings",
            es: "Abrir Configuración",
        }),
        "voice.close": t({
            en: "Close",
            es: "Cerrar",
        }),
        "voice.failed.denied": t({
            en: "Outlayr needs the microphone to hear you.",
            es: "Outlayr necesita el micrófono para escucharte.",
        }),
        "voice.failed.notConfigured": t({
            en: "Speaking an entry needs the cloud tier.",
            es: "Para dictar un registro se necesita el servicio en la nube.",
        }),
        "voice.failed.notEntitled": t({
            en: "Your free captures, voice and receipts together, are used up. They come back within 30 days; Pro lifts the limit.",
            es: "Ya usaste tus capturas gratis (voz y recibos). Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
        }),
        "voice.failed.offline": t({
            en: "You're offline.",
            es: "Estás sin conexión.",
        }),
        "voice.failed.provider": t({
            en: "Couldn't write that down.",
            es: "No pude anotarlo.",
        }),
        "voice.failed.quotaExceeded": t({
            en: "The fair-use limit for captures is reached. It resets within 30 days.",
            es: "Llegaste al límite de uso justo de capturas. Se renueva en menos de 30 días.",
        }),
        "voice.failed.rateLimited": t({
            en: "That's a lot of entries at once. Give it a moment.",
            es: "Son muchos registros seguidos. Espera un momento.",
        }),
        "voice.failed.silent": t({
            en: "Didn't hear anything.",
            es: "No escuché nada.",
        }),
        "voice.failed.timeout": t({
            en: "That took too long.",
            es: "Tardó demasiado.",
        }),
        "voice.failed.unauthenticated": t({
            en: "Sign in to speak an entry.",
            es: "Inicia sesión para dictar un registro.",
        }),
        "voice.failed.unclear": t({
            en: "Didn't catch a transaction in that.",
            es: "No detecté ninguna transacción ahí.",
        }),
        "voice.hint": t({
            en: "Try “{example}”",
            es: "Prueba “{example}”",
        }),
        "voice.hint.example": t({
            en: "{amount} at {merchant} today",
            es: "{amount} en {merchant} hoy",
        }),
        "voice.hint.exampleAccount": t({
            en: "{amount} at {merchant} today on {account}",
            es: "{amount} en {merchant} hoy con {account}",
        }),
        "voice.hint.fallback": t({
            en: "12 for lunch today",
            es: "12 de almuerzo hoy",
        }),
        "voice.limit.last": t({
            en: "Last clip for now",
            es: "Última grabación por ahora",
        }),
        "voice.limit.next": t({
            en: "Next clip in {time}",
            es: "Siguiente grabación en {time}",
        }),
        "voice.limit.paused": t({
            en: "Voice is paused",
            es: "La voz está en pausa",
        }),
        "voice.mic.finish": t({
            en: "Done speaking",
            es: "Terminé de hablar",
        }),
        // The review reads as one line: "$12.50 at Starbucks · Coffee · yesterday".
        "voice.review.at": t({
            en: "at",
            es: "en",
        }),
        "voice.review.from": t({
            en: "from",
            es: "de",
        }),
        "voice.review.noAccount": t({
            en: "Which account?",
            es: "¿Qué cuenta?",
        }),
        "voice.review.noCategory": t({
            en: "No category yet",
            es: "Aún sin categoría",
        }),
        "voice.review.noMerchant": t({
            en: "No name yet",
            es: "Aún sin nombre",
        }),
        "voice.review.transfer": t({
            en: "{from} to {to}",
            es: "{from} a {to}",
        }),
        "voice.review.transferLabel": t({
            en: "Transfer",
            es: "Transferencia",
        }),
        "voice.state.listening": t({
            en: "Listening…",
            es: "Escuchando…",
        }),
        "voice.state.starting": t({
            en: "Getting ready…",
            es: "Preparando…",
        }),
        "voice.state.thinking": t({
            en: "Writing it down…",
            es: "Anotando…",
        }),
        "voice.turn.field.account": t({
            en: "account",
            es: "cuenta",
        }),
        "voice.turn.field.amount": t({
            en: "amount",
            es: "monto",
        }),
        "voice.turn.field.category": t({
            en: "category",
            es: "categoría",
        }),
        "voice.turn.field.date": t({
            en: "date",
            es: "fecha",
        }),
        "voice.turn.field.details": t({
            en: "details",
            es: "detalles",
        }),
        "voice.turn.field.kind": t({
            en: "kind",
            es: "tipo",
        }),
        "voice.turn.field.merchant": t({
            en: "name",
            es: "nombre",
        }),
        "voice.turn.field.schedule": t({
            en: "schedule",
            es: "frecuencia",
        }),
        "voice.turn.unchanged": t({
            en: "Same as before",
            es: "Igual que antes",
        }),
        "voice.turn.updated": t({
            en: "Updated",
            es: "Actualizado",
        }),
    },
    key: "voice" as const,
} satisfies Dictionary;

export default voice;
