// "Sokoban intuition" diagrams: greedy evaluation, boxes that start on goals,
// tunnel macros and packing order. Everything is driven by engine.ts; the boards,
// lines and claims are checked by check.boards2.ts.

import React, { useMemo } from 'react';
import { applyPush, DIRS, Frame, key, Level, parse, pushes, replay, State, step, xy } from './engine';
import { GOAL_BAY, GOAL_BAY_SOLUTION } from './data';
import { GOAL_BAY_WRONG, GREEDY_BOARD, GREEDY_LINE, GREEDY_SOLUTION, ON_GOAL_BOARD, ON_GOAL_SOLUTION, PROVISIONAL_BOARDS2, TUNNEL_BOARD, TUNNEL_SOLUTION } from './data.boards2';
import { Board, C, Figure, fit, fmt, GridPath, TILE, useLoop, useOnScreen, useWidth } from './ui';

const onGoals = (level: Level, boxes: number[]) => boxes.filter((b) => level.goals.includes(b)).length;

// pushes made up to and including each frame
const pushCounts = (frames: Frame[]) => {
    let n = 0;
    return frames.map((f) => (n += f.pushed ? 1 : 0));
};

// Boxes that never move again in any position reachable from `s` (small boards only).
function stuckBoxes(level: Level, s: State): number[] {
    const start = { boxes: [...s.boxes].sort((a, b) => a - b), player: s.player };
    const seen = new Set([key(level, start)]);
    const queue = [start];
    const still = new Set(start.boxes);
    for (let i = 0; i < queue.length && i < 20000; i++) {
        for (const p of pushes(level, queue[i])) {
            still.delete(p.box);
            const t = applyPush(queue[i], p);
            const k = key(level, t);
            if (seen.has(k)) continue;
            seen.add(k);
            queue.push(t);
        }
        if (!still.size) break;
    }
    return Array.from(still);
}

function Cross({ level, p }: { level: Level; p: number }) {
    const [x, y] = xy(level, p);
    return (
        <g stroke={C.red} strokeWidth={0.12} strokeLinecap="round">
            <line x1={x + 0.26} y1={y + 0.26} x2={x + 0.74} y2={y + 0.74} />
            <line x1={x + 0.74} y1={y + 0.26} x2={x + 0.26} y2={y + 0.74} />
        </g>
    );
}

function Hatch({ id, color = C.red }: { id: string; color?: string }) {
    return (
        <defs>
            <pattern id={id} width={0.25} height={0.25} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width={0.25} height={0.25} fill={color} opacity={0.16} />
                <line x1={0} y1={0} x2={0} y2={0.25} stroke={color} strokeWidth={0.07} opacity={0.7} />
            </pattern>
        </defs>
    );
}

