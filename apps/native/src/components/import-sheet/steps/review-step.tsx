import CheckSolid from "@hugeicons-pro/core-solid-rounded/CheckmarkCircle02Icon";
import CircleIcon from "@hugeicons-pro/core-stroke-rounded/CircleIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { SectionList } from "@legendapp/list/section-list";
import { currencyTotals } from "@outlayr/money/currency-totals";
import type { CurrencyBucket, CurrencyEntry } from "@outlayr/money/currency-totals";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayTotal, RowAmount } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { ImportEntry, SkipReason } from "@/data/transfer-core";
import { formatDayHeader, formatSentenceDate } from "@/domain/dates";
import { importCurrencyEntry, importOutTotals } from "@/domain/import-totals";
import { FALLBACK_IDENTITY_COLOR } from "@/domain/transaction-identity";
import type { ImportReviewResult, ReviewCategoryTile, ReviewRow } from "@/hooks/use-import-review";
import { useReviewEnrichment } from "@/hooks/use-review-enrichment";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { LARGE_SHEET_TOP_INSET } from "@/lib/sheet-detents";
import { useColors } from "@/theme/use-colors";

import { MeasureStrip } from "../measure-strip";
import { OutTotalCell } from "../out-total-cell";
import { StepCta } from "../step-cta";

const SKIP_REASON_KEY = {
    amount: "import.skipReasonAmount",
    category: "import.skipReasonCategory",
    date: "import.skipReasonDate",
    rate: "import.skipReasonRate",
} satisfies Record<SkipReason, TranslationKey>;

/** The Log row's tile: a 20pt glyph in 8pt of padding. */
const TILE_SIZE = 36;
const TILE_RADIUS = 9;
const ESTIMATED_ROW_HEIGHT = 56;
/** Chrome around the list, erring high so the capped step never outgrows a fitted sheet. */
const LIST_CHROME_HEIGHT = 224;
const COMMIT_FAILED_NOTICE_HEIGHT = 96;

interface ReviewEntryListRow {
    duplicate: boolean;
    entry: ImportEntry;
    index: number;
    key: string;
}

interface ReviewDaySection {
    data: ReviewEntryListRow[];
    day: Date;
    first: boolean;
    key: string;
}

