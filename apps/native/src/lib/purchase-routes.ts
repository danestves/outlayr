import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File, Paths } from "expo-file-system";

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
        const file = purchaseRoutesFile();
        return file.exists ? Option.getOrElse(decodePurchaseRoutes(JSON.parse(file.textSync())), () => []) : [];
    } catch {
        return [];
    }
}

export function writePurchaseRoutes(routes: readonly PurchaseRoute[]): void {
    if (routes.length === 0) {
        clearPurchaseRoutes();
        return;
    }
    purchaseRoutesFile().writeSync(JSON.stringify(routes));
}

export function clearPurchaseRoutes(): void {
    const file = purchaseRoutesFile();
    if (file.exists) {
        file.delete();
    }
}

// A deleted ledger never opens again: a settlement still in flight follows its authorization to `to`.
export function retargetPurchaseRoutes(from: string, to: string): void {
    const routes = readPurchaseRoutes();
    if (routes.some((entry) => entry.ledger === from)) {
        writePurchaseRoutes(routes.map((entry) => (entry.ledger === from ? { ...entry, ledger: to } : entry)));
    }
}
