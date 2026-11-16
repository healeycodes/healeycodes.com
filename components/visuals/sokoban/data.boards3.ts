// Boards, verified solutions and small engine helpers for the diagrams in boards3.tsx
// (piCorral, factorPartial, pushPull, dedup, novelty).
// Everything here is checked by:  node components/visuals/sokoban/check.boards3.ts

// No runtime imports (node needs '.ts' extensions, TS 4.9 forbids them): the helpers
// take the engine module as an argument, see makeHelpers().
import type { DIRS, Level, Push, State } from './engine';
type Engine = typeof import('./engine');

// ---------------------------------------------------------------------------
// PROVISIONAL_BOARDS3
// Numbers printed on these diagrams. All of them come from runs of the tiny
// diagram engine (engine.ts) on the boards below, not from the real solver.
// check.boards3.ts recomputes every one and fails if they drift.
// ---------------------------------------------------------------------------
export const PROVISIONAL_BOARDS3 = {
    // piCorral on d07 (REACH_BOARD): legal pushes at the start / pushes into the corral
    corral: { legal: 7, inward: 3 },
    // pushPull on d08 (HUB_BOARD): pushes at the start / pulls in the solved position
    // (worker where the verified HUB_SOLUTION leaves it)
    pushPull: { pushes: 6, pulls: 4 },
    // dedup on DEDUP_BOARD: push sequences of exactly DEDUP_DEPTH pushes from the start,
    // and the distinct positions (engine key(): boxes + top-left reachable square)
    // those sequences end in
    dedup: { sequences: 56, positions: 12 },
    // novelty on Microban #37: expansions until the simplified novelty search solves it,
    // and the same search with the novelty rule switched off (plain greedy, engine search())
    novelty: { expansions: 33, greedy: 73 },
};

// ---------------------------------------------------------------------------
// factorPartial: two sub-puzzles of two boxes each. The bent corridor between the
// rooms is dead for boxes (a box can't turn a corner in a one-wide corridor), so
// no box can ever reach the other room's goals. Group A = left room, B = right.
// ---------------------------------------------------------------------------
export const FACTOR_BOARD = `
############
#.   ##    #
#  $  #  . #
# $@#  # $ #
#.   #  $ .#
#    ##    #
############`;
// Built by solving the left room alone (right room's boxes as walls), then the right
// room alone from where the worker ended, and joining the two. check.boards3.ts
// replays the joined string on the full board.
export const FACTOR_SOLUTION_A = 'UruLLdDrdL';
export const FACTOR_SOLUTION_B = 'uurrrdrdrdrruUddlluRR'; // starts with the walk through the corridor

// ---------------------------------------------------------------------------
// dedup: two boxes, one push each, in either order.
// ---------------------------------------------------------------------------
export const DEDUP_BOARD = `
######
#. . #
#$ $ #
# @  #
######`;
export const DEDUP_SOLUTION_AB = 'lUdrrU'; // left box first
export const DEDUP_SOLUTION_BA = 'rUdllU'; // right box first
export const DEDUP_DEPTH = 3;
// Two worker squares in the start position's region [x, y] (the first is the start
// square), and the region's smallest square (what engine key() stores for both).
export const DEDUP_WORKERS: [number, number][] = [
    [2, 3],
    [4, 1],
];
export const DEDUP_RING: [number, number] = [1, 1];
export const DEDUP_SLOTS = 10; // slots drawn in the little hash table

// Microban #37 (David W. Skinner), from soksolv levels/Open Test Suite/Microban.xsb
export const MICROBAN_37 = `
      ###
##### #.#
#   ###.#
#   $ #.#
# $  $  #
#####@# #
    #   #
    #####`;

// ---------------------------------------------------------------------------
// Helpers (pure engine logic, used by the diagrams and by the check)
// ---------------------------------------------------------------------------
export type Pull = { box: number; to: number; worker: number; dir: (typeof DIRS)[number] };
export type NoveltyStep = { state: State; push: Push | null; novel: boolean; heat: number[]; solved: boolean };

