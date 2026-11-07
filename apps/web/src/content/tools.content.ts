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
            rates: {
                amount: t({ en: "Amount", es: "Monto" }),
                buy: t({ en: "buy", es: "compra" }),
                convert: t({ en: "Convert", es: "Convertir" }),
                kinds: {
                    bcb: t({ en: "Official (BCB)", es: "Oficial (BCB)" }),
                    bcv: t({ en: "Official (BCV)", es: "Oficial (BCV)" }),
                    binance: t({ en: "Parallel (Binance P2P)", es: "Paralelo (Binance P2P)" }),
                    blue: t({ en: "Blue", es: "Blue" }),
                    ccl: t({ en: "CCL (contado con liquidación)", es: "CCL (contado con liquidación)" }),
                    cripto: t({ en: "Crypto", es: "Cripto" }),
                    mayorista: t({ en: "Wholesale", es: "Mayorista" }),
                    mep: t({ en: "MEP (bolsa)", es: "MEP (bolsa)" }),
                    oficial: t({ en: "Official", es: "Oficial" }),
                    tarjeta: t({ en: "Card", es: "Tarjeta" }),
                },
                rate: t({ en: "Dollar", es: "Dólar" }),
                result: insert(
                    t({
                        en: "{{from}} is {{to}} at the {{rate}} rate",
                        es: "{{from}} son {{to}} al dólar {{rate}}",
                    })
                ),
                sell: t({ en: "sell", es: "venta" }),
                source: insert(
                    t({
                        en: "Rates from {{service}}, which takes each one from the source linked on its row. Each row shows when that source last updated it.",
                        es: "Tasas de {{service}}, que toma cada una de la fuente enlazada en su fila. Cada fila muestra cuándo la actualizó esa fuente.",
                    })
                ),
                unavailable: t({
                    en: "The rate is unavailable right now. Try again in a few minutes.",
                    es: "La tasa no está disponible en este momento. Intenta de nuevo en unos minutos.",
                }),
            },
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
                        es: "Calculadora regla 50 30 20: reparte tu sueldo · Outlayr",
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
                title: t({ en: "50/30/20 budget calculator", es: "Calculadora de la regla 50 30 20" }),
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
                    t({ en: "Gym membership", es: "Membresía del gimnasio" }),
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
                    en: "Add up what your subscriptions and memberships cost a month and a year, whether they charge weekly, monthly, every 3 months, or once a year.",
                    es: "Suma lo que te cuestan tus suscripciones y membresías al mes y al año, ya cobren cada semana, cada mes, cada 3 meses o una vez al año.",
                }),
                meta: {
                    title: t({
                        en: "Subscription & Membership Cost Calculator · Outlayr",
                        es: "Calculadora de suscripciones y membresías · Outlayr",
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
                        en: "Add the list price and each payment to see what the plan costs.",
                        es: "Agrega el precio de lista y cada cuota para ver cuánto cuesta el plan.",
                    }),
                    less: insert(
                        t({
                            en: "You pay {{total}} in total, {{amount}} less than cash. Done by {{end}}.",
                            es: "Pagas {{total}} en total, {{amount}} menos que de contado. Terminas en {{end}}.",
                        })
                    ),
                    more: insert(
                        t({
                            en: "You pay {{total}} in total, {{amount}} more than cash, a yearly rate of {{rate}}. Done by {{end}}.",
                            es: "Pagas {{total}} en total, {{amount}} más que de contado, una tasa anual de {{rate}}. Terminas en {{end}}.",
                        })
                    ),
                    paid: t({
                        en: "Today's payment covers the cash price, so there is nothing left to finance.",
                        es: "Lo que pagas hoy cubre el precio de contado, así que no queda nada por financiar.",
                    }),
                    same: insert(
                        t({
                            en: "You pay {{total}} in total, the cash price, with no extra cost. Done by {{end}}.",
                            es: "Pagas {{total}} en total, el precio de contado, sin costo extra. Terminas en {{end}}.",
                        })
                    ),
                    verdict: {
                        cash: insert(
                            t({
                                en: "Pay cash. The installments are worth {{present}} in today's money against {{cash}} in cash, {{amount}} more.",
                                es: "Conviene pagar de contado. Las cuotas valen {{present}} en dinero de hoy contra {{cash}} de contado, {{amount}} más.",
                            })
                        ),
                        installments: insert(
                            t({
                                en: "Pay in installments. They are worth {{present}} in today's money against {{cash}} in cash, {{amount}} less.",
                                es: "Conviene pagar en cuotas. Valen {{present}} en dinero de hoy contra {{cash}} de contado, {{amount}} menos.",
                            })
                        ),
                        same: insert(
                            t({
                                en: "About the same. The installments are worth {{present}} in today's money against {{cash}} in cash.",
                                es: "Da casi lo mismo. Las cuotas valen {{present}} en dinero de hoy contra {{cash}} de contado.",
                            })
                        ),
                    },
                },
                faq: [
                    {
                        answer: t({
                            en: "Compare the installments, valued in today's money, with the cash price. Say a TV is listed at $1,200,000 pesos, payable in 6 monthly interest-free installments of $200,000, or $1,080,000 in cash after a 10% discount. With 1% monthly inflation the installments are worth about $1,159,000 today, so cash is cheaper. At 5% they are worth about $1,015,000, so installments win. The break-even is near 3% a month. Enter the list price, the cash discount, and the monthly inflation you expect, and the calculator does this for any plan.",
                            es: "Compara las cuotas, valuadas en dinero de hoy, con el precio de contado. Por ejemplo, un televisor de $1,200,000 pesos de lista se paga en 6 cuotas mensuales sin interés de $200,000, o de contado a $1,080,000 con 10% de descuento. Con 1% de inflación mensual las cuotas valen hoy cerca de $1,159,000, así que conviene el contado. Con 5% valen cerca de $1,015,000 y ganan las cuotas. El punto de equilibrio está cerca de 3% al mes. Pon el precio de lista, el descuento por contado y la inflación mensual que esperas, y la calculadora hace esta cuenta con cualquier plan.",
                        }),
                        question: t({
                            en: "Should I pay in installments or cash?",
                            es: "¿Conviene pagar en cuotas o de contado?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The monthly rise in prices you expect while you pay, for example the latest monthly figure from your country's statistics office. If your money would earn more than that in the meantime, enter that monthly rate instead, since it is what waiting is worth to you. A higher number favors installments.",
                            es: "El aumento mensual de precios que esperas mientras pagas, por ejemplo la última cifra mensual del instituto de estadística de tu país. Si tu dinero rendiría más que eso en el tiempo que pagas, pon esa tasa mensual, porque es lo que vale esperar para ti. Un número más alto favorece las cuotas.",
                        }),
                        question: t({
                            en: "What monthly inflation should I enter?",
                            es: "¿Qué inflación mensual pongo?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Not always. Without interest the payments add up to the list price, so the plan costs nothing extra on paper. But if the store takes a discount off for cash, that discount is what you pay for the installments. With inflation, the later payments are also worth less than the first.",
                            es: "No siempre. Sin interés las cuotas suman el precio de lista, así que en papel el plan no cuesta nada extra. Pero si la tienda te descuenta por pagar de contado, ese descuento es lo que pagas por las cuotas. Con inflación, además, las últimas cuotas valen menos que las primeras.",
                        }),
                        question: t({
                            en: "Is 0% interest really free?",
                            es: "¿Las cuotas sin interés o los meses sin intereses son gratis de verdad?",
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
                    discount: t({ en: "Cash discount", es: "Descuento por contado" }),
                    down: t({ en: "Paid today", es: "Pagas hoy" }),
                    inflation: t({ en: "Inflation a month", es: "Inflación al mes" }),
                    payment: t({ en: "Each payment", es: "Cada cuota" }),
                    price: t({ en: "List price", es: "Precio de lista" }),
                },
                lead: t({
                    en: "Installments or cash? See the total installment price, which costs less in today's money with inflation and a cash discount, and the yearly rate behind the extra over the cash price.",
                    es: "Calcula cuánto pagas en total por una compra en cuotas o a plazos, a qué tasa anual pagas de más y si conviene el contado, con inflación y descuento.",
                }),
                meta: {
                    title: t({
                        en: "Installment Calculator: Installments or Cash? With Inflation",
                        es: "Calculadora de cuotas y pago a plazos: ¿cuotas o contado?",
                    }),
                },
                method: [
                    t({
                        en: "The calculator adds what you pay today to every installment and compares the total with the cash price: total = paid today + payments × each payment, and extra = total − cash price.",
                        es: "En un pago a plazos divides el precio en cuotas iguales cada cierto tiempo, a veces con un pago inicial. La calculadora suma lo que pagas hoy y todas las cuotas, y compara el total con el precio de contado: total = lo que pagas hoy + cuotas × cada cuota, y lo que pagas de más = total − precio de contado. Por ejemplo, algo que cuesta US$600 de contado, con US$100 hoy y 6 cuotas mensuales de US$95, suma US$670: US$70 más que de contado, una tasa anual de 57.8%.",
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
                        en: "Many stores list one price and take a percentage off for paying cash. Enter the list price and that discount: the cash price is the list price minus the discount, and the extra, the yearly rate, and the verdict all compare against it.",
                        es: "Muchas tiendas tienen un precio de lista y descuentan un porcentaje si pagas de contado. Pon el precio de lista y ese descuento: el precio de contado es el de lista menos el descuento, y lo que pagas de más, la tasa anual y el veredicto se comparan con él.",
                    }),
                    t({
                        en: "To tell installments from cash when prices rise, each payment is valued in today's money: value today = paid today + the sum of each payment ÷ (1 + i)^t, where i is the monthly inflation and t is the months until that payment. A week counts as 12 ÷ 52 of a month, so with weekly payments the 4th one has t = 0.92, and with monthly ones the 4th has t = 4. Installments are cheaper if the sum is below the cash price, cash is cheaper if it is above, and a gap under 1% counts as about the same.",
                        es: "Para distinguir cuotas de contado cuando suben los precios, cada cuota se valúa en dinero de hoy: valor hoy = lo que pagas hoy + la suma de cada cuota ÷ (1 + i)^t, donde i es la inflación mensual y t son los meses hasta esa cuota. Una semana cuenta como 12 ÷ 52 de mes, así que con cuotas semanales la cuarta tiene t = 0.92, y con cuotas mensuales la cuarta tiene t = 4. Conviene pagar en cuotas si la suma queda por debajo del precio de contado, conviene el contado si queda por encima, y una diferencia menor a 1% cuenta como casi igual.",
                    }),
                    t({
                        en: "Late fees are not included. Most plans charge one when a payment is late, which raises the real cost.",
                        es: "La calculadora no saca la cuota a partir de un interés: pon la cuota que te ofrece la tienda, el banco o la app. Solo cuenta los intereses y comisiones que ya estén dentro de esa cuota o de lo que pagas hoy; suma aparte cualquier otro cargo. No incluye recargos por atraso. La mayoría de los planes cobra uno cuando una cuota se atrasa, y eso sube el costo real.",
                    }),
                ],
                preview: {
                    left: t({ en: "Left to pay", es: "Te falta pagar" }),
                    paid: insert(t({ en: "Paid {{paid}} of {{count}}", es: "Pagaste {{paid}} de {{count}}" })),
                },
                related: [
                    "/tools/loan-calculator",
                    "/guides/budget-planner",
                    "/tools/split-expenses-calculator",
                ] satisfies PageRef[],
                title: t({
                    en: "Installment calculator: pay in installments or cash?",
                    es: "Calculadora de cuotas y pago a plazos: ¿cuotas o contado?",
                }),
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
                        en: "Split Bill Calculator: Split Expenses and See Who Owes Whom · Outlayr",
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
                title: t({ en: "Split bill calculator: who owes whom", es: "Calculadora para dividir gastos" }),
            },
            "loan-calculator": {
                answer: {
                    cost: insert(
                        t({
                            en: "You pay {{payment}} a month for {{span}}. In total {{total}}, {{extra}} more than you borrowed.",
                            es: "Pagas {{payment}} al mes por {{span}}. En total {{total}}, {{extra}} más de lo que pediste.",
                        })
                    ),
                    empty: t({
                        en: "Add the amount and the term to see your monthly payment.",
                        es: "Pon el monto y el plazo para ver tu cuota mensual.",
                    }),
                    free: insert(
                        t({
                            en: "You pay {{payment}} a month for {{span}}, {{total}} in total, with no interest.",
                            es: "Pagas {{payment}} al mes por {{span}}, {{total}} en total, sin intereses.",
                        })
                    ),
                },
                faq: [
                    {
                        answer: t({
                            en: "Most banks use a fixed payment: amount × r ÷ (1 − (1 + r)^−n), where r is the annual rate ÷ 12 and n is the number of months. A $10,000 loan at 18% a year over 36 months has r = 1.5% and a payment of $361.52. Enter the amount, the rate and the term above and the calculator does this for any loan.",
                            es: "La mayoría de los bancos usa una cuota fija: monto × r ÷ (1 − (1 + r)^−n), donde r es la tasa anual ÷ 12 y n es el número de meses. Un préstamo de $10,000 al 18% anual a 36 meses tiene r = 1.5% y una cuota de $361.52. Pon el monto, la tasa y el plazo arriba y la calculadora hace la cuenta con cualquier préstamo.",
                        }),
                        question: t({
                            en: "How is a loan payment calculated?",
                            es: "¿Cómo se calcula la cuota de un préstamo?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The month by month list of your payments. Each row shows how much of the payment goes to interest, how much pays down the loan, and what you still owe. Interest takes its biggest share in the first months, and by the end almost all of the payment pays down the loan.",
                            es: "La lista mes a mes de tus cuotas. Cada fila muestra cuánto de la cuota se va en intereses, cuánto baja el préstamo y cuánto te falta por pagar. El interés se lleva su parte más grande en los primeros meses, y al final casi toda la cuota baja el préstamo.",
                        }),
                        question: t({
                            en: "What is an amortization schedule?",
                            es: "¿Qué es una tabla de amortización?",
                        }),
                    },
                    {
                        answer: t({
                            en: "A longer term lowers the payment but raises the interest. The same $10,000 at 18% costs $499.24 a month and $1,981.78 in interest over 24 months, $361.52 and $3,014.89 over 36, and $253.93 and $5,236.20 over 60.",
                            es: "Un plazo más largo baja la cuota pero sube los intereses. Los mismos $10,000 al 18% cuestan $499.24 al mes y $1,981.78 de intereses a 24 meses, $361.52 y $3,014.89 a 36, y $253.93 y $5,236.20 a 60.",
                        }),
                        question: t({
                            en: "Is a longer term better?",
                            es: "¿Conviene pedir el préstamo a más meses?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Enter the annual rate. If your lender quotes a monthly rate, multiply it by 12: 1.5% a month is 18% a year.",
                            es: "Pon la tasa anual. Si te dan una tasa mensual, multiplícala por 12: 1.5% al mes es 18% al año.",
                        }),
                        question: t({
                            en: "Do I enter the annual or the monthly rate?",
                            es: "¿Pongo la tasa anual o la mensual?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Log it as money you borrowed, under the bank or the person who lent it, and it shows as a balance until it is paid back. Add a payoff plan with a date and Outlayr shows what that takes a month, and whether you are ahead or behind. The free plan holds 3 people and 2 payoff plans.",
                            es: "Sí. Anótalo como dinero que te prestaron, a nombre del banco o de quien te prestó, y queda como saldo hasta que lo pagas. Ponle un plan de pago con fecha y Outlayr te muestra cuánto toca al mes y si vas adelantado o atrasado. El plan gratis permite 3 personas y 2 planes de pago.",
                        }),
                        question: t({
                            en: "Can Outlayr track my loan?",
                            es: "¿Outlayr puede llevar mi préstamo?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    amount: t({ en: "Amount", es: "Monto" }),
                    fee: t({ en: "Upfront fee", es: "Comisión de apertura" }),
                    rate: t({ en: "Annual rate", es: "Tasa anual" }),
                    term: t({ en: "Term", es: "Plazo" }),
                    unit: t({ en: "Term in", es: "Plazo en" }),
                },
                lead: t({
                    en: "See the monthly payment on a personal, car or home loan, the interest you pay, and the month by month amortization schedule, with an optional upfront fee.",
                    es: "Calcula la cuota mensual de un préstamo personal, de auto o hipotecario, cuánto pagas de intereses y la tabla de amortización mes a mes, con comisión de apertura.",
                }),
                meta: {
                    title: t({
                        en: "Loan Calculator: Monthly Payment and Amortization · Outlayr",
                        es: "Calculadora de préstamos: cuota y tabla de amortización",
                    }),
                },
                method: [
                    t({
                        en: "The calculator uses a fixed payment, the French system most banks use for personal, car and home loans. Interest takes its biggest share early on. Each payment lowers what you owe, so the interest shrinks and more of the payment goes to the loan.",
                        es: "La calculadora usa una cuota fija, el sistema francés que usan casi todos los bancos para préstamos personales, de auto e hipotecarios. Al principio el interés se lleva su parte más grande. Cada pago baja el saldo, así que el interés baja y más de la cuota se va al préstamo.",
                    }),
                    t({
                        en: "As a formula: payment = amount × r ÷ (1 − (1 + r)^−n), where r is the annual rate ÷ 12 and n is the number of months. With the starting example, $10,000 at 18% over 36 months, r is 1.5% and the payment is $361.52. In the first month $150 is interest and $211.52 pays down the loan.",
                        es: "Como fórmula: cuota = monto × r ÷ (1 − (1 + r)^−n), donde r es la tasa anual ÷ 12 y n es el número de meses. Con el ejemplo inicial, $10,000 al 18% a 36 meses, r es 1.5% y la cuota es de $361.52. El primer mes $150 son intereses y $211.52 bajan el préstamo.",
                    }),
                    t({
                        en: "Each month the interest is what you owe × r, rounded to the cent. Because of that rounding the last payment can be a few cents off: it is the one that leaves the balance at zero. At 0% the payment is the amount ÷ the number of months.",
                        es: "Cada mes el interés es el saldo × r, redondeado al centavo. Por ese redondeo la última cuota puede variar unos centavos: es la que deja el saldo en cero. Con tasa 0% la cuota es el monto ÷ el número de meses.",
                    }),
                    t({
                        en: "The upfront fee is a percentage of the amount, charged once when you get the loan. It adds to the total you pay but not to the payment. Insurance, taxes and other charges a lender adds to each payment are not included, so your real payment can be higher.",
                        es: "La comisión de apertura es un porcentaje del monto que se cobra una vez al recibir el préstamo. Se suma al total que pagas, pero no a la cuota. No incluye seguros, impuestos ni otros cargos que el banco sume a cada cuota, así que tu cuota real puede ser más alta.",
                    }),
                ],
                preview: {
                    payment: t({ en: "Monthly payment", es: "Cuota mensual" }),
                    split: insert(
                        t({
                            en: "Principal {{principal}} · Interest {{interest}}",
                            es: "Capital {{principal}} · Intereses {{interest}}",
                        })
                    ),
                },
                related: [
                    "/tools/installment-calculator",
                    "/tools/50-30-20-budget-calculator",
                    "/guides/budget-planner",
                ] satisfies PageRef[],
                table: {
                    all: insert(t({ en: "See all {{count}} months", es: "Ver los {{count}} meses" })),
                    balance: t({ en: "Balance", es: "Saldo" }),
                    interest: t({ en: "Interest", es: "Interés" }),
                    last: insert(t({ en: "Last payment {{amount}}", es: "Última cuota {{amount}}" })),
                    less: t({ en: "Show less", es: "Ver menos" }),
                    month: t({ en: "Month", es: "Mes" }),
                    principal: t({ en: "Principal", es: "Capital" }),
                },
                term: {
                    one: t({ en: "1 month", es: "1 mes" }),
                    other: insert(t({ en: "{{n}} months", es: "{{n}} meses" })),
                },
                title: t({
                    en: "Loan calculator: monthly payment and amortization schedule",
                    es: "Calculadora de préstamos: cuota mensual y tabla de amortización",
                }),
                units: {
                    months: t({ en: "Months", es: "Meses" }),
                    years: t({ en: "Years", es: "Años" }),
                },
            },
            "dolar-bcv-hoy": {
                faq: [
                    {
                        answer: t({
                            en: "The official exchange rate the Banco Central de Venezuela publishes for the bolívar against the dollar. It comes from the operations at the exchange desks of the banks, and it is the official reference for turning dollars into bolívares.",
                            es: "El tipo de cambio oficial que publica el Banco Central de Venezuela para el bolívar frente al dólar. Sale de las operaciones de las mesas de cambio de los bancos, y es la referencia oficial para pasar dólares a bolívares.",
                        }),
                        question: t({ en: "What is the BCV rate?", es: "¿Qué es la tasa del BCV?" }),
                    },
                    {
                        answer: t({
                            en: "The BCV publishes a rate for each business day, so it changes once a day and not minute by minute. Its row on this page shows the date it is valid for.",
                            es: "El BCV publica una tasa para cada día hábil, así que cambia una vez al día y no minuto a minuto. Su fila en esta página muestra la fecha para la que vale.",
                        }),
                        question: t({
                            en: "How often does the BCV rate change?",
                            es: "¿Cada cuánto cambia la tasa del BCV?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is a multi-currency expense tracker that keeps the rate it used next to every entry. For a purchase in bolívares it offers USD (BCV) and EUR (BCV), both from the central bank's published rates, and My rate when the one you got was different.",
                            es: "Sí. Outlayr es una app para controlar gastos en varias monedas que guarda la tasa que usó junto a cada registro. Para una compra en bolívares te ofrece USD (BCV) y EUR (BCV), las dos de las tasas que publica el banco central, y Mi tasa cuando la que te dieron fue distinta.",
                        }),
                        question: t({
                            en: "Can Outlayr log my spending in bolívares and dollars?",
                            es: "¿Outlayr puede llevar mis gastos en bolívares y en dólares?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                lead: t({
                    en: "Today's official BCV rate for the dollar in Venezuela, with a calculator to turn dollars into bolívares and back.",
                    es: "La tasa oficial del BCV para el dólar en Venezuela hoy, con una calculadora para convertir bolívares a dólares y dólares a bolívares.",
                }),
                meta: {
                    title: t({
                        en: "BCV Dollar Rate Today and USD to Bolívar Calculator · Outlayr",
                        es: "Calculadora dólar BCV: convertir bolívares a dólares hoy · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "The official rate is the one the Banco Central de Venezuela publishes. It is published for a date, so its row shows that date and no time.",
                        es: "La tasa oficial es la que publica el Banco Central de Venezuela. Se publica para una fecha, así que su fila muestra esa fecha y no una hora.",
                    }),
                    t({
                        en: "The calculator multiplies dollars by the rate you pick, or divides bolívares by it, and rounds to the cent. Banks and shops can give you a different rate, so use it as a reference.",
                        es: "La calculadora multiplica los dólares por la tasa que elijas, o divide los bolívares entre ella, y redondea al centavo. Los bancos y las tiendas pueden darte otra tasa, así que úsala como referencia.",
                    }),
                    t({
                        en: "This page refreshes the rates from DolarApi every few hours, so a rate can be a few hours old, and each row shows when its source last updated it. If DolarApi can't be reached, the page says so instead of showing an old number.",
                        es: "Esta página actualiza las tasas desde DolarApi cada pocas horas, así que una tasa puede tener unas horas, y cada fila muestra cuándo la actualizó su fuente. Si no se puede llegar a DolarApi, la página lo dice en vez de mostrar un número viejo.",
                    }),
                ],
                related: [
                    "/guides/multi-currency-expense-tracker",
                    "/guides/best-expense-tracker-apps-latin-america",
                    "/tools/dolar-hoy-bolivia",
                ] satisfies PageRef[],
                title: t({
                    en: "BCV dollar today: the official rate in Venezuela",
                    es: "Calculadora dólar BCV: la tasa oficial de hoy",
                }),
            },
            "dolar-hoy-argentina": {
                faq: [
                    {
                        answer: t({
                            en: "It depends on what you are doing. Official is the retail rate at banks, card is for paying in dollars with a card, MEP and CCL come from trading bonds or stocks, and blue is the informal market. Check the rate your bank, shop or card uses before you convert.",
                            es: "Depende de lo que vayas a hacer. El oficial es el precio minorista en los bancos, la tarjeta es para pagar en dólares con tarjeta, el MEP y el CCL salen de operar bonos o acciones, y el blue es el mercado informal. Revisa qué cotización usa tu banco, tu comercio o tu tarjeta antes de convertir.",
                        }),
                        question: t({ en: "Which dollar should I look at?", es: "¿Qué dólar tengo que mirar?" }),
                    },
                    {
                        answer: t({
                            en: "Both come from buying a bond or stock with pesos and selling it for dollars. With MEP the dollars stay in Argentina, and with CCL they go to an account abroad.",
                            es: "Los dos salen de comprar un bono o una acción con pesos y venderlo por dólares. Con el MEP los dólares quedan en Argentina, y con el CCL van a una cuenta en el exterior.",
                        }),
                        question: t({
                            en: "What is the difference between MEP and CCL?",
                            es: "¿Cuál es la diferencia entre el dólar MEP y el CCL?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Because it adds the taxes charged on card purchases in dollars to the official rate.",
                            es: "Porque le suma al oficial los impuestos que se cobran en las compras con tarjeta en dólares.",
                        }),
                        question: t({
                            en: "Why is the card dollar higher than the official one?",
                            es: "¿Por qué el dólar tarjeta es más alto que el oficial?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is a multi-currency expense tracker that keeps the rate it used next to every entry. Choose My rate and type the rate you actually got, such as the blue or MEP rate you paid, and the entry keeps it.",
                            es: "Sí. Outlayr es una app para controlar gastos en varias monedas que guarda la tasa que usó junto a cada registro. Elige Mi tasa y escribe la que te dieron, como el blue o el MEP al que pagaste, y el registro la conserva.",
                        }),
                        question: t({
                            en: "Can Outlayr log my spending in pesos and dollars?",
                            es: "¿Outlayr puede llevar mis gastos en pesos y en dólares?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                lead: t({
                    en: "Today's blue, official, MEP, CCL, card, wholesale and crypto dollar in Argentina, with a calculator to turn dollars into pesos and back.",
                    es: "El dólar blue, oficial, MEP, CCL, tarjeta, mayorista y cripto de hoy en Argentina, con una calculadora para pasar de dólares a pesos y de pesos a dólares.",
                }),
                meta: {
                    title: t({
                        en: "Dollar Rate Today in Argentina: Blue, Official, MEP, Card · Outlayr",
                        es: "Dólar hoy Argentina: blue, oficial, MEP y tarjeta · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "Each row is a different dollar in Argentina. Official is the retail price at banks, and wholesale is the rate for operations between banks. Blue is the informal market, and crypto is what a dollar costs in stablecoins such as USDT.",
                        es: "Cada fila es un dólar distinto en Argentina. El oficial es el precio minorista en los bancos, y el mayorista es la cotización de las operaciones entre bancos. El blue es el mercado informal, y el cripto es lo que cuesta un dólar en stablecoins como el USDT.",
                    }),
                    t({
                        en: "MEP, also called bolsa, and CCL, contado con liquidación, both come from buying a bond or stock in pesos and selling it for dollars. With MEP the dollars stay in Argentina, and with CCL they end up abroad. Card is the official rate plus the taxes charged on card purchases in dollars.",
                        es: "El MEP, también llamado bolsa, y el CCL, contado con liquidación, salen de comprar un bono o una acción en pesos y venderlo por dólares. Con el MEP los dólares quedan en Argentina, y con el CCL terminan en el exterior. La tarjeta es el oficial más los impuestos que se cobran en las compras con tarjeta en dólares.",
                    }),
                    t({
                        en: "Most rows have a buy and a sell price. The calculator uses the sell price, which is what it costs to buy one dollar. If you are selling dollars, the buy price is the one you get. Amounts are multiplied or divided by the rate and rounded to the cent.",
                        es: "La mayoría de las filas tiene un precio de compra y uno de venta. La calculadora usa el de venta, que es lo que cuesta comprar un dólar. Si vas a vender dólares, el que te pagan es el de compra. Los montos se multiplican o se dividen por la tasa y se redondean al centavo.",
                    }),
                    t({
                        en: "This page refreshes the rates from DolarApi every few hours, so a rate can be a few hours old, and each row shows when its source last updated it. If DolarApi can't be reached, the page says so instead of showing an old number.",
                        es: "Esta página actualiza las tasas desde DolarApi cada pocas horas, así que una tasa puede tener unas horas, y cada fila muestra cuándo la actualizó su fuente. Si no se puede llegar a DolarApi, la página lo dice en vez de mostrar un número viejo.",
                    }),
                ],
                related: [
                    "/guides/multi-currency-expense-tracker",
                    "/guides/best-expense-tracker-apps-latin-america",
                    "/tools/dolar-hoy-bolivia",
                ] satisfies PageRef[],
                title: t({
                    en: "Dollar today in Argentina: blue, official, MEP and card",
                    es: "Dólar hoy en Argentina: blue, oficial, MEP y tarjeta",
                }),
            },
            "dolar-hoy-bolivia": {
                faq: [
                    {
                        answer: t({
                            en: "It is the price people pay each other for dollars outside the banks, also called the parallel dollar. This page shows the Binance P2P price, where people trade USDT, a stablecoin worth one dollar, for bolivianos. It is the closest public number to the blue dollar, so many people call it the Binance dollar.",
                            es: "Es el precio al que la gente se compra y se vende dólares fuera de los bancos, también llamado dólar paralelo. Esta página muestra el precio de Binance P2P, donde la gente cambia USDT, una stablecoin que vale un dólar, por bolivianos. Es el número público más cercano al dólar blue, por eso muchos le dicen dólar Binance.",
                        }),
                        question: t({
                            en: "What is the blue dollar in Bolivia?",
                            es: "¿Qué es el dólar blue en Bolivia?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The official rate is the one the Banco Central de Bolivia publishes for each day. The parallel rate comes from what people agree to pay each other on Binance, so it moves all day with supply and demand.",
                            es: "El oficial es el que publica el Banco Central de Bolivia para cada día. El paralelo sale de lo que la gente acuerda pagarse en Binance, así que se mueve todo el día con la oferta y la demanda.",
                        }),
                        question: t({
                            en: "Why is the parallel dollar different from the official one?",
                            es: "¿Por qué el dólar paralelo es distinto del oficial?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr is a multi-currency expense tracker that keeps the rate it used next to every entry. Choose My rate and type the rate you actually got, such as the parallel rate you paid, and the entry keeps it.",
                            es: "Sí. Outlayr es una app para controlar gastos en varias monedas que guarda la tasa que usó junto a cada registro. Elige Mi tasa y escribe la que te dieron, como el paralelo al que pagaste, y el registro la conserva.",
                        }),
                        question: t({
                            en: "Can Outlayr log my spending in bolivianos and dollars?",
                            es: "¿Outlayr puede llevar mis gastos en bolivianos y en dólares?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                lead: t({
                    en: "Today's parallel dollar in Bolivia, also called the blue dollar, from the Binance P2P market, and the official rate from the BCB, with a calculator to turn dollars into bolivianos and back.",
                    es: "El dólar blue o paralelo de hoy en Bolivia, del mercado P2P de Binance, y el oficial del BCB, con una calculadora para pasar de dólares a bolivianos y de bolivianos a dólares.",
                }),
                meta: {
                    title: t({
                        en: "Dollar Rate Today in Bolivia: Parallel (Blue) and Official · Outlayr",
                        es: "Dólar blue Bolivia hoy: paralelo, oficial y calculadora · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "The parallel row is the USDT price on Binance P2P, the market people mean by the blue or parallel dollar. It is not a bank rate. The official row is the rate the Banco Central de Bolivia publishes for a date, so it shows that date and no time.",
                        es: "La fila del paralelo es el precio del USDT en Binance P2P, el mercado al que la gente se refiere con dólar blue o paralelo. No es una tasa de banco. La fila del oficial es la tasa que publica el Banco Central de Bolivia para una fecha, así que muestra esa fecha y no una hora.",
                    }),
                    t({
                        en: "Each row has a buy and a sell price. The calculator uses the sell price, which is what it costs to buy one dollar. If you are selling dollars, the buy price is the one you get. Amounts are multiplied or divided by the rate and rounded to the cent.",
                        es: "Cada fila tiene un precio de compra y uno de venta. La calculadora usa el de venta, que es lo que cuesta comprar un dólar. Si vas a vender dólares, el que te pagan es el de compra. Los montos se multiplican o se dividen por la tasa y se redondean al centavo.",
                    }),
                    t({
                        en: "This page refreshes the rates from DolarApi every few hours, so a rate can be a few hours old, and each row shows when its source last updated it. If DolarApi can't be reached, the page says so instead of showing an old number.",
                        es: "Esta página actualiza las tasas desde DolarApi cada pocas horas, así que una tasa puede tener unas horas, y cada fila muestra cuándo la actualizó su fuente. Si no se puede llegar a DolarApi, la página lo dice en vez de mostrar un número viejo.",
                    }),
                ],
                related: [
                    "/guides/multi-currency-expense-tracker",
                    "/guides/best-expense-tracker-apps-latin-america",
                    "/tools/dolar-hoy-argentina",
                ] satisfies PageRef[],
                title: t({
                    en: "Dollar today in Bolivia: parallel and official",
                    es: "Dólar blue Bolivia hoy: paralelo y oficial",
                }),
            },
        },
    },
    key: "tools",
} satisfies Dictionary;

export default tools;
