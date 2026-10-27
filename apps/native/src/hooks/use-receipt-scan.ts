import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import {
    CameraType,
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    UIImagePickerPreferredAssetRepresentationMode,
} from "expo-image-picker";
import type { ImagePickerResult } from "expo-image-picker";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { localIsoDate } from "@/domain/voice-entry";
import { duringHandoff } from "@/lib/app-handoff";
import { receiptScanTransport } from "@/lib/convex";
import type { ReceiptDraft, ReceiptScanFn, ScanRequest } from "@/lib/convex";
import { launchPick, pendingPick } from "@/lib/pending-pick";
import type { PickOwner } from "@/lib/pending-pick";
import { prepareReceiptImage } from "@/lib/receipt-image";
import { SILENT } from "@/state/atom-command";
import { RECEIPT_SCAN_TIMEOUT, timedCaptureCommand } from "@/state/capture-commands";
import { useAtomCommand } from "@/state/use-atom-command";

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

type ScanPhase<Context, Draft> =
    | { kind: "idle" }
    | { kind: "picking"; source: ScanSource }
    | { kind: "scanning"; photo: ScanPhoto }
    | { context: Context; draft: Draft; image: ArrayBuffer; kind: "review"; photo: ScanPhoto }
    | { kind: "failed"; photo: ScanPhoto | null; reason: ScanFailure };

interface ScanReply<Draft> {
    draft: Draft | null;
    status: string;
}

type ScanSend<Draft> = (image: ArrayBuffer, today: string) => Effect.Effect<ScanReply<Draft>, unknown>;

interface UseImageScanArgs<Context, Draft> {
    context: Context;
    owner: PickOwner;
    send: ScanSend<Draft>;
}

interface UseReceiptScanArgs<Context> {
    context: Context;
    request: Omit<ScanRequest, "image" | "today">;
    transport?: ReceiptScanFn;
}

export interface UseImageScanResult<Context, Draft> {
    chooseFromLibrary: () => void;
    phase: ScanPhase<Context, Draft>;
    reset: () => void;
    retry: () => void;
    scan: (photo: ScanPhoto) => void;
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

export function photoFrom(result: ImagePickerResult): ScanPhoto | null {
    const asset = result.canceled ? undefined : result.assets[0];
    return asset === undefined ? null : { height: asset.height, uri: asset.uri, width: asset.width };
}

export function pickFromLibrary(owner: PickOwner): Promise<ImagePickerResult> {
    return launchPick(owner, () =>
        launchImageLibraryAsync({
            allowsEditing: false,
            mediaTypes: ["images"],
            preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
            quality: 0.9,
        })
    );
}

export function useReceiptScan<Context>({ context, request, transport }: UseReceiptScanArgs<Context>) {
    const [api] = useState(() => transport ?? receiptScanTransport());
    return useImageScan<Context, ReceiptDraft>({
        context,
        owner: "receipt-scan",
        send: (image, today) =>
            api({ ...request, image, today }).pipe(Effect.map(({ receipt, status }) => ({ draft: receipt, status }))),
    });
}

export function useImageScan<Context, Draft>({
    context,
    owner,
    send,
}: UseImageScanArgs<Context, Draft>): UseImageScanResult<Context, Draft> {
    const [phase, setPhase] = useState<ScanPhase<Context, Draft>>({ kind: "idle" });
    const takeRef = useRef(0);
    const scanAbortRef = useRef<AbortController | null>(null);
    const [scanCommand] = useState(() =>
        timedCaptureCommand<ScanReply<Draft>>({ operation: "scan", timeout: RECEIPT_SCAN_TIMEOUT })
    );
    const runScan = useAtomCommand(scanCommand, SILENT);
    const sentRef = useRef({ context, send });
    const supersedeTake = () => {
        takeRef.current += 1;
        scanAbortRef.current?.abort();
        scanAbortRef.current = null;
        return takeRef.current;
    };
    useEffect(() => {
        sentRef.current = { context, send };
    });

    const read = async (photo: ScanPhoto, take: number) => {
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
        const { context: sentContext, send: sent } = sentRef.current;
        const { bytes } = prepared;
        const controller = new AbortController();
        scanAbortRef.current = controller;
        const result = await runScan({
            call: sent(bytes, localIsoDate(new Date())),
            signal: controller.signal,
        });
        if (take !== takeRef.current) {
            return;
        }
        if (AsyncResult.isFailure(result)) {
            setPhase({ kind: "failed", photo, reason: "offline" });
            return;
        }
        const settled = Option.getOrNull(result.value);
        if (settled === null) {
            setPhase({ kind: "failed", photo, reason: "timeout" });
            return;
        }
        if (settled.status === "ok" && settled.draft !== null) {
            setPhase({ context: sentContext, draft: settled.draft, image: bytes, kind: "review", photo });
            return;
        }
        setPhase({ kind: "failed", photo, reason: failureFor(settled.status) });
    };

    const adopt = (result: ImagePickerResult, take: number) => {
        if (take !== takeRef.current) {
            return;
        }
        const photo = photoFrom(result);
        if (photo === null) {
            setPhase({ kind: "idle" });
            return;
        }
        void read(photo, take);
    };

    // Android can tear the app down under the picker: that launch never resolves, so its photo is picked up here.
    const adoptPending = useEffectEvent((result: ImagePickerResult, take: number) => adopt(result, take));
    useEffect(() => {
        const take = takeRef.current;
        pendingPick(owner)
            .then((result) => {
                if (result !== null) {
                    adoptPending(result, take);
                }
            })
            .catch(() => undefined);
    }, [owner]);

    const takePhoto = () => {
        const take = supersedeTake();
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
                const result = await launchPick(owner, () =>
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
    };

    const chooseFromLibrary = () => {
        const take = supersedeTake();
        setPhase({ kind: "picking", source: "library" });
        void (async () => {
            try {
                adopt(await pickFromLibrary(owner), take);
            } catch {
                if (take === takeRef.current) {
                    setPhase({ kind: "failed", photo: null, reason: "unreadable" });
                }
            }
        })();
    };

    const scan = (photo: ScanPhoto) => {
        void read(photo, supersedeTake());
    };

    const retry = () => {
        if (phase.kind === "failed" && phase.photo !== null) {
            scan(phase.photo);
        }
    };

    const reset = () => {
        supersedeTake();
        setPhase({ kind: "idle" });
    };

    const endScans = useEffectEvent(() => supersedeTake());
    useEffect(
        () => () => {
            endScans();
        },
        []
    );

    return { chooseFromLibrary, phase, reset, retry, scan, takePhoto };
}
