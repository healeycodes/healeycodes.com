// Boards, pinned traces and small feature functions for the FESS diagrams (fess.tsx).
// Checked by: node components/visuals/sokoban/check.fess.ts
//
// The feature functions are simplified, readable versions of what soksolv computes
// (solver.go, rooms.go, hotspots.go, advisors.go, fess_search.go). They take the
// engine as an argument so that both the page (fess.tsx) and the node check script
// can use them without importing engine.ts in two different ways.

import type * as Engine from './engine';
import type { Level, Push, State } from './engine';

type Eng = typeof Engine;

// ---------------------------------------------------------------------------
// PROVISIONAL_FESS: nothing here comes from the benchmark. Every number the FESS
// diagrams print is computed by the tiny engine (live, or pinned below and
// re-checked by check.fess.ts).
// ---------------------------------------------------------------------------
export const PROVISIONAL_FESS = {
    // fessFeatures: the position after this many moves of HOLLAND_68_SOLUTION (data.ts),
    // i.e. after push 38 of 261.
    hollandFrame: 263,
};

// Microban #35 (David W. Skinner)
export const MICROBAN_35 = `
  ####
 ##  #
 #. $#
 #.$ #
 #.$ #
 #.$ #
 #. $##
 #   @#
 ##   #
  #####`;

