import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const demo = {
    content: {
        added: insert(
            t({
                en: "Transaction added: {{merchant}}, {{money}}",
                es: "Transacción agregada: {{merchant}}, {{money}}",
                pt: "Lançamento adicionado: {{merchant}}, {{money}}",
                fr: "Opération ajoutée : {{merchant}}, {{money}}",
            })
        ),
        amountNeeded: t({
            en: "Enter an amount first",
            es: "Primero ingresa un monto",
            pt: "Digite um valor primeiro",
            fr: "Saisissez d'abord un montant",
        }),
        blank: {
            account: t({ en: "an account", es: "una cuenta", pt: "uma conta", fr: "un compte" }),
            category: t({ en: "a category", es: "una categoría", pt: "uma categoria", fr: "une catégorie" }),
            merchant: t({ en: "a merchant", es: "un comercio", pt: "um estabelecimento", fr: "un commerçant" }),
        },
        cta: {
            add: t({
                en: "Add Transaction",
                es: "Agregar transacción",
                pt: "Adicionar lançamento",
                fr: "Ajouter l'opération",
            }),
            next: t({ en: "Next", es: "Siguiente", pt: "Próximo", fr: "Suivant" }),
        },
        currencies: {
            EUR: t({ en: "Euro", es: "Euro", pt: "Euro", fr: "Euro" }),
            MXN: t({ en: "Mexican Peso", es: "Peso mexicano", pt: "Peso mexicano", fr: "Peso mexicain" }),
            USD: t({ en: "US Dollar", es: "Dólar estadounidense", pt: "Dólar americano", fr: "Dollar américain" }),
            VES: t({
                en: "Venezuelan Bolívar",
                es: "Bolívar venezolano",
                pt: "Bolívar venezuelano",
                fr: "Bolivar vénézuélien",
            }),
        },
        currency: insert(
            t({ en: "Currency, {{code}}", es: "Moneda, {{code}}", pt: "Moeda, {{code}}", fr: "Devise, {{code}}" })
        ),
        day: {
            today: t({ en: "Today", es: "Hoy", pt: "Hoje", fr: "Aujourd'hui" }),
            yesterday: t({ en: "Yesterday", es: "Ayer", pt: "Ontem", fr: "Hier" }),
        },
        delete: t({ en: "Delete", es: "Borrar", pt: "Apagar", fr: "Supprimer" }),
        importFootnote: t({
            en: "Only unmatched merchant names and your category names are sent.",
            es: "Solo se envían los nombres de comercios sin coincidencia y los de tus categorías.",
            pt: "Só enviamos os nomes de estabelecimentos sem correspondência e os nomes das suas categorias.",
            fr: "Seuls les noms de commerçants non reconnus et les noms de vos catégories sont envoyés.",
        }),
        importStatus: [
            t({
                en: "Read the file · 5 rows read",
                es: "Leímos el archivo · 5 filas leídas",
                pt: "Arquivo lido · 5 linhas",
                fr: "Fichier lu · 5 lignes",
            }),
            t({
                en: "Matched on device · 3 of 5 merchants",
                es: "Coincidencias en el celular · 3 de 5 comercios",
                pt: "Reconhecidos no celular · 3 de 5 estabelecimentos",
                fr: "Reconnus sur l'appareil · 3 commerçants sur 5",
            }),
            t({
                en: "Asked the model · 2 merchant names sent",
                es: "Consultamos al modelo · 2 nombres enviados",
                pt: "Consultamos o modelo · 2 nomes enviados",
                fr: "Modèle consulté · 2 noms envoyés",
            }),
            t({
                en: "Imported · 5 rows",
                es: "Importado · 5 filas",
                pt: "Importado · 5 linhas",
                fr: "Importé · 5 lignes",
            }),
        ],
        kind: {
            expense: t({ en: "Spent", es: "Gasté", pt: "Gastei", fr: "J'ai dépensé" }),
            income: t({ en: "Received", es: "Recibí", pt: "Recebi", fr: "J'ai reçu" }),
        },
        lead: t({
            en: "That sentence is the whole form. Tap an underlined word to change it.",
            es: "Esa oración es todo el formulario. Toca una palabra subrayada para cambiarla.",
            pt: "Essa frase é o formulário inteiro. Toque numa palavra sublinhada para mudá-la.",
            fr: "Cette phrase est tout le formulaire. Touchez un mot souligné pour le modifier.",
        }),
        log: t({ en: "Log", es: "Registro", pt: "Lançamentos", fr: "Journal" }),
        merchantField: t({
            en: "Merchant name",
            es: "Nombre del comercio",
            pt: "Nome do estabelecimento",
            fr: "Nom du commerçant",
        }),
        merchantPlaceholder: t({
            en: "Netflix, Groceries…",
            es: "Netflix, Súper…",
            pt: "Netflix, Mercado…",
            fr: "Netflix, Courses…",
        }),
        names: {
            Bonus: t({ en: "Bonus", es: "Bonos", pt: "Bônus", fr: "Primes" }),
            Business: t({ en: "Business", es: "Negocio", pt: "Negócio", fr: "Entreprise" }),
            Cash: t({ en: "Cash", es: "Efectivo", pt: "Dinheiro", fr: "Espèces" }),
            Coffee: t({ en: "Coffee", es: "Café", pt: "Café", fr: "Café" }),
            "Dining Out": t({ en: "Dining Out", es: "Restaurantes", pt: "Restaurantes", fr: "Restaurants" }),
            Entertainment: t({ en: "Entertainment", es: "Entretenimiento", pt: "Lazer", fr: "Loisirs" }),
            Fashion: t({ en: "Fashion", es: "Moda", pt: "Roupas", fr: "Vêtements" }),
            Freelance: t({ en: "Freelance", es: "Freelance", pt: "Freelance", fr: "Freelance" }),
            Groceries: t({ en: "Groceries", es: "Súper", pt: "Mercado", fr: "Courses" }),
            Interest: t({ en: "Interest", es: "Intereses", pt: "Juros", fr: "Intérêts" }),
            Investments: t({ en: "Investments", es: "Inversiones", pt: "Investimentos", fr: "Investissements" }),
            "Part-Time": t({ en: "Part-Time", es: "Medio tiempo", pt: "Meio período", fr: "Temps partiel" }),
            Paycheck: t({ en: "Paycheck", es: "Sueldo", pt: "Salário", fr: "Salaire" }),
            Shopping: t({ en: "Shopping", es: "Compras", pt: "Compras", fr: "Achats" }),
            Subscriptions: t({ en: "Subscriptions", es: "Suscripciones", pt: "Assinaturas", fr: "Abonnements" }),
            Tips: t({ en: "Tips", es: "Propinas", pt: "Gorjetas", fr: "Pourboires" }),
            Transport: t({ en: "Transport", es: "Transporte", pt: "Transporte", fr: "Transports" }),
            today: t({ en: "today", es: "hoy", pt: "hoje", fr: "aujourd'hui" }),
            yesterday: t({ en: "yesterday", es: "ayer", pt: "ontem", fr: "hier" }),
        },
        said: {
            first: t({
                en: "$12.50 at Blue Bottle for coffee on my Apple Card",
                es: "$12.50 de café en Juan Valdez con mi tarjeta Nu",
                pt: "$12.50 de café no Starbucks com meu cartão Nubank",
                fr: "$12.50 chez Columbus Café pour un café avec ma carte Boursorama",
            }),
            fix: t({
                en: "Actually, that was yesterday",
                es: "En realidad, fue ayer",
                pt: "Na verdade, foi ontem",
                fr: "En fait, c'était hier",
            }),
        },
        scan: {
            category: t({ en: "Category", es: "Categoría", pt: "Categoria", fr: "Catégorie" }),
            date: t({ en: "Date", es: "Fecha", pt: "Data", fr: "Date" }),
            dateValue: t({ en: "Sep 21", es: "21 sep", pt: "21 set", fr: "21 sept." }),
            store: t({ en: "Store", es: "Tienda", pt: "Loja", fr: "Magasin" }),
            total: t({ en: "Total", es: "Total", pt: "Total", fr: "Total" }),
        },
        sentence: {
            expense: insert(
                t({
                    en: "{{kind}} {{amount}} at {{merchant}} for {{category}} from {{account}} {{when}}.",
                    es: "{{kind}} {{amount}} en {{merchant}} para {{category}} con {{account}} {{when}}.",
                    pt: "{{kind}} {{amount}} em {{merchant}} para {{category}} com {{account}} {{when}}.",
                    fr: "{{kind}} {{amount}} chez {{merchant}} pour {{category}} avec {{account}} {{when}}.",
                })
            ),
            income: insert(
                t({
                    en: "{{kind}} {{amount}} from {{merchant}} for {{category}} into {{account}} {{when}}.",
                    es: "{{kind}} {{amount}} de {{merchant}} para {{category}} en {{account}} {{when}}.",
                    pt: "{{kind}} {{amount}} de {{merchant}} para {{category}} em {{account}} {{when}}.",
                    fr: "{{kind}} {{amount}} via {{merchant}} pour {{category}} sur {{account}} {{when}}.",
                })
            ),
        },
        sizer: t({
            en: "Received $1,450.00 USD from Upwork for Freelance into Zinli yesterday.",
            es: "Recibí $1,450.00 USD de un comercio para una categoría en una cuenta ayer.",
            pt: "Recebi $1,450.00 USD de um estabelecimento para uma categoria em uma conta ontem.",
            fr: "J'ai dépensé $1,450.00 USD chez un commerçant pour une catégorie avec un compte aujourd'hui.",
        }),
        status: {
            draft: t({ en: "Draft", es: "Borrador", pt: "Rascunho", fr: "Brouillon" }),
            fieldDate: t({ en: "date", es: "fecha", pt: "data", fr: "date" }),
            listening: t({ en: "Listening…", es: "Escuchando…", pt: "Ouvindo…", fr: "À l'écoute…" }),
            reading: t({
                en: "Reading the receipt…",
                es: "Leyendo el recibo…",
                pt: "Lendo o recibo…",
                fr: "Lecture du ticket…",
            }),
            review: t({ en: "Review", es: "Revisar", pt: "Revisar", fr: "À vérifier" }),
            saved: t({ en: "Saved", es: "Guardado", pt: "Salvo", fr: "Enregistré" }),
            updated: t({ en: "Updated", es: "Actualizado", pt: "Atualizado", fr: "Mis à jour" }),
            writing: t({ en: "Writing it down…", es: "Anotando…", pt: "Anotando…", fr: "Je note…" }),
        },
        steps: {
            account: t({ en: "Account", es: "Cuenta", pt: "Conta", fr: "Compte" }),
            amount: t({ en: "Amount", es: "Monto", pt: "Valor", fr: "Montant" }),
            category: t({ en: "Category", es: "Categoría", pt: "Categoria", fr: "Catégorie" }),
            currency: t({
                en: "Select a currency",
                es: "Selecciona una moneda",
                pt: "Escolha uma moeda",
                fr: "Choisir une devise",
            }),
            merchant: t({ en: "Name", es: "Nombre", pt: "Nome", fr: "Nom" }),
            when: t({ en: "Date", es: "Fecha", pt: "Data", fr: "Date" }),
        },
        voiceAt: t({ en: "at", es: "en", pt: "no", fr: "chez" }),
    },
    key: "demo",
} satisfies Dictionary;

export default demo;
