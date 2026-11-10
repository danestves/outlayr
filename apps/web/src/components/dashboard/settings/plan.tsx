import { convexQuery } from "@convex-dev/react-query";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import FlashIcon from "@hugeicons/core-free-icons/FlashIcon";
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon";
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon";
import MoneyExchange01Icon from "@hugeicons/core-free-icons/MoneyExchange01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { Tooltip } from "panelui-web/tooltip";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { convexClient } from "@/lib/convex";
import { useLedgerBooks } from "@/lib/ledger-db";

import { SettingsCard } from "./parts";
import { planUsage } from "./plan-usage";

const FREE = { accounts: 3, budgets: 2, captures: 20, currencies: 1, installmentApps: 2, payoffPlans: 2 } as const;
const FREE_AUTO_LOG = 30;
const DAY_MS = 86_400_000;
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

function useFormat() {
    const { locale } = useLocale();
    return {
        date: (ms: number) =>
            new Date(ms).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
        day: (ms: number) => new Date(ms).toLocaleDateString(locale, { day: "numeric", month: "short" }),
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
            <Dialog.Header className="gap-3 pr-5 pb-6">
                <Dialog.Title>{confirm.title}</Dialog.Title>
                <Dialog.Description className="text-[13px] leading-[19px]">
                    {confirm.body({ date: date(expiresAtMs) })}
                </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body className="px-0 pb-1.5">
                <Table className="text-[13px]" density="compact" framed>
                    <Table.Body>
                        {[
                            [confirm.sync, confirm.off],
                            [confirm.autoLog, <Figure key="autoLog">{FREE_AUTO_LOG}</Figure>],
                            [confirm.budgets, <Figure key="budgets">{FREE.budgets}</Figure>],
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
                    <HugeiconsIcon icon={LinkSquare02Icon} size={16} />
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
        <Frame.Row className="min-h-11 gap-3 px-4 py-3 text-[13px] leading-[19px]">
            <Frame.Content className="text-muted-foreground">{label}</Frame.Content>
            {children ? <Frame.Actions className="gap-2.5">{children}</Frame.Actions> : null}
        </Frame.Row>
    );
}

function Footer({ action, children }: { action?: ReactNode; children: ReactNode }) {
    return (
        <div className="flex w-full items-center gap-3 max-sm:flex-wrap">
            <span className="text-muted-foreground mr-auto text-[13px]">{children}</span>
            {action}
        </div>
    );
}

function daysUntil(ms: number) {
    return Math.max(0, Math.ceil((ms - Date.now()) / DAY_MS));
}

function Term({ plan }: { plan: Held }) {
    const copy = useIntlayer("plan");
    const { date, day, money } = useFormat();
    const portal = usePortal();
    const [confirming, setConfirming] = useState(false);
    const expires = plan.expiresAtMs === null ? null : date(plan.expiresAtMs);
    const stripe = plan.store === "stripe";
    const [lastPayment] = plan.payments;
    const shownPrice = plan.price ? money(plan.price.amount, plan.price.currency) : null;
    const period = plan.plan === "monthly" ? copy.perMonth : copy.perYear;
    const nameRow = plan.plan ? <Fact label={copy.plan}>{copy.names[plan.plan]}</Fact> : null;
    const priceRow = shownPrice ? (
        <Fact label={copy.price}>
            <Figure>
                {shownPrice} {period}
            </Figure>
        </Fact>
    ) : null;
    const noCharge = <Fact label={copy.nextCharge}>{copy.none}</Fact>;

    if (plan.state === "lifetime") {
        return (
            <SettingsCard
                action={
                    <Badge dot variant="success">
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
                {noCharge}
            </SettingsCard>
        );
    }
    if (plan.state === "ends") {
        return (
            <SettingsCard
                action={
                    <Badge dot variant="warning">
                        {copy.badge.ends({ date: expires ?? "" })}
                    </Badge>
                }
                footer={
                    <Footer
                        action={
                            stripe ? (
                                <Button loading={portal.isPending} onClick={() => portal.mutate()} size="sm">
                                    {copy.keepPro}
                                </Button>
                            ) : null
                        }
                    >
                        {copy.endsFooter}
                    </Footer>
                }
                title={copy.pro}
            >
                {nameRow}
                {priceRow}
                <Fact label={copy.proUntil}>
                    <Figure>{expires}</Figure>
                </Fact>
                {noCharge}
            </SettingsCard>
        );
    }
    const trial = plan.state === "trial";
    const store = isManagedStore(plan.store) ? plan.store : null;
    const footerText = (() => {
        if (store) {
            return copy.store[store].footer;
        }
        if (trial) {
            return copy.trialFooter;
        }
        return shownPrice && expires ? copy.renewsFooter({ date: expires, price: shownPrice }) : null;
    })();
    const left = plan.expiresAtMs === null ? 0 : daysUntil(plan.expiresAtMs);
    const trialEnds = (() => {
        if (left === 0) {
            return copy.trialEnds.today;
        }
        return left === 1 ? copy.trialEnds.one : copy.trialEnds.other({ count: left });
    })();
    return (
        <>
            <SettingsCard
                action={
                    <Badge dot variant={trial ? "warning" : "success"}>
                        {trial ? copy.badge.trial({ date: expires ?? "" }) : copy.badge.renews({ date: expires ?? "" })}
                    </Badge>
                }
                footer={
                    footerText ? (
                        <Footer
                            action={
                                stripe && plan.expiresAtMs !== null ? (
                                    <Button onClick={() => setConfirming(true)} size="sm" variant="outline">
                                        {trial ? copy.cancelTrial : copy.cancelSubscription}
                                    </Button>
                                ) : null
                            }
                        >
                            {footerText}
                        </Footer>
                    ) : null
                }
                title={copy.pro}
            >
                {trial && plan.expiresAtMs !== null ? (
                    <div className="px-4 py-3 text-[13px]">
                        <p className="font-medium">{trialEnds}</p>
                        <p className="text-muted-foreground">{copy.trialBody({ date: day(plan.expiresAtMs) })}</p>
                    </div>
                ) : null}
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
                {store ? <Fact label={copy.billedBy}>{copy.store[store].name}</Fact> : null}
                {stripe && !trial ? (
                    <Fact label={copy.billedBy}>
                        {copy.store.stripe}
                        <Button
                            className="text-primary h-auto p-0 text-[13px] font-medium"
                            disabled={portal.isPending}
                            onClick={() => portal.mutate()}
                            variant="link"
                        >
                            {copy.manageBilling}
                        </Button>
                    </Fact>
                ) : null}
            </SettingsCard>
            <ConfirmCancel expiresAtMs={plan.expiresAtMs} onClose={() => setConfirming(false)} open={confirming} />
        </>
    );
}

function Usage({ endsSoon }: { endsSoon: boolean }) {
    const { use } = useIntlayer("plan");
    const counts = planUsage(useLedgerBooks());
    const { data: limits } = useQuery(convexQuery(api.limits.mine, {}));
    const { data: notion } = useQuery(convexQuery(api.notion.connected, {}));
    const captures = limits ? Math.max(0, Math.round(limits.captures.capacity - limits.captures.value)) : null;
    const counted = [
        { free: FREE.captures, label: use.captures, using: captures },
        { free: FREE.accounts, label: use.accounts, using: counts.accounts },
        { free: FREE.budgets, label: use.budgets, using: counts.budgets },
        { free: FREE.installmentApps, label: use.installmentApps, using: counts.installmentApps },
        { free: FREE.payoffPlans, label: use.payoffPlans, using: counts.payoffPlans },
        { free: FREE.currencies, label: use.currencies, using: counts.currencies },
    ];
    const switches = [
        { label: use.sync, on: limits?.pro },
        { label: use.ai, on: limits?.pro },
        { label: use.notion, on: notion },
    ];
    return (
        <SettingsCard title={endsSoon ? use.onFree : use.title}>
            <Table framed>
                <Table.Header>
                    <Table.Row>
                        <Table.Head aria-hidden="true" />
                        <Table.Head align="end" className="w-[120px] max-sm:w-20">
                            {use.using}
                        </Table.Head>
                        <Table.Head align="end" className="w-[120px] max-sm:w-20">
                            {use.limit}
                        </Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    <Table.Row>
                        <Table.Cell>{use.autoLog}</Table.Cell>
                        <Table.Cell align="end">
                            <Tooltip>
                                <Tooltip.Trigger
                                    aria-label={use.autoLogOnPhone.value}
                                    className="text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center rounded-md align-middle"
                                >
                                    <HugeiconsIcon icon={InformationCircleIcon} size={14} />
                                </Tooltip.Trigger>
                                <Tooltip.Content className="max-w-60" variant="outline">
                                    {use.autoLogOnPhone}
                                </Tooltip.Content>
                            </Tooltip>
                        </Table.Cell>
                        <Table.Cell align="end">
                            <span className="text-muted-foreground font-mono text-[13px] tabular-nums">
                                {FREE_AUTO_LOG}
                            </span>
                        </Table.Cell>
                    </Table.Row>
                    {counted.map(({ free, label, using }) => (
                        <Table.Row key={label.value}>
                            <Table.Cell>{label}</Table.Cell>
                            <Table.Cell align="end" className="font-mono tabular-nums">
                                {using ?? ""}
                            </Table.Cell>
                            <Table.Cell align="end">
                                {endsSoon && using !== null && using > free ? (
                                    <Badge className="mr-2" variant="warning">
                                        {use.over}
                                    </Badge>
                                ) : null}
                                <span className="text-muted-foreground font-mono text-[13px] tabular-nums">{free}</span>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                    {switches.map(({ label, on }) => (
                        <Table.Row key={label.value}>
                            <Table.Cell>{label}</Table.Cell>
                            <Table.Cell align="end">{on !== undefined && (on ? use.on : use.off)}</Table.Cell>
                            <Table.Cell align="end" className="text-muted-foreground text-[13px]">
                                {use.off}
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
                { hint: also.currenciesHint, icon: MoneyExchange01Icon, label: also.currencies },
                { hint: also.installmentsHint, icon: CalendarCheckIn01Icon, label: also.installments },
                { hint: also.syncHint, icon: RefreshIcon, label: also.sync },
            ].map(({ hint, icon, label }) => (
                <div className="flex items-center gap-3 px-4 py-3" key={label.value}>
                    <span className="bg-app-fill text-muted-foreground flex size-[30px] shrink-0 items-center justify-center rounded-[9px]">
                        <HugeiconsIcon icon={icon} size={15} />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[13px] leading-[18px] font-medium">{label}</p>
                        <p className="text-muted-foreground text-xs">{hint}</p>
                    </div>
                </div>
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
                >
                    <HugeiconsIcon icon={LinkSquare02Icon} size={16} />
                    {copy.open}
                </Button>
            }
            title={copy.title}
        >
            <p className="text-muted-foreground px-5 py-3 text-[13px]">{copy.body}</p>
            {[copy.step1, copy.step2, stores.step3].map((step, index) => (
                <div className="flex items-center gap-3 px-5 py-3 text-[13px]" key={step.value}>
                    <span className="bg-app-fill text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs">
                        {index + 1}
                    </span>
                    {step}
                </div>
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
    const restorable = plan.state === "renews" || plan.state === "trial";
    return (
        <SettingsCard
            footer={
                restorable ? (
                    <Footer
                        action={
                            <Button
                                loading={restore.isPending}
                                onClick={() => restore.mutate()}
                                size="sm"
                                variant="outline"
                            >
                                {copy.restore}
                            </Button>
                        }
                    >
                        {copy.lostAccess}
                    </Footer>
                ) : null
            }
            title={copy.payments}
        >
            {plan.payments.map((payment) => (
                <Fact key={payment.atMs} label={<span className="font-mono tabular-nums">{date(payment.atMs)}</span>}>
                    {payment.amount === 0 ? copy.freeTrial : <Figure>{money(payment.amount, payment.currency)}</Figure>}
                </Fact>
            ))}
        </SettingsCard>
    );
}

export function Plan() {
    const copy = useIntlayer("plan");
    const { title: settings } = useIntlayer("dashboard-settings");
    const plan = usePlan();
    return (
        <div className="flex flex-col">
            <div className="flex h-16 items-center gap-2 max-lg:h-12">
                <Button
                    aria-label={settings.value}
                    className="text-muted-foreground -ml-2"
                    render={<Link to="/app/settings" />}
                    size="icon-sm"
                    variant="ghost"
                >
                    <HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
                </Button>
                <h1 className="text-lg font-semibold tracking-[-0.02em]">{copy.title}</h1>
            </div>
            {plan.isError || plan.data === null ? (
                <SettingsCard title={copy.pro}>
                    <Fact label={copy.couldNotLoad}>
                        <Button loading={plan.isFetching} onClick={() => plan.refetch()} size="sm" variant="outline">
                            {copy.tryAgain}
                        </Button>
                    </Fact>
                </SettingsCard>
            ) : null}
            {plan.data ? (
                <div className="grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_400px]">
                    <div className="flex flex-col gap-4">
                        <Term plan={plan.data} />
                        <Usage endsSoon={plan.data.state === "ends"} />
                    </div>
                    <div className="flex flex-col gap-4">
                        {isManagedStore(plan.data.store) ? (
                            <StoreManaged lifetime={plan.data.state === "lifetime"} store={plan.data.store} />
                        ) : (
                            <>
                                <AlsoGives />
                                <Payments plan={plan.data} />
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
