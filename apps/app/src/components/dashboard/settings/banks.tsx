import BankIcon from "@hugeicons/core-free-icons/BankIcon";
import Invoice01Icon from "@hugeicons/core-free-icons/Invoice01Icon";
import LockIcon from "@hugeicons/core-free-icons/LockIcon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { isPerson } from "@outlayr/money/account-kind";
import { isoDay } from "@outlayr/money/ledger-zone";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Combobox } from "panelui-web/combobox";
import { Dialog } from "panelui-web/dialog";
import { Menu } from "panelui-web/menu";
import { Select } from "panelui-web/select";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { timeOfDay } from "@/components/dashboard/home/format";
import { useEntryDay } from "@/components/dashboard/import/file-parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { SiteLink } from "@/components/site-link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogContent } from "@/components/ui/dialog-content";
import { MenuContent } from "@/components/ui/menu-content";
import { bankOverviewQuery, bankSearchQuery } from "@/lib/account-state";
import { convexClient } from "@/lib/convex";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { byInstitution, linkBank, needsSignIn } from "@/lib/linked-banks";
import type { BankInstitution, BankLinkOutcome, InstitutionGroup, LinkedBankAccount } from "@/lib/linked-banks";
import { STRIPE_READY } from "@/lib/stripe-link";

import { Row, SettingsCard } from "./parts";

const POPUP = "app-shell ph-no-capture z-60";
const NOOP = () => undefined;
const DIALOG_SIZE = { failed: "sm", link: "md", result: "lg" } as const;
const SAMPLE_GROUP = {
    accounts: [
        {
            filesInto: null,
            id: "sample",
            institution: "Bank",
            kind: "cash",
            last4: "0000",
            linkedAt: 0,
            name: "Checking",
            provider: "stripe",
            pulledAt: null,
            status: "active",
        },
    ],
    institution: "Bank",
    linkedAt: 0,
} as const;

type Shown = Omit<LinkedBankAccount, "id"> & { readonly id: string };
type Failure = "canceled" | "expired" | "failed" | "retired";
interface LinkRequest {
    query: string;
    repair: LinkedBankAccount["id"] | null;
}
type Step =
    | { kind: "failed"; bank: string; failure: Failure; request: LinkRequest; institution: BankInstitution }
    | { kind: "link"; request: LinkRequest }
    | { kind: "result"; added: ReadonlySet<string>; bank: string };

function Last4({ last4 }: { last4: string | null }) {
    return last4 === null ? null : <span className="text-muted-foreground font-mono font-normal"> ••{last4}</span>;
}

function usePulledAt() {
    const { ledger } = useDashboard();
    const day = useEntryDay();
    const { clockTime } = useDisplayFormat();
    return {
        day,
        when: (at: number) => {
            const offset = ledger.offsetAt(at);
            return isoDay(at, offset) === ledger.today ? clockTime(timeOfDay(at, offset)) : day(at);
        },
    };
}

function useFilingTargets(filesInto: string | null) {
    const { ledger } = useDashboard();
    const open = openAccounts(ledger.books).filter((row) => !isPerson(row));
    const kept = ledger.books.accounts.find((row) => row.localId === filesInto && row.deletedAt === null);
    const rows = kept === undefined || open.includes(kept) ? open : [kept, ...open];
    return rows.map((row) => ({ label: row.name, value: row.localId }));
}

function FilesInto({ account, onFile }: { account: Shown; onFile: (accountId: string) => void }) {
    const copy = useIntlayer("dashboard-banks");
    const targets = useFilingTargets(account.filesInto);
    const current = targets.find((target) => target.value === account.filesInto) ?? null;
    if (account.status === "disconnected") {
        return <span>{current?.label}</span>;
    }
    return (
        <Select
            items={targets}
            onValueChange={(next) => {
                if (next !== null && next !== current?.value) {
                    onFile(next);
                }
            }}
            value={current?.value ?? null}
        >
            <Select.Trigger
                aria-label={copy.filesInto.value}
                className={current ? "-ml-2 max-w-full" : "text-app-warn -ml-2 max-w-full"}
                size="sm"
                variant="ghost"
            >
                <Select.Value placeholder={copy.chooseAccount.value} />
            </Select.Trigger>
            <Select.Content className={POPUP}>
                {targets.map((target) => (
                    <Select.Item key={target.value} value={target.value}>
                        {target.label}
                    </Select.Item>
                ))}
            </Select.Content>
        </Select>
    );
}