// ---------------------------------------------------------------------------
// Feature functions
// ---------------------------------------------------------------------------
export function fessKit(E: Eng) {
    const { DIRS, step } = E;

    const packedBoxes = (lv: Level, boxes: number[]) => boxes.filter((b) => lv.goals.includes(b));

    // Separate floor areas the boxes cut the board into. label[p] = area index or -1.
    // count equals engine.regions().
    function workerAreas(lv: Level, boxes: number[]) {
        const label = new Array(lv.w * lv.h).fill(-1);
        const blocked = new Set(boxes);
        let count = 0;
        for (let p = 0; p < label.length; p++) {
            if (!lv.inside[p] || lv.walls[p] || blocked.has(p) || label[p] >= 0) continue;
            const stack = [p];
            label[p] = count;
            while (stack.length) {
                const a = stack.pop()!;
                for (const d of DIRS) {
                    const q = step(lv, a, d.dx, d.dy);
                    if (q < 0 || lv.walls[q] || blocked.has(q) || label[q] >= 0) continue;
                    label[q] = count;
                    stack.push(q);
                }
            }
            count++;
        }
        return { label, count };
    }

    // Simplified rooms: a doorway is a floor square with walls on two opposite
    // sides; rooms are the floor areas left when the doorways are taken out.
    // (soksolv builds rooms from open 2x3 blocks and counts broken room links.)
    function rooms(lv: Level) {
        const wall = (p: number) => p < 0 || lv.walls[p];
        const door = lv.walls.map(
            (w, p) =>
                !w &&
                lv.inside[p] &&
                ((wall(step(lv, p, -1, 0)) && wall(step(lv, p, 1, 0))) || (wall(step(lv, p, 0, -1)) && wall(step(lv, p, 0, 1))))
        );
        const room = new Array(lv.w * lv.h).fill(-1);
        let count = 0;
        for (let p = 0; p < room.length; p++) {
            if (!lv.inside[p] || lv.walls[p] || door[p] || room[p] >= 0) continue;
            const stack = [p];
            room[p] = count;
            while (stack.length) {
                const a = stack.pop()!;
                for (const d of DIRS) {
                    const q = step(lv, a, d.dx, d.dy);
                    if (q < 0 || lv.walls[q] || door[q] || room[q] >= 0) continue;
                    room[q] = count;
                    stack.push(q);
                }
            }
            count++;
        }
        const doors = door.map((d, p) => (d ? p : -1)).filter((p) => p >= 0);
        return { door, doors, room, count };
    }

    const blockedDoorways = (lv: Level, boxes: number[]) => rooms(lv).doors.filter((p) => boxes.includes(p));

    // Simplified hotspots: a box is "in the way" if it sits on another box's
    // shortest push path to its nearest empty goal (the path is planned for a
    // lone box, ignoring the other boxes). Boxes already on goals are not routed.
    function boxesInTheWay(lv: Level, boxes: number[], maps?: number[][]) {
        const m = maps ?? lv.goals.map((g) => E.goalDistances(lv, g));
        const open = lv.goals.map((g, i) => [g, i] as const).filter(([g]) => !boxes.includes(g));
        const blockers = new Set<number>();
        const routes: { box: number; path: number[]; blocker: number }[] = [];
        for (const b of boxes) {
            if (lv.goals.includes(b)) continue;
            let best = -1;
            for (const [, i] of open) if (m[i][b] >= 0 && (best < 0 || m[i][b] < m[best][b])) best = i;
            if (best < 0) continue;
            const path = E.boxPath(lv, b, lv.goals[best], m[best]);
            const hit = path.slice(1).findIndex((q) => boxes.includes(q));
            for (const q of path.slice(1)) if (boxes.includes(q)) blockers.add(q);
            if (hit >= 0) routes.push({ box: b, path: path.slice(0, hit + 2), blocker: path[hit + 1] });
        }
        return { blockers: Array.from(blockers).sort((a, b) => a - b), routes };
    }

    // ---- two searches over the same positions --------------------------------
    // The cell of a position: boxes on goals, and separate worker areas.
    const cellOf = (lv: Level, boxes: number[]) => [packedBoxes(lv, boxes).length, E.regions(lv, boxes)] as const;

    // Plain best-first: always expand the position with the lowest estimate
    // (engine.search 'greedy', estimate = matching lower bound). Returns the cell
    // of every expanded position, as a string of digit pairs, and the expansion
    // count when solved (-1: not within max).
    function runBestFirst(lv: Level, max: number) {
        const r = E.search(lv, 'greedy', max);
        const ex = r.nodes.filter((n) => n.expandedAt >= 0).sort((a, b) => a.expandedAt - b.expandedAt);
        return { trace: ex.map((n) => cellOf(lv, n.state.boxes).join('')).join(''), solvedAt: r.goal >= 0 ? r.expanded : -1 };
    }

    // Toy FESS. Positions go into the cell of their own two features. Turns
    // alternate between the best cell so far (most packed, then fewest areas) and
    // the next cell in a fixed cycle; a newly created cell is next in the cycle.
    // Inside a cell the position with the lowest weight is expanded first
    // (then most packed, fewest areas, lowest estimate). A push proposed by the
    // packing or connectivity advisor costs 0, every other push costs 1.
    function runFess(lv: Level, max: number) {
        const maps = lv.goals.map((g) => E.goalDistances(lv, g));
        const hOf = (b: number[]) => E.matching(lv, b, maps)?.cost ?? -1;
        type Item = { s: State; w: number; h: number; f: readonly [number, number] };
        const cells: (readonly [number, number])[] = [];
        const queues: Item[][] = [];
        const ids = new Map<string, number>();
        const seen = new Set<string>();
        const better = (a: readonly [number, number], b: readonly [number, number]) => (a[0] !== b[0] ? a[0] > b[0] : a[1] < b[1]);
        let next = 0;
        let bestCell = -1;
        const add = (s: State, w: number) => {
            const k = E.key(lv, s);
            if (seen.has(k)) return;
            seen.add(k);
            const h = hOf(s.boxes);
            if (h < 0) return; // a box on a dead square
            const f = cellOf(lv, s.boxes);
            const ck = f.join(',');
            let c = ids.get(ck);
            if (c === undefined) {
                c = cells.length;
                ids.set(ck, c);
                cells.push(f);
                queues.push([]);
                next = c;
            }
            queues[c].push({ s, w, h, f });
            if (bestCell < 0 || better(f, cells[bestCell])) bestCell = c;
        };
        add({ boxes: [...lv.boxes], player: lv.player }, 0);
        let trace = '';
        for (let turn = 1; turn <= max; turn++) {
            let c = -1;
            if (turn % 2 === 0 && queues[bestCell].length) c = bestCell;
            for (let i = 0; c < 0 && i < queues.length; i++) {
                const cc = next;
                next = (next + 1) % queues.length;
                if (queues[cc].length) c = cc;
            }
            if (c < 0) break;
            const q = queues[c];
            let bi = 0;
            for (let i = 1; i < q.length; i++) {
                const a = q[i];
                const b = q[bi];
                const ka = [a.w, -a.f[0], a.f[1], a.h];
                const kb = [b.w, -b.f[0], b.f[1], b.h];
                let j = 0;
                while (j < 4 && ka[j] === kb[j]) j++;
                if (j < 4 && ka[j] < kb[j]) bi = i;
            }
            const it = q.splice(bi, 1)[0];
            trace += cells[c].join('');
            if (E.isSolved(lv, it.s.boxes)) return { trace, solvedAt: turn };
            const ps = E.pushes(lv, it.s);
            const kids = ps.map((p) => E.applyPush(it.s, p));
            const advised = new Set<number>();
            const pick = (ok: (t: State) => boolean) => {
                let b = -1;
                let bh = Infinity;
                kids.forEach((t, i) => {
                    if (!ok(t)) return;
                    const h = hOf(t.boxes);
                    if (h >= 0 && h < bh) {
                        bh = h;
                        b = i;
                    }
                });
                if (b >= 0) advised.add(b);
            };
            pick((t) => packedBoxes(lv, t.boxes).length > it.f[0]);
            pick((t) => E.regions(lv, t.boxes) < it.f[1]);
            kids.forEach((t, i) => add(t, it.w + (advised.has(i) ? 0 : 1)));
        }
        return { trace, solvedAt: -1 };
    }

    return { packedBoxes, workerAreas, rooms, blockedDoorways, boxesInTheWay, cellOf, runBestFirst, runFess };
}

