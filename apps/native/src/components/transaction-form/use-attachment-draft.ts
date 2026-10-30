import * as Effect from "effect/Effect";
import { getDocumentAsync } from "expo-document-picker";
import {
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    UIImagePickerPreferredAssetRepresentationMode,
} from "expo-image-picker";
import { useState } from "react";
import { Keyboard } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { attachmentKind, attachmentsForQuery, MAX_ATTACHMENTS } from "@/data/attachments-core";
import type { AttachmentDraft } from "@/data/attachments-core";
import { photoUriFor } from "@/data/photo-store-core";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import type { TranslatableKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { duringHandoff } from "@/lib/app-handoff";
import { previewFiles } from "@/lib/file-preview";
import { photoFiles } from "@/lib/photo-storage";
import type { AttachmentIntake } from "@/lib/photo-storage";
import { entryMedia, voidFlowCommand } from "@/state/entry-commands";
import { useAtomCommand } from "@/state/use-atom-command";

import type { SentenceVerb } from "./sentence/fact-glyphs";

const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

type Failure = "denied" | "full" | "open" | "tooLarge" | "unreadable";

const FAILURE_KEYS = {
    denied: "transaction.attachments.failed.denied",
    full: "transaction.attachments.failed.full",
    open: "transaction.attachments.failed.open",
    tooLarge: "transaction.attachments.failed.tooLarge",
    unreadable: "transaction.attachments.failed.unreadable",
} as const satisfies Record<Failure, TranslatableKey>;

interface Picked {
    name: string | null;
    pdf: boolean;
    uri: string;
}

const pickCamera = Effect.fn("AttachmentDraft.pickCamera")(function* pickCamera() {
    const permission = yield* duringHandoff(Effect.tryPromise(() => requestCameraPermissionsAsync()));
    if (!permission.granted) {
        return "denied" as const;
    }
    const result = yield* duringHandoff(
        Effect.tryPromise(() => launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 }))
    );
    return result.canceled ? [] : result.assets.map((asset): Picked => ({ name: null, pdf: false, uri: asset.uri }));
});

const pickLibrary = Effect.fn("AttachmentDraft.pickLibrary")(function* pickLibrary(room: number) {
    const result = yield* duringHandoff(
        Effect.tryPromise(() =>
            launchImageLibraryAsync({
                allowsMultipleSelection: true,
                mediaTypes: ["images"],
                preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
                quality: 0.9,
                selectionLimit: room,
            })
        )
    );
    return result.canceled ? [] : result.assets.map((asset): Picked => ({ name: null, pdf: false, uri: asset.uri }));
});

const pickFiles = Effect.fn("AttachmentDraft.pickFiles")(function* pickFiles() {
    const result = yield* duringHandoff(
        Effect.tryPromise(() => getDocumentAsync({ copyToCacheDirectory: true, multiple: true, type: DOCUMENT_TYPES }))
    );
    return result.canceled
        ? []
        : result.assets.map((asset): Picked => ({
              name: asset.name,
              pdf: asset.mimeType === "application/pdf" || asset.name.toLowerCase().endsWith(".pdf"),
              uri: asset.uri,
          }));
});

type PickAttachments = (room: number) => Effect.Effect<Picked[] | "denied", unknown>;

export const intake = Effect.fn("AttachmentDraft.intake")(function* intake(picked: Picked) {
    const stored: AttachmentIntake = yield* (
        picked.pdf
            ? entryMedia.persistAttachmentPdf(picked.uri, picked.name)
            : entryMedia.persistAttachmentPhoto(picked.uri)
    ).pipe(Effect.catchCause(() => Effect.succeed<AttachmentIntake>({ failure: "unreadable" })));
    return stored;
});

