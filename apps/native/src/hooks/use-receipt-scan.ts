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
import { useRef, useState } from "react";

import { localIsoDate } from "@/domain/voice-entry";
import { trackCapturesWall } from "@/hooks/use-usage-limits";
import { duringHandoff } from "@/lib/app-handoff";
import { receiptScanTransport } from "@/lib/cloud-ai";
import type { ReceiptDraft, ReceiptScanFn, ScanOutcome, ScanRefusal, ScanRequest } from "@/lib/cloud-ai";
import { useLatest, useOnMount } from "@/lib/lifecycle";
import { launchPick, pendingPick } from "@/lib/pending-pick";
import type { PickOwner } from "@/lib/pending-pick";
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
    | { kind: "scanning"; more: readonly ScanPhoto[]; photo: ScanPhoto }
    | {
          context: Context;
          draft: Draft;
          image: ArrayBuffer;
          kind: "review";
          more: readonly ScanPhoto[];
          photo: ScanPhoto;
      }
    | { kind: "failed"; more: readonly ScanPhoto[]; photo: ScanPhoto | null; reason: ScanFailure };

type ScanSend<Draft> = (
    image: ArrayBuffer,
    today: string,
    more: readonly ArrayBuffer[]
) => Effect.Effect<ScanOutcome<Draft>, unknown>;

interface UseImageScanArgs<Context, Draft> {
    context: Context;
    initialPhotos?: readonly ScanPhoto[];
    onReview?: (draft: Draft) => void;
    owner: PickOwner;
    selectionLimit?: number;
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
    scan: (photo: ScanPhoto, more?: readonly ScanPhoto[]) => void;
    takePhoto: () => void;
}

const FAILURE_FOR = {
    invalid: "provider",
    invalidResponse: "provider",
    notConfigured: "notConfigured",
    notEntitled: "notEntitled",
    providerError: "provider",
    quotaExceeded: "quotaExceeded",
    rateLimited: "rateLimited",
    unauthenticated: "unauthenticated",
    unclear: "unclear",
} as const satisfies Record<ScanRefusal, ScanFailure>;

export function photosFrom(result: ImagePickerResult): ScanPhoto[] {
    return result.canceled ? [] : result.assets.map(({ height, uri, width }) => ({ height, uri, width }));
}

export function photoFrom(result: ImagePickerResult): ScanPhoto | null {
    return photosFrom(result)[0] ?? null;
}

export const libraryPick = (owner: PickOwner, selectionLimit = 1) =>
    launchPick(
        owner,
        Effect.tryPromise(() =>
            launchImageLibraryAsync({
                allowsEditing: false,
                allowsMultipleSelection: selectionLimit > 1,
                mediaTypes: ["images"],
                preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
                quality: 0.9,
                selectionLimit,
            })
        )
    );

interface ScanPorts<Context, Draft> {
    adopt: (result: ImagePickerResult, take: number) => void;
    beginScan: () => AbortController;
    isCurrent: (take: number) => boolean;
    latest: () => { context: Context; onReview?: (draft: Draft) => void; send: ScanSend<Draft> };
    owner: PickOwner;
    scanCommand: ReturnType<typeof timedCaptureCommand<ScanOutcome<Draft>>>;
    selectionLimit: number;
    setPhase: (phase: ScanPhase<Context, Draft>) => void;
}

const readPhoto = Effect.fn("ReceiptScan.read")(function* readPhoto<Context, Draft>(
    ports: ScanPorts<Context, Draft>,
    photo: ScanPhoto,
    more: readonly ScanPhoto[],
    take: number
) {
    ports.setPhase({ kind: "scanning", more, photo });
    const prepared = yield* Effect.all(
        [photo, ...more].map((each) =>
            entryMedia.prepareReceiptImage(each.uri).pipe(
                Effect.map((ready) => ready?.bytes ?? null),
                Effect.catchCause(() => Effect.succeed(null))
            )
        )
    );
    if (!ports.isCurrent(take)) {
        return;
    }
    const ready = prepared.filter((each) => each !== null);
    const [bytes, ...moreBytes] = ready;
    if (bytes === undefined || ready.length < prepared.length) {
        ports.setPhase({ kind: "failed", more, photo, reason: "unreadable" });
        return;
    }
    const { context: sentContext, send: sent } = ports.latest();
    const controller = ports.beginScan();
    const result = yield* fromCommand(ports.scanCommand, {
        call: sent(bytes, localIsoDate(new Date()), moreBytes),
        signal: controller.signal,
    }).pipe(Effect.exit);
    if (!ports.isCurrent(take)) {
        return;
    }
    if (Exit.isFailure(result)) {
        ports.setPhase({ kind: "failed", more, photo, reason: "offline" });
        return;
    }
    const settled = Option.getOrNull(result.value);
    if (settled === null) {
        ports.setPhase({ kind: "failed", more, photo, reason: "timeout" });
        return;
    }
    if (settled.ok) {
        ports.setPhase({ context: sentContext, draft: settled.draft, image: bytes, kind: "review", more, photo });
        ports.latest().onReview?.(settled.draft);
        return;
    }
    const reason = FAILURE_FOR[settled.reason];
    trackCapturesWall(reason);
    ports.setPhase({ kind: "failed", more, photo, reason });
});

