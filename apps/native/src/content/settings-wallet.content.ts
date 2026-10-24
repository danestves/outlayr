import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsWallet = {
    content: {
        "settings.wallet.accessRow": t({
            en: "Notification access",
            es: "Acceso a notificaciones",
        }),
        "settings.wallet.allowAccess": t({
            en: "Allow notification access",
            es: "Permitir acceso a notificaciones",
        }),
        "settings.wallet.allowAccessDetail": t({
            en: "Android opens Settings. Outlayr only keeps notifications from apps you turn on here.",
            es: "Android te lleva a Ajustes. Outlayr solo guarda las de apps que actives aquí.",
        }),
        "settings.wallet.androidLead": t({
            en: "Every Google Wallet payment and every purchase your bank notifies you of lands on the Log, filed under the account it matches.",
            es: "Cada pago con Google Wallet y cada compra que te notifique tu banco llega al registro, en la cuenta que coincida.",
        }),
        "settings.wallet.applePayRow": t({
            en: "Apple Pay taps",
            es: "Pagos con Apple Pay",
        }),
        "settings.wallet.automationDetail": t({
            en: "Wallet trigger runs Outlayr - Apple Pay",
            es: "El disparador de Wallet ejecuta Outlayr - Apple Pay",
        }),
        "settings.wallet.automationDetailInline": t({
            en: "Wallet trigger runs Log a Wallet Transaction",
            es: "El disparador de Wallet ejecuta Log a Wallet Transaction",
        }),
        "settings.wallet.automationRow": t({
            en: "Automation in Shortcuts",
            es: "Automatización en Atajos",
        }),
        "settings.wallet.bankFooter": t({
            en: "Pick only bank and card apps. A tap and its bank push land as one row.",
            es: "Elige solo apps de bancos y tarjetas. Un pago y la notificación de su banco quedan en una sola fila.",
        }),
        "settings.wallet.bankGet": t({
            en: "Get the bank shortcut",
            es: "Obtener el atajo del banco",
        }),
        "settings.wallet.bankSection": t({
            en: "Bank notifications",
            es: "Notificaciones del banco",
        }),
        "settings.wallet.bankShortcutName": t({
            en: "Outlayr - Bank Notifications",
            es: "Outlayr - Bank Notifications",
        }),
        "settings.wallet.bankStep1": t({
            en: "Add Shortcut",
            es: "Agregar atajo",
        }),
        "settings.wallet.bankStep2": t({
            en: "Tap App, pick your banks",
            es: "Toca App y elige tus bancos",
        }),
        "settings.wallet.bankStep3": t({
            en: "Turn it on in Automation",
            es: "Actívala en Automatización",
        }),
        "settings.wallet.cardsFooter": t({
            en: "Each card you pay with and each bank app that notifies you shows up here. Its purchases go to the account you choose.",
            es: "Cada tarjeta con la que pagas y cada app de banco que te notifica aparece aquí. Sus compras van a la cuenta que elijas.",
        }),
        "settings.wallet.cardsSection": t({
            en: "Cards and apps",
            es: "Tarjetas y apps",
        }),
        "settings.wallet.chooseAccount": t({
            en: "Choose an account",
            es: "Elige una cuenta",
        }),
        "settings.wallet.get": t({
            en: "Get the shortcut",
            es: "Obtener el atajo",
        }),
        "settings.wallet.getAgain": t({
            en: "Get the shortcut again",
            es: "Obtener el atajo de nuevo",
        }),
        "settings.wallet.getDetail": t({
            en: "Installs the whole automation with one tap. Then turn it on.",
            es: "Instala la automatización completa con un toque. Luego actívala.",
        }),
        "settings.wallet.hide": t({
            en: "Hide",
            es: "Ocultar",
        }),
        "settings.wallet.lastNotification": t({
            en: "Last notification",
            es: "Última notificación",
        }),
        "settings.wallet.lastSection": t({
            en: "Last logged",
            es: "Último registro",
        }),
        "settings.wallet.lastTap": t({
            en: "Last used {when}",
            es: "Último uso {when}",
        }),
        "settings.wallet.lead": t({
            en: "Every card tap lands on the Log, filed under the account it matches.",
            es: "Cada pago con tarjeta llega al registro, en la cuenta que coincida.",
        }),
        "settings.wallet.manualStep1": t({
            en: "Next, then New Blank Automation",
            es: "Siguiente, luego Nueva automatización en blanco",
        }),
        "settings.wallet.manualStep2": t({
            en: "Add Action, search Outlayr",
            es: "Agregar acción, busca Outlayr",
        }),
        "settings.wallet.manualStep2Detail": t({
            en: "Pick Log a Wallet Transaction",
            es: "Elige Log a Wallet Transaction",
        }),
        "settings.wallet.manualStep3": t({
            en: "Fill Amount, Merchant and Card",
            es: "Completa Amount, Merchant y Card",
        }),
        "settings.wallet.manualStep3Detail": t({
            en: "Tap each, choose Shortcut Input, then the matching field",
            es: "Toca cada uno, elige Entrada de atajo y luego el campo que corresponde",
        }),
        "settings.wallet.manualStep3Detail27": t({
            en: "Tap each, pick the Wallet variable above the keyboard, then the matching field",
            es: "Toca cada uno, elige la variable de Wallet sobre el teclado y luego el campo que corresponde",
        }),
        "settings.wallet.noCards": t({
            en: "No cards yet",
            es: "Aún no hay tarjetas",
        }),
        "settings.wallet.noSources": t({
            en: "Pay with Google Wallet or wait for a purchase notification from your bank.",
            es: "Paga con Google Wallet o espera una notificación de compra de tu banco.",
        }),
        "settings.wallet.nothingLogged": t({
            en: "Nothing logged yet",
            es: "Nada registrado aún",
        }),
        "settings.wallet.nothingYet": t({
            en: "Nothing yet",
            es: "Nada aún",
        }),
        "settings.wallet.notificationUnread": t({
            en: "Couldn't read it",
            es: "No se pudo leer",
        }),
        "settings.wallet.open": t({
            en: "Open Shortcuts",
            es: "Abrir Atajos",
        }),
        "settings.wallet.pushChannel": t({
            en: "Logged purchases",
            es: "Compras registradas",
        }),
        "settings.wallet.pushNewPlace": t({
            en: "New place, tap to pick a category.",
            es: "Lugar nuevo, toca para elegir una categoría.",
        }),
        "settings.wallet.pushWhichAccount": t({
            en: "Which account is {card}? Tap to pick.",
            es: "¿Qué cuenta es {card}? Toca para elegirla.",
        }),
        "settings.wallet.ranAt": t({
            en: "The automation ran {when}",
            es: "La automatización se ejecutó {when}",
        }),
        "settings.wallet.setupSection": t({
            en: "Setup",
            es: "Configuración",
        }),
        "settings.wallet.shortcutName": t({
            en: "Outlayr - Apple Pay",
            es: "Outlayr - Apple Pay",
        }),
        "settings.wallet.show": t({
            en: "Show",
            es: "Ver",
        }),
        "settings.wallet.sourcesFooter": t({
            en: "Apps that notified you of an amount show up here.",
            es: "Aparecen las apps que te notificaron un monto.",
        }),
        "settings.wallet.sourcesSection": t({
            en: "Log from",
            es: "Registrar desde",
        }),
        "settings.wallet.step1": t({
            en: "Automation, then +",
            es: "Automatización, luego +",
        }),
        "settings.wallet.step2": t({
            en: "Choose Wallet",
            es: "Elige Wallet",
        }),
        "settings.wallet.step2Detail": t({
            en: "Called Transaction before iOS 26",
            es: "Se llama Transacción antes de iOS 26",
        }),
        "settings.wallet.step3": t({
            en: "Pick your cards",
            es: "Elige tus tarjetas",
        }),
        "settings.wallet.step3Detail": t({
            en: "Run Immediately on, Notify When Run off",
            es: "Ejecutar de inmediato activado, Notificar al ejecutar desactivado",
        }),
        "settings.wallet.step5": t({
            en: "Done",
            es: "Listo",
        }),
        "settings.wallet.stepsSection": t({
            en: "Turn it on in Shortcuts",
            es: "Actívalo en Atajos",
        }),
        "settings.wallet.tryIt": t({
            en: "Tap a card to try it",
            es: "Paga con una tarjeta para probarlo",
        }),
        "settings.wallet.unattached": t({
            en: "No account",
            es: "Sin cuenta",
        }),
        "settings.wallet.v27Manual1": t({
            en: "New shortcut, then search Automation",
            es: "Nuevo atajo, luego busca Automatización",
        }),
        "settings.wallet.v27Manual2": t({
            en: "Pick Wallet",
            es: "Elige Wallet",
        }),
        "settings.wallet.v27Manual2Detail": t({
            en: "Any Card is fine. Automation is already on and Notify off.",
            es: "Cualquier tarjeta sirve. Automatización ya viene activada y Notificar desactivado.",
        }),
        "settings.wallet.v27Step1": t({
            en: "Library, then Automation",
            es: "Biblioteca, luego Automatización",
        }),
        "settings.wallet.v27Step1Detail": t({
            en: "A shared automation arrives turned off",
            es: "Una automatización compartida llega desactivada",
        }),
        "settings.wallet.v27Step2": t({
            en: "Turn on Outlayr - Apple Pay",
            es: "Activa Outlayr - Apple Pay",
        }),
    },
    key: "settings-wallet" as const,
} satisfies Dictionary;

export default settingsWallet;
