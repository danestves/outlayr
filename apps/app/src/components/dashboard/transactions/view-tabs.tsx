import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Edit02Icon from "@hugeicons/core-free-icons/Edit02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Tabs } from "panelui-web/tabs";
import { useIntlayer, useLocale } from "react-intlayer";

import { MenuContent } from "@/components/ui/menu-content";

import { TABS } from "./model";
import type { Tab } from "./model";
import type { SavedView } from "./saved-views";

const VIEW = "view:";

export type ViewAction = "delete" | "duplicate" | "left" | "rename";

interface ViewTabsProps {
    counts: Record<Tab, number>;
    onSave: () => void;
    onTab: (tab: Tab) => void;
    onView: (view: SavedView) => void;
    onViewAction: (view: SavedView, action: ViewAction) => void;
    tab: Tab;
    view: SavedView | null;
    viewCounts: ReadonlyMap<string, number>;
    views: readonly SavedView[];
}

export function useTabNames() {
    const { tabs } = useIntlayer("dashboard-ledger");
    return {
        all: tabs.all.value,
        expenses: tabs.expenses.value,
        income: tabs.income.value,
        review: tabs.review.value,
        transfers: tabs.transfers.value,
        uncategorized: tabs.uncategorized.value,
    } satisfies Record<Tab, string>;
}

export function ViewTabs({ counts, onSave, onTab, onView, onViewAction, tab, view, viewCounts, views }: ViewTabsProps) {
    const { views: copy } = useIntlayer("dashboard-ledger");
    const names = useTabNames();
    const { locale } = useLocale();
    const count = (value: number) => value.toLocaleString(locale);
    return (
        <div className="flex min-w-0 items-end gap-2 border-b px-3">
            <Tabs
                className="min-w-0 flex-1 overflow-x-auto"
                onValueChange={(value: string) => {
                    const picked = views.find((each) => `${VIEW}${each.id}` === value);
                    const builtIn = TABS.find((each) => each === value);
                    if (picked) {
                        onView(picked);
                    } else if (builtIn) {
                        onTab(builtIn);
                    }
                }}
                value={view ? `${VIEW}${view.id}` : tab}
                variant="underline"
            >
                <Tabs.List className="border-b-0">
                    {TABS.map((each) => (
                        <Tabs.Trigger key={each} value={each}>
                            {names[each]}
                            <Tabs.Badge className="font-mono tabular-nums">{count(counts[each])}</Tabs.Badge>
                        </Tabs.Trigger>
                    ))}
                    {views.map((each, index) => (
                        <span className="flex items-center" key={each.id}>
                            <Tabs.Trigger value={`${VIEW}${each.id}`}>
                                {each.name}
                                <Tabs.Badge className="font-mono tabular-nums">
                                    {count(viewCounts.get(each.id) ?? 0)}
                                </Tabs.Badge>
                            </Tabs.Trigger>
                            {view?.id === each.id ? (
                                <Menu>
                                    <Menu.Trigger
                                        aria-label={copy.menu({ name: each.name }).value}
                                        render={<Button className="-ms-1" size="icon-sm" variant="ghost" />}
                                    >
                                        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                                    </Menu.Trigger>
                                    <MenuContent align="start" className="w-60" sideOffset={6}>
                                        <Menu.Item onClick={() => onViewAction(each, "rename")}>
                                            <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                                            {copy.rename}
                                        </Menu.Item>
                                        <Menu.Item onClick={() => onViewAction(each, "duplicate")}>
                                            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                                            {copy.duplicate}
                                        </Menu.Item>
                                        {index > 0 ? (
                                            <Menu.Item onClick={() => onViewAction(each, "left")}>
                                                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                                                {copy.moveLeft}
                                            </Menu.Item>
                                        ) : null}
                                        <Menu.Separator />
                                        <Menu.Item onClick={() => onViewAction(each, "delete")} variant="destructive">
                                            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                                            {copy.delete}
                                        </Menu.Item>
                                    </MenuContent>
                                </Menu>
                            ) : null}
                        </span>
                    ))}
                </Tabs.List>
            </Tabs>
            <Button className="mb-1.5 shrink-0 max-md:hidden" onClick={onSave} size="sm" variant="ghost">
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                {copy.save}
            </Button>
        </div>
    );
}
