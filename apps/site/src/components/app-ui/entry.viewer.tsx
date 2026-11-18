import type { CanvasProps } from "./canvas";
import { NewEntryScreen, SentenceCard, TodayCard } from "./entry";
import { AddMenuScreen } from "./entry-add-menu";
import { ACCOUNT, CATEGORY, EMPTY, FILLED, NAME, NAME_CHIPS, NUMPAD } from "./entry-state";
import type { EntryState } from "./entry-state";

const sheet = (state: EntryState) =>
    function EntryState(canvas: CanvasProps) {
        return <NewEntryScreen {...canvas} state={state} />;
    };

export const screens = {
    "add-menu": AddMenuScreen,
    "entry-sentence-card": SentenceCard,
    "entry-today-card": TodayCard,
    "new-entry-account": sheet(ACCOUNT),
    "new-entry-category": sheet(CATEGORY),
    "new-entry-empty": sheet(EMPTY),
    "new-entry-filled": sheet(FILLED),
    "new-entry-name": sheet(NAME),
    "new-entry-name-chips": sheet(NAME_CHIPS),
    "new-entry-numpad": sheet(NUMPAD),
};
