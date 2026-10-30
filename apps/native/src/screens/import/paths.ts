import { usePathname } from "expo-router";

import { IMPORT_PATHS } from "@/domain/import-paths";

export function useImportPaths() {
    const onboarding = usePathname().startsWith("/onboarding");
    return { onboarding, paths: onboarding ? IMPORT_PATHS.onboarding : IMPORT_PATHS.ledger };
}
