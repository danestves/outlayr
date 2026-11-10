import { convexQuery } from "@convex-dev/react-query";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import DollarCircleIcon from "@hugeicons/core-free-icons/DollarCircleIcon";
import FlashIcon from "@hugeicons/core-free-icons/FlashIcon";
import InfinityCircleIcon from "@hugeicons/core-free-icons/InfinityCircleIcon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { isPerson } from "@outlayr/money/account-kind";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { convexClient } from "@/lib/convex";
import { useLedgerBooks } from "@/lib/ledger-db";

import { Row, SectionHead, SettingsCard } from "./parts";

const FREE = { accounts: 3, budgets: 2, captures: 20, currencies: 1 } as const;
const PRO_CAPTURES = 500;
const STORE_URL = {
    app_store: "https://apps.apple.com/account/subscriptions",
    play_store: "https://play.google.com/store/account/subscriptions",
} as const;
const PLAN_KEY = ["billing", "plan"];

export const usePlan = () =>
    useQuery({
        queryFn: () => convexClient().action(api.billing.plan, {}),
        queryKey: PLAN_KEY,
        retry: false,
    });

type Held = NonNullable<ReturnType<typeof usePlan>["data"]>;

const isManagedStore = (store: string | null): store is keyof typeof STORE_URL =>
    store === "app_store" || store === "play_store";

function Figure({ children }: { children: ReactNode }) {
    return <span className="font-mono text-[13px] tabular-nums">{children}</span>;
}

const TONE = {
    gain: "text-app-income [&>[data-slot=badge-dot]]:text-app-income",
    warn: "text-app-warn [&>[data-slot=badge-dot]]:text-app-warn",
} as const;

function useFormat() {
    const { locale } = useLocale();
    return {
        date: (ms: number) =>
            new Date(ms).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
        money: (amount: number, currency: string) =>
            new Intl.NumberFormat(locale, { currency, style: "currency" }).format(amount),
    };
}

function usePortal() {
    const toast = useToast();
    const { failed } = useIntlayer("plan");
    return useMutation({
        mutationFn: () => convexClient().action(api.billing.openPortal, {}),
        onError: () => toast.add({ title: failed.value, type: "destructive" }),
        onSuccess: (url) => {
            if (url) {
                window.location.assign(url);
            } else {
                toast.add({ title: failed.value, type: "destructive" });
            }
        },
    });
}

function ConfirmCancelBody({ expiresAtMs, onClose }: { expiresAtMs: number; onClose: () => void }) {
    const { confirm, keepPro } = useIntlayer("plan");
    const { date } = useFormat();
    const portal = usePortal();
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{confirm.title}</Dialog.Title>
                <Dialog.Description>{confirm.body({ date: date(expiresAtMs) })}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
                <Table className="text-[13px]" density="compact">
                    <Table.Body>
                        {[
                            [confirm.sync, confirm.off],
                            [confirm.autoLog, "30"],
                            [confirm.budgets, String(FREE.budgets)],
                        ].map(([label, value], index) => (
                            <Table.Row className="h-10" key={index}>
                                <Table.Cell className="text-muted-foreground">{label}</Table.Cell>
                                <Table.Cell align="end">{value}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="outline">
                    {keepPro}
                </Button>
                <Button loading={portal.isPending} onClick={() => portal.mutate()} variant="destructive">
                    {confirm.toStripe}
                </Button>
            </Dialog.Footer>
        </>
    );
}

function ConfirmCancel({
    expiresAtMs,
    onClose,
    open,
}: {
    expiresAtMs: number | null;
    onClose: () => void;
    open: boolean;
}) {
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open && expiresAtMs !== null}>
            <Dialog.Content className="app-shell">
                {expiresAtMs === null ? null : <ConfirmCancelBody expiresAtMs={expiresAtMs} onClose={onClose} />}
            </Dialog.Content>
        </Dialog>
    );
}

function Fact({ children, label }: { children?: ReactNode; label: ReactNode }) {
    return (
        <Frame.Row className="border-border min-h-11 border-t px-4 py-1.5 text-[13px] first:border-t-0">
            <Frame.Content className="text-muted-foreground">{label}</Frame.Content>
            {children ? <Frame.Actions>{children}</Frame.Actions> : null}
        </Frame.Row>
    );
}

