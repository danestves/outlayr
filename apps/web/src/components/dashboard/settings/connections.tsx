import { convexQuery } from "@convex-dev/react-query";
import BotIcon from "@hugeicons/core-free-icons/BotIcon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { AlertDialog } from "panelui-web/alert-dialog";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { OverlayPresence, useOverlayOpen } from "@/components/dashboard/overlay-presence";
import { convexClient } from "@/lib/convex";
import { LEDGER_MCP_ORIGIN } from "@/lib/site";

import { Row, SectionHead, SettingsCard } from "./parts";

const SERVER = `${LEDGER_MCP_ORIGIN}/mcp`;
const LOADING_ROWS = ["a", "b"].map((id) => ({
    createdAt: 0,
    id,
    lastUsedAt: undefined,
    name: "Claude Desktop",
    scopes: ["ledger:read"],
}));

interface Agent {
    createdAt: number;
    id: string;
    lastUsedAt?: number;
    name?: string;
    scopes: readonly string[];
}

function useCopyServer() {
    const copy = useIntlayer("dashboard-connections");
    const toast = useToast();
    return async () => {
        try {
            await navigator.clipboard.writeText(SERVER);
            toast.add({ title: copy.copied.value });
        } catch {
            toast.add({ title: copy.copyFailed.value, type: "destructive" });
        }
    };
}

function ServerLine() {
    const copy = useIntlayer("dashboard-connections");
    const write = useCopyServer();
    return (
        <span className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground">{copy.server}</span>
            <span className="min-w-0 truncate font-mono text-[13px] select-all">{SERVER}</span>
            <Button aria-label={copy.copyServer.value} onClick={write} size="icon-sm" variant="ghost">
                <HugeiconsIcon icon={Copy01Icon} size={15} />
            </Button>
        </span>
    );
}

