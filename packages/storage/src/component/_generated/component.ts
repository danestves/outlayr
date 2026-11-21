/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    objects: {
      confirmUpload: FunctionReference<
        "action",
        "internal",
        {
          key: string;
          provider:
            | { kind: "convex" }
            | {
                accessKeyId: string;
                bucket: string;
                endpoint?: string;
                forcePathStyle: boolean;
                kind: "s3";
                region: string;
                secretAccessKey: string;
              };
          storageId?: string;
        },
        | { bytes: number; kind: "stored" }
        | { kind: "missing" }
        | { kind: "boundElsewhere" },
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        {
          key: string;
          provider:
            | { kind: "convex" }
            | {
                accessKeyId: string;
                bucket: string;
                endpoint?: string;
                forcePathStyle: boolean;
                kind: "s3";
                region: string;
                secretAccessKey: string;
              };
        },
        null,
        Name
      >;
      uploadUrl: FunctionReference<
        "mutation",
        "internal",
        {
          expiresIn?: number;
          key: string;
          provider:
            | { kind: "convex" }
            | {
                accessKeyId: string;
                bucket: string;
                endpoint?: string;
                forcePathStyle: boolean;
                kind: "s3";
                region: string;
                secretAccessKey: string;
              };
        },
        { method: "POST" | "PUT"; url: string },
        Name
      >;
      urls: FunctionReference<
        "mutation",
        "internal",
        {
          expiresIn: number;
          keys: Array<string>;
          provider:
            | { kind: "convex" }
            | {
                accessKeyId: string;
                bucket: string;
                endpoint?: string;
                forcePathStyle: boolean;
                kind: "s3";
                region: string;
                secretAccessKey: string;
              };
        },
        Array<{ key: string; url: string }>,
        Name
      >;
    };
  };
