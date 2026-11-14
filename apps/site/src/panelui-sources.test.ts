import { globSync, readFileSync } from "node:fs";

import { expect, it } from "vite-plus/test";

it("gives every panelui-web component an @source line in index.css", () => {
    const css = readFileSync("src/index.css", "utf-8");
    const imported = new Set(
        globSync("src/**/*.{ts,tsx}").flatMap((file) =>
            [...readFileSync(file, "utf-8").matchAll(/from "panelui-web\/([\w-]+)"/g)].map((match) => match[1])
        )
    );
    const missing = [...imported].filter((name) => !css.includes(`panelui-web/dist/components/${name}/index.js`));
    expect(missing).toEqual([]);
});
