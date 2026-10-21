import { describe, expect, it } from "vite-plus/test";
import { buildCatalog } from "../scripts/lib/build-catalog.mts";
import { CURRENCY_DECIMALS, CURRENCY_META, PICKABLE_CURRENCY_CODES } from "./catalog.generated";

// Regenerate with `vp run --filter @outlayr/money generate:catalog`.
describe("catalog.generated drift", () => {
	const built = buildCatalog();

	it("commits exactly the generator's code list, in order", () => {
		expect([...PICKABLE_CURRENCY_CODES]).toEqual(built.codes);
	});

	it("commits the generator's decimals record verbatim", () => {
		expect(CURRENCY_DECIMALS).toEqual(built.decimals);
	});

	it("commits the generator's metadata record verbatim", () => {
		expect(CURRENCY_META).toEqual(built.meta);
	});

	it("only ever assigns 0, 2, 3 or 6 fraction digits", () => {
		for (const value of Object.values(built.decimals)) {
			expect([0, 2, 3, 6]).toContain(value);
		}
	});

	it("gives six digits to the metals and to nothing else", () => {
		const six = Object.entries(built.decimals)
			.filter(([, value]) => value === 6)
			.map(([code]) => code)
			.sort();

		expect(six).toStrictEqual(["XAG", "XAU", "XPD", "XPT"]);
	});
});