function BankGroup({
    group,
    onFile,
    onSignIn,
    onUnlink,
}: {
    group: { readonly accounts: readonly Shown[]; readonly institution: string; readonly linkedAt: number };
    onFile: (account: Shown, accountId: string) => void;
    onSignIn: (() => void) | null;
    onUnlink: (account: Shown) => void;
}) {
    const copy = useIntlayer("dashboard-banks");
    const { day, when } = usePulledAt();
    const status = {
        active: { label: copy.statuses.active, variant: "success" },
        disconnected: { label: copy.statuses.disconnected, variant: "secondary" },
        relink: { label: copy.statuses.relink, variant: "warning" },
    } as const;
    return (
        <>
            <Table.Row className="bg-app-fill/40 hover:bg-app-fill/40">
                <Table.Cell colSpan={6}>
                    <span className="flex min-h-7 items-center gap-2.5">
                        <span className="bg-app-fill text-muted-foreground rounded-app-sm grid size-6.5 shrink-0 place-items-center">
                            <HugeiconsIcon icon={BankIcon} size={15} />
                        </span>
                        <span className="ph-no-capture truncate font-medium">{group.institution}</span>
                        <span className="text-muted-foreground text-app-label shrink-0">
                            {copy.linkedOn({ date: day(group.linkedAt) })}
                        </span>
                        {onSignIn ? (
                            <Button className="ml-auto" onClick={onSignIn} size="sm" variant="outline">
                                <HugeiconsIcon icon={RefreshIcon} size={15} />
                                {copy.signInAgain}
                            </Button>
                        ) : null}
                    </span>
                </Table.Cell>
            </Table.Row>
            {group.accounts.map((account) => {
                const gone = account.status === "disconnected";
                const title = account.last4 === null ? account.name : `${account.name} ••${account.last4}`;
                return (
                    <Table.Row className={gone ? "text-muted-foreground" : undefined} key={account.id}>
                        <Table.Cell className="ph-no-capture pl-13 font-medium max-sm:pl-4">
                            {account.name}
                            <Last4 last4={account.last4} />
                        </Table.Cell>
                        <Table.Cell className="max-sm:hidden">{copy.kinds[account.kind]}</Table.Cell>
                        <Table.Cell className="ph-no-capture max-w-56">
                            <FilesInto account={account} onFile={(accountId) => onFile(account, accountId)} />
                        </Table.Cell>
                        <Table.Cell>
                            <Badge variant={status[account.status].variant}>{status[account.status].label}</Badge>
                        </Table.Cell>
                        <Table.Cell className="font-mono max-sm:hidden">
                            {account.pulledAt === null ? copy.notPulled : when(account.pulledAt)}
                        </Table.Cell>
                        <Table.Cell className="w-10 text-right">
                            <Menu>
                                <Menu.Trigger
                                    aria-label={copy.more({ name: title }).value}
                                    render={
                                        <Button
                                            className="text-muted-foreground -mr-1"
                                            size="icon-sm"
                                            variant="ghost"
                                        />
                                    }
                                >
                                    <HugeiconsIcon icon={MoreVerticalIcon} size={17} />
                                </Menu.Trigger>
                                <MenuContent align="end" className="w-60" sideOffset={4}>
                                    <Menu.Item onClick={() => onUnlink(account)} variant="destructive">
                                        <HugeiconsIcon icon={Unlink01Icon} size={16} />
                                        {copy.unlink}
                                    </Menu.Item>
                                </MenuContent>
                            </Menu>
                        </Table.Cell>
                    </Table.Row>
                );
            })}
        </>
    );
}

function BankTable({ children }: { children: ReactNode }) {
    const copy = useIntlayer("dashboard-banks");
    return (
        <Table aria-label={copy.banks.value} framed maxHeight="none">
            <Table.Header className="in-data-[sticky]:bg-card">
                <Table.Row>
                    <Table.Head>{copy.account}</Table.Head>
                    <Table.Head className="w-28 max-sm:hidden">{copy.kind}</Table.Head>
                    <Table.Head className="w-52">{copy.filesInto}</Table.Head>
                    <Table.Head className="w-36">{copy.status}</Table.Head>
                    <Table.Head className="w-32 max-sm:hidden">{copy.lastPulled}</Table.Head>
                    <Table.Head />
                </Table.Row>
            </Table.Header>
            <Table.Body>{children}</Table.Body>
        </Table>
    );
}

