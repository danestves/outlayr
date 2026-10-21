import { useRouter } from "expo-router";
import { useMemo } from "react";

import { IdentityFlyUpSheetHost } from "@/components/identity-fly-up";
import { CATEGORY_TABS, IdentityPickerHost } from "@/components/identity-picker-content";
import { useIdentityDraft } from "@/contexts/identity-draft-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoriesByNamespace } from "@/data/categories";
import { CATEGORY_PALETTE } from "@/data/categories-core";
import { useColors } from "@/theme/use-colors";

export function CategorySymbol({
    editId,
    income,
    isSubcategory,
}: {
    editId: string | null;
    income: boolean;
    isSubcategory: boolean;
}) {
    const db = useDatabase();
    const { draft, setDraft } = useIdentityDraft();
    const router = useRouter();
    const colors = useColors();

    const expenseTree = useCategoriesByNamespace(db, false);
    const usedColors = useMemo(() => {
        const set = new Set<string>();
        for (const node of expenseTree) {
            for (const category of [node, ...node.children]) {
                if (category.id === editId) {
                    continue;
                }
                if (category.color) {
                    set.add(category.color);
                }
            }
        }
        return [...set];
    }, [expenseTree, editId]);

    const tint = income ? colors.income : (draft.color ?? CATEGORY_PALETTE[0]);

    return (
        <IdentityFlyUpSheetHost>
            <IdentityPickerHost
                onChange={setDraft}
                onDone={() => router.back()}
                // Income categories take green and subcategories their parent's colour, so neither offers the rail.
                showsColorRail={!(income || isSubcategory)}
                tabs={CATEGORY_TABS}
                tint={tint}
                usedColors={usedColors}
                value={draft}
            />
        </IdentityFlyUpSheetHost>
    );
}