function Term({ plan }: { plan: Held }) {
    const copy = useIntlayer("plan");
    const { date, money } = useFormat();
    const portal = usePortal();
    const [confirming, setConfirming] = useState(false);
    const expires = plan.expiresAtMs === null ? null : date(plan.expiresAtMs);
    const stripe = plan.store === "stripe";
    const [lastPayment] = plan.payments;
    const shownPrice = plan.price ? money(plan.price.amount, plan.price.currency) : null;
    const period = plan.plan === "monthly" ? copy.perMonth : copy.perYear;
    const nameRow = plan.plan ? (
        <Fact label={copy.plan}>
            <span className="text-[13px]">{copy.names[plan.plan]}</span>
        </Fact>
    ) : null;
    const priceRow = shownPrice ? (
        <Fact label={copy.price}>
            <Figure>
                {shownPrice} {period}
            </Figure>
        </Fact>
    ) : null;
    const billedBy = stripe ? (
        <Fact label={copy.billedBy}>
            <span className="text-[13px]">{copy.store.stripe}</span>
            <Button loading={portal.isPending} onClick={() => portal.mutate()} size="sm" variant="outline">
                {copy.manageBilling}
            </Button>
        </Fact>
    ) : null;

    if (plan.state === "lifetime") {
        return (
            <SettingsCard
                action={
                    <Badge className={TONE.gain} dot variant="outline">
                        {copy.badge.lifetime}
                    </Badge>
                }
                title={copy.pro}
            >
                {nameRow}
                {lastPayment ? (
                    <>
                        <Fact label={copy.paid}>
                            <Figure>
                                {money(lastPayment.amount, lastPayment.currency)} {copy.once}
                            </Figure>
                        </Fact>
                        <Fact label={copy.bought}>
                            <Figure>{date(lastPayment.atMs)}</Figure>
                        </Fact>
                    </>
                ) : null}
                <Fact label={copy.nextCharge}>
                    <span className="text-[13px]">{copy.none}</span>
                </Fact>
            </SettingsCard>
        );
    }
    if (plan.state === "ends") {
        return (
            <SettingsCard
                action={
                    <Badge className={TONE.warn} dot variant="outline">
                        {copy.badge.ends({ date: expires ?? "" })}
                    </Badge>
                }
                footer={
                    <div className="flex w-full items-center gap-3 max-sm:flex-wrap">
                        <span className="text-muted-foreground mr-auto text-[13px]">{copy.endsFooter}</span>
                        {stripe ? (
                            <Button loading={portal.isPending} onClick={() => portal.mutate()} size="sm">
                                {copy.keepPro}
                            </Button>
                        ) : null}
                    </div>
                }
                title={copy.pro}
            >
                {nameRow}
                {priceRow}
                <Fact label={copy.proUntil}>
                    <Figure>{expires}</Figure>
                </Fact>
                <Fact label={copy.nextCharge}>
                    <span className="text-[13px]">{copy.none}</span>
                </Fact>
            </SettingsCard>
        );
    }
    const trial = plan.state === "trial";
    const footerText = (() => {
        if (trial) {
            return copy.trialFooter;
        }
        return stripe && shownPrice && expires
            ? copy.renewsFooter({ date: expires, price: shownPrice })
            : copy.storeFooter;
    })();
    return (
        <>
            <SettingsCard
                action={
                    <Badge className={trial ? TONE.warn : TONE.gain} dot variant="outline">
                        {trial ? copy.badge.trial({ date: expires ?? "" }) : copy.badge.renews({ date: expires ?? "" })}
                    </Badge>
                }
                footer={
                    <div className="flex w-full items-center gap-3 max-sm:flex-wrap">
                        <span className="text-muted-foreground mr-auto text-[13px]">{footerText}</span>
                        {stripe && plan.expiresAtMs !== null ? (
                            <Button onClick={() => setConfirming(true)} size="sm" variant="outline">
                                {trial ? copy.cancelTrial : copy.cancelSubscription}
                            </Button>
                        ) : null}
                    </div>
                }
                title={copy.pro}
            >
                {trial ? <Row hint={copy.trialBody({ date: expires ?? "" })} label={copy.trialTitle} /> : null}
                {nameRow}
                {trial ? (
                    <Fact label={copy.firstCharge}>
                        <Figure>{expires}</Figure>
                    </Fact>
                ) : null}
                {priceRow}
                {trial ? null : (
                    <Fact label={copy.nextCharge}>
                        <Figure>{expires}</Figure>
                    </Fact>
                )}
                {isManagedStore(plan.store) ? (
                    <Fact label={copy.billedBy}>
                        <span className="text-[13px]">{copy.store[plan.store].name}</span>
                    </Fact>
                ) : null}
                {billedBy}
            </SettingsCard>
            <ConfirmCancel expiresAtMs={plan.expiresAtMs} onClose={() => setConfirming(false)} open={confirming} />
        </>
    );
}

