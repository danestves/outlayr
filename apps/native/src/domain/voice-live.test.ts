import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import type { Language } from "@/i18n/languages";

import { parseLiveDraft } from "./voice-live";
import type { LiveDraft, LiveParseOptions } from "./voice-live";

// A Wednesday.
const NOW = new Date(2026, 10, 11, 9, 30);

const ACCOUNTS = [
    { currency: "VES", id: "banesco", name: "Banesco" },
    { currency: "USD", id: "banesco-usd", name: "Banesco USD" },
    { currency: "USD", id: "zelle", name: "Zelle" },
    { currency: "VES", id: "debito", name: "Débito Móvil" },
];

const CATEGORIES = [
    { id: "groceries", income: false, name: "Groceries" },
    { id: "mercado", income: false, name: "Mercado" },
    { id: "cafe", income: false, name: "Café" },
    { id: "salary", income: true, name: "Salary" },
    { id: "freelance", income: true, name: "Freelance" },
];

function parse(text: string, language: Language = "en", options?: LiveParseOptions) {
    return parseLiveDraft(
        text,
        { accounts: ACCOUNTS, categories: CATEGORIES, currency: "USD", language, now: NOW },
        options
    );
}

const spanOf = (text: string, field: { end: number; start: number } | null) =>
    field === null ? null : text.slice(field.start, field.end);

describe("amount", () => {
    it.each([
        ["en", "I paid $1,500.50 for lunch", 1500.5],
        ["en", "I paid 1,500 dollars for lunch", 1500],
        ["en", "I paid 15.99 dollars for lunch", 15.99],
        ["en", "I paid 1.5 dollars for lunch", 1.5],
        ["en", "I paid $20k for rent", 20_000],
        ["es", "Gasté 1.500,50 dólares en comida", 1500.5],
        ["es", "Gasté 1,500.50 dólares en comida", 1500.5],
        ["es", "Gasté 1.500 dólares en comida", 1500],
        ["es", "Gasté 15,99 dólares en comida", 15.99],
        ["es", "Gasté 20 mil bolívares en comida", 20_000],
        ["es-ES", "Gasté 2.500.000 euros en comida", 2_500_000],
        ["pt", "Paguei R$ 1.234,56 no mercado", 1234.56],
        ["pt", "Paguei 3,5 milhões de reais", 3_500_000],
        ["fr", "J'ai payé 1 500,50 euros pour le café", 1500.5],
        ["fr", "J'ai payé 15,99 euros pour le café", 15.99],
    ] as const)("%s: %s", (language, text, expected) => {
        expect(parse(text, language, { final: true }).amount?.value).toBe(expected);
    });

    it("rounds to the spoken currency's minor units, not the default's", () => {
        expect(parse("paid 1,000.456 dollars", "en").amount?.value).toBe(1000.46);
    });

    it("ignores clock times, dates, years and percentages", () => {
        expect(parse("at 5:30 pm I paid 12 dollars", "en").amount?.value).toBe(12);
        expect(parse("el 15 de marzo gasté 20 dólares", "es").amount?.value).toBe(20);
        expect(parse("on March 5 I paid 8 dollars", "en").amount?.value).toBe(8);
        expect(parse("en marzo de 2026 gasté 30 dólares", "es").amount?.value).toBe(30);
        expect(parse("a las 5 gasté 9 euros", "es").amount?.value).toBe(9);
        expect(parse("I paid 20% tip", "en", { final: true }).amount).toBeNull();
        expect(parse("every 2 weeks I pay 15 dollars", "en").amount?.value).toBe(15);
    });

    it("prefers a number with a currency over a quantity", () => {
        const text = "3 coffees for 12 dollars";
        const draft = parse(text);
        expect(draft.amount?.value).toBe(12);
        expect(spanOf(text, draft.amount)).toBe("12");
        expect(spanOf(text, draft.currency)).toBe("dollars");
        expect(draft.currency?.value).toBe("USD");
    });

    it("reads symbols and codes before and after the number", () => {
        expect(parse("paid €20").currency?.value).toBe("EUR");
        expect(parse("pagué 20 bs").currency?.value).toBe("VES");
        expect(parse("paid usd 20").currency?.value).toBe("USD");
        expect(parse("paid R$ 20").currency?.value).toBe("BRL");
        expect(parse("paid 20").currency).toBeNull();
    });

    it("holds a bare trailing number until the next word or the final transcript", () => {
        expect(parse("I paid 20").amount).toBeNull();
        expect(parse("I paid 15.").amount).toBeNull();
        expect(parse("I paid 20", "en", { final: true }).amount?.value).toBe(20);
        expect(parse("I paid 15.", "en", { final: true }).amount?.value).toBe(15);
        expect(parse("Gasté 20", "es").amount).toBeNull();
        expect(parse("Gasté 20 mil", "es").amount?.value).toBe(20_000);
    });
});

