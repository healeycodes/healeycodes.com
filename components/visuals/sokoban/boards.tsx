// Board-based diagrams: everything here is driven by engine.ts, so what you see
// is always a legal Sokoban position.

import React, { useMemo, useState } from 'react';
import { deadSquares, goalDistances, isSolved, layers as _layers, Level, parse, pushes, reach, replay, search, solve, xy } from './engine';
import { RELAY_AT, RELAY_BOARD, RELAY_SOLUTION, TWO_ROOMS, TWO_ROOMS_SOLUTION } from './data';
import { DEADLOCK_BOARDS, HOLLAND_68, MICROBAN_1, MICROBAN_5, MICROBAN_5_LAYERS, REACH_BOARD } from './data';
import { Arrow, Board, C, Figure, fit, fmt, useLoop, useOnScreen, useWidth } from './ui';

void _layers;

const centre = (level: Level, p: number) => [xy(level, p)[0] + 0.5, xy(level, p)[1] + 0.5] as const;

function Counter({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{ minWidth: 64 }}>
            <div className="sk-num" style={{ fontSize: 22, lineHeight: 1.1 }}>
                {value}
            </div>
            <div style={{ color: C.muted, fontSize: 12.5 }}>{label}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// 1. Sokoban 101: a small board solving itself
// ---------------------------------------------------------------------------
export function Sokoban101() {
    const level = useMemo(() => parse(MICROBAN_1), []);
    const frames = useMemo(() => replay(level, solve(level)), [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [i] = useLoop(frames.length, 260, 8, on);
    const f = frames[i];
    const pushCount = frames.slice(0, i + 1).filter((f) => f.pushed).length;
    const done = isSolved(level, f.boxes);
    const sprite = (name: string) => (
        <i
            style={{
                display: 'inline-block',
                width: 20,
                height: 20,
                flex: 'none',
                imageRendering: 'pixelated',
                backgroundImage: `url(/posts/sokoban/lager/lager-20-${name}.png)`,
            }}
        />
    );
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ gap: '20px 40px' }}>
                <Board level={level} boxes={f.boxes} player={f.player} scale={fit(width, level.w)} label="A small Sokoban level being solved" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '20px auto', gap: '6px 10px', alignItems: 'center', color: C.muted }}>
                        {sprite('worker')}
                        <span>worker: pushes one box at a time</span>
                        {sprite('box')}
                        <span>box: can be pushed, not pulled</span>
                        {sprite('dock')}
                        <span>goal: every box must end on one</span>
                        {sprite('box-docked')}
                        <span>box on a goal</span>
                    </div>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <Counter label="moves" value={i} />
                        <Counter label="pushes" value={pushCount} />
                        <Counter label="" value={<span style={{ color: C.green, visibility: done ? 'visible' : 'hidden' }}>solved</span>} />
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 2. Pushes, not steps: flood fill of the player's reach, then the legal pushes
// ---------------------------------------------------------------------------
export function PushesNotSteps() {
    const level = useMemo(() => parse(REACH_BOARD), []);
    const dist = useMemo(() => reach(level, level.boxes, level.player), [level]);
    const legal = useMemo(() => pushes(level, { boxes: level.boxes, player: level.player }), [level]);
    const maxD = Math.max(...dist);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    // steps: 0..maxD flood fill, then the arrows
    const [t] = useLoop(maxD + 2, 320, 9, on);
    const reached = dist.filter((d) => d >= 0 && d <= t).length;
    const showPushes = t > maxD;
    const floor = level.inside.filter(Boolean).length - level.boxes.length;
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ gap: '20px 40px' }}>
                <Board level={level} scale={fit(width, level.w)} label="Flood fill of the squares the worker can reach">
                    {dist.map((d, p) => {
                        if (d < 0 || d > t) return null;
                        const [x, y] = xy(level, p);
                        return (
                            <g key={p}>
                                <rect x={x} y={y} width={1} height={1} fill={C.blue} opacity={0.3} />
                                {p !== level.player ? (
                                    <text x={x + 0.5} y={y + 0.64} fontSize={0.38} textAnchor="middle" fill="#2c4f80">
                                        {d}
                                    </text>
                                ) : null}
                            </g>
                        );
                    })}
                    {showPushes
                        ? legal.map((p, i) => {
                              const [fx, fy] = centre(level, p.from);
                              const [tx, ty] = centre(level, p.to);
                              return <Arrow key={i} x1={fx + p.dir.dx * 0.25} y1={fy + p.dir.dy * 0.25} x2={tx - p.dir.dx * 0.1} y2={ty - p.dir.dy * 0.1} color={C.us} width={0.11} />;
                          })
                        : null}
                </Board>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 250 }}>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <Counter label={`of ${floor} free squares reachable`} value={reached} />
                        <Counter label="pushes to choose from" value={<span style={{ color: showPushes ? C.us : C.faint }}>{showPushes ? legal.length : '?'}</span>} />
                    </div>
                    <div className="sk-legend" style={{ justifyContent: 'flex-start', flexDirection: 'column', gap: 4 }}>
                        <span>
                            <i className="sk-sw" style={{ background: C.blue, opacity: 0.45 }} /> steps from the worker
                        </span>
                        <span>
                            <i className="sk-sw" style={{ background: C.us }} /> possible push
                        </span>
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 3. Dead squares on a real level
// ---------------------------------------------------------------------------
export function DeadSquares() {
    const level = useMemo(() => parse(HOLLAND_68), []);
    const dead = useMemo(() => deadSquares(level), [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const nDead = dead.filter(Boolean).length;
    const nFloor = level.inside.filter(Boolean).length;
    return (
        <Figure innerRef={ref}>
            <div className="sk-col">
                <Board level={level} scale={fit(width, level.w)} label="Dead squares on Holland level 68">
                    <defs>
                        <pattern id="sk-hatch" width={0.25} height={0.25} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <rect width={0.25} height={0.25} fill={C.red} opacity={0.22} />
                            <line x1={0} y1={0} x2={0} y2={0.25} stroke={C.red} strokeWidth={0.09} opacity={0.75} />
                        </pattern>
                    </defs>
                    {dead.map((d, p) => (d ? <rect key={p} x={xy(level, p)[0]} y={xy(level, p)[1]} width={1} height={1} fill="url(#sk-hatch)" /> : null))}
                </Board>
                <div className="sk-legend">
                    <span>
                        <i className="sk-sw" style={{ background: C.red, opacity: 0.6 }} /> dead square: a box here can never reach a goal ({nDead} of {nFloor} squares)
                    </span>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 4. Deadlock gallery
// ---------------------------------------------------------------------------
export function Deadlocks() {
    const boards = useMemo(() => DEADLOCK_BOARDS.map((d) => ({ ...d, level: parse(d.board) })), []);
    const [ref, width] = useWidth<HTMLDivElement>();
    const scale = width < 520 ? (width < 300 ? 1 : 2) : 2;
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ alignItems: 'flex-start', gap: '24px 20px' }}>
                {boards.map((d) => (
                    <div className="sk-col" key={d.title} style={{ width: Math.max(d.level.w * 20 * scale, 150) }}>
                        <Board level={d.level} scale={scale} label={`Deadlock: ${d.title}`}>
                            {d.dead.map(([x, y], i) => (
                                <g key={i} stroke={C.red} strokeWidth={0.12} strokeLinecap="round">
                                    <line x1={x + 0.26} y1={y + 0.26} x2={x + 0.74} y2={y + 0.74} />
                                    <line x1={x + 0.74} y1={y + 0.26} x2={x + 0.26} y2={y + 0.74} />
                                </g>
                            ))}
                        </Board>
                        <div className="sk-cap">
                            <span style={{ color: C.ink, fontWeight: 600 }}>{d.title}</span>
                            <br />
                            {d.text}
                        </div>
                    </div>
                ))}
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 5. A* search tree growing on Microban #1
// ---------------------------------------------------------------------------
export function SearchTree() {
    const level = useMemo(() => parse(MICROBAN_1), []);
    const tree = useMemo(() => {
        const r = search(level, 'astar');
        // tidy layout: live leaves take a slot each, parents sit over their children, and all
        // of a node's dropped (dead-square) children share one small marker slot
        const xs = new Array(r.nodes.length).fill(0);
        const deadX = new Array(r.nodes.length).fill(-1);
        const deadN = new Array(r.nodes.length).fill(0);
        let cursor = 0;
        const place = (id: number) => {
            const n = r.nodes[id];
            const live = n.children.filter((c) => r.nodes[c].h >= 0);
            deadN[id] = n.children.length - live.length;
            if (!n.children.length) {
                xs[id] = cursor + 0.5;
                cursor += 1;
                return;
            }
            const first = cursor;
            live.forEach(place);
            if (deadN[id]) {
                deadX[id] = cursor + 0.4;
                cursor += 0.8;
            }
            const firstX = live.length ? xs[live[0]] : deadX[id];
            const lastX = deadN[id] ? deadX[id] : xs[live[live.length - 1]];
            xs[id] = (firstX + lastX) / 2;
            if (cursor - first > 1) cursor += 0.25; // a little air between families
        };
        place(0);
        const onPath = new Set<number>();
        for (let n = r.goal; n >= 0; n = r.nodes[n].parent) onPath.add(n);
        return { ...r, xs, deadX, deadN, slots: cursor, depth: Math.max(...r.nodes.map((n) => n.g)), onPath };
    }, [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [playing, setPlaying] = useState(true);
    const total = tree.expanded + 1; // step 0 = just the root
    const [step, setStep] = useLoop(total, 1100, 4, on && playing);
    const current = tree.nodes.find((n) => n.expandedAt === step - 1) ?? tree.nodes[0];
    const finished = step === total - 1;
    const scale = fit(width, level.w);
    const side = width >= 560;
    const treeW = side ? width - level.w * 20 * scale - 32 : width;
    const colW = Math.min(34, (treeW - 12) / tree.slots);
    const rowH = 38;
    const R = Math.max(9, Math.min(11, colW * 0.42));
    const X = (id: number) => (treeW - colW * tree.slots) / 2 + tree.xs[id] * colW;
    const Y = (id: number) => 16 + tree.nodes[id].g * rowH;
    const visible = (id: number) => id === 0 || tree.nodes[tree.nodes[id].parent].expandedAt < step;
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ alignItems: 'flex-start', gap: '16px 32px' }}>
                <div className="sk-col">
                    <Board level={level} boxes={current.state.boxes} player={current.state.player} scale={scale} label="The position being expanded" />
                    <div className="sk-cap sk-num">
                        {finished ? <span style={{ color: C.green }}>solved in {current.g} pushes</span> : step === 0 ? 'start' : `expanding: ${current.g} + ${current.h} = ${current.g + current.h}`}
                    </div>
                </div>
                <div className="sk-col" style={{ alignItems: 'stretch' }}>
                    <svg width={treeW} height={32 + tree.depth * rowH} role="img" aria-label="Search tree">
                        {tree.nodes.map((n) =>
                            n.parent >= 0 && n.h >= 0 && visible(n.id) ? (
                                <line
                                    key={'e' + n.id}
                                    x1={X(n.parent)}
                                    y1={Y(n.parent)}
                                    x2={X(n.id)}
                                    y2={Y(n.id)}
                                    stroke={finished && tree.onPath.has(n.id) ? C.green : C.faint}
                                    strokeWidth={finished && tree.onPath.has(n.id) ? 2 : 1}
                                />
                            ) : null
                        )}
                        {tree.nodes.map((n) => {
                            // one marker for all of this node's dropped children
                            if (!tree.deadN[n.id] || n.expandedAt < 0 || n.expandedAt >= step) return null;
                            const x = (treeW - colW * tree.slots) / 2 + tree.deadX[n.id] * colW;
                            const y = Y(n.id) + rowH;
                            return (
                                <g key={'d' + n.id}>
                                    <line x1={X(n.id)} y1={Y(n.id)} x2={x} y2={y - 7} stroke={C.faint} strokeDasharray="2 3" />
                                    <text x={x} y={y + 4} fontSize={11} textAnchor="middle" fill={C.red} className="sk-num">
                                        ×{tree.deadN[n.id]}
                                    </text>
                                </g>
                            );
                        })}
                        {tree.nodes.map((n) => {
                            if (!visible(n.id) || n.h < 0) return null;
                            const x = X(n.id);
                            const y = Y(n.id);
                            const isCur = n.id === current.id && step > 0;
                            const expanded = n.expandedAt >= 0 && n.expandedAt < step;
                            const path = finished && tree.onPath.has(n.id);
                            return (
                                <g key={n.id}>
                                    <circle cx={x} cy={y} r={R} fill={path ? C.green : isCur ? C.us : expanded ? '#dfe7f3' : '#fff'} stroke={path ? C.green : isCur ? C.us : expanded ? C.blue : C.faint} strokeWidth={1.25} />
                                    <text x={x} y={y + 4} fontSize={11} textAnchor="middle" fill={path || isCur ? '#fff' : C.ink} className="sk-num">
                                        {n.g + n.h}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button className="sk-btn" onClick={() => setPlaying(!playing)}>
                            {playing ? 'Pause' : 'Play'}
                        </button>
                        <button
                            className="sk-btn"
                            onClick={() => {
                                setPlaying(false);
                                setStep((step + 1) % total);
                            }}
                        >
                            Step
                        </button>
                        <span className="sk-cap sk-num">
                            {step} of {tree.expanded} expansions
                        </span>
                    </div>
                </div>
            </div>
            <div className="sk-legend" style={{ marginTop: 12 }}>
                <span>number = pushes made + estimate of pushes left</span>
                <span>
                    <i className="sk-sw" style={{ background: '#dfe7f3', border: `1px solid ${C.blue}` }} /> expanded
                </span>
                <span>
                    <i className="sk-sw" style={{ background: '#fff', border: `1px solid ${C.faint}` }} /> waiting
                </span>
                <span style={{ color: C.red }}>×n: n pushes onto dead squares, dropped</span>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 6. Meeting in the middle on Microban #5
// ---------------------------------------------------------------------------
export function MeetInTheMiddle() {
    const level = useMemo(() => parse(MICROBAN_5), []);
    const data = useMemo(() => {
        const frames = replay(level, solve(level));
        const pushAt: number[] = [0];
        frames.forEach((f, i) => f.pushed && pushAt.push(i));
        const totalPushes = pushAt.length - 1;
        const meetPush = Math.floor(totalPushes / 2);
        return { frames, pushAt, totalPushes, meetPush, meet: pushAt[meetPush] };
    }, [level]);
    const { frames, meet, totalPushes, meetPush } = data;
    const last = frames.length - 1;
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [t] = useLoop(Math.max(meet, last - meet) + 1, 330, 12, on);
    const fi = Math.min(t, meet);
    const bi = Math.max(last - t, meet);
    const pushesUpTo = (i: number) => frames.slice(1, i + 1).filter((f) => f.pushed).length;
    const fDepth = pushesUpTo(fi);
    const bDepth = totalPushes - pushesUpTo(bi);
    const met = fi === meet && bi === meet;
    const scale = fit((width - 24) / 2, level.w);
    const { fwd, back } = MICROBAN_5_LAYERS;
    // lens chart
    const W = Math.min(width, 560);
    const H = 150;
    const colW = W / (totalPushes + 1);
    const hOf = (n: number) => 6 + (Math.log10(n) / Math.log10(3000)) * (H - 46);
    const fwdOnly = fwd.reduce((a, b) => a + b, 0);
    const both = fwd.slice(0, meetPush + 1).reduce((a, b) => a + b, 0) + back.slice(0, totalPushes - meetPush + 1).reduce((a, b) => a + b, 0);
    return (
        <Figure innerRef={ref}>
            <div className="sk-col" style={{ gap: 14 }}>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                    <div className="sk-col">
                        <Board level={level} boxes={frames[fi].boxes} player={frames[fi].player} scale={scale} label="Forward search" />
                        <div className="sk-cap">
                            <span style={{ color: C.blue, fontWeight: 600 }}>forward</span>
                            <br />
                            <span className="sk-num">
                                {fDepth} {fDepth === 1 ? 'push' : 'pushes'} from the start
                            </span>
                        </div>
                    </div>
                    <div className="sk-col">
                        <Board level={level} boxes={frames[bi].boxes} player={frames[bi].player} scale={scale} label="Backward search" />
                        <div className="sk-cap">
                            <span style={{ color: C.red, fontWeight: 600 }}>backward</span>
                            <br />
                            <span className="sk-num">
                                {bDepth} {bDepth === 1 ? 'pull' : 'pulls'} from solved
                            </span>
                        </div>
                    </div>
                </div>
                <div className="sk-cap" style={{ color: met ? C.green : C.muted, fontWeight: met ? 600 : 400 }}>
                    {met ? 'Both searches hit the same position. Solved.' : 'Each side stores the positions it reaches.'}
                </div>
                <svg width={W} height={H} role="img" aria-label="Positions per search depth">
                    <line x1={0} y1={H - 22} x2={W} y2={H - 22} stroke={C.grid} />
                    {fwd.map((n, d) => {
                        const x = colW * (d + 0.5);
                        const bw = Math.min(26, colW * 0.34);
                        const fShown = d <= fDepth && d <= meetPush;
                        const ghost = d > meetPush;
                        const bd = totalPushes - d; // backward depth living in this column
                        const bShown = bd <= bDepth && bd <= totalPushes - meetPush;
                        const hf = hOf(n);
                        const hb = hOf(back[bd]);
                        const base = H - 22;
                        return (
                            <g key={d}>
                                {ghost ? (
                                    <>
                                        <rect x={x - bw - 1} y={base - hf} width={bw} height={hf} fill="none" stroke={C.blue} strokeDasharray="3 3" opacity={0.55} />
                                        <text x={x - bw / 2 - 1} y={base - hf - 4} fontSize={11} textAnchor="middle" fill={C.faint} className="sk-num">
                                            {fmt(n)}
                                        </text>
                                    </>
                                ) : (
                                    <>
                                        <rect x={x - bw - 1} y={base - hf} width={bw} height={hf} fill={C.blue} opacity={fShown ? 0.85 : 0.12} />
                                        {fShown ? (
                                            <text x={x - bw / 2 - 1} y={base - hf - 4} fontSize={11} textAnchor="middle" fill={C.blue} className="sk-num">
                                                {fmt(n)}
                                            </text>
                                        ) : null}
                                    </>
                                )}
                                {bd <= totalPushes - meetPush ? (
                                    <>
                                        <rect x={x + 1} y={base - hb} width={bw} height={hb} fill={C.red} opacity={bShown ? 0.85 : 0.12} />
                                        {bShown ? (
                                            <text x={x + bw / 2 + 1} y={base - hb - 4} fontSize={11} textAnchor="middle" fill={C.red} className="sk-num">
                                                {fmt(back[bd])}
                                            </text>
                                        ) : null}
                                    </>
                                ) : null}
                                <text x={x} y={H - 6} fontSize={11} textAnchor="middle" fill={C.muted} className="sk-num">
                                    {d}
                                </text>
                            </g>
                        );
                    })}
                </svg>
                <div className="sk-cap">
                    New positions per depth (bar heights on a log scale).
                    <br />
                    Forward only: <span className="sk-num">{fmt(fwdOnly)}</span> positions. From both ends: <span className="sk-num">{fmt(both)}</span>.
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 7. Factoring: one board, two independent puzzles (d05)
// ---------------------------------------------------------------------------
export function Factoring() {
    const level = useMemo(() => parse(TWO_ROOMS), []);
    const frames = useMemo(() => replay(level, TWO_ROOMS_SOLUTION), [level]);
    const dead = useMemo(() => deadSquares(level), [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [i] = useLoop(frames.length, 300, 8, on);
    const f = frames[i];
    const colors = [C.blue, C.purple];
    // boxes keep their index through replay(), so index = which sub-puzzle
    const goalOf = level.boxes.map((b) => level.goals.find((g) => goalDistances(level, g)[b] >= 0)!);
    return (
        <Figure innerRef={ref}>
            <div className="sk-col">
                <Board level={level} boxes={f.boxes} player={f.player} scale={fit(width, level.w)} label="A board that splits into two independent puzzles">
                    <defs>
                        <pattern id="sk-hatch2" width={0.25} height={0.25} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <line x1={0} y1={0} x2={0} y2={0.25} stroke={C.red} strokeWidth={0.07} opacity={0.5} />
                        </pattern>
                    </defs>
                    {dead.map((d, p) => (d ? <rect key={p} x={xy(level, p)[0]} y={xy(level, p)[1]} width={1} height={1} fill="url(#sk-hatch2)" /> : null))}
                    {f.boxes.map((b, k) => (
                        <g key={k} fill="none" stroke={colors[k]} strokeWidth={0.1}>
                            <rect x={xy(level, b)[0] + 0.05} y={xy(level, b)[1] + 0.05} width={0.9} height={0.9} rx={0.08} />
                            <circle cx={xy(level, goalOf[k])[0] + 0.5} cy={xy(level, goalOf[k])[1] + 0.5} r={0.36} strokeDasharray="0.12 0.1" />
                        </g>
                    ))}
                </Board>
                <div className="sk-legend">
                    <span>
                        <i className="sk-sw" style={{ border: `2px solid ${C.blue}` }} /> puzzle A
                    </span>
                    <span>
                        <i className="sk-sw" style={{ border: `2px solid ${C.purple}` }} /> puzzle B
                    </span>
                    <span>
                        <i className="sk-sw" style={{ background: C.red, opacity: 0.45 }} /> dead squares: no box can cross
                    </span>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 8. Relay trials: freeze what is finished, restart on what is left (d04 -> d10)
// ---------------------------------------------------------------------------
export function Relay() {
    const level = useMemo(() => parse(RELAY_BOARD), []);
    const frames = useMemo(() => replay(level, RELAY_SOLUTION), [level]);
    const frozen = frames[RELAY_AT].boxes.find((b) => level.goals.includes(b))!;
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const HOLD = 7;
    const [t] = useLoop(frames.length + HOLD, 300, 9, on);
    const i = t <= RELAY_AT ? t : Math.max(RELAY_AT, t - HOLD);
    // 0 first lane plays, 1 the finished box turns into a wall, 2 the rest is solved around it, 3 the whole solved board
    const phase = t < RELAY_AT ? 0 : t < RELAY_AT + HOLD ? 1 : i < frames.length - 1 ? 2 : 3;
    const walled = phase === 1 || phase === 2;
    const f = frames[i];
    const steps = ['A lane posts its best board.', 'The finished box becomes a wall.', 'Every lane restarts on the smaller puzzle.', 'The two halves are joined and verified.'];
    const [fx, fy] = xy(level, frozen);
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ gap: '16px 36px' }}>
                <Board level={level} boxes={walled ? f.boxes.filter((b) => b !== frozen) : f.boxes} player={f.player} scale={fit(width, level.w)} label="Relay trial on a small board">
                    {walled ? (
                        <g>
                            <image href="/posts/sokoban/lager/lager-20-wall.png" x={fx} y={fy} width={1} height={1} style={{ imageRendering: 'pixelated' }} />
                            <rect x={fx + 0.04} y={fy + 0.04} width={0.92} height={0.92} fill="none" stroke={C.us} strokeWidth={0.09} />
                        </g>
                    ) : null}
                </Board>
                <ol style={{ margin: 0, paddingLeft: 20, maxWidth: 300 }}>
                    {steps.map((s, k) => (
                        <li key={k} style={{ padding: '3px 0', lineHeight: 1.4, color: k === phase ? C.ink : C.faint, fontWeight: k === phase ? 600 : 400 }}>
                            {s}
                        </li>
                    ))}
                </ol>
            </div>
        </Figure>
    );
}
