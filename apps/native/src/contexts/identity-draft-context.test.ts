import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { describe, expect, it } from "vite-plus/test";

import { draftAtom, EMPTY_DRAFT, identityScopeFamily } from "./identity-draft-context";

const FORM_LOGO = { ...EMPTY_DRAFT, photoUri: "file:///form-logo.png" };
const ACCOUNT_LOGO = { ...EMPTY_DRAFT, photoUri: "file:///chase.png" };

describe("identity draft scope", () => {
    it("hands the shared draft back to the form once a nested account editor closes", async () => {
        const registry = AtomRegistry.make();
        registry.set(draftAtom, FORM_LOGO);
        const closeEditor = registry.mount(identityScopeFamily("editor"));
        registry.set(draftAtom, ACCOUNT_LOGO);
        expect(registry.get(draftAtom)).toStrictEqual(ACCOUNT_LOGO);

        closeEditor();
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
        });

        expect(registry.get(draftAtom)).toStrictEqual(FORM_LOGO);
        registry.dispose();
    });
});
