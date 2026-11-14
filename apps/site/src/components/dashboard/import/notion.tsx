import { convexQuery } from "@convex-dev/react-query";
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon";
import Unlink01Icon from "@hugeicons/core-free-icons/Unlink01Icon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import type { IconSvgElement } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { RadioGroup } from "panelui-web/radio-group";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { authClient } from "@/lib/auth-client";
import { convexClient } from "@/lib/convex";
import { csvFromArchive, csvFromNotionTables, isZip } from "@/lib/import-archive";

import { handOff } from "./hand-off";
import { FilePicker } from "./parts";

const SOURCES_KEY = ["notion", "sources"] as const;
const SOURCES_FRESH_MS = 60_000;
export const NOTION_RETURN = "/app/import?kind=notion";

type NotionTrouble = "rateLimited" | "revoked" | "unavailable";

const decodeRefusal = Schema.decodeUnknownOption(Schema.Struct({ code: Schema.String }));

function troubleOf(error: Error): NotionTrouble {
    const refusal = error instanceof ConvexError ? Option.getOrNull(decodeRefusal(error.data)) : null;
    const code = refusal?.code ?? null;
    if (code === "NOTION_RATE_LIMITED") {
        return "rateLimited";
    }
    return code === "NOTION_REVOKED" || code === "NOTION_NOT_CONNECTED" ? "revoked" : "unavailable";
}

export function useNotion() {
    const { data: connected } = useQuery(convexQuery(api.notion.connected, {}));
    const sources = useQuery({
        enabled: connected === true,
        queryFn: () => convexClient().action(api.notion.sources, {}),
        queryKey: SOURCES_KEY,
        retry: false,
        staleTime: SOURCES_FRESH_MS,
    });
    return { connected: connected === true, sources };
}

const connect = () => authClient.linkSocial({ callbackURL: NOTION_RETURN, provider: "notion" });

/** Hands the ledger CSV to the file flow, named the way history will show it. */
function useStartFile() {
    const navigate = useNavigate();
    return (csv: string, name: string) => {
        handOff(new File([csv], `${name}.csv`, { type: "text/csv" }), "notion");
        void navigate({ search: { kind: "csv" }, to: "/app/import/file" });
    };
}

export function useExportUpload(onError: (message: string) => void) {
    const { notion } = useIntlayer("dashboard-import");
    const start = useStartFile();
    return async (file: File) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let csv: string | null = null;
        try {
            csv = isZip(bytes) ? csvFromArchive(bytes) : null;
        } catch {
            csv = null;
        }
        if (csv === null) {
            onError(notion.error.zip.value);
            return;
        }
        start(csv, file.name.replace(/\.zip$/i, ""));
    };
}

function Failure({ children }: { children: ReactNode }) {
    return (
        <p className="text-destructive pt-3 text-[13px] leading-5" role="alert">
            {children}
        </p>
    );
}

function ConnectBody({ onClose }: { onClose: () => void }) {
    const { cancel, notion } = useIntlayer("dashboard-import");
    const [way, setWay] = useState<"connect" | "upload">("connect");
    const [failed, setFailed] = useState<string | null>(null);
    const upload = useExportUpload(setFailed);
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{notion.title}</Dialog.Title>
                <Dialog.Description className="text-[13px] leading-5">{notion.text}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
                <RadioGroup
                    aria-label={notion.title.value}
                    className="gap-2"
                    onValueChange={(next) => setWay(next === "upload" ? "upload" : "connect")}
                    value={way}
                >
                    <RadioGroup.Card value="connect">
                        <RadioGroup.CardBody>
                            <RadioGroup.CardTitle>{notion.connect}</RadioGroup.CardTitle>
                            <RadioGroup.CardDescription>{notion.connectHint}</RadioGroup.CardDescription>
                        </RadioGroup.CardBody>
                    </RadioGroup.Card>
                    <RadioGroup.Card value="upload">
                        <RadioGroup.CardBody>
                            <RadioGroup.CardTitle>{notion.uploadExport}</RadioGroup.CardTitle>
                            <RadioGroup.CardDescription>{notion.uploadExportHint}</RadioGroup.CardDescription>
                        </RadioGroup.CardBody>
                    </RadioGroup.Card>
                </RadioGroup>
                {failed ? <Failure>{failed}</Failure> : null}
            </Dialog.Body>
            <Dialog.Footer className="flex gap-3 *:flex-1">
                <Button onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <FilePicker accept=".zip,application/zip" onFile={(file) => upload(file)}>
                    {(open) => (
                        <Button
                            onClick={async () => {
                                setFailed(null);
                                if (way === "upload") {
                                    open();
                                    return;
                                }
                                const { error } = await connect();
                                if (error) {
                                    setFailed(notion.connectFailed.value);
                                }
                            }}
                        >
                            {way === "upload" ? notion.continueUpload : notion.connectNotion}
                        </Button>
                    )}
                </FilePicker>
            </Dialog.Footer>
        </>
    );
}

function MoreRow({
    children,
    icon,
    onClick,
    tone = "",
}: {
    children: ReactNode;
    icon: IconSvgElement;
    onClick: () => void;
    tone?: string;
}) {
    return (
        <button
            className={`hover:bg-app-fill/60 flex h-11 w-full items-center gap-2.5 border-t text-start text-[13px] font-medium ${tone}`}
            onClick={onClick}
            type="button"
        >
            <Glyph className={tone || "text-muted-foreground"} icon={icon} size={16} />
            {children}
        </button>
    );
}

