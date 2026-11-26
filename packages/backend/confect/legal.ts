import * as Schema from "effect/Schema";

export const LegalDocument = Schema.Literals(["privacy", "terms"]);

const Changes = Schema.Array(Schema.Struct({ detail: Schema.optional(Schema.String), label: Schema.String }));

export const PolicyNotice = Schema.Struct({
    changes: Schema.Struct({ en: Changes, de: Changes, es: Changes, fr: Changes, pt: Changes }),
    document: LegalDocument,
    effectiveAtMs: Schema.Number,
    postedAtMs: Schema.Number,
});

export type PolicyNotice = typeof PolicyNotice.Type;

export const NOVEMBER_NOTICE_AT_MS = Date.UTC(2026, 10, 19);

export const CAPTURE_PUSH_EFFECTIVE_AT_MS = NOVEMBER_NOTICE_AT_MS;

export const JANUARY_NOTICE_AT_MS = Date.UTC(2027, 0, 1);

// Nothing is received or sent for a user webhook before the privacy notice that announces them takes effect.
export const WEBHOOKS_EFFECTIVE_AT_MS = JANUARY_NOTICE_AT_MS;

export const REMINDER_ANALYTICS_AT_MS = JANUARY_NOTICE_AT_MS;

export const VOICE_KEYTERMS_AT_MS = JANUARY_NOTICE_AT_MS;

export const TOUR_ANALYTICS_AT_MS = JANUARY_NOTICE_AT_MS;

export const AUTOLOG_ANALYTICS_AT_MS = JANUARY_NOTICE_AT_MS;

export const ONBOARDING_ANALYTICS_AT_MS = JANUARY_NOTICE_AT_MS;

export const WEB_ANALYTICS_AT_MS = JANUARY_NOTICE_AT_MS;

