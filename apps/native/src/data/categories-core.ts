import { CANONICAL_CATEGORY_NAMES } from "@outlayr/money/contract";
import type { CanonicalCategoryName } from "@outlayr/money/contract";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, eq, isNull, max } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { TOMBSTONED_BUDGET } from "@/data/budgets-core";
import type { Database } from "@/db/client";
import { budgets, categories, transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { uuidV5 } from "@/domain/uuid5";

export type Category = typeof categories.$inferSelect;

const CategoriesOperation = Schema.Literals([
    "seed",
    "validate",
    "suggest",
    "addSuggested",
    "create",
    "remove",
    "reorder",
    "setParent",
    "update",
    "ensure",
]);

export class CategoriesError extends Schema.TaggedError<CategoriesError>()("CategoriesError", {
    cause: Schema.Defect(),
    operation: CategoriesOperation,
}) {
    override get message(): string {
        return `Category ${this.operation} failed`;
    }
}

export class CategoryNotFoundError extends Schema.TaggedError<CategoryNotFoundError>()("CategoryNotFoundError", {
    id: Schema.String,
}) {
    override get message(): string {
        return `Category ${this.id} not found.`;
    }
}

const query = <A>(operation: typeof CategoriesOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new CategoriesError({ cause, operation }), try: run });

const findCategory = (operation: typeof CategoriesOperation.Type, db: Database, id: string) =>
    Effect.try({ catch: (cause) => new CategoriesError({ cause, operation }), try: () => getCategoryById(db, id) });

const WHITESPACE_RUN = /\s+/;

// Uniform OKLCH lightness 0.600 and chroma 0.102, 15 degrees apart (above the ~9 degree floor where hues blur), so no
// tile shouts or vanishes. Identical in light and dark: `glyphShade` derives the readable glyph per theme.
export const CATEGORY_PALETTE = [
    "#B56858",
    "#B16C48",
    "#AB723A",
    "#A17830",
    "#957E2E",
    "#868535",
    "#758A41",
    "#618F51",
    "#4B9263",
    "#339475",
    "#189486",
    "#009296",
    "#1190A5",
    "#2C8CB0",
    "#4487B8",
    "#5981BD",
    "#6C7BBD",
    "#7D76BA",
    "#8D71B2",
    "#9A6CA8",
    "#A4689A",
    "#AD668B",
    "#B2657A",
    "#B56669",
] as const;

// Names only: a seed with its own icon would shadow the preset, since `suggestedCategoriesNotAdded` filters by name.
export const SEEDED_CATEGORY_NAMES = {
    expense: [
        "Groceries",
        "Dining Out",
        "Transport",
        "Fuel",
        "Rent",
        "Home",
        "Utilities",
        "Phone & Internet",
        "Healthcare",
        "Entertainment",
    ],
    income: ["Paycheck", "Freelance", "Business", "Gifts"],
} as const satisfies { [Kind in "expense" | "income"]: readonly CanonicalCategoryName<Kind>[] };

// Never change: a different namespace gives upgraded devices different ids for the same seeded categories.
const SEEDED_CATEGORY_NAMESPACE = "04ed4302-1c98-46af-999e-930ae1b19e0e";

// Derived, not minted, so two installs signing into one account compute one id per seeded category and upsert (#326).
export function seededCategoryId(name: string, income: boolean): string {
    return uuidV5(`${income ? "income" : "expense"}:${name}`, SEEDED_CATEGORY_NAMESPACE);
}

// Inspects the table, not the `firstLaunch` marker: `bootstrap.ts` writes that after this returns, so a crash between
// them would seed a second full set.
export const seedCategories = Effect.fn("Categories.seedCategories")(function* seedCategories(db: Database) {
    const seeded = yield* query("seed", () => db.select({ id: categories.id }).from(categories).limit(1));
    if (seeded.length > 0) {
        return;
    }

    const now = new Date();
    const rows = (["expense", "income"] as const).flatMap((namespace) => {
        const pool = SUGGESTED_CATEGORY_PRESETS[namespace];
        return SEEDED_CATEGORY_NAMES[namespace].map((name, order) => {
            const preset = pool.find((candidate) => candidate.name === name);
            if (preset == null) {
                throw new Error(
                    `Seeded category "${name}" has no ${namespace} preset to draw its icon and color from.`
                );
            }
            return {
                color: preset.color,
                dateCreated: now,
                deletedAt: null,
                emoji: null,
                icon: preset.icon,
                id: seededCategoryId(preset.name, namespace === "income"),
                income: namespace === "income",
                name: preset.name,
                parentId: null,
                sortOrder: order,
                updatedAt: now,
            };
        });
    });
    yield* query("seed", () => db.insert(categories).values(rows));
});

