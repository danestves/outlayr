import type * as Schema from "effect/Schema";

export function dropLaunchUrl<Event extends { event?: string; properties?: Record<string, Schema.MutableJson> }>(
    event: Event | null
): Event | null {
    if (event?.event === "Application Opened" && event.properties !== undefined) {
        delete event.properties.url;
    }
    return event;
}
