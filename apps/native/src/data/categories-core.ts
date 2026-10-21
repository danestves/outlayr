import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, eq, isNull, max } from "drizzle-orm";

import { TOMBSTONED_BUDGET } from "@/data/budgets-core";
import type { Database } from "@/db/client";
import { budgets, categories, transactions } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { uuidV5 } from "@/domain/uuid5";

export type Category = typeof categories.$inferSelect;

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
} as const satisfies Record<"expense" | "income", readonly string[]>;

// Never change: a different namespace gives upgraded devices different ids for the same seeded categories.
const SEEDED_CATEGORY_NAMESPACE = "04ed4302-1c98-46af-999e-930ae1b19e0e";

// Derived, not minted, so two installs signing into one account compute one id per seeded category and upsert (#326).
export function seededCategoryId(name: string, income: boolean): string {
    return uuidV5(`${income ? "income" : "expense"}:${name}`, SEEDED_CATEGORY_NAMESPACE);
}

// Inspects the table, not the `firstLaunch` marker: `bootstrap.ts` writes that after this returns, so a crash between
// them would seed a second full set.
export async function seedCategories(db: Database): Promise<void> {
    const seeded = await db.select({ id: categories.id }).from(categories).limit(1);
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
    await db.insert(categories).values(rows);
}

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

async function nextSortOrder(db: Database, income: boolean, parentId: string | null): Promise<number> {
    const [row] = await db
        .select({ highest: max(categories.sortOrder) })
        .from(categories)
        .where(
            and(
                eq(categories.income, income),
                isNull(categories.deletedAt),
                parentId == null ? isNull(categories.parentId) : eq(categories.parentId, parentId)
            )
        );
    return (row?.highest ?? -1) + 1;
}

// In the precedence order the checks apply.
export type CategoryError =
    | "incomplete"
    | "missingIcon"
    | "missingName"
    | "duplicate"
    | "duplicateIcon"
    | "duplicateEmoji"
    | "duplicateName";

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
async function namespaceSiblings(db: Database, income: boolean, excludeId?: string): Promise<Category[]> {
    const rows = await db
        .select()
        .from(categories)
        .where(and(eq(categories.income, income), isNull(categories.deletedAt)));
    return excludeId == null ? rows : rows.filter((row) => row.id !== excludeId);
}

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

export async function validateCategoryCreate(
    db: Database,
    input: {
        name: string;
        icon?: string | null;
        emoji?: string | null;
        income: boolean;
        parentId?: string | null;
    }
): Promise<CategoryValidationResult> {
    const name = capitalizeCategoryName(input.name);
    const icon = input.icon ?? "";
    const emoji = input.emoji ?? "";
    const symbolMissing = icon === "" && emoji === "";
    const order = await nextSortOrder(db, input.income, input.parentId ?? null);

    if (name === "" && symbolMissing) {
        return { error: "incomplete", order };
    }
    if (name === "") {
        return { error: "missingName", order };
    }
    if (symbolMissing) {
        return { error: "missingIcon", order };
    }

    const siblings = await namespaceSiblings(db, input.income);
    return { error: detectCollision({ emoji, icon, name }, siblings), order };
}

// Missing-symbol checks fire only when the row already had one, so a symbol-less legacy category stays renamable.
export async function validateCategoryEdit(
    db: Database,
    id: string,
    input: { name: string; icon?: string | null; emoji?: string | null }
): Promise<CategoryValidationResult> {
    const existing = await getCategoryById(db, id);
    if (existing == null) {
        throw new Error("Category not found.");
    }

    const name = capitalizeCategoryName(input.name);
    const icon = input.icon ?? "";
    const emoji = input.emoji ?? "";
    const symbolMissing = icon === "" && emoji === "";
    const symbolRequired =
        (existing.icon != null && existing.icon !== "") || (existing.emoji != null && existing.emoji !== "");
    const order = await nextSortOrder(db, existing.income, existing.parentId);

    if (name === "" && symbolMissing && symbolRequired) {
        return { error: "incomplete", order };
    }
    if (name === "") {
        return { error: "missingName", order };
    }
    if (symbolMissing && symbolRequired) {
        return { error: "missingIcon", order };
    }

    const siblings = await namespaceSiblings(db, existing.income, id);
    return { error: detectCollision({ emoji, icon, name }, siblings), order };
}

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

