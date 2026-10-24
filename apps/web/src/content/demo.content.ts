import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const demo = {
    content: {
        added: insert(
            t({
                en: "Transaction added: {{merchant}}, {{money}}",
                es: "Transacción agregada: {{merchant}}, {{money}}",
            })
        ),
        blank: {
            account: t({ en: "an account", es: "una cuenta" }),
            category: t({ en: "a category", es: "una categoría" }),
            merchant: t({ en: "a merchant", es: "un comercio" }),
        },
        cta: {
            add: t({ en: "Add Transaction", es: "Agregar transacción" }),
            next: t({ en: "Next", es: "Siguiente" }),
        },
        currencies: {
            EUR: t({ en: "Euro", es: "Euro" }),
            MXN: t({ en: "Mexican Peso", es: "Peso mexicano" }),
            USD: t({ en: "US Dollar", es: "Dólar estadounidense" }),
            VES: t({ en: "Venezuelan Bolívar", es: "Bolívar venezolano" }),
        },
        currency: insert(t({ en: "Currency, {{code}}", es: "Moneda, {{code}}" })),
        day: {
            today: t({ en: "Today", es: "Hoy" }),
            yesterday: t({ en: "Yesterday", es: "Ayer" }),
        },
        delete: t({ en: "Delete", es: "Borrar" }),
        importFootnote: t({
            en: "Only unmatched merchant names and your category names are sent.",
            es: "Solo se envían los nombres de comercios sin coincidencia y los de tus categorías.",
        }),
        importStatus: [
            t({ en: "Read the file · 5 rows read", es: "Leímos el archivo · 5 filas leídas" }),
            t({ en: "Matched on device · 3 of 5 merchants", es: "Coincidencias en el celular · 3 de 5 comercios" }),
            t({ en: "Asked the model · 2 merchant names sent", es: "Consultamos al modelo · 2 nombres enviados" }),
            t({ en: "Imported · 5 rows", es: "Importado · 5 filas" }),
        ],
        kind: {
            expense: t({ en: "Spent", es: "Gasté" }),
            income: t({ en: "Received", es: "Recibí" }),
        },
        lead: t({
            en: "That sentence is the whole form. Tap an underlined word to change it.",
            es: "Esa oración es todo el formulario. Toca una palabra subrayada para cambiarla.",
        }),
        log: t({ en: "Log", es: "Registro" }),
        merchantField: t({ en: "Merchant name", es: "Nombre del comercio" }),
        merchantPlaceholder: t({ en: "Netflix, Groceries…", es: "Netflix, Súper…" }),
        names: {
            Bonus: t({ en: "Bonus", es: "Bonos" }),
            Business: t({ en: "Business", es: "Negocio" }),
            Cash: t({ en: "Cash", es: "Efectivo" }),
            Coffee: t({ en: "Coffee", es: "Café" }),
            "Dining Out": t({ en: "Dining Out", es: "Restaurantes" }),
            Entertainment: t({ en: "Entertainment", es: "Entretenimiento" }),
            Fashion: t({ en: "Fashion", es: "Moda" }),
            Freelance: t({ en: "Freelance", es: "Freelance" }),
            Groceries: t({ en: "Groceries", es: "Súper" }),
            Interest: t({ en: "Interest", es: "Intereses" }),
            Investments: t({ en: "Investments", es: "Inversiones" }),
            "Part-Time": t({ en: "Part-Time", es: "Medio tiempo" }),
            Paycheck: t({ en: "Paycheck", es: "Sueldo" }),
            Shopping: t({ en: "Shopping", es: "Compras" }),
            Subscriptions: t({ en: "Subscriptions", es: "Suscripciones" }),
            Tips: t({ en: "Tips", es: "Propinas" }),
            Transport: t({ en: "Transport", es: "Transporte" }),
            today: t({ en: "today", es: "hoy" }),
            yesterday: t({ en: "yesterday", es: "ayer" }),
        },
        said: {
            first: t({
                en: "$12.50 at Blue Bottle for coffee on my Apple Card",
                es: "$12.50 de café en Juan Valdez con mi tarjeta Nu",
            }),
            fix: t({ en: "Actually, that was yesterday", es: "En realidad, fue ayer" }),
        },
        scan: {
            category: t({ en: "Category", es: "Categoría" }),
            date: t({ en: "Date", es: "Fecha" }),
            dateValue: t({ en: "Sep 21", es: "21 sep" }),
            store: t({ en: "Store", es: "Tienda" }),
            total: t({ en: "Total", es: "Total" }),
        },
        sentence: {
            expense: insert(
                t({
                    en: "{{kind}} {{amount}} at {{merchant}} for {{category}} from {{account}} {{when}}.",
                    es: "{{kind}} {{amount}} en {{merchant}} para {{category}} con {{account}} {{when}}.",
                })
            ),
            income: insert(
                t({
                    en: "{{kind}} {{amount}} from {{merchant}} for {{category}} into {{account}} {{when}}.",
                    es: "{{kind}} {{amount}} de {{merchant}} para {{category}} en {{account}} {{when}}.",
                })
            ),
        },
        sizer: t({
            en: "Received $1,450.00 USD from Upwork for Freelance into Zinli yesterday.",
            es: "Recibí $1,450.00 USD de un comercio para una categoría en una cuenta ayer.",
        }),
        status: {
            draft: t({ en: "Draft", es: "Borrador" }),
            fieldDate: t({ en: "date", es: "fecha" }),
            listening: t({ en: "Listening…", es: "Escuchando…" }),
            reading: t({ en: "Reading the receipt…", es: "Leyendo el recibo…" }),
            review: t({ en: "Review", es: "Revisar" }),
            saved: t({ en: "Saved", es: "Guardado" }),
            updated: t({ en: "Updated", es: "Actualizado" }),
            writing: t({ en: "Writing it down…", es: "Anotando…" }),
        },
        steps: {
            account: t({ en: "Account", es: "Cuenta" }),
            amount: t({ en: "Amount", es: "Monto" }),
            category: t({ en: "Category", es: "Categoría" }),
            currency: t({ en: "Select a currency", es: "Selecciona una moneda" }),
            merchant: t({ en: "Name", es: "Nombre" }),
            when: t({ en: "Date", es: "Fecha" }),
        },
        voiceAt: t({ en: "at", es: "en" }),
    },
    key: "demo",
} satisfies Dictionary;

export default demo;
