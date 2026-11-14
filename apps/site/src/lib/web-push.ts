export type PushAccess = "allowed" | "blocked" | "prompt" | "unsupported";

const WORKER = "/sw.js";
const SCOPE = "/app/";

export const pushAccess = (): PushAccess => {
    if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) {
        return "unsupported";
    }
    if (Notification.permission === "granted") {
        return "allowed";
    }
    return Notification.permission === "denied" ? "blocked" : "prompt";
};

const keyBytes = (publicKey: string) =>
    Uint8Array.from(atob(publicKey.replaceAll("-", "+").replaceAll("_", "/")), (char) => char.codePointAt(0) ?? 0);

export async function currentPush() {
    const registration = await navigator.serviceWorker?.getRegistration(SCOPE);
    return (await registration?.pushManager.getSubscription()) ?? null;
}

// Not `serviceWorker.ready`: it never settles in a document first loaded at /app, outside the worker's scope.
function activated(registration: ServiceWorkerRegistration) {
    const worker = registration.installing ?? registration.waiting;
    if (registration.active || !worker) {
        return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
        worker.addEventListener("statechange", () => {
            if (worker.state === "activated") {
                resolve();
            } else if (worker.state === "redundant") {
                reject(new Error("The service worker did not install"));
            }
        });
    });
}

export async function subscribePush(publicKey: string) {
    if ((await Notification.requestPermission()) !== "granted") {
        return null;
    }
    const registration = await navigator.serviceWorker.register(WORKER, { scope: SCOPE });
    await activated(registration);
    return registration.pushManager.subscribe({ applicationServerKey: keyBytes(publicKey), userVisibleOnly: true });
}

export async function forgetPush() {
    const subscription = await currentPush().catch(() => null);
    await subscription?.unsubscribe().catch(() => false);
}
