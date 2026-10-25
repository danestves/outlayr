import { getDocumentAsync } from "expo-document-picker";
import {
    launchCameraAsync,
    launchImageLibraryAsync,
    requestCameraPermissionsAsync,
    UIImagePickerPreferredAssetRepresentationMode,
} from "expo-image-picker";
import { useState } from "react";

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
import { persistAttachmentPdf, persistAttachmentPhoto, photoFiles } from "@/lib/photo-storage";
import type { AttachmentIntake } from "@/lib/photo-storage";

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

async function pickCamera(): Promise<Picked[] | "denied"> {
    const permission = await duringHandoff(requestCameraPermissionsAsync);
    if (!permission.granted) {
        return "denied";
    }
    const result = await duringHandoff(() => launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 }));
    return result.canceled ? [] : result.assets.map((asset) => ({ name: null, pdf: false, uri: asset.uri }));
}

async function pickLibrary(room: number): Promise<Picked[]> {
    const result = await duringHandoff(() =>
        launchImageLibraryAsync({
            allowsMultipleSelection: true,
            mediaTypes: ["images"],
            preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
            quality: 0.9,
            selectionLimit: room,
        })
    );
    return result.canceled ? [] : result.assets.map((asset) => ({ name: null, pdf: false, uri: asset.uri }));
}

async function pickFiles(): Promise<Picked[]> {
    const result = await duringHandoff(() =>
        getDocumentAsync({ copyToCacheDirectory: true, multiple: true, type: DOCUMENT_TYPES })
    );
    return result.canceled
        ? []
        : result.assets.map((asset) => ({
              name: asset.name,
              pdf: asset.mimeType === "application/pdf" || asset.name.toLowerCase().endsWith(".pdf"),
              uri: asset.uri,
          }));
}

async function intake(picked: Picked): Promise<AttachmentIntake> {
    try {
        return picked.pdf ? persistAttachmentPdf(picked.uri, picked.name) : await persistAttachmentPhoto(picked.uri);
    } catch {
        return { failure: "unreadable" };
    }
}

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

    const fail = (failure: Failure) => onFailure(t(FAILURE_KEYS[failure]));

    const add = async (pick: (room: number) => Promise<Picked[] | "denied">) => {
        const room = MAX_ATTACHMENTS - attachments.length;
        if (room <= 0) {
            fail("full");
            return;
        }
        const picked = await pick(room);
        if (picked === "denied") {
            fail("denied");
            return;
        }
        const taken = await Promise.all(picked.slice(0, room).map(intake));
        const added = taken.flatMap((one) =>
            "failure" in one ? [] : [{ id: null, imageKey: null, imageUri: one.imageUri, name: one.name }]
        );
        const failed = taken.find((one) => "failure" in one);
        if (failed !== undefined && "failure" in failed) {
            fail(failed.failure);
        }
        if (added.length > 0) {
            setAttachments((current) => [...current, ...added].slice(0, MAX_ATTACHMENTS));
            onEdit();
        }
    };

    const run = (pick: (room: number) => Promise<Picked[] | "denied">) => {
        add(pick).catch((error) => {
            console.error("Failed to attach a file", error);
            fail("unreadable");
        });
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
        previewFiles(local, start).catch((error) => {
            console.error("Failed to open the attachment", error);
            fail("open");
        });
    };

    return { attachments, menu, preview, remove };
}
