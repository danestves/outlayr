import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
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
import { trackCapturesWall } from "@/hooks/use-usage-limits";
import { duringHandoff } from "@/lib/app-handoff";
import { receiptScanTransport } from "@/lib/convex";
import type { ReceiptDraft, ReceiptScanFn, ScanRequest } from "@/lib/convex";
import { launchPick, pendingPick } from "@/lib/pending-pick";
import type { PickOwner } from "@/lib/pending-pick";
import { useLatest } from "@/lib/use-latest";
import { RECEIPT_SCAN_TIMEOUT, timedCaptureCommand } from "@/state/capture-commands";
import { entryMedia, fromCommand, voidFlowCommand } from "@/state/entry-commands";
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
    initialPhoto?: ScanPhoto | null;
    onReview?: (draft: Draft) => void;
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

const libraryPick = (owner: PickOwner) =>
    launchPick(
        owner,
        Effect.tryPromise(() =>
            launchImageLibraryAsync({
                allowsEditing: false,
                mediaTypes: ["images"],
                preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
                quality: 0.9,
            })
        )
    );

interface ScanPorts<Context, Draft> {
    adopt: (result: ImagePickerResult, take: number) => void;
    beginScan: () => AbortController;
    isCurrent: (take: number) => boolean;
    latest: () => { context: Context; onReview?: (draft: Draft) => void; send: ScanSend<Draft> };
    owner: PickOwner;
    scanCommand: ReturnType<typeof timedCaptureCommand<ScanReply<Draft>>>;
    setPhase: (phase: ScanPhase<Context, Draft>) => void;
}

const readPhoto = Effect.fn("ReceiptScan.read")(function* readPhoto<Context, Draft>(
    ports: ScanPorts<Context, Draft>,
    photo: ScanPhoto,
    take: number
) {
    ports.setPhase({ kind: "scanning", photo });
    const prepared = yield* entryMedia
        .prepareReceiptImage(photo.uri)
        .pipe(Effect.catchCause(() => Effect.succeed(null)));
    if (!ports.isCurrent(take)) {
        return;
    }
    if (prepared === null) {
        ports.setPhase({ kind: "failed", photo, reason: "unreadable" });
        return;
    }
    const { context: sentContext, send: sent } = ports.latest();
    const { bytes } = prepared;
    const controller = ports.beginScan();
    const result = yield* fromCommand(ports.scanCommand, {
        call: sent(bytes, localIsoDate(new Date())),
        signal: controller.signal,
    }).pipe(Effect.exit);
    if (!ports.isCurrent(take)) {
        return;
    }
    if (Exit.isFailure(result)) {
        ports.setPhase({ kind: "failed", photo, reason: "offline" });
        return;
    }
    const settled = Option.getOrNull(result.value);
    if (settled === null) {
        ports.setPhase({ kind: "failed", photo, reason: "timeout" });
        return;
    }
    if (settled.status === "ok" && settled.draft !== null) {
        ports.setPhase({ context: sentContext, draft: settled.draft, image: bytes, kind: "review", photo });
        ports.latest().onReview?.(settled.draft);
        return;
    }
    const reason = failureFor(settled.status);
    trackCapturesWall(reason);
    ports.setPhase({ kind: "failed", photo, reason });
});

const pickPhotoFromCamera = Effect.fn("ReceiptScan.pickFromCamera")(function* pickPhotoFromCamera<Context, Draft>(
    ports: ScanPorts<Context, Draft>,
    take: number
) {
    const permission = yield* duringHandoff(Effect.tryPromise(() => requestCameraPermissionsAsync())).pipe(Effect.exit);
    if (Exit.isFailure(permission)) {
        if (ports.isCurrent(take)) {
            ports.setPhase({ kind: "failed", photo: null, reason: "noCamera" });
        }
        return;
    }
    if (!ports.isCurrent(take)) {
        return;
    }
    if (!permission.value.granted) {
        ports.setPhase({ kind: "failed", photo: null, reason: "denied" });
        return;
    }
    const result = yield* launchPick(
        ports.owner,
        Effect.tryPromise(() =>
            launchCameraAsync({
                cameraType: CameraType.back,
                mediaTypes: ["images"],
                quality: 0.9,
            })
        )
    ).pipe(Effect.exit);
    if (Exit.isFailure(result)) {
        // On iOS the launch only rejects on a device with no camera (the simulator, or a broken lens).
        if (ports.isCurrent(take)) {
            ports.setPhase({ kind: "failed", photo: null, reason: "noCamera" });
        }
        return;
    }
    ports.adopt(result.value, take);
});

