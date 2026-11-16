// Lane diagrams, round 3: the shared meet tables and deadlock patterns shared between lanes.

import React, { useMemo } from 'react';
import { Level, parse, reach, replay, xy } from './engine';
import { CLUSTER_CELLS, CLUSTER_LEVEL, CLUSTER_OTHERS, CLUSTER_PATHS, CLUSTER_SIDE } from './data.lanes2';
import { Board, C, Figure, fit, useLoop, useOnScreen, useWidth } from './ui';

const MONO = "'IBM Plex Mono', monospace";

// floor squares (the player could stand there, ignoring boxes) in reading order
const floorOf = (level: Level) => {
    const out: number[] = [];
    for (let p = 0; p < level.w * level.h; p++) if (level.inside[p] && !level.walls[p]) out.push(p);
    return out;
};

// ---------------------------------------------------------------------------
// 1. The meet tables: forward and backward lanes write positions, and probe the other side
// ---------------------------------------------------------------------------
type Mark = { tick: number; side: 'f' | 'b'; slot: number; lane: number };
const COLS = 8;
const ROWS = 6;
const TICKS = 22;
function mulberry(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function meetMarks(): { marks: Mark[]; meet: number } {
    const rnd = mulberry(17);
    const n = COLS * ROWS;
    const meet = 19; // the slot where the two sides finally hold the same position
    const fwd: number[] = new Array(n).fill(-1); // tick last written
    const bwd: number[] = new Array(n).fill(-1);
    const marks: Mark[] = [];
    for (let t = 0; t < TICKS; t++) {
        for (const side of ['f', 'b'] as const) {
            if (side === 'b' && t === TICKS - 1) continue;
            let slot: number;
            if (side === 'b' && t === 5) slot = meet;
            else if (side === 'f' && t === TICKS - 1) slot = meet;
            else {
                // keep earlier lookups on empty slots so the one real hit stands out
                do slot = Math.floor(rnd() * n);
                while (slot === meet || (side === 'f' ? bwd[slot] >= 0 : fwd[slot] >= 0));
            }
            (side === 'f' ? fwd : bwd)[slot] = t;
            marks.push({ tick: t, side, slot, lane: Math.floor(rnd() * 4) });
        }
    }
    return { marks, meet };
}

function MeetTable() {
    const { marks, meet } = useMemo(meetMarks, []);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [t] = useLoop(TICKS, 380, 12, on);
    const W = width;
    const wide = W >= 600;
    const cell = wide ? 20 : Math.min(18, Math.floor((W - 28) / 2 / COLS));
    const tw = cell * COLS;
    const th = cell * ROWS;
    const labW = wide ? 84 : 0;
    const gap = wide ? 64 : 28;
    const total = labW * 2 + (wide ? 32 : 0) + tw * 2 + gap;
    const x0 = Math.max(0, (W - total) / 2);
    const fx = x0 + labW + (wide ? 16 : 0);
    const bx = fx + tw + gap;
    const top = wide ? 30 : 62;
    const H = top + th + 46;
    const fLanes = ['macro', 'novelty', 'fa2', 'toward'];
    const bLanes = ['reverse', 'pull', 'hub-pull', 'hub-gen'];
    const done = t === TICKS - 1;
    // latest mark per slot up to tick t
    const state = (side: 'f' | 'b') => {
        const out: (Mark | null)[] = new Array(COLS * ROWS).fill(null);
        for (const m of marks) if (m.side === side && m.tick <= t) out[m.slot] = m;
        return out;
    };
    const fs = state('f');
    const bs = state('b');
    const sxy = (ox: number, s: number) => [ox + (s % COLS) * cell, top + Math.floor(s / COLS) * cell] as const;
    const newest = marks.filter((m) => m.tick === t);
    const laneY = (k: number) => top + 10 + k * (th / 4);
    const table = (ox: number, cells: (Mark | null)[], color: string, title: string) => (
        <g>
            <text x={ox + tw / 2} y={top - 8} fontSize={12} textAnchor="middle" fill={color} fontWeight={600}>
                {title}
            </text>
            {cells.map((m, s) => {
                const [x, y] = sxy(ox, s);
                const fresh = m && m.tick === t;
                return (
                    <g key={s}>
                        <rect x={x} y={y} width={cell} height={cell} fill="#fff" stroke={C.grid} />
                        {m ? <rect x={x + 3} y={y + 3} width={cell - 6} height={cell - 6} fill={color} opacity={fresh ? 0.95 : 0.45} /> : null}
                    </g>
                );
            })}
            <rect x={ox} y={top} width={tw} height={th} fill="none" stroke={C.faint} />
        </g>
    );
    const [mfx, mfy] = sxy(fx, meet);
    const [mbx, mby] = sxy(bx, meet);
    const mid = (fx + tw + bx) / 2;
    return (
        <Figure innerRef={ref}>
            <svg width={W} height={H} role="img" aria-label="Forward lanes write positions into one table, backward lanes into another; a position found by both is a meet">
                {wide ? (
                    <>
                        {fLanes.map((l, k) => (
                            <text key={l} x={fx - 16} y={laneY(k) + 4} fontSize={12} textAnchor="end" fill={C.blue} style={{ fontFamily: MONO }}>
                                {l}
                            </text>
                        ))}
                        {bLanes.map((l, k) => (
                            <text key={l} x={bx + tw + 16} y={laneY(k) + 4} fontSize={12} fill={C.red} style={{ fontFamily: MONO }}>
                                {l}
                            </text>
                        ))}
                    </>
                ) : (
                    <>
                        {[
                            [fx, C.blue, 'macro novelty', 'fa2 toward'],
                            [bx, C.red, 'reverse pull', 'hub-pull hub-gen'],
                        ].map(([ox, col, a, b]) => (
                            <g key={a as string} fill={col as string} fontSize={11} textAnchor="middle" style={{ fontFamily: MONO }}>
                                <text x={(ox as number) + tw / 2} y={14}>
                                    {a}
                                </text>
                                <text x={(ox as number) + tw / 2} y={28}>
                                    {b}
                                </text>
                            </g>
                        ))}
                    </>
                )}
                {table(fx, fs, C.blue, 'forward table')}
                {table(bx, bs, C.red, 'backward table')}
                {wide
                    ? newest.map((m) => {
                          const [x, y] = sxy(m.side === 'f' ? fx : bx, m.slot);
                          const lx = m.side === 'f' ? fx - 12 : bx + tw + 12;
                          const tx = m.side === 'f' ? x : x + cell;
                          return <line key={'l' + m.side} x1={lx} y1={laneY(m.lane)} x2={tx} y2={y + cell / 2} stroke={m.side === 'f' ? C.blue : C.red} strokeWidth={1} opacity={0.6} />;
                      })
                    : null}
                {/* each new position is looked up in the same slot on the other side */}
                {newest.map((m) => {
                    if (m.slot === meet && done) return null;
                    const [x, y] = sxy(m.side === 'f' ? bx : fx, m.slot);
                    return <rect key={'p' + m.side} x={x + 1.5} y={y + 1.5} width={cell - 3} height={cell - 3} fill="none" stroke={m.side === 'f' ? C.blue : C.red} strokeWidth={1.2} strokeDasharray="3 2" />;
                })}
                {done ? (
                    <g>
                        <line x1={mfx + cell} y1={mfy + cell / 2} x2={mbx} y2={mby + cell / 2} stroke={C.green} strokeWidth={2} />
                        <rect x={mfx - 1.5} y={mfy - 1.5} width={cell + 3} height={cell + 3} fill="none" stroke={C.green} strokeWidth={2.5} />
                        <rect x={mbx - 1.5} y={mby - 1.5} width={cell + 3} height={cell + 3} fill="none" stroke={C.green} strokeWidth={2.5} />
                        <text x={mid} y={top + th + 20} fontSize={12} textAnchor="middle" fill={C.green} fontWeight={600}>
                            same position from both sides
                        </text>
                        <text x={mid} y={top + th + 37} fontSize={12} textAnchor="middle" fill={C.muted}>
                            confirm exactly, join the two move lists, verify
                        </text>
                    </g>
                ) : (
                    <text x={mid} y={top + th + 20} fontSize={12} textAnchor="middle" fill={C.muted}>
                        {wide ? 'each new position: write it on its side, look it up on the other (dashed)' : 'write on one side, look up the other'}
                    </text>
                )}
            </svg>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 2. A deadlock pattern one lane proves, which other lanes then look up
// ---------------------------------------------------------------------------
function PatternIcon({ level, cells, side, hot, px }: { level: Level; cells: [number, number][]; side: [number, number]; hot: boolean; px: number }) {
    return (
        <svg width={level.w * px} height={level.h * px} style={{ display: 'block' }} role="img" aria-label="A stored pattern">
            {level.walls.map((w, p) => {
                const [x, y] = xy(level, p);
                if (!w && !level.inside[p]) return null;
                return <rect key={p} x={x * px} y={y * px} width={px} height={px} fill={w ? C.faint : '#fff'} stroke={C.grid} strokeWidth={0.5} />;
            })}
            {cells.map(([x, y]) => (
                <rect key={x + ':' + y} x={x * px + 1} y={y * px + 1} width={px - 2} height={px - 2} fill={C.amber} />
            ))}
            <circle cx={(side[0] + 0.5) * px} cy={(side[1] + 0.5) * px} r={px * 0.28} fill={C.blue} />
            {hot ? <rect x={-2} y={-2} width={level.w * px + 4} height={level.h * px + 4} fill="none" stroke={C.red} strokeWidth={1.5} /> : null}
        </svg>
    );
}

function SharedDeadlocks() {
    const level = useMemo(() => parse(CLUSTER_LEVEL), []);
    const positions = useMemo(() => CLUSTER_PATHS.map((p) => replay(level, p).pop()!), [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const wide = width >= 600;
    const big = fit(width, level.w);
    const ring = (
        <g>
            {CLUSTER_CELLS.map(([x, y]) => (
                <rect key={x + ':' + y} x={x + 0.07} y={y + 0.07} width={0.86} height={0.86} fill="none" stroke={C.red} strokeWidth={0.08} />
            ))}
        </g>
    );
    // the floor the three boxes seal off from the worker
    const sealed = (boxes: number[], player: number) => {
        const r = reach(level, boxes, player);
        return floorOf(level).filter((p) => r[p] < 0 && boxes.indexOf(p) < 0);
    };
    const hatch = (boxes: number[], player: number, id: string) => (
        <>
            <defs>
                <pattern id={id} width={0.25} height={0.25} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1={0} y1={0} x2={0} y2={0.25} stroke={C.red} strokeWidth={0.07} opacity={0.5} />
                </pattern>
            </defs>
            {sealed(boxes, player).map((p) => (
                <rect key={p} x={xy(level, p)[0]} y={xy(level, p)[1]} width={1} height={1} fill={`url(#${id})`} />
            ))}
        </>
    );
    const iconPx = 9;
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ alignItems: 'center', gap: '12px 28px' }}>
                <div className="sk-col" style={{ width: Math.max(level.w * 20 * big, 200) }}>
                    <Board level={level} boxes={positions[0].boxes} player={positions[0].player} scale={big} label="One lane proves three boxes dead">
                        {hatch(positions[0].boxes, positions[0].player, 'sk-l2-hatch-a')}
                        {ring}
                    </Board>
                    <div className="sk-cap">
                        <span style={{ color: C.ink, fontWeight: 600 }}>one lane</span>
                        <br />
                        These three boxes can&apos;t all get home.
                    </div>
                </div>
                <div style={{ color: C.muted, fontSize: 18, width: wide ? undefined : '100%', textAlign: 'center' }}>{wide ? '→' : '↓'}</div>
                <div className="sk-col" style={{ gap: 6 }}>
                    <div style={{ fontWeight: 600 }}>shared table</div>
                    <div style={{ display: 'flex', flexDirection: wide ? 'column' : 'row', gap: 10, alignItems: 'center' }}>
                        <PatternIcon level={level} cells={CLUSTER_CELLS} side={CLUSTER_SIDE} hot px={iconPx} />
                        {CLUSTER_OTHERS.map((o, k) => (
                            <PatternIcon key={k} level={level} cells={o.cells} side={o.side} hot={false} px={iconPx} />
                        ))}
                    </div>
                    <div className="sk-cap" style={{ maxWidth: 160 }}>
                        dead patterns: box squares + worker square
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// Registered automatically by components.tsx: id -> component.
export const VISUALS: Record<string, React.ComponentType> = {
    meetTable: MeetTable,
    sharedDeadlocks: SharedDeadlocks,
};
