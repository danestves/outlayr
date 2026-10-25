import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const support = {
    content: {
        answers: [
            {
                answer: t({
                    en: "No. Outlayr works without an account. Signing in with Apple or Google is needed for sync, voice entry, receipt scanning, and to buy Pro.",
                    es: "No. Outlayr funciona sin cuenta. Necesitas iniciar sesión con Apple o Google para sincronizar, dictar registros, escanear recibos y comprar Pro.",
                }),
                question: t({ en: "Do I need an account?", es: "¿Necesito una cuenta?" }),
            },
            {
                answer: t({
                    en: "Open Settings, tap Outlayr Pro, then Restore. Pro follows the app store account that bought it.",
                    es: "Abre Configuración, toca Outlayr Pro y luego Restaurar. Pro va con la cuenta de la tienda de apps con la que lo compraste.",
                }),
                question: t({
                    en: "How do I get Pro back on a new phone?",
                    es: "¿Cómo recupero Pro en un celular nuevo?",
                }),
            },
            {
                answer: t({
                    en: "Cancel from your app store’s subscriptions page. On iPhone: open the Settings app, tap your name, then Subscriptions, then Outlayr. On Android: open the Google Play Store app, tap your profile picture, then Payments & subscriptions, then Subscriptions, then Outlayr. Pro stays on until the period you paid for ends.",
                    es: "Cancélalo desde la página de suscripciones de tu tienda de apps. En iPhone: abre la app Configuración, toca tu nombre, luego Suscripciones y luego Outlayr. En Android: abre la app Google Play Store, toca tu foto de perfil, luego Pagos y suscripciones, luego Suscripciones y luego Outlayr. Pro sigue activo hasta que termine el período que pagaste.",
                }),
                question: t({ en: "How do I cancel Pro?", es: "¿Cómo cancelo Pro?" }),
            },
            {
                answer: t({
                    en: "Purchases go through your app store, so refunds do too. On iPhone, request one at reportaproblem.apple.com. On Android, follow Google Play’s steps at support.google.com/googleplay/answer/2479637.",
                    es: "Las compras pasan por tu tienda de apps, así que los reembolsos también. En iPhone, pide uno en reportaproblem.apple.com. En Android, sigue los pasos de Google Play en support.google.com/googleplay/answer/2479637.",
                }),
                question: t({ en: "Can I get a refund?", es: "¿Puedo pedir un reembolso?" }),
            },
            {
                answer: t({
                    en: "Open Settings, then Export data. Choose Export CSV for a spreadsheet, or Export a full archive for a file that carries every entry, category, and budget.",
                    es: "Abre Configuración y luego Exportar datos. Elige Exportar CSV para una hoja de cálculo, o Exportar un archivo completo para guardar cada registro, categoría y presupuesto.",
                }),
                question: t({ en: "How do I export my data?", es: "¿Cómo exporto mis datos?" }),
            },
            {
                answer: t({
                    en: "Open Settings, then Account, then Delete account. That removes your account and everything synced to it. The ledger on the phone stays unless you choose to erase this device as well.",
                    es: "Abre Configuración, luego Cuenta y luego Eliminar cuenta. Esto elimina tu cuenta y todo lo sincronizado en ella. El registro de tu celular se conserva, a menos que también elijas borrar este dispositivo.",
                }),
                question: t({ en: "How do I delete my account?", es: "¿Cómo elimino mi cuenta?" }),
            },
            {
                answer: t({
                    en: "English, Spanish, and Portuguese. Switch between them in Settings, under Language.",
                    es: "Inglés, español y portugués. Cambia entre ellos en Configuración, en Idioma.",
                }),
                question: t({ en: "Which languages does Outlayr speak?", es: "¿En qué idiomas está Outlayr?" }),
            },
        ],
        filter: {
            empty: insert(
                t({ en: "No answer matches “{{query}}”.", es: "Ninguna respuesta coincide con “{{query}}”." })
            ),
            emptyHint: t({
                en: "Write to us and tell us what you were looking for.",
                es: "Escríbenos y cuéntanos qué buscabas.",
            }),
            label: t({ en: "Filter the answers", es: "Filtra las respuestas" }),
            placeholder: t({ en: "Try refund or cancel", es: "Prueba reembolso o cancelar" }),
        },
        intro: t({
            en: "Write to us and include what you tapped and what happened. Screenshots help.",
            es: "Escríbenos y cuéntanos qué tocaste y qué pasó. Las capturas de pantalla ayudan.",
        }),
        meta: {
            description: t({
                en: "Restore or cancel Outlayr Pro, get a refund, export your data, or delete your account. Answers to common questions and how to reach support.",
                es: "Restaura o cancela Outlayr Pro, pide un reembolso, exporta tus datos o elimina tu cuenta. Respuestas a preguntas frecuentes y cómo contactar a soporte.",
            }),
            title: t({
                en: "Outlayr Support: Restore Pro, Export or Delete Your Data",
                es: "Soporte de Outlayr: restaura Pro, exporta o borra tus datos",
            }),
        },
        title: t({ en: "Outlayr support", es: "Soporte de Outlayr" }),
    },
    key: "support",
} satisfies Dictionary;

export default support;