export function makeHelpers(E: Engine) {
    const { applyPush, deadSquares, DIRS, isSolved, key, matching, goalDistances, pushes, reach, step } = E;

// Corral: floor the worker can't reach that has no box on it.
function corralOf(level: Level, s: State): boolean[] {
    const dist = reach(level, s.boxes, s.player);
    return level.walls.map((w, p) => !w && level.inside[p] && dist[p] < 0 && !s.boxes.includes(p));
}

// Pulls: the worker stands next to a box, steps away from it, and drags it one square.
function pulls(level: Level, s: State): Pull[] {
    const dist = reach(level, s.boxes, s.player);
    const out: Pull[] = [];
    for (const box of s.boxes) {
        for (const dir of DIRS) {
            const stand = step(level, box, dir.dx, dir.dy); // the worker is here, the box moves here
            const away = stand < 0 ? -1 : step(level, stand, dir.dx, dir.dy); // the worker steps here
            if (stand < 0 || away < 0 || dist[stand] < 0) continue;
            if (level.walls[away] || s.boxes.includes(away)) continue;
            out.push({ box, to: stand, worker: away, dir });
        }
    }
    return out;
}

// Squares a lone box can be pushed to from `from` (the worker may stand on any floor).
function pushReach(level: Level, from: number): boolean[] {
    const seen = new Array(level.w * level.h).fill(false);
    const queue = [from];
    seen[from] = true;
    for (let qi = 0; qi < queue.length; qi++) {
        const p = queue[qi];
        for (const d of DIRS) {
            const to = step(level, p, d.dx, d.dy);
            const stand = step(level, p, -d.dx, -d.dy);
            if (to < 0 || stand < 0 || level.walls[to] || level.walls[stand] || seen[to]) continue;
            seen[to] = true;
            queue.push(to);
        }
    }
    return seen;
}

// Count push sequences of exactly `depth` pushes, and the distinct positions they end in.
function countSequences(level: Level, depth: number) {
    let sequences = 0;
    const ends = new Set<string>();
    const go = (s: State, d: number) => {
        if (d === depth) {
            sequences++;
            ends.add(key(level, s));
            return;
        }
        for (const p of pushes(level, s)) go(applyPush(s, p), d + 1);
    };
    go({ boxes: [...level.boxes], player: level.player }, 0);
    return { sequences, positions: ends.size };
}

// How a position is stored (dedup diagram): one bit per floor square, laid out like the
// floor (rows x cols = the floor's bounding box; null = not floor), 1 = a box; plus the
// worker's canonical square, which is the smallest square it can reach, exactly what
// engine key() uses. Floor squares are numbered in reading order, so square 0 is the
// top-left floor square. `slot(n)` hashes bits + worker (FNV-1a) into a table of n slots.
function storedView(level: Level, s: State) {
    const floor: number[] = [];
    for (let p = 0; p < level.w * level.h; p++) if (level.inside[p] && !level.walls[p]) floor.push(p);
    const xs = floor.map((p) => p % level.w);
    const ys = floor.map((p) => Math.floor(p / level.w));
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const cols = Math.max(...xs) - x0 + 1;
    const rows = Math.max(...ys) - y0 + 1;
    const cells: (0 | 1 | null)[][] = [];
    for (let r = 0; r < rows; r++) {
        const row: (0 | 1 | null)[] = [];
        for (let c = 0; c < cols; c++) {
            const p = (y0 + r) * level.w + x0 + c;
            row.push(floor.includes(p) ? (s.boxes.includes(p) ? 1 : 0) : null);
        }
        cells.push(row);
    }
    const canonical = reach(level, s.boxes, s.player).findIndex((d) => d >= 0); // board square
    const worker = floor.indexOf(canonical); // floor square number
    const bits = floor.map((p) => (s.boxes.includes(p) ? '1' : '0')).join('');
    const slot = (n: number) => {
        let h = 0x811c9dc5;
        for (const ch of bits + '|' + worker) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
        return h % n;
    };
    return { cols, rows, cells, floor, canonical, worker, bits, slot };
}

// A simplified novelty search. Best-first over pushes; a position is "novel" when the
// push that made it puts a box on a square no expanded position has had a box on.
// Novel positions are picked first, then the lowest matching bound (then fewest pushes).
// Positions with a box on a dead square are never expanded.
function noveltyRun(level: Level, maxExpand: number): NoveltyStep[] {
    const maps = level.goals.map((g) => goalDistances(level, g));
    const dead = deadSquares(level);
    const hOf = (boxes: number[]) => matching(level, boxes, maps)?.cost ?? -1;
    type N = { state: State; push: Push | null; g: number; h: number };
    const start: State = { boxes: [...level.boxes], player: level.player };
    const open: N[] = [{ state: start, push: null, g: 0, h: hOf(start.boxes) }];
    const seen = new Set([key(level, start)]);
    const heat = new Array(level.w * level.h).fill(0);
    const steps: NoveltyStep[] = [];
    while (open.length && steps.length < maxExpand) {
        const isNovel = (n: N) => (n.push ? heat[n.push.to] === 0 : true);
        let bi = 0;
        for (let i = 1; i < open.length; i++) {
            const a = open[i];
            const b = open[bi];
            const na = isNovel(a) ? 0 : 1;
            const nb = isNovel(b) ? 0 : 1;
            if (na < nb || (na === nb && (a.h < b.h || (a.h === b.h && a.g < b.g)))) bi = i;
        }
        const n = open.splice(bi, 1)[0];
        const novel = n.push ? heat[n.push.to] === 0 : false;
        for (const b of n.state.boxes) heat[b]++;
        const solved = isSolved(level, n.state.boxes);
        steps.push({ state: n.state, push: n.push, novel, heat: [...heat], solved });
        if (solved) break;
        for (const p of pushes(level, n.state)) {
            if (dead[p.to]) continue;
            const t = applyPush(n.state, p);
            const k = key(level, t);
            if (seen.has(k)) continue;
            seen.add(k);
            const h = hOf(t.boxes);
            if (h < 0) continue;
            open.push({ state: t, push: p, g: n.g + 1, h });
        }
    }
    return steps;
}

    return { corralOf, pulls, pushReach, countSequences, storedView, noveltyRun };
}
