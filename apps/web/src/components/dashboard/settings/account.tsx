import { convexQuery } from "@convex-dev/react-query";
import AppleIcon from "@hugeicons/core-free-icons/AppleIcon";
import CheckmarkBadge01Icon from "@hugeicons/core-free-icons/CheckmarkBadge01Icon";
import ComputerIcon from "@hugeicons/core-free-icons/ComputerIcon";
import GoogleIcon from "@hugeicons/core-free-icons/GoogleIcon";
import Logout03Icon from "@hugeicons/core-free-icons/Logout03Icon";
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon";
import SmartPhone01Icon from "@hugeicons/core-free-icons/SmartPhone01Icon";
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Alert } from "panelui-web/alert";
import { AlertDialog } from "panelui-web/alert-dialog";
import { Avatar } from "panelui-web/avatar";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { useId, useState } from "react";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { OverlayPresence, useOverlayOpen } from "@/components/dashboard/overlay-presence";
import { signOut } from "@/components/dashboard/shell/account-menu";
import { convexDeletionSteps, deletionProvider, runDeletion, storedDeletion } from "@/lib/account-deletion";
import { authClient } from "@/lib/auth-client";
import { convexClient } from "@/lib/convex";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { sessionDevice } from "@/lib/session-device";

import { Row, SectionHead, SettingsCard } from "./parts";

const ACCOUNTS_KEY = ["auth", "accounts"];
const SESSIONS_KEY = ["auth", "sessions"];
const LINK_RETURN = "/app/settings/account";
const MIN_PASSWORD = 8;

type AuthResult = Promise<{ error: unknown }>;

async function succeed(call: AuthResult) {
    const { error } = await call;
    if (error) {
        throw new Error("Auth request refused");
    }
}

const useAccounts = () =>
    useQuery({
        queryFn: async () => {
            const { data } = await authClient.listAccounts();
            return data ?? [];
        },
        queryKey: ACCOUNTS_KEY,
    });

const useSessions = () =>
    useQuery({
        queryFn: async () => {
            const { data } = await authClient.listSessions();
            return data ?? [];
        },
        queryKey: SESSIONS_KEY,
    });

