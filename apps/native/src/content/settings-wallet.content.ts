import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsWallet = {
    content: {
        "settings.integrations.onCount_one": t({
            en: "{count} on",
            es: "{count} activa",
            pt: "{count} ativa",
        }),
        "settings.integrations.onCount_other": t({
            en: "{count} on",
            es: "{count} activas",
            pt: "{count} ativas",
        }),
        "settings.wallet.accessRow": t({
            en: "Notification access",
            es: "Acceso a notificaciones",
            pt: "Acesso às notificações",
        }),
        "settings.wallet.allowAccess": t({
            en: "Allow notification access",
            es: "Permitir acceso a notificaciones",
            pt: "Permitir acesso às notificações",
        }),
        "settings.wallet.allowAccessDetail": t({
            en: "Android opens Settings. Outlayr only keeps notifications from apps you turn on here.",
            es: "Android te lleva a Ajustes. Outlayr solo guarda las de apps que actives aquí.",
            pt: "O Android abre as Configurações. O Outlayr só mantém notificações dos apps que você ativar aqui.",
        }),
        "settings.wallet.androidLead": t({
            en: "Every Google Wallet payment and every purchase your bank notifies you of lands on the Log, filed under the account it matches.",
            es: "Cada pago con Google Wallet y cada compra que te notifique tu banco llega al registro, en la cuenta que coincida.",
            pt: "Cada pagamento com o Google Wallet e cada compra que seu banco notificar vai para Lançamentos, na conta que corresponder.",
        }),
        "settings.wallet.automationDetail": t({
            en: "Wallet trigger runs Outlayr - Apple Pay",
            es: "El disparador de Wallet ejecuta Outlayr - Apple Pay",
            "es-ES": "El disparador de Cartera ejecuta Outlayr - Apple Pay",
            pt: "O acionador Carteira executa Outlayr - Apple Pay",
        }),
        "settings.wallet.automationDetailInline": t({
            en: "Wallet trigger runs Log a Wallet Transaction",
            es: "El disparador de Wallet ejecuta Log a Wallet Transaction",
            "es-ES": "El disparador de Cartera ejecuta Log a Wallet Transaction",
            pt: "O acionador Carteira executa Log a Wallet Transaction",
        }),
        "settings.wallet.automationRow": t({
            en: "Automation in Shortcuts",
            es: "Automatización en Atajos",
            pt: "Automação no app Atalhos",
        }),
        "settings.wallet.bankFooter": t({
            en: "Pick only bank and card apps. A tap and its bank push land as one row.",
            es: "Elige solo apps de bancos y tarjetas. Un pago y la notificación de su banco quedan en una sola fila.",
            pt: "Escolha só apps de bancos e cartões. Um pagamento e a notificação do banco viram uma só linha.",
        }),
        "settings.wallet.bankGet": t({
            en: "Get the bank shortcut",
            es: "Obtener el atajo del banco",
            pt: "Obter o atalho do banco",
        }),
        "settings.wallet.bankLead": t({
            en: "Every purchase your bank app notifies you of lands on the Log, filed under the account it matches.",
            es: "Cada compra que te notifique la app de tu banco llega al registro, en la cuenta que coincida.",
            pt: "Cada compra que o app do seu banco notificar vai para Lançamentos, na conta que corresponder.",
        }),
        "settings.wallet.bankSection": t({
            en: "Bank notifications",
            es: "Notificaciones del banco",
            pt: "Notificações do banco",
        }),
        "settings.wallet.bankShortcutName": t({
            en: "Outlayr - Bank Notifications",
            es: "Outlayr - Bank Notifications",
            pt: "Outlayr - Bank Notifications",
        }),
        "settings.wallet.bankStep1": t({
            en: "Add Shortcut",
            es: "Agregar atajo",
            "es-ES": "Añadir atajo",
            pt: "Adicionar Atalho",
        }),
        "settings.wallet.bankStep2": t({
            en: "Tap App, pick your banks",
            es: "Toca App y elige tus bancos",
            pt: "Toque em App e escolha seus bancos",
        }),
        "settings.wallet.bankStep3": t({
            en: "Turn it on in Automation",
            es: "Actívala en Automatización",
            pt: "Ative em Automação",
        }),
        "settings.wallet.cardsFooter": t({
            en: "Each card you pay with and each bank app that notifies you shows up here. Its purchases go to the account you choose.",
            es: "Cada tarjeta con la que pagas y cada app de banco que te notifica aparece aquí. Sus compras van a la cuenta que elijas.",
            pt: "Cada cartão com que você paga e cada app de banco que te notifica aparece aqui. As compras vão para a conta que você escolher.",
        }),
        "settings.wallet.cardsSection": t({
            en: "Cards and apps",
            es: "Tarjetas y apps",
            pt: "Cartões e apps",
        }),
        "settings.wallet.chooseAccount": t({
            en: "Choose an account",
            es: "Elige una cuenta",
            pt: "Escolha uma conta",
        }),
        "settings.wallet.get": t({
            en: "Get the shortcut",
            es: "Obtener el atajo",
            pt: "Obter o atalho",
        }),
        "settings.wallet.getAgain": t({
            en: "Get the shortcut again",
            es: "Obtener el atajo de nuevo",
            pt: "Obter o atalho de novo",
        }),
        "settings.wallet.getDetail": t({
            en: "Installs the whole automation with one tap. Then turn it on.",
            es: "Instala la automatización completa con un toque. Luego actívala.",
            pt: "Instala a automação inteira com um toque. Depois é só ativar.",
        }),
        "settings.wallet.hide": t({
            en: "Hide",
            es: "Ocultar",
            pt: "Ocultar",
        }),
        "settings.wallet.lastNotification": t({
            en: "Last notification",
            es: "Última notificación",
            pt: "Última notificação",
        }),
        "settings.wallet.lastSection": t({
            en: "Last logged",
            es: "Último registro",
            pt: "Último lançamento",
        }),
        "settings.wallet.lastTap": t({
            en: "Last used {when}",
            es: "Último uso {when}",
            pt: "Último uso em {when}",
        }),
        "settings.wallet.lead": t({
            en: "Every card tap lands on the Log, filed under the account it matches.",
            es: "Cada pago con tarjeta llega al registro, en la cuenta que coincida.",
            pt: "Cada pagamento por aproximação vai para Lançamentos, na conta que corresponder.",
        }),
        "settings.wallet.manualStep1": t({
            en: "Next, then New Blank Automation",
            es: "Siguiente, luego Nueva automatización en blanco",
            pt: "Seguinte, depois Nova Automação em Branco",
        }),
        "settings.wallet.manualStep2": t({
            en: "Add Action, search Outlayr",
            es: "Agregar acción, busca Outlayr",
            "es-ES": "Añadir acción, busca Outlayr",
            pt: "Adicionar Ação, busque Outlayr",
        }),
        "settings.wallet.manualStep2Detail": t({
            en: "Pick Log a Wallet Transaction",
            es: "Elige Log a Wallet Transaction",
            pt: "Escolha Log a Wallet Transaction",
        }),
        "settings.wallet.manualStep3": t({
            en: "Fill Amount, Merchant and Card",
            es: "Completa Amount, Merchant y Card",
            pt: "Preencha Amount, Merchant e Card",
        }),
        "settings.wallet.manualStep3Detail": t({
            en: "Tap each, choose Shortcut Input, then the matching field",
            es: "Toca cada uno, elige Entrada de atajo y luego el campo que corresponde",
            pt: "Toque em cada um, escolha Entrada do Atalho e depois o campo correspondente",
        }),
        "settings.wallet.manualStep3Detail27": t({
            en: "Tap each, pick the Wallet variable above the keyboard, then the matching field",
            es: "Toca cada uno, elige la variable de Wallet sobre el teclado y luego el campo que corresponde",
            "es-ES": "Toca cada uno, elige la variable de Cartera sobre el teclado y luego el campo que corresponde",
            pt: "Toque em cada um, escolha a variável Carteira acima do teclado e depois o campo correspondente",
        }),
        "settings.wallet.noCards": t({
            en: "No cards yet",
            es: "Aún no hay tarjetas",
            pt: "Nenhum cartão ainda",
        }),
        "settings.wallet.noSources": t({
            en: "Pay with Google Wallet or wait for a purchase notification from your bank.",
            es: "Paga con Google Wallet o espera una notificación de compra de tu banco.",
            pt: "Pague com o Google Wallet ou espere uma notificação de compra do seu banco.",
        }),
        "settings.wallet.nothingLogged": t({
            en: "Nothing logged yet",
            es: "Nada registrado aún",
            pt: "Nada registrado ainda",
        }),
        "settings.wallet.nothingYet": t({
            en: "Nothing yet",
            es: "Nada aún",
            pt: "Nada ainda",
        }),
        "settings.wallet.notificationUnread": t({
            en: "Couldn't read it",
            es: "No se pudo leer",
            pt: "Não foi possível ler",
        }),
        "settings.wallet.open": t({
            en: "Open Shortcuts",
            es: "Abrir Atajos",
            pt: "Abrir Atalhos",
        }),
        "settings.wallet.pushChannel": t({
            en: "Logged purchases",
            es: "Compras registradas",
            pt: "Compras registradas",
        }),
        "settings.wallet.pushNewPlace": t({
            en: "New place, tap to pick a category.",
            es: "Lugar nuevo, toca para elegir una categoría.",
            pt: "Lugar novo, toque para escolher uma categoria.",
        }),
        "settings.wallet.pushWhichAccount": t({
            en: "Which account is {card}? Tap to pick.",
            es: "¿Qué cuenta es {card}? Toca para elegirla.",
            pt: "Qual conta é {card}? Toque para escolher.",
        }),
        "settings.wallet.ranAt": t({
            en: "The automation ran {when}",
            es: "La automatización se ejecutó {when}",
            pt: "A automação foi executada em {when}",
        }),
        "settings.wallet.setupSection": t({
            en: "Setup",
            es: "Configuración",
            pt: "Configuração",
        }),
        "settings.wallet.shortcutName": t({
            en: "Outlayr - Apple Pay",
            es: "Outlayr - Apple Pay",
            pt: "Outlayr - Apple Pay",
        }),
        "settings.wallet.show": t({
            en: "Show",
            es: "Ver",
            pt: "Mostrar",
        }),
        "settings.wallet.sourcesFooter": t({
            en: "Apps that notified you of an amount show up here.",
            es: "Aparecen las apps que te notificaron un monto.",
            "es-ES": "Aparecen las apps que te han notificado un importe.",
            pt: "Aqui aparecem os apps que te notificaram um valor.",
        }),
        "settings.wallet.sourcesSection": t({
            en: "Log from",
            es: "Registrar desde",
            pt: "Registrar de",
        }),
        "settings.wallet.step1": t({
            en: "Automation, then +",
            es: "Automatización, luego +",
            pt: "Automação, depois +",
        }),
        "settings.wallet.step2": t({
            en: "Choose Wallet",
            es: "Elige Wallet",
            "es-ES": "Elige Cartera",
            pt: "Escolha Carteira",
        }),
        "settings.wallet.step2Detail": t({
            en: "Called Transaction before iOS 26",
            es: "Se llama Transacción antes de iOS 26",
            pt: "Chamado Transação antes do iOS 26",
        }),
        "settings.wallet.step3": t({
            en: "Pick your cards",
            es: "Elige tus tarjetas",
            pt: "Escolha seus cartões",
        }),
        "settings.wallet.step3Detail": t({
            en: "Run Immediately on, Notify When Run off",
            es: "Ejecutar de inmediato activado, Notificar al ejecutar desactivado",
            "es-ES": "Ejecutar inmediatamente activado, Notificar cuando se ejecute desactivado",
            pt: "Executar Imediatamente ativado, Notificar Quando Executar desativado",
        }),
        "settings.wallet.step5": t({
            en: "Done",
            es: "Listo",
            "es-ES": "OK",
            pt: "OK",
        }),
        "settings.wallet.stepsSection": t({
            en: "Turn it on in Shortcuts",
            es: "Actívalo en Atajos",
            pt: "Ative no app Atalhos",
        }),
        "settings.wallet.tryIt": t({
            en: "Tap a card to try it",
            es: "Paga con una tarjeta para probarlo",
            pt: "Aproxime um cartão para testar",
        }),
        "settings.wallet.unattached": t({
            en: "No account",
            es: "Sin cuenta",
            pt: "Sem conta",
        }),
        "settings.wallet.v27Manual1": t({
            en: "New shortcut, then search Automation",
            es: "Nuevo atajo, luego busca Automatización",
            pt: "Novo atalho, depois busque Automação",
        }),
        "settings.wallet.v27Manual2": t({
            en: "Pick Wallet",
            es: "Elige Wallet",
            "es-ES": "Elige Cartera",
            pt: "Escolha Carteira",
        }),
        "settings.wallet.v27Manual2Detail": t({
            en: "Any Card is fine. Automation is already on and Notify off.",
            es: "Cualquier tarjeta sirve. Automatización ya viene activada y Notificar desactivado.",
            pt: "Qualquer Cartão serve. Automação já vem ativada e Notificar desativado.",
        }),
        "settings.wallet.v27Step1": t({
            en: "Library, then Automation",
            es: "Biblioteca, luego Automatización",
            pt: "Biblioteca, depois Automação",
        }),
        "settings.wallet.v27Step1Detail": t({
            en: "A shared automation arrives turned off",
            es: "Una automatización compartida llega desactivada",
            pt: "Uma automação compartilhada chega desativada",
        }),
        "settings.wallet.v27Step2": t({
            en: "Turn on Outlayr - Apple Pay",
            es: "Activa Outlayr - Apple Pay",
            pt: "Ative Outlayr - Apple Pay",
        }),
    },
    key: "settings-wallet" as const,
} satisfies Dictionary;

export default settingsWallet;
