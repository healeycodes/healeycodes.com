// @ts-nocheck (run by node directly, which needs the .ts import extensions)
// Checks the boards, move strings and derived claims of the process diagrams.
//   node components/visuals/sokoban/check.process.ts
import { parse, replay, isSolved, solve } from './engine.ts';
import * as D from './data.ts';
import * as P from './data.process.ts';
import * as G from './data.generated.ts';

let failed = 0;
const ok = (cond: boolean, msg: string) => {
    console.log((cond ? 'ok   ' : 'FAIL ') + msg);
    if (!cond) failed++;
};

// verifier: the solution replays and solves; the broken string is rejected at the stated move
{
    ok(P.VERIFY_BOARD.trim() === D.MICROBAN_1.trim(), 'verifier board is Microban #1');
    const lv = parse(P.VERIFY_BOARD);
    const frames = replay(lv, P.VERIFY_SOLUTION);
    ok(isSolved(lv, frames[frames.length - 1].boxes), `solution replays and solves (${P.VERIFY_SOLUTION.length} moves)`);
    ok(solve(lv).length === P.VERIFY_SOLUTION.length, 'solution is as short as BFS finds');
    let err = '';
    try {
        replay(lv, P.VERIFY_BROKEN);
    } catch (e) {
        err = e.message;
    }
    ok(err.startsWith(`move ${P.VERIFY_BROKEN_AT} `) && err.includes('pushes a box'), `broken string rejected: ${err}`);
    const pre = replay(lv, P.VERIFY_BROKEN.slice(0, P.VERIFY_BROKEN_AT));
    ok(!isSolved(lv, pre[pre.length - 1].boxes), 'broken prefix is legal and unsolved');
    let diff = 0;
    for (let i = 0; i < P.VERIFY_SOLUTION.length; i++) diff += P.VERIFY_SOLUTION[i] !== P.VERIFY_BROKEN[i] ? 1 : 0;
    ok(diff === 1 && P.VERIFY_SOLUTION[P.VERIFY_BROKEN_AT] !== P.VERIFY_BROKEN[P.VERIFY_BROKEN_AT], 'broken string differs in exactly one move');
}

// Festival is the like-for-like measured run everywhere: FINAL.solved, FINAL.festivalMeasured and CURVES agree
for (const s of ['lts', 'ots'] as const) {
    const lim = [1, 10, 60, 600];
    const meas = lim.map((l) => D.FINAL.festivalMeasured[s][l]);
    ok(lim.every((l, i) => D.FINAL.solved[s][l].festival === meas[i] && G.CURVES[s].festival[G.CURVE_T.indexOf(l)] === meas[i]), `${s}: Festival measured ${meas.join(' / ')} in FINAL.solved and CURVES`);
    ok(lim.every((l) => D.FINAL.solved[s][l].ours === G.CURVES[s].ours[G.CURVE_T.indexOf(l)]), `${s}: our curve matches FINAL.solved`);
}
ok(D.FINAL.solved.lts[600].ours - D.FINAL.solved.lts[600].festival === 10 && D.FINAL.solved.ots[600].ours - D.FINAL.solved.ots[600].festival === 20, 'final margins +10 LTS / +20 OTS');

if (failed) {
    console.log(`${failed} check(s) failed`);
    process.exit(1);
}
console.log('all good');
