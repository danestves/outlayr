import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const domain = {
    // oxlint-disable-next-line sort-keys -- the `dates.month.N` keys run in calendar order; sorting them alphabetically puts month 10 before month 9
    content: {
        "appIcon.default.detail": t({
            en: "The Outlayr mark on paper. The icon the app ships with.",
            es: "La marca de Outlayr sobre papel. El ícono con el que viene la app.",
        }),
        "appIcon.default.detailDev": t({
            en: "The blueprint mark. The icon this development build ships with.",
            es: "La marca como plano técnico. El ícono de esta compilación de desarrollo.",
        }),
        "appIcon.default.label": t({
            en: "Default",
            es: "Predeterminado",
        }),
        "appIcon.emboss.detail": t({
            en: "Paper on paper. The mark reads only in its shadow.",
            es: "Papel sobre papel. La marca solo se lee por su sombra.",
        }),
        "appIcon.emboss.label": t({
            en: "Emboss",
            es: "Relieve",
        }),
        "appIcon.hairline.detail": t({
            en: "Outline only, drawn in a single ink hairline.",
            es: "Solo el contorno, trazado en una línea de tinta.",
        }),
        "appIcon.hairline.label": t({
            en: "Hairline",
            es: "Contorno",
        }),
        "appIcon.ink.detail": t({
            en: "The mark inverted — paper on ink, for darker home screens.",
            es: "La marca invertida: papel sobre tinta, para pantallas de inicio más oscuras.",
        }),
        "appIcon.ink.label": t({
            en: "Ink",
            es: "Tinta",
        }),
        "appIcon.mono.detail": t({
            en: "A flat grey field with the ink mark. Quiet and neutral.",
            es: "Un campo gris plano con la marca en tinta. Discreto y neutral.",
        }),
        "appIcon.mono.label": t({
            en: "Mono",
            es: "Mono",
        }),
        "budgetTime.daysLeft": t({
            en: "{count}d left",
            es: "quedan {count}d",
        }),
        "budgetTime.hoursLeft": t({
            en: "{count}h left",
            es: "quedan {count}h",
        }),
        "clock.deviceNote": t({
            en: "Starts on whatever your device uses; changing it here takes over.",
            es: "Usa la configuración de tu dispositivo hasta que la cambies aquí.",
        }),
        "clock.section": t({
            en: "Clock",
            es: "Reloj",
        }),
        "clock.twelveHour": t({
            en: "12-hour",
            es: "12 horas",
        }),
        "clock.twentyFourHour": t({
            en: "24-hour",
            es: "24 horas",
        }),
        "coverage.pending": t({
            en: "Rates are still catching up: {count} of {total} entries are counted at the amount they were logged in.",
            es: "Las tasas se están actualizando: {count} de {total} registros se cuentan con su monto original.",
        }),
        "coverage.pendingAndPredate": t({
            en: "Rates are still catching up: {count} of {total} entries are counted at the amount they were logged in. {predate} more predate the rate history and always will be.",
            es: "Las tasas se están actualizando: {count} de {total} registros se cuentan con su monto original. Otros {predate} son anteriores al historial de tasas y así se van a quedar.",
        }),
        "coverage.predateOnly": t({
            en: "{count} of {total} entries predate the rate history, so they are counted at the amount they were logged in.",
            es: "{count} de {total} registros son anteriores al historial de tasas, así que se cuentan con su monto original.",
        }),
        "dates.meridiem.am": t({ en: "AM", es: "a. m." }),
        "dates.meridiem.pm": t({ en: "PM", es: "p. m." }),
        // Indexed by `Date.getMonth()` / `Date.getDay()`. Spanish names are lowercase by convention; shouted forms are
        // upper-cased at the call site.
        "dates.month.0": t({ en: "Jan", es: "ene" }),
        "dates.month.1": t({ en: "Feb", es: "feb" }),
        "dates.month.2": t({ en: "Mar", es: "mar" }),
        "dates.month.3": t({ en: "Apr", es: "abr" }),
        "dates.month.4": t({ en: "May", es: "may" }),
        "dates.month.5": t({ en: "Jun", es: "jun" }),
        "dates.month.6": t({ en: "Jul", es: "jul" }),
        "dates.month.7": t({ en: "Aug", es: "ago" }),
        "dates.month.8": t({ en: "Sep", es: "sep" }),
        "dates.month.9": t({ en: "Oct", es: "oct" }),
        "dates.month.10": t({ en: "Nov", es: "nov" }),
        "dates.month.11": t({ en: "Dec", es: "dic" }),
        "dates.monthLong.0": t({ en: "January", es: "enero" }),
        "dates.monthLong.1": t({ en: "February", es: "febrero" }),
        "dates.monthLong.2": t({ en: "March", es: "marzo" }),
        "dates.monthLong.3": t({ en: "April", es: "abril" }),
        "dates.monthLong.4": t({ en: "May", es: "mayo" }),
        "dates.monthLong.5": t({ en: "June", es: "junio" }),
        "dates.monthLong.6": t({ en: "July", es: "julio" }),
        "dates.monthLong.7": t({ en: "August", es: "agosto" }),
        "dates.monthLong.8": t({ en: "September", es: "septiembre" }),
        "dates.monthLong.9": t({ en: "October", es: "octubre" }),
        "dates.monthLong.10": t({ en: "November", es: "noviembre" }),
        "dates.monthLong.11": t({ en: "December", es: "diciembre" }),
        "dates.weekday.0": t({ en: "Sun", es: "dom" }),
        "dates.weekday.1": t({ en: "Mon", es: "lun" }),
        "dates.weekday.2": t({ en: "Tue", es: "mar" }),
        "dates.weekday.3": t({ en: "Wed", es: "mié" }),
        "dates.weekday.4": t({ en: "Thu", es: "jue" }),
        "dates.weekday.5": t({ en: "Fri", es: "vie" }),
        "dates.weekday.6": t({ en: "Sat", es: "sáb" }),
        // Spanish uses X for miércoles so it does not collide with martes.
        "dates.weekdayInitial.0": t({ en: "S", es: "D" }),
        "dates.weekdayInitial.1": t({ en: "M", es: "L" }),
        "dates.weekdayInitial.2": t({ en: "T", es: "M" }),
        "dates.weekdayInitial.3": t({ en: "W", es: "X" }),
        "dates.weekdayInitial.4": t({ en: "T", es: "J" }),
        "dates.weekdayInitial.5": t({ en: "F", es: "V" }),
        "dates.weekdayInitial.6": t({ en: "S", es: "S" }),
        "dates.weekdayLong.0": t({ en: "Sunday", es: "domingo" }),
        "dates.weekdayLong.1": t({ en: "Monday", es: "lunes" }),
        "dates.weekdayLong.2": t({ en: "Tuesday", es: "martes" }),
        "dates.weekdayLong.3": t({ en: "Wednesday", es: "miércoles" }),
        "dates.weekdayLong.4": t({ en: "Thursday", es: "jueves" }),
        "dates.weekdayLong.5": t({ en: "Friday", es: "viernes" }),
        "dates.weekdayLong.6": t({ en: "Saturday", es: "sábado" }),
        "daySlots.over_one": t({
            en: "One {noun} too many.",
            es: "Un gasto de más en {noun}.",
        }),
        "daySlots.over_other": t({
            en: "{count} {noun} too many.",
            es: "{count} gastos de más en {noun}.",
        }),
        "daySlots.room": t({
            en: "Room for one more.",
            es: "Alcanza para uno más.",
        }),
        "daySlots.tight": t({
            en: "Not enough for another.",
            es: "No alcanza para otro.",
        }),
        "icons.section.food": t({
            en: "Food & Drink",
            es: "Comida y bebida",
        }),
        "icons.section.health": t({
            en: "Health & Fitness",
            es: "Salud y bienestar",
        }),
        "icons.section.home": t({
            en: "Home & Utilities",
            es: "Hogar y servicios",
        }),
        "icons.section.leisure": t({
            en: "Leisure",
            es: "Ocio",
        }),
        "icons.section.life": t({
            en: "Life & Other",
            es: "Vida y otros",
        }),
        "icons.section.money": t({
            en: "Money & Work",
            es: "Dinero y trabajo",
        }),
        "icons.section.shopping": t({
            en: "Shopping",
            es: "Compras",
        }),
        "icons.section.transport": t({
            en: "Transport & Travel",
            es: "Transporte y viajes",
        }),
        "lock.failed": t({
            en: "That did not match. Try again.",
            es: "No coincidió. Inténtalo de nuevo.",
        }),
        "lock.fallback": t({
            en: "Choose Unlock again to enter your device passcode.",
            es: "Toca Desbloquear otra vez para ingresar el código de tu dispositivo.",
        }),
        "lock.lockout": t({
            en: "Too many attempts. Unlock with your device passcode instead.",
            es: "Demasiados intentos. Desbloquea con el código de tu dispositivo.",
        }),
        "lock.timeout": t({
            en: "The prompt timed out. Try again.",
            es: "Se acabó el tiempo. Inténtalo de nuevo.",
        }),
        "lock.unavailable": t({
            en: "This device has no passcode or biometrics set up.",
            es: "Este dispositivo no tiene código ni biometría configurados.",
        }),
        "lock.unknown": t({
            en: "Could not check. Try again.",
            es: "No se pudo verificar. Inténtalo de nuevo.",
        }),
        "merchantTag.AI": t({
            en: "AI",
            es: "IA",
        }),
        "merchantTag.Airline": t({
            en: "Airline",
            es: "Aerolínea",
        }),
        "merchantTag.Apparel": t({
            en: "Apparel",
            es: "Ropa",
        }),
        "merchantTag.Apple": t({
            en: "Apple",
            es: "Apple",
        }),
        "merchantTag.Audiobooks": t({
            en: "Audiobooks",
            es: "Audiolibros",
        }),
        "merchantTag.Beauty": t({
            en: "Beauty",
            es: "Belleza",
        }),
        "merchantTag.Cable": t({
            en: "Cable",
            es: "Cable",
        }),
        "merchantTag.Car Share": t({
            en: "Car Share",
            es: "Carro compartido",
        }),
        "merchantTag.Convenience": t({
            en: "Convenience",
            es: "Tienda de conveniencia",
        }),
        "merchantTag.Delivery": t({
            en: "Delivery",
            es: "A domicilio",
        }),
        "merchantTag.Design": t({
            en: "Design",
            es: "Diseño",
        }),
        "merchantTag.Development": t({
            en: "Development",
            es: "Desarrollo",
        }),
        "merchantTag.Education": t({
            en: "Education",
            es: "Educación",
        }),
        "merchantTag.Electricity": t({
            en: "Electricity",
            es: "Electricidad",
        }),
        "merchantTag.Electronics": t({
            en: "Electronics",
            es: "Electrónica",
        }),
        "merchantTag.Fast Food": t({
            en: "Fast Food",
            es: "Comida rápida",
        }),
        "merchantTag.Fitness": t({
            en: "Fitness",
            es: "Ejercicio",
        }),
        "merchantTag.Food": t({
            en: "Food",
            es: "Comida",
        }),
        "merchantTag.Furniture": t({
            en: "Furniture",
            es: "Muebles",
        }),
        "merchantTag.Gaming": t({
            en: "Gaming",
            es: "Videojuegos",
        }),
        "merchantTag.Gas": t({
            en: "Gas",
            es: "Gas",
        }),
        "merchantTag.Groceries": t({
            en: "Groceries",
            es: "Supermercado",
        }),
        "merchantTag.Home Improvement": t({
            en: "Home Improvement",
            es: "Ferretería",
        }),
        "merchantTag.Internet": t({
            en: "Internet",
            es: "Internet",
        }),
        "merchantTag.Learning": t({
            en: "Learning",
            es: "Aprendizaje",
        }),
        "merchantTag.Marketplace": t({
            en: "Marketplace",
            es: "Tienda en línea",
        }),
        "merchantTag.Micromobility": t({
            en: "Micromobility",
            es: "Micromovilidad",
        }),
        "merchantTag.Music": t({
            en: "Music",
            es: "Música",
        }),
        "merchantTag.News": t({
            en: "News",
            es: "Noticias",
        }),
        "merchantTag.Pharmacy": t({
            en: "Pharmacy",
            es: "Farmacia",
        }),
        "merchantTag.Phone": t({
            en: "Phone",
            es: "Teléfono",
        }),
        "merchantTag.Productivity": t({
            en: "Productivity",
            es: "Productividad",
        }),
        "merchantTag.Professional": t({
            en: "Professional",
            es: "Profesional",
        }),
        "merchantTag.Rideshare": t({
            en: "Rideshare",
            es: "Transporte por app",
        }),
        "merchantTag.Security": t({
            en: "Security",
            es: "Seguridad",
        }),
        "merchantTag.Sports": t({
            en: "Sports",
            es: "Deportes",
        }),
        "merchantTag.Storage": t({
            en: "Storage",
            es: "Almacenamiento",
        }),
        "merchantTag.Streaming": t({
            en: "Streaming",
            es: "Streaming",
        }),
        "merchantTag.Subscription": t({
            en: "Subscription",
            es: "Suscripción",
        }),
        "merchantTag.Transit": t({
            en: "Transit",
            es: "Transporte público",
        }),
        "merchantTag.Travel": t({
            en: "Travel",
            es: "Viajes",
        }),
        "merchantTag.Warehouse": t({
            en: "Warehouse",
            es: "Mayorista",
        }),
        "merchantTag.Waste": t({
            en: "Waste",
            es: "Basura",
        }),
        "merchantTag.Water": t({
            en: "Water",
            es: "Agua",
        }),
        "merchantTag.Wellness": t({
            en: "Wellness",
            es: "Bienestar",
        }),
        "merchantTag.Wholesale": t({
            en: "Wholesale",
            es: "Mayorista",
        }),
        "merchantTag.Writing": t({
            en: "Writing",
            es: "Escritura",
        }),
        "verdict.inLine": t({
            en: "In line with {prior}.",
            es: "Similar a {prior}.",
        }),
        "verdict.lessThan": t({
            en: "{amount} less than {prior}.",
            es: "{amount} menos que {prior}.",
        }),
        "verdict.moreThan": t({
            en: "{amount} more than {prior}.",
            es: "{amount} más que {prior}.",
        }),
        "verdict.moverAdded": t({
            en: "{name} alone added {amount}.",
            es: "Solo {name} subió {amount}.",
        }),
        "verdict.moverGaveBack": t({
            en: "{name} alone gave back {amount}.",
            es: "Solo {name} bajó {amount}.",
        }),
    },
    key: "domain" as const,
} satisfies Dictionary;

export default domain;
