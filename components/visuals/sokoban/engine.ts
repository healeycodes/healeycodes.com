// A tiny Sokoban engine for the diagrams in
// posts/introducing-the-worlds-strongest-sokoban-solver.md
//
// It is NOT the solver from the post. It only knows enough to keep the
// diagrams honest: parse XSB boards, replay and validate LURD move strings,
// flood-fill the player's reach, find simple dead squares, compute push
// distances, and run small searches over push-states.
//
// Check every board/solution used by the diagrams with:
//   node components/visuals/sokoban/check.ts

export type Level = {
    w: number;
    h: number;
    walls: boolean[]; // w*h
    goals: number[]; // sorted cell indexes
    boxes: number[]; // sorted cell indexes
    player: number;
    inside: boolean[]; // floor the player could ever stand on (ignoring boxes)
};

export type State = { boxes: number[]; player: number };

export const DIRS = [
    { name: 'u', dx: 0, dy: -1 },
    { name: 'd', dx: 0, dy: 1 },
    { name: 'l', dx: -1, dy: 0 },
    { name: 'r', dx: 1, dy: 0 },
] as const;

export function parse(xsb: string): Level {
    const rows = xsb.replace(/^\n+|\s+$/g, '').split('\n');
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const walls = new Array(w * h).fill(false);
    const goals: number[] = [];
    const boxes: number[] = [];
    let player = -1;
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const c = row[x];
            const i = y * w + x;
            if (c === '#') walls[i] = true;
            if (c === '.' || c === '*' || c === '+') goals.push(i);
            if (c === '$' || c === '*') boxes.push(i);
            if (c === '@' || c === '+') player = i;
        }
    });
    if (player < 0) throw new Error('level has no player');
    if (goals.length !== boxes.length) throw new Error('boxes != goals');
    const level: Level = { w, h, walls, goals, boxes, player, inside: [] };
    const inside = new Array(w * h).fill(false);
    const stack = [player];
    inside[player] = true;
    while (stack.length) {
        const p = stack.pop()!;
        for (const d of DIRS) {
            const q = step(level, p, d.dx, d.dy);
            if (q < 0 || walls[q] || inside[q]) continue;
            inside[q] = true;
            stack.push(q);
        }
    }
    level.inside = inside;
    return level;
}

// Neighbour index, or -1 when it would leave the grid.
export function step(level: Level, p: number, dx: number, dy: number): number {
    const x = (p % level.w) + dx;
    const y = Math.floor(p / level.w) + dy;
    if (x < 0 || y < 0 || x >= level.w || y >= level.h) return -1;
    return y * level.w + x;
}

export const xy = (level: Level, p: number) => [p % level.w, Math.floor(p / level.w)] as const;

export function isSolved(level: Level, boxes: number[]): boolean {
    return boxes.every((b) => level.goals.includes(b));
}

export type Frame = State & { pushed: boolean; dir: string };

// Replay a LURD string one square at a time. Throws on anything illegal:
// walking into a wall, pushing a box into a wall/box, unknown letters.
export function replay(level: Level, lurd: string, from?: State): Frame[] {
    let boxes = [...(from ? from.boxes : level.boxes)];
    let player = from ? from.player : level.player;
    const frames: Frame[] = [{ boxes: [...boxes], player, pushed: false, dir: '' }];
    for (let k = 0; k < lurd.length; k++) {
        const c = lurd[k].toLowerCase();
        const d = DIRS.find((d) => d.name === c);
        if (!d) throw new Error(`bad move letter '${lurd[k]}' at ${k}`);
        const to = step(level, player, d.dx, d.dy);
        if (to < 0 || level.walls[to]) throw new Error(`move ${k} (${c}) walks into a wall`);
        let pushed = false;
        if (boxes.includes(to)) {
            const beyond = step(level, to, d.dx, d.dy);
            if (beyond < 0 || level.walls[beyond] || boxes.includes(beyond)) {
                throw new Error(`move ${k} (${c}) pushes a box into something solid`);
            }
            boxes = boxes.map((b) => (b === to ? beyond : b));
            pushed = true;
        }
        player = to;
        frames.push({ boxes: [...boxes], player, pushed, dir: c });
    }
    return frames;
}

