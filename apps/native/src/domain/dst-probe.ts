import { text } from "node:stream/consumers";

import { startOfDay } from "@outlayr/money/calendar";
import { utcDateString } from "@outlayr/money/dates";
import { buildRateTable } from "@outlayr/money/valuation";

import { accountBalanceSeries } from "./account-balance-series";
import { buildBurndown } from "./budget-burndown";
import { budgetPace, daysLeftInWindow, hoursLeftInDay } from "./budget-math";
import { nextClockTick } from "./clock";
import { formatDayHeader } from "./dates";
import { cumulativeByDay, periodProgress } from "./insights-answers";
import { generateSchedule } from "./installments";
import { daysBetween, localDayKey } from "./local-day";
import { loggedDays } from "./month-days";
import { goalProgress } from "./savings-goal";
import { reminderFireAt } from "./subscription-reminder";

const [kind = "", ...rest] = process.argv.slice(2);
const parts = rest.map(Number);

const localDate = (offset: number): Date =>
    new Date(
        parts[offset] ?? 0,
        parts[offset + 1] ?? 0,
        parts[offset + 2] ?? 1,
        parts[offset + 3] ?? 0,
        parts[offset + 4] ?? 0
    );

const wallTime = (d: Date) => [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];

async function answer(): Promise<string> {
    switch (kind) {
        case "header": {
            return formatDayHeader(localDate(0), localDate(5), "en");
        }
        case "days": {
            return String(daysLeftInWindow({ end: localDate(0), start: localDate(5) }, localDate(10)));
        }
        case "hours": {
            return String(hoursLeftInDay({ end: localDate(0), start: localDate(5) }, localDate(10)));
        }
        case "pace": {
            return String(budgetPace({ end: localDate(0), start: localDate(5) }, localDate(10)).remaining);
        }
        case "days-between": {
            return String(daysBetween(localDate(0).getTime(), localDate(5).getTime()));
        }
        case "goal-elapsed": {
            const span = { startAmount: 0, startDate: localDate(0), targetDate: localDate(5) };
            return String(goalProgress(0, 100, { ...span, now: localDate(10) }).standing?.elapsed);
        }
        case "burndown": {
            const rows = [
                { amount: 10, categoryId: null, date: localDate(0), parentId: null },
                { amount: 20, categoryId: null, date: localDate(15), parentId: null },
            ];
            const window = { end: localDate(5), start: localDate(0) };
            return JSON.stringify(
                buildBurndown(rows, { limit: 100, now: localDate(10), window }).points.map((p) => p.spent)
            );
        }
        case "burndown-grid": {
            const DAY_MS = 86_400_000;
            const window = { end: localDate(5), start: localDate(0) };
            const now = localDate(10);
            const dayOffset = (date: Date) =>
                Math.round((startOfDay(date).getTime() - startOfDay(window.start).getTime()) / DAY_MS);
            const rows = [];
            for (let day = -10; day < 45; day += 1) {
                for (const hour of [0, 1, 2, 3, 12, 23]) {
                    const date = new Date(
                        window.start.getFullYear(),
                        window.start.getMonth(),
                        window.start.getDate() + day,
                        hour,
                        59,
                        59,
                        999
                    );
                    rows.push({ amount: day + 11, categoryId: null, date, parentId: null });
                }
            }
            const totalDays = Math.max(1, dayOffset(window.end));
            const elapsed = Math.min(totalDays, Math.max(1, dayOffset(now) + 1));
            const perDay = Array.from({ length: elapsed }, () => 0);
            const rowsInside = rows.filter((row) => {
                const index = dayOffset(row.date);
                return index >= 0 && index < elapsed;
            });
            for (const row of rowsInside) {
                perDay[dayOffset(row.date)] += row.amount;
            }
            let sum = 0;
            const options = { limit: 1_000_000, now, window };
            const result = buildBurndown(rows, options);
            return JSON.stringify({
                actual: { projected: result.projectedBalance, spent: result.points.map((p) => p.spent) },
                expected: {
                    projected: buildBurndown(rowsInside, options).projectedBalance,
                    spent: perDay.map((amount) => (sum += amount)),
                },
            });
        }
        case "answers-pace": {
            const window = { end: localDate(5), start: localDate(0) };
            const now = localDate(10);
            const rows = [0, 1, 2, 3, 12, 23].flatMap((hour) =>
                [0, 1, 2, 29, 30].map((day) => ({
                    amount: 1,
                    categoryId: null,
                    date: new Date(window.start.getFullYear(), window.start.getMonth(), day + 1, hour, 30),
                    parentId: null,
                }))
            );
            const progress = periodProgress(window, now, false);
            return JSON.stringify({
                cumulative: cumulativeByDay(rows, progress),
                days: progress.days,
                elapsed: progress.elapsed,
            });
        }
        case "balance-series": {
            const entry = localDate(5).getTime();
            const cell = {
                amount: 30,
                amountUsd: 30,
                count: 1,
                currencyCode: "USD",
                dateKey: utcDateString(entry),
                income: false,
                plotDay: localDayKey(entry),
                unconvertedAmount: 0,
                unconvertedCount: 0,
            };
            const account = { currency: "USD", initialBalance: 0, initialBalanceDate: localDate(5) };
            const series = accountBalanceSeries(account, [cell], buildRateTable([]), localDate(0));
            return JSON.stringify({ last: series.at(-1), length: series.length });
        }
        case "clock": {
            const dateArgs: [number, number, number, number][] = JSON.parse(await text(process.stdin));
            const ticks = dateArgs.map(([year, month, day, hour]) => {
                const nowMs = new Date(year, month, day, hour).getTime();
                const tick = nextClockTick(nowMs);
                return { arrival: wallTime(new Date(nowMs + tick)), offset: new Date(nowMs).getTimezoneOffset(), tick };
            });
            return JSON.stringify(ticks);
        }
        case "reminder": {
            const [[ly, lm, ld], [ey, em, ed]]: [[number, number, number], [number, number, number]] = JSON.parse(
                rest[0] ?? "[]"
            );
            const landing = new Date(ly, lm, ld);
            const earlier = new Date(ey, em, ed);
            const fire = reminderFireAt(landing, 7, { hour: 9, minute: 0 });
            return JSON.stringify({
                earlierOffset: earlier.getTimezoneOffset(),
                fire: [
                    fire.getFullYear(),
                    fire.getMonth() + 1,
                    fire.getDate(),
                    fire.getHours(),
                    fire.getMinutes(),
                    fire.getSeconds(),
                ],
                landingOffset: landing.getTimezoneOffset(),
            });
        }
        case "logged-days": {
            const { at, month }: { at: [number, number, number, number, number][]; month: [number, number] } =
                JSON.parse(rest[0] ?? "{}");
            const days = loggedDays(
                new Date(month[0], month[1], 15),
                at.map(([year, monthIndex, day, hour, minute]) =>
                    new Date(year, monthIndex, day, hour, minute).getTime()
                )
            );
            return JSON.stringify({
                daysInMonth: days.length,
                logged: days.flatMap((flag, index) => (flag ? [index + 1] : [])),
            });
        }
        case "installments": {
            const every = parts[5] ?? 0;
            const schedule = generateSchedule({
                amount: { each: 10 },
                count: 3,
                currency: "USD",
                interval: { every, kind: every === 14 ? "days" : "months" },
                purchaseDay: localDate(0),
            });
            return JSON.stringify(
                schedule.map(({ dueDate }) => [
                    dueDate.getFullYear(),
                    dueDate.getMonth(),
                    dueDate.getDate(),
                    dueDate.getHours(),
                ])
            );
        }
        default: {
            throw new Error(`unknown probe: ${kind}`);
        }
    }
}

void answer().then((out) => process.stdout.write(out));
