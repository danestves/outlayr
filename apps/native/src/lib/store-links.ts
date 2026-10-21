import { Linking } from "react-native";

const APP_STORE_REVIEW = "itms-apps://apps.apple.com/app/id6801652978?action=write-review";

export function openStoreReview(): Promise<void> {
    return Linking.openURL(APP_STORE_REVIEW);
}