function useCatchAllLabel() {
    const { catchAll } = useIntlayer("dashboard-banks");
    return (institution: BankInstitution) => {
        if (!institution.catchAll) {
            return { description: undefined, label: institution.name };
        }
        if (institution.country === "US") {
            return { description: catchAll.USDetail.value, label: catchAll.US.value };
        }
        if (institution.country === "CA") {
            return { description: catchAll.CADetail.value, label: catchAll.CA.value };
        }
        return { description: undefined, label: institution.name };
    };
}

function Assurance({ icon, text }: { icon: IconSvgElement; text: ReactNode }) {
    return (
        <li className="flex items-start gap-3">
            <HugeiconsIcon className="text-muted-foreground mt-0.5 shrink-0" icon={icon} size={18} />
            <span>{text}</span>
        </li>
    );
}

function LinkBody({
    onCancel,
    onContinue,
    request,
}: {
    onCancel: () => void;
    onContinue: (institution: BankInstitution) => void;
    request: LinkRequest;
}) {
    const copy = useIntlayer("dashboard-banks");
    const labelOf = useCatchAllLabel();
    const [query, setQuery] = useState(request.query);
    const [picked, setPicked] = useState<BankInstitution | null>(null);
    // The privacy policy sends only the phone's region with a bank search, so the web sends none.
    const found = useQuery({ ...bankSearchQuery(query.trim(), null), placeholderData: keepPreviousData });
    const rows = found.data ?? [];
    const noMatch = found.data !== undefined && query.trim() !== "" && !rows.some((row) => !row.catchAll);
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{copy.link}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <Combobox
                        emptyMessage={found.isError ? copy.searchFailed.value : copy.noMatch({ query }).value}
                        filter={false}
                        inputValue={query}
                        loading={found.data === undefined && !found.isError}
                        loadingMessage={copy.searching.value}
                        onInputValueChange={(next) => {
                            setQuery(next);
                            setPicked((current) => (current && labelOf(current).label === next ? current : null));
                        }}
                        onValueChange={(id) => setPicked(rows.find((row) => row.id === id) ?? null)}
                        placeholder={copy.search.value}
                        presentation="inline"
                        value={picked?.id}
                    >
                        {rows.map((row) => {
                            const { description, label } = labelOf(row);
                            return (
                                <Combobox.Item
                                    description={description}
                                    key={row.id}
                                    label={label}
                                    start={
                                        row.logo ? (
                                            <img alt="" className="rounded-app-sm size-6.5" src={row.logo} />
                                        ) : (
                                            <span className="bg-app-fill text-muted-foreground rounded-app-sm grid size-6.5 place-items-center">
                                                <HugeiconsIcon icon={BankIcon} size={15} />
                                            </span>
                                        )
                                    }
                                    value={row.id}
                                />
                            );
                        })}
                    </Combobox>
                    {noMatch ? <p className="text-muted-foreground text-app-label">{copy.noMatch({ query })}</p> : null}
                </div>
                <ul className="text-app-body flex flex-col gap-3">
                    <Assurance icon={LockIcon} text={copy.consentLogin} />
                    <Assurance icon={BankIcon} text={copy.consentKeep} />
                    <Assurance icon={Invoice01Icon} text={copy.consentEntries} />
                </ul>
                <SiteLink className="text-foreground w-fit underline underline-offset-2" target="_blank" to="/privacy">
                    {copy.privacyPolicy}
                </SiteLink>
            </Dialog.Body>
            <Dialog.Footer>
                <Button className="flex-1" onClick={onCancel} variant="secondary">
                    {copy.cancel}
                </Button>
                <Button className="flex-1" disabled={picked === null} onClick={() => picked && onContinue(picked)}>
                    {copy.continue}
                </Button>
            </Dialog.Footer>
        </>
    );
}

