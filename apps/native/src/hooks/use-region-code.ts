import { useState } from "react";

import { firstLocale } from "@/i18n/device-language";

export function useRegionCode(): string | undefined {
    const [regionCode] = useState(() => firstLocale()?.regionCode?.trim() || undefined);
    return regionCode;
}
