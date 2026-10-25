import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const onboarding = {
    content: {
        "onboarding.cover.line": t({
            en: "A ledger you keep by hand. Every entry yours, on this device.",
            es: "Un registro que llevas a mano. Cada entrada es tuya, en este dispositivo.",
            pt: "Um livro-caixa que você preenche à mão. Cada lançamento é seu, neste dispositivo.",
        }),
        "onboarding.currency.body": t({
            en: "Everything totals in this. Change it any time — old entries keep their own.",
            es: "Todo se suma en esta moneda. Cámbiala cuando quieras; las entradas anteriores conservan la suya.",
            pt: "Tudo é somado nesta moeda. Mude quando quiser; os lançamentos antigos mantêm a deles.",
        }),
        "onboarding.currency.change": t({
            en: "Change",
            es: "Cambiar",
            pt: "Alterar",
        }),
        "onboarding.currency.eyebrow": t({
            en: "Currency",
            es: "Moneda",
            pt: "Moeda",
        }),
        "onboarding.currency.openHint": t({
            en: "Opens the currency list",
            es: "Abre la lista de monedas",
            pt: "Abre a lista de moedas",
        }),
        "onboarding.currency.picker.searchPlaceholder": t({
            en: "Search currencies",
            es: "Buscar monedas",
            pt: "Buscar moedas",
        }),
        "onboarding.currency.picker.title": t({
            en: "Select a currency",
            es: "Selecciona una moneda",
            pt: "Escolha uma moeda",
        }),
        "onboarding.currency.saveFailed.body": t({
            en: "Outlayr could not record your currency. Try again.",
            es: "Outlayr no pudo registrar tu moneda. Inténtalo de nuevo.",
            pt: "O Outlayr não conseguiu registrar sua moeda. Tente de novo.",
        }),
        "onboarding.currency.saveFailed.title": t({
            en: "Could not save",
            es: "No se pudo guardar",
            pt: "Não foi possível salvar",
        }),
        "onboarding.currency.saving": t({
            en: "Saving…",
            es: "Guardando…",
            pt: "Salvando…",
        }),
        "onboarding.currency.shortcut": t({
            en: "I already have an account",
            es: "Ya tengo una cuenta",
            pt: "Já tenho uma conta",
        }),
        "onboarding.currency.title": t({
            en: "What are your numbers in?",
            es: "¿En qué moneda manejas tu dinero?",
            pt: "Em qual moeda você controla seu dinheiro?",
        }),
        "onboarding.rhythm.body": t({
            en: "One quiet nudge each evening. iOS isn't asked for permission until your first entry is saved.",
            es: "Un aviso discreto cada noche. iOS no te pide permiso hasta que guardes tu primera entrada.",
            pt: "Um lembrete discreto toda noite. O iOS só pede permissão depois que você salvar seu primeiro lançamento.",
        }),
        "onboarding.rhythm.body.android": t({
            en: "One quiet nudge each evening. Android won't ask for permission until your first entry is saved.",
            es: "Un aviso discreto cada noche. Android no te pide permiso hasta que guardes tu primera entrada.",
            pt: "Um lembrete discreto toda noite. O Android só pede permissão depois que você salvar seu primeiro lançamento.",
        }),
        "onboarding.rhythm.eyebrow": t({
            en: "Rhythm",
            es: "Ritmo",
            pt: "Ritmo",
        }),
        "onboarding.rhythm.none": t({
            en: "Don't remind me",
            es: "No me recuerdes",
            pt: "Não me lembre",
        }),
        "onboarding.rhythm.notifToday": t({
            en: "Time to write today's lines.",
            es: "Hora de escribir las líneas de hoy.",
            pt: "Hora de escrever as linhas de hoje.",
        }),
        "onboarding.rhythm.notifYesterday": t({
            en: "Yesterday you wrote 3 lines.",
            es: "Ayer escribiste 3 líneas.",
            pt: "Ontem você escreveu 3 linhas.",
        }),
        "onboarding.rhythm.remind": t({
            en: "Remind me at {time}",
            es: "Recuérdame a las {time}",
            pt: "Me lembre às {time}",
        }),
        "onboarding.rhythm.title": t({
            en: "A ledger only works if you write in it.",
            es: "Un registro solo funciona si escribes en él.",
            pt: "Um livro-caixa só funciona se você escrever nele.",
        }),
        "onboarding.welcome.begun": t({
            en: "Begun {date}",
            es: "Comenzado el {date}",
            pt: "Iniciado em {date}",
        }),
        "onboarding.welcome.title": t({
            en: "Welcome to Outlayr",
            es: "Te damos la bienvenida a Outlayr",
            pt: "Boas-vindas ao Outlayr",
        }),
    },
    key: "onboarding" as const,
} satisfies Dictionary;

export default onboarding;
