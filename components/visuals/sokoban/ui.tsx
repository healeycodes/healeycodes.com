// Shared pieces for the Sokoban diagrams: the tile board, sizing/visibility hooks,
// colours and the one global stylesheet.
//
// Board tiles are the "Lager" skin by Borgar Thorsteinsson (borgar.net),
// https://github.com/borgar/sokoban-skins, CC BY 3.0, used with permission.
// They are drawn at integer scale with image-rendering: pixelated. Everything
// layered on top (arrows, fills, labels) is plain SVG.

import React, { useEffect, useRef, useState } from 'react';
import { Level, xy } from './engine';

export const TILE = 20; // sprite size in px
const SPRITES = '/posts/sokoban/lager/lager-20-';

export const C = {
    ink: '#1d1d27',
    muted: '#73738b',
    faint: '#b6b6c2',
    grid: '#e6e6ec',
    panel: '#f5f4f0',
    blue: '#4f7fbf',
    red: '#cf5c55',
    amber: '#e39b3b',
    green: '#5a9e6f',
    purple: '#8a78b8',
    us: '#e2703a',
};

export function Styles() {
    return (
        <style jsx global>{`
            .sk-fig {
                margin: 36px 0;
                color: ${C.ink};
                font-size: 13px;
                line-height: 1.4;
                letter-spacing: 0;
            }
            .sk-fig svg {
                display: block;
                overflow: visible;
            }
            .sk-fig svg text {
                font-family: inherit;
            }
            .sk-title {
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .sk-sub {
                color: ${C.muted};
                font-weight: 400;
            }
            .sk-row {
                display: flex;
                flex-wrap: wrap;
                gap: 20px 28px;
                align-items: center;
                justify-content: center;
            }
            .sk-col {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            .sk-cap {
                color: ${C.muted};
                font-size: 12.5px;
                text-align: center;
            }
            .sk-num {
                font-variant-numeric: tabular-nums;
            }
            .sk-mono {
                font-family: 'IBM Plex Mono', monospace;
                font-size: 12px;
            }
            .sk-board {
                position: relative;
                flex: none;
            }
            .sk-board i {
                position: absolute;
                display: block;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                background-size: 100% 100%;
            }
            .sk-board svg {
                position: absolute;
                left: 0;
                top: 0;
            }
            .sk-btn {
                font: inherit;
                font-size: 12.5px;
                color: ${C.ink};
                background: #fff;
                border: 1px solid ${C.faint};
                border-radius: 3px;
                padding: 3px 10px;
                cursor: pointer;
            }
            .sk-btn:hover {
                border-color: ${C.muted};
            }
            .sk-btn[aria-pressed='true'] {
                background: ${C.ink};
                border-color: ${C.ink};
                color: #fff;
            }
            .sk-legend {
                display: flex;
                flex-wrap: wrap;
                gap: 4px 16px;
                justify-content: center;
                color: ${C.muted};
                font-size: 12.5px;
            }
            .sk-legend span {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .sk-sw {
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 2px;
            }
        `}</style>
    );
}

export function Figure({ title, sub, children, innerRef }: { title?: string; sub?: string; children: React.ReactNode; innerRef?: React.Ref<HTMLDivElement> }) {
    return (
        <div className="sk-fig" ref={innerRef}>
            <Styles />
            {title ? (
                <div className="sk-title">
                    {title}
                    {sub ? <span className="sk-sub"> · {sub}</span> : null}
                </div>
            ) : null}
            {children}
        </div>
    );
}

// Width of an element, re-measured on resize. Starts at `initial` for the server render.
export function useWidth<T extends HTMLElement>(initial = 697): [React.RefObject<T>, number] {
    const ref = useRef<T>(null);
    const [w, setW] = useState(initial);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setW(Math.floor(el.getBoundingClientRect().width));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, w];
}

// Largest integer tile scale (1 or 2) that fits `cols` tiles into `width` px.
export function fit(width: number, cols: number, max = 2): number {
    return Math.max(1, Math.min(max, Math.floor(width / (cols * TILE))));
}

// True while the element is on screen and the tab is visible; animations idle otherwise.
export function useOnScreen<T extends HTMLElement>(ref: React.RefObject<T>): boolean {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.15 });
        io.observe(el);
        return () => io.disconnect();
    }, [ref]);
    return on;
}

