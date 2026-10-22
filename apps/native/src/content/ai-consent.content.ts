import { t } from "intlayer";
import type { Dictionary } from "intlayer";

// App Review 5.1.1(i), 5.1.2(i): each row must stay true to what the matching backend action sends and to the
// privacy policy's "Suggestions, voice, and receipts".
const aiConsent = {
    content: {
        "aiConsent.allow": t({
            en: "Allow",
            es: "Permitir",
        }),
        "aiConsent.eyebrow": t({
            en: "Smart features",
            es: "Funciones inteligentes",
        }),
        "aiConsent.fine": t({
            en: "Suggestions never include amounts, dates, or accounts. We don't keep recordings, photos, or screenshots.",
            es: "Las sugerencias nunca incluyen montos, fechas ni cuentas. No guardamos grabaciones, fotos ni capturas.",
        }),
        "aiConsent.lead": t({
            en: "These features need an account and use Claude, made by Anthropic, through our server. ElevenLabs turns recordings into text. Neither gets your name, email, or account ID.",
            es: "Estas funciones necesitan una cuenta y usan Claude, de Anthropic, a través de nuestro servidor. ElevenLabs convierte las grabaciones en texto. Ninguna recibe tu nombre, tu correo ni el ID de tu cuenta.",
        }),
        "aiConsent.lookup": t({
            en: "Web lookup",
            es: "Búsqueda web",
        }),
        "aiConsent.lookupSends": t({
            en: "Anthropic may search the web for a merchant's name",
            es: "Anthropic puede buscar en la web el nombre de un comercio",
        }),
        "aiConsent.notNow": t({
            en: "Not now",
            es: "Ahora no",
        }),
        "aiConsent.planScan": t({
            en: "Installment plan import",
            es: "Importar un plan de cuotas",
        }),
        "aiConsent.planScanSends": t({
            en: "The screenshot, the account's name, currency, language, region, and today's date",
            es: "La captura, el nombre de la cuenta, la moneda, el idioma, la región y la fecha de hoy",
        }),
        "aiConsent.privacy": t({
            en: "Privacy policy",
            es: "Política de privacidad",
        }),
        "aiConsent.scan": t({
            en: "Receipt scan",
            es: "Escanear un recibo",
        }),
        "aiConsent.scanSends": t({
            en: "The photo, plus the same details as voice entry and your region",
            es: "La foto, más los mismos datos que al dictar y tu región",
        }),
        "aiConsent.suggestions": t({
            en: "Category suggestions",
            es: "Sugerencias de categoría",
        }),
        "aiConsent.suggestionsSends": t({
            en: "Merchant names, expense or income, currency, language, region, and your category names. On import, CSV descriptions with long numbers removed.",
            es: "Nombres de comercios, si es gasto o ingreso, la moneda, el idioma, la región y los nombres de tus categorías. Al importar, las descripciones del CSV sin los números largos.",
        }),
        "aiConsent.title": t({
            en: "Send data to Anthropic and ElevenLabs?",
            es: "¿Enviar datos a Anthropic y ElevenLabs?",
        }),
        "aiConsent.voice": t({
            en: "Voice entry",
            es: "Dictar un registro",
        }),
        "aiConsent.voiceSends": t({
            en: "The recording, your account and category names, currency, language, and today's date",
            es: "La grabación, los nombres de tus cuentas y categorías, la moneda, el idioma y la fecha de hoy",
        }),
    },
    key: "ai-consent" as const,
} satisfies Dictionary;

export default aiConsent;
