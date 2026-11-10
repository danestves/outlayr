import { createFileRoute } from "@tanstack/react-router";

import { FileImport } from "@/components/dashboard/import/file-import";
import { importSearch } from "@/components/dashboard/import/search";

export const Route = createFileRoute("/_account/app/import/file")({ component: File, validateSearch: importSearch });

function File() {
    const { kind } = Route.useSearch();
    return <FileImport kind={kind === "pdf" ? "pdf" : "csv"} />;
}
