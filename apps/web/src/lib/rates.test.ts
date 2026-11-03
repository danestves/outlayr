import { expect, it } from "vite-plus/test";

import { decodeQuotes, parseRates } from "./rates";
import type { RateSlug } from "./rates";

const NOW = Date.parse("2026-11-03T20:00:00Z");

const read = (slug: RateSlug, body: unknown) => parseRates(slug, decodeQuotes(body), NOW);

const VENEZUELA = [
    {
        compra: null,
        fechaActualizacion: "2026-11-03T19:04:50.264Z",
        fuente: "paralelo",
        moneda: "USD",
        promedio: 1004.143982,
        venta: null,
    },
    {
        compra: null,
        fechaActualizacion: "2026-11-03T00:00:00-04:00",
        fuente: "oficial",
        moneda: "USD",
        promedio: 891.1054,
        venta: null,
    },
];

const [, BCV] = VENEZUELA;

const ARGENTINA = [
    { casa: "oficial", compra: 1520, fechaActualizacion: "2026-11-03T16:00:00.000Z", moneda: "USD", venta: 1570 },
    { casa: "blue", compra: 1550, fechaActualizacion: "2026-11-03T19:02:00.000Z", moneda: "USD", venta: 1570 },
    { casa: "bolsa", compra: 1572, fechaActualizacion: "2026-11-03T19:02:00.000Z", moneda: "USD", venta: 1573.9 },
    { casa: "tarjeta", compra: 1976, fechaActualizacion: "2026-11-03T16:00:00.000Z", moneda: "USD", venta: 2041 },
];

it("keeps only the official BCV quote for Venezuela, whatever else the API returns", () => {
    expect(read("dolar-bcv-hoy", VENEZUELA)).toEqual([
        {
            buy: null,
            dateOnly: true,
            kind: "bcv",
            rate: 891.1054,
            source: "https://www.bcv.org.ve/",
            updatedAt: "2026-11-03T00:00:00-04:00",
        },
    ]);
});

it("reads only the BCV average for Venezuela, even when the official row carries buy and sell prices", () => {
    const body = [
        { ...BCV, compra: 990, venta: 1004.32 },
        { ...BCV, fuente: "paralelo", promedio: 1100 },
    ];
    expect(read("dolar-bcv-hoy", body).map(({ buy, rate }) => [buy, rate])).toEqual([[null, 891.1054]]);
});

it("ignores rows in another currency or with a broken shape, and keeps the valid ones", () => {
    const body = [
        { ...BCV, moneda: "EUR", promedio: 960 },
        { ...BCV, fechaActualizacion: null, fuente: "paralelo" },
        { ...BCV, fuente: "paralelo", promedio: "1004.32" },
        BCV,
    ];
    expect(read("dolar-bcv-hoy", body).map(({ rate }) => rate)).toEqual([891.1054]);
});

it("takes the sell price as the rate in Argentina, keeps the buy price, and orders by the market's list", () => {
    const rates = read("dolar-hoy-argentina", ARGENTINA);
    expect(rates.map(({ buy, kind, rate }) => [kind, buy, rate])).toEqual([
        ["blue", 1550, 1570],
        ["oficial", 1520, 1570],
        ["mep", 1572, 1573.9],
        ["tarjeta", 1976, 2041],
    ]);
});

it("drops a quote with no usable price or older than its market allows, and keeps the rest", () => {
    expect(read("dolar-bcv-hoy", [{ ...BCV, promedio: null }])).toEqual([]);
    expect(read("dolar-bcv-hoy", [{ ...BCV, fechaActualizacion: "2026-10-20T00:00:00Z" }])).toEqual([]);
    expect(read("dolar-bcv-hoy", [{ ...BCV, fechaActualizacion: "2026-10-30T00:00:00-04:00" }])).toHaveLength(1);
    expect(read("dolar-hoy-argentina", [{ ...ARGENTINA[1], fechaActualizacion: "2026-11-01T12:00:00Z" }])).toEqual([]);
    expect(read("dolar-hoy-argentina", [{ ...ARGENTINA[1], compra: 0 }]).map(({ buy, kind }) => [kind, buy])).toEqual([
        ["blue", null],
    ]);
});

it("falls back to the average when the sell price is not positive", () => {
    const body = [{ ...ARGENTINA[1], promedio: 1560, venta: 0 }];
    expect(read("dolar-hoy-argentina", body).map(({ kind, rate }) => [kind, rate])).toEqual([["blue", 1560]]);
});

it("rejects a body that is not a list, and drops rows without a timestamp", () => {
    expect(() => decodeQuotes({ error: "unavailable" })).toThrow();
    expect(decodeQuotes([{ fuente: "oficial", moneda: "USD" }])).toEqual([]);
});
