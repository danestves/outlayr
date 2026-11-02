import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const open = {
    content: {
        cant: {
            body: [
                t({
                    en: "Anyone who turned off Share analytics, so the real numbers are higher than these.",
                    es: "A quien desactivó Compartir analíticas, así que los números reales son más altos que estos.",
                }),
                t({
                    en: "Your entries stay on your phone unless you sync them, so nothing here says what anyone spends, and we can't see it either.",
                    es: "Tus registros se quedan en tu celular a menos que los sincronices, así que nada aquí dice cuánto gasta alguien, y nosotros tampoco lo vemos.",
                }),
            ],
            title: t({ en: "What we can't count", es: "Lo que no podemos contar" }),
        },
        delta: insert(t({ en: "{{delta}} vs last week", es: "{{delta}} frente a la semana pasada" })),
        empty: t({
            en: "The first count runs tonight. Check back tomorrow.",
            es: "El primer conteo corre esta noche. Vuelve mañana.",
        }),
        lead: t({
            en: "Outlayr is open source, so its numbers are too. Each one links to the code that counts it.",
            es: "Outlayr es de código abierto, así que sus números también. Cada uno enlaza al código que lo cuenta.",
        }),
        meta: {
            description: t({
                en: "How many people use Outlayr, how many entries they log, and what it earns, updated daily from the code in its public repo.",
                es: "Cuántas personas usan Outlayr, cuántos registros hacen y cuánto gana, actualizado cada día desde el código de su repositorio público.",
            }),
            title: t({ en: "Outlayr in numbers", es: "Outlayr en números" }),
        },
        months: {
            accounts: t({ en: "New synced accounts", es: "Cuentas sincronizadas nuevas" }),
            entries: t({ en: "Entries", es: "Registros" }),
            month: t({ en: "Month", es: "Mes" }),
            people: t({ en: "People", es: "Personas" }),
            prs: t({ en: "PRs merged", es: "PRs integrados" }),
            revenue: t({ en: "Revenue after store fees", es: "Ingresos tras comisiones" }),
            soFar: insert(t({ en: "{{month}} so far", es: "{{month}} hasta hoy" })),
            title: t({ en: "Month by month", es: "Mes a mes" }),
        },
        rows: {
            accounts: {
                description: t({
                    en: "Accounts that back up and sync their ledger. Outlayr works fully without one",
                    es: "Cuentas que respaldan y sincronizan su registro. Outlayr funciona completo sin una",
                }),
                label: t({ en: "Synced accounts", es: "Cuentas sincronizadas" }),
            },
            countries: {
                description: t({
                    en: "Where this week's people opened the app, from the country PostHog infers",
                    es: "Desde dónde abrieron la app las personas de esta semana, según el país que deduce PostHog",
                }),
                label: t({ en: "Countries", es: "Países" }),
            },
            entries: {
                description: t({
                    en: "Expenses and income saved in the last 7 days. We count the save, never the amount or the note",
                    es: "Gastos e ingresos guardados en los últimos 7 días. Contamos el guardado, nunca el monto ni la nota",
                }),
                label: t({ en: "Entries logged this week", es: "Registros esta semana" }),
            },
            people: {
                description: t({
                    en: "Installs that opened the app in the last 7 days, among people who share analytics",
                    es: "Instalaciones que abrieron la app en los últimos 7 días, entre quienes comparten analíticas",
                }),
                label: t({ en: "People this week", es: "Personas esta semana" }),
            },
            pro: {
                description: t({
                    en: "Active Outlayr Pro subscriptions, as RevenueCat reports them",
                    es: "Suscripciones activas a Outlayr Pro, según RevenueCat",
                }),
                label: t({ en: "Pro subscribers", es: "Suscriptores Pro" }),
            },
            stars: {
                description: insert(
                    t({
                        en: "From the public GitHub API, with {{count}} people who have shipped code",
                        es: "De la API pública de GitHub, con {{count}} personas que han aportado código",
                    })
                ),
                label: t({ en: "GitHub stars", es: "Estrellas en GitHub" }),
            },
        },
        same: t({ en: "same as last week", es: "igual que la semana pasada" }),
        title: t({ en: "Outlayr in numbers", es: "Outlayr en números" }),
        updated: insert(
            t({ en: "Updated daily · last run {{date}} UTC", es: "Se actualiza cada día · último conteo {{date}} UTC" })
        ),
    },
    key: "open",
} satisfies Dictionary;

export default open;
