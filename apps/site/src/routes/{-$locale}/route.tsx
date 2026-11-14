import { isPublished, localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPathWithoutLocale, validatePrefix } from "intlayer";

export const Route = createFileRoute("/{-$locale}")({
    beforeLoad: ({ location, params }) => {
        const { isValid, localePrefix } = validatePrefix(params.locale);
        if (!isValid || localePrefix !== params.locale) {
            throw notFound();
        }
        if (!isPublished(getPathWithoutLocale(location.pathname), localeFromParam(params.locale))) {
            throw notFound();
        }
    },
});
