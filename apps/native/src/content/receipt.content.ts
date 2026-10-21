import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const receipt = {
    content: {
        "receipt.action.another": t({
            en: "Scan another",
            es: "Escanear otro",
        }),
        "receipt.action.camera": t({
            en: "Take a photo",
            es: "Tomar foto",
        }),
        "receipt.action.edit": t({
            en: "Edit",
            es: "Editar",
        }),
        "receipt.action.finish": t({
            en: "Finish in the form",
            es: "Terminar en el formulario",
        }),
        "receipt.action.library": t({
            en: "Library",
            es: "Galería",
        }),
        "receipt.action.retry": t({
            en: "Try again",
            es: "Intentar de nuevo",
        }),
        "receipt.action.save": t({
            en: "Save",
            es: "Guardar",
        }),
        "receipt.action.settings": t({
            en: "Open Settings",
            es: "Abrir Configuración",
        }),
        "receipt.close": t({
            en: "Close",
            es: "Cerrar",
        }),
        "receipt.details.more": t({
            en: "and {count} more lines",
            es: "y {count} líneas más",
        }),
        "receipt.failed.denied": t({
            en: "Outlayr needs the camera to scan a receipt.",
            es: "Outlayr necesita la cámara para escanear un recibo.",
        }),
        "receipt.failed.noCamera": t({
            en: "This device has no camera.",
            es: "Este dispositivo no tiene cámara.",
        }),
        "receipt.failed.notConfigured": t({
            en: "Scanning a receipt needs the cloud tier.",
            es: "Para escanear recibos se necesita el servicio en la nube.",
        }),
        "receipt.failed.notEntitled": t({
            en: "Your free captures, voice and receipts together, are used up. They come back within 30 days; Pro lifts the limit.",
            es: "Ya usaste tus capturas gratis (voz y recibos). Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
        }),
        "receipt.failed.offline": t({
            en: "You're offline.",
            es: "Estás sin conexión.",
        }),
        "receipt.failed.provider": t({
            en: "Couldn't read the receipt.",
            es: "No pude leer el recibo.",
        }),
        "receipt.failed.quotaExceeded": t({
            en: "The fair-use limit for captures is reached. It resets within 30 days.",
            es: "Llegaste al límite de uso justo de capturas. Se renueva en menos de 30 días.",
        }),
        "receipt.failed.rateLimited": t({
            en: "That's a lot of receipts at once. Give it a moment.",
            es: "Son muchos recibos seguidos. Espera un momento.",
        }),
        "receipt.failed.timeout": t({
            en: "That took too long.",
            es: "Tardó demasiado.",
        }),
        "receipt.failed.unauthenticated": t({
            en: "Sign in to scan a receipt.",
            es: "Inicia sesión para escanear un recibo.",
        }),
        "receipt.failed.unclear": t({
            en: "Didn't find a receipt in that photo.",
            es: "No encontré un recibo en esa foto.",
        }),
        "receipt.failed.unreadable": t({
            en: "Couldn't open that photo.",
            es: "No pude abrir esa foto.",
        }),
        "receipt.intro": t({
            en: "A photo of the ticket is enough. The total, the store, the date and every line, read for you.",
            es: "Basta con una foto del ticket. Leemos por ti el total, la tienda, la fecha y cada línea.",
        }),
        "receipt.limit.last": t({
            en: "Last scan for now",
            es: "Último escaneo por ahora",
        }),
        "receipt.limit.next": t({
            en: "Next scan in {time}",
            es: "Siguiente escaneo en {time}",
        }),
        "receipt.limit.paused": t({
            en: "Scanning is paused",
            es: "El escaneo está en pausa",
        }),
        // The review reads as one line: "€20.56 at Mercadona · Groceries · yesterday".
        "receipt.review.at": t({
            en: "at",
            es: "en",
        }),
        "receipt.review.from": t({
            en: "from",
            es: "de",
        }),
        "receipt.review.inferredCurrency": t({
            en: "Currency read from the symbol",
            es: "Moneda leída del símbolo",
        }),
        "receipt.review.lines_one": t({
            en: "1 line",
            es: "1 línea",
        }),
        "receipt.review.lines_other": t({
            en: "{count} lines",
            es: "{count} líneas",
        }),
        "receipt.review.noCategory": t({
            en: "No category yet",
            es: "Aún sin categoría",
        }),
        "receipt.review.noMerchant": t({
            en: "No store yet",
            es: "Aún sin tienda",
        }),
        "receipt.review.noRate": t({
            en: "No {currency} rate for that day yet",
            es: "Aún no hay tasa de {currency} para ese día",
        }),
        "receipt.review.paid": t({
            en: "Paid with {method}",
            es: "Pagado con {method}",
        }),
        "receipt.review.rate": t({
            en: "{rate} {quote} per {base}",
            es: "{rate} {quote} por {base}",
        }),
        "receipt.review.subtotal": t({
            en: "Subtotal",
            es: "Subtotal",
        }),
        "receipt.review.tax": t({
            en: "Tax",
            es: "Impuestos",
        }),
        "receipt.review.tip": t({
            en: "Tip",
            es: "Propina",
        }),
        "receipt.review.total": t({
            en: "Total",
            es: "Total",
        }),
        "receipt.state.preparing": t({
            en: "Preparing the photo…",
            es: "Preparando la foto…",
        }),
        "receipt.state.reading": t({
            en: "Reading the receipt…",
            es: "Leyendo el recibo…",
        }),
        "receipt.title": t({
            en: "Scan a receipt",
            es: "Escanear un recibo",
        }),
    },
    key: "receipt" as const,
} satisfies Dictionary;

export default receipt;
