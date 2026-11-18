import Airplane01Icon from "@hugeicons-pro/core-solid-rounded/Airplane01Icon";
import Bus01Icon from "@hugeicons-pro/core-solid-rounded/Bus01Icon";
import Coffee02Icon from "@hugeicons-pro/core-solid-rounded/Coffee02Icon";
import Dumbbell01Icon from "@hugeicons-pro/core-solid-rounded/Dumbbell01Icon";
import RepeatIcon from "@hugeicons-pro/core-solid-rounded/RepeatIcon";
import Restaurant01Icon from "@hugeicons-pro/core-solid-rounded/Restaurant01Icon";
import ShoppingBag01Icon from "@hugeicons-pro/core-solid-rounded/ShoppingBag01Icon";
import ShoppingCart01Icon from "@hugeicons-pro/core-solid-rounded/ShoppingCart01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { HugeiconsIconProps } from "@hugeicons/react";
import { SUGGESTED_CATEGORY_PRESETS } from "@outlayr/money/category-rules";
import type { CanonicalCategoryName } from "@outlayr/money/contract";

import { categoryTile } from "@/lib/category-tile";

interface Tile {
    category: CanonicalCategoryName<"expense">;
    icon: HugeiconsIconProps["icon"];
    x: number;
    y: number;
    z: number;
    r: number;
    w: number;
    i: number;
    phone?: { x: number; y: number; w: number };
}

const TILES: readonly Tile[] = [
    { category: "Coffee", i: 0, icon: Coffee02Icon, phone: { w: 60, x: 9, y: 67 }, r: -6, w: 76, x: 7, y: 58, z: 3 },
    { category: "Transport", i: 2, icon: Bus01Icon, phone: { w: 48, x: 24, y: 86 }, r: 5, w: 56, x: 19, y: 80, z: 1 },
    { category: "Dining Out", i: 4, icon: Restaurant01Icon, r: -3, w: 62, x: 26, y: 44, z: 2 },
    { category: "Travel", i: 6, icon: Airplane01Icon, r: 4, w: 52, x: 12, y: 30, z: 1 },
    {
        category: "Groceries",
        i: 1,
        icon: ShoppingCart01Icon,
        phone: { w: 62, x: 91, y: 66 },
        r: 6,
        w: 80,
        x: 93,
        y: 56,
        z: 3,
    },
    {
        category: "Fitness",
        i: 3,
        icon: Dumbbell01Icon,
        phone: { w: 48, x: 77, y: 87 },
        r: -5,
        w: 54,
        x: 81,
        y: 82,
        z: 1,
    },
    { category: "Shopping", i: 5, icon: ShoppingBag01Icon, r: 3, w: 64, x: 74, y: 42, z: 2 },
    { category: "Subscriptions", i: 7, icon: RepeatIcon, r: -4, w: 52, x: 88, y: 28, z: 1 },
];

const COLORS = new Map(SUGGESTED_CATEGORY_PRESETS.expense.map(({ color, name }) => [name, color]));

export function CategoryTiles() {
    return (
        <div aria-hidden="true" className="hz-tiles" data-reveal="group">
            {TILES.flatMap((tile) => {
                const color = COLORS.get(tile.category);
                if (!color) {
                    return [];
                }
                const { glyph, wash } = categoryTile(color);
                return (
                    <span
                        className="hz-tile"
                        data-wide={tile.phone ? undefined : ""}
                        key={tile.category}
                        style={{
                            "--i": `${tile.i}`,
                            "--r": `${tile.r}deg`,
                            "--w": `${tile.w}px`,
                            "--wm": tile.phone && `${tile.phone.w}px`,
                            "--x": `${tile.x}%`,
                            "--xm": tile.phone && `${tile.phone.x}%`,
                            "--y": `${tile.y}%`,
                            "--ym": tile.phone && `${tile.phone.y}%`,
                            "--z": `${tile.z}`,
                        }}
                    >
                        <span className="hz-tile-face" style={{ "--glyph": glyph, "--wash": wash }}>
                            <HugeiconsIcon icon={tile.icon} />
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
