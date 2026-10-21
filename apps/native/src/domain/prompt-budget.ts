import type { CategoryBranch } from "@/lib/convex";

// Mirrors `namesWithinBudget` in `packages/backend/convex/voiceEntry.ts` and `receiptScan.ts`, or an oversized
// ledger would fail every attempt as `invalid`.
const MAX_CATEGORY_NAMES = 200;
const MAX_ACCOUNT_NAMES = 50;
const MAX_CHILDREN_PER_BRANCH = 50;
const MAX_NAME_LENGTH = 80;
const MAX_TOTAL_NAMES = 400;

export interface PromptNames {
    accounts: string[];
    categoryTree: CategoryBranch[];
}

export interface BoundedPromptNames extends PromptNames {
    accountsOmitted: boolean;
    categoriesOmitted: boolean;
}

const fits = (name: string) => name.length <= MAX_NAME_LENGTH;

// Overlong names are dropped, not cut: a cut name would resolve to nothing locally anyway.
export function boundedPromptNames({ accounts, categoryTree }: PromptNames): BoundedPromptNames {
    const keptAccounts = accounts.filter(fits).slice(0, MAX_ACCOUNT_NAMES);
    let total = keptAccounts.length;
    const keptTree: CategoryBranch[] = [];
    for (const branch of categoryTree.slice(0, MAX_CATEGORY_NAMES)) {
        if (!fits(branch.name)) {
            continue;
        }
        const children = branch.children.filter(fits).slice(0, MAX_CHILDREN_PER_BRANCH);
        const room = MAX_TOTAL_NAMES - total - 1;
        if (room < 0) {
            break;
        }
        const kept = children.slice(0, room);
        keptTree.push({ children: kept, name: branch.name });
        total += 1 + kept.length;
    }
    const sentCategories = keptTree.reduce((sum, branch) => sum + 1 + branch.children.length, 0);
    const allCategories = categoryTree.reduce((sum, branch) => sum + 1 + branch.children.length, 0);
    return {
        accounts: keptAccounts,
        accountsOmitted: keptAccounts.length < accounts.length,
        categoriesOmitted: sentCategories < allCategories,
        categoryTree: keptTree,
    };
}
