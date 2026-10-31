import { useRef, useState } from "react";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ChoiceRow, SettingsSection } from "@/components/list/list-row";
import { SegmentedRow } from "@/components/settings/segmented-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import {
    CATEGORY_PALETTE,
    capitalizeCategoryName,
    presetLabel,
    SUGGESTED_CATEGORY_PRESETS,
} from "@/data/categories-core";
import { tc } from "@/domain/money-manager/count-labels";
import { defaultChoices } from "@/domain/money-manager/defaults";
import type { CategoryTarget, MmCategoryView } from "@/domain/money-manager/types";
import { useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";
import type { MoneyManagerDraft } from "@/lib/money-manager-session";

import { ChoiceSheet } from "./components/choice-sheet";
import type { ChoiceSheetHandle } from "./components/choice-sheet";
import { ImportRow } from "./components/import-row";
import { categoryName, categoryTarget } from "./labels";

const MODES = ["match", "keep"] as const;

export function MoneyManagerCategories() {
    const { draft } = useMoneyManagerSession();
    const t = useTranslation();
    const sheet = useRef<ChoiceSheetHandle>(null);
    const [editing, setEditing] = useState<string | null>(null);
    if (draft === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }
    const edited = draft.analysis.categories.find((category) => category.uid === editing) ?? null;

    const setMode = (index: number) => {
        const mode = MODES[index] ?? "match";
        const fresh = defaultChoices(draft.snapshot, draft.analysis, draft.ledger, mode);
        moneyManagerSession.updateChoices((choices) => ({
            ...choices,
            budgets: fresh.budgets,
            categories: fresh.categories,
            categoryMode: mode,
        }));
    };

    const edit = (uid: string) => {
        setEditing(uid);
        sheet.current?.present();
    };

    const section = (income: boolean) => {
        const rows = draft.analysis.categories.filter((category) => category.income === income);
        if (rows.length === 0) {
            return null;
        }
        return (
            <SettingsSection
                title={`${t(income ? "mmImport.categories.income" : "mmImport.categories.expenses")} · ${rows.length}`}
            >
                {rows.map((category) => (
                    <ImportRow
                        detail={tc(t, "mmImport.count.entries", category.entryCount)}
                        key={category.uid}
                        leading={<CategoryIconTile color={category.color} icon={category.icon} size={32} />}
                        onPress={() => edit(category.uid)}
                        target={categoryTarget(draft, category.uid, t)}
                        testID={`mm-category-${category.uid}`}
                        title={category.title}
                    />
                ))}
            </SettingsSection>
        );
    };

    return (
        <SettingsScreen footer={t("mmImport.categories.footer")}>
            <View className="pt-4">
                <SegmentedRow
                    icon="SwatchBook"
                    onChange={setMode}
                    options={[
                        {
                            label: t("mmImport.categories.outlayrs"),
                            note: t("mmImport.categories.matchNote"),
                            value: 0,
                        },
                        { label: t("mmImport.categories.mine"), note: t("mmImport.categories.keepNote"), value: 1 },
                    ]}
                    title={t("mmImport.categories.modeTitle")}
                    value={draft.choices.categoryMode === "keep" ? 1 : 0}
                />
            </View>
            {section(false)}
            {section(true)}
            <ChoiceSheet
                detail={edited ? tc(t, "mmImport.count.entries", edited.entryCount) : undefined}
                leading={edited ? <CategoryIconTile color={edited.color} icon={edited.icon} size={32} /> : undefined}
                onDismiss={() => setEditing(null)}
                ref={sheet}
                title={edited?.title ?? ""}
            >
                {edited ? (
                    <CategoryChoices
                        category={edited}
                        draft={draft}
                        onPicked={(target) => {
                            moneyManagerSession.updateChoices((choices) => ({
                                ...choices,
                                categories: { ...choices.categories, [edited.uid]: target },
                            }));
                            sheet.current?.dismiss();
                        }}
                    />
                ) : null}
            </ChoiceSheet>
        </SettingsScreen>
    );
}

interface Candidate {
    color: string;
    icon: string | null;
    key: string;
    label: string;
    target: CategoryTarget;
}

/** Outlayr's live categories first, then the presets it does not have yet, by name. */
function candidates(draft: MoneyManagerDraft, income: boolean, t: TranslateFn): Candidate[] {
    const live = draft.ledger.categories.filter((category) => category.income === income && category.parentId === null);
    const taken = new Set(live.flatMap((category) => [capitalizeCategoryName(category.name), category.preset]));
    const pool = income ? SUGGESTED_CATEGORY_PRESETS.income : SUGGESTED_CATEGORY_PRESETS.expense;
    return [
        ...live.map((category) => ({
            color: category.color ?? CATEGORY_PALETTE[0],
            icon: category.icon,
            key: category.id,
            label: category.name,
            target: { categoryId: category.id, kind: "existing" } satisfies CategoryTarget,
        })),
        ...pool
            .filter(
                (preset) =>
                    !(
                        taken.has(preset.name) ||
                        taken.has(capitalizeCategoryName(preset.name)) ||
                        taken.has(capitalizeCategoryName(presetLabel(preset.name, t)))
                    )
            )
            .map((preset) => ({
                color: preset.color,
                icon: preset.icon,
                key: `preset:${preset.name}`,
                label: presetLabel(preset.name, t),
                target: { kind: "preset", presetName: preset.name } satisfies CategoryTarget,
            })),
    ];
}

function sameTarget(a: CategoryTarget | undefined, b: CategoryTarget): boolean {
    if (a === undefined || a.kind !== b.kind) {
        return false;
    }
    if (a.kind === "existing" && b.kind === "existing") {
        return a.categoryId === b.categoryId;
    }
    if (a.kind === "preset" && b.kind === "preset") {
        return a.presetName === b.presetName;
    }
    return true;
}

function CategoryChoices({
    category,
    draft,
    onPicked,
}: {
    category: MmCategoryView;
    draft: MoneyManagerDraft;
    onPicked: (target: CategoryTarget) => void;
}) {
    const t = useTranslation();
    const current = draft.choices.categories[category.uid];
    // The suggested nesting stays on offer after a different pick, so it can be taken back.
    let sub = current?.kind === "sub" ? current : null;
    if (sub === null) {
        const suggested = defaultChoices(draft.snapshot, draft.analysis, draft.ledger, draft.choices.categoryMode)
            .categories[category.uid];
        sub = suggested?.kind === "sub" ? suggested : null;
    }
    const parent = sub === null ? null : categoryName(draft, sub.parent);

    return (
        <View>
            <SettingsSection title={t("mmImport.categorySheet.putIn")}>
                {sub !== null && parent !== null ? (
                    <ChoiceRow
                        detail={t("mmImport.categorySheet.underDetail", { name: category.title, parent })}
                        label={t("mmImport.categorySheet.under", { parent })}
                        onPress={() => onPicked(sub)}
                        selected={current?.kind === "sub"}
                    />
                ) : null}
                <ChoiceRow
                    detail={t("mmImport.categorySheet.newDetail", { name: category.title })}
                    label={t("mmImport.categorySheet.new")}
                    onPress={() => onPicked({ kind: "new" })}
                    selected={current?.kind === "new"}
                />
                <ChoiceRow
                    detail={t("mmImport.categorySheet.leaveOutDetail")}
                    label={t("mmImport.accountSheet.leaveOut")}
                    onPress={() => onPicked({ kind: "skip" })}
                    selected={current?.kind === "skip"}
                />
            </SettingsSection>
            <SettingsSection title={t("mmImport.categorySheet.other")}>
                {candidates(draft, category.income, t).map((candidate) => (
                    <ChoiceRow
                        key={candidate.key}
                        label={candidate.label}
                        leading={<CategoryIconTile color={candidate.color} icon={candidate.icon} size={28} />}
                        onPress={() => onPicked(candidate.target)}
                        selected={sameTarget(current, candidate.target)}
                    />
                ))}
            </SettingsSection>
        </View>
    );
}
