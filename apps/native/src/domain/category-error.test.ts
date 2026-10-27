import { describe, expect, it } from "@jest/globals";

import { CATEGORY_ERROR_MESSAGES } from "@/data/categories-core";

import { categoryErrorCode } from "./category-error";

describe("categoryErrorCode", () => {
    it.each(Object.entries(CATEGORY_ERROR_MESSAGES))(`matches the repo's "%s" message`, (code, message) => {
        expect(categoryErrorCode(message)).toBe(code);
    });
});
