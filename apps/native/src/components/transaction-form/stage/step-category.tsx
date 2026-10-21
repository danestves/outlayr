import { ScrollView } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import type { Category, CategoryWithChildren } from "@/data/categories-core";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { StageOptionRow } from "./stage-options";
import type { StageOptionItem } from "./stage-options";

// Four rows of 38pt pills with 8pt gaps. Past that the options scroll inside the step, or the docked stage would
// push the sentence off the screen.
const MAX_LIST_HEIGHT = 176;

const TILE = 22;

const CRUMB = " › ";

// No category id can collide: they are uuids.
const CREATE_OPTION = "__create__";

interface FlatCategory {
    category: Category;
    label: string;
}

// A row of pills has no disclosure, so a child states its holder inline: two leaves called "Coffee" would otherwise
// be the same pill twice.
function flattenCategories(categories: readonly CategoryWithChildren[]): FlatCategory[] {
    const flat: FlatCategory[] = [];
    for (const parent of categories) {
        flat.push({ category: parent, label: parent.name ?? "" });
        for (const child of parent.children) {
            flat.push({ category: child, label: `${parent.name ?? ""}${CRUMB}${child.name ?? ""}` });
        }
    }
    return flat;
}

interface StepCategoryProps {
    categories: readonly CategoryWithChildren[];
    onCreate?: () => void;
    onSelect: (category: Category) => void;
    selectedId: string | null;
}

export function StepCategory({ categories, onCreate, onSelect, selectedId }: StepCategoryProps) {
    const t = useTranslation();
    const colors = useColors();
    const largeText = useAccessibilityTextSize();
    const flat = flattenCategories(categories);

    const options: StageOptionItem<string>[] = flat.map(({ category, label }) => ({
        id: category.id,
        label,
        leading: (
            <CategoryIconTile
                color={category.income ? colors.income : (category.color ?? colors.muted)}
                emoji={category.emoji}
                icon={category.icon}
                radius={6}
                size={TILE}
                type="solid"
            />
        ),
    }));
    if (onCreate) {
        options.push({ id: CREATE_OPTION, label: t("categories.addCategory") });
    }

    const pick = (id: string) => {
        if (id === CREATE_OPTION) {
            onCreate?.();
            return;
        }
        const picked = flat.find((entry) => entry.category.id === id);
        if (picked) {
            onSelect(picked.category);
        }
    };

    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!largeText}
            showsVerticalScrollIndicator={false}
            style={largeText ? undefined : { maxHeight: MAX_LIST_HEIGHT }}
            testID="stage-categories"
        >
            <StageOptionRow onSelect={pick} options={options} selectedId={selectedId} />
        </ScrollView>
    );
}