function dayKeyOf(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface EntryRowProps {
    categoryName: string | undefined;
    checked: boolean;
    currency: string;
    displayName: string;
    duplicate: boolean;
    entry: ImportEntry;
    index: number;
    logoUri: string | null;
    onToggle: (index: number) => void;
    tile: ReviewCategoryTile | undefined;
}

export function EntryRow({
    index,
    entry,
    duplicate,
    checked,
    categoryName,
    tile,
    displayName,
    logoUri,
    currency,
    onToggle,
}: EntryRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const { showCents } = useDisplaySettings().state;
    const onPress = () => {
        onToggle(index);
    };
    const tileColor = tile === undefined ? FALLBACK_IDENTITY_COLOR : tile.color;
    const categoryCaption =
        categoryName == null ? null : (
            <Text className="font-sans-medium text-muted text-subtitle" numberOfLines={1}>
                {categoryName}
            </Text>
        );
    const caption = duplicate ? (
        <Text className="text-danger text-footnote" numberOfLines={1}>
            {t("import.reviewDuplicateCaption")}
        </Text>
    ) : (
        categoryCaption
    );

    return (
        <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            className={cn("flex-row items-center gap-3 py-2 active:opacity-70", !checked && "opacity-40")}
            onPress={onPress}
            testID={`review-row-${index}`}
        >
            <View testID={`review-row-checkbox-${index}`}>
                <HugeiconsIcon
                    color={checked ? colors.foreground : colors.subtle}
                    icon={checked ? CheckSolid : CircleIcon}
                    size={22}
                    strokeWidth={1.6}
                />
            </View>
            <CategoryIconTile
                color={tileColor}
                emoji={tile?.emoji}
                icon={tile?.icon}
                imageUri={logoUri}
                radius={TILE_RADIUS}
                size={TILE_SIZE}
                type="solid"
            />
            <View className="flex-1 gap-0.5">
                <Text
                    className={cn("font-sans-medium text-callout text-foreground", !checked && "line-through")}
                    numberOfLines={1}
                >
                    {displayName}
                </Text>
                {caption}
            </View>
            <View className="items-end gap-0.5">
                <RowAmount
                    amount={entry.amount}
                    code={entry.currency ?? currency}
                    income={entry.income}
                    isFuture={false}
                    showCents={showCents}
                    struck={!checked}
                />
                <Text className="text-footnote text-subtle" numberOfLines={1}>
                    {formatSentenceDate(entry.date, language)}
                </Text>
            </View>
        </Pressable>
    );
}

function DayHeader({ day, totals, first }: { day: Date; first: boolean; totals: readonly CurrencyBucket[] }) {
    const { showCents } = useDisplaySettings().state;
    const { language } = useLanguage();
    return (
        <View className={first ? "gap-1.25 pt-2.5" : "gap-1.25 pt-7"}>
            <View className="flex-row items-baseline justify-between gap-2">
                <MonoLabel>{formatDayHeader(day, undefined, language)}</MonoLabel>
                <DayTotal showCents={showCents} totals={totals} />
            </View>
            {/* A 1.3 stroke with round caps, matching the Log's day rule. */}
            <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
        </View>
    );
}

type EntryReviewRow = Extract<ReviewRow, { kind: "entry" }>;
type SkippedReviewRow = Extract<ReviewRow, { kind: "skipped" }>;

function buildDaySections(entryRows: readonly EntryReviewRow[]): ReviewDaySection[] {
    const sorted = [...entryRows].sort((a, b) => b.entry.date.getTime() - a.entry.date.getTime());
    const byDay = new Map<string, ReviewDaySection>();
    for (const row of sorted) {
        const key = dayKeyOf(row.entry.date);
        let section = byDay.get(key);
        if (section == null) {
            section = { data: [], day: row.entry.date, first: byDay.size === 0, key: `day-${key}` };
            byDay.set(key, section);
        }
        section.data.push({
            duplicate: row.duplicate,
            entry: row.entry,
            index: row.index,
            key: row.key,
        });
    }
    return [...byDay.values()];
}

// Bucketed per currency, never summed across them: a CSV row may carry its own currency, and
// `amount-text` forbids adding two currencies into one figure.
function selectionTotals(entryRows: readonly EntryReviewRow[], excluded: ReadonlySet<number>, ledgerCurrency: string) {
    const perDay = new Map<string, CurrencyEntry[]>();
    const selected: ImportEntry[] = [];
    for (const row of entryRows) {
        if (excluded.has(row.index)) {
            continue;
        }
        const cell: CurrencyEntry = importCurrencyEntry(row.entry, ledgerCurrency);
        selected.push(row.entry);
        const key = dayKeyOf(row.entry.date);
        const bucket = perDay.get(key);
        if (bucket) {
            bucket.push(cell);
        } else {
            perDay.set(key, [cell]);
        }
    }
    return {
        dayTotals: new Map([...perDay].map(([key, cells]) => [key, currencyTotals(cells, ledgerCurrency)] as const)),
        outTotals: importOutTotals(selected, ledgerCurrency),
    };
}

interface ReviewStepProps {
    review: ImportReviewResult;
}

export function ReviewStep({ review }: ReviewStepProps) {
    const t = useTranslation();
    if (review.rows.length === 0) {
        return (
            <View className="items-center pt-10">
                <Text className="text-muted text-subtitle">{t("import.reviewEmptyTitle")}</Text>
            </View>
        );
    }
    const entryRows = review.rows.filter((row) => row.kind === "entry");
    const skippedRows = review.rows.filter((row) => row.kind === "skipped");
    const sections = buildDaySections(entryRows);
    return <ReviewList entryRows={entryRows} review={review} sections={sections} skippedRows={skippedRows} />;
}

interface ReviewListProps extends ReviewStepProps {
    entryRows: readonly EntryReviewRow[];
    sections: readonly ReviewDaySection[];
    skippedRows: readonly SkippedReviewRow[];
}

function ReviewList({ entryRows, review, sections, skippedRows }: ReviewListProps) {
    const t = useTranslation();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { showCents } = useDisplaySettings().state;
    const enrichment = useReviewEnrichment(review.plan.entries);
    const [showSkipped, setShowSkipped] = useState(false);
    const onToggleSkipped = () => {
        setShowSkipped((current) => !current);
    };

    const { outTotals, dayTotals } = selectionTotals(entryRows, review.excluded, review.currency);

    const renderItem = ({ item }: { item: ReviewEntryListRow }) => (
        <EntryRow
            categoryName={review.categoryName.get(item.entry.categoryId)}
            checked={!review.excluded.has(item.index)}
            currency={review.currency}
            displayName={enrichment.get(item.index)?.displayName ?? item.entry.note}
            duplicate={item.duplicate}
            entry={item.entry}
            index={item.index}
            logoUri={enrichment.get(item.index)?.logoUri ?? null}
            onToggle={review.onToggle}
            tile={review.categoryTile.get(item.entry.categoryId)}
        />
    );

    const renderSectionHeader = ({ section }: { section: ReviewDaySection }) => (
        <DayHeader day={section.day} first={section.first} totals={dayTotals.get(dayKeyOf(section.day)) ?? []} />
    );

    const skippedFooter =
        skippedRows.length === 0 ? null : (
            <View>
                <Pressable
                    accessibilityRole="button"
                    className="border-border border-b py-3 active:opacity-60"
                    onPress={onToggleSkipped}
                    testID="review-skipped-toggle"
                >
                    <Text className="text-footnote text-muted">
                        {t(showSkipped ? "import.reviewSkippedHide" : "import.reviewSkippedShow", {
                            count: skippedRows.length,
                        })}
                    </Text>
                </Pressable>
                {showSkipped
                    ? skippedRows.map((row) => (
                          <View
                              className="border-border flex-row items-center justify-between gap-3 border-b py-2"
                              key={row.key}
                          >
                              <MonoLabel>{String(row.row)}</MonoLabel>
                              <Text className="text-footnote text-muted" numberOfLines={1}>
                                  {t(SKIP_REASON_KEY[row.reason])}
                              </Text>
                          </View>
                      ))
                    : null}
            </View>
        );

    const writing = review.commit.phase === "writing";
    const failed = review.commit.phase === "failed";

    // The sheet sizes to content, so flex heights are inert; cap the list so it scrolls instead of clipping.
    const listMaxHeight =
        windowHeight -
        LARGE_SHEET_TOP_INSET -
        insets.bottom -
        LIST_CHROME_HEIGHT -
        (failed ? COMMIT_FAILED_NOTICE_HEIGHT : 0);

    return (
        <View className="flex-1 gap-3">
            {failed ? (
                <View className="border-border mx-5 gap-1 border-y py-3" testID="review-commit-failed">
                    <Text className="font-sans-medium text-body text-danger">
                        {t("import.reviewCommitFailedTitle")}
                    </Text>
                    <Text className="text-footnote text-muted">{t("import.reviewCommitFailedBody")}</Text>
                    {review.commit.phase === "failed" && review.commit.detail != null ? (
                        <Text className="text-subtitle text-subtle">{review.commit.detail}</Text>
                    ) : null}
                </View>
            ) : null}

            <MeasureStrip
                cells={[
                    {
                        figure: t("import.reviewToImportValue", {
                            count: review.selectedCount,
                            total: entryRows.length,
                        }),
                        key: "toImport",
                        label: t("import.reviewToImportLabel"),
                    },
                    {
                        key: "out",
                        label: t("log.measure.out"),
                        value: (
                            <OutTotalCell fallbackCurrency={review.currency} showCents={showCents} totals={outTotals} />
                        ),
                    },
                ]}
                className="mx-5"
            />

            <View style={{ maxHeight: listMaxHeight }} testID="review-list">
                <SectionList
                    contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 20 }}
                    estimatedItemSize={ESTIMATED_ROW_HEIGHT}
                    extraData={{ enrichment, excluded: review.excluded, showSkipped }}
                    keyExtractor={keyOf}
                    ListFooterComponent={skippedFooter}
                    // Rows hold toggle state; a recycled container would flash the previous row's checked look.
                    recycleItems={false}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    sections={sections}
                    stickySectionHeadersEnabled={false}
                />
            </View>

            <View className="px-5">
                <StepCta
                    busy={writing}
                    busyLabel={t("import.reviewCommitting", { count: review.selectedCount })}
                    confirmLabel={
                        failed
                            ? undefined
                            : t("import.reviewCommitConfirmCta", {
                                  count: review.selectedCount,
                              })
                    }
                    disabled={review.selectedCount === 0 || writing}
                    label={failed ? t("import.tryAgain") : t("import.reviewCommitCta", { count: review.selectedCount })}
                    onPress={review.onCommit}
                    testID="review-commit-cta"
                />
            </View>
        </View>
    );
}

function keyOf(item: ReviewEntryListRow): string {
    return item.key;
}
