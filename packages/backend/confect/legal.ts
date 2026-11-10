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
                {
                    detail: "If you buy Pro on the web, Stripe receives your name, email, account ID, and the payment details you enter.",
                    label: "Stripe, for purchases on the web",
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
                {
                    detail: "Si compras Pro en la web, Stripe recibe tu nombre, correo, ID de cuenta y los datos de pago que escribas.",
                    label: "Stripe, para las compras en la web",
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
                {
                    detail: "Si vous achetez Pro sur le web, Stripe reçoit votre nom, votre e-mail, votre identifiant de compte et les données de paiement que vous saisissez.",
                    label: "Stripe, pour les achats sur le web",
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
                {
                    detail: "Se você comprar o Pro na web, a Stripe recebe seu nome, e-mail, ID de conta e os dados de pagamento que você informar.",
                    label: "Stripe, para as compras na web",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2026, 10, 9),
    },
    {
        changes: {
            en: [
                {
                    detail: "Web purchases are sold through Link, a Stripe service, which charges you and sends your receipts. You cancel in Settings › Plan on the web, and deleting your account cancels a web subscription.",
                    label: "Buying Pro on the web",
                },
            ],
            es: [
                {
                    detail: "Las compras en la web se venden a través de Link, un servicio de Stripe, que te cobra y te envía los recibos. Cancelas en Configuración › Plan en la web, y eliminar tu cuenta cancela una suscripción de la web.",
                    label: "Comprar Pro en la web",
                },
            ],
            fr: [
                {
                    detail: "Les achats sur le web sont vendus via Link, un service de Stripe, qui vous débite et vous envoie les reçus. Vous résiliez dans Réglages › Forfait sur le web, et supprimer votre compte résilie un abonnement acheté sur le web.",
                    label: "Acheter Pro sur le web",
                },
            ],
            pt: [
                {
                    detail: "As compras na web são vendidas pelo Link, um serviço da Stripe, que faz a cobrança e envia os recibos. Você cancela em Ajustes › Plano na web, e apagar sua conta cancela uma assinatura da web.",
                    label: "Comprar o Pro na web",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: Date.UTC(2026, 10, 9),
    },
    {
        changes: {
            en: [
                {
                    detail: "Changes that affect your data or rights get at least 30 days' notice in the app and by email, with at most one email a month unless a change can't wait. New optional features are described here from the day they ship and listed in the next email.",
                    label: "How we tell you about changes",
                },
                {
                    detail: "If you turn on the daily reminder in a web browser, our servers check whether you logged anything that day and send it through that browser's push service. It holds no amounts or entries.",
                    label: "Reminders on the web",
                },
                {
                    detail: "Rules you create on the web to file entries sync with your ledger: their names, what they look for, and the category and tags they set.",
                    label: "Rules on the web",
                },
                {
                    detail: "If you turn on a link for a report on the web, our servers keep a copy of that report, with percentages in place of amounts if you choose, and show it to anyone with the link until you turn it off, it expires, or you delete your account.",
                    label: "Sharing a report with a link",
                },
                {
                    detail: "If you start a Pro free trial on the web, we email you two days before the first charge with its date, the amount, and how to cancel.",
                    label: "A reminder before a trial ends",
                },
                {
                    detail: "Recurring charges you pause on the web, and until when, sync with your ledger, as do the repeating merchants you mark as not recurring.",
                    label: "Recurring on the web",
                },
            ],
            es: [
                {
                    detail: "Los cambios que afectan tus datos o derechos se avisan con al menos 30 días en la app y por correo, con un máximo de un correo al mes salvo que un cambio no pueda esperar. Las nuevas funciones opcionales se describen aquí desde el día en que se lanzan y se incluyen en el siguiente correo.",
                    label: "Cómo te avisamos de los cambios",
                },
                {
                    detail: "Si activas el recordatorio diario en un navegador web, nuestros servidores comprueban si registraste algo ese día y lo envían por el servicio push de ese navegador. No incluye montos ni movimientos.",
                    label: "Recordatorios en la web",
                },
                {
                    detail: "Las reglas que creas en la web para clasificar entradas se sincronizan con tu registro: su nombre, lo que buscan, y la categoría y las etiquetas que asignan.",
                    label: "Reglas en la web",
                },
                {
                    detail: "Si activas un enlace para un informe en la web, nuestros servidores guardan una copia de ese informe, con porcentajes en lugar de montos si lo prefieres, y la muestran a cualquiera que tenga el enlace hasta que lo desactives, caduque o borres tu cuenta.",
                    label: "Compartir un informe con un enlace",
                },
                {
                    detail: "Si empiezas una prueba gratis de Pro en la web, te enviamos un correo dos días antes del primer cobro con la fecha, el monto y cómo cancelar.",
                    label: "Un recordatorio antes de que termine la prueba",
                },
                {
                    detail: "Los cargos recurrentes que pausas en la web, y hasta cuándo, se sincronizan con tu registro, al igual que los comercios repetidos que marcas como no recurrentes.",
                    label: "Recurrentes en la web",
                },
            ],
            fr: [
                {
                    detail: "Les modifications qui touchent vos données ou vos droits sont annoncées au moins 30 jours à l'avance dans l'app et par e-mail, avec au plus un e-mail par mois sauf si une modification ne peut pas attendre. Les nouvelles fonctions facultatives sont décrites ici dès leur sortie et mentionnées dans le prochain e-mail.",
                    label: "Comment nous vous informons des modifications",
                },
                {
                    detail: "Si vous activez le rappel quotidien dans un navigateur web, nos serveurs vérifient si vous avez saisi quelque chose ce jour-là et l'envoient via le service push de ce navigateur. Il ne contient ni montants ni opérations.",
                    label: "Rappels sur le web",
                },
                {
                    detail: "Les règles que vous créez sur le web pour classer vos opérations sont synchronisées avec votre journal : leur nom, ce qu'elles recherchent, ainsi que la catégorie et les étiquettes qu'elles attribuent.",
                    label: "Règles sur le web",
                },
                {
                    detail: "Si vous activez un lien pour un rapport sur le web, nos serveurs gardent une copie de ce rapport, avec des pourcentages à la place des montants si vous le choisissez, et la montrent à toute personne disposant du lien jusqu'à ce que vous le désactiviez, qu'il expire ou que vous supprimiez votre compte.",
                    label: "Partager un rapport avec un lien",
                },
                {
                    detail: "Si vous commencez un essai gratuit de Pro sur le web, nous vous écrivons deux jours avant le premier paiement avec sa date, le montant et comment résilier.",
                    label: "Un rappel avant la fin de l'essai",
                },
                {
                    detail: "Les paiements récurrents que vous mettez en pause sur le web, et jusqu'à quand, sont synchronisés avec votre journal, tout comme les commerçants répétés que vous marquez comme non récurrents.",
                    label: "Paiements récurrents sur le web",
                },
            ],
            pt: [
                {
                    detail: "Mudanças que afetam seus dados ou direitos são avisadas com pelo menos 30 dias no app e por e-mail, com no máximo um e-mail por mês, a menos que uma mudança não possa esperar. Novos recursos opcionais são descritos aqui desde o dia em que são lançados e incluídos no próximo e-mail.",
                    label: "Como avisamos sobre mudanças",
                },
                {
                    detail: "Se você ativar o lembrete diário em um navegador web, nossos servidores verificam se você registrou algo naquele dia e enviam pelo serviço push desse navegador. Não inclui valores nem lançamentos.",
                    label: "Lembretes na web",
                },
                {
                    detail: "As regras que você cria na web para classificar lançamentos são sincronizadas com os seus lançamentos: o nome, o que procuram, e a categoria e as tags que atribuem.",
                    label: "Regras na web",
                },
                {
                    detail: "Se você ativar um link para um relatório na web, nossos servidores guardam uma cópia desse relatório, com porcentagens no lugar dos valores se você preferir, e a mostram a qualquer pessoa com o link até você desativá-lo, ele expirar ou você excluir sua conta.",
                    label: "Compartilhar um relatório com um link",
                },
                {
                    detail: "Se você começar um teste grátis do Pro na web, enviamos um e-mail dois dias antes da primeira cobrança com a data, o valor e como cancelar.",
                    label: "Um lembrete antes do fim do teste",
                },
                {
                    detail: "As cobranças recorrentes que você pausa na web, e até quando, são sincronizadas com os seus lançamentos, assim como os estabelecimentos repetidos que você marca como não recorrentes.",
                    label: "Recorrentes na web",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: Date.UTC(2027, 0, 1),
    },
    {
        changes: {
            en: [
                {
                    detail: "A material change gets at least 30 days' notice in the app and by email. A new optional feature can apply from the day it ships, and a new account follows the version posted when it signs up.",
                    label: "How these terms change",
                },
            ],
            es: [
                {
                    detail: "Un cambio sustancial se avisa con al menos 30 días en la app y por correo. Una nueva función opcional puede aplicarse desde el día en que se lanza, y una cuenta nueva se rige por la versión publicada al registrarse.",
                    label: "Cómo cambian estos términos",
                },
            ],
            fr: [
                {
                    detail: "Une modification importante est annoncée au moins 30 jours à l'avance dans l'app et par e-mail. Une nouvelle fonction facultative peut s'appliquer dès sa sortie, et un nouveau compte suit la version publiée au moment de son inscription.",
                    label: "Comment ces conditions changent",
                },
            ],
            pt: [
                {
                    detail: "Uma mudança relevante é avisada com pelo menos 30 dias no app e por e-mail. Um novo recurso opcional pode valer desde o dia em que é lançado, e uma conta nova segue a versão publicada ao ser criada.",
                    label: "Como estes termos mudam",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: Date.UTC(2027, 0, 1),
    },
];

export const noticeKey = ({ document, effectiveAtMs }: typeof PolicyNotice.Type) => `${document}:${effectiveAtMs}`;
