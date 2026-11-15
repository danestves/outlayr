import { toAccountKind } from "./account-kind";
import { startOfLocalDay } from "./calendar";
import { EVERY_ORDER, EVERY_OPTIONS, newInstallmentDraft, UPFRONT_SHARES } from "./installment-draft";
import type { InstallmentDraft } from "./installment-draft";
import { generateSchedule } from "./installments";
import { installmentAppId } from "./institution-map";

export type InstallmentTerms = Pick<InstallmentDraft, "count" | "every" | "upfront">;

const PAY_IN_4: InstallmentTerms = { count: 3, every: "days14", upfront: { share: 0.25 } };
const PAY_IN_3: InstallmentTerms = { count: 2, every: "monthly", upfront: { share: 1 / 3 } };
const CARD: InstallmentTerms = { count: 3, every: "monthly", upfront: { amount: 0 } };

const APP_TERMS: ReadonlyMap<string, InstallmentTerms> = new Map([
    ["affirm", PAY_IN_4],
    ["afterpay", PAY_IN_4],
    ["alma", PAY_IN_3],
    ["atome", PAY_IN_3],
    ["clearpay", PAY_IN_4],
    ["klarna", PAY_IN_4],
    ["scalapay", PAY_IN_3],
    ["sezzle", PAY_IN_4],
    ["zilch", PAY_IN_4],
    ["zip", PAY_IN_4],
]);

const PERCENT = 100;
// Cents rounding moves a saved ratio off its share ($33.33 of $100), so a near match takes the share itself.
const KNOWN_SHARES = [...UPFRONT_SHARES, 0.25, 1 / 3];
const SHARE_TOLERANCE = 0.005;

function shareOf(ratio: number): number {
    return (
        KNOWN_SHARES.find((share) => Math.abs(ratio - share) < SHARE_TOLERANCE) ?? Math.round(ratio * PERCENT) / PERCENT
    );
}

/** Only what the rows show for sure; a cadence the user edited away from every option is left out. */
export function termsFromPlan(
    rows: readonly { amount: number; dueDate: Date; sequence: number }[]
): Partial<InstallmentTerms> {
    const cuotas = rows.filter((row) => row.sequence > 0).sort((a, b) => a.sequence - b.sequence);
    const [first] = cuotas;
    if (first === undefined) {
        return {};
    }
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const upfront = rows.find((row) => row.sequence === 0)?.amount ?? 0;
    const terms: Partial<InstallmentTerms> = {
        count: cuotas.length,
        upfront: upfront > 0 && total > 0 ? { share: shareOf(upfront / total) } : { amount: 0 },
    };
    const days = cuotas.map((row) => startOfLocalDay(row.dueDate.getTime()));
    // A plan bought on the 31st clamps its first cuota to Feb 28, so the month's anchor is the latest day seen.
    const anchorDay = Math.max(...cuotas.map((row) => row.dueDate.getDate()));
    const monthly = days.every((dayMs, index) => {
        const month = new Date(first.dueDate.getFullYear(), first.dueDate.getMonth() + index, 1);
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        return dayMs === new Date(month.getFullYear(), month.getMonth(), Math.min(anchorDay, lastDay)).getTime();
    });
    const every =
        cuotas.length < 2
            ? undefined
            : EVERY_ORDER.find((option) =>
                  option === "monthly"
                      ? monthly
                      : generateSchedule({
                            amount: { total: cuotas.length },
                            count: cuotas.length,
                            currency: "USD",
                            firstDue: first.dueDate,
                            interval: EVERY_OPTIONS[option],
                            purchaseDay: first.dueDate,
                        }).every((row, index) => row.dueDate.getTime() === days[index])
              );
    return every === undefined ? terms : { ...terms, every };
}

/** Starts from the user's last plan on the account, then what the app sells, then a card's monthly charge. */
export function startingDraft(
    account: { readonly kind: string; readonly name: string },
    lastPlan: readonly { amount: number; dueDate: Date; sequence: number }[],
    upfrontAccountId: string | null
): InstallmentDraft {
    const fresh = newInstallmentDraft(upfrontAccountId);
    const appId = toAccountKind(account.kind) === "liability" ? installmentAppId(account.name) : null;
    const preset = appId === null ? CARD : (APP_TERMS.get(appId) ?? fresh);
    return { ...fresh, count: preset.count, every: preset.every, upfront: preset.upfront, ...termsFromPlan(lastPlan) };
}
