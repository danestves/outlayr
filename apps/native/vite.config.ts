export default {
    run: {
        tasks: {
            "i18n:build": {
                command: "intlayer build",
                cache: {
                    // The generated dictionaries are the output; making them inputs would fingerprint
                    // the task on what it writes. The cache and tmp dirs are intlayer-internal and
                    // churn on every run, so they stay out of both lists.
                    input: [{ auto: true }, "!.intlayer/**"],
                    output: [{ auto: true }, "!.intlayer/cache/**", "!.intlayer/tmp/**"],
                },
            },
        },
    },
};
