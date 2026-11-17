/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = function notificationServiceTarget(config) {
    return {
        bundleIdentifier: ".NotificationService",
        deploymentTarget: "18.0",
        entitlements: {
            "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"],
        },
        name: "OutlayrNotificationService",
        type: "notification-service",
    };
};
