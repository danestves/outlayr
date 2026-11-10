import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import type { MmArchiveError } from "@outlayr/money/money-manager/types";
import { Button } from "panelui-web/button";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import {
    Banner,
    Card,
    Columns,
    DROPZONE,
    DropTile,
    FileHead,
    FilePicker,
    ImportPage,
    fileSize,
    useFileDrop,
} from "../parts";
import { MmBar, NavRow } from "./parts";

const ACCEPT = ".mmbackup";

export function Intro({ onCancel, onFile }: { onCancel: () => void; onFile: (file: File) => void }) {
    const { bar, intro } = useIntlayer("dashboard-import-mm");
    const drop = useFileDrop(onFile);
    return (
        <ImportPage>
            <MmBar onBack={onCancel} title={bar.title} />
            <Columns
                rail={
                    <>
                        <Card title={intro.comesOver}>
                            <ul className="divide-border divide-y">
                                {intro.items.map((item, index) => (
                                    <li
                                        className="text-muted-foreground flex min-h-9 items-center justify-between gap-3 px-4 text-[13px]"
                                        key={index}
                                    >
                                        {item}
                                        <Glyph className="text-muted-foreground" icon={Tick02Icon} size={14} />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        <Card title={intro.nothingFinal}>
                            <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">
                                {intro.nothingFinalBody}
                            </p>
                        </Card>
                    </>
                }
            >
                <Card title={intro.backupTitle}>
                    <ol className="divide-border divide-y">
                        {intro.steps.map((step, index) => (
                            <li className="flex min-h-14 items-center gap-3 px-4 text-sm font-medium" key={index}>
                                <span className="bg-app-fill dash-figure flex size-8 flex-none items-center justify-center rounded-lg border text-xs font-medium">
                                    {index + 1}
                                </span>
                                {step}
                            </li>
                        ))}
                    </ol>
                    <FilePicker accept={ACCEPT} onFile={onFile}>
                        {(open) => (
                            <div className="p-5" {...drop.props}>
                                <div className={`${DROPZONE} h-84 ${drop.over ? "bg-app-fill" : ""}`}>
                                    <DropTile />
                                    <b className="text-sm font-semibold">{intro.drop}</b>
                                    <small className="text-muted-foreground mt-1.5 mb-4 text-[13px]">
                                        {intro.dropHint}
                                    </small>
                                    <Button onClick={open}>{intro.choose}</Button>
                                </div>
                            </div>
                        )}
                    </FilePicker>
                </Card>
            </Columns>
        </ImportPage>
    );
}

export function Reading({ name, onCancel, size }: { name: string; onCancel: () => void; size: number }) {
    const { reading } = useIntlayer("dashboard-import-mm");
    return (
        <ImportPage>
            <MmBar onBack={onCancel} title={reading.title} />
            <Columns
                rail={
                    <Card title={reading.next}>
                        <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">{reading.nextBody}</p>
                    </Card>
                }
            >
                <Card title={reading.file}>
                    <FileHead name={name} note={`${fileSize(size)}, ${reading.local}`} source="moneyManager" />
                    <NavRow title={reading.reading} />
                </Card>
            </Columns>
        </ImportPage>
    );
}

export function WrongFile({
    error,
    name,
    onCancel,
    onFile,
    size,
}: {
    error: MmArchiveError;
    name: string;
    onCancel: () => void;
    onFile: (file: File) => void;
    size: number;
}) {
    const { wrong } = useIntlayer("dashboard-import-mm");
    const copy = {
        damaged: { body: wrong.damagedBody, title: wrong.damagedTitle },
        newer: { body: wrong.newerBody, title: wrong.newerTitle },
        notBackup: { body: wrong.notBackupBody, title: wrong.notBackupTitle },
        realbyte: { body: wrong.realbyteBody, title: wrong.realbyteTitle },
    }[error.kind];
    return (
        <ImportPage>
            <MmBar onBack={onCancel} title={wrong.title} />
            <Columns
                rail={
                    error.kind === "notBackup" ? (
                        <Card title={wrong.reasons}>
                            <NavRow detail={wrong.damagedBody} title={wrong.damaged} />
                            <NavRow detail={wrong.newerBody} title={wrong.newer} />
                        </Card>
                    ) : null
                }
            >
                <Card title={wrong.file}>
                    <FileHead
                        name={name}
                        note={wrong.notRead.value.replace("{size}", fileSize(size))}
                        source="moneyManager"
                    />
                    <Banner
                        action={
                            <FilePicker accept={ACCEPT} onFile={onFile}>
                                {(open) => (
                                    <Button onClick={open} size="sm" variant="outline">
                                        {wrong.chooseOther}
                                    </Button>
                                )}
                            </FilePicker>
                        }
                        title={copy.title}
                        tone="bad"
                    >
                        {copy.body}
                    </Banner>
                </Card>
            </Columns>
        </ImportPage>
    );
}
