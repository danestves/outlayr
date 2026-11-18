import type { LogoDomain } from "@/components/app-ui/ledger";

interface Tile {
    logo: LogoDomain;
    x: number;
    y: number;
    z: number;
    r: number;
    w: number;
    i: number;
    phone?: { x: number; y: number; w: number };
}

const TILES: readonly Tile[] = [
    { i: 0, logo: "amazon.com", phone: { w: 60, x: 9, y: 67 }, r: -6, w: 76, x: 7, y: 58, z: 3 },
    { i: 2, logo: "uber.com", phone: { w: 48, x: 24, y: 86 }, r: 5, w: 56, x: 19, y: 80, z: 1 },
    { i: 4, logo: "doordash.com", r: -3, w: 62, x: 26, y: 44, z: 2 },
    { i: 6, logo: "spotify.com", r: 4, w: 52, x: 12, y: 30, z: 1 },
    { i: 1, logo: "costco.com", phone: { w: 62, x: 91, y: 66 }, r: 6, w: 80, x: 93, y: 56, z: 3 },
    { i: 3, logo: "nike.com", phone: { w: 48, x: 77, y: 87 }, r: -5, w: 54, x: 81, y: 82, z: 1 },
    { i: 5, logo: "paypal.com", r: 3, w: 64, x: 74, y: 42, z: 2 },
    { i: 7, logo: "target.com", r: -4, w: 52, x: 88, y: 28, z: 1 },
];

export function LogoTiles() {
    return (
        <div aria-hidden="true" className="hz-tiles" data-reveal="group">
            {TILES.map((tile) => (
                <span
                    className="hz-tile"
                    data-wide={tile.phone ? undefined : ""}
                    key={tile.logo}
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
                            src={`/media/logos/${tile.logo}.webp`}
                            width="80"
                        />
                    </span>
                </span>
            ))}
        </div>
    );
}