// BFS over squares the player can walk to without pushing. dist[p] = steps, -1 = unreachable.
export function reach(level: Level, boxes: number[], player: number): number[] {
    const dist = new Array(level.w * level.h).fill(-1);
    const blocked = new Set(boxes);
    const queue = [player];
    dist[player] = 0;
    for (let qi = 0; qi < queue.length; qi++) {
        const p = queue[qi];
        for (const d of DIRS) {
            const q = step(level, p, d.dx, d.dy);
            if (q < 0 || level.walls[q] || blocked.has(q) || dist[q] >= 0) continue;
            dist[q] = dist[p] + 1;
            queue.push(q);
        }
    }
    return dist;
}

// Shortest walk between two squares as a lowercase LURD string (null if unreachable).
export function walk(level: Level, boxes: number[], from: number, to: number): string | null {
    const blocked = new Set(boxes);
    const prev = new Map<number, [number, string]>();
    const queue = [from];
    const seen = new Set([from]);
    for (let qi = 0; qi < queue.length; qi++) {
        const p = queue[qi];
        if (p === to) break;
        for (const d of DIRS) {
            const q = step(level, p, d.dx, d.dy);
            if (q < 0 || level.walls[q] || blocked.has(q) || seen.has(q)) continue;
            seen.add(q);
            prev.set(q, [p, d.name]);
            queue.push(q);
        }
    }
    if (!seen.has(to)) return null;
    let out = '';
    for (let p = to; p !== from; ) {
        const [pp, name] = prev.get(p)!;
        out = name + out;
        p = pp;
    }
    return out;
}

export type Push = { box: number; to: number; from: number; dir: (typeof DIRS)[number] };

// Every push the player can make right now. `from` is where the player stands to push.
export function pushes(level: Level, s: State): Push[] {
    const dist = reach(level, s.boxes, s.player);
    const out: Push[] = [];
    for (const box of s.boxes) {
        for (const dir of DIRS) {
            const from = step(level, box, -dir.dx, -dir.dy);
            const to = step(level, box, dir.dx, dir.dy);
            if (from < 0 || to < 0 || dist[from] < 0) continue;
            if (level.walls[to] || s.boxes.includes(to)) continue;
            out.push({ box, to, from, dir });
        }
    }
    return out;
}

export function applyPush(s: State, p: Push): State {
    return { boxes: s.boxes.map((b) => (b === p.box ? p.to : b)).sort((a, b) => a - b), player: p.box };
}

// States that differ only by where the player stands inside the same region are
// the same search node: key = boxes + the smallest reachable square.
export function key(level: Level, s: State): string {
    const dist = reach(level, s.boxes, s.player);
    return s.boxes.join(',') + '|' + dist.findIndex((d) => d >= 0);
}

// Number of separate floor regions the boxes cut the board into ("connectivity").
export function regions(level: Level, boxes: number[]): number {
    const seen = new Array(level.w * level.h).fill(false);
    const blocked = new Set(boxes);
    let n = 0;
    for (let p = 0; p < seen.length; p++) {
        if (!level.inside[p] || blocked.has(p) || seen[p]) continue;
        n++;
        const stack = [p];
        seen[p] = true;
        while (stack.length) {
            const a = stack.pop()!;
            for (const d of DIRS) {
                const q = step(level, a, d.dx, d.dy);
                if (q < 0 || level.walls[q] || blocked.has(q) || seen[q]) continue;
                seen[q] = true;
                stack.push(q);
            }
        }
    }
    return n;
}

// Push distance from every square to one goal, for a lone box on an empty board
// (computed backwards with pulls). -1 = a box there can never reach this goal.
export function goalDistances(level: Level, goal: number): number[] {
    const dist = new Array(level.w * level.h).fill(-1);
    const queue = [goal];
    dist[goal] = 0;
    for (let qi = 0; qi < queue.length; qi++) {
        const p = queue[qi];
        for (const d of DIRS) {
            // the box was at q and got pushed to p, so the player stood at q - d
            const q = step(level, p, -d.dx, -d.dy);
            const stand = q < 0 ? -1 : step(level, q, -d.dx, -d.dy);
            if (q < 0 || stand < 0 || level.walls[q] || level.walls[stand] || dist[q] >= 0) continue;
            dist[q] = dist[p] + 1;
            queue.push(q);
        }
    }
    return dist;
}

