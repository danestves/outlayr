import { t } from "intlayer";
import type { Dictionary } from "intlayer";

import { APPEARANCE_EXTRA, EXPORT_EXTRA, OFFLINE_EXTRA, SPLIT_EXTRA } from "./shared";

const horizon = {
    content: {
        also: {
            appearance: APPEARANCE_EXTRA,
            facts: [
                SPLIT_EXTRA,
                EXPORT_EXTRA,
                OFFLINE_EXTRA,
                {
                    label: t({ en: "Private", de: "Privat", es: "Privada", pt: "Privado", fr: "Privée" }),
                    text: t({
                        en: "No ads on any plan. Your data is never sold.",
                        de: "In keinem Plan gibt es Werbung. Deine Daten werden nie verkauft.",
                        es: "Sin anuncios en ningún plan. Tus datos nunca se venden.",
                        pt: "Sem anúncios em nenhum plano. Seus dados nunca são vendidos.",
                        fr: "Aucune publicité, quelle que soit l'offre. Vos données ne sont jamais vendues.",
                    }),
                },
                {
                    label: t({ en: "Languages", de: "Sprachen", es: "Idiomas", pt: "Idiomas", fr: "Langues" }),
                    text: t({
                        en: "English, Spanish, Portuguese, French, and German.",
                        de: "Englisch, Spanisch, Portugiesisch, Französisch und Deutsch.",
                        es: "Inglés, español, portugués, francés y alemán.",
                        pt: "Inglês, espanhol, português, francês e alemão.",
                        fr: "Anglais, espagnol, portugais, français et allemand.",
                    }),
                },
            ],
            lead: t({ en: "Also", de: "Außerdem", es: "También", pt: "Também", fr: "Aussi" }),
            look: {
                dark: t({ en: "Dark", de: "Dunkel", es: "Oscuro", pt: "Escuro", fr: "Sombre" }),
                light: t({ en: "Light", de: "Hell", es: "Claro", pt: "Claro", fr: "Clair" }),
            },
            openSource: {
                label: t({
                    en: "Open source",
                    de: "Open Source",
                    es: "Código abierto",
                    pt: "Código aberto",
                    fr: "Open source",
                }),
                text: t({
                    en: "The code for the app and its server is public on {{github}}.",
                    de: "Der Code der App und ihres Servers ist öffentlich auf {{github}}.",
                    es: "El código de la app y de su servidor es público en {{github}}.",
                    pt: "O código do app e do servidor é público no {{github}}.",
                    fr: "Le code de l'app et de son serveur est public sur {{github}}.",
                }),
            },
            rest: t({
                en: "in the app",
                de: "in der App",
                es: "en la app",
                pt: "no app",
                fr: "dans l'app",
            }),
        },
        away: {
            lead: t({ en: "Without", de: "Ohne", es: "Sin", pt: "Sem", fr: "Sans" }),
            line: t({
                en: "Four widgets on iPhone and six on Android.",
                de: "Vier Widgets auf dem iPhone und sechs auf Android.",
                es: "Cuatro widgets en iPhone y seis en Android.",
                pt: "Quatro widgets no iPhone e seis no Android.",
                fr: "Quatre widgets sur iPhone et six sur Android.",
            }),
            rest: t({
                en: "opening the app.",
                de: "die App zu öffnen.",
                es: "abrir la app.",
                pt: "abrir o app.",
                fr: "ouvrir l'app.",
            }),
        },
        close: {
            lead: t({
                en: "Log it in",
                de: "Erfasse es in",
                es: "Regístralo en",
                pt: "Registre em",
                fr: "Notez-la en",
            }),
            line: t({
                en: "Free to start. On iPhone with iOS 18 or later, and on Android.",
                de: "Zum Start kostenlos. Auf dem iPhone ab iOS 18 und auf Android.",
                es: "Gratis para empezar. En iPhone con iOS 18 o posterior, y en Android.",
                pt: "Grátis para começar. No iPhone com iOS 18 ou posterior, e no Android.",
                fr: "Gratuit pour commencer. Sur iPhone avec iOS 18 ou version ultérieure, et sur Android.",
            }),
            rest: t({
                en: "one sentence.",
                de: "einem Satz.",
                es: "una oración.",
                pt: "uma frase.",
                fr: "une phrase.",
            }),
        },
        dusk: {
            lead: t({
                en: "Where the week",
                de: "Wohin die Woche",
                es: "A dónde se fue",
                pt: "Para onde a semana",
                fr: "Où la semaine",
            }),
            line: t({
                en: "Spending by day and by category, and what moved since last week.",
                de: "Ausgaben nach Tag und nach Kategorie, und was sich seit letzter Woche bewegt hat.",
                es: "Tus gastos por día y por categoría, y lo que cambió desde la semana pasada.",
                pt: "Gastos por dia e por categoria, e o que mudou desde a semana passada.",
                fr: "Les dépenses par jour et par catégorie, et ce qui a bougé depuis la semaine dernière.",
            }),
            rest: t({
                en: "actually went.",
                de: "wirklich ging.",
                es: "la semana.",
                pt: "realmente foi.",
                fr: "est vraiment passée.",
            }),
        },
        faq: {
            lead: t({ en: "Questions,", de: "Fragen", es: "Preguntas", pt: "Perguntas", fr: "Questions" }),
            rest: t({ en: "answered", de: "und Antworten", es: "y respuestas", pt: "e respostas", fr: "et réponses" }),
        },
        feats: {
            pace: {
                art: t({
                    en: "The Budgets screen in Outlayr: what is left this month, the pace chart, and a verdict for the period.",
                    de: "Der Budgets-Bildschirm in Outlayr: was diesen Monat übrig ist, das Tempo-Diagramm und eine Einschätzung für den Zeitraum.",
                    es: "La pantalla de Presupuestos en Outlayr: lo que queda este mes, el gráfico de ritmo y un veredicto para el periodo.",
                    pt: "A tela de Orçamentos no Outlayr: o que sobra neste mês, o gráfico de ritmo e um veredito para o período.",
                    fr: "L'écran Budgets d'Outlayr : ce qui reste ce mois-ci, le graphique de rythme et un verdict pour la période.",
                }),
                lead: t({
                    en: "Spot the overspend",
                    de: "Erkenne zu hohe Ausgaben",
                    es: "Detecta el gasto de más",
                    pt: "Perceba o gasto a mais",
                    fr: "Repérez le dépassement",
                }),
                line: t({
                    en: "The chart shows where this pace ends, not just what’s left.",
                    de: "Das Diagramm zeigt, wo dieses Tempo endet, nicht nur, was übrig ist.",
                    es: "El gráfico muestra a dónde te lleva este ritmo, no solo lo que queda.",
                    pt: "O gráfico mostra onde esse ritmo vai parar, não só o que sobra.",
                    fr: "Le graphique montre où ce rythme vous mène, pas seulement ce qui reste.",
                }),
                rest: t({ en: "early", de: "früh", es: "a tiempo", pt: "cedo", fr: "à temps" }),
            },
            upcoming: {
                art: t({
                    en: "Upcoming entries in Outlayr, each with its date and amount, under the total coming up.",
                    de: "Anstehende Einträge in Outlayr, jeder mit Datum und Betrag, unter der anstehenden Summe.",
                    es: "Registros próximos en Outlayr, cada uno con su fecha y su monto, bajo el total que viene.",
                    pt: "Próximos lançamentos no Outlayr, cada um com data e valor, abaixo do total que vem por aí.",
                    fr: "Les opérations à venir dans Outlayr, chacune avec sa date et son montant, sous le total à venir.",
                }),
                lead: t({
                    en: "A reminder",
                    de: "Eine Erinnerung",
                    es: "Un recordatorio",
                    pt: "Um lembrete",
                    fr: "Un rappel",
                }),
                line: t({
                    en: "Rent, bills, and streaming log themselves on their day.",
                    de: "Miete, Rechnungen und Streaming werden an ihrem Tag von selbst erfasst.",
                    es: "La renta, las cuentas y el streaming se registran solos en su día.",
                    pt: "Aluguel, contas e streaming se lançam sozinhos no dia certo.",
                    fr: "Le loyer, les factures et le streaming s'enregistrent tout seuls le jour venu.",
                }),
                rest: t({
                    en: "before each charge.",
                    de: "vor jeder Abbuchung.",
                    es: "antes de cada cobro.",
                    pt: "antes de cada cobrança.",
                    fr: "avant chaque prélèvement.",
                }),
            },
            accounts: {
                art: t({
                    en: "Accounts in Outlayr: cash, cards, and savings in more than one currency, side by side.",
                    de: "Konten in Outlayr: Bargeld, Karten und Ersparnisse in mehr als einer Währung, nebeneinander.",
                    es: "Cuentas en Outlayr: efectivo, tarjetas y ahorros en más de una moneda, lado a lado.",
                    pt: "Contas no Outlayr: dinheiro, cartões e poupança em mais de uma moeda, lado a lado.",
                    fr: "Les comptes dans Outlayr : espèces, cartes et épargne dans plusieurs devises, côte à côte.",
                }),
                lead: t({
                    en: "Every account.",
                    de: "Jedes Konto.",
                    es: "Cada cuenta.",
                    pt: "Cada conta.",
                    fr: "Chaque compte.",
                }),
                line: t({
                    en: "Cash, cards, savings, and debts side by side.",
                    de: "Bargeld, Karten, Ersparnisse und Schulden nebeneinander.",
                    es: "Efectivo, tarjetas, ahorros y deudas lado a lado.",
                    pt: "Dinheiro, cartões, poupança e dívidas lado a lado.",
                    fr: "Espèces, cartes, épargne et dettes côte à côte.",
                }),
                rest: t({
                    en: "One page.",
                    de: "Eine Seite.",
                    es: "Una página.",
                    pt: "Uma página.",
                    fr: "Une seule page.",
                }),
            },
        },
        hero: {
            lead: t({
                en: "Write it the way you’d say it. Outlayr sorts out the rest.",
                de: "Schreib es so, wie du es sagen würdest. Outlayr erledigt den Rest.",
                es: "Escríbelo como lo dirías. Outlayr se encarga del resto.",
                pt: "Escreva do jeito que você falaria. O Outlayr cuida do resto.",
                fr: "Écrivez-la comme vous la diriez. Outlayr s'occupe du reste.",
            }),
            mark: t({
                en: "one sentence",
                de: "einem Satz",
                es: "una oración",
                pt: "uma frase",
                fr: "une phrase",
            }),
            proofLink: t({
                en: "{{entries}} entries logged this week",
                de: "{{entries}} Einträge diese Woche erfasst",
                es: "{{entries}} registros esta semana",
                pt: "{{entries}} lançamentos nesta semana",
                fr: "{{entries}} opérations saisies cette semaine",
            }),
            proofRest: t({
                en: "by {{people}} people in {{countries}} countries",
                de: "von {{people}} Personen in {{countries}} Ländern",
                es: "de {{people}} personas en {{countries}} países",
                pt: "de {{people}} pessoas em {{countries}} países",
                fr: "par {{people}} personnes dans {{countries}} pays",
            }),
        },
        how: {
            pause: t({
                en: "Pause",
                de: "Pausieren",
                es: "Pausar",
                pt: "Pausar",
                fr: "Mettre en pause",
            }),
            play: t({
                en: "Play",
                de: "Abspielen",
                es: "Reproducir",
                pt: "Reproduzir",
                fr: "Lire",
            }),
            label: t({
                en: "Ways to log",
                de: "Wege zum Erfassen",
                es: "Formas de registrar",
                pt: "Formas de registrar",
                fr: "Façons de saisir",
            }),
            lead: t({
                en: "Type it, say it,",
                de: "Tipp es, sag es,",
                es: "Escríbelo, dilo,",
                pt: "Digite, fale",
                fr: "Tapez-la, dites-la,",
            }),
            rest: t({
                en: "or snap it.",
                de: "oder fotografier es.",
                es: "o tómale una foto.",
                pt: "ou fotografe.",
                fr: "ou photographiez-la.",
            }),
            ways: {
                type: {
                    line: t({
                        en: "One sentence, like blue bottle 4.50.",
                        de: "Ein Satz, wie balzac coffee 4,50.",
                        es: "Una oración, como juan valdez 4,50.",
                        pt: "Uma frase, como starbucks 4,50.",
                        fr: "Une phrase, comme columbus café 4,50.",
                    }),
                    name: t({ en: "Type it", de: "Tipp es", es: "Escríbelo", pt: "Digite", fr: "Tapez-la" }),
                },
                say: {
                    line: t({
                        en: "Speak an entry instead of typing it.",
                        de: "Sprich einen Eintrag, statt ihn zu tippen.",
                        es: "Dicta un registro en vez de escribirlo.",
                        pt: "Fale um lançamento em vez de digitar.",
                        fr: "Dictez une opération au lieu de la taper.",
                    }),
                    name: t({ en: "Say it", de: "Sag es", es: "Dilo", pt: "Fale", fr: "Dites-la" }),
                },
                snap: {
                    line: t({
                        en: "Outlayr reads the store, the date, the total, and every line.",
                        de: "Outlayr liest Geschäft, Datum, Summe und jede Zeile.",
                        es: "Outlayr lee la tienda, la fecha, el total y cada línea.",
                        pt: "O Outlayr lê o estabelecimento, a data, o total e cada item.",
                        fr: "Outlayr lit le commerce, la date, le total et chaque ligne.",
                    }),
                    name: t({
                        en: "Snap it",
                        de: "Fotografier es",
                        es: "Tómale foto",
                        pt: "Fotografe",
                        fr: "Photographiez-la",
                    }),
                },
            },
        },
        pricing: {
            cadence: {
                label: t({
                    en: "Billing for Pro",
                    de: "Abrechnung für Pro",
                    es: "Facturación de Pro",
                    pt: "Cobrança do Pro",
                    fr: "Facturation de Pro",
                }),
                month: t({ en: "Monthly", de: "Monatlich", es: "Mensual", pt: "Mensal", fr: "Mensuel" }),
                once: t({ en: "Once", de: "Einmalig", es: "Una vez", pt: "Uma vez", fr: "Une fois" }),
                year: t({ en: "Yearly", de: "Jährlich", es: "Anual", pt: "Anual", fr: "Annuel" }),
            },
            free: t({ en: "Free", de: "Kostenlos", es: "Gratis", pt: "Grátis", fr: "Gratuit" }),
            freeUnit: t({
                en: "Free, with no ads",
                de: "Kostenlos, ohne Werbung",
                es: "Gratis y sin anuncios",
                pt: "Grátis e sem anúncios",
                fr: "Gratuit et sans publicité",
            }),
            lead: t({
                en: "The tracker is free.",
                de: "Der Tracker ist kostenlos.",
                es: "La app es gratis.",
                pt: "O app é grátis.",
                fr: "L'app est gratuite.",
            }),
            onceUnit: t({ en: "once", de: "einmalig", es: "una sola vez", pt: "uma única vez", fr: "une seule fois" }),
            rest: t({
                en: "Pro lifts the limits and adds sync.",
                de: "Pro hebt die Grenzen an und bringt die Synchronisierung dazu.",
                es: "Pro quita los límites y agrega la sincronización.",
                pt: "O Pro tira os limites e adiciona a sincronização.",
                fr: "Pro lève les limites et ajoute la synchronisation.",
            }),
            yearUnit: t({
                en: "a year with 7 days free",
                de: "im Jahr mit 7 Tagen gratis",
                es: "al año con 7 días gratis",
                pt: "por ano com 7 dias grátis",
                fr: "par an avec 7 jours gratuits",
            }),
        },
    },
    key: "horizon",
} satisfies Dictionary;

export default horizon;
