import "intlayer";

declare module "intlayer" {
    interface __DeclaredLocalesRegistry {
        en: 1;
        es: 1;
        pt: 1;
        fr: 1;
    }

    interface __RequiredLocalesRegistry {
        en: 1;
        es: 1;
    }

    interface __StrictModeRegistry {
        mode: "strict";
    }

    interface __RoutingRegistry {
        mode: "prefix-no-default";
        defaultLocale: "en";
    }
}
