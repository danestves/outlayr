import { t } from "intlayer";
import type { Dictionary } from "intlayer";

import {
    ACCOUNTS_SCREEN_ALT,
    BUDGETS_SCREEN_ALT,
    OPEN_SOURCE_ANSWER,
    OPEN_SOURCE_QUESTION,
    RECEIPT_SCAN_ANSWER,
} from "./shared";

const home = {
    content: {
        extras: [
            {
                label: t({ en: "Goals", es: "Metas", pt: "Metas", fr: "Objectifs" }),
                text: t({
                    en: "Save toward a date and see what you need each month.",
                    es: "Ahorra para una fecha y mira cuánto necesitas cada mes.",
                    pt: "Economize para uma data e veja quanto precisa guardar por mês.",
                    fr: "Épargnez pour une date et voyez combien il vous faut chaque mois.",
                }),
            },
            {
                label: t({ en: "Split", es: "Dividir", pt: "Dividir", fr: "Répartir" }),
                text: t({
                    en: "Divide one purchase across several categories.",
                    es: "Reparte una compra entre varias categorías.",
                    pt: "Divida uma compra entre várias categorias.",
                    fr: "Répartissez un achat entre plusieurs catégories.",
                }),
            },
            {
                label: t({ en: "Currencies", es: "Monedas", pt: "Moedas", fr: "Devises" }),
                text: t({
                    en: "Log in any of 165 currencies and read totals in yours, at the rate from the day it happened.",
                    es: "Registra en cualquiera de 165 monedas y mira los totales en la tuya, con la tasa del día en que ocurrió.",
                    pt: "Registre em qualquer uma de 165 moedas e veja os totais na sua, com a cotação do dia em que aconteceu.",
                    fr: "Saisissez dans l'une des 165 devises et lisez les totaux dans la vôtre, au taux du jour de l'opération.",
                }),
            },
            {
                label: t({ en: "Widgets", es: "Widgets", pt: "Widgets", fr: "Widgets" }),
                text: t({
                    en: "Four for the iPhone Home Screen and Lock Screen, and six for the Android home screen, including a 1×1 + that opens a new expense.",
                    es: "Cuatro para la pantalla de inicio y la pantalla bloqueada del iPhone, y seis para la de Android, incluido un + de 1×1 que abre un gasto nuevo.",
                    pt: "Quatro para a Tela de Início e a Tela Bloqueada do iPhone, e seis para a tela inicial do Android, incluindo um + de 1×1 que abre uma nova despesa.",
                    fr: "Quatre pour l'écran d'accueil et l'écran verrouillé de l'iPhone, et six pour l'écran d'accueil Android, dont un + en 1×1 qui ouvre une nouvelle dépense.",
                }),
            },
            {
                label: t({ en: "Apple Pay", es: "Apple Pay", pt: "Apple Pay", fr: "Apple Pay" }),
                text: t({
                    en: "On iPhone, pay with Apple Pay and a Shortcuts automation logs the purchase.",
                    es: "En iPhone, paga con Apple Pay y una automatización de Atajos registra la compra.",
                    pt: "No iPhone, pague com Apple Pay e uma automação do app Atalhos registra a compra.",
                    fr: "Sur iPhone, payez avec Apple Pay et une automatisation Raccourcis enregistre l'achat.",
                }),
            },
            {
                label: t({ en: "Search", es: "Buscar", pt: "Buscar", fr: "Rechercher" }),
                text: t({
                    en: "Find any entry by note, category, or amount. On iPhone, entries show up in Spotlight too.",
                    es: "Encuentra cualquier registro por nota, categoría o monto. En iPhone, los registros también aparecen en Spotlight.",
                    pt: "Encontre qualquer lançamento por nota, categoria ou valor. No iPhone, os lançamentos também aparecem no Spotlight.",
                    fr: "Retrouvez n'importe quelle opération par note, catégorie ou montant. Sur iPhone, les opérations apparaissent aussi dans Spotlight.",
                }),
            },
            {
                label: t({ en: "Offline", es: "Sin conexión", pt: "Sem conexão", fr: "Hors ligne" }),
                text: t({
                    en: "Entries save on the phone first, so logging works with no signal.",
                    es: "Los registros se guardan primero en el celular, así que puedes registrar sin señal.",
                    pt: "Os lançamentos são salvos primeiro no celular, então dá para registrar sem sinal.",
                    fr: "Les opérations s'enregistrent d'abord sur le téléphone : la saisie fonctionne même sans réseau.",
                }),
            },
            {
                label: t({ en: "Export", es: "Exportar", pt: "Exportar", fr: "Exporter" }),
                text: t({
                    en: "A CSV, or a full archive you can restore from.",
                    es: "Un CSV o un archivo completo desde el que puedes restaurar.",
                    pt: "Um CSV ou um arquivo completo que você pode restaurar depois.",
                    fr: "Un CSV, ou une archive complète à partir de laquelle restaurer.",
                }),
            },
            {
                label: t({ en: "Lock", es: "Bloqueo", pt: "Bloqueio", fr: "Verrouillage" }),
                text: t({
                    en: "Face ID or Touch ID to open on iPhone, or your fingerprint or face on Android. The iPhone app switcher never shows your ledger.",
                    es: "Face ID o Touch ID para abrirla en iPhone, o tu huella o tu rostro en Android. El selector de apps del iPhone nunca muestra tu registro.",
                    pt: "Face ID ou Touch ID para abrir no iPhone, ou sua digital ou seu rosto no Android. O seletor de apps do iPhone nunca mostra seus lançamentos.",
                    fr: "Face ID ou Touch ID pour ouvrir l'app sur iPhone, ou votre empreinte ou votre visage sur Android. Le sélecteur d'apps de l'iPhone n'affiche jamais votre journal.",
                }),
            },
            {
                label: t({ en: "Appearance", es: "Apariencia", pt: "Aparência", fr: "Apparence" }),
                text: t({
                    en: "Light and dark, five accent colors, five app icons.",
                    es: "Claro y oscuro, cinco colores de acento y cinco íconos de la app.",
                    pt: "Claro e escuro, cinco cores de destaque e cinco ícones do app.",
                    fr: "Clair et sombre, cinq couleurs d'accent et cinq icônes d'app.",
                }),
            },
        ],
        extrasTitle: t({ en: "Also in the app", es: "También en la app", pt: "Também no app", fr: "Aussi dans l'app" }),
        faq: [
            {
                answer: t({
                    en: "Outlayr is an open source mobile expense tracker, budget app, and subscription tracker, made by danestves LLC. You log a purchase by typing one sentence, saying it, or scanning the receipt. Budgets, savings goals, subscriptions, and insights update as you log, in any of 165 currencies, in English, Spanish, Portuguese, or French.",
                    es: "Outlayr es una app móvil de código abierto para controlar tus gastos, tu presupuesto y tus suscripciones, hecha por danestves LLC. Registras una compra escribiendo una oración, dictándola o escaneando el recibo. Los presupuestos, las metas de ahorro, las suscripciones y las estadísticas se actualizan a medida que registras, en cualquiera de 165 monedas, en inglés, español, portugués o francés.",
                    pt: "O Outlayr é um app de código aberto para controlar seus gastos, seu orçamento e suas assinaturas no celular, feito pela danestves LLC. Você registra uma compra digitando uma frase, falando ou escaneando o recibo. Orçamentos, metas de economia, assinaturas e estatísticas se atualizam conforme você registra, em qualquer uma de 165 moedas, em inglês, espanhol, português ou francês.",
                    fr: "Outlayr est une app mobile open source pour suivre vos dépenses, votre budget et vos abonnements, créée par danestves LLC. Vous enregistrez un achat en tapant une phrase, en la dictant ou en scannant le ticket. Les budgets, les objectifs d'épargne, les abonnements et les statistiques se mettent à jour au fil de vos saisies, dans l'une des 165 devises, en anglais, espagnol, portugais ou français.",
                }),
                question: t({
                    en: "What is Outlayr?",
                    es: "¿Qué es Outlayr?",
                    pt: "O que é o Outlayr?",
                    fr: "Qu'est-ce qu'Outlayr ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Logging, budgets, goals, insights, subscriptions, and widgets are free. The free plan includes 20 voice or receipt captures every 30 days, 3 accounts, and 2 category budgets. Outlayr Pro raises those limits and adds sync across devices and receipt photo backup.",
                    es: "Sí. Registrar gastos es gratis, igual que los presupuestos, las metas, las estadísticas, las suscripciones y los widgets. El plan gratis incluye 20 capturas de voz o de recibos cada 30 días, 3 cuentas y 2 presupuestos por categoría. Outlayr Pro sube esos límites y agrega la sincronización entre dispositivos y el respaldo de las fotos de tus recibos.",
                    pt: "Sim. Registrar gastos é grátis, assim como orçamentos, metas, estatísticas, assinaturas e widgets. O plano grátis inclui 20 capturas por voz ou de recibos a cada 30 dias, 3 contas e 2 orçamentos por categoria. O Outlayr Pro aumenta esses limites e adiciona a sincronização entre dispositivos e o backup das fotos dos seus recibos.",
                    fr: "Oui. La saisie, les budgets, les objectifs, les statistiques, les abonnements et les widgets sont gratuits. La formule gratuite comprend 20 captures vocales ou de tickets tous les 30 jours, 3 comptes et 2 budgets par catégorie. Outlayr Pro relève ces limites et ajoute la synchronisation entre appareils et la sauvegarde des photos de vos tickets.",
                }),
                question: t({
                    en: "Is Outlayr free?",
                    es: "¿Outlayr es gratis?",
                    pt: "O Outlayr é grátis?",
                    fr: "Outlayr est-il gratuit ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. In the United States, Outlayr Pro is $129.99 once, or $7.99 a month or $49.99 a year with 7 days free. Your app store shows the price for your country. There are no ads on any plan.",
                    es: "Sí. En Estados Unidos, Outlayr Pro cuesta US$129.99 en un solo pago, o US$7.99 al mes o US$49.99 al año con 7 días gratis. Tu tienda de apps muestra el precio de tu país. No hay anuncios en ningún plan.",
                    pt: "Sim. Nos Estados Unidos, o Outlayr Pro custa US$129.99 em pagamento único, ou US$7.99 por mês ou US$49.99 por ano com 7 dias grátis. Sua loja de apps mostra o preço do seu país. Não há anúncios em nenhum plano.",
                    fr: "Oui. Aux États-Unis, Outlayr Pro coûte US$129.99 en un seul paiement, ou US$7.99 par mois ou US$49.99 par an avec 7 jours gratuits. Votre boutique d'apps affiche le prix de votre pays. Aucune formule n'affiche de publicité.",
                }),
                question: t({
                    en: "Can I buy Outlayr Pro once instead of subscribing?",
                    es: "¿Puedo comprar Outlayr Pro en un solo pago en vez de suscribirme?",
                    pt: "Posso comprar o Outlayr Pro em um pagamento único em vez de assinar?",
                    fr: "Puis-je acheter Outlayr Pro en une fois au lieu de m'abonner ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Subscriptions, bills, and paychecks log themselves on their day. Upcoming lists the next charges and what your subscriptions and bills cost per month, and a reminder can come before each charge.",
                    es: "Sí. Las suscripciones, los pagos fijos y el sueldo se registran solos en su día. Próximos muestra los próximos cobros y cuánto te cuestan al mes tus suscripciones y pagos fijos, y puede llegarte un aviso antes de cada cobro.",
                    pt: "Sim. Assinaturas, contas fixas e salário são lançados sozinhos no dia certo. Próximos mostra as próximas cobranças e quanto suas assinaturas e contas fixas custam por mês, e você pode receber um lembrete antes de cada cobrança.",
                    fr: "Oui. Les abonnements, les factures et les salaires s'enregistrent tout seuls le jour venu. À venir liste les prochains prélèvements et ce que vos abonnements et factures coûtent par mois, et un rappel peut vous prévenir avant chaque prélèvement.",
                }),
                question: t({
                    en: "Does Outlayr track subscriptions and bills?",
                    es: "¿Outlayr lleva las suscripciones y los pagos fijos?",
                    pt: "O Outlayr acompanha assinaturas e contas fixas?",
                    fr: "Outlayr suit-il les abonnements et les factures ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Outlayr is on the App Store for iPhone with iOS 18 or later, and on Google Play for Android.",
                    es: "Sí. Outlayr está en el App Store para iPhone con iOS 18 o posterior, y en Google Play para Android.",
                    pt: "Sim. O Outlayr está na App Store para iPhone com iOS 18 ou posterior, e no Google Play para Android.",
                    fr: "Oui. Outlayr est sur l'App Store pour iPhone sous iOS 18 ou version ultérieure, et sur Google Play pour Android.",
                }),
                question: t({
                    en: "Is Outlayr on iPhone and Android?",
                    es: "¿Outlayr está en iPhone y Android?",
                    pt: "O Outlayr está disponível para iPhone e Android?",
                    fr: "Outlayr est-il disponible sur iPhone et Android ?",
                }),
            },
            {
                answer: RECEIPT_SCAN_ANSWER,
                question: t({
                    en: "How does receipt scanning work?",
                    es: "¿Cómo funciona el escaneo de recibos?",
                    pt: "Como funciona o escaneamento de recibos?",
                    fr: "Comment fonctionne le scan de tickets ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Outlayr supports 165 currencies. You can log a purchase in any of them, and totals convert to your main currency at the rate from the day it happened. Each account keeps its own currency: the free plan includes two, Pro allows more.",
                    es: "Sí. Outlayr admite 165 monedas. Puedes registrar una compra en cualquiera de ellas, y los totales se convierten a tu moneda principal con la tasa del día de la compra. Cada cuenta tiene su propia moneda: el plan gratis incluye dos y Pro permite más.",
                    pt: "Sim. O Outlayr aceita 165 moedas. Você pode registrar uma compra em qualquer uma delas, e os totais são convertidos para sua moeda principal com a cotação do dia da compra. Cada conta tem sua própria moeda: o plano grátis inclui duas e o Pro permite mais.",
                    fr: "Oui. Outlayr prend en charge 165 devises. Vous pouvez enregistrer un achat dans n'importe laquelle, et les totaux sont convertis dans votre devise principale au taux du jour de l'achat. Chaque compte a sa propre devise : la formule gratuite en inclut deux, Pro en permet davantage.",
                }),
                question: t({
                    en: "Can I track expenses in different currencies?",
                    es: "¿Puedo registrar gastos en distintas monedas?",
                    pt: "Posso registrar gastos em moedas diferentes?",
                    fr: "Puis-je suivre mes dépenses dans plusieurs devises ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Entries save on your phone first, so typing an entry works with no signal. Voice entry and receipt scanning need a connection. With Pro, sync sends your entries to your other devices once you are back online.",
                    es: "Sí. Los registros se guardan primero en tu celular, así que puedes escribir uno sin señal. Para dictar y escanear recibos necesitas conexión. Con Pro, la sincronización envía tus registros a tus otros dispositivos cuando vuelves a tener conexión.",
                    pt: "Sim. Os lançamentos são salvos primeiro no seu celular, então dá para digitar um sem sinal. Para lançar por voz e escanear recibos, você precisa de conexão. Com o Pro, a sincronização envia seus lançamentos para seus outros dispositivos quando você volta a ficar online.",
                    fr: "Oui. Les opérations s'enregistrent d'abord sur votre téléphone, vous pouvez donc en saisir une sans réseau. La saisie vocale et le scan de tickets nécessitent une connexion. Avec Pro, la synchronisation envoie vos opérations vers vos autres appareils dès que vous êtes de nouveau en ligne.",
                }),
                question: t({
                    en: "Does Outlayr work offline?",
                    es: "¿Outlayr funciona sin conexión?",
                    pt: "O Outlayr funciona sem internet?",
                    fr: "Outlayr fonctionne-t-il hors ligne ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Export a CSV from your bank or another app and import it. Duplicates are skipped, and category names that match yours, or merchants Outlayr already knows, are matched to your categories on your phone, and a row with no match is listed as skipped. With Pro, AI matching fills in the rest, and a category name still unmatched becomes a new category, listed before you save.",
                    es: "Sí. Exporta un CSV desde tu banco u otra app e impórtalo. Los duplicados se omiten, y los nombres de categoría que coinciden con los tuyos, o los comercios que Outlayr ya conoce, se asignan a tus categorías en tu celular, y una fila sin coincidencia aparece como omitida. Con Pro, la asignación con IA completa el resto, y un nombre de categoría que siga sin coincidir se crea como categoría nueva, que ves antes de guardar.",
                    pt: "Sim. Exporte um CSV do seu banco ou de outro app e importe. Os duplicados são ignorados, e os nomes de categoria iguais aos seus, ou os estabelecimentos que o Outlayr já conhece, são associados às suas categorias no seu celular. Uma linha sem correspondência aparece como ignorada. Com o Pro, a correspondência com IA completa o resto, e um nome de categoria que continue sem correspondência vira uma categoria nova, que você vê antes de salvar.",
                    fr: "Oui. Exportez un CSV depuis votre banque ou une autre app, puis importez-le. Les doublons sont ignorés, et les noms de catégorie identiques aux vôtres, ou les commerçants qu'Outlayr connaît déjà, sont associés à vos catégories sur votre téléphone. Une ligne sans correspondance est listée comme ignorée. Avec Pro, la correspondance IA complète le reste, et un nom de catégorie toujours sans correspondance devient une nouvelle catégorie, que vous voyez avant d'enregistrer.",
                }),
                question: t({
                    en: "Can I import a CSV from my bank?",
                    es: "¿Puedo importar un CSV de mi banco?",
                    pt: "Posso importar um CSV do meu banco?",
                    fr: "Puis-je importer un CSV de ma banque ?",
                }),
            },
            {
                answer: t({
                    en: "Your ledger is stored on your phone. It reaches our servers only if you sign in and turn on sync, or use a feature that needs them, like receipt scanning. Outlayr has no ads, and your data is never sold.",
                    es: "Tu registro se guarda en tu celular. Solo llega a nuestros servidores si inicias sesión y activas la sincronización, o si usas una función que los necesite, como el escaneo de recibos. Outlayr no tiene anuncios y tus datos nunca se venden.",
                    pt: "Seus lançamentos ficam guardados no seu celular. Eles só chegam aos nossos servidores se você entrar na sua conta e ativar a sincronização, ou se usar um recurso que precise deles, como o escaneamento de recibos. O Outlayr não tem anúncios, e seus dados nunca são vendidos.",
                    fr: "Votre journal est stocké sur votre téléphone. Il n'atteint nos serveurs que si vous vous connectez et activez la synchronisation, ou si vous utilisez une fonction qui en a besoin, comme le scan de tickets. Outlayr n'a pas de publicité, et vos données ne sont jamais vendues.",
                }),
                question: t({
                    en: "Who can see my financial data?",
                    es: "¿Quién puede ver mis datos financieros?",
                    pt: "Quem pode ver meus dados financeiros?",
                    fr: "Qui peut voir mes données financières ?",
                }),
            },
            { answer: OPEN_SOURCE_ANSWER, question: OPEN_SOURCE_QUESTION },
        ],
        faqTitle: t({
            en: "Questions, answered",
            es: "Preguntas y respuestas",
            pt: "Perguntas e respostas",
            fr: "Questions et réponses",
        }),
        hero: {
            title: t({
                en: "Track every expense in one sentence",
                es: "Registra cada gasto en una oración",
                pt: "Registre cada gasto em uma frase",
                fr: "Notez chaque dépense en une phrase",
            }),
            tryLabel: t({ en: "Try it live", es: "Pruébalo en vivo", pt: "Teste ao vivo", fr: "Essayez en direct" }),
            tryPlaceholder: t({
                en: "blue bottle 4.50",
                es: "juan valdez 4,50",
                pt: "starbucks 4,50",
                fr: "columbus café 4,50",
            }),
            videoLabel: t({
                en: "Logging a $42.00 grocery purchase at Costco in Outlayr, from the add menu to the Log.",
                es: "Cómo se registra en Outlayr una compra de súper de $42.00 en Costco, desde el menú para agregar hasta el Registro.",
                pt: "Registrando no Outlayr uma compra de mercado de $42.00 no Costco, do menu de adicionar até os Lançamentos.",
                fr: "Enregistrement dans Outlayr d'un achat de courses de $42.00 chez Costco, du menu d'ajout jusqu'au Journal.",
            }),
        },
        limits: [
            {
                free: "20",
                label: t({
                    en: "Captures every 30 days",
                    es: "Capturas cada 30 días",
                    pt: "Capturas a cada 30 dias",
                    fr: "Captures tous les 30 jours",
                }),
                pro: "500",
            },
            {
                free: "3",
                label: t({ en: "Accounts", es: "Cuentas", pt: "Contas", fr: "Comptes" }),
                pro: t({ en: "unlimited", es: "sin límite", pt: "sem limite", fr: "illimité" }),
            },
            {
                free: "2",
                label: t({
                    en: "Category budgets",
                    es: "Presupuestos por categoría",
                    pt: "Orçamentos por categoria",
                    fr: "Budgets par catégorie",
                }),
                pro: t({ en: "unlimited", es: "sin límite", pt: "sem limite", fr: "illimité" }),
            },
            {
                free: "2",
                label: t({
                    en: "Account currencies",
                    es: "Monedas de cuentas",
                    pt: "Moedas das contas",
                    fr: "Devises des comptes",
                }),
                pro: t({ en: "unlimited", es: "sin límite", pt: "sem limite", fr: "illimité" }),
            },
            {
                free: "1",
                label: t({ en: "App icons", es: "Íconos de la app", pt: "Ícones do app", fr: "Icônes de l'app" }),
                pro: "5",
            },
        ],
        meta: {
            description: t({
                en: "Outlayr is a mobile expense tracker and budget app. Log a purchase in one sentence, by voice, or from a receipt, and track every subscription. Free to start.",
                es: "Outlayr es una app para controlar tus gastos y tu presupuesto. Registra una compra en una oración, con tu voz o con un recibo, y controla tus suscripciones.",
                pt: "Aplicativo de finanças para controle de gastos e orçamento: registre uma compra em uma frase, por voz ou com um recibo, e acompanhe suas assinaturas.",
                fr: "Appli budget gratuite pour suivre vos dépenses : notez un achat en une phrase, à la voix ou depuis un ticket, et suivez chaque abonnement.",
            }),
            title: t({
                en: "Outlayr: Expense Tracker, Budget App & Subscription Tracker",
                es: "App para controlar gastos y presupuesto · Outlayr",
                pt: "App de controle financeiro e de gastos · Outlayr",
                fr: "Application de gestion de budget et dépenses · Outlayr",
            }),
        },
        plansCopy: {
            footnote: t({
                en: "A capture is one voice entry or one receipt scan, and needs you signed in. Pro is billed monthly or yearly, or bought once, at the price your app store shows in your country.",
                es: "Una captura es un registro por voz o un escaneo de recibo, y requiere que hayas iniciado sesión. Pro se cobra al mes o al año, o se compra una sola vez, al precio que muestra tu tienda de apps en tu país.",
                pt: "Uma captura é um lançamento por voz ou um escaneamento de recibo, e exige que você tenha entrado na sua conta. O Pro é cobrado por mês ou por ano, ou comprado uma vez só, pelo preço que sua loja de apps mostra no seu país.",
                fr: "Une capture correspond à une saisie vocale ou à un scan de ticket, et nécessite d'être connecté. Pro est facturé au mois ou à l'année, ou acheté en une fois, au prix affiché par votre boutique d'apps dans votre pays.",
            }),
            lead: t({
                en: "The tracker is free. Pro lifts the limits and adds sync.",
                es: "La app es gratis. Pro quita los límites y agrega la sincronización.",
                pt: "O app é grátis. O Pro tira os limites e adiciona a sincronização.",
                fr: "L'app est gratuite. Pro lève les limites et ajoute la synchronisation.",
            }),
        },
        proOnly: [
            t({
                en: "Sync across devices",
                es: "Sincronizar dispositivos",
                pt: "Sincronizar dispositivos",
                fr: "Synchronisation entre appareils",
            }),
            t({
                en: "Receipt photo backup",
                es: "Respaldo de fotos",
                pt: "Backup de fotos",
                fr: "Sauvegarde des photos de tickets",
            }),
            t({
                en: "AI matching on import",
                es: "Coincidencia con IA al importar",
                pt: "IA ao importar",
                fr: "Correspondance IA à l'import",
            }),
            t({
                en: "Notion connection",
                es: "Conexión con Notion",
                pt: "Conexão com o Notion",
                fr: "Connexion à Notion",
            }),
            t({
                en: "Web merchant lookup",
                es: "Búsqueda web de comercios",
                pt: "Busca de estabelecimentos na web",
                fr: "Recherche web des commerçants",
            }),
        ],
        tour: [
            {
                alt: BUDGETS_SCREEN_ALT,
                body: t({
                    en: "Set a limit per category or one for the whole month, and carry over what you didn’t spend. The chart shows where this pace ends, not just what’s left.",
                    es: "Pon un límite por categoría o uno para todo el mes, y acumula lo que no gastaste. El gráfico muestra a dónde te lleva este ritmo, no solo lo que queda.",
                    pt: "Defina um limite por categoria ou um para o mês inteiro, e leve para o mês seguinte o que você não gastou. O gráfico mostra onde esse ritmo vai parar, não só o que sobra.",
                    fr: "Fixez une limite par catégorie ou une seule pour tout le mois, et reportez ce que vous n'avez pas dépensé. Le graphique montre où mène ce rythme, pas seulement ce qui reste.",
                }),
                title: t({
                    en: "Spot the overspend early",
                    es: "Descubre a tiempo si te vas a pasar",
                    pt: "Perceba a tempo se vai estourar",
                    fr: "Repérez les dépassements à temps",
                }),
            },
            {
                alt: t({
                    en: "Outlayr Insights for 6 to 12 September: $597.95 spent, 74% less than the week before, a bar for each day, and the categories that moved most.",
                    es: "Estadísticas de Outlayr del 6 al 12 de septiembre: $597.95 gastados, 74% menos que la semana anterior, una barra por día y las categorías que más cambiaron.",
                    pt: "Estatísticas do Outlayr de 6 a 12 de setembro: $597.95 gastos, 74% a menos que na semana anterior, uma barra para cada dia e as categorias que mais mudaram.",
                    fr: "Statistiques d'Outlayr du 6 au 12 septembre : $597.95 dépensés, 74 % de moins que la semaine précédente, une barre par jour et les catégories qui ont le plus bougé.",
                }),
                body: t({
                    en: "Spending by day and by category, income against spending, and net worth over time. Start the month on payday and every chart follows.",
                    es: "Gastos por día y por categoría, ingresos frente a gastos y tu patrimonio a lo largo del tiempo. Empieza el mes el día de pago y todos los gráficos se ajustan.",
                    pt: "Gastos por dia e por categoria, receitas contra gastos e seu patrimônio ao longo do tempo. Comece o mês no dia do pagamento e todos os gráficos acompanham.",
                    fr: "Dépenses par jour et par catégorie, revenus face aux dépenses, et patrimoine dans le temps. Commencez le mois le jour de la paie et tous les graphiques suivent.",
                }),
                title: t({
                    en: "See what moved since last week",
                    es: "Mira qué cambió desde la semana pasada",
                    pt: "Veja o que mudou desde a semana passada",
                    fr: "Voyez ce qui a bougé depuis la semaine dernière",
                }),
            },
            {
                alt: ACCOUNTS_SCREEN_ALT,
                body: t({
                    en: "Cash, cards, savings, and debts side by side. A transfer moves money between them without counting as spending.",
                    es: "Efectivo, tarjetas, ahorros y deudas, todo junto. Una transferencia mueve dinero entre tus cuentas sin contar como gasto.",
                    pt: "Dinheiro, cartões, poupança e dívidas lado a lado. Uma transferência move dinheiro entre suas contas sem contar como gasto.",
                    fr: "Espèces, cartes, épargne et dettes côte à côte. Un virement déplace de l'argent entre vos comptes sans compter comme une dépense.",
                }),
                title: t({
                    en: "Every account, every currency",
                    es: "Cada cuenta, cada moneda",
                    pt: "Cada conta, cada moeda",
                    fr: "Chaque compte, chaque devise",
                }),
            },
            {
                alt: t({
                    en: "Outlayr Upcoming entries: Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, rent, Netflix, and Planet Fitness, each with its next charge date, and $2,036.54 a month in total.",
                    es: "Próximos registros en Outlayr: Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, la renta, Netflix y Planet Fitness, cada uno con la fecha de su próximo cobro, y $2,036.54 al mes en total.",
                    pt: "Próximos lançamentos no Outlayr: Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, aluguel, Netflix e Planet Fitness, cada um com a data da próxima cobrança, e $2,036.54 por mês no total.",
                    fr: "Opérations à venir dans Outlayr : Amazon Prime, ChatGPT, iCloud, Verizon, Spotify, loyer, Netflix et Planet Fitness, chacune avec la date de son prochain prélèvement, et $2,036.54 par mois au total.",
                }),
                body: t({
                    en: "Rent, bills, and streaming log themselves on their day. Upcoming lists the next charges and what they add up to each month, and each one can remind you before it charges.",
                    es: "La renta, los servicios y el streaming se registran solos en su día. Próximos muestra los siguientes cobros y cuánto suman al mes, y cada uno puede avisarte antes de cobrarte.",
                    pt: "Aluguel, contas e streaming são lançados sozinhos no dia certo. Próximos mostra as próximas cobranças e quanto elas somam por mês, e cada uma pode te avisar antes de cobrar.",
                    fr: "Loyer, factures et streaming s'enregistrent tout seuls le jour venu. À venir liste les prochains prélèvements et leur total par mois, et chacun peut vous prévenir avant d'être prélevé.",
                }),
                title: t({
                    en: "What your subscriptions cost a month",
                    es: "Lo que te cuestan tus suscripciones al mes",
                    pt: "Quanto suas assinaturas custam por mês",
                    fr: "Ce que vos abonnements coûtent par mois",
                }),
            },
        ],
    },
    key: "home",
} satisfies Dictionary;

export default home;
