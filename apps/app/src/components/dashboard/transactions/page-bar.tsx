import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import Upload01Icon from "@hugeicons/core-free-icons/Upload01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";

interface PageBarProps {
    onExport: () => void;
    setup: boolean;
    transfers: boolean;
}

export function PageBar({ onExport, setup, transfers }: PageBarProps) {
    const { page } = useIntlayer("dashboard-ledger");
    const { add } = useIntlayer("dashboard");
    const { open } = useAccountFlows();
    return (
        <header className="h-app-bar flex shrink-0 items-center gap-2">
            <h1 className="text-app-heading me-auto truncate font-semibold">{page.title}</h1>
            {setup ? null : (
                <Button className="max-md:hidden" onClick={onExport} variant="outline">
                    <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
                    {page.export}
                </Button>
            )}
            <Button className="max-md:hidden" render={<Link to="/import" />} variant="outline">
                <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
                {page.import}
            </Button>
            <Button onClick={() => open({ kind: transfers ? "transfer" : "entry" })}>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                {transfers ? page.newTransfer : add.entry}
            </Button>
        </header>
    );
}