function ConnectDialog({ onClose }: { onClose: () => void }) {
    const copy = useIntlayer("dashboard-connections");
    const shown = useOverlayOpen();
    const write = useCopyServer();
    return (
        <Dialog onOpenChange={(open) => open || onClose()} open={shown}>
            <Dialog.Content className="app-shell">
                <Dialog.Header>
                    <Dialog.Title>{copy.connect}</Dialog.Title>
                    <Dialog.Description>{copy.connectBody}</Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
                    <Row
                        hint={<span className="font-mono text-[13px] break-all select-all">{SERVER}</span>}
                        label={copy.server}
                    >
                        <Button aria-label={copy.copyServer.value} onClick={write} size="icon-sm" variant="outline">
                            <HugeiconsIcon icon={Copy01Icon} size={15} />
                        </Button>
                    </Row>
                </Dialog.Body>
                <Dialog.Footer>
                    <Dialog.Close render={<Button variant="secondary" />}>{copy.done}</Dialog.Close>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}

function DisconnectDialog({ agent, onClose, onConfirm }: { agent: Agent; onClose: () => void; onConfirm: () => void }) {
    const copy = useIntlayer("dashboard-connections");
    const shown = useOverlayOpen();
    return (
        <AlertDialog onOpenChange={(open) => open || onClose()} open={shown}>
            <AlertDialog.Content className="app-shell" tone="destructive">
                <AlertDialog.Title>{copy.disconnectTitle({ name: agent.name ?? copy.agent.value })}</AlertDialog.Title>
                <AlertDialog.Description>{copy.disconnectBody}</AlertDialog.Description>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>{copy.cancel}</AlertDialog.Cancel>
                    <AlertDialog.Action onClick={onConfirm}>{copy.disconnect}</AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog>
    );
}

function useAccessLabel() {
    const copy = useIntlayer("dashboard-connections");
    return (scopes: readonly string[]) => {
        const reads = scopes.includes("ledger:read");
        const logs = scopes.includes("ledger:write");
        if (reads && logs) {
            return copy.readLog;
        }
        return logs ? copy.logOnly : copy.read;
    };
}

export function Connections() {
    const copy = useIntlayer("dashboard-connections");
    const { sections } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const toast = useToast();
    const access = useAccessLabel();
    const [connecting, setConnecting] = useState(false);
    const [target, setTarget] = useState<Agent | null>(null);
    const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
    const [thisYear] = useState(() => new Date().getFullYear());
    const { data } = useQuery(convexQuery(api.mcp.listConnections, {}));
    const loading = data === undefined;
    const agents: readonly Agent[] = data?.filter(({ id }) => !gone.has(id)) ?? LOADING_ROWS;

    const day = (at: number) =>
        new Date(at).toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            year: new Date(at).getFullYear() === thisYear ? undefined : "numeric",
        });

    const disconnect = async (agent: Agent) => {
        setTarget(null);
        setGone((current) => new Set(current).add(agent.id));
        try {
            await convexClient().mutation(api.mcp.revokeConnection, { id: agent.id });
            toast.add({ title: copy.disconnected({ name: agent.name ?? copy.agent.value }).value });
        } catch {
            setGone((current) => {
                const next = new Set(current);
                next.delete(agent.id);
                return next;
            });
            toast.add({ title: copy.disconnectFailed.value, type: "destructive" });
        }
    };

    return (
        <>
            <SectionHead
                action={
                    <Button onClick={() => setConnecting(true)} variant="outline">
                        <HugeiconsIcon icon={BotIcon} size={16} />
                        {copy.connect}
                    </Button>
                }
                title={sections.connections}
            />
            <div className="@container flex flex-col gap-4 pb-8">
                {agents.length === 0 ? (
                    <Frame className="min-w-0">
                        <Frame.Panel>
                            <div>
                                <div aria-hidden className="divide-y">
                                    {["head", "first", "second", "third"].map((row) => (
                                        <div className="flex items-center justify-between gap-3 px-4 py-3" key={row}>
                                            <span className="flex w-1/3 items-center gap-2">
                                                {row === "head" ? null : (
                                                    <span className="border-border size-[26px] rounded-lg border" />
                                                )}
                                                <span className="border-border h-2 w-16 rounded-full border" />
                                            </span>
                                            <span
                                                className={
                                                    row === "head"
                                                        ? "border-border h-2 w-12 rounded-full border"
                                                        : "border-border h-6 w-24 rounded-lg border"
                                                }
                                            />
                                            <span className="border-border h-2 w-12 rounded-full border" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col items-center px-5 pt-6 pb-8 text-center">
                                    <b className="text-sm font-semibold">{copy.emptyTitle}</b>
                                    <p className="text-muted-foreground mt-1 text-[13px] leading-5">{copy.emptyBody}</p>
                                    <Button className="mt-4" onClick={() => setConnecting(true)}>
                                        <HugeiconsIcon icon={BotIcon} size={16} />
                                        {copy.connect}
                                    </Button>
                                </div>
                            </div>
                        </Frame.Panel>
                    </Frame>
                ) : (
                    <SettingsCard footer={<ServerLine />} title={copy.agents}>
                        <Skeleton loading={loading}>
                            <Table aria-label={copy.agents.value} framed maxHeight="none">
                                <Table.Header className="in-data-[sticky]:bg-card">
                                    <Table.Row>
                                        <Table.Head>{copy.agent}</Table.Head>
                                        <Table.Head>{copy.access}</Table.Head>
                                        <Table.Head className="max-sm:hidden">{copy.connected}</Table.Head>
                                        <Table.Head className="max-sm:hidden">{copy.lastUsed}</Table.Head>
                                        <Table.Head />
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {agents.map((agent) => {
                                        const name = agent.name ?? copy.agent.value;
                                        return (
                                            <Table.Row key={agent.id}>
                                                <Table.Cell>
                                                    <span className="flex items-center gap-2.5 font-medium">
                                                        <span className="bg-app-fill text-muted-foreground grid size-[26px] shrink-0 place-items-center rounded-lg">
                                                            <HugeiconsIcon icon={BotIcon} size={15} />
                                                        </span>
                                                        <span className="ph-no-capture max-w-[220px] truncate">
                                                            {name}
                                                        </span>
                                                    </span>
                                                </Table.Cell>
                                                <Table.Cell>{access(agent.scopes)}</Table.Cell>
                                                <Table.Cell className="max-sm:hidden">
                                                    {day(agent.createdAt)}
                                                </Table.Cell>
                                                <Table.Cell className="max-sm:hidden">
                                                    {agent.lastUsedAt === undefined
                                                        ? copy.neverUsed
                                                        : day(agent.lastUsedAt)}
                                                </Table.Cell>
                                                <Table.Cell className="w-10 text-right">
                                                    <Menu>
                                                        <Menu.Trigger
                                                            aria-label={copy.more({ name }).value}
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
                                                        <Menu.Content
                                                            align="end"
                                                            className="app-shell w-[200px]"
                                                            sideOffset={4}
                                                        >
                                                            <Menu.Item
                                                                onClick={() => setTarget(agent)}
                                                                variant="destructive"
                                                            >
                                                                <HugeiconsIcon icon={Unlink01Icon} size={16} />
                                                                {copy.disconnect}
                                                            </Menu.Item>
                                                        </Menu.Content>
                                                    </Menu>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table>
                        </Skeleton>
                    </SettingsCard>
                )}
            </div>
            <OverlayPresence value={connecting ? true : null}>
                {() => <ConnectDialog onClose={() => setConnecting(false)} />}
            </OverlayPresence>
            <OverlayPresence value={target}>
                {(held) => (
                    <DisconnectDialog agent={held} onClose={() => setTarget(null)} onConfirm={() => disconnect(held)} />
                )}
            </OverlayPresence>
        </>
    );
}
