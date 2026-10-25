import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const transaction = {
    content: {
        "transaction.account.create": t({
            en: "Create Account",
            es: "Crear cuenta",
            pt: "Criar conta",
        }),
        "transaction.account.empty": t({
            en: "No accounts yet. Create one to keep this entry's balance somewhere.",
            es: "Aún no tienes cuentas. Crea una para llevar el saldo de esta entrada.",
            pt: "Você ainda não tem contas. Crie uma para acompanhar o saldo deste lançamento.",
        }),
        "transaction.account.none": t({
            en: "None",
            es: "Ninguna",
            pt: "Nenhuma",
        }),
        "transaction.account.title": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "transaction.amount.changeCurrency": t({
            en: "Change currency",
            es: "Cambiar moneda",
            pt: "Trocar moeda",
        }),
        "transaction.amount.required": t({
            en: "Type an amount first",
            es: "Primero escribe un monto",
            pt: "Primeiro digite um valor",
        }),
        "transaction.attachments.add": t({
            en: "Add a file",
            es: "Agregar un archivo",
            pt: "Adicionar um arquivo",
        }),
        "transaction.attachments.add.camera": t({
            en: "Take photo",
            es: "Tomar foto",
            pt: "Tirar foto",
        }),
        "transaction.attachments.add.files": t({
            en: "Choose file",
            es: "Elegir archivo",
            pt: "Escolher arquivo",
        }),
        "transaction.attachments.add.library": t({
            en: "Choose photo",
            es: "Elegir foto",
            pt: "Escolher foto",
        }),
        "transaction.attachments.failed.denied": t({
            en: "Outlayr needs the camera to take a photo.",
            es: "Outlayr necesita la cámara para tomar una foto.",
            pt: "O Outlayr precisa da câmera para tirar uma foto.",
        }),
        "transaction.attachments.failed.full": t({
            en: "An entry holds up to 10 files.",
            es: "Un registro admite hasta 10 archivos.",
            pt: "Um lançamento aceita até 10 arquivos.",
        }),
        "transaction.attachments.failed.open": t({
            en: "Couldn't open that file.",
            es: "No se pudo abrir ese archivo.",
            pt: "Não foi possível abrir esse arquivo.",
        }),
        "transaction.attachments.failed.tooLarge": t({
            en: "Files over 10 MB can't be attached.",
            es: "No se pueden adjuntar archivos de más de 10 MB.",
            pt: "Não é possível anexar arquivos com mais de 10 MB.",
        }),
        "transaction.attachments.failed.unreadable": t({
            en: "Couldn't read that file. Attach a photo or a PDF.",
            es: "No se pudo leer ese archivo. Adjunta una foto o un PDF.",
            pt: "Não foi possível ler esse arquivo. Anexe uma foto ou um PDF.",
        }),
        "transaction.attachments.pending": t({
            en: "Downloading",
            es: "Descargando",
            pt: "Baixando",
        }),
        "transaction.attachments.photo": t({
            en: "Photo",
            es: "Foto",
            pt: "Foto",
        }),
        "transaction.attachments.remove": t({
            en: "Remove",
            es: "Quitar",
            pt: "Remover",
        }),
        "transaction.cadence.daily": t({
            en: "Daily",
            es: "Diario",
            pt: "Diário",
        }),
        "transaction.cadence.days": t({
            en: "Days",
            es: "Días",
            pt: "Dias",
        }),
        "transaction.cadence.monthly": t({
            en: "Monthly",
            es: "Mensual",
            pt: "Mensal",
        }),
        "transaction.cadence.months": t({
            en: "Months",
            es: "Meses",
            pt: "Meses",
        }),
        "transaction.cadence.weekly": t({
            en: "Weekly",
            es: "Semanal",
            pt: "Semanal",
        }),
        "transaction.cadence.weeks": t({
            en: "Weeks",
            es: "Semanas",
            pt: "Semanas",
        }),
        "transaction.cadence.yearly": t({
            en: "Yearly",
            es: "Anual",
            pt: "Anual",
        }),
        "transaction.cadence.years": t({
            en: "Years",
            es: "Años",
            pt: "Anos",
        }),
        "transaction.category.a11yCollapse": t({
            en: "Hide subcategories of {name}",
            es: "Ocultar subcategorías de {name}",
            pt: "Ocultar subcategorias de {name}",
        }),
        "transaction.category.a11yExpand": t({
            en: "Show subcategories of {name}",
            es: "Mostrar subcategorías de {name}",
            pt: "Mostrar subcategorias de {name}",
        }),
        "transaction.category.all": t({
            en: "All categories",
            es: "Todas las categorías",
            pt: "Todas as categorias",
        }),
        "transaction.category.createNamed": t({
            en: "Create “{query}”",
            es: "Crear “{query}”",
            pt: "Criar “{query}”",
        }),
        "transaction.category.noMatches": t({
            en: "No category matches “{query}”",
            es: "Ninguna categoría coincide con “{query}”",
            pt: "Nenhuma categoria corresponde a “{query}”",
        }),
        "transaction.category.recent": t({
            en: "Recent",
            es: "Recientes",
            pt: "Recentes",
        }),
        "transaction.category.required": t({
            en: "Pick a category first",
            es: "Primero elige una categoría",
            pt: "Primeiro escolha uma categoria",
        }),
        "transaction.category.search": t({
            en: "Search categories",
            es: "Buscar categorías",
            pt: "Buscar categorias",
        }),
        "transaction.cta.add": t({
            en: "Add Transaction",
            es: "Agregar transacción",
            pt: "Adicionar lançamento",
        }),
        "transaction.cta.addSubscription": t({
            en: "Add Subscription",
            es: "Agregar suscripción",
            pt: "Adicionar assinatura",
        }),
        "transaction.cta.lookup": t({
            en: "Look up merchant",
            es: "Buscar comercio",
            pt: "Buscar estabelecimento",
        }),
        "transaction.cta.save": t({
            en: "Save Changes",
            es: "Guardar cambios",
            pt: "Salvar alterações",
        }),
        "transaction.edit.title": t({
            en: "Edit",
            es: "Editar",
            pt: "Editar",
        }),
        "transaction.fee.amount": t({
            en: "Amount",
            es: "Monto",
            pt: "Valor",
        }),
        "transaction.fee.bankTitle": t({
            en: "Bank fee",
            es: "Comisión del banco",
            pt: "Tarifa bancária",
        }),
        "transaction.fee.comesTo": t({
            en: "a {amount} fee",
            es: "una comisión de {amount}",
            pt: "uma tarifa de {amount}",
        }),
        "transaction.fee.line": t({
            en: "{base} plus {fee}",
            es: "{base} más {fee}",
            pt: "{base} mais {fee}",
        }),
        "transaction.fee.loggedAs": t({
            en: "Logged as",
            es: "Se registra en",
            pt: "Registrada em",
        }),
        "transaction.fee.none": t({
            en: "None",
            es: "Ninguna",
            pt: "Nenhuma",
        }),
        "transaction.fee.note": t({
            en: "Fee · {merchant}",
            es: "Comisión · {merchant}",
            pt: "Tarifa · {merchant}",
        }),
        "transaction.fee.part": t({
            en: "{fee} in fees",
            es: "{fee} de comisión",
            pt: "{fee} de tarifa",
        }),
        "transaction.fee.pays": t({
            en: "{account} pays",
            es: "{account} paga",
            pt: "{account} paga",
        }),
        "transaction.fee.percent": t({
            en: "Percent",
            es: "Porcentaje",
            pt: "Porcentagem",
        }),
        "transaction.fee.title": t({
            en: "Card fee",
            es: "Comisión de la tarjeta",
            pt: "Tarifa do cartão",
        }),
        "transaction.fee.total": t({
            en: "Total with fee",
            es: "Total con comisión",
            pt: "Total com tarifa",
        }),
        "transaction.field.account": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "transaction.field.amount": t({
            en: "Amount",
            es: "Monto",
            pt: "Valor",
        }),
        "transaction.field.category": t({
            en: "Category",
            es: "Categoría",
            pt: "Categoria",
        }),
        "transaction.field.date": t({
            en: "Date",
            es: "Fecha",
            pt: "Data",
        }),
        "transaction.field.ends": t({
            en: "Ends",
            es: "Termina el",
            pt: "Termina em",
        }),
        "transaction.field.name": t({
            en: "Name",
            es: "Nombre",
            pt: "Nome",
        }),
        "transaction.field.namePlaceholder": t({
            en: "Netflix, Groceries…",
            es: "Netflix, Súper…",
            pt: "Netflix, Mercado…",
        }),
        "transaction.field.notes": t({
            en: "Notes",
            es: "Notas",
            pt: "Notas",
        }),
        "transaction.field.notesPlaceholder": t({
            en: "Optional",
            es: "Opcional",
            pt: "Opcional",
        }),
        "transaction.field.remind": t({
            en: "Remind Me",
            es: "Recordarme",
            pt: "Lembrete",
        }),
        "transaction.field.schedule": t({
            en: "Schedule",
            es: "Programación",
            pt: "Recorrência",
        }),
        "transaction.field.time": t({
            en: "Time",
            es: "Hora",
            pt: "Horário",
        }),
        "transaction.identity.autoDetected": t({
            en: "Auto-detected",
            es: "Detectado automáticamente",
            pt: "Detectado automaticamente",
        }),
        "transaction.identity.changePhoto": t({
            en: "Change photo",
            es: "Cambiar foto",
            pt: "Trocar foto",
        }),
        "transaction.identity.changePhotoPrompt": t({
            en: "Tap to change photo",
            es: "Toca para cambiar la foto",
            pt: "Toque para trocar a foto",
        }),
        "transaction.identity.color": t({
            en: "Color",
            es: "Color",
            pt: "Cor",
        }),
        "transaction.identity.colorSwatch": t({
            en: "Color {position} of {total}",
            es: "Color {position} de {total}",
            pt: "Cor {position} de {total}",
        }),
        "transaction.identity.colorUsed": t({
            en: "Already used by another category",
            es: "Ya usada por otra categoría",
            pt: "Já usada por outra categoria",
        }),
        "transaction.identity.hero.chooseIcon": t({
            en: "Choose an icon & color",
            es: "Elige un ícono y color",
            pt: "Escolha um ícone e uma cor",
        }),
        "transaction.identity.hero.icon": t({
            en: "Category icon",
            es: "Ícono de categoría",
            pt: "Ícone da categoria",
        }),
        "transaction.identity.hero.iconHint": t({
            en: "Opens the icon picker",
            es: "Abre el selector de íconos",
            pt: "Abre o seletor de ícones",
        }),
        "transaction.identity.hero.logo": t({
            en: "Add a logo or icon",
            es: "Agrega un logo o ícono",
            pt: "Adicione um logo ou ícone",
        }),
        "transaction.identity.hero.logoHint": t({
            en: "Opens the logo picker",
            es: "Abre el selector de logos",
            pt: "Abre o seletor de logos",
        }),
        "transaction.identity.hero.removeIcon": t({
            en: "Remove icon",
            es: "Quitar ícono",
            pt: "Remover ícone",
        }),
        "transaction.identity.hero.removeLogo": t({
            en: "Remove logo",
            es: "Quitar logo",
            pt: "Remover logo",
        }),
        "transaction.identity.hero.tapToChange": t({
            en: "Tap to change",
            es: "Toca para cambiar",
            pt: "Toque para trocar",
        }),
        "transaction.identity.noIcons": t({
            en: "No icons found",
            es: "No se encontraron íconos",
            pt: "Nenhum ícone encontrado",
        }),
        "transaction.identity.pickPhotoFirst": t({
            en: "Pick a photo first",
            es: "Primero elige una foto",
            pt: "Primeiro escolha uma foto",
        }),
        "transaction.identity.primaryColor": t({
            en: "Primary color from image",
            es: "Color principal de la imagen",
            pt: "Cor principal da imagem",
        }),
        "transaction.identity.searchIcons": t({
            en: "Search icons",
            es: "Buscar íconos",
            pt: "Buscar ícones",
        }),
        "transaction.identity.selectPhoto": t({
            en: "Select photo",
            es: "Seleccionar foto",
            pt: "Selecionar foto",
        }),
        "transaction.identity.selectPhotoPrompt": t({
            en: "Tap to select a photo",
            es: "Toca para elegir una foto",
            pt: "Toque para escolher uma foto",
        }),
        "transaction.identity.tab.emoji": t({
            en: "Emoji",
            es: "Emoji",
            pt: "Emoji",
        }),
        "transaction.identity.tab.icons": t({
            en: "Icons",
            es: "Íconos",
            pt: "Ícones",
        }),
        "transaction.identity.tab.photo": t({
            en: "Photo",
            es: "Foto",
            pt: "Foto",
        }),
        "transaction.interval.day": t({
            en: "day",
            es: "día",
            pt: "dia",
        }),
        "transaction.interval.days": t({
            en: "{count} days",
            es: "{count} días",
            pt: "{count} dias",
        }),
        "transaction.interval.month": t({
            en: "month",
            es: "mes",
            pt: "mês",
        }),
        "transaction.interval.months": t({
            en: "{count} months",
            es: "{count} meses",
            pt: "{count} meses",
        }),
        "transaction.interval.week": t({
            en: "week",
            es: "semana",
            pt: "semana",
        }),
        "transaction.interval.weeks": t({
            en: "{count} weeks",
            es: "{count} semanas",
            pt: "{count} semanas",
        }),
        "transaction.interval.year": t({
            en: "year",
            es: "año",
            pt: "ano",
        }),
        "transaction.interval.years": t({
            en: "{count} years",
            es: "{count} años",
            pt: "{count} anos",
        }),
        "transaction.localData.body": t({
            en: "Outlayr could not open your data. This is often temporary — try again first. Your ledger is still on this device.",
            es: "Outlayr no pudo abrir tus datos. Suele ser algo temporal, así que inténtalo de nuevo. Tu registro sigue en este dispositivo.",
            pt: "O Outlayr não conseguiu abrir seus dados. Isso costuma ser temporário, então tente de novo primeiro. Seus lançamentos continuam neste dispositivo.",
        }),
        "transaction.localData.retrying": t({
            en: "Trying…",
            es: "Intentando…",
            pt: "Tentando…",
        }),
        "transaction.localData.title": t({
            en: "Something Went Wrong",
            es: "Algo salió mal",
            pt: "Algo deu errado",
        }),
        "transaction.lock.checking": t({
            en: "Checking…",
            es: "Verificando…",
            pt: "Verificando…",
        }),
        "transaction.lock.prompt": t({
            en: "Unlock Outlayr",
            es: "Desbloquear Outlayr",
            pt: "Desbloquear Outlayr",
        }),
        "transaction.lock.title": t({
            en: "Outlayr is Locked",
            es: "Outlayr está bloqueado",
            pt: "O Outlayr está bloqueado",
        }),
        "transaction.lock.unlock": t({
            en: "Unlock",
            es: "Desbloquear",
            pt: "Desbloquear",
        }),
        // Not `transaction.field.name`: the sentence's inline field carries that label and both are on screen at once.
        "transaction.merchant.field": t({
            en: "Merchant name",
            es: "Nombre del comercio",
            pt: "Nome do estabelecimento",
        }),
        "transaction.merchant.recent": t({
            en: "Recently",
            es: "Recientes",
            pt: "Recentes",
        }),
        "transaction.new.title": t({
            en: "New",
            es: "Nueva",
            pt: "Novo",
        }),
        "transaction.numpad.clear": t({
            en: "Clear all",
            es: "Borrar todo",
            pt: "Apagar tudo",
        }),
        "transaction.numpad.delete": t({
            en: "Delete",
            es: "Borrar",
            pt: "Apagar",
        }),
        "transaction.paidVia.option.card": t({
            en: "Card",
            es: "Punto",
            pt: "Cartão",
        }),
        "transaction.paidVia.option.cash": t({
            en: "Cash",
            es: "Efectivo",
            pt: "Dinheiro",
        }),
        "transaction.paidVia.option.pagoMovil": t({
            en: "Pago Móvil",
            es: "Pago Móvil",
            pt: "Pago Móvil",
        }),
        "transaction.paidVia.option.sameBankTransfer": t({
            en: "Transfer within the bank",
            es: "Transferencia en el mismo banco",
            pt: "Transferência no mesmo banco",
        }),
        "transaction.paidVia.option.transfer": t({
            en: "Transfer to another bank",
            es: "Transferencia a otro banco",
            pt: "Transferência para outro banco",
        }),
        "transaction.paidVia.title": t({
            en: "How you paid",
            es: "Cómo pagaste",
            pt: "Como você pagou",
        }),
        "transaction.paidVia.value.card": t({
            en: "card",
            es: "punto",
            pt: "cartão",
        }),
        "transaction.paidVia.value.cash": t({
            en: "cash",
            es: "efectivo",
            pt: "dinheiro",
        }),
        "transaction.paidVia.value.pagoMovil": t({
            en: "Pago Móvil",
            es: "Pago Móvil",
            pt: "Pago Móvil",
        }),
        "transaction.paidVia.value.sameBankTransfer": t({
            en: "transfer within the bank",
            es: "transferencia en el mismo banco",
            pt: "transferência no mesmo banco",
        }),
        "transaction.paidVia.value.transfer": t({
            en: "transfer to another bank",
            es: "transferencia a otro banco",
            pt: "transferência para outro banco",
        }),
        "transaction.rate.asOf": t({
            en: "As of {date}",
            es: "Al {date}",
            pt: "Em {date}",
        }),
        "transaction.rate.asOfTime": t({
            en: "As of {time}",
            es: "Hoy, {time}",
            pt: "Hoje, {time}",
        }),
        "transaction.rate.binance": t({
            en: "USDT (Binance)",
            es: "USDT (Binance)",
            pt: "USDT (Binance)",
        }),
        "transaction.rate.custom": t({
            en: "My rate",
            es: "Mi tasa",
            pt: "Minha cotação",
        }),
        "transaction.rate.daysOld_one": t({
            en: "{count} day old · {date}",
            es: "De hace {count} día · {date}",
            pt: "Há {count} dia · {date}",
        }),
        "transaction.rate.daysOld_other": t({
            en: "{count} days old · {date}",
            es: "De hace {count} días · {date}",
            pt: "Há {count} dias · {date}",
        }),
        "transaction.rate.deltaAbove": t({
            en: "{percent} above {source}",
            es: "{percent} sobre la {source}",
            pt: "{percent} acima da {source}",
        }),
        "transaction.rate.deltaBelow": t({
            en: "{percent} below {source}",
            es: "{percent} bajo la {source}",
            pt: "{percent} abaixo da {source}",
        }),
        "transaction.rate.deltaLess": t({
            en: "{amount} less than at {source}",
            es: "{amount} menos que a la {source}",
            pt: "{amount} a menos que pela {source}",
        }),
        "transaction.rate.deltaMore": t({
            en: "{amount} more than at {source}",
            es: "{amount} más que a la {source}",
            pt: "{amount} a mais que pela {source}",
        }),
        "transaction.rate.deltaSame": t({
            en: "Same as {source}",
            es: "Igual a la {source}",
            pt: "Igual à {source}",
        }),
        "transaction.rate.derived": t({
            en: "Rate from what you paid: {rate}",
            es: "Tasa según lo que pagaste: {rate}",
            pt: "Cotação pelo que você pagou: {rate}",
        }),
        "transaction.rate.eur_reference": t({
            en: "EUR (BCV)",
            es: "EUR (BCV)",
            pt: "EUR (BCV)",
        }),
        "transaction.rate.inDollars": t({
            en: "In dollars",
            es: "En dólares",
            pt: "Em dólares",
        }),
        "transaction.rate.lastUsed": t({
            en: "Last used {rate} · {date}",
            es: "Última usada {rate} · {date}",
            pt: "Última usada {rate} · {date}",
        }),
        "transaction.rate.official": t({
            en: "Official",
            es: "Oficial",
            pt: "Oficial",
        }),
        "transaction.rate.officialBcv": t({
            en: "USD (BCV)",
            es: "USD (BCV)",
            pt: "USD (BCV)",
        }),
        "transaction.rate.required": t({
            en: "Type a rate first",
            es: "Primero escribe una tasa",
            pt: "Primeiro digite uma cotação",
        }),
        "transaction.rate.source": t({
            en: "Rate source",
            es: "Fuente de la tasa",
            pt: "Fonte da cotação",
        }),
        "transaction.rate.title": t({
            en: "Rate",
            es: "Tasa",
            pt: "Cotação",
        }),
        "transaction.rate.type": t({
            en: "Type",
            es: "Escribir",
            pt: "Digitar",
        }),
        "transaction.rate.typeHint": t({
            en: "Type the rate you got",
            es: "Escribe la tasa que te dieron",
            pt: "Digite a cotação que você conseguiu",
        }),
        "transaction.rate.unavailable": t({
            en: "Unavailable",
            es: "No disponible",
            pt: "Indisponível",
        }),
        "transaction.rate.unit": t({
            en: "{quote} per {base}",
            es: "{quote} por {base}",
            pt: "{quote} por {base}",
        }),
        "transaction.rate.use": t({
            en: "Use {value}",
            es: "Usar {value}",
            pt: "Usar {value}",
        }),
        "transaction.remind.dayBefore": t({
            en: "1 day before",
            es: "1 día antes",
            pt: "1 dia antes",
        }),
        "transaction.remind.daysBefore": t({
            en: "{count} days before",
            es: "{count} días antes",
            pt: "{count} dias antes",
        }),
        "transaction.remind.off": t({
            en: "Off",
            es: "Desactivado",
            pt: "Desativado",
        }),
        "transaction.remind.sameDay": t({
            en: "On the day",
            es: "El mismo día",
            pt: "No dia",
        }),
        "transaction.remind.weekBefore": t({
            en: "1 week before",
            es: "1 semana antes",
            pt: "1 semana antes",
        }),
        "transaction.save.failedBody": t({
            en: "Nothing was saved. Try again.",
            es: "No se guardó nada. Inténtalo de nuevo.",
            pt: "Nada foi salvo. Tente de novo.",
        }),
        "transaction.save.scheduleFailedBody": t({
            en: "Your subscription was saved, but its charges could not be logged. Outlayr will try again the next time you open it.",
            es: "Tu suscripción se guardó, pero no se pudieron registrar sus cargos. Outlayr volverá a intentarlo la próxima vez que la abras.",
            pt: "Sua assinatura foi salva, mas não foi possível registrar as cobranças. O Outlayr vai tentar de novo na próxima vez que você abrir o app.",
        }),
        "transaction.save.scheduleFailedTitle": t({
            en: "Schedule not applied",
            es: "No se aplicó la programación",
            pt: "Recorrência não aplicada",
        }),
        "transaction.schedule.customOption": t({
            en: "Custom…",
            es: "Personalizado…",
            pt: "Personalizado…",
        }),
        "transaction.schedule.customTitle": t({
            en: "Custom Schedule",
            es: "Programación personalizada",
            pt: "Recorrência personalizada",
        }),
        // Lowercase: it reads mid-sentence on the stage's schedule line.
        "transaction.schedule.ending": t({
            en: "ending",
            es: "hasta el",
            pt: "até",
        }),
        "transaction.schedule.endingOpen": t({
            en: "ending",
            es: "sin",
            pt: "sem",
        }),
        "transaction.schedule.every": t({
            en: "Every {interval}",
            es: "Cada {interval}",
            pt: "A cada {interval}",
        }),
        "transaction.schedule.everyLabel": t({
            en: "Every",
            es: "Cada",
            pt: "A cada",
        }),
        "transaction.schedule.fewer": t({
            en: "Fewer",
            es: "Menos",
            pt: "Menos",
        }),
        "transaction.schedule.firstPaymentTag": t({
            en: "First payment",
            es: "Primer pago",
            pt: "Primeiro pagamento",
        }),
        "transaction.schedule.more": t({
            en: "More",
            es: "Más",
            pt: "Mais",
        }),
        "transaction.schedule.nextCharges": t({
            en: "Next charges",
            es: "Próximos cargos",
            pt: "Próximas cobranças",
        }),
        "transaction.schedule.shortMonthNote": t({
            en: "A month too short for that day charges on its last day instead.",
            es: "Si el mes no tiene ese día, se cobra el último día del mes.",
            pt: "Se o mês não tiver esse dia, a cobrança cai no último dia do mês.",
        }),
        "transaction.schedule.shortMonthTag": t({
            en: "short month",
            es: "mes corto",
            pt: "mês curto",
        }),
        "transaction.schedule.openEnd": t({
            en: "never",
            es: "fecha de fin",
            pt: "data final",
        }),
        // Lowercase, like `transaction.schedule.ending`.
        "transaction.schedule.starting": t({
            en: "starting",
            es: "desde el",
            pt: "a partir de",
        }),
        "transaction.schedule.stopRepeat": t({
            en: "Stop repeating",
            es: "Dejar de repetir",
            pt: "Parar de repetir",
        }),
        "transaction.sentence.add.attach": t({
            en: "attach",
            es: "adjuntar",
            pt: "anexar",
        }),
        "transaction.sentence.add.fee": t({
            en: "fee",
            es: "comisión",
            pt: "tarifa",
        }),
        "transaction.sentence.add.icon": t({
            en: "icon",
            es: "ícono",
            pt: "ícone",
        }),
        "transaction.sentence.add.label": t({
            en: "Add {fact}",
            es: "Agregar {fact}",
            pt: "Adicionar {fact}",
        }),
        "transaction.sentence.add.more": t({
            en: "add",
            es: "agregar",
            pt: "adicionar",
        }),
        "transaction.sentence.add.moreLabel": t({
            en: "Add details",
            es: "Agregar detalles",
            pt: "Adicionar detalhes",
        }),
        "transaction.sentence.add.note": t({
            en: "note",
            es: "nota",
            pt: "nota",
        }),
        "transaction.sentence.add.repeat": t({
            en: "repeat",
            es: "repetir",
            pt: "repetir",
        }),
        "transaction.sentence.add.split": t({
            en: "split",
            es: "dividir",
            pt: "dividir",
        }),
        "transaction.sentence.add.tags": t({
            en: "tags",
            es: "etiquetas",
            pt: "tags",
        }),
        // Nouns, not questions: the template supplies the preposition, so "at {merchant}" must read with the blank in
        // place. The Spanish article carries its noun's gender, so these are not one shared word.
        "transaction.sentence.blank.account": t({
            en: "an account",
            es: "una cuenta",
            pt: "uma conta",
        }),
        "transaction.sentence.blank.category": t({
            en: "a category",
            es: "una categoría",
            pt: "uma categoria",
        }),
        "transaction.sentence.blank.merchant": t({
            en: "a merchant",
            es: "un comercio",
            pt: "um estabelecimento",
        }),
        "transaction.sentence.blank.paidVia": t({
            en: "a payment method",
            es: "un medio de pago",
            pt: "uma forma de pagamento",
        }),
        "transaction.sentence.blank.payer": t({
            en: "a payer",
            es: "un pagador",
            pt: "um pagador",
        }),
        "transaction.sentence.blank.rate": t({
            en: "a rate",
            es: "una tasa",
            pt: "uma cotação",
        }),
        "transaction.sentence.coach": t({
            en: "Every underlined word is yours to change. Tap one, or just keep going below.",
            es: "Puedes cambiar cualquier palabra subrayada. Toca una o sigue abajo.",
            pt: "Você pode mudar qualquer palavra sublinhada. Toque em uma ou continue abaixo.",
        }),
        "transaction.sentence.coachDismiss": t({
            en: "Got it",
            es: "Entendido",
            pt: "Entendi",
        }),
        "transaction.sentence.currency": t({
            en: "Change the amount's currency",
            es: "Cambiar la moneda del monto",
            pt: "Trocar a moeda do valor",
        }),
        // Layout, not just copy: `parseSentence` reads the slot order straight out of these templates.
        "transaction.sentence.expense": t({
            en: "{kind} {amount} at {merchant} for {category} from {account} {when}.",
            es: "{kind} {amount} en {merchant} para {category} con {account} {when}.",
            pt: "{kind} {amount} em {merchant} para {category} com {account} {when}.",
        }),
        "transaction.sentence.extra.note": t({
            en: "Note: {note}",
            es: "Nota: {note}",
            pt: "Nota: {note}",
        }),
        "transaction.sentence.extra.rate": t({
            en: "At {base}1 = {quote}{rate}.",
            es: "A {base}1 = {quote}{rate}.",
            pt: "Cotação: {base}1 = {quote}{rate}.",
        }),
        "transaction.sentence.extra.split": t({
            en: "Split across {parts}.",
            es: "Dividido en {parts}.",
            pt: "Dividido em {parts}.",
        }),
        "transaction.sentence.extra.tags": t({
            en: "Tagged {tags}.",
            es: "Con {tags}.",
            pt: "Tags: {tags}.",
        }),
        "transaction.sentence.income": t({
            en: "{kind} {amount} from {merchant} for {category} into {account} {when}.",
            es: "{kind} {amount} de {merchant} para {category} en {account} {when}.",
            pt: "{kind} {amount} de {merchant} para {category} em {account} {when}.",
        }),
        "transaction.sentence.kind.expense": t({
            en: "Spent",
            es: "Gasté",
            pt: "Gastei",
        }),
        "transaction.sentence.kind.income": t({
            en: "Received",
            es: "Recibí",
            pt: "Recebi",
        }),
        "transaction.sentence.kind.switch": t({
            en: "Expense or income",
            es: "Gasto o ingreso",
            pt: "Despesa ou receita",
        }),
        "transaction.sentence.noAccount": t({
            en: "no account",
            es: "ninguna cuenta",
            pt: "nenhuma conta",
        }),
        "transaction.sentence.optional": t({
            en: "Optional",
            es: "Opcional",
            pt: "Opcional",
        }),
        "transaction.sentence.paidVia": t({
            en: "By {paidVia}.",
            es: "Por {paidVia}.",
            pt: "Via {paidVia}.",
        }),
        "transaction.sentence.paidViaCash": t({
            en: "In {paidVia}.",
            es: "En {paidVia}.",
            pt: "Em {paidVia}.",
        }),
        "transaction.sentence.rate.custom": t({
            en: ", {converted} at {rateSource} rate.",
            es: ", {converted} a {rateSource}.",
            pt: ", {converted} pela {rateSource}.",
        }),
        "transaction.sentence.rate.missing": t({
            en: "It counts in dollars once it has {rate}.",
            es: "Suma en dólares cuando tenga {rate}.",
            pt: "Vai contar em dólares quando tiver {rate}.",
        }),
        "transaction.sentence.rate.provider": t({
            en: ", {converted} at the {rateSource} rate.",
            es: ", {converted} a la tasa {rateSource}.",
            pt: ", {converted} pela cotação {rateSource}.",
        }),
        "transaction.sentence.rateSource.custom": t({
            en: "my",
            es: "mi tasa",
            pt: "minha cotação",
        }),
        "transaction.sentence.rateSource.eur_reference": t({
            en: "EUR (BCV)",
            es: "EUR (BCV)",
            pt: "EUR (BCV)",
        }),
        "transaction.sentence.rateSource.official": t({
            en: "official",
            es: "oficial",
            pt: "oficial",
        }),
        "transaction.sentence.rateSource.officialBcv": t({
            en: "USD (BCV)",
            es: "USD (BCV)",
            pt: "USD (BCV)",
        }),
        "transaction.sentence.set.attach_one": t({
            en: "1 file",
            es: "1 archivo",
            pt: "1 arquivo",
        }),
        "transaction.sentence.set.attach_other": t({
            en: "{count} files",
            es: "{count} archivos",
            pt: "{count} arquivos",
        }),
        "transaction.sentence.set.icon": t({
            en: "Change icon",
            es: "Cambiar ícono",
            pt: "Trocar ícone",
        }),
        "transaction.sentence.set.repeatDaily": t({
            en: "daily",
            es: "diario",
            pt: "diário",
        }),
        "transaction.sentence.set.repeatMonthly": t({
            en: "monthly",
            es: "mensual",
            pt: "mensal",
        }),
        "transaction.sentence.set.repeatWeekly": t({
            en: "weekly",
            es: "semanal",
            pt: "semanal",
        }),
        "transaction.sentence.set.repeatYearly": t({
            en: "yearly",
            es: "anual",
            pt: "anual",
        }),
        "transaction.sentence.set.split_one": t({
            en: "1 way",
            es: "1 parte",
            pt: "1 parte",
        }),
        "transaction.sentence.set.split_other": t({
            en: "{count} ways",
            es: "{count} partes",
            pt: "{count} partes",
        }),
        "transaction.sentence.when.on": t({
            en: "on {date}",
            es: "el {date}",
            pt: "em {date}",
        }),
        "transaction.sentence.when.pick": t({
            en: "Earlier",
            es: "Antes",
            pt: "Outro dia",
        }),
        "transaction.sentence.when.repeating": t({
            en: "every {interval} from {date}",
            es: "cada {interval} desde el {date}",
            pt: "a cada {interval} a partir de {date}",
        }),
        "transaction.sentence.when.today": t({
            en: "today",
            es: "hoy",
            pt: "hoje",
        }),
        "transaction.sentence.when.yesterday": t({
            en: "yesterday",
            es: "ayer",
            pt: "ontem",
        }),
        "transaction.split.addCategory": t({
            en: "Add category",
            es: "Agregar categoría",
            pt: "Adicionar categoria",
        }),
        "transaction.split.balanced": t({
            en: "Balanced",
            es: "Cuadrado",
            pt: "Tudo distribuído",
        }),
        "transaction.split.chooseCategory": t({
            en: "Choose category",
            es: "Elegir categoría",
            pt: "Escolher categoria",
        }),
        "transaction.split.count_one": t({
            en: "{count} category",
            es: "{count} categoría",
            pt: "{count} categoria",
        }),
        "transaction.split.count_other": t({
            en: "{count} categories",
            es: "{count} categorías",
            pt: "{count} categorias",
        }),
        "transaction.split.editAmount": t({
            en: "Edit amount",
            es: "Editar monto",
            pt: "Editar valor",
        }),
        "transaction.split.fillRest": t({
            en: "Give the rest to the last category",
            es: "Dar el resto a la última categoría",
            pt: "Dar o resto à última categoria",
        }),
        "transaction.split.remaining": t({
            en: "Left to allocate",
            es: "Por asignar",
            pt: "Falta distribuir",
        }),
        "transaction.split.removePart": t({
            en: "Remove category",
            es: "Quitar categoría",
            pt: "Remover categoria",
        }),
        "transaction.split.title": t({
            en: "Split",
            es: "Dividir",
            pt: "Dividir",
        }),
        "transaction.split.unbalanced": t({
            en: "The split does not add up to the amount.",
            es: "La división no suma el monto.",
            pt: "A soma da divisão não bate com o valor.",
        }),
        "transaction.stopRecurring.failedBody": t({
            en: "The schedule couldn't be stopped, so the next charge will still be logged.",
            es: "No se pudo detener la programación, así que el próximo cargo se registrará igual.",
            pt: "Não foi possível parar a recorrência, então a próxima cobrança ainda será registrada.",
        }),
        "transaction.stopRecurring.failedTitle": t({
            en: "Still recurring",
            es: "Se sigue repitiendo",
            pt: "Ainda se repete",
        }),
        "transaction.stopRecurring.stopped": t({
            en: "Recurring stopped",
            es: "Ya no se repite",
            pt: "Não se repete mais",
        }),
        "transaction.tags.create": t({
            en: 'Add "{name}"',
            es: 'Agregar "{name}"',
            pt: "Adicionar “{name}”",
        }),
        "transaction.tags.empty": t({
            en: "No tags yet. Type a name to add one.",
            es: "Aún no hay etiquetas. Escribe un nombre para agregar una.",
            pt: "Nenhuma tag ainda. Digite um nome para adicionar uma.",
        }),
        "transaction.tags.searchPlaceholder": t({
            en: "Search or add",
            es: "Buscar o agregar",
            pt: "Buscar ou adicionar",
        }),
        "transaction.tags.title": t({
            en: "Tags",
            es: "Etiquetas",
            pt: "Tags",
        }),
        "transaction.toast.added": t({
            en: "Added",
            es: "Agregada",
            pt: "Adicionado",
        }),
        "transaction.toast.another": t({
            en: "Add another",
            es: "Agregar otra",
            pt: "Adicionar outro",
        }),
        "transaction.toast.subscriptionAdded": t({
            en: "Subscription added",
            es: "Suscripción agregada",
            pt: "Assinatura adicionada",
        }),
        // Bare nouns, unlike `transaction.interval.*`: the sentence styles the count on its own.
        "transaction.unit.day": t({ en: "day", es: "día", pt: "dia" }),
        "transaction.unit.days": t({ en: "days", es: "días", pt: "dias" }),
        "transaction.unit.month": t({ en: "month", es: "mes", pt: "mês" }),
        "transaction.unit.months": t({ en: "months", es: "meses", pt: "meses" }),
        "transaction.unit.week": t({ en: "week", es: "semana", pt: "semana" }),
        "transaction.unit.weeks": t({ en: "weeks", es: "semanas", pt: "semanas" }),
        "transaction.unit.year": t({ en: "year", es: "año", pt: "ano" }),
        "transaction.unit.years": t({ en: "years", es: "años", pt: "anos" }),
    },
    key: "transaction" as const,
} satisfies Dictionary;

export default transaction;
