import { describe, expect, it } from "vite-plus/test";

import { detectCurrency } from "./detect-currency";
import {
    hasChargeAmount,
    mergeDebtRead,
    mergeNotificationRead,
    NOTIFICATION_PATTERNS,
    parseDebt,
    parseNotification,
} from "./parse-notification";

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

    it("logs a Payoneer payment once, as income from the sender when it is deposited", () => {
        const onItsWay = "Payment update\nA 150.00 USD payment from Jane Marie Doe Smith is on its way to you";
        expect(parseNotification(onItsWay)).toBeNull();
        expect(hasChargeAmount(onItsWay)).toBe(false);
        expect(parseNotification("$12.00 at On The Way Market")).toMatchObject({ amount: 12 });
        expect(
            parseNotification(
                "Payment update\n150.00 USD from Jane Marie Doe Smith was deposited into your Payoneer account"
            )
        ).toStrictEqual({
            amount: 150,
            amountText: "150.00 USD",
            income: true,
            merchant: "Jane Marie Doe Smith",
        });
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

    it("reads a dot that groups thousands with no decimals, as Colombian and Chilean pesos print", () => {
        expect(parseNotification("Compra aprobada por $25.000 en Exito")).toMatchObject({ amount: 25_000 });
        expect(parseNotification("Compra aprobada por $1.250.000 en Falabella")).toMatchObject({ amount: 1_250_000 });
        expect(parseNotification("You spent $1,250 at Costco")).toMatchObject({ amount: 1250 });
        expect(parseNotification("Purchase of KWD 1.250 at Sultan Center")).toMatchObject({ amount: 1.25 });
    });

    it("reads a USDt amount as dollars", () => {
        expect(parseNotification("Compraste 5,50 USDt en Starbucks")).toMatchObject({
            amount: 5.5,
            amountText: "5,50 USDt",
            merchant: "Starbucks",
        });
        expect(detectCurrency("5,50 USDt")).toBe("USD");
    });

    it("reads a home mark the catalog does not carry as money", () => {
        expect(parseNotification("Consumo de S/. 45.90 en Tambo")).toMatchObject({
            amount: 45.9,
            amountText: "S/. 45.90",
        });
        expect(parseNotification("Compra por RD$ 1,250.00 en La Sirena")).toMatchObject({
            amount: 1250,
            amountText: "RD$ 1,250.00",
        });
        expect(parseNotification("您在星巴克消费 38.00元")).toMatchObject({ amount: 38, amountText: "38.00元" });
        expect(parseNotification("Paid Rs. 250 at Big Bazaar")).toMatchObject({ amount: 250, amountText: "Rs. 250" });
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

    it("drops a reminder of a payment due, on device and before the AI read", () => {
        for (const text of [
            "Equipo Cashea\nMañana vencen tus pagos ⏰\nPuedes pagar desde la app.\nPaga hoy y duplica tus puntos\nQueremos recordarte que mañana vencen algunos de tus pagos.\nSi los haces hoy, duplicarás tus puntos, mantendrás tu línea de compra activa, y evitas el cargo por atraso de $4.",
            "Tu cuota de $25,00 vence mañana",
            "Your payment of $50.00 is due tomorrow. Pay today to avoid a late fee.",
            "Recordatorio de pago: tu factura de Bs. 320,00 está por vencer",
            "Your payment of $50.00 is overdue",
            "Tu cuota de $25,00 está vencida",
        ]) {
            expect(parseNotification(text)).toBeNull();
            expect(hasChargeAmount(text)).toBe(false);
            expect(NOTIFICATION_PATTERNS.declined.test(text)).toBe(true);
        }
    });

    it("keeps a purchase that mentions its next due date or a security reminder", () => {
        expect(
            parseNotification("Compraste $100,00 en Farmatodo. Tu próxima cuota de $25,00 vence el 15/12.")
        ).toMatchObject({ amount: 100, merchant: "Farmatodo" });
        expect(
            parseNotification("Compra por Bs. 500,00 en FARMATODO. Te recordamos que nunca te pediremos tu clave.")
        ).toMatchObject({ amount: 500, merchant: "FARMATODO" });
        expect(parseNotification("Se aplicó un cargo por atraso de $4,00 por una cuota vencida")).toMatchObject({
            amount: 4,
        });
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

    it("reads a personal text that says someone sent you money as income", () => {
        expect(parseNotification("Epa, te transferi Bs. 275,50 de la cena de anoche.")).toMatchObject({
            amount: 275.5,
            income: true,
        });
        expect(parseNotification("Listo, te hice el pago móvil por Bs. 1.200,00")).toMatchObject({
            amount: 1200,
            income: true,
        });
        expect(parseNotification("Transferiste Bs. 275,50 a Maria")).toMatchObject({ income: false });
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
            "Spoiler: subió el dólar\nSe movió 2,3% en los últimos días. En Plenti la tasa de compra está en $3.328. Tú sabrás 😏",
            "Tasa BCV: Bs. 36,50",
            "Tipo de cambio hoy: $17.45",
            "Today's exchange rate is $1.08",
        ]) {
            expect(parseNotification(text)).toBeNull();
            expect(hasChargeAmount(text)).toBe(false);
        }
    });

    it("does not read a spend threshold or a reward in an offer as a charge", () => {
        for (const text of [
            "Binance\n💸 Aprovecha tu cashback de Black Friday\n6% extra de cashback si gastas más de $1,000 con tu Binance Card. Hasta 20 USDC. 👉",
            "Spend $50 and get $10 back with your Uber card",
            "Earn up to $20 in rewards this weekend",
            "Gasta $30 y recibe $5 de bono en tu próximo pedido",
            "Envío gratis en compras desde $15",
            "Ganhe R$ 20 de cashback em compras acima de R$ 100",
            "Dépensez 50 € et obtenez 10 € de remise",
            "Orders over $25 ship free",
            "Get $10 cashback when you spend at least $50",
            "Gasta al menos Bs. 100,00 y recibe Bs. 20,00 de bono",
            "Spend $50 and get a $10 reward",
            "If you spend $50, you get $10 in cashback",
        ]) {
            expect(parseNotification(text)).toBeNull();
            expect(hasChargeAmount(text)).toBe(false);
        }
    });

    it("keeps a charge or a reward the user already got beside offer words", () => {
        expect(parseNotification("You spent $1,000.00 at Binance with card ending 4321")).toMatchObject({
            amount: 1000,
        });
        expect(parseNotification("Gastaste Bs. 500,00 en FARMATODO")).toMatchObject({ amount: 500 });
        expect(parseNotification("You earned $5.00 cashback on your last purchase")).toMatchObject({ amount: 5 });
        expect(parseNotification("Visa ••4321\nGAME OVER\n$12.00")).toMatchObject({ amount: 12 });
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
        expect(parseNotification("Pago de tasa: $25.00")).toMatchObject({ amount: 25 });
        expect(parseNotification("Tasa de compra: $3.328. Compraste USD 100.00 en Plenti")).toMatchObject({
            amount: 100,
            merchant: "Plenti",
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
                debt: null,
                kind: "declined",
                merchant: "SiteGround",
            })
        ).toBeNull();
    });

    it("still logs what the parser read when the AI calls it something other than a purchase", () => {
        expect(
            mergeNotificationRead(TEXT, parsed, {
                amount: null,
                currency: null,
                debt: null,
                kind: "other",
                merchant: null,
            })
        ).toBe(parsed);
    });

    it("takes the AI's merchant and keeps the parser's amount where the AI left it null", () => {
        expect(
            mergeNotificationRead(TEXT, parsed, {
                amount: null,
                currency: null,
                debt: null,
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
                debt: null,
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
                debt: null,
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
                debt: null,
                kind: "purchase",
                merchant: null,
            })
        ).toMatchObject({ amount: 100, amountText: "EUR 100.00" });
    });

    it("leaves a bare $ for the posting app and the device to settle before the AI's guess", () => {
        const text = "Compra aprobada\nCompraste $250.00 en OXXO";
        expect(
            mergeNotificationRead(text, parseNotification(text), {
                amount: 250,
                currency: "USD",
                debt: null,
                kind: "purchase",
                merchant: "OXXO",
            })
        ).toMatchObject({ amount: 250, amountText: "$250.00", currencyHint: "USD" });
    });

    it.each([
        ["a code the shown symbol cannot mean", "Compraste $ 120 en OXXO", 120, "EUR", "$ 120"],
        ["the code of the other figure in the push", "Pagaste ¥120 (≈ $16.50) en Taobao", 16.5, "JPY", "16.5"],
        [
            "the code of an equal figure that is not the charge",
            "Paid $120 at Uber. Available balance: ¥120",
            120,
            "CNY",
            "$120",
        ],
        [
            "the code of a balance the AI's amount matches",
            "Paid $80 at Uber. Available balance: ¥120",
            120,
            "CNY",
            "120",
        ],
    ])("keeps no currency hint for %s", (_case, text, amount, currency, amountText) => {
        const merged = mergeNotificationRead(text, parseNotification(text), {
            amount,
            currency,
            debt: null,
            kind: "purchase",
            merchant: null,
        });

        expect(merged).toMatchObject({ amount, amountText });
        expect(merged).not.toHaveProperty("currencyHint");
    });
});

describe("parseDebt", () => {
    it("reads who owes whom from the person's own words", () => {
        expect(parseDebt("Juan Pérez: me debes $30 de la pizza")).toStrictEqual({
            amount: 30,
            amountText: "$30",
            counterparty: "Juan Pérez",
            installment: null,
            verb: "borrowed",
        });
        expect(parseDebt("Te debo 50")).toMatchObject({ amount: 50, amountText: "50", verb: "lent" });
        expect(parseDebt("Ana\nMe prestaste 100 USD ayer")).toMatchObject({ amount: 100, verb: "lent" });
        expect(parseDebt("I lent you $25.50 for the cab")).toMatchObject({ amount: 25.5, verb: "borrowed" });
        expect(parseDebt("You owe me €12,40")).toMatchObject({ amount: 12.4, verb: "borrowed" });
    });

    it("reads a loan the push announces as borrowed, and a payment toward it as paid back", () => {
        expect(parseDebt("Tu préstamo por Bs. 5.000,00 fue acreditado")).toMatchObject({
            amount: 5000,
            verb: "borrowed",
        });
        expect(parseDebt("Loan payment of $120.00 received. Thank you!")).toMatchObject({ verb: "gotPaidBack" });
        expect(parseDebt("Pagaste $120,00 de tu préstamo")).toMatchObject({ amount: 120, verb: "paidBack" });
    });

    it("reads a cuota's number and count beside its amount", () => {
        expect(parseDebt("Cashea\nPagaste la cuota 2 de 6 por $15,00")).toStrictEqual({
            amount: 15,
            amountText: "$15,00",
            counterparty: null,
            installment: { number: 2, of: 6 },
            verb: "paidBack",
        });
        expect(parseDebt("Pagaste la cuota 2 de $15")).toMatchObject({ installment: { number: 2, of: null } });
        expect(parseDebt("Installment 3/12 paid: USD 40.00")).toMatchObject({ installment: { number: 3, of: 12 } });
        expect(parseDebt("Cuota 2 de 15,00 pagada")).toBeNull();
        expect(parseDebt("Recibiste el pago de la cuota 2 de 6 por $15 de Ana")).toMatchObject({
            counterparty: "Ana",
            verb: "gotPaidBack",
        });
        expect(parseDebt("Recibiste el pago de Cuota 2 de 6 por $15 de Ana")).toMatchObject({ counterparty: "Ana" });
        expect(parseDebt("Pago de cuota 2 de 6 de tu compra por $15")).toMatchObject({ verb: "paidBack" });
    });

    it("leaves purchases, a purchase split into cuotas, and declines alone", () => {
        for (const text of [
            "Purchase alert\nYou made a $12.40 purchase at STARBUCKS with your card ending in 4321.",
            "Compra aprobada por $90,00 en 3 cuotas sin interés en Falabella",
            "Compra aprobada por $90,00 en Falabella, cuota 1 de 3",
            "Compra pagada por $90,00 en Falabella, cuota 1 de 3",
            "Purchase payment of $90.00 at Falabella, installment 1 of 3",
            "Solicita tu préstamo por $5.000 en minutos",
            "Te debo la pizza",
            "Pago de préstamo por $50,00 rechazado",
        ]) {
            expect(parseDebt(text)).toBeNull();
        }
    });
});

describe("mergeDebtRead", () => {
    const TEXT = "Juan: me debes $30";
    const parsed = parseDebt(TEXT);
    const read = { amount: null, currency: null, debt: null, merchant: null } as const;

    it("keeps the parser's debt when the model calls it a purchase", () => {
        expect(mergeDebtRead(TEXT, parsed, { ...read, amount: 30, kind: "purchase" })).toBe(parsed);
    });

    it("drafts a debt only the model saw, and drops it on a decline", () => {
        const model = {
            ...read,
            amount: 30,
            debt: { installment: null, verb: "lent" },
            kind: "debt",
            merchant: "Juan",
        } as const;
        expect(mergeDebtRead("Juan: quedamos en que pagas tú los $30", null, model)).toStrictEqual({
            amount: 30,
            amountText: "$30",
            counterparty: "Juan",
            installment: null,
            verb: "lent",
        });
        expect(mergeDebtRead(TEXT, parsed, { ...read, kind: "declined" })).toBeNull();
    });

    it("takes the amount from the text when the model reads a debt without one", () => {
        const model = { ...read, debt: { installment: null, verb: "lent" }, kind: "debt" } as const;
        expect(mergeDebtRead("Juan: aquí tienes los $30", null, model)).toMatchObject({
            amount: 30,
            amountText: "$30",
        });
    });
});

describe("parseNotification with banks around the world", () => {
    const cases: {
        amount: number;
        bank: string;
        currency: string;
        income: boolean;
        merchant?: string | null;
        name: string;
        text: string;
    }[] = [
        {
            bank: "Chase",
            name: "card purchase with a time after the merchant",
            text: "Chase Sapphire Preferred Visa: You made a $3.44 transaction with CHARGEPOINT. INC on Feb 17, 2026 at 5:15 PM ET.",
            amount: 3.44,
            currency: "USD",
            income: false,
            merchant: "CHARGEPOINT. INC",
        },
        {
            bank: "Chase",
            name: "merchant with an uppercase IN in its name",
            text: "Chase Sapphire Preferred Visa: You made a $12.40 transaction with JACK IN THE BOX on Feb 17, 2026 at 5:15 PM ET.",
            amount: 12.4,
            currency: "USD",
            income: false,
            merchant: "JACK IN THE BOX",
        },
        {
            bank: "Chase",
            name: "cardholder name then a purchase with a time",
            text: "Chase Freedom Unlimited Visa 8260: JANE,SMITH made a $20.15 transaction with WAL-MART #4563 on Mar 15, 2026 at 7:19 PM ET.",
            amount: 20.15,
            currency: "USD",
            income: false,
            merchant: "WAL-MART #4563",
        },
        {
            bank: "Chase",
            name: "online order charge authorized at a marketplace",
            text: "Chase Acct 9146: An online, phone or mail order charge of $14.99 has been authorized at AMAZON MKTPLACE PMTS on 06/21/2017 12:33:53 ET.",
            amount: 14.99,
            currency: "USD",
            income: false,
            merchant: "AMAZON MKTPLACE PMTS",
        },
        {
            bank: "Chase",
            name: "debit card transaction with a domain merchant",
            text: "Chase acct 8778: Your $1.58 debit card transaction with AMAZON.COM on Feb 8, 2023 at 10:44 AM ET was more than the $0.01 in your Alerts settings.",
            amount: 1.58,
            currency: "USD",
            income: false,
            merchant: "AMAZON.COM",
        },
        {
            bank: "Chase",
            name: "card payment to a card account",
            text: "Chase acct 2256: The $3,198.08 pmt made to CHASE CARD 8252 on Jul 21, 2026 at 10:59 AM ET was more than the $0.00 limit in your Alerts settings.",
            amount: 3198.08,
            currency: "USD",
            income: false,
            merchant: "CHASE CARD 8252",
        },
        {
            bank: "Chase",
            name: "outgoing Zelle payment",
            text: "JANE SMITH received your $77.50 Zelle® payment.",
            amount: 77.5,
            currency: "USD",
            income: false,
        },
        {
            bank: "Chase",
            name: "pending credit from a merchant",
            text: "Chase Freedom Unlimited Visa: You have a $27.05 pending credit from KEYMELOCKSMITHS.COM.",
            amount: 27.05,
            currency: "USD",
            income: true,
            merchant: "KEYMELOCKSMITHS.COM",
        },
        {
            bank: "Chase",
            name: "direct deposit alert",
            text: "Chase acct 8778: Your recent $2,218.33 Direct Deposit posted on Feb 28, 2023 at 3:25 AM ET was more than the $0.01 limit in your Alerts settings.",
            amount: 2218.33,
            currency: "USD",
            income: true,
            merchant: null,
        },
        {
            bank: "Bank of America",
            name: "debit card charge with no merchant",
            text: "BofA: Debit card - 0241 charge made online, by phone or mail on June 13, 2026 for $1.01. Log in to view details. STOP to end account texts",
            amount: 1.01,
            currency: "USD",
            income: false,
            merchant: null,
        },
        {
            bank: "Bank of America",
            name: "credit card charge with a merchant number",
            text: "BofA: Credit card charge: $55.85, Credit card 1950, WHOLEFDS ART #10507, 08/22/21. View in app or online",
            amount: 55.85,
            currency: "USD",
            income: false,
        },
        {
            bank: "Bank of America",
            name: "charge over the alert limit",
            text: "BofA: Charge over set limit: $222.32, Credit card 7184, COSTCO WHSE #0452, 01/30/20. View in app or online",
            amount: 222.32,
            currency: "USD",
            income: false,
        },
        {
            bank: "Bank of America",
            name: "push with a merchant and no intro word",
            text: "BofA\nCharge online or by phone $10.64 Credit card 6556 AMZN Mktp US",
            amount: 10.64,
            currency: "USD",
            income: false,
        },
        {
            bank: "Bank of America",
            name: "credit received on a card",
            text: "Bank of America: Credit of $1,000.00 was received on card 1950 on 09/19/2021. Go online for details.",
            amount: 1000,
            currency: "USD",
            income: true,
            merchant: null,
        },
        {
            bank: "Bank of America",
            name: "direct deposit credited",
            text: "BofA: Direct deposit of $748.83 credited 02/17/2026 to account - 7150. STOP to end account texts",
            amount: 748.83,
            currency: "USD",
            income: true,
            merchant: null,
        },
        {
            bank: "Bank of America",
            name: "sent you a Zelle payment",
            text: 'BofA: Jane Smith sent you $265.34 for "Jake\'s"',
            amount: 265.34,
            currency: "USD",
            income: true,
        },
        {
            bank: "Wells Fargo",
            name: "purchase that exceeds a preset amount",
            text: "Wells Fargo Alert: Purchase of $74.87 at AMAZON.COM AMZN.COM/BI exceeds preset amount for credit card ending 0991. Questions? Call number on card.",
            amount: 74.87,
            currency: "USD",
            income: false,
            merchant: "AMAZON.COM AMZN.COM/BI",
        },
        {
            bank: "Wells Fargo",
            name: "purchase in a city with a card",
            text: "Wells Fargo alert: 37.00 USD purchase made at STRAND BARBER & BEAUTY in SAN FRANCISCO USA using card ending in 63. Questions? Call number on back of card.",
            amount: 37,
            currency: "USD",
            income: false,
            merchant: "STRAND BARBER & BEAUTY",
        },
        {
            bank: "Wells Fargo",
            name: "direct deposit to an account",
            text: "Wells Fargo alert: A direct deposit of $500.00 to account ending 0788 is available. Reply TRA to transfer funds.",
            amount: 500,
            currency: "USD",
            income: true,
            merchant: null,
        },
        {
            bank: "Capital One",
            name: "purchase at a grocery store",
            text: "Capital One: A purchase for $38.01 at Trader Joe's on Apr. 30, 2026 was charged to Jane’s Venture X Card (0406). Std carrier charges apply.",
            amount: 38.01,
            currency: "USD",
            income: false,
            merchant: "Trader Joe's",
        },
        {
            bank: "Capital One",
            name: "charge or hold on a credit card",
            text: "Capital One Alert: A chrge or hold for $5.50 on 03/21/2019 was placed on your credit card (8204) at MTA*METROCARD MACHIN. Std carrier chrges apply",
            amount: 5.5,
            currency: "USD",
            income: false,
        },
        {
            bank: "Capital One",
            name: "purchase at a fast food chain",
            text: "Savor Credit Card…2587\nYour purchase for $81.90 at Burger King was approved.",
            amount: 81.9,
            currency: "USD",
            income: false,
            merchant: "Burger King",
        },
        {
            bank: "Capital One",
            name: "international purchase",
            text: "Credit Card Ending in 0406\nAn international purchase for $29.61 at ELIZMARI was approved for your Venture X Card ending in 0406.",
            amount: 29.61,
            currency: "USD",
            income: false,
            merchant: "ELIZMARI",
        },
        {
            bank: "Capital One",
            name: "Zelle money received",
            text: "You received $2646.00 with Zelle®",
            amount: 2646,
            currency: "USD",
            income: true,
            merchant: null,
        },
        {
            bank: "American Express",
            name: "charge named after the card",
            text: "Amex\nYou have a $134.39 charge on your American Express Card ending in 21004 at SUNNY HEALTH FITNESS.",
            amount: 134.39,
            currency: "USD",
            income: false,
            merchant: "SUNNY HEALTH FITNESS",
        },
        {
            bank: "American Express",
            name: "card not present transaction",
            text: "Amex\nA Card not present transaction of $135.20 was made on Mar 7 at WASHINGTON COUNTY GENERAL DISTRICT on your Card ending 21004.",
            amount: 135.2,
            currency: "USD",
            income: false,
        },
        {
            bank: "American Express",
            name: "merchant label after the amount",
            text: "Large purchase on American Express acct ending 82009 Jan 23 Amount: $11.72 Merch: PP  MERCHANT CHARGE View recent activity at www.amexmobile.com",
            amount: 11.72,
            currency: "USD",
            income: false,
            merchant: "PP  MERCHANT CHARGE",
        },
        {
            bank: "Citi",
            name: "transaction at a solution provider",
            text: "Citi Alert: Card ending in XXXX was not present for a $3.95 transaction at MVQ*YOUR ID SOLUTION",
            amount: 3.95,
            currency: "USD",
            income: false,
            merchant: "MVQ*YOUR ID SOLUTION",
        },
        {
            bank: "Citi",
            name: "transaction with dotted initials",
            text: "Citi Alert: A $43.23 transaction was made at A.L PRIME BYFIELD BY on card ending in 9340. View details at citi.com/citimobileapp",
            amount: 43.23,
            currency: "USD",
            income: false,
            merchant: "A.L PRIME BYFIELD BY",
        },
        {
            bank: "Citi",
            name: "transaction at a renamed fast food",
            text: "Citi Alert: A $12.63 transaction was made at CHICK-FIL-A #00676 A on card ending in 2361. View details at citi.com/citimobileapp",
            amount: 12.63,
            currency: "USD",
            income: false,
            merchant: "CHICK-FIL-A #00676 A",
        },
        {
            bank: "Citi",
            name: "transaction over the alert amount",
            text: "Citi Alert: Transaction Exceeds\nA $56.03 transaction was made at COSTCO GAS #1022 PARKER US on card ending in 5283. View details now.",
            amount: 56.03,
            currency: "USD",
            income: false,
            merchant: "COSTCO GAS #1022 PARKER US",
        },
        {
            bank: "Citi",
            name: "truncated alert with no merchant",
            text: "Alert: Card ending in **** was not present for a $29.95 transaction at",
            amount: 29.95,
            currency: "USD",
            income: false,
            merchant: null,
        },
        {
            bank: "Discover",
            name: "transaction at a digital service",
            text: "Discover Card: Transaction of $1.00 at GOOGLE *SERVICES was made on July 14, 2017. Visit http://discvr.co/1GUSs8C Text HELP for info, STOP to quit.",
            amount: 1,
            currency: "USD",
            income: false,
            merchant: "GOOGLE *SERVICES",
        },
        {
            bank: "Discover",
            name: "refund with a credit amount and a label",
            text: "Discover Card: Refund posted to your Discover Card. Crdt Amnt: $8.19 Post Date: 08/30/17 At: OFFICE. http://discvr.co/HamSjs Text STOP to quit.",
            amount: 8.19,
            currency: "USD",
            income: true,
            merchant: "OFFICE",
        },
        {
            bank: "Discover",
            name: "debit over the alert amount",
            text: "Discover Alert: 5655:  A $625.48 debit transaction made on 3/9/26 at 04:28 PM EDT was over the amount set for your alert. Text STOP to end",
            amount: 625.48,
            currency: "USD",
            income: false,
            merchant: null,
        },
        {
            bank: "Discover",
            name: "credit over the alert amount",
            text: "Discover Alert: 5655: A $2,500.00 credit on 3/4/26 at 12:45 AM EST was over the amount set for your alert. Text STOP to end",
            amount: 2500,
            currency: "USD",
            income: true,
            merchant: null,
        },
        {
            bank: "Venmo",
            name: "paid you a payment note",
            text: "John Smith paid you $265.34 NY 21/22",
            amount: 265.34,
            currency: "USD",
            income: true,
        },
        {
            bank: "Bradesco",
            name: "card purchase with a city after the merchant",
            text: "BRADESCO CARTOES: COMPRA APROVADA NO CARTAO FINAL 2561 EM 30/05/2018 11:15. VALOR DE R$ 25,30 ALQUIMIA COMER LTDA      SAO PAULO.",
            amount: 25.3,
            currency: "BRL",
            income: false,
        },
        {
            bank: "Bradesco",
            name: "installment purchase",
            text: "BRADESCO CARTOES: COMPRA APROVADA NO CARTAO FINAL 2561 EM 23/05/2018 14:54 NO VALOR DE R$ 169,14 EM 2 X SONDA AGUA BRANCA        SAO PAULO.",
            amount: 169.14,
            currency: "BRL",
            income: false,
        },
        {
            bank: "Santander Brasil",
            name: "card transaction with a time",
            text: "Santander Informa: Transacao Cartao Mastercard final 3031 de R$ 16,90 aprovada em 05/08/15 as 16:13 SMARTCOOKING COM DE",
            amount: 16.9,
            currency: "BRL",
            income: false,
        },
        {
            bank: "Nubank",
            name: "debit purchase",
            text: "Compra no débito aprovada\nCompra de R$ 17,00 em ACADEMIA CEMI",
            amount: 17,
            currency: "BRL",
            income: false,
            merchant: "ACADEMIA CEMI",
        },
        {
            bank: "Bancolombia",
            name: "purchase at a store with a card",
            text: "Compraste $64.460 en JERONIMO MARTINS con tu T.Deb *8915",
            amount: 64_460,
            currency: "COP",
            income: false,
            merchant: "JERONIMO MARTINS",
        },
        {
            bank: "Bancolombia",
            name: "purchase at a service with a card",
            text: "Compraste $63.490,00 en GOOGLE *Claude by An con tu T.Deb *7473, el 22/10/2026 a las 14:10.",
            amount: 63_490,
            currency: "COP",
            income: false,
            merchant: "GOOGLE *Claude by An",
        },
        {
            bank: "Bancolombia",
            name: "older purchase template with a time",
            text: "Bancolombia le informa Compra por $9.000,00 en APPLE.COM/BILL 03:09. 15/07/2024 T.Deb 1218. Inquietudes al 6045109095/018000931987.",
            amount: 9000,
            currency: "COP",
            income: false,
            merchant: "APPLE.COM/BILL",
        },
        {
            bank: "Bancolombia",
            name: "transfer to an account",
            text: "Transferiste $800,000 desde tu cuenta *2505 a la cuenta *0123456789 el 23/10/2026 a las 11:26.",
            amount: 800_000,
            currency: "COP",
            income: false,
            merchant: null,
        },
        {
            bank: "Bancolombia",
            name: "transfer received from a person",
            text: "Recibiste una transferencia por $1,050,000 de JUAN PEREZ en tu cuenta **2505, el 18/11/2026 a las 19:36.",
            amount: 1_050_000,
            currency: "COP",
            income: true,
            merchant: "JUAN PEREZ",
        },
        {
            bank: "Bancolombia",
            name: "payment received from a company",
            text: "Recibiste un pago por $6,044,772.00 de EMPRESA a tu cuenta AHORROS, el 10:07 a las 23/10/2026.",
            amount: 6_044_772,
            currency: "COP",
            income: true,
            merchant: "EMPRESA",
        },
        {
            bank: "Nequi",
            name: "PSE payment",
            text: "Pago exitoso por PSE: Hiciste un pago en FONDO DE INVERSIÓN COLECTIVA ACCIVAL VISTA por $73.500 y todo salió bien.",
            amount: 73_500,
            currency: "COP",
            income: false,
        },
        {
            bank: "Nequi",
            name: "platform transfer sent",
            text: "Envío de plata exitoso: Te contamos que el envío de plata por $110.000 fue exitoso.",
            amount: 110_000,
            currency: "COP",
            income: false,
            merchant: null,
        },
        {
            bank: "Monzo",
            name: "travel charge with for in the name",
            text: "🚆 £6.20 at Transport for London. Travel charge for Thursday 24 September",
            amount: 6.2,
            currency: "GBP",
            income: false,
            merchant: "Transport for London",
        },
        {
            bank: "Monzo",
            name: "refund from a ride",
            text: "🚖 £5.30 refund from Bolt",
            amount: 5.3,
            currency: "GBP",
            income: true,
            merchant: "Bolt",
        },
        {
            bank: "Monzo",
            name: "cash deposited in the branch",
            text: "💷 £149 cash deposited, we charged a £1 fee. You can deposit another £601 before you hit your monthly limit.",
            amount: 149,
            currency: "GBP",
            income: true,
            merchant: null,
        },
        {
            bank: "N26",
            name: "French payment to a store",
            text: "Votre paiement de 3,21 € chez MC DONALD'S PASEO DE G a été traité avec succès.",
            amount: 3.21,
            currency: "EUR",
            income: false,
            merchant: "MC DONALD'S PASEO DE G",
        },
        {
            bank: "N26",
            name: "refund from a store",
            text: "Your refund of €11.12 from CIRCLE K NOMME has been successfully processed.",
            amount: 11.12,
            currency: "EUR",
            income: true,
            merchant: "CIRCLE K NOMME",
        },
        {
            bank: "N26",
            name: "transfer received from a payment provider",
            text: "N26\nYou've received a transfer of € 1,390.18 from Paysend PLC.",
            amount: 1390.18,
            currency: "EUR",
            income: true,
            merchant: "Paysend PLC",
        },
        {
            bank: "N26",
            name: "direct debit collected by a company",
            text: "N26\nYour direct debit payment of € 6.90 has been collected by MASS Response Service GmbH.",
            amount: 6.9,
            currency: "EUR",
            income: false,
            merchant: "MASS Response Service GmbH",
        },
        {
            bank: "Wise",
            name: "foreign currency spend",
            text: "Card payment\n45.30 GEL spent at Glovo. That used 15.53 EUR. Want to split this bill? Tap to get started.",
            amount: 45.3,
            currency: "GEL",
            income: false,
            merchant: "Glovo",
        },
        {
            bank: "Wise",
            name: "foreign currency spend in Malaysia",
            text: "Card payment\n71.30 MYR spent at Joysophy International Sd. Want to split this bill? Tap to get started.",
            amount: 71.3,
            currency: "MYR",
            income: false,
            merchant: "Joysophy International Sd",
        },
        {
            bank: "Revolut",
            name: "spent at a supermarket with a balance",
            text: "Alex 💳\nSpent €2.65 at Mercadona Balance: €17.82",
            amount: 2.65,
            currency: "EUR",
            income: false,
            merchant: "Mercadona",
        },
        {
            bank: "Revolut",
            name: "subscription spent from a joint account",
            text: "Joint · YouTube\n€25.99 spent EUR balance: €2,974.01",
            amount: 25.99,
            currency: "EUR",
            income: false,
            merchant: "YouTube",
        },
        {
            bank: "Revolut",
            name: "payment refund received",
            text: "Refund arrived  🎉\nYou've received a payment refund of €79.20 from Centauro",
            amount: 79.2,
            currency: "EUR",
            income: true,
            merchant: "Centauro",
        },
        {
            bank: "Revolut",
            name: "transfer sent to a person",
            text: "Transfer sent ✅\nYou sent €121.31 to Ivan Petrov. It will arrive in seconds",
            amount: 121.31,
            currency: "EUR",
            income: false,
            merchant: "Ivan Petrov",
        },
        {
            bank: "Revolut",
            name: "money received from a person",
            text: "You've been sent money ✅\nYou've received €200 from Anna Petrova. Tap to view",
            amount: 200,
            currency: "EUR",
            income: true,
            merchant: "Anna Petrova",
        },
        {
            bank: "BBVA España",
            name: "accepted payment at an electronics store",
            text: "Pago aceptado  👍💳\nPago aceptado de 19,99 EUR en MEDIA-MARKT - ALICANTE con tu tarjeta terminada en 2609.",
            amount: 19.99,
            currency: "EUR",
            income: false,
            merchant: "MEDIA-MARKT - ALICANTE",
        },
        {
            bank: "BBVA España",
            name: "accepted payment at a store whose name starts with digits",
            text: "Pago aceptado  👍💳\nPago aceptado de 19,99 EUR en 100 MONTADITOS con tu tarjeta terminada en 2609.",
            amount: 19.99,
            currency: "EUR",
            income: false,
            merchant: "100 MONTADITOS",
        },
        {
            bank: "BBVA España",
            name: "accepted purchase at a cafe",
            text: "Compra aceptada 👍💳\nCompra de 1,80 EUR en BLAT CAFE con tu tarjeta terminada en 5361.",
            amount: 1.8,
            currency: "EUR",
            income: false,
            merchant: "BLAT CAFE",
        },
        {
            bank: "BBVA España",
            name: "Bizum received from a person",
            text: "Pago Bizum 💶 📲\nHas recibido un BIZUM de 150,00 EUR de Maria G. por -.",
            amount: 150,
            currency: "EUR",
            income: true,
            merchant: "Maria G",
        },
        {
            bank: "BBVA España",
            name: "refund for a train payment",
            text: "Reimbursement accepted 👍🔙\nA refund of 10,00 EUR for your payment in RENFE CERCANIAS TNA 08 (5 with your card ending in 4844 has been made.",
            amount: 10,
            currency: "EUR",
            income: true,
        },
        {
            bank: "BBVA España",
            name: "receipt charged to the account",
            text: "Recibo cargado\nSe ha cargado en tu cuenta *9665 un adeudo de Centro Educativo y de Estudios Nuevo Mer de 38,00 EUR.",
            amount: 38,
            currency: "EUR",
            income: false,
        },
        {
            bank: "Santander España",
            name: "payment with a card",
            text: "Pago de 5.70 EUR en MARKET ANTONIO con Tarjeta **5258 + info. en tu banca online.",
            amount: 5.7,
            currency: "EUR",
            income: false,
            merchant: "MARKET ANTONIO",
        },
        {
            bank: "Santander España",
            name: "transfer sent from an account",
            text: "💸 ¡Transferencia enviada!\nAcabas de enviar 165.0 EUR desde tu cuenta **4533. Pulsa aquí para ver el detalle",
            amount: 165,
            currency: "EUR",
            income: false,
            merchant: null,
        },
        {
            bank: "HDFC Bank",
            name: "credit card spend with a balance",
            text: "Rs.7000.00 was spent on ur HDFCBank CREDIT Card ending 9684 on 2016-01-09:16:05:06 at DR KARVES DENTECH.Avl bal - Rs.233413.00, curr o/s - Rs.66587.00",
            amount: 7000,
            currency: "INR",
            income: false,
            merchant: "DR KARVES DENTECH",
        },
        {
            bank: "HDFC Bank",
            name: "debit purchase in a city then a store",
            text: "Thank you for using Debit Card ending 6677 for Rs.500.00 in CHENNAI at VETRIVEL AGENCIES - BP on 2015-11-06:20:50:28 Avl bal: Rs.59342.72",
            amount: 500,
            currency: "INR",
            income: false,
            merchant: "VETRIVEL AGENCIES - BP",
        },
        {
            bank: "HDFC Bank",
            name: "debit purchase in a city then a store without balance",
            text: "Thank you for using your HDFC bank DEBIT/ATM card ending 8223 for Rs.3890.00 in MUMBAI at DCSIMSEBELEC on 2016-02-13:05:49:33.",
            amount: 3890,
            currency: "INR",
            income: false,
            merchant: "DCSIMSEBELEC",
        },
        {
            bank: "HDFC Bank",
            name: "payment credited to a card",
            text: "Dear HDFCBank cardmember, Payment of Rs 21369.18 was credited to your card ending 3665 on 05/JAN/2016.",
            amount: 21_369.18,
            currency: "INR",
            income: true,
            merchant: null,
        },
        {
            bank: "ICICI Bank",
            name: "spend at a telecom",
            text: "INR 500.00 spent on ICICI Bank Card XX8003 on 27-Feb-22 at Airtel. Avl Lmt: INR 61,254.29. To dispute,call 18002662/SMS BLOCK 8003 to 9215676766",
            amount: 500,
            currency: "INR",
            income: false,
            merchant: "Airtel",
        },
        {
            bank: "ICICI Bank",
            name: "transaction using a credit card",
            text: "Dear Customer, txn of INR 1,815.00 using Credit Card XX2008 done at Grofers India on 21-JUN-18. Avbl Cr lmt:INR 2,20,732.25. For dispute,call 04033667777.",
            amount: 1815,
            currency: "INR",
            income: false,
            merchant: "Grofers India",
        },
        {
            bank: "ICICI Bank",
            name: "UPI debit with a pharmacy payee credited",
            text: "ICICI Bank Acct XX922 debited for Rs 40.00 on 16-Jun-25; ZEELAB PHARMACY credited. UPI:516704610614. Call 18002662 for dispute. SMS BLOCK 922 to 9215676766.",
            amount: 40,
            currency: "INR",
            income: false,
            merchant: "ZEELAB PHARMACY",
        },
        {
            bank: "ICICI Bank",
            name: "UPI debit with a store payee credited",
            text: "ICICI Bank Acct XX922 debited for Rs 146.30 on 15-Jun-25; Smart Bazaar Me credited. UPI:516653807320. Call 18002662 for dispute. SMS BLOCK 922 to 9215676766.",
            amount: 146.3,
            currency: "INR",
            income: false,
            merchant: "Smart Bazaar Me",
        },
        {
            bank: "ICICI Bank",
            name: "UPI debit with a person payee credited",
            text: "ICICI Bank Acct XX922 debited for Rs 150.00 on 21-Jun-25; RAVI KUMAR credited. UPI:517220142243. Call 18002662 for dispute. SMS BLOCK 922 to 9215676766.",
            amount: 150,
            currency: "INR",
            income: false,
            merchant: "RAVI KUMAR",
        },
        {
            bank: "ICICI Bank",
            name: "UPI credit from a person",
            text: "Dear Customer, Acct XX922 is credited with Rs 500.00 on 06-Jun-25 from RAJESH SHARMA. UPI:552331493662-ICICI Bank.",
            amount: 500,
            currency: "INR",
            income: true,
            merchant: "RAJESH SHARMA",
        },
        {
            bank: "ICICI Bank",
            name: "NEFT credit with the balance after",
            text: "ICICI Bank Account XX922 credited:Rs. 10,000.00 on 08-May-25. Info NEFT-SBINN52025050865324309-. Available Balance is Rs. 11,163.25.",
            amount: 10_000,
            currency: "INR",
            income: true,
            merchant: null,
        },
        {
            bank: "HDFC Bank",
            name: "amount deducted for a money transfer",
            text: "Amt Deducted! Rs.8301 from your HDFC Bank A/c XX0601 for Money Transfer via HDFC Bank Online Banking. Not you?Call 18002586161/SMS BLOCK OB to 7308080808",
            amount: 8301,
            currency: "INR",
            income: false,
            merchant: null,
        },
        {
            bank: "HDFC Bank",
            name: "UPI transfer to a payee",
            text: "Sent Rs.167.00\nFrom HDFC Bank A/C *1234\nTo JUSTSWISH",
            amount: 167,
            currency: "INR",
            income: false,
            merchant: "JUSTSWISH",
        },
        {
            bank: "HDFC Bank",
            name: "credit alert from a VPA",
            text: "Credit Alert!\nRs.3500.00 credited to HDFC Bank A/c XXXXX on 13-10-26 from VPA XXXXXXXXXX@upi (UPI XXXXXXXXXXX)",
            amount: 3500,
            currency: "INR",
            income: true,
        },
        {
            bank: "CaixaBank",
            name: "purchase with a card in a store",
            text: "Compra de 2.527,49 EUR realizada correctamente con tu tarjeta en Apple el 23/07/2026. Si no reconoce esta actividad, llame de inmediato: 910786180",
            amount: 2527.49,
            currency: "EUR",
            income: false,
            merchant: "Apple",
        },
    ];

    it.each(cases)("$bank: $name", ({ amount, currency, income, merchant, text }) => {
        const parsed = parseNotification(text);
        const expected: { amount: number; income: boolean; merchant?: string | null } = { amount, income };
        if (merchant !== undefined) {
            expected.merchant = merchant;
        }
        expect(parsed).toMatchObject(expected);
        expect(detectCurrency(parsed?.amountText, [currency])).toBe(currency);
    });
});
