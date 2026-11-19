import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const open = {
    content: {
        cant: {
            body: [
                t({
                    en: "Anyone who turned off Share analytics, so the real numbers are higher than these.",
                    de: "Alle, die „Analysedaten teilen“ ausgeschaltet haben, die echten Zahlen liegen also höher als diese.",
                    es: "A quien desactivó Compartir analíticas, así que los números reales son más altos que estos.",
                    pt: "Quem desativou Compartilhar análises, então os números reais são mais altos que estes.",
                    fr: "Les personnes qui ont désactivé « Partager les données d'analyse », les chiffres réels sont donc plus élevés que ceux-ci.",
                }),
                t({
                    en: "Your entries stay on your phone unless you sync them, so nothing here says what anyone spends, and we can't see it either.",
                    de: "Deine Einträge bleiben auf deinem Handy, solange du sie nicht synchronisierst. Hier steht also nichts darüber, was jemand ausgibt, und wir sehen es auch nicht.",
                    es: "Tus registros se quedan en tu celular a menos que los sincronices, así que nada aquí dice cuánto gasta alguien, y nosotros tampoco lo vemos.",
                    pt: "Seus lançamentos ficam no seu celular a menos que você os sincronize, então nada aqui diz quanto alguém gasta, e nós também não vemos.",
                    fr: "Vos opérations restent sur votre téléphone, sauf si vous les synchronisez. Rien ici ne dit donc combien quelqu'un dépense, et nous ne le voyons pas non plus.",
                }),
            ],
            title: t({
                en: "What we can't count",
                de: "Was wir nicht zählen können",
                es: "Lo que no podemos contar",
                pt: "O que não conseguimos contar",
                fr: "Ce que nous ne pouvons pas compter",
            }),
        },
        delta: insert(
            t({
                en: "{{delta}} vs last week",
                de: "{{delta}} zur Vorwoche",
                es: "{{delta}} frente a la semana pasada",
                pt: "{{delta}} em relação à semana passada",
                fr: "{{delta}} par rapport à la semaine dernière",
            })
        ),
        empty: t({
            en: "The first count runs tonight. Check back tomorrow.",
            de: "Die erste Zählung läuft heute Nacht. Schau morgen wieder vorbei.",
            es: "El primer conteo corre esta noche. Vuelve mañana.",
            pt: "A primeira contagem roda hoje à noite. Volte amanhã.",
            fr: "Le premier comptage a lieu ce soir. Revenez demain.",
        }),
        lead: t({
            en: "Outlayr is open source, so its numbers are too. Each one links to the code that counts it.",
            de: "Outlayr ist Open Source, und seine Zahlen sind es auch. Jede verlinkt auf den Code, der sie zählt.",
            es: "Outlayr es de código abierto, así que sus números también. Cada uno enlaza al código que lo cuenta.",
            pt: "O Outlayr é de código aberto, e seus números também. Cada um leva ao código que o conta.",
            fr: "Outlayr est open source, et ses chiffres le sont aussi. Chacun renvoie au code qui le compte.",
        }),
        meta: {
            description: t({
                en: "How many people use Outlayr, how many entries they log, and what it earns, updated daily from the code in its public repo.",
                de: "Wie viele Menschen Outlayr nutzen, wie viel sie erfassen und was es einnimmt, täglich aktualisiert aus dem öffentlichen Repository.",
                es: "Cuántas personas usan Outlayr, cuántos registros hacen y cuánto gana, actualizado cada día desde el código de su repositorio público.",
                pt: "Quantas pessoas usam o Outlayr, quantos lançamentos fazem e quanto ele ganha, atualizado todo dia a partir do código do repositório público.",
                fr: "Combien de personnes utilisent Outlayr, combien d'opérations elles saisissent et ce qu'il rapporte, mis à jour chaque jour.",
            }),
            title: t({
                en: "Outlayr in numbers",
                de: "Outlayr in Zahlen",
                es: "Outlayr en números",
                pt: "Outlayr em números",
                fr: "Outlayr en chiffres",
            }),
        },
        months: {
            accounts: t({
                en: "New synced accounts",
                de: "Neue Sync-Konten",
                es: "Cuentas sincronizadas nuevas",
                pt: "Novas contas sincronizadas",
                fr: "Nouveaux comptes synchronisés",
            }),
            entries: t({ en: "Entries", de: "Einträge", es: "Registros", pt: "Lançamentos", fr: "Opérations" }),
            month: t({ en: "Month", de: "Monat", es: "Mes", pt: "Mês", fr: "Mois" }),
            people: t({ en: "People", de: "Personen", es: "Personas", pt: "Pessoas", fr: "Personnes" }),
            prs: t({
                en: "PRs merged",
                de: "PRs gemergt",
                es: "PRs integrados",
                pt: "PRs integrados",
                fr: "PRs fusionnées",
            }),
            revenue: t({
                en: "Revenue after store fees",
                de: "Umsatz nach Store-Gebühren",
                es: "Ingresos tras comisiones",
                pt: "Receita após taxas das lojas",
                fr: "Revenus après commissions",
            }),
            soFar: insert(
                t({
                    en: "{{month}} so far",
                    de: "{{month}} bisher",
                    es: "{{month}} hasta hoy",
                    pt: "{{month}} até hoje",
                    fr: "{{month}} à ce jour",
                })
            ),
            title: t({
                en: "Month by month",
                de: "Monat für Monat",
                es: "Mes a mes",
                pt: "Mês a mês",
                fr: "Mois par mois",
            }),
        },
        rows: {
            accounts: {
                description: t({
                    en: "Accounts that back up and sync their ledger. Outlayr works fully without one",
                    de: "Konten, die ihr Haushaltsbuch sichern und synchronisieren. Outlayr funktioniert auch ohne Konto vollständig",
                    es: "Cuentas que respaldan y sincronizan su registro. Outlayr funciona completo sin una",
                    pt: "Contas que fazem backup e sincronizam seus lançamentos. O Outlayr funciona por completo sem uma",
                    fr: "Comptes qui sauvegardent et synchronisent leur journal. Outlayr fonctionne pleinement sans compte",
                }),
                label: t({
                    en: "Synced accounts",
                    de: "Sync-Konten",
                    es: "Cuentas sincronizadas",
                    pt: "Contas sincronizadas",
                    fr: "Comptes synchronisés",
                }),
            },
            countries: {
                description: t({
                    en: "Where this week's people opened the app, from the country PostHog infers",
                    de: "Wo die Personen dieser Woche die App geöffnet haben, nach dem Land, das PostHog ableitet",
                    es: "Desde dónde abrieron la app las personas de esta semana, según el país que deduce PostHog",
                    pt: "De onde as pessoas desta semana abriram o app, segundo o país que o PostHog deduz",
                    fr: "D'où les personnes de cette semaine ont ouvert l'app, d'après le pays que PostHog déduit",
                }),
                label: t({ en: "Countries", de: "Länder", es: "Países", pt: "Países", fr: "Pays" }),
            },
            entries: {
                description: t({
                    en: "Expenses and income saved in the last 7 days. We count the save, never the amount or the note",
                    de: "Ausgaben und Einnahmen, die in den letzten 7 Tagen gespeichert wurden. Wir zählen das Speichern, nie den Betrag oder die Notiz",
                    es: "Gastos e ingresos guardados en los últimos 7 días. Contamos el guardado, nunca el monto ni la nota",
                    pt: "Despesas e receitas salvas nos últimos 7 dias. Contamos o salvamento, nunca o valor nem a nota",
                    fr: "Dépenses et revenus enregistrés ces 7 derniers jours. Nous comptons l'enregistrement, jamais le montant ni la note",
                }),
                label: t({
                    en: "Entries logged this week",
                    de: "Erfasste Einträge diese Woche",
                    es: "Registros esta semana",
                    pt: "Lançamentos esta semana",
                    fr: "Opérations saisies cette semaine",
                }),
            },
            people: {
                description: t({
                    en: "Installs that opened the app in the last 7 days, among people who share analytics",
                    de: "Installationen, die die App in den letzten 7 Tagen geöffnet haben, unter Personen, die Analysedaten teilen",
                    es: "Instalaciones que abrieron la app en los últimos 7 días, entre quienes comparten analíticas",
                    pt: "Instalações que abriram o app nos últimos 7 dias, entre as pessoas que compartilham análises",
                    fr: "Installations qui ont ouvert l'app ces 7 derniers jours, parmi les personnes qui partagent les données d'analyse",
                }),
                label: t({
                    en: "People this week",
                    de: "Personen diese Woche",
                    es: "Personas esta semana",
                    pt: "Pessoas esta semana",
                    fr: "Personnes cette semaine",
                }),
            },
            pro: {
                description: t({
                    en: "Active Outlayr Pro subscriptions and free trials, as RevenueCat reports them",
                    de: "Aktive Outlayr-Pro-Abos und kostenlose Testphasen, wie RevenueCat sie meldet",
                    es: "Suscripciones activas a Outlayr Pro y pruebas gratis, según RevenueCat",
                    pt: "Assinaturas ativas do Outlayr Pro e testes gratuitos, conforme o RevenueCat informa",
                    fr: "Abonnements Outlayr Pro actifs et essais gratuits, selon RevenueCat",
                }),
                label: t({
                    en: "Pro subscribers",
                    de: "Pro-Abonnenten",
                    es: "Suscriptores Pro",
                    pt: "Assinantes Pro",
                    fr: "Abonnés Pro",
                }),
            },
            stars: {
                description: insert(
                    t({
                        en: "From the public GitHub API, with {{count}} people who have shipped code",
                        de: "Aus der öffentlichen GitHub-API, mit {{count}} Personen, die Code beigetragen haben",
                        es: "De la API pública de GitHub, con {{count}} personas que han aportado código",
                        pt: "Da API pública do GitHub, com {{count}} pessoas que contribuíram com código",
                        fr: "Depuis l'API publique de GitHub, avec {{count}} personnes qui ont contribué au code",
                    })
                ),
                label: t({
                    en: "GitHub stars",
                    de: "GitHub-Sterne",
                    es: "Estrellas en GitHub",
                    pt: "Estrelas no GitHub",
                    fr: "Étoiles GitHub",
                }),
            },
        },
        same: t({
            en: "same as last week",
            de: "wie in der Vorwoche",
            es: "igual que la semana pasada",
            pt: "igual à semana passada",
            fr: "identique à la semaine dernière",
        }),
        title: t({
            en: "Outlayr in numbers",
            de: "Outlayr in Zahlen",
            es: "Outlayr en números",
            pt: "Outlayr em números",
            fr: "Outlayr en chiffres",
        }),
        updated: insert(
            t({
                en: "Updated daily · last run {{date}} UTC",
                de: "Täglich aktualisiert · letzte Zählung {{date}} UTC",
                es: "Se actualiza cada día · último conteo {{date}} UTC",
                pt: "Atualizado todo dia · última contagem {{date}} UTC",
                fr: "Mis à jour chaque jour · dernier comptage {{date}} UTC",
            })
        ),
    },
    key: "open",
} satisfies Dictionary;

export default open;
