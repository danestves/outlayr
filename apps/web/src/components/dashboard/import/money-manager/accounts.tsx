import type { AccountTarget, MmAccountGroup, MmAccountView, MmChoices } from "@outlayr/money/money-manager/types";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import { Cell, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { LookTile } from "@/components/ledger/tiles";
import { money } from "@/lib/ledger";

import { Card, ImportPage } from "../parts";
import { accountOf } from "./model";
import type { Draft } from "./model";
import { MmBar, Pick } from "./parts";
import type { PickGroup } from "./parts";

const GROUPS: readonly MmAccountGroup[] = ["open", "hidden", "deleted"];

interface Props {
    draft: Draft;
    onBack: () => void;
    onChoices: (choices: MmChoices) => void;
}

export function Accounts({ draft, onBack, onChoices }: Props) {
    const { accounts: copy } = useIntlayer("dashboard-import-mm");
    const groupTitle = { deleted: copy.groupDeleted, hidden: copy.groupHidden, open: copy.groupOpen };

    const labelOf = (target: AccountTarget | undefined) => {
        switch (target?.kind) {
            case "new": {
                return target.accountKind === "liability" ? copy.newCard.value : copy.newAccount.value;
            }
            case "existing": {
                const name = draft.ledger.accounts.find((account) => account.id === target.accountId)?.name ?? "";
                return copy.into.value.replace("{name}", name);
            }
            case "merge": {
                return copy.into.value.replace("{name}", accountOf(draft, target.intoUid)?.title ?? "");
            }
            default: {
                return copy.left.value;
            }
        }
    };

    const groupsFor = (view: MmAccountView): PickGroup[] => {
        const target = draft.choices.accounts[view.uid];
        const set = (next: AccountTarget) =>
            onChoices({ ...draft.choices, accounts: { ...draft.choices.accounts, [view.uid]: next } });
        const sameCurrency = draft.ledger.accounts.filter((account) => account.currency === view.currency);
        const others = draft.analysis.accounts.filter(
            (other) =>
                other.uid !== view.uid &&
                other.currency === view.currency &&
                draft.choices.accounts[other.uid]?.kind === "new"
        );
        return [
            {
                options: [
                    {
                        current: target?.kind === "new" && target.accountKind !== "liability",
                        key: "asset",
                        label: copy.asNew,
                        onPick: () => set({ accountKind: "asset", kind: "new" }),
                    },
                    {
                        current: target?.kind === "new" && target.accountKind === "liability",
                        key: "liability",
                        label: copy.asCard,
                        onPick: () => set({ accountKind: "liability", kind: "new" }),
                    },
                ],
                title: copy.bring,
            },
            ...(sameCurrency.length > 0
                ? [
                      {
                          options: sameCurrency.map((account) => ({
                              current: target?.kind === "existing" && target.accountId === account.id,
                              key: account.id,
                              label: account.name,
                              onPick: () => set({ accountId: account.id, kind: "existing" }),
                          })),
                          title: copy.already,
                      },
                  ]
                : []),
            ...(others.length > 0
                ? [
                      {
                          options: others.map((other) => ({
                              current: target?.kind === "merge" && target.intoUid === other.uid,
                              key: other.uid,
                              label: other.title,
                              onPick: () => set({ intoUid: other.uid, kind: "merge" }),
                          })),
                          title: copy.join,
                      },
                  ]
                : []),
            {
                options: [
                    {
                        current: target?.kind === "skip",
                        key: "skip",
                        label: copy.leave,
                        onPick: () => set({ kind: "skip" }),
                    },
                ],
            },
        ];
    };

    return (
        <ImportPage>
            <MmBar onBack={onBack} title={copy.title} />
            <div className="flex flex-col gap-4">
                {GROUPS.map((group) => {
                    const rows = draft.analysis.accounts.filter((account) => account.group === group);
                    return rows.length === 0 ? null : (
                        <Card key={group} title={groupTitle[group]}>
                            <DataTable head={[copy.title, copy.entries, copy.inMm, copy.goesTo]}>
                                {rows.map((view) => (
                                    <Table.Row key={view.uid}>
                                        <Cell>
                                            <span className="flex items-center gap-2.5">
                                                <LookTile look={{ color: view.color, emoji: null, icon: view.icon }} />
                                                <span className="truncate">{view.title}</span>
                                            </span>
                                        </Cell>
                                        <Cell figure>{view.entryCount}</Cell>
                                        <Cell figure>
                                            {view.balance === null ? "" : money(view.balance, view.currency)}
                                        </Cell>
                                        <Cell>
                                            <Pick
                                                groups={groupsFor(view)}
                                                label={labelOf(draft.choices.accounts[view.uid])}
                                            />
                                        </Cell>
                                    </Table.Row>
                                ))}
                            </DataTable>
                        </Card>
                    );
                })}
                <p className="text-muted-foreground text-[13px] leading-5">{copy.note}</p>
            </div>
        </ImportPage>
    );
}
