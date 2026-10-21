export interface SupportDiagnostics {
    appBuild: string;
    appName: string;
    appVersion: string;
    deviceName: string;
    osName: string;
    osVersion: string;
}

const RULE = "--------------------------------------";

function known(value: string): string {
    return value.trim() === "" ? "Unknown" : value.trim();
}

export function supportBody(info: SupportDiagnostics): string {
    return [
        `Application Name: ${known(info.appName)} |`,
        `Platform: ${known(info.osName)} ${known(info.osVersion)} |`,
        `Device: ${known(info.deviceName)} |`,
        `App Version: ${known(info.appVersion)} |`,
        `App Build: ${known(info.appBuild)} |`,
        RULE,
    ].join("\n");
}

export function supportMailto(address: string, subject: string, info: SupportDiagnostics): string {
    const query = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(supportBody(info))}`].join("&");
    return `mailto:${address}?${query}`;
}
