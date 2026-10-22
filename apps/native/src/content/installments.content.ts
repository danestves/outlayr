import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const installments = {
    content: {
        "installments.apps.add": t({
            en: "Add",
            es: "Agregar",
        }),
        "installments.apps.adding": t({
            en: "Adding…",
            es: "Agregando…",
        }),
        "installments.apps.in": t({
            en: "Installments in {country}",
            es: "Cuotas en {country}",
        }),
        "installments.apps.missing": t({
            en: "Not here? Use Other and type its name.",
            es: "¿No está? Usa Otra y escribe el nombre.",
        }),
        "installments.apps.other": t({
            en: "Other",
            es: "Otra",
        }),
        "installments.apps.search": t({
            en: "Find your app",
            es: "Busca tu app",
        }),
        "installments.bought": t({
            en: "Bought {date} for {price}",
            es: "Comprado el {date} por {price}",
        }),
        "installments.chip": t({
            en: "Installments",
            es: "Cuotas",
        }),
        "installments.chipSet": t({
            en: "{count} × {amount}",
            es: "{count} × {amount}",
        }),
        "installments.comingUp": t({
            en: "Coming up",
            es: "Próximas cuotas",
        }),
        "installments.country.AE": t({
            en: "United Arab Emirates",
            es: "Emiratos Árabes Unidos",
        }),
        "installments.country.AT": t({
            en: "Austria",
            es: "Austria",
        }),
        "installments.country.AU": t({
            en: "Australia",
            es: "Australia",
        }),
        "installments.country.CA": t({
            en: "Canada",
            es: "Canadá",
        }),
        "installments.country.CO": t({
            en: "Colombia",
            es: "Colombia",
        }),
        "installments.country.DE": t({
            en: "Germany",
            es: "Alemania",
        }),
        "installments.country.ES": t({
            en: "Spain",
            es: "España",
        }),
        "installments.country.FR": t({
            en: "France",
            es: "Francia",
        }),
        "installments.country.GB": t({
            en: "the UK",
            es: "Reino Unido",
        }),
        "installments.country.IT": t({
            en: "Italy",
            es: "Italia",
        }),
        "installments.country.JP": t({
            en: "Japan",
            es: "Japón",
        }),
        "installments.country.MX": t({
            en: "Mexico",
            es: "México",
        }),
        "installments.country.NL": t({
            en: "the Netherlands",
            es: "Países Bajos",
        }),
        "installments.country.NZ": t({
            en: "New Zealand",
            es: "Nueva Zelanda",
        }),
        "installments.country.SA": t({
            en: "Saudi Arabia",
            es: "Arabia Saudita",
        }),
        "installments.country.SE": t({
            en: "Sweden",
            es: "Suecia",
        }),
        "installments.country.SG": t({
            en: "Singapore",
            es: "Singapur",
        }),
        "installments.country.US": t({
            en: "the US",
            es: "Estados Unidos",
        }),
        "installments.country.VE": t({
            en: "Venezuela",
            es: "Venezuela",
        }),
        "installments.cuota": t({
            en: "Installment {index} of {count}",
            es: "Cuota {index} de {count}",
        }),
        "installments.cuota.amount": t({
            en: "Amount",
            es: "Monto",
        }),
        "installments.cuota.delete": t({
            en: "Delete installment",
            es: "Eliminar cuota",
        }),
        "installments.cuota.due": t({
            en: "Due",
            es: "Vence",
        }),
        "installments.deletePending": t({
            en: "Delete pending installments",
            es: "Eliminar cuotas pendientes",
        }),
        "installments.deletePending.body": t({
            en: "What's already paid stays.",
            es: "Lo ya pagado se queda.",
        }),
        "installments.each": t({
            en: "Each",
            es: "Cada una",
        }),
        "installments.every": t({
            en: "Every",
            es: "Cada",
        }),
        "installments.every.days14": t({
            en: "14 days",
            es: "14 días",
        }),
        "installments.every.days14.providers": t({
            en: "Cashea, Klarna, Afterpay",
            es: "Cashea, Klarna, Afterpay",
        }),
        "installments.every.days15": t({
            en: "15 days",
            es: "15 días",
        }),
        "installments.every.days15.providers": t({
            en: "Aplazo, Krece",
            es: "Aplazo, Krece",
        }),
        "installments.every.fifteenthAndLast": t({
            en: "15th and last day",
            es: "Día 15 y último día",
        }),
        "installments.every.fifteenthAndLast.providers": t({
            en: "Kueski",
            es: "Kueski",
        }),
        "installments.every.firstAndSixteenth": t({
            en: "1st and 16th",
            es: "Día 1 y 16",
        }),
        "installments.every.firstAndSixteenth.providers": t({
            en: "Lysto",
            es: "Lysto",
        }),
        "installments.every.monthly": t({
            en: "Every month",
            es: "Cada mes",
        }),
        "installments.every.monthly.providers": t({
            en: "Cards, Addi, Mercado Pago",
            es: "Tarjetas, Addi, Mercado Pago",
        }),
        "installments.every.weekly": t({
            en: "Every week",
            es: "Cada semana",
        }),
        "installments.failedBody": t({
            en: "Nothing was changed. Try again.",
            es: "No se cambió nada. Inténtalo de nuevo.",
        }),
        "installments.failedTitle": t({
            en: "Couldn't save",
            es: "No se pudo guardar",
        }),
        "installments.fee.add": t({
            en: "Add late fee",
            es: "Agregar recargo",
        }),
        "installments.fee.breakdown": t({
            en: "{amount} + {fee} late fee",
            es: "{amount} + {fee} recargo",
        }),
        "installments.fee.extra": t({
            en: "+ {fee} late fee",
            es: "+ {fee} recargo",
        }),
        "installments.fee.label": t({
            en: "Late fee",
            es: "Recargo",
        }),
        "installments.fee.note": t({
            en: "Late fee · {order}",
            es: "Recargo · {order}",
        }),
        "installments.fee.remove": t({
            en: "Remove late fee",
            es: "Quitar recargo",
        }),
        "installments.fee.suggest": t({
            en: "Charged a late fee?",
            es: "¿Te cobraron recargo?",
        }),
        "installments.finished_one": t({
            en: "{count} paid off",
            es: "{count} pagada",
        }),
        "installments.finished_other": t({
            en: "{count} paid off",
            es: "{count} pagadas",
        }),
        "installments.firstDue": t({
            en: "First due",
            es: "Primera cuota",
        }),
        "installments.forOrder": t({
            en: "{order} · {index} of {count}",
            es: "{order} · {index} de {count}",
        }),
        "installments.from": t({
            en: "From",
            es: "Desde",
        }),
        "installments.from.none": t({
            en: "None",
            es: "Ninguna",
        }),
        "installments.from.outside": t({
            en: "Paid outside Outlayr. You owe {account} less, no bank changes.",
            es: "Pagado fuera de Outlayr. Le debes menos a {account} y ningún banco cambia.",
        }),
        "installments.inDays_one": t({
            en: "in {count} day",
            es: "en {count} día",
        }),
        "installments.inDays_other": t({
            en: "in {count} days",
            es: "en {count} días",
        }),
        "installments.leftToPay": t({
            en: "Left to pay",
            es: "Por pagar",
        }),
        "installments.newPurchase": t({
            en: "New purchase in installments",
            es: "Nueva compra en cuotas",
        }),
        "installments.next": t({
            en: "Next {date}",
            es: "Próxima {date}",
        }),
        "installments.noRate": t({
            en: "No rate for this day yet, so the amount can't be converted.",
            es: "Aún no hay tasa para este día, así que no se puede convertir el monto.",
        }),
        "installments.none": t({
            en: "None",
            es: "Ninguno",
        }),
        "installments.notFromAccount": t({
            en: "not from an account",
            es: "no salió de una cuenta",
        }),
        "installments.nothingLeft": t({
            en: "The upfront covers the whole price.",
            es: "La inicial cubre todo el precio.",
        }),
        "installments.order": t({
            en: "Order",
            es: "Orden",
        }),
        "installments.orders": t({
            en: "Orders",
            es: "Órdenes",
        }),
        "installments.overPrice": t({
            en: "{amount} over the price",
            es: "{amount} más que el precio",
        }),
        "installments.overdue": t({
            en: "Overdue",
            es: "Vencida",
        }),
        "installments.paid": t({
            en: "Paid",
            es: "Pagada",
        }),
        "installments.paidAction": t({
            en: "Paid",
            es: "Pagué",
        }),
        "installments.paidBefore": t({
            en: "Paid before Outlayr",
            es: "Pagada antes de Outlayr",
        }),
        "installments.paidNow": t({
            en: "Paid now",
            es: "Pagado ahora",
        }),
        "installments.paidOutside": t({
            en: "Paid outside Outlayr",
            es: "Pagado fuera de Outlayr",
        }),
        "installments.partly": t({
            en: "{amount} in",
            es: "{amount} abonado",
        }),
        "installments.pay": t({
            en: "Pay {amount}",
            es: "Pagar {amount}",
        }),
        "installments.pay.converted": t({
            en: "{amount} at {rate}",
            es: "{amount} a {rate}",
        }),
        "installments.pay.date": t({
            en: "Date",
            es: "Fecha",
        }),
        "installments.pay.for": t({
            en: "For",
            es: "Para",
        }),
        "installments.pay.title": t({
            en: "Pay",
            es: "Pagar",
        }),
        "installments.pay.to": t({
            en: "Pay {account}",
            es: "Pagar {account}",
        }),
        "installments.payAll": t({
            en: "Pay all {amount}",
            es: "Pagar todo {amount}",
        }),
        "installments.plan.cuotas_one": t({
            en: "{count} installment",
            es: "{count} cuota",
        }),
        "installments.plan.cuotas_other": t({
            en: "{count} installments",
            es: "{count} cuotas",
        }),
        "installments.plan.everyDays_one": t({
            en: "{cuotas} every day",
            es: "{cuotas} cada día",
        }),
        "installments.plan.everyDays_other": t({
            en: "{cuotas} every {count} days",
            es: "{cuotas} cada {count} días",
        }),
        "installments.plan.everyMonths_one": t({
            en: "{cuotas} every month",
            es: "{cuotas} cada mes",
        }),
        "installments.plan.everyMonths_other": t({
            en: "{cuotas} every {count} months",
            es: "{cuotas} cada {count} meses",
        }),
        "installments.plan.semimonthly": t({
            en: "{cuotas} on days {first} and {second}",
            es: "{cuotas} los días {first} y {second}",
        }),
        "installments.plan.semimonthlyLast": t({
            en: "{cuotas} on day {first} and the last day",
            es: "{cuotas} el día {first} y el último día",
        }),
        "installments.plan.upfront": t({
            en: "Upfront + {plan}",
            es: "Inicial + {plan}",
        }),
        "installments.plan.weekly": t({
            en: "{cuotas} every week",
            es: "{cuotas} cada semana",
        }),
        "installments.reminder.ask": t({
            en: "Remind you the day before each installment?",
            es: "¿Te aviso el día antes de cada cuota?",
        }),
        "installments.reminder.body": t({
            en: "{amount} to {account}. Tap when it's paid.",
            es: "{amount} a {account}. Toca cuando la pagues.",
        }),
        "installments.reminder.bodyHidden": t({
            en: "{account}. Tap when it's paid.",
            es: "{account}. Toca cuando la pagues.",
        }),
        "installments.reminder.title": t({
            en: "{order} is due tomorrow",
            es: "{order} vence mañana",
        }),
        "installments.reminder.turnOn": t({
            en: "Turn on",
            es: "Activar",
        }),
        "installments.scan.choose": t({
            en: "Choose screenshot",
            es: "Elegir captura",
        }),
        "installments.scan.currency": t({
            en: "This plan is in {plan} and {account} is in {currency}.",
            es: "Este plan está en {plan} y {account} está en {currency}.",
        }),
        "installments.scan.import": t({
            en: "Import from a screenshot",
            es: "Importar desde una captura",
        }),
        "installments.scan.intro": t({
            en: "A screenshot of the order's payment plan.",
            es: "Una captura del plan de pagos de la orden.",
        }),
        "installments.scan.notConfigured": t({
            en: "Importing a screenshot needs the cloud tier.",
            es: "Para importar una captura se necesita el servicio en la nube.",
        }),
        "installments.scan.provider": t({
            en: "Couldn't read the plan.",
            es: "No pude leer el plan.",
        }),
        "installments.scan.reading": t({
            en: "Reading the plan…",
            es: "Leyendo el plan…",
        }),
        "installments.scan.unauthenticated": t({
            en: "Sign in to import a screenshot.",
            es: "Inicia sesión para importar una captura.",
        }),
        "installments.scan.unclear": t({
            en: "Didn't find a payment plan in that image.",
            es: "No encontré un plan de cuotas en esa imagen.",
        }),
        "installments.schedule": t({
            en: "Schedule",
            es: "Cronograma",
        }),
        "installments.then": t({
            en: "Then",
            es: "Luego",
        }),
        "installments.total": t({
            en: "Total",
            es: "Total",
        }),
        "installments.upfront": t({
            en: "Upfront",
            es: "Inicial",
        }),
    },
    key: "installments" as const,
} satisfies Dictionary;

export default installments;
