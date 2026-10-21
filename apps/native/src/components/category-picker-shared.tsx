import type { Category } from "@/data/categories-core";
import type { CategoryMatch } from "@/domain/category-search";

import { Text } from "./text";

// Its own module because a `.android.tsx` file importing its plain twin would import itself.

export function categoryTint(category: Category, incomeColor: string): string {
    return category.income ? incomeColor : (category.color ?? "#767676");
}

export function HighlightedName({ name, match, tint }: { name: string; match?: CategoryMatch; tint: string }) {
    if (match == null || match.matchLength === 0) {
        return name;
    }
    const end = match.matchStart + match.matchLength;
    return (
        <>
            {name.slice(0, match.matchStart)}
            <Text className="font-sans-bold" style={{ color: tint }}>
                {name.slice(match.matchStart, end)}
            </Text>
            {name.slice(end)}
        </>
    );
}