const GUEST_PURCHASE_AT_MS = Date.UTC(2026, 10, 21);
const PROFILES_AT_MS = JANUARY_NOTICE_AT_MS;

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
            de: [
                {
                    detail: "Eine Willkommensnachricht bei der Anmeldung, eine Nachricht, wenn Pro beginnt, und Hinweise wie dieser, bevor sich eine Richtlinie ändert.",
                    label: "E-Mails zu deinem Konto",
                },
                {
                    detail: "Wird mit deinem Konto gespeichert, damit diese E-Mails in deiner Sprache ankommen.",
                    label: "Die Sprache der App",
                },
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
        postedAtMs: Date.UTC(2026, 10, 2),
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
            de: [
                {
                    detail: "Mit Pro importierst du aus deinen Notion-Datenbanken. Den Zugriffsschlüssel von Notion bewahren wir verschlüsselt auf, bis du die Verbindung trennst oder dein Konto löschst.",
                    label: "Notion verbinden",
                },
                {
                    detail: "Mit eingeschaltetem „Analysedaten teilen“: angelegte Budgets, geteilte Karten, Importe, Exporte, Änderungen an Einstellungen und Links, die die App öffnen. Nie Beträge, Namen oder Notizen.",
                    label: "Welche Funktionen du nutzt",
                },
                {
                    detail: "Mit eingeschaltetem „Intelligentes Ausfüllen“ geht eine Benachrichtigung, die Outlayr erfasst und die einen Betrag zeigt, an unseren KI-Anbieter, damit er Händler, Betrag und Währung lesen kann. Ihr Text wird nicht gespeichert.",
                    label: "Lesen von Bank-Benachrichtigungen",
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
        postedAtMs: Date.UTC(2026, 10, 3),
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
            de: [
                {
                    detail: "Zu den Plänen hinzugefügt, mit der Angabe, wie lange eine Verbindung besteht.",
                    label: "Notion-Verbindung in Pro",
                },
                {
                    detail: "Zu den KI-Funktionen hinzugefügt. Einträge, die dabei erfasst werden, werden ohne Entwurf gespeichert und zur Prüfung für dich markiert.",
                    label: "Lesen von Benachrichtigungen",
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
        postedAtMs: Date.UTC(2026, 10, 3),
    },
    {
        changes: {
            en: [
                {
                    detail: "Friends you invite see your first name. You see theirs and how many days they logged, up to three, never what.",
                    label: "Invites",
                },
            ],
            de: [
                {
                    detail: "Freunde, die du einlädst, sehen deinen Vornamen. Du siehst ihren und an wie vielen Tagen sie etwas erfasst haben, bis zu drei, nie was.",
                    label: "Einladungen",
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
        postedAtMs: Date.UTC(2026, 10, 4),
    },
    {
        changes: {
            en: [
                {
                    detail: "A friend gets a month of Pro, and you get one when they log three days. Up to 12 a year, no cash value.",
                    label: "Invites",
                },
            ],
            de: [
                {
                    detail: "Ein Freund erhält einen Monat Pro, und du bekommst einen, wenn er an drei Tagen etwas erfasst. Bis zu 12 im Jahr, ohne Barwert.",
                    label: "Einladungen",
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
        postedAtMs: Date.UTC(2026, 10, 4),
    },
    {
        changes: {
            en: [{ detail: "Cash, a bank account and a card now fit without Pro.", label: "3 free accounts" }],
            de: [
                {
                    detail: "Bargeld, ein Bankkonto und eine Karte passen jetzt auch ohne Pro.",
                    label: "3 kostenlose Konten",
                },
            ],
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
        postedAtMs: Date.UTC(2026, 10, 6),
    },
    {
        changes: {
            en: [
                {
                    detail: "With Pro, a statement you choose goes to our server, and its text to our AI provider with long numbers masked. Your name and address, if printed, are sent unmasked. The file is then deleted. If you already allowed AI features, there's nothing to do and we won't ask again.",
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
            de: [
                {
                    detail: "Mit Pro geht ein Kontoauszug, den du auswählst, an unseren Server und sein Text mit maskierten langen Zahlen an unseren KI-Anbieter. Der Text enthält deinen Namen und deine Adresse, falls sie aufgedruckt sind. Die Datei wird danach gelöscht. Wenn du KI-Funktionen schon erlaubt hast, musst du nichts tun, und wir fragen nicht noch einmal.",
                    label: "Lesen von PDF-Kontoauszügen",
                },
                {
                    detail: "Die App holt Logos jetzt von unserem eigenen Server. Logo.dev und Google sehen deine IP-Adresse nicht mehr.",
                    label: "Woher Logos kommen",
                },
                {
                    detail: "Mit Pro speichert das Öffnen deines Journals auf der Website eine unverschlüsselte Kopie in deinem Browser, damit es schneller lädt. Beim Abmelden wird sie gelöscht.",
                    label: "Journal auf der Website",
                },
            ],
            es: [
                {
                    detail: "Con Pro, el estado de cuenta que elijas va a nuestro servidor, y su texto a nuestro proveedor de IA con los números largos ocultos, e incluye tu nombre y dirección si aparecen. Luego se borra el archivo. Si ya permitiste las funciones de IA, no tienes que hacer nada y no te lo volveremos a preguntar.",
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
                    detail: "Avec Pro, le relevé que vous choisissez va sur notre serveur, et son texte à notre fournisseur d'IA avec les longs numéros masqués. Votre nom et votre adresse, s'ils y figurent, sont envoyés sans masquage. Le fichier est ensuite supprimé. Si vous avez déjà autorisé les fonctions d'IA, vous n'avez rien à faire et nous ne vous le redemanderons pas.",
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
                    detail: "Com o Pro, o extrato que você escolher vai para o nosso servidor, e o texto dele para o nosso provedor de IA com os números longos ocultos. Seu nome e endereço, se aparecerem, são enviados sem ocultar. Depois o arquivo é apagado. Se você já permitiu os recursos de IA, não precisa fazer nada e não perguntaremos de novo.",
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
        postedAtMs: Date.UTC(2026, 10, 6),
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
            de: [
                {
                    detail: "Eine Website, die du für einen Händler hinzufügst, kommt mit seinem Namen und einer allgemeinen Kategorie in unsere geteilte Händlerliste, damit andere das Logo sehen. Sie ist nicht mit dir verknüpft.",
                    label: "Website eines Händlers hinzufügen",
                },
                {
                    detail: "Wir schreiben dir jetzt per E-Mail, bevor sich diese Richtlinie oder unsere Bedingungen wesentlich ändern. Andere Änderungen, etwa klarere Formulierungen, veröffentlichen wir nur auf der Website.",
                    label: "Wann wir dir wegen Änderungen schreiben",
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
        postedAtMs: Date.UTC(2026, 10, 8),
    },
    {
        changes: {
            en: [
                {
                    detail: "A website you add for a merchant can be shared with everyone and stays on the shared list after you delete your account, until it expires.",
                    label: "Adding a merchant's website",
                },
            ],
            de: [
                {
                    detail: "Eine Website, die du für einen Händler hinzufügst, kann mit allen geteilt werden und bleibt nach dem Löschen deines Kontos auf der geteilten Liste, bis sie abläuft.",
                    label: "Website eines Händlers hinzufügen",
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
        postedAtMs: Date.UTC(2026, 10, 8),
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
            de: [
                {
                    detail: "Der Text eines PDF-Kontoauszugs, den du importierst, geht mit maskierten langen Zahlen an Anthropic und kann deinen Namen und deine Adresse enthalten.",
                    label: "Import von Kontoauszügen",
                },
                {
                    detail: "PostHog löscht deine Analyse-Ereignisse in einem späteren Durchlauf, sie können also noch eine Weile bestehen bleiben, nachdem die App dein Konto als gelöscht meldet.",
                    label: "Dein Konto löschen",
                },
                {
                    detail: "Eine iCloud- oder Google-Sicherung deines Handys kann eine Kopie deines Journals behalten, nachdem du die App gelöscht hast, und sie wiederherstellen, wenn du sie neu installierst.",
                    label: "Handy-Sicherungen",
                },
                {
                    detail: "Wenn du Pro im Web kaufst, erhält Stripe deinen Namen, deine E-Mail-Adresse, deine Konto-ID und die Zahlungsdaten, die du eingibst.",
                    label: "Stripe, für Käufe im Web",
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
        postedAtMs: Date.UTC(2026, 10, 9),
    },
    {
        changes: {
            en: [
                {
                    detail: "Web purchases are sold through Link, a Stripe service, which charges you and sends your receipts. You cancel in Settings › Plan on the web, and deleting your account cancels a web subscription.",
                    label: "Buying Pro on the web",
                },
            ],
            de: [
                {
                    detail: "Web-Käufe werden über Link verkauft, einen Dienst von Stripe, der dich belastet und dir deine Belege schickt. Du kündigst im Web unter Einstellungen › Plan, und das Löschen deines Kontos kündigt ein Web-Abo.",
                    label: "Pro im Web kaufen",
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
        postedAtMs: Date.UTC(2026, 10, 9),
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
                {
                    detail: "After your first entry, the app and this website can ask where you heard about Outlayr. Answering is optional, and your answer goes to PostHog with the rest of the analytics.",
                    label: "Where you heard about us",
                },
                {
                    detail: "Our servers now build each website page from your synced ledger, so your browser no longer keeps a copy of it. An entry you save waits in your browser only until our servers confirm it, and signing out deletes it.",
                    label: "Your ledger on the website",
                },
                {
                    detail: "When you import data into your ledger on this website, it tells PostHog the kind of import and how many rows it brought in, rounded to a range such as 10 to 99, as the app already does.",
                    label: "Imports on the web",
                },
                {
                    detail: "On Android, text messages now have a switch for each sender instead of one for the whole app. Short codes, the kind banks send from, start on once you turn bank texts on, and names and phone numbers stay off until you turn each one on. The phone keeps the latest text from each sender, and a text is sent to be read without the sender's name or number.",
                    label: "Bank text messages on Android",
                },
                {
                    detail: "Voice entry now sends the audio to ElevenLabs as you talk, through our server on Cloudflare, which keeps none of it. The text then goes to our server with your account and category names, as before.",
                    label: "Voice entry while you speak",
                },
                {
                    detail: "In the icon picker you can paste a link to a website or an image. Our logo server fetches that logo or image and keeps a copy, and when you save the entry, the merchant name and that logo join the shared merchant list so other people who log that merchant see it. It isn't linked to you.",
                    label: "Logos from a link",
                },
                {
                    detail: "You earn a month when a friend you invited buys Pro, instead of when they log on three days. You see whether they bought it, never what they paid.",
                    label: "Invites",
                },
                {
                    detail: "You can choose up to 5 screenshots at once, and each order on them becomes its own plan. Along with them we send the names of your cards and loans, so each plan goes into the right one, and Claude also reads each order's name.",
                    label: "Installment plan import",
                },
                {
                    detail: "With Smart fill on, a merchant Outlayr doesn't recognize is sent the moment you pay. If the answer takes a few seconds, it reaches your iPhone through Apple's push service, encrypted so Apple can't read it, and we keep your iPhone's push address until you turn Smart fill off, sign out, or delete your account.",
                    label: "Apple Pay purchases",
                },
            ],
            de: [
                {
                    detail: "Änderungen, die deine Daten oder Rechte betreffen, kündigen wir mindestens 30 Tage vorher in der App und per E-Mail an, mit höchstens einer E-Mail im Monat, außer eine Änderung kann nicht warten. Neue optionale Funktionen werden hier ab dem Tag ihrer Veröffentlichung beschrieben und in der nächsten E-Mail aufgeführt.",
                    label: "Wie wir dich über Änderungen informieren",
                },
                {
                    detail: "Wenn du die tägliche Erinnerung in einem Webbrowser einschaltest, prüfen unsere Server, ob du an diesem Tag etwas erfasst hast, und senden sie über den Push-Dienst dieses Browsers. Sie enthält keine Beträge oder Einträge.",
                    label: "Erinnerungen im Web",
                },
                {
                    detail: "Regeln, die du im Web anlegst, um Einträge zuzuordnen, werden mit deinem Journal synchronisiert: ihre Namen, wonach sie suchen und die Kategorie und Tags, die sie setzen.",
                    label: "Regeln im Web",
                },
                {
                    detail: "Wenn du im Web einen Link für einen Bericht einschaltest, bewahren unsere Server eine Kopie dieses Berichts auf, auf Wunsch mit Prozenten statt Beträgen, und zeigen sie jedem mit dem Link, bis du ihn ausschaltest, er abläuft oder du dein Konto löschst.",
                    label: "Bericht per Link teilen",
                },
                {
                    detail: "Wenn du im Web eine kostenlose Pro-Testphase startest, schreiben wir dir zwei Tage vor der ersten Abbuchung per E-Mail mit Datum, Betrag und dem Weg zur Kündigung.",
                    label: "Eine Erinnerung vor dem Ende einer Testphase",
                },
                {
                    detail: "Wiederkehrende Zahlungen, die du im Web pausierst, und bis wann, werden mit deinem Journal synchronisiert, ebenso Händler mit wiederholten Zahlungen, die du als nicht wiederkehrend markierst.",
                    label: "Wiederkehrendes im Web",
                },
                {
                    detail: "Nach deinem ersten Eintrag können die App und diese Website fragen, woher du Outlayr kennst. Die Antwort ist freiwillig und geht mit den übrigen Analysedaten an PostHog.",
                    label: "Woher du uns kennst",
                },
                {
                    detail: "Unsere Server bauen jede Seite der Website jetzt aus deinem synchronisierten Haushaltsbuch, daher behält dein Browser keine Kopie mehr davon. Ein Eintrag, den du speicherst, wartet nur so lange in deinem Browser, bis unsere Server ihn bestätigen, und beim Abmelden wird er gelöscht.",
                    label: "Dein Haushaltsbuch auf der Website",
                },
                {
                    detail: "Wenn du auf dieser Website Daten in dein Journal importierst, teilt sie PostHog die Art des Imports mit und wie viele Zeilen er gebracht hat, gerundet auf einen Bereich wie 10 bis 99, wie es die App schon tut.",
                    label: "Importe im Web",
                },
                {
                    detail: "Auf Android hat jetzt jeder Absender einen eigenen Schalter für Textnachrichten, statt eines einzigen für die ganze App. Kurznummern, von denen Banken senden, sind eingeschaltet, sobald du Bank-SMS einschaltest, und Namen und Telefonnummern bleiben aus, bis du jede einzeln einschaltest. Das Handy behält die neueste Nachricht jedes Absenders, und eine Nachricht wird ohne Namen oder Nummer des Absenders zum Lesen gesendet.",
                    label: "Bank-SMS auf Android",
                },
                {
                    detail: "Die Spracheingabe sendet das Audio jetzt schon beim Sprechen an ElevenLabs, über unseren Server bei Cloudflare, der nichts davon speichert. Der Text geht dann wie bisher mit deinen Konto- und Kategorienamen an unseren Server.",
                    label: "Spracheingabe während du sprichst",
                },
                {
                    detail: "In der Symbolauswahl kannst du einen Link zu einer Website oder einem Bild einfügen. Unser Logo-Server holt dieses Logo oder Bild und behält eine Kopie, und wenn du den Eintrag speicherst, kommen der Händlername und dieses Logo in die geteilte Händlerliste, damit andere Personen, die diesen Händler erfassen, es sehen. Es ist nicht mit dir verknüpft.",
                    label: "Logos aus einem Link",
                },
                {
                    detail: "Du bekommst einen Monat, wenn ein eingeladener Freund Pro kauft, statt wenn er an drei Tagen erfasst. Du siehst, ob er es gekauft hat, nie, was er bezahlt hat.",
                    label: "Einladungen",
                },
                {
                    detail: "Du kannst bis zu 5 Screenshots auf einmal wählen, und jede Bestellung darauf wird ein eigener Plan. Dazu senden wir die Namen deiner Karten und Kredite, damit jeder Plan im richtigen landet, und Claude liest auch den Namen jeder Bestellung.",
                    label: "Import von Ratenplänen",
                },
                {
                    detail: "Bei eingeschaltetem „Intelligentes Ausfüllen“ wird ein Händler, den Outlayr nicht kennt, sofort beim Bezahlen gesendet. Dauert die Antwort ein paar Sekunden, kommt sie über Apples Push-Dienst auf dein iPhone, verschlüsselt, sodass Apple sie nicht lesen kann, und wir speichern die Push-Adresse deines iPhones, bis du „Intelligentes Ausfüllen“ ausschaltest, dich abmeldest oder dein Konto löschst.",
                    label: "Apple-Pay-Käufe",
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
                {
                    detail: "Después de tu primera entrada, la app y este sitio web pueden preguntarte dónde supiste de Outlayr. Responder es opcional, y tu respuesta va a PostHog con el resto de las analíticas.",
                    label: "Dónde supiste de nosotros",
                },
                {
                    detail: "Nuestros servidores ahora arman cada página del sitio web a partir de tu registro sincronizado, así que tu navegador ya no guarda una copia. Una entrada que guardas espera en tu navegador solo hasta que nuestros servidores la confirman, y al cerrar sesión se borra.",
                    label: "Tu registro en el sitio web",
                },
                {
                    detail: "Cuando importas datos a tu registro en este sitio web, le dice a PostHog el tipo de importación y cuántas filas trajo, redondeado a un rango como de 10 a 99, como ya lo hace la app.",
                    label: "Importaciones en la web",
                },
                {
                    detail: "En Android, los mensajes de texto ahora tienen un interruptor por remitente en vez de uno para toda la app. Cuando activas los mensajes del banco, los números cortos, como los que usan los bancos, vienen activados, y los nombres y números de teléfono quedan desactivados hasta que actives cada uno. El celular guarda el último mensaje de cada remitente, y el texto se envía a leer sin el nombre ni el número del remitente.",
                    label: "Mensajes de texto del banco en Android",
                },
                {
                    detail: "La entrada por voz ahora envía el audio a ElevenLabs mientras hablas, a través de nuestro servidor en Cloudflare, que no conserva nada. Luego el texto va a nuestro servidor con los nombres de tus cuentas y categorías, como antes.",
                    label: "Entrada por voz mientras hablas",
                },
                {
                    detail: "En el selector de ícono puedes pegar un enlace a un sitio web o a una imagen. Nuestro servidor de logos busca ese logo o esa imagen y guarda una copia, y al guardar la entrada, el nombre del comercio y ese logo se suman a la lista compartida de comercios para que otras personas que registren ese comercio lo vean. No se vincula contigo.",
                    label: "Logos desde un enlace",
                },
                {
                    detail: "Ganas un mes cuando un amigo que invitaste compra Pro, en lugar de cuando registra en tres días. Ves si lo compró, nunca cuánto pagó.",
                    label: "Invitaciones",
                },
                {
                    detail: "Puedes elegir hasta 5 capturas a la vez, y cada compra que aparece en ellas se vuelve su propio plan. Junto con ellas enviamos los nombres de tus tarjetas y préstamos, para que cada plan quede en la correcta, y Claude también lee el nombre de cada compra.",
                    label: "Importación de planes de cuotas",
                },
                {
                    detail: "Con Autocompletado activado, un comercio que Outlayr no reconoce se envía en el momento en que pagas. Si la respuesta tarda unos segundos, llega a tu iPhone por el servicio push de Apple, cifrada para que Apple no pueda leerla, y guardamos la dirección push de tu iPhone hasta que desactives Autocompletado, cierres sesión o borres tu cuenta.",
                    label: "Compras con Apple Pay",
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
                {
                    detail: "Après votre première opération, l'app et ce site web peuvent vous demander comment vous avez connu Outlayr. Répondre est facultatif, et votre réponse est envoyée à PostHog avec le reste des analyses.",
                    label: "Comment vous nous avez connus",
                },
                {
                    detail: "Nos serveurs construisent désormais chaque page du site web à partir de votre journal synchronisé : votre navigateur n’en garde donc plus de copie. Une opération que vous enregistrez attend dans votre navigateur seulement jusqu’à ce que nos serveurs la confirment, et se déconnecter la supprime.",
                    label: "Votre journal sur le site web",
                },
                {
                    detail: "Quand vous importez des données dans votre journal sur ce site web, il indique à PostHog le type d'import et combien de lignes il a ajoutées, arrondi à une fourchette comme 10 à 99, comme le fait déjà l'app.",
                    label: "Imports sur le web",
                },
                {
                    detail: "Sur Android, les SMS ont désormais un interrupteur par expéditeur plutôt qu'un seul pour toute l'app. Une fois les SMS de la banque activés, les numéros courts, comme ceux qu'utilisent les banques, sont activés au départ, et les noms et numéros de téléphone restent désactivés jusqu'à ce que vous activiez chacun d'eux. Le téléphone conserve le dernier SMS de chaque expéditeur, et le texte est envoyé pour lecture sans le nom ni le numéro de l'expéditeur.",
                    label: "SMS de la banque sur Android",
                },
                {
                    detail: "La saisie vocale envoie désormais l'audio à ElevenLabs pendant que vous parlez, via notre serveur sur Cloudflare, qui n'en garde rien. Le texte part ensuite vers notre serveur avec les noms de vos comptes et catégories, comme avant.",
                    label: "Saisie vocale pendant que vous parlez",
                },
                {
                    detail: "Dans le sélecteur d'icône, vous pouvez coller un lien vers un site web ou une image. Notre serveur de logos récupère ce logo ou cette image et en garde une copie, et quand vous enregistrez l'opération, le nom du commerçant et ce logo rejoignent la liste partagée des commerçants pour que les autres personnes qui enregistrent ce commerçant le voient. Ce n'est pas lié à vous.",
                    label: "Des logos à partir d'un lien",
                },
                {
                    detail: "Vous gagnez un mois quand un ami que vous avez invité achète Pro, au lieu de quand il saisit des opérations trois jours. Vous voyez s'il l'a acheté, jamais ce qu'il a payé.",
                    label: "Invitations",
                },
                {
                    detail: "Vous pouvez choisir jusqu'à 5 captures d'écran à la fois, et chaque commande qui y figure devient son propre échéancier. Nous envoyons avec elles les noms de vos cartes et prêts, pour que chaque échéancier aille dans le bon, et Claude lit aussi le nom de chaque commande.",
                    label: "Import d'échéanciers",
                },
                {
                    detail: "Avec le Remplissage intelligent activé, un commerçant qu'Outlayr ne reconnaît pas est envoyé au moment où vous payez. Si la réponse prend quelques secondes, elle arrive sur votre iPhone via le service push d'Apple, chiffrée pour qu'Apple ne puisse pas la lire, et nous gardons l'adresse push de votre iPhone jusqu'à ce que vous désactiviez le Remplissage intelligent, vous déconnectiez ou supprimiez votre compte.",
                    label: "Achats Apple Pay",
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
                {
                    detail: "Depois do seu primeiro lançamento, o app e este site podem perguntar onde você conheceu o Outlayr. Responder é opcional, e sua resposta vai para o PostHog com o resto das análises.",
                    label: "Onde você nos conheceu",
                },
                {
                    detail: "Nossos servidores agora montam cada página do site a partir dos seus lançamentos sincronizados, então seu navegador não guarda mais uma cópia deles. Um lançamento que você salva espera no seu navegador só até nossos servidores confirmá-lo, e sair da conta o apaga.",
                    label: "Seus lançamentos no site",
                },
                {
                    detail: "Quando você importa dados para seu livro-caixa neste site, ele informa ao PostHog o tipo de importação e quantas linhas ela trouxe, arredondado a uma faixa como de 10 a 99, como o app já faz.",
                    label: "Importações na web",
                },
                {
                    detail: "No Android, as mensagens de texto agora têm um interruptor por remetente em vez de um para o app inteiro. Quando você ativa as mensagens do banco, os números curtos, como os que os bancos usam, começam ativados, e nomes e números de telefone ficam desativados até você ativar cada um. O celular guarda a mensagem mais recente de cada remetente, e o texto é enviado para leitura sem o nome nem o número do remetente.",
                    label: "Mensagens de texto do banco no Android",
                },
                {
                    detail: "O lançamento por voz agora envia o áudio à ElevenLabs enquanto você fala, pelo nosso servidor na Cloudflare, que não guarda nada. Depois o texto vai ao nosso servidor com os nomes das suas contas e categorias, como antes.",
                    label: "Lançamento por voz enquanto você fala",
                },
                {
                    detail: "No seletor de ícone você pode colar um link para um site ou uma imagem. Nosso servidor de logos busca esse logo ou essa imagem e guarda uma cópia, e quando você salva o lançamento, o nome do estabelecimento e esse logo entram na lista compartilhada de estabelecimentos para que outras pessoas que registram esse estabelecimento o vejam. Não é vinculado a você.",
                    label: "Logos a partir de um link",
                },
                {
                    detail: "Você ganha um mês quando um amigo que você convidou compra o Pro, em vez de quando ele registra em três dias. Você vê se ele comprou, nunca quanto pagou.",
                    label: "Convites",
                },
                {
                    detail: "Você pode escolher até 5 capturas de tela de uma vez, e cada pedido nelas vira um parcelamento próprio. Junto com elas enviamos os nomes dos seus cartões e empréstimos, para que cada parcelamento vá para o certo, e o Claude também lê o nome de cada pedido.",
                    label: "Importação de parcelamentos",
                },
                {
                    detail: "Com o Preenchimento inteligente ativado, um estabelecimento que o Outlayr não reconhece é enviado no momento em que você paga. Se a resposta levar alguns segundos, ela chega ao seu iPhone pelo serviço push da Apple, criptografada para que a Apple não consiga ler, e guardamos o endereço push do seu iPhone até você desativar o Preenchimento inteligente, sair da conta ou excluir sua conta.",
                    label: "Compras com Apple Pay",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: NOVEMBER_NOTICE_AT_MS,
        postedAtMs: Date.UTC(2026, 10, 18),
    },
    {
        changes: {
            en: [
                {
                    detail: "A material change gets at least 30 days' notice in the app and by email. A new optional feature can apply from the day it ships, and a new account follows the version posted when it signs up.",
                    label: "How these terms change",
                },
                {
                    detail: "If you paste a link to an image, you confirm you have the right to share it. We show it to everyone who logs that merchant and may remove it at any time.",
                    label: "Images you paste",
                },
                {
                    detail: "You get a month when a friend you invited buys Pro, monthly, yearly or lifetime, instead of when they log on three days. A free trial, a refunded purchase, or a month from an invite doesn't count.",
                    label: "Months from invites",
                },
                {
                    detail: "One import of up to 5 screenshots counts as one capture.",
                    label: "Installment plan import",
                },
            ],
            de: [
                {
                    detail: "Eine wesentliche Änderung kündigen wir mindestens 30 Tage vorher in der App und per E-Mail an. Eine neue optionale Funktion kann ab dem Tag ihrer Veröffentlichung gelten, und ein neues Konto folgt der Fassung, die bei der Anmeldung veröffentlicht ist.",
                    label: "Wie sich diese Bedingungen ändern",
                },
                {
                    detail: "Wenn du einen Link zu einem Bild einfügst, bestätigst du, dass du das Recht hast, es zu teilen. Wir zeigen es allen, die diesen Händler erfassen, und können es jederzeit entfernen.",
                    label: "Eingefügte Bilder",
                },
                {
                    detail: "Du bekommst einen Monat, wenn ein eingeladener Freund Pro kauft, monatlich, jährlich oder auf Lebenszeit, statt wenn er an drei Tagen erfasst. Eine Testphase, ein erstatteter Kauf oder ein Monat aus einer Einladung zählt nicht.",
                    label: "Monate aus Einladungen",
                },
                {
                    detail: "Ein Import mit bis zu 5 Screenshots zählt als eine Erfassung.",
                    label: "Import von Ratenplänen",
                },
            ],
            es: [
                {
                    detail: "Un cambio sustancial se avisa con al menos 30 días en la app y por correo. Una nueva función opcional puede aplicarse desde el día en que se lanza, y una cuenta nueva se rige por la versión publicada al registrarse.",
                    label: "Cómo cambian estos términos",
                },
                {
                    detail: "Si pegas un enlace a una imagen, confirmas que tienes derecho a compartirla. La mostramos a todas las personas que registren ese comercio y podemos eliminarla en cualquier momento.",
                    label: "Imágenes que pegas",
                },
                {
                    detail: "Recibes un mes cuando un amigo que invitaste compra Pro, mensual, anual o de por vida, en lugar de cuando registra en tres días. Una prueba gratis, una compra reembolsada o un mes por invitación no cuenta.",
                    label: "Meses por invitaciones",
                },
                {
                    detail: "Una importación de hasta 5 capturas cuenta como una captura.",
                    label: "Importación de planes de cuotas",
                },
            ],
            fr: [
                {
                    detail: "Une modification importante est annoncée au moins 30 jours à l'avance dans l'app et par e-mail. Une nouvelle fonction facultative peut s'appliquer dès sa sortie, et un nouveau compte suit la version publiée au moment de son inscription.",
                    label: "Comment ces conditions changent",
                },
                {
                    detail: "Si vous collez un lien vers une image, vous confirmez avoir le droit de la partager. Nous la montrons à toutes les personnes qui enregistrent ce commerçant et pouvons la supprimer à tout moment.",
                    label: "Les images que vous collez",
                },
                {
                    detail: "Vous recevez un mois quand un ami que vous avez invité achète Pro, mensuel, annuel ou à vie, au lieu de quand il saisit des opérations trois jours. Un essai gratuit, un achat remboursé ou un mois obtenu par invitation ne compte pas.",
                    label: "Mois obtenus par invitation",
                },
                {
                    detail: "Un import d'au plus 5 captures d'écran compte comme une capture.",
                    label: "Import d'échéanciers",
                },
            ],
            pt: [
                {
                    detail: "Uma mudança relevante é avisada com pelo menos 30 dias no app e por e-mail. Um novo recurso opcional pode valer desde o dia em que é lançado, e uma conta nova segue a versão publicada ao ser criada.",
                    label: "Como estes termos mudam",
                },
                {
                    detail: "Se você colar um link para uma imagem, confirma que tem direito de compartilhá-la. Nós a mostramos a todos que registram esse estabelecimento e podemos removê-la a qualquer momento.",
                    label: "Imagens que você cola",
                },
                {
                    detail: "Você ganha um mês quando um amigo que você convidou compra o Pro, mensal, anual ou vitalício, em vez de quando ele registra em três dias. Um teste grátis, uma compra reembolsada ou um mês de convite não conta.",
                    label: "Meses por convites",
                },
                {
                    detail: "Uma importação de até 5 capturas de tela conta como uma captura.",
                    label: "Importação de parcelamentos",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: NOVEMBER_NOTICE_AT_MS,
        postedAtMs: Date.UTC(2026, 10, 16),
    },
    {
        changes: {
            en: [
                {
                    detail: "If you buy or restore Pro signed out, the app creates an anonymous account on our servers: a random ID and a session, with no name or email. RevenueCat uses that ID. When you sign in, the purchase moves to your account and the anonymous one is deleted.",
                    label: "Buying Pro without an account",
                },
            ],
            de: [
                {
                    detail: "Wenn du Pro abgemeldet kaufst oder wiederherstellst, erstellt die App ein anonymes Konto auf unseren Servern: eine zufällige ID und eine Sitzung, ohne Namen oder E-Mail-Adresse. RevenueCat nutzt diese ID. Wenn du dich anmeldest, geht der Kauf auf dein Konto über und das anonyme Konto wird gelöscht.",
                    label: "Pro ohne Konto kaufen",
                },
            ],
            es: [
                {
                    detail: "Si compras o restauras Pro sin sesión, la app crea una cuenta anónima en nuestros servidores: un ID aleatorio y una sesión, sin nombre ni correo. RevenueCat usa ese ID. Cuando inicias sesión, la compra pasa a tu cuenta y la anónima se elimina.",
                    label: "Comprar Pro sin cuenta",
                },
            ],
            fr: [
                {
                    detail: "Si vous achetez ou restaurez Pro sans être connecté, l'app crée un compte anonyme sur nos serveurs : un identifiant aléatoire et une session, sans nom ni adresse e-mail. RevenueCat utilise cet identifiant. Quand vous vous connectez, l'achat passe sur votre compte et le compte anonyme est supprimé.",
                    label: "Acheter Pro sans compte",
                },
            ],
            pt: [
                {
                    detail: "Se você comprar ou restaurar o Pro sem sessão, o app cria uma conta anônima nos nossos servidores: um ID aleatório e uma sessão, sem nome nem e-mail. A RevenueCat usa esse ID. Quando você inicia sessão, a compra passa para a sua conta e a anônima é excluída.",
                    label: "Comprar o Pro sem conta",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: GUEST_PURCHASE_AT_MS,
        postedAtMs: Date.UTC(2026, 10, 22),
    },
    {
        changes: {
            en: [
                {
                    detail: "You can buy Pro without an account. It works on that phone, including AI features, and moves to your account when you sign in. Sync, receipt photo backup, and Notion still need an account.",
                    label: "Pro without an account",
                },
            ],
            de: [
                {
                    detail: "Du kannst Pro ohne Konto kaufen. Es funktioniert auf diesem Handy, auch mit KI-Funktionen, und geht bei der Anmeldung auf dein Konto über. Synchronisierung, Sicherung von Belegfotos und Notion brauchen weiterhin ein Konto.",
                    label: "Pro ohne Konto",
                },
            ],
            es: [
                {
                    detail: "Puedes comprar Pro sin cuenta. Funciona en ese celular, incluidas las funciones de IA, y pasa a tu cuenta cuando inicias sesión. La sincronización, el respaldo de fotos de recibos y Notion siguen requiriendo una cuenta.",
                    label: "Pro sin cuenta",
                },
            ],
            fr: [
                {
                    detail: "Vous pouvez acheter Pro sans compte. Il fonctionne sur ce téléphone, fonctionnalités d'IA comprises, et passe sur votre compte quand vous vous connectez. La synchronisation, la sauvegarde des photos de tickets et Notion nécessitent toujours un compte.",
                    label: "Pro sans compte",
                },
            ],
            pt: [
                {
                    detail: "Você pode comprar o Pro sem conta. Ele funciona naquele celular, incluindo os recursos de IA, e passa para a sua conta quando você inicia sessão. A sincronização, o backup de fotos de recibos e o Notion continuam exigindo uma conta.",
                    label: "Pro sem conta",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: GUEST_PURCHASE_AT_MS,
        postedAtMs: Date.UTC(2026, 10, 22),
    },
    {
        changes: {
            en: [
                {
                    detail: "With Pro, automation tools can add entries with a token you create, and they wait on our servers until your device collects them. Web addresses you add receive each new entry's amount, currency, date, note, and category and account names. Both are kept until you remove them.",
                    label: "Webhooks",
                },
                {
                    detail: "With Share analytics on: when the app sets the reminder for your second entry, and when you open the app from a reminder. Never amounts, names or notes.",
                    label: "Reminders in analytics",
                },
                {
                    detail: "With Share analytics on: which step of the app tour you reach, and whether you finish, skip or replay it. Never amounts, names or notes.",
                    label: "The app tour in analytics",
                },
                {
                    detail: "With Share analytics on: when you start setting up auto-log, whether auto-log can read your notifications or texts when you come back from your phone's settings or you skip the step, and when its shortcut first runs in each profile. Never amounts, merchants or notification text.",
                    label: "Auto-log setup in analytics",
                },
                {
                    detail: "With Share analytics on: during setup, which of the four goals you pick, whether you keep the suggested monthly budget or skip it, and when you finish. Never amounts, names or notes.",
                    label: "Setup in analytics",
                },
                {
                    detail: "Once you sign in on the web, while the PostHog cookie is on: when you sign in and how, when you add an entry (expense or income, typed or spoken), when Outlayr Pro opens, and which plan you pick when you start a checkout. From then until you sign out, that browser's events in the web app are linked to your account ID, starting from a new random ID so earlier visits stay unlinked. Never amounts, merchants or notes.",
                    label: "Web app analytics",
                },
                {
                    detail: "With Pro you can keep separate profiles, such as Work or Family. Each profile's name, icon, and color sync with its own ledger. The web app and a connected AI assistant see only your Personal profile, and Notion imports go there too.",
                    label: "Profiles",
                },
                {
                    detail: "ElevenLabs also receives your account and category names while you speak an entry, so it spells them the way your ledger does.",
                    label: "Voice entry spelling",
                },
                {
                    detail: "With Pro, a profile's owner can invite up to 5 people to share it. Everyone in it sees and can change its ledger and photos, and sees the first names of the people in it, including on the entries they logged.",
                    label: "Shared profiles",
                },
            ],
            de: [
                {
                    detail: "Mit Pro können Automatisierungsdienste mit einem Token, das du erstellst, Einträge hinzufügen, die auf unseren Servern warten, bis dein Gerät sie abholt. Webadressen, die du hinzufügst, erhalten von jedem neuen Eintrag Betrag, Währung, Datum, Notiz und die Namen von Kategorie und Konto. Beides bleibt gespeichert, bis du es entfernst.",
                    label: "Webhooks",
                },
                {
                    detail: "Mit eingeschaltetem „Analysedaten teilen“: wann die App die Erinnerung an deinen zweiten Eintrag plant und wann du die App über eine Erinnerung öffnest. Nie Beträge, Namen oder Notizen.",
                    label: "Erinnerungen in Analysen",
                },
                {
                    detail: "Mit eingeschaltetem „Analysedaten teilen“: welchen Schritt der App-Tour du erreichst und ob du sie beendest, überspringst oder neu startest. Nie Beträge, Namen oder Notizen.",
                    label: "Die App-Tour in Analysen",
                },
                {
                    detail: "Mit eingeschaltetem „Analysedaten teilen“: wann du mit dem Einrichten der Auto-Erfassung beginnst, ob die Auto-Erfassung deine Benachrichtigungen oder SMS lesen kann, wenn du aus den Einstellungen deines Telefons zurückkommst, oder ob du den Schritt überspringst, und wann ihr Kurzbefehl in jedem Profil zum ersten Mal läuft. Nie Beträge, Händler oder Benachrichtigungstexte.",
                    label: "Einrichten der Auto-Erfassung in Analysen",
                },
                {
                    detail: "Mit eingeschaltetem „Analysedaten teilen“: welches der vier Ziele du bei der Einrichtung wählst, ob du das vorgeschlagene Monatsbudget übernimmst oder überspringst und wann du fertig bist. Nie Beträge, Namen oder Notizen.",
                    label: "Die Einrichtung in Analysen",
                },
                {
                    detail: "Sobald du dich im Web anmeldest und solange das PostHog-Cookie aktiv ist: wann und wie du dich anmeldest, wann du einen Eintrag hinzufügst (Ausgabe oder Einnahme, getippt oder gesprochen), wann sich Outlayr Pro öffnet und welchen Plan du wählst, wenn du einen Kauf beginnst. Ab dann bis zur Abmeldung werden die Ereignisse dieses Browsers in der Web-App mit deiner Konto-ID verknüpft, beginnend mit einer neuen zufälligen ID, sodass frühere Besuche nicht verknüpft werden. Nie Beträge, Händler oder Notizen.",
                    label: "Analysen in der Web-App",
                },
                {
                    detail: "Mit Pro kannst du getrennte Profile führen, etwa Arbeit oder Familie. Name, Symbol und Farbe jedes Profils werden mit seinem eigenen Haushaltsbuch synchronisiert. Die Web-App und ein verbundener KI-Assistent sehen nur dein Profil „Privat“, und Notion-Importe landen ebenfalls dort.",
                    label: "Profile",
                },
                {
                    detail: "ElevenLabs erhält bei der Spracheingabe auch deine Konto- und Kategorienamen, damit es sie so schreibt wie dein Haushaltsbuch.",
                    label: "Schreibweise bei der Spracheingabe",
                },
                {
                    detail: "Mit Pro kann der Eigentümer eines Profils bis zu 5 Personen einladen, es zu teilen. Alle darin sehen sein Haushaltsbuch und seine Fotos und können sie ändern, und sie sehen die Vornamen der Mitglieder, auch bei den Einträgen, die sie erfasst haben.",
                    label: "Geteilte Profile",
                },
            ],
            es: [
                {
                    detail: "Con Pro, las herramientas de automatización pueden agregar entradas con un token que creas, y esperan en nuestros servidores hasta que tu dispositivo las recoge. Las direcciones web que agregas reciben de cada entrada nueva el monto, la moneda, la fecha, la nota y los nombres de la categoría y la cuenta. Ambos se guardan hasta que los quites.",
                    label: "Webhooks",
                },
                {
                    detail: "Con Compartir analíticas activado: cuándo la app programa el recordatorio de tu segunda entrada y cuándo abres la app desde un recordatorio. Nunca montos, nombres ni notas.",
                    label: "Recordatorios en analíticas",
                },
                {
                    detail: "Con Compartir analíticas activado: a qué paso del recorrido por la app llegas y si lo terminas, lo saltas o lo repites. Nunca montos, nombres ni notas.",
                    label: "El recorrido por la app en analíticas",
                },
                {
                    detail: "Con Compartir analíticas activado: cuándo empiezas a configurar el registro automático, si el registro automático puede leer tus notificaciones o SMS cuando vuelves de los ajustes de tu teléfono o si saltas el paso, y cuándo su atajo se ejecuta por primera vez en cada perfil. Nunca montos, comercios ni el texto de las notificaciones.",
                    label: "Configuración del registro automático en analíticas",
                },
                {
                    detail: "Con Compartir analíticas activado: durante la configuración inicial, cuál de las cuatro metas eliges, si te quedas con el presupuesto mensual sugerido o lo saltas, y cuándo terminas. Nunca montos, nombres ni notas.",
                    label: "La configuración inicial en analíticas",
                },
                {
                    detail: "Cuando inicias sesión en la web y mientras la cookie de PostHog esté activada: cuándo inicias sesión y cómo, cuándo agregas una entrada (gasto o ingreso, escrita o dictada), cuándo se abre Outlayr Pro y qué plan eliges al empezar un pago. Desde ahí hasta que cierres sesión, los eventos de ese navegador en la app web se vinculan con el ID de tu cuenta, empezando con un ID aleatorio nuevo para que las visitas anteriores no queden vinculadas. Nunca montos, comercios ni notas.",
                    label: "Analíticas en la app web",
                },
                {
                    detail: "Con Pro puedes tener perfiles separados, como Trabajo o Familia. El nombre, el ícono y el color de cada perfil se sincronizan con su propio registro. La app web y un asistente de IA conectado solo ven tu perfil Personal, y las importaciones de Notion también van ahí.",
                    label: "Perfiles",
                },
                {
                    detail: "ElevenLabs también recibe los nombres de tus cuentas y categorías mientras dictas una entrada, para escribirlos como están en tu registro.",
                    label: "Ortografía en la entrada por voz",
                },
                {
                    detail: "Con Pro, el propietario de un perfil puede invitar hasta 5 personas a compartirlo. Todos en él ven y pueden cambiar su registro y sus fotos, y ven el nombre de pila de quienes están en él, también en las entradas que registraron.",
                    label: "Perfiles compartidos",
                },
            ],
            fr: [
                {
                    detail: "Avec Pro, des outils d'automatisation peuvent ajouter des opérations avec un jeton que vous créez, et elles attendent sur nos serveurs que votre appareil les récupère. Les adresses web que vous ajoutez reçoivent, pour chaque nouvelle opération, le montant, la devise, la date, la note et les noms de la catégorie et du compte. Les deux sont conservés jusqu'à ce que vous les retiriez.",
                    label: "Webhooks",
                },
                {
                    detail: "Avec Partager les données d'analyse activé : quand l'app programme le rappel de votre deuxième opération, et quand vous ouvrez l'app depuis un rappel. Jamais de montants, de noms ni de notes.",
                    label: "Rappels dans les statistiques",
                },
                {
                    detail: "Avec Partager les données d'analyse activé : quelle étape de la visite de l'app vous atteignez, et si vous la terminez, la passez ou la relancez. Jamais de montants, de noms ni de notes.",
                    label: "La visite de l'app dans les statistiques",
                },
                {
                    detail: "Avec Partager les données d'analyse activé : quand vous commencez à configurer la saisie automatique, si la saisie automatique peut lire vos notifications ou SMS quand vous revenez des réglages de votre téléphone ou si vous passez l'étape, et quand son raccourci s'exécute pour la première fois dans chaque profil. Jamais de montants, de commerçants ni le texte des notifications.",
                    label: "Configuration de la saisie automatique dans les statistiques",
                },
                {
                    detail: "Avec Partager les données d'analyse activé : pendant la configuration, lequel des quatre objectifs vous choisissez, si vous gardez le budget mensuel proposé ou le passez, et quand vous terminez. Jamais de montants, de noms ni de notes.",
                    label: "La configuration dans les statistiques",
                },
                {
                    detail: "Une fois connecté sur le web, et tant que le cookie PostHog est activé : quand vous vous connectez et comment, quand vous ajoutez une opération (dépense ou revenu, saisie ou dictée), quand Outlayr Pro s'ouvre et quel forfait vous choisissez en lançant un paiement. Dès lors et jusqu'à votre déconnexion, les événements de ce navigateur dans l'app web sont liés à l'identifiant de votre compte, en partant d'un nouvel identifiant aléatoire pour que les visites précédentes ne soient pas liées. Jamais de montants, de commerçants ni de notes.",
                    label: "Les statistiques de l'app web",
                },
                {
                    detail: "Avec Pro, vous pouvez tenir des profils séparés, comme Travail ou Famille. Le nom, l'icône et la couleur de chaque profil se synchronisent avec son propre registre. L'app web et un assistant IA connecté ne voient que votre profil Personnel, et les imports Notion y arrivent aussi.",
                    label: "Profils",
                },
                {
                    detail: "ElevenLabs reçoit aussi les noms de vos comptes et catégories pendant que vous dictez une opération, pour les écrire comme dans votre journal.",
                    label: "Orthographe de la saisie vocale",
                },
                {
                    detail: "Avec Pro, le propriétaire d'un profil peut inviter jusqu'à 5 personnes à le partager. Tous ses membres voient et peuvent modifier son registre et ses photos, et voient le prénom des membres, y compris sur les opérations qu'ils ont saisies.",
                    label: "Profils partagés",
                },
            ],
            pt: [
                {
                    detail: "Com o Pro, ferramentas de automação podem adicionar lançamentos com um token que você cria, e eles esperam nos nossos servidores até o seu dispositivo buscá-los. Os endereços web que você adiciona recebem, de cada lançamento novo, o valor, a moeda, a data, a nota e os nomes da categoria e da conta. Os dois ficam guardados até você removê-los.",
                    label: "Webhooks",
                },
                {
                    detail: "Com Compartilhar análises ativado: quando o app agenda o lembrete do seu segundo lançamento e quando você abre o app a partir de um lembrete. Nunca valores, nomes ou notas.",
                    label: "Lembretes nas análises",
                },
                {
                    detail: "Com Compartilhar análises ativado: a qual etapa do tour do app você chega e se você o termina, pula ou refaz. Nunca valores, nomes ou notas.",
                    label: "O tour do app nas análises",
                },
                {
                    detail: "Com Compartilhar análises ativado: quando você começa a configurar o registro automático, se o registro automático consegue ler suas notificações ou SMS quando você volta dos ajustes do celular ou se você pula a etapa, e quando o atalho dele roda pela primeira vez em cada perfil. Nunca valores, estabelecimentos nem o texto das notificações.",
                    label: "Configuração do registro automático nas análises",
                },
                {
                    detail: "Com Compartilhar análises ativado: durante a configuração inicial, qual das quatro metas você escolhe, se você mantém o orçamento mensal sugerido ou pula essa etapa, e quando você termina. Nunca valores, nomes ou notas.",
                    label: "A configuração inicial nas análises",
                },
                {
                    detail: "Quando você entra pela web e enquanto o cookie do PostHog estiver ativado: quando você entra e como, quando adiciona um lançamento (despesa ou receita, digitado ou falado), quando o Outlayr Pro abre e qual plano você escolhe ao começar um pagamento. Dali até você sair, os eventos desse navegador no app web ficam vinculados ao ID da sua conta, começando com um novo ID aleatório para que as visitas anteriores não fiquem vinculadas. Nunca valores, estabelecimentos nem notas.",
                    label: "Análises no app web",
                },
                {
                    detail: "Com o Pro você pode manter perfis separados, como Trabalho ou Família. O nome, o ícone e a cor de cada perfil sincronizam com o registro próprio dele. O app web e um assistente de IA conectado veem só o seu perfil Pessoal, e as importações do Notion também vão para ele.",
                    label: "Perfis",
                },
                {
                    detail: "A ElevenLabs também recebe os nomes das suas contas e categorias enquanto você dita um lançamento, para escrevê-los como estão nos seus lançamentos.",
                    label: "Grafia no lançamento por voz",
                },
                {
                    detail: "Com o Pro, o proprietário de um perfil pode convidar até 5 pessoas para compartilhá-lo. Todos nele veem e podem alterar o registro e as fotos, e veem o primeiro nome de quem participa, inclusive nos lançamentos que registrou.",
                    label: "Perfis compartilhados",
                },
            ],
        },
        document: "privacy",
        effectiveAtMs: JANUARY_NOTICE_AT_MS,
        postedAtMs: Date.UTC(2026, 10, 27),
    },
    {
        changes: {
            en: [
                { label: "Profiles are part of Pro. The free plan keeps one ledger." },
                {
                    label: "Shared profiles: everyone in one can change its ledger, only the owner invites or removes people, members can leave once their changes sync, and it is deleted from our servers if the owner deletes their account.",
                },
            ],
            de: [
                { label: "Profile gehören zu Pro. Der kostenlose Plan behält ein Haushaltsbuch." },
                {
                    label: "Geteilte Profile: Alle darin können das Haushaltsbuch ändern, nur der Eigentümer lädt ein oder entfernt Personen, Mitglieder können austreten, sobald ihre Änderungen synchronisiert sind, und es wird von unseren Servern gelöscht, wenn der Eigentümer sein Konto löscht.",
                },
            ],
            es: [
                { label: "Los perfiles son parte de Pro. El plan gratis mantiene un registro." },
                {
                    label: "Perfiles compartidos: todos en uno pueden cambiar su registro, solo el propietario invita o quita personas, los miembros pueden salirse cuando sus cambios se sincronicen, y se elimina de nuestros servidores si el propietario elimina su cuenta.",
                },
            ],
            fr: [
                { label: "Les profils font partie de Pro. L'offre gratuite garde un registre." },
                {
                    label: "Profils partagés : tous les membres peuvent modifier le registre, seul le propriétaire invite ou retire des personnes, les membres peuvent partir une fois leurs modifications synchronisées, et il est supprimé de nos serveurs si le propriétaire supprime son compte.",
                },
            ],
            pt: [
                { label: "Os perfis fazem parte do Pro. O plano grátis mantém um registro." },
                {
                    label: "Perfis compartilhados: todos nele podem alterar o registro, só o proprietário convida ou remove pessoas, os membros podem sair quando as alterações sincronizarem, e ele é excluído dos nossos servidores se o proprietário excluir a conta.",
                },
            ],
        },
        document: "terms",
        effectiveAtMs: PROFILES_AT_MS,
        postedAtMs: Date.UTC(2026, 10, 26),
    },
];

export const noticeKey = ({ document, effectiveAtMs }: typeof PolicyNotice.Type) => `${document}:${effectiveAtMs}`;
