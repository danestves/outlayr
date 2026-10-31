import { useRouter } from "expo-router";

import { useAppSettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useCategoriesByNamespace, useCategoryTotals } from "@/data/categories";
import { presetsNotAdded } from "@/data/categories-core";
import type { Category, CategoryWithChildren, SuggestedCategoryPreset } from "@/data/categories-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useTranslation } from "@/i18n/context";
import { addSuggestedCategoryCommand } from "@/state/categories-commands";
import { setBoolSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

/** A deleted parent's children are re-parented to the top level, so promote them here. */
function pendingRemoved(parents: CategoryWithChildren[], pendingId: string | null): CategoryWithChildren[] {
    if (pendingId === null) {
        return parents;
    }
    return parents.flatMap((parent) => {
        if (parent.id === pendingId) {
            return parent.children.map((child) => ({ ...child, children: [] }));
        }
        if (!parent.children.some((child) => child.id === pendingId)) {
            return [parent];
        }
        return [{ ...parent, children: parent.children.filter((child) => child.id !== pendingId) }];
    });
}

export function useCategoryList(income: boolean) {
    const db = useDatabase();
    const addSuggestedCategory = useAtomCommand(addSuggestedCategoryCommand);
    const setBoolSetting = useAtomCommand(setBoolSettingCommand);
    const router = useRouter();
    const t = useTranslation();
    const currency = useGlobalCurrency(db);
    const showSuggestions = useAppSettings().state.bool("categorySuggestions");
    const namespace = useCategoriesByNamespace(db, income);
    const { pendingId, requestDelete } = useDeferredDelete("category");
    const parents = pendingRemoved(namespace, pendingId);
    const totals = useCategoryTotals(db);

    const children = parents.reduce((total, parent) => total + parent.children.length, 0);
    const census = [t("categories.census.categories", { count: parents.length })];
    if (children > 0) {
        census.push(t("categories.census.subcategories", { count: children }));
    }

    return {
        addSuggested: (preset: SuggestedCategoryPreset) => {
            addSuggestedCategory({
                db,
                preset: {
                    color: preset.color,
                    icon: preset.icon,
                    income,
                    name: preset.name,
                },
            });
        },
        census: census.join(" · "),
        currency,
        deleteCategory: (category: Category, hasChildren: boolean) => {
            requestDelete(category.id, {
                body: t(hasChildren ? "categories.undo.bodyWithChildren" : "categories.undo.body"),
            });
        },
        goToEdit: (category: Category) => {
            if (category.parentId) {
                router.push({
                    params: { categoryId: category.parentId, subcategoryId: category.id },
                    pathname: "/settings/categories/[categoryId]/subcategories/[subcategoryId]",
                });
                return;
            }
            router.push({
                params: { categoryId: category.id },
                pathname: "/settings/categories/[categoryId]",
            });
        },
        goToNewChild: (parent: CategoryWithChildren) => {
            router.push({
                params: { categoryId: parent.id },
                pathname: "/settings/categories/[categoryId]/subcategories/create",
            });
        },
        goToReorder: () => {
            router.push({
                params: { income: income ? "1" : "0" },
                pathname: "/settings/categories/reorder",
            });
        },
        parents,
        showSuggestions,
        suggestions: presetsNotAdded(
            income,
            namespace.flatMap((parent) => [parent, ...parent.children]),
            t
        ),
        toggleSuggestions: () => {
            setBoolSetting({ db, key: "categorySuggestions", value: !showSuggestions });
        },
        totals,
    };
}