// A looping step counter: 0..length-1, holds on the last step for `hold` ticks, restarts.
// Only runs while `running`. Returns [step, setStep].
export function useLoop(length: number, ms: number, hold: number, running: boolean): [number, (n: number) => void] {
    const [t, setT] = useState(0);
    useEffect(() => {
        if (!running) return;
        const id = setInterval(() => setT((t) => (t + 1) % (length + hold)), ms);
        return () => clearInterval(id);
    }, [length, ms, hold, running]);
    return [Math.min(t, length - 1), setT];
}

const sprite = (name: string) => `url(${SPRITES}${name}.png)`;

const Tiles = React.memo(function Tiles({ level, px }: { level: Level; px: number }) {
    const out: React.ReactNode[] = [];
    for (let p = 0; p < level.w * level.h; p++) {
        const wall = level.walls[p];
        if (!wall && !level.inside[p]) continue;
        const [x, y] = xy(level, p);
        const name = wall ? 'wall' : level.goals.includes(p) ? 'dock' : 'floor';
        out.push(<i key={p} style={{ left: x * px, top: y * px, width: px, height: px, backgroundImage: sprite(name) }} />);
    }
    return <>{out}</>;
});

// The board. `children` are SVG elements drawn over it in tile units (1 = one tile).
export function Board({
    level,
    boxes,
    player,
    scale,
    children,
    label,
}: {
    level: Level;
    boxes?: number[];
    player?: number | null;
    scale: number;
    children?: React.ReactNode;
    label?: string;
}) {
    const px = TILE * scale;
    const bs = boxes ?? level.boxes;
    const pl = player === undefined ? level.player : player;
    return (
        <div className="sk-board" style={{ width: level.w * px, height: level.h * px }} role="img" aria-label={label ?? 'Sokoban board'}>
            <Tiles level={level} px={px} />
            {bs.map((b, i) => {
                const [x, y] = xy(level, b);
                return <i key={'b' + i} style={{ left: x * px, top: y * px, width: px, height: px, backgroundImage: sprite(level.goals.includes(b) ? 'box-docked' : 'box') }} />;
            })}
            {pl !== null && pl >= 0 ? (
                <i
                    style={{
                        left: xy(level, pl)[0] * px,
                        top: xy(level, pl)[1] * px,
                        width: px,
                        height: px,
                        backgroundImage: sprite(level.goals.includes(pl) ? 'worker-docked' : 'worker'),
                    }}
                />
            ) : null}
            {children ? (
                <svg width={level.w * px} height={level.h * px} viewBox={`0 0 ${level.w} ${level.h}`}>
                    {children}
                </svg>
            ) : null}
        </div>
    );
}

// Small arrow in tile units, from the centre of one cell toward another.
export function Arrow({ x1, y1, x2, y2, color, width = 0.09 }: { x1: number; y1: number; x2: number; y2: number; color: string; width?: number }) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const head = width * 3.2;
    const bx = x2 - ux * head;
    const by = y2 - uy * head;
    return (
        <g>
            <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" />
            <polygon points={`${x2},${y2} ${bx - uy * head * 0.6},${by + ux * head * 0.6} ${bx + uy * head * 0.6},${by - ux * head * 0.6}`} fill={color} />
        </g>
    );
}

// A path drawn square by square through cell centres (tile units), with an arrowhead.
// `cells` are [x, y] tile coordinates; `inset` trims the first segment so the line
// starts at the edge of the starting tile's sprite rather than its centre.
export function GridPath({ cells, color, width = 0.09, head = true, dashed = false, opacity = 1 }: { cells: (readonly [number, number])[]; color: string; width?: number; head?: boolean; dashed?: boolean; opacity?: number }) {
    if (cells.length < 2) return null;
    const pts = cells.map(([x, y]) => [x + 0.5, y + 0.5]);
    const n = pts.length;
    const [ax, ay] = pts[n - 2];
    const [bx, by] = pts[n - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    const h = head ? width * 3.2 : 0;
    const ex = bx - ux * h;
    const ey = by - uy * h;
    const d = pts
        .slice(0, n - 1)
        .map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`)
        .join('') + `L${ex},${ey}`;
    return (
        <g opacity={opacity}>
            <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${width * 2} ${width * 2}` : undefined} />
            {head ? <polygon points={`${bx},${by} ${ex - uy * h * 0.6},${ey + ux * h * 0.6} ${ex + uy * h * 0.6},${ey - ux * h * 0.6}`} fill={color} /> : null}
        </g>
    );
}

export const fmt = (n: number) => n.toLocaleString('en-US');
