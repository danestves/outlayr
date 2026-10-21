import { startOfLocalDay } from "./local-day";

export interface GoalLinePoint {
    time: number;
    value: number;
}

const PAD = { bottom: 10, left: 4, right: 4, top: 10 } as const;

export interface GeometryInput {
    actual: readonly GoalLinePoint[];
    height: number;
    nowMs: number;
    required: readonly GoalLinePoint[];
    startTime: number;
    target: number;
    targetTime: number;
    width: number;
}

export function makeGeometry({ actual, height, nowMs, required, startTime, target, targetTime, width }: GeometryInput) {
    // Only `overdue` cuts the deadline on local days, like `standingFor`; the point filter stays on real instants.
    const overdue = startOfLocalDay(nowMs) >= startOfLocalDay(targetTime);
    const span = Math.max(1, targetTime - startTime);
    // Settled points only: a future-dated transaction would stretch the axis to a balance the account does not hold.
    const banked = actual.filter((point) => point.time <= nowMs);
    const values = [target, ...required.map((point) => point.value), ...banked.map((point) => point.value)];
    const rawTop = Math.max(...values);
    const rawBottom = Math.min(...values);
    const range = Math.max(1, rawTop - rawBottom);

    const plotLeft = PAD.left;
    const plotRight = width - PAD.right;
    const plotTop = PAD.top;
    const plotHeight = height - PAD.top - PAD.bottom;

    const x = (time: number) => plotLeft + Math.min(1, Math.max(0, (time - startTime) / span)) * (plotRight - plotLeft);
    const y = (value: number) =>
        plotTop + ((rawTop - Math.min(rawTop, Math.max(rawBottom, value))) / range) * plotHeight;

    const line = (points: readonly GoalLinePoint[]) =>
        points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.time)} ${y(point.value)}`).join(" ");

    const last = banked.at(-1);
    const head = last ? { x: x(last.time), y: y(last.value) } : null;

    // No projection once the target is met (it would run DOWN to it) or the deadline is past (it collapses at an edge).
    const projectable = head !== null && (last?.value ?? 0) < target && !overdue;
    const projection = projectable ? `M ${head.x} ${head.y} L ${x(targetTime)} ${y(target)}` : null;

    return {
        actual: banked.length > 1 ? line(banked) : null,
        axis: `M ${plotLeft} ${y(rawBottom)} L ${plotRight} ${y(rawBottom)}`,
        goal: { x: x(targetTime), y: y(target) },
        head: head && nowMs >= startTime ? head : null,
        projection,
        required: line(required),
    };
}
