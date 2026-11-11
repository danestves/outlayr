import { describe, expect, it } from "vite-plus/test";

import { hasChargeAmount, mergeNotificationRead, NOTIFICATION_PATTERNS, parseNotification } from "./parse-notification";

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

    it("reads a bank push that names the merchant before the amount", () => {
        expect(
            parseNotification(
                "Your transaction was successful\nYour SiteGround transaction in the amount of USD 22.99 on Nov 02 2026, 20:44 CST was approved on the card ending with 7909."
            )
        ).toStrictEqual({ amount: 22.99, amountText: "USD 22.99", income: false, merchant: "SiteGround" });
        expect(
            parseNotification(
                "Your transaction was successful\nPayment of USD 22.99 approved on the card ending with 7909."
            )
        ).toMatchObject({ merchant: null });
        for (const text of [
            "Chase\nYour recent transaction of $45.00 was approved.",
            "Purchase alert\nYour debit card purchase of $12.40 was approved.",
            "Your Visa card purchase of $12.40",
            "Your card ending in 1234 transaction of $9.99",
            "Your Recent transaction of $45.00 was approved.",
        ]) {
            expect(parseNotification(text)).toMatchObject({ merchant: null });
        }
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
        expect(
            parseNotification(
                "BDV: operación pago de servicio movistar, por Bs. 500  no realizada. Por favor, intente de nuevo más tarde."
            )
        ).toBeNull();
    });

    it("reads Venezuelan bank notices in each bank's own number format", () => {
        expect(
            parseNotification(
                "Recibiste un PagomovilBDV por Bs.5.953,10 del 0424-5550103 Ref: 000717000003 en fecha 27-03-26 hora: 22:25."
            )
        ).toStrictEqual({ amount: 5953.1, amountText: "Bs.5.953,10", income: true, merchant: null });
        expect(
            parseNotification(
                "BNC Pago Movil Recibido Bs.250000,00 Telf.0412***9999 Dia:15/07/26-10:31 Ref:987654321 Llamar al 0500-2625000 si no realizo esta Operacion"
            )
        ).toStrictEqual({ amount: 250_000, amountText: "Bs.250000,00", income: true, merchant: null });
        expect(
            parseNotification(
                "BBVA Provincial informa Pago Movil desde cuenta 5256 por Bs. 30,206.00. Si no la realizaste envia N al 77106 o llama al 0212-5550199 F2026/08/05H15:51:44"
            )
        ).toStrictEqual({ amount: 30_206, amountText: "Bs. 30,206.00", income: false, merchant: null });
        expect(
            parseNotification(
                "Operacion en linea con tu Tarjeta Internacional #4325 por $.300,00 el 15-04-26 a las 14:04. Inf. 0500-6425283"
            )
        ).toStrictEqual({ amount: 300, amountText: "$.300,00", income: false, merchant: null });
    });

    it("names who sent the money when the bank puts the name before the amount", () => {
        expect(
            parseNotification(
                "Transferencia de otros bancos recibida\nRecibiste una transferencia de otros bancos de JUAN CARLOS RODRIGUEZ DIAZ por Bs. 15.900,00 bajo el número de operación 68800010. Saldo disponible Bs. 15.900,63"
            )
        ).toStrictEqual({
            amount: 15_900,
            amountText: "Bs. 15.900,00",
            income: true,
            merchant: "JUAN CARLOS RODRIGUEZ DIAZ",
        });
        expect(
            parseNotification(
                "Has recibido un Pago Movil\nBANESCO REGISTRO: Pago recibido a traves de Pago Movil de LOPEZ M por Bs. 1900.0 el 31/08/2026; 15:43 REF 062400000018. Para mas inf. llama..."
            )
        ).toStrictEqual({ amount: 1900, amountText: "Bs. 1900.0", income: true, merchant: "LOPEZ M" });
        expect(
            parseNotification(
                "BANESCO REGISTRO: Pago recibido a traves de Pago Movil por Bs.1880.00 el 26/01/2023; 12:04 REF 047300000903. Para mas inf. llama +582125550111"
            )
        ).toStrictEqual({ amount: 1880, amountText: "Bs.1880.00", income: true, merchant: null });
    });

    it("names nobody from a date, a time or an operation number", () => {
        expect(
            parseNotification(
                "Realizaste un PagomovilBDV por Bs. 150,30 al 0416-5550104, comisión Bs. 0,66 Ref: 000226000004 en fecha: 10-07-24 hora: 11:05"
            )
        ).toStrictEqual({ amount: 150.3, amountText: "Bs. 150,30", income: false, merchant: null });
        expect(
            parseNotification(
                "Pago sin contacto realizado en punto de venta por Bs. 5.910,00, bajo el #2977, disp. 366.258,19 el 15-04-26 a las 17:46."
            )
        ).toStrictEqual({ amount: 5910, amountText: "Bs. 5.910,00", income: false, merchant: null });
        expect(NOTIFICATION_PATTERNS.receivedFrom.exec(" bajo el numero de operacion 005700000011")).toBeNull();
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

    it("does not read a sender code or a distance as a single-letter currency", () => {
        expect(parseNotification("7L\n¿Qué cuenta es Messages? Toca para elegir.")).toBeNull();
        expect(parseNotification("Your driver is 12KM away and arriving")).toBeNull();
        expect(parseNotification("Step 3P of the setup is done")).toBeNull();
    });

    it("still reads a single-letter currency when the number is written as an amount", () => {
        expect(parseNotification("Compra aprobada por L 1,250.00 en FARMATODO")).toMatchObject({
            amount: 1250,
            amountText: "L 1,250.00",
        });
        expect(parseNotification("Compra aprobada por L1,250.00 en FARMATODO")).toMatchObject({ amount: 1250 });
        expect(parseNotification("Card payment\nR 120,00 at Woolworths")).toMatchObject({
            amount: 120,
            merchant: "Woolworths",
        });
        expect(parseNotification("Pagaste Q150.00 en La Torre")).toMatchObject({ amount: 150, merchant: "La Torre" });
    });

    it("does not read a discount or a balance reminder as a charge", () => {
        for (const text of [
            "Get $10 off your next purchase",
            "Use code SAVE10 for $10 off",
            "Save $10 on your next order",
            "10 € de réduction sur votre prochaine commande",
            "10 € de descuento en tu próxima compra",
            "You have $1,000 available credit on your card",
            "Tu saldo disponible: Bs. 1.250,00",
            "Saldo Disp. en Cta\n4548: 101,25Bs",
            "Your balance is $180.00",
            "Card ending 7909: $1,234.00 balance",
            "Discount: $10.00",
            "Discount of $10.00",
            "Available credit: $1,000.00",
            "Crédito disponible: $1.000,00",
            "Você tem R$ 1.000,00 disponível",
        ]) {
            expect(parseNotification(text)).toBeNull();
            expect(hasChargeAmount(text)).toBe(false);
        }
    });

    it("keeps a purchase that a discount or a balance shares the text with", () => {
        expect(parseNotification("Purchase of $20.00 at STARBUCKS. Available balance $180.00")).toMatchObject({
            amount: 20,
            merchant: "STARBUCKS",
        });
        expect(parseNotification("Get $10 off your next order. You spent $25.00 at OXXO")).toMatchObject({
            amount: 25,
            merchant: "OXXO",
        });
        expect(parseNotification("You spent $25 at Save Mart")).toMatchObject({ amount: 25, merchant: "Save Mart" });
        expect(parseNotification("Discount: $10.00. You spent $25.00 at OXXO")).toMatchObject({
            amount: 25,
            merchant: "OXXO",
        });
        expect(parseNotification("Available credit: $1,000.00. You spent $25.00 at OXXO")).toMatchObject({
            amount: 25,
            merchant: "OXXO",
        });
        expect(parseNotification("Blue Bottle Coffee\n$6.40\nAvailable credit: $1,000.00")).toMatchObject({
            amount: 6.4,
            merchant: "Blue Bottle Coffee",
        });
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

describe("mergeNotificationRead", () => {
    const TEXT = "Your SiteGround transaction in the amount of USD 22.99 was approved";
    const parsed = { amount: 22.99, amountText: "USD 22.99", income: false, merchant: null };

    it("logs nothing when the AI reads a decline the parser took for a purchase", () => {
        expect(
            mergeNotificationRead(TEXT, parsed, {
                amount: 22.99,
                currency: "USD",
                kind: "declined",
                merchant: "SiteGround",
            })
        ).toBeNull();
    });

    it("still logs what the parser read when the AI calls it something other than a purchase", () => {
        expect(
            mergeNotificationRead(TEXT, parsed, { amount: null, currency: null, kind: "other", merchant: null })
        ).toBe(parsed);
    });

    it("takes the AI's merchant and keeps the parser's amount where the AI left it null", () => {
        expect(
            mergeNotificationRead(TEXT, parsed, {
                amount: null,
                currency: null,
                kind: "purchase",
                merchant: "SiteGround",
            })
        ).toStrictEqual({ amount: 22.99, amountText: "USD 22.99", income: false, merchant: "SiteGround" });
    });

    it("logs a transfer the parser missed, with the currency the text names", () => {
        expect(
            mergeNotificationRead("Juan te envió 1500 ARS", null, {
                amount: 1500,
                currency: "ARS",
                kind: "income",
                merchant: "Juan",
            })
        ).toStrictEqual({ amount: 1500, amountText: "ARS 1500", income: true, merchant: "Juan" });
    });

    it("drops the parser's currency when the AI read a different amount", () => {
        const text = "Purchase of EUR 100.00 approved. Charged USD 108.40 to your card";
        expect(
            mergeNotificationRead(text, parseNotification(text), {
                amount: 108.4,
                currency: null,
                kind: "purchase",
                merchant: null,
            })
        ).toMatchObject({ amount: 108.4, amountText: "108.4" });
    });

    it("keeps the AI's currency off an amount that shows another one", () => {
        const text = "Purchase of EUR 100.00 approved. Charged USD 108.40 to your card";
        expect(
            mergeNotificationRead(text, parseNotification(text), {
                amount: 100,
                currency: "USD",
                kind: "purchase",
                merchant: null,
            })
        ).toMatchObject({ amount: 100, amountText: "EUR 100.00" });
    });

    it("leaves a bare $ for the card's account to settle, whatever currency the AI guessed", () => {
        const text = "Compra aprobada\nCompraste $250.00 en OXXO";
        expect(
            mergeNotificationRead(text, parseNotification(text), {
                amount: 250,
                currency: "USD",
                kind: "purchase",
                merchant: "OXXO",
            })
        ).toMatchObject({ amount: 250, amountText: "$250.00" });
    });
});
