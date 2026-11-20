import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { Menu } from "panelui-web/menu";
import { Select } from "panelui-web/select";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { DialogContent } from "@/components/ui/dialog-content";
import { MenuContent } from "@/components/ui/menu-content";
import { TextField } from "@/components/ui/text-field";
import { tagBooks as tagBooksOf } from "@/lib/ledger-db";
import { photoSrc } from "@/lib/photo-src";
import { ruleFromPicks, selectionSeedOf } from "@/lib/rule-from-selection";
import type { TextSeed } from "@/lib/rule-from-selection";
import { appliedRun } from "@/lib/rule-writes";
import { removed, ruleProblems, runOf, saved } from "@/lib/rules";

import type { FoldedRow } from "../home/rows";
import { useRulesData, useRuleWrites } from "../rules/data";
import { useCategoryLook } from "../rules/parts";
import { merchantOf, useCategoryOptions } from "./entry-form";
import { entryNotices } from "./use-delete";

const ROW = "border-app-rule flex min-h-10 items-center gap-3 border-b py-1";
const LABEL = "text-muted-foreground text-app-label w-18 shrink-0";
const CHIP =
    "border-app-rule rounded-app-sm text-app-label inline-flex h-app-control-sm items-center gap-1.5 border px-2.5 font-medium";
const SECTION = "text-muted-foreground text-app-label pt-2";
const TEXT_OPS = ["is", "contains", "startsWith"] as const satisfies readonly TextSeed["op"][];

interface TextPick extends TextSeed {
    checked: boolean;
}

