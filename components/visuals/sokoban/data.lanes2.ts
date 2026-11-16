// Boards for lanes2.tsx (shared deadlocks; the meet table needs no data). Checked by check.lanes2.ts.

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

// The learned-deadlock board (made for this diagram). Four goals in a cross.
// Start position; the search below reaches the three positions the diagram shows.
export const CLUSTER_LEVEL = `
#######
##   ##
#  *  #
#.$ $.#
#  *  #
##  @##
#######`;

// The three boxes the diagram's pattern is made of, and the square the worker stands on
// right after the push that completes it ([x, y] tile coordinates).
export const CLUSTER_CELLS: [number, number][] = [
    [2, 2],
    [3, 2],
    [4, 2],
];
export const CLUSTER_SIDE: [number, number] = [4, 3];

// Three positions with that pattern, as move strings from CLUSTER_LEVEL's start
// (lowercase walk, uppercase push). The first is where the pattern gets proved;
// the other two meet it again later. Found by a BFS over pushes; check.lanes2.ts replays
// them. The fourth box ends on (3,4), (5,4) and (1,4).
export const CLUSTER_PATHS = ['lluUddrruU', 'lluUdRRU', 'lluUddrruLLrrU'];

// Two more dead patterns on the same board (same proof, by symmetry), drawn as table icons.
export const CLUSTER_OTHERS: { cells: [number, number][]; side: [number, number] }[] = [
    { cells: [[2, 2], [2, 3], [2, 4]], side: [3, 3] },
    { cells: [[4, 2], [4, 3], [4, 4]], side: [3, 3] },
];
