// @ts-nocheck (run by node directly, which needs the .ts import extensions)
// Checks the boards, solutions and numbers used by boards3.tsx.
//   node components/visuals/sokoban/check.boards3.ts
import * as E from './engine.ts';
import { parse, replay, isSolved, pushes, key, reach, deadSquares, goalDistances, search, xy, step, DIRS } from './engine.ts';
import { HUB_BOARD, HUB_SOLUTION, REACH_BOARD } from './data.ts';
import * as D from './data.boards3.ts';

const H = D.makeHelpers(E);
const P = D.PROVISIONAL_BOARDS3;
let failed = 0;
const ok = (cond: boolean, msg: string) => {
    console.log((cond ? 'ok   ' : 'FAIL ') + msg);
    if (!cond) failed++;
};
const startOf = (lv) => ({ boxes: [...lv.boxes], player: lv.player });

// 1. piCorral on d07
{
    const lv = parse(REACH_BOARD);
    const s = startOf(lv);
    const corral = H.corralOf(lv, s);
    const legal = pushes(lv, s);
    const inward = legal.filter((p) => corral[p.to]);
    const barrier = s.boxes.filter((b) => DIRS.some((d) => corral[step(lv, b, d.dx, d.dy)]));
    const dead = deadSquares(lv);
    console.log(`     corral squares ${corral.filter(Boolean).length}, barrier boxes ${barrier.map((b) => xy(lv, b).join(',')).join(' ')}`);
    ok(legal.length === P.corral.legal, `d07: ${legal.length} legal pushes (pinned ${P.corral.legal})`);
    ok(inward.length === P.corral.inward, `d07: ${inward.length} pushes into the corral (pinned ${P.corral.inward})`);
    // I: every legal, non-dead push of a barrier box goes into the corral
    ok(legal.filter((p) => barrier.includes(p.box) && !dead[p.to]).every((p) => corral[p.to]), 'd07 (I): every push of a barrier box goes into the corral');
    // P: every barrier box has such a push
    ok(barrier.every((b) => inward.some((p) => p.box === b)), 'd07 (P): every barrier box has a push into the corral');
    ok(inward.every((p) => barrier.includes(p.box)), 'd07: the inward pushes are exactly the barrier pushes');
    ok(lv.goals.some((g) => corral[g] && !s.boxes.includes(g)), 'd07: the corral is not solved (it holds an empty goal)');
    const fr = replay(lv, 'RRlluRRldldRRlluLulD');
    ok(isSolved(lv, fr[fr.length - 1].boxes), 'd07: the verified solution solves it');
}

// 2. factorPartial
{
    const lv = parse(D.FACTOR_BOARD);
    const left = (p) => xy(lv, p)[0] <= 4;
    const right = (p) => xy(lv, p)[0] >= 7;
    const maps = lv.goals.map((g) => goalDistances(lv, g));
    for (const b of lv.boxes) {
        const reachable = lv.goals.filter((g, i) => maps[i][b] >= 0);
        const own = left(b) ? left : right;
        ok(reachable.length > 0 && reachable.every(own), `factor: box at ${xy(lv, b).join(',')} can reach only its own room's goals (${reachable.length})`);
    }
    ok(lv.boxes.every((b) => left(b) || right(b)) && lv.goals.every((g) => left(g) || right(g)), 'factor: every box and goal is in one of the two rooms');
    const dead = deadSquares(lv);
    const corridor = lv.walls.map((w, p) => !w && lv.inside[p] && !left(p) && !right(p));
    ok(corridor.filter(Boolean).length === 4 && corridor.every((c, p) => !c || dead[p]), 'factor: the 4 corridor squares are dead for boxes');
    const fa = replay(lv, D.FACTOR_SOLUTION_A);
    const endA = fa[fa.length - 1];
    ok(endA.boxes.filter(left).every((b) => lv.goals.includes(b)) && endA.boxes.filter(right).join() === lv.boxes.filter(right).join(), 'factor: after part A the left room is solved and the right boxes have not moved');
    const all = replay(lv, D.FACTOR_SOLUTION_A + D.FACTOR_SOLUTION_B);
    ok(isSolved(lv, all[all.length - 1].boxes), `factor: joined solution solves the whole board (${all.length - 1} moves, ${all.filter((f) => f.pushed).length} pushes)`);
    ok(all.slice(fa.length - 1).every((f) => f.boxes.filter(left).join() === endA.boxes.filter(left).join()), 'factor: part B never touches the left room');
}

// 3. pushPull on d08
{
    const lv = parse(HUB_BOARD);
    const fr = replay(lv, HUB_SOLUTION);
    const end = fr[fr.length - 1];
    ok(isSolved(lv, end.boxes), 'd08: HUB_SOLUTION solves it');
    const ps = pushes(lv, startOf(lv));
    const solved = { boxes: [...lv.goals], player: end.player };
    const pl = H.pulls(lv, solved);
    ok(ps.length === P.pushPull.pushes, `d08: ${ps.length} pushes at the start (pinned ${P.pushPull.pushes})`);
    ok(pl.length === P.pushPull.pulls, `d08: ${pl.length} pulls in the solved position (pinned ${P.pushPull.pulls})`);
    // every pull, read backwards, is a legal push that returns to the solved position
    for (const p of pl) {
        const after = { boxes: solved.boxes.map((b) => (b === p.box ? p.to : b)), player: p.worker };
        const back = DIRS.find((d) => d.dx === -p.dir.dx && d.dy === -p.dir.dy);
        const walkToStand = reach(lv, solved.boxes, solved.player)[p.to] >= 0;
        const r = replay(lv, back.name.toUpperCase(), after);
        ok(walkToStand && isSolved(lv, r[1].boxes), `d08: pull of ${xy(lv, p.box).join(',')} ${p.dir.name} undoes as a push`);
    }
    const pushDead = deadSquares(lv);
    const fromStarts = lv.boxes.map((b) => H.pushReach(lv, b));
    const pullDead = lv.walls.map((w, p) => !w && lv.inside[p] && fromStarts.every((r) => !r[p]));
    console.log(`     d08: ${pushDead.filter(Boolean).length} push-dead squares, ${pullDead.filter(Boolean).length} pull-dead squares`);
    ok(pullDead.every((d) => !d), 'd08: no square is dead for pulls (the diagram shades push-dead squares only)');
}