const pickPhotoFromLibrary = Effect.fn("ReceiptScan.pickFromLibrary")(function* pickPhotoFromLibrary<Context, Draft>(
    ports: ScanPorts<Context, Draft>,
    take: number
) {
    const result = yield* libraryPick(ports.owner).pipe(Effect.exit);
    if (Exit.isFailure(result)) {
        if (ports.isCurrent(take)) {
            ports.setPhase({ kind: "failed", photo: null, reason: "unreadable" });
        }
        return;
    }
    ports.adopt(result.value, take);
});

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
    initialPhoto = null,
    onReview,
    owner,
    send,
}: UseImageScanArgs<Context, Draft>): UseImageScanResult<Context, Draft> {
    const [firstPhoto] = useState(initialPhoto);
    const [phase, setPhase] = useState<ScanPhase<Context, Draft>>(
        firstPhoto === null ? { kind: "idle" } : { kind: "scanning", photo: firstPhoto }
    );
    const takeRef = useRef(0);
    const scanAbortRef = useRef<AbortController | null>(null);
    const [scanCommand] = useState(() =>
        timedCaptureCommand<ScanReply<Draft>>({ operation: "scan", timeout: RECEIPT_SCAN_TIMEOUT })
    );
    const runFlow = useAtomCommand(voidFlowCommand);
    const start = (flow: Effect.Effect<void, never>) => {
        void runFlow(flow);
    };
    const latest = useLatest({ context, onReview, send });
    const supersedeTake = () => {
        takeRef.current += 1;
        scanAbortRef.current?.abort();
        scanAbortRef.current = null;
        return takeRef.current;
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
        start(readPhoto(ports, photo, take));
    };

    const ports: ScanPorts<Context, Draft> = {
        adopt,
        beginScan: () => {
            const controller = new AbortController();
            scanAbortRef.current = controller;
            return controller;
        },
        isCurrent: (take) => take === takeRef.current,
        latest: () => latest.current,
        owner,
        scanCommand,
        setPhase,
    };

    // Android can tear the app down under the picker: that launch never resolves, so its photo is picked up here.
    const adoptPending = useEffectEvent((result: ImagePickerResult, take: number) => adopt(result, take));
    const startMounted = useEffectEvent(() => {
        if (firstPhoto !== null) {
            start(readPhoto(ports, firstPhoto, supersedeTake()));
        }
        const take = takeRef.current;
        start(
            pendingPick(owner).pipe(
                Effect.flatMap((result) =>
                    Effect.sync(() => {
                        if (result !== null) {
                            adoptPending(result, take);
                        }
                    })
                ),
                Effect.catchCause(() => Effect.void)
            )
        );
    });

    const takePhoto = () => {
        const take = supersedeTake();
        setPhase({ kind: "picking", source: "camera" });
        start(pickPhotoFromCamera(ports, take));
    };

    const chooseFromLibrary = () => {
        const take = supersedeTake();
        setPhase({ kind: "picking", source: "library" });
        start(pickPhotoFromLibrary(ports, take));
    };

    const scan = (photo: ScanPhoto) => {
        start(readPhoto(ports, photo, supersedeTake()));
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
    // oxlint-disable-next-line outlayr/react-effect-budget -- scans a handed-off photo or adopts the picker's pending result when mounted, and aborts the scan in flight when unmounted
    useEffect(() => {
        let disposed = false;
        queueMicrotask(() => {
            if (!disposed) {
                startMounted();
            }
        });
        return () => {
            disposed = true;
            endScans();
        };
    }, []);

    return { chooseFromLibrary, phase, reset, retry, scan, takePhoto };
}
