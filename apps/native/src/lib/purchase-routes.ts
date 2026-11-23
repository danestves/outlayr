import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File, Paths } from "expo-file-system";

import { clearDurably, readDurably, writeDurably } from "./durable-file";
import type { PurchaseRoute } from "./queue-file";

const purchaseRoutesFile = () => new File(Paths.document, "purchase-routes");

const PurchaseRouteSchema = Schema.Struct({
    at: Schema.Finite,
    key: Schema.String,
    ledger: Schema.String,
});

const decodePurchaseRoutes = Schema.decodeUnknownOption(Schema.Array(PurchaseRouteSchema));

// Garbled or missing reads as no routes: a half-written list must not route a capture anywhere.
export function readPurchaseRoutes(): readonly PurchaseRoute[] {
    try {
        const text = readDurably(purchaseRoutesFile());
        return text === null ? [] : Option.getOrElse(decodePurchaseRoutes(JSON.parse(text)), () => []);
    } catch {
        return [];
    }
}

export function writePurchaseRoutes(routes: readonly PurchaseRoute[]): void {
    if (routes.length === 0) {
        clearPurchaseRoutes();
        return;
    }
    writeDurably(purchaseRoutesFile(), JSON.stringify(routes));
}

export function clearPurchaseRoutes(): void {
    clearDurably(purchaseRoutesFile());
}

// A deleted ledger never opens again: a settlement still in flight follows its authorization to `to`.
export function retargetPurchaseRoutes(from: string, to: string): void {
    const routes = readPurchaseRoutes();
    if (routes.some((entry) => entry.ledger === from)) {
        writePurchaseRoutes(routes.map((entry) => (entry.ledger === from ? { ...entry, ledger: to } : entry)));
    }
}
