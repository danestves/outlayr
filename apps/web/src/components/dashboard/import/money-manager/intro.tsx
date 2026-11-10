import type { MmArchiveError } from "@outlayr/money/money-manager/types";
import { Button } from "panelui-web/button";
import { useIntlayer } from "react-intlayer";

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
                                    <li className="px-4 py-2.5 text-sm" key={index}>
                                        {item}
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
                            <li className="flex items-center gap-3 px-4 py-3 text-sm" key={index}>
                                <span className="bg-app-fill dash-figure flex size-5 flex-none items-center justify-center rounded-full text-[11px] font-medium">
                                    {index + 1}
                                </span>
                                {step}
                            </li>
                        ))}
                    </ol>
                </Card>
                <FilePicker accept={ACCEPT} onFile={onFile}>
                    {(open) => (
                        <div className="p-4" {...drop.props}>
                            <div className={`${DROPZONE} min-h-56 ${drop.over ? "bg-app-fill" : ""}`}>
                                <DropTile />
                                <b className="text-sm font-medium">{intro.drop}</b>
                                <small className="text-muted-foreground mb-4 text-xs">{intro.dropHint}</small>
                                <Button onClick={open} size="sm">
                                    {intro.choose}
                                </Button>
                            </div>
                        </div>
                    )}
                </FilePicker>
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
