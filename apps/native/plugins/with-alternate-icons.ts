import { cp } from "node:fs/promises";
import path from "node:path";

import { IOSConfig, withDangerousMod, withXcodeProject } from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

const ALTERNATE_NAMES = "ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES";
const INCLUDE_ALL = "ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS";

// `INCLUDE_ALL` is what makes actool emit `CFBundleAlternateIcons`. Nothing writes those keys in source, so a
// missing alternate only shows up as `setAlternateIconName` rejecting the name at runtime.
const withAlternateIcons: ConfigPlugin<{ icons: string[] }> = (config, { icons }) => {
    const names = icons.map((icon) => path.basename(icon, ".icon"));

    const withCopiedBundles = withDangerousMod(config, [
        "ios",
        async (dangerousConfig) => {
            const { platformProjectRoot, projectName, projectRoot } = dangerousConfig.modRequest;
            if (!projectName) {
                throw new Error("withAlternateIcons: no iOS project name.");
            }
            await Promise.all(
                icons.map((icon) =>
                    cp(path.join(projectRoot, icon), path.join(platformProjectRoot, projectName, path.basename(icon)), {
                        recursive: true,
                    })
                )
            );
            return dangerousConfig;
        },
    ]);

    return withXcodeProject(withCopiedBundles, (xcodeConfig) => {
        const { projectName } = xcodeConfig.modRequest;
        if (!projectName) {
            throw new Error("withAlternateIcons: no iOS project name.");
        }
        for (const name of names) {
            IOSConfig.XcodeUtils.addResourceFileToGroup({
                filepath: `${projectName}/${name}.icon`,
                groupName: projectName,
                isBuildFile: true,
                project: xcodeConfig.modResults,
            });
        }
        if (!xcodeConfig.modResults.pbxTargetByName(projectName)) {
            throw new Error(
                `withAlternateIcons: no native target named "${projectName}". Expo prebuild names the app target after the project; update this plugin if that changed.`
            );
        }
        // Target-scoped: project-wide it lands on the widget and intents extensions, and actool fails on these names.
        xcodeConfig.modResults.updateBuildProperty(ALTERNATE_NAMES, `"${names.join(" ")}"`, undefined, projectName);
        xcodeConfig.modResults.updateBuildProperty(INCLUDE_ALL, "YES", undefined, projectName);
        return xcodeConfig;
    });
};

export default withAlternateIcons;
