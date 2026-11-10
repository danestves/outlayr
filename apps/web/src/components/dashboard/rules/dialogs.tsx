import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Switch } from "panelui-web/switch";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { categoryOf, runOf } from "@/lib/rules";
import type { Change, Rule } from "@/lib/rules";

import { Fact, FlowDialog } from "../accounts/fields";
import type { RulesData } from "./data";
import { useCategoryLook } from "./parts";

function Shell({ children, onClose, size }: { children: ReactNode; onClose: () => void; size: "md" | "sm" }) {
    return (
        <Dialog onOpenChange={(open) => (open ? undefined : onClose())} open>
            <Dialog.Content className="app-shell ph-no-capture" size={size}>
                {children}
            </Dialog.Content>
        </Dialog>
    );
}

export function RunDialog(props: Parameters<typeof RunBody>[0]) {
    return (
        <Shell onClose={props.onClose} size="md">
            <RunBody {...props} />
        </Shell>
    );
}

function RunBody({
    data,
    onClose,
    onRun,
    rule,
}: {
    data: RulesData;
    onClose: () => void;
    onRun: (changes: readonly Change[]) => void;
    rule: Rule | null;
}) {
    const { cancel, run } = useIntlayer("dashboard-rules");
    const look = useCategoryLook();
    const [keepFilled, setKeepFilled] = useState(true);
    const switchId = useId();
    const rules = rule ? [rule] : data.book.rules.filter((each) => each.on);
    const live = new Set(data.tagNames.keys());
    const { changes, kept, matched, right } = runOf(rules, data.entries, data.kinds, live, keepFilled);
    const categoryId = rule ? categoryOf(rule) : null;
    const category = categoryId === null ? null : (look(categoryId)?.name ?? null);
    const count = changes.length;
    return (
        <FlowDialog label={rule ? run.title({ name: rule.name }) : run.titleAll({ count: String(rules.length) })}>
            <Dialog.Body className="gap-3">
                <div>
                    <Fact label={run.match}>{matched.length}</Fact>
                    <Fact label={category === null ? run.alreadyRight : run.already({ category })}>{right}</Fact>
                    {kept > 0 ? <Fact label={run.skipped}>{kept}</Fact> : null}
                    <Fact label={category === null ? run.change : run.changeTo({ category })}>{count}</Fact>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium" htmlFor={switchId}>
                        {run.skip}
                    </label>
                    <Switch checked={keepFilled} id={switchId} onCheckedChange={setKeepFilled} />
                </div>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button
                    disabled={count === 0}
                    onClick={() => {
                        onRun(changes);
                        onClose();
                    }}
                >
                    {count === 0 ? run.nothing : null}
                    {count === 1 ? run.confirmOne : null}
                    {count > 1 ? run.confirm({ count: String(count) }) : null}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}

export function DeleteDialog(props: Parameters<typeof DeleteBody>[0]) {
    return (
        <Shell onClose={props.onClose} size="sm">
            <DeleteBody {...props} />
        </Shell>
    );
}

function DeleteBody({
    count,
    onClose,
    onDelete,
    rule,
}: {
    count: number;
    onClose: () => void;
    onDelete: () => void;
    rule: Rule;
}) {
    const { cancel, deleteRule } = useIntlayer("dashboard-rules");
    return (
        <FlowDialog label={deleteRule.title({ name: rule.name })}>
            <Dialog.Body>
                <Dialog.Description className="text-wrap">
                    {count === 0 ? deleteRule.bodyNone : null}
                    {count === 1 ? deleteRule.bodyOne : null}
                    {count > 1 ? deleteRule.body({ count: String(count) }) : null}
                </Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button
                    onClick={() => {
                        onDelete();
                        onClose();
                    }}
                    variant="destructive"
                >
                    {deleteRule.confirm}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