export const SUGGESTED_CATEGORY_PRESETS: SuggestedCategoryPresets = {
    expense: [
        { color: "#53915A", icon: "ShoppingCart01", name: "Groceries" },
        { color: "#A97332", icon: "Restaurant01", name: "Dining Out" },
        { color: "#AE703A", icon: "Coffee02", name: "Coffee" },
        { color: "#4D84BD", icon: "Bus01", name: "Transport" },
        { color: "#B46A4D", icon: "Fuel01", name: "Fuel" },
        { color: "#B26C43", icon: "Home01", name: "Rent" },
        { color: "#728B41", icon: "Sofa01", name: "Home" },
        { color: "#937F2B", icon: "Flash", name: "Utilities" },
        { color: "#0590A7", icon: "Wifi01", name: "Phone & Internet" },
        { color: "#7C76BC", icon: "Repeat", name: "Subscriptions" },
        { color: "#1D947F", icon: "Health", name: "Healthcare" },
        { color: "#B76662", icon: "Dumbbell01", name: "Fitness" },
        { color: "#B16482", icon: "ShoppingBag01", name: "Shopping" },
        { color: "#9B6BA8", icon: "Dress01", name: "Fashion" },
        { color: "#936EAF", icon: "FilmRoll01", name: "Entertainment" },
        { color: "#2F8AB4", icon: "Airplane01", name: "Travel" },
        { color: "#7179BE", icon: "Mortarboard01", name: "Education" },
        { color: "#B46477", icon: "Gift", name: "Gifts" },
        { color: "#A3772D", icon: "Bone01", name: "Pets" },
        { color: "#B66757", icon: "Kid", name: "Family" },
        { color: "#AD658C", icon: "HairDryer", name: "Personal Care" },
        { color: "#667DBF", icon: "Shield01", name: "Insurance" },
        { color: "#5A81BF", icon: "Taxes", name: "Taxes" },
    ],
    income: [
        { color: "#53915A", icon: "MoneyBag01", name: "Paycheck" },
        { color: "#00948A", icon: "Laptop", name: "Freelance" },
        { color: "#3F87B9", icon: "Briefcase01", name: "Part-Time" },
        { color: "#459365", icon: "Building01", name: "Business" },
        { color: "#668E4B", icon: "ChartUp", name: "Investments" },
        { color: "#359470", icon: "PercentCircle", name: "Interest" },
        { color: "#9C7B2A", icon: "Target01", name: "Bonus" },
        { color: "#A3772D", icon: "Tips", name: "Tips" },
        { color: "#1E8DAE", icon: "Cashback", name: "Refund" },
        { color: "#B6646C", icon: "GiftCard", name: "Gifts" },
    ],
} as const;

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

export async function suggestedCategoriesNotAdded(db: Database, income: boolean): Promise<SuggestedCategoryPreset[]> {
    return presetsNotAdded(income, await namespaceSiblings(db, income));
}

