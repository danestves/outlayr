import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Switch } from "panelui-web/switch";
import { useId, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogContent } from "@/components/ui/dialog-content";
import { TextField } from "@/components/ui/text-field";

import { nameTaken, viewName } from "./saved-views";
import type { SavedView } from "./saved-views";

export type ViewDialog =
    | { kind: "delete"; view: SavedView }
    | { kind: "rename"; view: SavedView }
    | { kind: "save"; filters: readonly string[] };

interface NameFormProps {
    filters: readonly string[] | null;
    initial: string;
    onCancel: () => void;
    onSubmit: (name: string, keepSort: boolean) => void;
    except: string | null;
    title: string;
    submit: string;
    views: readonly SavedView[];
}

function NameForm({ except, filters, initial, onCancel, onSubmit, submit, title, views }: NameFormProps) {
    const { views: words } = useIntlayer("dashboard-ledger");
    const [name, setName] = useState(initial);
    const [keepSort, setKeepSort] = useState(true);
    const [tried, setTried] = useState(false);
    const formId = useId();
    const empty = viewName(name) === "";
    const taken = !empty && nameTaken(views, name, except);
    const errorOf = () => {
        if (taken) {
            return words.taken;
        }
        return tried && empty ? words.nameRequired : null;
    };
    return (
        <form
            id={formId}
            onSubmit={(event) => {
                event.preventDefault();
                setTried(true);
                if (!empty && !taken) {
                    onSubmit(name, keepSort);
                }
            }}
        >
            <Dialog.Header title={title} />
            <Dialog.Body className="flex flex-col gap-4">
                <TextField
                    autoFocus
                    error={errorOf()}
                    label={words.name}
                    maxLength={40}
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                />
                {filters === null ? null : (
                    <>
                        <Field>
                            <Field.Label>{words.filters}</Field.Label>
                            {filters.length === 0 ? (
                                <p className="text-muted-foreground text-app-label">{words.noFilters}</p>
                            ) : (
                                <span className="flex flex-wrap gap-1.5">
                                    {filters.map((filter) => (
                                        <Badge key={filter} variant="secondary">
                                            {filter}
                                        </Badge>
                                    ))}
                                </span>
                            )}
                        </Field>
                        <label className="text-app-body flex items-center justify-between gap-3">
                            {words.keepSort}
                            <Switch checked={keepSort} onCheckedChange={setKeepSort} />
                        </label>
                    </>
                )}
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onCancel} type="button" variant="outline">
                    {words.cancel}
                </Button>
                <Button disabled={taken} form={formId} type="submit">
                    {submit}
                </Button>
            </Dialog.Footer>
        </form>
    );
}

interface ViewDialogsProps {
    dialog: ViewDialog | null;
    entries: (view: SavedView) => number;
    onClose: () => void;
    onDelete: (view: SavedView) => void;
    onRename: (view: SavedView, name: string) => void;
    onSave: (name: string, keepSort: boolean) => void;
    views: readonly SavedView[];
}

export function ViewDialogs({ dialog, entries, onClose, onDelete, onRename, onSave, views }: ViewDialogsProps) {
    const { views: words } = useIntlayer("dashboard-ledger");
    const naming = dialog?.kind === "save" || dialog?.kind === "rename";
    return (
        <>
            <Dialog onOpenChange={(open) => (open ? null : onClose())} open={naming}>
                <DialogContent size="sm">
                    {dialog?.kind === "save" ? (
                        <NameForm
                            except={null}
                            filters={dialog.filters}
                            initial=""
                            onCancel={onClose}
                            onSubmit={onSave}
                            submit={words.save.value}
                            title={words.save.value}
                            views={views}
                        />
                    ) : null}
                    {dialog?.kind === "rename" ? (
                        <NameForm
                            except={dialog.view.id}
                            filters={null}
                            initial={dialog.view.name}
                            onCancel={onClose}
                            onSubmit={(name) => onRename(dialog.view, name)}
                            submit={words.saveName.value}
                            title={words.renameTitle.value}
                            views={views}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                action={words.delete}
                body={dialog?.kind === "delete" ? words.deleteBody({ count: String(entries(dialog.view)) }) : null}
                cancel={words.cancel}
                onAction={() => {
                    if (dialog?.kind === "delete") {
                        onDelete(dialog.view);
                    }
                }}
                onOpenChange={(open) => (open ? null : onClose())}
                open={dialog?.kind === "delete"}
                title={dialog?.kind === "delete" ? words.deleteTitle({ name: dialog.view.name }) : null}
                tone="destructive"
            />
        </>
    );
}
