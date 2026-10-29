import { LinkRow } from "@/components/list/list-row";
import { useTranslation } from "@/i18n/context";

export function LogAutologPaused({ onPress, waiting }: { onPress: () => void; waiting: number }) {
    const t = useTranslation();
    return <LinkRow icon="Wallet01" onPress={onPress} title={t("log.autolog.paused", { count: waiting })} />;
}
