import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import Infinity01Icon from "@hugeicons/core-free-icons/Infinity01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { FREE_CAPTURES, PRO_CAPTURES } from "@outlayr/money/capture-allowance";
import { TRIAL_REMINDER_LEAD_MS, TRIAL_REMINDERS_FROM_MS } from "@outlayr/money/contract";
import type { ProPlan } from "@outlayr/money/pro-prices";
import { SUPPORT_EMAIL } from "@outlayr/shared/urls";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLoaderData, useRouteContext, useSearch } from "@tanstack/react-router";
import { Alert } from "panelui-web/alert";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Card } from "panelui-web/card";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { SettingsCard } from "@/components/dashboard/settings/parts";
import { signOut } from "@/components/dashboard/shell/account-menu";
import { LogoMark } from "@/components/logo-mark";
import { SiteLink } from "@/components/site-link";
import { authClient } from "@/lib/auth-client";
import { CHECKOUT_CONFIRMED, HELD_STATES, startCheckout } from "@/lib/billing";
import { convexClient } from "@/lib/convex";
import { paywallPrices } from "@/lib/paywall-prices";
import { currentToken } from "@/lib/session";

const TRIAL_DAYS = 7;
const DAY_MS = 86_400_000;
const REMINDER_DAY = TRIAL_DAYS - TRIAL_REMINDER_LEAD_MS / DAY_MS;
const remindsBeforeCharge = (now: number) => now + REMINDER_DAY * DAY_MS >= TRIAL_REMINDERS_FROM_MS;
const PLANS = ["annual", "monthly", "lifetime"] as const;
const TABLE = [
    { free: "30", key: "autoLog", pro: "infinity" },
    { free: String(FREE_CAPTURES), key: "captures", pro: String(PRO_CAPTURES) },
    { free: "3", key: "accounts", pro: "infinity" },
    { free: "2", key: "installmentApps", pro: "infinity" },
    { free: "2", key: "payoffPlans", pro: "infinity" },
    { free: "2", key: "budgets", pro: "infinity" },
    { free: "2", key: "currencies", pro: "infinity" },
    { free: null, key: "sync", pro: "check" },
    { free: null, key: "receipts", pro: "check" },
    { free: null, key: "aiMatching", pro: "check" },
    { free: null, key: "notion", pro: "check" },
    { free: null, key: "merchantLookup", pro: "check" },
] as const;
const COMES_BACK = [
    ["ledger", "ledgerHint"],
    ["sync", "syncHint"],
    ["logs", "logsHint"],
    ["currencies", "currenciesHint"],
    ["installments", "installmentsHint"],
] as const;
const ART = {
    locked: { dark: "/paywall-locked.svg", height: 304, light: "/paywall-locked-light.svg" },
    radar: { dark: "/paywall-terrain.svg", height: 352, light: "/paywall-terrain-light.svg" },
} as const;
const ART_WIDTH = 438;

type BillingPlan = NonNullable<ReturnType<typeof usePlan>["data"]>;

const usePlan = () =>
    useQuery({
        queryFn: () => convexClient().action(api.billing.plan, {}),
        queryKey: ["billing", "plan"],
        retry: false,
    });

const useDate = () => {
    const { locale } = useLocale();
    return (ms: number) => new Date(ms).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
};

function Page({ actions, children }: { actions: ReactNode; children: ReactNode }) {
    return (
        <div className="app-shell bg-background text-foreground flex min-h-dvh flex-col">
            <header className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-6 max-sm:px-4">
                <span className="mr-auto flex items-center gap-[9px] text-[15px] font-semibold">
                    <LogoMark className="text-app-tint size-6" />
                    Outlayr
                </span>
                {actions}
            </header>
            {children}
        </div>
    );
}

function Email() {
    const { data: session } = authClient.useSession();
    return <span className="text-muted-foreground ph-no-capture truncate text-[13px]">{session?.user.email}</span>;
}

function AccountActions() {
    const copy = useIntlayer("paywall");
    return (
        <>
            <Email />
            <Button onClick={signOut} variant="outline">
                {copy.signOut}
            </Button>
        </>
    );
}

