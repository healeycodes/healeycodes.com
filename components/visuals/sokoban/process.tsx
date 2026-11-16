// How the project was run: the frozen verifier and the experiment lifecycle.
// Numbers live in data.process.ts (PROVISIONAL_PROCESS + a generated block).

import React, { useMemo } from 'react';
import { parse, replay, isSolved } from './engine';
import { PROVISIONAL_PROCESS as P, VERDICT_DAYS, VERIFY_BOARD, VERIFY_BROKEN, VERIFY_BROKEN_AT, VERIFY_SOLUTION } from './data.process';
import { Board, C, Figure, fit, useLoop, useOnScreen, useWidth } from './ui';

// ---------------------------------------------------------------------------
// local helpers
// ---------------------------------------------------------------------------
type BoxSpec = { title: string; lines?: string[]; color: string; mono?: boolean };

function Box({ title, lines, color, mono }: BoxSpec) {
    return (
        <div style={{ border: `1.5px solid ${color}`, borderRadius: 4, padding: '7px 9px', background: '#fff', flex: '1 1 0', minWidth: 0 }}>
            <div style={{ fontWeight: 600, color }}>{title}</div>
            {(lines ?? []).map((l) => (
                <div key={l} className={mono ? 'sk-mono' : undefined} style={{ color: C.muted, fontSize: 12.5, overflowWrap: 'anywhere' }}>
                    {l}
                </div>
            ))}
        </div>
    );
}

const isSpec = (it: unknown): it is BoxSpec => !!it && typeof it === 'object' && 'title' in (it as object) && 'color' in (it as object);

// A row of boxes joined by arrows; a column on narrow screens.
function Flow({ items, narrow }: { items: (BoxSpec | React.ReactElement)[]; narrow: boolean }) {
    const out: React.ReactNode[] = [];
    items.forEach((it, i) => {
        if (i) {
            out.push(
                <div key={'a' + i} style={{ color: C.muted, alignSelf: 'center', padding: narrow ? '1px 0' : '0 1px', fontSize: 13, flex: 'none' }} aria-hidden>
                    {narrow ? '↓' : '→'}
                </div>
            );
        }
        out.push(
            <div key={'b' + i} style={{ display: 'flex', flex: narrow ? 'none' : '1 1 0', minWidth: 0, width: narrow ? '100%' : undefined }}>
                {isSpec(it) ? <Box {...it} /> : it}
            </div>
        );
    });
    return <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'center' : 'stretch', gap: narrow ? 2 : 4 }}>{out}</div>;
}