function Row({
    checked,
    children,
    disabled = false,
    label,
    onChecked,
}: {
    checked: boolean;
    children: ReactNode;
    disabled?: boolean;
    label: string;
    onChecked?: (checked: boolean) => void;
}) {
    const id = useId();
    return (
        <div className={ROW}>
            <Checkbox
                aria-labelledby={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onChecked}
                size="sm"
            />
            <span className={LABEL} id={id}>
                {label}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}

function TextRow({
    imageUrl,
    label,
    onChange,
    pick,
}: {
    imageUrl: string | undefined;
    label: string;
    onChange: (pick: TextPick) => void;
    pick: TextPick;
}) {
    const { ops } = useIntlayer("dashboard-rules");
    const options = TEXT_OPS.map((op) => ({ label: ops[op].value, value: op }));
    return (
        <Row checked={pick.checked} label={label} onChecked={(checked) => onChange({ ...pick, checked })}>
            <Select
                items={options}
                onValueChange={(next) => {
                    const op = TEXT_OPS.find((each) => each === next);
                    if (op) {
                        onChange({ ...pick, op });
                    }
                }}
                value={pick.op}
            >
                <Select.Trigger aria-label={label} className="w-auto" size="sm">
                    <Select.Value />
                </Select.Trigger>
                <Select.Content>
                    {options.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                            {option.label}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
            <span className={`${CHIP} min-w-0`}>
                {pick.op === "is" && pick.field === "merchant" ? (
                    <MerchantTile imageUrl={imageUrl} name={pick.value} size="sm" />
                ) : null}
                <span className="truncate">{pick.value}</span>
            </span>
        </Row>
    );
}

interface RuleFormProps {
    onDone: () => void;
    picked: readonly FoldedRow[];
}

function RuleForm({ onDone, picked }: RuleFormProps) {
    const words = useIntlayer("dashboard-transactions");
    const { ops } = useIntlayer("dashboard-rules");
    const { rule: copy } = words;
    const { locale } = useLocale();
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const data = useRulesData();
    const writes = useRuleWrites(entryNotices);
    const committer = useLedgerCommitter(entryNotices);
    const look = useCategoryLook();
    const expense = useCategoryOptions(ledger, false);
    const income = useCategoryOptions(ledger, true);
    const [seed] = useState(() =>
        selectionSeedOf(
            data.entries,
            picked.map((row) => ({ accountId: "fromId" in row ? null : row.accountId, id: row.id })),
            data.kinds
        )
    );
    const [id] = useState(() => crypto.randomUUID());
    const [merchant, setMerchant] = useState(() =>
        seed.merchant ? { ...seed.merchant, checked: seed.merchant.shared } : null
    );
    const [details, setDetails] = useState(() =>
        seed.description ? { ...seed.description, checked: seed.description.shared } : null
    );
    const [categoryId, setCategoryId] = useState(seed.category?.value ?? null);
    const [categoryOn, setCategoryOn] = useState(seed.category?.shared ?? false);
    const [tags, setTags] = useState(() => seed.tags.map((tag) => ({ checked: tag.shared, tagId: tag.value })));
    const [past, setPast] = useState(false);
    const [tried, setTried] = useState(false);
    const subject = merchant?.value ?? details?.value ?? "";
    const startName = () => {
        const category = seed.category ? (look(seed.category.value)?.name ?? "") : "";
        if (subject !== "" && category !== "" && seed.category?.shared) {
            return copy.nameOf({ category, subject }).value;
        }
        return subject || category;
    };
    const [name, setName] = useState(startName);
    const rule = ruleFromPicks(
        {
            categoryId: categoryOn ? categoryId : null,
            conditions: [merchant, details].flatMap((pick) => (pick?.checked ? [pick] : [])),
            name,
            tagIds: tags.flatMap((tag) => (tag.checked ? [tag.tagId] : [])),
        },
        id
    );
    const problems = ruleProblems(rule);
    const live = new Set(data.tagNames.keys());
    const changes = problems.none === null ? runOf([rule], data.entries, data.kinds, live).changes : [];
    const kinds = new Set(seed.covered.map((entry) => entry.income));
    const categories = [...(kinds.has(false) ? expense : []), ...(kinds.has(true) ? income : [])];
    const account = ledger.books.accounts.find((row) => row.localId === seed.accountId);
    const imageUrl = photoSrc(
        seed.covered.find((entry) => entry.imageKey !== null && entry.note.trim() !== "")?.imageKey
    );
    const spare = [...data.tagNames].filter(([tagId]) => !tags.some((tag) => tag.tagId === tagId));
    const list = (items: readonly string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
    const summary = () => {
        if (problems.none !== null) {
            return copy.invalid.value;
        }
        const when = rule.conditions.map((condition) => {
            const field = condition.field === "merchant" ? copy.subjectMerchant.value : copy.subjectDescription.value;
            return `${field} ${ops[condition.op].value} ${condition.value}`;
        });
        const then = rule.actions.map((action) =>
            action.type === "category"
                ? (look(action.categoryId)?.name ?? "")
                : `#${data.tagNames.get(action.tagId) ?? ""}`
        );
        const line = copy.summary({ actions: list(then), conditions: list(when) }).value;
        if (!past || changes.length === 0) {
            return line;
        }
        const now =
            changes.length === 1
                ? copy.summaryPastOne.value
                : copy.summaryPast({ count: String(changes.length) }).value;
        return `${line} ${now}`;
    };
    const create = () => {
        setTried(true);
        if (problems.count > 0) {
            return;
        }
        writes.update((book) => saved(book, rule, Number.POSITIVE_INFINITY));
        const undoRule = () => {
            writes.update((book) => removed(book, rule.id));
        };
        if (past && changes.length > 0) {
            const current = committer.current();
            const { rows } = appliedRun(
                current,
                tagBooksOf(db),
                changes,
                (values) => words.form.feeNote({ merchant: merchantOf(current, values) }).value
            );
            committer.commitWithUndo(rows, {
                detail:
                    changes.length === 1
                        ? copy.pastDoneOne.value
                        : copy.pastDone({ count: String(changes.length) }).value,
                failed: words.form.saveFailed.value,
                onUndone: undoRule,
                text: copy.created.value,
            });
        } else {
            committer.notify({ detail: rule.name, onUndo: undoRule, text: copy.created.value });
        }
        onDone();
    };
    const total = picked.length;
    const covered = seed.covered.length;
    const from = () => {
        if (covered < total) {
            return copy.fromSome({ count: String(covered), total: String(total) });
        }
        return covered === 1 ? copy.fromOne : copy.from({ count: String(covered) });
    };
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                create();
            }}
        >
            <Dialog.Header description={from()} title={copy.create.value} />
            <Dialog.Body className="flex flex-col gap-4">
                <TextField
                    autoFocus
                    error={tried && problems.name !== null ? copy.nameRequired : null}
                    label={copy.name}
                    maxLength={60}
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                />
                <div>
                    <p className={SECTION}>{copy.when}</p>
                    {merchant ? (
                        <TextRow
                            imageUrl={imageUrl}
                            label={copy.merchant.value}
                            onChange={setMerchant}
                            pick={merchant}
                        />
                    ) : null}
                    {details ? (
                        <TextRow
                            imageUrl={undefined}
                            label={copy.description.value}
                            onChange={setDetails}
                            pick={details}
                        />
                    ) : null}
                    {account ? (
                        <Row checked={false} disabled label={copy.account.value}>
                            <span className={CHIP}>
                                <AccountTile account={accountLook(account)} size="sm" />
                                {account.name}
                            </span>
                            <span className="text-muted-foreground text-app-label">{copy.accountNote}</span>
                        </Row>
                    ) : null}
                </div>
                <div>
                    <p className={SECTION}>{copy.outcome}</p>
                    <Row
                        checked={categoryOn}
                        disabled={categoryId === null}
                        label={copy.category.value}
                        onChecked={setCategoryOn}
                    >
                        <Select
                            items={categories.map((option) => ({ label: option.label, value: option.value }))}
                            onValueChange={(next) => {
                                if (next !== null) {
                                    setCategoryId(next);
                                    setCategoryOn(true);
                                }
                            }}
                            value={categoryId}
                        >
                            <Select.Trigger aria-label={copy.category.value} className="w-auto" size="sm">
                                {categories.find((option) => option.value === categoryId)?.icon}
                                <Select.Value placeholder={copy.category.value} />
                            </Select.Trigger>
                            <Select.Content className="max-h-80">
                                {categories.map((option) => (
                                    <Select.Item icon={option.icon} key={option.value} value={option.value}>
                                        {option.label}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select>
                    </Row>
                    {tags.map((tag) => (
                        <Row
                            checked={tag.checked}
                            key={tag.tagId}
                            label={copy.tag.value}
                            onChecked={(checked) =>
                                setTags((current) =>
                                    current.map((each) => (each.tagId === tag.tagId ? { ...each, checked } : each))
                                )
                            }
                        >
                            <span className={CHIP}>
                                <span className="text-muted-foreground font-mono">#</span>
                                {data.tagNames.get(tag.tagId)}
                            </span>
                        </Row>
                    ))}
                    {spare.length > 0 ? (
                        <div className={ROW}>
                            <Menu>
                                <Menu.Trigger render={<Button size="sm" type="button" variant="outline" />}>
                                    <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
                                    {copy.addTag}
                                </Menu.Trigger>
                                <MenuContent className="max-h-80 overflow-y-auto">
                                    {spare.map(([tagId, tagName]) => (
                                        <Menu.Item
                                            key={tagId}
                                            onClick={() => setTags((current) => [...current, { checked: true, tagId }])}
                                        >
                                            <span className="text-muted-foreground font-mono">#</span>
                                            {tagName}
                                        </Menu.Item>
                                    ))}
                                </MenuContent>
                            </Menu>
                        </div>
                    ) : null}
                </div>
                {changes.length > 0 ? (
                    <label className="text-app-body flex items-center gap-2.5">
                        <Checkbox checked={past} onCheckedChange={setPast} size="sm" />
                        {changes.length === 1 ? copy.pastOne : copy.past({ count: String(changes.length) })}
                    </label>
                ) : null}
                <p
                    aria-live="polite"
                    className={`text-app-label ${tried && problems.count > 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                    {summary()}
                </p>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onDone} type="button" variant="secondary">
                    {copy.cancel}
                </Button>
                <Button type="submit">{copy.create}</Button>
            </Dialog.Footer>
        </form>
    );
}

export function RuleDialog({
    onOpenChange,
    open,
    picked,
}: {
    onOpenChange: (open: boolean) => void;
    open: boolean;
    picked: readonly FoldedRow[];
}) {
    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent>
                {open ? <RuleForm onDone={() => onOpenChange(false)} picked={picked} /> : null}
            </DialogContent>
        </Dialog>
    );
}
