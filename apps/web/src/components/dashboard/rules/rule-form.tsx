import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { Tabs } from "panelui-web/tabs";
import { useId } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { TAG_NAME_LIMIT } from "@/lib/rule-writes";
import type { Rule, ruleProblems } from "@/lib/rules";

import { Pick, useCategoryOptions } from "../transactions/entry-form";
import { FIELDS, blankAction, blankCondition, fieldChanged, opsOf } from "./draft";
import type { Draft, DraftAction, DraftCondition } from "./draft";
import { FIGURE, NOTE } from "./parts";

const LABEL = "mt-[18px] mb-2 flex items-center gap-2 text-[13px] leading-5 font-medium";
const ERROR = "text-destructive -mt-0.5 mb-2 text-xs leading-4";
const PICKS = "[&_button]:text-[13px] [&_button]:font-medium";
const REMOVE = "text-muted-foreground hover:text-foreground -mx-1.5 size-[30px]";

type Problems = ReturnType<typeof ruleProblems>;

function Remove({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <Button aria-label={label} className={REMOVE} onClick={onClick} size="icon-sm" variant="ghost">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </Button>
    );
}

function Add({ children, onClick }: { children: ReactNode; onClick: () => void }) {
    return (
        <Button onClick={onClick} size="sm" variant="outline">
            <HugeiconsIcon icon={Add01Icon} size={14} />
            {children}
        </Button>
    );
}

function ConditionRow({
    onChange,
    onRemove,
    problem,
    row,
}: {
    onChange: (row: DraftCondition) => void;
    onRemove: () => void;
    problem: boolean;
    row: DraftCondition;
}) {
    const { fields, ops, sheet } = useIntlayer("dashboard-rules");
    const amount = row.field === "amount";
    return (
        <>
            <div className={`${PICKS} mb-2 grid grid-cols-[128px_118px_minmax(0,1fr)_18px] items-center gap-2`}>
                <Pick
                    onPick={(value) => {
                        const field = FIELDS.find((each) => each === value);
                        if (field) {
                            onChange(fieldChanged(row, field));
                        }
                    }}
                    options={FIELDS.map((field) => ({ label: fields[field].value, value: field }))}
                    quiet={false}
                    value={row.field}
                />
                <Pick
                    onPick={(value) => {
                        const op = opsOf(row.field).find((each) => each === value);
                        if (op) {
                            onChange({ ...row, op });
                        }
                    }}
                    options={opsOf(row.field).map((op) => ({ label: ops[op].value, value: op }))}
                    quiet={false}
                    value={row.op}
                />
                <Input
                    aria-invalid={problem || undefined}
                    aria-label={fields[row.field].value}
                    className={`${FIGURE} text-[13px]`}
                    inputMode={amount ? "decimal" : undefined}
                    onChange={(event) => onChange({ ...row, text: event.target.value })}
                    placeholder={amount ? "0.00" : sheet.valuePlaceholder.value}
                    value={row.text}
                />
                <Remove label={sheet.removeCondition.value} onClick={onRemove} />
            </div>
            {problem ? <p className={ERROR}>{amount ? sheet.errors.amount : sheet.errors.text}</p> : null}
        </>
    );
}

function ActionRow({
    canCategory,
    onChange,
    onRemove,
    problem,
    row,
    tagListId,
}: {
    canCategory: boolean;
    onChange: (row: DraftAction) => void;
    onRemove: () => void;
    problem: boolean;
    row: DraftAction;
    tagListId: string;
}) {
    const { sheet } = useIntlayer("dashboard-rules");
    const { ledger } = useDashboard();
    const spending = useCategoryOptions(ledger, false);
    const earning = useCategoryOptions(ledger, true);
    const kinds = [
        ...(canCategory ? [{ label: sheet.setCategory.value, value: "category" }] : []),
        { label: sheet.addTag.value, value: "tag" },
    ];
    return (
        <>
            <div className={`${PICKS} mb-2 grid grid-cols-[150px_minmax(0,1fr)_18px] items-center gap-2`}>
                <Pick
                    onPick={(value) => {
                        if (value === row.type) {
                            return;
                        }
                        onChange(
                            value === "category"
                                ? { categoryId: "", id: row.id, type: "category" }
                                : { id: row.id, name: "", type: "tag" }
                        );
                    }}
                    options={kinds}
                    quiet={false}
                    value={row.type}
                />
                {row.type === "category" ? (
                    <Pick
                        invalid={problem}
                        onPick={(categoryId) => onChange({ ...row, categoryId })}
                        options={[...spending, ...earning]}
                        placeholder={sheet.pickCategory.value}
                        quiet={false}
                        value={row.categoryId === "" ? null : row.categoryId}
                    />
                ) : (
                    <Input
                        aria-invalid={problem || undefined}
                        aria-label={sheet.addTag.value}
                        list={tagListId}
                        maxLength={TAG_NAME_LIMIT}
                        onChange={(event) => onChange({ ...row, name: event.target.value })}
                        placeholder={sheet.tagPlaceholder.value}
                        value={row.name}
                    />
                )}
                <Remove label={sheet.removeAction.value} onClick={onRemove} />
            </div>
            {problem ? (
                <p className={ERROR}>{row.type === "category" ? sheet.errors.category : sheet.errors.tag}</p>
            ) : null}
        </>
    );
}

