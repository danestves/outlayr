import { FREE_CAPTURES, PRO_CAPTURES } from "@outlayr/money/capture-allowance";
import { t } from "intlayer";
import type { Dictionary } from "intlayer";

import {
    APPEARANCE_EXTRA,
    EXPORT_EXTRA,
    OFFLINE_EXTRA,
    OPEN_SOURCE_ANSWER,
    OPEN_SOURCE_QUESTION,
    SPLIT_EXTRA,
} from "./shared";

const home = {
    content: {
        extras: [
            {
                label: t({ en: "Goals", de: "Ziele", es: "Metas", pt: "Metas", fr: "Objectifs" }),
                text: t({
                    en: "Save toward a date and see what you need each month.",
                    de: "Spare auf ein Datum hin und sieh, was du jeden Monat dafür brauchst.",
                    es: "Ahorra para una fecha y mira cuánto necesitas cada mes.",
                    pt: "Economize para uma data e veja quanto precisa guardar por mês.",
                    fr: "Épargnez pour une date et voyez combien il vous faut chaque mois.",
                }),
            },
            SPLIT_EXTRA,
            {
                label: t({ en: "Currencies", de: "Währungen", es: "Monedas", pt: "Moedas", fr: "Devises" }),
                text: t({
                    en: "Log expenses in any of 165 currencies and read totals in yours, at the rate from the day it happened.",
                    de: "Erfasse in einer von 165 Währungen und sieh die Summen in deiner, zum Kurs des Tages, an dem es passiert ist.",
                    es: "Registra en cualquiera de 165 monedas y mira los totales en la tuya, con la tasa del día en que ocurrió.",
                    pt: "Registre em qualquer uma de 165 moedas e veja os totais na sua, com a cotação do dia em que aconteceu.",
                    fr: "Saisissez dans l'une des 165 devises et lisez les totaux dans la vôtre, au taux du jour de l'opération.",
                }),
            },
            {
                label: t({ en: "Widgets", de: "Widgets", es: "Widgets", pt: "Widgets", fr: "Widgets" }),
                text: t({
                    en: "Four for the iPhone Home Screen and Lock Screen, and six for the Android home screen, including a 1×1 + that opens a new expense.",
                    de: "Vier für den Home-Bildschirm und den Sperrbildschirm des iPhone und sechs für den Android-Startbildschirm, darunter ein 1×1-+, das eine neue Ausgabe öffnet.",
                    es: "Cuatro para la pantalla de inicio y la pantalla bloqueada del iPhone, y seis para la de Android, incluido un + de 1×1 que abre un gasto nuevo.",
                    pt: "Quatro para a Tela de Início e a Tela Bloqueada do iPhone, e seis para a tela inicial do Android, incluindo um + de 1×1 que abre uma nova despesa.",
                    fr: "Quatre pour l'écran d'accueil et l'écran verrouillé de l'iPhone, et six pour l'écran d'accueil Android, dont un + en 1×1 qui ouvre une nouvelle dépense.",
                }),
            },
            {
                label: t({ en: "Apple Pay", de: "Apple Pay", es: "Apple Pay", pt: "Apple Pay", fr: "Apple Pay" }),
                text: t({
                    en: "On iPhone, pay with Apple Pay and a Shortcuts automation logs the purchase.",
                    de: "Bezahle auf dem iPhone mit Apple Pay, und eine Kurzbefehle-Automation erfasst den Einkauf.",
                    es: "En iPhone, paga con Apple Pay y una automatización de Atajos registra la compra.",
                    pt: "No iPhone, pague com Apple Pay e uma automação do app Atalhos registra a compra.",
                    fr: "Sur iPhone, payez avec Apple Pay et une automatisation Raccourcis enregistre l'achat.",
                }),
            },
            {
                label: t({ en: "Search", de: "Suche", es: "Buscar", pt: "Buscar", fr: "Rechercher" }),
                text: t({
                    en: "Find any entry by note, category, or amount. On iPhone, entries show up in Spotlight too.",
                    de: "Finde jeden Eintrag über Notiz, Kategorie oder Betrag. Auf dem iPhone erscheinen Einträge auch in Spotlight.",
                    es: "Encuentra cualquier registro por nota, categoría o monto. En iPhone, los registros también aparecen en Spotlight.",
                    pt: "Encontre qualquer lançamento por nota, categoria ou valor. No iPhone, os lançamentos também aparecem no Spotlight.",
                    fr: "Retrouvez n'importe quelle opération par note, catégorie ou montant. Sur iPhone, les opérations apparaissent aussi dans Spotlight.",
                }),
            },
            OFFLINE_EXTRA,
            EXPORT_EXTRA,
            {
                label: t({ en: "Lock", de: "App-Sperre", es: "Bloqueo", pt: "Bloqueio", fr: "Verrouillage" }),
                text: t({
                    en: "Face ID or Touch ID to open on iPhone, or your fingerprint or face on Android. The iPhone app switcher never shows your ledger.",
                    de: "Face ID oder Touch ID zum Öffnen auf dem iPhone, oder Fingerabdruck oder Gesicht auf Android. Der App-Umschalter des iPhone zeigt dein Haushaltsbuch nie.",
                    es: "Face ID o Touch ID para abrirla en iPhone, o tu huella o tu rostro en Android. El selector de apps del iPhone nunca muestra tu registro.",
                    pt: "Face ID ou Touch ID para abrir no iPhone, ou sua digital ou seu rosto no Android. O seletor de apps do iPhone nunca mostra seus lançamentos.",
                    fr: "Face ID ou Touch ID pour ouvrir l'app sur iPhone, ou votre empreinte ou votre visage sur Android. Le sélecteur d'apps de l'iPhone n'affiche jamais votre journal.",
                }),
            },
            APPEARANCE_EXTRA,
        ],
        faq: [
            {
                answer: t({
                    en: "Outlayr is the expense tracker that never links your bank: log by sentence, voice, receipt or Apple Pay, in any of 165 currencies. It is an open source budget app and subscription tracker for iPhone and Android, made by danestves LLC. Budgets, savings goals, subscriptions, and insights update as you log, in English, Spanish, Portuguese, French, or German.",
                    de: "Outlayr ist der Ausgaben-Tracker, der nie dein Bankkonto verknüpft: Erfasse per Satz, Sprache, Beleg oder Apple Pay, in jeder von 165 Währungen. Outlayr ist eine Open-Source-Budget-App und ein Abo-Tracker für iPhone und Android, gemacht von danestves LLC. Budgets, Sparziele, Abos und Auswertungen aktualisieren sich beim Erfassen, auf Englisch, Spanisch, Portugiesisch, Französisch oder Deutsch.",
                    es: "Outlayr es la app de gastos que nunca conecta tu banco: registra con una frase, tu voz, un recibo o Apple Pay, en cualquiera de 165 monedas. Es una app de código abierto para tu presupuesto y tus suscripciones, para iPhone y Android, hecha por danestves LLC. Los presupuestos, las metas de ahorro, las suscripciones y las estadísticas se actualizan a medida que registras, en inglés, español, portugués, francés o alemán.",
                    pt: "O Outlayr é o app de controle de gastos que nunca conecta seu banco: registre por frase, voz, recibo ou Apple Pay, em qualquer uma de 165 moedas. É um app de código aberto para seu orçamento e suas assinaturas, para iPhone e Android, feito pela danestves LLC. Orçamentos, metas de economia, assinaturas e estatísticas se atualizam conforme você registra, em inglês, espanhol, português, francês ou alemão.",
                    fr: "Outlayr est l'app de suivi des dépenses qui ne connecte jamais votre banque : saisissez par une phrase, la voix, un ticket ou Apple Pay, dans l'une des 165 devises. C'est une app open source pour votre budget et vos abonnements, sur iPhone et Android, créée par danestves LLC. Les budgets, les objectifs d'épargne, les abonnements et les statistiques se mettent à jour au fil de vos saisies, en anglais, espagnol, portugais, français ou allemand.",
                }),
                question: t({
                    en: "What is Outlayr?",
                    de: "Was ist Outlayr?",
                    es: "¿Qué es Outlayr?",
                    pt: "O que é o Outlayr?",
                    fr: "Qu'est-ce qu'Outlayr ?",
                }),
            },
            {
                answer: t({
                    en: "No. Outlayr never links your bank or asks for a bank login. You log by sentence, voice, receipt or Apple Pay, or import a CSV.",
                    de: "Nein. Outlayr verknüpft nie dein Bankkonto und fragt nie nach deinem Bank-Login. Du erfasst per Satz, Sprache, Beleg oder Apple Pay oder importierst eine CSV-Datei.",
                    es: "No. Outlayr nunca conecta tu banco ni te pide tu usuario del banco. Registras con una frase, tu voz, un recibo o Apple Pay, o importas un CSV.",
                    pt: "Não. O Outlayr nunca conecta seu banco nem pede o login do banco. Você registra por frase, voz, recibo ou Apple Pay, ou importa um CSV.",
                    fr: "Non. Outlayr ne connecte jamais votre banque et ne demande jamais vos identifiants bancaires. Vous saisissez par une phrase, la voix, un ticket ou Apple Pay, ou vous importez un CSV.",
                }),
                question: t({
                    en: "Does Outlayr need my bank login?",
                    de: "Braucht Outlayr meinen Bank-Login?",
                    es: "¿Outlayr necesita el usuario de mi banco?",
                    pt: "O Outlayr precisa do login do meu banco?",
                    fr: "Outlayr a-t-il besoin de mes identifiants bancaires ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Logging, budgets, goals, insights, subscriptions, and widgets are free. The free plan includes 30 voice or receipt captures every 30 days, 3 accounts, and 2 category budgets. Outlayr Pro raises those limits and adds sync across devices and receipt photo backup.",
                    de: "Ja. Erfassen, Budgets, Ziele, Auswertungen, Abos und Widgets sind kostenlos. Der Gratis-Plan enthält alle 30 Tage 30 Erfassungen per Sprache oder Beleg, 3 Konten und 2 Kategorie-Budgets. Outlayr Pro hebt diese Grenzen an und bringt die Synchronisierung zwischen Geräten und die Sicherung deiner Belegfotos dazu.",
                    es: "Sí. Registrar gastos es gratis, igual que los presupuestos, las metas, las estadísticas, las suscripciones y los widgets. El plan gratis incluye 30 capturas de voz o de recibos cada 30 días, 3 cuentas y 2 presupuestos por categoría. Outlayr Pro sube esos límites y agrega la sincronización entre dispositivos y el respaldo de las fotos de tus recibos.",
                    pt: "Sim. Registrar gastos é grátis, assim como orçamentos, metas, estatísticas, assinaturas e widgets. O plano grátis inclui 30 capturas por voz ou de recibos a cada 30 dias, 3 contas e 2 orçamentos por categoria. O Outlayr Pro aumenta esses limites e adiciona a sincronização entre dispositivos e o backup das fotos dos seus recibos.",
                    fr: "Oui. La saisie, les budgets, les objectifs, les statistiques, les abonnements et les widgets sont gratuits. La formule gratuite comprend 30 captures vocales ou de tickets tous les 30 jours, 3 comptes et 2 budgets par catégorie. Outlayr Pro relève ces limites et ajoute la synchronisation entre appareils et la sauvegarde des photos de vos tickets.",
                }),
                question: t({
                    en: "Is Outlayr free?",
                    de: "Ist Outlayr kostenlos?",
                    es: "¿Outlayr es gratis?",
                    pt: "O Outlayr é grátis?",
                    fr: "Outlayr est-il gratuit ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. In the United States, Outlayr Pro is $129.99 once, or $7.99 a month or $49.99 a year with 7 days free. Your app store shows the price for your country. There are no ads on any plan.",
                    de: "Ja. In den USA kostet Outlayr Pro einmalig 129,99 $, oder 7,99 $ im Monat oder 49,99 $ im Jahr mit 7 Tagen gratis. Dein App Store zeigt den Preis für dein Land. In keinem Plan gibt es Werbung.",
                    es: "Sí. En Estados Unidos, Outlayr Pro cuesta US$129.99 en un solo pago, o US$7.99 al mes o US$49.99 al año con 7 días gratis. Tu tienda de apps muestra el precio de tu país. No hay anuncios en ningún plan.",
                    pt: "Sim. Nos Estados Unidos, o Outlayr Pro custa US$ 129,99 em pagamento único, ou US$ 7,99 por mês ou US$ 49,99 por ano com 7 dias grátis. Sua loja de apps mostra o preço do seu país. Não há anúncios em nenhum plano.",
                    fr: "Oui. Aux États-Unis, Outlayr Pro coûte 129,99 $US en un seul paiement, ou 7,99 $US par mois ou 49,99 $US par an avec 7 jours gratuits. Votre boutique d'apps affiche le prix de votre pays. Aucune formule n'affiche de publicité.",
                }),
                question: t({
                    en: "Can I buy Outlayr Pro once instead of subscribing?",
                    de: "Kann ich Outlayr Pro einmal kaufen, statt ein Abo abzuschließen?",
                    es: "¿Puedo comprar Outlayr Pro en un solo pago en vez de suscribirme?",
                    pt: "Posso comprar o Outlayr Pro em um pagamento único em vez de assinar?",
                    fr: "Puis-je acheter Outlayr Pro en une fois au lieu de m'abonner ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Subscriptions, bills, and paychecks log themselves on their day. Upcoming lists the next charges and what your subscriptions and bills cost per month, and a reminder can come before each charge.",
                    de: "Ja. Abos, Rechnungen und Gehälter werden an ihrem Tag von selbst erfasst. „Demnächst“ listet die nächsten Abbuchungen und was deine Abos und Rechnungen im Monat kosten, und vor jeder Abbuchung kann eine Erinnerung kommen.",
                    es: "Sí. Las suscripciones, los pagos fijos y el sueldo se registran solos en su día. Próximos muestra los próximos cobros y cuánto te cuestan al mes tus suscripciones y pagos fijos, y puede llegarte un aviso antes de cada cobro.",
                    pt: "Sim. Assinaturas, contas fixas e salário são lançados sozinhos no dia certo. Próximos mostra as próximas cobranças e quanto suas assinaturas e contas fixas custam por mês, e você pode receber um lembrete antes de cada cobrança.",
                    fr: "Oui. Les abonnements, les factures et les salaires s'enregistrent tout seuls le jour venu. À venir liste les prochains prélèvements et ce que vos abonnements et factures coûtent par mois, et un rappel peut vous prévenir avant chaque prélèvement.",
                }),
                question: t({
                    en: "Does Outlayr track subscriptions and bills?",
                    de: "Verfolgt Outlayr Abos und Rechnungen?",
                    es: "¿Outlayr lleva las suscripciones y los pagos fijos?",
                    pt: "O Outlayr acompanha assinaturas e contas fixas?",
                    fr: "Outlayr suit-il les abonnements et les factures ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Outlayr is on the App Store for iPhone with iOS 18 or later, and on Google Play for Android.",
                    de: "Ja. Outlayr gibt es im App Store für das iPhone mit iOS 18 oder neuer und bei Google Play für Android.",
                    es: "Sí. Outlayr está en el App Store para iPhone con iOS 18 o posterior, y en Google Play para Android.",
                    pt: "Sim. O Outlayr está na App Store para iPhone com iOS 18 ou posterior, e no Google Play para Android.",
                    fr: "Oui. Outlayr est sur l'App Store pour iPhone sous iOS 18 ou version ultérieure, et sur Google Play pour Android.",
                }),
                question: t({
                    en: "Is Outlayr on iPhone and Android?",
                    de: "Gibt es Outlayr für iPhone und Android?",
                    es: "¿Outlayr está en iPhone y Android?",
                    pt: "O Outlayr está disponível para iPhone e Android?",
                    fr: "Outlayr est-il disponible sur iPhone et Android ?",
                }),
            },
            {
                answer: t({
                    en: "Outlayr reads the store, the date, the total, and every line from a photo of the receipt, then fills in the entry for you to save. Take the photo or pick one from your library. Scanning needs an account, and each scan counts as one capture.",
                    de: "Outlayr liest Geschäft, Datum, Summe und jede Zeile aus einem Foto des Belegs und füllt den Eintrag aus, damit du ihn speicherst. Mach das Foto oder wähle eines aus deiner Fotomediathek. Fürs Scannen brauchst du ein Konto, und jeder Scan zählt als eine Erfassung.",
                    es: "Outlayr lee la tienda, la fecha, el total y cada línea de una foto del recibo, y llena el registro para que lo guardes. Toma la foto o elige una de tu galería. Para escanear necesitas una cuenta, y cada escaneo equivale a una captura.",
                    pt: "O Outlayr lê o estabelecimento, a data, o total e cada item de uma foto do recibo, e preenche o lançamento para você salvar. Tire a foto ou escolha uma da sua galeria. Para escanear, você precisa de uma conta, e cada escaneamento conta como uma captura.",
                    fr: "Outlayr lit le commerce, la date, le total et chaque ligne sur une photo du ticket, puis remplit l'opération pour que vous l'enregistriez. Prenez la photo ou choisissez-en une dans votre galerie. Le scan nécessite un compte, et chaque scan compte comme une capture.",
                }),
                question: t({
                    en: "How does receipt scanning work?",
                    de: "Wie funktioniert das Scannen von Belegen?",
                    es: "¿Cómo funciona el escaneo de recibos?",
                    pt: "Como funciona o escaneamento de recibos?",
                    fr: "Comment fonctionne le scan de tickets ?",
                }),
            },
            {
                answer: t({
                    en: "Yes, 165 currencies. Totals convert to your main currency at the rate from the day of each purchase.",
                    de: "Ja, 165 Währungen. Summen werden zum Kurs vom Tag jedes Einkaufs in deine Hauptwährung umgerechnet.",
                    es: "Sí, 165 monedas. Los totales se convierten a tu moneda principal con la tasa del día de cada compra.",
                    pt: "Sim, 165 moedas. Os totais são convertidos para sua moeda principal com a cotação do dia de cada compra.",
                    fr: "Oui, 165 devises. Les totaux sont convertis dans votre devise principale au taux du jour de chaque achat.",
                }),
                question: t({
                    en: "Does Outlayr support multiple currencies?",
                    de: "Unterstützt Outlayr mehrere Währungen?",
                    es: "¿Outlayr admite varias monedas?",
                    pt: "O Outlayr aceita várias moedas?",
                    fr: "Outlayr prend-il en charge plusieurs devises ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Entries save on your phone first, so typing an entry works with no signal. Voice entry and receipt scanning need a connection. With Pro, sync sends your entries to your other devices once you are back online.",
                    de: "Ja. Einträge werden zuerst auf deinem Handy gespeichert, deshalb kannst du auch ohne Netz einen Eintrag tippen. Spracheingabe und Belegscan brauchen eine Verbindung. Mit Pro sendet die Synchronisierung deine Einträge an deine anderen Geräte, sobald du wieder online bist.",
                    es: "Sí. Los registros se guardan primero en tu celular, así que puedes escribir uno sin señal. Para dictar y escanear recibos necesitas conexión. Con Pro, la sincronización envía tus registros a tus otros dispositivos cuando vuelves a tener conexión.",
                    pt: "Sim. Os lançamentos são salvos primeiro no seu celular, então dá para digitar um sem sinal. Para lançar por voz e escanear recibos, você precisa de conexão. Com o Pro, a sincronização envia seus lançamentos para seus outros dispositivos quando você volta a ficar online.",
                    fr: "Oui. Les opérations s'enregistrent d'abord sur votre téléphone, vous pouvez donc en saisir une sans réseau. La saisie vocale et le scan de tickets nécessitent une connexion. Avec Pro, la synchronisation envoie vos opérations vers vos autres appareils dès que vous êtes de nouveau en ligne.",
                }),
                question: t({
                    en: "Does Outlayr work offline?",
                    de: "Funktioniert Outlayr offline?",
                    es: "¿Outlayr funciona sin conexión?",
                    pt: "O Outlayr funciona sem internet?",
                    fr: "Outlayr fonctionne-t-il hors ligne ?",
                }),
            },
            {
                answer: t({
                    en: "Yes. Export a CSV from your bank or another app and import it. Duplicates are skipped, and category names that match yours, or merchants Outlayr already knows, are matched to your categories on your phone, and a row with no match is listed as skipped. With Pro, AI matching fills in the rest, and a category name still unmatched becomes a new category, listed before you save.",
                    de: "Ja. Exportiere eine CSV-Datei aus deiner Bank oder einer anderen App und importiere sie. Duplikate werden übersprungen, und Kategorienamen, die deinen entsprechen, oder Händler, die Outlayr schon kennt, werden auf deinem Handy deinen Kategorien zugeordnet. Eine Zeile ohne Treffer wird als übersprungen aufgeführt. Mit Pro erledigt die KI-Zuordnung den Rest, und ein Kategoriename ohne Treffer wird zu einer neuen Kategorie, die du vor dem Speichern siehst.",
                    es: "Sí. Exporta un CSV desde tu banco u otra app e impórtalo. Los duplicados se omiten, y los nombres de categoría que coinciden con los tuyos, o los comercios que Outlayr ya conoce, se asignan a tus categorías en tu celular, y una fila sin coincidencia aparece como omitida. Con Pro, la asignación con IA completa el resto, y un nombre de categoría que siga sin coincidir se crea como categoría nueva, que ves antes de guardar.",
                    pt: "Sim. Exporte um CSV do seu banco ou de outro app e importe. Os duplicados são ignorados, e os nomes de categoria iguais aos seus, ou os estabelecimentos que o Outlayr já conhece, são associados às suas categorias no seu celular. Uma linha sem correspondência aparece como ignorada. Com o Pro, a correspondência com IA completa o resto, e um nome de categoria que continue sem correspondência vira uma categoria nova, que você vê antes de salvar.",
                    fr: "Oui. Exportez un CSV depuis votre banque ou une autre app, puis importez-le. Les doublons sont ignorés, et les noms de catégorie identiques aux vôtres, ou les commerçants qu'Outlayr connaît déjà, sont associés à vos catégories sur votre téléphone. Une ligne sans correspondance est listée comme ignorée. Avec Pro, la correspondance IA complète le reste, et un nom de catégorie toujours sans correspondance devient une nouvelle catégorie, que vous voyez avant d'enregistrer.",
                }),
                question: t({
                    en: "Can I import a CSV from my bank?",
                    de: "Kann ich eine CSV-Datei meiner Bank importieren?",
                    es: "¿Puedo importar un CSV de mi banco?",
                    pt: "Posso importar um CSV do meu banco?",
                    fr: "Puis-je importer un CSV de ma banque ?",
                }),
            },
            {
                answer: t({
                    en: "Your ledger is stored on your phone. It reaches our servers only if you sign in and turn on sync, or use a feature that needs them, like receipt scanning. Outlayr has no ads, and your data is never sold.",
                    de: "Dein Haushaltsbuch liegt auf deinem Handy. Es erreicht unsere Server nur, wenn du dich anmeldest und die Synchronisierung einschaltest oder eine Funktion nutzt, die sie braucht, etwa den Belegscan. Outlayr hat keine Werbung, und deine Daten werden nie verkauft.",
                    es: "Tu registro se guarda en tu celular. Solo llega a nuestros servidores si inicias sesión y activas la sincronización, o si usas una función que los necesite, como el escaneo de recibos. Outlayr no tiene anuncios y tus datos nunca se venden.",
                    pt: "Seus lançamentos ficam guardados no seu celular. Eles só chegam aos nossos servidores se você entrar na sua conta e ativar a sincronização, ou se usar um recurso que precise deles, como o escaneamento de recibos. O Outlayr não tem anúncios, e seus dados nunca são vendidos.",
                    fr: "Votre journal est stocké sur votre téléphone. Il n'atteint nos serveurs que si vous vous connectez et activez la synchronisation, ou si vous utilisez une fonction qui en a besoin, comme le scan de tickets. Outlayr n'a pas de publicité, et vos données ne sont jamais vendues.",
                }),
                question: t({
                    en: "Who can see my financial data?",
                    de: "Wer kann meine Finanzdaten sehen?",
                    es: "¿Quién puede ver mis datos financieros?",
                    pt: "Quem pode ver meus dados financeiros?",
                    fr: "Qui peut voir mes données financières ?",
                }),
            },
            { answer: OPEN_SOURCE_ANSWER, question: OPEN_SOURCE_QUESTION },
        ],
        hero: {
            title: t({
                en: "Track every expense in one sentence",
                de: "Erfasse jede Ausgabe in einem Satz",
                es: "Registra cada gasto en una frase",
                pt: "Registre cada gasto em uma frase",
                fr: "Notez chaque dépense en une phrase",
            }),
        },
        limits: [
            {
                free: String(FREE_CAPTURES),
                label: t({
                    en: "Captures every 30 days",
                    de: "Erfassungen alle 30 Tage",
                    es: "Capturas cada 30 días",
                    pt: "Capturas a cada 30 dias",
                    fr: "Captures tous les 30 jours",
                }),
                pro: String(PRO_CAPTURES),
            },
            {
                free: "3",
                label: t({ en: "Accounts", de: "Konten", es: "Cuentas", pt: "Contas", fr: "Comptes" }),
                pro: t({ en: "unlimited", de: "unbegrenzt", es: "sin límite", pt: "sem limite", fr: "illimité" }),
            },
            {
                free: "2",
                label: t({
                    en: "Category budgets",
                    de: "Kategorie-Budgets",
                    es: "Presupuestos por categoría",
                    pt: "Orçamentos por categoria",
                    fr: "Budgets par catégorie",
                }),
                pro: t({ en: "unlimited", de: "unbegrenzt", es: "sin límite", pt: "sem limite", fr: "illimité" }),
            },
            {
                free: "2",
                label: t({
                    en: "Account currencies",
                    de: "Kontowährungen",
                    es: "Monedas de cuentas",
                    pt: "Moedas das contas",
                    fr: "Devises des comptes",
                }),
                pro: t({ en: "unlimited", de: "unbegrenzt", es: "sin límite", pt: "sem limite", fr: "illimité" }),
            },
            {
                free: "1",
                label: t({
                    en: "App icons",
                    de: "App-Symbole",
                    es: "Íconos de la app",
                    pt: "Ícones do app",
                    fr: "Icônes de l'app",
                }),
                pro: "5",
            },
        ],
        meta: {
            description: t({
                en: "Outlayr is an expense tracker and budget app. Log a purchase by sentence, voice, or receipt, and track subscriptions. Free to start.",
                de: "Outlayr ist ein Ausgaben-Tracker und eine Budget-App. Erfasse Einkäufe per Satz, Stimme oder Beleg. Kostenlos zum Start.",
                es: "Outlayr es una app para controlar tus gastos y tu presupuesto. Registra una compra con una frase, tu voz o un recibo.",
                pt: "App de controle de gastos e orçamento: registre uma compra em uma frase, por voz ou com um recibo, e veja suas assinaturas.",
                fr: "Appli budget gratuite : notez une dépense en une phrase, à la voix ou depuis un ticket, et gardez un œil sur vos abonnements.",
            }),
            title: t({
                en: "Outlayr: Expense Tracker, Budget App & Subscription Tracker",
                de: "Outlayr: Ausgaben-Tracker, Budget-App und Abo-Tracker",
                es: "App para controlar gastos y presupuesto · Outlayr",
                pt: "App de controle financeiro e de gastos · Outlayr",
                fr: "Application de gestion de budget et dépenses · Outlayr",
            }),
        },
        plansCopy: {
            footnote: t({
                en: "A capture is one voice clip, one receipt photo, or one installment plan import of up to 5 screenshots, and needs you signed in. Pro is billed monthly or yearly, or bought once, at the price your app store shows in your country.",
                de: "Eine Erfassung ist ein Sprachclip, ein Belegfoto oder ein Import von Ratenplänen mit bis zu 5 Screenshots und setzt voraus, dass du angemeldet bist. Pro wird monatlich oder jährlich abgerechnet oder einmalig gekauft, zum Preis, den dein App Store in deinem Land zeigt.",
                es: "Una captura es un clip de voz, una foto de un recibo o una importación de planes de cuotas de hasta 5 capturas de pantalla, y requiere que hayas iniciado sesión. Pro se cobra al mes o al año, o se compra una sola vez, al precio que muestra tu tienda de apps en tu país.",
                pt: "Uma captura é um áudio de voz, uma foto de recibo ou uma importação de parcelamentos de até 5 capturas de tela, e exige que você tenha entrado na sua conta. O Pro é cobrado por mês ou por ano, ou comprado uma vez só, pelo preço que sua loja de apps mostra no seu país.",
                fr: "Une capture correspond à un extrait vocal, une photo de ticket ou un import d’échéanciers d’au plus 5 captures d’écran, et nécessite d'être connecté. Pro est facturé au mois ou à l'année, ou acheté en une fois, au prix affiché par votre boutique d'apps dans votre pays.",
            }),
            lead: t({
                en: "The tracker is free. Pro lifts the limits and adds sync.",
                de: "Der Tracker ist kostenlos. Pro hebt die Grenzen an und bringt die Synchronisierung dazu.",
                es: "La app es gratis. Pro quita los límites y agrega la sincronización.",
                pt: "O app é grátis. O Pro tira os limites e adiciona a sincronização.",
                fr: "L'app est gratuite. Pro lève les limites et ajoute la synchronisation.",
            }),
        },
        proOnly: [
            t({
                en: "Sync across devices",
                de: "Synchronisierung zwischen Geräten",
                es: "Sincronizar dispositivos",
                pt: "Sincronizar dispositivos",
                fr: "Synchronisation entre appareils",
            }),
            t({
                en: "Receipt photo backup",
                de: "Sicherung der Belegfotos",
                es: "Respaldo de fotos",
                pt: "Backup de fotos",
                fr: "Sauvegarde des photos de tickets",
            }),
            t({
                en: "AI matching on import",
                de: "KI-Zuordnung beim Import",
                es: "Coincidencia con IA al importar",
                pt: "IA ao importar",
                fr: "Correspondance IA à l'import",
            }),
            t({
                en: "Notion connection",
                de: "Notion-Verbindung",
                es: "Conexión con Notion",
                pt: "Conexão com o Notion",
                fr: "Connexion à Notion",
            }),
            t({
                en: "Web merchant lookup",
                de: "Händlersuche im Web",
                es: "Búsqueda web de comercios",
                pt: "Busca de estabelecimentos na web",
                fr: "Recherche web des commerçants",
            }),
        ],
    },
    key: "home",
} satisfies Dictionary;

export default home;