describe("accounts and categories", () => {
    it("prefers the longest account name", () => {
        const text = "I paid with Banesco USD for lunch";
        const draft = parse(text);
        expect(draft.accountId?.value).toBe("banesco-usd");
        expect(spanOf(text, draft.accountId)).toBe("Banesco USD");
        expect(parse("I paid with Banesco for lunch").accountId?.value).toBe("banesco");
    });

    it("hears Banesco in a Spanish transcript that spelled it with a v", () => {
        const text = "Veinte dólares en Farmatodo con Vanesco hoy";
        const draft = parse(text, "es");
        expect(draft.accountId?.value).toBe("banesco");
        expect(spanOf(text, draft.accountId)).toBe("Vanesco");
        expect(parse("I paid with Vanesco for lunch").accountId).toBeNull();
    });

    it("waits at the tail while a longer name could still be coming", () => {
        expect(parse("I paid with Banesco").accountId).toBeNull();
        expect(parse("I paid with Banesco", "en", { final: true }).accountId?.value).toBe("banesco");
        expect(parse("I paid with Zelle").accountId?.value).toBe("zelle");
    });

    it("matches ignoring case and accents, on whole words only", () => {
        const text = "pagué con DEBITO MOVIL y café";
        const draft = parse(text, "es");
        expect(draft.accountId?.value).toBe("debito");
        expect(spanOf(text, draft.accountId)).toBe("DEBITO MOVIL");
        expect(draft.categoryId?.value).toBe("cafe");
        expect(spanOf(text, draft.categoryId)).toBe("café");
        expect(parse("paid with Zellers for lunch").accountId).toBeNull();
    });

    it("keeps spans on the original text when it has decomposed accents", () => {
        const text = "pague 5 dolares en café hoy";
        const draft = parse(text, "es");
        expect(spanOf(text, draft.date)).toBe("hoy");
    });

    it("matches an income category only for income", () => {
        expect(parse("got paid 500 dollars salary", "en").categoryId?.value).toBe("salary");
        expect(parse("I spent 5 dollars on freelance", "en").categoryId).toBeNull();
        expect(parse("got paid 5 dollars freelance", "en").categoryId?.value).toBe("freelance");
        expect(parse("got paid 5 dollars for groceries", "en").categoryId).toBeNull();
    });

    it("leaves the account empty when the text names two different ones", () => {
        expect(parse("paid with Zelle and Débito Móvil for lunch").accountId).toBeNull();
    });
});

describe("transfers", () => {
    it.each([
        ["en", "I moved 200 dollars from Banesco to Zelle", "Banesco", "Zelle"],
        ["en", "I transferred 200 dollars to my Zelle account from Banesco USD", "Banesco USD", "Zelle"],
        ["es", "Transferí 200 dólares de Banesco a Zelle", "Banesco", "Zelle"],
        ["es", "Pasé 200 dólares de la cuenta Banesco USD a mi Zelle", "Banesco USD", "Zelle"],
        ["pt", "Transferi 200 dólares da Banesco para a Zelle", "Banesco", "Zelle"],
        ["fr", "J'ai transféré 200 euros de Banesco à Zelle", "Banesco", "Zelle"],
        ["fr", "J'ai viré 200 euros de mon compte Zelle vers Banesco USD", "Zelle", "Banesco USD"],
    ] as const)("%s: %s", (language, text, from, to) => {
        const draft = parse(text, language, { final: true });
        expect(draft.kind?.value).toBe("transfer");
        expect(spanOf(text, draft.fromAccountId)).toBe(from);
        expect(spanOf(text, draft.toAccountId)).toBe(to);
        expect(draft.accountId).toBeNull();
        expect(draft.categoryId).toBeNull();
        expect(draft.recurrence).toBeNull();
    });

    it("reads two accounts without prepositions as from then to", () => {
        const draft = parse("moved 50 Zelle Débito Móvil", "en", { final: true });
        expect(draft.fromAccountId?.value).toBe("zelle");
        expect(draft.toAccountId?.value).toBe("debito");
    });

    it("treats sent and pasé as a transfer only once an account says so", () => {
        expect(parse("sent $20 to Zelle", "en").kind).toBeNull();
        expect(parse("sent $20 to Zelle", "en").accountId).toBeNull();
        expect(parse("sent $20 from Zelle to Débito Móvil", "en").kind?.value).toBe("transfer");
        expect(parse("pasé 20 dólares por el super", "es").kind).toBeNull();
    });

    it("does not use one account on both sides", () => {
        const draft = parse("moved 50 from Zelle to Zelle", "en");
        expect(draft.fromAccountId?.value).toBe("zelle");
        expect(draft.toAccountId).toBeNull();
    });
});

