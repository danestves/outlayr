import { Skeleton } from "skullet/react";

import { AccountsCard, BudgetsCard, EntryLog, MonthHero, UpcomingCard } from "@/components/ledger/overview";
import type { Overview, PhotoUrls } from "@/components/ledger/overview";
import { SAMPLE_OVERVIEW } from "@/components/ledger/sample";

export function OverviewMain({ overview, photos }: { overview: Overview | undefined; photos: PhotoUrls }) {
    return (
        <div className="px-5 pt-7 md:px-10">
            <Skeleton data={overview} id="ledger-log" label="Loading your ledger" sample={SAMPLE_OVERVIEW}>
                {({ budgets, log, summary }) => (
                    <>
                        <MonthHero budgets={budgets} summary={summary} today={summary.today} />
                        <EntryLog currency={summary.currency} log={log} photos={photos} today={summary.today} />
                    </>
                )}
            </Skeleton>
        </div>
    );
}

export function OverviewPanel({ overview, photos }: { overview: Overview | undefined; photos: PhotoUrls }) {
    return (
        <div className="px-5 pt-7 pb-10 md:px-10 xl:px-7">
            <Skeleton data={overview} id="ledger-rail" sample={SAMPLE_OVERVIEW}>
                {({ balances, budgets, summary, upcoming }) => (
                    <div className="flex flex-col gap-6">
                        <AccountsCard balances={balances} photos={photos} />
                        <BudgetsCard budgets={budgets} />
                        <UpcomingCard currency={summary.currency} photos={photos} upcoming={upcoming} />
                    </div>
                )}
            </Skeleton>
        </div>
    );
}
