/** A recurrence back-fill fires a change event per row, which would spend the day's WidgetKit reload allowance. */
export const PUBLISH_DEBOUNCE_MS = 750;

/**
 * Every pass rewrites a whole domain, so it trails the tiles by design. Only an accelerator: a change event is not
 * owed for every write (see the truncate-optimization note in `use-system-sync.ts`).
 */
export const SPOTLIGHT_DEBOUNCE_MS = 20_000;

/** `appMeta` reaches both surfaces via `subscribeToSettingChanges`, so sync bookkeeping there does not re-arm them. */
const WIDGET_TABLES = new Set(["transactions", "budgets", "mainBudget", "categories"]);

/** No `mainBudget`: the index never lists the overall-budget singleton, so it would rewrite identical items. */
const SPOTLIGHT_TABLES = new Set(["transactions", "budgets", "categories"]);

export function affectsWidgets(tableName: string): boolean {
    return WIDGET_TABLES.has(tableName);
}

export function affectsSpotlight(tableName: string): boolean {
    return SPOTLIGHT_TABLES.has(tableName);
}

export interface Debounced {
    cancel: () => void;
    schedule: () => void;
}

export function debounce(delayMs: number, run: () => void): Debounced {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };
    return {
        cancel,
        schedule: () => {
            cancel();
            timer = setTimeout(() => {
                timer = null;
                run();
            }, delayMs);
        },
    };
}