describe("income", () => {
    it.each([
        ["en", "I got paid 500 dollars", true],
        ["en", "someone paid me 40 dollars", true],
        ["en", "I paid 40 dollars for lunch", false],
        ["es", "Me pagaron 500 dólares", true],
        ["es", "Recibí 500 dólares", true],
        ["es", "Gasté 40 dólares", false],
        ["pt", "Recebi 500 dólares", true],
        ["pt", "Paguei 40 dólares", false],
        ["fr", "J'ai reçu 500 euros", true],
        ["fr", "On m'a payé 500 euros", true],
        ["fr", "J'ai payé 40 euros", false],
    ] as const)("%s: %s", (language, text, expected) => {
        expect(parse(text, language, { final: true }).income?.value).toBe(expected);
    });

    it("does not call a trailing 'paid' an expense before 'me' can follow", () => {
        expect(parse("someone paid").income).toBeNull();
        expect(parse("someone paid me").income?.value).toBe(true);
    });

    it("anchors the entry on the amount", () => {
        const text = "I got paid 500 dollars";
        expect(spanOf(text, parse(text).kind)).toBe("500");
        expect(parse("hello there").kind).toBeNull();
    });
});

describe("dates", () => {
    const day = (draft: LiveDraft) => draft.date?.value.getDate();

    it("resolves relative days in every language", () => {
        expect(parse("paid 5 dollars yesterday").date?.value.getDate()).toBe(10);
        expect(parse("paid 5 dollars the day before yesterday").date?.value.getDate()).toBe(9);
        expect(parse("pagué ayer", "es").date?.value.getDate()).toBe(10);
        expect(parse("pagué anteayer", "es").date?.value.getDate()).toBe(9);
        expect(parse("paguei ontem", "pt").date?.value.getDate()).toBe(10);
        expect(parse("j'ai payé avant-hier", "fr").date?.value.getDate()).toBe(9);
    });

    it("keeps the clock for today and noon for other days", () => {
        expect(parse("paid today").date?.value).toBe(NOW);
        const yesterday = parse("paid yesterday").date?.value;
        expect(yesterday?.getHours()).toBe(12);
        expect(yesterday?.getMonth()).toBe(10);
    });

    it("picks the latest past weekday, a week back when it is today", () => {
        expect(day(parse("paid on monday ok", "en"))).toBe(9);
        expect(day(parse("paid on wednesday ok", "en"))).toBe(4);
        expect(day(parse("pagué el sábado ok", "es"))).toBe(7);
        expect(day(parse("paguei na terça-feira ok", "pt"))).toBe(10);
        expect(day(parse("j'ai payé vendredi dernier", "fr"))).toBe(6);
    });

    it("skips an upcoming weekday and waits on a weekday at the tail", () => {
        expect(parse("paid next friday ok", "en").date).toBeNull();
        expect(parse("pagué el lunes que viene", "es").date).toBeNull();
        expect(parse("pagué el lunes", "es").date).toBeNull();
        expect(parse("pagué el lunes", "es", { final: true }).date?.value.getDate()).toBe(9);
    });

    it("crosses month boundaries", () => {
        const first = new Date(2026, 10, 1, 8, 0);
        const draft = parseLiveDraft(
            "ayer",
            { accounts: [], categories: [], currency: "USD", language: "es", now: first },
            { final: true }
        );
        expect(draft.date?.value.getMonth()).toBe(9);
        expect(draft.date?.value.getDate()).toBe(31);
    });
});

