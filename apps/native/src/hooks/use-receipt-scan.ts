import {
    CameraType,
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    UIImagePickerPreferredAssetRepresentationMode,
} from "expo-image-picker";
import type { ImagePickerResult } from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";

import { localIsoDate } from "@/domain/voice-entry";
import { duringHandoff } from "@/lib/app-handoff";
import { receiptScanTransport } from "@/lib/convex";
import type { ReceiptDraft, ReceiptScanFn, ScanRequest } from "@/lib/convex";
import { launchPick, pendingPick } from "@/lib/pending-pick";
import { prepareReceiptImage } from "@/lib/receipt-image";
import { withTimeout } from "@/lib/with-timeout";

const REQUEST_TIMEOUT_MS = 30_000;

export type ScanFailure =
    | "denied"
    | "noCamera"
    | "unreadable"
    | "unclear"
    | "offline"
    | "timeout"
    | "notConfigured"
    | "unauthenticated"
    | "rateLimited"
    | "notEntitled"
    | "quotaExceeded"
    | "provider";

type ScanSource = "camera" | "library";

export interface ScanPhoto {
    height: number;
    uri: string;
    width: number;
}

type ScanPhase<Context = unknown> =
    | { kind: "idle" }
    | { kind: "picking"; source: ScanSource }
    | { kind: "scanning"; photo: ScanPhoto }
    | { context: Context; draft: ReceiptDraft; kind: "review"; photo: ScanPhoto }
    | { kind: "failed"; photo: ScanPhoto | null; reason: ScanFailure };

interface UseReceiptScanArgs<Context> {
    context: Context;
    request: Omit<ScanRequest, "image" | "today">;
    transport?: ReceiptScanFn;
}

export interface UseReceiptScanResult<Context> {
    chooseFromLibrary: () => void;
    phase: ScanPhase<Context>;
    reset: () => void;
    retry: () => void;
    takePhoto: () => void;
}

function failureFor(status: string): ScanFailure {
    switch (status) {
        case "unclear": {
            return "unclear";
        }
        case "notConfigured": {
            return "notConfigured";
        }
        case "unauthenticated": {
            return "unauthenticated";
        }
        case "rateLimited": {
            return "rateLimited";
        }
        case "notEntitled": {
            return "notEntitled";
        }
        case "quotaExceeded": {
            return "quotaExceeded";
        }
        default: {
            return "provider";
        }
    }
}

export function useReceiptScan<Context>({
    context,
    request,
    transport,
}: UseReceiptScanArgs<Context>): UseReceiptScanResult<Context> {
    const [phase, setPhase] = useState<ScanPhase<Context>>({ kind: "idle" });
    const takeRef = useRef(0);
    const [api] = useState(() => transport ?? receiptScanTransport());
    const sentRef = useRef({ context, request });
    useEffect(() => {
        sentRef.current = { context, request };
    });

    const read = useCallback(
        async (photo: ScanPhoto, take: number) => {
            setPhase({ kind: "scanning", photo });
            let prepared: Awaited<ReturnType<typeof prepareReceiptImage>>;
            try {
                prepared = await prepareReceiptImage(photo.uri);
            } catch {
                prepared = null;
            }
            if (take !== takeRef.current) {
                return;
            }
            if (prepared === null) {
                setPhase({ kind: "failed", photo, reason: "unreadable" });
                return;
            }
            const { context: sentContext, request: sent } = sentRef.current;
            try {
                const settled = await withTimeout(
                    api({ ...sent, image: prepared.bytes, today: localIsoDate(new Date()) }),
                    REQUEST_TIMEOUT_MS,
                    "timeout" as const
                );
                if (take !== takeRef.current) {
                    return;
                }
                if (settled === "timeout") {
                    setPhase({ kind: "failed", photo, reason: "timeout" });
                    return;
                }
                if (settled.status === "ok") {
                    const { receipt } = settled;
                    if (receipt !== null) {
                        setPhase({ context: sentContext, draft: receipt, kind: "review", photo });
                        return;
                    }
                }
                setPhase({ kind: "failed", photo, reason: failureFor(settled.status) });
            } catch {
                if (take === takeRef.current) {
                    setPhase({ kind: "failed", photo, reason: "offline" });
                }
            }
        },
        [api]
    );

    const adopt = useCallback(
        (result: ImagePickerResult, take: number) => {
            if (take !== takeRef.current) {
                return;
            }
            const asset = result.canceled ? undefined : result.assets[0];
            if (asset === undefined) {
                setPhase({ kind: "idle" });
                return;
            }
            void read({ height: asset.height, uri: asset.uri, width: asset.width }, take);
        },
        [read]
    );

    // Android can tear the app down under the picker: that launch never resolves, so its photo is picked up here.
    useEffect(() => {
        const take = takeRef.current;
        pendingPick("receipt-scan")
            .then((result) => {
                if (result !== null) {
                    adopt(result, take);
                }
            })
            .catch(() => undefined);
    }, [adopt]);

    const takePhoto = useCallback(() => {
        takeRef.current += 1;
        const take = takeRef.current;
        setPhase({ kind: "picking", source: "camera" });
        void (async () => {
            let permission: Awaited<ReturnType<typeof requestCameraPermissionsAsync>>;
            try {
                permission = await duringHandoff(requestCameraPermissionsAsync);
            } catch {
                if (take === takeRef.current) {
                    setPhase({ kind: "failed", photo: null, reason: "noCamera" });
                }
                return;
            }
            if (take !== takeRef.current) {
                return;
            }
            if (!permission.granted) {
                setPhase({ kind: "failed", photo: null, reason: "denied" });
                return;
            }
            try {
                const result = await launchPick("receipt-scan", () =>
                    launchCameraAsync({
                        cameraType: CameraType.back,
                        mediaTypes: ["images"],
                        quality: 0.9,
                    })
                );
                adopt(result, take);
            } catch {
                // On iOS the launch only rejects on a device with no camera (the simulator, or a broken lens).
                if (take === takeRef.current) {
                    setPhase({ kind: "failed", photo: null, reason: "noCamera" });
                }
            }
        })();
    }, [adopt]);

    const chooseFromLibrary = useCallback(() => {
        takeRef.current += 1;
        const take = takeRef.current;
        setPhase({ kind: "picking", source: "library" });
        void (async () => {
            try {
                const result = await launchPick("receipt-scan", () =>
                    launchImageLibraryAsync({
                        allowsEditing: false,
                        mediaTypes: ["images"],
                        preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
                        quality: 0.9,
                    })
                );
                adopt(result, take);
            } catch {
                if (take === takeRef.current) {
                    setPhase({ kind: "failed", photo: null, reason: "unreadable" });
                }
            }
        })();
    }, [adopt]);

    const retry = useCallback(() => {
        if (phase.kind !== "failed" || phase.photo === null) {
            return;
        }
        takeRef.current += 1;
        void read(phase.photo, takeRef.current);
    }, [phase, read]);

    const reset = useCallback(() => {
        takeRef.current += 1;
        setPhase({ kind: "idle" });
    }, []);

    useEffect(
        () => () => {
            takeRef.current += 1;
        },
        []
    );

    return { chooseFromLibrary, phase, reset, retry, takePhoto };
}