function DatabasesBody({ notion: state, onClose }: { notion: ReturnType<typeof useNotion>; onClose: () => void }) {
    const { cancel, notion, tryAgain } = useIntlayer("dashboard-import");
    const client = useQueryClient();
    const start = useStartFile();
    const [picked, setPicked] = useState<ReadonlySet<string> | null>(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState<string | null>(null);
    const upload = useExportUpload(setFailed);
    const { data, error, isPending, refetch } = state.sources;
    const sources = data?.sources ?? [];
    const ledgers = sources.filter((source) => source.ledger);
    const chosen = picked ?? new Set(ledgers.map((source) => source.id));
    const trouble = error ? troubleOf(error) : null;
    const flip = (id: string) =>
        setPicked(() => {
            const next = new Set(chosen);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

    const read = async () => {
        setBusy(true);
        setFailed(null);
        try {
            const tables = await convexClient().action(api.notion.tables, { ids: [...chosen] });
            const csv = csvFromNotionTables(tables);
            if (csv === null) {
                setFailed(notion.error.noLedger.value);
                return;
            }
            start(csv, tables.map((table) => table.title).join(", "));
        } catch (caught) {
            setFailed(notion.error[caught instanceof Error ? troubleOf(caught) : "unavailable"].value);
        } finally {
            setBusy(false);
        }
    };

    const disconnect = async () => {
        try {
            await convexClient().action(api.notion.disconnect, {});
            await client.invalidateQueries();
            onClose();
        } catch (caught) {
            setFailed(notion.error[caught instanceof Error ? troubleOf(caught) : "unavailable"].value);
        }
    };

    let importLabel: ReactNode = chosen.size === 1 ? notion.importOne : notion.importDatabases({ count: chosen.size });
    if (busy) {
        importLabel = notion.reading;
    }
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{data?.workspaceName ?? notion.workspace}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body className="gap-0">
                <div className="flex h-8 items-center border-b text-[13px] font-medium">
                    {notion.databases}
                    {ledgers.length > 0 ? (
                        <span className="dash-figure text-muted-foreground ml-auto">
                            {notion.countOf({ picked: chosen.size, total: sources.length })}
                        </span>
                    ) : null}
                </div>
                {isPending ? <p className="text-muted-foreground py-4 text-[13px]">{notion.loading}</p> : null}
                {trouble ? (
                    <div className="flex items-center gap-3 py-3">
                        <Failure>{notion.error[trouble]}</Failure>
                        <Button
                            className="ms-auto"
                            onClick={() => (trouble === "revoked" ? connect() : refetch())}
                            size="sm"
                            variant="outline"
                        >
                            {trouble === "revoked" ? notion.connectNotion : tryAgain}
                        </Button>
                    </div>
                ) : null}
                {data && sources.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-[13px]">{notion.noDatabases}</p>
                ) : null}
                <ul className="max-h-72 overflow-y-auto">
                    {sources.map((source) => (
                        <li className="border-b last:border-0" key={source.id}>
                            <label
                                className={`flex items-center gap-3 py-3 ${source.ledger ? "cursor-pointer" : "opacity-50"}`}
                                htmlFor={`notion-source-${source.id}`}
                            >
                                <Checkbox
                                    id={`notion-source-${source.id}`}
                                    checked={source.ledger && chosen.has(source.id)}
                                    disabled={!source.ledger}
                                    onCheckedChange={() => flip(source.id)}
                                />
                                <span className="min-w-0">
                                    <b className="block truncate text-sm font-medium">{source.title}</b>
                                    <small className="text-muted-foreground block truncate text-[13px]">
                                        {source.ledger ? source.columns.join(", ") : notion.noDateAmount}
                                    </small>
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>
                <p className="mt-4 flex h-8 items-center text-[13px] font-medium">{notion.more}</p>
                <MoreRow icon={LinkSquare02Icon} onClick={() => connect()}>
                    {notion.shareMore}
                </MoreRow>
                <FilePicker accept=".zip,application/zip" onFile={(file) => upload(file)}>
                    {(open) => (
                        <MoreRow icon={Upload04Icon} onClick={open}>
                            {notion.uploadExport}
                        </MoreRow>
                    )}
                </FilePicker>
                <MoreRow icon={Unlink01Icon} onClick={() => disconnect()} tone="text-destructive">
                    {notion.disconnect}
                </MoreRow>
                {failed ? <Failure>{failed}</Failure> : null}
            </Dialog.Body>
            <Dialog.Footer className="flex gap-3 *:flex-1">
                <Button onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button disabled={busy || chosen.size === 0} onClick={() => read()}>
                    {importLabel}
                </Button>
            </Dialog.Footer>
        </>
    );
}

export function NotionDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
    const notion = useNotion();
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell" size={notion.connected ? "lg" : "md"}>
                {notion.connected ? (
                    <DatabasesBody notion={notion} onClose={onClose} />
                ) : (
                    <ConnectBody onClose={onClose} />
                )}
            </Dialog.Content>
        </Dialog>
    );
}