// 4. dedup
{
    const lv = parse(D.DEDUP_BOARD);
    const a = replay(lv, D.DEDUP_SOLUTION_AB);
    const b = replay(lv, D.DEDUP_SOLUTION_BA);
    ok(a.filter((f) => f.pushed).length === 2 && b.filter((f) => f.pushed).length === 2, 'dedup: each order is two pushes');
    ok(isSolved(lv, a[a.length - 1].boxes) && isSolved(lv, b[b.length - 1].boxes), 'dedup: both orders solve the board');
    ok(key(lv, a[a.length - 1]) === key(lv, b[b.length - 1]), 'dedup: both orders end in the same key()');
    const firstA = a.find((f) => f.pushed);
    const firstB = b.find((f) => f.pushed);
    ok(firstA.boxes.join() !== firstB.boxes.join(), 'dedup: the two middle positions differ');
    const c = H.countSequences(lv, D.DEDUP_DEPTH);
    console.log(`     dedup depth ${D.DEDUP_DEPTH}: ${c.sequences} sequences, ${c.positions} positions`);
    ok(c.sequences === P.dedup.sequences && c.positions === P.dedup.positions, 'dedup: pinned counts match');
    const dist = reach(lv, lv.boxes, lv.player);
    const marks = D.DEDUP_WORKERS.map(([x, y]) => y * lv.w + x);
    ok(marks.every((m) => dist[m] >= 0 && !lv.boxes.includes(m)), 'dedup: marked worker squares are reachable floor');
    ok(new Set(marks.map((m) => key(lv, { boxes: lv.boxes, player: m }))).size === 1, 'dedup: marked worker squares give one key()');
    const [rx, ry] = D.DEDUP_RING;
    ok(dist.findIndex((d) => d >= 0) === ry * lv.w + rx, 'dedup: the ring is on the smallest reachable square');
    // the "stored" box: same bits, worker square and table slot for every marked worker square
    const views = marks.map((m) => H.storedView(lv, { boxes: lv.boxes, player: m }));
    const v = views[0];
    console.log(`     dedup stored: ${v.rows}x${v.cols} bits ${v.cells.map((r) => r.join('')).join(' ')}, worker square ${v.worker}, slot ${v.slot(D.DEDUP_SLOTS)} of ${D.DEDUP_SLOTS}`);
    ok(views.every((w) => w.bits === v.bits && w.worker === v.worker && w.slot(D.DEDUP_SLOTS) === v.slot(D.DEDUP_SLOTS)), 'dedup: both worker squares store the same bits, worker square and slot');
    ok(v.floor.length === lv.inside.filter((f, p) => f && !lv.walls[p]).length && v.bits.length === v.floor.length, 'dedup: one bit per floor square');
    ok(v.floor.every((p, i) => (v.bits[i] === '1') === lv.boxes.includes(p)) && v.bits.split('1').length - 1 === lv.boxes.length, 'dedup: the 1 bits are exactly the boxes');
    ok(v.cells.every((r, y) => r.every((c, x) => c === null || c === (lv.boxes.includes(v.floor[0] + y * lv.w + x) ? 1 : 0))), 'dedup: the bit grid is laid out like the floor');
    ok(v.canonical === ry * lv.w + rx && v.floor[v.worker] === v.canonical && v.worker === 0, 'dedup: worker square 0 = top-left floor square = the ring square');
    ok(new Set(marks.map((m) => v.floor.indexOf(m))).size === marks.length, 'dedup: the two boards have the worker on different squares');
}

// 5. novelty on Microban #37
{
    const lv = parse(D.MICROBAN_37);
    const steps = H.noveltyRun(lv, 500);
    ok(steps[steps.length - 1].solved && steps.length === P.novelty.expansions, `novelty: solved after ${steps.length} expansions (pinned ${P.novelty.expansions})`);
    const g = search(lv, 'greedy', 5000);
    ok(g.goal >= 0 && g.expanded === P.novelty.greedy, `novelty: plain greedy needs ${g.expanded} (pinned ${P.novelty.greedy})`);
    const dead = deadSquares(lv);
    ok(steps.every((s) => s.state.boxes.every((b) => !dead[b])), 'novelty: no expanded position has a box on a dead square');
    // each novel flag matches the heat before that step
    ok(steps.every((s, i) => !s.push || s.novel === ((i ? steps[i - 1].heat : [])[s.push.to] === 0)), 'novelty: "novel" = the pushed box lands on a square with no heat yet');
    console.log(`     novelty: ${steps.filter((s) => s.novel).length} novel picks, ${steps.filter((s) => s.push && !s.novel).length} revisits`);
}

console.log(failed ? `${failed} FAILED` : 'all good');
process.exit(failed ? 1 : 0);
