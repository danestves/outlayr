import { categoriesRepo } from "@/data/categories-core";
import type { CategoryInput } from "@/data/categories-core";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

export const createCategoryCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { category: CategoryInput; db: Database }) => categoriesRepo.create(input.db, input.category),
    label: "categories:create",
});

export const updateCategoryCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: Database; id: string; patch: Parameters<typeof categoriesRepo.update>[2] }) =>
        categoriesRepo.update(input.db, input.id, input.patch),
    label: "categories:update",
});

export const addSuggestedCategoryCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: Database; preset: Parameters<typeof categoriesRepo.addSuggested>[1] }) =>
        categoriesRepo.addSuggested(input.db, input.preset),
    label: "categories:add-suggested",
});

export const reorderCategoriesCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: Database; orderedIds: string[] }) => categoriesRepo.reorder(input.db, input.orderedIds),
    label: "categories:reorder",
});
