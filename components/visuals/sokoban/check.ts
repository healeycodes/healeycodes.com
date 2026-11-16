// @ts-nocheck (run by node directly, which needs the .ts import extensions)
// Checks every board and move sequence the Sokoban diagrams use.
//   node components/visuals/sokoban/check.ts
import { parse, replay, isSolved, solve, search, layers, deadSquares, goalDistances } from './engine.ts';
import * as D from './data.ts';

let failed = 0;
const ok = (cond: boolean, msg: string) => {
    console.log((cond ? 'ok   ' : 'FAIL ') + msg);
    if (!cond) failed++;
};

// 1. the real solver's solution for Holland #68 replays legally and solves the board
{
    const lv = parse(D.HOLLAND_68);
    const frames = replay(lv, D.HOLLAND_68_SOLUTION);
    const pushes = frames.filter((f) => f.pushed).length;
    ok(isSolved(lv, frames[frames.length - 1].boxes), `Holland #68: ${frames.length - 1} moves, ${pushes} pushes, solved`);
    const dead = deadSquares(lv);
    const floor = lv.inside.filter(Boolean).length;
    console.log(`     dead squares: ${dead.filter(Boolean).length} of ${floor} floor squares`);
    ok(frames.every((f) => f.boxes.every((b) => !dead[b])), 'Holland #68: the solution never puts a box on a dead square');
}

// 2. tiny boards: our own BFS solutions replay legally
for (const [name, text] of [['Microban #1', D.MICROBAN_1], ['Microban #5', D.MICROBAN_5]] as const) {
    const lv = parse(text);
    const sol = solve(lv);
    const frames = replay(lv, sol);
    ok(isSolved(lv, frames[frames.length - 1].boxes), `${name}: ${sol.length} moves, ${frames.filter((f) => f.pushed).length} pushes (${sol})`);
}

// 3. deadlock gallery: none of them can be solved
for (const d of D.DEADLOCK_BOARDS) {
    const lv = parse(d.board);
    const r = search(lv, 'bfs', 100000);
    ok(r.goal < 0, `deadlock "${d.title}": exhaustive search (${r.expanded} states) finds no solution`);
    ok(d.dead.every(([x, y]) => lv.boxes.includes(y * lv.w + x)), `deadlock "${d.title}": marked squares hold boxes`);
}

// 4. pinned layer sizes for the meet-in-the-middle diagram
{
    const lv = parse(D.MICROBAN_5);
    const r = search(lv, 'bfs', 100000);
    const depth = r.nodes[r.goal].g;
    const ly = layers(lv, depth);
    console.log('     Microban #5 layers', JSON.stringify(ly));
    ok(JSON.stringify(ly.fwd) === JSON.stringify(D.MICROBAN_5_LAYERS.fwd) && JSON.stringify(ly.back) === JSON.stringify(D.MICROBAN_5_LAYERS.back), 'Microban #5: pinned layer sizes match');
}

// 5. the search tree on Microban #1
{
    const r = search(parse(D.MICROBAN_1), 'astar');
    console.log(`     Microban #1 A*: ${r.expanded} expansions, ${r.nodes.length} nodes, ${r.nodes[r.goal].g} pushes`);
    ok(r.goal >= 0, 'Microban #1: A* solves');
}

// 6. boards borrowed from research/blog-post/data/boards.xsb
for (const [name, text, sol] of [['goal bay (d04)', D.GOAL_BAY, D.GOAL_BAY_SOLUTION], ['relay board', D.RELAY_BOARD, D.RELAY_SOLUTION], ['two rooms (d05)', D.TWO_ROOMS, D.TWO_ROOMS_SOLUTION], ['hub board (d08)', D.HUB_BOARD, D.HUB_SOLUTION], ['reach board (d07)', D.REACH_BOARD, 'RRlluRRldldRRlluLulD']] as const) {
    const lv = parse(text);
    const frames = replay(lv, sol);
    ok(isSolved(lv, frames[frames.length - 1].boxes), `${name}: ${sol.length} moves, ${frames.filter((f) => f.pushed).length} pushes, solved`);
}
{
    // relay: after the freeze point, the finished box never moves again
    const lv = parse(D.RELAY_BOARD);
    const frames = replay(lv, D.RELAY_SOLUTION);
    const at = frames[D.RELAY_AT];
    const frozen = at.boxes.filter((b) => lv.goals.includes(b));
    ok(frozen.length === 1 && frames.slice(D.RELAY_AT).every((f) => f.boxes.includes(frozen[0])), 'relay: one box is home at the freeze point and stays there');
    ok(frames[D.RELAY_AT].pushed && !frames[D.RELAY_AT - 1].boxes.includes(frozen[0]), 'relay: the freeze point is the push that brings it home');
    const last = frames[frames.length - 1];
    ok(isSolved(lv, last.boxes) && last.boxes.length === lv.goals.length, 'relay: the final frame has a box on every goal');
}
{
    // factoring: the two boxes can never reach each other's goal
    const lv = parse(D.TWO_ROOMS);
    const maps = lv.goals.map((g) => goalDistances(lv, g));
    ok(lv.boxes.every((b) => maps.filter((m) => m[b] >= 0).length === 1), 'two rooms: each box can reach exactly one goal');
}

console.log(failed ? `${failed} FAILED` : 'all good');
process.exit(failed ? 1 : 0);
