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
                    en: "Open Settings, then Invite friends, and share your code or link. A friend who claims it gets a month of Pro. You get a month once they have logged entries on three separate days.",
                    es: "Abre Configuración, luego Invitar amigos, y comparte tu código o enlace. Un amigo que lo reclama recibe un mes de Pro. Tú recibes un mes cuando registra entradas en tres días distintos.",
                }),
                question: t({ en: "How do invites work?", es: "¿Cómo funcionan las invitaciones?" }),
            },
            {
                answer: t({
                    en: "Someone with an account under 7 days old who has never had Pro. Each person can claim one code, ever, and not their own.",
                    es: "Alguien con una cuenta de menos de 7 días que nunca tuvo Pro. Cada persona puede reclamar un código en total, y no el suyo.",
                }),
                question: t({ en: "Who can claim an invite?", es: "¿Quién puede reclamar una invitación?" }),
            },
            {
                answer: t({
                    en: "On the third day your friend logs an entry. A day counts once the entry syncs. Days are counted by UTC date and at least 20 hours apart, so three entries in one evening count as one day.",
                    es: "El tercer día en que tu amigo registra una entrada. Un día cuenta cuando la entrada se sincroniza. Los días se cuentan por fecha UTC y con al menos 20 horas entre uno y otro, así que tres entradas en una misma noche cuentan como un día.",
                }),
                question: t({ en: "When do I get my month?", es: "¿Cuándo recibo mi mes?" }),
            },
            {
                answer: t({
                    en: "Yes: 12 months in any 365 days. An invite that finishes after that earns no month, and lifetime owners don’t earn months. If you pay for Pro, a month you earn waits and starts when your paid plan ends.",
                    es: "Sí: 12 meses en cualquier período de 365 días. Una invitación que termina después de eso no da mes, y quienes tienen Pro de por vida no ganan meses. Si pagas Pro, el mes que ganas espera y empieza cuando termina tu plan pagado.",
                }),
                question: t({
                    en: "Is there a limit on invite months?",
                    es: "¿Hay un límite de meses por invitaciones?",
                }),
            },
            {
                answer: t({
                    en: "Your invite shows your first name. You see each friend’s first name, how many days they have logged up to three, and the date of the third. Never their entries or amounts.",
                    es: "Tu invitación muestra tu nombre de pila. Tú ves el nombre de pila de cada amigo, cuántos días ha registrado hasta tres y la fecha del tercero. Nunca sus entradas ni sus montos.",
                }),
                question: t({ en: "What do invites show about me?", es: "¿Qué muestran las invitaciones sobre mí?" }),
            },
            {
                answer: t({
                    en: "Your invite code, the invites you sent, and any months waiting for your paid plan to end are deleted. If you claimed an invite that already earned your friend a month, it stays on their list without your name and still counts toward their 12 a year. Any other invite you claimed is deleted too.",
                    es: "Se eliminan tu código de invitación, las invitaciones que enviaste y los meses que esperan a que termine tu plan pagado. Si reclamaste una invitación que ya le dio un mes a tu amigo, queda en su lista sin tu nombre y sigue contando para sus 12 al año. Cualquier otra invitación que reclamaste también se elimina.",
                }),
                question: t({
                    en: "What happens to invites if I delete my account?",
                    es: "¿Qué pasa con las invitaciones si elimino mi cuenta?",
                }),
            },
            {
                answer: t({
                    en: "No. A month from an invite is a one-time gift of Pro. When it ends, Pro ends unless you subscribe or buy it yourself, and nothing charges you.",
                    es: "No. Un mes por invitación es un regalo único de Pro. Cuando termina, Pro termina, a menos que te suscribas o lo compres tú, y no se te cobra nada.",
                }),
                question: t({ en: "Do invite months renew?", es: "¿Los meses por invitaciones se renuevan?" }),
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
                    en: "English, Spanish, Portuguese, and French. Switch between them in Settings, under Language.",
                    es: "Inglés, español, portugués y francés. Cambia entre ellos en Configuración, en Idioma.",
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
