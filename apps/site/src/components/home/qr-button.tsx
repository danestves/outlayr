import { useIntlayer } from "react-intlayer";

import { showGetApp } from "@/components/get-app";
import { DownloadQr } from "@/components/qr-code";

export function QrButton({ placement }: { placement: string }) {
    const { getApp } = useIntlayer("site");
    return (
        <button aria-haspopup="dialog" className="hz-qr" onClick={() => showGetApp(placement)} type="button">
            <span className="hz-qr-tile">
                <DownloadQr />
            </span>
            {getApp.scan}
        </button>
    );
}
