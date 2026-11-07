import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const support = {
    content: {
        answers: [
            {
                answer: t({
                    en: "No. Outlayr works without an account. Signing in with Apple, Google, or email and password is needed for sync, voice entry, receipt scanning, and to buy Pro.",
                    es: "No. Outlayr funciona sin cuenta. Necesitas iniciar sesión con Apple, con Google, o con un correo electrónico y una contraseña para sincronizar, dictar registros, escanear recibos y comprar Pro.",
                    pt: "Não. O Outlayr funciona sem conta. Você precisa entrar com Apple, com Google ou com e-mail e senha para sincronizar, registrar por voz, escanear recibos e comprar o Pro.",
                    fr: "Non. Outlayr fonctionne sans compte. La connexion avec Apple, Google ou une adresse e-mail et un mot de passe est nécessaire pour la synchronisation, la saisie vocale, le scan de tickets et l'achat de Pro.",
                }),
                question: t({
                    en: "Do I need an account?",
                    es: "¿Necesito una cuenta?",
                    pt: "Preciso de uma conta?",
                    fr: "Ai-je besoin d'un compte ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, tap Outlayr Pro, then Restore. Pro follows the app store account that bought it.",
                    es: "Abre Configuración, toca Outlayr Pro y luego Restaurar. Pro va con la cuenta de la tienda de apps con la que lo compraste.",
                    pt: "Abra Ajustes, toque em Outlayr Pro e depois em Restaurar. O Pro fica vinculado à conta da loja de apps que fez a compra.",
                    fr: "Ouvrez Réglages, touchez Outlayr Pro, puis Restaurer. Pro suit le compte de la boutique d'apps qui l'a acheté.",
                }),
                question: t({
                    en: "How do I get Pro back on a new phone?",
                    es: "¿Cómo recupero Pro en un celular nuevo?",
                    pt: "Como recupero o Pro em um celular novo?",
                    fr: "Comment récupérer Pro sur un nouveau téléphone ?",
                }),
            },
            {
                answer: t({
                    en: "Cancel from your app store’s subscriptions page. On iPhone: open the Settings app, tap your name, then Subscriptions, then Outlayr. On Android: open the Google Play Store app, tap your profile picture, then Payments & subscriptions, then Subscriptions, then Outlayr. Pro stays on until the period you paid for ends.",
                    es: "Cancélalo desde la página de suscripciones de tu tienda de apps. En iPhone: abre la app Configuración, toca tu nombre, luego Suscripciones y luego Outlayr. En Android: abre la app Google Play Store, toca tu foto de perfil, luego Pagos y suscripciones, luego Suscripciones y luego Outlayr. Pro sigue activo hasta que termine el período que pagaste.",
                    pt: "Cancele na página de assinaturas da sua loja de apps. No iPhone: abra o app Ajustes, toque no seu nome, depois em Assinaturas e depois em Outlayr. No Android: abra o app Google Play Store, toque na sua foto de perfil, depois em Pagamentos e assinaturas, depois em Assinaturas e depois em Outlayr. O Pro continua ativo até o fim do período que você pagou.",
                    fr: "Résiliez depuis la page des abonnements de votre boutique d'apps. Sur iPhone : ouvrez l'app Réglages, touchez votre nom, puis Abonnements, puis Outlayr. Sur Android : ouvrez l'app Google Play Store, touchez votre photo de profil, puis Paiements et abonnements, puis Abonnements, puis Outlayr. Pro reste actif jusqu'à la fin de la période payée.",
                }),
                question: t({
                    en: "How do I cancel Pro?",
                    es: "¿Cómo cancelo Pro?",
                    pt: "Como cancelo o Pro?",
                    fr: "Comment résilier Pro ?",
                }),
            },
            {
                answer: t({
                    en: "Purchases go through your app store, so refunds do too. On iPhone, request one at reportaproblem.apple.com. On Android, follow Google Play’s steps at support.google.com/googleplay/answer/2479637.",
                    es: "Las compras pasan por tu tienda de apps, así que los reembolsos también. En iPhone, pide uno en reportaproblem.apple.com. En Android, sigue los pasos de Google Play en support.google.com/googleplay/answer/2479637.",
                    pt: "As compras passam pela sua loja de apps, então os reembolsos também. No iPhone, peça um em reportaproblem.apple.com. No Android, siga os passos do Google Play em support.google.com/googleplay/answer/2479637.",
                    fr: "Les achats passent par votre boutique d'apps, les remboursements aussi. Sur iPhone, faites la demande sur reportaproblem.apple.com. Sur Android, suivez les étapes de Google Play sur support.google.com/googleplay/answer/2479637.",
                }),
                question: t({
                    en: "Can I get a refund?",
                    es: "¿Puedo pedir un reembolso?",
                    pt: "Posso pedir reembolso?",
                    fr: "Puis-je obtenir un remboursement ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, then Invite friends, and share your code or link. A friend who claims it gets a month of Pro. You get a month once they have logged entries on three separate days.",
                    es: "Abre Configuración, luego Invitar amigos, y comparte tu código o enlace. Un amigo que lo reclama recibe un mes de Pro. Tú recibes un mes cuando registra entradas en tres días distintos.",
                    pt: "Abra Ajustes, depois Convidar amigos, e compartilhe seu código ou link. Um amigo que resgata o convite ganha um mês de Pro. Você ganha um mês quando ele tiver registrado lançamentos em três dias diferentes.",
                    fr: "Ouvrez Réglages, puis Inviter des amis, et partagez votre code ou votre lien. Un ami qui l'active reçoit un mois de Pro. Vous recevez un mois une fois qu'il a saisi des opérations sur trois jours différents.",
                }),
                question: t({
                    en: "How do invites work?",
                    es: "¿Cómo funcionan las invitaciones?",
                    pt: "Como funcionam os convites?",
                    fr: "Comment fonctionnent les invitations ?",
                }),
            },
            {
                answer: t({
                    en: "Someone with an account under 7 days old who has never had Pro. Each person can claim one code, ever, and not their own.",
                    es: "Alguien con una cuenta de menos de 7 días que nunca tuvo Pro. Cada persona puede reclamar un código en total, y no el suyo.",
                    pt: "Alguém com uma conta de menos de 7 dias que nunca teve o Pro. Cada pessoa pode resgatar um único código na vida, e não o próprio.",
                    fr: "Une personne dont le compte a moins de 7 jours et qui n'a jamais eu Pro. Chaque personne peut activer un seul code, une seule fois, et pas le sien.",
                }),
                question: t({
                    en: "Who can claim an invite?",
                    es: "¿Quién puede reclamar una invitación?",
                    pt: "Quem pode resgatar um convite?",
                    fr: "Qui peut activer une invitation ?",
                }),
            },
            {
                answer: t({
                    en: "On the third day your friend logs an entry. A day counts once the entry syncs. Days are counted by UTC date and at least 20 hours apart, so three entries in one evening count as one day.",
                    es: "El tercer día en que tu amigo registra una entrada. Un día cuenta cuando la entrada se sincroniza. Los días se cuentan por fecha UTC y con al menos 20 horas entre uno y otro, así que tres entradas en una misma noche cuentan como un día.",
                    pt: "No terceiro dia em que seu amigo registrar um lançamento. Um dia conta quando o lançamento é sincronizado. Os dias são contados pela data em UTC e com pelo menos 20 horas de intervalo, então três lançamentos na mesma noite contam como um dia.",
                    fr: "Le troisième jour où votre ami saisit une opération. Un jour compte une fois l'opération synchronisée. Les jours sont comptés selon la date UTC et à au moins 20 heures d'écart, donc trois opérations dans la même soirée comptent pour un jour.",
                }),
                question: t({
                    en: "When do I get my month?",
                    es: "¿Cuándo recibo mi mes?",
                    pt: "Quando ganho meu mês?",
                    fr: "Quand est-ce que je reçois mon mois ?",
                }),
            },
            {
                answer: t({
                    en: "Yes: 12 months in any 365 days. An invite that finishes after that earns no month, and lifetime owners don’t earn months. If you pay for Pro, a month you earn waits and starts when your paid plan ends.",
                    es: "Sí: 12 meses en cualquier período de 365 días. Una invitación que termina después de eso no da mes, y quienes tienen Pro de por vida no ganan meses. Si pagas Pro, el mes que ganas espera y empieza cuando termina tu plan pagado.",
                    pt: "Sim: 12 meses em qualquer período de 365 dias. Um convite concluído depois disso não dá mês, e quem tem o Pro vitalício não ganha meses. Se você paga o Pro, o mês que ganhar fica em espera e começa quando seu plano pago terminar.",
                    fr: "Oui : 12 mois sur toute période de 365 jours. Une invitation qui aboutit au-delà ne rapporte pas de mois, et les détenteurs de Pro à vie ne gagnent pas de mois. Si vous payez Pro, le mois gagné attend et commence à la fin de votre formule payante.",
                }),
                question: t({
                    en: "Is there a limit on invite months?",
                    es: "¿Hay un límite de meses por invitaciones?",
                    pt: "Existe um limite de meses por convites?",
                    fr: "Les mois gagnés par invitation sont-ils limités ?",
                }),
            },
            {
                answer: t({
                    en: "Your invite shows your first name. You see each friend’s first name, how many days they have logged up to three, and the date of the third. Never their entries or amounts.",
                    es: "Tu invitación muestra tu nombre de pila. Tú ves el nombre de pila de cada amigo, cuántos días ha registrado hasta tres y la fecha del tercero. Nunca sus entradas ni sus montos.",
                    pt: "Seu convite mostra seu primeiro nome. Você vê o primeiro nome de cada amigo, quantos dias ele registrou, até três, e a data do terceiro. Nunca os lançamentos nem os valores dele.",
                    fr: "Votre invitation affiche votre prénom. Vous voyez le prénom de chaque ami, combien de jours il a saisis, jusqu'à trois, et la date du troisième. Jamais ses opérations ni ses montants.",
                }),
                question: t({
                    en: "What do invites show about me?",
                    es: "¿Qué muestran las invitaciones sobre mí?",
                    pt: "O que os convites mostram sobre mim?",
                    fr: "Que montrent les invitations à mon sujet ?",
                }),
            },
            {
                answer: t({
                    en: "Your invite code, the invites you sent, and any months waiting for your paid plan to end are deleted. If you claimed an invite that already earned your friend a month, it stays on their list without your name and still counts toward their 12 a year. Any other invite you claimed is deleted too.",
                    es: "Se eliminan tu código de invitación, las invitaciones que enviaste y los meses que esperan a que termine tu plan pagado. Si reclamaste una invitación que ya le dio un mes a tu amigo, queda en su lista sin tu nombre y sigue contando para sus 12 al año. Cualquier otra invitación que reclamaste también se elimina.",
                    pt: "Seu código de convite, os convites que você enviou e os meses à espera do fim do seu plano pago são apagados. Se você resgatou um convite que já deu um mês ao seu amigo, ele continua na lista dele sem o seu nome e ainda conta para os 12 por ano dele. Qualquer outro convite que você resgatou também é apagado.",
                    fr: "Votre code d'invitation, les invitations envoyées et les mois en attente de la fin de votre formule payante sont supprimés. Si vous avez activé une invitation qui a déjà rapporté un mois à votre ami, elle reste dans sa liste sans votre nom et compte toujours dans ses 12 par an. Toute autre invitation que vous avez activée est aussi supprimée.",
                }),
                question: t({
                    en: "What happens to invites if I delete my account?",
                    es: "¿Qué pasa con las invitaciones si elimino mi cuenta?",
                    pt: "O que acontece com os convites se eu apagar minha conta?",
                    fr: "Que deviennent les invitations si je supprime mon compte ?",
                }),
            },
            {
                answer: t({
                    en: "No. A month from an invite is a one-time gift of Pro. When it ends, Pro ends unless you subscribe or buy it yourself, and nothing charges you.",
                    es: "No. Un mes por invitación es un regalo único de Pro. Cuando termina, Pro termina, a menos que te suscribas o lo compres tú, y no se te cobra nada.",
                    pt: "Não. Um mês por convite é um presente único de Pro. Quando termina, o Pro termina, a menos que você assine ou compre por conta própria, e nada é cobrado.",
                    fr: "Non. Un mois gagné par invitation est un cadeau unique de Pro. À sa fin, Pro s'arrête, sauf si vous vous abonnez ou l'achetez vous-même, et rien ne vous est facturé.",
                }),
                question: t({
                    en: "Do invite months renew?",
                    es: "¿Los meses por invitaciones se renuevan?",
                    pt: "Os meses por convites são renovados?",
                    fr: "Les mois gagnés par invitation se renouvellent-ils ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, then Export data. Choose Export CSV for a spreadsheet, or Export a full archive for a file that carries every entry, category, and budget.",
                    es: "Abre Configuración y luego Exportar datos. Elige Exportar CSV para una hoja de cálculo, o Exportar un archivo completo para guardar cada registro, categoría y presupuesto.",
                    pt: "Abra Ajustes e depois Exportar dados. Escolha Exportar CSV para ter uma planilha, ou Exportar um arquivo completo para ter um arquivo com cada lançamento, categoria e orçamento.",
                    fr: "Ouvrez Réglages, puis Exporter les données. Choisissez Exporter en CSV pour un tableur, ou Exporter une archive complète pour un fichier qui contient chaque opération, catégorie et budget.",
                }),
                question: t({
                    en: "How do I export my data?",
                    es: "¿Cómo exporto mis datos?",
                    pt: "Como exporto meus dados?",
                    fr: "Comment exporter mes données ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, then Account, then Delete account. That removes your account and everything synced to it. The ledger on the phone stays unless you choose to erase this device as well.",
                    es: "Abre Configuración, luego Cuenta y luego Eliminar cuenta. Esto elimina tu cuenta y todo lo sincronizado en ella. El registro de tu celular se conserva, a menos que también elijas borrar este dispositivo.",
                    pt: "Abra Ajustes, depois Conta e depois Apagar conta. Isso remove sua conta e tudo o que foi sincronizado nela. Os lançamentos no celular continuam lá, a menos que você também escolha apagar este dispositivo.",
                    fr: "Ouvrez Réglages, puis Compte, puis Supprimer le compte. Cela supprime votre compte et tout ce qui y est synchronisé. Le journal sur le téléphone reste, sauf si vous choisissez aussi d'effacer cet appareil.",
                }),
                question: t({
                    en: "How do I delete my account?",
                    es: "¿Cómo elimino mi cuenta?",
                    pt: "Como apago minha conta?",
                    fr: "Comment supprimer mon compte ?",
                }),
            },
            {
                answer: t({
                    en: "English, Spanish, Portuguese, and French. Switch between them in Settings, under Language.",
                    es: "Inglés, español, portugués y francés. Cambia entre ellos en Configuración, en Idioma.",
                    pt: "Inglês, espanhol, português e francês. Troque entre eles em Ajustes, em Idioma.",
                    fr: "Anglais, espagnol, portugais et français. Changez de langue dans Réglages, sous Langue.",
                }),
                question: t({
                    en: "Which languages does Outlayr speak?",
                    es: "¿En qué idiomas está Outlayr?",
                    pt: "Em quais idiomas o Outlayr está?",
                    fr: "Dans quelles langues Outlayr est-il disponible ?",
                }),
            },
        ],
        filter: {
            empty: insert(
                t({
                    en: "No answer matches “{{query}}”.",
                    es: "Ninguna respuesta coincide con “{{query}}”.",
                    pt: "Nenhuma resposta corresponde a “{{query}}”.",
                    fr: "Aucune réponse ne correspond à « {{query}} ».",
                })
            ),
            emptyHint: t({
                en: "Write to us and tell us what you were looking for.",
                es: "Escríbenos y cuéntanos qué buscabas.",
                pt: "Escreva para a gente e conte o que você procurava.",
                fr: "Écrivez-nous et dites-nous ce que vous cherchiez.",
            }),
            label: t({
                en: "Filter the answers",
                es: "Filtra las respuestas",
                pt: "Filtre as respostas",
                fr: "Filtrer les réponses",
            }),
            placeholder: t({
                en: "Try refund or cancel",
                es: "Prueba reembolso o cancelar",
                pt: "Tente reembolso ou cancele",
                fr: "Essayez remboursement ou résilier",
            }),
        },
        intro: t({
            en: "Write to us and include what you tapped and what happened. Screenshots help.",
            es: "Escríbenos y cuéntanos qué tocaste y qué pasó. Las capturas de pantalla ayudan.",
            pt: "Escreva para a gente contando o que você tocou e o que aconteceu. Capturas de tela ajudam.",
            fr: "Écrivez-nous en précisant ce que vous avez touché et ce qui s'est passé. Les captures d'écran aident.",
        }),
        meta: {
            description: t({
                en: "Restore or cancel Outlayr Pro, get a refund, export your data, or delete your account. Answers to common questions and how to reach support.",
                es: "Restaura o cancela Outlayr Pro, pide un reembolso, exporta tus datos o elimina tu cuenta. Respuestas a preguntas frecuentes y cómo contactar a soporte.",
                pt: "Ajuda do Outlayr: restaure ou cancele o Outlayr Pro, peça reembolso, exporte seus dados ou apague sua conta. Respostas para perguntas frequentes e como falar com o suporte.",
                fr: "Aide Outlayr : restaurez ou résiliez Outlayr Pro, obtenez un remboursement, exportez vos données ou supprimez votre compte. Réponses aux questions fréquentes et comment contacter l'assistance.",
            }),
            title: t({
                en: "Outlayr Support: Restore Pro, Export or Delete Your Data",
                es: "Soporte de Outlayr: restaura Pro, exporta o borra tus datos",
                pt: "Suporte do Outlayr: restaure o Pro, exporte ou apague seus dados",
                fr: "Aide et assistance Outlayr : restaurer Pro, exporter ou supprimer vos données",
            }),
        },
        title: t({
            en: "Outlayr support",
            es: "Soporte de Outlayr",
            pt: "Suporte do Outlayr",
            fr: "Assistance Outlayr",
        }),
    },
    key: "support",
} satisfies Dictionary;

export default support;
