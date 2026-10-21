import { LegendList } from "@legendapp/list/react-native";
import type { LegendListRef } from "@legendapp/list/react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import type { HostInstance, StyleProp, ViewInstance, ViewStyle } from "react-native";
import Animated, {
    Easing,
    FadeIn,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { currencyPickerRows } from "@/domain/currency-picker-rows";
import type { CurrencyCode, CurrencyPickerRow } from "@/domain/currency-picker-rows";
import { FAVOURITE_CURRENCY_LIMIT } from "@/domain/favourite-currencies";

import { CurrencyHint, CurrencyRow, CurrencyRowCopy, CurrencySectionHeader } from "./currency-picker-row";

const EASE = Easing.bezier(0.645, 0.045, 0.355, 1);

// One fade keyed on the query, not one per row: a per-row fade also fires on every row scrolling into view.
const RESULTS_SETTLE = FadeIn.duration(180).easing(EASE.factory()).reduceMotion(ReduceMotion.System);

const TRAVEL = {
    duration: 260,
    easing: EASE,
    reduceMotion: ReduceMotion.System,
} as const;

// A toggle the cap refuses never changes `favourites`, so the landing that ends a travel would never arrive.
const TRAVEL_ABANDON_MS = 700;

interface Travel {
    code: CurrencyCode;
    /** The landing is measured once these rows are replaced. */
    departed: readonly CurrencyPickerRow[];
    height: number;
    left: number;
    selected: boolean;
    top: number;
    width: number;
    wrapperTop: number;
}

interface CurrencyPickerListProps {
    contentContainerStyle?: StyleProp<ViewStyle>;
    favourites: readonly string[];
    onSelect: (code: string) => void;
    /** `null` while no database is open, so favouriting is absent rather than dead. */
    onToggleFavourite: ((code: string, favourite: boolean) => void) | null;
    query: string;
    selected: string;
    style?: StyleProp<ViewStyle>;
}

// Virtualised, not `@expo/ui`'s SwiftUI `List`, which mounts every child: one ~550ms commit for 165 currencies.
// Legend List has no item layout animation, so a favourited row's move is drawn by flying a copy from where it
// stood to where it landed. A landing outside the visible range just moves at once.
export function CurrencyPickerList({
    favourites,
    query,
    selected,
    onSelect,
    onToggleFavourite,
    style,
    contentContainerStyle,
}: CurrencyPickerListProps) {
    const rows = useMemo<readonly CurrencyPickerRow[]>(
        () => currencyPickerRows(favourites, query),
        [favourites, query]
    );

    const full = favourites.length >= FAVOURITE_CURRENCY_LIMIT;

    const listRef = useRef<LegendListRef>(null);
    const wrapperRef = useRef<ViewInstance>(null);
    const [travel, setTravel] = useState<Travel | null>(null);
    const travelled = useSharedValue(0);

    const travelStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: travelled.value }],
    }));

    // Legend List types its container refs as `any` and returns nothing for an unrendered index.
    const containerAt = (index: number): HostInstance | undefined => listRef.current?.getState().elementAtIndex(index);

    const lift = (code: CurrencyCode) => {
        const wrapper = wrapperRef.current;
        const container = containerAt(rows.findIndex((row) => row.key === code));
        if (wrapper === null || !container) {
            return;
        }
        wrapper.measureInWindow((wrapperLeft, wrapperTop) => {
            container.measureInWindow((left, top, width, height) => {
                travelled.value = 0;
                setTravel({
                    code,
                    departed: rows,
                    height,
                    left: left - wrapperLeft,
                    selected: code === selected,
                    top: top - wrapperTop,
                    width,
                    wrapperTop,
                });
            });
        });
    };

    useEffect(() => {
        if (travel === null) {
            return;
        }
        const abandon = setTimeout(() => setTravel(null), TRAVEL_ABANDON_MS);
        return () => clearTimeout(abandon);
    }, [travel]);

    useEffect(() => {
        if (travel === null || rows === travel.departed) {
            return;
        }
        // A frame after the commit, so the containers have taken their new places.
        const frame = requestAnimationFrame(() => {
            const state = listRef.current?.getState();
            const index = rows.findIndex((row) => row.key === travel.code);
            // Legend List's own visible range: outside it there is nothing to fly to.
            if (state === undefined || index < state.start || index > state.end) {
                setTravel(null);
                return;
            }
            const container: HostInstance | undefined = state.elementAtIndex(index);
            if (!container) {
                setTravel(null);
                return;
            }
            container.measureInWindow((_left, top) => {
                travelled.value = withTiming(top - travel.wrapperTop - travel.top, TRAVEL, (finished) => {
                    if (finished) {
                        scheduleOnRN(setTravel, null);
                    }
                });
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [rows, travel, travelled]);

    const toggleFavourite =
        onToggleFavourite === null
            ? null
            : (code: CurrencyCode, favourite: boolean) => {
                  // A search is one flat list, so the row keeps its place.
                  if (query.trim() === "") {
                      lift(code);
                  }
                  onToggleFavourite(code, favourite);
              };

    return (
        <View className="bg-background flex-1" ref={wrapperRef} style={style}>
            <Animated.View className="flex-1" entering={RESULTS_SETTLE} key={query}>
                <LegendList
                    contentContainerStyle={contentContainerStyle}
                    contentInsetAdjustmentBehavior="automatic"
                    // SAFETY: Legend List widens its `data` generic on the way in; `rows` is already narrowed.
                    data={rows as CurrencyPickerRow[]}
                    // A container re-renders only on its own item or `extraData`, so without this the departed row is
                    // never told the copy has landed and stays held back.
                    extraData={travel?.code}
                    // Separate pools: recycling across header, hint and row layouts is what makes a mixed list stutter.
                    getItemType={(row: CurrencyPickerRow) => row.kind}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(row: CurrencyPickerRow) => row.key}
                    // A copy in flight is pinned to where the list stood when it took off.
                    onScroll={travel === null ? undefined : () => setTravel(null)}
                    // `ReanimatedSwipeable` keeps its open/closed offset inside the row
                    // instance, so a recycled row would inherit the previous row's swipe.
                    recycleItems={false}
                    ref={listRef}
                    renderItem={({ item: row }: { item: CurrencyPickerRow }) => {
                        if (row.kind === "header") {
                            return <CurrencySectionHeader section={row.section} />;
                        }
                        if (row.kind === "hint") {
                            return <CurrencyHint />;
                        }
                        return (
                            <CurrencyRow
                                code={row.code}
                                favourite={row.favourite}
                                full={full}
                                last={row.last}
                                onPress={() => onSelect(row.code)}
                                onToggleFavourite={
                                    toggleFavourite === null ? null : () => toggleFavourite(row.code, row.favourite)
                                }
                                selected={row.code === selected}
                                travelling={row.code === travel?.code}
                            />
                        );
                    }}
                />
            </Animated.View>
            {travel === null ? null : (
                <Animated.View
                    className="absolute"
                    pointerEvents="none"
                    style={[
                        {
                            height: travel.height,
                            left: travel.left,
                            top: travel.top,
                            width: travel.width,
                        },
                        travelStyle,
                    ]}
                >
                    <CurrencyRowCopy code={travel.code} selected={travel.selected} />
                </Animated.View>
            )}
        </View>
    );
}
