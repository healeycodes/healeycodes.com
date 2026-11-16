// Board diagrams, round 3: PI-corrals, factoring, push vs pull, deduplication, novelty.
// Every position comes from engine.ts; boards, solutions and pinned numbers are in
// data.boards3.ts and verified by check.boards3.ts.

import React, { useMemo } from 'react';
import * as E from './engine';
import { deadSquares, isSolved, Level, parse, pushes, reach, replay, xy } from './engine';
import { HUB_BOARD, HUB_SOLUTION, REACH_BOARD } from './data';
import { DEDUP_BOARD, DEDUP_DEPTH, DEDUP_SLOTS, DEDUP_SOLUTION_AB, DEDUP_SOLUTION_BA, DEDUP_WORKERS, FACTOR_BOARD, FACTOR_SOLUTION_A, FACTOR_SOLUTION_B, makeHelpers, MICROBAN_37, PROVISIONAL_BOARDS3 as P } from './data.boards3';
import { Board, C, Figure, fit, fmt, GridPath, TILE, useLoop, useOnScreen, useWidth } from './ui';

const H = makeHelpers(E);

function Counter({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
    return (
        <div style={{ minWidth: 64 }}>
            <div className="sk-num" style={{ fontSize: 22, lineHeight: 1.1, color: color ?? C.ink }}>
                {value}
            </div>
            <div style={{ color: C.muted, fontSize: 12.5 }}>{label}</div>
        </div>
    );
}

// Diagonal hatching in tile units. `id` must be unique on the page.
function Hatch({ id, color, opacity = 0.6 }: { id: string; color: string; opacity?: number }) {
    return (
        <defs>
            <pattern id={id} width={0.25} height={0.25} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={0.25} stroke={color} strokeWidth={0.07} opacity={opacity} />
            </pattern>
        </defs>
    );
}

const cell = (level: Level, p: number) => xy(level, p);
function Squares({ level, mask, fill, opacity = 1 }: { level: Level; mask: boolean[]; fill: string; opacity?: number }) {
    return (
        <g opacity={opacity}>
            {mask.map((m, p) => (m ? <rect key={p} x={cell(level, p)[0]} y={cell(level, p)[1]} width={1} height={1} fill={fill} /> : null))}
        </g>
    );
}

// ---------------------------------------------------------------------------
// piCorral: d07, the worker can't get behind the three fence boxes
// ---------------------------------------------------------------------------
function PiCorral() {
    const level = useMemo(() => parse(REACH_BOARD), []);
    const data = useMemo(() => {
        const s = { boxes: [...level.boxes], player: level.player };
        const dist = reach(level, s.boxes, s.player);
        const corral = H.corralOf(level, s);
        const legal = pushes(level, s);
        return { reachable: dist.map((d) => d >= 0), corral, legal, inward: legal.filter((p) => corral[p.to]) };
    }, [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const scale = fit(width, level.w);
    return (
        <Figure innerRef={ref}>
            <div className="sk-col" style={{ gap: 12 }}>
                <div className="sk-row" style={{ gap: '16px 36px' }}>
                    <Board level={level} scale={scale} label="A corral on a small board: only the pushes into it need trying">
                        <Hatch id="sk3-corral" color={C.us} opacity={0.55} />
                        <Squares level={level} mask={data.reachable} fill={C.blue} opacity={0.16} />
                        <Squares level={level} mask={data.corral} fill="url(#sk3-corral)" />
                        {data.legal
                            .filter((p) => !data.corral[p.to])
                            .map((p, k) => (
                                <GridPath key={'g' + k} cells={[cell(level, p.box), cell(level, p.to)]} color={C.muted} width={0.07} />
                            ))}
                        {data.inward.map((p, k) => (
                            <GridPath key={'o' + k} cells={[cell(level, p.box), cell(level, p.to)]} color={C.us} width={0.1} />
                        ))}
                    </Board>
                    <div className="sk-col" style={{ alignItems: 'flex-start', gap: 14 }}>
                        <Counter label="legal pushes" value={P.corral.legal} />
                        <Counter label="worth trying now" value={P.corral.inward} color={C.us} />
                    </div>
                </div>
                <div className="sk-legend">
                    <span>
                        <i className="sk-sw" style={{ background: C.blue, opacity: 0.3 }} /> worker can reach
                    </span>
                    <span>
                        <i className="sk-sw" style={{ border: `1px solid ${C.us}` }} /> corral: worker can&apos;t reach
                    </span>
                    <span>
                        <i className="sk-sw" style={{ background: C.us }} /> push into the corral
                    </span>
                    <span>
                        <i className="sk-sw" style={{ background: C.muted }} /> other push
                    </span>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// factorPartial: two rooms that can't trade boxes, solved one after the other
// ---------------------------------------------------------------------------
function FactorPartial() {
    const level = useMemo(() => parse(FACTOR_BOARD), []);
    const data = useMemo(() => {
        const frames = replay(level, FACTOR_SOLUTION_A + FACTOR_SOLUTION_B);
        const side = (p: number) => (xy(level, p)[0] <= 4 ? 0 : 1);
        const group = level.boxes.map(side); // replay keeps box order
        const goalsOf = [0, 1].map((g) => level.goals.filter((p) => side(p) === g));
        return { frames, group, goalsOf, dead: deadSquares(level) };
    }, [level]);
    const { frames, group, goalsOf, dead } = data;
    const nA = FACTOR_SOLUTION_A.length;
    const SPLIT = 6;
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [t] = useLoop(SPLIT + frames.length, 320, 16, on);
    const i = Math.max(0, t - SPLIT); // frame index
    const phase = t < SPLIT ? 0 : i < frames.length - 1 ? 1 : 2;
    const solving = phase === 1 ? (i <= nA ? 0 : 1) : -1;
    const rings = t >= 2;
    const f = frames[i];
    const colors = [C.blue, C.purple];
    const names = ['A', 'B'];
    const scale = fit(Math.min(width, 520), level.w);
    const steps = ['Split into groups', 'Solve each group alone', 'Join the moves in order'];
    const pushesAll = frames.filter((fr) => fr.pushed).length;
    return (
        <Figure innerRef={ref}>
            <div className="sk-col" style={{ gap: 14 }}>
                <div className="sk-col">
                    <Board level={level} boxes={f.boxes} player={f.player} scale={scale} label="A board made of two puzzles that can't interact">
                        <Hatch id="sk3-dead-f" color={C.red} opacity={0.5} />
                        <Squares level={level} mask={dead} fill="url(#sk3-dead-f)" />
                        {rings
                            ? f.boxes.map((b, k) => (
                                  <rect key={k} x={xy(level, b)[0] + 0.05} y={xy(level, b)[1] + 0.05} width={0.9} height={0.9} rx={0.08} fill="none" stroke={colors[group[k]]} strokeWidth={0.1} />
                              ))
                            : null}
                        {rings
                            ? goalsOf.map((gs, g) =>
                                  gs.map((p) => <circle key={p} cx={xy(level, p)[0] + 0.5} cy={xy(level, p)[1] + 0.5} r={0.36} fill="none" stroke={colors[g]} strokeWidth={0.1} strokeDasharray="0.12 0.1" />)
                              )
                            : null}
                        {solving === 0 ? <rect x={7} y={0} width={5} height={level.h} fill="#fff" opacity={0.6} /> : null}
                        {solving === 1 ? <rect x={0} y={0} width={5} height={level.h} fill="#fff" opacity={0.6} /> : null}
                    </Board>
                    <div className="sk-legend">
                        <span>
                            <i className="sk-sw" style={{ border: `2px solid ${C.blue}` }} /> group A
                        </span>
                        <span>
                            <i className="sk-sw" style={{ border: `2px solid ${C.purple}` }} /> group B
                        </span>
                        <span>
                            <i className="sk-sw" style={{ background: C.red, opacity: 0.45 }} /> dead for boxes
                        </span>
                    </div>
                </div>
                <div style={{ width: Math.min(width, 330) }}>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                        {steps.map((s, k) => (
                            <li key={k} style={{ padding: '3px 0', lineHeight: 1.4, color: k === phase ? C.ink : C.faint, fontWeight: k === phase ? 600 : 400 }}>
                                {s}
                                {k === 1 && phase === 1 ? <span style={{ color: colors[solving], fontWeight: 400 }}> · group {names[solving]}</span> : null}
                            </li>
                        ))}
                    </ol>
                    <div className="sk-mono" style={{ marginTop: 10, wordBreak: 'break-all', lineHeight: 1.5, opacity: phase === 2 ? 1 : 0.25 }}>
                        <span style={{ color: C.blue }}>{FACTOR_SOLUTION_A}</span>
                        <span style={{ color: C.purple }}>{FACTOR_SOLUTION_B}</span>
                    </div>
                    <div className="sk-cap" style={{ textAlign: 'left', marginTop: 4, opacity: phase === 2 ? 1 : 0.25 }}>
                        {frames.length - 1} moves, {pushesAll} pushes, checked on the whole board
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// pushPull: what a forward and a backward search can do where they start (d08)
// ---------------------------------------------------------------------------
function PushPull() {
    const level = useMemo(() => parse(HUB_BOARD), []);
    const data = useMemo(() => {
        const frames = replay(level, HUB_SOLUTION);
        const end = frames[frames.length - 1];
        const solved = { boxes: [...level.goals], player: end.player };
        return {
            push: pushes(level, { boxes: [...level.boxes], player: level.player }),
            pull: H.pulls(level, solved),
            solved,
            dead: deadSquares(level),
        };
    }, [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const two = width >= 2 * level.w * TILE * 2 + 28;
    const scale = fit(two ? width / 2 - 14 : width, level.w);
    const colW = level.w * TILE * scale;
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ alignItems: 'flex-start' }}>
                <div className="sk-col" style={{ width: colW }}>
                    <div>
                        <b style={{ color: C.blue, fontSize: 15 }}>push</b> <span style={{ color: C.muted }}>forward from the start</span>
                    </div>
                    <Board level={level} scale={scale} label="Start position with every legal push">
                        <Hatch id="sk3-dead-p" color={C.red} opacity={0.5} />
                        <Squares level={level} mask={data.dead} fill="url(#sk3-dead-p)" />
                        {data.push.map((p, k) => (
                            <GridPath key={k} cells={[cell(level, p.box), cell(level, p.to)]} color={C.blue} width={0.09} />
                        ))}
                    </Board>
                    <div className="sk-cap">
                        <span className="sk-num">{P.pushPull.pushes} pushes to try.</span> Hatched squares are dead ends.
                    </div>
                </div>
                <div className="sk-col" style={{ width: colW }}>
                    <div>
                        <b style={{ color: C.red, fontSize: 15 }}>pull</b> <span style={{ color: C.muted }}>backward from solved</span>
                    </div>
                    <Board level={level} boxes={data.solved.boxes} player={data.solved.player} scale={scale} label="Solved position with every legal pull">
                        {data.pull.map((p, k) => (
                            <GridPath key={k} cells={[cell(level, p.box), cell(level, p.to)]} color={C.red} width={0.09} />
                        ))}
                    </Board>
                    <div className="sk-cap">
                        <span className="sk-num">{P.pushPull.pulls} pulls to try.</span> No dead ends here.
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// dedup: two push orders, one position; many worker squares, one state
// ---------------------------------------------------------------------------
function Dedup() {
    const level = useMemo(() => parse(DEDUP_BOARD), []);
    const data = useMemo(() => {
        const a = replay(level, DEDUP_SOLUTION_AB);
        const b = replay(level, DEDUP_SOLUTION_BA);
        const firstA = a.find((f) => f.pushed)!;
        const firstB = b.find((f) => f.pushed)!;
        const end = a[a.length - 1];
        return { firstA, firstB, end };
    }, [level]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const bw = level.w * TILE; // 1x mini boards
    const bh = level.h * TILE;
    const gap = 44;
    const W = 2 * bw + gap;
    const rowGap = 46;
    const Hh = 3 * bh + 2 * rowGap;
    const pos = [
        [(W - bw) / 2, 0],
        [0, bh + rowGap],
        [bw + gap, bh + rowGap],
        [(W - bw) / 2, 2 * (bh + rowGap)],
    ];
    const boards = [
        { boxes: level.boxes, player: level.player },
        { boxes: data.firstA.boxes, player: data.firstA.player },
        { boxes: data.firstB.boxes, player: data.firstB.player },
        { boxes: data.end.boxes, player: data.end.player },
    ];
    // box 0 = left box, box 1 = right box (replay keeps the order); both get pushed up
    const pushArrow = (boxes: number[], k: number, color: string) => {
        const [x, y] = xy(level, boxes[k]);
        return (
            <GridPath
                cells={[
                    [x, y],
                    [x, y - 1],
                ]}
                color={color}
                width={0.12}
            />
        );
    };
    const line = (a: number, b: number) => {
        const [ax, ay] = pos[a];
        const [bx, by] = pos[b];
        const into = b === 1 || b === 2 ? 24 : 4; // leave room for the labels above the middle boards
        return <line x1={ax + bw / 2} y1={ay + bh + 4} x2={bx + bw / 2} y2={by - into} stroke={C.faint} strokeWidth={1} />;
    };
    // right side: the start position with the worker on two different squares, and what gets stored.
    // The highlight alternates between the two boards; the stored bits, worker square and slot never change.
    const at = ([x, y]: [number, number]) => y * level.w + x;
    const views = useMemo(() => DEDUP_WORKERS.map((w) => H.storedView(level, { boxes: level.boxes, player: w[1] * level.w + w[0] })), [level]);
    const view = views[0];
    const slot = view.slot(DEDUP_SLOTS);
    const on = useOnScreen(ref);
    const [active] = useLoop(DEDUP_WORKERS.length, 1700, 0, on);
    const top = 20; // room for the "worker here" labels
    const drop = 40; // boards -> stored box
    const SW = Math.min(336, Math.max(W, width)); // stored box; wide enough for the side notes when there is room
    const notes = SW >= 330;
    const cellPx = 17;
    const join = (k: number) => {
        const x = (SW - W) / 2 + k * (bw + gap) + bw / 2;
        const act = k === active;
        return <line key={k} x1={x} y1={top + bh + 5} x2={SW / 2} y2={top + bh + drop - 9} stroke={act ? C.us : C.faint} strokeWidth={act ? 1.75 : 1} style={{ transition: 'stroke 0.3s' }} />;
    };
    const rowLabel: React.CSSProperties = { color: C.muted, fontSize: 12.5 };
    const note: React.CSSProperties = { color: C.muted, fontSize: 11, whiteSpace: 'nowrap' };
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ alignItems: 'flex-start', gap: '28px 56px' }}>
                <div className="sk-col">
                    <div style={{ position: 'relative', width: W, height: Hh }}>
                        <svg width={W} height={Hh} style={{ position: 'absolute', left: 0, top: 0 }}>
                            {line(0, 1)}
                            {line(0, 2)}
                            {line(1, 3)}
                            {line(2, 3)}
                        </svg>
                        {boards.map((s, k) => (
                            <div key={k} style={{ position: 'absolute', left: pos[k][0], top: pos[k][1] }}>
                                <Board level={level} boxes={s.boxes} player={s.player} scale={1} label={['Start', 'Left box pushed first', 'Right box pushed first', 'Both boxes pushed'][k]}>
                                    {k === 0 ? (
                                        <>
                                            {pushArrow(s.boxes, 0, C.blue)}
                                            {pushArrow(s.boxes, 1, C.purple)}
                                        </>
                                    ) : null}
                                    {k === 1 ? pushArrow(s.boxes, 1, C.purple) : null}
                                    {k === 2 ? pushArrow(s.boxes, 0, C.blue) : null}
                                </Board>
                            </div>
                        ))}
                        <div className="sk-cap" style={{ position: 'absolute', left: 0, width: bw, top: bh + rowGap - 21 }}>
                            <span style={{ color: C.blue }}>left box first</span>
                        </div>
                        <div className="sk-cap" style={{ position: 'absolute', left: bw + gap, width: bw, top: bh + rowGap - 21 }}>
                            <span style={{ color: C.purple }}>right box first</span>
                        </div>
                    </div>
                    <div className="sk-cap">Two orders, one position: stored once.</div>
                </div>
                <div className="sk-col">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: SW }}>
                        <div style={{ position: 'relative', width: SW, height: top + bh + drop }}>
                            <svg width={SW} height={top + bh + drop} style={{ position: 'absolute', left: 0, top: 0 }}>
                                {DEDUP_WORKERS.map((_, k) => join(k))}
                            </svg>
                            {DEDUP_WORKERS.map((w, k) => {
                                const act = k === active;
                                const left = (SW - W) / 2 + k * (bw + gap);
                                return (
                                    <React.Fragment key={k}>
                                        <div className="sk-cap" style={{ position: 'absolute', left, width: bw, top: -2, color: act ? C.us : C.muted, opacity: act ? 1 : 0.6, transition: 'color 0.3s, opacity 0.3s' }}>
                                            worker here
                                        </div>
                                        <div style={{ position: 'absolute', left, top, opacity: act ? 1 : 0.4, outline: `2px solid ${act ? C.us : 'transparent'}`, outlineOffset: 1, transition: 'opacity 0.3s, outline-color 0.3s' }}>
                                            <Board level={level} player={at(w)} scale={1} label="The start position with the worker on another square" />
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        <div role="img" aria-label={`Stored: box bits ${view.cells.map((r) => r.map((c) => c ?? ' ').join('')).join(' ')}, worker square ${view.worker}`} style={{ position: 'relative', width: SW, boxSizing: 'border-box', border: `1px solid ${C.faint}`, borderRadius: 4, padding: '15px 12px 11px' }}>
                            <div style={{ position: 'absolute', top: -9, left: 0, right: 0, textAlign: 'center', lineHeight: '16px' }}>
                                <span style={{ background: '#fff', padding: '0 7px', color: C.us, fontSize: 12.5, fontWeight: 600 }}>stored</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: notes ? 'auto auto 1fr' : 'auto auto', justifyContent: notes ? undefined : 'center', columnGap: 14, rowGap: 8, alignItems: 'center' }}>
                                <span style={rowLabel}>boxes</span>
                                <div className="sk-mono" style={{ display: 'grid', gridTemplateColumns: `repeat(${view.cols}, ${cellPx}px)`, gridAutoRows: cellPx, lineHeight: `${cellPx}px`, textAlign: 'center' }}>
                                    {view.cells.flatMap((row, r) =>
                                        row.map((c, x) => (
                                            <span key={r + ',' + x} style={c === 1 ? { color: C.ink, fontWeight: 700, background: '#f9dfd1' } : { color: C.faint }}>
                                                {c ?? ''}
                                            </span>
                                        ))
                                    )}
                                </div>
                                {notes ? <span style={note}>one bit per floor square</span> : null}
                                <span style={rowLabel}>worker</span>
                                <span className="sk-num" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                                    square <b>{view.worker}</b>
                                </span>
                                {notes ? <span style={note}>top-left square it can reach</span> : null}
                            </div>
                        </div>
                        <svg width={SW} height={30}>
                            <line x1={SW / 2} y1={3} x2={SW / 2} y2={21} stroke={C.faint} strokeWidth={1} />
                            <path d={`M${SW / 2 - 4},${19} L${SW / 2},${26} L${SW / 2 + 4},${19} Z`} fill={C.faint} />
                            <text x={SW / 2 + 9} y={16} fontSize={11} fill={C.muted}>
                                hash
                            </text>
                        </svg>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} role="img" aria-label={`Hash table: one of ${DEDUP_SLOTS} slots is filled`}>
                            <span style={{ ...rowLabel, marginRight: 6 }}>table</span>
                            {Array.from({ length: DEDUP_SLOTS }, (_, i) => (
                                <i key={i} style={{ width: 15, height: 15, boxSizing: 'border-box', border: `1px solid ${i === slot ? C.us : C.faint}`, background: i === slot ? C.us : 'transparent' }} />
                            ))}
                        </div>
                    </div>
                    <div className="sk-cap">Two worker squares, same bits, same slot: stored once.</div>
                    <div className="sk-row" style={{ gap: 24, marginTop: 4, alignItems: 'flex-start' }}>
                        <Counter label={`sequences of ${DEDUP_DEPTH} pushes`} value={fmt(P.dedup.sequences)} />
                        <Counter label="distinct positions" value={fmt(P.dedup.positions)} />
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// novelty: heat map of squares boxes have visited, Microban #37
// ---------------------------------------------------------------------------
function Novelty() {
    const level = useMemo(() => parse(MICROBAN_37), []);
    const data = useMemo(() => {
        const steps = H.noveltyRun(level, 60);
        const dead = deadSquares(level);
        const live = level.walls.map((w, p) => !w && level.inside[p] && !dead[p]);
        return { steps, dead, live, nLive: live.filter(Boolean).length, max: Math.max(...steps[steps.length - 1].heat) };
    }, [level]);
    const { steps, dead, live } = data;
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [t] = useLoop(steps.length, 450, 10, on);
    const s = steps[t];
    const visited = s.heat.filter((h, p) => h > 0 && live[p]).length;
    const done = isSolved(level, s.state.boxes);
    const scale = fit(Math.min(width, 420), level.w);
    const p = s.push;
    const norm = Math.max(4, data.max * 0.6);
    return (
        <Figure innerRef={ref}>
            <div className="sk-row" style={{ gap: '16px 36px' }}>
                <Board level={level} boxes={s.state.boxes} player={s.state.player} scale={scale} label="Novelty search: squares boxes have visited">
                    <Hatch id="sk3-dead-n" color={C.red} opacity={0.4} />
                    <Squares level={level} mask={dead} fill="url(#sk3-dead-n)" />
                    {s.heat.map((h, q) =>
                        h > 0 ? (
                            <rect key={q} x={xy(level, q)[0]} y={xy(level, q)[1]} width={1} height={1} fill={C.blue} opacity={0.12 + 0.5 * Math.min(1, h / norm)} />
                        ) : live[q] ? (
                            <rect key={q} x={xy(level, q)[0] + 0.07} y={xy(level, q)[1] + 0.07} width={0.86} height={0.86} fill="none" stroke={C.us} strokeWidth={0.06} />
                        ) : null
                    )}
                    {p ? <GridPath cells={[xy(level, p.box), xy(level, p.to)]} color={s.novel ? C.us : C.muted} width={0.1} /> : null}
                    {p && s.novel ? (
                        <text x={xy(level, p.to)[0] + 0.5} y={xy(level, p.to)[1] - 0.12} fontSize={0.55} textAnchor="middle" fill={C.us} stroke="#fff" strokeWidth={0.12} paintOrder="stroke" fontWeight={600}>
                            novel
                        </text>
                    ) : null}
                </Board>
                <div className="sk-col" style={{ alignItems: 'flex-start', gap: 14, width: 220 }}>
                    <Counter label="expansions" value={t + 1} />
                    <Counter
                        label="squares a box has reached"
                        value={
                            <>
                                {visited}
                                <span style={{ color: C.faint }}> / {data.nLive}</span>
                            </>
                        }
                    />
                    <div style={{ fontSize: 12.5, minHeight: 36, color: done ? C.green : p && s.novel ? C.us : C.muted, fontWeight: done ? 600 : 400 }}>
                        {done ? `Solved. Without the novelty rule: ${P.novelty.greedy} expansions.` : p ? (s.novel ? 'A box reaches a new square.' : 'No new square this time.') : 'Start.'}
                    </div>
                </div>
            </div>
            <div className="sk-legend" style={{ marginTop: 12 }}>
                <span>
                    <i className="sk-sw" style={{ background: C.blue, opacity: 0.5 }} /> a box has been here (darker = more often)
                </span>
                <span>
                    <i className="sk-sw" style={{ border: `1.5px solid ${C.us}` }} /> no box here yet
                </span>
                <span>
                    <i className="sk-sw" style={{ background: C.red, opacity: 0.4 }} /> dead
                </span>
            </div>
        </Figure>
    );
}

// Registered automatically by components.tsx: id -> component.
export const VISUALS: Record<string, React.ComponentType> = {
    piCorral: PiCorral,
    factorPartial: FactorPartial,
    pushPull: PushPull,
    dedup: Dedup,
    novelty: Novelty,
};
