import { localeFromParam } from "@outlayr/shared/i18n";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { demoCast, plateCast } from "@/components/app-ui/cast";

export const getDemoCast = createServerFn({ method: "GET" })
    .validator((locale: string) => localeFromParam(locale))
    .handler(({ data }) => demoCast(getRequestHeader("cf-ipcountry") ?? null, data));

export const getPlateCast = createServerFn({ method: "GET" })
    .validator((locale: string) => localeFromParam(locale))
    .handler(({ data }) => plateCast(data));