export interface CategoryWithChildren extends Category {
    children: Category[];
}

// Synchronous so a caller can seed state with the row during its first render.
export function getCategoryById(db: Database, id: string): Category | null {
    const rows = db
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
        .limit(1)
        .all();
    return rows[0] ?? null;
}

export interface CategoryInput {
    color: string;
    emoji?: string | null;
    /** A symbol is an icon OR an emoji; exactly one is expected. */
    icon?: string;
    income: boolean;
    name: string;
    parentId?: string | null;
}

const nextSortOrder = Effect.fn("Categories.nextSortOrder")(function* nextSortOrder(
    operation: typeof CategoriesOperation.Type,
    db: Database,
    income: boolean,
    parentId: string | null
) {
    const [row] = yield* query(operation, () =>
        db
            .select({ highest: max(categories.sortOrder) })
            .from(categories)
            .where(
                and(
                    eq(categories.income, income),
                    isNull(categories.deletedAt),
                    parentId == null ? isNull(categories.parentId) : eq(categories.parentId, parentId)
                )
            )
    );
    return (row?.highest ?? -1) + 1;
});

// In the precedence order the checks apply.
export const CategoryCode = Schema.Literals([
    "incomplete",
    "missingIcon",
    "missingName",
    "duplicate",
    "duplicateIcon",
    "duplicateEmoji",
    "duplicateName",
]);

export type CategoryError = typeof CategoryCode.Type;

/** Kept verbatim in sync with the Swift copy. */
export const CATEGORY_ERROR_MESSAGES = {
    duplicate: "A category with this symbol and name already exists.",
    duplicateEmoji: "Another category already uses this emoji.",
    duplicateIcon: "Another category already uses this icon.",
    duplicateName: "Another category already uses this name.",
    incomplete: "Please choose an icon or emoji, and a name.",
    missingIcon: "Please choose an icon or emoji for the category.",
    missingName: "Please enter a name for this category.",
} satisfies Record<CategoryError, string>;

export class CategoryValidationError extends Schema.TaggedError<CategoryValidationError>()("CategoryValidationError", {
    code: CategoryCode,
}) {
    override get message(): string {
        return CATEGORY_ERROR_MESSAGES[this.code];
    }
}

export const isCategoryValidationError = Schema.is(CategoryValidationError);

export interface CategoryValidationResult {
    error: CategoryError | null;
    order: number;
}

