import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { CALENDAR_DAY_VECTORS } from "@outlayr/money/calendar-vectors";
import { expect, test } from "vite-plus/test";

const onDeviceIn = (zone: string, cases: { firstDayOfMonth: number | null; instant: string }[]): unknown =>
    JSON.parse(
        execFileSync(
            process.execPath,
            ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), "calendar-days"],
            {
                encoding: "utf-8",
                env: { ...process.env, TZ: zone },
                input: JSON.stringify(cases),
            }
        )
    );

test.each([...new Set(CALENDAR_DAY_VECTORS.map((vector) => vector.zone))])(
    "the device calendar files the shared calendar days in %s",
    (zone) => {
        const vectors = CALENDAR_DAY_VECTORS.filter((vector) => vector.zone === zone);
        expect(
            onDeviceIn(
                zone,
                vectors.map(({ instant, window }) => ({ firstDayOfMonth: window?.firstDayOfMonth ?? null, instant }))
            )
        ).toStrictEqual(vectors.map(({ day, iso, month, window }) => ({ day, iso, month, window: window ?? null })));
    }
);
