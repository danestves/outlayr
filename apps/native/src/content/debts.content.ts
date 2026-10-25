import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const debts = {
    content: {
        "debts.a11y.amount": t({
            en: "Edit amount",
            es: "Editar el monto",
            "es-ES": "Editar el importe",
            pt: "Editar o valor",
        }),
        "debts.a11y.more": t({
            en: "More",
            es: "Más",
            pt: "Mais",
        }),
        "debts.action.borrow": t({
            en: "Borrow",
            es: "Pedir prestado",
            pt: "Pegar emprestado",
            "pt-PT": "Pedir emprestado",
        }),
        "debts.action.borrowMore": t({
            en: "Borrow more",
            es: "Pedir más",
            pt: "Pegar mais",
            "pt-PT": "Pedir mais",
        }),
        "debts.action.gotPaidBack": t({
            en: "Got paid back",
            es: "Me pagó",
            pt: "Me pagou",
            "pt-PT": "Pagou-me",
        }),
        "debts.action.lend": t({
            en: "Lend",
            es: "Prestar",
            pt: "Emprestar",
        }),
        "debts.action.lendMore": t({
            en: "Lend more",
            es: "Prestar más",
            pt: "Emprestar mais",
        }),
        "debts.action.payBack": t({
            en: "Pay back",
            es: "Pagar",
            pt: "Pagar",
        }),
        "debts.add.liability": t({
            en: "A company, card or loan",
            es: "Una empresa, tarjeta o préstamo",
            pt: "Uma empresa, cartão ou empréstimo",
        }),
        "debts.add.owe": t({
            en: "Something I owe",
            es: "Algo que debo pagar",
            pt: "Algo que eu devo",
        }),
        "debts.add.person": t({
            en: "A person",
            es: "Una persona",
            pt: "Uma pessoa",
        }),
        "debts.due.overdue_one": t({
            en: "{count} payment · {name} overdue since {date}",
            es: "{count} pago · {name} con atraso desde el {date}",
            pt: "{count} pagamento · {name} em atraso desde {date}",
        }),
        "debts.due.overdue_other": t({
            en: "{count} payments · {name} overdue since {date}",
            es: "{count} pagos · {name} con atraso desde el {date}",
            pt: "{count} pagamentos · {name} em atraso desde {date}",
        }),
        "debts.due.summary_one": t({
            en: "{count} payment · next {name}, {date}",
            es: "{count} pago · próximo {name}, {date}",
            pt: "{count} pagamento · próximo: {name}, {date}",
        }),
        "debts.due.summary_other": t({
            en: "{count} payments · next {name}, {date}",
            es: "{count} pagos · próximo {name}, {date}",
            pt: "{count} pagamentos · próximo: {name}, {date}",
        }),
        "debts.due.title": t({
            en: "Due in the next {days} days",
            es: "Por pagar en los próximos {days} días",
            pt: "A pagar nos próximos {days} dias",
        }),
        "debts.error.saveFailed": t({
            en: "Couldn't save this debt. Try again.",
            es: "No se pudo guardar la deuda. Inténtalo de nuevo.",
            pt: "Não foi possível salvar esta dívida. Tente de novo.",
            "pt-PT": "Não foi possível guardar esta dívida. Tente de novo.",
        }),
        "debts.field.accountFrom": t({
            en: "From",
            es: "Desde",
            pt: "De",
        }),
        "debts.field.accountInto": t({
            en: "Into",
            es: "En",
            pt: "Para",
        }),
        "debts.field.before": t({
            en: "None, it was before Outlayr",
            es: "Ninguna, fue antes de Outlayr",
            pt: "Nenhuma, foi antes do Outlayr",
        }),
        "debts.field.outside": t({
            en: "Outside Outlayr",
            es: "Fuera de Outlayr",
            pt: "Fora do Outlayr",
        }),
        "debts.field.currency": t({
            en: "Currency",
            es: "Moneda",
            pt: "Moeda",
        }),
        "debts.field.date": t({
            en: "Date",
            es: "Fecha",
            pt: "Data",
        }),
        "debts.field.note": t({
            en: "Note",
            es: "Nota",
            pt: "Nota",
        }),
        "debts.field.notePlaceholder": t({
            en: "Optional",
            es: "Opcional",
            pt: "Opcional",
        }),
        "debts.field.personFrom": t({
            en: "From",
            es: "De",
            pt: "De",
        }),
        "debts.field.personPlaceholder": t({
            en: "Name",
            es: "Nombre",
            pt: "Nome",
        }),
        "debts.field.personTo": t({
            en: "To",
            es: "Para",
            pt: "Para",
        }),
        "debts.field.theirSide": t({
            en: "In {currency}",
            es: "En {currency}",
            pt: "Em {currency}",
        }),
        "debts.new.title": t({
            en: "New Debt",
            es: "Nueva deuda",
            pt: "Nova dívida",
        }),
        "debts.next.of": t({
            en: "Next {amount} · {date} · {paid} of {total}",
            es: "Próxima {amount} · {date} · {paid} de {total}",
            pt: "Próxima {amount} · {date} · {paid} de {total}",
        }),
        "debts.next.orders": t({
            en: "Next {amount} · {date} · {count} orders",
            es: "Próxima {amount} · {date} · {count} órdenes",
            "es-ES": "Próxima {amount} · {date} · {count} pedidos",
            pt: "Próxima {amount} · {date} · {count} compras",
        }),
        "debts.overdue.of": t({
            en: "{amount} · {date} · {paid} of {total}",
            es: "{amount} · {date} · {paid} de {total}",
            pt: "{amount} · {date} · {paid} de {total}",
        }),
        "debts.overdue.orders": t({
            en: "{amount} · {date} · {count} orders",
            es: "{amount} · {date} · {count} órdenes",
            "es-ES": "{amount} · {date} · {count} pedidos",
            pt: "{amount} · {date} · {count} compras",
        }),
        "debts.overview.due": t({
            en: "{amount} due in {days} days",
            es: "{amount} por pagar en {days} días",
            pt: "{amount} a pagar em {days} dias",
        }),
        "debts.overview.owedToYou": t({
            en: "Owed to you {amount}",
            es: "Te deben {amount}",
            pt: "Te devem {amount}",
            "pt-PT": "Devem-lhe {amount}",
        }),
        "debts.owe.blank.what": t({
            en: "something",
            es: "algo",
            pt: "algo",
        }),
        "debts.owe.blank.who": t({
            en: "someone",
            es: "alguien",
            pt: "alguém",
        }),
        "debts.owe.chip.friday": t({
            en: "Friday {day}",
            es: "Viernes {day}",
            pt: "Sexta {day}",
        }),
        "debts.owe.chip.monthEnd": t({
            en: "End of month",
            es: "Fin de mes",
            pt: "Fim do mês",
        }),
        "debts.owe.chip.none": t({
            en: "No date",
            es: "Sin fecha",
            pt: "Sem data",
        }),
        "debts.owe.chip.tomorrow": t({
            en: "Tomorrow",
            es: "Mañana",
            pt: "Amanhã",
        }),
        "debts.owe.field.amount": t({
            en: "Amount",
            es: "Monto",
            "es-ES": "Importe",
            pt: "Valor",
        }),
        "debts.owe.field.category": t({
            en: "Category",
            es: "Categoría",
            pt: "Categoria",
        }),
        "debts.owe.field.what": t({
            en: "What for",
            es: "Por qué",
            pt: "Pelo quê",
        }),
        "debts.owe.field.when": t({
            en: "I'll pay",
            es: "Le pago",
            pt: "Vou pagar",
        }),
        "debts.owe.field.who": t({
            en: "Who",
            es: "A quién",
            pt: "A quem",
        }),
        "debts.owe.remind": t({
            en: "I'll remind you the day before.",
            es: "Te aviso el día antes.",
            pt: "Te aviso um dia antes.",
            "pt-PT": "Aviso um dia antes.",
        }),
        "debts.owe.sentence": t({
            en: "I owe {amount} to {who} for {what} in {category}.",
            es: "Le debo {amount} a {who} por {what} para {category}.",
            pt: "Devo {amount} a {who} por {what} em {category}.",
        }),
        "debts.owe.title": t({
            en: "Something I Owe",
            es: "Algo que debo",
            pt: "Algo que eu devo",
        }),
        "debts.owe.what.placeholder": t({
            en: "Plumbing, a repair",
            es: "Plomería, una reparación",
            "es-ES": "Fontanería, una reparación",
            pt: "Encanamento, um conserto",
            "pt-PT": "Canalização, uma reparação",
        }),
        "debts.owe.when": t({
            en: "I'll pay {when}.",
            es: "Le pago {when}.",
            pt: "Vou pagar {when}.",
        }),
        "debts.owe.when.friday": t({
            en: "on Friday {day}",
            es: "el viernes {day}",
            pt: "na sexta, dia {day}",
        }),
        "debts.owe.when.monthEnd": t({
            en: "at the end of the month",
            es: "a fin de mes",
            pt: "no fim do mês",
        }),
        "debts.owe.when.none": t({
            en: "when I can",
            es: "cuando pueda",
            pt: "quando puder",
        }),
        "debts.owe.when.tomorrow": t({
            en: "tomorrow",
            es: "mañana",
            pt: "amanhã",
        }),
        "debts.owe.who.placeholder": t({
            en: "A person or company",
            es: "Una persona o empresa",
            pt: "Uma pessoa ou empresa",
        }),
        "debts.people": t({
            en: "People",
            es: "Personas",
            pt: "Pessoas",
        }),
        "debts.person.deleteBody": t({
            en: "Everything recorded with them is deleted too.",
            es: "También se borra todo lo registrado con esta persona.",
            pt: "Tudo o que foi registrado com essa pessoa também é apagado.",
            "pt-PT": "Tudo o que foi registado com essa pessoa também é apagado.",
        }),
        "debts.person.empty": t({
            en: "What moves between you two will gather here.",
            es: "Aquí vas a ver lo que se mueva entre ustedes.",
            "es-ES": "Aquí vas a ver lo que se mueva entre vosotros.",
            pt: "O que acontecer entre vocês aparece aqui.",
            "pt-PT": "O que acontecer entre os dois aparece aqui.",
        }),
        "debts.person.owesYou": t({
            en: "Owes you",
            es: "Te debe",
            pt: "Te deve",
            "pt-PT": "Deve-lhe",
        }),
        "debts.person.rename": t({
            en: "Rename",
            es: "Cambiar nombre",
            pt: "Renomear",
        }),
        "debts.person.settled": t({
            en: "Settled",
            es: "Saldado",
            pt: "Quites",
        }),
        "debts.person.youOwe": t({
            en: "You owe",
            es: "Le debes",
            pt: "Você deve",
            "pt-PT": "Deve",
        }),
        "debts.plan.behind": t({
            en: "{amount} behind",
            es: "{amount} de atraso",
            pt: "{amount} em atraso",
        }),
        "debts.plan.by": t({
            en: "{amount} by {date}",
            es: "{amount} para el {date}",
            pt: "{amount} até {date}",
        }),
        "debts.plan.byDays_one": t({
            en: "{amount} by {date} · {count} day",
            es: "{amount} para el {date} · {count} día",
            pt: "{amount} até {date} · {count} dia",
        }),
        "debts.plan.byDays_other": t({
            en: "{amount} by {date} · {count} days",
            es: "{amount} para el {date} · {count} días",
            pt: "{amount} até {date} · {count} dias",
        }),
        "debts.plan.change": t({
            en: "Change plan",
            es: "Cambiar plan",
            pt: "Alterar plano",
        }),
        "debts.plan.commit": t({
            en: "Set plan",
            es: "Crear plan",
            pt: "Criar plano",
        }),
        "debts.plan.demandDays_one": t({
            en: "{amount} in {count} day",
            es: "{amount} en {count} día",
            pt: "{amount} em {count} dia",
        }),
        "debts.plan.demandDays_other": t({
            en: "{amount} in {count} days",
            es: "{amount} en {count} días",
            pt: "{amount} em {count} dias",
        }),
        "debts.plan.demandMonth": t({
            en: "{amount} a month",
            es: "{amount} al mes",
            pt: "{amount} por mês",
        }),
        "debts.plan.failed": t({
            en: "Couldn't save this plan. Try again.",
            es: "No se pudo guardar el plan. Inténtalo de nuevo.",
            pt: "Não foi possível salvar o plano. Tente de novo.",
            "pt-PT": "Não foi possível guardar o plano. Tente de novo.",
        }),
        "debts.plan.paidBack": t({
            en: "Paid back {date}",
            es: "Saldado el {date}",
            pt: "Quitado em {date}",
            "pt-PT": "Liquidado em {date}",
        }),
        "debts.plan.paidOff": t({
            en: "Paid off {date}",
            es: "Pagado el {date}",
            pt: "Pago em {date}",
        }),
        "debts.plan.payBackBy": t({
            en: "Pay back by",
            es: "Fecha de pago",
            pt: "Data de pagamento",
        }),
        "debts.plan.payOffBy": t({
            en: "Pay off by",
            es: "Fecha de pago",
            pt: "Data de pagamento",
        }),
        "debts.plan.perMonth": t({
            en: "{amount} a month until {date}",
            es: "{amount} al mes hasta el {date}",
            pt: "{amount} por mês até {date}",
        }),
        "debts.plan.remove": t({
            en: "Remove plan",
            es: "Quitar plan",
            pt: "Remover plano",
        }),
        "debts.plan.row": t({
            en: "By {date}",
            es: "Para el {date}",
            pt: "Até {date}",
        }),
        "debts.plan.rowBehind": t({
            en: "By {date}, {amount} behind",
            es: "Para el {date}, {amount} de atraso",
            pt: "Até {date}, {amount} em atraso",
        }),
        "debts.plan.save": t({
            en: "Save plan",
            es: "Guardar plan",
            pt: "Salvar plano",
            "pt-PT": "Guardar plano",
        }),
        "debts.plan.stated.liability": t({
            en: "Pay off {account} by {date}",
            es: "Paga {account} para el {date}",
            pt: "Quite {account} até {date}",
            "pt-PT": "Pague a {account} até {date}",
        }),
        "debts.plan.stated.owesYou": t({
            en: "{account} pays you back by {date}",
            es: "{account} te paga para el {date}",
            pt: "{account} te paga até {date}",
            "pt-PT": "{account} paga-lhe até {date}",
        }),
        "debts.plan.stated.youOwe": t({
            en: "You pay {account} back by {date}",
            es: "Le pagas a {account} para el {date}",
            pt: "Você paga {account} até {date}",
            "pt-PT": "Paga a {account} até {date}",
        }),
        "debts.purchase.title": t({
            en: "Bought on credit",
            es: "Compra a crédito",
            pt: "Compra a prazo",
        }),
        "debts.reminder.ask": t({
            en: "Remind you the day before you pay?",
            es: "¿Te aviso el día antes de pagar?",
            pt: "Avisar um dia antes do pagamento?",
        }),
        "debts.reminder.body": t({
            en: "You owe {amount}. Tap when it's paid.",
            es: "Le debes {amount}. Toca cuando le pagues.",
            pt: "Você deve {amount}. Toque quando pagar.",
            "pt-PT": "Deve {amount}. Toque quando pagar.",
        }),
        "debts.reminder.bodyHidden": t({
            en: "Tap when it's paid.",
            es: "Toca cuando le pagues.",
            pt: "Toque quando pagar.",
        }),
        "debts.reminder.title": t({
            en: "You pay {person} tomorrow",
            es: "Mañana le pagas a {person}",
            pt: "Amanhã você paga {person}",
            "pt-PT": "Amanhã paga a {person}",
        }),
        "debts.sale.title": t({
            en: "Sold on credit",
            es: "Venta a crédito",
            pt: "Venda a prazo",
        }),
        "debts.settled": t({
            en: "Settled · {count}",
            es: "Saldados · {count}",
            pt: "Quites · {count}",
        }),
        "debts.title": t({
            en: "Debts",
            es: "Deudas",
            pt: "Dívidas",
        }),
        "debts.verb.borrowed": t({
            en: "I borrowed",
            es: "Me prestaron",
            pt: "Peguei emprestado",
            "pt-PT": "Pedi emprestado",
        }),
        "debts.verb.lent": t({
            en: "I lent",
            es: "Presté",
            pt: "Emprestei",
        }),
        "debts.verb.soldOnCredit": t({
            en: "Sold on credit",
            es: "Vendí a crédito",
            pt: "Vendi a prazo",
        }),
        "debts.youOweAmount": t({
            en: "You owe {amount}",
            es: "Debes {amount}",
            pt: "Você deve {amount}",
            "pt-PT": "Deve {amount}",
        }),
    },
    key: "debts" as const,
} satisfies Dictionary;

export default debts;
