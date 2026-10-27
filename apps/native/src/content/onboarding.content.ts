import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const onboarding = {
    content: {
        "onboarding.cover.line": t({
            en: "A ledger you keep by hand. Every entry yours, on this device.",
            es: "Un registro que llevas a mano. Cada entrada es tuya, en este dispositivo.",
            fr: "Un journal tenu à la main. Chaque opération vous appartient, sur cet appareil.",
            pt: "Um livro-caixa que você preenche à mão. Cada lançamento é seu, neste dispositivo.",
            "pt-PT": "Um livro-caixa que preenche à mão. Cada registo é seu, neste dispositivo.",
        }),
        "onboarding.currency.body": t({
            en: "Everything totals in this. Change it any time; old entries keep their own.",
            es: "Todo se suma en esta moneda. Cámbiala cuando quieras; las entradas anteriores conservan la suya.",
            fr: "Tous les totaux sont dans cette devise. Modifiable à tout moment : les anciennes opérations gardent la leur.",
            pt: "Tudo é somado nesta moeda. Mude quando quiser; os lançamentos antigos mantêm a deles.",
            "pt-PT": "Tudo é somado nesta moeda. Altere quando quiser; os registos antigos mantêm a deles.",
        }),
        "onboarding.currency.change": t({
            en: "Change",
            es: "Cambiar",
            fr: "Changer",
            pt: "Alterar",
        }),
        "onboarding.currency.eyebrow": t({
            en: "Currency",
            es: "Moneda",
            fr: "Devise",
            pt: "Moeda",
        }),
        "onboarding.currency.openHint": t({
            en: "Opens the currency list",
            es: "Abre la lista de monedas",
            fr: "Ouvre la liste des devises",
            pt: "Abre a lista de moedas",
        }),
        "onboarding.currency.picker.searchPlaceholder": t({
            en: "Search currencies",
            es: "Buscar monedas",
            fr: "Rechercher une devise",
            pt: "Buscar moedas",
            "pt-PT": "Pesquisar moedas",
        }),
        "onboarding.currency.picker.title": t({
            en: "Select a currency",
            es: "Selecciona una moneda",
            fr: "Choisir une devise",
            pt: "Escolha uma moeda",
        }),
        "onboarding.currency.saveFailed.body": t({
            en: "Outlayr could not record your currency. Try again.",
            es: "Outlayr no pudo registrar tu moneda. Inténtalo de nuevo.",
            fr: "Outlayr n'a pas pu enregistrer votre devise. Réessayez.",
            pt: "O Outlayr não conseguiu registrar sua moeda. Tente de novo.",
            "pt-PT": "O Outlayr não conseguiu registar a sua moeda. Tente de novo.",
        }),
        "onboarding.currency.saveFailed.title": t({
            en: "Could not save",
            es: "No se pudo guardar",
            fr: "Enregistrement impossible",
            pt: "Não foi possível salvar",
            "pt-PT": "Não foi possível guardar",
        }),
        "onboarding.currency.saving": t({
            en: "Saving…",
            es: "Guardando…",
            fr: "Enregistrement…",
            pt: "Salvando…",
            "pt-PT": "A guardar…",
        }),
        "onboarding.currency.shortcut": t({
            en: "I already have an account",
            es: "Ya tengo una cuenta",
            fr: "J'ai déjà un compte",
            pt: "Já tenho uma conta",
        }),
        "onboarding.currency.title": t({
            en: "What are your numbers in?",
            es: "¿En qué moneda manejas tu dinero?",
            fr: "Dans quelle devise comptez-vous ?",
            pt: "Em qual moeda você controla seu dinheiro?",
            "pt-PT": "Em que moeda controla o seu dinheiro?",
        }),
        "onboarding.rhythm.body": t({
            en: "One quiet nudge each evening. iOS isn't asked for permission until your first entry is saved.",
            es: "Un aviso discreto cada noche. iOS no te pide permiso hasta que guardes tu primera entrada.",
            fr: "Un rappel discret chaque soir. iOS ne demandera l'autorisation qu'après l'enregistrement de votre première opération.",
            pt: "Um lembrete discreto toda noite. O iOS só pede permissão depois que você salvar seu primeiro lançamento.",
            "pt-PT":
                "Um lembrete discreto todas as noites. O iOS só pede permissão depois de guardar o seu primeiro registo.",
        }),
        "onboarding.rhythm.body.android": t({
            en: "One quiet nudge each evening. Android won't ask for permission until your first entry is saved.",
            es: "Un aviso discreto cada noche. Android no te pide permiso hasta que guardes tu primera entrada.",
            fr: "Un rappel discret chaque soir. Android ne demandera l'autorisation qu'après l'enregistrement de votre première opération.",
            pt: "Um lembrete discreto toda noite. O Android só pede permissão depois que você salvar seu primeiro lançamento.",
            "pt-PT":
                "Um lembrete discreto todas as noites. O Android só pede permissão depois de guardar o seu primeiro registo.",
        }),
        "onboarding.rhythm.eyebrow": t({
            en: "Rhythm",
            es: "Ritmo",
            fr: "Rythme",
            pt: "Ritmo",
        }),
        "onboarding.rhythm.none": t({
            en: "Don't remind me",
            es: "No me recuerdes",
            fr: "Pas de rappel",
            pt: "Não me lembre",
        }),
        "onboarding.rhythm.notifToday": t({
            en: "Time to write today's lines.",
            es: "Hora de escribir las líneas de hoy.",
            fr: "C'est l'heure d'écrire les lignes du jour.",
            pt: "Hora de escrever as linhas de hoje.",
        }),
        "onboarding.rhythm.notifYesterday": t({
            en: "Yesterday you wrote 3 lines.",
            es: "Ayer escribiste 3 líneas.",
            fr: "Hier, vous avez écrit 3 lignes.",
            pt: "Ontem você escreveu 3 linhas.",
            "pt-PT": "Ontem escreveu 3 linhas.",
        }),
        "onboarding.rhythm.remind": t({
            en: "Remind me at {time}",
            es: "Recuérdame a las {time}",
            fr: "Me le rappeler à {time}",
            pt: "Me lembre às {time}",
            "pt-PT": "Lembre-me às {time}",
        }),
        "onboarding.rhythm.title": t({
            en: "A ledger only works if you write in it.",
            es: "Un registro solo funciona si escribes en él.",
            fr: "Un journal ne sert que si vous écrivez dedans.",
            pt: "Um livro-caixa só funciona se você escrever nele.",
            "pt-PT": "Um livro-caixa só funciona se escrever nele.",
        }),
        "onboarding.welcome.begun": t({
            en: "Begun {date}",
            es: "Comenzado el {date}",
            fr: "Commencé le {date}",
            pt: "Iniciado em {date}",
        }),
        "onboarding.welcome.title": t({
            en: "Welcome to Outlayr",
            es: "Te damos la bienvenida a Outlayr",
            fr: "Bienvenue dans Outlayr",
            pt: "Boas-vindas ao Outlayr",
        }),
    },
    key: "onboarding" as const,
} satisfies Dictionary;

export default onboarding;
