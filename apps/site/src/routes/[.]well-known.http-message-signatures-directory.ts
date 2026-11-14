import { createFileRoute } from "@tanstack/react-router";

const DIRECTORY = {
    keys: [
        {
            crv: "Ed25519",
            kid: "y7IGbrJ-ykig0_WmlCB6I3pL_NpeyQ5Ps2lrws-tJzo",
            kty: "OKP",
            x: "2PlRd68Q7SeXM0958qF5obkFY9biI6zJv8MRuHltZ9k",
        },
    ],
};

export const Route = createFileRoute("/.well-known/http-message-signatures-directory")({
    server: {
        handlers: {
            GET: () =>
                Response.json(DIRECTORY, {
                    headers: {
                        "cache-control": "public, max-age=86400",
                        "content-type": "application/http-message-signatures-directory+json",
                    },
                }),
        },
    },
});
