import { Kpi } from "panelui-web/kpi";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import { DashboardContext } from "@/components/dashboard/shell/dashboard";
import { useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import { TopBar } from "@/components/dashboard/shell/top-bar";

import { CardFrame } from "./card-frame";
import { THREE_CARDS } from "./dashboard-home";

const CHIPS = ["w-20", "w-24", "w-16", "w-22"] as const;
const DAYS = 31;
const BUDGETS = ["w-16", "w-24", "w-20", "w-24", "w-18"] as const;
const TABLE_ROWS = ["w-14", "w-10", "w-16", "w-14", "w-10", "w-16"] as const;
const ACCOUNTS = ["w-14", "w-16", "w-12"] as const;
const UPCOMING = ["w-14", "w-12"] as const;
const CELL = "h-12 px-3 first:ps-3.5 last:pe-3.5";

function Block({ className }: { className: string }) {
    return <i aria-hidden className={`bg-app-fill rounded-app-xs block ${className}`} />;
}

function AccountRows({ widths }: { widths: readonly string[] }) {
    return widths.map((width) => (
        <div className="flex h-10 items-center gap-2.5" key={width}>
            <Block className="rounded-app-sm size-6.5" />
            <Block className={`h-3 ${width}`} />
            <Block className="ms-auto h-3 w-20" />
        </div>
    ));
}

export function HomePending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const copy = useIntlayer("dashboard-home");
    const sample = useSample();
    const { columns } = copy.transactions;
    return (
        <DashboardContext value={sample}>
            <main aria-busy aria-label={loadingLabel.value} className="@container min-w-0 px-4 pb-5 sm:px-6">
                <TopBar>
                    {CHIPS.map((width) => (
                        <Block className={`h-8 rounded-full ${width}`} key={width} />
                    ))}
                </TopBar>
                <Kpi.Group className="rounded-app-xl lg:grid lg:auto-cols-fr lg:grid-flow-col" surface>
                    {[copy.kpi.netWorth, copy.kpi.income, copy.kpi.spent, copy.kpi.kept].map((label) => (
                        <Kpi className="min-w-0 gap-0" key={label.value}>
                            <Kpi.Header>
                                <Block className="rounded-app-sm size-7" />
                                <Kpi.Title>{label}</Kpi.Title>
                            </Kpi.Header>
                            <Block className="mt-3 h-7 w-36" />
                            <div className="mt-3 flex justify-between gap-3">
                                <Block className="h-5 w-12 rounded-full" />
                                <Block className="h-5 w-20" />
                            </div>
                        </Kpi>
                    ))}
                </Kpi.Group>
                <div
                    className={`mt-4 grid grid-cols-1 gap-4 @2xl:grid-cols-2 @4xl:auto-rows-[minmax(347px,auto)] ${THREE_CARDS}`}
                >
                    <CardFrame
                        action={<Block className="h-5 w-10 rounded-full" />}
                        footer={
                            <>
                                <Block className="h-4 w-24" />
                                <Block className="rounded-app-sm ms-auto h-8 w-20" />
                            </>
                        }
                        title={copy.spentOfIncome.title}
                    >
                        <div className="flex flex-col gap-3 p-4">
                            <Block className="h-16 w-full" />
                            <div className="mt-3 flex justify-between">
                                <Block className="h-3 w-8" />
                                <Block className="h-3 w-20" />
                            </div>
                            <div className="mt-3 flex justify-between">
                                <Block className="h-3 w-24" />
                                <Block className="h-3 w-20" />
                            </div>
                            <div className="flex justify-between">
                                <Block className="h-3 w-16" />
                                <Block className="h-3 w-20" />
                            </div>
                        </div>
                    </CardFrame>
                    <CardFrame
                        action={<Block className="h-4 w-24" />}
                        footer={<Block className="h-4 w-36" />}
                        title={copy.everyDay.title}
                    >
                        <div className="flex gap-6 p-4">
                            <div className="grid w-full max-w-56 grid-cols-7 gap-1">
                                {Array.from({ length: DAYS }, (_, index) => (
                                    <span className="flex aspect-square items-center justify-center" key={index}>
                                        <Block className="size-2.5 rounded-full" />
                                    </span>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2">
                                <Block className="h-3 w-14" />
                                <Block className="h-4 w-16" />
                                <Block className="h-3 w-10" />
                                <Block className="mt-3 h-3 w-14" />
                                <Block className="h-4 w-16" />
                            </div>
                        </div>
                    </CardFrame>
                    <CardFrame
                        action={<Block className="h-6 w-14 rounded-full" />}
                        footer={
                            <>
                                <Block className="h-4 w-24" />
                                <Block className="rounded-app-sm ms-auto h-8 w-20" />
                            </>
                        }
                        title={copy.panel.budgets}
                    >
                        <div className="flex flex-col gap-4 p-4">
                            {BUDGETS.map((width, index) => (
                                <div className="flex flex-col gap-2" key={index}>
                                    <div className="flex justify-between">
                                        <Block className={`h-3 ${width}`} />
                                        <Block className="h-3 w-20" />
                                    </div>
                                    <Block className="h-1.5 w-full rounded-full" />
                                </div>
                            ))}
                        </div>
                    </CardFrame>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 @4xl:grid-cols-3">
                    <CardFrame className="@4xl:col-span-2" title={copy.transactions.title}>
                        <Table aria-label={copy.transactions.title.value} maxHeight="none">
                            <Table.Header>
                                <Table.Row className="border-0">
                                    <Table.Head className={CELL}>{columns.merchant}</Table.Head>
                                    <Table.Head className={CELL}>{columns.category}</Table.Head>
                                    <Table.Head className={`${CELL} hidden @2xl:table-cell`}>
                                        {columns.account}
                                    </Table.Head>
                                    <Table.Head className={`${CELL} hidden @2xl:table-cell`}>{columns.date}</Table.Head>
                                    <Table.Head align="end" className={CELL}>
                                        {columns.amount}
                                    </Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {TABLE_ROWS.map((width, index) => (
                                    <Table.Row aria-hidden key={index}>
                                        <Table.Cell className={CELL}>
                                            <span className="flex items-center gap-2.5">
                                                <Block className="rounded-app-sm size-6.5" />
                                                <Block className={`h-3 ${width}`} />
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell className={CELL}>
                                            <Block className="h-5 w-20 rounded-full" />
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} hidden @2xl:table-cell`}>
                                            <Block className="h-3 w-14" />
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} hidden @2xl:table-cell`}>
                                            <Block className="h-3 w-10" />
                                        </Table.Cell>
                                        <Table.Cell className={CELL}>
                                            <Block className="ms-auto h-3 w-16" />
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table>
                    </CardFrame>
                    <CardFrame action={<Block className="h-4 w-20" />} title={copy.panel.accounts}>
                        <div className="px-4 pt-1.5 pb-2">
                            <AccountRows widths={ACCOUNTS} />
                            <div className="bg-border -mx-4 my-2 h-px" />
                            <div className="text-muted-foreground text-app-caption pt-1.5 pb-0.5">
                                {copy.panel.upcoming}
                            </div>
                            <AccountRows widths={UPCOMING} />
                        </div>
                    </CardFrame>
                </div>
            </main>
        </DashboardContext>
    );
}

export function HomeFirstVisit() {
    return (
        <DashboardShell>
            <HomePending />
        </DashboardShell>
    );
}
