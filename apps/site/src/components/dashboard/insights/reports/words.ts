import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";

import { useInsightsFormat } from "../format";
import { reportWords } from "./reading";

/** Every phrase a report is read in, built once from the ledger's formats and the page's copy. */
export function useReportWords() {
    const copy = useIntlayer("dashboard-insights-reports");
    const categoryName = useCategoryName();
    const { ledger } = useDashboard();
    const fmt = useInsightsFormat(ledger);
    const { locale } = useLocale();
    return useMemo(
        () =>
            reportWords({
                categoryName,
                copy,
                fmt,
                locale,
                uncategorized: categoryName({ id: UNCATEGORIZED_ID, name: "" }),
            }),
        [categoryName, copy, fmt, locale]
    );
}

export type ReportWords = ReturnType<typeof useReportWords>;