export const categoriesRepo = {
    /** A preset that would collide is skipped silently, returning null. */
    async addSuggested(
        db: Database,
        input: { name: string; icon: string; color: string; income: boolean }
    ): Promise<string | null> {
        const { error, order } = await validateCategoryCreate(db, {
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
        await db.insert(categories).values({
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
        });
        return id;
    },
    async create(db: Database, input: CategoryInput): Promise<string> {
        const { error, order } = await validateCategoryCreate(db, {
            emoji: input.emoji ?? null,
            icon: input.icon ?? "",
            income: input.income,
            name: input.name,
            parentId: input.parentId ?? null,
        });
        if (error != null) {
            throw new Error(CATEGORY_ERROR_MESSAGES[error]);
        }
        const parentId = input.parentId ?? null;
        const now = new Date();
        const id = newId();
        await db.insert(categories).values({
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
        });
        return id;
    },

    // Cascaded by hand: `foreign_keys` isn't enabled on the connection, so the schema's `ON DELETE` never fires. The
    // budget takes the full tombstone since `budgets.categoryId` is UNIQUE even when deleted. Schedules retire so
    // `repairOrphanedRecurrence` mints no successor, and photos drop so `reconcilePhotos` collects them.
    async remove(db: Database, id: string): Promise<void> {
        const now = new Date();
        await withTransaction(db, async () => {
            await db
                .update(transactions)
                .set({
                    deletedAt: now,
                    imageKey: null,
                    imageUri: null,
                    recurringType: RECURRING_TYPE.none,
                    updatedAt: now,
                })
                .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)));
            await db
                .update(budgets)
                .set({ ...TOMBSTONED_BUDGET, deletedAt: now, updatedAt: now })
                .where(and(eq(budgets.categoryId, id), isNull(budgets.deletedAt)));
            await db
                .update(categories)
                .set({ parentId: null, updatedAt: now })
                .where(and(eq(categories.parentId, id), isNull(categories.deletedAt)));
            await db
                .update(categories)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(categories.id, id), isNull(categories.deletedAt)));
        });
    },

    /** One namespace/parent scope, already ordered: each id takes its index as `sortOrder`. */
    async reorder(db: Database, orderedIds: string[]): Promise<void> {
        const now = new Date();
        await withTransaction(db, async () => {
            for (let index = 0; index < orderedIds.length; index += 1) {
                // oxlint-disable-next-line no-await-in-loop -- one expo-sqlite connection backs the surrounding withTransaction, so concurrent statements would interleave inside the same transaction
                await db
                    .update(categories)
                    .set({ sortOrder: index, updatedAt: now })
                    .where(eq(categories.id, orderedIds[index]));
            }
        });
    },

    /** A reparented category inherits its new parent's income namespace. */
    async setParent(db: Database, id: string, parentId: string | null): Promise<void> {
        const existing = await getCategoryById(db, id);
        if (existing == null) {
            throw new Error("Category not found.");
        }
        const now = new Date();
        if (parentId == null) {
            await db
                .update(categories)
                .set({
                    parentId: null,
                    sortOrder: await nextSortOrder(db, existing.income, null),
                    updatedAt: now,
                })
                .where(eq(categories.id, id));
            return;
        }
        const parent = await getCategoryById(db, parentId);
        if (parent == null) {
            throw new Error("Category not found.");
        }
        await db
            .update(categories)
            .set({
                income: parent.income,
                parentId,
                sortOrder: await nextSortOrder(db, parent.income, parentId),
                updatedAt: now,
            })
            .where(eq(categories.id, id));
    },

    /** The income namespace is fixed at creation and cannot change here. */
    async update(
        db: Database,
        id: string,
        patch: {
            name?: string;
            icon?: string | null;
            emoji?: string | null;
            color?: string;
        }
    ): Promise<void> {
        const existing = await getCategoryById(db, id);
        if (existing == null) {
            throw new Error("Category not found.");
        }
        const name = patch.name ?? existing.name ?? "";
        const icon = patch.icon ?? existing.icon ?? "";
        const emoji = patch.emoji ?? existing.emoji ?? "";
        const { error } = await validateCategoryEdit(db, id, { emoji, icon, name });
        if (error != null) {
            throw new Error(CATEGORY_ERROR_MESSAGES[error]);
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
        await db.update(categories).set(updates).where(eq(categories.id, id));
    },
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
export async function ensureCategoryByName(
    db: Database,
    name: string,
    income: boolean,
    icon: string,
    color: string,
    nested?: { emoji?: string | null; parentId?: string | null }
): Promise<string> {
    const cleanName = capitalizeCategoryName(name);
    const siblings = await namespaceSiblings(db, income);
    const existing = siblings.find((row) => row.name != null && capitalizeCategoryName(row.name) === cleanName);
    if (existing != null) {
        return existing.id;
    }
    // An emoji and an icon are alternatives, not a pair: sending both trips the
    // duplicate-symbol check that `validateCategoryCreate` runs namespace-wide.
    const emoji = nested?.emoji ?? null;
    return categoriesRepo.create(db, {
        color,
        emoji,
        icon: emoji == null ? pickFreeCategoryIcon(siblings, icon) : undefined,
        income,
        name: cleanName,
        parentId: nested?.parentId ?? null,
    });
}
