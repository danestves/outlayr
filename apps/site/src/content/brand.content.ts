import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

import { PRODUCT_DEFINITION } from "./shared";

const brand = {
    content: {
        claims: {
            columns: {
                claim: t({ en: "Claim", de: "Aussage", es: "Afirmación", pt: "Afirmação", fr: "Affirmation" }),
                verdict: t({
                    en: "OK to say?",
                    de: "Darfst du das sagen?",
                    es: "¿Se puede decir?",
                    pt: "Pode dizer?",
                    fr: "Peut-on le dire ?",
                }),
            },
            price: {
                claim: insert(
                    t({
                        en: "Free to start, with no ads. Pro is {{monthly}} a month, {{yearly}} a year, or {{once}} once",
                        de: "Der Einstieg ist kostenlos und ohne Werbung. Pro kostet {{monthly}} im Monat, {{yearly}} im Jahr oder {{once}} einmalig",
                        es: "Es gratis para empezar y no tiene anuncios. Pro cuesta {{monthly}} al mes, {{yearly}} al año o {{once}} una sola vez",
                        pt: "É grátis para começar e não tem anúncios. O Pro custa {{monthly}} por mês, {{yearly}} por ano ou {{once}} uma única vez",
                        fr: "Gratuit pour commencer, sans publicité. Pro coûte {{monthly}} par mois, {{yearly}} par an ou {{once}} en une seule fois",
                    })
                ),
                verdict: t({
                    en: "Yes, US prices. Add that prices vary by country",
                    de: "Ja, das sind US-Preise. Weise darauf hin, dass die Preise je nach Land variieren",
                    es: "Sí, son precios de EE. UU. Aclara que varían según el país",
                    pt: "Sim, são preços dos EUA. Avise que os preços variam por país",
                    fr: "Oui, ce sont des prix américains. Précisez que les prix varient selon les pays",
                }),
            },
            rows: [
                {
                    claim: t({
                        en: "Log a purchase by typing one sentence, saying it, or scanning the receipt",
                        de: "Einen Einkauf erfasst du, indem du einen Satz tippst, ihn sprichst oder den Beleg scannst",
                        es: "Registras una compra escribiendo una oración, diciéndola o escaneando el recibo",
                        pt: "Você registra uma compra digitando uma frase, falando ou escaneando o recibo",
                        fr: "Vous enregistrez un achat en saisissant une phrase, en la dictant ou en scannant le ticket",
                    }),
                    ok: true,
                    verdict: t({ en: "Yes", de: "Ja", es: "Sí", pt: "Sim", fr: "Oui" }),
                },
                {
                    claim: t({
                        en: "Your entries stay on your phone unless you turn on sync",
                        de: "Deine Einträge bleiben auf deinem Handy, außer du schaltest die Synchronisierung ein",
                        es: "Tus registros se quedan en tu celular a menos que actives la sincronización",
                        pt: "Seus lançamentos ficam no seu celular, a menos que você ative a sincronização",
                        fr: "Vos opérations restent sur votre téléphone, sauf si vous activez la synchronisation",
                    }),
                    ok: true,
                    verdict: t({ en: "Yes", de: "Ja", es: "Sí", pt: "Sim", fr: "Oui" }),
                },
                {
                    claim: t({
                        en: "Apple Pay purchases log themselves",
                        de: "Käufe mit Apple Pay werden von selbst erfasst",
                        es: "Las compras con Apple Pay se registran solas",
                        pt: "As compras com Apple Pay se registram sozinhas",
                        fr: "Les achats avec Apple Pay s'enregistrent tout seuls",
                    }),
                    ok: true,
                    verdict: t({
                        en: "Yes, on iPhone with a Shortcuts automation",
                        de: "Ja, auf dem iPhone mit einer Kurzbefehle-Automation",
                        es: "Sí, en iPhone con una automatización de Atajos",
                        pt: "Sim, no iPhone com uma automação do app Atalhos",
                        fr: "Oui, sur iPhone avec une automatisation Raccourcis",
                    }),
                },
                {
                    claim: t({
                        en: "Connects to your bank account",
                        de: "Verbindet sich mit deinem Bankkonto",
                        es: "Se conecta a tu cuenta bancaria",
                        pt: "Se conecta à sua conta bancária",
                        fr: "Se connecte à votre compte bancaire",
                    }),
                    ok: false,
                    verdict: t({
                        en: "No. Outlayr never links bank accounts",
                        de: "Nein. Outlayr verbindet sich nie mit Bankkonten",
                        es: "No. Outlayr nunca conecta cuentas bancarias",
                        pt: "Não. O Outlayr nunca conecta contas bancárias",
                        fr: "Non. Outlayr ne se connecte jamais à des comptes bancaires",
                    }),
                },
                {
                    claim: t({
                        en: "Gives financial advice",
                        de: "Gibt Finanzberatung",
                        es: "Da asesoría financiera",
                        pt: "Dá consultoria financeira",
                        fr: "Donne des conseils financiers",
                    }),
                    ok: false,
                    verdict: t({ en: "No", de: "Nein", es: "No", pt: "Não", fr: "Non" }),
                },
            ],
            title: t({
                en: "Claims check",
                de: "Was du sagen darfst",
                es: "Qué se puede decir",
                pt: "O que pode dizer",
                fr: "Ce que vous pouvez dire",
            }),
        },
        colors: {
            lead: t({
                en: "Ink and white carry almost everything. Vermilion is the one accent. Green and red only mean money in and out.",
                de: "Tinte und Weiß tragen fast alles. Zinnober ist die einzige Akzentfarbe. Grün und Rot stehen nur für Geld, das reinkommt und rausgeht.",
                es: "La tinta y el blanco cargan casi todo. El bermellón es el único acento. El verde y el rojo solo significan dinero que entra y sale.",
                pt: "Tinta e branco carregam quase tudo. O vermelhão é o único destaque. Verde e vermelho só significam dinheiro que entra e que sai.",
                fr: "L'encre et le blanc portent presque tout. Le vermillon est le seul accent. Le vert et le rouge ne signifient que l'argent qui entre et qui sort.",
            }),
            names: {
                income: t({ en: "Income", de: "Einnahmen", es: "Ingreso", pt: "Receita", fr: "Revenu" }),
                ink: t({ en: "Ink", de: "Tinte", es: "Tinta", pt: "Tinta", fr: "Encre" }),
                night: t({ en: "Night", de: "Nacht", es: "Noche", pt: "Noite", fr: "Nuit" }),
                spend: t({ en: "Spend", de: "Ausgaben", es: "Gasto", pt: "Gasto", fr: "Dépense" }),
                vermilion: t({ en: "Vermilion", de: "Zinnober", es: "Bermellón", pt: "Vermelhão", fr: "Vermillon" }),
                white: t({ en: "White", de: "Weiß", es: "Blanco", pt: "Branco", fr: "Blanc" }),
            },
            title: t({
                en: "Colors and type",
                de: "Farben und Schrift",
                es: "Colores y tipografía",
                pt: "Cores e tipografia",
                fr: "Couleurs et typographie",
            }),
            type: t({
                en: "Geist for words, Geist Mono for every amount. Both are free on Google Fonts.",
                de: "Geist für Wörter, Geist Mono für jeden Betrag. Beide sind kostenlos bei Google Fonts.",
                es: "Geist para las palabras y Geist Mono para cada monto. Las dos son gratis en Google Fonts.",
                pt: "Geist para as palavras e Geist Mono para cada valor. As duas são gratuitas no Google Fonts.",
                fr: "Geist pour les mots, Geist Mono pour chaque montant. Les deux sont gratuites sur Google Fonts.",
            }),
        },
        contact: {
            action: t({
                en: "Email us",
                de: "Schreib uns",
                es: "Escríbenos",
                pt: "Escreva para nós",
                fr: "Écrivez-nous",
            }),
            label: t({
                en: "Need something else?",
                de: "Brauchst du noch etwas?",
                es: "¿Necesitas algo más?",
                pt: "Precisa de mais alguma coisa?",
                fr: "Besoin d'autre chose ?",
            }),
        },
        download: t({
            en: "Download everything",
            de: "Alles herunterladen",
            es: "Descargar todo",
            pt: "Baixar tudo",
            fr: "Tout télécharger",
        }),
        facts: {
            copied: t({ en: "Copied", de: "Kopiert", es: "Copiado", pt: "Copiado", fr: "Copié" }),
            copy: t({
                en: "Copy as text",
                de: "Als Text kopieren",
                es: "Copiar como texto",
                pt: "Copiar como texto",
                fr: "Copier en texte",
            }),
            definition: PRODUCT_DEFINITION,
            labels: {
                contact: t({ en: "Contact", de: "Kontakt", es: "Contacto", pt: "Contato", fr: "Contact" }),
                languages: t({ en: "Languages", de: "Sprachen", es: "Idiomas", pt: "Idiomas", fr: "Langues" }),
                launch: t({
                    en: "On the App Store",
                    de: "Im App Store",
                    es: "En el App Store",
                    pt: "Na App Store",
                    fr: "Sur l'App Store",
                }),
                license: t({
                    en: "Open source",
                    de: "Open Source",
                    es: "Código abierto",
                    pt: "Código aberto",
                    fr: "Open source",
                }),
                links: t({ en: "Links", de: "Links", es: "Enlaces", pt: "Links", fr: "Liens" }),
                maker: t({ en: "Maker", de: "Entwickler", es: "Creador", pt: "Criador", fr: "Créateur" }),
                platforms: t({
                    en: "Platforms",
                    de: "Plattformen",
                    es: "Plataformas",
                    pt: "Plataformas",
                    fr: "Plateformes",
                }),
                price: t({
                    en: "Price, US",
                    de: "Preis, USA",
                    es: "Precio, EE. UU.",
                    pt: "Preço, EUA",
                    fr: "Prix, États-Unis",
                }),
            },
            languages: t({
                en: "English, Spanish, Portuguese, French, German",
                de: "Englisch, Spanisch, Portugiesisch, Französisch, Deutsch",
                es: "Inglés, español, portugués, francés, alemán",
                pt: "Inglês, espanhol, português, francês, alemão",
                fr: "Anglais, espagnol, portugais, français, allemand",
            }),
            launch: insert(
                t({
                    en: "Since {{date}}",
                    de: "Seit {{date}}",
                    es: "Desde el {{date}}",
                    pt: "Desde {{date}}",
                    fr: "Depuis le {{date}}",
                })
            ),
            license: t({
                en: "GPL-3.0 for the app, AGPL-3.0 for the server",
                de: "GPL-3.0 für die App, AGPL-3.0 für den Server",
                es: "GPL-3.0 para la app, AGPL-3.0 para el servidor",
                pt: "GPL-3.0 para o app, AGPL-3.0 para o servidor",
                fr: "GPL-3.0 pour l'app, AGPL-3.0 pour le serveur",
            }),
            platforms: t({
                en: "iPhone (iOS 18 or later), Android, web",
                de: "iPhone (iOS 18 oder neuer), Android, Web",
                es: "iPhone (iOS 18 o posterior), Android, web",
                pt: "iPhone (iOS 18 ou posterior), Android, web",
                fr: "iPhone (iOS 18 ou version ultérieure), Android, web",
            }),
            price: insert(
                t({
                    en: "Free plan, no ads on any plan. Outlayr Pro is {{monthly}} a month, {{yearly}} a year with 7 days free, or {{once}} once. Prices vary by country.",
                    de: "Gratis-Plan, in keinem Plan Werbung. Outlayr Pro kostet {{monthly}} im Monat, {{yearly}} im Jahr mit 7 Tagen gratis oder {{once}} einmalig. Die Preise variieren je nach Land.",
                    es: "Plan gratis, sin anuncios en ningún plan. Outlayr Pro cuesta {{monthly}} al mes, {{yearly}} al año con 7 días gratis o {{once}} una sola vez. Los precios varían según el país.",
                    pt: "Plano grátis, sem anúncios em nenhum plano. O Outlayr Pro custa {{monthly}} por mês, {{yearly}} por ano com 7 dias grátis ou {{once}} uma única vez. Os preços variam por país.",
                    fr: "Offre gratuite, sans publicité sur aucune offre. Outlayr Pro coûte {{monthly}} par mois, {{yearly}} par an avec 7 jours offerts, ou {{once}} en une seule fois. Les prix varient selon les pays.",
                })
            ),
            title: t({
                en: "Fact sheet",
                de: "Steckbrief",
                es: "Ficha técnica",
                pt: "Ficha técnica",
                fr: "Fiche d'identité",
            }),
        },
        files: {
            appIcon: t({
                en: "App icon",
                de: "App-Symbol",
                es: "Ícono de la app",
                pt: "Ícone do app",
                fr: "Icône de l'app",
            }),
            broll: t({ en: "B-roll", de: "B-Roll", es: "B-roll", pt: "B-roll", fr: "B-roll" }),
            brollLead: t({
                en: "Short animated clips of the app, silent, ready to cut into your edit. Square 1080 × 1080 at 60 fps, plus one vertical 1080 × 1920 cut for Shorts and Reels.",
                de: "Kurze animierte Clips der App, ohne Ton, bereit für deinen Schnitt. Quadratisch mit 1080 × 1080 bei 60 fps, dazu ein vertikaler Schnitt mit 1080 × 1920 für Shorts und Reels.",
                es: "Clips animados cortos de la app, sin audio, listos para tu edición. Cuadrados de 1080 × 1080 a 60 fps, y un corte vertical de 1080 × 1920 para Shorts y Reels.",
                pt: "Clipes curtos e animados do app, sem áudio, prontos para entrar na sua edição. Quadrados de 1080 × 1080 a 60 fps, mais um corte vertical de 1080 × 1920 para Shorts e Reels.",
                fr: "Courts clips animés de l'app, sans son, prêts à être montés dans votre vidéo. Format carré 1080 × 1080 à 60 i/s, plus une version verticale 1080 × 1920 pour Shorts et Reels.",
            }),
            clips: {
                capture: t({
                    en: "Logging an entry",
                    de: "Einen Eintrag erfassen",
                    es: "Registrar un gasto",
                    pt: "Registrar um lançamento",
                    fr: "Saisir une opération",
                }),
                chaos: t({
                    en: "Money in layers",
                    de: "Geld in Schichten",
                    es: "El dinero en capas",
                    pt: "O dinheiro em camadas",
                    fr: "L'argent en couches",
                }),
                month: t({
                    en: "A month at a glance",
                    de: "Ein Monat auf einen Blick",
                    es: "El mes de un vistazo",
                    pt: "O mês em um relance",
                    fr: "Un mois en un coup d'œil",
                }),
                promo: t({
                    en: "Vertical cut",
                    de: "Vertikaler Schnitt",
                    es: "Corte vertical",
                    pt: "Corte vertical",
                    fr: "Version verticale",
                }),
                sorted: t({
                    en: "Sorted into categories",
                    de: "In Kategorien sortiert",
                    es: "Ordenado en categorías",
                    pt: "Organizado em categorias",
                    fr: "Classé par catégories",
                }),
            },
            dark: t({ en: "Dark", de: "Dunkel", es: "Oscuro", pt: "Escuro", fr: "Sombre" }),
            light: t({ en: "Light", de: "Hell", es: "Claro", pt: "Claro", fr: "Clair" }),
            logo: t({ en: "Logo", de: "Logo", es: "Logo", pt: "Logo", fr: "Logo" }),
            logoLead: t({
                en: "Keep the mark flat and whole, in ink, white, or vermilion. Write the name Outlayr, capital O, one word.",
                de: "Verwende das Zeichen flach und vollständig, in Tinte, Weiß oder Zinnober. Schreib den Namen Outlayr mit großem O und in einem Wort.",
                es: "Usa el símbolo plano y completo, en tinta, blanco o bermellón. Escribe el nombre Outlayr, con O mayúscula y en una sola palabra.",
                pt: "Use o símbolo chapado e inteiro, em tinta, branco ou vermelhão. Escreva o nome Outlayr, com O maiúsculo e em uma palavra só.",
                fr: "Gardez le symbole à plat et entier, en encre, en blanc ou en vermillon. Écrivez le nom Outlayr, avec un O majuscule, en un seul mot.",
            }),
            screens: t({
                en: "Screenshots",
                de: "Screenshots",
                es: "Capturas",
                pt: "Capturas de tela",
                fr: "Captures d'écran",
            }),
            screensLead: t({
                en: "Real screens from the app. Don't recolor or edit the interface.",
                de: "Echte Bildschirme aus der App. Färbe die Oberfläche nicht um und bearbeite sie nicht.",
                es: "Pantallas reales de la app. No cambies los colores ni edites la interfaz.",
                pt: "Telas reais do app. Não altere as cores nem edite a interface.",
                fr: "Écrans réels de l'app. Ne modifiez ni les couleurs ni l'interface.",
            }),
            shots: {
                accounts: t({ en: "Accounts", de: "Konten", es: "Cuentas", pt: "Contas", fr: "Comptes" }),
                budgets: t({ en: "Budgets", de: "Budgets", es: "Presupuestos", pt: "Orçamentos", fr: "Budgets" }),
                insights: t({
                    en: "Insights",
                    de: "Auswertungen",
                    es: "Análisis",
                    pt: "Estatísticas",
                    fr: "Statistiques",
                }),
                log: t({
                    en: "Log an expense",
                    de: "Ausgabe erfassen",
                    es: "Registrar un gasto",
                    pt: "Registrar uma despesa",
                    fr: "Saisir une dépense",
                }),
                subscriptions: t({
                    en: "Subscriptions",
                    de: "Abos",
                    es: "Suscripciones",
                    pt: "Assinaturas",
                    fr: "Abonnements",
                }),
            },
            title: t({ en: "Files", de: "Dateien", es: "Archivos", pt: "Arquivos", fr: "Fichiers" }),
        },
        lead: t({
            en: "What to say, what not to say, and every file you need for the edit.",
            de: "Was du sagen darfst, was nicht, und alle Dateien, die du für deinen Schnitt brauchst.",
            es: "Qué decir, qué no decir y todos los archivos que necesitas para tu edición.",
            pt: "O que dizer, o que não dizer e todos os arquivos de que você precisa para a edição.",
            fr: "Ce qu'il faut dire, ce qu'il ne faut pas dire, et tous les fichiers dont vous avez besoin pour votre montage.",
        }),
        meta: {
            description: t({
                en: "Outlayr's brand kit for creators and press: a 30 second pitch, the claims you can make, logos, colors, screenshots, and B-roll.",
                de: "Das Markenkit von Outlayr für Creator und Presse: ein Pitch in 30 Sekunden, die Aussagen, die du machen darfst, Logos, Farben, Screenshots und B-Roll.",
                es: "El kit de marca de Outlayr para creadores y prensa: un pitch de 30 segundos, lo que puedes afirmar, logos, colores, capturas y B-roll.",
                pt: "O kit de marca do Outlayr para criadores e imprensa: um pitch de 30 segundos, o que você pode afirmar, logos, cores, capturas de tela e B-roll.",
                fr: "Le kit de marque d'Outlayr pour les créateurs et la presse : un pitch de 30 secondes, ce que vous pouvez affirmer, logos, couleurs, captures d'écran et B-roll.",
            }),
            title: t({
                en: "Outlayr brand kit",
                de: "Outlayr Markenkit",
                es: "Kit de marca de Outlayr",
                pt: "Kit de marca do Outlayr",
                fr: "Kit de marque Outlayr",
            }),
        },
        pitch: {
            beats: [
                {
                    label: t({ en: "Hook", de: "Aufhänger", es: "Gancho", pt: "Gancho", fr: "Accroche" }),
                    say: t({
                        en: "I log a purchase in one sentence.",
                        de: "Ich erfasse einen Einkauf in einem Satz.",
                        es: "Registro una compra en una sola oración.",
                        pt: "Eu registro uma compra em uma frase.",
                        fr: "J'enregistre un achat en une phrase.",
                    }),
                    show: t({
                        en: "Type “coffee 4.50”, say it, or snap the receipt, and show the entry filling in.",
                        de: "Tippe „Kaffee 3,50“, sprich es oder fotografiere den Beleg, und zeig, wie sich der Eintrag füllt.",
                        es: "Escribe “café 4.50”, dilo o toma foto del recibo, y muestra cómo se llena el registro.",
                        pt: "Digite “café 8,50”, fale ou tire foto do recibo, e mostre o lançamento sendo preenchido.",
                        fr: "Saisissez « café 3,50 », dictez-le ou photographiez le ticket, et montrez l'opération qui se remplit.",
                    }),
                },
                {
                    label: t({ en: "Proof", de: "Beweis", es: "Prueba", pt: "Prova", fr: "Preuve" }),
                    say: t({
                        en: "Budgets, goals, and subscriptions update as I log.",
                        de: "Budgets, Ziele und Abos aktualisieren sich, während ich erfasse.",
                        es: "Los presupuestos, metas y suscripciones se actualizan mientras registro.",
                        pt: "Orçamentos, metas e assinaturas se atualizam enquanto eu registro.",
                        fr: "Les budgets, les objectifs et les abonnements se mettent à jour au fil de ma saisie.",
                    }),
                    show: t({
                        en: "Any of 165 currencies, with totals in yours at the rate from that day.",
                        de: "Jede der 165 Währungen, mit Summen in deiner Währung zum Kurs des Tages.",
                        es: "Cualquiera de 165 monedas, con los totales en la tuya a la tasa de ese día.",
                        pt: "Qualquer uma de 165 moedas, com os totais na sua pela cotação daquele dia.",
                        fr: "L'une des 165 devises, avec les totaux dans la vôtre au taux du jour.",
                    }),
                },
                {
                    label: t({ en: "Close", de: "Abschluss", es: "Cierre", pt: "Fechamento", fr: "Conclusion" }),
                    say: t({
                        en: "Free on iPhone and Android. No ads.",
                        de: "Kostenlos auf iPhone und Android. Ohne Werbung.",
                        es: "Gratis en iPhone y Android. Sin anuncios.",
                        pt: "Grátis no iPhone e no Android. Sem anúncios.",
                        fr: "Gratuit sur iPhone et Android. Sans publicité.",
                    }),
                    show: t({
                        en: "Pro adds sync and higher limits. Point to the link in your description.",
                        de: "Pro bringt Synchronisierung und höhere Limits. Verweis auf den Link in deiner Beschreibung.",
                        es: "Pro agrega sincronización y límites más altos. Señala el enlace en tu descripción.",
                        pt: "O Pro adiciona sincronização e limites maiores. Aponte para o link na sua descrição.",
                        fr: "Pro ajoute la synchronisation et des limites plus élevées. Renvoyez vers le lien de votre description.",
                    }),
                },
            ],
            title: t({
                en: "The 30 second pitch",
                de: "Der Pitch in 30 Sekunden",
                es: "El pitch de 30 segundos",
                pt: "O pitch de 30 segundos",
                fr: "Le pitch de 30 secondes",
            }),
        },
        title: t({
            en: "Making something about Outlayr?",
            de: "Machst du etwas über Outlayr?",
            es: "¿Vas a hacer algo sobre Outlayr?",
            pt: "Vai fazer algo sobre o Outlayr?",
            fr: "Vous préparez quelque chose sur Outlayr ?",
        }),
    },
    key: "brand",
} satisfies Dictionary;

export default brand;
