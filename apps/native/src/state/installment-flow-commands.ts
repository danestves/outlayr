import * as Effect from "effect/Effect";
import { launchImageLibraryAsync, UIImagePickerPreferredAssetRepresentationMode } from "expo-image-picker";

import { launchPick } from "@/lib/pending-pick";

import { createCommand } from "./atom-command";

export const pickInstallmentPhotoCommand = createCommand({
    execute: (_input: undefined) =>
        launchPick(
            "installment-scan",
            Effect.tryPromise(() =>
                launchImageLibraryAsync({
                    allowsEditing: false,
                    mediaTypes: ["images"],
                    preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
                    quality: 0.9,
                })
            )
        ),
    label: "installment-flow:pick-photo",
});
