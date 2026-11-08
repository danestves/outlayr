import { convexQuery } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import type { RemixiconComponentType } from "@remixicon/react";
import { RiAppleFill, RiGoogleFill, RiLockLine, RiLogoutBoxRLine } from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "panelui-web/alert-dialog";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Input } from "panelui-web/input";
import { useToast } from "panelui-web/toast";
import { useId, useState } from "react";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

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

function Field({ label, ...input }: { label: ReactNode } & Omit<ComponentProps<typeof Input>, "id">) {
    const id = useId();
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor={id}>
                {label}
            </label>
            <Input className="max-sm:text-base" id={id} {...input} />
        </div>
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
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
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
        <Dialog onOpenChange={(open) => open || onClose()} open>
            <Dialog.Content className="app-shell">
                <form onSubmit={handle}>
                    <Dialog.Header>
                        <Dialog.Title>{title}</Dialog.Title>
                        {description ? <Dialog.Description>{description}</Dialog.Description> : null}
                    </Dialog.Header>
                    <Dialog.Body className="flex flex-col gap-3">
                        {children}
                        {failed ? (
                            <p className="text-destructive text-[13px]" role="alert">
                                {account.failed}
                            </p>
                        ) : null}
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Button onClick={onClose} type="button" variant="outline">
                            {account.cancel}
                        </Button>
                        <Button loading={busy} type="submit">
                            {submit}
                        </Button>
                    </Dialog.Footer>
                </form>
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
            <Field autoComplete="name" autoFocus defaultValue={name} label={account.name} name="name" required />
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
                <Field autoComplete="email" autoFocus label={account.newEmail} name="email" required type="email" />
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
            <Field
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
            <Field
                autoComplete="current-password"
                autoFocus
                label={account.currentPassword}
                name="current"
                required
                type="password"
            />
            <Field
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
            <Field
                autoComplete="one-time-code"
                autoFocus
                inputMode="numeric"
                label={account.code}
                name="code"
                required
            />
            <Field
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
    return (
        <SettingsCard title={account.profile}>
            <Row hint={user?.name} label={account.name}>
                <Button onClick={() => onOpen("name")} size="sm" variant="outline">
                    {account.edit}
                </Button>
            </Row>
            <Row hint={<span className="ph-no-capture break-all">{user?.email}</span>} label={account.email}>
                {user?.emailVerified ? (
                    <span className="text-muted-foreground text-[13px]">{account.verified}</span>
                ) : null}
                <Button onClick={() => onOpen("email")} size="sm" variant="outline">
                    {account.change}
                </Button>
            </Row>
            <Row hint={limits?.pro ? account.pro : account.free} label={account.plan} />
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
    icon: RemixiconComponentType;
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
                    <Icon size={16} />
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
            action={<span className="text-muted-foreground font-mono text-[13px]">{signIns.length}/3</span>}
            title={account.methods}
        >
            <ProviderRow
                icon={RiAppleFill}
                label="Apple"
                lastMethod={signIns.length === 1}
                linkedAt={linkedAt("apple")}
                provider="apple"
            />
            <ProviderRow
                icon={RiGoogleFill}
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
                        <RiLockLine size={16} />
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
            {sessions.map((item) => (
                <Row
                    hint={
                        item.token === current?.session.token
                            ? account.thisBrowser
                            : `${account.lastActive.value}: ${dateText(item.updatedAt)}`
                    }
                    key={item.id}
                    label={deviceLabel(item.userAgent, copy)}
                >
                    {item.token === current?.session.token ? null : (
                        <Button
                            onClick={() => revoked(authClient.revokeSession({ token: item.token }))}
                            size="sm"
                            variant="outline"
                        >
                            {account.signOut}
                        </Button>
                    )}
                </Row>
            ))}
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
                        <RiLogoutBoxRLine size={16} />
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
            {open === "name" ? <NameDialog name={session?.user.name ?? ""} onClose={close} /> : null}
            {open === "email" ? <EmailDialog onClose={close} /> : null}
            {open === "password" ? <ChangePasswordDialog onClose={closeRefreshing} /> : null}
            {open === "addPassword" ? <AddPasswordDialog email={session?.user.email ?? ""} onClose={close} /> : null}
        </>
    );
}
