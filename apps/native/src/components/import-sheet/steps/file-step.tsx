import File02Icon from "@hugeicons-pro/core-stroke-rounded/File02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Button } from "panelui-native/components/button";
import { View } from "react-native";

import { Text } from "@/components/text";
import { deduceDateFormat } from "@/domain/transaction-csv";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { importDraftStore, useImportDraft } from "@/lib/import-draft-store";
import type { FileStepError } from "@/lib/import-draft-store";
import { useColors } from "@/theme/use-colors";

import { MeasureStrip } from "../measure-strip";
import { StepCta } from "../step-cta";

const ERROR_TITLE = {
    empty: "import.errorEmptyTitle",
    io: "import.errorIoTitle",
    noDataRows: "import.errorNoDataTitle",
    tooFewColumns: "import.errorTooFewColumnsTitle",
    tooLarge: "import.errorTooLargeTitle",
} satisfies Record<FileStepError["cause"], TranslationKey>;

const ERROR_BODY = {
    empty: "import.errorEmptyBody",
    noDataRows: "import.errorNoDataBody",
    tooFewColumns: "import.errorTooFewColumnsBody",
    tooLarge: "import.errorTooLargeBody",
} satisfies Partial<Record<FileStepError["cause"], TranslationKey>>;

const MAPPING_GAP_COPY = {
    noAmount: "import.mappingGapNoAmount",
    noDate: "import.mappingGapNoDate",
    noLabelColumn: "import.mappingGapNoLabel",
} satisfies Record<string, TranslationKey>;

const DOC_TILE_SIZE = 30;

interface FileStepProps {
    busy?: boolean;
    onChoose: () => void;
}

function ChooseDifferentFile({ onChoose }: { onChoose: () => void }) {
    const t = useTranslation();
    return (
        <Button className="rounded-full" fullWidth onPress={onChoose} variant="secondary">
            {t("import.chooseDifferentFile")}
        </Button>
    );
}

export function FileStep({ onChoose, busy = false }: FileStepProps) {
    const t = useTranslation();
    const colors = useColors();
    const { flow: state, ui } = useImportDraft();
    const error = ui.fileError;

    const { parsed, resolved } = state;
    const dateFormat =
        parsed == null || resolved == null
            ? null
            : deduceDateFormat(parsed.rows.map((row) => row[resolved.mapping.date] ?? ""));

    if (error == null && state.parsed != null && state.mappingGaps.length > 0) {
        return (
            <View className="flex-1 gap-4 px-5 pt-4">
                <View className="border-border gap-2 border-y py-3">
                    <Text className="font-sans-medium text-body text-danger">{t("import.mappingGapTitle")}</Text>
                    {state.mappingGaps.map((gap) => (
                        <Text className="text-footnote text-muted" key={gap}>
                            {t(MAPPING_GAP_COPY[gap])}
                        </Text>
                    ))}
                    <Text className="text-footnote text-muted">{t("import.mappingGapGuidance")}</Text>
                </View>
                <ChooseDifferentFile onChoose={onChoose} />
            </View>
        );
    }

    if (error != null) {
        // SAFETY: ERROR_BODY is keyed by the same cause union the branch tests, and
        // every value in it is a key of the catalog.
        return (
            <View className="flex-1 gap-4 px-5 pt-4">
                <View className="border-border gap-2 border-y py-3">
                    <Text className="font-sans-medium text-body text-danger">{t(ERROR_TITLE[error.cause])}</Text>
                    <Text className="text-footnote text-muted">
                        {error.cause === "io" ? t(error.key) : t(ERROR_BODY[error.cause] as TranslationKey)}
                    </Text>
                </View>
                <StepCta
                    busy={busy}
                    busyLabel={t("import.readingFile")}
                    className="mt-6"
                    label={t("import.chooseCsv")}
                    onPress={onChoose}
                />
            </View>
        );
    }

    if (state.parsed != null && state.resolved != null) {
        return (
            <View className="flex-1 gap-4 px-5">
                <View className="flex-row items-center gap-3 py-3">
                    <View className="size-7.5 items-center justify-center">
                        <HugeiconsIcon color={colors.foreground} icon={File02Icon} size={20} strokeWidth={1.9} />
                    </View>
                    <View className="flex-1 gap-0.5">
                        <Text className="font-sans-medium text-body text-foreground" numberOfLines={1}>
                            {state.file?.name}
                        </Text>
                        <Text className="text-muted text-subtitle" numberOfLines={1}>
                            {t("import.fileReadOnDevice")}
                        </Text>
                    </View>
                </View>

                <MeasureStrip
                    cells={[
                        {
                            figure: String(state.parsed.rows.length),
                            key: "rows",
                            label: t("import.fileRowsLabel"),
                        },
                        {
                            figure: String(state.parsed.width),
                            key: "columns",
                            label: t("import.fileColumnsLabel"),
                        },
                        {
                            figure: dateFormat ?? "—",
                            key: "dates",
                            label: t("import.fileDatesLabel"),
                        },
                    ]}
                />

                {state.resolved.labelSource === "descriptionColumn" ? (
                    <Text className="text-footnote text-muted leading-snug">{t("import.fileNoCategoryColumn")}</Text>
                ) : null}

                <View className="gap-2">
                    <ChooseDifferentFile onChoose={onChoose} />
                    <StepCta
                        busy={busy}
                        busyLabel={t("import.readingFile")}
                        label={t("common.continue")}
                        onPress={() => importDraftStore.setStep("resolve")}
                        testID="import-file-continue"
                    />
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 gap-4 px-5" testID="import-file-empty">
            <View className="flex-row items-center gap-3 py-3">
                <View className="items-center justify-center" style={{ height: DOC_TILE_SIZE, width: DOC_TILE_SIZE }}>
                    <HugeiconsIcon color={colors.subtle} icon={File02Icon} size={20} strokeWidth={1.9} />
                </View>
                <View className="flex-1 gap-0.5">
                    <Text className="font-sans-medium text-body text-muted" numberOfLines={1}>
                        {t("import.fileEmptyCaption")}
                    </Text>
                    <Text className="text-muted text-subtitle" numberOfLines={1}>
                        {t("import.fileOnDeviceNote")}
                    </Text>
                </View>
            </View>

            <MeasureStrip
                cells={[
                    { figure: "—", key: "rows", label: t("import.fileRowsLabel") },
                    { figure: "—", key: "columns", label: t("import.fileColumnsLabel") },
                    { figure: "—", key: "dates", label: t("import.fileDatesLabel") },
                ]}
            />

            <StepCta busy={busy} busyLabel={t("import.readingFile")} label={t("import.chooseCsv")} onPress={onChoose} />
        </View>
    );
}
