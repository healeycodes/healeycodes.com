// @ts-nocheck (run by node directly, which needs the .ts import extensions)
// Checks the boards, moves and claims of lanes2.tsx.
//   node components/visuals/sokoban/check.lanes2.ts
import { parse, replay, search, reach, deadSquares, goalDistances, step, DIRS, xy } from './engine.ts';
import * as D from './data.lanes2.ts';

let failed = 0;
const ok = (cond, msg) => {
    console.log((cond ? 'ok   ' : 'FAIL ') + msg);
    if (!cond) failed++;
};
const floorOf = (lv) => {
    const out = [];
    for (let p = 0; p < lv.w * lv.h; p++) if (lv.inside[p] && !lv.walls[p]) out.push(p);
    return out;
};

// sharedDeadlocks
{
    const lv = parse(D.CLUSTER_LEVEL);
    const id = ([x, y]) => y * lv.w + x;
    const cl = D.CLUSTER_CELLS.map(id).sort((a, b) => a - b);
    const side = id(D.CLUSTER_SIDE);
    const r0 = search(lv, 'bfs', 100000);
    ok(r0.goal >= 0, 'sharedDeadlocks: the start position is solvable');
    // exhaustive: can these boxes (others removed) all stand on goals at once? returns states searched, or -1 if yes
    const subsetDead = (boxes, p, cap) => {
        const goal = new Set(lv.goals);
        const keyOf = (bs, pl) => bs.join(',') + '|' + reach(lv, bs, pl).findIndex((x) => x >= 0);
        const start = [...boxes].sort((a, b) => a - b);
        const seen = new Set([keyOf(start, p)]);
        const q = [[start, p]];
        for (let i = 0; i < q.length; i++) {
            const [bs, pl] = q[i];
            if (bs.every((b) => goal.has(b))) return -1;
            if (seen.size > cap) return -1; // the solver gives up (alive) at its cap
            const d = reach(lv, bs, pl);
            for (const b of bs)
                for (const dir of DIRS) {
                    const from = step(lv, b, -dir.dx, -dir.dy);
                    const to = step(lv, b, dir.dx, dir.dy);
                    if (from < 0 || to < 0 || d[from] < 0 || lv.walls[to] || bs.includes(to)) continue;
                    const nb = bs.map((x) => (x === b ? to : x)).sort((a, b) => a - b);
                    const k = keyOf(nb, b);
                    if (seen.has(k)) continue;
                    seen.add(k);
                    q.push([nb, b]);
                }
        }
        return seen.size;
    };
    const n = subsetDead(cl, side, 1000);
    ok(n > 0, `sharedDeadlocks: the three boxes alone, worker on ${D.CLUSTER_SIDE}: never all on goals (${n} positions, under the solver's 1,000 cap)`);
    for (let k = 0; k < 3; k++) {
        const pair = cl.filter((_, j) => j !== k);
        ok(subsetDead(pair, side, 1e6) < 0, `sharedDeadlocks: without box ${xy(lv, cl[k])} the other two are fine (needs all three)`);
    }
    const dead = deadSquares(lv);
    ok(cl.every((c) => !dead[c]), 'sharedDeadlocks: no box of the pattern is on a dead square');
    const maps = lv.goals.map((g) => goalDistances(lv, g));
    const match = (function m(i, used) {
        if (i === cl.length) return true;
        for (let g = 0; g < maps.length; g++) if (!used.includes(g) && maps[g][cl[i]] >= 0 && m(i + 1, [...used, g])) return true;
        return false;
    })(0, []);
    ok(match, 'sharedDeadlocks: each box can still reach its own goal (the matching check passes)');
    const r = reach(lv, cl, side);
    ok(floorOf(lv).some((p) => !cl.includes(p) && r[p] < 0), 'sharedDeadlocks: the pattern seals off floor (the solver only tests such clusters)');
    const keys = new Set();
    for (const path of D.CLUSTER_PATHS) {
        const frames = replay(lv, path);
        const last = frames[frames.length - 1];
        ok(last.pushed && last.player === side && cl.every((c) => last.boxes.includes(c)), `sharedDeadlocks: ${path} ends with a push that completes the pattern, worker on ${D.CLUSTER_SIDE}`);
        const other = last.boxes.filter((b) => !cl.includes(b));
        const touch = other.some((o) => cl.some((c) => Math.max(Math.abs(xy(lv, o)[0] - xy(lv, c)[0]), Math.abs(xy(lv, o)[1] - xy(lv, c)[1])) <= 1));
        ok(!touch, `sharedDeadlocks: the fourth box (${xy(lv, other[0])}) does not touch the pattern, so the key is the same`);
        const sub = parse(D.CLUSTER_LEVEL); // same walls/goals, start from this position
        sub.boxes = [...last.boxes].sort((a, b) => a - b);
        sub.player = last.player;
        const rs = search(sub, 'bfs', 100000);
        ok(rs.goal < 0, `sharedDeadlocks: engine search from this position (${rs.expanded} expansions) finds no solution`);
        const all = subsetDead(last.boxes, last.player, 1e6);
        ok(all > 0, `sharedDeadlocks: and with no pruning at all, all ${all} reachable positions are unsolved`);
        keys.add(cl.join(',') + '|' + last.player);
    }
    ok(keys.size === 1, 'sharedDeadlocks: all three positions share one table key');
    for (const o of D.CLUSTER_OTHERS) {
        const c = o.cells.map(id);
        ok(subsetDead(c, id(o.side), 1000) > 0, `sharedDeadlocks: table icon ${JSON.stringify(o.cells)} is also dead`);
    }
}

console.log(failed ? `${failed} FAILED` : 'all good');
process.exit(failed ? 1 : 0);
