import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const story = {
    content: {
        closingLead: t({
            en: "Free to start. No ads on any plan.",
            es: "Gratis para empezar. Sin anuncios en ningún plan.",
            pt: "Grátis para começar. Sem anúncios em nenhum plano.",
            fr: "Gratuit pour commencer. Aucune publicité, quelle que soit l'offre.",
        }),
        faqLead: t({
            en: "Something missing?",
            es: "¿Falta algo?",
            pt: "Faltou alguma coisa?",
            fr: "Il manque quelque chose ?",
        }),
        faqSupport: t({
            en: "Write to support",
            es: "Escribe a soporte",
            pt: "Escreva para o suporte",
            fr: "Écrivez au support",
        }),
        features: {
            label: t({ en: "What you get", es: "Lo que obtienes", pt: "O que você ganha", fr: "Ce qui est inclus" }),
            title: t({
                en: "Everything the month needs, from one sentence",
                es: "Todo lo que el mes necesita, desde una oración",
                pt: "Tudo o que o mês precisa, a partir de uma frase",
                fr: "Tout ce dont le mois a besoin, en une phrase",
            }),
        },
        hero: {
            proof: [
                t({ en: "Free plan", es: "Plan gratis", pt: "Plano grátis", fr: "Offre gratuite" }),
                t({ en: "No ads", es: "Sin anuncios", pt: "Sem anúncios", fr: "Sans publicité" }),
                t({ en: "165 currencies", es: "165 monedas", pt: "165 moedas", fr: "165 devises" }),
                t({ en: "4 languages", es: "4 idiomas", pt: "4 idiomas", fr: "4 langues" }),
            ],
        },
        how: {
            label: t({ en: "How it works", es: "Cómo funciona", pt: "Como funciona", fr: "Comment ça marche" }),
            steps: [
                {
                    body: t({
                        en: "Type a sentence, hold to talk, or point the camera at a receipt. Bank CSV files come in too, with duplicates skipped.",
                        es: "Escribe una oración, mantén presionado para hablar o apunta la cámara a un recibo. También puedes importar el CSV de tu banco, sin duplicados.",
                        pt: "Digite uma frase, segure para falar ou aponte a câmera para um recibo. Extratos CSV do banco também entram, sem duplicados.",
                        fr: "Tapez une phrase, maintenez pour parler ou pointez l'appareil photo vers un ticket. Les relevés CSV de votre banque passent aussi, sans doublons.",
                    }),
                    film: t({
                        en: "A spoken sentence and a receipt each turn into the same entry.",
                        es: "Una oración dicha en voz alta y un recibo se convierten en el mismo registro.",
                        pt: "Uma frase falada e um recibo viram o mesmo lançamento.",
                        fr: "Une phrase dite à voix haute et un ticket deviennent la même opération.",
                    }),
                    title: t({ en: "Say it", es: "Dilo", pt: "Fale", fr: "Dites-le" }),
                },
                {
                    body: t({
                        en: "Each entry lands in its account, its category, and its budget. Rent and subscriptions log themselves on their day.",
                        es: "Cada registro llega a su cuenta, su categoría y su presupuesto. La renta y las suscripciones se registran solas en su día.",
                        pt: "Cada lançamento cai na conta, na categoria e no orçamento certos. Aluguel e assinaturas se lançam sozinhos no dia certo.",
                        fr: "Chaque opération arrive sur son compte, dans sa catégorie et dans son budget. Le loyer et les abonnements s'enregistrent tout seuls le jour venu.",
                    }),
                    film: t({
                        en: "One Costco purchase lands in the Chase account, the groceries budget, and the month ahead.",
                        es: "Una compra en Costco llega a la cuenta de Chase, al presupuesto del súper y al mes que viene.",
                        pt: "Uma compra no Costco cai na conta Chase, no orçamento de Mercado e no mês que vem.",
                        fr: "Un achat chez Costco arrive sur le compte Chase, dans le budget Courses et dans le mois à venir.",
                    }),
                    title: t({
                        en: "It sorts itself",
                        es: "Se ordena solo",
                        pt: "Tudo se organiza sozinho",
                        fr: "Tout se range tout seul",
                    }),
                },
                {
                    body: t({
                        en: "Budgets tell you in plain words where this pace ends, and Insights tells you whether you are spending faster or slower than usual.",
                        es: "Tus presupuestos te dicen en palabras simples a dónde te lleva este ritmo, y Estadísticas te dice si estás gastando más rápido o más lento de lo normal.",
                        pt: "Os Orçamentos dizem em palavras simples onde esse ritmo vai parar, e as Estatísticas mostram se você está gastando mais rápido ou mais devagar que o normal.",
                        fr: "Les Budgets vous disent clairement où ce rythme vous mène, et Statistiques vous indique si vous dépensez plus vite ou moins vite que d'habitude.",
                    }),
                    film: t({
                        en: "The week fills in day by day, with the categories that moved most.",
                        es: "La semana se llena día por día, con las categorías que más cambiaron.",
                        pt: "A semana se preenche dia a dia, com as categorias que mais mudaram.",
                        fr: "La semaine se remplit jour après jour, avec les catégories qui ont le plus bougé.",
                    }),
                    title: t({
                        en: "See where it is going",
                        es: "Mira a dónde va",
                        pt: "Veja para onde vai",
                        fr: "Voyez où ça mène",
                    }),
                },
            ],
            title: t({
                en: "Three steps. You only do the first",
                es: "Tres pasos. Tú solo haces el primero",
                pt: "Três passos. Você só faz o primeiro",
                fr: "Trois étapes. Vous ne faites que la première",
            }),
            tryIt: t({ en: "Try it here", es: "Pruébalo aquí", pt: "Experimente aqui", fr: "Essayez ici" }),
            ways: [
                t({ en: "Type", es: "Escribe", pt: "Digite", fr: "Texte" }),
                t({ en: "Voice", es: "Voz", pt: "Voz", fr: "Voix" }),
                t({ en: "Receipt", es: "Recibo", pt: "Recibo", fr: "Ticket" }),
                t({ en: "CSV", es: "CSV", pt: "CSV", fr: "CSV" }),
            ],
        },
        pause: t({ en: "Pause the film", es: "Pausar el video", pt: "Pausar o vídeo", fr: "Mettre la vidéo en pause" }),
        play: t({ en: "Play the film", es: "Reproducir el video", pt: "Reproduzir o vídeo", fr: "Lire la vidéo" }),
        pricing: {
            label: t({ en: "Pricing", es: "Precios", pt: "Preços", fr: "Tarifs" }),
            lead: t({
                en: "The tracker is free and has no ads. Pro lifts the limits and adds sync. Cancel anytime from your app store, or buy it once.",
                es: "La app es gratis y no tiene anuncios. Pro quita los límites y agrega la sincronización. Cancela cuando quieras desde tu tienda de apps, o cómpralo una sola vez.",
                pt: "O app é grátis e não tem anúncios. O Pro tira os limites e adiciona a sincronização. Cancele quando quiser na sua loja de apps, ou compre uma única vez.",
                fr: "L'app est gratuite et sans publicité. Pro lève les limites et ajoute la synchronisation. Résiliez quand vous voulez depuis votre boutique d'applications, ou achetez-le une seule fois.",
            }),
            localNote: insert(
                t({
                    en: "Prices for {{country}}. Your app store shows the final price.",
                    es: "Precios para {{country}}. Tu tienda de apps muestra el precio final.",
                    pt: "Preços para {{country}}. Sua loja de apps mostra o preço final.",
                    fr: "Prix pour {{country}}. Votre boutique d'applications affiche le prix final.",
                })
            ),
            month: t({ en: "a month", es: "al mes", pt: "por mês", fr: "par mois" }),
            note: t({
                en: "US prices. Your app store shows the price for your country.",
                es: "Precios de Estados Unidos. Tu tienda de apps muestra el precio de tu país.",
                pt: "Preços dos Estados Unidos. Sua loja de apps mostra o preço do seu país.",
                fr: "Prix aux États-Unis. Votre boutique d'applications affiche le prix de votre pays.",
            }),
            other: insert(
                t({
                    en: "Or {{yearly}} a year, or {{once}} once.",
                    es: "O {{yearly}} al año, o {{once}} una sola vez.",
                    pt: "Ou {{yearly}} por ano, ou {{once}} uma única vez.",
                    fr: "Ou {{yearly}} par an, ou {{once}} une seule fois.",
                })
            ),
            trial: t({
                en: "7 days free on yearly",
                es: "7 días gratis en el plan anual",
                pt: "7 dias grátis no plano anual",
                fr: "7 jours gratuits sur l'offre annuelle",
            }),
            title: t({
                en: "Free to start. Pro when you want more",
                es: "Gratis para empezar. Pro cuando quieras más",
                pt: "Grátis para começar. Pro quando quiser mais",
                fr: "Gratuit pour commencer. Pro quand il vous en faut plus",
            }),
        },
        problem: {
            body: t({
                en: "A card for groceries, cash for the taxi, subscriptions renewing in the background, a transfer to savings, a balance in another currency. By the time you open a spreadsheet, half of it is gone from memory.",
                es: "Una tarjeta para el súper, efectivo para el taxi, suscripciones que se renuevan solas, una transferencia a ahorros, un saldo en otra moneda. Cuando abres la hoja de cálculo, ya olvidaste la mitad.",
                pt: "Um cartão para o mercado, dinheiro para o táxi, assinaturas renovando sozinhas, uma transferência para a poupança, um saldo em outra moeda. Quando você abre a planilha, metade já sumiu da memória.",
                fr: "Une carte pour les courses, des espèces pour le taxi, des abonnements qui se renouvellent sans bruit, un virement vers l'épargne, un solde dans une autre devise. Le temps d'ouvrir un tableur, la moitié vous est déjà sortie de la tête.",
            }),
            fields: [
                t({ en: "Amount", es: "Monto", pt: "Valor", fr: "Montant" }),
                t({ en: "Merchant", es: "Comercio", pt: "Estabelecimento", fr: "Commerçant" }),
                t({ en: "Category", es: "Categoría", pt: "Categoria", fr: "Catégorie" }),
                t({ en: "Account", es: "Cuenta", pt: "Conta", fr: "Compte" }),
                t({ en: "Date", es: "Fecha", pt: "Data", fr: "Date" }),
                t({ en: "Note", es: "Nota", pt: "Nota", fr: "Note" }),
            ],
            film: t({
                en: "Receipts, card charges, renewals, cash, and a balance in bolívares scatter, then fall into one ordered list.",
                es: "Recibos, cargos a la tarjeta, renovaciones, efectivo y un saldo en bolívares se dispersan y luego caen en una sola lista ordenada.",
                pt: "Recibos, cobranças no cartão, renovações, dinheiro e um saldo em bolívares se espalham e depois caem numa única lista ordenada.",
                fr: "Tickets, paiements par carte, renouvellements, espèces et un solde en bolivars s'éparpillent, puis tombent dans une seule liste ordonnée.",
            }),
            formBody: t({
                en: "By the third coffee the form wins and the tracking stops. Outlayr reads a sentence instead, so logging takes about as long as sending a text.",
                es: "Para el tercer café, el formulario gana y dejas de registrar. Outlayr lee una oración, así que registrar toma lo mismo que mandar un mensaje.",
                pt: "No terceiro café, o formulário vence e você para de anotar. O Outlayr lê uma frase, então lançar leva o mesmo tempo que mandar uma mensagem.",
                fr: "Au troisième café, le formulaire gagne et vous arrêtez de noter. Outlayr lit une phrase à la place : enregistrer une dépense prend à peu près le temps d'envoyer un texto.",
            }),
            formTitle: t({
                en: "And most trackers want six fields for one coffee",
                es: "Y la mayoría de las apps te pide seis campos por un café",
                pt: "E a maioria dos apps pede seis campos para um café",
                fr: "Et la plupart des applis demandent six champs pour un café",
            }),
            inOutlayr: t({ en: "In Outlayr", es: "En Outlayr", pt: "No Outlayr", fr: "Dans Outlayr" }),
            label: t({ en: "The problem", es: "El problema", pt: "O problema", fr: "Le problème" }),
            sentence: [
                { tag: "", text: t({ en: "Spent", es: "Gasté", pt: "Gastei", fr: "J'ai dépensé" }) },
                { tag: "amount", text: t({ en: "$42.00", es: "$42.00", pt: "$42.00", fr: "$42.00" }) },
                { tag: "", text: t({ en: "at", es: "en", pt: "em", fr: "chez" }) },
                {
                    tag: "merchant",
                    text: t({ en: "Costco", es: "Mercado Libre", pt: "Mercado Livre", fr: "Carrefour" }),
                },
                { tag: "", text: t({ en: "for", es: "para", pt: "para", fr: "pour" }) },
                { tag: "category", text: t({ en: "Groceries", es: "Compras", pt: "Compras", fr: "Courses" }) },
                { tag: "", text: t({ en: "from", es: "con", pt: "com", fr: "avec" }) },
                { tag: "account", text: t({ en: "Chase", es: "BBVA", pt: "Nubank", fr: "Boursorama" }) },
                { tag: "date", text: t({ en: "today", es: "hoy", pt: "hoje", fr: "aujourd'hui" }) },
            ],
            title: t({
                en: "Your money lives in ten places",
                es: "Tu dinero vive en diez lugares",
                pt: "Seu dinheiro vive em dez lugares",
                fr: "Votre argent est à dix endroits à la fois",
            }),
            usual: t({
                en: "The usual way",
                es: "Lo de siempre",
                pt: "O jeito de sempre",
                fr: "La méthode habituelle",
            }),
        },
        screens: {
            label: t({
                en: "Screens from the app",
                es: "Pantallas de la app",
                pt: "Telas do app",
                fr: "Écrans de l'app",
            }),
        },
        tagline: t({
            en: "Say what you spent. Outlayr puts it in the right account, the right budget, and the right month, so you always know what is left.",
            es: "Di lo que gastaste. Outlayr lo pone en la cuenta correcta, el presupuesto correcto y el mes correcto, para que siempre sepas cuánto te queda.",
            pt: "Diga o que você gastou. O Outlayr coloca na conta certa, no orçamento certo e no mês certo, para você sempre saber quanto sobra.",
            fr: "Dites ce que vous avez dépensé. Outlayr le range sur le bon compte, dans le bon budget et le bon mois, pour que vous sachiez toujours ce qu'il vous reste.",
        }),
        trust: {
            items: [
                {
                    body: t({
                        en: "No ads on any plan. Your data is never sold.",
                        es: "Sin anuncios en ningún plan. Tus datos nunca se venden.",
                        pt: "Sem anúncios em nenhum plano. Seus dados nunca são vendidos.",
                        fr: "Aucune publicité, quelle que soit l'offre. Vos données ne sont jamais vendues.",
                    }),
                    title: t({
                        en: "No ads, no selling",
                        es: "Sin anuncios, sin ventas",
                        pt: "Sem anúncios, sem venda de dados",
                        fr: "Sans publicité, sans revente",
                    }),
                },
                {
                    body: t({
                        en: "Face ID or Touch ID to open. The app switcher never shows your ledger.",
                        es: "Face ID o Touch ID para abrir. El selector de apps nunca muestra tus registros.",
                        pt: "Face ID ou Touch ID para abrir. A tela de apps recentes nunca mostra seus lançamentos.",
                        fr: "Face ID ou Touch ID pour ouvrir. Le sélecteur d'apps n'affiche jamais vos opérations.",
                    }),
                    title: t({
                        en: "Locked when you want",
                        es: "Bloqueada cuando quieras",
                        pt: "Bloqueado quando você quiser",
                        fr: "Verrouillée quand vous voulez",
                    }),
                },
                {
                    body: t({
                        en: "Entries save on the phone first, so typing an entry works anywhere.",
                        es: "Los registros se guardan primero en el celular, así que escribir un registro funciona en cualquier lugar.",
                        pt: "Os lançamentos são salvos primeiro no celular, então anotar um gasto funciona em qualquer lugar.",
                        fr: "Les opérations sont d'abord enregistrées sur le téléphone : vous pouvez en saisir une n'importe où.",
                    }),
                    title: t({
                        en: "Works with no signal",
                        es: "Funciona sin señal",
                        pt: "Funciona sem sinal",
                        fr: "Fonctionne sans réseau",
                    }),
                },
                {
                    body: t({
                        en: "Export a CSV, or a full archive you can restore from.",
                        es: "Exporta un CSV o un respaldo completo que puedes restaurar.",
                        pt: "Exporte um CSV ou um backup completo que você pode restaurar.",
                        fr: "Exportez un CSV ou une archive complète que vous pouvez restaurer.",
                    }),
                    title: t({
                        en: "Yours to take",
                        es: "Tuyos para llevar",
                        pt: "Leve com você",
                        fr: "Vos données vous suivent",
                    }),
                },
            ],
            lead: t({
                en: "It reaches our servers only when you turn on sync or use a feature that needs them, like receipt scanning.",
                es: "Solo llega a nuestros servidores si activas la sincronización o usas una función que los necesita, como escanear recibos.",
                pt: "Eles só chegam aos nossos servidores se você ativar a sincronização ou usar um recurso que precise deles, como escanear recibos.",
                fr: "Elles n'arrivent sur nos serveurs que si vous activez la synchronisation ou utilisez une fonction qui en a besoin, comme le scan de tickets.",
            }),
            title: t({
                en: "Your ledger stays on your phone",
                es: "Tus registros se quedan en tu celular",
                pt: "Seus lançamentos ficam no seu celular",
                fr: "Vos opérations restent sur votre téléphone",
            }),
        },
    },
    key: "story",
} satisfies Dictionary;

export default story;
