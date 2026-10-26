module.exports = function babelConfig(api) {
    const isTest = api.cache.using(() => process.env.NODE_ENV === "test");
    return {
        env: {
            test: {
                plugins: ["./jest/import-meta-plugin.js"],
            },
        },
        plugins: [
            ["inline-import", { extensions: [".sql"] }],
            ...(isTest ? [] : [require("@varlock/expo-integration/babel-plugin")]),
        ],
        presets: ["babel-preset-expo"],
    };
};
