// @ts-nocheck (run by node directly, which needs the .ts import extensions)
// Checks every board, move string and printed number of the FESS diagrams (fess.tsx).
//   node components/visuals/sokoban/check.fess.ts
import * as E from './engine.ts';
import * as D from './data.ts';
import * as F from './data.fess.ts';

const K = F.fessKit(E);
let failed = 0;
const ok = (cond: boolean, msg: string) => {
    console.log((cond ? 'ok   ' : 'FAIL ') + msg);
    if (!cond) failed++;
};
const at = (lv, p) => E.xy(lv, p).join(',');

// 1. fessFeatures: Holland #68 after push 38, four feature values
{
    const lv = E.parse(D.HOLLAND_68);
    const frames = E.replay(lv, D.HOLLAND_68_SOLUTION);
    const f = frames[F.PROVISIONAL_FESS.hollandFrame];
    const pushNo = frames.slice(0, F.PROVISIONAL_FESS.hollandFrame + 1).filter((x) => x.pushed).length;
    ok(pushNo === 38 && frames[F.PROVISIONAL_FESS.hollandFrame].pushed, `Holland #68: frame ${F.PROVISIONAL_FESS.hollandFrame} is right after push ${pushNo} of 261`);
    const packed = K.packedBoxes(lv, f.boxes).length;
    ok(packed === 5 && lv.boxes.length === 13, `packing: packed ${packed} of ${lv.boxes.length}`);
    const areas = K.workerAreas(lv, f.boxes);
    ok(areas.count === 3 && areas.count === E.regions(lv, f.boxes), `connectivity: ${areas.count} worker areas (engine.regions agrees)`);
    const rooms = K.rooms(lv);
    const blocked = K.blockedDoorways(lv, f.boxes);
    ok(blocked.length === 4, `room connectivity: ${blocked.length} blocked doorways of ${rooms.doors.length} (${blocked.map((p) => at(lv, p)).join(' ')}), ${rooms.count} rooms`);
    ok(rooms.doors.every((p) => !lv.walls[p] && lv.inside[p]), 'doorways are floor squares');
    const w = K.boxesInTheWay(lv, f.boxes);
    ok(w.blockers.length === 3, `hotspots: ${w.blockers.length} boxes in the way (${w.blockers.map((p) => at(lv, p)).join(' ')})`);
    ok(w.routes.every((r) => r.path[r.path.length - 1] === r.blocker && f.boxes.includes(r.blocker) && r.path.slice(1, -1).every((p) => !f.boxes.includes(p))), 'each drawn route ends at the first box it meets');
}

// 2. fessCells: pinned traces match a fresh run of both searches
{
    const lv = E.parse(F.MICROBAN_35);
    const t0 = Date.now();
    const g = K.runBestFirst(lv, 3000);
    const f = K.runFess(lv, 3000);
    console.log(`     both searches took ${Date.now() - t0} ms`);
    ok(g.trace === F.MICROBAN_35_BEST_FIRST && g.solvedAt * 2 === g.trace.length, `best-first trace matches, solved at ${g.solvedAt}`);
    ok(f.trace === F.MICROBAN_35_FESS && f.solvedAt * 2 === f.trace.length, `FESS trace matches, solved at ${f.solvedAt}`);
    const counts = (s) => {
        const c = {};
        for (let i = 0; i < s.length; i += 2) c[s.slice(i, i + 2)] = (c[s.slice(i, i + 2)] ?? 0) + 1;
        return c;
    };
    const cg = counts(g.trace);
    const cf = counts(f.trace);
    console.log(`     best-first: ${Object.keys(cg).length} cells, top ${Math.max(...Object.values(cg))}; FESS: ${Object.keys(cf).length} cells, top ${Math.max(...Object.values(cf))}`);
    ok(g.solvedAt === 1259 && f.solvedAt === 823 && Math.max(...Object.values(cg)) === 405, 'printed numbers: 1,259 / 823 / 405 in one cell');
    ok(g.trace.slice(-2) === '51' && f.trace.slice(-2) === '51', 'both end on the solved position (5 on goals, 1 area)');
}

console.log(failed ? `${failed} FAILED` : 'all good');
process.exit(failed ? 1 : 0);
