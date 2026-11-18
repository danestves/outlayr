import { existsSync } from "node:fs";

import { expect, it } from "vite-plus/test";

import { tileDomains } from "./country-logos";

it("has a baked tile for every logo a country shows", () => {
    const unbaked = tileDomains().filter(
        (domain) => !existsSync(new URL(`../../../public/media/logos/${domain}.webp`, import.meta.url))
    );
    expect(unbaked).toEqual([]);
});
