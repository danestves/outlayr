import { useLedger } from "./canvas";
import type { CanvasProps } from "./canvas";
import { NewEntryScreen, SentenceCard, TodayCard } from "./entry";
import { AddMenuScreen } from "./entry-add-menu";
import { entryStates } from "./entry-state";
import type { EntryStates } from "./entry-state";

const sheet = (step: keyof EntryStates) =>
    function EntryState(canvas: CanvasProps) {
        return <NewEntryScreen {...canvas} state={entryStates(useLedger())[step]} />;
    };

export const screens = {
    "add-menu": AddMenuScreen,
    "entry-sentence-card": SentenceCard,
    "entry-today-card": TodayCard,
    "new-entry-account": sheet("ACCOUNT"),
    "new-entry-category": sheet("CATEGORY"),
    "new-entry-empty": sheet("EMPTY"),
    "new-entry-filled": sheet("FILLED"),
    "new-entry-name": sheet("NAME"),
    "new-entry-name-chips": sheet("NAME_CHIPS"),
    "new-entry-numpad": sheet("NUMPAD"),
};