describe("recurrence", () => {
    it.each([
        ["en", "Netflix 15 dollars every month", 1, RECURRING_TYPE.monthly],
        ["en", "gym 15 dollars a month", 1, RECURRING_TYPE.monthly],
        ["en", "15 dollars every 2 weeks", 2, RECURRING_TYPE.weekly],
        ["en", "15 dollars every other month", 2, RECURRING_TYPE.monthly],
        ["en", "15 dollars annually", 1, RECURRING_TYPE.yearly],
        ["es", "Netflix 15 dólares cada mes", 1, RECURRING_TYPE.monthly],
        ["es", "Netflix 15 dólares al mes", 1, RECURRING_TYPE.monthly],
        ["es", "15 dólares todos los años", 1, RECURRING_TYPE.yearly],
        ["es", "15 dólares cada 15 días", 15, RECURRING_TYPE.daily],
        ["es-ES", "15 euros mensual", 1, RECURRING_TYPE.monthly],
        ["pt", "15 reais todo mês", 1, RECURRING_TYPE.monthly],
        ["pt", "15 reais a cada 3 meses", 3, RECURRING_TYPE.monthly],
        ["pt-PT", "15 euros por semana", 1, RECURRING_TYPE.weekly],
        ["fr", "15 euros chaque mois", 1, RECURRING_TYPE.monthly],
        ["fr", "15 euros toutes les 2 semaines", 2, RECURRING_TYPE.weekly],
        ["fr", "15 euros par an", 1, RECURRING_TYPE.yearly],
    ] as const)("%s: %s", (language, text, coefficient, type) => {
        expect(parse(text, language).recurrence?.value).toStrictEqual({ coefficient, type });
    });

    it("does not read a past or one-off span as a subscription", () => {
        expect(parse("paid 15 dollars a month ago").recurrence).toBeNull();
        expect(parse("paid 15 dollars for a month").recurrence).toBeNull();
        expect(parse("el mes pasado pagué 15 dólares", "es").recurrence).toBeNull();
    });

    it("waits for the unit before committing", () => {
        expect(parse("15 dollars every").recurrence).toBeNull();
        expect(parse("15 dollars every 2").recurrence).toBeNull();
    });

    it("gives a transfer none", () => {
        expect(parse("moved 15 dollars from Zelle to Banesco every month").recurrence).toBeNull();
    });
});

describe("while the text grows", () => {
    const SENTENCES = [
        ["en", "I paid 1,500.50 dollars for groceries at Banesco USD yesterday every month"],
        ["en", "I moved 200 dollars from Banesco to Zelle yesterday"],
        ["en", "someone paid me 40 dollars for Salary on monday"],
        ["es", "Gasté 1.500,50 dólares en café con Banesco USD ayer cada mes"],
        ["es", "Pasé 200 dólares de Banesco a Zelle ayer"],
        ["es", "Me pagaron 20 mil bolívares de Salary el lunes"],
        ["es-ES", "Gasté 1.500,50 euros en café con Zelle hoy mensual"],
        ["pt", "Paguei R$ 1.234,56 no mercado com Banesco USD ontem todo mês"],
        ["pt", "Transferi 200 dólares da Banesco para a Zelle ontem"],
        ["fr", "J'ai payé 1 500,50 euros pour le café avec Banesco USD hier chaque mois"],
        ["fr", "J'ai transféré 200 euros de Banesco à Zelle hier"],
    ] as const;

    const FIELDS = [
        "accountId",
        "amount",
        "categoryId",
        "currency",
        "date",
        "fromAccountId",
        "income",
        "kind",
        "recurrence",
        "toAccountId",
    ] as const;

    const valueOf = (draft: LiveDraft, field: (typeof FIELDS)[number]) => JSON.stringify(draft[field]?.value ?? null);

    it.each(SENTENCES)("%s: %s", (language, sentence) => {
        const settled = parse(sentence, language, { final: true });
        const words = sentence.split(" ");
        for (let count = 1; count <= words.length; count += 1) {
            const draft = parse(words.slice(0, count).join(" "), language);
            for (const field of FIELDS) {
                const seen = valueOf(draft, field);
                if (seen !== "null") {
                    expect(seen, `${field} after "${words.slice(0, count).join(" ")}"`).toBe(valueOf(settled, field));
                }
            }
        }
    });

    it("fills the headline fields of the settled sentence", () => {
        const settled = parse("Gasté 1.500,50 dólares en café con Banesco USD ayer cada mes", "es", { final: true });
        expect(settled.amount?.value).toBe(1500.5);
        expect(settled.accountId?.value).toBe("banesco-usd");
        expect(settled.categoryId?.value).toBe("cafe");
        expect(settled.recurrence?.value.type).toBe(RECURRING_TYPE.monthly);
        expect(settled.date?.value.getDate()).toBe(10);
        expect(settled.income?.value).toBe(false);
    });
});