function ResultBody({
    accounts,
    bank,
    expected,
    onFile,
}: {
    accounts: readonly Shown[];
    bank: string;
    expected: number;
    onFile: FileHandler;
}) {
    const copy = useIntlayer("dashboard-banks");
    const arriving = accounts.length < expected;
    const shown = arriving ? SAMPLE_GROUP.accounts : accounts;
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{copy.resultTitle({ bank })}</Dialog.Title>
                <Dialog.Description>{copy.resultBody}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body className="flex flex-col gap-3">
                <Skeleton loading={arriving}>
                    <ul>
                        {shown.map((account) => (
                            <li
                                className="border-app-rule flex items-center gap-3 border-t py-2.5 first:border-t-0"
                                key={account.id}
                            >
                                <span className="min-w-0 flex-1">
                                    <b className="ph-no-capture block truncate font-medium">
                                        {account.name}
                                        <Last4 last4={account.last4} />
                                    </b>
                                    <span className="text-muted-foreground text-app-label">
                                        {copy.kinds[account.kind]}
                                    </span>
                                </span>
                                <span className="ph-no-capture w-56 shrink-0">
                                    <FilesInto account={account} onFile={(accountId) => onFile(account, accountId)} />
                                </span>
                            </li>
                        ))}
                    </ul>
                </Skeleton>
            </Dialog.Body>
            <Dialog.Footer>
                <Dialog.Close render={<Button />}>{copy.done}</Dialog.Close>
            </Dialog.Footer>
        </>
    );
}

function FailedBody({ failure, bank, onRetry }: { bank: string; failure: Failure; onRetry: () => void }) {
    const copy = useIntlayer("dashboard-banks");
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{copy.failedTitle({ bank })}</Dialog.Title>
                <Dialog.Description>{copy.failures[failure]}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
                <Dialog.Close render={<Button variant="secondary" />}>{copy.notNow}</Dialog.Close>
                <Button onClick={onRetry}>{copy.tryAgain}</Button>
            </Dialog.Footer>
        </>
    );
}

type FileHandler = (account: Shown, accountId: string) => void;

function useBankLink(accounts: readonly LinkedBankAccount[]) {
    const copy = useIntlayer("dashboard-banks");
    const toast = useToast();
    const labelOf = useCatchAllLabel();
    const [step, setStep] = useState<Step | null>(null);
    const [busy, setBusy] = useState(false);

    const settle = (outcome: BankLinkOutcome, institution: BankInstitution, request: LinkRequest) => {
        const bank =
            accounts.find((account) => account.id === request.repair)?.institution ?? labelOf(institution).label;
        const fail = (failure: Failure) => setStep({ bank, failure, institution, kind: "failed", request });
        switch (outcome.kind) {
            case "linked": {
                const stillExpired = request.repair !== null && !outcome.repaired;
                if (outcome.added.length > 0) {
                    setStep({ added: new Set(outcome.added), bank, kind: "result" });
                    if (stillExpired) {
                        toast.add({ title: copy.stillExpired({ bank }).value, type: "warning" });
                    }
                } else if (stillExpired) {
                    fail("expired");
                } else {
                    toast.add({ title: copy.signedInAgain({ bank }).value });
                }
                return;
            }
            case "canceled":
            case "failed":
            case "retired": {
                fail(outcome.kind);
                return;
            }
            default: {
                fail("failed");
            }
        }
    };

    const run = async (institution: BankInstitution, request: LinkRequest) => {
        // Stripe draws its own modal, which the dialog's focus trap would hold keyboard focus away from.
        setStep(null);
        setBusy(true);
        const outcome = await linkBank(institution.id, request.repair);
        setBusy(false);
        settle(outcome, institution, request);
    };

    return {
        busy,
        open: (request: LinkRequest) => setStep({ kind: "link", request }),
        run,
        setStep,
        step,
    };
}