function Usage({ endsSoon }: { endsSoon: boolean }) {
    const { use } = useIntlayer("plan");
    const books = useLedgerBooks();
    const { data: limits } = useQuery(convexQuery(api.limits.mine, {}));
    const accounts = books.accounts.filter((account) => !isPerson(account));
    const captures = limits ? Math.max(0, Math.round(limits.captures.capacity - limits.captures.value)) : null;
    const unlimited = (
        <HugeiconsIcon icon={InfinityCircleIcon} aria-label={use.unlimited.value} className="ml-auto" size={16} />
    );
    const counted = [
        { free: FREE.captures, label: use.captures, pro: PRO_CAPTURES, using: captures },
        { free: FREE.accounts, label: use.accounts, pro: unlimited, using: accounts.length },
        { free: FREE.budgets, label: use.budgets, pro: unlimited, using: books.budgets.length },
        {
            free: FREE.currencies,
            label: use.currencies,
            pro: unlimited,
            using: new Set(accounts.map((account) => account.currency)).size,
        },
    ];
    return (
        <SettingsCard title={endsSoon ? use.onFree : use.title}>
            <Table className="text-[13px]" density="compact" framed>
                <Table.Header>
                    <Table.Row>
                        <Table.Head aria-hidden="true" />
                        <Table.Head align="end" className="w-16">
                            {use.using}
                        </Table.Head>
                        <Table.Head align="end" className="w-28">
                            {endsSoon ? use.limit : use.proLimit}
                        </Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {counted.map(({ free, label, pro, using }, index) => (
                        <Table.Row className="h-10" key={index}>
                            <Table.Cell>{label}</Table.Cell>
                            <Table.Cell align="end" className="font-mono">
                                {using ?? ""}
                            </Table.Cell>
                            <Table.Cell align="end" className="text-muted-foreground font-mono">
                                {endsSoon && using !== null && using > free ? (
                                    <span className="text-app-warn mr-2 font-sans text-xs">{use.over}</span>
                                ) : null}
                                {endsSoon ? free : pro}
                            </Table.Cell>
                        </Table.Row>
                    ))}
                    {[use.sync, use.ai].map((label, index) => (
                        <Table.Row className="h-10" key={index}>
                            <Table.Cell>{label}</Table.Cell>
                            <Table.Cell align="end">{use.on}</Table.Cell>
                            <Table.Cell align="end" className="text-muted-foreground">
                                {endsSoon ? (
                                    use.off
                                ) : (
                                    <HugeiconsIcon
                                        icon={Tick02Icon}
                                        aria-label={use.on.value}
                                        className="ml-auto"
                                        size={16}
                                    />
                                )}
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </SettingsCard>
    );
}

function AlsoGives() {
    const { also } = useIntlayer("plan");
    return (
        <SettingsCard title={also.title}>
            {[
                { hint: also.logsHint, icon: FlashIcon, label: also.logs },
                { hint: also.currenciesHint, icon: DollarCircleIcon, label: also.currencies },
                { hint: also.installmentsHint, icon: CalendarCheckIn01Icon, label: also.installments },
                { hint: also.syncHint, icon: RepeatIcon, label: also.sync },
            ].map(({ hint, icon: Icon, label }, index) => (
                <Row
                    hint={hint}
                    key={index}
                    label={label}
                    leading={
                        <span className="bg-app-fill text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                            <HugeiconsIcon icon={Icon} size={16} />
                        </span>
                    }
                />
            ))}
        </SettingsCard>
    );
}

function StoreManaged({ lifetime, store }: { lifetime: boolean; store: keyof typeof STORE_URL }) {
    const { store: stores } = useIntlayer("plan");
    const copy = stores[store];
    if (lifetime) {
        return (
            <SettingsCard title={copy.lifetime.title}>
                <p className="text-muted-foreground px-4 py-3 text-[13px]">{copy.lifetime.body}</p>
            </SettingsCard>
        );
    }
    return (
        <SettingsCard
            footer={
                <Button
                    className="ml-auto"
                    render={<a aria-label={copy.open.value} href={STORE_URL[store]} rel="noopener" target="_blank" />}
                    size="sm"
                >
                    {copy.open}
                </Button>
            }
            title={copy.title}
        >
            <p className="text-muted-foreground px-4 py-3 text-[13px]">{copy.body}</p>
            {[copy.step1, copy.step2, stores.step3].map((step, index) => (
                <Row
                    key={index}
                    label={step}
                    leading={
                        <span className="bg-app-fill text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs">
                            {index + 1}
                        </span>
                    }
                />
            ))}
        </SettingsCard>
    );
}

function Payments({ plan }: { plan: Held }) {
    const copy = useIntlayer("plan");
    const { date, money } = useFormat();
    const toast = useToast();
    const client = useQueryClient();
    const restore = useMutation({
        mutationFn: () => convexClient().action(api.billing.restore, {}),
        onError: () => toast.add({ title: copy.failed.value, type: "destructive" }),
        onSuccess: async (answer) => {
            if (answer === "failed") {
                toast.add({ title: copy.failed.value, type: "destructive" });
                return;
            }
            toast.add({ title: answer === "restored" ? copy.restored.value : copy.nothingRestored.value });
            await client.invalidateQueries({ queryKey: PLAN_KEY });
        },
    });
    return (
        <SettingsCard
            footer={
                plan.state === "lifetime" ? null : (
                    <div className="flex w-full items-center gap-3">
                        <span className="text-muted-foreground mr-auto text-[13px]">{copy.lostAccess}</span>
                        <Button
                            loading={restore.isPending}
                            onClick={() => restore.mutate()}
                            size="sm"
                            variant="outline"
                        >
                            {copy.restore}
                        </Button>
                    </div>
                )
            }
            title={copy.payments}
        >
            {plan.payments.map((payment) => (
                <Frame.Row className="border-border min-h-11 border-t px-4 py-1.5 first:border-t-0" key={payment.atMs}>
                    <Frame.Content>
                        <Figure>{date(payment.atMs)}</Figure>
                    </Frame.Content>
                    <Frame.Actions>
                        {payment.amount === 0 ? (
                            <span className="text-[13px]">{copy.freeTrial}</span>
                        ) : (
                            <Figure>{money(payment.amount, payment.currency)}</Figure>
                        )}
                    </Frame.Actions>
                </Frame.Row>
            ))}
        </SettingsCard>
    );
}

export function Plan() {
    const copy = useIntlayer("plan");
    const plan = usePlan();
    return (
        <div className="flex flex-col gap-4">
            <SectionHead title={copy.title} />
            {plan.isError || plan.data === null ? (
                <SettingsCard title={copy.pro}>
                    <Row label={copy.couldNotLoad}>
                        <Button loading={plan.isFetching} onClick={() => plan.refetch()} size="sm" variant="outline">
                            {copy.tryAgain}
                        </Button>
                    </Row>
                </SettingsCard>
            ) : null}
            <div className="grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_400px]">
                <div className="flex flex-col gap-4">
                    {plan.data ? <Term plan={plan.data} /> : null}
                    <Usage endsSoon={plan.data?.state === "ends"} />
                </div>
                {plan.data ? (
                    <div className="flex flex-col gap-4">
                        {isManagedStore(plan.data.store) ? (
                            <StoreManaged lifetime={plan.data.state === "lifetime"} store={plan.data.store} />
                        ) : (
                            <>
                                {plan.data.state === "lifetime" ? null : <AlsoGives />}
                                <Payments plan={plan.data} />
                            </>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