// ---------------------------------------------------------------------------
// 1. The frozen verifier
// ---------------------------------------------------------------------------
export function Verifier() {
    const level = useMemo(() => parse(VERIFY_BOARD), []);
    const good = useMemo(() => replay(level, VERIFY_SOLUTION), [level]);
    const bad = useMemo(() => replay(level, VERIFY_BROKEN.slice(0, VERIFY_BROKEN_AT)), [level]);
    // timeline: replay the solution, hold, replay the broken string up to the illegal move
    const timeline = useMemo(() => {
        const t: { which: 0 | 1; k: number }[] = [];
        good.forEach((_, k) => t.push({ which: 0, k }));
        for (let i = 0; i < 7; i++) t.push({ which: 0, k: good.length - 1 });
        bad.forEach((_, k) => t.push({ which: 1, k }));
        t.push({ which: 1, k: bad.length });
        return t;
    }, [good, bad]);
    const [ref, width] = useWidth<HTMLDivElement>();
    const on = useOnScreen(ref);
    const [i] = useLoop(timeline.length, 300, 8, on);
    const narrow = width < 560;
    const { which, k } = timeline[i];
    const moves = which ? VERIFY_BROKEN : VERIFY_SOLUTION;
    const frames = which ? bad : good;
    const f = frames[Math.min(k, frames.length - 1)];
    const done = which === 0 && k === good.length - 1;
    const failed = which === 1 && k === bad.length;
    const solved = done && isSolved(level, f.boxes);
    const replayed = failed ? VERIFY_BROKEN_AT : Math.min(k, moves.length);
    const verdict = solved ? { text: 'solved', note: 'every box on a goal', color: C.green } : failed ? { text: 'rejected', note: `move ${VERIFY_BROKEN_AT + 1}: box into a wall`, color: C.red } : null;
    const chip = (t: string) => (
        <span className="sk-mono" style={{ color: C.ink, background: C.panel, borderRadius: 3, padding: '1px 5px' }}>
            {t}
        </span>
    );
    return (
        <Figure innerRef={ref}>
            <Flow
                narrow={narrow}
                items={[
                    { title: 'Solver', lines: ['any lane, any trick'], color: C.blue },
                    { title: 'Move string', lines: [VERIFY_SOLUTION.slice(0, 16) + '…'], color: C.muted, mono: true },
                    { title: 'Verifier', lines: ['replays every move'], color: C.ink },
                    { title: 'Solved or rejected', lines: ['only verified solutions count'], color: C.green },
                ]}
            />
            <div className="sk-row" style={{ marginTop: 18, gap: '20px 40px' }}>
                <Board level={level} boxes={f.boxes} player={f.player} scale={fit(Math.min(width, 260), level.w)} label="A move string replayed by the verifier" />
                <div style={{ width: 286, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 6 }}>{which ? 'The same string with one move changed' : 'A valid solution'}</div>
                        <div className="sk-mono" style={{ fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere', border: `1px solid ${C.grid}`, borderRadius: 4, padding: '7px 9px' }}>
                            {moves.split('').map((c, j) => {
                                const mark = failed && j === VERIFY_BROKEN_AT;
                                const cur = !done && !failed && j === k;
                                return (
                                    <span key={j} style={{ color: mark ? '#fff' : j < k ? C.ink : C.faint, background: mark ? C.red : cur ? C.grid : undefined }}>
                                        {c}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <div style={{ minWidth: 64 }}>
                            <div className="sk-num" style={{ fontSize: 22, lineHeight: 1.1 }}>
                                {replayed}
                                <span style={{ color: C.faint }}> / {moves.length}</span>
                            </div>
                            <div style={{ color: C.muted, fontSize: 12.5 }}>moves replayed</div>
                        </div>
                        <div style={{ visibility: verdict ? 'visible' : 'hidden' }}>
                            <div style={{ fontSize: 22, lineHeight: 1.1, color: verdict?.color }}>{verdict?.text ?? 'solved'}</div>
                            <div style={{ color: C.muted, fontSize: 12.5 }}>{verdict?.note ?? 'every box on a goal'}</div>
                        </div>
                    </div>
                    <div style={{ color: C.muted, fontSize: 12.5 }}>
                        {chip('lurd')} walk · {chip('LURD')} push a box
                    </div>
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// 2. Experiment lifecycle and how the verdicts moved
// ---------------------------------------------------------------------------
export function PromotionFlow() {
    const [ref, width] = useWidth<HTMLDivElement>();
    const narrow = width < 560;
    const decide = (
        <div style={{ border: `1.5px solid ${C.us}`, borderRadius: 4, padding: '7px 9px', flex: '1 1 0', minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: C.us }}>Planner decides</div>
            <div style={{ fontSize: 12.5, color: C.green }}>promote: merge, tag</div>
            <div style={{ fontSize: 12.5, color: C.red }}>reject</div>
            <div style={{ fontSize: 12.5, color: C.amber }}>stop at the gate</div>
        </div>
    );
    const W = width;
    const H = 178;
    const m = { l: 38, r: 4, t: 38, b: 20 };
    const n = VERDICT_DAYS.length;
    const colW = (W - m.l - m.r) / n;
    const bw = Math.max(5, colW - (colW > 30 ? 10 : 4));
    const ih = H - m.t - m.b;
    const Y = (f: number) => m.t + ih - f * ih;
    const dayX = (iso: string) => m.l + VERDICT_DAYS.findIndex((d) => d[0] === iso) * colW;
    const cols: [1 | 2 | 3, string, number][] = [
        [1, C.green, 1],
        [2, C.red, 0.7],
        [3, C.amber, 0.85],
    ];
    return (
        <Figure innerRef={ref}>
            <Flow
                narrow={narrow}
                items={[
                    { title: 'Brief', lines: ['hypothesis tied to a measured failure'], color: C.ink },
                    { title: 'Builder subagent', lines: ['own git branch, idea behind a flag'], color: C.blue },
                    { title: 'Gate, then screen', lines: ['cheapest test that can kill it'], color: C.purple },
                    decide,
                    { title: 'Logged', lines: ['either way, with the numbers'], color: C.muted },
                ]}
            />
            <div className="sk-title" style={{ marginTop: 22, marginBottom: 2 }}>
                Verdicts per day <span className="sk-sub">· share of decided experiments</span>
            </div>
            <svg width={W} height={H} role="img" aria-label="Share of experiments promoted, rejected or stopped at the gate, per day">
                {[0, 0.5, 1].map((v) => (
                    <g key={v}>
                        <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke={C.grid} />
                        <text x={m.l - 5} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={C.muted} className="sk-num">
                            {v * 100}%
                        </text>
                    </g>
                ))}
                {VERDICT_DAYS.map((d, i) => {
                    const tot = d[1] + d[2] + d[3];
                    let acc = 0;
                    const x = m.l + i * colW + (colW - bw) / 2;
                    const dom = Number(d[0].slice(8));
                    return (
                        <g key={d[0]}>
                            {cols.map(([idx, col, op]) => {
                                const f = tot ? d[idx] / tot : 0;
                                const r = <rect key={idx} x={x} y={Y(acc + f)} width={bw} height={f * ih} fill={col} opacity={op} />;
                                acc += f;
                                return r;
                            })}
                            {colW > 26 || i % 2 === 0 ? (
                                <text x={x + bw / 2} y={H - 6} fontSize={11} textAnchor="middle" fill={C.muted} className="sk-num">
                                    {i === 0 ? 'Oct 31' : dom === 1 || (colW <= 26 && dom === 2) ? `Nov ${dom}` : dom}
                                </text>
                            ) : null}
                        </g>
                    );
                })}
                {P.notes.map((nt, j) => {
                    const x = dayX(nt.date);
                    const ly = j ? m.t - 6 : m.t - 22;
                    const text = nt.label.length * 6.2 > W - x - 6 ? nt.short : nt.label;
                    const flip = text.length * 6.2 > W - x - 6;
                    return (
                        <g key={nt.date}>
                            <line x1={x} x2={x} y1={ly - 9} y2={m.t + ih} stroke={C.ink} strokeDasharray="2 3" />
                            <text x={flip ? x - 4 : x + 4} y={ly} fontSize={11.5} fill={C.ink} textAnchor={flip ? 'end' : 'start'}>
                                {text}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="sk-legend" style={{ marginTop: 6 }}>
                <span>
                    <i className="sk-sw" style={{ background: C.green }} /> promoted
                </span>
                <span>
                    <i className="sk-sw" style={{ background: C.red, opacity: 0.7 }} /> rejected after a full test
                </span>
                <span>
                    <i className="sk-sw" style={{ background: C.amber, opacity: 0.85 }} /> stopped at a cheap gate
                </span>
            </div>
        </Figure>
    );
}

// Registered automatically by components.tsx: id -> component.
export const VISUALS: Record<string, React.ComponentType> = {
    verifier: Verifier,
    promotionFlow: PromotionFlow,
};