// The squares a lone box passes through on a shortest push path to `goal`
// (first = where it starts, last = the goal). Empty if it can't get there.
export function boxPath(level: Level, from: number, goal: number, maps?: number[]): number[] {
    const dist = maps ?? goalDistances(level, goal);
    if (dist[from] < 0) return [];
    const path = [from];
    let p = from;
    let lastDir = -1;
    while (dist[p] > 0) {
        // prefer to keep going straight so paths have few corners
        const order = lastDir >= 0 ? [lastDir, ...[0, 1, 2, 3].filter((d) => d !== lastDir)] : [0, 1, 2, 3];
        let moved = false;
        for (const di of order) {
            const d = DIRS[di];
            const to = step(level, p, d.dx, d.dy);
            const stand = step(level, p, -d.dx, -d.dy);
            if (to < 0 || stand < 0 || level.walls[stand] || dist[to] !== dist[p] - 1) continue;
            p = to;
            lastDir = di;
            path.push(p);
            moved = true;
            break;
        }
        if (!moved) return [];
    }
    return path;
}

// Simple dead squares: floor from which a lone box can reach no goal at all.
export function deadSquares(level: Level): boolean[] {
    const maps = level.goals.map((g) => goalDistances(level, g));
    return level.walls.map((wall, p) => level.inside[p] && !wall && maps.every((m) => m[p] < 0));
}

export type Matching = { cost: number; pairs: [number, number][] }; // [box index, goal index]

// Minimum-cost perfect matching of boxes to goals by brute force (fine for <= 7 boxes).
export function matching(level: Level, boxes: number[], maps?: number[][]): Matching | null {
    const m = maps ?? level.goals.map((g) => goalDistances(level, g));
    const n = boxes.length;
    let best: Matching | null = null;
    const used = new Array(n).fill(false);
    const pairs: [number, number][] = [];
    const go = (i: number, cost: number) => {
        if (best && cost >= best.cost) return;
        if (i === n) {
            best = { cost, pairs: pairs.map((p) => [p[0], p[1]] as [number, number]) };
            return;
        }
        for (let g = 0; g < n; g++) {
            const d = m[g][boxes[i]];
            if (used[g] || d < 0) continue;
            used[g] = true;
            pairs.push([i, g]);
            go(i + 1, cost + d);
            pairs.pop();
            used[g] = false;
        }
    };
    go(0, 0);
    return best;
}

export type Node = {
    id: number;
    parent: number; // -1 for the root
    state: State;
    push: Push | null;
    g: number; // pushes from the start
    h: number; // lower bound on pushes still needed, -1 = deadlocked
    expandedAt: number; // order of expansion, -1 = never expanded
    solved: boolean;
    children: number[];
};

