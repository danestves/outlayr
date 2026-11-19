import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const support = {
    content: {
        answers: [
            {
                answer: t({
                    en: "No. Outlayr works without an account. Signing in with Apple, Google, or email and password is needed for sync, voice entry, receipt scanning, and to buy Pro.",
                    de: "Nein. Outlayr funktioniert ohne Konto. Die Anmeldung mit Apple, Google oder E-Mail und Passwort brauchst du für die Synchronisierung, die Spracheingabe, den Belegscan und den Kauf von Pro.",
                    es: "No. Outlayr funciona sin cuenta. Necesitas iniciar sesión con Apple, con Google, o con un correo electrónico y una contraseña para sincronizar, dictar registros, escanear recibos y comprar Pro.",
                    pt: "Não. O Outlayr funciona sem conta. Você precisa entrar com Apple, com Google ou com e-mail e senha para sincronizar, registrar por voz, escanear recibos e comprar o Pro.",
                    fr: "Non. Outlayr fonctionne sans compte. La connexion avec Apple, Google ou une adresse e-mail et un mot de passe est nécessaire pour la synchronisation, la saisie vocale, le scan de tickets et l'achat de Pro.",
                }),
                question: t({
                    en: "Do I need an account?",
                    de: "Brauche ich ein Konto?",
                    es: "¿Necesito una cuenta?",
                    pt: "Preciso de uma conta?",
                    fr: "Ai-je besoin d'un compte ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, tap Outlayr Pro, then Restore. Pro follows the app store account that bought it. If you bought it on the web, signing in is enough.",
                    de: "Öffne die Einstellungen, tippe auf Outlayr Pro und dann auf Wiederherstellen. Pro folgt dem Konto des App Stores, über das du es gekauft hast. Wenn du es im Web gekauft hast, reicht die Anmeldung.",
                    es: "Abre Configuración, toca Outlayr Pro y luego Restaurar. Pro va con la cuenta de la tienda de apps con la que lo compraste. Si lo compraste en la web, basta con iniciar sesión.",
                    pt: "Abra Ajustes, toque em Outlayr Pro e depois em Restaurar. O Pro fica vinculado à conta da loja de apps que fez a compra. Se você comprou na web, basta iniciar sessão.",
                    fr: "Ouvrez Réglages, touchez Outlayr Pro, puis Restaurer. Pro suit le compte de la boutique d'apps qui l'a acheté. Si vous l'avez acheté sur le web, il suffit de vous connecter.",
                }),
                question: t({
                    en: "How do I get Pro back on a new phone?",
                    de: "Wie bekomme ich Pro auf einem neuen Handy zurück?",
                    es: "¿Cómo recupero Pro en un celular nuevo?",
                    pt: "Como recupero o Pro em um celular novo?",
                    fr: "Comment récupérer Pro sur un nouveau téléphone ?",
                }),
            },
            {
                answer: t({
                    en: "If you bought Pro on the web, open Settings › Plan there. Otherwise, cancel from your app store's subscriptions page. On iPhone: open the Settings app, tap your name, then Subscriptions, then Outlayr. On Android: open the Google Play Store app, tap your profile picture, then Payments & subscriptions, then Subscriptions, then Outlayr. Pro stays on until the period you paid for ends.",
                    de: "Wenn du Pro im Web gekauft hast, öffne dort Einstellungen › Plan. Sonst kündige über die Abo-Seite deines App Stores. Auf dem iPhone: Öffne die Einstellungen-App, tippe auf deinen Namen, dann auf Abonnements und dann auf Outlayr. Auf Android: Öffne die Google-Play-Store-App, tippe auf dein Profilbild, dann auf Zahlungen & Abos, dann auf Abos und dann auf Outlayr. Pro bleibt aktiv, bis der bezahlte Zeitraum endet.",
                    es: "Si compraste Pro en la web, abre Configuración › Plan ahí. Si no, cancélalo desde la página de suscripciones de tu tienda de apps. En iPhone: abre la app Configuración, toca tu nombre, luego Suscripciones y luego Outlayr. En Android: abre la app Google Play Store, toca tu foto de perfil, luego Pagos y suscripciones, luego Suscripciones y luego Outlayr. Pro sigue activo hasta que termine el período que pagaste.",
                    pt: "Se você comprou o Pro na web, abra Ajustes › Plano lá. Caso contrário, cancele na página de assinaturas da sua loja de apps. No iPhone: abra o app Ajustes, toque no seu nome, depois em Assinaturas e depois em Outlayr. No Android: abra o app Google Play Store, toque na sua foto de perfil, depois em Pagamentos e assinaturas, depois em Assinaturas e depois em Outlayr. O Pro continua ativo até o fim do período que você pagou.",
                    fr: "Si vous avez acheté Pro sur le web, ouvrez Réglages › Forfait là-bas. Sinon, résiliez depuis la page des abonnements de votre boutique d'apps. Sur iPhone : ouvrez l'app Réglages, touchez votre nom, puis Abonnements, puis Outlayr. Sur Android : ouvrez l'app Google Play Store, touchez votre photo de profil, puis Paiements et abonnements, puis Abonnements, puis Outlayr. Pro reste actif jusqu'à la fin de la période payée.",
                }),
                question: t({
                    en: "How do I cancel Pro?",
                    de: "Wie kündige ich Pro?",
                    es: "¿Cómo cancelo Pro?",
                    pt: "Como cancelo o Pro?",
                    fr: "Comment résilier Pro ?",
                }),
            },
            {
                answer: t({
                    en: "For a purchase on the web, write to support@tryoutlayr.com or to Link support. Purchases in the app go through your app store, so refunds do too. On iPhone, request one at reportaproblem.apple.com. On Android, follow Google Play's steps at support.google.com/googleplay/answer/2479637.",
                    de: "Bei einem Kauf im Web schreib an support@tryoutlayr.com oder an den Link-Support. Käufe in der App laufen über deinen App Store, also auch Rückerstattungen. Auf dem iPhone beantragst du eine unter reportaproblem.apple.com. Auf Android folgst du den Schritten von Google Play unter support.google.com/googleplay/answer/2479637.",
                    es: "Por una compra en la web, escribe a support@tryoutlayr.com o al soporte de Link. Las compras en la app pasan por tu tienda de apps, así que los reembolsos también. En iPhone, pide uno en reportaproblem.apple.com. En Android, sigue los pasos de Google Play en support.google.com/googleplay/answer/2479637.",
                    pt: "Para uma compra na web, escreva para support@tryoutlayr.com ou para o suporte do Link. As compras no app passam pela sua loja de apps, então os reembolsos também. No iPhone, peça um em reportaproblem.apple.com. No Android, siga os passos do Google Play em support.google.com/googleplay/answer/2479637.",
                    fr: "Pour un achat sur le web, écrivez à support@tryoutlayr.com ou au support de Link. Les achats dans l'app passent par votre boutique d'apps, les remboursements aussi. Sur iPhone, faites la demande sur reportaproblem.apple.com. Sur Android, suivez les étapes de Google Play sur support.google.com/googleplay/answer/2479637.",
                }),
                question: t({
                    en: "Can I get a refund?",
                    de: "Kann ich eine Rückerstattung bekommen?",
                    es: "¿Puedo pedir un reembolso?",
                    pt: "Posso pedir reembolso?",
                    fr: "Puis-je obtenir un remboursement ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, then Invite friends, and share your code or link. A friend who claims it gets a month of Pro. You get a month once they have logged entries on three separate days. From 19 November 2026, you get your month once they buy Pro instead.",
                    de: "Öffne die Einstellungen, dann Freunde einladen, und teile deinen Code oder Link. Ein Freund, der ihn einlöst, bekommt einen Monat Pro. Du bekommst einen Monat, sobald er an drei verschiedenen Tagen Einträge erfasst hat. Ab dem 19. November 2026 bekommst du deinen Monat stattdessen, sobald er Pro kauft.",
                    es: "Abre Configuración, luego Invitar amigos, y comparte tu código o enlace. Un amigo que lo reclama recibe un mes de Pro. Tú recibes un mes cuando registra entradas en tres días distintos. Desde el 19 de noviembre de 2026, recibes tu mes cuando compra Pro.",
                    pt: "Abra Ajustes, depois Convidar amigos, e compartilhe seu código ou link. Um amigo que resgata o convite ganha um mês de Pro. Você ganha um mês quando ele tiver registrado lançamentos em três dias diferentes. A partir de 19 de novembro de 2026, você ganha seu mês quando ele comprar o Pro.",
                    fr: "Ouvrez Réglages, puis Inviter des amis, et partagez votre code ou votre lien. Un ami qui l'active reçoit un mois de Pro. Vous recevez un mois une fois qu'il a saisi des opérations sur trois jours différents. À partir du 19 novembre 2026, vous recevez votre mois quand il achète Pro.",
                }),
                question: t({
                    en: "How do invites work?",
                    de: "Wie funktionieren Einladungen?",
                    es: "¿Cómo funcionan las invitaciones?",
                    pt: "Como funcionam os convites?",
                    fr: "Comment fonctionnent les invitations ?",
                }),
            },
            {
                answer: t({
                    en: "Someone with an account under 7 days old who has never had Pro. Each person can claim one code, ever, and not their own.",
                    de: "Jemand mit einem Konto, das jünger als 7 Tage ist und der nie Pro hatte. Jede Person kann nur einen Code einlösen, einmalig und nicht den eigenen.",
                    es: "Alguien con una cuenta de menos de 7 días que nunca tuvo Pro. Cada persona puede reclamar un código en total, y no el suyo.",
                    pt: "Alguém com uma conta de menos de 7 dias que nunca teve o Pro. Cada pessoa pode resgatar um único código na vida, e não o próprio.",
                    fr: "Une personne dont le compte a moins de 7 jours et qui n'a jamais eu Pro. Chaque personne peut activer un seul code, une seule fois, et pas le sien.",
                }),
                question: t({
                    en: "Who can claim an invite?",
                    de: "Wer kann eine Einladung einlösen?",
                    es: "¿Quién puede reclamar una invitación?",
                    pt: "Quem pode resgatar um convite?",
                    fr: "Qui peut activer une invitation ?",
                }),
            },
            {
                answer: t({
                    en: "On the third day your friend logs an entry. A day counts once the entry syncs. Days are counted by UTC date and at least 20 hours apart, so three entries in one evening count as one day. From 19 November 2026, your month lands within a day of your friend's first payment for Pro, monthly, yearly or lifetime. Their free month from your invite doesn't count.",
                    de: "Am dritten Tag, an dem dein Freund einen Eintrag erfasst. Ein Tag zählt, sobald der Eintrag synchronisiert ist. Tage werden nach UTC-Datum und mit mindestens 20 Stunden Abstand gezählt, drei Einträge an einem Abend zählen also als ein Tag. Ab dem 19. November 2026 kommt dein Monat innerhalb eines Tages nach der ersten Zahlung deines Freundes für Pro, monatlich, jährlich oder auf Lebenszeit. Sein Gratismonat aus deiner Einladung zählt nicht.",
                    es: "El tercer día en que tu amigo registra una entrada. Un día cuenta cuando la entrada se sincroniza. Los días se cuentan por fecha UTC y con al menos 20 horas entre uno y otro, así que tres entradas en una misma noche cuentan como un día. Desde el 19 de noviembre de 2026, tu mes llega en menos de un día después del primer pago de tu amigo por Pro, mensual, anual o de por vida. El mes gratis de tu invitación no cuenta.",
                    pt: "No terceiro dia em que seu amigo registrar um lançamento. Um dia conta quando o lançamento é sincronizado. Os dias são contados pela data em UTC e com pelo menos 20 horas de intervalo, então três lançamentos na mesma noite contam como um dia. A partir de 19 de novembro de 2026, seu mês chega em até um dia após o primeiro pagamento do seu amigo pelo Pro, mensal, anual ou vitalício. O mês grátis do seu convite não conta.",
                    fr: "Le troisième jour où votre ami saisit une opération. Un jour compte une fois l'opération synchronisée. Les jours sont comptés selon la date UTC et à au moins 20 heures d'écart, donc trois opérations dans la même soirée comptent pour un jour. À partir du 19 novembre 2026, votre mois arrive dans la journée qui suit le premier paiement de votre ami pour Pro, mensuel, annuel ou à vie. Le mois offert par votre invitation ne compte pas.",
                }),
                question: t({
                    en: "When do I get my month?",
                    de: "Wann bekomme ich meinen Monat?",
                    es: "¿Cuándo recibo mi mes?",
                    pt: "Quando ganho meu mês?",
                    fr: "Quand est-ce que je reçois mon mois ?",
                }),
            },
            {
                answer: t({
                    en: "Yes: 12 months in any 365 days. An invite that finishes after that earns no month, and lifetime owners don't earn months. If you pay for Pro, a month you earn waits and starts when your paid plan ends.",
                    de: "Ja: 12 Monate in beliebigen 365 Tagen. Eine Einladung, die danach abgeschlossen wird, bringt keinen Monat, und Besitzer von Pro auf Lebenszeit sammeln keine Monate. Wenn du für Pro zahlst, wartet ein verdienter Monat und beginnt, wenn dein bezahlter Plan endet.",
                    es: "Sí: 12 meses en cualquier período de 365 días. Una invitación que termina después de eso no da mes, y quienes tienen Pro de por vida no ganan meses. Si pagas Pro, el mes que ganas espera y empieza cuando termina tu plan pagado.",
                    pt: "Sim: 12 meses em qualquer período de 365 dias. Um convite concluído depois disso não dá mês, e quem tem o Pro vitalício não ganha meses. Se você paga o Pro, o mês que ganhar fica em espera e começa quando seu plano pago terminar.",
                    fr: "Oui : 12 mois sur toute période de 365 jours. Une invitation qui aboutit au-delà ne rapporte pas de mois, et les détenteurs de Pro à vie ne gagnent pas de mois. Si vous payez Pro, le mois gagné attend et commence à la fin de votre formule payante.",
                }),
                question: t({
                    en: "Is there a limit on invite months?",
                    de: "Gibt es eine Grenze für Einladungsmonate?",
                    es: "¿Hay un límite de meses por invitaciones?",
                    pt: "Existe um limite de meses por convites?",
                    fr: "Les mois gagnés par invitation sont-ils limités ?",
                }),
            },
            {
                answer: t({
                    en: "Your invite shows your first name. You see each friend's first name, how many days they have logged up to three, and the date of the third. Never their entries or amounts. From 19 November 2026, you see whether each friend bought Pro and when, instead of the days. Never what they paid.",
                    de: "Deine Einladung zeigt deinen Vornamen. Du siehst den Vornamen jedes Freundes, an wie vielen Tagen er erfasst hat (bis zu drei) und das Datum des dritten. Nie seine Einträge oder Beträge. Ab dem 19. November 2026 siehst du stattdessen, ob jeder Freund Pro gekauft hat und wann. Nie, was er bezahlt hat.",
                    es: "Tu invitación muestra tu nombre de pila. Tú ves el nombre de pila de cada amigo, cuántos días ha registrado hasta tres y la fecha del tercero. Nunca sus entradas ni sus montos. Desde el 19 de noviembre de 2026, en lugar de los días ves si cada amigo compró Pro y cuándo. Nunca cuánto pagó.",
                    pt: "Seu convite mostra seu primeiro nome. Você vê o primeiro nome de cada amigo, quantos dias ele registrou, até três, e a data do terceiro. Nunca os lançamentos nem os valores dele. A partir de 19 de novembro de 2026, em vez dos dias, você vê se cada amigo comprou o Pro e quando. Nunca quanto ele pagou.",
                    fr: "Votre invitation affiche votre prénom. Vous voyez le prénom de chaque ami, combien de jours il a saisis, jusqu'à trois, et la date du troisième. Jamais ses opérations ni ses montants. À partir du 19 novembre 2026, vous voyez plutôt si chaque ami a acheté Pro et quand. Jamais ce qu'il a payé.",
                }),
                question: t({
                    en: "What do invites show about me?",
                    de: "Was zeigen Einladungen über mich?",
                    es: "¿Qué muestran las invitaciones sobre mí?",
                    pt: "O que os convites mostram sobre mim?",
                    fr: "Que montrent les invitations à mon sujet ?",
                }),
            },
            {
                answer: t({
                    en: "Your invite code, the invites you sent, and any months waiting for your paid plan to end are deleted. If you claimed an invite that already earned your friend a month, it stays on their list without your name and still counts toward their 12 a year. Any other invite you claimed is deleted too.",
                    de: "Dein Einladungscode, die gesendeten Einladungen und alle Monate, die auf das Ende deines bezahlten Plans warten, werden gelöscht. Wenn du eine Einladung eingelöst hast, die deinem Freund schon einen Monat gebracht hat, bleibt sie ohne deinen Namen in seiner Liste und zählt weiter zu seinen 12 pro Jahr. Jede andere Einladung, die du eingelöst hast, wird ebenfalls gelöscht.",
                    es: "Se eliminan tu código de invitación, las invitaciones que enviaste y los meses que esperan a que termine tu plan pagado. Si reclamaste una invitación que ya le dio un mes a tu amigo, queda en su lista sin tu nombre y sigue contando para sus 12 al año. Cualquier otra invitación que reclamaste también se elimina.",
                    pt: "Seu código de convite, os convites que você enviou e os meses à espera do fim do seu plano pago são apagados. Se você resgatou um convite que já deu um mês ao seu amigo, ele continua na lista dele sem o seu nome e ainda conta para os 12 por ano dele. Qualquer outro convite que você resgatou também é apagado.",
                    fr: "Votre code d'invitation, les invitations envoyées et les mois en attente de la fin de votre formule payante sont supprimés. Si vous avez activé une invitation qui a déjà rapporté un mois à votre ami, elle reste dans sa liste sans votre nom et compte toujours dans ses 12 par an. Toute autre invitation que vous avez activée est aussi supprimée.",
                }),
                question: t({
                    en: "What happens to invites if I delete my account?",
                    de: "Was passiert mit Einladungen, wenn ich mein Konto lösche?",
                    es: "¿Qué pasa con las invitaciones si elimino mi cuenta?",
                    pt: "O que acontece com os convites se eu apagar minha conta?",
                    fr: "Que deviennent les invitations si je supprime mon compte ?",
                }),
            },
            {
                answer: t({
                    en: "No. A month from an invite is a one-time gift of Pro. When it ends, Pro ends unless you subscribe or buy it yourself, and nothing charges you.",
                    de: "Nein. Ein Monat aus einer Einladung ist ein einmaliges Geschenk von Pro. Wenn er endet, endet Pro, außer du schließt ein Abo ab oder kaufst es selbst, und dir wird nichts berechnet.",
                    es: "No. Un mes por invitación es un regalo único de Pro. Cuando termina, Pro termina, a menos que te suscribas o lo compres tú, y no se te cobra nada.",
                    pt: "Não. Um mês por convite é um presente único de Pro. Quando termina, o Pro termina, a menos que você assine ou compre por conta própria, e nada é cobrado.",
                    fr: "Non. Un mois gagné par invitation est un cadeau unique de Pro. À sa fin, Pro s'arrête, sauf si vous vous abonnez ou l'achetez vous-même, et rien ne vous est facturé.",
                }),
                question: t({
                    en: "Do invite months renew?",
                    de: "Verlängern sich Einladungsmonate?",
                    es: "¿Los meses por invitaciones se renuevan?",
                    pt: "Os meses por convites são renovados?",
                    fr: "Les mois gagnés par invitation se renouvellent-ils ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, then Export data. Choose Export CSV for a spreadsheet, or Export a full archive for a file that carries every entry, category, and budget.",
                    de: "Öffne die Einstellungen, dann Daten exportieren. Wähle CSV exportieren für eine Tabelle oder Vollständiges Archiv exportieren für eine Datei, die jeden Eintrag, jede Kategorie und jedes Budget enthält.",
                    es: "Abre Configuración y luego Exportar datos. Elige Exportar CSV para una hoja de cálculo, o Exportar un archivo completo para guardar cada registro, categoría y presupuesto.",
                    pt: "Abra Ajustes e depois Exportar dados. Escolha Exportar CSV para ter uma planilha, ou Exportar um arquivo completo para ter um arquivo com cada lançamento, categoria e orçamento.",
                    fr: "Ouvrez Réglages, puis Exporter les données. Choisissez Exporter en CSV pour un tableur, ou Exporter une archive complète pour un fichier qui contient chaque opération, catégorie et budget.",
                }),
                question: t({
                    en: "How do I export my data?",
                    de: "Wie exportiere ich meine Daten?",
                    es: "¿Cómo exporto mis datos?",
                    pt: "Como exporto meus dados?",
                    fr: "Comment exporter mes données ?",
                }),
            },
            {
                answer: t({
                    en: "Open Settings, then Account, then Delete account. That removes your account and everything synced to it. The ledger on the phone stays unless you choose to erase this device as well.",
                    de: "Öffne die Einstellungen, dann Konto, dann Konto löschen. Das entfernt dein Konto und alles, was damit synchronisiert ist. Das Haushaltsbuch auf dem Handy bleibt, außer du entscheidest dich, auch dieses Gerät zu löschen.",
                    es: "Abre Configuración, luego Cuenta y luego Eliminar cuenta. Esto elimina tu cuenta y todo lo sincronizado en ella. El registro de tu celular se conserva, a menos que también elijas borrar este dispositivo.",
                    pt: "Abra Ajustes, depois Conta e depois Apagar conta. Isso remove sua conta e tudo o que foi sincronizado nela. Os lançamentos no celular continuam lá, a menos que você também escolha apagar este dispositivo.",
                    fr: "Ouvrez Réglages, puis Compte, puis Supprimer le compte. Cela supprime votre compte et tout ce qui y est synchronisé. Le journal sur le téléphone reste, sauf si vous choisissez aussi d'effacer cet appareil.",
                }),
                question: t({
                    en: "How do I delete my account?",
                    de: "Wie lösche ich mein Konto?",
                    es: "¿Cómo elimino mi cuenta?",
                    pt: "Como apago minha conta?",
                    fr: "Comment supprimer mon compte ?",
                }),
            },
            {
                answer: t({
                    en: "English, Spanish, Portuguese, French, and German. Switch between them in Settings, under Language.",
                    de: "Englisch, Spanisch, Portugiesisch, Französisch und Deutsch. Wechsle in den Einstellungen unter Sprache zwischen ihnen.",
                    es: "Inglés, español, portugués, francés y alemán. Cambia entre ellos en Configuración, en Idioma.",
                    pt: "Inglês, espanhol, português, francês e alemão. Troque entre eles em Ajustes, em Idioma.",
                    fr: "Anglais, espagnol, portugais, français et allemand. Changez de langue dans Réglages, sous Langue.",
                }),
                question: t({
                    en: "Which languages does Outlayr speak?",
                    de: "In welchen Sprachen gibt es Outlayr?",
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
                    de: "Keine Antwort passt zu „{{query}}“.",
                    es: "Ninguna respuesta coincide con “{{query}}”.",
                    pt: "Nenhuma resposta corresponde a “{{query}}”.",
                    fr: "Aucune réponse ne correspond à « {{query}} ».",
                })
            ),
            emptyHint: t({
                en: "Write to us and tell us what you were looking for.",
                de: "Schreib uns und sag uns, wonach du gesucht hast.",
                es: "Escríbenos y cuéntanos qué buscabas.",
                pt: "Escreva para a gente e conte o que você procurava.",
                fr: "Écrivez-nous et dites-nous ce que vous cherchiez.",
            }),
            label: t({
                en: "Filter the answers",
                de: "Antworten filtern",
                es: "Filtra las respuestas",
                pt: "Filtre as respostas",
                fr: "Filtrer les réponses",
            }),
            placeholder: t({
                en: "Try refund or cancel",
                de: "Probier Rückerstattung oder kündigen",
                es: "Prueba reembolso o cancelar",
                pt: "Tente reembolso ou cancele",
                fr: "Essayez remboursement ou résilier",
            }),
        },
        help: t({
            en: "Step-by-step help",
            de: "Hilfe Schritt für Schritt",
            es: "Ayuda paso a paso",
            pt: "Ajuda passo a passo",
            fr: "Aide pas à pas",
        }),
        intro: t({
            en: "Write to us and include what you tapped and what happened. Screenshots help.",
            de: "Schreib uns und nenne, worauf du getippt hast und was passiert ist. Screenshots helfen.",
            es: "Escríbenos y cuéntanos qué tocaste y qué pasó. Las capturas de pantalla ayudan.",
            pt: "Escreva para a gente contando o que você tocou e o que aconteceu. Capturas de tela ajudam.",
            fr: "Écrivez-nous en précisant ce que vous avez touché et ce qui s'est passé. Les captures d'écran aident.",
        }),
        meta: {
            description: t({
                en: "Restore or cancel Outlayr Pro, get a refund, export your data, or delete your account. Answers to common questions and how to reach support.",
                de: "Stelle Outlayr Pro wieder her oder kündige es, hol dir eine Rückerstattung, exportiere deine Daten oder lösche dein Konto.",
                es: "Restaura o cancela Outlayr Pro, pide un reembolso, exporta tus datos o elimina tu cuenta, y cómo contactar a soporte.",
                pt: "Restaure ou cancele o Outlayr Pro, peça reembolso, exporte seus dados ou apague sua conta. Perguntas frequentes e como falar com o suporte.",
                fr: "Restaurez ou résiliez Outlayr Pro, obtenez un remboursement, exportez vos données ou supprimez votre compte.",
            }),
            title: t({
                en: "Outlayr Support: Restore Pro, Export or Delete Your Data",
                de: "Outlayr Support: Pro wiederherstellen, Daten exportieren oder löschen",
                es: "Soporte de Outlayr: restaura Pro, exporta o borra tus datos",
                pt: "Ajuda Outlayr: restaure o Pro, exporte ou apague seus dados",
                fr: "Aide Outlayr : restaurer Pro, exporter, effacer vos données",
            }),
        },
        title: t({
            en: "Outlayr support",
            de: "Outlayr Support",
            es: "Soporte de Outlayr",
            pt: "Suporte do Outlayr",
            fr: "Assistance Outlayr",
        }),
    },
    key: "support",
} satisfies Dictionary;

export default support;