function useDateText() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return (value: Date | string | number) =>
        new Intl.DateTimeFormat(date === "en-GB" ? "en-US" : date, {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(new Date(value));
}

function TextField({ label, ...input }: { label: ReactNode } & ComponentProps<typeof Input>) {
    return (
        <Field>
            <Field.Label>{label}</Field.Label>
            <Input className="max-sm:text-base" {...input} />
        </Field>
    );
}

function FormDialog({
    children,
    description,
    onSubmit,
    onClose,
    submit,
    title,
}: {
    children: ReactNode;
    description?: ReactNode;
    onClose: () => void;
    onSubmit: (data: FormData) => Promise<void>;
    submit: ReactNode;
    title: ReactNode;
}) {
    const { account } = useIntlayer("dashboard-settings");
    const formId = useId();
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const shown = useOverlayOpen();
    const handle = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setFailed(false);
        try {
            await onSubmit(new FormData(event.currentTarget));
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Dialog onOpenChange={(open) => open || onClose()} open={shown}>
            <Dialog.Content className="app-shell">
                <Dialog.Header>
                    <Dialog.Title>{title}</Dialog.Title>
                    {description ? <Dialog.Description>{description}</Dialog.Description> : null}
                </Dialog.Header>
                <Dialog.Body>
                    <form className="flex flex-col gap-3" id={formId} onSubmit={handle}>
                        {children}
                        {failed ? (
                            <Alert tone="destructive" variant="plain">
                                <Alert.Description>{account.failed}</Alert.Description>
                            </Alert>
                        ) : null}
                    </form>
                </Dialog.Body>
                <Dialog.Footer>
                    <Dialog.Close render={<Button variant="secondary" />}>{account.cancel}</Dialog.Close>
                    <Button form={formId} loading={busy} type="submit">
                        {submit}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

function NameDialog({ name, onClose }: { name: string; onClose: () => void }) {
    const { account } = useIntlayer("dashboard-settings");
    return (
        <FormDialog
            onClose={onClose}
            onSubmit={async (data) => {
                await succeed(authClient.updateUser({ name: text(data, "name") }));
                onClose();
            }}
            submit={account.save}
            title={account.nameTitle}
        >
            <TextField autoComplete="name" autoFocus defaultValue={name} label={account.name} name="name" required />
        </FormDialog>
    );
}

function EmailDialog({ onClose }: { onClose: () => void }) {
    const { account } = useIntlayer("dashboard-settings");
    const [newEmail, setNewEmail] = useState<string | null>(null);
    if (newEmail === null) {
        return (
            <FormDialog
                onClose={onClose}
                onSubmit={async (data) => {
                    const address = text(data, "email");
                    await succeed(authClient.emailOtp.requestEmailChange({ newEmail: address }));
                    setNewEmail(address);
                }}
                submit={account.sendCode}
                title={account.emailTitle}
            >
                <TextField autoComplete="email" autoFocus label={account.newEmail} name="email" required type="email" />
            </FormDialog>
        );
    }
    return (
        <FormDialog
            description={account.codeSent}
            key={newEmail}
            onClose={onClose}
            onSubmit={async (data) => {
                await succeed(authClient.emailOtp.changeEmail({ newEmail, otp: text(data, "code") }));
                authClient.$store.notify("$sessionSignal");
                onClose();
            }}
            submit={account.confirm}
            title={account.emailTitle}
        >
            <TextField
                autoComplete="one-time-code"
                autoFocus
                inputMode="numeric"
                label={account.code}
                name="code"
                required
            />
        </FormDialog>
    );
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
    const { account } = useIntlayer("dashboard-settings");
    return (
        <FormDialog
            onClose={onClose}
            onSubmit={async (data) => {
                await succeed(
                    authClient.changePassword({
                        currentPassword: String(data.get("current")),
                        newPassword: String(data.get("next")),
                    })
                );
                onClose();
            }}
            submit={account.save}
            title={account.passwordTitle}
        >
            <TextField
                autoComplete="current-password"
                autoFocus
                label={account.currentPassword}
                name="current"
                required
                type="password"
            />
            <TextField
                autoComplete="new-password"
                label={account.newPassword}
                minLength={MIN_PASSWORD}
                name="next"
                required
                type="password"
            />
        </FormDialog>
    );
}

function AddPasswordDialog({ email, onClose }: { email: string; onClose: () => void }) {
    const { account } = useIntlayer("dashboard-settings");
    const [sent, setSent] = useState(false);
    if (!sent) {
        return (
            <FormDialog
                description={account.addPasswordBody}
                onClose={onClose}
                onSubmit={async () => {
                    await succeed(authClient.emailOtp.requestPasswordReset({ email }));
                    setSent(true);
                }}
                submit={account.sendCode}
                title={account.addPasswordTitle}
            >
                <p className="text-sm">{email}</p>
            </FormDialog>
        );
    }
    return (
        <FormDialog
            description={account.addPasswordBody}
            key="code"
            onClose={onClose}
            onSubmit={async (data) => {
                await succeed(
                    authClient.emailOtp.resetPassword({
                        email,
                        otp: text(data, "code"),
                        password: String(data.get("next")),
                    })
                );
                await signOut();
            }}
            submit={account.save}
            title={account.addPasswordTitle}
        >
            <TextField
                autoComplete="one-time-code"
                autoFocus
                inputMode="numeric"
                label={account.code}
                name="code"
                required
            />
            <TextField
                autoComplete="new-password"
                label={account.newPassword}
                minLength={MIN_PASSWORD}
                name="next"
                required
                type="password"
            />
        </FormDialog>
    );
}

type OpenDialog = "addPassword" | "email" | "name" | "password" | null;

function Tile({ children }: { children: ReactNode }) {
    return (
        <span className="bg-app-fill text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            {children}
        </span>
    );
}

function Profile({ onOpen }: { onOpen: (dialog: OpenDialog) => void }) {
    const { account } = useIntlayer("dashboard-settings");
    const { data: session } = authClient.useSession();
    const { data: limits } = useQuery(convexQuery(api.limits.mine, {}));
    const user = session?.user;
    const dateText = useDateText();
    const { data: plan } = useQuery({
        queryFn: () => convexClient().action(api.billing.plan, {}),
        queryKey: ["billing", "plan"],
        retry: false,
    });
    const tier = limits?.pro ? account.pro : account.free;
    const renews = plan?.expiresAtMs && plan.state === "renews" ? dateText(plan.expiresAtMs) : null;
    return (
        <SettingsCard title={account.profile}>
            <Row
                hint={user?.name}
                label={account.name}
                leading={<Avatar name={user?.name ?? ""} size="sm" src={user?.image ?? undefined} />}
            >
                <Button onClick={() => onOpen("name")} size="sm" variant="outline">
                    {account.edit}
                </Button>
            </Row>
            <Row
                hint={<span className="ph-no-capture break-all">{user?.email}</span>}
                label={account.email}
                leading={
                    <Tile>
                        <HugeiconsIcon icon={Mail01Icon} size={16} />
                    </Tile>
                }
            >
                {user?.emailVerified ? (
                    <Badge dot variant="success">
                        {account.verified}
                    </Badge>
                ) : null}
                <Button onClick={() => onOpen("email")} size="sm" variant="outline">
                    {account.change}
                </Button>
            </Row>
            <Row
                hint={renews ? account.renews({ date: renews }) : tier}
                label={account.plan}
                leading={
                    <Tile>
                        <HugeiconsIcon icon={CheckmarkBadge01Icon} size={16} />
                    </Tile>
                }
            >
                <Button render={<Link to="/app/settings/usage" />} size="sm" variant="outline">
                    {account.usage}
                </Button>
            </Row>
        </SettingsCard>
    );
}

function ProviderRow({
    icon: Icon,
    label,
    linkedAt,
    lastMethod,
    provider,
}: {
    icon: IconSvgElement;
    label: string;
    lastMethod: boolean;
    linkedAt: Date | string | undefined;
    provider: "apple" | "google";
}) {
    const { account } = useIntlayer("dashboard-settings");
    const client = useQueryClient();
    const toast = useToast();
    const dateText = useDateText();
    return (
        <Row
            hint={linkedAt ? `${account.linkedOn.value} ${dateText(linkedAt)}` : account.notLinked}
            label={label}
            leading={
                <Tile>
                    <HugeiconsIcon icon={Icon} size={16} />
                </Tile>
            }
        >
            {linkedAt ? (
                <AlertDialog>
                    <AlertDialog.Trigger
                        render={
                            <Button disabled={lastMethod} size="sm" variant="outline">
                                {account.unlink}
                            </Button>
                        }
                    />
                    <AlertDialog.Content className="app-shell" tone="destructive">
                        <AlertDialog.Title>{account.unlinkTitle}</AlertDialog.Title>
                        <AlertDialog.Description>{account.unlinkBody}</AlertDialog.Description>
                        <AlertDialog.Footer>
                            <AlertDialog.Cancel>{account.cancel}</AlertDialog.Cancel>
                            <AlertDialog.Action
                                onClick={async () => {
                                    try {
                                        await succeed(authClient.unlinkAccount({ providerId: provider }));
                                        await client.invalidateQueries({ queryKey: ACCOUNTS_KEY });
                                    } catch {
                                        toast.add({ title: account.failed.value, type: "destructive" });
                                    }
                                }}
                            >
                                {account.unlink}
                            </AlertDialog.Action>
                        </AlertDialog.Footer>
                    </AlertDialog.Content>
                </AlertDialog>
            ) : (
                <Button
                    onClick={async () => {
                        try {
                            await succeed(authClient.linkSocial({ callbackURL: LINK_RETURN, provider }));
                        } catch {
                            toast.add({ title: account.failed.value, type: "destructive" });
                        }
                    }}
                    size="sm"
                    variant="outline"
                >
                    {account.link}
                </Button>
            )}
        </Row>
    );
}

function Methods({ onOpen }: { onOpen: (dialog: OpenDialog) => void }) {
    const { account } = useIntlayer("dashboard-settings");
    const { data: accounts = [] } = useAccounts();
    const linkedAt = (provider: string) => accounts.find((item) => item.providerId === provider)?.createdAt;
    const signIns = accounts.filter((item) => item.providerId !== "notion");
    const hasPassword = linkedAt("credential") !== undefined;
    return (
        <SettingsCard
            action={
                <span className="text-muted-foreground font-mono text-[13px]">
                    {account.of({ count: signIns.length, total: 3 })}
                </span>
            }
            title={account.methods}
        >
            <ProviderRow
                icon={AppleIcon}
                label="Apple"
                lastMethod={signIns.length === 1}
                linkedAt={linkedAt("apple")}
                provider="apple"
            />
            <ProviderRow
                icon={GoogleIcon}
                label="Google"
                lastMethod={signIns.length === 1}
                linkedAt={linkedAt("google")}
                provider="google"
            />
            <Row
                hint={hasPassword ? account.passwordSet : account.passwordNone}
                label={account.password}
                leading={
                    <Tile>
                        <HugeiconsIcon icon={SquareLock02Icon} size={16} />
                    </Tile>
                }
            >
                <Button onClick={() => onOpen(hasPassword ? "password" : "addPassword")} size="sm" variant="outline">
                    {hasPassword ? account.change : account.add}
                </Button>
            </Row>
        </SettingsCard>
    );
}

function deviceLabel(userAgent: string | null | undefined, copy: { app: string; on: string; unknownDevice: string }) {
    const { browser, system } = sessionDevice(userAgent ?? "");
    if (browser && system) {
        return `${browser} ${copy.on} ${system}`;
    }
    if (system) {
        return `${copy.app}, ${system}`;
    }
    return copy.unknownDevice;
}

function Sessions() {
    const { account } = useIntlayer("dashboard-settings");
    const { data: current } = authClient.useSession();
    const { data: sessions = [] } = useSessions();
    const client = useQueryClient();
    const toast = useToast();
    const dateText = useDateText();
    const others = sessions.filter((item) => item.token !== current?.session.token);
    const revoked = async (call: AuthResult) => {
        try {
            await succeed(call);
            await client.invalidateQueries({ queryKey: SESSIONS_KEY });
        } catch {
            toast.add({ title: account.failed.value, type: "destructive" });
        }
    };
    const copy = {
        app: account.app.value,
        on: account.on.value,
        unknownDevice: account.unknownDevice.value,
    };
    return (
        <SettingsCard
            action={
                <span className="text-muted-foreground font-mono text-[13px]">
                    {sessions.length} {account.active}
                </span>
            }
            footer={
                others.length > 0 ? (
                    <div className="flex items-center justify-between gap-3 max-sm:flex-wrap">
                        <span className="text-muted-foreground text-[13px]">{account.ledgerStays}</span>
                        <Button onClick={() => revoked(authClient.revokeOtherSessions())} size="sm" variant="outline">
                            {account.signOutOthers}
                        </Button>
                    </div>
                ) : undefined
            }
            title={account.sessions}
        >
            <Table framed aria-label={account.sessions.value} maxHeight="none">
                <Table.Header className="in-data-[sticky]:bg-card">
                    <Table.Row>
                        <Table.Head>{account.device}</Table.Head>
                        <Table.Head>{account.lastActive}</Table.Head>
                        <Table.Head />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {sessions.map((item) => {
                        const isCurrent = item.token === current?.session.token;
                        const { browser } = sessionDevice(item.userAgent ?? "");
                        const Icon = browser ? ComputerIcon : SmartPhone01Icon;
                        return (
                            <Table.Row key={item.id}>
                                <Table.Cell>
                                    <span className="flex min-w-0 items-center gap-2.5 font-medium">
                                        <Tile>
                                            <HugeiconsIcon icon={Icon} size={16} />
                                        </Tile>
                                        <span className="truncate">{deviceLabel(item.userAgent, copy)}</span>
                                    </span>
                                </Table.Cell>
                                <Table.Cell className="text-muted-foreground whitespace-nowrap">
                                    {isCurrent ? (
                                        <Badge dot variant="success">
                                            {account.thisBrowser}
                                        </Badge>
                                    ) : (
                                        dateText(item.updatedAt)
                                    )}
                                </Table.Cell>
                                <Table.Cell align="end">
                                    {isCurrent ? null : (
                                        <Button
                                            onClick={() => revoked(authClient.revokeSession({ token: item.token }))}
                                            size="sm"
                                            variant="outline"
                                        >
                                            {account.signOut}
                                        </Button>
                                    )}
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
        </SettingsCard>
    );
}

async function revokeApple(resumeSecret: string) {
    const { error } = await authClient.$fetch("/apple/revoke", { body: { resumeSecret }, method: "POST" });
    if (error) {
        throw new Error("Apple revocation failed");
    }
}

function DeleteCard() {
    const { account } = useIntlayer("dashboard-settings");
    const { data: accounts } = useAccounts();
    const toast = useToast();
    const { data: session } = authClient.useSession();
    const userId = session?.user.id;
    const [, noteFailure] = useState(0);
    const resumable = userId !== undefined && storedDeletion(userId) !== null;
    const remove = async () => {
        if (userId === undefined) {
            return;
        }
        const provider = deletionProvider((accounts ?? []).map((item) => item.providerId));
        try {
            await runDeletion(provider, userId, convexDeletionSteps(convexClient(), revokeApple));
            await signOut();
        } catch (error) {
            noteFailure((count) => count + 1);
            toast.add({ title: account.deleteFailed.value, type: "destructive" });
            throw error;
        }
    };
    return (
        <SettingsCard title={account.deleteTitle}>
            <Row hint={resumable ? account.deleteResume : account.deleteHint} label={account.deleteAccount}>
                <AlertDialog>
                    <AlertDialog.Trigger
                        render={
                            <Button
                                className="text-destructive"
                                disabled={accounts === undefined}
                                size="sm"
                                variant="outline"
                            >
                                {resumable ? account.deleteFinish : account.deleteTitle}
                            </Button>
                        }
                    />
                    <AlertDialog.Content className="app-shell" tone="destructive">
                        <AlertDialog.Title>{account.deleteConfirmTitle}</AlertDialog.Title>
                        <AlertDialog.Description>{account.deleteConfirmBody}</AlertDialog.Description>
                        <AlertDialog.Footer>
                            <AlertDialog.Cancel>{account.cancel}</AlertDialog.Cancel>
                            <AlertDialog.Action onClick={remove}>{account.deleteAccount}</AlertDialog.Action>
                        </AlertDialog.Footer>
                    </AlertDialog.Content>
                </AlertDialog>
            </Row>
        </SettingsCard>
    );
}

export function Account() {
    const { account, sections } = useIntlayer("dashboard-settings");
    const { data: session } = authClient.useSession();
    const [open, setOpen] = useState<OpenDialog>(null);
    const close = () => setOpen(null);
    const client = useQueryClient();
    const closeRefreshing = () => {
        close();
        client.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    };
    return (
        <>
            <SectionHead
                action={
                    <Button onClick={signOut} size="sm" variant="outline">
                        <HugeiconsIcon icon={Logout03Icon} size={16} />
                        {account.signOut}
                    </Button>
                }
                title={sections.account}
            />
            <div className="grid items-start gap-4 @3xl:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-4">
                    <Profile onOpen={setOpen} />
                    <Methods onOpen={setOpen} />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    <Sessions />
                    <DeleteCard />
                </div>
            </div>
            <OverlayPresence value={open}>
                {(dialog) => (
                    <>
                        {dialog === "name" ? <NameDialog name={session?.user.name ?? ""} onClose={close} /> : null}
                        {dialog === "email" ? <EmailDialog onClose={close} /> : null}
                        {dialog === "password" ? <ChangePasswordDialog onClose={closeRefreshing} /> : null}
                        {dialog === "addPassword" ? (
                            <AddPasswordDialog email={session?.user.email ?? ""} onClose={close} />
                        ) : null}
                    </>
                )}
            </OverlayPresence>
        </>
    );
}
