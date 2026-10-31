import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsList, BudgetCard, InsightsCard, UpcomingList } from "@/components/app-ui/app-ui";
import { CONTAINER } from "@/lib/layout";

import { HEADING, LABEL } from "./problem";

function Card({
    body,
    children,
    className,
    title,
}: {
    body: ReactNode;
    children: ReactNode;
    className: string;
    title: ReactNode;
}) {
    return (
        <article
            className={`bg-surface relative flex flex-col gap-8 overflow-hidden rounded-3xl p-6 md:p-8 ${className}`}
            data-reveal
        >
            <div className="max-w-md">
                <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
                <p className="text-muted mt-3 text-base">{body}</p>
            </div>
            {children}
        </article>
    );
}

export function Features() {
    const { features } = useIntlayer("story");
    const { tour } = useIntlayer("home");
    const [budgets, insights, accounts, subscriptions] = tour;
    return (
        <section className={`${CONTAINER} scroll-mt-24 py-24`} id="features">
            <p className={LABEL} data-reveal>
                {features.label}
            </p>
            <h2 className={`${HEADING} mt-4 max-w-[680px] delay-100`} data-reveal>
                {features.title}
            </h2>
            <div className="mt-16 grid gap-4 lg:grid-cols-12">
                <Card body={budgets?.body} className="lg:col-span-7" title={budgets?.title}>
                    <div className="overflow-hidden rounded-2xl">
                        <BudgetCard />
                    </div>
                </Card>
                <Card body={subscriptions?.body} className="delay-100 lg:col-span-5" title={subscriptions?.title}>
                    <div className="relative min-h-80 flex-1 overflow-hidden rounded-2xl">
                        <div className="absolute inset-0">
                            <UpcomingList />
                        </div>
                    </div>
                </Card>
                <Card body={accounts?.body} className="lg:col-span-5" title={accounts?.title}>
                    <div className="flex-1 overflow-hidden rounded-2xl">
                        <AccountsList />
                    </div>
                </Card>
                <Card body={insights?.body} className="delay-100 lg:col-span-7" title={insights?.title}>
                    <div className="mt-auto overflow-hidden rounded-2xl">
                        <InsightsCard />
                    </div>
                </Card>
            </div>
        </section>
    );
}
