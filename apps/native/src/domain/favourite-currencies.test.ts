import { describe, expect, it } from "@jest/globals";
import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";

import {
    FAVOURITE_CURRENCY_LIMIT,
    isFavourite,
    parseFavourites,
    seedFavourites,
    serialiseFavourites,
    toggleFavourite,
} from "./favourite-currencies";

const TWELVE = ["USD", "VES", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN"];

const EIGHT = TWELVE.slice(0, FAVOURITE_CURRENCY_LIMIT);

describe("parseFavourites", () => {
    it("reads an unset and an empty setting as no favourites", () => {
        expect(parseFavourites(null)).toStrictEqual([]);
        expect(parseFavourites("")).toStrictEqual([]);
    });

    it("trims the padding a hand-edited value would carry", () => {
        expect(parseFavourites(" eur ,\tusd ")).toStrictEqual(["EUR", "USD"]);
    });

    it("keeps the first sighting of a duplicate and drops the rest", () => {
        expect(parseFavourites("EUR,EUR,JPY")).toStrictEqual(["EUR", "JPY"]);
        expect(parseFavourites("EUR,JPY,eur")).toStrictEqual(["EUR", "JPY"]);
    });

    it("drops anything the catalogue does not know rather than keeping it", () => {
        expect(parseFavourites("EUR,XXX,JPY")).toStrictEqual(["EUR", "JPY"]);
        expect(parseFavourites("EUR,,JPY")).toStrictEqual(["EUR", "JPY"]);
        expect(parseFavourites("EUR, ,JPY")).toStrictEqual(["EUR", "JPY"]);
        expect(parseFavourites("XXX")).toStrictEqual([]);
        expect(parseFavourites(",,,")).toStrictEqual([]);
    });

    it("caps a longer stored list at the limit, keeping the first ones", () => {
        expect(TWELVE).toHaveLength(12);
        expect(parseFavourites(TWELVE.join(","))).toStrictEqual(EIGHT);
    });

    it("counts only the codes it kept towards the cap", () => {
        const padded = EIGHT.flatMap((code, index) => [code, `XX${index}`]);
        expect(parseFavourites(padded.join(","))).toStrictEqual(EIGHT);
    });
});

describe("serialiseFavourites", () => {
    it("round-trips every code in the catalogue", () => {
        for (let start = 0; start < PICKABLE_CURRENCY_CODES.length; start += FAVOURITE_CURRENCY_LIMIT) {
            const chunk = PICKABLE_CURRENCY_CODES.slice(start, start + FAVOURITE_CURRENCY_LIMIT);
            expect(parseFavourites(serialiseFavourites(chunk))).toStrictEqual([...chunk]);
        }
    });
});

describe("toggleFavourite", () => {
    it("appends an absent code to the end", () => {
        expect(toggleFavourite(["EUR", "JPY"], "GBP")).toStrictEqual(["EUR", "JPY", "GBP"]);
        expect(toggleFavourite([], "GBP")).toStrictEqual(["GBP"]);
    });

    it("appends in the catalogue's casing whatever casing it is handed", () => {
        expect(toggleFavourite(["EUR"], "gbp")).toStrictEqual(["EUR", "GBP"]);
    });

    it("removes from the middle without disturbing the order", () => {
        expect(toggleFavourite(["EUR", "JPY", "GBP"], "JPY")).toStrictEqual(["EUR", "GBP"]);
        expect(toggleFavourite(["EUR", "JPY", "GBP"], "jpy")).toStrictEqual(["EUR", "GBP"]);
    });

    it("returns the list unchanged when adding a ninth", () => {
        expect(EIGHT).toHaveLength(FAVOURITE_CURRENCY_LIMIT);
        expect(toggleFavourite(EIGHT, "JPY")).toStrictEqual(EIGHT);
    });

    it("still lets a full list be shortened", () => {
        expect(toggleFavourite(EIGHT, "USD")).toStrictEqual(EIGHT.slice(1));
    });

    it("refuses a code the catalogue does not know", () => {
        expect(toggleFavourite(["EUR"], "XXX")).toStrictEqual(["EUR"]);
        expect(toggleFavourite(["EUR"], " ")).toStrictEqual(["EUR"]);
    });

    it("never mutates the list it is handed", () => {
        const codes = ["EUR", "JPY"];
        toggleFavourite(codes, "GBP");
        toggleFavourite(codes, "EUR");
        expect(codes).toStrictEqual(["EUR", "JPY"]);
    });
});

describe("isFavourite", () => {
    it("matches whatever casing the caller has", () => {
        expect(isFavourite(["EUR", "JPY"], "eur")).toBe(true);
        expect(isFavourite(["EUR", "JPY"], "EUR")).toBe(true);
        expect(isFavourite(["EUR", "JPY"], " jpy ")).toBe(true);
    });

    it("is false for a code that is not there", () => {
        expect(isFavourite(["EUR", "JPY"], "GBP")).toBe(false);
        expect(isFavourite([], "EUR")).toBe(false);
    });
});

describe("the cluster a new ledger starts with", () => {
    it("always offers the two anchors", () => {
        expect(seedFavourites(null)).toStrictEqual(["USD", "EUR"]);
    });

    it("appends the device's own currency", () => {
        expect(seedFavourites("VES")).toStrictEqual(["USD", "EUR", "VES"]);
    });

    it("does not repeat an anchor the device already uses", () => {
        expect(seedFavourites("EUR")).toStrictEqual(["USD", "EUR"]);
        expect(seedFavourites("usd")).toStrictEqual(["USD", "EUR"]);
    });

    it("prices a redenominated code under the name the catalogue carries", () => {
        expect(seedFavourites("VED")).toStrictEqual(["USD", "EUR", "VES"]);
    });

    it("ignores a code the catalogue does not know", () => {
        expect(seedFavourites("XXX")).toStrictEqual(["USD", "EUR"]);
    });
});
