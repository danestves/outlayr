import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const domain = {
    // oxlint-disable-next-line sort-keys -- the `dates.month.N` keys run in calendar order; sorting them alphabetically puts month 10 before month 9
    content: {
        "appIcon.default.detail": t({
            en: "The Outlayr mark on paper. The icon the app ships with.",
            es: "La marca de Outlayr sobre papel. El ícono con el que viene la app.",
            "es-ES": "La marca de Outlayr sobre papel. El icono con el que viene la app.",
            pt: "A marca do Outlayr sobre papel. O ícone que vem com o app.",
        }),
        "appIcon.default.detailDev": t({
            en: "The blueprint mark. The icon this development build ships with.",
            es: "La marca como plano técnico. El ícono de esta compilación de desarrollo.",
            "es-ES": "La marca como plano técnico. El icono de esta compilación de desarrollo.",
            pt: "A marca como planta técnica. O ícone desta versão de desenvolvimento.",
        }),
        "appIcon.default.label": t({
            en: "Default",
            es: "Predeterminado",
            pt: "Padrão",
        }),
        "appIcon.emboss.detail": t({
            en: "Paper on paper. The mark reads only in its shadow.",
            es: "Papel sobre papel. La marca solo se lee por su sombra.",
            pt: "Papel sobre papel. A marca só se lê pela sombra.",
        }),
        "appIcon.emboss.label": t({
            en: "Emboss",
            es: "Relieve",
            pt: "Relevo",
        }),
        "appIcon.hairline.detail": t({
            en: "Outline only, drawn in a single ink hairline.",
            es: "Solo el contorno, trazado en una línea de tinta.",
            pt: "Só o contorno, traçado em uma linha fina de tinta.",
        }),
        "appIcon.hairline.label": t({
            en: "Hairline",
            es: "Contorno",
            pt: "Contorno",
        }),
        "appIcon.ink.detail": t({
            en: "The mark inverted — paper on ink, for darker home screens.",
            es: "La marca invertida: papel sobre tinta, para pantallas de inicio más oscuras.",
            pt: "A marca invertida: papel sobre tinta, para telas de início mais escuras.",
        }),
        "appIcon.ink.label": t({
            en: "Ink",
            es: "Tinta",
            pt: "Tinta",
        }),
        "appIcon.mono.detail": t({
            en: "A flat grey field with the ink mark. Quiet and neutral.",
            es: "Un campo gris plano con la marca en tinta. Discreto y neutral.",
            pt: "Um fundo cinza liso com a marca em tinta. Discreto e neutro.",
        }),
        "appIcon.mono.label": t({
            en: "Mono",
            es: "Mono",
            pt: "Mono",
        }),
        "budgetTime.daysLeft": t({
            en: "{count}d left",
            es: "quedan {count}d",
            pt: "faltam {count}d",
        }),
        "budgetTime.hoursLeft": t({
            en: "{count}h left",
            es: "quedan {count}h",
            pt: "faltam {count}h",
        }),
        "clock.deviceNote": t({
            en: "Starts on whatever your device uses; changing it here takes over.",
            es: "Usa la configuración de tu dispositivo hasta que la cambies aquí.",
            "es-ES": "Usa los ajustes de tu dispositivo hasta que lo cambies aquí.",
            pt: "Segue o ajuste do seu dispositivo até você mudar aqui.",
        }),
        "clock.section": t({
            en: "Clock",
            es: "Reloj",
            pt: "Relógio",
        }),
        "clock.twelveHour": t({
            en: "12-hour",
            es: "12 horas",
            pt: "12 horas",
        }),
        "clock.twentyFourHour": t({
            en: "24-hour",
            es: "24 horas",
            pt: "24 horas",
        }),
        "coverage.pending": t({
            en: "Rates are still catching up: {count} of {total} entries are counted at the amount they were logged in.",
            es: "Las tasas se están actualizando: {count} de {total} registros se cuentan con su monto original.",
            "es-ES":
                "Los tipos de cambio se están actualizando: {count} de {total} registros se cuentan con su importe original.",
            pt: "As cotações ainda estão sendo atualizadas: {count} de {total} lançamentos contam pelo valor original.",
        }),
        "coverage.pendingAndPredate": t({
            en: "Rates are still catching up: {count} of {total} entries are counted at the amount they were logged in. {predate} more predate the rate history and always will be.",
            es: "Las tasas se están actualizando: {count} de {total} registros se cuentan con su monto original. Otros {predate} son anteriores al historial de tasas y así se van a quedar.",
            "es-ES":
                "Los tipos de cambio se están actualizando: {count} de {total} registros se cuentan con su importe original. Otros {predate} son anteriores al historial de tipos de cambio y así se van a quedar.",
            pt: "As cotações ainda estão sendo atualizadas: {count} de {total} lançamentos contam pelo valor original. Outros {predate} são anteriores ao histórico de cotações e vão continuar assim.",
        }),
        "coverage.predateOnly": t({
            en: "{count} of {total} entries predate the rate history, so they are counted at the amount they were logged in.",
            es: "{count} de {total} registros son anteriores al historial de tasas, así que se cuentan con su monto original.",
            "es-ES":
                "{count} de {total} registros son anteriores al historial de tipos de cambio, así que se cuentan con su importe original.",
            pt: "{count} de {total} lançamentos são anteriores ao histórico de cotações, então contam pelo valor original.",
        }),
        "dates.meridiem.am": t({ en: "AM", es: "a. m.", pt: "AM" }),
        "dates.meridiem.pm": t({ en: "PM", es: "p. m.", pt: "PM" }),
        // Indexed by `Date.getMonth()` / `Date.getDay()`. Spanish names are lowercase by convention; shouted forms are
        // upper-cased at the call site.
        "dates.month.0": t({ en: "Jan", es: "ene", pt: "jan" }),
        "dates.month.1": t({ en: "Feb", es: "feb", pt: "fev" }),
        "dates.month.2": t({ en: "Mar", es: "mar", pt: "mar" }),
        "dates.month.3": t({ en: "Apr", es: "abr", pt: "abr" }),
        "dates.month.4": t({ en: "May", es: "may", pt: "mai" }),
        "dates.month.5": t({ en: "Jun", es: "jun", pt: "jun" }),
        "dates.month.6": t({ en: "Jul", es: "jul", pt: "jul" }),
        "dates.month.7": t({ en: "Aug", es: "ago", pt: "ago" }),
        "dates.month.8": t({ en: "Sep", es: "sep", pt: "set" }),
        "dates.month.9": t({ en: "Oct", es: "oct", pt: "out" }),
        "dates.month.10": t({ en: "Nov", es: "nov", pt: "nov" }),
        "dates.month.11": t({ en: "Dec", es: "dic", pt: "dez" }),
        "dates.monthLong.0": t({ en: "January", es: "enero", pt: "janeiro" }),
        "dates.monthLong.1": t({ en: "February", es: "febrero", pt: "fevereiro" }),
        "dates.monthLong.2": t({ en: "March", es: "marzo", pt: "março" }),
        "dates.monthLong.3": t({ en: "April", es: "abril", pt: "abril" }),
        "dates.monthLong.4": t({ en: "May", es: "mayo", pt: "maio" }),
        "dates.monthLong.5": t({ en: "June", es: "junio", pt: "junho" }),
        "dates.monthLong.6": t({ en: "July", es: "julio", pt: "julho" }),
        "dates.monthLong.7": t({ en: "August", es: "agosto", pt: "agosto" }),
        "dates.monthLong.8": t({ en: "September", es: "septiembre", pt: "setembro" }),
        "dates.monthLong.9": t({ en: "October", es: "octubre", pt: "outubro" }),
        "dates.monthLong.10": t({ en: "November", es: "noviembre", pt: "novembro" }),
        "dates.monthLong.11": t({ en: "December", es: "diciembre", pt: "dezembro" }),
        "dates.weekday.0": t({ en: "Sun", es: "dom", pt: "dom" }),
        "dates.weekday.1": t({ en: "Mon", es: "lun", pt: "seg" }),
        "dates.weekday.2": t({ en: "Tue", es: "mar", pt: "ter" }),
        "dates.weekday.3": t({ en: "Wed", es: "mié", pt: "qua" }),
        "dates.weekday.4": t({ en: "Thu", es: "jue", pt: "qui" }),
        "dates.weekday.5": t({ en: "Fri", es: "vie", pt: "sex" }),
        "dates.weekday.6": t({ en: "Sat", es: "sáb", pt: "sáb" }),
        // Spanish uses X for miércoles so it does not collide with martes.
        "dates.weekdayInitial.0": t({ en: "S", es: "D", pt: "D" }),
        "dates.weekdayInitial.1": t({ en: "M", es: "L", pt: "S" }),
        "dates.weekdayInitial.2": t({ en: "T", es: "M", pt: "T" }),
        "dates.weekdayInitial.3": t({ en: "W", es: "X", pt: "Q" }),
        "dates.weekdayInitial.4": t({ en: "T", es: "J", pt: "Q" }),
        "dates.weekdayInitial.5": t({ en: "F", es: "V", pt: "S" }),
        "dates.weekdayInitial.6": t({ en: "S", es: "S", pt: "S" }),
        "dates.weekdayLong.0": t({ en: "Sunday", es: "domingo", pt: "domingo" }),
        "dates.weekdayLong.1": t({ en: "Monday", es: "lunes", pt: "segunda-feira" }),
        "dates.weekdayLong.2": t({ en: "Tuesday", es: "martes", pt: "terça-feira" }),
        "dates.weekdayLong.3": t({ en: "Wednesday", es: "miércoles", pt: "quarta-feira" }),
        "dates.weekdayLong.4": t({ en: "Thursday", es: "jueves", pt: "quinta-feira" }),
        "dates.weekdayLong.5": t({ en: "Friday", es: "viernes", pt: "sexta-feira" }),
        "dates.weekdayLong.6": t({ en: "Saturday", es: "sábado", pt: "sábado" }),
        "daySlots.overIn_one": t({
            en: "One purchase too many in {category}.",
            es: "Un gasto de más en {category}.",
            pt: "Um gasto a mais em {category}.",
        }),
        "daySlots.overIn_other": t({
            en: "{count} purchases too many in {category}.",
            es: "{count} gastos de más en {category}.",
            pt: "{count} gastos a mais em {category}.",
        }),
        "daySlots.over_one": t({
            en: "One purchase too many.",
            es: "Un gasto de más.",
            pt: "Um gasto a mais.",
        }),
        "daySlots.over_other": t({
            en: "{count} purchases too many.",
            es: "{count} gastos de más.",
            pt: "{count} gastos a mais.",
        }),
        "daySlots.room": t({
            en: "Room for one more.",
            es: "Alcanza para uno más.",
            pt: "Dá para mais um.",
        }),
        "daySlots.tight": t({
            en: "Not enough for another.",
            es: "No alcanza para otro.",
            pt: "Não dá para outro.",
        }),
        "icons.section.food": t({
            en: "Food & Drink",
            es: "Comida y bebida",
            pt: "Comida e bebida",
        }),
        "icons.section.health": t({
            en: "Health & Fitness",
            es: "Salud y bienestar",
            pt: "Saúde e bem-estar",
        }),
        "icons.section.home": t({
            en: "Home & Utilities",
            es: "Hogar y servicios",
            pt: "Casa e serviços",
        }),
        "icons.section.leisure": t({
            en: "Leisure",
            es: "Ocio",
            pt: "Lazer",
        }),
        "icons.section.life": t({
            en: "Life & Other",
            es: "Vida y otros",
            pt: "Vida e outros",
        }),
        "icons.section.money": t({
            en: "Money & Work",
            es: "Dinero y trabajo",
            pt: "Dinheiro e trabalho",
        }),
        "icons.section.shopping": t({
            en: "Shopping",
            es: "Compras",
            pt: "Compras",
        }),
        "icons.section.transport": t({
            en: "Transport & Travel",
            es: "Transporte y viajes",
            pt: "Transporte e viagens",
        }),
        "lock.failed": t({
            en: "That did not match. Try again.",
            es: "No coincidió. Inténtalo de nuevo.",
            pt: "Não confere. Tente de novo.",
        }),
        "lock.fallback": t({
            en: "Choose Unlock again to enter your device passcode.",
            es: "Toca Desbloquear otra vez para ingresar el código de tu dispositivo.",
            "es-ES": "Toca Desbloquear otra vez para introducir el código de tu dispositivo.",
            pt: "Toque em Desbloquear de novo para digitar o código do dispositivo.",
        }),
        "lock.lockout": t({
            en: "Too many attempts. Unlock with your device passcode instead.",
            es: "Demasiados intentos. Desbloquea con el código de tu dispositivo.",
            pt: "Muitas tentativas. Desbloqueie com o código do dispositivo.",
        }),
        "lock.timeout": t({
            en: "The prompt timed out. Try again.",
            es: "Se acabó el tiempo. Inténtalo de nuevo.",
            pt: "O tempo acabou. Tente de novo.",
        }),
        "lock.unavailable": t({
            en: "This device has no passcode or biometrics set up.",
            es: "Este dispositivo no tiene código ni biometría configurados.",
            pt: "Este dispositivo não tem código nem biometria configurados.",
        }),
        "lock.unknown": t({
            en: "Could not check. Try again.",
            es: "No se pudo verificar. Inténtalo de nuevo.",
            pt: "Não foi possível verificar. Tente de novo.",
        }),
        "merchantTag.AI": t({
            en: "AI",
            es: "IA",
            pt: "IA",
        }),
        "merchantTag.Airline": t({
            en: "Airline",
            es: "Aerolínea",
            pt: "Companhia aérea",
        }),
        "merchantTag.Apparel": t({
            en: "Apparel",
            es: "Ropa",
            pt: "Roupas",
        }),
        "merchantTag.Apple": t({
            en: "Apple",
            es: "Apple",
            pt: "Apple",
        }),
        "merchantTag.Audiobooks": t({
            en: "Audiobooks",
            es: "Audiolibros",
            pt: "Audiolivros",
        }),
        "merchantTag.Beauty": t({
            en: "Beauty",
            es: "Belleza",
            pt: "Beleza",
        }),
        "merchantTag.Cable": t({
            en: "Cable",
            es: "Cable",
            "es-ES": "TV de pago",
            pt: "TV a cabo",
        }),
        "merchantTag.Car Share": t({
            en: "Car Share",
            es: "Carro compartido",
            "es-ES": "Coche compartido",
            pt: "Carro compartilhado",
        }),
        "merchantTag.Convenience": t({
            en: "Convenience",
            es: "Tienda de conveniencia",
            "es-ES": "Tienda de barrio",
            pt: "Conveniência",
        }),
        "merchantTag.Delivery": t({
            en: "Delivery",
            es: "A domicilio",
            pt: "Delivery",
        }),
        "merchantTag.Design": t({
            en: "Design",
            es: "Diseño",
            pt: "Design",
        }),
        "merchantTag.Development": t({
            en: "Development",
            es: "Desarrollo",
            pt: "Desenvolvimento",
        }),
        "merchantTag.Education": t({
            en: "Education",
            es: "Educación",
            pt: "Educação",
        }),
        "merchantTag.Electricity": t({
            en: "Electricity",
            es: "Electricidad",
            pt: "Energia",
        }),
        "merchantTag.Electronics": t({
            en: "Electronics",
            es: "Electrónica",
            pt: "Eletrônicos",
        }),
        "merchantTag.Fast Food": t({
            en: "Fast Food",
            es: "Comida rápida",
            pt: "Fast-food",
        }),
        "merchantTag.Fitness": t({
            en: "Fitness",
            es: "Ejercicio",
            pt: "Fitness",
        }),
        "merchantTag.Food": t({
            en: "Food",
            es: "Comida",
            pt: "Comida",
        }),
        "merchantTag.Furniture": t({
            en: "Furniture",
            es: "Muebles",
            pt: "Móveis",
        }),
        "merchantTag.Gaming": t({
            en: "Gaming",
            es: "Videojuegos",
            pt: "Games",
        }),
        "merchantTag.Gas": t({
            en: "Gas",
            es: "Gas",
            pt: "Combustível",
        }),
        "merchantTag.Groceries": t({
            en: "Groceries",
            es: "Supermercado",
            pt: "Mercado",
        }),
        "merchantTag.Home Improvement": t({
            en: "Home Improvement",
            es: "Ferretería",
            pt: "Material de construção",
        }),
        "merchantTag.Internet": t({
            en: "Internet",
            es: "Internet",
            pt: "Internet",
        }),
        "merchantTag.Learning": t({
            en: "Learning",
            es: "Aprendizaje",
            pt: "Aprendizado",
        }),
        "merchantTag.Marketplace": t({
            en: "Marketplace",
            es: "Tienda en línea",
            "es-ES": "Tienda online",
            pt: "Marketplace",
        }),
        "merchantTag.Micromobility": t({
            en: "Micromobility",
            es: "Micromovilidad",
            pt: "Micromobilidade",
        }),
        "merchantTag.Music": t({
            en: "Music",
            es: "Música",
            pt: "Música",
        }),
        "merchantTag.News": t({
            en: "News",
            es: "Noticias",
            pt: "Notícias",
        }),
        "merchantTag.Pharmacy": t({
            en: "Pharmacy",
            es: "Farmacia",
            pt: "Farmácia",
        }),
        "merchantTag.Phone": t({
            en: "Phone",
            es: "Teléfono",
            pt: "Telefonia",
        }),
        "merchantTag.Productivity": t({
            en: "Productivity",
            es: "Productividad",
            pt: "Produtividade",
        }),
        "merchantTag.Professional": t({
            en: "Professional",
            es: "Profesional",
            pt: "Profissional",
        }),
        "merchantTag.Rideshare": t({
            en: "Rideshare",
            es: "Transporte por app",
            "es-ES": "VTC",
            pt: "Transporte por app",
        }),
        "merchantTag.Security": t({
            en: "Security",
            es: "Seguridad",
            pt: "Segurança",
        }),
        "merchantTag.Sports": t({
            en: "Sports",
            es: "Deportes",
            pt: "Esportes",
        }),
        "merchantTag.Storage": t({
            en: "Storage",
            es: "Almacenamiento",
            pt: "Armazenamento",
        }),
        "merchantTag.Streaming": t({
            en: "Streaming",
            es: "Streaming",
            pt: "Streaming",
        }),
        "merchantTag.Subscription": t({
            en: "Subscription",
            es: "Suscripción",
            pt: "Assinatura",
        }),
        "merchantTag.Transit": t({
            en: "Transit",
            es: "Transporte público",
            pt: "Transporte público",
        }),
        "merchantTag.Travel": t({
            en: "Travel",
            es: "Viajes",
            pt: "Viagens",
        }),
        "merchantTag.Warehouse": t({
            en: "Warehouse",
            es: "Mayorista",
            pt: "Atacado",
        }),
        "merchantTag.Waste": t({
            en: "Waste",
            es: "Basura",
            pt: "Coleta de lixo",
        }),
        "merchantTag.Water": t({
            en: "Water",
            es: "Agua",
            pt: "Água",
        }),
        "merchantTag.Wellness": t({
            en: "Wellness",
            es: "Bienestar",
            pt: "Bem-estar",
        }),
        "merchantTag.Wholesale": t({
            en: "Wholesale",
            es: "Mayorista",
            pt: "Atacado",
        }),
        "merchantTag.Writing": t({
            en: "Writing",
            es: "Escritura",
            pt: "Escrita",
        }),
        "verdict.inLine": t({
            en: "In line with {prior}.",
            es: "Similar a {prior}.",
            pt: "Parecido com {prior}.",
        }),
        "verdict.lessThan": t({
            en: "{amount} less than {prior}.",
            es: "{amount} menos que {prior}.",
            pt: "{amount} a menos que {prior}.",
        }),
        "verdict.moreThan": t({
            en: "{amount} more than {prior}.",
            es: "{amount} más que {prior}.",
            pt: "{amount} a mais que {prior}.",
        }),
        "verdict.moverAdded": t({
            en: "{name} alone added {amount}.",
            es: "Solo {name} subió {amount}.",
            pt: "Só {name} subiu {amount}.",
        }),
        "verdict.moverGaveBack": t({
            en: "{name} alone gave back {amount}.",
            es: "Solo {name} bajó {amount}.",
            pt: "Só {name} caiu {amount}.",
        }),
    },
    key: "domain" as const,
} satisfies Dictionary;

export default domain;
