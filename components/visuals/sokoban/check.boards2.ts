// @ts-nocheck (run by node directly, which needs the .ts import extensions)
// Checks every board, move sequence and claim of the diagrams in boards2.tsx.
//   node components/visuals/sokoban/check.boards2.ts
import { parse, replay, isSolved, solve, search, pushes, applyPush, goalDistances, deadSquares, DIRS, step, xy } from './engine.ts';
import { GOAL_BAY, GOAL_BAY_SOLUTION } from './data.ts';
import * as D from './data.boards2.ts';

let failed = 0;
const ok = (cond, msg) => {
    console.log((cond ? 'ok   ' : 'FAIL ') + msg);
    if (!cond) failed++;
};

// Serialise a position back to XSB so it can be searched as a level of its own.
const toXsb = (lv, s, wallAt = [], dropGoal = []) => {
    const rows = [];
    for (let y = 0; y < lv.h; y++) {
        let r = '';
        for (let x = 0; x < lv.w; x++) {
            const p = y * lv.w + x;
            const g = lv.goals.includes(p) && !dropGoal.includes(p);
            const b = s.boxes.includes(p);
            r += lv.walls[p] || wallAt.includes(p) ? '#' : b ? (g ? '*' : '$') : p === s.player ? (g ? '+' : '@') : g ? '.' : ' ';
        }
        rows.push(r);
    }
    return rows.join('\n');
};
const unsolvable = (xsb) => {
    const r = search(parse(xsb), 'bfs', 200000);
    return { dead: r.goal < 0 && r.expanded < 200000, expanded: r.expanded };
};
const onGoals = (lv, boxes) => boxes.filter((b) => lv.goals.includes(b)).length;
const pushSeries = (lv, frames) => frames.filter((f, i) => i === 0 || f.pushed).map((f) => onGoals(lv, f.boxes));
const end = (frames) => frames[frames.length - 1];

// 1. greedyTrap
{
    const lv = parse(D.GREEDY_BOARD);
    const maps = lv.goals.map((g) => goalDistances(lv, g));
    const dead = deadSquares(lv);
    const near = (boxes) => boxes.reduce((a, b) => a + Math.min(...maps.map((m) => m[b]).filter((d) => d >= 0)), 0);
    // greedy rule: most boxes on goals, ties broken by the smaller sum of nearest-goal distances
    const score = (boxes) => onGoals(lv, boxes) * 100 - near(boxes);
    const frames = replay(lv, D.GREEDY_LINE);
    const at = frames.filter((f, i) => i === 0 || f.pushed);
    let greedyOk = true;
    for (let k = 0; k + 1 < at.length; k++) {
        const s = { boxes: [...at[k].boxes].sort((a, b) => a - b), player: at[k].player };
        const cands = pushes(lv, s)
            .map((p) => applyPush(s, p))
            .filter((t) => !t.boxes.some((b) => dead[b]))
            .sort((a, b) => score(b.boxes) - score(a.boxes));
        const want = [...at[k + 1].boxes].sort((a, b) => a - b).join(',');
        const best = score(cands[0].boxes);
        const tied = cands.filter((c) => score(c.boxes) === best);
        if (tied.length !== 1 || tied[0].boxes.join(',') !== want) greedyOk = false;
        console.log(`     greedy push ${k + 1}: ${cands.length} candidates, best score ${best}, runner-up ${cands[1] ? score(cands[1].boxes) : '-'}`);
    }
    ok(greedyOk, `greedy line ${D.GREEDY_LINE} is the unique greedy choice at every push`);
    const e = end(frames);
    const u = unsolvable(toXsb(lv, e));
    ok(u.dead, `greedy end position is unsolvable (exhaustive bfs, ${u.expanded} states)`);
    ok(pushes(lv, e).length === 0, 'greedy end position: no push is possible at all (both boxes frozen)');
    const sol = replay(lv, D.GREEDY_SOLUTION);
    ok(isSolved(lv, end(sol).boxes), `solution ${D.GREEDY_SOLUTION} solves`);
    const best = solve(lv);
    ok(replay(lv, best).filter((f) => f.pushed).length === sol.filter((f) => f.pushed).length, 'solution is shortest in pushes');
    const sAt = sol.filter((f, i) => i === 0 || f.pushed);
    ok(near(sAt[1].boxes) > near(sAt[0].boxes), `solution's first push moves a box away from the goals (distance ${near(sAt[0].boxes)} -> ${near(sAt[1].boxes)})`);
    const gs = pushSeries(lv, frames);
    const ss = pushSeries(lv, sol);
    console.log(`     boxes on goals: greedy ${gs.join(',')}  solution ${ss.join(',')}`);
    ok(gs.some((v, i) => v > ss[i]), 'greedy is ahead on boxes on goals early');
}

