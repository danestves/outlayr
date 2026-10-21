import { AndroidConfig, withAndroidManifest } from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

type Manifest = AndroidConfig.Manifest.AndroidManifest["manifest"];

const WRITE_EXTERNAL_STORAGE = "android.permission.WRITE_EXTERNAL_STORAGE";

// expo-image-picker's camera needs WRITE_EXTERNAL_STORAGE through Android 9; the template declares it up to API 32.
const LAST_SDK_NEEDING_WRITE = "28";

// Play infers these as required from CAMERA and RECORD_AUDIO, which hides the app from Chromebooks.
const OPTIONAL_FEATURES = [
    "android.hardware.camera",
    "android.hardware.camera.autofocus",
    "android.hardware.microphone",
];

const withAndroidCapture: ConfigPlugin = (config) =>
    withAndroidManifest(config, (manifestConfig) => {
        const { manifest } = AndroidConfig.Manifest.ensureToolsAvailable(manifestConfig.modResults);
        capWriteExternalStorage(manifest);
        declareOptionalFeatures(manifest);
        return manifestConfig;
    });

function capWriteExternalStorage(manifest: Manifest): void {
    const cap = { "android:maxSdkVersion": LAST_SDK_NEEDING_WRITE, "tools:replace": "android:maxSdkVersion" };
    const permissions = manifest["uses-permission"] ?? [];
    const declared = permissions.find((permission) => permission.$["android:name"] === WRITE_EXTERNAL_STORAGE);
    if (declared) {
        Object.assign(declared.$, cap);
    } else {
        permissions.push({ $: { "android:name": WRITE_EXTERNAL_STORAGE, ...cap } });
    }
    manifest["uses-permission"] = permissions;
}

function declareOptionalFeatures(manifest: Manifest): void {
    const features = (manifest["uses-feature"] ?? []).filter(
        (feature) => !OPTIONAL_FEATURES.includes(feature.$["android:name"])
    );
    for (const name of OPTIONAL_FEATURES) {
        features.push({ $: { "android:name": name, "android:required": "false" } });
    }
    manifest["uses-feature"] = features;
}

export default withAndroidCapture;
