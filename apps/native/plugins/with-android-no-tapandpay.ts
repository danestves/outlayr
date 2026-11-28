import { withProjectBuildGradle } from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

const MARKER = "// with-android-no-tapandpay";

// Stripe's compileOnly push provisioning pulls in play-services-tapandpay, which Google
// only ships to approved issuers, so release lint fails to resolve it. Nothing packages it.
const EXCLUDE = `
${MARKER}
allprojects {
    configurations.configureEach {
        exclude group: "com.google.android.gms", module: "play-services-tapandpay"
    }
}
`;

const withAndroidNoTapAndPay: ConfigPlugin = (config) =>
    withProjectBuildGradle(config, (gradleConfig) => {
        if (!gradleConfig.modResults.contents.includes(MARKER)) {
            gradleConfig.modResults.contents += EXCLUDE;
        }
        return gradleConfig;
    });

export default withAndroidNoTapAndPay;
