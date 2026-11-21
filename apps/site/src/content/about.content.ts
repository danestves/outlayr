import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const about = {
    content: {
        allComparisons: t({
            en: "All comparisons",
            de: "Alle Vergleiche",
            es: "Todas las comparativas",
            pt: "Todas as comparações",
            fr: "Toutes les comparaisons",
        }),
        allGuides: t({
            en: "All guides",
            de: "Alle Guides",
            es: "Todas las guías",
            pt: "Todos os guias",
            fr: "Tous les guides",
        }),
        contact: {
            lead: t({
                en: "For support, press, or a question about the app.",
                de: "Für Support, Presse oder eine Frage zur App.",
                es: "Para soporte, prensa o una pregunta sobre la app.",
                pt: "Para suporte, imprensa ou uma dúvida sobre o app.",
                fr: "Pour le support, la presse ou une question sur l'app.",
            }),
            title: t({
                en: "Write to us",
                de: "Schreib uns",
                es: "Escríbenos",
                pt: "Fale com a gente",
                fr: "Écrivez-nous",
            }),
        },
        data: {
            label: t({ en: "Your data", de: "Deine Daten", es: "Tus datos", pt: "Seus dados", fr: "Vos données" }),
            text: t({
                en: "Your ledger is stored on your phone. Without an account or Pro, your entries, amounts, and notes never leave it. With Pro, sync keeps a copy on our servers until you delete your account. Voice entries, receipt scans, merchant suggestions, and the bank notifications Outlayr logs are processed by Anthropic and ElevenLabs, and recordings, scanned photos, and notifications are not stored. Your data is never sold.",
                de: "Dein Haushaltsbuch liegt auf deinem Handy. Ohne Konto und ohne Pro verlassen deine Einträge, Beträge und Notizen es nie. Mit Pro hält die Synchronisierung eine Kopie auf unseren Servern, bis du dein Konto löschst. Spracheingaben, Belegscans, Händlervorschläge und die Bankbenachrichtigungen, die Outlayr erfasst, werden von Anthropic und ElevenLabs verarbeitet, und Aufnahmen, gescannte Fotos und Benachrichtigungen werden nicht gespeichert. Deine Daten werden nie verkauft.",
                es: "Tu registro se guarda en tu celular. Sin una cuenta ni Pro, tus registros, montos y notas nunca salen de él. Con Pro, la sincronización guarda una copia en nuestros servidores hasta que elimines tu cuenta. Las entradas por voz, los escaneos de recibos, las sugerencias de comercios y las notificaciones del banco que Outlayr registra los procesan Anthropic y ElevenLabs, y no guardamos las grabaciones, las fotos escaneadas ni las notificaciones. Tus datos nunca se venden.",
                pt: "Seu registro fica guardado no seu celular. Sem uma conta nem o Pro, seus lançamentos, valores e notas nunca saem dele. Com o Pro, a sincronização guarda uma cópia nos nossos servidores até você excluir sua conta. Os lançamentos por voz, os escaneamentos de recibos, as sugestões de estabelecimentos e as notificações do banco que o Outlayr registra são processados pela Anthropic e pela ElevenLabs, e as gravações, as fotos escaneadas e as notificações não são armazenadas. Seus dados nunca são vendidos.",
                fr: "Votre journal est stocké sur votre téléphone. Sans compte ni Pro, vos opérations, montants et notes ne le quittent jamais. Avec Pro, la synchronisation conserve une copie sur nos serveurs jusqu'à ce que vous supprimiez votre compte. Les saisies vocales, les scans de tickets, les suggestions de commerçants et les notifications bancaires qu'Outlayr enregistre sont traités par Anthropic et ElevenLabs, et les enregistrements, les photos scannées et les notifications ne sont pas conservés. Vos données ne sont jamais vendues.",
            }),
        },
        entity: t({
            en: "Outlayr is an open source mobile expense tracker, budget app, and subscription tracker, made by danestves LLC.",
            de: "Outlayr ist ein Open-Source-Ausgaben-Tracker, eine Budget-App und ein Abo-Tracker fürs Handy, gemacht von danestves LLC.",
            es: "Outlayr es una app móvil de código abierto para controlar tus gastos, tu presupuesto y tus suscripciones, hecha por danestves LLC.",
            pt: "O Outlayr é um app de código aberto para controlar gastos, orçamento e assinaturas no celular, feito pela danestves LLC.",
            fr: "Outlayr est une app mobile open source pour suivre vos dépenses, votre budget et vos abonnements, créée par danestves LLC.",
        }),
        facts: [
            {
                label: t({ en: "Logging", de: "Erfassen", es: "Registro", pt: "Lançamentos", fr: "Saisie" }),
                text: t({
                    en: "Type a purchase as one sentence, say it, scan the receipt, or import a CSV. On iPhone, a Shortcuts automation can log each Apple Pay purchase.",
                    de: "Tipp einen Einkauf als einen Satz, sprich ihn ein, scanne den Beleg oder importiere eine CSV. Auf dem iPhone kann eine Kurzbefehle-Automation jeden Apple-Pay-Einkauf erfassen.",
                    es: "Escribe una compra en una frase, díctala, escanea el recibo o importa un CSV. En iPhone, una automatización de Atajos puede registrar cada compra con Apple Pay.",
                    pt: "Digite uma compra em uma frase, dite, escaneie o recibo ou importe um CSV. No iPhone, uma automação do app Atalhos pode registrar cada compra com Apple Pay.",
                    fr: "Saisissez un achat en une phrase, dictez-le, scannez le ticket ou importez un CSV. Sur iPhone, une automatisation Raccourcis peut enregistrer chaque achat payé avec Apple Pay.",
                }),
            },
            {
                label: t({ en: "Currencies", de: "Währungen", es: "Monedas", pt: "Moedas", fr: "Devises" }),
                text: t({
                    en: "165 currencies. Totals convert to your main currency at the rate from the day of each purchase.",
                    de: "165 Währungen. Summen werden zum Kurs vom Tag jedes Einkaufs in deine Hauptwährung umgerechnet.",
                    es: "165 monedas. Los totales se convierten a tu moneda principal con la tasa del día de cada compra.",
                    pt: "165 moedas. Os totais são convertidos para sua moeda principal pela cotação do dia de cada compra.",
                    fr: "165 devises. Les totaux sont convertis dans votre devise principale au taux du jour de chaque achat.",
                }),
            },
            {
                label: t({ en: "Debts", de: "Schulden", es: "Deudas", pt: "Dívidas", fr: "Dettes" }),
                text: t({
                    en: "Money you lent or borrowed, a sale on credit, or a job or purchase you will pay later, each with its person and an optional payoff plan. One Accounts screen shows what you have and what you owe. A credit card keeps its limit and its statement and payment days, shows what the last statement asks for, and reminds you the day before it is due.",
                    de: "Geld, das du verliehen oder geliehen hast, ein Verkauf auf Kredit oder eine Arbeit oder ein Einkauf, den du später bezahlst, jeweils mit der Person und einem optionalen Tilgungsplan. Ein einziger Konten-Bildschirm zeigt, was du hast und was du schuldest. Eine Kreditkarte behält ihr Limit sowie ihren Abrechnungs- und Zahltag, zeigt, was die letzte Abrechnung verlangt, und erinnert dich am Tag vor der Fälligkeit.",
                    es: "Lo que prestaste o te prestaron, una venta a crédito o un trabajo o una compra que pagarás después, cada uno con su persona y un plan de pago opcional. Una sola pantalla de Cuentas muestra lo que tienes y lo que debes. Una tarjeta de crédito guarda su límite y sus fechas de corte y de pago, muestra cuánto pide el último corte y te avisa el día antes de pagar.",
                    pt: "O que você emprestou ou pegou emprestado, uma venda a prazo ou um trabalho ou uma compra que você vai pagar depois, cada um com sua pessoa e um plano de pagamento opcional. Uma única tela de Contas mostra o que você tem e o que você deve. Um cartão de crédito guarda seu limite e as datas de fechamento e de vencimento da fatura, mostra quanto a última fatura cobra e avisa você na véspera do vencimento.",
                    fr: "L'argent que vous avez prêté ou emprunté, une vente à crédit, ou un travail ou un achat que vous paierez plus tard, chacun avec sa personne et un plan de remboursement facultatif. Un seul écran Comptes montre ce que vous avez et ce que vous devez. Une carte de crédit garde sa limite et ses dates d'arrêté et de paiement, indique ce que réclame le dernier relevé et vous prévient la veille de l'échéance.",
                }),
            },
            {
                label: t({
                    en: "Installments",
                    de: "Raten",
                    es: "Cuotas",
                    pt: "Parcelamento",
                    fr: "Paiement en plusieurs fois",
                }),
                text: t({
                    en: "Purchases from buy now, pay later apps such as Cashea and Klarna: the upfront payment and each installment, a reminder the day before each one is due, and late fees. An order already in progress can be read from a screenshot of its payment plan.",
                    de: "Einkäufe über Buy-now-pay-later-Dienste wie Klarna: die Anzahlung und jede Rate, eine Erinnerung am Tag vor jeder Fälligkeit und Mahngebühren. Eine Bestellung, die schon läuft, lässt sich von einem Screenshot ihres Zahlungsplans einlesen.",
                    es: "Compras en apps de cuotas como Cashea y Klarna: la inicial y cada cuota, un aviso el día antes de cada pago y los recargos por atraso. Una compra que ya va por la mitad se puede leer desde una captura de su plan de pagos.",
                    pt: "Compras parceladas em apps de compre agora, pague depois, como Klarna: a entrada e cada parcela, um lembrete na véspera de cada vencimento e as multas por atraso. Uma compra que já está em andamento pode ser lida a partir de uma captura de tela do plano de pagamento.",
                    fr: "Achats en plusieurs fois avec des apps de paiement fractionné comme Klarna ou Alma : l'apport initial et chaque échéance, un rappel la veille de chaque échéance et les frais de retard. Une commande déjà en cours peut être lue à partir d'une capture d'écran de son échéancier.",
                }),
            },
            {
                label: t({
                    en: "Platforms",
                    de: "Plattformen",
                    es: "Plataformas",
                    pt: "Plataformas",
                    fr: "Plateformes",
                }),
                text: t({
                    en: "iPhone with iOS 18 or later, and Android.",
                    de: "iPhone mit iOS 18 oder neuer und Android.",
                    es: "iPhone con iOS 18 o posterior, y Android.",
                    pt: "iPhone com iOS 18 ou posterior e Android.",
                    fr: "iPhone avec iOS 18 ou plus récent, et Android.",
                }),
            },
            {
                label: t({ en: "Languages", de: "Sprachen", es: "Idiomas", pt: "Idiomas", fr: "Langues" }),
                text: t({
                    en: "English, Spanish from Latin America and from Spain, Portuguese from Brazil and from Portugal, French, and German.",
                    de: "Englisch, Spanisch aus Lateinamerika und aus Spanien, Portugiesisch aus Brasilien und aus Portugal, Französisch und Deutsch.",
                    es: "Inglés, español de Latinoamérica y de España, portugués de Brasil y de Portugal, francés y alemán.",
                    pt: "Inglês, espanhol da América Latina e da Espanha, português do Brasil e de Portugal, francês e alemão.",
                    fr: "Anglais, espagnol d'Amérique latine et d'Espagne, portugais du Brésil et du Portugal, français et allemand.",
                }),
            },
            {
                label: t({ en: "Account", de: "Konto", es: "Cuenta", pt: "Conta", fr: "Compte" }),
                text: t({
                    en: "Optional. Signing in with Apple, Google, or email and password is needed for sync, and for voice entry and receipt scanning unless you buy Pro, which works signed out too.",
                    de: "Optional. Die Anmeldung mit Apple, Google oder E-Mail und Passwort brauchst du für die Synchronisierung, und für Spracheingabe und Belegscan, außer du kaufst Pro, das auch abgemeldet funktioniert.",
                    es: "Opcional. Necesitas iniciar sesión con Apple, con Google, o con un correo electrónico y una contraseña para sincronizar, y para dictar registros y escanear recibos salvo que compres Pro, que también funciona sin sesión.",
                    pt: "Opcional. É preciso entrar com Apple, Google ou e-mail e senha para sincronizar, e para registrar por voz e escanear recibos, a menos que você compre o Pro, que também funciona sem sessão.",
                    fr: "Facultatif. Il faut se connecter avec Apple, Google ou une adresse e-mail et un mot de passe pour synchroniser, ainsi que pour saisir à la voix et scanner des tickets, sauf si vous achetez Pro, qui fonctionne aussi sans être connecté.",
                }),
            },
            {
                label: t({ en: "Price", de: "Preis", es: "Precio", pt: "Preço", fr: "Prix" }),
                text: t({
                    en: "Free to start. In the United States, Pro is $7.99 a month, $49.99 a year with 3 days free, or $129.99 once. Your app store shows the price for your country. There are no ads on any plan.",
                    de: "Gratis zum Start. In den USA kostet Pro 7,99 $ im Monat, 49,99 $ im Jahr mit 3 Tagen gratis oder einmalig 129,99 $. Dein App Store zeigt den Preis für dein Land. In keinem Plan gibt es Werbung.",
                    es: "Gratis para empezar. En Estados Unidos, Pro cuesta US$7.99 al mes, US$49.99 al año con 3 días gratis o US$129.99 en un solo pago. Tu tienda de apps muestra el precio de tu país. No hay anuncios en ningún plan.",
                    pt: "Grátis para começar. Nos Estados Unidos, o Pro custa US$ 7,99 por mês, US$ 49,99 por ano com 3 dias grátis ou US$ 129,99 em pagamento único. Sua loja de apps mostra o preço do seu país. Não há anúncios em nenhum plano.",
                    fr: "Gratuit pour commencer. Aux États-Unis, Pro coûte 7,99 $US par mois, 49,99 $US par an avec 3 jours gratuits ou 129,99 $US en un seul paiement. Votre boutique d'apps affiche le prix de votre pays. Aucune formule n'affiche de publicité.",
                }),
            },
            {
                label: t({
                    en: "Free plan",
                    de: "Gratis-Plan",
                    es: "Plan gratis",
                    pt: "Plano grátis",
                    fr: "Formule gratuite",
                }),
                text: t({
                    en: "Logging, budgets, goals, insights, subscriptions, debts, installments, and widgets, with 30 voice, receipt, or payment plan captures every 30 days, 30 auto-logged entries a month, 3 accounts, 2 installment apps, 3 people, 2 payoff plans, 2 category budgets, 2 account currencies, and 1 app icon.",
                    de: "Erfassen, Budgets, Ziele, Auswertungen, Abos, Schulden, Raten und Widgets, mit 30 Erfassungen per Sprache, Beleg oder Zahlungsplan alle 30 Tage, 30 automatisch erfassten Einträgen im Monat, 3 Konten, 2 Raten-Apps, 3 Personen, 2 Tilgungsplänen, 2 Kategorie-Budgets, 2 Kontowährungen und 1 App-Icon.",
                    es: "Registros, presupuestos, metas, estadísticas, suscripciones, deudas, cuotas y widgets, con 30 capturas de voz, de recibos o de planes de pago cada 30 días, 30 registros automáticos al mes, 3 cuentas, 2 apps de cuotas, 3 personas, 2 planes de pago, 2 presupuestos por categoría, 2 monedas para tus cuentas y 1 ícono de la app.",
                    pt: "Lançamentos, orçamentos, metas, estatísticas, assinaturas, dívidas, parcelamentos e widgets, com 30 capturas por voz, de recibos ou de planos de pagamento a cada 30 dias, 30 lançamentos automáticos por mês, 3 contas, 2 apps de parcelamento, 3 pessoas, 2 planos de pagamento, 2 orçamentos por categoria, 2 moedas para suas contas e 1 ícone do app.",
                    fr: "Saisie, budgets, objectifs, statistiques, abonnements, dettes, paiements en plusieurs fois et widgets, avec 30 captures vocales, de tickets ou d'échéanciers tous les 30 jours, 30 opérations automatiques par mois, 3 comptes, 2 apps de paiement en plusieurs fois, 3 personnes, 2 plans de remboursement, 2 budgets par catégorie, 2 devises de compte et 1 icône d'app.",
                }),
            },
            {
                label: "Outlayr Pro",
                text: t({
                    en: "500 captures every 30 days, unlimited auto-logged entries, accounts, installment apps, people, payoff plans, category budgets, and account currencies, sync across devices, receipt photo backup, AI matching on CSV import, a Notion connection, web merchant lookup, and 5 app icons.",
                    de: "500 Erfassungen alle 30 Tage, unbegrenzt automatisch erfasste Einträge, Konten, Raten-Apps, Personen, Tilgungspläne, Kategorie-Budgets und Kontowährungen, Synchronisierung zwischen Geräten, Sicherung deiner Belegfotos, KI-Zuordnung beim CSV-Import, eine Notion-Verbindung, Händlersuche im Web und 5 App-Icons.",
                    es: "500 capturas cada 30 días, registros automáticos, cuentas, apps de cuotas, personas, planes de pago, presupuestos por categoría y monedas sin límite, sincronización entre dispositivos, respaldo de las fotos de tus recibos, asignación con IA al importar un CSV, conexión con Notion, búsqueda web de comercios y 5 íconos de la app.",
                    pt: "500 capturas a cada 30 dias, lançamentos automáticos, contas, apps de parcelamento, pessoas, planos de pagamento, orçamentos por categoria e moedas de conta sem limite, sincronização entre dispositivos, backup das fotos dos seus recibos, correspondência com IA ao importar um CSV, conexão com o Notion, busca na web de estabelecimentos e 5 ícones do app.",
                    fr: "500 captures tous les 30 jours, opérations automatiques, comptes, apps de paiement en plusieurs fois, personnes, plans de remboursement, budgets par catégorie et devises de compte sans limite, synchronisation entre appareils, sauvegarde des photos de vos tickets, association par IA à l'import d'un CSV, connexion Notion, recherche web de commerçants et 5 icônes d'app.",
                }),
            },
            {
                label: t({
                    en: "Does not",
                    de: "Das macht sie nicht",
                    es: "No hace",
                    pt: "O que não faz",
                    fr: "Ce qu'elle ne fait pas",
                }),
                text: t({
                    en: "Outlayr does not cancel subscriptions or negotiate bills for you.",
                    de: "Outlayr kündigt keine Abos und verhandelt keine Rechnungen für dich.",
                    es: "Outlayr no cancela suscripciones ni negocia tus facturas por ti.",
                    pt: "O Outlayr não cancela assinaturas nem negocia suas contas por você.",
                    fr: "Outlayr ne résilie pas d'abonnements et ne négocie pas vos factures à votre place.",
                }),
            },
            {
                label: t({
                    en: "Source code",
                    de: "Quellcode",
                    es: "Código fuente",
                    pt: "Código-fonte",
                    fr: "Code source",
                }),
                text: t({
                    en: "Open source on GitHub at github.com/danestves/outlayr. The app is licensed under GPL-3.0 and the server under AGPL-3.0.",
                    de: "Open Source auf GitHub unter github.com/danestves/outlayr. Die App steht unter der GPL-3.0 und der Server unter der AGPL-3.0.",
                    es: "Código abierto en GitHub, en github.com/danestves/outlayr. La app usa la licencia GPL-3.0 y el servidor, AGPL-3.0.",
                    pt: "Código aberto no GitHub, em github.com/danestves/outlayr. O app usa a licença GPL-3.0 e o servidor, a AGPL-3.0.",
                    fr: "Open source sur GitHub, à github.com/danestves/outlayr. L'app est sous licence GPL-3.0 et le serveur sous AGPL-3.0.",
                }),
            },
        ],
        factsTitle: t({
            en: "Outlayr at a glance",
            de: "Outlayr auf einen Blick",
            es: "Outlayr de un vistazo",
            pt: "Outlayr em resumo",
            fr: "Outlayr en bref",
        }),
        maker: {
            bio: t({
                en: "A software developer from Venezuela, building software since 2016. He makes Outlayr in the open, under his company.",
                de: "Softwareentwickler aus Venezuela, der seit 2016 Software baut. Er entwickelt Outlayr öffentlich, über seine Firma.",
                es: "Desarrollador de software venezolano, construyendo software desde 2016. Hace Outlayr en abierto, bajo su empresa.",
                pt: "Desenvolvedor de software venezuelano, criando software desde 2016. Ele faz o Outlayr de forma aberta, pela própria empresa.",
                fr: "Développeur vénézuélien qui crée des logiciels depuis 2016. Il développe Outlayr en open source, au sein de sa société.",
            }),
            company: t({
                en: "danestves LLC, a Delaware limited liability company. 651 N Broad St, Suite 201, Middletown, DE 19709, USA. Outlayr, the app by danestves LLC, is not affiliated with Outlayr, Inc. (outlayr.com), a payments company.",
                de: "danestves LLC, eine Limited Liability Company aus Delaware. 651 N Broad St, Suite 201, Middletown, DE 19709, USA. Outlayr, die App von danestves LLC, steht in keiner Verbindung zu Outlayr, Inc. (outlayr.com), einem Zahlungsunternehmen.",
                es: "danestves LLC, una sociedad de responsabilidad limitada de Delaware. 651 N Broad St, Suite 201, Middletown, DE 19709, EE. UU. Outlayr, la app de danestves LLC, no tiene relación con Outlayr, Inc. (outlayr.com), una empresa de pagos.",
                pt: "danestves LLC, uma sociedade de responsabilidade limitada de Delaware. 651 N Broad St, Suite 201, Middletown, DE 19709, EUA. O Outlayr, o app da danestves LLC, não tem relação com a Outlayr, Inc. (outlayr.com), uma empresa de pagamentos.",
                fr: "danestves LLC, une société à responsabilité limitée du Delaware. 651 N Broad St, Suite 201, Middletown, DE 19709, États-Unis. Outlayr, l'app de danestves LLC, n'a aucun lien avec Outlayr, Inc. (outlayr.com), une entreprise de paiements.",
            }),
            label: t({ en: "Maker", de: "Wer dahintersteckt", es: "Quién la hace", pt: "Quem faz", fr: "Qui la crée" }),
            name: "Daniel Esteves",
            role: t({
                en: "Founder and developer",
                de: "Gründer und Entwickler",
                es: "Fundador y desarrollador",
                pt: "Fundador e desenvolvedor",
                fr: "Fondateur et développeur",
            }),
            website: "danestves.com",
        },
        meta: {
            description: t({
                en: "Outlayr is an open source expense tracker and budget app by danestves LLC: platforms, plans, free limits, and where data lives.",
                de: "Outlayr ist eine Open-Source-App für Ausgaben und Budget von danestves LLC: Plattformen, Pläne, Limits und deine Daten.",
                es: "Outlayr es una app de código abierto para controlar gastos y presupuesto, de danestves LLC: plataformas, planes y tus datos.",
                pt: "O Outlayr é um app de código aberto de gastos e orçamento da danestves LLC: plataformas, planos, limites e seus dados.",
                fr: "Outlayr est une app open source de dépenses et de budget de danestves LLC : plateformes, formules, limites et vos données.",
            }),
            title: t({
                en: "About Outlayr: the expense tracker by danestves LLC",
                de: "Über Outlayr: der Ausgaben-Tracker von danestves LLC",
                es: "Acerca de Outlayr: la app de gastos de danestves LLC",
                pt: "Sobre o Outlayr: o app de gastos da danestves LLC",
                fr: "À propos d'Outlayr : l'app de dépenses de danestves LLC",
            }),
        },
        story: {
            body: [
                t({
                    en: "Money rarely sits in one place. There is the card you use every day, the cash in your pocket, the subscriptions that renew on their own, the paycheck, the trip priced in another currency. Each one is a layer, and together they get messy fast.",
                    de: "Geld liegt selten an einem Ort. Da ist die Karte, die du jeden Tag benutzt, das Bargeld in deiner Tasche, die Abos, die sich von selbst verlängern, das Gehalt, die Reise mit Preisen in einer anderen Währung. Jedes davon ist eine Schicht, und zusammen werden sie schnell unübersichtlich.",
                    es: "El dinero casi nunca está en un solo lugar. Está la tarjeta que usas a diario, el efectivo de tu bolsillo, las suscripciones que se renuevan solas, el sueldo, el viaje con precios en otra moneda. Cada una es una capa, y juntas se desordenan rápido.",
                    pt: "O dinheiro quase nunca está em um só lugar. Tem o cartão que você usa todo dia, o dinheiro vivo no bolso, as assinaturas que renovam sozinhas, o salário, a viagem com preços em outra moeda. Cada um é uma camada, e juntos ficam bagunçados rápido.",
                    fr: "L'argent est rarement au même endroit. Il y a la carte que vous utilisez tous les jours, les espèces dans votre poche, les abonnements qui se renouvellent tout seuls, le salaire, le voyage aux prix dans une autre devise. Chacun est une couche, et ensemble ils s'embrouillent vite.",
                }),
                t({
                    en: "Most trackers ask you to sort those layers by hand, one form field at a time, and by the third coffee the form wins. Outlayr starts from the sentence you would say anyway. Type a purchase, say it, or scan the receipt, and it lands in the right account, budget, and month.",
                    de: "Die meisten Tracker wollen, dass du diese Schichten von Hand sortierst, ein Formularfeld nach dem anderen, und beim dritten Kaffee gewinnt das Formular. Outlayr geht von dem Satz aus, den du ohnehin sagen würdest. Tipp einen Einkauf, sprich ihn ein oder scanne den Beleg, und er landet im richtigen Konto, im richtigen Budget und im richtigen Monat.",
                    es: "La mayoría de las apps te piden ordenar esas capas a mano, un campo a la vez, y para el tercer café gana el formulario. Outlayr parte de la frase que dirías de todos modos. Escribe una compra, díctala o escanea el recibo, y queda en la cuenta, el presupuesto y el mes correctos.",
                    pt: "A maioria dos apps pede que você organize essas camadas na mão, um campo por vez, e no terceiro café o formulário ganha. O Outlayr parte da frase que você diria de qualquer jeito. Digite uma compra, dite ou escaneie o recibo, e ela cai na conta, no orçamento e no mês certos.",
                    fr: "La plupart des apps vous demandent de trier ces couches à la main, un champ à la fois, et au troisième café, c'est le formulaire qui gagne. Outlayr part de la phrase que vous diriez de toute façon. Saisissez un achat, dictez-le ou scannez le ticket, et il atterrit dans le bon compte, le bon budget et le bon mois.",
                }),
                t({
                    en: "From there, budgets, subscriptions, accounts, and 165 currencies keep up on their own, so every layer stays in view. Your ledger lives on your phone, an account is optional, and there are no ads on any plan.",
                    de: "Von dort an halten Budgets, Abos, Konten und 165 Währungen von selbst Schritt, sodass jede Schicht im Blick bleibt. Dein Haushaltsbuch liegt auf deinem Handy, ein Konto ist optional, und in keinem Plan gibt es Werbung.",
                    es: "Desde ahí, los presupuestos, las suscripciones, las cuentas y 165 monedas se actualizan solos, así que cada capa queda a la vista. Tu registro vive en tu celular, la cuenta es opcional y no hay anuncios en ningún plan.",
                    pt: "A partir daí, orçamentos, assinaturas, contas e 165 moedas se atualizam sozinhos, e cada camada fica à vista. Seus lançamentos ficam no seu celular, a conta é opcional e não há anúncios em nenhum plano.",
                    fr: "À partir de là, les budgets, les abonnements, les comptes et 165 devises se mettent à jour tout seuls, et chaque couche reste visible. Votre journal vit sur votre téléphone, un compte est facultatif et aucune formule n'affiche de publicité.",
                }),
            ],
            title: t({
                en: "Why we built it",
                de: "Warum wir sie gebaut haben",
                es: "Por qué la creamos",
                pt: "Por que a criamos",
                fr: "Pourquoi nous l'avons créée",
            }),
        },
        thesis: t({
            en: "Subscriptions, expenses, income, every account. Outlayr takes the messy layers of your money and gives you back control.",
            de: "Abos, Ausgaben, Einnahmen, jedes Konto. Outlayr nimmt die unübersichtlichen Schichten deines Geldes und gibt dir die Kontrolle zurück.",
            es: "Suscripciones, gastos, ingresos, cada cuenta. Outlayr toma las capas desordenadas de tu dinero y te devuelve el control.",
            pt: "Assinaturas, gastos, receitas, cada conta. O Outlayr pega as camadas bagunçadas do seu dinheiro e devolve o controle a você.",
            fr: "Abonnements, dépenses, revenus, chaque compte. Outlayr prend les couches désordonnées de votre argent et vous en rend le contrôle.",
        }),
        title: t({
            en: "Your money comes in layers",
            de: "Dein Geld kommt in Schichten",
            es: "Tu dinero viene en capas",
            pt: "Seu dinheiro vem em camadas",
            fr: "Votre argent vient en couches",
        }),
    },
    key: "about",
} satisfies Dictionary;

export default about;
