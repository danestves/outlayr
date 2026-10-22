import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const debts = {
    content: {
        "debts.a11y.amount": t({
            en: "Edit amount",
            es: "Editar el monto",
        }),
        "debts.a11y.more": t({
            en: "More",
            es: "Más",
        }),
        "debts.action.borrow": t({
            en: "Borrow",
            es: "Pedir prestado",
        }),
        "debts.action.borrowMore": t({
            en: "Borrow more",
            es: "Pedir más",
        }),
        "debts.action.gotPaidBack": t({
            en: "Got paid back",
            es: "Me pagó",
        }),
        "debts.action.lend": t({
            en: "Lend",
            es: "Prestar",
        }),
        "debts.action.lendMore": t({
            en: "Lend more",
            es: "Prestar más",
        }),
        "debts.action.payBack": t({
            en: "Pay back",
            es: "Pagar",
        }),
        "debts.add.liability": t({
            en: "A company, card or loan",
            es: "Una empresa, tarjeta o préstamo",
        }),
        "debts.add.owe": t({
            en: "Something I owe",
            es: "Algo que debo pagar",
        }),
        "debts.add.person": t({
            en: "A person",
            es: "Una persona",
        }),
        "debts.due.overdue_one": t({
            en: "{count} payment · {name} overdue since {date}",
            es: "{count} pago · {name} con atraso desde el {date}",
        }),
        "debts.due.overdue_other": t({
            en: "{count} payments · {name} overdue since {date}",
            es: "{count} pagos · {name} con atraso desde el {date}",
        }),
        "debts.due.summary_one": t({
            en: "{count} payment · next {name}, {date}",
            es: "{count} pago · próximo {name}, {date}",
        }),
        "debts.due.summary_other": t({
            en: "{count} payments · next {name}, {date}",
            es: "{count} pagos · próximo {name}, {date}",
        }),
        "debts.due.title": t({
            en: "Due in the next {days} days",
            es: "Por pagar en los próximos {days} días",
        }),
        "debts.error.saveFailed": t({
            en: "Couldn't save this debt. Try again.",
            es: "No se pudo guardar la deuda. Inténtalo de nuevo.",
        }),
        "debts.field.accountFrom": t({
            en: "From",
            es: "Desde",
        }),
        "debts.field.accountInto": t({
            en: "Into",
            es: "En",
        }),
        "debts.field.before": t({
            en: "None, it was before Outlayr",
            es: "Ninguna, fue antes de Outlayr",
        }),
        "debts.field.outside": t({
            en: "Outside Outlayr",
            es: "Fuera de Outlayr",
        }),
        "debts.field.currency": t({
            en: "Currency",
            es: "Moneda",
        }),
        "debts.field.date": t({
            en: "Date",
            es: "Fecha",
        }),
        "debts.field.note": t({
            en: "Note",
            es: "Nota",
        }),
        "debts.field.notePlaceholder": t({
            en: "Optional",
            es: "Opcional",
        }),
        "debts.field.personFrom": t({
            en: "From",
            es: "De",
        }),
        "debts.field.personPlaceholder": t({
            en: "Name",
            es: "Nombre",
        }),
        "debts.field.personTo": t({
            en: "To",
            es: "Para",
        }),
        "debts.field.theirSide": t({
            en: "In {currency}",
            es: "En {currency}",
        }),
        "debts.new.title": t({
            en: "New Debt",
            es: "Nueva deuda",
        }),
        "debts.next.of": t({
            en: "Next {amount} · {date} · {paid} of {total}",
            es: "Próxima {amount} · {date} · {paid} de {total}",
        }),
        "debts.next.orders": t({
            en: "Next {amount} · {date} · {count} orders",
            es: "Próxima {amount} · {date} · {count} órdenes",
        }),
        "debts.overdue.of": t({
            en: "{amount} · {date} · {paid} of {total}",
            es: "{amount} · {date} · {paid} de {total}",
        }),
        "debts.overdue.orders": t({
            en: "{amount} · {date} · {count} orders",
            es: "{amount} · {date} · {count} órdenes",
        }),
        "debts.overview.due": t({
            en: "{amount} due in {days} days",
            es: "{amount} por pagar en {days} días",
        }),
        "debts.overview.owedToYou": t({
            en: "Owed to you {amount}",
            es: "Te deben {amount}",
        }),
        "debts.owe.blank.what": t({
            en: "something",
            es: "algo",
        }),
        "debts.owe.blank.who": t({
            en: "someone",
            es: "alguien",
        }),
        "debts.owe.chip.friday": t({
            en: "Friday {day}",
            es: "Viernes {day}",
        }),
        "debts.owe.chip.monthEnd": t({
            en: "End of month",
            es: "Fin de mes",
        }),
        "debts.owe.chip.none": t({
            en: "No date",
            es: "Sin fecha",
        }),
        "debts.owe.chip.tomorrow": t({
            en: "Tomorrow",
            es: "Mañana",
        }),
        "debts.owe.field.amount": t({
            en: "Amount",
            es: "Monto",
        }),
        "debts.owe.field.category": t({
            en: "Category",
            es: "Categoría",
        }),
        "debts.owe.field.what": t({
            en: "What for",
            es: "Por qué",
        }),
        "debts.owe.field.when": t({
            en: "I'll pay",
            es: "Le pago",
        }),
        "debts.owe.field.who": t({
            en: "Who",
            es: "A quién",
        }),
        "debts.owe.remind": t({
            en: "I'll remind you the day before.",
            es: "Te aviso el día antes.",
        }),
        "debts.owe.sentence": t({
            en: "I owe {amount} to {who} for {what} in {category}.",
            es: "Le debo {amount} a {who} por {what} para {category}.",
        }),
        "debts.owe.title": t({
            en: "Something I Owe",
            es: "Algo que debo",
        }),
        "debts.owe.what.placeholder": t({
            en: "Plumbing, a repair",
            es: "Plomería, una reparación",
        }),
        "debts.owe.when": t({
            en: "I'll pay {when}.",
            es: "Le pago {when}.",
        }),
        "debts.owe.when.friday": t({
            en: "on Friday {day}",
            es: "el viernes {day}",
        }),
        "debts.owe.when.monthEnd": t({
            en: "at the end of the month",
            es: "a fin de mes",
        }),
        "debts.owe.when.none": t({
            en: "when I can",
            es: "cuando pueda",
        }),
        "debts.owe.when.tomorrow": t({
            en: "tomorrow",
            es: "mañana",
        }),
        "debts.owe.who.placeholder": t({
            en: "A person or company",
            es: "Una persona o empresa",
        }),
        "debts.people": t({
            en: "People",
            es: "Personas",
        }),
        "debts.person.deleteBody": t({
            en: "Everything recorded with them is deleted too.",
            es: "También se borra todo lo registrado con esta persona.",
        }),
        "debts.person.empty": t({
            en: "What moves between you two will gather here.",
            es: "Aquí vas a ver lo que se mueva entre ustedes.",
        }),
        "debts.person.owesYou": t({
            en: "Owes you",
            es: "Te debe",
        }),
        "debts.person.rename": t({
            en: "Rename",
            es: "Cambiar nombre",
        }),
        "debts.person.settled": t({
            en: "Settled",
            es: "Saldado",
        }),
        "debts.person.youOwe": t({
            en: "You owe",
            es: "Le debes",
        }),
        "debts.plan.behind": t({
            en: "{amount} behind",
            es: "{amount} de atraso",
        }),
        "debts.plan.by": t({
            en: "{amount} by {date}",
            es: "{amount} para el {date}",
        }),
        "debts.plan.byDays_one": t({
            en: "{amount} by {date} · {count} day",
            es: "{amount} para el {date} · {count} día",
        }),
        "debts.plan.byDays_other": t({
            en: "{amount} by {date} · {count} days",
            es: "{amount} para el {date} · {count} días",
        }),
        "debts.plan.change": t({
            en: "Change plan",
            es: "Cambiar plan",
        }),
        "debts.plan.commit": t({
            en: "Set plan",
            es: "Crear plan",
        }),
        "debts.plan.demandDays_one": t({
            en: "{amount} in {count} day",
            es: "{amount} en {count} día",
        }),
        "debts.plan.demandDays_other": t({
            en: "{amount} in {count} days",
            es: "{amount} en {count} días",
        }),
        "debts.plan.demandMonth": t({
            en: "{amount} a month",
            es: "{amount} al mes",
        }),
        "debts.plan.failed": t({
            en: "Couldn't save this plan. Try again.",
            es: "No se pudo guardar el plan. Inténtalo de nuevo.",
        }),
        "debts.plan.paidBack": t({
            en: "Paid back {date}",
            es: "Saldado el {date}",
        }),
        "debts.plan.paidOff": t({
            en: "Paid off {date}",
            es: "Pagado el {date}",
        }),
        "debts.plan.payBackBy": t({
            en: "Pay back by",
            es: "Fecha de pago",
        }),
        "debts.plan.payOffBy": t({
            en: "Pay off by",
            es: "Fecha de pago",
        }),
        "debts.plan.perMonth": t({
            en: "{amount} a month until {date}",
            es: "{amount} al mes hasta el {date}",
        }),
        "debts.plan.remove": t({
            en: "Remove plan",
            es: "Quitar plan",
        }),
        "debts.plan.row": t({
            en: "By {date}",
            es: "Para el {date}",
        }),
        "debts.plan.rowBehind": t({
            en: "By {date}, {amount} behind",
            es: "Para el {date}, {amount} de atraso",
        }),
        "debts.plan.save": t({
            en: "Save plan",
            es: "Guardar plan",
        }),
        "debts.plan.stated.liability": t({
            en: "Pay off {account} by {date}",
            es: "Paga {account} para el {date}",
        }),
        "debts.plan.stated.owesYou": t({
            en: "{account} pays you back by {date}",
            es: "{account} te paga para el {date}",
        }),
        "debts.plan.stated.youOwe": t({
            en: "You pay {account} back by {date}",
            es: "Le pagas a {account} para el {date}",
        }),
        "debts.purchase.title": t({
            en: "Bought on credit",
            es: "Compra a crédito",
        }),
        "debts.reminder.ask": t({
            en: "Remind you the day before you pay?",
            es: "¿Te aviso el día antes de pagar?",
        }),
        "debts.reminder.body": t({
            en: "You owe {amount}. Tap when it's paid.",
            es: "Le debes {amount}. Toca cuando le pagues.",
        }),
        "debts.reminder.bodyHidden": t({
            en: "Tap when it's paid.",
            es: "Toca cuando le pagues.",
        }),
        "debts.reminder.title": t({
            en: "You pay {person} tomorrow",
            es: "Mañana le pagas a {person}",
        }),
        "debts.sale.title": t({
            en: "Sold on credit",
            es: "Venta a crédito",
        }),
        "debts.settled": t({
            en: "Settled · {count}",
            es: "Saldados · {count}",
        }),
        "debts.title": t({
            en: "Debts",
            es: "Deudas",
        }),
        "debts.verb.borrowed": t({
            en: "I borrowed",
            es: "Me prestaron",
        }),
        "debts.verb.lent": t({
            en: "I lent",
            es: "Presté",
        }),
        "debts.verb.soldOnCredit": t({
            en: "Sold on credit",
            es: "Vendí a crédito",
        }),
        "debts.youOweAmount": t({
            en: "You owe {amount}",
            es: "Debes {amount}",
        }),
    },
    key: "debts" as const,
} satisfies Dictionary;

export default debts;
