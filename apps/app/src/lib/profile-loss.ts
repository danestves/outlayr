import { ConvexError } from "convex/values";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const Refusal = Schema.Struct({ code: Schema.String });
const decodeRefusal = Schema.decodeUnknownOption(Refusal);

export type ProfileLossCode = "NOT_PROFILE_MEMBER" | "PROFILE_DELETED";

export function profileLossCode(error: Error): ProfileLossCode | null {
    if (!(error instanceof ConvexError)) {
        return null;
    }
    const code = Option.getOrNull(decodeRefusal(error.data))?.code;
    return code === "NOT_PROFILE_MEMBER" || code === "PROFILE_DELETED" ? code : null;
}

const LOST_NOTICE = "outlayr-profile-lost";

const storage = () => {
    try {
        return sessionStorage;
    } catch {
        return null;
    }
};

export function noteProfileLost() {
    storage()?.setItem(LOST_NOTICE, "1");
}

export function takeProfileLost() {
    const store = storage();
    if (store === null) {
        return false;
    }
    const lost = store.getItem(LOST_NOTICE) !== null;
    store.removeItem(LOST_NOTICE);
    return lost;
}
