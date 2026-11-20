import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon";
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { merchantKey } from "@outlayr/money/merchant-key";
import { MERCHANT_NAMES_KEY, merchantNamesOf, renamedMerchant } from "@outlayr/money/merchant-names";
import { useRouteContext } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Tabs } from "panelui-web/tabs";
import { useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { logoUrl, useUploadSquare } from "@/components/dashboard/accounts/identity-picker";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { MerchantTile } from "@/components/ledger/tiles";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogContent } from "@/components/ui/dialog-content";
import { hasAiConsent } from "@/lib/ai-consent";
import type { Doc } from "@/lib/entry-writes";
import { ledgerCollections } from "@/lib/ledger-db";
import { writeSettings } from "@/lib/ledger-settings";
import { merchantEdited, merchantEntries, websiteDomain } from "@/lib/merchant-writes";
import type { MerchantChange } from "@/lib/merchant-writes";
import { photoSrc } from "@/lib/photo-src";

import { useCategoryName } from "../home/format";
import { entryNotices } from "./use-delete";

const LOGO_PREFIX = "merchants/";

type Lookup = { domain: string; state: "checking" | "found" | "missing" } | null;
type Tab = "logo" | "photo";

/** Renames go into the synced rename map too, so the next capture and import arrive under the new name. */
function useMerchantWrite() {
    const db = useLedgerDb();
    const committer = useLedgerCommitter(entryNotices);
    const copy = useIntlayer("dashboard-merchant");
    return (doc: Doc, change: MerchantChange) => {
        const { rows } = merchantEdited(committer.current().books.transactions, doc.localId, change, Date.now());
        const before = db.collection(ledgerCollections.appMeta).get(MERCHANT_NAMES_KEY)?.value ?? null;
        const remembers = change.everywhere && merchantKey(doc.note) !== "" && doc.note.trim() !== change.name.trim();
        const after = remembers
            ? JSON.stringify(renamedMerchant(merchantNamesOf(before), doc.note, change.name))
            : null;
        const writeNames = (value: string) =>
            writeSettings(db, { [MERCHANT_NAMES_KEY]: value }).catch(() => {
                committer.notify({ failed: true, text: copy.failed.value });
            });
        const revert = () => {
            if (after !== null) {
                void writeNames(before ?? "{}");
            }
        };
        if (after !== null) {
            void writeNames(after);
        }
        if (rows.length === 0) {
            return;
        }
        const held = committer.commitWithUndo(rows, {
            failed: copy.failed.value,
            onUndone: revert,
            text: rows.length === 1 ? copy.saved.value : copy.savedMany({ count: String(rows.length) }).value,
        });
        void held.settled.then((result) => {
            if (result.status === "failed") {
                revert();
            }
        });
    };
}

/** The phone shares a website the same way, so the next person who logs this merchant gets the logo too. */
function useShareWebsite() {
    const convex = useRouteContext({ from: "/_account/_app", select: (context) => context.convexQueryClient });
    const { locale } = useLocale();
    return (args: { categoryName: string | null; currency: string; domain: string; income: boolean; name: string }) => {
        void convex?.convexClient
            .action(api.enrichment.submitWebsite, {
                ...args,
                ...(hasAiConsent() && { aiConsent: AI_CONSENT_VERSION }),
                locale,
            })
            .catch(() => null);
    };
}

interface MerchantFormProps {
    doc: Doc;
    onDone: () => void;
    onSaved: () => void;
}

