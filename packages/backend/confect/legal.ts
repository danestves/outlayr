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
    {
        changes: {
            en: [
                {
                    detail: "With Pro, a statement you choose goes to our server, and its text to our AI provider with long numbers masked, plus your name and address if printed. The file is then deleted. If you already allowed AI features, there's nothing to do and we won't ask again.",
                    label: "Reading PDF bank statements",
                },
                {
                    detail: "The app now asks our own server for logos. Logo.dev and Google no longer see your IP address.",
                    label: "Where logos come from",
                },
                {
                    detail: "With Pro, opening your ledger on the website saves an unencrypted copy in your browser so it loads faster. Signing out deletes it.",
                    label: "Website ledger",
                },
            ],
            es: [
                {
                    detail: "Con Pro, el estado de cuenta que elijas va a nuestro servidor, y su texto a nuestro proveedor de IA con los números largos ocultos, además de tu nombre y dirección si aparecen. Luego se borra el archivo. Si ya permitiste las funciones de IA, no tienes que hacer nada y no te lo volveremos a preguntar.",
                    label: "Lectura de estados de cuenta en PDF",
                },
                {
                    detail: "La app ahora le pide los logos a nuestro propio servidor. Logo.dev y Google ya no ven tu dirección IP.",
                    label: "De dónde vienen los logos",
                },
                {
                    detail: "Con Pro, al abrir tu registro en el sitio web se guarda una copia sin cifrar en tu navegador para que cargue más rápido. Al cerrar sesión se borra.",
                    label: "Registro en el sitio web",
                },
            ],
            fr: [
                {
                    detail: "Avec Pro, le relevé que vous choisissez va sur notre serveur, et son texte à notre fournisseur d'IA avec les longs numéros masqués, ainsi que votre nom et votre adresse s'ils y figurent. Le fichier est ensuite supprimé. Si vous avez déjà autorisé les fonctions d'IA, vous n'avez rien à faire et nous ne vous le redemanderons pas.",
                    label: "Lecture des relevés bancaires PDF",
                },
                {
                    detail: "L'app demande désormais les logos à notre propre serveur. Logo.dev et Google ne voient plus votre adresse IP.",
                    label: "D'où viennent les logos",
                },
                {
                    detail: "Avec Pro, ouvrir votre registre sur le site enregistre une copie non chiffrée dans votre navigateur pour charger plus vite. La déconnexion la supprime.",
                    label: "Registre sur le site",
                },
            ],
            pt: [
                {
                    detail: "Com o Pro, o extrato que você escolher vai para o nosso servidor, e o texto dele para o nosso provedor de IA com os números longos ocultos, além do seu nome e endereço se aparecerem. Depois o arquivo é apagado. Se você já permitiu os recursos de IA, não precisa fazer nada e não perguntaremos de novo.",
                    label: "Leitura de extratos bancários em PDF",
                },
                {
                    detail: "O app agora pede os logos ao nosso próprio servidor. A Logo.dev e o Google não veem mais o seu endereço IP.",
                    label: "De onde vêm os logos",
                },
                {
                    detail: "Com o Pro, abrir seu registro no site salva uma cópia sem criptografia no navegador para carregar mais rápido. Sair da conta a apaga.",
                    label: "Registro no site",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 6),
    },
    {
        changes: {
            en: [
                {
                    detail: "A website you add for a merchant, with its name and a general category, joins our shared merchant list so others see the logo. It isn't linked to you.",
                    label: "Adding a merchant's website",
                },
                {
                    detail: "We now email you before a material change to this policy or our Terms. Other changes, such as clearer wording, are only posted on the website.",
                    label: "When we email you about changes",
                },
            ],
            es: [
                {
                    detail: "El sitio web que agregues para un comercio, con su nombre y una categoría general, entra en nuestra lista compartida para que otros vean el logo. No está vinculado a ti.",
                    label: "Agregar el sitio web de un comercio",
                },
                {
                    detail: "Ahora te enviamos un correo antes de un cambio importante en esta política o nuestros Términos. Otros cambios, como una redacción más clara, solo se publican en el sitio web.",
                    label: "Cuándo te avisamos de cambios por correo",
                },
            ],
            fr: [
                {
                    detail: "Le site que vous ajoutez pour un commerçant, avec son nom et une catégorie générale, rejoint notre liste partagée pour que d'autres voient le logo. Il n'est pas lié à vous.",
                    label: "Ajouter le site d'un commerçant",
                },
                {
                    detail: "Nous vous envoyons désormais un e-mail avant un changement important de cette politique ou de nos Conditions. Les autres changements, comme une formulation plus claire, sont seulement publiés sur le site.",
                    label: "Quand nous vous écrivons au sujet des changements",
                },
            ],
            pt: [
                {
                    detail: "O site que você adicionar para um comerciante, com o nome e uma categoria geral, entra na nossa lista compartilhada para que outros vejam o logo. Ele não fica vinculado a você.",
                    label: "Adicionar o site de um comerciante",
                },
                {
                    detail: "Agora enviamos um e-mail antes de uma mudança importante nesta política ou nos nossos Termos. Outras mudanças, como uma redação mais clara, são apenas publicadas no site.",
                    label: "Quando avisamos sobre mudanças por e-mail",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 8),
    },
    {
        changes: {
            en: [
                {
                    detail: "A website you add for a merchant can be shared with everyone and stays on the shared list after you delete your account, until it expires.",
                    label: "Adding a merchant's website",
                },
            ],
            es: [
                {
                    detail: "El sitio web que agregues para un comercio se puede compartir con todos y sigue en la lista compartida después de que elimines tu cuenta, hasta que caduque.",
                    label: "Agregar el sitio web de un comercio",
                },
            ],
            fr: [
                {
                    detail: "Le site que vous ajoutez pour un commerçant peut être partagé avec tous et reste sur la liste partagée après la suppression de votre compte, jusqu'à son expiration.",
                    label: "Ajouter le site d'un commerçant",
                },
            ],
            pt: [
                {
                    detail: "O site que você adicionar para um comerciante pode ser compartilhado com todos e fica na lista compartilhada depois que você excluir sua conta, até expirar.",
                    label: "Adicionar o site de um comerciante",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: Date.UTC(2026, 10, 8),
    },
    {
        changes: {
            en: [
                {
                    detail: "The text of a bank statement PDF you import goes to Anthropic with long numbers masked, and can include your name and address.",
                    label: "Bank statement imports",
                },
                {
                    detail: "PostHog erases your analytics events in a later batch, so they can remain for a while after the app reports your account deleted.",
                    label: "Deleting your account",
                },
                {
                    detail: "An iCloud or Google backup of your phone can keep a copy of your ledger after you delete the app, and restore it if you reinstall.",
                    label: "Phone backups",
                },
            ],
            es: [
                {
                    detail: "El texto de un estado de cuenta en PDF que importes llega a Anthropic con los números largos ocultos, y puede incluir tu nombre y tu dirección.",
                    label: "Importar estados de cuenta",
                },
                {
                    detail: "PostHog borra tus eventos de analíticas en un lote posterior, así que pueden seguir ahí un tiempo después de que la app indique que tu cuenta se eliminó.",
                    label: "Eliminar tu cuenta",
                },
                {
                    detail: "Una copia de seguridad de tu celular en iCloud o Google puede conservar una copia de tu registro después de eliminar la app y restaurarla si la vuelves a instalar.",
                    label: "Copias de seguridad del celular",
                },
            ],
            fr: [
                {
                    detail: "Le texte d'un relevé bancaire PDF que vous importez est envoyé à Anthropic avec les longs numéros masqués, et peut inclure votre nom et votre adresse.",
                    label: "Import de relevés bancaires",
                },
                {
                    detail: "PostHog efface vos événements d'analyse lors d'un traitement ultérieur, ils peuvent donc subsister un moment après que l'app a indiqué la suppression de votre compte.",
                    label: "Suppression de votre compte",
                },
                {
                    detail: "Une sauvegarde iCloud ou Google de votre téléphone peut garder une copie de votre journal après la suppression de l'app, et la restaurer si vous la réinstallez.",
                    label: "Sauvegardes du téléphone",
                },
            ],
            pt: [
                {
                    detail: "O texto de um extrato bancário em PDF que você importar vai para a Anthropic com os números longos mascarados, e pode incluir seu nome e endereço.",
                    label: "Importar extratos bancários",
                },
                {
                    detail: "O PostHog apaga seus eventos de análise em um lote posterior, então eles podem continuar lá por um tempo depois que o app informar que sua conta foi excluída.",
                    label: "Excluir sua conta",
                },
                {
                    detail: "Um backup do seu celular no iCloud ou no Google pode guardar uma cópia dos seus lançamentos depois que você apagar o app, e restaurá-la se você reinstalar.",
                    label: "Backups do celular",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 9),
    },
];

export const noticeKey = ({ document, effectiveAtMs }: typeof PolicyNotice.Type) => `${document}:${effectiveAtMs}`;
