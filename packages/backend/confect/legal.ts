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
            ],
            es: [
                {
                    detail: "Con Pro, importa desde tus bases de datos de Notion. Guardamos cifrada la clave de acceso de Notion hasta que la desconectes o elimines tu cuenta.",
                    label: "Conectar Notion",
                },
            ],
            fr: [
                {
                    detail: "Avec Pro, importez depuis vos bases de données Notion. Nous gardons la clé d'accès de Notion chiffrée jusqu'à ce que vous la déconnectiez ou supprimiez votre compte.",
                    label: "Connexion à Notion",
                },
            ],
            pt: [
                {
                    detail: "Com o Pro, importe das suas bases de dados do Notion. Guardamos a chave de acesso do Notion cifrada até você desconectar ou excluir a sua conta.",
                    label: "Conectar o Notion",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 16),
    },
    {
        changes: {
            en: [
                { detail: "Added to the plans, with how long a connection lasts.", label: "Notion connection in Pro" },
            ],
            es: [
                {
                    detail: "Se suma a los planes, junto con cuánto dura una conexión.",
                    label: "Conexión con Notion en Pro",
                },
            ],
            fr: [
                {
                    detail: "Ajoutée aux formules, avec la durée d'une connexion.",
                    label: "Connexion à Notion dans Pro",
                },
            ],
            pt: [
                {
                    detail: "Adicionada aos planos, com quanto tempo dura uma conexão.",
                    label: "Conexão com o Notion no Pro",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: Date.UTC(2026, 10, 16),
    },
];

export const noticeKey = ({ document, effectiveAtMs }: typeof PolicyNotice.Type) => `${document}:${effectiveAtMs}`;
