// Forged by `react-native-nano-icons` from the `toolbar-symbols` set in `scripts/icon-sets.ts`.
export const TOOLBAR_SYMBOLS = {
    add: "add",
    close: "close",
    delete: "delete",
    done: "done",
    filter: "filter",
    filterActive: "filter-active",
    more: "more",
    period: "period",
    reorder: "reorder",
    search: "search",
    showAll: "show-all",
    showCategory: "show-category",
    showDay: "show-day",
    showMonth: "show-month",
    showRecurring: "show-recurring",
    showTransfers: "show-transfers",
    showType: "show-type",
    showUpcoming: "show-upcoming",
    showWeek: "show-week",
    suggestionsOff: "suggestions-off",
    suggestionsOn: "suggestions-on",
} as const;

export type ToolbarIconName = keyof typeof TOOLBAR_SYMBOLS;

export function toolbarDrawable(name: ToolbarIconName) {
    return { uri: `nano_${TOOLBAR_SYMBOLS[name].replaceAll("-", "_")}` };
}
