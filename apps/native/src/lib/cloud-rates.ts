import { api } from "@outlayr/backend/convex/_generated/api";
import { utcDateString } from "@outlayr/money/dates";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { RateWireRow } from "@/data/rates";
import type { PullRatesFn } from "@/data/rates";

import { cloudRuntime } from "./cloud-runtime";
import { cloudQuery } from "./convex";

/** Rounded to the UTC day so identical args let Convex answer every page and device from its query cache. */
function rateWindowAt(): number {
    return Date.parse(utcDateString(Date.now()));
}

export function ratesPuller(): PullRatesFn {
    return (args) => cloudQuery(api.exchangeRates.pullRates, { ...args, at: rateWindowAt() });
}

const decodeRateWireRows = Schema.decodeUnknownOption(Schema.mutable(Schema.Array(RateWireRow)));

export function watchRecentRates(onRows: (rows: RateWireRow[]) => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    const watch = cloudRuntime.convex.watchQuery(api.exchangeRates.pullRecentRates, { at: rateWindowAt() });
    return watch.onUpdate(() => {
        let rows: ReturnType<typeof decodeRateWireRows> | null = null;
        try {
            rows = decodeRateWireRows(watch.localQueryResult());
        } catch {
            rows = null;
        }
        if (rows !== null && Option.isSome(rows) && rows.value.length > 0) {
            onRows(rows.value);
        }
    });
}
