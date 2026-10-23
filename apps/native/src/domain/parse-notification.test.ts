import { describe, expect, it } from "@jest/globals";

import { NOTIFICATION_PATTERNS, parseNotification } from "./parse-notification";

describe("parseNotification", () => {
    it("reads Wallet's own notification: card, then merchant with its place, then the amount", () => {
        expect(
            parseNotification("PAYONEER EUROPE LIMITED\nSumUp *Fantoni Grazia, Florence, Tuscany\n€22.60")
        ).toStrictEqual({
            amount: 22.6,
            amountText: "€22.60",
            income: false,
            merchant: "Fantoni Grazia",
        });
    });

    it("reads an English bank push", () => {
        const parsed = parseNotification(
            "Purchase alert\nYou made a $12.40 purchase at STARBUCKS with your card ending in 4321."
        );
        expect(parsed).toStrictEqual({ amount: 12.4, amountText: "$12.40", income: false, merchant: "STARBUCKS" });
    });

    it("reads Payoneer's card push, merchant in parentheses after the card", () => {
        expect(
            parseNotification(
                "USD card charge\nA charge of 1.86 USD was made to your Payoneer USD card XXXX-3111 (TRANSPORTES ROBER S A)"
            )
        ).toStrictEqual({ amount: 1.86, amountText: "1.86 USD", income: false, merchant: "TRANSPORTES ROBER S A" });
        expect(
            parseNotification(
                "USD card charge\nA charge of 11.63 USD was made to your Payoneer USD card XXXX-3111 (ANDALUCIA A PIE)"
            )
        ).toMatchObject({ amount: 11.63, merchant: "ANDALUCIA A PIE" });
    });

    it("keeps a bracketed merchant whole when it holds a stop word or a dot", () => {
        expect(
            parseNotification(
                "EUR card charge\nA charge of 2.00 EUR was made to your Payoneer EUR card XXXX-0294 (MERCADONA LA CATEDRAL)"
            )
        ).toMatchObject({ amount: 2, merchant: "MERCADONA LA CATEDRAL" });
        expect(
            parseNotification(
                "EUR card charge\nA charge of 14.22 EUR was made to your Payoneer EUR card XXXX-0294 (UBR* PENDING.UBER.COM)"
            )
        ).toMatchObject({ amount: 14.22, merchant: "UBR* PENDING.UBER.COM" });
    });

    it("names no merchant when the payee is only a card", () => {
        expect(parseNotification("A charge of 5.00 USD was made to your card XXXX-3111")).toMatchObject({
            amount: 5,
            merchant: null,
        });
    });

    it("reads Revolut's and Wise's card pushes", () => {
        expect(parseNotification("Card payment\nPaid 4,200 HUF to Wolt Hungary")).toMatchObject({
            amount: 4200,
            merchant: "Wolt Hungary",
        });
        expect(parseNotification("You spent 12.50 EUR at Spotify")).toMatchObject({
            amount: 12.5,
            merchant: "Spotify",
        });
    });

    it("reads a Spanish bank push with European grouping and a code", () => {
        const parsed = parseNotification("Compra aprobada por Bs. 1.250,00 en FARMATODO con tarjeta terminada en 1234");
        expect(parsed).toStrictEqual({
            amount: 1250,
            amountText: "Bs. 1.250,00",
            income: false,
            merchant: "FARMATODO",
        });
        expect(parseNotification("Pago realizado por USD 25.00 en AMAZON.")).toStrictEqual({
            amount: 25,
            amountText: "USD 25.00",
            income: false,
            merchant: "AMAZON",
        });
    });

    it("takes the amount when the unit trails the number", () => {
        expect(parseNotification("Pago de 12,50 € en Mercadona")).toMatchObject({
            amount: 12.5,
            merchant: "Mercadona",
        });
    });

    it("drops a declined charge", () => {
        expect(parseNotification("Declined\n$12.40 at STARBUCKS. Insufficient funds.")).toBeNull();
        expect(parseNotification("Compra rechazada por Bs. 1.250,00 en FARMATODO")).toBeNull();
        expect(parseNotification("Payment failed\nWe couldn't charge €9.99 for Netflix")).toBeNull();
    });

    it("reads money coming in as income, named by who sent it", () => {
        expect(parseNotification("You received $500.00 from Acme Inc")).toStrictEqual({
            amount: 500,
            amountText: "$500.00",
            income: true,
            merchant: "Acme Inc",
        });
        expect(parseNotification("Refund of $12.40 from STARBUCKS")).toMatchObject({
            income: true,
            merchant: "STARBUCKS",
        });
        expect(parseNotification("Recibiste USD 25.00 de Juan Pérez")).toMatchObject({
            income: true,
            merchant: "Juan Pérez",
        });
    });

    it("does not read a card's last digits or a word as a currency", () => {
        expect(parseNotification("Your card ending in 4321 was used")).toBeNull();
        expect(parseNotification("Purchase alert\nYou spent 12 at the pen shop")).toBeNull();
    });

    it("stops the amount at a line break", () => {
        expect(parseNotification("Blue Bottle Coffee\n$6.40\n3 items")).toMatchObject({
            amount: 6.4,
            amountText: "$6.40",
            merchant: "Blue Bottle Coffee",
        });
    });

    it("reads a dollar amount written US$ or U$S, as Latin American locales print it", () => {
        for (const body of ["US$ 8,75", "US$8,75", "8,75 US$"]) {
            expect(parseNotification(`Farmatodo\n${body} con Visa ••4821`)).toMatchObject({
                amount: 8.75,
                merchant: "Farmatodo",
            });
        }
        expect(parseNotification("Compraste U$S 25,00 en Amazon con tu tarjeta")).toMatchObject({
            amount: 25,
            merchant: "Amazon",
        });
    });

    it("reads Google Wallet's tap: merchant title, amount and masked card in the body", () => {
        const spanish = "Test Market\n1.234,56\u00A0€ con Mastercard Open Debit\u202F••0000";
        expect(parseNotification(spanish)).toStrictEqual({
            amount: 1234.56,
            amountText: "1.234,56\u00A0€",
            income: false,
            merchant: "Test Market",
        });
        expect(NOTIFICATION_PATTERNS.cardUsed.exec(spanish)?.[1]).toBe("Mastercard Open Debit\u202F••0000");
        expect(NOTIFICATION_PATTERNS.cardUsed.exec("CULVERS\n$31.64 with Like U •• 0780")?.[1]).toBe("Like U •• 0780");
        expect(NOTIFICATION_PATTERNS.cardUsed.exec("Pollos con Papas\n5,99 € con Visa ••0000")?.[1]).toBe(
            "Visa ••0000"
        );
        expect(NOTIFICATION_PATTERNS.cardUsed.exec("Google Wallet\nHas pagado 5,99 EUR en Test Market.")).toBeNull();
    });

    it("skips a notification with no amount", () => {
        expect(parseNotification("Your statement is ready")).toBeNull();
    });

    it("publishes its patterns as written, not as Babel's surrogate rewrite of a u-flag literal", () => {
        for (const { source } of Object.values(NOTIFICATION_PATTERNS)) {
            expect(source).not.toMatch(/\\uD[89AB]/i);
        }
    });
});