// Close enough to Swift's `.capitalized` to keep name-collision checks stable across the two apps.
export function capitalizeCategoryName(raw: string): string {
    return raw
        .trim()
        .split(WHITESPACE_RUN)
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

// U+FE0F is stripped so the text and emoji presentations of one glyph collide.
function emojiComparisonKey(emoji: string): string {
    return emoji.trim().split(String.fromCodePoint(0xfe_0f)).join("");
}

// Icons and emoji collide namespace-wide, not per-parent, matching Swift.
const namespaceSiblings = Effect.fn("Categories.namespaceSiblings")(function* namespaceSiblings(
    operation: typeof CategoriesOperation.Type,
    db: Database,
    income: boolean,
    excludeId?: string
) {
    const rows = yield* query(operation, () =>
        db
            .select()
            .from(categories)
            .where(and(eq(categories.income, income), isNull(categories.deletedAt)))
    );
    return excludeId == null ? rows : rows.filter((row) => row.id !== excludeId);
});

/** `name` must be title-cased already; icon and emoji are the raw candidates ("" when absent). */
function detectCollision(
    candidate: { name: string; icon: string; emoji: string },
    siblings: Category[]
): CategoryError | null {
    const iconKeys = new Set(
        siblings.map((row) => row.icon).filter((icon): icon is string => icon != null && icon !== "")
    );
    const emojiKeys = new Set(
        siblings
            .map((row) => row.emoji)
            .filter((emoji): emoji is string => emoji != null && emoji !== "")
            .map(emojiComparisonKey)
    );
    const nameKeys = new Set(
        siblings
            .map((row) => row.name)
            .filter((name): name is string => name != null)
            .map(capitalizeCategoryName)
    );

    const iconTaken = candidate.icon !== "" && iconKeys.has(candidate.icon);
    const emojiTaken = candidate.emoji !== "" && emojiKeys.has(emojiComparisonKey(candidate.emoji));
    const nameTaken = nameKeys.has(candidate.name);

    if ((iconTaken || emojiTaken) && nameTaken) {
        return "duplicate";
    }
    if (iconTaken) {
        return "duplicateIcon";
    }
    if (emojiTaken) {
        return "duplicateEmoji";
    }
    if (nameTaken) {
        return "duplicateName";
    }
    return null;
}

export function pickFreeCategoryIcon(siblings: readonly Category[], preferred: string): string {
    const used = new Set(siblings.map((row) => row.icon).filter((icon): icon is string => icon != null && icon !== ""));
    if (!used.has(preferred)) {
        return preferred;
    }
    const fallback = [...SUGGESTED_CATEGORY_PRESETS.expense, ...SUGGESTED_CATEGORY_PRESETS.income].find(
        (preset) => !used.has(preset.icon)
    );
    return fallback?.icon ?? preferred;
}

export const validateCategoryCreate = Effect.fn("Categories.validateCategoryCreate")(function* validateCategoryCreate(
    db: Database,
    input: {
        name: string;
        icon?: string | null;
        emoji?: string | null;
        income: boolean;
        parentId?: string | null;
    }
) {
    const name = capitalizeCategoryName(input.name);
    const icon = input.icon ?? "";
    const emoji = input.emoji ?? "";
    const symbolMissing = icon === "" && emoji === "";
    const order = yield* nextSortOrder("validate", db, input.income, input.parentId ?? null);

    if (name === "" && symbolMissing) {
        return { error: "incomplete", order } satisfies CategoryValidationResult;
    }
    if (name === "") {
        return { error: "missingName", order } satisfies CategoryValidationResult;
    }
    if (symbolMissing) {
        return { error: "missingIcon", order } satisfies CategoryValidationResult;
    }

    const siblings = yield* namespaceSiblings("validate", db, input.income);
    return { error: detectCollision({ emoji, icon, name }, siblings), order } satisfies CategoryValidationResult;
});

// Missing-symbol checks fire only when the row already had one, so a symbol-less legacy category stays renamable.
export const validateCategoryEdit = Effect.fn("Categories.validateCategoryEdit")(function* validateCategoryEdit(
    db: Database,
    id: string,
    input: { name: string; icon?: string | null; emoji?: string | null }
) {
    const existing = yield* findCategory("validate", db, id);
    if (existing == null) {
        return yield* new CategoryNotFoundError({ id });
    }

    const name = capitalizeCategoryName(input.name);
    const icon = input.icon ?? "";
    const emoji = input.emoji ?? "";
    const symbolMissing = icon === "" && emoji === "";
    const symbolRequired =
        (existing.icon != null && existing.icon !== "") || (existing.emoji != null && existing.emoji !== "");
    const order = yield* nextSortOrder("validate", db, existing.income, existing.parentId);

    if (name === "" && symbolMissing && symbolRequired) {
        return { error: "incomplete", order } satisfies CategoryValidationResult;
    }
    if (name === "") {
        return { error: "missingName", order } satisfies CategoryValidationResult;
    }
    if (symbolMissing && symbolRequired) {
        return { error: "missingIcon", order } satisfies CategoryValidationResult;
    }

    const siblings = yield* namespaceSiblings("validate", db, existing.income, id);
    return { error: detectCollision({ emoji, icon, name }, siblings), order } satisfies CategoryValidationResult;
});

export interface SuggestedCategoryPreset {
    color: string;
    /** Icon registry key (`components/category-icon.tsx`). */
    icon: string;
    name: string;
}

// Named so `name` stays `string`, which is what `merchant-map` matches against.
export interface SuggestedCategoryPresets {
    readonly expense: readonly SuggestedCategoryPreset[];
    readonly income: readonly SuggestedCategoryPreset[];
}

type PresetStyle = Omit<SuggestedCategoryPreset, "name">;

const EXPENSE_STYLES: Record<CanonicalCategoryName<"expense">, PresetStyle> = {
    Groceries: { color: "#53915A", icon: "ShoppingCart01" },
    "Dining Out": { color: "#A97332", icon: "Restaurant01" },
    Coffee: { color: "#AE703A", icon: "Coffee02" },
    Transport: { color: "#4D84BD", icon: "Bus01" },
    Fuel: { color: "#B46A4D", icon: "Fuel01" },
    Rent: { color: "#B26C43", icon: "Home01" },
    Home: { color: "#728B41", icon: "Sofa01" },
    Utilities: { color: "#937F2B", icon: "Flash" },
    "Phone & Internet": { color: "#0590A7", icon: "Wifi01" },
    Subscriptions: { color: "#7C76BC", icon: "Repeat" },
    Healthcare: { color: "#1D947F", icon: "Health" },
    Fitness: { color: "#B76662", icon: "Dumbbell01" },
    Shopping: { color: "#B16482", icon: "ShoppingBag01" },
    Fashion: { color: "#9B6BA8", icon: "Dress01" },
    Entertainment: { color: "#936EAF", icon: "FilmRoll01" },
    Travel: { color: "#2F8AB4", icon: "Airplane01" },
    Education: { color: "#7179BE", icon: "Mortarboard01" },
    Gifts: { color: "#B46477", icon: "Gift" },
    Pets: { color: "#A3772D", icon: "Bone01" },
    Family: { color: "#B66757", icon: "Kid" },
    "Personal Care": { color: "#AD658C", icon: "HairDryer" },
    Insurance: { color: "#667DBF", icon: "Shield01" },
    Taxes: { color: "#5A81BF", icon: "Taxes" },
};

const INCOME_STYLES: Record<CanonicalCategoryName<"income">, PresetStyle> = {
    Paycheck: { color: "#53915A", icon: "MoneyBag01" },
    Freelance: { color: "#00948A", icon: "Laptop" },
    "Part-Time": { color: "#3F87B9", icon: "Briefcase01" },
    Business: { color: "#459365", icon: "Building01" },
    Investments: { color: "#668E4B", icon: "ChartUp" },
    Interest: { color: "#359470", icon: "PercentCircle" },
    Bonus: { color: "#9C7B2A", icon: "Target01" },
    Tips: { color: "#A3772D", icon: "Tips" },
    Refund: { color: "#1E8DAE", icon: "Cashback" },
    Gifts: { color: "#B6646C", icon: "GiftCard" },
};

export const SUGGESTED_CATEGORY_PRESETS: SuggestedCategoryPresets = {
    expense: CANONICAL_CATEGORY_NAMES.expense.map((name) => ({ ...EXPENSE_STYLES[name], name })),
    income: CANONICAL_CATEGORY_NAMES.income.map((name) => ({ ...INCOME_STYLES[name], name })),
};

export function presetsNotAdded(
    income: boolean,
    existing: readonly Pick<Category, "icon" | "name">[]
): SuggestedCategoryPreset[] {
    const pool = income ? SUGGESTED_CATEGORY_PRESETS.income : SUGGESTED_CATEGORY_PRESETS.expense;
    const usedNames = new Set(
        existing
            .map((row) => row.name)
            .filter((name): name is string => name != null)
            .map(capitalizeCategoryName)
    );
    const usedIcons = new Set(
        existing.map((row) => row.icon).filter((icon): icon is string => icon != null && icon !== "")
    );
    return pool.filter((preset) => !(usedNames.has(capitalizeCategoryName(preset.name)) || usedIcons.has(preset.icon)));
}

export const suggestedCategoriesNotAdded = Effect.fn("Categories.suggestedCategoriesNotAdded")(
    function* suggestedCategoriesNotAdded(db: Database, income: boolean) {
        return presetsNotAdded(income, yield* namespaceSiblings("suggest", db, income));
    }
);

export const categoriesRepo = {
    /** A preset that would collide is skipped silently, returning null. */
    addSuggested: Effect.fn("Categories.addSuggested")(function* addSuggested(
        db: Database,
        input: { name: string; icon: string; color: string; income: boolean }
    ) {
        const { error, order } = yield* validateCategoryCreate(db, {
            emoji: null,
            icon: input.icon,
            income: input.income,
            name: input.name,
        });
        if (error != null) {
            return null;
        }
        const now = new Date();
        const id = newId();
        yield* query("addSuggested", () =>
            db.insert(categories).values({
                color: input.color,
                dateCreated: now,
                deletedAt: null,
                emoji: null,
                icon: input.icon,
                id,
                income: input.income,
                name: capitalizeCategoryName(input.name),
                parentId: null,
                sortOrder: order,
                updatedAt: now,
            })
        );
        return id;
    }),
    create: Effect.fn("Categories.create")(function* create(db: Database, input: CategoryInput) {
        const { error, order } = yield* validateCategoryCreate(db, {
            emoji: input.emoji ?? null,
            icon: input.icon ?? "",
            income: input.income,
            name: input.name,
            parentId: input.parentId ?? null,
        });
        if (error != null) {
            return yield* new CategoryValidationError({ code: error });
        }
        const parentId = input.parentId ?? null;
        const now = new Date();
        const id = newId();
        yield* query("create", () =>
            db.insert(categories).values({
                color: input.color,
                dateCreated: now,
                deletedAt: null,
                emoji: input.emoji || null,
                icon: input.icon || null,
                id,
                income: input.income,
                name: capitalizeCategoryName(input.name),
                parentId,
                sortOrder: order,
                updatedAt: now,
            })
        );
        return id;
    }),

    // Cascaded by hand: `foreign_keys` isn't enabled on the connection, so the schema's `ON DELETE` never fires. The
    // budget is fully tombstoned for peers before 0038, whose `budgets.categoryId` stays UNIQUE when deleted. Schedules
    // retire so `repairOrphanedRecurrence` mints no successor, and photos drop so `reconcilePhotos` collects them.
    remove: Effect.fn("Categories.remove")(function* remove(db: Database, id: string) {
        const now = new Date();
        yield* transaction(
            db,
            Effect.gen(function* write() {
                yield* query("remove", () =>
                    db
                        .update(transactions)
                        .set({
                            deletedAt: now,
                            imageKey: null,
                            imageUri: null,
                            recurringType: RECURRING_TYPE.none,
                            updatedAt: now,
                        })
                        .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)))
                );
                yield* query("remove", () =>
                    db
                        .update(budgets)
                        .set({ ...TOMBSTONED_BUDGET, deletedAt: now, updatedAt: now })
                        .where(and(eq(budgets.categoryId, id), isNull(budgets.deletedAt)))
                );
                yield* query("remove", () =>
                    db
                        .update(categories)
                        .set({ parentId: null, updatedAt: now })
                        .where(and(eq(categories.parentId, id), isNull(categories.deletedAt)))
                );
                yield* query("remove", () =>
                    db
                        .update(categories)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
                );
            }),
            (cause) => new CategoriesError({ cause, operation: "remove" })
        );
    }),

    /** One namespace/parent scope, already ordered: each id takes its index as `sortOrder`. */
    reorder: Effect.fn("Categories.reorder")(function* reorder(db: Database, orderedIds: string[]) {
        const now = new Date();
        yield* transaction(
            db,
            // One expo-sqlite connection backs the surrounding transaction, so concurrent statements would
            // interleave inside it.
            Effect.all(
                orderedIds.map((orderedId, index) =>
                    query("reorder", () =>
                        db
                            .update(categories)
                            .set({ sortOrder: index, updatedAt: now })
                            .where(eq(categories.id, orderedId))
                    )
                ),
                { concurrency: 1, discard: true }
            ),
            (cause) => new CategoriesError({ cause, operation: "reorder" })
        );
    }),

    /** A reparented category inherits its new parent's income namespace. */
    setParent: Effect.fn("Categories.setParent")(function* setParent(
        db: Database,
        id: string,
        parentId: string | null
    ) {
        const existing = yield* findCategory("setParent", db, id);
        if (existing == null) {
            return yield* new CategoryNotFoundError({ id });
        }
        const now = new Date();
        if (parentId == null) {
            const sortOrder = yield* nextSortOrder("setParent", db, existing.income, null);
            yield* query("setParent", () =>
                db.update(categories).set({ parentId: null, sortOrder, updatedAt: now }).where(eq(categories.id, id))
            );
            return;
        }
        const parent = yield* findCategory("setParent", db, parentId);
        if (parent == null) {
            return yield* new CategoryNotFoundError({ id: parentId });
        }
        const sortOrder = yield* nextSortOrder("setParent", db, parent.income, parentId);
        yield* query("setParent", () =>
            db
                .update(categories)
                .set({ income: parent.income, parentId, sortOrder, updatedAt: now })
                .where(eq(categories.id, id))
        );
    }),

    /** The income namespace is fixed at creation and cannot change here. */
    update: Effect.fn("Categories.update")(function* update(
        db: Database,
        id: string,
        patch: {
            name?: string;
            icon?: string | null;
            emoji?: string | null;
            color?: string;
        }
    ) {
        const existing = yield* findCategory("update", db, id);
        if (existing == null) {
            return yield* new CategoryNotFoundError({ id });
        }
        const name = patch.name ?? existing.name ?? "";
        const icon = patch.icon ?? existing.icon ?? "";
        const emoji = patch.emoji ?? existing.emoji ?? "";
        const { error } = yield* validateCategoryEdit(db, id, { emoji, icon, name });
        if (error != null) {
            return yield* new CategoryValidationError({ code: error });
        }

        const updates: Partial<typeof categories.$inferInsert> = {
            updatedAt: new Date(),
        };
        if (patch.name !== undefined) {
            updates.name = capitalizeCategoryName(patch.name);
        }
        if (patch.icon !== undefined) {
            updates.icon = patch.icon || null;
        }
        if (patch.emoji !== undefined) {
            updates.emoji = patch.emoji || null;
        }
        if (patch.color !== undefined) {
            updates.color = patch.color;
        }
        yield* query("update", () => db.update(categories).set(updates).where(eq(categories.id, id)));
    }),
};

