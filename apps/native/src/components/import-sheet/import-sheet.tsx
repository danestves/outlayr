import { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { router } from "expo-router";
import { useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { Platform, View } from "react-native";
import Animated, { FadeInLeft, FadeInRight, ReduceMotion } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { canAdvance, IMPORT_STEPS } from "@/domain/import-flow";
import type { ImportFlowState, ImportStep } from "@/domain/import-flow";
import { paywallHref } from "@/domain/paywall-trigger";
import { useImportReview } from "@/hooks/use-import-review";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { importDraftStore, useImportDraft } from "@/lib/import-draft-store";
import { posthog } from "@/lib/posthog";

import { ResumeNotice } from "./resume-notice";
import { SheetHeader } from "./sheet-header";
import { DoneStep } from "./steps/done-step";
import { FileStep } from "./steps/file-step";
import { ResolveStep } from "./steps/resolve-step";
import { ReviewStep } from "./steps/review-step";
import { SourceStep } from "./steps/source-step";
import { useChooseImportFile } from "./use-choose-import-file";

const STEP_TRANSITION_MS = 200;

const STEP_TITLE = {
    done: "import.titleDone",
    file: "import.titleFile",
    resolve: "import.titleResolve",
    review: "import.titleReview",
    source: "import.titleSource",
} satisfies Record<ImportStep, TranslationKey>;

const STEP_BACK = {
    done: null,
    file: "source",
    resolve: "file",
    review: "file",
    source: null,
} satisfies Record<ImportStep, ImportStep | null>;

export function resolveLegalStep(flow: ImportFlowState, step: ImportStep): ImportStep {
    let index = IMPORT_STEPS.indexOf(step);
    while (index > 0 && !canAdvance(flow, IMPORT_STEPS[index - 1])) {
        index -= 1;
    }
    return IMPORT_STEPS[index];
}

function openPaywall() {
    posthog?.capture("limit_hit", { limit: "import" });
    router.push(paywallHref("import"));
}

export interface ImportSheetHandle {
    dismiss: () => void;
    present: () => void;
}

interface StepBodyProps {
    onDone: () => void;
    onOpenFeatureLab: () => void;
    step: ImportStep;
}

function StepBody({ step, onOpenFeatureLab, onDone }: StepBodyProps) {
    const review = useImportReview();
    const { status, choose } = useChooseImportFile();

    switch (step) {
        case "source": {
            return <SourceStep />;
        }
        case "file": {
            return <FileStep busy={status === "loading"} onChoose={choose} />;
        }
        case "resolve": {
            return <ResolveStep onOpenFeatureLab={onOpenFeatureLab} onSeePro={openPaywall} review={review} />;
        }
        case "review": {
            return <ReviewStep review={review} />;
        }
        case "done": {
            return <DoneStep onDone={onDone} review={review} />;
        }
        default: {
            return null;
        }
    }
}

interface ImportSheetProps {
    ref?: Ref<ImportSheetHandle>;
}

export function ImportSheet({ ref }: ImportSheetProps) {
    const t = useTranslation();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [presented, setPresented] = useState(false);
    // SAFETY: declared in global.css for both schemes, as in `outlayr-mark`.
    const backgroundColor = useCSSVariable("--background") as string;

    const dismiss = () => {
        sheetRef.current?.dismiss();
    };

    useImperativeHandle(ref, () => ({
        dismiss() {
            sheetRef.current?.dismiss();
        },
        present() {
            setPresented(true);
            sheetRef.current?.present();
        },
    }));

    const draft = useImportDraft();
    const step = resolveLegalStep(draft.flow, draft.ui.step);

    // Held in state rather than a ref written during render, a side effect the compiler cannot follow.
    const [previousStep, setPreviousStep] = useState(step);
    const [forward, setForward] = useState(true);
    if (step !== previousStep) {
        setForward(IMPORT_STEPS.indexOf(step) >= IMPORT_STEPS.indexOf(previousStep));
        setPreviousStep(step);
    }

    const onDismiss = () => {
        setPresented(false);
        if (importDraftStore.getSnapshot().flow.commit.phase === "success") {
            importDraftStore.clear();
            return;
        }
        importDraftStore.commitDismissal();
    };

    const onOpenFeatureLab = () => {
        dismiss();
        router.push("/settings/feature-lab");
    };

    const back = STEP_BACK[step];
    const onBack = back == null ? undefined : () => importDraftStore.setStep(back);

    const entering = (forward ? FadeInRight : FadeInLeft)
        .duration(STEP_TRANSITION_MS)
        .reduceMotion(ReduceMotion.System);

    return (
        <BottomSheetModal
            backgroundStyle={{
                backgroundColor: Platform.OS === "ios" ? `${backgroundColor}FA` : backgroundColor,
            }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={onDismiss}
            ref={sheetRef}
        >
            <View className="flex-1" testID="import-sheet-root">
                {presented ? (
                    <View
                        className="gap-4"
                        ref={(node) => {
                            if (node !== null) {
                                sheetRef.current?.snapToIndex(0);
                            }
                        }}
                    >
                        <SheetHeader forward={forward} onBack={onBack} onClose={dismiss} title={t(STEP_TITLE[step])} />

                        {draft.ui.resumed ? <ResumeNotice onStartOver={() => importDraftStore.clear()} /> : null}
                        <Animated.View className="flex-1" entering={entering} key={step}>
                            <StepBody onDone={dismiss} onOpenFeatureLab={onOpenFeatureLab} step={step} />
                        </Animated.View>
                    </View>
                ) : null}
            </View>
        </BottomSheetModal>
    );
}
