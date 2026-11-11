import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardOnboarding = {
    content: {
        stepOf: insert(
            t({
                en: "{{step}} of {{total}}",
                es: "{{step}} de {{total}}",
                fr: "{{step}} sur {{total}}",
                pt: "{{step}} de {{total}}",
            })
        ),
        railLabel: t({
            en: "Setup steps",
            es: "Pasos de configuración",
            fr: "Étapes de configuration",
            pt: "Etapas da configuração",
        }),
        rail: {
            currency: t({
                en: "Currency",
                es: "Moneda",
                fr: "Devise",
                pt: "Moeda",
            }),
            autoLog: t({
                en: "Auto-log",
                es: "Registro automático",
                fr: "Saisie automatique",
                pt: "Registro automático",
            }),
            rhythm: t({
                en: "Rhythm",
                es: "Ritmo",
                fr: "Rythme",
                pt: "Ritmo",
            }),
            firstEntry: t({
                en: "First entry",
                es: "Primera entrada",
                fr: "Première opération",
                pt: "Primeiro lançamento",
            }),
        },
        welcome: {
            begun: t({
                en: "Begun {date}",
                es: "Comenzado el {date}",
                fr: "Commencé le {date}",
                pt: "Iniciado em {date}",
            }),
            title: t({
                en: "Welcome to Outlayr",
                es: "Te damos la bienvenida a Outlayr",
                fr: "Bienvenue dans Outlayr",
                pt: "Boas-vindas ao Outlayr",
            }),
            line: t({
                en: "A ledger you keep by hand. Every entry yours, on this device.",
                es: "Un registro que llevas a mano. Cada entrada es tuya, en este dispositivo.",
                fr: "Un journal tenu à la main. Chaque opération vous appartient, sur cet appareil.",
                pt: "Um livro-caixa que você preenche à mão. Cada lançamento é seu, neste dispositivo.",
            }),
            continue: t({
                en: "Continue",
                es: "Continuar",
                fr: "Continuer",
                pt: "Continuar",
            }),
            importing: t({
                en: "Coming from another app?",
                es: "¿Vienes de otra app?",
                fr: "Vous venez d'une autre app ?",
                pt: "Vindo de outro app?",
            }),
            screenshot: t({
                en: "The Outlayr dashboard",
                es: "El panel de Outlayr",
                fr: "Le tableau de bord Outlayr",
                pt: "O painel do Outlayr",
            }),
        },
        sources: {
            title: t({
                en: "Coming from another app?",
                es: "¿Vienes de otra app?",
                fr: "Vous venez d'une autre app ?",
                pt: "Vindo de outro app?",
            }),
            skip: t({
                en: "Skip for now",
                es: "Omitir por ahora",
                fr: "Passer pour l'instant",
                pt: "Pular por enquanto",
            }),
            fromApp: t({
                en: "From another app",
                es: "Desde otra app",
                fr: "Depuis une autre app",
                pt: "De outro app",
            }),
            fromFile: t({
                en: "From a file",
                es: "Desde un archivo",
                fr: "Depuis un fichier",
                pt: "De um arquivo",
            }),
            moneyManagerHint: t({
                en: "Orange Dog · .mmbackup",
                es: "Orange Dog · .mmbackup",
                fr: "Orange Dog · .mmbackup",
                pt: "Orange Dog · .mmbackup",
            }),
            notionHint: t({
                en: "Markdown & CSV export",
                es: "Exportación en Markdown y CSV",
                fr: "Export Markdown et CSV",
                pt: "Exportação em Markdown e CSV",
            }),
            csv: t({
                en: "CSV file",
                es: "Archivo CSV",
                fr: "Fichier CSV",
                pt: "Arquivo CSV",
            }),
            csvHint: t({
                en: "Any bank or spreadsheet",
                es: "Cualquier banco u hoja de cálculo",
                fr: "N'importe quelle banque ou feuille de calcul",
                pt: "Qualquer banco ou planilha",
            }),
            pdf: t({
                en: "Bank statement PDF",
                es: "PDF de estado de cuenta",
                fr: "Relevé bancaire PDF",
                pt: "Extrato bancário em PDF",
            }),
            pdfHint: t({
                en: "Read by AI",
                es: "Lo lee la IA",
                fr: "Lu par l'IA",
                pt: "Lido por IA",
            }),
            privacy: t({
                en: "CSV files are read on this device. A PDF statement's text goes to our AI provider.",
                es: "Los CSV se leen en este dispositivo. El texto de los PDF va a nuestro proveedor de IA.",
                fr: "Les CSV sont lus sur cet appareil. Le texte des relevés PDF va à notre fournisseur d'IA.",
                pt: "CSVs são lidos neste dispositivo. O texto dos extratos em PDF vai para o nosso provedor de IA.",
            }),
            tellUs: t({
                en: "Using another app? Tell us which one",
                es: "¿Usas otra app? Dinos cuál",
                fr: "Vous utilisez une autre app ? Dites-nous laquelle",
                pt: "Usa outro app? Diga qual",
            }),
        },
        moneyManager: {
            title: t({
                en: "Three steps in Money Manager",
                es: "Tres pasos en Money Manager",
                fr: "Trois étapes dans Money Manager",
                pt: "Três passos no Money Manager",
            }),
            one: t({
                en: "In Money Manager, open Settings and find Backup.",
                es: "En Money Manager, abre la configuración y busca la copia de seguridad.",
                fr: "Dans Money Manager, ouvrez les réglages et trouvez la sauvegarde.",
                pt: "No Money Manager, abra os ajustes e encontre o backup.",
            }),
            two: t({
                en: "Create a backup and tap Share.",
                es: "Crea una copia y toca Compartir.",
                fr: "Créez une sauvegarde et touchez Partager.",
                pt: "Crie um backup e toque em Compartilhar.",
            }),
            three: t({
                en: "Save it to Downloads, then choose it below.",
                es: "Guárdala en Descargas y elígela abajo.",
                fr: "Enregistrez-la dans Téléchargements, puis choisissez-la ci-dessous.",
                pt: "Salve em Downloads e escolha abaixo.",
            }),
            fileHint: t({
                en: "The file ends in .mmbackup",
                es: "El archivo termina en .mmbackup",
                fr: "Le fichier se termine par .mmbackup",
                pt: "O arquivo termina em .mmbackup",
            }),
            back: t({
                en: "Back",
                es: "Atrás",
                fr: "Retour",
                pt: "Voltar",
            }),
            choose: t({
                en: "Choose the backup",
                es: "Elegir la copia",
                fr: "Choisir la sauvegarde",
                pt: "Escolher o backup",
            }),
        },
        currency: {
            title: t({
                en: "What are your numbers in?",
                es: "¿En qué moneda manejas tu dinero?",
                fr: "Dans quelle devise comptez-vous ?",
                pt: "Em qual moeda você controla seu dinheiro?",
            }),
            body: t({
                en: "Everything totals in this. Change it any time; old entries keep their own.",
                es: "Todo se suma en esta moneda. Cámbiala cuando quieras; las entradas anteriores conservan la suya.",
                fr: "Tous les totaux sont dans cette devise. Modifiable à tout moment : les anciennes opérations gardent la leur.",
                pt: "Tudo é somado nesta moeda. Mude quando quiser; os lançamentos antigos mantêm a deles.",
            }),
            label: t({
                en: "Currency",
                es: "Moneda",
                fr: "Devise",
                pt: "Moeda",
            }),
            search: t({
                en: "Search currencies",
                es: "Buscar monedas",
                fr: "Rechercher une devise",
                pt: "Buscar moedas",
            }),
            none: t({
                en: "No currency matches",
                es: "Ninguna moneda coincide",
                fr: "Aucune devise ne correspond",
                pt: "Nenhuma moeda corresponde",
            }),
            account: t({
                en: "I already have an account",
                es: "Ya tengo una cuenta",
                fr: "J'ai déjà un compte",
                pt: "Já tenho uma conta",
            }),
            continue: t({
                en: "Continue",
                es: "Continuar",
                fr: "Continuer",
                pt: "Continuar",
            }),
            failed: t({
                en: "Outlayr could not record your currency. Try again.",
                es: "Outlayr no pudo registrar tu moneda. Inténtalo de nuevo.",
                fr: "Outlayr n'a pas pu enregistrer votre devise. Réessayez.",
                pt: "O Outlayr não conseguiu registrar sua moeda. Tente de novo.",
            }),
            inCode: insert(
                t({
                    en: "In {{code}}",
                    es: "En {{code}}",
                    fr: "En {{code}}",
                    pt: "Em {{code}}",
                })
            ),
            netWorth: t({
                en: "Net worth",
                es: "Patrimonio neto",
                fr: "Patrimoine net",
                pt: "Patrimônio líquido",
            }),
            spent: t({
                en: "Spent",
                es: "Gastado",
                fr: "Dépensé",
                pt: "Gasto",
            }),
        },
        autoLog: {
            title: t({
                en: "Let Outlayr do the typing",
                es: "Deja que Outlayr escriba por ti",
                fr: "Laissez Outlayr saisir pour vous",
                pt: "Deixe o Outlayr digitar por você",
            }),
            siriHint: t({
                en: '"Log an expense in Outlayr"',
                es: "«Registra un gasto en Outlayr»",
                fr: "« Enregistre une dépense dans Outlayr »",
                pt: '"Registrar uma despesa no Outlayr"',
            }),
            applePayHint: t({
                en: "Card taps log themselves",
                es: "Cada pago con la tarjeta se registra solo",
                fr: "Chaque paiement par carte s'enregistre seul",
                pt: "Cada pagamento com o cartão se registra sozinho",
            }),
            bank: t({
                en: "Bank notifications",
                es: "Notificaciones del banco",
                fr: "Notifications bancaires",
                pt: "Notificações do banco",
            }),
            bankHint: t({
                en: "Purchases in your bank's notifications",
                es: "Compras en las notificaciones de tu banco",
                fr: "Achats dans les notifications de votre banque",
                pt: "Compras nas notificações do seu banco",
            }),
            onPhone: t({
                en: "Set up on your phone",
                es: "Configúralo en tu teléfono",
                fr: "À configurer sur votre téléphone",
                pt: "Configure no celular",
            }),
            continue: t({
                en: "Continue",
                es: "Continuar",
                fr: "Continuer",
                pt: "Continuar",
            }),
        },
        rhythm: {
            title: t({
                en: "A ledger only works if you write in it.",
                es: "Un registro solo funciona si escribes en él.",
                fr: "Un journal ne sert que si vous écrivez dedans.",
                pt: "Um livro-caixa só funciona se você escrever nele.",
            }),
            body: t({
                en: "One quiet nudge each evening. Your browser isn't asked for permission until your first entry is saved.",
                es: "Un aviso discreto cada noche. Tu navegador no te pide permiso hasta que guardes tu primera entrada.",
                fr: "Un rappel discret chaque soir. Votre navigateur ne demandera l'autorisation qu'après l'enregistrement de votre première opération.",
                pt: "Um lembrete discreto toda noite. O navegador só pede permissão depois que você salvar seu primeiro lançamento.",
            }),
            time: t({
                en: "Time",
                es: "Hora",
                fr: "Heure",
                pt: "Horário",
            }),
            none: t({
                en: "Don't remind me",
                es: "No me recuerdes",
                fr: "Pas de rappel",
                pt: "Não me lembre",
            }),
            remind: insert(
                t({
                    en: "Remind me at {{time}}",
                    es: "Recuérdame a las {{time}}",
                    fr: "Me le rappeler à {{time}}",
                    pt: "Me lembre às {{time}}",
                })
            ),
            notifications: t({
                en: "Notifications",
                es: "Notificaciones",
                fr: "Notifications",
                pt: "Notificações",
            }),
            today: t({
                en: "Time to write today's lines.",
                es: "Hora de escribir las líneas de hoy.",
                fr: "C'est l'heure d'écrire les lignes du jour.",
                pt: "Hora de escrever as linhas de hoje.",
            }),
            yesterday: t({
                en: "Yesterday",
                es: "Ayer",
                fr: "Hier",
                pt: "Ontem",
            }),
            yesterdayLine: t({
                en: "Yesterday you wrote 3 lines.",
                es: "Ayer escribiste 3 líneas.",
                fr: "Hier, vous avez écrit 3 lignes.",
                pt: "Ontem você escreveu 3 linhas.",
            }),
            unsupported: t({
                en: "This browser can't show reminders.",
                es: "Este navegador no puede mostrar recordatorios.",
                fr: "Ce navigateur ne peut pas afficher de rappels.",
                pt: "Este navegador não pode mostrar lembretes.",
            }),
        },
        firstEntry: {
            title: t({
                en: "What did you last pay for?",
                es: "¿Qué fue lo último que pagaste?",
                fr: "Qu'avez-vous payé en dernier ?",
                pt: "Qual foi a última coisa que você pagou?",
            }),
            sentence: t({
                en: "Spent {amount} on {category} today.",
                es: "Gasté {amount} en {category} hoy.",
                fr: "J'ai dépensé {amount} pour {category} aujourd'hui.",
                pt: "Gastei {amount} em {category} hoje.",
            }),
            amount: t({
                en: "Amount",
                es: "Monto",
                fr: "Montant",
                pt: "Valor",
            }),
            category: t({
                en: "Category",
                es: "Categoría",
                fr: "Catégorie",
                pt: "Categoria",
            }),
            later: t({
                en: "Later",
                es: "Más tarde",
                fr: "Plus tard",
                pt: "Depois",
            }),
            save: t({
                en: "Save",
                es: "Guardar",
                fr: "Enregistrer",
                pt: "Salvar",
            }),
            transactions: t({
                en: "Transactions",
                es: "Transacciones",
                fr: "Opérations",
                pt: "Lançamentos",
            }),
            empty: t({
                en: "Your first line lands here.",
                es: "Tu primera línea aparece aquí.",
                fr: "Votre première ligne arrive ici.",
                pt: "Sua primeira linha aparece aqui.",
            }),
            date: t({
                en: "Date",
                es: "Fecha",
                fr: "Date",
                pt: "Data",
            }),
            failed: t({
                en: "Outlayr could not save your entry. Try again.",
                es: "Outlayr no pudo guardar tu entrada. Inténtalo de nuevo.",
                fr: "Outlayr n'a pas pu enregistrer votre opération. Réessayez.",
                pt: "O Outlayr não conseguiu salvar seu lançamento. Tente de novo.",
            }),
            rateMissing: t({
                en: "There is no exchange rate for this currency yet. Try again in a moment.",
                es: "Todavía no hay tasa de cambio para esta moneda. Inténtalo de nuevo en un momento.",
                fr: "Il n'y a pas encore de taux de change pour cette devise. Réessayez dans un instant.",
                pt: "Ainda não há taxa de câmbio para esta moeda. Tente de novo em instantes.",
            }),
        },
        done: {
            title: t({
                en: "Your ledger is open",
                es: "Tu registro está abierto",
                fr: "Votre journal est ouvert",
                pt: "Seu livro-caixa está aberto",
            }),
            begun: t({
                en: "Begun",
                es: "Comenzado",
                fr: "Commencé",
                pt: "Iniciado",
            }),
            keptIn: t({
                en: "Kept in",
                es: "Moneda",
                fr: "Tenu en",
                pt: "Moeda",
            }),
            writtenAt: t({
                en: "Written daily at",
                es: "Recordatorio diario",
                fr: "Rappel quotidien à",
                pt: "Lembrete diário às",
            }),
            noReminder: t({
                en: "No reminder",
                es: "Sin recordatorio",
                fr: "Aucun rappel",
                pt: "Sem lembrete",
            }),
            open: t({
                en: "Open dashboard",
                es: "Abrir el panel",
                fr: "Ouvrir le tableau de bord",
                pt: "Abrir o painel",
            }),
            heardFrom: {
                label: t({
                    en: "Heard about us from",
                    es: "Nos conociste por",
                    fr: "Vous nous avez connus par",
                    pt: "Conheceu a gente por",
                }),
                choose: t({
                    en: "Choose",
                    es: "Elegir",
                    fr: "Choisir",
                    pt: "Escolher",
                }),
                where: t({
                    en: "Where? (optional)",
                    es: "¿Dónde? (opcional)",
                    fr: "Où ? (facultatif)",
                    pt: "Onde? (opcional)",
                }),
                sources: {
                    search: t({
                        en: "Google or Bing",
                        es: "Google o Bing",
                        fr: "Google ou Bing",
                        pt: "Google ou Bing",
                    }),
                    ai_assistant: t({
                        en: "AI assistant",
                        es: "Asistente de IA",
                        fr: "Assistant IA",
                        pt: "Assistente de IA",
                    }),
                    app_store: t({
                        en: "App Store or Google Play",
                        es: "App Store o Google Play",
                        fr: "App Store ou Google Play",
                        pt: "App Store ou Google Play",
                    }),
                    x: t({
                        en: "X",
                        es: "X",
                        fr: "X",
                        pt: "X",
                    }),
                    instagram: t({
                        en: "Instagram",
                        es: "Instagram",
                        fr: "Instagram",
                        pt: "Instagram",
                    }),
                    tiktok: t({
                        en: "TikTok",
                        es: "TikTok",
                        fr: "TikTok",
                        pt: "TikTok",
                    }),
                    linkedin: t({
                        en: "LinkedIn",
                        es: "LinkedIn",
                        fr: "LinkedIn",
                        pt: "LinkedIn",
                    }),
                    reddit_hn: t({
                        en: "Reddit or Hacker News",
                        es: "Reddit o Hacker News",
                        fr: "Reddit ou Hacker News",
                        pt: "Reddit ou Hacker News",
                    }),
                    friend: t({
                        en: "A friend",
                        es: "Un amigo",
                        fr: "Un ami",
                        pt: "Um amigo",
                    }),
                    other: t({
                        en: "Something else",
                        es: "Otro lugar",
                        fr: "Autre chose",
                        pt: "Outro lugar",
                    }),
                },
            },
        },
    },
    key: "dashboard-onboarding",
} satisfies Dictionary;

export default dashboardOnboarding;
