import { describeTree, pickKnown } from "./ledgerPrompt";
import type { CategoryBranch } from "./ledgerPrompt";

const MAX_CATEGORY_NAME_LENGTH = 40;

const TREE_CHILDREN_SUFFIX = /\s*\(containing [^)]*\)$/;

export function sanitizeCategoryName(name: string | null | undefined): string | null {
    const trimmed = name?.trim().replace(TREE_CHILDREN_SUFFIX, "") ?? "";
    return trimmed.length === 0 || trimmed.length > MAX_CATEGORY_NAME_LENGTH ? null : trimmed;
}

export const CATEGORY_REUSE_TEST =
    "Reuse a category only when someone reading its name alone would expect this purchase in it; being about the same thing or sharing a word is not enough (a fuel category holds only fuel, never an oil change, tyres or a repair; a car wash is not laundry; fast food is not a café; a ride across town is not travel). A category named for a whole area of life or a group of people rather than a kind of purchase (personal, family, business, shopping, other, general) is never the answer when a specific category would name the purchase: a streaming subscription, a gym, a clinic or a school do not go under personal.";

const FIT_LINE = `Choose like this: first decide what kind of purchase it is, then look for a category whose name names that kind of purchase, and when there is none, create one. ${CATEGORY_REUSE_TEST}`;

export function categoryChoiceLines(tree: readonly CategoryBranch[]): string[] {
    return [
        `The person's categories, with any nested under them, are: ${describeTree(tree)}.`,
        FIT_LINE,
        "When one fits, set categoryName to its name verbatim, without the parenthesised list, and set parentCategoryName to null.",
        "When none fits, set categoryName to a short new category name. Set parentCategoryName to the person's top-level category that is the broader group it belongs to, by the same test (car maintenance never goes under fuel, and nothing goes under a whole-area category like personal); when none is, to a short new name for the broader group it falls under (a vehicle group above car maintenance), which is created along with it; or null when the new category is itself a broad group.",
        "Write new category names in the language of the person's existing categories, or of their locale when they have none.",
    ];
}

export interface PlacedCategory {
    categoryName: string | null;
    isNewCategory: boolean;
    parentCategoryName: string | null;
}

export function placeCategory(
    tree: readonly CategoryBranch[],
    candidate: { categoryName: string | null | undefined; parentCategoryName: string | null | undefined }
): PlacedCategory {
    const everyName = tree.flatMap((branch) => [branch.name, ...branch.children]);
    const answered = sanitizeCategoryName(candidate.categoryName);
    const known = pickKnown(answered, everyName);
    if (answered === null || known !== null) {
        return { categoryName: known, isNewCategory: false, parentCategoryName: null };
    }
    const parent = sanitizeCategoryName(candidate.parentCategoryName);
    const topLevel = pickKnown(
        parent,
        tree.map((branch) => branch.name)
    );
    const nestsUnderChild = topLevel === null && pickKnown(parent, everyName) !== null;
    const sameAsChild = parent !== null && parent.toLowerCase() === answered.toLowerCase();
    return {
        categoryName: answered,
        isNewCategory: true,
        parentCategoryName: nestsUnderChild || sameAsChild ? null : (topLevel ?? parent),
    };
}
