import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { withDangerousMod } from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

const KEEP_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@drawable/nano_*" />
`;

const withAndroidKeepNanoIcons: ConfigPlugin = (config) =>
    withDangerousMod(config, [
        "android",
        async (dangerousConfig) => {
            const raw = path.join(dangerousConfig.modRequest.platformProjectRoot, "app/src/main/res/raw");
            await mkdir(raw, { recursive: true });
            await writeFile(path.join(raw, "keep_nano_icons.xml"), KEEP_XML);
            return dangerousConfig;
        },
    ]);

export default withAndroidKeepNanoIcons;
