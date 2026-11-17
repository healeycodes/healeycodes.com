// Charts and schematic diagrams for the Sokoban post. Plain SVG/HTML, sized from
// the measured column width so labels stay readable on a phone.

import React, { useMemo } from 'react';
import { FINAL, PROVISIONAL, SOLVERS } from './data';
import { CURVE_T, CURVES, SOLVES_600, SPEED } from './data.generated';
import { C, Figure, fmt, useWidth } from './ui';

type Suite = 'lts' | 'ots';
const SUITES: Suite[] = ['lts', 'ots'];

const RIVAL_COLOR: Record<string, string> = {
    ours: C.us,
    festival: C.purple,
    sokolution: C.blue,
    takaken: C.green,
    yass: '#a3a6b5',
    boxsearch: '#cfd1da',
};

// ---------------------------------------------------------------------------
// Levels solved as the time limit grows
// ---------------------------------------------------------------------------
export function SolvedByTime() {
    const [ref, width] = useWidth<HTMLDivElement>();
    const two = width >= 600;
    const W = two ? Math.floor((width - 24) / 2) : width;
    const H = 250;
    const m = { l: 40, r: 10, t: 10, b: 26 };
    const x = (t: number) => m.l + (Math.log(t) / Math.log(600)) * (W - m.l - m.r);
    // Log scale of the share still unsolved (50% at the bottom, 1% at the top), labelled as % solved.
    const y = (pct: number) => m.t + (Math.log(100 - pct) / Math.log(50)) * (H - m.t - m.b);
    const rivals = ['boxsearch', 'yass', 'takaken', 'sokolution', 'festival'];
    return (
        <Figure innerRef={ref}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {SUITES.map((suite) => {
                    const meta = FINAL.suites[suite];
                    const curves = CURVES[suite] as Record<string, number[]>;
                    const pct = (n: number) => (100 * n) / meta.levels;
                    const at600 = FINAL.solved[suite][600] as Record<string, number>;
                    // Against Festival, measured on the same hardware (the strongest rival on both suites).
                    const lead = at600.ours - at600.festival;
                    return (
                        <div key={suite}>
                            <div className="sk-title" style={{ marginBottom: 4 }}>
                                {meta.name}
                                <span className="sk-sub"> · % of {fmt(meta.levels)} levels solved</span>
                            </div>
                            <svg width={W} height={H} role="img" aria-label={`${meta.name}: share of levels solved against time limit`}>
                                {[50, 70, 80, 90, 95, 98, 99].map((p) => (
                                    <g key={p}>
                                        <line x1={m.l} x2={W - m.r} y1={y(p)} y2={y(p)} stroke={C.grid} />
                                        <text x={m.l - 8} y={y(p) + 4} fontSize={11} textAnchor="end" fill={C.muted} className="sk-num">
                                            {p}%
                                        </text>
                                    </g>
                                ))}
                                {(
                                    [
                                        [1, '1 s'],
                                        [10, '10 s'],
                                        [60, '1 min'],
                                        [600, '10 min'],
                                    ] as const
                                ).map(([t, label]) => (
                                    <g key={t}>
                                        <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} stroke={C.grid} />
                                        <text x={x(t)} y={H - 8} fontSize={11} textAnchor={t === 600 ? 'end' : t === 1 ? 'start' : 'middle'} fill={C.muted}>
                                            {label}
                                        </text>
                                    </g>
                                ))}
                                {rivals.map((id) => (
                                    <polyline key={id} fill="none" stroke={RIVAL_COLOR[id]} strokeWidth={1.75} strokeLinejoin="round" points={curves[id].map((n, i) => `${x(CURVE_T[i])},${y(pct(n))}`).join(' ')} />
                                ))}
                                <polyline fill="none" stroke={C.us} strokeWidth={2.75} strokeLinejoin="round" points={curves.ours.map((n, i) => `${x(CURVE_T[i])},${y(pct(n))}`).join(' ')} />
                                {([1, 10, 60, 600] as const).map((t) => (
                                    <circle key={t} cx={x(t)} cy={y(pct(FINAL.solved[suite][t].ours))} r={4} fill="#fff" stroke={C.us} strokeWidth={2.25} />
                                ))}
                                <text x={m.l + 10} y={m.t + 34} fontSize={32} fontWeight={700} fill={C.us} className="sk-num">
                                    +{lead}
                                </text>
                                <text x={m.l + 11} y={m.t + 52} fontSize={12} fill={C.ink}>
                                    ahead of Festival at 10 minutes
                                </text>
                            </svg>
                        </div>
                    );
                })}
            </div>
            <div className="sk-legend" style={{ marginTop: 6 }}>
                {SOLVERS.map((s) => (
                    <span key={s.id} style={s.id === 'ours' ? { color: C.ink, fontWeight: 600 } : undefined}>
                        <i className="sk-sw" style={{ background: RIVAL_COLOR[s.id], height: s.id === 'ours' ? 4 : 3, width: 16, borderRadius: 0 }} /> {s.name}
                    </span>
                ))}
            </div>
            <div className="sk-cap" style={{ marginTop: 6 }}>
                Festival: measured on the same hardware. Others: published results. Log scale of what&apos;s left unsolved.
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// Speed per level against Festival
// ---------------------------------------------------------------------------
export function SpeedScatter() {
    const [ref, width] = useWidth<HTMLDivElement>();
    const W = Math.min(width, 560);
    const H = Math.round(W * 0.78);
    const m = { l: 52, r: 12, t: 12, b: 40 };
    const pts = SPEED as number[][];
    const lx = (t: number) => m.l + ((Math.log10(t) - Math.log10(5)) / (Math.log10(600) - Math.log10(5))) * (W - m.l - m.r);
    const ly = (t: number) => H - m.b - ((Math.log10(Math.max(t, 0.01)) + 2) / (Math.log10(600) + 2)) * (H - m.t - m.b);
    const stats = useMemo(() => {
        const faster = pts.filter(([o, f]) => o < f).length;
        const ratios = pts.map(([o, f]) => f / Math.max(o, 0.01)).sort((a, b) => a - b);
        return { share: Math.round((100 * faster) / pts.length), median: Math.round(ratios[Math.floor(ratios.length / 2)]) };
    }, [pts]);
    return (
        <Figure innerRef={ref}>
            <div className="sk-col">
                <svg width={W} height={H} role="img" aria-label="Our solve time against Festival's, per level">
                    {[0.01, 0.1, 1, 10, 100].map((t) => (
                        <g key={t}>
                            <line x1={m.l} x2={W - m.r} y1={ly(t)} y2={ly(t)} stroke={C.grid} />
                            <text x={m.l - 8} y={ly(t) + 4} fontSize={11} textAnchor="end" fill={C.muted} className="sk-num">
                                {t} s
                            </text>
                        </g>
                    ))}
                    {[5, 10, 30, 100, 300, 600].map((t) => (
                        <g key={t}>
                            <line x1={lx(t)} x2={lx(t)} y1={m.t} y2={H - m.b} stroke={C.grid} />
                            <text x={lx(t)} y={H - m.b + 16} fontSize={11} textAnchor="middle" fill={C.muted} className="sk-num">
                                {t} s
                            </text>
                        </g>
                    ))}
                    {pts.map(([o, f], i) => (
                        <circle key={i} cx={+lx(f).toFixed(1)} cy={+ly(o).toFixed(1)} r={1.9} fill={o < f ? C.us : C.ink} opacity={o < f ? 0.45 : 0.55} />
                    ))}
                    <line x1={lx(5)} y1={ly(5)} x2={lx(600)} y2={ly(600)} stroke={C.ink} strokeWidth={1.25} strokeDasharray="5 4" />
                    <text x={lx(600) - 6} y={ly(600) + 34} fontSize={11.5} textAnchor="end" fill={C.ink} stroke="#fff" strokeWidth={4} paintOrder="stroke">
                        same speed
                    </text>
                    <text x={lx(600) - 6} y={ly(0.02)} fontSize={12} textAnchor="end" fill={C.us} fontWeight={600}>
                        we are faster
                    </text>
                    <text x={m.l + 8} y={m.t + 14} fontSize={12} fill={C.ink}>
                        Festival is faster
                    </text>
                    <text x={(m.l + W - m.r) / 2} y={H - 6} fontSize={12} textAnchor="middle" fill={C.muted}>
                        Festival&apos;s time (same hardware)
                    </text>
                    <text transform={`translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`} fontSize={12} textAnchor="middle" fill={C.muted}>
                        our time
                    </text>
                </svg>
                <div className="sk-cap">
                    {fmt(pts.length)} boards Festival needs 5 s or more for. We are faster on {stats.share}% of them (median {stats.median}x).
                </div>
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// Closing the gap at the 10 minute limit
// ---------------------------------------------------------------------------
export function ClosingTheGap() {
    const [ref, width] = useWidth<HTMLDivElement>();
    const two = width >= 600;
    const W = two ? Math.floor((width - 24) / 2) : width;
    const H = 210;
    const m = { l: 44, r: 14, t: 16, b: 24 };
    const t0 = Date.parse('2026-11-10T12:00:00Z');
    const t1 = Date.parse('2026-11-15T06:00:00Z');
    const x = (iso: string) => m.l + ((Date.parse(iso + ':00Z') - t0) / (t1 - t0)) * (W - m.l - m.r);
    // The y-axis is zoomed into the last stretch: the bottom tick is labelled, and the line is clipped below it.
    const floor = { lts: 3170, ots: 9480 };
    return (
        <Figure innerRef={ref}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {SUITES.map((suite) => {
                    const series = SOLVES_600[suite] as (string | number)[][];
                    const meas = FINAL.festivalMeasured[suite][600];
                    const first = FINAL.firstRun[suite];
                    const final = FINAL.finalRun[suite];
                    const lo = floor[suite];
                    const hi = final + (final - lo) * 0.2;
                    const y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
                    let d = '';
                    series.forEach(([t, v], i) => {
                        d += i === 0 ? `M${Math.max(x(t as string), m.l)},${y(v as number)}` : `H${Math.max(x(t as string), m.l)}V${y(v as number)}`;
                    });
                    const id = `sk-ctg-${suite}`;
                    return (
                        <div key={suite}>
                            <div className="sk-title" style={{ marginBottom: 4 }}>
                                {FINAL.suites[suite].name}
                                <span className="sk-sub"> · solved at 10 minutes</span>
                            </div>
                            <svg width={W} height={H} role="img" aria-label={`${suite} levels solved at the 10 minute limit over time, against Festival`}>
                                <defs>
                                    <clipPath id={id}>
                                        <rect x={m.l} y={0} width={W - m.l} height={H - m.b} />
                                    </clipPath>
                                </defs>
                                {[lo, meas, final]
                                    .map((v) => (
                                        <text key={v} x={m.l - 6} y={y(v) + 4} fontSize={11} fontWeight={v === final ? 600 : 400} textAnchor="end" fill={v === final ? C.us : v === lo ? C.muted : C.purple} className="sk-num">
                                            {fmt(v)}
                                        </text>
                                    ))}
                                <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke={C.grid} />
                                {[11, 12, 13, 14, 15].map((dnum) => {
                                    const iso = `2026-11-${String(dnum).padStart(2, '0')}T00:00`;
                                    return (
                                        <g key={dnum}>
                                            <line x1={x(iso)} x2={x(iso)} y1={m.t} y2={H - m.b} stroke={C.grid} />
                                            <text x={x(iso)} y={H - 7} fontSize={11} textAnchor="middle" fill={C.muted} className="sk-num">
                                                Nov {dnum}
                                            </text>
                                        </g>
                                    );
                                })}
                                <line x1={m.l} x2={W - m.r} y1={y(meas)} y2={y(meas)} stroke={C.purple} strokeWidth={1.5} />
                                <text x={m.l + 6} y={y(meas) - 6} fontSize={11.5} fill={C.purple}>
                                    Festival on our hardware
                                </text>
                                <path d={d} fill="none" stroke={C.us} strokeWidth={2.25} strokeLinejoin="round" clipPath={`url(#${id})`} />
                                <circle cx={x(FINAL.firstRun.end)} cy={y(first)} r={4} fill="#fff" stroke={C.us} strokeWidth={2} />
                                <text x={W - m.r + 6} y={y(first) + 19} fontSize={11.5} textAnchor="end" fill={C.ink} stroke="#fff" strokeWidth={3} paintOrder="stroke" className="sk-num">
                                    first run {fmt(first)}
                                </text>
                                <circle cx={x(FINAL.finalRun.end)} cy={y(final)} r={5} fill={C.us} />
                                <text x={W - m.r + 6} y={y(final) - 11} fontSize={12} fontWeight={600} textAnchor="end" fill={C.us} className="sk-num">
                                    final run +{final - meas}
                                </text>
                            </svg>
                        </div>
                    );
                })}
            </div>
            <div className="sk-cap" style={{ marginTop: 6 }}>
                Line: our best known results while developing. Dots: the two full benchmark runs.
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// Lanes: each one alone vs. all together
// ---------------------------------------------------------------------------
export function LanesTogether() {
    const [ref, width] = useWidth<HTMLDivElement>();
    const cols = width >= 600 ? 3 : 1;
    const limit = PROVISIONAL.laneLimit;
    return (
        <Figure innerRef={ref}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '22px 22px' }}>
                {PROVISIONAL.laneRuns.map((run) => (
                    <div key={run.level}>
                        <div className="sk-title" style={{ marginBottom: 2 }}>
                            {run.level}
                        </div>
                        <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{run.note}</div>
                        {[...Object.entries(run.alone), ['all together', run.together] as [string, number | null]].map(([lane, t]) => {
                            const all = lane === 'all together';
                            return (
                                <div key={lane} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 21, marginTop: all ? 6 : 0 }}>
                                    <div className={all ? undefined : 'sk-mono'} style={{ width: all ? 82 : 62, flex: 'none', textAlign: 'right', fontWeight: all ? 600 : 400, color: all ? C.ink : C.muted }}>
                                        {lane}
                                    </div>
                                    <div style={{ flex: 1, height: 13, position: 'relative', background: t === null ? 'repeating-linear-gradient(135deg, #ececf1 0 4px, #f7f7f9 4px 8px)' : '#f1f1f4' }}>
                                        {t !== null ? <div style={{ width: `${(100 * t) / limit}%`, height: '100%', background: all ? C.us : C.blue, opacity: all ? 1 : 0.75 }} /> : null}
                                    </div>
                                    <div className="sk-num" style={{ width: 44, flex: 'none', fontSize: 12.5, fontWeight: all ? 600 : 400, color: t === null ? C.faint : all ? C.us : C.ink }}>
                                        {t === null ? `> ${limit} s` : `${t.toFixed(1)} s`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="sk-cap" style={{ marginTop: 12, textAlign: 'left' }}>
                Seconds to solve. Each lane alone ({limit} s limit), then all together. Hatched: no solution.
            </div>
        </Figure>
    );
}

// Schematic of the portfolio: forward lanes from the left, backward lanes from the right.
// The bar lengths are illustrative, not measured.
export function LaneSchematic() {
    const [ref, width] = useWidth<HTMLDivElement>();
    const W = width;
    const narrow = W < 520;
    const labelW = narrow ? 62 : 286;
    const x0 = labelW + 10;
    const x1 = W - 4;
    const span = x1 - x0;
    const rowH = narrow ? 36 : 26;
    const lanes: { id: string; dir: 'f' | 'b'; len: number; what: string }[] = [
        { id: 'macro', dir: 'f', len: 0.34, what: 'follows a plan for packing the goals' },
        { id: 'novelty', dir: 'f', len: 0.5, what: 'prefers positions unlike any seen' },
        { id: 'fa2', dir: 'f', len: 0.27, what: 'takes turns between several plans' },
        { id: 'toward', dir: 'f', len: 0.42, what: 'aims at the best backward position' },
        { id: 'reverse', dir: 'b', len: 0.5, what: 'pulls boxes off the goals' },
        { id: 'pull', dir: 'b', len: 0.3, what: 'feature-space search, backward' },
        { id: 'hub-pull', dir: 'b', len: 0.38, what: 'picks a halfway "hub" to aim for' },
        { id: 'hub-gen', dir: 'b', len: 0.22, what: 'harvests many hubs, commits to a few' },
    ];
    const top = 24;
    const H = top + lanes.length * rowH + 30;
    const meetX = x0 + span * 0.5;
    return (
        <Figure innerRef={ref}>
            <svg width={W} height={H} role="img" aria-label="Forward lanes search from the start, backward lanes from the solved board, and any pair can meet">
                <text x={x0} y={12} fontSize={12} fill={C.blue} fontWeight={600}>
                    start position
                </text>
                <text x={x1} y={12} fontSize={12} fill={C.red} fontWeight={600} textAnchor="end">
                    solved board
                </text>
                <line x1={meetX} x2={meetX} y1={top - 4} y2={top + lanes.length * rowH + 2} stroke={C.green} strokeWidth={1.5} strokeDasharray="4 4" />
                {lanes.map((l, i) => {
                    const y = top + i * rowH;
                    const fwd = l.dir === 'f';
                    const w = span * l.len;
                    const meets = l.id === 'novelty' || l.id === 'reverse';
                    return (
                        <g key={l.id}>
                            <text x={0} y={y + 15} fontSize={12} fill={C.ink} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                {l.id}
                            </text>
                            <text x={narrow ? x0 : 70} y={y + (narrow ? 30 : 15)} fontSize={narrow ? 10.5 : 11.5} fill={C.muted} stroke="#fff" strokeWidth={3} paintOrder="stroke">
                                {l.what}
                            </text>
                            <line x1={x0} x2={x1} y1={y + 11} y2={y + 11} stroke={C.grid} />
                            <rect x={fwd ? x0 : x1 - w} y={y + 5} width={w} height={12} fill={fwd ? C.blue : C.red} opacity={meets ? 0.9 : 0.4} />
                        </g>
                    );
                })}
                <circle cx={meetX} cy={top + 1 * rowH + 11} r={4.5} fill="#fff" stroke={C.green} strokeWidth={2} />
                <circle cx={meetX} cy={top + 4 * rowH + 11} r={4.5} fill="#fff" stroke={C.green} strokeWidth={2} />
                <text x={meetX} y={H - 8} fontSize={12} fill={C.green} fontWeight={600} textAnchor="middle">
                    any forward lane can meet any backward lane
                </text>
            </svg>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// Who did what: the agent set-up
// ---------------------------------------------------------------------------
export function AgentMap() {
    const box = (title: string, lines: string[], color: string, key?: string) => (
        <div key={key ?? title} style={{ flex: '1 1 150px', minWidth: 140, border: `1.5px solid ${color}`, borderRadius: 4, padding: '8px 10px', background: '#fff' }}>
            <div style={{ fontWeight: 600, color }}>{title}</div>
            {lines.map((l) => (
                <div key={l} style={{ color: C.muted, fontSize: 12.5 }}>
                    {l}
                </div>
            ))}
        </div>
    );
    const link = (down: string, up?: string) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, color: C.muted, fontSize: 12, padding: '5px 0' }}>
            <span>↓ {down}</span>
            {up ? <span>↑ {up}</span> : null}
        </div>
    );
    const tier = (children: React.ReactNode) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>{children}</div>;
    return (
        <Figure>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                {tier(<div style={{ flex: '0 1 340px' }}>{box('Me', ['goals, risk appetite, ideas and steering, permissions'], C.ink)}</div>)}
                {link('steering', 'health checks, questions')}
                {tier(<div style={{ flex: '0 1 380px' }}>{box('Planner agent', ['runs experiments around the clock', 'decides what to promote'], C.us)}</div>)}
                {link('briefs', 'reports')}
                {tier(
                    <>
                        {box('Analyst subagents', ['frontier model', 'diagnose, review, plan'], C.purple)}
                        {box('Builder subagents', ['cheaper models', 'one experiment each, on its own branch'], C.blue)}
                    </>
                )}
                {link('jobs', 'solve counts, timings')}
                {tier(
                    <>
                        {box('Laptop', ['builds, tests', 'fixed-node-count screens'], C.green)}
                        {box('Cloud machines', ['16 cores each', 'timed pairs and batch jobs'], C.green)}
                    </>
                )}
                {link('every result')}
                {tier(<div style={{ flex: '0 1 380px' }}>{box('Experiment log and per-level ledger', ['792 experiments, 13,315 levels', 'read by the planner before each decision'], C.muted)}</div>)}
            </div>
        </Figure>
    );
}

// ---------------------------------------------------------------------------
// Our lead over Festival at each time limit
// ---------------------------------------------------------------------------
export function LeadByLimit() {
    const limits: [1 | 10 | 60 | 600, string][] = [
        [1, '1 second'],
        [10, '10 seconds'],
        [60, '1 minute'],
        [600, '10 minutes'],
    ];
    // Both sides measured on the benchmark hardware.
    const rows = SUITES.map((suite) => limits.map(([l]) => ({ ours: FINAL.solved[suite][l].ours, fest: FINAL.festivalMeasured[suite][l] })));
    return (
        <Figure>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '18px 28px' }}>
                {SUITES.map((suite, si) => {
                    const max = Math.max(...rows[si].map((r) => r.ours - r.fest));
                    return (
                        <div key={suite}>
                            <div className="sk-title" style={{ marginBottom: 6 }}>
                                {FINAL.suites[suite].name}
                                <span className="sk-sub"> · levels ahead of Festival</span>
                            </div>
                            {limits.map(([l, name], k) => {
                                const { ours, fest } = rows[si][k];
                                const lead = ours - fest;
                                return (
                                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 26 }}>
                                        <div style={{ width: 72, flex: 'none', textAlign: 'right', color: C.muted }}>{name}</div>
                                        <div style={{ flex: 1, height: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: `${(74 * Math.max(lead, 0)) / max}%`, minWidth: 3, height: '100%', background: C.us }} />
                                            <span className="sk-num" style={{ fontWeight: 600, color: C.us }}>
                                                {lead >= 0 ? '+' : ''}
                                                {fmt(lead)}
                                            </span>
                                        </div>
                                        <div className="sk-num" style={{ flex: 'none', color: C.muted, fontSize: 12, textAlign: 'right' }}>
                                            {fmt(ours)} vs {fmt(fest)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            <div className="sk-cap" style={{ marginTop: 10 }}>
                Same hardware for both. The shorter limits are read off each solver&apos;s reported times in its 10 minute run.
            </div>
        </Figure>
    );
}