function GuestActions() {
    const copy = useIntlayer("paywall");
    return (
        <Button render={<SiteLink to="/" />} variant="outline">
            {copy.notNow}
        </Button>
    );
}

function Compare() {
    const copy = useIntlayer("paywall");
    return (
        <SettingsCard title={copy.changes}>
            <Table framed>
                <Table.Header>
                    <Table.Row>
                        <Table.Head aria-hidden="true" />
                        <Table.Head align="end" className="w-[88px]">
                            {copy.free}
                        </Table.Head>
                        <Table.Head align="end" className="w-[88px]">
                            {copy.pro}
                        </Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {TABLE.map(({ free, key, pro }) => (
                        <Table.Row key={key}>
                            <Table.Cell>{copy.rows[key]}</Table.Cell>
                            <Table.Cell align="end" className="text-muted-foreground font-mono tabular-nums">
                                {free ?? (
                                    <HugeiconsIcon
                                        aria-label={copy.off.value}
                                        className="ml-auto"
                                        icon={Cancel01Icon}
                                        size={16}
                                        strokeWidth={2}
                                    />
                                )}
                            </Table.Cell>
                            <Table.Cell align="end" className="text-app-tint font-mono tabular-nums">
                                {pro === "500" ? (
                                    pro
                                ) : (
                                    <HugeiconsIcon
                                        className="ml-auto"
                                        icon={pro === "infinity" ? Infinity01Icon : Tick02Icon}
                                        size={16}
                                        strokeWidth={2}
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

function ComesBack() {
    const copy = useIntlayer("paywall");
    return (
        <SettingsCard title={copy.comesBack}>
            {COMES_BACK.map(([title, hint]) => (
                <Frame.Row className="px-4 py-3" key={title}>
                    <Frame.Content>
                        <Frame.Title className="text-sm font-medium">{copy.back[title]}</Frame.Title>
                        <Frame.Description className="text-[13px]">{copy.back[hint]}</Frame.Description>
                    </Frame.Content>
                </Frame.Row>
            ))}
        </SettingsCard>
    );
}

// PanelUI's Timeline is a media track editor, not a dated list of what happens next.
function Timeline({ rows }: { rows: readonly (readonly [ReactNode, ReactNode])[] }) {
    return (
        <ol className="border-border mt-5 border-t text-[13px]">
            {rows.map(([when, what], index) => (
                <li className="border-border flex h-10 items-center gap-2.5 border-b" key={index}>
                    <span className={`size-2 shrink-0 rounded-full ${index === 0 ? "bg-primary" : "bg-app-strong"}`} />
                    {when}
                    <span className="text-muted-foreground ml-auto text-right">{what}</span>
                </li>
            ))}
        </ol>
    );
}

function Notice({ icon = "warning", text }: { icon?: "time" | "warning"; text: ReactNode }) {
    return (
        <Alert variant="plain">
            <Alert.Icon className="text-muted-foreground">
                <HugeiconsIcon icon={icon === "time" ? Clock01Icon : AlertCircleIcon} size={16} strokeWidth={2} />
            </Alert.Icon>
            <Alert.Description className="text-foreground text-[13px]">{text}</Alert.Description>
        </Alert>
    );
}

function Links({ onRestore, restoring = false }: { onRestore?: () => void; restoring?: boolean }) {
    const copy = useIntlayer("paywall");
    return (
        <div className="text-muted-foreground mt-4 flex justify-center gap-4 text-xs">
            {onRestore ? (
                <button
                    className={`hover:text-foreground disabled:cursor-default ${restoring ? "text-foreground" : ""}`}
                    disabled={restoring}
                    onClick={onRestore}
                    type="button"
                >
                    {restoring ? copy.restoring : copy.restore}
                </button>
            ) : null}
            <SiteLink className="hover:text-foreground" to="/terms">
                {copy.terms}
            </SiteLink>
            <SiteLink className="hover:text-foreground" to="/privacy">
                {copy.privacy}
            </SiteLink>
        </div>
    );
}

function Panel({ art, children }: { art?: keyof typeof ART; children: ReactNode }) {
    const image = art ? ART[art] : null;
    return (
        <Card className="relative isolate flex min-h-[480px] flex-col overflow-hidden rounded-3xl px-5 pt-[21px] pb-[22px]">
            {image ? (
                <>
                    <img
                        alt=""
                        className="pointer-events-none absolute top-0 left-0 -z-10 w-full dark:hidden"
                        height={image.height}
                        src={image.light}
                        width={ART_WIDTH}
                    />
                    <img
                        alt=""
                        className="pointer-events-none absolute top-0 left-0 -z-10 hidden w-full dark:block"
                        height={image.height}
                        src={image.dark}
                        width={ART_WIDTH}
                    />
                </>
            ) : null}
            {children}
        </Card>
    );
}

function Price({ amount, sub, unit }: { amount: ReactNode; sub: ReactNode; unit: ReactNode }) {
    return (
        <>
            <p className="text-[32px] leading-10 font-semibold tracking-[-0.02em] tabular-nums">
                {amount}
                <small className="text-muted-foreground ml-1.5 text-sm font-normal tracking-normal">{unit}</small>
            </p>
            <p className="text-muted-foreground mt-[7px] text-[13px]">{sub}</p>
        </>
    );
}

function Offer({
    busy,
    needsAccount,
    notice,
    onBuy,
    onRestore,
    restoring,
    trial,
}: {
    busy: boolean;
    needsAccount: boolean;
    notice: ReactNode;
    onBuy: (plan: ProPlan) => void;
    onRestore: () => void;
    restoring: boolean;
    trial: boolean;
}) {
    const copy = useIntlayer("paywall");
    const { locale } = useLocale();
    const country = useLoaderData({ from: "__root__" });
    const [plan, setPlan] = useState<ProPlan>("annual");
    const prices = paywallPrices(country, locale);
    const [renewal] = useState(() => {
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        return next.toLocaleDateString(locale, { day: "numeric", month: "short" });
    });
    const [reminds] = useState(() => remindsBeforeCharge(Date.now()));
    const ctaLabel = (() => {
        if (busy) {
            return copy.unlocking;
        }
        if (plan === "monthly") {
            return copy.getMonthly({ price: prices.monthly });
        }
        if (plan === "lifetime") {
            return copy.getLifetime({ price: prices.lifetime });
        }
        return trial ? copy.startTrial : copy.continueWithYearly;
    })();
    const note = (() => {
        if (plan === "monthly") {
            return copy.cancelAnytime;
        }
        if (plan === "annual") {
            return trial ? copy.thenPerYear({ price: prices.annual }) : copy.chargedToday;
        }
        return null;
    })();
    return (
        <Panel>
            <Tabs className="mb-5" onValueChange={(next: ProPlan) => setPlan(next)} value={plan}>
                <Tabs.List aria-label={copy.plans.label.value} className="w-full">
                    {PLANS.map((option) => (
                        <Tabs.Trigger className="flex-1" key={option} value={option}>
                            {copy.plans[option]}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>
            </Tabs>
            <div className="mb-[9px] flex h-[22px] gap-1.5">
                {plan === "annual" ? (
                    <>
                        {trial ? <Badge variant="success">{copy.bestValue}</Badge> : null}
                        <Badge variant="success">{copy.save({ percent: prices.saving })}</Badge>
                    </>
                ) : null}
            </div>
            {plan === "annual" ? (
                <>
                    <Price
                        amount={prices.annual}
                        sub={
                            <span className="font-mono">
                                {prices.annualPerMonth} {copy.perMo}
                            </span>
                        }
                        unit={copy.perYear}
                    />
                    {trial ? (
                        <Timeline
                            rows={[
                                [copy.today, copy.proUnlocks],
                                ...(reminds ? [[copy.dayN({ day: REMINDER_DAY }), copy.weRemindYou] as const] : []),
                                [copy.dayN({ day: TRIAL_DAYS }), copy.firstCharge],
                            ]}
                        />
                    ) : null}
                </>
            ) : null}
            {plan === "monthly" ? (
                <>
                    <Price
                        amount={prices.monthly}
                        sub={
                            <span className="font-mono">
                                {prices.monthlyPerYear} {copy.perYear}
                            </span>
                        }
                        unit={copy.perMo}
                    />
                    <Timeline
                        rows={[
                            [copy.today, copy.unlocksAndCharges],
                            [renewal, copy.renewsFor({ price: prices.monthly })],
                            [copy.anytime, copy.cancelNoCharges],
                        ]}
                    />
                </>
            ) : null}
            {plan === "lifetime" ? (
                <>
                    <Price amount={prices.lifetime} sub={copy.lifetimeNote} unit={copy.once} />
                    <Timeline
                        rows={[
                            [copy.today, copy.unlocksOneCharge],
                            [copy.everyDevice, copy.sameLedger],
                            [copy.afterThat, copy.noMoreCharges],
                        ]}
                    />
                </>
            ) : null}
            {needsAccount ? (
                <>
                    <p className="text-muted-foreground mt-auto mb-3 pt-5 text-[13px]">{copy.needsAccount}</p>
                    <Button className="w-full" render={<a aria-label={copy.signIn.value} href="/login" />}>
                        {copy.signIn}
                    </Button>
                    <Links />
                </>
            ) : (
                <>
                    <div className="mt-auto flex flex-col gap-3 pt-5">
                        {notice}
                        <Button className="w-full" disabled={busy || restoring} onClick={() => onBuy(plan)}>
                            {ctaLabel}
                        </Button>
                    </div>
                    {notice ? null : (
                        <>
                            {note ? (
                                <p className="text-muted-foreground mt-2.5 text-center text-[13px]">{note}</p>
                            ) : null}
                            <p className="text-muted-foreground mt-1 text-center text-xs">{copy.checkoutBy}</p>
                        </>
                    )}
                    <Links onRestore={onRestore} restoring={restoring} />
                </>
            )}
        </Panel>
    );
}

function Loading({ onRestore, restoring }: { onRestore: () => void; restoring: boolean }) {
    const copy = useIntlayer("paywall");
    return (
        <Panel>
            <div aria-hidden="true" className="bg-app-fill mb-5 h-[38px] rounded-[10px]" />
            <div aria-hidden="true" className="bg-app-fill mb-3 h-[30px] w-[150px] rounded-md" />
            <output className="text-muted-foreground block text-[13px]">{copy.loadingPlans}</output>
            <Button className="mt-auto w-full" disabled>
                {copy.startTrial}
            </Button>
            <Links onRestore={onRestore} restoring={restoring} />
        </Panel>
    );
}

function Stuck({
    art,
    icon,
    onRestore,
    onRetry,
    restoring,
    retrying,
    text,
}: {
    art?: keyof typeof ART;
    icon?: "time" | "warning";
    onRestore: () => void;
    onRetry: () => void;
    restoring: boolean;
    retrying: boolean;
    text: ReactNode;
}) {
    const copy = useIntlayer("paywall");
    return (
        <Panel art={art}>
            <div className="mt-auto flex flex-col gap-3">
                <Notice icon={icon} text={text} />
                <Button disabled={retrying || restoring} onClick={onRetry}>
                    {copy.tryAgain}
                </Button>
            </div>
            <Links onRestore={onRestore} restoring={restoring} />
        </Panel>
    );
}

function formatPrice(price: NonNullable<BillingPlan["price"]>, locale: string) {
    return new Intl.NumberFormat(locale, { currency: price.currency, style: "currency" }).format(price.amount);
}

function AlreadyPro({ plan, unconfirmedAtStart }: { plan: BillingPlan; unconfirmedAtStart: boolean }) {
    const copy = useIntlayer("paywall");
    const { locale } = useLocale();
    const format = useDate();
    const refresh = useMutation({
        mutationFn: () => convexClient().action(api.billing.restore, {}),
        onSuccess: (answer) => {
            if (answer === "restored") {
                window.location.assign("/?restore=confirmed");
            }
        },
    });
    const manage = useMutation({
        mutationFn: () => convexClient().action(api.billing.openPortal, {}),
        onSuccess: (url) => {
            if (url) {
                window.location.assign(url);
            }
        },
    });
    const unconfirmed =
        refresh.isError || (refresh.isSuccess && refresh.data !== "restored") || (unconfirmedAtStart && refresh.isIdle);
    const units = { annual: copy.perYear, lifetime: copy.once, monthly: copy.perMo };
    const rows = [
        plan.plan ? ([copy.plans.label, copy.plans[plan.plan]] as const) : null,
        ...(unconfirmed
            ? ([
                  [copy.syncRow, copy.off],
                  [copy.aiRow, copy.off],
              ] as const)
            : []),
        !unconfirmed && plan.price
            ? ([
                  copy.price,
                  <span className="font-mono" key="price">
                      {formatPrice(plan.price, locale)} {plan.plan ? units[plan.plan] : null}
                  </span>,
              ] as const)
            : null,
        !unconfirmed && plan.expiresAtMs !== null && plan.state === "renews"
            ? ([
                  copy.renews,
                  <span className="font-mono" key="renews">
                      {format(plan.expiresAtMs)}
                  </span>,
              ] as const)
            : null,
    ].filter((row) => row !== null);
    return (
        <Page actions={<Email />}>
            <main className="flex flex-1 items-center justify-center px-6 py-10 max-sm:px-4">
                <div className="w-full max-w-[560px]">
                    <SettingsCard
                        action={
                            <Badge dot variant={unconfirmed ? "warning" : "success"}>
                                {unconfirmed ? copy.notConfirmedBadge : copy.active}
                            </Badge>
                        }
                        footer={
                            <div className="flex w-full justify-end gap-2">
                                {plan.store === "stripe" ? (
                                    <Button
                                        disabled={manage.isPending}
                                        onClick={() => manage.mutate()}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {copy.managePlan}
                                    </Button>
                                ) : null}
                                <Button disabled={refresh.isPending} onClick={() => refresh.mutate()} size="sm">
                                    {unconfirmed ? copy.checkAgain : copy.openDashboard}
                                </Button>
                            </div>
                        }
                        title={copy.proName}
                    >
                        {rows.map(([label, value]) => (
                            <Frame.Row className="h-11 px-4 text-[13px]" key={label.value}>
                                <Frame.Content className="text-muted-foreground">{label}</Frame.Content>
                                <Frame.Actions>{value}</Frame.Actions>
                            </Frame.Row>
                        ))}
                        {unconfirmed ? (
                            <Alert tone="warning" variant="banner">
                                <Alert.Icon>
                                    <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={2} />
                                </Alert.Icon>
                                <Alert.Description className="text-[13px]">
                                    {copy.alreadyNotConfirmed}
                                </Alert.Description>
                            </Alert>
                        ) : null}
                    </SettingsCard>
                </div>
            </main>
        </Page>
    );
}

function Layout({
    actions,
    left,
    right,
    sub,
    title,
}: {
    actions: ReactNode;
    left: ReactNode;
    right: ReactNode;
    sub: ReactNode;
    title: ReactNode;
}) {
    return (
        <Page actions={actions}>
            <main className="mx-auto flex w-full max-w-[1248px] flex-1 flex-col justify-center gap-[23px] px-6 py-10 max-sm:px-4 max-sm:py-6">
                <div>
                    <h1 className="mb-1 text-[28px] leading-9 font-semibold tracking-[-0.02em] max-sm:text-2xl">
                        {title}
                    </h1>
                    <p className="text-muted-foreground text-sm">{sub}</p>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_440px] gap-4 max-lg:grid-cols-1">
                    <div className="max-lg:order-2">{left}</div>
                    {right}
                </div>
            </main>
        </Page>
    );
}

export function Paywall() {
    const copy = useIntlayer("paywall");
    const format = useDate();
    const { session } = useRouteContext({ from: "/_account/_app" });
    const { checkout, restore: restored } = useSearch({ from: "/_account/_app" });
    const plan = usePlan();
    const confirming = checkout !== undefined && checkout !== CHECKOUT_CONFIRMED;
    const confirm = useQuery({
        enabled: confirming,
        queryFn: async () => {
            const answer = await convexClient().action(api.billing.confirmCheckout, { sessionId: checkout ?? "" });
            if (answer === "unlocked") {
                window.location.replace(`/?checkout=${CHECKOUT_CONFIRMED}`);
            }
            return answer;
        },
        queryKey: ["billing", "confirm", checkout],
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
    });
    const restore = useMutation({
        mutationFn: () => convexClient().action(api.billing.restore, {}),
        onSuccess: (answer) => {
            if (answer === "restored") {
                window.location.assign("/?restore=confirmed");
            }
        },
    });
    const buy = useMutation({
        mutationFn: async (chosen: ProPlan) => {
            const answer = await startCheckout(chosen, await currentToken(session));
            if (answer.kind === "redirect") {
                window.location.assign(answer.url);
            }
            if (answer.kind === "alreadyPro") {
                window.location.assign("/");
            }
            return answer;
        },
    });
    const restoring = restore.isPending || restore.data === "restored";
    const onRestore = () => restore.mutate();
    const needsAccount = buy.data?.kind === "signedOut";
    const restoreMessage = (() => {
        if (restore.data === "nothing") {
            return copy.nothingRestored;
        }
        if (restore.isError || restore.data === "failed") {
            return copy.restoreFailed;
        }
        return null;
    })();

    const ended = plan.data?.state === "ended" ? plan.data : null;
    const frame = (right: ReactNode) => (
        <Layout
            actions={needsAccount ? <GuestActions /> : <AccountActions />}
            left={ended ? <ComesBack /> : <Compare />}
            right={right}
            sub={ended ? copy.endedSub : copy.subhead}
            title={ended?.expiresAtMs ? copy.endedOn({ date: format(ended.expiresAtMs) }) : copy.headline}
        />
    );

    if (checkout === CHECKOUT_CONFIRMED) {
        return frame(
            <Panel art="locked">
                <div className="mt-auto flex flex-col gap-3">
                    <Notice text={restoreMessage ?? copy.didNotUnlock} />
                    <Button disabled={restoring} onClick={onRestore}>
                        {restoring ? copy.restoring : copy.restore}
                    </Button>
                </div>
                <Button
                    className="mt-2 h-10"
                    render={<a aria-label={copy.writeToSupport.value} href={`mailto:${SUPPORT_EMAIL}`} />}
                    variant="outline"
                >
                    {copy.writeToSupport}
                </Button>
                <Links />
            </Panel>
        );
    }
    if (confirming && (confirm.isError || confirm.data === "unconfirmed")) {
        return frame(
            <Stuck
                art="radar"
                icon={restoreMessage ? "warning" : "time"}
                onRestore={onRestore}
                onRetry={() => confirm.refetch()}
                restoring={restoring}
                retrying={confirm.isFetching}
                text={restoreMessage ?? copy.notConfirmed}
            />
        );
    }
    if (plan.isPending) {
        return frame(<Loading onRestore={onRestore} restoring={restoring} />);
    }
    if (plan.isError || plan.data === null) {
        return frame(
            <Stuck
                onRestore={onRestore}
                onRetry={() => plan.refetch()}
                restoring={restoring}
                retrying={plan.isFetching}
                text={restoreMessage ?? copy.plansUnavailable}
            />
        );
    }
    if (HELD_STATES.has(plan.data.state) && !confirming) {
        return <AlreadyPro plan={plan.data} unconfirmedAtStart={restored !== undefined} />;
    }
    if (restored !== undefined) {
        return frame(
            <Stuck
                art="radar"
                icon={restoreMessage ? "warning" : "time"}
                onRestore={onRestore}
                onRetry={() => window.location.reload()}
                restoring={restoring}
                retrying={false}
                text={restoreMessage ?? copy.restoreNotConfirmed}
            />
        );
    }
    const unlocking = confirming && (confirm.isPending || confirm.data === "unlocked");
    const message = (() => {
        if (confirm.data === "unpaid") {
            return copy.purchaseFailed;
        }
        if (restoreMessage) {
            return restoreMessage;
        }
        if (buy.isError || buy.data?.kind === "unavailable") {
            return copy.plansUnavailable;
        }
        return null;
    })();
    return frame(
        <Offer
            busy={unlocking || buy.isPending || buy.data?.kind === "redirect"}
            needsAccount={needsAccount}
            notice={message ? <Notice text={message} /> : null}
            onBuy={buy.mutate}
            onRestore={onRestore}
            restoring={restoring}
            trial={plan.data.trialAvailable}
        />
    );
}
