import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const receipt = {
    content: {
        "receipt.action.another": t({
            en: "Scan another",
            es: "Escanear otro",
            pt: "Escanear outro",
            "pt-PT": "Digitalizar outro",
        }),
        "receipt.action.camera": t({
            en: "Take a photo",
            es: "Tomar foto",
            "es-ES": "Hacer foto",
            pt: "Tirar foto",
        }),
        "receipt.action.edit": t({
            en: "Edit",
            es: "Editar",
            pt: "Editar",
        }),
        "receipt.action.finish": t({
            en: "Finish in the form",
            es: "Terminar en el formulario",
            pt: "Terminar no formulário",
        }),
        "receipt.action.library": t({
            en: "Library",
            es: "Galería",
            pt: "Galeria",
        }),
        "receipt.action.retry": t({
            en: "Try again",
            es: "Intentar de nuevo",
            pt: "Tentar de novo",
        }),
        "receipt.action.save": t({
            en: "Save",
            es: "Guardar",
            pt: "Salvar",
            "pt-PT": "Guardar",
        }),
        "receipt.action.settings": t({
            en: "Open Settings",
            es: "Abrir Configuración",
            "es-ES": "Abrir Ajustes",
            pt: "Abrir Ajustes",
            "pt-PT": "Abrir Definições",
        }),
        "receipt.close": t({
            en: "Close",
            es: "Cerrar",
            pt: "Fechar",
        }),
        "receipt.details.more": t({
            en: "and {count} more lines",
            es: "y {count} líneas más",
            pt: "e mais {count}",
        }),
        "receipt.failed.denied": t({
            en: "Outlayr needs the camera to scan a receipt.",
            es: "Outlayr necesita la cámara para escanear un recibo.",
            "es-ES": "Outlayr necesita la cámara para escanear un ticket.",
            pt: "O Outlayr precisa da câmera para escanear um recibo.",
            "pt-PT": "O Outlayr precisa da câmara para digitalizar um talão.",
        }),
        "receipt.failed.noCamera": t({
            en: "This device has no camera.",
            es: "Este dispositivo no tiene cámara.",
            pt: "Este dispositivo não tem câmera.",
            "pt-PT": "Este dispositivo não tem câmara.",
        }),
        "receipt.failed.notConfigured": t({
            en: "Scanning a receipt needs the cloud tier.",
            es: "Para escanear recibos se necesita el servicio en la nube.",
            "es-ES": "Para escanear tickets se necesita el servicio en la nube.",
            pt: "Escanear recibos requer o serviço na nuvem.",
            "pt-PT": "Digitalizar talões requer o serviço na nuvem.",
        }),
        "receipt.failed.notEntitled": t({
            en: "Your free captures, voice and receipts together, are used up. They come back within 30 days; Pro lifts the limit.",
            es: "Ya usaste tus capturas gratis (voz y recibos). Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
            "es-ES":
                "Ya has usado tus capturas gratis (voz y tickets). Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
            pt: "Você já usou suas capturas grátis (voz e recibos). Elas se renovam em até 30 dias; com o Pro não há esse limite.",
            "pt-PT":
                "Já usou as suas capturas grátis (voz e talões). Renovam-se no prazo de 30 dias; com o Pro não há este limite.",
        }),
        "receipt.failed.offline": t({
            en: "You're offline.",
            es: "Estás sin conexión.",
            pt: "Você está sem conexão.",
            "pt-PT": "Está sem ligação.",
        }),
        "receipt.failed.provider": t({
            en: "Couldn't read the receipt.",
            es: "No pude leer el recibo.",
            "es-ES": "No pude leer el ticket.",
            pt: "Não consegui ler o recibo.",
            "pt-PT": "Não consegui ler o talão.",
        }),
        "receipt.failed.quotaExceeded": t({
            en: "The fair-use limit for captures is reached. It resets within 30 days.",
            es: "Llegaste al límite de uso justo de capturas. Se renueva en menos de 30 días.",
            "es-ES": "Has llegado al límite de uso justo de capturas. Se renueva en menos de 30 días.",
            pt: "Você atingiu o limite de uso justo de capturas. Ele se renova em até 30 dias.",
            "pt-PT": "Atingiu o limite de utilização justa de capturas. Renova-se no prazo de 30 dias.",
        }),
        "receipt.failed.rateLimited": t({
            en: "That's a lot of receipts at once. Give it a moment.",
            es: "Son muchos recibos seguidos. Espera un momento.",
            "es-ES": "Son muchos tickets seguidos. Espera un momento.",
            pt: "São muitos recibos seguidos. Espere um momento.",
            "pt-PT": "São muitos talões seguidos. Espere um momento.",
        }),
        "receipt.failed.timeout": t({
            en: "That took too long.",
            es: "Tardó demasiado.",
            pt: "Demorou demais.",
            "pt-PT": "Demorou demasiado.",
        }),
        "receipt.failed.unauthenticated": t({
            en: "Sign in to scan a receipt.",
            es: "Inicia sesión para escanear un recibo.",
            "es-ES": "Inicia sesión para escanear un ticket.",
            pt: "Entre para escanear um recibo.",
            "pt-PT": "Inicie sessão para digitalizar um talão.",
        }),
        "receipt.failed.unclear": t({
            en: "Didn't find a receipt in that photo.",
            es: "No encontré un recibo en esa foto.",
            "es-ES": "No encontré un ticket en esa foto.",
            pt: "Não encontrei um recibo nessa foto.",
            "pt-PT": "Não encontrei um talão nessa foto.",
        }),
        "receipt.failed.unreadable": t({
            en: "Couldn't open that photo.",
            es: "No pude abrir esa foto.",
            pt: "Não consegui abrir essa foto.",
        }),
        "receipt.intro": t({
            en: "A photo of the ticket is enough. The total, the store, the date and every line, read for you.",
            es: "Basta con una foto del ticket. Leemos por ti el total, la tienda, la fecha y cada línea.",
            pt: "Basta uma foto do recibo. Lemos para você o total, a loja, a data e cada item.",
            "pt-PT": "Basta uma foto do talão. Lemos por si o total, a loja, a data e cada item.",
        }),
        "receipt.limit.last": t({
            en: "Last scan for now",
            es: "Último escaneo por ahora",
            pt: "Último escaneamento por enquanto",
            "pt-PT": "Última digitalização por agora",
        }),
        "receipt.limit.next": t({
            en: "Next scan in {time}",
            es: "Siguiente escaneo en {time}",
            pt: "Próximo escaneamento em {time}",
            "pt-PT": "Próxima digitalização em {time}",
        }),
        "receipt.limit.paused": t({
            en: "Scanning is paused",
            es: "El escaneo está en pausa",
            pt: "O escaneamento está pausado",
            "pt-PT": "A digitalização está em pausa",
        }),
        // The review reads as one line: "€20.56 at Mercadona · Groceries · yesterday".
        "receipt.review.at": t({
            en: "at",
            es: "en",
            pt: "em",
        }),
        "receipt.review.from": t({
            en: "from",
            es: "de",
            pt: "de",
        }),
        "receipt.review.inferredCurrency": t({
            en: "Currency read from the symbol",
            es: "Moneda leída del símbolo",
            pt: "Moeda identificada pelo símbolo",
        }),
        "receipt.review.lines_one": t({
            en: "1 line",
            es: "1 línea",
            pt: "1 item",
        }),
        "receipt.review.lines_other": t({
            en: "{count} lines",
            es: "{count} líneas",
            pt: "{count} itens",
        }),
        "receipt.review.noCategory": t({
            en: "No category yet",
            es: "Aún sin categoría",
            pt: "Ainda sem categoria",
        }),
        "receipt.review.noMerchant": t({
            en: "No store yet",
            es: "Aún sin tienda",
            pt: "Ainda sem loja",
        }),
        "receipt.review.noRate": t({
            en: "No {currency} rate for that day yet",
            es: "Aún no hay tasa de {currency} para ese día",
            "es-ES": "Aún no hay tipo de cambio de {currency} para ese día",
            pt: "Ainda não há cotação de {currency} para esse dia",
        }),
        "receipt.review.paid": t({
            en: "Paid with {method}",
            es: "Pagado con {method}",
            pt: "Pago com {method}",
        }),
        "receipt.review.rate": t({
            en: "{rate} {quote} per {base}",
            es: "{rate} {quote} por {base}",
            pt: "{rate} {quote} por {base}",
        }),
        "receipt.review.subtotal": t({
            en: "Subtotal",
            es: "Subtotal",
            pt: "Subtotal",
        }),
        "receipt.review.tax": t({
            en: "Tax",
            es: "Impuestos",
            pt: "Impostos",
        }),
        "receipt.review.tip": t({
            en: "Tip",
            es: "Propina",
            pt: "Gorjeta",
        }),
        "receipt.review.total": t({
            en: "Total",
            es: "Total",
            pt: "Total",
        }),
        "receipt.state.preparing": t({
            en: "Preparing the photo…",
            es: "Preparando la foto…",
            pt: "Preparando a foto…",
            "pt-PT": "A preparar a foto…",
        }),
        "receipt.state.reading": t({
            en: "Reading the receipt…",
            es: "Leyendo el recibo…",
            "es-ES": "Leyendo el ticket…",
            pt: "Lendo o recibo…",
            "pt-PT": "A ler o talão…",
        }),
        "receipt.title": t({
            en: "Scan a receipt",
            es: "Escanear un recibo",
            "es-ES": "Escanear un ticket",
            pt: "Escanear um recibo",
            "pt-PT": "Digitalizar um talão",
        }),
    },
    key: "receipt" as const,
} satisfies Dictionary;

export default receipt;
