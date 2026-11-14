import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

import type { PageRef } from "@/lib/site";

const PRIVACY_FAQ = {
    answer: t({
        en: "No. The math runs in your browser, and nothing you type is stored or sent anywhere.",
        es: "No. Las cuentas se hacen en tu navegador, y nada de lo que escribes se guarda ni se envía.",
        pt: "Não. As contas são feitas no seu navegador, e nada do que você digita é salvo ou enviado.",
        fr: "Non. Les calculs se font dans votre navigateur, et rien de ce que vous saisissez n'est enregistré ni envoyé.",
    }),
    question: t({
        en: "Is what I type saved?",
        es: "¿Se guarda lo que escribo?",
        pt: "O que eu digito fica salvo?",
        fr: "Ce que je saisis est-il enregistré ?",
    }),
};

const tools = {
    content: {
        hub: {
            lead: t({
                en: "Split a paycheck, add up your subscriptions, see what an installment plan really costs, or settle a shared bill. Free, and nothing you type leaves your browser.",
                es: "Reparte tu sueldo, suma tus suscripciones, mira cuánto cuesta de verdad un plan de cuotas o salda una cuenta compartida. Gratis, y nada de lo que escribes sale de tu navegador.",
                pt: "Divida seu salário, some suas assinaturas, veja quanto custa de verdade um parcelamento ou acerte uma conta dividida. Grátis, e nada do que você digita sai do seu navegador.",
                fr: "Répartissez votre salaire, additionnez vos abonnements, voyez ce que coûte vraiment un paiement en plusieurs fois ou réglez une dépense partagée. Gratuit, et rien de ce que vous saisissez ne quitte votre navigateur.",
            }),
            meta: {
                description: t({
                    en: "Split a paycheck, add up your subscriptions, see what an installment plan really costs, or settle a shared bill. Free, and nothing you type leaves your browser.",
                    es: "Reparte tu sueldo, suma tus suscripciones, mira cuánto cuesta un plan de cuotas o salda una cuenta compartida. Gratis, y nada sale de tu navegador.",
                    pt: "Calculadoras financeiras grátis: divida seu salário, some suas assinaturas, veja quanto custa um parcelamento ou divida uma conta. Nada sai do seu navegador.",
                    fr: "Calculateurs de budget gratuits : salaire, abonnements, paiement en plusieurs fois, addition à partager. Rien ne quitte votre navigateur.",
                }),
                title: t({
                    en: "Free Money Calculators · Outlayr",
                    es: "Calculadoras de dinero gratis · Outlayr",
                    pt: "Calculadoras financeiras grátis · Outlayr",
                    fr: "Calculateurs de budget gratuits · Outlayr",
                }),
            },
            title: t({
                en: "Free money calculators for everyday math",
                es: "Calculadoras de dinero gratis para cada día",
                pt: "Calculadoras financeiras grátis para o dia a dia",
                fr: "Calculateurs de budget gratuits pour le quotidien",
            }),
        },
        labels: {
            at: {
                month: insert(t({ en: "month {{n}}", es: "el mes {{n}}", pt: "no mês {{n}}", fr: "au mois {{n}}" })),
                week: insert(
                    t({ en: "week {{n}}", es: "la semana {{n}}", pt: "na semana {{n}}", fr: "la semaine {{n}}" })
                ),
            },
            cadences: {
                month: t({ en: "Month", es: "Mes", pt: "Mês", fr: "Mois" }),
                quarter: t({ en: "3 months", es: "3 meses", pt: "3 meses", fr: "3 mois" }),
                twoWeeks: t({ en: "2 weeks", es: "2 semanas", pt: "2 semanas", fr: "2 semaines" }),
                week: t({ en: "Week", es: "Semana", pt: "Semana", fr: "Semaine" }),
                year: t({ en: "Year", es: "Año", pt: "Ano", fr: "Année" }),
            },
            currency: t({ en: "Currency", es: "Moneda", pt: "Moeda", fr: "Devise" }),
            every: t({ en: "Every", es: "Cada", pt: "A cada", fr: "Fréquence" }),
            method: t({
                en: "How it is calculated",
                es: "Cómo se calcula",
                pt: "Como é calculado",
                fr: "Mode de calcul",
            }),
            more: insert(
                t({
                    en: "And {{count}} more",
                    es: "Y {{count}} más",
                    pt: "E mais {{count}}",
                    fr: "Et {{count}} de plus",
                })
            ),
            rates: {
                amount: t({ en: "Amount", es: "Monto", pt: "Valor", fr: "Montant" }),
                buy: t({ en: "buy", es: "compra", pt: "compra", fr: "achat" }),
                convert: t({ en: "Convert", es: "Convertir", pt: "Converter", fr: "Convertir" }),
                kinds: {
                    bcb: t({ en: "Official (BCB)", es: "Oficial (BCB)", pt: "Oficial (BCB)", fr: "Officiel (BCB)" }),
                    bcv: t({ en: "Official (BCV)", es: "Oficial (BCV)", pt: "Oficial (BCV)", fr: "Officiel (BCV)" }),
                    binance: t({
                        en: "Parallel (Binance P2P)",
                        es: "Paralelo (Binance P2P)",
                        pt: "Paralelo (Binance P2P)",
                        fr: "Parallèle (Binance P2P)",
                    }),
                    blue: t({ en: "Blue", es: "Blue", pt: "Blue", fr: "Blue" }),
                    ccl: t({
                        en: "CCL (contado con liquidación)",
                        es: "CCL (contado con liquidación)",
                        pt: "CCL (contado con liquidación)",
                        fr: "CCL (contado con liquidación)",
                    }),
                    cripto: t({ en: "Crypto", es: "Cripto", pt: "Cripto", fr: "Crypto" }),
                    mayorista: t({ en: "Wholesale", es: "Mayorista", pt: "Atacado", fr: "De gros" }),
                    mep: t({ en: "MEP (bolsa)", es: "MEP (bolsa)", pt: "MEP (bolsa)", fr: "MEP (bolsa)" }),
                    oficial: t({ en: "Official", es: "Oficial", pt: "Oficial", fr: "Officiel" }),
                    tarjeta: t({ en: "Card", es: "Tarjeta", pt: "Cartão", fr: "Carte" }),
                },
                rate: t({ en: "Dollar", es: "Dólar", pt: "Dólar", fr: "Dollar" }),
                result: insert(
                    t({
                        en: "{{from}} is {{to}} at the {{rate}} rate",
                        es: "{{from}} son {{to}} al dólar {{rate}}",
                        pt: "{{from}} são {{to}} no dólar {{rate}}",
                        fr: "{{from}} font {{to}} au taux {{rate}}",
                    })
                ),
                sell: t({ en: "sell", es: "venta", pt: "venda", fr: "vente" }),
                source: insert(
                    t({
                        en: "Rates from {{service}}, which takes each one from the source linked on its row. Each row shows when that source last updated it.",
                        es: "Tasas de {{service}}, que toma cada una de la fuente enlazada en su fila. Cada fila muestra cuándo la actualizó esa fuente.",
                        pt: "Cotações do {{service}}, que pega cada uma da fonte indicada na sua linha. Cada linha mostra quando essa fonte a atualizou pela última vez.",
                        fr: "Taux fournis par {{service}}, qui reprend chacun de la source liée sur sa ligne. Chaque ligne indique quand cette source l'a mis à jour pour la dernière fois.",
                    })
                ),
                unavailable: t({
                    en: "The rate is unavailable right now. Try again in a few minutes.",
                    es: "La tasa no está disponible en este momento. Intenta de nuevo en unos minutos.",
                    pt: "A cotação não está disponível agora. Tente de novo em alguns minutos.",
                    fr: "Le taux n'est pas disponible pour le moment. Réessayez dans quelques minutes.",
                }),
            },
            remove: t({ en: "Remove", es: "Quitar", pt: "Remover", fr: "Retirer" }),
            row: {
                month: insert(t({ en: "Month {{n}}", es: "Mes {{n}}", pt: "Mês {{n}}", fr: "Mois {{n}}" })),
                today: t({ en: "Today", es: "Hoy", pt: "Hoje", fr: "Aujourd'hui" }),
                week: insert(t({ en: "Week {{n}}", es: "Semana {{n}}", pt: "Semana {{n}}", fr: "Semaine {{n}}" })),
            },
        },
        pages: {
            "50-30-20-budget-calculator": {
                answer: insert(
                    t({
                        en: "Spend up to {{needs}} on needs and {{wants}} on wants, and save {{savings}} a month.",
                        es: "Gasta hasta {{needs}} en necesidades y {{wants}} en gustos, y ahorra {{savings}} al mes.",
                        pt: "Gaste até {{needs}} com necessidades e {{wants}} com desejos, e guarde {{savings}} por mês.",
                        fr: "Dépensez jusqu'à {{needs}} pour les besoins et {{wants}} pour les envies, et épargnez {{savings}} par mois.",
                    })
                ),
                buckets: [
                    {
                        name: t({ en: "Needs", es: "Necesidades", pt: "Necessidades", fr: "Besoins" }),
                        text: t({
                            en: "Rent, groceries, utilities, transport, insurance, minimum debt payments",
                            es: "Renta, súper, servicios, transporte, seguros, pagos mínimos de deudas",
                            pt: "Aluguel, mercado, contas da casa, transporte, seguros, pagamentos mínimos de dívidas",
                            fr: "Loyer, courses, factures, transports, assurances, remboursements minimums de dettes",
                        }),
                    },
                    {
                        name: t({ en: "Wants", es: "Gustos", pt: "Desejos", fr: "Envies" }),
                        text: t({
                            en: "Eating out, streaming, shopping, trips",
                            es: "Comer fuera, streaming, compras, viajes",
                            pt: "Comer fora, streaming, compras, viagens",
                            fr: "Restaurants, streaming, shopping, voyages",
                        }),
                    },
                    {
                        name: t({ en: "Savings", es: "Ahorro", pt: "Poupança", fr: "Épargne" }),
                        text: t({
                            en: "Emergency fund, retirement, paying debt down faster",
                            es: "Fondo de emergencia, retiro, pagar deudas más rápido",
                            pt: "Reserva de emergência, aposentadoria, quitar dívidas mais rápido",
                            fr: "Épargne de précaution, retraite, rembourser ses dettes plus vite",
                        }),
                    },
                ],
                columns: {
                    month: t({ en: "A month", es: "Al mes", pt: "Por mês", fr: "Par mois" }),
                    share: t({ en: "Share", es: "Parte", pt: "Parte", fr: "Part" }),
                    year: t({ en: "A year", es: "Al año", pt: "Por ano", fr: "Par an" }),
                },
                faq: [
                    {
                        answer: t({
                            en: "On net pay: what lands in your account after taxes and deductions. If your employer takes retirement savings out of your paycheck, you can count it toward the 20%.",
                            es: "Sobre el sueldo neto: lo que te llega a la cuenta después de impuestos y descuentos. Si tu empresa te descuenta un aporte para el retiro, puedes contarlo dentro del 20%.",
                            pt: "Sobre o salário líquido: o que cai na sua conta depois de impostos e descontos. Se a empresa desconta do seu salário uma contribuição para a aposentadoria, você pode contá-la dentro dos 20%.",
                            fr: "Sur le salaire net : ce qui arrive sur votre compte après impôts et cotisations. Si votre employeur prélève une épargne retraite sur votre salaire, vous pouvez la compter dans les 20 %.",
                        }),
                        question: t({
                            en: "Is the 50/30/20 rule based on gross or net pay?",
                            es: "¿La regla 50/30/20 se calcula sobre el sueldo bruto o el neto?",
                            pt: "A regra 50/30/20 é sobre o salário bruto ou o líquido?",
                            fr: "La règle 50/30/20 se calcule-t-elle sur le salaire brut ou net ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Minimum payments are needs. Anything you pay above the minimum counts as savings, since it lowers what you owe.",
                            es: "Los pagos mínimos son necesidades. Lo que pagues por encima del mínimo cuenta como ahorro, porque baja lo que debes.",
                            pt: "Os pagamentos mínimos são necessidades. O que você paga acima do mínimo conta como poupança, porque diminui o que você deve.",
                            fr: "Les remboursements minimums sont des besoins. Ce que vous remboursez au-delà compte comme de l'épargne, puisque cela réduit ce que vous devez.",
                        }),
                        question: t({
                            en: "Where do debt payments go?",
                            es: "¿Dónde van los pagos de deudas?",
                            pt: "Onde entram os pagamentos de dívidas?",
                            fr: "Où placer les remboursements de dettes ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Track what you spend against each part. In Outlayr you can set a budget per category or one for the whole month, and see where your current pace ends before the month does.",
                            es: "Anota lo que gastas en cada parte. En Outlayr puedes poner un presupuesto por categoría o uno para todo el mes, y ver a dónde te lleva tu ritmo antes de que termine el mes.",
                            pt: "Acompanhe o que você gasta em cada parte. No Outlayr você pode definir um orçamento por categoria ou um para o mês inteiro, e ver aonde seu ritmo atual leva antes de o mês acabar.",
                            fr: "Suivez ce que vous dépensez dans chaque partie. Dans Outlayr, vous pouvez fixer un budget par catégorie ou un seul pour tout le mois, et voir où mène votre rythme actuel avant la fin du mois.",
                        }),
                        question: t({
                            en: "How do I stick to it?",
                            es: "¿Cómo lo cumplo?",
                            pt: "Como seguir a regra?",
                            fr: "Comment s'y tenir ?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    income: t({ en: "Take home pay", es: "Sueldo neto", pt: "Salário líquido", fr: "Salaire net" }),
                    split: t({ en: "Split", es: "Reparto", pt: "Divisão", fr: "Répartition" }),
                },
                lead: t({
                    en: "Split your take home pay into needs, wants, and savings, by the 50/30/20 rule or a stricter split.",
                    es: "Reparte tu sueldo neto entre necesidades, gustos y ahorro con la regla 50/30/20 o un reparto más ajustado.",
                    pt: "Divida seu salário líquido entre necessidades, desejos e poupança com a regra 50/30/20 ou uma divisão mais apertada.",
                    fr: "Répartissez votre salaire net entre besoins, envies et épargne avec la règle 50/30/20 ou une répartition plus stricte.",
                }),
                meta: {
                    title: t({
                        en: "50/30/20 Budget Calculator · Outlayr",
                        es: "Calculadora regla 50 30 20: reparte tu sueldo · Outlayr",
                        pt: "Calculadora da regra 50/30/20 · Outlayr",
                        fr: "Règle 50/30/20 : calculateur de budget · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "The 50/30/20 rule splits what you take home after taxes: half for needs, 30% for things you want, and 20% for savings and paying down debt. Elizabeth Warren and her daughter, Amelia Warren Tyagi, set it out in their 2005 book All Your Worth: The Ultimate Lifetime Money Plan.",
                        es: "La regla 50/30/20 reparte lo que te queda después de impuestos: la mitad para necesidades, 30% para gustos y 20% para ahorrar y pagar deudas. La propusieron Elizabeth Warren y su hija, Amelia Warren Tyagi, en su libro de 2005 All Your Worth: The Ultimate Lifetime Money Plan.",
                        pt: "A regra 50/30/20 divide o que você recebe depois dos impostos: metade para necessidades, 30% para desejos e 20% para poupança e para quitar dívidas. Elizabeth Warren e a filha, Amelia Warren Tyagi, a apresentaram em 2005 no livro All Your Worth: The Ultimate Lifetime Money Plan.",
                        fr: "La règle 50/30/20 répartit ce que vous touchez après impôts : la moitié pour les besoins, 30 % pour les envies et 20 % pour l'épargne et le remboursement des dettes. Elizabeth Warren et sa fille, Amelia Warren Tyagi, l'ont présentée en 2005 dans leur livre All Your Worth: The Ultimate Lifetime Money Plan.",
                    }),
                    t({
                        en: "Paid weekly or every two weeks? The calculator first turns your pay into a year at 52 weeks, then a month, so a month gets 4.33 weekly paychecks, not 4.",
                        es: "¿Te pagan cada semana o cada dos semanas? La calculadora primero lleva tu pago a un año de 52 semanas y luego a un mes, así que un mes recibe 4.33 pagos semanales, no 4.",
                        pt: "Recebe por semana ou a cada duas semanas? A calculadora primeiro converte seu pagamento em um ano de 52 semanas e depois em um mês, então um mês recebe 4,33 pagamentos semanais, não 4.",
                        fr: "Payé chaque semaine ou toutes les deux semaines ? Le calculateur convertit d'abord votre salaire sur une année de 52 semaines, puis sur un mois : un mois compte donc 4,33 paies hebdomadaires, pas 4.",
                    }),
                    t({
                        en: "If half your pay doesn't cover your needs, as in a city with high rent, start from 60/20/20 or 70/20/10 and work your way back.",
                        es: "Si la mitad de tu sueldo no alcanza para las necesidades, como pasa en una ciudad donde la renta es cara, empieza con 60/20/20 o 70/20/10 y ve ajustando.",
                        pt: "Se metade do salário não cobre suas necessidades, como numa cidade de aluguel caro, comece com 60/20/20 ou 70/20/10 e vá ajustando.",
                        fr: "Si la moitié de votre salaire ne couvre pas vos besoins, comme dans une ville où les loyers sont élevés, partez de 60/20/20 ou 70/20/10 et ajustez peu à peu.",
                    }),
                ],
                related: [
                    "/guides/budget-planner",
                    "/guides/best-budget-apps",
                    "/guides/how-to-track-expenses",
                ] satisfies PageRef[],
                title: t({
                    en: "50/30/20 budget calculator",
                    es: "Calculadora de la regla 50 30 20",
                    pt: "Calculadora da regra 50/30/20",
                    fr: "Calculateur de la règle 50/30/20",
                }),
            },
            "subscription-cost-calculator": {
                answer: insert(
                    t({
                        en: "Your subscriptions cost {{monthly}} a month, {{yearly}} a year.",
                        es: "Tus suscripciones te cuestan {{monthly}} al mes, {{yearly}} al año.",
                        pt: "Suas assinaturas custam {{monthly}} por mês, {{yearly}} por ano.",
                        fr: "Vos abonnements coûtent {{monthly}} par mois, {{yearly}} par an.",
                    })
                ),
                add: t({
                    en: "Add subscription",
                    es: "Agregar suscripción",
                    pt: "Adicionar assinatura",
                    fr: "Ajouter un abonnement",
                }),
                empty: t({
                    en: "Add a subscription to see what it costs a year.",
                    es: "Agrega una suscripción para ver cuánto cuesta al año.",
                    pt: "Adicione uma assinatura para ver quanto ela custa por ano.",
                    fr: "Ajoutez un abonnement pour voir ce qu'il coûte par an.",
                }),
                examples: [
                    t({ en: "Streaming", es: "Streaming", pt: "Streaming", fr: "Streaming" }),
                    t({ en: "Music", es: "Música", pt: "Música", fr: "Musique" }),
                    t({
                        en: "Cloud storage",
                        es: "Almacenamiento en la nube",
                        pt: "Armazenamento na nuvem",
                        fr: "Stockage en ligne",
                    }),
                    t({ en: "Gym membership", es: "Membresía del gimnasio", pt: "Academia", fr: "Salle de sport" }),
                    t({ en: "News", es: "Noticias", pt: "Notícias", fr: "Presse" }),
                ],
                faq: [
                    {
                        answer: t({
                            en: "Search your email for receipts and look through the last two or three card statements for repeated charges. Check the subscriptions page of your App Store or Google Play account too.",
                            es: "Busca recibos en tu correo y revisa los últimos dos o tres estados de cuenta de tu tarjeta buscando cobros repetidos. Revisa también las suscripciones de tu cuenta del App Store o de Google Play.",
                            pt: "Procure recibos no seu e-mail e revise as duas ou três últimas faturas do cartão em busca de cobranças repetidas. Confira também as assinaturas da sua conta na App Store ou no Google Play.",
                            fr: "Cherchez les reçus dans vos e-mails et parcourez vos deux ou trois derniers relevés de carte à la recherche de prélèvements récurrents. Vérifiez aussi la page des abonnements de votre compte App Store ou Google Play.",
                        }),
                        question: t({
                            en: "How do I find all my subscriptions?",
                            es: "¿Cómo encuentro todas mis suscripciones?",
                            pt: "Como encontro todas as minhas assinaturas?",
                            fr: "Comment retrouver tous mes abonnements ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Usually. Divide the yearly price by 12 and compare it with the monthly one. A yearly plan only saves money if you would have kept paying all year.",
                            es: "Casi siempre. Divide el precio anual entre 12 y compáralo con el mensual. El plan anual solo te ahorra dinero si igual lo ibas a pagar todo el año.",
                            pt: "Geralmente. Divida o preço anual por 12 e compare com o mensal. O plano anual só economiza se você fosse pagar o ano inteiro de qualquer jeito.",
                            fr: "En général. Divisez le prix annuel par 12 et comparez-le au prix mensuel. Une formule annuelle ne fait économiser que si vous auriez payé toute l'année.",
                        }),
                        question: t({
                            en: "Is a yearly plan cheaper?",
                            es: "¿Conviene más el plan anual?",
                            pt: "O plano anual sai mais barato?",
                            fr: "Une formule annuelle revient-elle moins cher ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "No. Outlayr logs each subscription on its day, shows what they cost a month, and can remind you before each charge. You cancel with the company.",
                            es: "No. Outlayr registra cada suscripción en su día, te muestra cuánto cuestan al mes y puede avisarte antes de cada cobro. La cancelación la haces con la empresa.",
                            pt: "Não. O Outlayr registra cada assinatura no dia dela, mostra quanto elas custam por mês e pode avisar você antes de cada cobrança. O cancelamento é feito com a empresa.",
                            fr: "Non. Outlayr enregistre chaque abonnement à sa date, affiche ce qu'ils coûtent par mois et peut vous prévenir avant chaque prélèvement. La résiliation se fait auprès de l'entreprise.",
                        }),
                        question: t({
                            en: "Can Outlayr cancel subscriptions for me?",
                            es: "¿Outlayr puede cancelar mis suscripciones?",
                            pt: "O Outlayr pode cancelar minhas assinaturas?",
                            fr: "Outlayr peut-il résilier mes abonnements ?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    name: t({ en: "Subscription", es: "Suscripción", pt: "Assinatura", fr: "Abonnement" }),
                    price: t({ en: "Price", es: "Precio", pt: "Preço", fr: "Prix" }),
                    year: t({ en: "A year", es: "Al año", pt: "Por ano", fr: "Par an" }),
                },
                lead: t({
                    en: "Add up what your subscriptions and memberships cost a month and a year, whether they charge weekly, monthly, every 3 months, or once a year.",
                    es: "Suma lo que te cuestan tus suscripciones y membresías al mes y al año, ya cobren cada semana, cada mes, cada 3 meses o una vez al año.",
                    pt: "Some quanto suas assinaturas e mensalidades custam por mês e por ano, seja a cobrança semanal, mensal, a cada 3 meses ou anual.",
                    fr: "Additionnez ce que vos abonnements et adhésions coûtent par mois et par an, qu'ils soient prélevés chaque semaine, chaque mois, tous les 3 mois ou une fois par an.",
                }),
                meta: {
                    title: t({
                        en: "Subscription & Membership Cost Calculator · Outlayr",
                        es: "Calculadora de suscripciones y membresías · Outlayr",
                        pt: "Calculadora de gastos com assinaturas · Outlayr",
                        fr: "Calculateur du coût de vos abonnements · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "Every price becomes a yearly cost first: a weekly charge counts 52 times, a monthly one 12, one every 3 months 4, and a yearly one once. The monthly figure is that total divided by 12.",
                        es: "Cada precio se convierte primero en un costo anual: un cobro semanal cuenta 52 veces, uno mensual 12, uno cada 3 meses 4 y uno anual una vez. La cifra mensual es ese total dividido entre 12.",
                        pt: "Cada preço vira primeiro um custo anual: uma cobrança semanal conta 52 vezes, uma mensal 12, uma a cada 3 meses 4 e uma anual uma vez. O valor mensal é esse total dividido por 12.",
                        fr: "Chaque prix devient d'abord un coût annuel : un prélèvement hebdomadaire compte 52 fois, un mensuel 12, un tous les 3 mois 4 et un annuel une fois. Le montant mensuel est ce total divisé par 12.",
                    }),
                    t({
                        en: "As a formula: yearly cost = the sum of each price × its charges a year, and monthly cost = yearly cost ÷ 12.",
                        es: "Como fórmula: costo anual = la suma de cada precio × sus cobros al año, y costo mensual = costo anual ÷ 12.",
                        pt: "Em fórmula: custo anual = a soma de cada preço × suas cobranças por ano, e custo mensal = custo anual ÷ 12.",
                        fr: "En formule : coût annuel = la somme de chaque prix × ses prélèvements par an, et coût mensuel = coût annuel ÷ 12.",
                    }),
                    t({
                        en: "That is why a $5 weekly charge costs $21.67 a month, not $20: a month is a bit more than 4 weeks.",
                        es: "Por eso un cobro semanal de US$5 cuesta US$21.67 al mes y no US$20: un mes es un poco más de 4 semanas.",
                        pt: "Por isso uma cobrança semanal de R$ 5 custa R$ 21,67 por mês, e não R$ 20: um mês tem um pouco mais de 4 semanas.",
                        fr: "C'est pourquoi un prélèvement de 5 € par semaine coûte 21,67 € par mois, et non 20 € : un mois compte un peu plus de 4 semaines.",
                    }),
                    t({
                        en: "Outlayr's subscriptions screen counts the same way, so the totals match once you log them there.",
                        es: "La pantalla de suscripciones de Outlayr cuenta igual, así que los totales coinciden cuando las registras ahí.",
                        pt: "A tela de assinaturas do Outlayr calcula do mesmo jeito, então os totais batem quando você as registra lá.",
                        fr: "L'écran des abonnements d'Outlayr calcule de la même façon, donc les totaux concordent une fois que vous les y enregistrez.",
                    }),
                ],
                preview: {
                    month: t({ en: "a month", es: "al mes", pt: "por mês", fr: "par mois" }),
                    title: t({ en: "Subscriptions", es: "Suscripciones", pt: "Assinaturas", fr: "Abonnements" }),
                },
                related: [
                    "/guides/subscription-tracker",
                    "/guides/best-subscription-tracker-apps",
                    "/compare/pocketguard",
                ] satisfies PageRef[],
                title: t({
                    en: "Subscription cost calculator",
                    es: "Calculadora de suscripciones",
                    pt: "Calculadora de assinaturas",
                    fr: "Calculateur d'abonnements",
                }),
            },
            "installment-calculator": {
                answer: {
                    covered: insert(
                        t({
                            en: "Today's payment already covers the cash price, so you pay {{amount}} more than cash.",
                            es: "Lo que pagas hoy ya cubre el precio de contado, así que pagas {{amount}} más que de contado.",
                            pt: "O que você paga hoje já cobre o preço à vista, então você paga {{amount}} a mais do que à vista.",
                            fr: "Ce que vous payez aujourd'hui couvre déjà le prix comptant : vous payez donc {{amount}} de plus qu'au comptant.",
                        })
                    ),
                    empty: t({
                        en: "Add the list price and each payment to see what the plan costs.",
                        es: "Agrega el precio de lista y cada cuota para ver cuánto cuesta el plan.",
                        pt: "Informe o preço de tabela e o valor de cada parcela para ver quanto custa o parcelamento.",
                        fr: "Saisissez le prix affiché et chaque échéance pour voir ce que coûte le paiement en plusieurs fois.",
                    }),
                    less: insert(
                        t({
                            en: "You pay {{total}} in total, {{amount}} less than cash. Done by {{end}}.",
                            es: "Pagas {{total}} en total, {{amount}} menos que de contado. Terminas en {{end}}.",
                            pt: "Você paga {{total}} no total, {{amount}} a menos do que à vista. Você quita {{end}}.",
                            fr: "Vous payez {{total}} au total, {{amount}} de moins qu'au comptant. Dernier paiement {{end}}.",
                        })
                    ),
                    more: insert(
                        t({
                            en: "You pay {{total}} in total, {{amount}} more than cash, a yearly rate of {{rate}}. Done by {{end}}.",
                            es: "Pagas {{total}} en total, {{amount}} más que de contado, una tasa anual de {{rate}}. Terminas en {{end}}.",
                            pt: "Você paga {{total}} no total, {{amount}} a mais do que à vista, uma taxa anual de {{rate}}. Você quita {{end}}.",
                            fr: "Vous payez {{total}} au total, {{amount}} de plus qu'au comptant, soit un taux annuel de {{rate}}. Dernier paiement {{end}}.",
                        })
                    ),
                    paid: t({
                        en: "Today's payment covers the cash price, so there is nothing left to finance.",
                        es: "Lo que pagas hoy cubre el precio de contado, así que no queda nada por financiar.",
                        pt: "O que você paga hoje cobre o preço à vista, então não sobra nada para parcelar.",
                        fr: "Ce que vous payez aujourd'hui couvre le prix comptant : il ne reste rien à financer.",
                    }),
                    same: insert(
                        t({
                            en: "You pay {{total}} in total, the cash price, with no extra cost. Done by {{end}}.",
                            es: "Pagas {{total}} en total, el precio de contado, sin costo extra. Terminas en {{end}}.",
                            pt: "Você paga {{total}} no total, o preço à vista, sem custo extra. Você quita {{end}}.",
                            fr: "Vous payez {{total}} au total, soit le prix comptant, sans surcoût. Dernier paiement {{end}}.",
                        })
                    ),
                    verdict: {
                        cash: insert(
                            t({
                                en: "Pay cash. The installments are worth {{present}} in today's money against {{cash}} in cash, {{amount}} more.",
                                es: "Conviene pagar de contado. Las cuotas valen {{present}} en dinero de hoy contra {{cash}} de contado, {{amount}} más.",
                                pt: "Compensa pagar à vista. As parcelas valem {{present}} em dinheiro de hoje contra {{cash}} à vista, {{amount}} a mais.",
                                fr: "Payez comptant. Les échéances valent {{present}} en argent d'aujourd'hui contre {{cash}} au comptant, soit {{amount}} de plus.",
                            })
                        ),
                        installments: insert(
                            t({
                                en: "Pay in installments. They are worth {{present}} in today's money against {{cash}} in cash, {{amount}} less.",
                                es: "Conviene pagar en cuotas. Valen {{present}} en dinero de hoy contra {{cash}} de contado, {{amount}} menos.",
                                pt: "Compensa parcelar. As parcelas valem {{present}} em dinheiro de hoje contra {{cash}} à vista, {{amount}} a menos.",
                                fr: "Payez en plusieurs fois. Les échéances valent {{present}} en argent d'aujourd'hui contre {{cash}} au comptant, soit {{amount}} de moins.",
                            })
                        ),
                        same: insert(
                            t({
                                en: "About the same. The installments are worth {{present}} in today's money against {{cash}} in cash.",
                                es: "Da casi lo mismo. Las cuotas valen {{present}} en dinero de hoy contra {{cash}} de contado.",
                                pt: "Dá praticamente no mesmo. As parcelas valem {{present}} em dinheiro de hoje contra {{cash}} à vista.",
                                fr: "C'est à peu près pareil. Les échéances valent {{present}} en argent d'aujourd'hui contre {{cash}} au comptant.",
                            })
                        ),
                    },
                },
                faq: [
                    {
                        answer: t({
                            en: "Compare the installments, valued in today's money, with the cash price. Say a TV is listed at $1,200,000 pesos, payable in 6 monthly interest-free installments of $200,000, or $1,080,000 in cash after a 10% discount. With 1% monthly inflation the installments are worth about $1,159,000 today, so cash is cheaper. At 5% they are worth about $1,015,000, so installments win. The break-even is near 3% a month. Enter the list price, the cash discount, and the monthly inflation you expect, and the calculator does this for any plan.",
                            es: "Compara las cuotas, valuadas en dinero de hoy, con el precio de contado. Por ejemplo, un televisor de $1,200,000 pesos de lista se paga en 6 cuotas mensuales sin interés de $200,000, o de contado a $1,080,000 con 10% de descuento. Con 1% de inflación mensual las cuotas valen hoy cerca de $1,159,000, así que conviene el contado. Con 5% valen cerca de $1,015,000 y ganan las cuotas. El punto de equilibrio está cerca de 3% al mes. Pon el precio de lista, el descuento por contado y la inflación mensual que esperas, y la calculadora hace esta cuenta con cualquier plan.",
                            pt: "Compare as parcelas, em valor de hoje, com o preço à vista. Por exemplo, uma TV de R$ 1.200 sai em 6x sem juros de R$ 200 no cartão, ou por R$ 1.080 à vista, com 10% de desconto. Com inflação de 1% ao mês, as parcelas valem hoje cerca de R$ 1.159, então à vista sai mais barato. Com 5% ao mês, valem cerca de R$ 1.015, e parcelar compensa. O ponto de equilíbrio fica perto de 3% ao mês. Informe o preço de tabela, o desconto à vista e a inflação mensal que você espera, e a calculadora faz essa conta para qualquer parcelamento.",
                            fr: "Comparez les échéances, ramenées en argent d'aujourd'hui, au prix comptant. Par exemple, un téléviseur affiché à 1 200 € se paie en 6 fois sans frais de 200 €, ou 1 080 € comptant avec 10 % de remise. Avec une inflation de 1 % par mois, les échéances valent aujourd'hui environ 1 159 €, donc le comptant revient moins cher. À 5 % par mois, elles valent environ 1 015 €, et le paiement en plusieurs fois l'emporte. Le point d'équilibre se situe vers 3 % par mois. Saisissez le prix affiché, la remise au comptant et l'inflation mensuelle que vous prévoyez, et le calculateur fait ce calcul pour n'importe quel plan.",
                        }),
                        question: t({
                            en: "Should I pay in installments or cash?",
                            es: "¿Conviene pagar en cuotas o de contado?",
                            pt: "Parcelar ou pagar à vista: o que compensa?",
                            fr: "Payer en plusieurs fois ou comptant : que choisir ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "The monthly rise in prices you expect while you pay, for example the latest monthly figure from your country's statistics office. If your money would earn more than that in the meantime, enter that monthly rate instead, since it is what waiting is worth to you. A higher number favors installments.",
                            es: "El aumento mensual de precios que esperas mientras pagas, por ejemplo la última cifra mensual del instituto de estadística de tu país. Si tu dinero rendiría más que eso en el tiempo que pagas, pon esa tasa mensual, porque es lo que vale esperar para ti. Un número más alto favorece las cuotas.",
                            pt: "A alta mensal de preços que você espera enquanto paga, por exemplo o último índice mensal do órgão de estatística do seu país, como o IPCA do IBGE no Brasil. Se o seu dinheiro renderia mais do que isso nesse meio-tempo, informe essa taxa mensal, porque é o que esperar vale para você. Um número mais alto favorece o parcelamento.",
                            fr: "La hausse mensuelle des prix que vous prévoyez pendant vos paiements, par exemple le dernier chiffre mensuel de l'institut statistique de votre pays, comme l'Insee en France. Si votre argent rapporterait davantage entre-temps, saisissez plutôt ce taux mensuel, car c'est ce que vaut l'attente pour vous. Un chiffre plus élevé favorise le paiement en plusieurs fois.",
                        }),
                        question: t({
                            en: "What monthly inflation should I enter?",
                            es: "¿Qué inflación mensual pongo?",
                            pt: "Qual inflação mensal devo informar?",
                            fr: "Quelle inflation mensuelle saisir ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Not always. Without interest the payments add up to the list price, so the plan costs nothing extra on paper. But if the store takes a discount off for cash, that discount is what you pay for the installments. With inflation, the later payments are also worth less than the first.",
                            es: "No siempre. Sin interés las cuotas suman el precio de lista, así que en papel el plan no cuesta nada extra. Pero si la tienda te descuenta por pagar de contado, ese descuento es lo que pagas por las cuotas. Con inflación, además, las últimas cuotas valen menos que las primeras.",
                            pt: "Nem sempre. Sem juros, as parcelas somam o preço de tabela, então no papel o parcelamento não custa nada a mais. Mas se a loja dá desconto para pagamento à vista, esse desconto é o que você paga para parcelar. Com inflação, as últimas parcelas também valem menos que as primeiras.",
                            fr: "Pas toujours. Sans frais, les échéances s'additionnent jusqu'au prix affiché, donc sur le papier le plan ne coûte rien de plus. Mais si le magasin accorde une remise pour un paiement comptant, cette remise est le prix du paiement en plusieurs fois. Avec l'inflation, les dernières échéances valent aussi moins que les premières.",
                        }),
                        question: t({
                            en: "Is 0% interest really free?",
                            es: "¿Las cuotas sin interés o los meses sin intereses son gratis de verdad?",
                            pt: "Parcelar sem juros é de graça mesmo?",
                            fr: "Le paiement en plusieurs fois sans frais est-il vraiment gratuit ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Because the plan is short. With the starting example, $15 extra on a $400 order over six weeks works out to about 89% a year: the fee pays for six weeks of credit, not a year.",
                            es: "Porque el plan es corto. Con el ejemplo inicial, US$15 de más en una compra de US$400 a seis semanas equivalen a cerca de 89% al año: el cargo paga seis semanas de crédito, no un año.",
                            pt: "Porque o parcelamento é curto. No exemplo inicial, US$15 a mais numa compra de US$400 em seis semanas equivalem a cerca de 89% ao ano: a tarifa paga seis semanas de crédito, não um ano.",
                            fr: "Parce que le plan est court. Avec l'exemple de départ, US$15 de plus sur un achat de US$400 en six semaines représentent environ 89 % par an : les frais paient six semaines de crédit, pas une année.",
                        }),
                        question: t({
                            en: "Why is the yearly rate so high for a small fee?",
                            es: "¿Por qué la tasa anual es tan alta si el cargo es chico?",
                            pt: "Por que a taxa anual fica tão alta para uma tarifa pequena?",
                            fr: "Pourquoi le taux annuel est-il si élevé pour de petits frais ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Outlayr tracks purchases in installments from buy now, pay later apps such as Cashea, Klarna, and Afterpay, and from cards: the upfront payment, each installment, and any late fees, with a reminder the day before each one is due. For an order already in progress, take a screenshot of its payment plan and Outlayr fills in each payment and what is already paid. The free plan holds 2 installment apps, and each screenshot counts as one capture.",
                            es: "Sí. Outlayr lleva las compras en cuotas de apps como Cashea, Klarna y Afterpay, y de tus tarjetas: la inicial, cada cuota y los recargos por atraso, con un aviso el día antes de cada pago. Para una compra que ya va por la mitad, toma una captura de su plan de pagos y Outlayr llena cada cuota y lo que ya pagaste. El plan gratis permite 2 apps de cuotas, y cada captura de pantalla cuenta como una captura.",
                            pt: "Sim. O Outlayr acompanha compras parceladas em apps de compre agora, pague depois, como Cashea, Klarna e Afterpay, e em cartões: a entrada, cada parcela e as multas por atraso, com um lembrete na véspera de cada vencimento. Para uma compra que já está em andamento, tire uma captura de tela do plano de pagamento e o Outlayr preenche cada parcela e o que já foi pago. O plano grátis inclui 2 apps de parcelamento, e cada captura de tela conta como uma captura.",
                            fr: "Oui. Outlayr suit les achats en plusieurs fois faits avec des apps de paiement fractionné comme Cashea, Klarna et Afterpay, ou par carte : l'apport initial, chaque échéance et les frais de retard, avec un rappel la veille de chaque échéance. Pour une commande déjà en cours, faites une capture d'écran de son échéancier et Outlayr remplit chaque échéance et ce qui est déjà payé. L'offre gratuite inclut 2 apps de paiement en plusieurs fois, et chaque capture d'écran compte comme une capture.",
                        }),
                        question: t({
                            en: "Can Outlayr track my installments?",
                            es: "¿Outlayr puede llevar mis cuotas?",
                            pt: "O Outlayr pode acompanhar minhas parcelas?",
                            fr: "Outlayr peut-il suivre mes paiements en plusieurs fois ?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    count: t({ en: "Payments", es: "Cuotas", pt: "Parcelas", fr: "Échéances" }),
                    discount: t({
                        en: "Cash discount",
                        es: "Descuento por contado",
                        pt: "Desconto à vista",
                        fr: "Remise au comptant",
                    }),
                    down: t({ en: "Paid today", es: "Pagas hoy", pt: "Pago hoje", fr: "Payé aujourd'hui" }),
                    inflation: t({
                        en: "Inflation a month",
                        es: "Inflación al mes",
                        pt: "Inflação ao mês",
                        fr: "Inflation par mois",
                    }),
                    payment: t({
                        en: "Each payment",
                        es: "Cada cuota",
                        pt: "Valor da parcela",
                        fr: "Montant par échéance",
                    }),
                    price: t({ en: "List price", es: "Precio de lista", pt: "Preço de tabela", fr: "Prix affiché" }),
                },
                lead: t({
                    en: "Installments or cash? See the total installment price, which costs less in today's money with inflation and a cash discount, and the yearly rate behind the extra over the cash price.",
                    es: "Calcula cuánto pagas en total por una compra en cuotas o a plazos, a qué tasa anual pagas de más y si conviene el contado, con inflación y descuento.",
                    pt: "Parcelar ou pagar à vista? Veja o total parcelado, qual opção custa menos em dinheiro de hoje com inflação e desconto à vista, e a taxa anual por trás do que você paga a mais.",
                    fr: "Payer en plusieurs fois ou comptant ? Voyez le coût total des échéances, l'option la moins chère en argent d'aujourd'hui avec l'inflation et une remise au comptant, et le taux annuel derrière le surcoût.",
                }),
                meta: {
                    title: t({
                        en: "Installment Calculator: Installments or Cash? With Inflation",
                        es: "Calculadora de cuotas y pago a plazos: ¿cuotas o contado?",
                        pt: "Calculadora de parcelas: parcelar ou pagar à vista?",
                        fr: "Calculateur de paiement en plusieurs fois ou comptant",
                    }),
                },
                method: [
                    t({
                        en: "The calculator adds what you pay today to every installment and compares the total with the cash price: total = paid today + payments × each payment, and extra = total − cash price.",
                        es: "En un pago a plazos divides el precio en cuotas iguales cada cierto tiempo, a veces con un pago inicial. La calculadora suma lo que pagas hoy y todas las cuotas, y compara el total con el precio de contado: total = lo que pagas hoy + cuotas × cada cuota, y lo que pagas de más = total − precio de contado. Por ejemplo, algo que cuesta US$600 de contado, con US$100 hoy y 6 cuotas mensuales de US$95, suma US$670: US$70 más que de contado, una tasa anual de 57.8%.",
                        pt: "A calculadora soma o que você paga hoje a todas as parcelas e compara o total com o preço à vista: total = pago hoje + parcelas × valor da parcela, e valor a mais = total − preço à vista.",
                        fr: "Le calculateur additionne ce que vous payez aujourd'hui et chaque échéance, puis compare le total au prix comptant : total = payé aujourd'hui + échéances × montant par échéance, et surcoût = total − prix comptant.",
                    }),
                    t({
                        en: "The yearly rate is the interest rate that makes those payments worth exactly what you financed, the cash price minus today's payment. It compounds over a year, like an effective annual rate, so a small fee on a short plan shows its real size.",
                        es: "La tasa anual es la tasa de interés con la que esas cuotas valen justo lo que financiaste, el precio de contado menos lo que pagas hoy. Se compone a un año, como una tasa efectiva anual, así que un cargo chico en un plan corto muestra su tamaño real.",
                        pt: "A taxa anual é a taxa de juros com a qual essas parcelas valem exatamente o que você financiou, o preço à vista menos o que pagou hoje. Ela é composta ao longo de um ano, como uma taxa efetiva anual, então uma tarifa pequena num parcelamento curto mostra seu tamanho real.",
                        fr: "Le taux annuel est le taux d'intérêt pour lequel ces échéances valent exactement ce que vous avez financé, soit le prix comptant moins ce que vous payez aujourd'hui. Il est composé sur un an, comme un taux annuel effectif, si bien que de petits frais sur un plan court montrent leur vrai poids.",
                    }),
                    t({
                        en: "As a formula: find the rate r per payment period where each payment × (1 − (1 + r)^−n) ÷ r = cash price − paid today, with n payments. The yearly rate is (1 + r)^k − 1, where k is 52 for weekly payments, 26 for every 2 weeks, and 12 for monthly. With the starting example, $300 financed in 3 payments of $105 every 2 weeks, r is about 2.48%, and (1.0248)^26 − 1 is about 89%.",
                        es: "Como fórmula: busca la tasa r por período donde cada cuota × (1 − (1 + r)^−n) ÷ r = precio de contado − lo que pagas hoy, con n cuotas. La tasa anual es (1 + r)^k − 1, donde k es 52 si pagas cada semana, 26 si pagas cada 2 semanas y 12 si pagas cada mes. Con el ejemplo inicial, US$300 financiados en 3 cuotas de US$105 cada 2 semanas, r es cerca de 2.48%, y (1.0248)^26 − 1 da cerca de 89%.",
                        pt: "Em fórmula: encontre a taxa r por período de pagamento em que valor da parcela × (1 − (1 + r)^−n) ÷ r = preço à vista − pago hoje, com n parcelas. A taxa anual é (1 + r)^k − 1, em que k é 52 para parcelas semanais, 26 para parcelas a cada 2 semanas e 12 para mensais. No exemplo inicial, US$300 financiados em 3 parcelas de US$105 a cada 2 semanas, r fica em cerca de 2,48%, e (1,0248)^26 − 1 dá cerca de 89%.",
                        fr: "En formule : trouvez le taux r par période où montant par échéance × (1 − (1 + r)^−n) ÷ r = prix comptant − payé aujourd'hui, avec n échéances. Le taux annuel est (1 + r)^k − 1, où k vaut 52 pour des échéances hebdomadaires, 26 pour des échéances toutes les 2 semaines et 12 pour des échéances mensuelles. Avec l'exemple de départ, US$300 financés en 3 échéances de US$105 toutes les 2 semaines, r vaut environ 2,48 %, et (1,0248)^26 − 1 donne environ 89 %.",
                    }),
                    t({
                        en: "Many stores list one price and take a percentage off for paying cash. Enter the list price and that discount: the cash price is the list price minus the discount, and the extra, the yearly rate, and the verdict all compare against it.",
                        es: "Muchas tiendas tienen un precio de lista y descuentan un porcentaje si pagas de contado. Pon el precio de lista y ese descuento: el precio de contado es el de lista menos el descuento, y lo que pagas de más, la tasa anual y el veredicto se comparan con él.",
                        pt: "Muitas lojas têm um preço de tabela e dão um desconto percentual para pagamento à vista. Informe o preço de tabela e esse desconto: o preço à vista é o de tabela menos o desconto, e o valor a mais, a taxa anual e o veredito são comparados com ele.",
                        fr: "Beaucoup de magasins affichent un prix et accordent une remise en pourcentage pour un paiement comptant. Saisissez le prix affiché et cette remise : le prix comptant est le prix affiché moins la remise, et le surcoût, le taux annuel et le verdict se comparent à lui.",
                    }),
                    t({
                        en: "To tell installments from cash when prices rise, each payment is valued in today's money: value today = paid today + the sum of each payment ÷ (1 + i)^t, where i is the monthly inflation and t is the months until that payment. A week counts as 12 ÷ 52 of a month, so with weekly payments the 4th one has t = 0.92, and with monthly ones the 4th has t = 4. Installments are cheaper if the sum is below the cash price, cash is cheaper if it is above, and a gap under 1% counts as about the same.",
                        es: "Para distinguir cuotas de contado cuando suben los precios, cada cuota se valúa en dinero de hoy: valor hoy = lo que pagas hoy + la suma de cada cuota ÷ (1 + i)^t, donde i es la inflación mensual y t son los meses hasta esa cuota. Una semana cuenta como 12 ÷ 52 de mes, así que con cuotas semanales la cuarta tiene t = 0.92, y con cuotas mensuales la cuarta tiene t = 4. Conviene pagar en cuotas si la suma queda por debajo del precio de contado, conviene el contado si queda por encima, y una diferencia menor a 1% cuenta como casi igual.",
                        pt: "Para comparar parcelado e à vista quando os preços sobem, cada parcela é avaliada em dinheiro de hoje: valor hoje = pago hoje + a soma de cada parcela ÷ (1 + i)^t, em que i é a inflação mensal e t são os meses até essa parcela. Uma semana conta como 12 ÷ 52 de mês, então com parcelas semanais a 4ª tem t = 0,92, e com parcelas mensais a 4ª tem t = 4. Parcelar sai mais barato se a soma ficar abaixo do preço à vista, à vista sai mais barato se ficar acima, e uma diferença menor que 1% conta como praticamente igual.",
                        fr: "Pour départager paiement en plusieurs fois et comptant quand les prix montent, chaque échéance est ramenée en argent d'aujourd'hui : valeur aujourd'hui = payé aujourd'hui + la somme de chaque échéance ÷ (1 + i)^t, où i est l'inflation mensuelle et t le nombre de mois jusqu'à cette échéance. Une semaine compte pour 12 ÷ 52 de mois : avec des échéances hebdomadaires, la 4e a t = 0,92, et avec des échéances mensuelles, la 4e a t = 4. Le paiement en plusieurs fois revient moins cher si la somme est inférieure au prix comptant, le comptant si elle est supérieure, et un écart de moins de 1 % compte comme à peu près pareil.",
                    }),
                    t({
                        en: "Late fees are not included. Most plans charge one when a payment is late, which raises the real cost.",
                        es: "La calculadora no saca la cuota a partir de un interés: pon la cuota que te ofrece la tienda, el banco o la app. Solo cuenta los intereses y comisiones que ya estén dentro de esa cuota o de lo que pagas hoy; suma aparte cualquier otro cargo. No incluye recargos por atraso. La mayoría de los planes cobra uno cuando una cuota se atrasa, y eso sube el costo real.",
                        pt: "Multas por atraso não estão incluídas. A maioria dos parcelamentos cobra uma quando uma parcela atrasa, o que aumenta o custo real.",
                        fr: "Les frais de retard ne sont pas inclus. La plupart des plans en facturent quand une échéance est payée en retard, ce qui augmente le coût réel.",
                    }),
                ],
                preview: {
                    left: t({ en: "Left to pay", es: "Te falta pagar", pt: "Falta pagar", fr: "Reste à payer" }),
                    paid: insert(
                        t({
                            en: "Paid {{paid}} of {{count}}",
                            es: "Pagaste {{paid}} de {{count}}",
                            pt: "{{paid}} de {{count}} parcelas pagas",
                            fr: "{{paid}} échéances payées sur {{count}}",
                        })
                    ),
                },
                related: [
                    "/tools/loan-calculator",
                    "/guides/how-to-pay-cashea",
                    "/tools/split-expenses-calculator",
                ] satisfies PageRef[],
                title: t({
                    en: "Installment calculator: pay in installments or cash?",
                    es: "Calculadora de cuotas y pago a plazos: ¿cuotas o contado?",
                    pt: "Calculadora de parcelas: parcelar ou pagar à vista?",
                    fr: "Calculateur de paiement en plusieurs fois ou comptant",
                }),
            },
            "split-expenses-calculator": {
                add: t({ en: "Add person", es: "Agregar persona", pt: "Adicionar pessoa", fr: "Ajouter une personne" }),
                answer: insert(
                    t({
                        en: "{{total}} split {{count}} ways is {{share}} each.",
                        es: "{{total}} entre {{count}} personas son {{share}} por persona.",
                        pt: "{{total}} dividido entre {{count}} pessoas dá {{share}} para cada uma.",
                        fr: "{{total}} divisé entre {{count}} personnes, cela fait {{share}} chacune.",
                    })
                ),
                columns: {
                    amount: t({ en: "Amount", es: "Monto", pt: "Valor", fr: "Montant" }),
                    balance: t({ en: "Balance", es: "Saldo", pt: "Saldo", fr: "Solde" }),
                    from: t({ en: "Pays", es: "Paga", pt: "Paga", fr: "Paie" }),
                    to: t({ en: "To", es: "A", pt: "Para", fr: "À" }),
                },
                examples: ["Ana", "Luis", "Marta"],
                faq: [
                    {
                        answer: t({
                            en: "Run the calculator once for each part of the trip, with only the people who were there, then add up what each person owes.",
                            es: "Usa la calculadora una vez por cada parte del viaje, solo con quienes estuvieron, y luego suma lo que debe cada persona.",
                            pt: "Use a calculadora uma vez para cada parte da viagem, só com quem estava lá, e depois some o que cada pessoa deve.",
                            fr: "Utilisez le calculateur une fois pour chaque partie du voyage, avec seulement les personnes présentes, puis additionnez ce que chacun doit.",
                        }),
                        question: t({
                            en: "What if someone joined for only part of the trip?",
                            es: "¿Y si alguien solo estuvo en una parte del viaje?",
                            pt: "E se alguém só participou de parte da viagem?",
                            fr: "Et si quelqu'un n'a fait qu'une partie du voyage ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Convert every amount to one currency first, at the rate you agree on, then enter them here.",
                            es: "Convierte primero cada monto a una sola moneda, con la tasa que acuerden, y luego anótalos aquí.",
                            pt: "Converta primeiro cada valor para uma única moeda, com a cotação que vocês combinarem, e depois informe os valores aqui.",
                            fr: "Convertissez d'abord chaque montant dans une seule devise, au taux convenu entre vous, puis saisissez-les ici.",
                        }),
                        question: t({
                            en: "Some of us paid in another currency. What do I do?",
                            es: "Algunos pagamos en otra moneda. ¿Qué hago?",
                            pt: "Alguns de nós pagaram em outra moeda. O que eu faço?",
                            fr: "Certains ont payé dans une autre devise. Que faire ?",
                        }),
                    },
                    {
                        answer: t({
                            en: "Yes. Each person gets their own account in Outlayr, so money you lent, borrowed, sold on credit, or owe for a job or purchase shows as a balance until it is paid back. Add a payoff plan with a date and Outlayr shows what that takes a month, and whether you are ahead or behind. The free plan holds 3 people and 2 payoff plans.",
                            es: "Sí. Cada persona tiene su propia cuenta en Outlayr, así que lo que prestaste, lo que te prestaron, lo que vendiste a crédito o lo que debes por un trabajo o una compra queda como saldo hasta que se paga. Ponle un plan de pago con fecha y Outlayr te muestra cuánto toca al mes y si vas adelantado o atrasado. El plan gratis permite 3 personas y 2 planes de pago.",
                            pt: "Sim. Cada pessoa tem sua própria conta no Outlayr, então o que você emprestou, pegou emprestado, vendeu fiado ou deve por um serviço ou uma compra aparece como saldo até ser pago. Adicione um plano de quitação com data e o Outlayr mostra quanto isso exige por mês e se você está adiantado ou atrasado. O plano grátis inclui 3 pessoas e 2 planos de quitação.",
                            fr: "Oui. Chaque personne a son propre compte dans Outlayr : ce que vous avez prêté ou emprunté, vendu à crédit ou ce que vous devez pour un travail ou un achat apparaît comme un solde jusqu'à ce qu'il soit réglé. Ajoutez un plan de remboursement avec une date, et Outlayr indique ce qu'il faut verser par mois et si vous êtes en avance ou en retard. L'offre gratuite inclut 3 personnes et 2 plans de remboursement.",
                        }),
                        question: t({
                            en: "Can Outlayr keep track of who owes me?",
                            es: "¿Outlayr puede llevar quién me debe?",
                            pt: "O Outlayr pode controlar quem me deve?",
                            fr: "Outlayr peut-il suivre qui me doit de l'argent ?",
                        }),
                    },
                    PRIVACY_FAQ,
                ],
                fields: {
                    name: t({ en: "Name", es: "Nombre", pt: "Nome", fr: "Nom" }),
                    paid: t({ en: "Paid", es: "Pagó", pt: "Pagou", fr: "A payé" }),
                },
                lead: t({
                    en: "Enter what each person paid for a trip, a dinner, or a shared house, and see who pays whom to even it out.",
                    es: "Anota lo que pagó cada persona en un viaje, una cena o una casa compartida, y mira quién le paga a quién para quedar a mano.",
                    pt: "Para dividir a conta de um jantar, de uma viagem ou de uma casa compartilhada: informe quanto cada pessoa pagou e veja quem paga quem para ficar tudo certo.",
                    fr: "Pour diviser l'addition d'un dîner ou partager les dépenses d'un voyage ou d'une colocation : indiquez ce que chacun a payé et voyez qui rembourse qui pour être quittes.",
                }),
                meta: {
                    title: t({
                        en: "Split Bill Calculator: Split Expenses and See Who Owes Whom",
                        es: "Calculadora para dividir gastos: quién le debe a quién",
                        pt: "Dividir conta: calculadora de quem deve a quem · Outlayr",
                        fr: "Partager les dépenses : qui doit combien à qui · Outlayr",
                    }),
                },
                method: [
                    t({
                        en: "The calculator adds up what everyone paid and divides it equally. Whoever paid more than their share gets paid back, and whoever paid less pays.",
                        es: "La calculadora suma lo que pagó cada persona y lo divide en partes iguales. A quien pagó más que su parte le devuelven, y quien pagó menos, paga.",
                        pt: "A calculadora soma o que todos pagaram e divide em partes iguais. Quem pagou mais que sua parte recebe de volta, e quem pagou menos paga.",
                        fr: "Le calculateur additionne ce que chacun a payé et le divise à parts égales. Ceux qui ont payé plus que leur part sont remboursés, et ceux qui ont payé moins remboursent.",
                    }),
                    t({
                        en: "It settles the biggest debt against the biggest credit first, so it never takes more payments than one fewer than the number of people.",
                        es: "Primero cruza la deuda más grande con el saldo a favor más grande, así que nunca hacen falta más pagos que el número de personas menos uno.",
                        pt: "Ela acerta primeiro a maior dívida com o maior crédito, então nunca são necessários mais pagamentos do que o número de pessoas menos um.",
                        fr: "Il solde d'abord la plus grosse dette avec la plus grosse créance, si bien qu'il ne faut jamais plus de paiements que le nombre de personnes moins un.",
                    }),
                    t({
                        en: "When the total doesn't divide evenly, the leftover cents fall to the first people on the list.",
                        es: "Si el total no se divide exacto, los centavos que sobran le tocan a las primeras personas de la lista.",
                        pt: "Quando o total não se divide exatamente, os centavos que sobram ficam com as primeiras pessoas da lista.",
                        fr: "Quand le total ne se divise pas exactement, les centimes restants reviennent aux premières personnes de la liste.",
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
                    pt: "Todos pagaram sua parte. Ninguém deve nada.",
                    fr: "Chacun a payé sa part. Personne ne doit rien.",
                }),
                title: t({
                    en: "Split bill calculator: who owes whom",
                    es: "Calculadora para dividir gastos",
                    pt: "Calculadora para dividir contas",
                    fr: "Calculateur pour partager les dépenses",
                }),
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
                        en: "BCV Dollar Rate Today and USD to Bolívar Calculator",
                        es: "Calculadora dólar BCV: convertir bolívares a dólares hoy",
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
                    "/guides/how-to-pay-cashea",
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
                        en: "Dollar Rate Today in Argentina: Blue, Official, MEP, Card",
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
                    "/guides/track-money-sent-home",
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
                        en: "Dollar Rate Today in Bolivia: Parallel (Blue) and Official",
                        es: "Dólar blue Bolivia hoy: paralelo, oficial y calculadora",
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
                    "/tools/dolar-bcv-hoy",
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
