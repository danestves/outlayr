import * as Effect from "effect/Effect";
import { launchImageLibraryAsync, UIImagePickerPreferredAssetRepresentationMode } from "expo-image-picker";

import { PLAN_SCREENSHOT_LIMIT } from "@/domain/installment-scan";
import { launchPick } from "@/lib/pending-pick";

import { createCommand } from "./atom-command";

export const pickInstallmentPhotoCommand = createCommand({
    execute: (_input: undefined) =>
        launchPick(
            "installment-scan",
            Effect.tryPromise(() =>
                launchImageLibraryAsync({
                    allowsEditing: false,
                    allowsMultipleSelection: true,
                    mediaTypes: ["images"],
                    preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
                    quality: 0.9,
                    selectionLimit: PLAN_SCREENSHOT_LIMIT,
                })
            )
        ),
    label: "installment-flow:pick-photo",
});