export type Kit = ReturnType<typeof fessKit>;
export type { Push };

// Pinned traces of the two searches on MICROBAN_35 (runBestFirst / runFess with
// max 3000), so the page does not redo ~2,000 expansions on load.
// Each expansion is two digits: boxes on goals, worker areas. check.fess.ts re-runs both.
export const MICROBAN_35_BEST_FIRST =
    '020202131222212222212231220112122222212121222122222222212221212131312231212221213122311211121213111212121212111112121111' +
    '111122222221221111131112122212221112121212122222212212121212131112111222222213122122121212121212111223212222221113111211' +
    '121211122223222201122113121213121213111213111212121211222122112121312321222121312221222131312221232222121312121112222222' +
    '232122222223121213121202121213121312131112121212131211131212111112111211122122222222222321232222221202212111121201121212' +
    '121212131312111312121212111212232123222322121121212121211212121102131313131223222212222322221222122112141312111212131212' +
    '131313121312121112131212122123222222211212222201211111121213131112111111212121120112121314231313121323121222222212131212' +
    '221213121212221212131222121112131212121221122212121212121213120201010102111212211111211111121221131212121212121212121201' +
    '021212121112111112121221212121122121212112111212131212121201011112111213121312021311210203020202020202021213131212020202' +
    '021313141212222222221212131202121213132323231322221322131312131212121312021212131312020212121202120101010111020212120212' +
    '121111111312131112111212121121211112121301121213121212121212120102120102020212031112030302020202030303030303131414130213' +
    '020202020202131314131313232323232333332323131313132423232312223222223223233322322223222222323232121313132222232322232222' +
    '221213121313121222242222232222122313231213221212132322232213121314222222232312231212221213122322131212141422222223121413' +
    '132322222212121213131312221213020302020213131313132323130202020213121212121212221212130202021312020203121202120303020212' +
    '131312121212131213121212121222222212223223221212122222221212121222232212122212131212231222121313121222131322221313131313' +
    '121313122213222213131212131313131313132222121313221313131213121314130203020202020202020202130203020302020302121312021213' +
    '131312131312121413030202030213120212121212131302030202121413030202121302021213121202030203030203020212021212120203030202' +
    '020212110101020202020202120203120102121112121212122101121211120211121212010101111212121212122223222212121222222212121322' +
    '221211111221221212121112220101121212121211121212111122222221122322222212222211212121213131312231312231212221211121212121' +
    '122212212111112221121211212112111121212201121211121221211111011211120112121212122122121111120112121112111101121211131202' +
    '031112111212121201020102121112020202020203120303010102111112121211110212211312122112121201121211120213111212120212020203' +
    '0201020202121313131313132324232313131323232313131423231312121322112222232231313131313131313332323131314141424141414251';
export const MICROBAN_35_FESS =
    '020203020202030201122221021301121102130112221121022113210112221102130112222111020313011222110213011222211102130112221102' +
    '031301122231020301122211020301122211020301122211020301122211020301122211020301122221110203130112222111020301122221110203' +
    '011222230203130112222111230203011222110203130112221102031301122211020313011222110203130112222111230213140203130112222111' +
    '230203130112222111230213011222211123021301122221112314021301122211230213011222112302130112221123021301122211231402130112' +
    '221123140213011222112302130112221102130112221102130112221102031301122211021301122221110203130112221102031301122221111402' +
    '130112221114021301122211021301122211021301122221110213011222211102031301122221112302130112222111230203130112222111230203' +
    '130112222111230213011222211123020313011222211123021301122221112314020313011222211123021301122221112302130112222111230213' +
    '011222211123021301122221112302130112222111230213011222211123021301122221112302130112222111230213011222211123021301122231' +
    '211123021301122221112302031301122221112302130112222111230213011222211123021301122221112324020313011222211123020313011222' +
    '211123020313011222211123021301122221112302130112222111230203130112222111230213011222211123020313011222211123020313011222' +
    '211123020313011222211123140203130112222111230213011222211123021301122221112302130112222111230213011222211123021301122221' +
    '112302130112222111230213011222211123143115310231133101311231223121313231023103311331013112312231213111313131233133021301' +
    '122221112314320213011222211123143202130112222111231432021301122221112332020313011222211123320213011222211123143202130112' +
    '22211123143202130112222111231432414102411341014112414241024113410141122221112332334251';
