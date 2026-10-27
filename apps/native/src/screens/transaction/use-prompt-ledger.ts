import { useBankAccounts } from "@/data/accounts";
import { useCategoriesByNamespace } from "@/data/categories";
import type { Database } from "@/db/client";
import { boundedPromptNames } from "@/domain/prompt-budget";
import type { CategoryCandidate } from "@/domain/voice-entry";

export function usePromptLedger(db: Database, currency: string) {
    const accounts = useBankAccounts(db);
    const expenseCategories = useCategoriesByNamespace(db, false);
    const incomeCategories = useCategoriesByNamespace(db, true);
    const parents = [...expenseCategories, ...incomeCategories];
    const categoryTree = parents
        .filter((parent) => parent.name != null)
        .map((parent) => ({
            children: parent.children.map((child) => child.name).filter((name) => name != null),
            // SAFETY: filtered to a non-null name just above.
            name: parent.name as string,
        }));
    const candidates: CategoryCandidate[] = parents.flatMap((parent) => [
        { id: parent.id, income: parent.income, name: parent.name },
        ...parent.children.map((child) => ({ id: child.id, income: child.income, name: child.name })),
    ]);
    const bounded = boundedPromptNames({ accounts: accounts.map((account) => account.name), categoryTree });
    const live = {
        accountIds: new Set(accounts.map((account) => account.id)),
        categoryIds: new Set(candidates.map((candidate) => candidate.id)),
    };
    // The ledger the model saw, not the one sync may have left by the time it answers.
    const context = {
        accounts: accounts.map((account) => ({
            currency: account.currency,
            id: account.id,
            name: account.name,
        })),
        accountsOmitted: bounded.accountsOmitted,
        categories: candidates,
        categoriesOmitted: bounded.categoriesOmitted,
        currency,
    };
    return { accounts, bounded, context, live };
}