export function Banks() {
    const copy = useIntlayer("dashboard-banks");
    const toast = useToast();
    const { data, isError } = useQuery(bankOverviewQuery);
    const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
    const [unlinking, setUnlinking] = useState<Shown | null>(null);
    const [unlinkOpen, setUnlinkOpen] = useState(false);
    const accounts = (data?.accounts ?? []).filter(({ id }) => !gone.has(id));
    const link = useBankLink(accounts);

    if (!STRIPE_READY || isError || data?.access === "unavailable") {
        return null;
    }
    const canLink = data?.access === "allowed";
    const groups: readonly InstitutionGroup[] = byInstitution(accounts);
    const real = (shown: Shown) => accounts.find((account) => account.id === shown.id);

    const file: FileHandler = async (shown, accountId) => {
        const account = real(shown);
        if (!account) {
            return;
        }
        try {
            const saved = await convexClient().mutation(api.banking.setFilesInto, { accountId, id: account.id });
            if (!saved) {
                toast.add({ title: copy.filingFailed.value, type: "destructive" });
            }
        } catch {
            toast.add({ title: copy.filingFailed.value, type: "destructive" });
        }
    };

    const unlink = async (shown: Shown) => {
        const account = real(shown);
        setUnlinkOpen(false);
        if (!account) {
            return;
        }
        const { name } = account;
        setGone((current) => new Set(current).add(account.id));
        const restore = () =>
            setGone((current) => {
                const next = new Set(current);
                next.delete(account.id);
                return next;
            });
        const unlinked = await convexClient()
            .action(api.banking.unlink, { id: account.id })
            .catch(() => false);
        if (unlinked) {
            toast.add({ title: copy.unlinked({ account: name }).value });
            return;
        }
        restore();
        toast.add({ title: copy.unlinkFailed({ account: name }).value, type: "destructive" });
    };

    const linkButton = (variant: "default" | "outline") =>
        canLink ? (
            <Button
                disabled={link.busy}
                onClick={() => link.open({ query: "", repair: null })}
                size="sm"
                variant={variant}
            >
                {variant === "outline" ? <HugeiconsIcon icon={BankIcon} size={15} /> : null}
                {link.busy ? copy.linking : copy.link}
            </Button>
        ) : null;

    const { step } = link;
    const fresh = step?.kind === "result" ? accounts.filter((account) => step.added.has(account.id)) : [];

    return (
        <>
            <Skeleton loading={data === undefined}>
                <SettingsCard
                    action={accounts.length > 0 || data === undefined ? linkButton("outline") : null}
                    footer={
                        accounts.length > 0 ? (
                            <span className="flex w-full flex-wrap items-center justify-between gap-2">
                                <span className="text-muted-foreground">{copy.footer}</span>
                                <SiteLink
                                    className="text-foreground underline underline-offset-2"
                                    target="_blank"
                                    to="/privacy"
                                >
                                    {copy.privacy}
                                </SiteLink>
                            </span>
                        ) : null
                    }
                    title={copy.banks}
                >
                    {data !== undefined && accounts.length === 0 ? (
                        <Row
                            hint={copy.emptyBody}
                            label={copy.emptyTitle}
                            leading={
                                <span className="bg-app-fill text-muted-foreground rounded-app-sm grid size-8 shrink-0 place-items-center">
                                    <HugeiconsIcon icon={BankIcon} size={16} />
                                </span>
                            }
                        >
                            {linkButton("default")}
                        </Row>
                    ) : (
                        <BankTable>
                            {data === undefined ? (
                                <BankGroup group={SAMPLE_GROUP} onFile={NOOP} onSignIn={null} onUnlink={NOOP} />
                            ) : (
                                groups.map((group) => {
                                    const expired = needsSignIn(group);
                                    return (
                                        <BankGroup
                                            group={group}
                                            key={group.institution}
                                            onFile={file}
                                            onSignIn={
                                                expired && canLink && !link.busy
                                                    ? () => link.open({ query: group.institution, repair: expired.id })
                                                    : null
                                            }
                                            onUnlink={(account) => {
                                                setUnlinking(account);
                                                setUnlinkOpen(true);
                                            }}
                                        />
                                    );
                                })
                            )}
                        </BankTable>
                    )}
                </SettingsCard>
            </Skeleton>
            <Dialog onOpenChange={(next) => next || link.setStep(null)} open={step !== null}>
                <DialogContent size={DIALOG_SIZE[step?.kind ?? "link"]}>
                    {step?.kind === "link" ? (
                        <LinkBody
                            onCancel={() => link.setStep(null)}
                            onContinue={(institution) => link.run(institution, step.request)}
                            request={step.request}
                        />
                    ) : null}
                    {step?.kind === "result" ? (
                        <ResultBody accounts={fresh} bank={step.bank} expected={step.added.size} onFile={file} />
                    ) : null}
                    {step?.kind === "failed" ? (
                        <FailedBody
                            bank={step.bank}
                            failure={step.failure}
                            onRetry={() =>
                                step.failure === "retired"
                                    ? link.open(step.request)
                                    : link.run(step.institution, step.request)
                            }
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                action={copy.unlinkAction}
                body={copy.unlinkBody}
                cancel={copy.cancel}
                onAction={() => {
                    if (unlinking) {
                        void unlink(unlinking);
                    }
                }}
                onOpenChange={(next) => next || setUnlinkOpen(false)}
                open={unlinkOpen}
                title={copy.unlinkTitle({ account: unlinking?.name ?? "" })}
                tone="destructive"
            />
        </>
    );
}