export function BandRow({ children, line, title }: { children: ReactNode; line: ReactNode; title: ReactNode }) {
    return (
        <div className="border-border -mx-6 flex min-h-16 items-center gap-4 border-t px-6 py-3">
            <div className="flex min-w-0 flex-col">
                <b className="text-sm leading-5 font-medium">{title}</b>
                <span className={NOTE}>{line}</span>
            </div>
            <div className="ml-auto flex-none">{children}</div>
        </div>
    );
}

export function RuleForm({
    children,
    draft,
    onChange,
    others,
    problems,
    tagNames,
    whole,
}: {
    children: ReactNode;
    draft: Draft;
    onChange: (draft: Draft) => void;
    others: readonly Rule[];
    problems: Problems | null;
    tagNames: readonly string[];
    whole: boolean;
}) {
    const { columns, sheet } = useIntlayer("dashboard-rules");
    const nameId = useId();
    const tagListId = useId();
    const total = String(others.length + 1);
    const last = others.at(-1);
    const positions = Array.from({ length: others.length + 1 }, (_, index) => {
        const tail = index === others.length && !whole;
        const lastLabel = last ? sheet.lastAfter({ name: last.name }).value : sheet.first.value;
        return {
            label: tail ? lastLabel : sheet.positionOf({ count: total, position: String(index + 1) }).value,
            value: String(index),
        };
    });
    const hasCategory = draft.actions.some((action) => action.type === "category");
    return (
        <div className="pb-5">
            <label className={`${LABEL} mt-1`} htmlFor={nameId}>
                {sheet.name}
            </label>
            <Input
                aria-invalid={problems?.name ? true : undefined}
                autoComplete="off"
                id={nameId}
                onChange={(event) => onChange({ ...draft, name: event.target.value })}
                placeholder={sheet.namePlaceholder.value}
                value={draft.name}
            />
            {problems?.name ? <p className={`${ERROR} mt-1.5`}>{sheet.errors.name}</p> : null}

            <div className={LABEL}>
                {columns.when}
                <Tabs
                    className="ml-auto"
                    onValueChange={(value) => onChange({ ...draft, match: value === "any" ? "any" : "all" })}
                    value={draft.match}
                    variant="segmented"
                >
                    <Tabs.List className="h-7 p-0.5">
                        <Tabs.Trigger className="h-6 px-2.5 text-xs" value="all">
                            {sheet.all}
                        </Tabs.Trigger>
                        <Tabs.Trigger className="h-6 px-2.5 text-xs" value="any">
                            {sheet.any}
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs>
            </div>
            {draft.conditions.map((row, index) => (
                <ConditionRow
                    key={row.id}
                    onChange={(next) =>
                        onChange({
                            ...draft,
                            conditions: draft.conditions.map((each) => (each.id === row.id ? next : each)),
                        })
                    }
                    onRemove={() => {
                        const rest = draft.conditions.filter((each) => each.id !== row.id);
                        onChange({ ...draft, conditions: rest.length > 0 ? rest : [blankCondition()] });
                    }}
                    problem={Boolean(problems?.conditions[index])}
                    row={row}
                />
            ))}
            <Add onClick={() => onChange({ ...draft, conditions: [...draft.conditions, blankCondition()] })}>
                {sheet.addCondition}
            </Add>

            <div className={LABEL}>{columns.outcome}</div>
            {draft.actions.map((row, index) => (
                <ActionRow
                    canCategory={row.type === "category" || !hasCategory}
                    key={row.id}
                    onChange={(next) =>
                        onChange({ ...draft, actions: draft.actions.map((each) => (each.id === row.id ? next : each)) })
                    }
                    onRemove={() => {
                        const rest = draft.actions.filter((each) => each.id !== row.id);
                        onChange({ ...draft, actions: rest.length > 0 ? rest : [blankAction({ actions: [] })] });
                    }}
                    problem={Boolean(problems?.actions[index])}
                    row={row}
                    tagListId={tagListId}
                />
            ))}
            <datalist id={tagListId}>
                {tagNames.map((name) => (
                    <option key={name} value={name}>
                        {name}
                    </option>
                ))}
            </datalist>
            <Add onClick={() => onChange({ ...draft, actions: [...draft.actions, blankAction(draft)] })}>
                {sheet.addAction}
            </Add>

            <div className={LABEL}>{sheet.position}</div>
            <div className={PICKS}>
                <Pick
                    onPick={(value) => onChange({ ...draft, position: Number(value) })}
                    options={positions}
                    quiet={false}
                    value={String(Math.min(draft.position, others.length))}
                />
            </div>
            {children}
        </div>
    );
}