// 2. boxesOnGoals (d11)
{
    const lv = parse(D.ON_GOAL_BOARD);
    const frames = replay(lv, D.ON_GOAL_SOLUTION);
    ok(isSolved(lv, end(frames).boxes), `boxesOnGoals solution solves (${D.ON_GOAL_SOLUTION.length} moves)`);
    const s = pushSeries(lv, frames);
    ok(s.join(',') === D.ON_GOAL_SERIES.join(','), `boxes on goals per push: ${s.join(',')} (pinned)`);
    const low = s.indexOf(Math.min(...s));
    ok(s[0] - s[low] >= 2 && s.slice(0, low + 1).every((v, i) => i === 0 || v <= s[i - 1]) && s.slice(low).every((v, i, a) => i === 0 || v >= a[i - 1]), 'goes down by two or more, then only up');
    ok(replay(lv, solve(lv)).filter((f) => f.pushed).length === s.length - 1, 'solution is shortest in pushes');
    ok(pushes(lv, { boxes: [...lv.boxes], player: lv.player }).length >= 4, `the first push is not forced (${pushes(lv, { boxes: [...lv.boxes], player: lv.player }).length} legal pushes at the start)`);
    // the boxes the diagram rings: they start on a goal and the solution moves them. Every solution has to:
    // freeze one (wall + drop its goal) and nothing solves.
    const moved = lv.boxes.filter((b, k) => lv.goals.includes(b) && frames.some((f) => f.boxes[k] !== b));
    ok(moved.length >= 2, `${moved.length} boxes start on a goal and get pushed off it`);
    for (const b of moved) {
        const rest = { boxes: lv.boxes.filter((x) => x !== b), player: lv.player };
        const u = unsolvable(toXsb(lv, rest, [b], [b]));
        ok(u.dead, `with the starting-on-goal box at ${xy(lv, b)} turned into a wall: unsolvable (${u.expanded} states)`);
    }
}

// 3. macroTunnel (d03)
{
    const lv = parse(D.TUNNEL_BOARD);
    const frames = replay(lv, D.TUNNEL_SOLUTION);
    ok(isSolved(lv, end(frames).boxes), `d03 solution ${D.TUNNEL_SOLUTION} solves`);
    const tunnel = (p, d) => {
        const a = step(lv, p, d.dy, d.dx); // perpendicular neighbours
        const b = step(lv, p, -d.dy, -d.dx);
        return !lv.walls[p] && a >= 0 && b >= 0 && lv.walls[a] && lv.walls[b];
    };
    let decisions = 0;
    let prev = null;
    let pushesN = 0;
    for (let i = 1; i < frames.length; i++) {
        if (!frames[i].pushed) continue;
        pushesN++;
        const d = DIRS.find((d) => d.name === frames[i].dir);
        const box = frames[i].boxes.findIndex((b, k) => b !== frames[i - 1].boxes[k]);
        const from = frames[i - 1].boxes[box];
        const forced = prev && prev.box === box && prev.dir === d.name && prev.at === i - 1 && tunnel(from, d);
        if (!forced) decisions++;
        prev = { box, dir: d.name, at: i };
    }
    console.log(`     d03: ${pushesN} pushes, ${decisions} decisions`);
    ok(pushesN === 6 && decisions === 3, 'd03: 6 pushes collapse to 3 decisions');
}

// 4. goalRoom (d04)
{
    const lv = parse(GOAL_BAY);
    const good = replay(lv, GOAL_BAY_SOLUTION);
    ok(isSolved(lv, end(good).boxes), 'goal bay solution solves');
    // fill order: the step at which each goal gets the box that then stays to the end
    const fillAt = lv.goals.map((g) => {
        let t = good.length - 1;
        while (t > 0 && good[t - 1].boxes.includes(g)) t--;
        return t;
    });
    const order = lv.goals.map((g, k) => [xy(lv, g)[0], fillAt[k]]).sort((a, b) => a[1] - b[1]).map((a) => a[0]);
    ok(order.join(',') === '1,2,3', `goal bay solution fills the goals deepest first (columns ${order.join(',')})`);
    const bad = replay(lv, D.GOAL_BAY_WRONG);
    const e = end(bad);
    const entrance = lv.goals.reduce((a, b) => (xy(lv, b)[0] > xy(lv, a)[0] ? b : a));
    ok(e.boxes.includes(entrance) && onGoals(lv, e.boxes) === 1, 'wrong line ends with one box, on the entrance goal');
    const firstGoalHit = bad.findIndex((f) => f.boxes.some((b) => lv.goals.includes(b)));
    ok(bad[firstGoalHit].boxes.filter((b) => lv.goals.includes(b))[0] === entrance, 'the first goal the wrong line fills is the entrance');
    ok(bad.slice(firstGoalHit).every((f) => f.boxes.includes(entrance)), 'the parked box stays on the entrance to the end of the line');
    // sealed: while the parked box stays on its goal, nothing else can be solved
    const rest = { boxes: e.boxes.filter((b) => b !== entrance), player: e.player };
    const u = unsolvable(toXsb(lv, rest, [entrance], [entrance]));
    ok(u.dead, `wrong line end, parked box kept as a wall: the other two goals are unreachable (${u.expanded} states)`);
    const deep = lv.goals.filter((g) => g !== entrance);
    const rl = parse(toXsb(lv, rest, [entrance], [entrance]));
    ok(deep.every((g) => !rl.inside[g]), 'the two deeper goals are cut off from the worker');
}

console.log(failed ? `${failed} FAILED` : 'all good');
process.exit(failed ? 1 : 0);
