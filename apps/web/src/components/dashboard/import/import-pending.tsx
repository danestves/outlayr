import { Card, Columns, ImportBar, ImportPage } from "./parts";

const SOURCE_ROWS = [118, 96, 72, 104] as const;

function GhostSource({ width }: { width: number }) {
    return (
        <div className="flex h-16 items-center gap-3 border-b px-4">
            <i className="dash-gx size-9 flex-none rounded-[10px]" />
            <span className="flex flex-col gap-2">
                <i className="dash-gl" style={{ width }} />
                <i className="dash-gl" style={{ width: width + 64 }} />
            </span>
        </div>
    );
}

export function ImportPending() {
    return (
        <ImportPage>
            <ImportBar />
            <Columns
                rail={
                    <>
                        <Card head={<i className="dash-gl ms-3 w-20" />}>
                            <div className="flex flex-col gap-2.5 p-4">
                                <i className="dash-gl w-full" />
                                <i className="dash-gl w-4/5" />
                            </div>
                        </Card>
                        <Card head={<i className="dash-gl ms-3 w-28" />}>
                            <div className="flex flex-col gap-2.5 p-4">
                                <i className="dash-gl w-full" />
                                <i className="dash-gl w-3/5" />
                            </div>
                        </Card>
                    </>
                }
            >
                <Card head={<i className="dash-gl ms-3 w-40" />}>
                    <div aria-hidden className="grid grid-cols-1 border-b @3xl:grid-cols-2 @3xl:divide-x">
                        {[0, 1].map((column) => (
                            <div key={column}>
                                <div className="flex h-11 items-center border-b px-4">
                                    <i className="dash-gl w-16" />
                                </div>
                                {SOURCE_ROWS.slice(column * 2, column * 2 + 2).map((width) => (
                                    <GhostSource key={width} width={width} />
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="p-5">
                        <div className="dash-gx h-[131px] rounded-2xl" />
                    </div>
                </Card>
            </Columns>
        </ImportPage>
    );
}
