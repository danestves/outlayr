import { HTTPError, defineHandler } from "nitro/h3";

export default defineHandler(() => {
    throw new HTTPError({ headers: { "cache-control": "no-store" }, status: 404 });
});