const pickPhotoFromCamera = Effect.fn("ReceiptScan.pickFromCamera")(function* pickPhotoFromCamera<Context, Draft>(
    ports: ScanPorts<Context, Draft>,
    take: number
) {
    const permission = yield* duringHandoff(Effect.tryPromise(() => requestCameraPermissionsAsync())).pipe(Effect.exit);
    if (Exit.isFailure(permission)) {
        if (ports.isCurrent(take)) {
            ports.setPhase({ kind: "failed", more: [], photo: null, reason: "noCamera" });
        }
        return;
    }
    if (!ports.isCurrent(take)) {
        return;
    }
    if (!permission.value.granted) {
        ports.setPhase({ kind: "failed", more: [], photo: null, reason: "denied" });
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
            ports.setPhase({ kind: "failed", more: [], photo: null, reason: "noCamera" });
        }
        return;
    }
    ports.adopt(result.value, take);
});

const pickPhotoFromLibrary = Effect.fn("ReceiptScan.pickFromLibrary")(function* pickPhotoFromLibrary<Context, Draft>(
    ports: ScanPorts<Context, Draft>,
    take: number
) {
    const result = yield* libraryPick(ports.owner, ports.selectionLimit).pipe(Effect.exit);
    if (Exit.isFailure(result)) {
        if (ports.isCurrent(take)) {
            ports.setPhase({ kind: "failed", more: [], photo: null, reason: "unreadable" });
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
        send: (image, today) => api({ ...request, image, today }),
    });
}

export function useImageScan<Context, Draft>({
    context,
    initialPhotos = [],
    onReview,
    owner,
    selectionLimit = 1,
    send,
}: UseImageScanArgs<Context, Draft>): UseImageScanResult<Context, Draft> {
    const [[firstPhoto, ...firstMore]] = useState(initialPhotos);
    const [phase, setPhase] = useState<ScanPhase<Context, Draft>>(
        firstPhoto === undefined ? { kind: "idle" } : { kind: "scanning", more: firstMore, photo: firstPhoto }
    );
    const takeRef = useRef(0);
    const scanAbortRef = useRef<AbortController | null>(null);
    const [scanCommand] = useState(() =>
        timedCaptureCommand<ScanOutcome<Draft>>({ operation: "scan", timeout: RECEIPT_SCAN_TIMEOUT })
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
        const [photo, ...more] = photosFrom(result).slice(0, selectionLimit);
        if (photo === undefined) {
            setPhase({ kind: "idle" });
            return;
        }
        start(readPhoto(ports, photo, more, take));
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
        selectionLimit,
        setPhase,
    };
    // The pending-pick continuation outlives this render, so it adopts through the latest closure.
    const adoptLatest = useLatest(adopt);

    // Android can tear the app down under the picker: that launch never resolves, so its photo is picked up here.
    useOnMount(() => {
        const startMounted = () => {
            if (firstPhoto !== undefined) {
                start(readPhoto(ports, firstPhoto, firstMore, supersedeTake()));
            }
            const take = takeRef.current;
            start(
                pendingPick(owner).pipe(
                    Effect.flatMap((result) =>
                        Effect.sync(() => {
                            if (result !== null) {
                                adoptLatest.current(result, take);
                            }
                        })
                    ),
                    Effect.catchCause(() => Effect.void)
                )
            );
        };
        let disposed = false;
        queueMicrotask(() => {
            if (!disposed) {
                startMounted();
            }
        });
        return () => {
            disposed = true;
            supersedeTake();
        };
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

    const scan = (photo: ScanPhoto, more: readonly ScanPhoto[] = []) => {
        start(readPhoto(ports, photo, more, supersedeTake()));
    };

    const retry = () => {
        if (phase.kind === "failed" && phase.photo !== null) {
            scan(phase.photo, phase.more);
        }
    };

    const reset = () => {
        supersedeTake();
        setPhase({ kind: "idle" });
    };

    return { chooseFromLibrary, phase, reset, retry, scan, takePhoto };
}