const addAttachments = Effect.fn("AttachmentDraft.add")(function* addAttachments(
    held: number,
    pick: PickAttachments,
    done: { onAdded: (added: AttachmentDraft[]) => void; onFailed: (failure: Failure) => void }
) {
    const room = MAX_ATTACHMENTS - held;
    if (room <= 0) {
        done.onFailed("full");
        return;
    }
    const picked = yield* pick(room);
    if (picked === "denied") {
        done.onFailed("denied");
        return;
    }
    const taken = yield* Effect.all(picked.slice(0, room).map(intake), { concurrency: "unbounded" });
    const added = taken.flatMap((one) =>
        "failure" in one ? [] : [{ id: null, imageKey: null, imageUri: one.imageUri, name: one.name }]
    );
    const failed = taken.find((one) => "failure" in one);
    if (failed !== undefined && "failure" in failed) {
        done.onFailed(failed.failure);
    }
    if (added.length > 0) {
        done.onAdded(added);
    }
});

interface AttachmentDraftArgs {
    db: Database;
    initial: Transaction | undefined;
    mode: "create" | "edit";
    onEdit: () => void;
    onFailure: (message: string) => void;
    restored: AttachmentDraft[] | undefined;
    seeded: string | undefined;
}

export function useAttachmentDraft({ db, initial, mode, onEdit, onFailure, restored, seeded }: AttachmentDraftArgs) {
    const t = useTranslation();
    const [attachments, setAttachments] = useState<AttachmentDraft[]>(() => {
        if (restored !== undefined) {
            return restored;
        }
        if (mode === "edit" && initial !== undefined) {
            return attachmentsForQuery(db, initial.id).all();
        }
        return seeded === undefined
            ? []
            : [{ id: null, imageKey: null, imageUri: photoUriFor(photoFiles.directoryUri, seeded), name: null }];
    });

    const runFlow = useAtomCommand(voidFlowCommand);
    const fail = (failure: Failure) => onFailure(t(FAILURE_KEYS[failure]));

    const run = (pick: PickAttachments) => {
        void runFlow(
            addAttachments(attachments.length, pick, {
                onAdded: (added) => {
                    setAttachments((current) => [...current, ...added].slice(0, MAX_ATTACHMENTS));
                    onEdit();
                },
                onFailed: fail,
            }).pipe(
                Effect.catchCause((cause) =>
                    Effect.logError("Failed to attach a file", cause).pipe(
                        Effect.andThen(Effect.sync(() => fail("unreadable")))
                    )
                )
            )
        );
    };

    const menu: ActionMenuItem[] = [
        {
            icon: "camera",
            id: "camera",
            label: t("transaction.attachments.add.camera"),
            onPress: () => run(pickCamera),
        },
        {
            icon: "photo.on.rectangle",
            id: "library",
            label: t("transaction.attachments.add.library"),
            onPress: () => run(pickLibrary),
        },
        { icon: "doc", id: "files", label: t("transaction.attachments.add.files"), onPress: () => run(pickFiles) },
    ];

    const remove = (index: number) => {
        setAttachments((current) => current.filter((_draft, at) => at !== index));
        onEdit();
    };

    const preview = (index: number) => {
        const local = attachments.flatMap((draft, at) =>
            draft.imageUri === null
                ? []
                : [
                      {
                          at,
                          pdf: attachmentKind(draft) === "pdf",
                          title: draft.name ?? t("transaction.attachments.photo"),
                          uri: draft.imageUri,
                      },
                  ]
        );
        const start = local.findIndex((file) => file.at === index);
        if (start === -1) {
            return;
        }
        void runFlow(
            previewFiles(local, start).pipe(
                Effect.catchCause((cause) =>
                    Effect.logError("Failed to open the attachment", cause).pipe(
                        Effect.andThen(Effect.sync(() => fail("open")))
                    )
                )
            )
        );
    };

    const verb: SentenceVerb = {
        accessibilityLabel: attachments.length === 0 ? t("transaction.attachments.add") : undefined,
        active: attachments.length > 0,
        key: "attach",
        label:
            attachments.length === 0
                ? t("transaction.sentence.add.attach")
                : t("transaction.sentence.set.attach", { count: attachments.length }),
        menu,
        onPress: Keyboard.dismiss,
    };

    return { attachments, menu, preview, remove, verb };
}
