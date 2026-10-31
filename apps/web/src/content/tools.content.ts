import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

import type { PageRef } from "@/lib/site";

const PRIVACY_FAQ = {
    answer: t({
        en: "No. The math runs in your browser, and nothing you type is stored or sent anywhere.",
        es: "No. Las cuentas se hacen en tu navegador, y nada de lo que escribes se guarda ni se envía.",
    }),
    question: t({ en: "Is what I type saved?", es: "¿Se guarda lo que escribo?" }),
};

const tools = {
    content: {
        hub: {
            lead: t({
                en: "Split a paycheck, add up your subscriptions, see what an installment plan really costs, or settle a shared bill. Free, and nothing you type leaves your browser.",
                es: "Reparte tu sueldo, suma tus suscripciones, mira cuánto cuesta de verdad un plan de cuotas o salda una cuenta compartida. Gratis, y nada de lo que escribes sale de tu navegador.",
            }),
            meta: {
                description: t({
                    en: "Split a paycheck, add up your subscriptions, see what an installment plan really costs, or settle a shared bill. Free, and nothing you type leaves your browser.",
                    es: "Reparte tu sueldo, suma tus suscripciones, mira cuánto cuesta un plan de cuotas o salda una cuenta compartida. Gratis, y nada sale de tu navegador.",
                }),
                title: t({ en: "Free Money Calculators · Outlayr", es: "Calculadoras de dinero gratis · Outlayr" }),
            },
            title: t({
                en: "Free money calculators for everyday math",
                es: "Calculadoras de dinero gratis para cada día",
            }),
        },
        labels: {
            at: {
                month: insert(t({ en: "month {{n}}", es: "el mes {{n}}" })),
                week: insert(t({ en: "week {{n}}", es: "la semana {{n}}" })),
            },
            cadences: {
                month: t({ en: "Month", es: "Mes" }),
                quarter: t({ en: "3 months", es: "3 meses" }),
                twoWeeks: t({ en: "2 weeks", es: "2 semanas" }),
                week: t({ en: "Week", es: "Semana" }),
                year: t({ en: "Year", es: "Año" }),
            },
            currency: t({ en: "Currency", es: "Moneda" }),
            every: t({ en: "Every", es: "Cada" }),
            method: t({ en: "How it is calculated", es: "Cómo se calcula" }),
            more: insert(t({ en: "And {{count}} more", es: "Y {{count}} más" })),
            remove: t({ en: "Remove", es: "Quitar" }),
            row: {
                month: insert(t({ en: "Month {{n}}", es: "Mes {{n}}" })),
                today: t({ en: "Today", es: "Hoy" }),
                week: insert(t({ en: "Week {{n}}", es: "Semana {{n}}" })),
            },
        },
        pages: {
            "50-30-20-budget-calculator": {
                answer: insert(
                    t({
                        en: "Spend up to {{needs}} on needs and {{wants}} on wants, and save {{savings}} a month.",
                        es: "Gasta hasta {{needs}} en necesidades y {{wants}} en gustos, y ahorra {{savings}} al mes.",
                    })
                ),
                buckets: [
                    {
                        name: t({ en: "Needs", es: "Necesidades" }),
                        text: t({
                            en: "Rent, groceries, utilities, transport, insurance, minimum debt payments",
                            es: "Renta, súper, servicios, transporte, seguros, pagos mínimos de deudas",
                        }),
                    },
                    {
                        name: t({ en: "Wants", es: "Gustos" }),
                        text: t({
                            en: "Eating out, streaming, shopping, trips",
                            es: "Comer fuera, streaming, compras, viajes",
                        }),
                    },
                    {
                        name: t({ en: "Savings", es: "Ahorro" }),
                        text: t({
                            en: "Emergency fund, retirement, paying debt down faster",
                            es: "Fondo de emergencia, retiro, pagar deudas más rápido",
                        }),
                    },
                ],
                columns: {
                    month: t({ en: "A month", es: "Al mes" }),
                    share: t({ en: "Share", es: "Parte" }),
                    year: t({ en: "A year", es: "Al año" }),
                },
                faq: [
                    {
                        answer: t({
                            en: "On net pay: what lands in your account after taxes and deductions. If your employer takes retirement savings out of your paycheck, you can count it toward the 20%.",
                            es: "Sobre el sueldo neto: lo que te llega a la cuenta después de impuestos y descuentos. Si tu empresa te descuenta un aporte para el retiro, puedes contarlo dentro del 20%.",
                        }),
                        question: t({
                            en: "Is the 50/30/20 rule based on gross or net pay?",
                            es: "¿La regla 50/30/20 se calcula sobre el sueldo bruto o el neto?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Minimum payments are needs. Anything you pay above the minimum counts as savings, since it lowers what you owe.",
                            es: "Los pagos mínimos son necesidades. Lo que pagues por encima del mínimo cuenta como ahorro, porque baja lo que debes.",
                        }),
                        question: t({ en: "Where do debt payments go?", es: "¿Dónde van los pagos de deudas?" }),
                    },
                    {
                        answer: t({
                            en: "Track what you spend against each part. In Outlayr you can set a budget per category or one for the whole month, and see where your current pace ends before the month does.",
                            es: "Anota lo que gastas en cada parte. En Outlayr puedes poner un presupuesto por categoría o uno para todo el mes, y ver a dónde te lleva tu ritmo antes de que termine el mes.",
                        }),
                        question: t({ en: "How do I stick to it?", es: "¿Cómo lo cumplo?" }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    income: t({ en: "Take home pay", es: "Sueldo neto" }),
                    split: t({ en: "Split", es: "Reparto" }),
                },
                lead: t({
                    en: "Split your take home pay into needs, wants, and savings, by the 50/30/20 rule or a stricter split.",
                    es: "Reparte tu sueldo neto entre necesidades, gustos y ahorro con la regla 50/30/20 o un reparto más ajustado.",
                }),
                meta: {
                    title: t({
                        en: "50/30/20 Budget Calculator · Outlayr",
                        es: "Calculadora de presupuesto 50/30/20 · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "The 50/30/20 rule splits what you take home after taxes: half for needs, 30% for things you want, and 20% for savings and paying down debt. Elizabeth Warren and her daughter, Amelia Warren Tyagi, set it out in their 2005 book All Your Worth: The Ultimate Lifetime Money Plan.",
                        es: "La regla 50/30/20 reparte lo que te queda después de impuestos: la mitad para necesidades, 30% para gustos y 20% para ahorrar y pagar deudas. La propusieron Elizabeth Warren y su hija, Amelia Warren Tyagi, en su libro de 2005 All Your Worth: The Ultimate Lifetime Money Plan.",
                    }),
                    t({
                        en: "Paid weekly or every two weeks? The calculator first turns your pay into a year at 52 weeks, then a month, so a month gets 4.33 weekly paychecks, not 4.",
                        es: "¿Te pagan cada semana o cada dos semanas? La calculadora primero lleva tu pago a un año de 52 semanas y luego a un mes, así que un mes recibe 4.33 pagos semanales, no 4.",
                    }),
                    t({
                        en: "If half your pay doesn't cover your needs, as in a city with high rent, start from 60/20/20 or 70/20/10 and work your way back.",
                        es: "Si la mitad de tu sueldo no alcanza para las necesidades, como pasa en una ciudad donde la renta es cara, empieza con 60/20/20 o 70/20/10 y ve ajustando.",
                    }),
                ],
                related: [
                    "/guides/budget-planner",
                    "/guides/best-budget-apps",
                    "/guides/how-to-track-expenses",
                ] satisfies PageRef[],
                title: t({ en: "50/30/20 budget calculator", es: "Calculadora de presupuesto 50/30/20" }),
            },
            "subscription-cost-calculator": {
                answer: insert(
                    t({
                        en: "Your subscriptions cost {{monthly}} a month, {{yearly}} a year.",
                        es: "Tus suscripciones te cuestan {{monthly}} al mes, {{yearly}} al año.",
                    })
                ),
                add: t({ en: "Add subscription", es: "Agregar suscripción" }),
                empty: t({
                    en: "Add a subscription to see what it costs a year.",
                    es: "Agrega una suscripción para ver cuánto cuesta al año.",
                }),
                examples: [
                    t({ en: "Streaming", es: "Streaming" }),
                    t({ en: "Music", es: "Música" }),
                    t({ en: "Cloud storage", es: "Almacenamiento en la nube" }),
                    t({ en: "Gym", es: "Gimnasio" }),
                    t({ en: "News", es: "Noticias" }),
                ],
                faq: [
                    {
                        answer: t({
                            en: "Search your email for receipts and look through the last two or three card statements for repeated charges. Check the subscriptions page of your App Store or Google Play account too.",
                            es: "Busca recibos en tu correo y revisa los últimos dos o tres estados de cuenta de tu tarjeta buscando cobros repetidos. Revisa también las suscripciones de tu cuenta del App Store o de Google Play.",
                        }),
                        question: t({
                            en: "How do I find all my subscriptions?",
                            es: "¿Cómo encuentro todas mis suscripciones?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Usually. Divide the yearly price by 12 and compare it with the monthly one. A yearly plan only saves money if you would have kept paying all year.",
                            es: "Casi siempre. Divide el precio anual entre 12 y compáralo con el mensual. El plan anual solo te ahorra dinero si igual lo ibas a pagar todo el año.",
                        }),
                        question: t({ en: "Is a yearly plan cheaper?", es: "¿Conviene más el plan anual?" }),
                    },
                    {
                        answer: t({
                            en: "No. Outlayr logs each subscription on its day, shows what they cost a month, and can remind you before each charge. You cancel with the company.",
                            es: "No. Outlayr registra cada suscripción en su día, te muestra cuánto cuestan al mes y puede avisarte antes de cada cobro. La cancelación la haces con la empresa.",
                        }),
                        question: t({
                            en: "Can Outlayr cancel subscriptions for me?",
                            es: "¿Outlayr puede cancelar mis suscripciones?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    name: t({ en: "Subscription", es: "Suscripción" }),
                    price: t({ en: "Price", es: "Precio" }),
                    year: t({ en: "A year", es: "Al año" }),
                },
                lead: t({
                    en: "Add up what your subscriptions cost a month and a year, whether they charge weekly, monthly, every 3 months, or once a year.",
                    es: "Suma lo que te cuestan tus suscripciones al mes y al año, ya cobren cada semana, cada mes, cada 3 meses o una vez al año.",
                }),
                meta: {
                    title: t({
                        en: "Subscription Cost Calculator · Outlayr",
                        es: "Calculadora de suscripciones · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "Every price becomes a yearly cost first: a weekly charge counts 52 times, a monthly one 12, one every 3 months 4, and a yearly one once. The monthly figure is that total divided by 12.",
                        es: "Cada precio se convierte primero en un costo anual: un cobro semanal cuenta 52 veces, uno mensual 12, uno cada 3 meses 4 y uno anual una vez. La cifra mensual es ese total dividido entre 12.",
                    }),
                    t({
                        en: "As a formula: yearly cost = the sum of each price × its charges a year, and monthly cost = yearly cost ÷ 12.",
                        es: "Como fórmula: costo anual = la suma de cada precio × sus cobros al año, y costo mensual = costo anual ÷ 12.",
                    }),
                    t({
                        en: "That is why a $5 weekly charge costs $21.67 a month, not $20: a month is a bit more than 4 weeks.",
                        es: "Por eso un cobro semanal de US$5 cuesta US$21.67 al mes y no US$20: un mes es un poco más de 4 semanas.",
                    }),
                    t({
                        en: "Outlayr's subscriptions screen counts the same way, so the totals match once you log them there.",
                        es: "La pantalla de suscripciones de Outlayr cuenta igual, así que los totales coinciden cuando las registras ahí.",
                    }),
                ],
                preview: {
                    month: t({ en: "a month", es: "al mes" }),
                    title: t({ en: "Subscriptions", es: "Suscripciones" }),
                },
                related: [
                    "/guides/subscription-tracker",
                    "/guides/best-subscription-tracker-apps",
                    "/compare/pocketguard",
                ] satisfies PageRef[],
                title: t({ en: "Subscription cost calculator", es: "Calculadora de suscripciones" }),
            },
            "installment-calculator": {
                answer: {
                    covered: insert(
                        t({
                            en: "Today's payment already covers the cash price, so you pay {{amount}} more than cash.",
                            es: "Lo que pagas hoy ya cubre el precio de contado, así que pagas {{amount}} más que de contado.",
                        })
                    ),
                    empty: t({
                        en: "Add the cash price and each payment to see what the plan costs.",
                        es: "Agrega el precio de contado y cada cuota para ver cuánto cuesta el plan.",
                    }),
                    less: insert(
                        t({
                            en: "You pay {{amount}} less than cash. Done by {{end}}.",
                            es: "Pagas {{amount}} menos que de contado. Terminas en {{end}}.",
                        })
                    ),
                    more: insert(
                        t({
                            en: "You pay {{amount}} more than cash, a yearly rate of {{rate}}. Done by {{end}}.",
                            es: "Pagas {{amount}} más que de contado, una tasa anual de {{rate}}. Terminas en {{end}}.",
                        })
                    ),
                    paid: t({
                        en: "Today's payment covers the cash price, so there is nothing left to finance.",
                        es: "Lo que pagas hoy cubre el precio de contado, así que no queda nada por financiar.",
                    }),
                    same: insert(
                        t({
                            en: "You pay the cash price, with no extra cost. Done by {{end}}.",
                            es: "Pagas el precio de contado, sin costo extra. Terminas en {{end}}.",
                        })
                    ),
                },
                faq: [
                    {
                        answer: t({
                            en: "If the payments add up to the cash price, yes, and the calculator says there is no extra cost. Check that the cash price is what you would pay without the plan.",
                            es: "Si las cuotas suman el precio de contado, sí, y la calculadora te dice que no hay costo extra. Revisa que el precio de contado sea lo que pagarías sin el plan.",
                        }),
                        question: t({
                            en: "Is 0% interest really free?",
                            es: "¿Los meses sin intereses son gratis de verdad?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Because the plan is short. With the starting example, $15 extra on a $400 order over six weeks works out to about 89% a year: the fee pays for six weeks of credit, not a year.",
                            es: "Porque el plan es corto. Con el ejemplo inicial, US$15 de más en una compra de US$400 a seis semanas equivalen a cerca de 89% al año: el cargo paga seis semanas de crédito, no un año.",
                        }),
                        question: t({
                            en: "Why is the yearly rate so high for a small fee?",
                            es: "¿Por qué la tasa anual es tan alta si el cargo es chico?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr tracks purchases in installments from buy now, pay later apps such as Cashea, Klarna, and Afterpay, and from cards: the upfront payment, each installment, and any late fees, with a reminder the day before each one is due. For an order already in progress, take a screenshot of its payment plan and Outlayr fills in each payment and what is already paid. The free plan holds 2 installment apps, and each screenshot counts as one capture.",
                            es: "Sí. Outlayr lleva las compras en cuotas de apps como Cashea, Klarna y Afterpay, y de tus tarjetas: la inicial, cada cuota y los recargos por atraso, con un aviso el día antes de cada pago. Para una compra que ya va por la mitad, toma una captura de su plan de pagos y Outlayr llena cada cuota y lo que ya pagaste. El plan gratis permite 2 apps de cuotas, y cada captura de pantalla cuenta como una captura.",
                        }),
                        question: t({
                            en: "Can Outlayr track my installments?",
                            es: "¿Outlayr puede llevar mis cuotas?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    count: t({ en: "Payments", es: "Cuotas" }),
                    down: t({ en: "Paid today", es: "Pagas hoy" }),
                    payment: t({ en: "Each payment", es: "Cada cuota" }),
                    price: t({ en: "Cash price", es: "Precio de contado" }),
                },
                lead: t({
                    en: "What paying in installments really costs: the extra over the cash price, the yearly rate behind it, and when the last payment lands.",
                    es: "Cuánto cuesta de verdad pagar en cuotas: lo que pagas de más sobre el precio de contado, la tasa anual detrás y cuándo llega el último pago.",
                }),
                meta: {
                    title: t({
                        en: "Installment Calculator: The Real Cost of Paying Later",
                        es: "Calculadora de cuotas: cuánto cuesta pagar a plazos",
                    }),
                },
                method: [
                    t({
                        en: "The calculator adds what you pay today to every installment and compares the total with the cash price: total = paid today + payments × each payment, and extra = total − cash price.",
                        es: "La calculadora suma lo que pagas hoy y todas las cuotas, y compara el total con el precio de contado: total = lo que pagas hoy + cuotas × cada cuota, y lo que pagas de más = total − precio de contado.",
                    }),
                    t({
                        en: "The yearly rate is the interest rate that makes those payments worth exactly what you financed, the cash price minus today's payment. It compounds over a year, like an effective annual rate, so a small fee on a short plan shows its real size.",
                        es: "La tasa anual es la tasa de interés con la que esas cuotas valen justo lo que financiaste, el precio de contado menos lo que pagas hoy. Se compone a un año, como una tasa efectiva anual, así que un cargo chico en un plan corto muestra su tamaño real.",
                    }),
                    t({
                        en: "As a formula: find the rate r per payment period where each payment × (1 − (1 + r)^−n) ÷ r = cash price − paid today, with n payments. The yearly rate is (1 + r)^k − 1, where k is 52 for weekly payments, 26 for every 2 weeks, and 12 for monthly. With the starting example, $300 financed in 3 payments of $105 every 2 weeks, r is about 2.48%, and (1.0248)^26 − 1 is about 89%.",
                        es: "Como fórmula: busca la tasa r por período donde cada cuota × (1 − (1 + r)^−n) ÷ r = precio de contado − lo que pagas hoy, con n cuotas. La tasa anual es (1 + r)^k − 1, donde k es 52 si pagas cada semana, 26 si pagas cada 2 semanas y 12 si pagas cada mes. Con el ejemplo inicial, US$300 financiados en 3 cuotas de US$105 cada 2 semanas, r es cerca de 2.48%, y (1.0248)^26 − 1 da cerca de 89%.",
                    }),
                    t({
                        en: "Late fees are not included. Most plans charge one when a payment is late, which raises the real cost.",
                        es: "No incluye recargos por atraso. La mayoría de los planes cobra uno cuando una cuota se atrasa, y eso sube el costo real.",
                    }),
                ],
                preview: {
                    left: t({ en: "Left to pay", es: "Te falta pagar" }),
                    paid: insert(t({ en: "Paid {{paid}} of {{count}}", es: "Pagaste {{paid}} de {{count}}" })),
                },
                related: [
                    "/guides/budget-planner",
                    "/tools/50-30-20-budget-calculator",
                    "/tools/split-expenses-calculator",
                ] satisfies PageRef[],
                title: t({ en: "Installment calculator", es: "Calculadora de cuotas" }),
            },
            "split-expenses-calculator": {
                add: t({ en: "Add person", es: "Agregar persona" }),
                answer: insert(
                    t({
                        en: "{{total}} split {{count}} ways is {{share}} each.",
                        es: "{{total}} entre {{count}} personas son {{share}} por persona.",
                    })
                ),
                columns: {
                    amount: t({ en: "Amount", es: "Monto" }),
                    balance: t({ en: "Balance", es: "Saldo" }),
                    from: t({ en: "Pays", es: "Paga" }),
                    to: t({ en: "To", es: "A" }),
                },
                examples: ["Ana", "Luis", "Marta"],
                faq: [
                    {
                        answer: t({
                            en: "Run the calculator once for each part of the trip, with only the people who were there, then add up what each person owes.",
                            es: "Usa la calculadora una vez por cada parte del viaje, solo con quienes estuvieron, y luego suma lo que debe cada persona.",
                        }),
                        question: t({
                            en: "What if someone joined for only part of the trip?",
                            es: "¿Y si alguien solo estuvo en una parte del viaje?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Convert every amount to one currency first, at the rate you agree on, then enter them here.",
                            es: "Convierte primero cada monto a una sola moneda, con la tasa que acuerden, y luego anótalos aquí.",
                        }),
                        question: t({
                            en: "Some of us paid in another currency. What do I do?",
                            es: "Algunos pagamos en otra moneda. ¿Qué hago?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Each person gets their own account in Outlayr, so money you lent, borrowed, sold on credit, or owe for a job or purchase shows as a balance until it is paid back. Add a payoff plan with a date and Outlayr shows what that takes a month, and whether you are ahead or behind. The free plan holds 3 people and 2 payoff plans.",
                            es: "Sí. Cada persona tiene su propia cuenta en Outlayr, así que lo que prestaste, lo que te prestaron, lo que vendiste a crédito o lo que debes por un trabajo o una compra queda como saldo hasta que se paga. Ponle un plan de pago con fecha y Outlayr te muestra cuánto toca al mes y si vas adelantado o atrasado. El plan gratis permite 3 personas y 2 planes de pago.",
                        }),
                        question: t({
                            en: "Can Outlayr keep track of who owes me?",
                            es: "¿Outlayr puede llevar quién me debe?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    name: t({ en: "Name", es: "Nombre" }),
                    paid: t({ en: "Paid", es: "Pagó" }),
                },
                lead: t({
                    en: "Enter what each person paid for a trip, a dinner, or a shared house, and see who pays whom to even it out.",
                    es: "Anota lo que pagó cada persona en un viaje, una cena o una casa compartida, y mira quién le paga a quién para quedar a mano.",
                }),
                meta: {
                    title: t({
                        en: "Split Expenses Calculator: Who Owes Whom · Outlayr",
                        es: "Calculadora para dividir gastos: quién le debe a quién",
                    }),
                },
                method: [
                    t({
                        en: "The calculator adds up what everyone paid and divides it equally. Whoever paid more than their share gets paid back, and whoever paid less pays.",
                        es: "La calculadora suma lo que pagó cada persona y lo divide en partes iguales. A quien pagó más que su parte le devuelven, y quien pagó menos, paga.",
                    }),
                    t({
                        en: "It settles the biggest debt against the biggest credit first, so it never takes more payments than one fewer than the number of people.",
                        es: "Primero cruza la deuda más grande con el saldo a favor más grande, así que nunca hacen falta más pagos que el número de personas menos uno.",
                    }),
                    t({
                        en: "When the total doesn't divide evenly, the leftover cents fall to the first people on the list.",
                        es: "Si el total no se divide exacto, los centavos que sobran le tocan a las primeras personas de la lista.",
                    }),
                ],
                related: [
                    "/guides/multi-currency-expense-tracker",
                    "/tools/50-30-20-budget-calculator",
                    "/guides/expense-tracker-template",
                ] satisfies PageRef[],
                settled: t({
                    en: "Everyone paid their share. Nobody owes anything.",
                    es: "Todos pagaron su parte. Nadie debe nada.",
                }),
                title: t({ en: "Split expenses calculator", es: "Calculadora para dividir gastos" }),
            },
        },
    },
    key: "tools",
} satisfies Dictionary;

export default tools;
