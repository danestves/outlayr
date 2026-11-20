import { useIntlayer } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { DropAnywhere, ImportTabs, SourceRow } from "./home";
import { Card, Columns, ImportBar, ImportPage, NOTE } from "./parts";

const noop = () => undefined;

export function ImportPending() {
    const { home, sources } = useIntlayer("dashboard-import");
    const { loadingLabel } = useIntlayer("dashboard");
    return (
        <Skeleton label={loadingLabel.value} loading>
            <ImportPage>
                <ImportBar />
                <Columns
                    rail={
                        <Card title={home.privacy}>
                            <p className={`${NOTE} py-4`}>{home.privacyText}</p>
                        </Card>
                    }
                >
                    <Card head={<ImportTabs count={0} onTab={noop} tab="new" />}>
                        <div className="border-b">
                            <SourceRow
                                hint={sources.moneyManagerHint}
                                onClick={noop}
                                source="moneyManager"
                                title={sources.moneyManager}
                            />
                            <SourceRow hint={sources.csvHint} onClick={noop} source="csv" title={sources.csv} />
                        </div>
                        <DropAnywhere onFile={noop} over={false} />
                    </Card>
                </Columns>
            </ImportPage>
        </Skeleton>
    );
}
