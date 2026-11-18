import { Dialog } from "panelui-web/dialog";
import { useIntlayer } from "react-intlayer";

import { DownloadQr } from "./qr-code";
import { StoreBadges } from "./store-badges";

export function GetAppPanel({ onOpenChange, open }: { onOpenChange: (open: boolean) => void; open: boolean }) {
    const { getApp } = useIntlayer("site");
    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <Dialog.Content className="get-app max-w-[27.5rem] text-center" showClose={false} size="sm" variant="plain">
                <Dialog.Close aria-label={getApp.close.value} className="get-app-close" icon />
                <div className="get-app-qr">
                    <DownloadQr label={getApp.qr.value} />
                </div>
                <Dialog.Title className="get-app-title">{getApp.title}</Dialog.Title>
                <Dialog.Description className="get-app-line">{getApp.line}</Dialog.Description>
                <div className="mt-6 flex justify-center">
                    <StoreBadges placement="dialog" size="sm" />
                </div>
            </Dialog.Content>
        </Dialog>
    );
}
