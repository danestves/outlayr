import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const transaction = {
    content: {
        "transaction.account.create": t({
            en: "Create Account",
            es: "Crear cuenta",
        }),
        "transaction.account.empty": t({
            en: "No accounts yet. Create one to keep this entry's balance somewhere.",
            es: "Aún no tienes cuentas. Crea una para llevar el saldo de esta entrada.",
        }),
        "transaction.account.none": t({
            en: "None",
            es: "Ninguna",
        }),
        "transaction.account.title": t({
            en: "Account",
            es: "Cuenta",
        }),
        "transaction.amount.changeCurrency": t({
            en: "Change currency",
            es: "Cambiar moneda",
        }),
        "transaction.amount.required": t({
            en: "Type an amount first",
            es: "Primero escribe un monto",
        }),
        "transaction.cadence.daily": t({
            en: "Daily",
            es: "Diario",
        }),
        "transaction.cadence.days": t({
            en: "Days",
            es: "Días",
        }),
        "transaction.cadence.monthly": t({
            en: "Monthly",
            es: "Mensual",
        }),
        "transaction.cadence.months": t({
            en: "Months",
            es: "Meses",
        }),
        "transaction.cadence.weekly": t({
            en: "Weekly",
            es: "Semanal",
        }),
        "transaction.cadence.weeks": t({
            en: "Weeks",
            es: "Semanas",
        }),
        "transaction.cadence.yearly": t({
            en: "Yearly",
            es: "Anual",
        }),
        "transaction.cadence.years": t({
            en: "Years",
            es: "Años",
        }),
        "transaction.category.a11yCollapse": t({
            en: "Hide subcategories of {name}",
            es: "Ocultar subcategorías de {name}",
        }),
        "transaction.category.a11yExpand": t({
            en: "Show subcategories of {name}",
            es: "Mostrar subcategorías de {name}",
        }),
        "transaction.category.all": t({
            en: "All categories",
            es: "Todas las categorías",
        }),
        "transaction.category.createNamed": t({
            en: "Create “{query}”",
            es: "Crear “{query}”",
        }),
        "transaction.category.noMatches": t({
            en: "No category matches “{query}”",
            es: "Ninguna categoría coincide con “{query}”",
        }),
        "transaction.category.recent": t({
            en: "Recent",
            es: "Recientes",
        }),
        "transaction.category.required": t({
            en: "Pick a category first",
            es: "Primero elige una categoría",
        }),
        "transaction.category.search": t({
            en: "Search categories",
            es: "Buscar categorías",
        }),
        "transaction.cta.add": t({
            en: "Add Transaction",
            es: "Agregar transacción",
        }),
        "transaction.cta.addSubscription": t({
            en: "Add Subscription",
            es: "Agregar suscripción",
        }),
        "transaction.cta.lookup": t({
            en: "Look up merchant",
            es: "Buscar comercio",
        }),
        "transaction.cta.save": t({
            en: "Save Changes",
            es: "Guardar cambios",
        }),
        "transaction.edit.title": t({
            en: "Edit",
            es: "Editar",
        }),
        "transaction.fee.amount": t({
            en: "Amount",
            es: "Monto",
        }),
        "transaction.fee.bankTitle": t({
            en: "Bank fee",
            es: "Comisión del banco",
        }),
        "transaction.fee.comesTo": t({
            en: "a {amount} fee",
            es: "una comisión de {amount}",
        }),
        "transaction.fee.line": t({
            en: "{base} plus {fee}",
            es: "{base} más {fee}",
        }),
        "transaction.fee.loggedAs": t({
            en: "Logged as",
            es: "Se registra en",
        }),
        "transaction.fee.none": t({
            en: "None",
            es: "Ninguna",
        }),
        "transaction.fee.note": t({
            en: "Fee · {merchant}",
            es: "Comisión · {merchant}",
        }),
        "transaction.fee.part": t({
            en: "{fee} in fees",
            es: "{fee} de comisión",
        }),
        "transaction.fee.pays": t({
            en: "{account} pays",
            es: "{account} paga",
        }),
        "transaction.fee.percent": t({
            en: "Percent",
            es: "Porcentaje",
        }),
        "transaction.fee.title": t({
            en: "Card fee",
            es: "Comisión de la tarjeta",
        }),
        "transaction.fee.total": t({
            en: "Total with fee",
            es: "Total con comisión",
        }),
        "transaction.field.account": t({
            en: "Account",
            es: "Cuenta",
        }),
        "transaction.field.amount": t({
            en: "Amount",
            es: "Monto",
        }),
        "transaction.field.category": t({
            en: "Category",
            es: "Categoría",
        }),
        "transaction.field.date": t({
            en: "Date",
            es: "Fecha",
        }),
        "transaction.field.ends": t({
            en: "Ends",
            es: "Termina el",
        }),
        "transaction.field.name": t({
            en: "Name",
            es: "Nombre",
        }),
        "transaction.field.namePlaceholder": t({
            en: "Netflix, Groceries…",
            es: "Netflix, Súper…",
        }),
        "transaction.field.notes": t({
            en: "Notes",
            es: "Notas",
        }),
        "transaction.field.notesPlaceholder": t({
            en: "Optional",
            es: "Opcional",
        }),
        "transaction.field.remind": t({
            en: "Remind Me",
            es: "Recordarme",
        }),
        "transaction.field.schedule": t({
            en: "Schedule",
            es: "Programación",
        }),
        "transaction.field.time": t({
            en: "Time",
            es: "Hora",
        }),
        "transaction.identity.autoDetected": t({
            en: "Auto-detected",
            es: "Detectado automáticamente",
        }),
        "transaction.identity.changePhoto": t({
            en: "Change photo",
            es: "Cambiar foto",
        }),
        "transaction.identity.changePhotoPrompt": t({
            en: "Tap to change photo",
            es: "Toca para cambiar la foto",
        }),
        "transaction.identity.color": t({
            en: "Color",
            es: "Color",
        }),
        "transaction.identity.colorSwatch": t({
            en: "Color {position} of {total}",
            es: "Color {position} de {total}",
        }),
        "transaction.identity.colorUsed": t({
            en: "Already used by another category",
            es: "Ya usada por otra categoría",
        }),
        "transaction.identity.hero.chooseIcon": t({
            en: "Choose an icon & color",
            es: "Elige un ícono y color",
        }),
        "transaction.identity.hero.icon": t({
            en: "Category icon",
            es: "Ícono de categoría",
        }),
        "transaction.identity.hero.iconHint": t({
            en: "Opens the icon picker",
            es: "Abre el selector de íconos",
        }),
        "transaction.identity.hero.logo": t({
            en: "Add a logo or icon",
            es: "Agrega un logo o ícono",
        }),
        "transaction.identity.hero.logoHint": t({
            en: "Opens the logo picker",
            es: "Abre el selector de logos",
        }),
        "transaction.identity.hero.removeIcon": t({
            en: "Remove icon",
            es: "Quitar ícono",
        }),
        "transaction.identity.hero.removeLogo": t({
            en: "Remove logo",
            es: "Quitar logo",
        }),
        "transaction.identity.hero.tapToChange": t({
            en: "Tap to change",
            es: "Toca para cambiar",
        }),
        "transaction.identity.noIcons": t({
            en: "No icons found",
            es: "No se encontraron íconos",
        }),
        "transaction.identity.pickPhotoFirst": t({
            en: "Pick a photo first",
            es: "Primero elige una foto",
        }),
        "transaction.identity.primaryColor": t({
            en: "Primary color from image",
            es: "Color principal de la imagen",
        }),
        "transaction.identity.searchIcons": t({
            en: "Search icons",
            es: "Buscar íconos",
        }),
        "transaction.identity.selectPhoto": t({
            en: "Select photo",
            es: "Seleccionar foto",
        }),
        "transaction.identity.selectPhotoPrompt": t({
            en: "Tap to select a photo",
            es: "Toca para elegir una foto",
        }),
        "transaction.identity.tab.emoji": t({
            en: "Emoji",
            es: "Emoji",
        }),
        "transaction.identity.tab.icons": t({
            en: "Icons",
            es: "Íconos",
        }),
        "transaction.identity.tab.photo": t({
            en: "Photo",
            es: "Foto",
        }),
        "transaction.interval.day": t({
            en: "day",
            es: "día",
        }),
        "transaction.interval.days": t({
            en: "{count} days",
            es: "{count} días",
        }),
        "transaction.interval.month": t({
            en: "month",
            es: "mes",
        }),
        "transaction.interval.months": t({
            en: "{count} months",
            es: "{count} meses",
        }),
        "transaction.interval.week": t({
            en: "week",
            es: "semana",
        }),
        "transaction.interval.weeks": t({
            en: "{count} weeks",
            es: "{count} semanas",
        }),
        "transaction.interval.year": t({
            en: "year",
            es: "año",
        }),
        "transaction.interval.years": t({
            en: "{count} years",
            es: "{count} años",
        }),
        "transaction.localData.body": t({
            en: "Outlayr could not open your data. This is often temporary — try again first. Your ledger is still on this device.",
            es: "Outlayr no pudo abrir tus datos. Suele ser algo temporal, así que inténtalo de nuevo. Tu registro sigue en este dispositivo.",
        }),
        "transaction.localData.retrying": t({
            en: "Trying…",
            es: "Intentando…",
        }),
        "transaction.localData.title": t({
            en: "Something Went Wrong",
            es: "Algo salió mal",
        }),
        "transaction.lock.checking": t({
            en: "Checking…",
            es: "Verificando…",
        }),
        "transaction.lock.prompt": t({
            en: "Unlock Outlayr",
            es: "Desbloquear Outlayr",
        }),
        "transaction.lock.title": t({
            en: "Outlayr is Locked",
            es: "Outlayr está bloqueado",
        }),
        "transaction.lock.unlock": t({
            en: "Unlock",
            es: "Desbloquear",
        }),
        // Not `transaction.field.name`: the sentence's inline field carries that label and both are on screen at once.
        "transaction.merchant.field": t({
            en: "Merchant name",
            es: "Nombre del comercio",
        }),
        "transaction.merchant.recent": t({
            en: "Recently",
            es: "Recientes",
        }),
        "transaction.new.title": t({
            en: "New",
            es: "Nueva",
        }),
        "transaction.numpad.clear": t({
            en: "Clear all",
            es: "Borrar todo",
        }),
        "transaction.numpad.delete": t({
            en: "Delete",
            es: "Borrar",
        }),
        "transaction.paidVia.option.card": t({
            en: "Card",
            es: "Punto",
        }),
        "transaction.paidVia.option.cash": t({
            en: "Cash",
            es: "Efectivo",
        }),
        "transaction.paidVia.option.pagoMovil": t({
            en: "Pago Móvil",
            es: "Pago Móvil",
        }),
        "transaction.paidVia.option.sameBankTransfer": t({
            en: "Transfer within the bank",
            es: "Transferencia en el mismo banco",
        }),
        "transaction.paidVia.option.transfer": t({
            en: "Transfer to another bank",
            es: "Transferencia a otro banco",
        }),
        "transaction.paidVia.title": t({
            en: "How you paid",
            es: "Cómo pagaste",
        }),
        "transaction.paidVia.value.card": t({
            en: "card",
            es: "punto",
        }),
        "transaction.paidVia.value.cash": t({
            en: "cash",
            es: "efectivo",
        }),
        "transaction.paidVia.value.pagoMovil": t({
            en: "Pago Móvil",
            es: "Pago Móvil",
        }),
        "transaction.paidVia.value.sameBankTransfer": t({
            en: "transfer within the bank",
            es: "transferencia en el mismo banco",
        }),
        "transaction.paidVia.value.transfer": t({
            en: "transfer to another bank",
            es: "transferencia a otro banco",
        }),
        "transaction.rate.asOf": t({
            en: "As of {date}",
            es: "Al {date}",
        }),
        "transaction.rate.asOfTime": t({
            en: "As of {time}",
            es: "Hoy, {time}",
        }),
        "transaction.rate.binance": t({
            en: "USDT (Binance)",
            es: "USDT (Binance)",
        }),
        "transaction.rate.custom": t({
            en: "My rate",
            es: "Mi tasa",
        }),
        "transaction.rate.daysOld_one": t({
            en: "{count} day old · {date}",
            es: "De hace {count} día · {date}",
        }),
        "transaction.rate.daysOld_other": t({
            en: "{count} days old · {date}",
            es: "De hace {count} días · {date}",
        }),
        "transaction.rate.deltaAbove": t({
            en: "{percent} above {source}",
            es: "{percent} sobre la {source}",
        }),
        "transaction.rate.deltaBelow": t({
            en: "{percent} below {source}",
            es: "{percent} bajo la {source}",
        }),
        "transaction.rate.deltaLess": t({
            en: "{amount} less than at {source}",
            es: "{amount} menos que a la {source}",
        }),
        "transaction.rate.deltaMore": t({
            en: "{amount} more than at {source}",
            es: "{amount} más que a la {source}",
        }),
        "transaction.rate.deltaSame": t({
            en: "Same as {source}",
            es: "Igual a la {source}",
        }),
        "transaction.rate.derived": t({
            en: "Rate from what you paid: {rate}",
            es: "Tasa según lo que pagaste: {rate}",
        }),
        "transaction.rate.eur_reference": t({
            en: "EUR (BCV)",
            es: "EUR (BCV)",
        }),
        "transaction.rate.inDollars": t({
            en: "In dollars",
            es: "En dólares",
        }),
        "transaction.rate.lastUsed": t({
            en: "Last used {rate} · {date}",
            es: "Última usada {rate} · {date}",
        }),
        "transaction.rate.official": t({
            en: "Official",
            es: "Oficial",
        }),
        "transaction.rate.officialBcv": t({
            en: "USD (BCV)",
            es: "USD (BCV)",
        }),
        "transaction.rate.required": t({
            en: "Type a rate first",
            es: "Primero escribe una tasa",
        }),
        "transaction.rate.source": t({
            en: "Rate source",
            es: "Fuente de la tasa",
        }),
        "transaction.rate.title": t({
            en: "Rate",
            es: "Tasa",
        }),
        "transaction.rate.type": t({
            en: "Type",
            es: "Escribir",
        }),
        "transaction.rate.typeHint": t({
            en: "Type the rate you got",
            es: "Escribe la tasa que te dieron",
        }),
        "transaction.rate.unavailable": t({
            en: "Unavailable",
            es: "No disponible",
        }),
        "transaction.rate.unit": t({
            en: "{quote} per {base}",
            es: "{quote} por {base}",
        }),
        "transaction.rate.use": t({
            en: "Use {value}",
            es: "Usar {value}",
        }),
        "transaction.remind.dayBefore": t({
            en: "1 day before",
            es: "1 día antes",
        }),
        "transaction.remind.daysBefore": t({
            en: "{count} days before",
            es: "{count} días antes",
        }),
        "transaction.remind.off": t({
            en: "Off",
            es: "Desactivado",
        }),
        "transaction.remind.sameDay": t({
            en: "On the day",
            es: "El mismo día",
        }),
        "transaction.remind.weekBefore": t({
            en: "1 week before",
            es: "1 semana antes",
        }),
        "transaction.save.failedBody": t({
            en: "Nothing was saved. Try again.",
            es: "No se guardó nada. Inténtalo de nuevo.",
        }),
        "transaction.save.scheduleFailedBody": t({
            en: "Your subscription was saved, but its charges could not be logged. Outlayr will try again the next time you open it.",
            es: "Tu suscripción se guardó, pero no se pudieron registrar sus cargos. Outlayr volverá a intentarlo la próxima vez que la abras.",
        }),
        "transaction.save.scheduleFailedTitle": t({
            en: "Schedule not applied",
            es: "No se aplicó la programación",
        }),
        "transaction.schedule.customOption": t({
            en: "Custom…",
            es: "Personalizado…",
        }),
        "transaction.schedule.customTitle": t({
            en: "Custom Schedule",
            es: "Programación personalizada",
        }),
        // Lowercase: it reads mid-sentence on the stage's schedule line.
        "transaction.schedule.ending": t({
            en: "ending",
            es: "hasta el",
        }),
        "transaction.schedule.endingOpen": t({
            en: "ending",
            es: "sin",
        }),
        "transaction.schedule.every": t({
            en: "Every {interval}",
            es: "Cada {interval}",
        }),
        "transaction.schedule.everyLabel": t({
            en: "Every",
            es: "Cada",
        }),
        "transaction.schedule.fewer": t({
            en: "Fewer",
            es: "Menos",
        }),
        "transaction.schedule.firstPaymentTag": t({
            en: "First payment",
            es: "Primer pago",
        }),
        "transaction.schedule.more": t({
            en: "More",
            es: "Más",
        }),
        "transaction.schedule.nextCharges": t({
            en: "Next charges",
            es: "Próximos cargos",
        }),
        "transaction.schedule.shortMonthNote": t({
            en: "A month too short for that day charges on its last day instead.",
            es: "Si el mes no tiene ese día, se cobra el último día del mes.",
        }),
        "transaction.schedule.shortMonthTag": t({
            en: "short month",
            es: "mes corto",
        }),
        "transaction.schedule.openEnd": t({
            en: "never",
            es: "fecha de fin",
        }),
        // Lowercase, like `transaction.schedule.ending`.
        "transaction.schedule.starting": t({
            en: "starting",
            es: "desde el",
        }),
        "transaction.schedule.stopRepeat": t({
            en: "Stop repeating",
            es: "Dejar de repetir",
        }),
        "transaction.sentence.add.fee": t({
            en: "fee",
            es: "comisión",
        }),
        "transaction.sentence.add.icon": t({
            en: "icon",
            es: "ícono",
        }),
        "transaction.sentence.add.label": t({
            en: "Add {fact}",
            es: "Agregar {fact}",
        }),
        "transaction.sentence.add.more": t({
            en: "add",
            es: "agregar",
        }),
        "transaction.sentence.add.moreLabel": t({
            en: "Add details",
            es: "Agregar detalles",
        }),
        "transaction.sentence.add.note": t({
            en: "note",
            es: "nota",
        }),
        "transaction.sentence.add.repeat": t({
            en: "repeat",
            es: "repetir",
        }),
        "transaction.sentence.add.split": t({
            en: "split",
            es: "dividir",
        }),
        "transaction.sentence.add.tags": t({
            en: "tags",
            es: "etiquetas",
        }),
        // Nouns, not questions: the template supplies the preposition, so "at {merchant}" must read with the blank in
        // place. The Spanish article carries its noun's gender, so these are not one shared word.
        "transaction.sentence.blank.account": t({
            en: "an account",
            es: "una cuenta",
        }),
        "transaction.sentence.blank.category": t({
            en: "a category",
            es: "una categoría",
        }),
        "transaction.sentence.blank.merchant": t({
            en: "a merchant",
            es: "un comercio",
        }),
        "transaction.sentence.blank.paidVia": t({
            en: "a payment method",
            es: "un medio de pago",
        }),
        "transaction.sentence.blank.payer": t({
            en: "a payer",
            es: "un pagador",
        }),
        "transaction.sentence.blank.rate": t({
            en: "a rate",
            es: "una tasa",
        }),
        "transaction.sentence.coach": t({
            en: "Every underlined word is yours to change. Tap one, or just keep going below.",
            es: "Puedes cambiar cualquier palabra subrayada. Toca una o sigue abajo.",
        }),
        "transaction.sentence.coachDismiss": t({
            en: "Got it",
            es: "Entendido",
        }),
        "transaction.sentence.currency": t({
            en: "Change the amount's currency",
            es: "Cambiar la moneda del monto",
        }),
        // Layout, not just copy: `parseSentence` reads the slot order straight out of these templates.
        "transaction.sentence.expense": t({
            en: "{kind} {amount} at {merchant} for {category} from {account} {when}.",
            es: "{kind} {amount} en {merchant} para {category} con {account} {when}.",
        }),
        "transaction.sentence.extra.note": t({
            en: "Note: {note}",
            es: "Nota: {note}",
        }),
        "transaction.sentence.extra.rate": t({
            en: "At {base}1 = {quote}{rate}.",
            es: "A {base}1 = {quote}{rate}.",
        }),
        "transaction.sentence.extra.split": t({
            en: "Split across {parts}.",
            es: "Dividido en {parts}.",
        }),
        "transaction.sentence.extra.tags": t({
            en: "Tagged {tags}.",
            es: "Con {tags}.",
        }),
        "transaction.sentence.income": t({
            en: "{kind} {amount} from {merchant} for {category} into {account} {when}.",
            es: "{kind} {amount} de {merchant} para {category} en {account} {when}.",
        }),
        "transaction.sentence.kind.expense": t({
            en: "Spent",
            es: "Gasté",
        }),
        "transaction.sentence.kind.income": t({
            en: "Received",
            es: "Recibí",
        }),
        "transaction.sentence.kind.switch": t({
            en: "Expense or income",
            es: "Gasto o ingreso",
        }),
        "transaction.sentence.noAccount": t({
            en: "no account",
            es: "ninguna cuenta",
        }),
        "transaction.sentence.optional": t({
            en: "Optional",
            es: "Opcional",
        }),
        "transaction.sentence.paidVia": t({
            en: "By {paidVia}.",
            es: "Por {paidVia}.",
        }),
        "transaction.sentence.paidViaCash": t({
            en: "In {paidVia}.",
            es: "En {paidVia}.",
        }),
        "transaction.sentence.rate.custom": t({
            en: ", {converted} at {rateSource} rate.",
            es: ", {converted} a {rateSource}.",
        }),
        "transaction.sentence.rate.missing": t({
            en: "It counts in dollars once it has {rate}.",
            es: "Suma en dólares cuando tenga {rate}.",
        }),
        "transaction.sentence.rate.provider": t({
            en: ", {converted} at the {rateSource} rate.",
            es: ", {converted} a la tasa {rateSource}.",
        }),
        "transaction.sentence.rateSource.custom": t({
            en: "my",
            es: "mi tasa",
        }),
        "transaction.sentence.rateSource.eur_reference": t({
            en: "EUR (BCV)",
            es: "EUR (BCV)",
        }),
        "transaction.sentence.rateSource.official": t({
            en: "official",
            es: "oficial",
        }),
        "transaction.sentence.rateSource.officialBcv": t({
            en: "USD (BCV)",
            es: "USD (BCV)",
        }),
        "transaction.sentence.set.icon": t({
            en: "Change icon",
            es: "Cambiar ícono",
        }),
        "transaction.sentence.set.repeatDaily": t({
            en: "daily",
            es: "diario",
        }),
        "transaction.sentence.set.repeatMonthly": t({
            en: "monthly",
            es: "mensual",
        }),
        "transaction.sentence.set.repeatWeekly": t({
            en: "weekly",
            es: "semanal",
        }),
        "transaction.sentence.set.repeatYearly": t({
            en: "yearly",
            es: "anual",
        }),
        "transaction.sentence.set.split_one": t({
            en: "1 way",
            es: "1 parte",
        }),
        "transaction.sentence.set.split_other": t({
            en: "{count} ways",
            es: "{count} partes",
        }),
        "transaction.sentence.when.on": t({
            en: "on {date}",
            es: "el {date}",
        }),
        "transaction.sentence.when.pick": t({
            en: "Earlier",
            es: "Antes",
        }),
        "transaction.sentence.when.repeating": t({
            en: "every {interval} from {date}",
            es: "cada {interval} desde el {date}",
        }),
        "transaction.sentence.when.today": t({
            en: "today",
            es: "hoy",
        }),
        "transaction.sentence.when.yesterday": t({
            en: "yesterday",
            es: "ayer",
        }),
        "transaction.split.addCategory": t({
            en: "Add category",
            es: "Agregar categoría",
        }),
        "transaction.split.balanced": t({
            en: "Balanced",
            es: "Cuadrado",
        }),
        "transaction.split.chooseCategory": t({
            en: "Choose category",
            es: "Elegir categoría",
        }),
        "transaction.split.count_one": t({
            en: "{count} category",
            es: "{count} categoría",
        }),
        "transaction.split.count_other": t({
            en: "{count} categories",
            es: "{count} categorías",
        }),
        "transaction.split.editAmount": t({
            en: "Edit amount",
            es: "Editar monto",
        }),
        "transaction.split.fillRest": t({
            en: "Give the rest to the last category",
            es: "Dar el resto a la última categoría",
        }),
        "transaction.split.remaining": t({
            en: "Left to allocate",
            es: "Por asignar",
        }),
        "transaction.split.removePart": t({
            en: "Remove category",
            es: "Quitar categoría",
        }),
        "transaction.split.title": t({
            en: "Split",
            es: "Dividir",
        }),
        "transaction.split.unbalanced": t({
            en: "The split does not add up to the amount.",
            es: "La división no suma el monto.",
        }),
        "transaction.stopRecurring.failedBody": t({
            en: "The schedule couldn't be stopped, so the next charge will still be logged.",
            es: "No se pudo detener la programación, así que el próximo cargo se registrará igual.",
        }),
        "transaction.stopRecurring.failedTitle": t({
            en: "Still recurring",
            es: "Se sigue repitiendo",
        }),
        "transaction.stopRecurring.stopped": t({
            en: "Recurring stopped",
            es: "Ya no se repite",
        }),
        "transaction.tags.create": t({
            en: 'Add "{name}"',
            es: 'Agregar "{name}"',
        }),
        "transaction.tags.empty": t({
            en: "No tags yet. Type a name to add one.",
            es: "Aún no hay etiquetas. Escribe un nombre para agregar una.",
        }),
        "transaction.tags.searchPlaceholder": t({
            en: "Search or add",
            es: "Buscar o agregar",
        }),
        "transaction.tags.title": t({
            en: "Tags",
            es: "Etiquetas",
        }),
        "transaction.toast.added": t({
            en: "Added",
            es: "Agregada",
        }),
        "transaction.toast.another": t({
            en: "Add another",
            es: "Agregar otra",
        }),
        "transaction.toast.subscriptionAdded": t({
            en: "Subscription added",
            es: "Suscripción agregada",
        }),
        // Bare nouns, unlike `transaction.interval.*`: the sentence styles the count on its own.
        "transaction.unit.day": t({ en: "day", es: "día" }),
        "transaction.unit.days": t({ en: "days", es: "días" }),
        "transaction.unit.month": t({ en: "month", es: "mes" }),
        "transaction.unit.months": t({ en: "months", es: "meses" }),
        "transaction.unit.week": t({ en: "week", es: "semana" }),
        "transaction.unit.weeks": t({ en: "weeks", es: "semanas" }),
        "transaction.unit.year": t({ en: "year", es: "año" }),
        "transaction.unit.years": t({ en: "years", es: "años" }),
    },
    key: "transaction" as const,
} satisfies Dictionary;

export default transaction;
