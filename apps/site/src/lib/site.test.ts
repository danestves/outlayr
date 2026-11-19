import { expect, it } from "vite-plus/test";

import { GUIDES_PUBLISHED, guideUpdated } from "./site";

it("never puts a guide's datePublished after its dateModified", () => {
    const late = Object.entries(GUIDES_PUBLISHED).filter(([slug, published]) => published > guideUpdated(slug));
    expect(late).toEqual([]);
});
