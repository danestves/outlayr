module.exports = {
    configPluginSourceType: "files",
    extraSources: [
        { filePath: "app-intents", reasons: ["appIntents"], type: "dir" },
        ...["tab-symbols", "toolbar-symbols", "menu-symbols"].map((dir) => ({
            filePath: `assets/${dir}`,
            reasons: ["nanoIconsSymbolSets"],
            type: "dir",
        })),
    ],
    fileHookTransform: (source, chunk) => {
        if (source.type !== "contents" || source.id !== "expoConfig") {
            return chunk;
        }
        const config = JSON.parse(chunk);
        delete config.extra?.whatsNew;
        delete config.extra?.whatsNewByLanguage;
        return JSON.stringify(config);
    },
};
