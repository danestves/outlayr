import type { RateTable } from "@outlayr/money/valuation";
import { useRef, useState, useSyncExternalStore } from "react";
import { Pressable, View } from "react-native";
import ReanimatedSwipeable, { SwipeDirection } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated from "react-native-reanimated";

import type { ActionMenuItem } from "@/components/action-menu";
import { ArrivalMark } from "@/components/arrival-mark";
import { CompactRowsContext } from "@/components/compact-rows";
import { Text } from "@/components/text";
import { TransactionRow } from "@/components/transaction-row";
import type { TransactionWithCategory } from "@/data/transactions";
import { useTranslation } from "@/i18n/context";
import { freshEntries } from "@/lib/fresh-entries";

interface SwipeableTransactionRowProps {
    author?: string | null;
    currency: string;
    dated?: boolean;
    menuItems: readonly ActionMenuItem[];
    /** Set where a swipe right should confirm an unreviewed row. */
    onConfirm?: (id: string) => void;
    onDelete: (id: string) => void;
    onPress: (id: string) => void;
    rates?: RateTable;
    transaction: TransactionWithCategory;
}

export function SwipeableTransactionRow({
    transaction,
    author,
    currency,
    dated = false,
    rates,
    onPress,
    menuItems,
    onConfirm,
    onDelete,
}: SwipeableTransactionRowProps) {
    const swipeRef = useRef<SwipeableMethods>(null);
    const [swipedId, setSwipedId] = useState<string | null>(null);
    const [recycles, setRecycles] = useState(0);
    const t = useTranslation();
    const { id } = transaction;
    const fresh = useSyncExternalStore(freshEntries.subscribe, () => freshEntries.has(id));
    const settle = () => freshEntries.settle(id);

    if (swipedId !== null && swipedId !== id) {
        setSwipedId(null);
        setRecycles(recycles + 1);
    }

    const renderRightActions = () => (
        <Pressable
            accessibilityLabel={t("log.row.deleteAccessibility")}
            accessibilityRole="button"
            className="bg-danger-fill my-1 ml-3 items-center justify-center rounded-xl px-6"
            onPress={() => {
                swipeRef.current?.close();
                onDelete(transaction.id);
            }}
        >
            <Text className="font-sans-semibold text-subtitle text-white">{t("log.row.delete")}</Text>
        </Pressable>
    );

    const confirm = transaction.unreviewed ? onConfirm : undefined;
    const renderLeftActions = () => (
        <View className="bg-income my-1 mr-3 items-center justify-center rounded-xl px-6">
            <Text className="font-sans-semibold text-subtitle text-background">{t("log.row.confirm")}</Text>
        </View>
    );

    return (
        <View>
            <ReanimatedSwipeable
                friction={2}
                key={recycles}
                onSwipeableClose={() => {
                    setSwipedId(null);
                }}
                onSwipeableOpen={(direction) => {
                    if (confirm && direction === SwipeDirection.RIGHT) {
                        swipeRef.current?.close();
                        confirm(id);
                    }
                }}
                onSwipeableOpenStartDrag={() => {
                    setSwipedId(id);
                }}
                overshootRight={false}
                ref={swipeRef}
                overshootLeft={false}
                renderLeftActions={confirm ? renderLeftActions : undefined}
                renderRightActions={renderRightActions}
                rightThreshold={40}
            >
                <Animated.View className="bg-background">
                    <CompactRowsContext value>
                        <TransactionRow
                            author={author}
                            currency={currency}
                            dated={dated}
                            menuItems={menuItems}
                            onDelete={onDelete}
                            onPress={(rowId) => {
                                // A swipe must not also open the row: in the modal Review sheet
                                // the press outlived the pan.
                                if (swipedId === null) {
                                    onPress(rowId);
                                }
                            }}
                            rates={rates}
                            transaction={transaction}
                        />
                    </CompactRowsContext>
                </Animated.View>
            </ReanimatedSwipeable>
            {fresh ? <ArrivalMark key={id} onSettled={settle} /> : null}
        </View>
    );
}