// Best-first search over pushes. order = 'astar' (g+h), 'greedy' (h) or 'bfs' (g).
// Records the whole tree so the diagrams can draw it.
export function search(level: Level, order: 'astar' | 'greedy' | 'bfs', maxExpand = 5000) {
    const maps = level.goals.map((g) => goalDistances(level, g));
    const hOf = (boxes: number[]) => matching(level, boxes, maps)?.cost ?? -1;
    const start: State = { boxes: [...level.boxes], player: level.player };
    const nodes: Node[] = [
        { id: 0, parent: -1, state: start, push: null, g: 0, h: hOf(start.boxes), expandedAt: -1, solved: false, children: [] },
    ];
    const seen = new Set([key(level, start)]);
    const open = [0];
    const score = (n: Node) => (order === 'astar' ? n.g + n.h : order === 'greedy' ? n.h : n.g);
    let expanded = 0;
    let goal = -1;
    while (open.length && expanded < maxExpand && goal < 0) {
        let bi = 0;
        for (let i = 1; i < open.length; i++) {
            const a = nodes[open[i]];
            const b = nodes[open[bi]];
            if (score(a) < score(b) || (score(a) === score(b) && a.h < b.h)) bi = i;
        }
        const node = nodes[open.splice(bi, 1)[0]];
        node.expandedAt = expanded++;
        if (isSolved(level, node.state.boxes)) {
            node.solved = true;
            goal = node.id;
            break;
        }
        for (const p of pushes(level, node.state)) {
            const state = applyPush(node.state, p);
            const k = key(level, state);
            if (seen.has(k)) continue;
            seen.add(k);
            const h = hOf(state.boxes);
            const child: Node = { id: nodes.length, parent: node.id, state, push: p, g: node.g + 1, h, expandedAt: -1, solved: false, children: [] };
            nodes.push(child);
            node.children.push(child.id);
            if (h >= 0) open.push(child.id); // h < 0: a box sits on a dead square, never expand
        }
    }
    return { nodes, goal, expanded };
}

// Turn a solved search into a LURD string (lowercase walk, uppercase push).
export function solutionOf(level: Level, nodes: Node[], goal: number): string {
    const path: Node[] = [];
    for (let n = goal; n > 0; n = nodes[n].parent) path.unshift(nodes[n]);
    let s: State = { boxes: [...level.boxes], player: level.player };
    let out = '';
    for (const node of path) {
        const p = node.push!;
        const w = walk(level, s.boxes, s.player, p.from);
        if (w === null) throw new Error('unreachable push in solution');
        out += w + p.dir.name.toUpperCase();
        s = node.state;
    }
    return out;
}

export function solve(level: Level): string {
    const r = search(level, 'bfs', 200000);
    if (r.goal < 0) throw new Error('no solution found');
    return solutionOf(level, r.nodes, r.goal);
}

// Sizes of BFS layers: forward (pushes from the start) and backward (pulls from
// every solved position). Used by the meet-in-the-middle diagram.
export function layers(level: Level, maxDepth: number) {
    const fwd: number[] = [];
    {
        let frontier: State[] = [{ boxes: [...level.boxes], player: level.player }];
        const seen = new Set([key(level, frontier[0])]);
        for (let d = 0; d <= maxDepth && frontier.length; d++) {
            fwd.push(frontier.length);
            const next: State[] = [];
            for (const s of frontier) {
                for (const p of pushes(level, s)) {
                    const t = applyPush(s, p);
                    const k = key(level, t);
                    if (seen.has(k)) continue;
                    seen.add(k);
                    next.push(t);
                }
            }
            frontier = next;
        }
    }
    const back: number[] = [];
    {
        const goals = [...level.goals].sort((a, b) => a - b);
        let frontier: State[] = [];
        const seen = new Set<string>();
        for (let p = 0; p < level.w * level.h; p++) {
            if (!level.inside[p] || goals.includes(p)) continue;
            const s = { boxes: goals, player: p };
            const k = key(level, s);
            if (seen.has(k)) continue;
            seen.add(k);
            frontier.push(s);
        }
        for (let d = 0; d <= maxDepth && frontier.length; d++) {
            back.push(frontier.length);
            const next: State[] = [];
            for (const s of frontier) {
                const dist = reach(level, s.boxes, s.player);
                for (const box of s.boxes) {
                    for (const dir of DIRS) {
                        // player stands next to the box and steps away, dragging it along
                        const stand = step(level, box, dir.dx, dir.dy);
                        const to = stand < 0 ? -1 : step(level, stand, dir.dx, dir.dy);
                        if (stand < 0 || to < 0 || dist[stand] < 0) continue;
                        if (level.walls[to] || s.boxes.includes(to)) continue;
                        const t = { boxes: s.boxes.map((b) => (b === box ? stand : b)).sort((a, b) => a - b), player: to };
                        const k = key(level, t);
                        if (seen.has(k)) continue;
                        seen.add(k);
                        next.push(t);
                    }
                }
            }
            frontier = next;
        }
    }
    return { fwd, back };
}
