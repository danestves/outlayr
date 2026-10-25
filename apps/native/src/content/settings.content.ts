import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settings = {
    content: {
        "settings.about.copyright": t({
            en: "Copyright © 2022-2023 Rafael Soh and Dime contributors. Modifications copyright © 2026 Daniel Esteves.",
            es: "Copyright © 2022-2023 Rafael Soh y colaboradores de Dime. Modificaciones copyright © 2026 Daniel Esteves.",
            pt: "Copyright © 2022-2023 Rafael Soh e colaboradores do Dime. Modificações copyright © 2026 Daniel Esteves.",
        }),
        "settings.about.dimeRepo": t({
            en: "Dime (original project)",
            es: "Dime (proyecto original)",
            pt: "Dime (projeto original)",
        }),
        "settings.about.fork": t({
            en: "Outlayr is a modified version of Dime, forked in 2026 and changed since.",
            es: "Outlayr es una versión modificada de Dime: nació como fork en 2026 y ha cambiado desde entonces.",
            pt: "O Outlayr é uma versão modificada do Dime: nasceu como fork em 2026 e mudou desde então.",
        }),
        "settings.about.gplLink": t({
            en: "GPL-3.0 License",
            es: "Licencia GPL-3.0",
            pt: "Licença GPL-3.0",
        }),
        "settings.about.intro": t({
            en: "Outlayr is open source and free forever. It is built on the foundation of Dime, a beautiful expense tracker created by Rafael Soh, and is distributed under the GNU General Public License v3.0.",
            es: "Outlayr es de código abierto y gratuito para siempre. Está basado en Dime, una hermosa app de gastos creada por Rafael Soh, y se distribuye bajo la GNU General Public License v3.0.",
            pt: "O Outlayr é de código aberto e gratuito para sempre. É baseado no Dime, um lindo app de gastos criado por Rafael Soh, e é distribuído sob a GNU General Public License v3.0.",
        }),
        "settings.about.licenceHeading": t({
            en: "Licence",
            es: "Licencia",
            pt: "Licença",
        }),
        "settings.about.links": t({
            en: "Links",
            es: "Enlaces",
            pt: "Links",
        }),
        "settings.about.logoDev": t({
            en: "Logos provided by Logo.dev",
            es: "Logos proporcionados por Logo.dev",
            pt: "Logos fornecidos por Logo.dev",
        }),
        "settings.about.openSourceLicenses": t({
            en: "Open source licenses",
            es: "Licencias de código abierto",
            pt: "Licenças de código aberto",
        }),
        "settings.about.outlayr": t({
            en: "Outlayr",
            es: "Outlayr",
            pt: "Outlayr",
        }),
        "settings.about.outlayrRepo": t({
            en: "Outlayr on GitHub",
            es: "Outlayr en GitHub",
            pt: "Outlayr no GitHub",
        }),
        "settings.about.version": t({
            en: "Version {version}",
            es: "Versión {version}",
            pt: "Versão {version}",
        }),
        "settings.about.warranty": t({
            en: "Outlayr comes with ABSOLUTELY NO WARRANTY, to the extent permitted by law. You may redistribute it under the terms of the GNU General Public License v3.0.",
            es: "Outlayr se distribuye SIN NINGUNA GARANTÍA, en la medida permitida por la ley. Puedes redistribuirlo bajo los términos de la GNU General Public License v3.0.",
            pt: "O Outlayr vem SEM NENHUMA GARANTIA, na medida permitida pela lei. Você pode redistribuí-lo sob os termos da GNU General Public License v3.0.",
        }),
        "settings.appIcon.alertNote": t({
            en: "iOS confirms every change with an alert of its own.",
            es: "iOS confirma cada cambio con su propia alerta.",
            pt: "O iOS confirma cada mudança com um alerta próprio.",
        }),
        "settings.appIcon.failedBody": t({
            en: "iOS refused the change. Your home screen still shows the icon marked here.",
            es: "iOS rechazó el cambio. Tu pantalla de inicio sigue mostrando el ícono marcado aquí.",
            "es-ES": "iOS ha rechazado el cambio. Tu pantalla de inicio sigue mostrando el icono marcado aquí.",
            pt: "O iOS recusou a mudança. Sua tela de início continua mostrando o ícone marcado aqui.",
        }),
        "settings.appIcon.failedTitle": t({
            en: "Icon unchanged",
            es: "El ícono no cambió",
            "es-ES": "El icono no ha cambiado",
            pt: "O ícone não mudou",
        }),
        "settings.appIcon.section": t({
            en: "Home screen",
            es: "Pantalla de inicio",
            pt: "Tela de início",
        }),
        "settings.appIcon.unsupported": t({
            en: "This device does not allow the app icon to be changed.",
            es: "Este dispositivo no permite cambiar el ícono de la app.",
            "es-ES": "Este dispositivo no permite cambiar el icono de la app.",
            pt: "Este dispositivo não permite mudar o ícone do app.",
        }),
        "settings.colorScheme.dark": t({
            en: "Dark",
            es: "Oscuro",
            pt: "Escuro",
        }),
        "settings.colorScheme.darkDetail": t({
            en: "Always dark, whatever the device does.",
            es: "Siempre oscuro, sin importar tu dispositivo.",
            pt: "Sempre escuro, não importa o dispositivo.",
        }),
        "settings.colorScheme.light": t({
            en: "Light",
            es: "Claro",
            pt: "Claro",
        }),
        "settings.colorScheme.lightDetail": t({
            en: "Always light, whatever the device does.",
            es: "Siempre claro, sin importar tu dispositivo.",
            pt: "Sempre claro, não importa o dispositivo.",
        }),
        "settings.colorScheme.system": t({
            en: "System",
            es: "Sistema",
            pt: "Sistema",
        }),
        "settings.colorScheme.systemDetail": t({
            en: "Follows your device.",
            es: "Igual que tu dispositivo.",
            pt: "Segue o seu dispositivo.",
        }),
        "settings.currency.all": t({
            en: "All currencies",
            es: "Todas las monedas",
            pt: "Todas as moedas",
        }),
        "settings.currency.favourite": t({
            en: "Add {code} to favourites",
            es: "Agregar {code} a favoritas",
            "es-ES": "Añadir {code} a favoritas",
            pt: "Adicionar {code} às favoritas",
        }),
        "settings.currency.favouriteAction": t({
            en: "Favourite",
            es: "Favorita",
            pt: "Favoritar",
        }),
        "settings.currency.favouriteFailedBody": t({
            en: "Your favourites were not changed.",
            es: "Tus favoritas no se cambiaron.",
            pt: "Suas favoritas não foram alteradas.",
        }),
        "settings.currency.favouriteFailedTitle": t({
            en: "Couldn't save that",
            es: "No se pudo guardar",
            pt: "Não foi possível salvar",
        }),
        "settings.currency.favourites": t({
            en: "Favourites",
            es: "Favoritas",
            pt: "Favoritas",
        }),
        "settings.currency.favouritesFull": t({
            en: "Favourites full ({limit})",
            es: "Favoritas al límite ({limit})",
            pt: "Favoritas no limite ({limit})",
        }),
        "settings.currency.favouritesFullBody": t({
            en: "Remove one to make room.",
            es: "Quita una para hacer espacio.",
            pt: "Remova uma para abrir espaço.",
        }),
        "settings.currency.favouritesFullShort": t({
            en: "Full ({limit})",
            es: "Al límite ({limit})",
            pt: "No limite ({limit})",
        }),
        "settings.currency.favouritesHint": t({
            en: "Hold a currency to keep it here.",
            es: "Mantén presionada una moneda para guardarla aquí.",
            "es-ES": "Mantén pulsada una moneda para guardarla aquí.",
            pt: "Toque e segure uma moeda para mantê-la aqui.",
        }),
        "settings.currency.search": t({
            en: "Search currencies",
            es: "Buscar monedas",
            pt: "Buscar moedas",
        }),
        "settings.currency.unfavourite": t({
            en: "Remove {code} from favourites",
            es: "Quitar {code} de favoritas",
            pt: "Remover {code} das favoritas",
        }),
        "settings.currency.unfavouriteAction": t({
            en: "Unfavourite",
            es: "Quitar",
            pt: "Remover",
        }),
        "settings.currency.use": t({
            en: "Use {code}",
            es: "Usar {code}",
            pt: "Usar {code}",
        }),
        "settings.haptics.excessive": t({
            en: "Excessive",
            es: "Excesiva",
            pt: "Excessiva",
        }),
        "settings.haptics.none": t({
            en: "None",
            es: "Ninguna",
            pt: "Nenhuma",
        }),
        "settings.haptics.subtle": t({
            en: "Subtle",
            es: "Suave",
            pt: "Suave",
        }),
        "settings.lock.alertTitle": t({
            en: "Authentication",
            es: "Autenticación",
            pt: "Autenticação",
        }),
        "settings.lock.promptOff": t({
            en: "Turn off authentication",
            es: "Desactivar la autenticación",
            pt: "Desativar a autenticação",
        }),
        "settings.lock.promptOn": t({
            en: "Turn on authentication",
            es: "Activar la autenticación",
            pt: "Ativar a autenticação",
        }),
        "settings.numberEntry.type1": t({
            en: "Cents last",
            es: "Centavos al final",
            "es-ES": "Céntimos al final",
            pt: "Centavos no final",
        }),
        "settings.numberEntry.type2": t({
            en: "Decimal point",
            es: "Punto decimal",
            pt: "Separador decimal",
        }),
        "settings.row.about": t({
            en: "About and credits",
            es: "Acerca de y créditos",
            pt: "Sobre e créditos",
        }),
        "settings.row.accounts": t({
            en: "Accounts",
            es: "Cuentas",
            pt: "Contas",
        }),
        "settings.row.animatedCharts": t({
            en: "Animated charts",
            es: "Gráficos animados",
            pt: "Gráficos animados",
        }),
        "settings.row.appIcon": t({
            en: "App icon",
            es: "Ícono de la app",
            "es-ES": "Icono de la app",
            pt: "Ícone do app",
        }),
        "settings.row.authentication": t({
            en: "Authentication",
            es: "Autenticación",
            pt: "Autenticação",
        }),
        "settings.row.categories": t({
            en: "Categories",
            es: "Categorías",
            pt: "Categorias",
        }),
        "settings.row.colorScheme": t({
            en: "Color scheme",
            es: "Esquema de color",
            pt: "Esquema de cores",
        }),
        "settings.row.contactSupport": t({
            en: "Contact support",
            es: "Contactar soporte",
            pt: "Falar com o suporte",
        }),
        "settings.row.currency": t({
            en: "Currency",
            es: "Moneda",
            pt: "Moeda",
        }),
        "settings.row.deleted": t({
            en: "Recently deleted",
            es: "Eliminados recientemente",
            pt: "Apagados recentemente",
        }),
        "settings.row.displayCents": t({
            en: "Show cents",
            es: "Mostrar centavos",
            "es-ES": "Mostrar céntimos",
            pt: "Mostrar centavos",
        }),
        "settings.row.erase": t({
            en: "Erase data",
            es: "Borrar datos",
            pt: "Apagar dados",
        }),
        "settings.row.export": t({
            en: "Export data",
            es: "Exportar datos",
            pt: "Exportar dados",
        }),
        "settings.row.featureLab": t({
            en: "Feature lab",
            es: "Laboratorio de funciones",
            pt: "Laboratório de recursos",
        }),
        "settings.row.followX": t({
            en: "Follow Outlayr on X",
            es: "Sigue a Outlayr en X",
            pt: "Siga o Outlayr no X",
        }),
        "settings.row.haptics": t({
            en: "Haptics",
            es: "Vibración",
            pt: "Vibração",
        }),
        "settings.row.import": t({
            en: "Import data",
            es: "Importar datos",
            pt: "Importar dados",
        }),
        "settings.row.incomeTracking": t({
            en: "Income tracking",
            es: "Seguimiento de ingresos",
            pt: "Controle de receitas",
        }),
        "settings.row.integrations": t({
            en: "Integrations",
            es: "Integraciones",
            pt: "Integrações",
        }),
        "settings.row.language": t({
            en: "Language (iOS)",
            es: "Idioma (iOS)",
            pt: "Idioma (iOS)",
        }),
        "settings.row.language.android": t({
            en: "Language",
            es: "Idioma",
            pt: "Idioma",
        }),
        "settings.row.notifications": t({
            en: "Notifications",
            es: "Notificaciones",
            pt: "Notificações",
        }),
        "settings.row.numberEntry": t({
            en: "Number entry",
            es: "Escritura de montos",
            "es-ES": "Escritura de importes",
            pt: "Digitação de valores",
        }),
        "settings.row.privacy": t({
            en: "Privacy policy",
            es: "Política de privacidad",
            pt: "Política de privacidade",
        }),
        "settings.row.rate": t({
            en: "Rate on the App Store",
            es: "Califícanos en el App Store",
            "es-ES": "Valóranos en el App Store",
            pt: "Avalie na App Store",
        }),
        "settings.row.rate.android": t({
            en: "Rate on Google Play",
            es: "Califícanos en Google Play",
            "es-ES": "Valóranos en Google Play",
            pt: "Avalie no Google Play",
        }),
        "settings.row.restore": t({
            en: "Restore data",
            es: "Restaurar datos",
            pt: "Restaurar dados",
        }),
        "settings.row.sendToAi": t({
            en: "Send data to AI providers",
            es: "Enviar datos a proveedores de IA",
            pt: "Enviar dados a provedores de IA",
        }),
        "settings.row.share": t({
            en: "Share Outlayr",
            es: "Compartir Outlayr",
            pt: "Compartilhar o Outlayr",
        }),
        "settings.row.shareAnalytics": t({
            en: "Share analytics",
            es: "Compartir analíticas",
            pt: "Compartilhar análises",
        }),
        "settings.row.sync": t({
            en: "Sync",
            es: "Sincronización",
            pt: "Sincronização",
        }),
        "settings.row.terms": t({
            en: "Terms of use",
            es: "Términos de uso",
            pt: "Termos de uso",
        }),
        "settings.row.theme": t({
            en: "Accent",
            es: "Acento",
            pt: "Cor de destaque",
        }),
        "settings.row.timeFrames": t({
            en: "Time frames",
            es: "Períodos de tiempo",
            pt: "Períodos",
        }),
        "settings.row.upcoming": t({
            en: "Upcoming entries",
            es: "Próximos registros",
            pt: "Próximos lançamentos",
        }),
        "settings.screenTitle": t({
            en: "Settings",
            es: "Configuración",
            "es-ES": "Ajustes",
            pt: "Ajustes",
        }),
        "settings.section.about": t({
            en: "About",
            es: "Acerca de",
            pt: "Sobre",
        }),
        "settings.section.account": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "settings.section.appearance": t({
            en: "Appearance",
            es: "Apariencia",
            pt: "Aparência",
        }),
        "settings.section.data": t({
            en: "Data",
            es: "Datos",
            pt: "Dados",
        }),
        "settings.section.device": t({
            en: "Device",
            es: "Dispositivo",
            pt: "Dispositivo",
        }),
        "settings.section.ledger": t({
            en: "Ledger",
            es: "Registro",
            pt: "Lançamentos",
        }),
        "settings.section.money": t({
            en: "Money",
            es: "Dinero",
            pt: "Dinheiro",
        }),
        "settings.share.message": t({
            en: "Track your money with Outlayr. {url}",
            es: "Controla tu dinero con Outlayr: {url}",
            pt: "Controle seu dinheiro com o Outlayr: {url}",
        }),
        "settings.support.subject": t({
            en: "Outlayr feedback",
            es: "Comentarios sobre Outlayr",
            pt: "Feedback sobre o Outlayr",
        }),
        "settings.theme.ochre": t({
            en: "Ochre",
            es: "Ocre",
            pt: "Ocre",
        }),
        "settings.theme.pine": t({
            en: "Pine",
            es: "Pino",
            pt: "Pinho",
        }),
        "settings.theme.plum": t({
            en: "Plum",
            es: "Ciruela",
            pt: "Ameixa",
        }),
        "settings.theme.prussian": t({
            en: "Prussian",
            es: "Azul de Prusia",
            pt: "Azul da Prússia",
        }),
        "settings.theme.vermilion": t({
            en: "Vermilion",
            es: "Bermellón",
            pt: "Vermelhão",
        }),
        "settings.theme.wallpaper": t({
            en: "Wallpaper",
            es: "Fondo de pantalla",
            pt: "Papel de parede",
        }),
        "settings.time.dayOfMonth": t({
            en: "{day} of month",
            es: "día {day} del mes",
            pt: "dia {day} do mês",
        }),
        "settings.time.monday": t({
            en: "Monday",
            es: "Lunes",
            pt: "Segunda-feira",
        }),
        "settings.time.monthSection": t({
            en: "Start of month",
            es: "Inicio del mes",
            pt: "Início do mês",
        }),
        "settings.time.reopenNote": t({
            en: "Close and reopen the app for the month start to take full effect.",
            es: "Cierra y vuelve a abrir la app para que el nuevo inicio de mes se aplique por completo.",
            pt: "Feche e abra o app de novo para que o novo início do mês valha por completo.",
        }),
        "settings.time.startsSection": t({
            en: "Starts on",
            es: "Empieza en",
            pt: "Começa em",
        }),
        "settings.time.sunday": t({
            en: "Sunday",
            es: "Domingo",
            pt: "Domingo",
        }),
        "settings.time.weekSection": t({
            en: "Start of week",
            es: "Inicio de la semana",
            pt: "Início da semana",
        }),
        "settings.upcoming.displayOnLog": t({
            en: "Show on the Log",
            es: "Mostrar en el registro",
            pt: "Mostrar em Lançamentos",
        }),
        "settings.upcoming.empty": t({
            en: "Nothing is scheduled ahead of today.",
            es: "No hay nada programado después de hoy.",
            pt: "Nada programado depois de hoje.",
        }),
        "settings.upcoming.footer": t({
            en: "Transactions dated in the future sit at the top of the Log, above today. Hiding them there never hides them here.",
            es: "Las transacciones con fecha futura aparecen al inicio del registro, encima de hoy. Ocultarlas ahí nunca las oculta aquí.",
            pt: "Os lançamentos com data futura ficam no topo da aba Lançamentos, acima de hoje. Ocultá-los lá nunca os oculta aqui.",
        }),
        "settings.upcoming.limitToSoon": t({
            en: "Limit to 14-Day Outlook",
            es: "Limitar a 14 días",
            pt: "Limitar a 14 dias",
        }),
        "settings.upcoming.section": t({
            en: "On the Log",
            es: "En el registro",
            pt: "Em Lançamentos",
        }),
    },
    key: "settings" as const,
} satisfies Dictionary;

export default settings;
