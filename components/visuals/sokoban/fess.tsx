// Feature Space Search (FESS) chapter: the features and the cells.
// Every position is derived from engine.ts; the feature functions live in
// data.fess.ts so check.fess.ts can assert the printed values.

import React, { useMemo } from 'react';
import * as E from './engine';
import { Level, parse, replay, xy } from './engine';
import { HOLLAND_68, HOLLAND_68_SOLUTION } from './data';
import { fessKit, MICROBAN_35, MICROBAN_35_BEST_FIRST, MICROBAN_35_FESS, PROVISIONAL_FESS } from './data.fess';
import { Board, C, Figure, fmt, GridPath, TILE, useLoop, useOnScreen, useWidth } from './ui';

const K = fessKit(E);

const ring = (level: Level, p: number, color: string, key?: React.Key) => {
    const [x, y] = xy(level, p);
    return <rect key={key ?? p} x={x + 0.05} y={y + 0.05} width={0.9} height={0.9} rx={0.08} fill="none" stroke={color} strokeWidth={0.12} />;
};

// ---------------------------------------------------------------------------
// 1. fessFeatures: four features of one position, one per panel
// ---------------------------------------------------------------------------
const AREA_COLORS = [C.blue, C.purple, C.amber, C.green, C.red];

function FessFeatures() {
    const level = useMemo(() => parse(HOLLAND_68), []);
    const d = useMemo(() => {
        const frames = replay(level, HOLLAND_68_SOLUTION);
        const frameAt = PROVISIONAL_FESS.hollandFrame;
        const f = frames[frameAt];
        const pushNo = frames.slice(0, frameAt + 1).filter((x) => x.pushed).length;
        const pushTotal = frames.filter((x) => x.pushed).length;
        return {
            f,
            pushNo,
            pushTotal,
            packed: K.packedBoxes(level, f.boxes),
            areas: K.workerAreas(level, f.boxes),
            rooms: K.rooms(level),
            blocked: K.blockedDoorways(level, f.boxes),
            inWay: K.boxesInTheWay(level, f.boxes),
        };
    }, [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const scale = 1;
    const panelW = level.w * TILE * scale;
    const n = level.boxes.length;
    const { f } = d;

    // room outlines: a segment on every side of a room square that faces something else
    const roomEdges = useMemo(() => {
        const segs: [number, number, number, number][] = [];
        d.rooms.room.forEach((r, p) => {
            if (r < 0) return;
            const [x, y] = xy(level, p);
            const other = (dx: number, dy: number) => {
                const q = E.step(level, p, dx, dy);
                return q < 0 || d.rooms.room[q] !== r;
            };
            if (other(0, -1)) segs.push([x, y, x + 1, y]);
            if (other(0, 1)) segs.push([x, y + 1, x + 1, y + 1]);
            if (other(-1, 0)) segs.push([x, y, x, y + 1]);
            if (other(1, 0)) segs.push([x + 1, y, x + 1, y + 1]);
        });
        return segs;
    }, [d, level]);

    const panels: { key: string; name: string; value: string; overlay: React.ReactNode }[] = [
        {
            key: 'packing',
            name: 'Packing',
            value: `packed: ${d.packed.length} of ${n}`,
            overlay: d.packed.map((b) => ring(level, b, C.green)),
        },
        {
            key: 'conn',
            name: 'Connectivity',
            value: `worker areas: ${d.areas.count}`,
            overlay: d.areas.label.map((a, p) => {
                if (a < 0) return null;
                const [x, y] = xy(level, p);
                return <rect key={p} x={x} y={y} width={1} height={1} fill={AREA_COLORS[a % AREA_COLORS.length]} opacity={0.32} />;
            }),
        },
        {
            key: 'rooms',
            name: 'Room connectivity',
            value: `blocked doorways: ${d.blocked.length}`,
            overlay: (
                <>
                    {roomEdges.map(([x1, y1, x2, y2], i) => (
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={0.07} opacity={0.55} strokeLinecap="square" />
                    ))}
                    {d.rooms.doors.map((p) => {
                        const [x, y] = xy(level, p);
                        const shut = d.blocked.includes(p);
                        return shut ? (
                            <g key={p}>
                                <rect x={x} y={y} width={1} height={1} fill={C.red} opacity={0.25} />
                                {ring(level, p, C.red)}
                            </g>
                        ) : (
                            <rect key={p} x={x + 0.12} y={y + 0.12} width={0.76} height={0.76} fill="none" stroke={C.muted} strokeWidth={0.06} strokeDasharray="0.12 0.1" />
                        );
                    })}
                </>
            ),
        },
        {
            key: 'hot',
            name: 'Hotspots',
            value: `boxes in the way: ${d.inWay.blockers.length}`,
            overlay: (
                <>
                    {d.inWay.routes.map((r, i) => (
                        <GridPath key={i} cells={r.path.map((p) => xy(level, p))} color={C.ink} width={0.1} opacity={0.6} />
                    ))}
                    {d.inWay.blockers.map((b) => ring(level, b, C.red))}
                </>
            ),
        },
    ];

    const two = width >= 2 * panelW + 28;
    return (
        <Figure innerRef={ref} title="Four features of one position" sub={`Holland #68 after ${d.pushNo} of ${d.pushTotal} pushes`}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: two ? `repeat(2, ${panelW}px)` : `${panelW}px`,
                    gap: '22px 28px',
                    justifyContent: 'center',
                }}
            >
                {panels.map((p) => (
                    <div className="sk-col" key={p.key} style={{ gap: 6 }}>
                        <Board level={level} boxes={f.boxes} player={f.player} scale={scale} label={`${p.name}: ${p.value}`}>
                            {p.overlay}
                        </Board>
                        <div className="sk-cap sk-num" style={{ color: C.ink }}>
                            <span style={{ fontWeight: 600 }}>{p.name}</span> <span style={{ color: C.muted }}>· {p.value}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="sk-legend" style={{ marginTop: 14 }}>
                <span>
                    <i className="sk-sw" style={{ border: `2px solid ${C.green}` }} /> box on a goal
                </span>
                <span>
                    <i className="sk-sw" style={{ background: C.blue, opacity: 0.4 }} /> area the worker can&apos;t leave
                </span>
                <span>
                    <i className="sk-sw" style={{ border: `1px dashed ${C.muted}` }} /> doorway
                </span>
                <span>
                    <i className="sk-sw" style={{ border: `2px solid ${C.red}` }} /> box in the way
                </span>
                <span>
                    <i className="sk-sw" style={{ height: 2, background: C.ink, opacity: 0.6 }} /> path it blocks
                </span>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 2. fessCells: the same expansions spent by best-first and by FESS
// ---------------------------------------------------------------------------
type Trace = { cells: [number, number][]; solvedAt: number };

// pinned traces: two digits per expansion; both searches end on the solved position
const decode = (s: string): Trace => {
    const cells: [number, number][] = [];
    for (let i = 0; i < s.length; i += 2) cells.push([Number(s[i]), Number(s[i + 1])]);
    return { cells, solvedAt: cells.length };
};

const finalCounts = (t: Trace) => {
    const c: Record<string, number> = {};
    t.cells.forEach((x) => (c[x.join(',')] = (c[x.join(',')] ?? 0) + 1));
    return Object.values(c);
};

function CellGrid({ title, trace, n, maxCount, nb, maxAreas, cell }: { title: string; trace: Trace; n: number; maxCount: number; nb: number; maxAreas: number; cell: number }) {
    const shown = Math.min(n, trace.cells.length);
    const counts: Record<string, number> = {};
    for (let i = 0; i < shown; i++) {
        const k = trace.cells[i].join(',');
        counts[k] = (counts[k] ?? 0) + 1;
    }
    const solved = n >= trace.solvedAt;
    const cur = shown > 0 ? trace.cells[shown - 1].join(',') : '';
    const gx = 30;
    const gw = gx + cell * (nb + 1);
    const gh = cell * maxAreas + 38;
    return (
        <div className="sk-col" style={{ gap: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
            <svg width={gw} height={gh} role="img" aria-label={`${title}: expansions per feature cell`}>
                {Array.from({ length: maxAreas }, (_, ri) => {
                    const a = maxAreas - ri;
                    return (
                        <g key={a}>
                            <text x={gx - 9} y={ri * cell + cell / 2 + 4} fontSize={12} textAnchor="end" fill={C.muted} className="sk-num">
                                {a}
                            </text>
                            {Array.from({ length: nb + 1 }, (_, p) => {
                                const k = p + ',' + a;
                                const c = counts[k] ?? 0;
                                const mark = cur === k;
                                return (
                                    <g key={p} transform={`translate(${gx + p * cell},${ri * cell})`}>
                                        <rect x={1} y={1} width={cell - 2} height={cell - 2} fill={c ? C.blue : '#fff'} fillOpacity={c ? 0.08 + 0.62 * Math.sqrt(c / maxCount) : 1} stroke={C.grid} strokeWidth={1} />
                                        {mark ? <rect x={1.5} y={1.5} width={cell - 3} height={cell - 3} fill="none" stroke={solved ? C.green : C.us} strokeWidth={2.5} /> : null}
                                        {c ? (
                                            <text x={cell / 2} y={cell / 2 + 4} fontSize={11} textAnchor="middle" fill={C.ink} className="sk-num">
                                                {c}
                                            </text>
                                        ) : null}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
                {Array.from({ length: nb + 1 }, (_, p) => (
                    <text key={p} x={gx + p * cell + cell / 2} y={maxAreas * cell + 15} fontSize={12} textAnchor="middle" fill={C.muted} className="sk-num">
                        {p}
                    </text>
                ))}
                <text x={gx + (cell * (nb + 1)) / 2} y={maxAreas * cell + 32} fontSize={12} textAnchor="middle" fill={C.muted}>
                    boxes on goals
                </text>
                <text transform={`translate(9,${(maxAreas * cell) / 2}) rotate(-90)`} fontSize={12} textAnchor="middle" fill={C.muted}>
                    worker areas
                </text>
            </svg>
            <div className="sk-cap sk-num" style={{ color: C.ink, lineHeight: 1.5 }}>
                cells reached: {Object.keys(counts).length} · expansions: {fmt(shown)}
                <br />
                {solved ? <span style={{ color: C.green }}>solved at: {fmt(trace.solvedAt)}</span> : <span style={{ color: C.muted }}>not solved yet</span>}
            </div>
        </div>
    );
}

const TICKS = 100;

function FessCells() {
    const level = useMemo(() => parse(MICROBAN_35), []);
    const { best, fess, maxCount, maxAreas, schedule } = useMemo(() => {
        const best = decode(MICROBAN_35_BEST_FIRST);
        const fess = decode(MICROBAN_35_FESS);
        const total = Math.max(best.cells.length, fess.cells.length);
        const maxAreas = Math.max(...best.cells.map((c) => c[1]), ...fess.cells.map((c) => c[1]));
        // slow at first (one expansion per tick), then faster
        const schedule = Array.from({ length: TICKS }, (_, t) => Math.max(t + 1, Math.round(total * Math.pow((t + 1) / TICKS, 2.2))));
        return { best, fess, maxCount: Math.max(...finalCounts(best), ...finalCounts(fess)), maxAreas, schedule };
    }, []);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [t] = useLoop(TICKS, 120, 30, on);
    const n = schedule[t];
    const scale = width >= 520 ? 2 : 1;
    const cell = 36;
    const nb = level.boxes.length;
    return (
        <Figure innerRef={ref} title="Where the expansions go" sub="Microban #35, 5 boxes">
            <div className="sk-row" style={{ alignItems: 'center', gap: '20px 40px' }}>
                <div className="sk-col" style={{ gap: 6 }}>
                    <Board level={level} scale={scale} label="Microban level 35, start position" />
                    <div className="sk-cap">start</div>
                </div>
                <div className="sk-col" style={{ gap: 22 }}>
                    <CellGrid title="Best-first" trace={best} n={n} maxCount={maxCount} nb={nb} maxAreas={maxAreas} cell={cell} />
                    <CellGrid title="FESS" trace={fess} n={n} maxCount={maxCount} nb={nb} maxAreas={maxAreas} cell={cell} />
                </div>
            </div>
        </Figure>
    );
}

export const VISUALS: Record<string, React.ComponentType> = {
    fessFeatures: FessFeatures,
    fessCells: FessCells,
};
