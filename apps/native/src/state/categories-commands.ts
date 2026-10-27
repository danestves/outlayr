import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { categoriesRepo } from "@/data/categories-core";
import type { CategoryInput } from "@/data/categories-core";
import type { Database } from "@/db/client";
import { categories } from "@/db/schema";
import { appRuntime } from "@/lib/runtime";

import { createCommand, createRuntimeCommand, tapFailure } from "./atom-command";

export class CategoryChildrenError extends Schema.TaggedError<CategoryChildrenError>()("CategoryChildrenError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "The subcategories could not be counted";
    }
}

export const countCategoryChildrenCommand = createCommand({
    execute: (input: { db: Database; id: string }) =>
        Effect.tryPromise({
            catch: (cause) => new CategoryChildrenError({ cause }),
            try: () =>
                input.db
                    .select({ id: categories.id })
                    .from(categories)
                    .where(and(eq(categories.parentId, input.id), isNull(categories.deletedAt))),
        }).pipe(Effect.map((children) => ({ children: children.length, id: input.id }))),
    label: "categories:count-children",
});

export const createCategoryCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { category: CategoryInput; db: Database }) => categoriesRepo.create(input.db, input.category),
    label: "categories:create",
});

export const updateCategoryCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: Database; id: string; patch: Parameters<typeof categoriesRepo.update>[2] }) =>
        categoriesRepo.update(input.db, input.id, input.patch),
    label: "categories:update",
});

interface CategorySave {
    db: Database;
    onFailure: (error: Error) => void;
    onSaved: () => void;
    write:
        | { category: CategoryInput; mode: "create" }
        | { id: string; mode: "edit"; patch: Parameters<typeof categoriesRepo.update>[2] };
}

export const saveCategoryCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Categories.save")(function* saveCategory({ db, onFailure, onSaved, write }: CategorySave) {
        const written =
            write.mode === "create"
                ? categoriesRepo.create(db, write.category).pipe(Effect.asVoid)
                : categoriesRepo.update(db, write.id, write.patch).pipe(Effect.asVoid);
        yield* written.pipe(tapFailure(onFailure));
        yield* Effect.sync(onSaved).pipe(tapFailure(onFailure));
    }),
    label: "categories:save",
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
