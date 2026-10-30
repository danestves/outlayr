import type { ReactNode } from "react";

import type { TransactionSentenceMark } from "../sentence/slots";
import type { StageAction, StageFooter } from "./stage";

export type StageStep =
    | "account"
    | "amount"
    | "category"
    | "currency"
    | "date"
    | "endDate"
    | "fee"
    | "feeCategory"
    | "merchant"
    | "paidVia"
    | "rate"
    | "rateCustom"
    | "rateUsd"
    | "repeat"
    | "when";

// One value: a step and its direction must change in the same commit, or a return slides in as a forward move.
export interface StagePosition {
    forward: boolean;
    step: StageStep;
}

export interface StageStepContent {
    body: ReactNode;
    footer?: StageFooter;
    rightAction?: StageAction;
    title: string;
}

export interface StageNavigation {
    enter: (step: StageStep) => void;
    leave: (step: StageStep) => void;
    step: StageStep;
}

const GUIDED_STEPS = ["amount", "merchant", "category", "account"] as const;

export type GuidedStep = (typeof GUIDED_STEPS)[number];

export type GuidedAnswers = Readonly<Record<GuidedStep, boolean>>;

// The merchant drives enrichment, not validity, so pressing the footer on its step is the skip.
const OPTIONAL_STEPS: ReadonlySet<GuidedStep> = new Set(["merchant"]);

const GUIDED_POSITIONS = new Map<StageStep, number>(GUIDED_STEPS.map((step, index) => [step, index]));

export function backStepOf(step: StageStep): StageStep {
    if (step === "feeCategory") {
        return "fee";
    }
    return step === "rateCustom" ? "rate" : "amount";
}

function guidedIndex(step: StageStep): number {
    return GUIDED_POSITIONS.get(step) ?? -1;
}

export const STEP_SLOTS = {
    account: "account",
    amount: "amount",
    category: "category",
    currency: "amount",
    date: "when",
    endDate: "when",
    fee: "fee",
    feeCategory: "fee",
    merchant: "merchant",
    paidVia: "paidVia",
    rate: "rateSource",
    rateCustom: "rateSource",
    rateUsd: "converted",
    repeat: "when",
    when: "when",
} as const satisfies Record<StageStep, TransactionSentenceMark>;

function nextMissing(answers: GuidedAnswers, after: StageStep): GuidedStep | null {
    return GUIDED_STEPS.slice(guidedIndex(after) + 1).find((step) => !answers[step]) ?? null;
}

export function entryWhole(answers: GuidedAnswers, skipped?: GuidedStep): boolean {
    return GUIDED_STEPS.every((step) => step === skipped || OPTIONAL_STEPS.has(step) || answers[step]);
}

export function advanceFrom(answers: GuidedAnswers, step: StageStep): StageStep {
    return nextMissing(answers, step) ?? "amount";
}

// Walks forward from the step on screen: pressing it on the step it asks for is the skip, so a backward target
// would loop. Out of ladder it submits, so a still-missing fact says so.
export function footerPlan(answers: GuidedAnswers, step: StageStep) {
    const whole = entryWhole(answers);
    return {
        onward: whole ? null : nextMissing(answers, step),
        saves: whole || (step === "account" && entryWhole(answers, "account")),
    };
}