function MerchantForm({ doc, onDone, onSaved }: MerchantFormProps) {
    const copy = useIntlayer("dashboard-merchant");
    const { ledger } = useDashboard();
    const categoryName = useCategoryName();
    const write = useMerchantWrite();
    const share = useShareWebsite();
    const upload = useUploadSquare();
    const formId = useId();
    const fileInput = useRef<HTMLInputElement>(null);
    const category = ledger.books.categories.find((each) => each.localId === doc.categoryId);
    const current = doc.note.trim();
    const shownName = current || (category ? categoryName({ id: category.localId, name: category.name ?? "" }) : "");
    const entries = useMemo(
        () => merchantEntries(ledger.books.transactions, doc.localId),
        [doc.localId, ledger.books.transactions]
    );
    const startDomain = doc.imageKey?.startsWith(LOGO_PREFIX) ? doc.imageKey.slice(LOGO_PREFIX.length) : null;
    const [name, setName] = useState(current);
    const [everywhere, setEverywhere] = useState(true);
    const [tab, setTab] = useState<Tab>(doc.imageKey && !startDomain ? "photo" : "logo");
    const [website, setWebsite] = useState(startDomain ?? "");
    const [lookup, setLookup] = useState<Lookup>(startDomain ? { domain: startDomain, state: "found" } : null);
    const [photo, setPhoto] = useState<{ key: string; preview: string } | null>(null);
    const [photoFailed, setPhotoFailed] = useState(false);
    const [tried, setTried] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const shared = current !== "";
    const spreads = shared && everywhere;
    const newName = name.trim();
    const renaming = newName !== "" && newName !== current;
    const foundDomain = lookup?.state === "found" ? lookup.domain : null;
    const newDomain = foundDomain !== null && foundDomain !== startDomain ? foundDomain : null;
    const logoKey = newDomain === null ? undefined : `${LOGO_PREFIX}${newDomain}`;
    const imageKey = tab === "photo" ? photo?.key : logoKey;
    const preview = () => {
        if (tab === "photo" && photo) {
            return photo.preview;
        }
        return tab === "logo" && foundDomain !== null ? logoUrl(foundDomain) : photoSrc(doc.imageKey);
    };
    const change: MerchantChange = { everywhere: spreads, name: newName, ...(imageKey && { imageKey }) };
    const renamedCount = spreads ? entries.filter((each) => each.note !== newName).length : 1;

    const find = () => {
        const domain = websiteDomain(website);
        if (domain === null) {
            setLookup({ domain: website.trim(), state: "missing" });
            return;
        }
        setLookup({ domain, state: "checking" });
        const probe = new Image();
        const settle = (state: "found" | "missing") => () =>
            setLookup((now) => (now?.domain === domain ? { domain, state } : now));
        probe.addEventListener("load", settle("found"));
        probe.addEventListener("error", settle("missing"));
        probe.src = logoUrl(domain);
    };

    const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const [file] = event.target.files ?? [];
        if (!file) {
            return;
        }
        setPhotoFailed(false);
        try {
            setPhoto(await upload(file));
        } catch {
            setPhotoFailed(true);
        }
    };

    const save = () => {
        write(doc, change);
        if (newDomain !== null && tab === "logo") {
            share({
                categoryName: category?.name ?? null,
                currency: doc.currency ?? ledger.currency,
                domain: newDomain,
                income: doc.income,
                name: newName,
            });
        }
        onSaved();
        onDone();
    };

    const lookupLine = () => {
        if (lookup?.state === "checking") {
            return <p className="text-muted-foreground text-app-label">{copy.checking}</p>;
        }
        if (lookup?.state === "missing" && lookup.domain !== "") {
            return <p className="text-destructive text-app-label">{copy.noLogoThere}</p>;
        }
        return newDomain === null ? null : (
            <p className="text-muted-foreground text-app-label">{copy.shared({ merchant: newName || shownName })}</p>
        );
    };

    return (
        <form
            id={formId}
            onSubmit={(event) => {
                event.preventDefault();
                setTried(true);
                if (newName === "") {
                    return;
                }
                if (renaming && spreads) {
                    setConfirming(true);
                    return;
                }
                save();
            }}
        >
            <Dialog.Header title={copy.title} />
            <Dialog.Body className="flex flex-col gap-4">
                <div className="flex items-end gap-3">
                    <MerchantTile imageUrl={preview()} name={newName || shownName} size="xl" />
                    <Field className="min-w-0 flex-1" invalid={tried && newName === ""}>
                        <Field.Label>{copy.name}</Field.Label>
                        <Input
                            autoFocus
                            maxLength={64}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={shownName}
                            value={name}
                        />
                        <Field.Error match>{copy.nameRequired}</Field.Error>
                    </Field>
                </div>
                <Tabs
                    className="gap-3"
                    onValueChange={(next) => setTab(next === "photo" ? "photo" : "logo")}
                    value={tab}
                >
                    <Tabs.List className="w-full [&>*]:flex-1">
                        <Tabs.Trigger value="logo">{copy.logo}</Tabs.Trigger>
                        <Tabs.Trigger value="photo">{copy.photo}</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content className="flex flex-col gap-3" value="logo">
                        <div className="border-border rounded-app-md flex items-center gap-3 border p-3">
                            {foundDomain === null ? (
                                <span className="bg-muted text-muted-foreground rounded-app-sm flex size-8 shrink-0 items-center justify-center">
                                    <HugeiconsIcon icon={Image01Icon} size={16} strokeWidth={2} />
                                </span>
                            ) : (
                                <img
                                    alt=""
                                    className="rounded-app-sm size-8 shrink-0 bg-white object-cover"
                                    src={logoUrl(foundDomain)}
                                />
                            )}
                            <span className="min-w-0">
                                <span className="text-app-body block font-medium">
                                    {foundDomain === null ? copy.missing : copy.found({ domain: foundDomain })}
                                </span>
                                {foundDomain === null ? (
                                    <span className="text-muted-foreground text-app-label block">
                                        {copy.missingHint}
                                    </span>
                                ) : null}
                            </span>
                        </div>
                        <Field>
                            <Field.Label>{copy.website}</Field.Label>
                            <Input.Group>
                                <Input.Addon>
                                    <HugeiconsIcon icon={Globe02Icon} size={16} strokeWidth={2} />
                                </Input.Addon>
                                <Input
                                    inputMode="url"
                                    onChange={(event) => setWebsite(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            find();
                                        }
                                    }}
                                    placeholder={copy.websitePlaceholder.value}
                                    value={website}
                                />
                                <Input.Addon align="end">
                                    <Button
                                        disabled={website.trim() === "" || lookup?.state === "checking"}
                                        onClick={find}
                                        size="sm"
                                        type="button"
                                        variant="outline"
                                    >
                                        {copy.find}
                                    </Button>
                                </Input.Addon>
                            </Input.Group>
                        </Field>
                        {lookupLine()}
                    </Tabs.Content>
                    <Tabs.Content className="flex flex-col gap-2" value="photo">
                        <Button onClick={() => fileInput.current?.click()} type="button" variant="outline">
                            {photo ? copy.photoChosen : copy.choosePhoto}
                        </Button>
                        <Input accept="image/*" hidden onChange={onFile} ref={fileInput} type="file" />
                        {photoFailed ? (
                            <p className="text-destructive text-app-label" role="alert">
                                {copy.photoFailed}
                            </p>
                        ) : null}
                    </Tabs.Content>
                </Tabs>
                {shared ? (
                    <label className="text-app-body flex items-center gap-2.5">
                        <Checkbox checked={everywhere} onCheckedChange={setEverywhere} />
                        {entries.length > 1
                            ? copy.applies({ count: String(entries.length), merchant: current })
                            : copy.appliesOne({ merchant: current })}
                    </label>
                ) : null}
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onDone} type="button" variant="outline">
                    {copy.cancel}
                </Button>
                <Button form={formId} type="submit">
                    {copy.save}
                </Button>
            </Dialog.Footer>
            <ConfirmDialog
                action={copy.confirm.action}
                body={
                    renamedCount > 1
                        ? copy.confirm.body({ count: String(renamedCount), from: current, to: newName })
                        : copy.confirm.bodyOne({ from: current, to: newName })
                }
                cancel={copy.cancel}
                onAction={save}
                onOpenChange={setConfirming}
                open={confirming}
                title={renamedCount > 1 ? copy.confirm.title({ count: String(renamedCount) }) : copy.confirm.titleOne}
            />
        </form>
    );
}

interface MerchantDialogProps {
    entryId: string | null;
    onClose: () => void;
    onSaved: () => void;
}

/** Name, logo and website for one merchant, written to this entry or every entry under the same name. */
export function MerchantDialog({ entryId, onClose, onSaved }: MerchantDialogProps) {
    const { ledger } = useDashboard();
    // The dialog fades out after the id clears, and it should keep its contents while it does.
    const [shownId, setShownId] = useState(entryId);
    if (entryId !== null && entryId !== shownId) {
        setShownId(entryId);
    }
    const doc = ledger.books.transactions.find((each) => each.localId === shownId && each.deletedAt === null);
    return (
        <Dialog onOpenChange={(open) => (open ? null : onClose())} open={entryId !== null && doc !== undefined}>
            <DialogContent size="md">
                {doc ? <MerchantForm doc={doc} key={doc.localId} onDone={onClose} onSaved={onSaved} /> : null}
            </DialogContent>
        </Dialog>
    );
}
