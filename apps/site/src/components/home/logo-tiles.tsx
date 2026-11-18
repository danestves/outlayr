import { useLoaderData } from "@tanstack/react-router";

import { countryLogos } from "./country-logos";

interface Tile {
    pick: readonly ["global" | "local", 0 | 1 | 2 | 3];
    x: number;
    y: number;
    z: number;
    r: number;
    w: number;
    i: number;
    phone?: { x: number; y: number; w: number };
}

const TILES: readonly Tile[] = [
    { i: 0, phone: { w: 60, x: 9, y: 67 }, pick: ["global", 0], r: -6, w: 76, x: 7, y: 58, z: 3 },
    { i: 2, phone: { w: 48, x: 24, y: 86 }, pick: ["local", 0], r: 5, w: 56, x: 19, y: 80, z: 1 },
    { i: 4, pick: ["local", 2], r: -3, w: 62, x: 26, y: 44, z: 2 },
    { i: 6, pick: ["global", 1], r: 4, w: 52, x: 12, y: 30, z: 1 },
    { i: 1, phone: { w: 62, x: 91, y: 66 }, pick: ["local", 1], r: 6, w: 80, x: 93, y: 56, z: 3 },
    { i: 3, phone: { w: 48, x: 77, y: 87 }, pick: ["global", 2], r: -5, w: 54, x: 81, y: 82, z: 1 },
    { i: 5, pick: ["global", 3], r: 3, w: 64, x: 74, y: 42, z: 2 },
    { i: 7, pick: ["local", 3], r: -4, w: 52, x: 88, y: 28, z: 1 },
];

export function LogoTiles() {
    const logos = countryLogos(useLoaderData({ from: "__root__" }));
    return (
        <div aria-hidden="true" className="hz-tiles" data-reveal="group">
            {TILES.map((tile) => {
                const [group, index] = tile.pick;
                const logo = logos[group][index];
                return (
                    <span
                        className="hz-tile"
                        data-wide={tile.phone ? undefined : ""}
                        key={tile.i}
                        style={{
                            "--i": `${tile.i}`,
                            "--r": `${tile.r}deg`,
                            "--w": `${tile.w}px`,
                            "--wm": tile.phone && `${tile.phone.w}px`,
                            "--x": `${tile.x}%`,
                            "--xm": tile.phone && `${tile.phone.x}%`,
                            "--y": `${tile.y}%`,
                            "--ym": tile.phone && `${tile.phone.y}%`,
                            "--z": `${tile.z}`,
                        }}
                    >
                        <span className="hz-tile-face">
                            <img
                                alt=""
                                decoding="async"
                                height="80"
                                loading="lazy"
                                src={`/media/logos/${logo}.webp`}
                                width="80"
                            />
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
