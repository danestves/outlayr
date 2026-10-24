import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settings = {
    content: {
        "settings.about.copyright": t({
            en: "Copyright © 2022-2023 Rafael Soh and Dime contributors. Modifications copyright © 2026 Daniel Esteves.",
            es: "Copyright © 2022-2023 Rafael Soh y colaboradores de Dime. Modificaciones copyright © 2026 Daniel Esteves.",
        }),
        "settings.about.dimeRepo": t({
            en: "Dime (original project)",
            es: "Dime (proyecto original)",
        }),
        "settings.about.fork": t({
            en: "Outlayr is a modified version of Dime, forked in 2026 and changed since.",
            es: "Outlayr es una versión modificada de Dime: nació como fork en 2026 y ha cambiado desde entonces.",
        }),
        "settings.about.gplLink": t({
            en: "GPL-3.0 License",
            es: "Licencia GPL-3.0",
        }),
        "settings.about.intro": t({
            en: "Outlayr is open source and free forever. It is built on the foundation of Dime, a beautiful expense tracker created by Rafael Soh, and is distributed under the GNU General Public License v3.0.",
            es: "Outlayr es de código abierto y gratuito para siempre. Está basado en Dime, una hermosa app de gastos creada por Rafael Soh, y se distribuye bajo la GNU General Public License v3.0.",
        }),
        "settings.about.licenceHeading": t({
            en: "Licence",
            es: "Licencia",
        }),
        "settings.about.links": t({
            en: "Links",
            es: "Enlaces",
        }),
        "settings.about.logoDev": t({
            en: "Logos provided by Logo.dev",
            es: "Logos proporcionados por Logo.dev",
        }),
        "settings.about.openSourceLicenses": t({
            en: "Open source licenses",
            es: "Licencias de código abierto",
        }),
        "settings.about.outlayr": t({
            en: "Outlayr",
            es: "Outlayr",
        }),
        "settings.about.outlayrRepo": t({
            en: "Outlayr on GitHub",
            es: "Outlayr en GitHub",
        }),
        "settings.about.version": t({
            en: "Version {version}",
            es: "Versión {version}",
        }),
        "settings.about.warranty": t({
            en: "Outlayr comes with ABSOLUTELY NO WARRANTY, to the extent permitted by law. You may redistribute it under the terms of the GNU General Public License v3.0.",
            es: "Outlayr se distribuye SIN NINGUNA GARANTÍA, en la medida permitida por la ley. Puedes redistribuirlo bajo los términos de la GNU General Public License v3.0.",
        }),
        "settings.appIcon.alertNote": t({
            en: "iOS confirms every change with an alert of its own.",
            es: "iOS confirma cada cambio con su propia alerta.",
        }),
        "settings.appIcon.failedBody": t({
            en: "iOS refused the change. Your home screen still shows the icon marked here.",
            es: "iOS rechazó el cambio. Tu pantalla de inicio sigue mostrando el ícono marcado aquí.",
        }),
        "settings.appIcon.failedTitle": t({
            en: "Icon unchanged",
            es: "El ícono no cambió",
        }),
        "settings.appIcon.section": t({
            en: "Home screen",
            es: "Pantalla de inicio",
        }),
        "settings.appIcon.unsupported": t({
            en: "This device does not allow the app icon to be changed.",
            es: "Este dispositivo no permite cambiar el ícono de la app.",
        }),
        "settings.colorScheme.dark": t({
            en: "Dark",
            es: "Oscuro",
        }),
        "settings.colorScheme.darkDetail": t({
            en: "Always dark, whatever the device does.",
            es: "Siempre oscuro, sin importar tu dispositivo.",
        }),
        "settings.colorScheme.light": t({
            en: "Light",
            es: "Claro",
        }),
        "settings.colorScheme.lightDetail": t({
            en: "Always light, whatever the device does.",
            es: "Siempre claro, sin importar tu dispositivo.",
        }),
        "settings.colorScheme.system": t({
            en: "System",
            es: "Sistema",
        }),
        "settings.colorScheme.systemDetail": t({
            en: "Follows your device.",
            es: "Igual que tu dispositivo.",
        }),
        "settings.currency.all": t({
            en: "All currencies",
            es: "Todas las monedas",
        }),
        "settings.currency.favourite": t({
            en: "Add {code} to favourites",
            es: "Agregar {code} a favoritas",
        }),
        "settings.currency.favouriteAction": t({
            en: "Favourite",
            es: "Favorita",
        }),
        "settings.currency.favouriteFailedBody": t({
            en: "Your favourites were not changed.",
            es: "Tus favoritas no se cambiaron.",
        }),
        "settings.currency.favouriteFailedTitle": t({
            en: "Couldn't save that",
            es: "No se pudo guardar",
        }),
        "settings.currency.favourites": t({
            en: "Favourites",
            es: "Favoritas",
        }),
        "settings.currency.favouritesFull": t({
            en: "Favourites full ({limit})",
            es: "Favoritas al límite ({limit})",
        }),
        "settings.currency.favouritesFullBody": t({
            en: "Remove one to make room.",
            es: "Quita una para hacer espacio.",
        }),
        "settings.currency.favouritesFullShort": t({
            en: "Full ({limit})",
            es: "Al límite ({limit})",
        }),
        "settings.currency.favouritesHint": t({
            en: "Hold a currency to keep it here.",
            es: "Mantén presionada una moneda para guardarla aquí.",
        }),
        "settings.currency.search": t({
            en: "Search currencies",
            es: "Buscar monedas",
        }),
        "settings.currency.unfavourite": t({
            en: "Remove {code} from favourites",
            es: "Quitar {code} de favoritas",
        }),
        "settings.currency.unfavouriteAction": t({
            en: "Unfavourite",
            es: "Quitar",
        }),
        "settings.currency.use": t({
            en: "Use {code}",
            es: "Usar {code}",
        }),
        "settings.haptics.excessive": t({
            en: "Excessive",
            es: "Excesiva",
        }),
        "settings.haptics.none": t({
            en: "None",
            es: "Ninguna",
        }),
        "settings.haptics.subtle": t({
            en: "Subtle",
            es: "Suave",
        }),
        "settings.lock.alertTitle": t({
            en: "Authentication",
            es: "Autenticación",
        }),
        "settings.lock.promptOff": t({
            en: "Turn off authentication",
            es: "Desactivar la autenticación",
        }),
        "settings.lock.promptOn": t({
            en: "Turn on authentication",
            es: "Activar la autenticación",
        }),
        "settings.numberEntry.type1": t({
            en: "Cents last",
            es: "Centavos al final",
        }),
        "settings.numberEntry.type2": t({
            en: "Decimal point",
            es: "Punto decimal",
        }),
        "settings.row.about": t({
            en: "About and credits",
            es: "Acerca de y créditos",
        }),
        "settings.row.accounts": t({
            en: "Accounts",
            es: "Cuentas",
        }),
        "settings.row.animatedCharts": t({
            en: "Animated charts",
            es: "Gráficos animados",
        }),
        "settings.row.appIcon": t({
            en: "App icon",
            es: "Ícono de la app",
        }),
        "settings.row.authentication": t({
            en: "Authentication",
            es: "Autenticación",
        }),
        "settings.row.autoLog": t({
            en: "Auto-logging",
            es: "Registro automático",
        }),
        "settings.row.categories": t({
            en: "Categories",
            es: "Categorías",
        }),
        "settings.row.colorScheme": t({
            en: "Color scheme",
            es: "Esquema de color",
        }),
        "settings.row.contactSupport": t({
            en: "Contact support",
            es: "Contactar soporte",
        }),
        "settings.row.currency": t({
            en: "Currency",
            es: "Moneda",
        }),
        "settings.row.deleted": t({
            en: "Recently deleted",
            es: "Eliminados recientemente",
        }),
        "settings.row.displayCents": t({
            en: "Show cents",
            es: "Mostrar centavos",
        }),
        "settings.row.erase": t({
            en: "Erase data",
            es: "Borrar datos",
        }),
        "settings.row.export": t({
            en: "Export data",
            es: "Exportar datos",
        }),
        "settings.row.featureLab": t({
            en: "Feature lab",
            es: "Laboratorio de funciones",
        }),
        "settings.row.followX": t({
            en: "Follow Outlayr on X",
            es: "Sigue a Outlayr en X",
        }),
        "settings.row.haptics": t({
            en: "Haptics",
            es: "Vibración",
        }),
        "settings.row.import": t({
            en: "Import data",
            es: "Importar datos",
        }),
        "settings.row.incomeTracking": t({
            en: "Income tracking",
            es: "Seguimiento de ingresos",
        }),
        "settings.row.language": t({
            en: "Language (iOS)",
            es: "Idioma (iOS)",
        }),
        "settings.row.language.android": t({
            en: "Language",
            es: "Idioma",
        }),
        "settings.row.notifications": t({
            en: "Notifications",
            es: "Notificaciones",
        }),
        "settings.row.numberEntry": t({
            en: "Number entry",
            es: "Escritura de montos",
        }),
        "settings.row.privacy": t({
            en: "Privacy policy",
            es: "Política de privacidad",
        }),
        "settings.row.rate": t({
            en: "Rate on the App Store",
            es: "Califícanos en el App Store",
        }),
        "settings.row.rate.android": t({
            en: "Rate on Google Play",
            es: "Califícanos en Google Play",
        }),
        "settings.row.restore": t({
            en: "Restore data",
            es: "Restaurar datos",
        }),
        "settings.row.sendToAi": t({
            en: "Send data to AI providers",
            es: "Enviar datos a proveedores de IA",
        }),
        "settings.row.share": t({
            en: "Share Outlayr",
            es: "Compartir Outlayr",
        }),
        "settings.row.shareAnalytics": t({
            en: "Share analytics",
            es: "Compartir analíticas",
        }),
        "settings.row.sync": t({
            en: "Sync",
            es: "Sincronización",
        }),
        "settings.row.terms": t({
            en: "Terms of use",
            es: "Términos de uso",
        }),
        "settings.row.theme": t({
            en: "Accent",
            es: "Acento",
        }),
        "settings.row.timeFrames": t({
            en: "Time frames",
            es: "Períodos de tiempo",
        }),
        "settings.row.upcoming": t({
            en: "Upcoming entries",
            es: "Próximos registros",
        }),
        "settings.row.wallet": t({
            en: "Apple Pay",
            es: "Apple Pay",
        }),
        "settings.screenTitle": t({
            en: "Settings",
            es: "Configuración",
        }),
        "settings.section.about": t({
            en: "About",
            es: "Acerca de",
        }),
        "settings.section.account": t({
            en: "Account",
            es: "Cuenta",
        }),
        "settings.section.appearance": t({
            en: "Appearance",
            es: "Apariencia",
        }),
        "settings.section.data": t({
            en: "Data",
            es: "Datos",
        }),
        "settings.section.device": t({
            en: "Device",
            es: "Dispositivo",
        }),
        "settings.section.ledger": t({
            en: "Ledger",
            es: "Registro",
        }),
        "settings.section.money": t({
            en: "Money",
            es: "Dinero",
        }),
        "settings.share.message": t({
            en: "Track your money with Outlayr. {url}",
            es: "Controla tu dinero con Outlayr: {url}",
        }),
        "settings.support.subject": t({
            en: "Outlayr feedback",
            es: "Comentarios sobre Outlayr",
        }),
        "settings.theme.ochre": t({
            en: "Ochre",
            es: "Ocre",
        }),
        "settings.theme.pine": t({
            en: "Pine",
            es: "Pino",
        }),
        "settings.theme.plum": t({
            en: "Plum",
            es: "Ciruela",
        }),
        "settings.theme.prussian": t({
            en: "Prussian",
            es: "Azul de Prusia",
        }),
        "settings.theme.vermilion": t({
            en: "Vermilion",
            es: "Bermellón",
        }),
        "settings.theme.wallpaper": t({
            en: "Wallpaper",
            es: "Fondo de pantalla",
        }),
        "settings.time.dayOfMonth": t({
            en: "{day} of month",
            es: "día {day} del mes",
        }),
        "settings.time.monday": t({
            en: "Monday",
            es: "Lunes",
        }),
        "settings.time.monthSection": t({
            en: "Start of month",
            es: "Inicio del mes",
        }),
        "settings.time.reopenNote": t({
            en: "Close and reopen the app for the month start to take full effect.",
            es: "Cierra y vuelve a abrir la app para que el nuevo inicio de mes se aplique por completo.",
        }),
        "settings.time.startsSection": t({
            en: "Starts on",
            es: "Empieza en",
        }),
        "settings.time.sunday": t({
            en: "Sunday",
            es: "Domingo",
        }),
        "settings.time.weekSection": t({
            en: "Start of week",
            es: "Inicio de la semana",
        }),
        "settings.upcoming.displayOnLog": t({
            en: "Show on the Log",
            es: "Mostrar en el registro",
        }),
        "settings.upcoming.empty": t({
            en: "Nothing is scheduled ahead of today.",
            es: "No hay nada programado después de hoy.",
        }),
        "settings.upcoming.footer": t({
            en: "Transactions dated in the future sit at the top of the Log, above today. Hiding them there never hides them here.",
            es: "Las transacciones con fecha futura aparecen al inicio del registro, encima de hoy. Ocultarlas ahí nunca las oculta aquí.",
        }),
        "settings.upcoming.limitToSoon": t({
            en: "Limit to 14-Day Outlook",
            es: "Limitar a 14 días",
        }),
        "settings.upcoming.section": t({
            en: "On the Log",
            es: "En el registro",
        }),
    },
    key: "settings" as const,
} satisfies Dictionary;

export default settings;
