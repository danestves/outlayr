import { and, eq, isNull } from "drizzle-orm";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";

import CategoryEditor from "@/components/category-editor";
import { CloseToolbar } from "@/components/close-toolbar";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useDatabase } from "@/contexts/local-data-context";
import { getCategoryById } from "@/data/categories-core";
import type { Category } from "@/data/categories-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { categories } from "@/db/schema";
import type { TranslatableKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";

function categoryKindKey(edited: Category | null): TranslatableKey {
    if (edited == null) {
        return "categories.kind.category";
    }
    if (edited.parentId != null) {
        return "categories.kind.subcategory";
    }
    return edited.income ? "categories.kind.income" : "categories.kind.expense";
}

export function CategoryEditScreen({ id }: { id: string }) {
    const router = useRouter();
    const db = useDatabase();
    const t = useTranslation();
    const colors = useColors();
    const haptics = useHaptics();
    const { requestDelete } = useDeferredDelete("category");

    // Read once on mount, like the editor does: a rename must not retitle the sheet mid-edit.
    const [edited] = useState(() => (id ? getCategoryById(db, id) : null));
    const title = t(categoryKindKey(edited));

    // No confirmation: the write is held for the undo window by a toast mounted at the app root, which outlives this
    // screen. The toast spells out the cascade, so the children are counted first.
    const deleteCategory = async () => {
        if (!id) {
            return;
        }
        const children = await db
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.parentId, id), isNull(categories.deletedAt)));
        haptics("warning");
        requestDelete(id, t(children.length > 0 ? "categories.undo.bodyWithChildren" : "categories.undo.body"));
        router.back();
    };

    return (
        <>
            <Stack.Screen.Title>{title}</Stack.Screen.Title>

            <CloseToolbar placement="left" />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    accessibilityLabel={t("common.delete")}
                    onPress={deleteCategory}
                    tintColor={colors.danger}
                >
                    <Stack.Toolbar.Icon {...toolbarIcon("delete")} />
                </Stack.Toolbar.Button>
            </Stack.Toolbar>

            <CategoryEditor id={id} mode="edit" />
        </>
    );
}
