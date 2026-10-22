import { CloseToolbar } from "@/components/close-toolbar";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { Owe } from "@/screens/debts/owe";

export default function OweScreen() {
    const { leave, setDirty } = useDiscardGuard();

    return (
        <>
            <CloseToolbar placement="left" />

            <Owe onDirtyChange={setDirty} onDone={leave} />
        </>
    );
}
