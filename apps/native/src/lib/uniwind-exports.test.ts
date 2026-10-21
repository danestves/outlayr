import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, test } from "@jest/globals";

// Metro serves uniwind's component index in place of `react-native`, so an export it does not forward is undefined
// in the app. Read as text because invoking the getters would load native modules.
const getterNames = (file: string) =>
    new Set(Array.from(readFileSync(file, "utf-8").matchAll(/^\s*get (\w+)\(\)/gm), ([, name]) => name));

const packageDir = (name: string) => dirname(require.resolve(`${name}/package.json`));

test("forwards every react-native export through uniwind", () => {
    const uniwind = getterNames(join(packageDir("uniwind"), "src/components/index.ts"));
    const missing = [...getterNames(join(packageDir("react-native"), "index.js"))].filter((name) => !uniwind.has(name));

    expect(missing).toStrictEqual([]);
});
