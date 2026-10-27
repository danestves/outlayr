import { openUrl } from "./open-url";

const APP_STORE_REVIEW = "itms-apps://apps.apple.com/app/id6801652978?action=write-review";

export const openStoreReview = () => openUrl(APP_STORE_REVIEW);
