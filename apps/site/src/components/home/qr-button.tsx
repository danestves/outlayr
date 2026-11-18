import { useIntlayer } from "react-intlayer";

import { showGetApp, warmGetApp } from "@/components/get-app";
import { DownloadQr } from "@/components/qr-code";

export function QrButton({ placement }: { placement: string }) {
    const { getApp } = useIntlayer("site");
    return (
        <button
            aria-haspopup="dialog"
            className="hz-qr"
            onClick={() => showGetApp(placement)}
            onFocus={warmGetApp}
            onPointerEnter={warmGetApp}
            type="button"
        >
            <span className="hz-qr-tile">
                <DownloadQr />
            </span>
            {getApp.scan}
        </button>
    );
}
