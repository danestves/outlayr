import { t } from "intlayer";
import type { Dictionary } from "intlayer";

import type { PageRef } from "@/lib/site";

const LABEL = {
    en: "Outlayr is the expense tracker that never links your bank: log by sentence, voice, receipt or Apple Pay, in any of 165 currencies.",
    es: "Outlayr es la app de gastos que nunca se conecta a tu banco: registras con una oración, con tu voz, con un recibo o con Apple Pay, en cualquiera de 165 monedas.",
} as const;

const ON_IPHONE = t({ en: "On iPhone", es: "En iPhone" });
const ON_ANDROID = t({ en: "On Android", es: "En Android" });

const help = {
    content: {
        hub: {
            lead: t({
                en: "One question per page, answered in the first line, with the steps on iPhone and Android.",
                es: "Una pregunta por página, respondida en la primera línea, con los pasos en iPhone y Android.",
            }),
            meta: {
                title: t({ en: "Outlayr Help Center", es: "Centro de ayuda de Outlayr" }),
            },
            title: t({ en: "Help", es: "Ayuda" }),
        },
        articles: {
            "how-does-apple-pay-logging-work": {
                faq: [
                    {
                        answer: t({
                            en: "No. Apple Pay logging comes from a Shortcuts automation, so it needs an iPhone. On Android, Outlayr reads Google Wallet and bank notifications instead.",
                            es: "No. El registro con Apple Pay viene de una automatización de Atajos, así que necesita un iPhone. En Android, Outlayr lee las notificaciones de Google Wallet y de tu banco.",
                        }),
                        question: t({
                            en: "Does Apple Pay logging work on Android?",
                            es: "¿El registro con Apple Pay funciona en Android?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. The automation hands Outlayr the amount, the merchant and the card from Wallet. Outlayr never connects to your bank.",
                            es: "No. La automatización le pasa a Outlayr el monto, el comercio y la tarjeta desde Wallet. Outlayr nunca se conecta a tu banco.",
                        }),
                        question: t({
                            en: "Does Outlayr see my bank account?",
                            es: "¿Outlayr ve mi cuenta del banco?",
                        }),
                    },
                ],
                lead: t({
                    en: "A Shortcuts automation logs each Apple Pay purchase in Outlayr with its amount, merchant and card the moment you pay. On the free plan these entries count toward 30 auto-logged entries a month; Pro has no limit.",
                    es: "Una automatización de Atajos registra cada compra con Apple Pay en Outlayr, con su monto, comercio y tarjeta, en el momento en que pagas. En el plan gratis estos registros cuentan para los 30 registros automáticos al mes; Pro no tiene límite.",
                }),
                meta: {
                    description: t({
                        en: "How Outlayr logs Apple Pay purchases with a Shortcuts automation, how to set it up on iPhone, and how the free plan's 30 auto-logged entries a month work.",
                        es: "Cómo Outlayr registra las compras con Apple Pay con una automatización de Atajos, cómo configurarla en iPhone y cómo funcionan los 30 registros automáticos al mes del plan gratis.",
                    }),
                    title: t({
                        en: "How does Apple Pay logging work in Outlayr?",
                        es: "¿Cómo funciona el registro con Apple Pay en Outlayr?",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "Apple Pay purchases, bank notifications on iPhone, and notifications and messages on Android all count toward the same 30 auto-logged entries a month on the free plan. The month follows your phone's calendar.",
                                es: "Las compras con Apple Pay, las notificaciones del banco en iPhone y las notificaciones y mensajes en Android cuentan para los mismos 30 registros automáticos al mes del plan gratis. El mes sigue el calendario de tu celular.",
                            }),
                            t({
                                en: "Income doesn't count, and neither does a notification that matches an entry you already logged. Past 30, Outlayr holds new ones instead of logging them. Outlayr Pro has no limit.",
                                es: "Los ingresos no cuentan, y tampoco una notificación que coincide con un registro que ya tenías. Después de 30, Outlayr guarda los nuevos en espera en vez de registrarlos. Outlayr Pro no tiene límite.",
                            }),
                        ],
                        id: "free-plan",
                        title: t({ en: "What counts toward the 30", es: "Qué cuenta para los 30" }),
                    },
                ],
                related: [
                    "/guides/apple-pay-expense-tracker",
                    "/guides/budget-app-without-bank-account",
                ] satisfies PageRef[],
                steps: [
                    {
                        id: "iphone",
                        items: [
                            t({
                                en: "In Outlayr, open Settings › Integrations › Apple Pay.",
                                es: "En Outlayr, abre Configuración › Integraciones › Apple Pay.",
                            }),
                            t({
                                en: "On iOS 27, tap Get the shortcut and add it. In the Shortcuts app, open Library › Automation and turn on Outlayr - Apple Pay.",
                                es: "En iOS 27, toca Obtener el atajo y agrégalo. En la app Atajos, abre Biblioteca › Automatización y activa Outlayr - Apple Pay.",
                            }),
                            t({
                                en: "On iOS 26 or earlier, build it in Shortcuts: Automation, then +, choose Wallet, pick your cards and turn on Run Immediately.",
                                es: "En iOS 26 o anterior, créala en Atajos: Automatización, luego +, elige Wallet, escoge tus tarjetas y activa Ejecutar de inmediato.",
                            }),
                            t({
                                en: "Still on iOS 26 or earlier, add Outlayr's Log a Wallet Transaction action and fill Amount, Merchant and Card from the Shortcut Input.",
                                es: "Todavía en iOS 26 o anterior, agrega la acción Log a Wallet Transaction de Outlayr y completa Amount, Merchant y Card con la entrada del atajo.",
                            }),
                            t({
                                en: "Pay with Apple Pay. The purchase shows up in Outlayr, filed under the account linked to that card.",
                                es: "Paga con Apple Pay. La compra aparece en Outlayr, en la cuenta asociada a esa tarjeta.",
                            }),
                        ],
                        title: ON_IPHONE,
                    },
                    {
                        id: "android",
                        items: [
                            t({
                                en: "Android has no Apple Pay. Open Settings › Integrations › Google Wallet and banks.",
                                es: "Android no tiene Apple Pay. Abre Configuración › Integraciones › Google Wallet y bancos.",
                            }),
                            t({
                                en: "Tap Allow notification access and turn Outlayr on in Android's settings.",
                                es: "Toca Permitir acceso a notificaciones y activa Outlayr en la configuración de Android.",
                            }),
                            t({
                                en: "Under Log from, turn on your bank's app. Google Wallet starts on. Under Messages, turn on your bank's sender if it texts you.",
                                es: "En Registrar desde, activa la app de tu banco. Google Wallet viene activado. En Mensajes, activa el remitente de tu banco si te escribe por SMS.",
                            }),
                        ],
                        title: ON_ANDROID,
                    },
                ],
                title: t({
                    en: "How does Apple Pay logging work?",
                    es: "¿Cómo funciona el registro con Apple Pay?",
                }),
            },
            "can-i-track-expenses-in-several-currencies": {
                faq: [
                    {
                        answer: t({
                            en: "Yes. For bolívares you pick the rate per entry: USD (BCV), EUR (BCV), USDT (Binance), or your own rate.",
                            es: "Sí. Para bolívares eliges la tasa en cada registro: USD (BCV), EUR (BCV), USDT (Binance) o tu propia tasa.",
                        }),
                        question: t({
                            en: "Can I choose the rate for bolívares?",
                            es: "¿Puedo elegir la tasa para bolívares?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The free plan keeps accounts in 2 currencies. Outlayr Pro has no limit.",
                            es: "El plan gratis tiene cuentas en 2 monedas. Outlayr Pro no tiene límite.",
                        }),
                        question: t({
                            en: "How many currencies does the free plan allow?",
                            es: "¿Cuántas monedas permite el plan gratis?",
                        }),
                    },
                ],
                lead: t({
                    en: "Yes. Outlayr supports 165 currencies; each account keeps its own currency and totals convert to your main currency at the rate from the day of each purchase.",
                    es: "Sí. Outlayr admite 165 monedas; cada cuenta tiene su propia moneda y los totales se convierten a tu moneda principal con la tasa del día de cada compra.",
                }),
                meta: {
                    description: t({
                        en: "Outlayr tracks expenses in 165 currencies. How to set your main currency, give each account its own, and how totals convert at each day's rate.",
                        es: "Outlayr registra gastos en 165 monedas. Cómo elegir tu moneda principal, darle a cada cuenta la suya y cómo se convierten los totales con la tasa de cada día.",
                    }),
                    title: t({
                        en: "Can I track expenses in several currencies in Outlayr?",
                        es: "¿Puedo registrar gastos en varias monedas en Outlayr?",
                    }),
                },
                more: [
                    {
                        body: [
                            t({
                                en: "Most rates update every hour; the BCV bolívar rate every two hours and the Binance rate every 30 minutes. A purchase from last Tuesday converts at last Tuesday's rate, so old totals don't move when the rate changes today.",
                                es: "La mayoría de las tasas se actualizan cada hora; la del BCV cada dos horas y la de Binance cada 30 minutos. Una compra del martes pasado se convierte con la tasa del martes pasado, así que los totales viejos no cambian cuando la tasa cambia hoy.",
                            }),
                            t(LABEL),
                        ],
                        id: "rates",
                        title: t({ en: "Which rate is used", es: "Qué tasa se usa" }),
                    },
                ],
                related: [
                    "/guides/multi-currency-expense-tracker",
                    "/guides/expense-tracker-venezuela",
                    "/guides/track-money-sent-home",
                ] satisfies PageRef[],
                steps: [
                    {
                        id: "iphone-android",
                        items: [
                            t({
                                en: "Open Settings › Currency and pick your main currency. Totals and insights show in it.",
                                es: "Abre Configuración › Moneda y elige tu moneda principal. Los totales y el análisis se muestran en ella.",
                            }),
                            t({
                                en: "When you add an account, set its Currency. Cash in dollars and a card in pesos can sit side by side.",
                                es: "Cuando agregues una cuenta, elige su Moneda. Efectivo en dólares y una tarjeta en pesos pueden estar lado a lado.",
                            }),
                            t({
                                en: "Log purchases as usual. Each one keeps its own amount and converts to your main currency at that day's rate.",
                                es: "Registra tus compras como siempre. Cada una guarda su monto y se convierte a tu moneda principal con la tasa de ese día.",
                            }),
                        ],
                        title: t({ en: "On iPhone and Android", es: "En iPhone y Android" }),
                    },
                ],
                title: t({
                    en: "Can I track expenses in several currencies?",
                    es: "¿Puedo registrar gastos en varias monedas?",
                }),
            },
            "does-outlayr-link-my-bank": {
                faq: [
                    {
                        answer: t({
                            en: "Your entries are stored on your phone first. They reach Outlayr's servers only if you sign in and turn on sync, or use a feature that needs the server, such as voice entry or receipt scanning.",
                            es: "Tus registros se guardan primero en tu celular. Solo llegan a los servidores de Outlayr si inicias sesión y activas la sincronización, o si usas una función que necesita el servidor, como dictar o escanear recibos.",
                        }),
                        question: t({
                            en: "Where is my data kept?",
                            es: "¿Dónde se guardan mis datos?",
                        }),
                    },
                ],
                lead: t({
                    en: "No. Outlayr never links your bank and never asks for bank logins; you log purchases yourself or import a file. Outlayr is the expense tracker that never links your bank: log by sentence, voice, receipt or Apple Pay, in any of 165 currencies.",
                    es: "No. Outlayr nunca se conecta a tu banco ni te pide las claves del banco; registras tus compras tú mismo o importas un archivo. Outlayr es la app de gastos que nunca se conecta a tu banco: registras con una oración, con tu voz, con un recibo o con Apple Pay, en cualquiera de 165 monedas.",
                }),
                meta: {
                    description: t({
                        en: "Outlayr never links your bank. How to log purchases without a bank connection and how to import past spending from a CSV or a bank statement PDF.",
                        es: "Outlayr nunca se conecta a tu banco. Cómo registrar compras sin conexión bancaria y cómo importar gastos pasados desde un CSV o un PDF de estado de cuenta.",
                    }),
                    title: t({
                        en: "Does Outlayr link my bank account?",
                        es: "¿Outlayr se conecta a mi cuenta del banco?",
                    }),
                },
                related: [
                    "/guides/budget-app-without-bank-account",
                    "/guides/how-to-track-expenses",
                    "/guides/apple-pay-expense-tracker",
                ] satisfies PageRef[],
                steps: [
                    {
                        id: "log",
                        items: [
                            t({
                                en: "Tap + to log a purchase: fill in the sentence, speak it, or scan the receipt.",
                                es: "Toca + para registrar una compra: llena la oración, díctala o escanea el recibo.",
                            }),
                            t({
                                en: "On iPhone, turn on Apple Pay logging in Settings › Integrations › Apple Pay.",
                                es: "En iPhone, activa el registro con Apple Pay en Configuración › Integraciones › Apple Pay.",
                            }),
                            t({
                                en: "On Android, let Outlayr read your bank's notifications in Settings › Integrations › Google Wallet and banks.",
                                es: "En Android, deja que Outlayr lea las notificaciones de tu banco en Configuración › Integraciones › Google Wallet y bancos.",
                            }),
                        ],
                        title: t({ en: "Log without a bank connection", es: "Registra sin conexión bancaria" }),
                    },
                    {
                        id: "import",
                        items: [
                            t({
                                en: "Download a CSV of your transactions from your bank's website or app.",
                                es: "Descarga un CSV de tus movimientos desde la web o la app de tu banco.",
                            }),
                            t({
                                en: "In Outlayr, open Settings › Data › Import and choose CSV file. CSV import is free.",
                                es: "En Outlayr, abre Configuración › Datos › Importar y elige Archivo CSV. Importar CSV es gratis.",
                            }),
                            t({
                                en: "With Pro, choose Bank statement PDF to import a statement as your bank sends it.",
                                es: "Con Pro, elige PDF de estado de cuenta para importar el estado de cuenta tal como te lo manda tu banco.",
                            }),
                            t({
                                en: "Duplicates are skipped, so importing the same file twice doesn't double your spending.",
                                es: "Los duplicados se saltan, así que importar el mismo archivo dos veces no duplica tus gastos.",
                            }),
                        ],
                        title: t({ en: "Bring in past spending", es: "Trae tus gastos pasados" }),
                    },
                ],
                title: t({ en: "Does Outlayr link my bank?", es: "¿Outlayr se conecta a mi banco?" }),
            },
            "how-do-i-add-an-expense-by-voice": {
                faq: [
                    {
                        answer: t({
                            en: "English, Spanish, Portuguese, French and German, the languages the app speaks.",
                            es: "Inglés, español, portugués, francés y alemán, los idiomas de la app.",
                        }),
                        question: t({ en: "Which languages can I speak?", es: "¿En qué idiomas puedo hablar?" }),
                    },
                    {
                        answer: t({
                            en: "ElevenLabs turns the recording into text and Anthropic reads the purchase out of it, only after you allow it.",
                            es: "ElevenLabs convierte la grabación en texto y Anthropic lee la compra a partir de él, solo después de que lo permitas.",
                        }),
                        question: t({ en: "Where does my voice go?", es: "¿A dónde va mi voz?" }),
                    },
                ],
                lead: t({
                    en: "Tap +, choose Speak an entry and say the purchase, like “25 dollars at the pharmacy with my Visa”; Outlayr fills in the amount, merchant, category and account. The free plan includes 30 voice, receipt or payment plan captures every 30 days, and Pro 500.",
                    es: "Toca +, elige Dictar un registro y di la compra, como “25 dólares en la farmacia con mi Visa”; Outlayr llena el monto, el comercio, la categoría y la cuenta. El plan gratis incluye 30 capturas por voz, recibo o plan de pagos cada 30 días, y Pro 500.",
                }),
                meta: {
                    description: t({
                        en: "How to add an expense by voice in Outlayr on iPhone and Android, which languages work, and how many voice entries the free plan includes.",
                        es: "Cómo agregar un gasto por voz en Outlayr en iPhone y Android, qué idiomas funcionan y cuántos registros por voz incluye el plan gratis.",
                    }),
                    title: t({
                        en: "How do I add an expense by voice in Outlayr?",
                        es: "¿Cómo agrego un gasto por voz en Outlayr?",
                    }),
                },
                related: ["/guides/voice-expense-tracker", "/guides/ai-expense-tracker"] satisfies PageRef[],
                steps: [
                    {
                        id: "iphone-android",
                        items: [
                            t({
                                en: "Sign in. Voice entry runs on Outlayr's server, so it needs an account.",
                                es: "Inicia sesión. Dictar pasa por el servidor de Outlayr, así que necesita una cuenta.",
                            }),
                            t({
                                en: "Tap + and choose Speak an entry. The microphone opens right away. On Android, the Voice tile on the home screen widget opens it too.",
                                es: "Toca + y elige Dictar un registro. El micrófono se abre de una vez. En Android, el botón de voz del widget de la pantalla de inicio también lo abre.",
                            }),
                            t({
                                en: "Say the amount, where you bought it and, if you like, the account or the day. Tap Done speaking.",
                                es: "Di el monto, dónde compraste y, si quieres, la cuenta o el día. Toca Terminé de hablar.",
                            }),
                            t({
                                en: "Check the fields that came back, change any of them, and save.",
                                es: "Revisa los campos que salieron, cambia el que quieras y guarda.",
                            }),
                        ],
                        title: t({ en: "On iPhone and Android", es: "En iPhone y Android" }),
                    },
                ],
                title: t({
                    en: "How do I add an expense by voice?",
                    es: "¿Cómo agrego un gasto por voz?",
                }),
            },
            "how-do-i-scan-a-receipt": {
                lead: t({
                    en: "Tap +, choose Scan a receipt, then take a photo or pick one from your library; Outlayr reads the store, date, total, tax, tip and every line. The free plan includes 30 voice, receipt or payment plan captures every 30 days, and Pro 500.",
                    es: "Toca +, elige Escanear un recibo y luego toma una foto o escoge una de tu galería; Outlayr lee la tienda, la fecha, el total, el impuesto, la propina y cada línea. El plan gratis incluye 30 capturas por voz, recibo o plan de pagos cada 30 días, y Pro 500.",
                }),
                meta: {
                    description: t({
                        en: "How to scan a receipt in Outlayr on iPhone and Android, what it reads from the photo, and how many scans the free plan includes.",
                        es: "Cómo escanear un recibo en Outlayr en iPhone y Android, qué lee de la foto y cuántos escaneos incluye el plan gratis.",
                    }),
                    title: t({
                        en: "How do I scan a receipt in Outlayr?",
                        es: "¿Cómo escaneo un recibo en Outlayr?",
                    }),
                },
                related: ["/guides/receipt-scanner", "/guides/how-to-track-expenses"] satisfies PageRef[],
                steps: [
                    {
                        id: "iphone-android",
                        items: [
                            t({
                                en: "Sign in. Scanning runs on Outlayr's server, so it needs an account.",
                                es: "Inicia sesión. Escanear pasa por el servidor de Outlayr, así que necesita una cuenta.",
                            }),
                            t({
                                en: "Tap + and choose Scan a receipt.",
                                es: "Toca + y elige Escanear un recibo.",
                            }),
                            t({
                                en: "Tap Take a photo, or Library to use a picture you already have.",
                                es: "Toca Tomar foto, o Galería para usar una foto que ya tengas.",
                            }),
                            t({
                                en: "Outlayr fills in the merchant, date, currency, total and line items, and suggests a category and account.",
                                es: "Outlayr llena el comercio, la fecha, la moneda, el total y las líneas, y sugiere una categoría y una cuenta.",
                            }),
                            t({
                                en: "Tap Save, or Edit to change something first. Finish in the form opens the full entry.",
                                es: "Toca Guardar, o Editar para cambiar algo antes. Terminar en el formulario abre el registro completo.",
                            }),
                        ],
                        title: t({ en: "On iPhone and Android", es: "En iPhone y Android" }),
                    },
                ],
                title: t({ en: "How do I scan a receipt?", es: "¿Cómo escaneo un recibo?" }),
            },
            "how-do-subscription-reminders-work": {
                faq: [
                    {
                        answer: t({
                            en: "No. Subscriptions and their reminders are part of the free plan.",
                            es: "No. Las suscripciones y sus avisos son parte del plan gratis.",
                        }),
                        question: t({ en: "Do reminders need Pro?", es: "¿Los avisos necesitan Pro?" }),
                    },
                    {
                        answer: t({
                            en: "Outlayr logs the charge on its day when you open the app, so the subscription counts in your budget without typing it again.",
                            es: "Outlayr registra el cobro en su día cuando abres la app, así que la suscripción cuenta en tu presupuesto sin escribirla de nuevo.",
                        }),
                        question: t({
                            en: "What happens on the charge day?",
                            es: "¿Qué pasa el día del cobro?",
                        }),
                    },
                ],
                lead: t({
                    en: "Each subscription can remind you on the day of the charge, or 1, 2 or 3 days or a week before, at the time you choose for reminders. The charge then logs itself on its day.",
                    es: "Cada suscripción puede avisarte el día del cobro, o 1, 2 o 3 días o una semana antes, a la hora que elijas para los avisos. Luego el cobro se registra solo en su día.",
                }),
                meta: {
                    description: t({
                        en: "How subscription reminders work in Outlayr: when they fire, how to set one per subscription, and how charges log themselves on their day.",
                        es: "Cómo funcionan los avisos de suscripciones en Outlayr: cuándo llegan, cómo poner uno por suscripción y cómo los cobros se registran solos en su día.",
                    }),
                    title: t({
                        en: "How do subscription reminders work in Outlayr?",
                        es: "¿Cómo funcionan los avisos de suscripciones en Outlayr?",
                    }),
                },
                related: [
                    "/guides/subscription-tracker",
                    "/guides/best-subscription-tracker-apps",
                    "/tools/subscription-cost-calculator",
                ] satisfies PageRef[],
                steps: [
                    {
                        id: "iphone-android",
                        items: [
                            t({
                                en: "Tap + and fill in the subscription as an expense, then tap repeat in the sentence and pick how often it charges: daily, weekly, monthly or yearly.",
                                es: "Toca + y llena la suscripción como un gasto, luego toca repetir en la oración y elige cada cuánto cobra: diario, semanal, mensual o anual.",
                            }),
                            t({
                                en: "Under Remind Me, pick on the day, 1, 2 or 3 days before, or 1 week before.",
                                es: "En Recordarme, elige el mismo día, 1, 2 o 3 días antes, o 1 semana antes.",
                            }),
                            t({
                                en: "Tap Add Subscription.",
                                es: "Toca Agregar suscripción.",
                            }),
                            t({
                                en: "To turn all of them on or off, open Settings › Notifications › Subscription charges › Warn me before a charge. The reminder arrives at your daily reminder time.",
                                es: "Para activarlos o apagarlos todos, abre Configuración › Notificaciones › Cobros de suscripciones › Avísame antes de un cobro. El aviso llega a la hora de tu recordatorio diario.",
                            }),
                        ],
                        title: t({ en: "On iPhone and Android", es: "En iPhone y Android" }),
                    },
                ],
                title: t({
                    en: "How do subscription reminders work?",
                    es: "¿Cómo funcionan los avisos de suscripciones?",
                }),
            },
            "how-do-i-track-an-installment-purchase": {
                faq: [
                    {
                        answer: t({
                            en: "No. Outlayr tracks what you owe and when, but you pay in the Cashea or Klarna app as usual.",
                            es: "No. Outlayr sigue lo que debes y cuándo, pero pagas en la app de Cashea o Klarna como siempre.",
                        }),
                        question: t({
                            en: "Can I pay my cuota from Outlayr?",
                            es: "¿Puedo pagar mi cuota desde Outlayr?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The free plan tracks 2 installment apps, with as many orders as you like in each. Outlayr Pro has no limit.",
                            es: "El plan gratis sigue 2 apps de cuotas, con todas las órdenes que quieras en cada una. Outlayr Pro no tiene límite.",
                        }),
                        question: t({
                            en: "How many installment apps does the free plan track?",
                            es: "¿Cuántas apps de cuotas sigue el plan gratis?",
                        }),
                    },
                ],
                lead: t({
                    en: "Tap +, choose Buy in installments, pick Cashea, Klarna or your app, and enter the price, the upfront and the schedule; Outlayr lists each cuota with its due date. The free plan tracks 2 installment apps, and Pro has no limit.",
                    es: "Toca +, elige Comprar en cuotas, escoge Cashea, Klarna o tu app, y escribe el precio, la inicial y el calendario; Outlayr muestra cada cuota con su fecha. El plan gratis sigue 2 apps de cuotas, y Pro no tiene límite.",
                }),
                meta: {
                    description: t({
                        en: "How to track a Cashea, Klarna or other buy now, pay later purchase in Outlayr: each cuota, reminders the day before, late fees, and importing an order from screenshots.",
                        es: "Cómo registrar una compra en Cashea, Klarna u otra app de cuotas en Outlayr: cada cuota, avisos el día antes, recargos e importar una orden desde capturas.",
                    }),
                    title: t({
                        en: "How do I track a Cashea or Klarna purchase in Outlayr?",
                        es: "¿Cómo registro una compra en Cashea o Klarna en Outlayr?",
                    }),
                },
                related: [
                    "/guides/how-to-pay-cashea",
                    "/tools/installment-calculator",
                    "/guides/expense-tracker-venezuela",
                ] satisfies PageRef[],
                steps: [
                    {
                        id: "iphone-android",
                        items: [
                            t({
                                en: "Tap + and choose Buy in installments.",
                                es: "Toca + y elige Comprar en cuotas.",
                            }),
                            t({
                                en: "Pick the app. Outlayr lists the ones used in your country, such as Cashea, Krece and Lysto in Venezuela, or Klarna and Afterpay in the US. If yours isn't there, use Other.",
                                es: "Escoge la app. Outlayr muestra las de tu país, como Cashea, Krece y Lysto en Venezuela, o Klarna y Afterpay en Estados Unidos. Si la tuya no está, usa Otra.",
                            }),
                            t({
                                en: "Enter the price, what you paid upfront, how many cuotas, how often they're due and the first due date.",
                                es: "Escribe el precio, lo que pagaste de inicial, cuántas cuotas, cada cuánto vencen y la primera fecha.",
                            }),
                            t({
                                en: "When you pay a cuota in the app, tap it in Outlayr and tap Pay. If you were charged a late fee, tap Add late fee.",
                                es: "Cuando pagues una cuota en la app, tócala en Outlayr y toca Pagar. Si te cobraron un recargo, toca Agregar recargo.",
                            }),
                            t({
                                en: "For a reminder, open Settings › Notifications › Installments and turn on Remind me the day before. It's off until you do.",
                                es: "Para que te avise, abre Configuración › Notificaciones › Cuotas y activa Avísame el día antes. Está apagado hasta que lo actives.",
                            }),
                        ],
                        title: t({ en: "On iPhone and Android", es: "En iPhone y Android" }),
                    },
                ],
                more: [
                    {
                        body: [
                            t({
                                en: "An order you started before Outlayr can be read from screenshots of its payment plan, up to 5 at a time. Each import uses one of the free plan's 30 captures every 30 days.",
                                es: "Una orden que empezaste antes de Outlayr se puede leer desde capturas de su plan de pagos, hasta 5 a la vez. Cada importación usa una de las 30 capturas cada 30 días del plan gratis.",
                            }),
                        ],
                        id: "existing-orders",
                        title: t({ en: "An order already in progress", es: "Una orden que ya va por la mitad" }),
                    },
                ],
                title: t({
                    en: "How do I track a Cashea or Klarna installment purchase?",
                    es: "¿Cómo registro una compra en cuotas de Cashea o Klarna?",
                }),
            },
        },
    },
    key: "help",
} satisfies Dictionary;

export default help;