const ALL_CATEGORY_PRESETS: readonly SuggestedCategoryPreset[] = [
    ...SUGGESTED_CATEGORY_PRESETS.expense,
    ...SUGGESTED_CATEGORY_PRESETS.income,
];

export function findCategoryPreset(categoryName: string): SuggestedCategoryPreset | null {
    return ALL_CATEGORY_PRESETS.find((preset) => preset.name === categoryName) ?? null;
}

// Hashed, not random, so a suggestion no preset covers keeps its colour across devices and re-renders.
export function presetForName(categoryName: string): SuggestedCategoryPreset {
    const exact = findCategoryPreset(categoryName);
    if (exact != null) {
        return exact;
    }
    let hash = 0;
    for (let index = 0; index < categoryName.length; index += 1) {
        // oxlint-disable-next-line no-bitwise, unicorn/prefer-code-point -- `>>> 0` truncates the running product to uint32, which is what keeps this hash off float precision; and the hash picks the preset a name has already been shown with, so it has to keep numbering surrogate halves the way it did when those categories were created
        hash = (hash * 31 + categoryName.charCodeAt(index)) >>> 0;
    }
    return ALL_CATEGORY_PRESETS[hash % ALL_CATEGORY_PRESETS.length];
}

// The icon is picked free BEFORE `create`, which rejects an icon collision namespace-wide.
export const ensureCategoryByName = Effect.fn("Categories.ensureCategoryByName")(function* ensureCategoryByName(
    db: Database,
    name: string,
    income: boolean,
    icon: string,
    color: string,
    nested?: { emoji?: string | null; parentId?: string | null }
) {
    const cleanName = capitalizeCategoryName(name);
    const siblings = yield* namespaceSiblings("ensure", db, income);
    const existing = siblings.find((row) => row.name != null && capitalizeCategoryName(row.name) === cleanName);
    if (existing != null) {
        return existing.id;
    }
    // An emoji and an icon are alternatives, not a pair: sending both trips the
    // duplicate-symbol check that `validateCategoryCreate` runs namespace-wide.
    const emoji = nested?.emoji ?? null;
    return yield* categoriesRepo.create(db, {
        color,
        emoji,
        icon: emoji == null ? pickFreeCategoryIcon(siblings, icon) : undefined,
        income,
        name: cleanName,
        parentId: nested?.parentId ?? null,
    });
});
