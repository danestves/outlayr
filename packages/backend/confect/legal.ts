import * as Schema from "effect/Schema";

export const LegalDocument = Schema.Literals(["privacy", "terms"]);

const Changes = Schema.Array(Schema.Struct({ detail: Schema.optional(Schema.String), label: Schema.String }));

export const PolicyNotice = Schema.Struct({
    changes: Schema.Struct({ en: Changes, es: Changes, fr: Changes, pt: Changes }),
    document: LegalDocument,
    effectiveAtMs: Schema.Number,
});

export type PolicyNotice = typeof PolicyNotice.Type;

export const POLICY_NOTICES: readonly PolicyNotice[] = [
    {
        changes: {
            en: [
                {
                    detail: "A welcome note when you sign up, a note when Pro starts, and notices like this one before a policy changes.",
                    label: "Emails about your account",
                },
                { detail: "Kept with your account so those emails arrive in it.", label: "Your app's language" },
            ],
            es: [
                {
                    detail: "Una nota de bienvenida al registrarte, otra cuando empieza Pro y avisos como este antes de que cambie una política.",
                    label: "Correos sobre tu cuenta",
                },
                {
                    detail: "Lo guardamos con tu cuenta para que esos correos lleguen en tu idioma.",
                    label: "El idioma de la app",
                },
            ],
            fr: [
                {
                    detail: "Un mot de bienvenue à l'inscription, un autre quand Pro commence, et des avis comme celui-ci avant qu'une politique change.",
                    label: "Des e-mails sur votre compte",
                },
                {
                    detail: "Gardée avec votre compte pour que ces e-mails arrivent dans votre langue.",
                    label: "La langue de l'app",
                },
            ],
            pt: [
                {
                    detail: "Uma nota de boas-vindas ao criar a conta, outra quando o Pro começa e avisos como este antes de uma política mudar.",
                    label: "E-mails sobre a sua conta",
                },
                {
                    detail: "Guardado com a sua conta para que esses e-mails cheguem no seu idioma.",
                    label: "O idioma do app",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 2),
    },
    {
        changes: {
            en: [
                {
                    detail: "With Pro, import from your Notion databases. We keep Notion's access key encrypted until you disconnect it or delete your account.",
                    label: "Connecting Notion",
                },
                {
                    detail: "With Share analytics on: budgets created, cards shared, imports, exports, setting changes and links that open the app. Never amounts, names or notes.",
                    label: "Which features you use",
                },
                {
                    detail: "With Smart fill on, a notification Outlayr logs that shows an amount goes to our AI provider so it can read the merchant, amount, and currency. Its text isn't kept.",
                    label: "Reading bank notifications",
                },
            ],
            es: [
                {
                    detail: "Con Pro, importa desde tus bases de datos de Notion. Guardamos cifrada la clave de acceso de Notion hasta que la desconectes o elimines tu cuenta.",
                    label: "Conectar Notion",
                },
                {
                    detail: "Con Compartir analíticas activado: presupuestos creados, tarjetas compartidas, importaciones, exportaciones, cambios de ajustes y enlaces que abren la app. Nunca montos, nombres ni notas.",
                    label: "Qué funciones usas",
                },
                {
                    detail: "Con Autocompletado activado, una notificación que Outlayr registra y que muestra un monto va a nuestro proveedor de IA para leer el comercio, el monto y la moneda. No guardamos su texto.",
                    label: "Lectura de notificaciones del banco",
                },
            ],
            fr: [
                {
                    detail: "Avec Pro, importez depuis vos bases de données Notion. Nous gardons la clé d'accès de Notion chiffrée jusqu'à ce que vous la déconnectiez ou supprimiez votre compte.",
                    label: "Connexion à Notion",
                },
                {
                    detail: "Avec Partager les données d'analyse activé : budgets créés, cartes partagées, imports, exports, réglages modifiés et liens qui ouvrent l'app. Jamais de montants, de noms ni de notes.",
                    label: "Les fonctions que vous utilisez",
                },
                {
                    detail: "Avec Remplissage intelligent activé, une notification enregistrée par Outlayr qui affiche un montant est envoyée à notre fournisseur d'IA pour lire le commerçant, le montant et la devise. Son texte n'est pas conservé.",
                    label: "Lecture des notifications bancaires",
                },
            ],
            pt: [
                {
                    detail: "Com o Pro, importe das suas bases de dados do Notion. Guardamos a chave de acesso do Notion cifrada até você desconectar ou excluir a sua conta.",
                    label: "Conectar o Notion",
                },
                {
                    detail: "Com Compartilhar análises ativado: orçamentos criados, cartões compartilhados, importações, exportações, mudanças de ajustes e links que abrem o app. Nunca valores, nomes ou notas.",
                    label: "Quais recursos você usa",
                },
                {
                    detail: "Com Preenchimento inteligente ativado, uma notificação que o Outlayr registra e que mostra um valor vai para o nosso provedor de IA para ler o estabelecimento, o valor e a moeda. O texto não é guardado.",
                    label: "Leitura de notificações do banco",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 3),
    },
    {
        changes: {
            en: [
                { detail: "Added to the plans, with how long a connection lasts.", label: "Notion connection in Pro" },
                {
                    detail: "Added to the AI features. Entries it logs are saved without a draft and marked for you to review.",
                    label: "Notification reading",
                },
            ],
            es: [
                {
                    detail: "Se suma a los planes, junto con cuánto dura una conexión.",
                    label: "Conexión con Notion en Pro",
                },
                {
                    detail: "Se suma a las funciones de IA. Las entradas que registra se guardan sin borrador y quedan marcadas para que las revises.",
                    label: "Lectura de notificaciones",
                },
            ],
            fr: [
                {
                    detail: "Ajoutée aux formules, avec la durée d'une connexion.",
                    label: "Connexion à Notion dans Pro",
                },
                {
                    detail: "Ajoutée aux fonctions d'IA. Les entrées qu'elle enregistre sont sauvegardées sans brouillon et signalées pour que vous les vérifiiez.",
                    label: "Lecture des notifications",
                },
            ],
            pt: [
                {
                    detail: "Adicionada aos planos, com quanto tempo dura uma conexão.",
                    label: "Conexão com o Notion no Pro",
                },
                {
                    detail: "Adicionada aos recursos de IA. Os lançamentos que ela registra são salvos sem rascunho e marcados para você revisar.",
                    label: "Leitura de notificações",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: Date.UTC(2026, 10, 3),
    },
    {
        changes: {
            en: [
                {
                    detail: "Friends you invite see your first name. You see theirs and how many days they logged, up to three, never what.",
                    label: "Invites",
                },
            ],
            es: [
                {
                    detail: "Los amigos que invitas ven tu nombre de pila. Tú ves el suyo y cuántos días registraron, hasta tres, nunca qué.",
                    label: "Invitaciones",
                },
            ],
            fr: [
                {
                    detail: "Les amis que vous invitez voient votre prénom. Vous voyez le leur et combien de jours ils ont saisi, jusqu'à trois, jamais quoi.",
                    label: "Invitations",
                },
            ],
            pt: [
                {
                    detail: "Os amigos que você convida veem seu primeiro nome. Você vê o deles e em quantos dias registraram, até três, nunca o quê.",
                    label: "Convites",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 4),
    },
    {
        changes: {
            en: [
                {
                    detail: "A friend gets a month of Pro, and you get one when they log three days. Up to 12 a year, no cash value.",
                    label: "Invites",
                },
            ],
            es: [
                {
                    detail: "Un amigo recibe un mes de Pro, y tú recibes uno cuando registra tres días. Hasta 12 al año, sin valor en efectivo.",
                    label: "Invitaciones",
                },
            ],
            fr: [
                {
                    detail: "Un ami reçoit un mois de Pro, et vous en recevez un quand il saisit trois jours. Jusqu'à 12 par an, sans valeur monétaire.",
                    label: "Invitations",
                },
            ],
            pt: [
                {
                    detail: "Um amigo ganha um mês de Pro, e você ganha um quando ele registra três dias. Até 12 por ano, sem valor em dinheiro.",
                    label: "Convites",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: Date.UTC(2026, 10, 4),
    },
    {
        changes: {
            en: [{ detail: "Cash, a bank account and a card now fit without Pro.", label: "3 free accounts" }],
            es: [
                {
                    detail: "El efectivo, una cuenta bancaria y una tarjeta ahora caben sin Pro.",
                    label: "3 cuentas gratis",
                },
            ],
            fr: [
                {
                    detail: "Les espèces, un compte bancaire et une carte tiennent désormais sans Pro.",
                    label: "3 comptes gratuits",
                },
            ],
            pt: [
                {
                    detail: "Dinheiro, uma conta bancária e um cartão agora cabem sem o Pro.",
                    label: "3 contas grátis",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: Date.UTC(2026, 10, 6),
    },
];

export const noticeKey = ({ document, effectiveAtMs }: typeof PolicyNotice.Type) => `${document}:${effectiveAtMs}`;