// A row of small cells, one per push so far, each showing boxes on goals.
function GoalTrail({ series, upto, color }: { series: number[]; upto: number; color: string }) {
    return (
        <div className="sk-num sk-mono" style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', minHeight: 20 }}>
            {series.map((v, k) => (
                <span
                    key={k}
                    style={{
                        width: 16,
                        height: 18,
                        lineHeight: '18px',
                        textAlign: 'center',
                        fontSize: 11.5,
                        color: k === upto ? '#fff' : k < upto ? C.ink : C.faint,
                        background: k === upto ? color : 'transparent',
                        border: `1px solid ${k <= upto ? color : C.grid}`,
                        borderRadius: 2,
                    }}
                >
                    {v}
                </span>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// greedyTrap: "most boxes on goals" walks into a freeze
// ---------------------------------------------------------------------------
function GreedyTrap() {
    const level = useMemo(() => parse(GREEDY_BOARD), []);
    const lines = useMemo(() => {
        return [GREEDY_LINE, GREEDY_SOLUTION].map((lurd) => {
            const frames = replay(level, lurd);
            const counts = pushCounts(frames);
            const series = frames.filter((f, i) => i === 0 || f.pushed).map((f) => onGoals(level, f.boxes));
            return { frames, counts, series, stuck: stuckBoxes(level, frames[frames.length - 1]) };
        });
    }, [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const n = Math.max(...lines.map((l) => l.frames.length));
    const [t] = useLoop(n, 340, 9, on);
    const two = width >= 2 * level.w * TILE * 2 + 48;
    const scale = fit(two ? width / 2 - 24 : width, level.w);
    const panels = [
        { title: 'greedy: most boxes on goals first', color: C.red },
        { title: 'solution', color: C.green },
    ];
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ alignItems: 'flex-start', gap: '28px 48px' }}>
                {lines.map((l, k) => {
                    const i = Math.min(t, l.frames.length - 1);
                    const f = l.frames[i];
                    const last = i === l.frames.length - 1;
                    const solved = onGoals(level, f.boxes) === level.goals.length;
                    return (
                        <div className="sk-col" key={k} style={{ width: Math.max(level.w * TILE * scale, 200) }}>
                            <div style={{ fontWeight: 600, color: panels[k].color }}>{panels[k].title}</div>
                            <Board level={level} boxes={f.boxes} player={f.player} scale={scale} label={panels[k].title}>
                                {last && !solved ? l.stuck.map((p) => <Cross key={p} level={level} p={p} />) : null}
                            </Board>
                            <div className="sk-cap" style={{ minHeight: 18 }}>
                                {last ? <span style={{ color: solved ? C.green : C.red, fontWeight: 600 }}>{solved ? 'solved' : 'deadlock'}</span> : `push ${l.counts[i]}`}
                            </div>
                            <div className="sk-cap">boxes on goals after each push</div>
                            <GoalTrail series={l.series} upto={l.counts[i]} color={panels[k].color} />
                        </div>
                    );
                })}
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// boxesOnGoals: a box starts on a goal and has to leave it (d11)
// ---------------------------------------------------------------------------
function BoxesOnGoals() {
    const level = useMemo(() => parse(ON_GOAL_BOARD), []);
    const frames = useMemo(() => replay(level, ON_GOAL_SOLUTION), [level]);
    const counts = useMemo(() => pushCounts(frames), [frames]);
    const series = useMemo(() => frames.filter((f, i) => i === 0 || f.pushed).map((f) => onGoals(level, f.boxes)), [frames, level]);
    // replay() keeps box order, so these indexes follow the boxes that start on a goal and have to leave it
    const leavers = useMemo(() => level.boxes.map((b, k) => k).filter((k) => level.goals.includes(level.boxes[k]) && frames.some((f) => f.boxes[k] !== level.boxes[k])), [frames, level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [i] = useLoop(frames.length, 280, 12, on);
    const f = frames[i];
    const side = width >= 600;
    const scale = fit(side ? width - 320 : width, level.w);

    // strip chart in real px
    const W = Math.min(width, 290);
    const m = { l: 30, r: 12, t: 22, b: 34 };
    const H = 150;
    const n = series.length - 1;
    const X = (k: number) => m.l + (k / n) * (W - m.l - m.r);
    const Y = (v: number) => m.t + (1 - v / level.goals.length) * (H - m.t - m.b);
    const pts = series.map((v, k) => `${X(k)},${Y(v)}`).join(' ');
    const cur = counts[i];
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ gap: '14px 30px' }}>
                <div className="sk-col" style={{ gap: 10 }}>
                    <Board level={level} boxes={f.boxes} player={f.player} scale={scale} label="Boxes that start on goals and must leave them">
                        {leavers.map((k) => {
                            const [bx, by] = xy(level, f.boxes[k]);
                            return <rect key={k} x={bx + 0.05} y={by + 0.05} width={0.9} height={0.9} rx={0.08} fill="none" stroke={C.us} strokeWidth={0.1} />;
                        })}
                    </Board>
                    <div className="sk-legend">
                        <span>
                            <i className="sk-sw" style={{ border: `2px solid ${C.us}` }} /> starts on a goal, has to leave it
                        </span>
                    </div>
                </div>
                <div className="sk-col" style={{ gap: 8 }}>
                    <svg width={W} height={H} role="img" aria-label="Boxes on goals at each push of the solution">
                        {Array.from({ length: level.goals.length + 1 }, (_, v) => (
                            <g key={v}>
                                <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke={C.grid} />
                                <text x={m.l - 8} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={C.muted} className="sk-num">
                                    {v}
                                </text>
                            </g>
                        ))}
                        {series.map((_, k) => (
                            <text key={k} x={X(k)} y={H - m.b + 16} fontSize={11} textAnchor="middle" fill={C.muted} className="sk-num">
                                {k}
                            </text>
                        ))}
                        <text x={(m.l + W - m.r) / 2} y={H - 2} fontSize={11.5} textAnchor="middle" fill={C.muted}>
                            push
                        </text>
                        <text x={m.l} y={11} fontSize={11.5} fill={C.ink}>
                            boxes on goals
                        </text>
                        <polyline points={pts} fill="none" stroke={C.ink} strokeWidth={1.75} strokeLinejoin="round" />
                        {series.map((v, k) => (
                            <circle key={k} cx={X(k)} cy={Y(v)} r={k === cur ? 5 : 3} fill={k === cur ? C.us : '#fff'} stroke={k === cur ? C.us : C.ink} strokeWidth={1.5} />
                        ))}
                    </svg>
                    <div className="sk-cap" style={{ maxWidth: 290 }}>
                        {fmt(PROVISIONAL_BOARDS2.nearPacked.boards)} of {fmt(PROVISIONAL_BOARDS2.nearPacked.of)} benchmark boards start with 75% or more of their boxes on goals.
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// macroTunnel: forced pushes through a corridor count as one decision (d03)
// ---------------------------------------------------------------------------
type Decision = { box: number; first: number; last: number; cells: number[]; tunnel: number[] }; // first/last = frame indexes

function decisionsOf(level: Level, frames: Frame[]): Decision[] {
    // a tunnel square for a push: floor with walls on both sides across the direction of travel
    const tunnel = (p: number, dx: number, dy: number) => {
        const a = step(level, p, dy, dx);
        const b = step(level, p, -dy, -dx);
        return !level.walls[p] && a >= 0 && b >= 0 && level.walls[a] && level.walls[b];
    };
    const out: Decision[] = [];
    let prev: { box: number; dir: string; at: number } | null = null;
    for (let i = 1; i < frames.length; i++) {
        if (!frames[i].pushed) continue;
        const d = DIRS.find((d) => d.name === frames[i].dir)!;
        const box = frames[i].boxes.findIndex((b, k) => b !== frames[i - 1].boxes[k]);
        const from = frames[i - 1].boxes[box];
        const forced = prev !== null && prev.box === box && prev.dir === d.name && prev.at === i - 1 && tunnel(from, d.dx, d.dy);
        if (forced) {
            const cur = out[out.length - 1];
            cur.last = i;
            cur.cells.push(frames[i].boxes[box]);
            cur.tunnel.push(from);
        } else out.push({ box, first: i, last: i, cells: [from, frames[i].boxes[box]], tunnel: [] });
        prev = { box, dir: d.name, at: i };
    }
    return out;
}

function MacroTunnel() {
    const level = useMemo(() => parse(TUNNEL_BOARD), []);
    const frames = useMemo(() => replay(level, TUNNEL_SOLUTION), [level]);
    const counts = useMemo(() => pushCounts(frames), [frames]);
    const decisions = useMemo(() => decisionsOf(level, frames), [level, frames]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [i] = useLoop(frames.length, 420, 9, on);
    const f = frames[i];
    const scale = fit(width, level.w);
    const done = decisions.filter((d) => d.first <= i).length;
    const run = decisions.find((d) => d.tunnel.length > 0 && d.first <= i && i <= d.last);
    const tunnelCells = decisions.flatMap((d) => d.tunnel);
    const pc = (p: number) => xy(level, p);
    return (
        <Figure innerRef={ref}>
            <div className="sk-col" style={{ gap: 14 }}>
                <Board level={level} boxes={f.boxes} player={f.player} scale={scale} label="A box pushed through a tunnel">
                    {tunnelCells.map((p) => (
                        <rect key={p} x={pc(p)[0]} y={pc(p)[1]} width={1} height={1} fill={C.us} opacity={run ? 0.28 : 0.17} />
                    ))}
                    {run ? <GridPath cells={run.cells.map(pc)} color={C.us} width={0.11} /> : null}
                </Board>
                <div style={{ display: 'flex', gap: 36, justifyContent: 'center' }}>
                    <div className="sk-col" style={{ gap: 2 }}>
                        <div className="sk-num" style={{ fontSize: 22, lineHeight: 1.1 }}>
                            {counts[i]}
                            <span style={{ color: C.faint }}> / {counts[counts.length - 1]}</span>
                        </div>
                        <div style={{ color: C.muted, fontSize: 12.5 }}>pushes</div>
                    </div>
                    <div className="sk-col" style={{ gap: 2 }}>
                        <div className="sk-num" style={{ fontSize: 22, lineHeight: 1.1, color: C.us }}>
                            {done}
                            <span style={{ color: C.faint }}> / {decisions.length}</span>
                        </div>
                        <div style={{ color: C.muted, fontSize: 12.5 }}>decisions</div>
                    </div>
                </div>
                <div className="sk-legend">
                    <span>
                        <i className="sk-sw" style={{ background: C.us, opacity: 0.5 }} /> tunnel: the box can only go straight on
                    </span>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// goalRoom: fill order in a goal bay (d04)
// ---------------------------------------------------------------------------
function GoalRoom() {
    const level = useMemo(() => parse(GOAL_BAY), []);
    const lines = useMemo(() => [GOAL_BAY_WRONG, GOAL_BAY_SOLUTION].map((s) => replay(level, s)), [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const n = Math.max(...lines.map((l) => l.length));
    const [t] = useLoop(n, 260, 10, on);
    const narrow = width < 560;
    const scale = fit(narrow ? width : width - 250, level.w);
    const label = Math.max(0.42, 11 / (TILE * scale)); // goal numbers, >= 11 px
    // goals left to right = deepest first; the entrance is the rightmost
    const byDepth = [...level.goals].sort((a, b) => xy(level, a)[0] - xy(level, b)[0]);
    const entrance = byDepth[byDepth.length - 1];
    const rows = [
        { title: 'nearest goal first', color: C.red, order: [...byDepth].reverse(), text: 'The first box parks in the doorway.', end: 'the other two can\'t get in' },
        { title: 'deepest goal first', color: C.green, order: byDepth, text: 'Fill from the back.', end: 'solved' },
    ];
    return (
        <Figure innerRef={ref}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'center' }}>
                {rows.map((r, k) => {
                    const frames = lines[k];
                    const i = Math.min(t, frames.length - 1);
                    const f = frames[i];
                    const last = i === frames.length - 1;
                    return (
                        <div key={k} style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', gap: narrow ? 8 : 28, alignItems: narrow ? 'center' : 'center' }}>
                            <Board level={level} boxes={f.boxes} player={f.player} scale={scale} label={r.title}>
                                <Hatch id={'sk-gr-hatch' + k} />
                                {k === 0 && last
                                    ? byDepth
                                          .filter((g) => g !== entrance)
                                          .map((g) => <rect key={g} x={xy(level, g)[0]} y={xy(level, g)[1]} width={1} height={1} fill={`url(#sk-gr-hatch${k})`} />)
                                    : null}
                                {r.order.map((g, j) => {
                                    // the number sits in the wall tile below its goal
                                    const [x, y] = xy(level, g);
                                    return (
                                        <g key={g}>
                                            <circle cx={x + 0.5} cy={y + 1.5} r={Math.min(0.46, label * 0.75)} fill="#fff" stroke={r.color} strokeWidth={0.06} />
                                            <text x={x + 0.5} y={y + 1.5 + label * 0.36} fontSize={label} textAnchor="middle" fill={C.ink} className="sk-num">
                                                {j + 1}
                                            </text>
                                        </g>
                                    );
                                })}
                            </Board>
                            <div style={{ width: narrow ? level.w * TILE * scale : 220 }}>
                                <div style={{ fontWeight: 600, color: r.color, marginBottom: 4 }}>{r.title}</div>
                                <div style={{ color: C.muted, fontSize: 12.5 }}>{r.text}</div>
                                <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: last ? r.color : 'transparent' }}>{r.end}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Figure>
    );
}

// Registered automatically by components.tsx: id -> component.
export const VISUALS: Record<string, React.ComponentType> = {
    greedyTrap: GreedyTrap,
    boxesOnGoals: BoxesOnGoals,
    macroTunnel: MacroTunnel,
    goalRoom: GoalRoom,
};
